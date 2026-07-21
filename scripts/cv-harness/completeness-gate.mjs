// scripts/cv-harness/completeness-gate.mjs — STRUCTURAL COMPLETENESS gate.
//
// The probe that would have caught the fan-out "no education" regression: a
// generated CV must contain EVERY section the source profile populates. A
// tailored CV may TRIM within a section (fewer bullets, JD-selected coursework)
// but must never DROP a whole section the user has real data for.
//
// Sections checked: education, certifications, honors_and_awards, projects.
// (Experience buckets are covered by the number-carry gate; these four are the
// deterministic sections the fan-out path failed to merge.)
//
// Usage as a CLI (fetches source + a persisted CV via the service role):
//   SERVICE_KEY=... node scripts/cv-harness/completeness-gate.mjs <cv_id>
// exits 0 on PASS, 1 on FAIL.
//
// Or import { checkCompleteness } and assert against any {source, cvData} pair.

// Does the source profile populate this section? (i.e. would we EXPECT it to
// appear in a faithful CV.)
function sourceHasSection(source, section) {
  const edu = Array.isArray(source.education) ? source.education : [];
  const exps = Array.isArray(source.experiences) ? source.experiences : [];
  switch (section) {
    case "education":
      // an education row only counts if it has an institution — an
      // institution-less row is intentionally excluded from render.
      return edu.some((e) => String(e?.institution ?? "").trim());
    case "certifications":
      return (
        (Array.isArray(source.certifications) ? source.certifications : [])
          .length > 0
      );
    case "projects":
      return (Array.isArray(source.projects) ? source.projects : []).length > 0;
    case "honors_and_awards":
      return (
        edu.some((e) =>
          (Array.isArray(e?.honors) ? e.honors : []).some((h) =>
            String(h ?? "").trim(),
          ),
        ) ||
        exps.some((x) =>
          (Array.isArray(x?.awards) ? x.awards : []).some((a) =>
            String(a ?? "").trim(),
          ),
        )
      );
    default:
      return false;
  }
}

function outputHasSection(cvData, section) {
  const v = cvData?.[section];
  return Array.isArray(v) && v.length > 0;
}

// Returns one row per section the SOURCE populates; pass=false means the output
// dropped a section it should have carried (the regression signature).
export function checkCompleteness(source, cvData) {
  const SECTIONS = [
    "education",
    "certifications",
    "honors_and_awards",
    "projects",
  ];
  return SECTIONS.filter((s) => sourceHasSection(source, s)).map((s) => ({
    section: s,
    sourceHas: true,
    outputHas: outputHasSection(cvData, s),
    pass: outputHasSection(cvData, s),
  }));
}

// ── CLI ──
if (import.meta.url === `file://${process.argv[1]}`) {
  const cvId = process.argv[2];
  if (!cvId) {
    console.error("usage: SERVICE_KEY=... node completeness-gate.mjs <cv_id>");
    process.exit(2);
  }
  const fs = await import("node:fs");
  const env = Object.fromEntries(
    fs
      .readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
  const URL = env.VITE_SUPABASE_URL,
    SERVICE = process.env.SERVICE_KEY;
  const q = async (path) =>
    (
      await fetch(`${URL}/rest/v1/${path}`, {
        headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
      })
    ).json();

  const [cv] = await q(
    `application_cvs?id=eq.${cvId}&select=user_id,is_master,created_at,generated_cv_data,cv_data`,
  );
  if (!cv) {
    console.error("cv not found:", cvId);
    process.exit(2);
  }
  const uid = cv.user_id;
  const [education, experiences, certifications, projects] = await Promise.all([
    q(`education?user_id=eq.${uid}&select=institution,honors`),
    q(`experiences?user_id=eq.${uid}&select=awards`),
    q(`certifications?user_id=eq.${uid}&select=id`),
    q(`projects?user_id=eq.${uid}&select=id`),
  ]);
  const source = { education, experiences, certifications, projects };
  const cvData = cv.generated_cv_data || cv.cv_data || {};

  const rows = checkCompleteness(source, cvData);
  console.log(
    `\n=== completeness gate: cv ${cvId} (is_master=${cv.is_master}, ${cv.created_at}) ===`,
  );
  console.log(" section              source_has  output_has  result");
  console.log(" " + "-".repeat(52));
  let failed = 0;
  for (const r of rows) {
    if (!r.pass) failed++;
    console.log(
      ` ${r.section.padEnd(20)} ${"yes".padEnd(11)} ${(r.outputHas ? "yes" : "NO").padEnd(11)} ${r.pass ? "PASS" : "FAIL"}`,
    );
  }
  if (rows.length === 0)
    console.log(" (source populates none of the checked sections)");
  console.log(
    `\n ${failed === 0 ? "✅ COMPLETE" : `❌ ${failed} section(s) DROPPED`}\n`,
  );
  process.exit(failed === 0 ? 0 : 1);
}
