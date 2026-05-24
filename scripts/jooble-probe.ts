// scripts/jooble-probe.ts
//
// Location-format diagnostic for Jooble's API.
//
// The first landscape probe gave bizarre results: "Israel" → 0, but
// "Modi'in" → 77,403 (larger than the entire IL job market). This script
// figures out what's actually happening with the location parameter before
// we commit to any cluster/scope decisions.
//
// Tests four hypotheses:
//   A. Is the API key working at all? (global queries should return data)
//   B. Is the key region-restricted? (try non-IL cities)
//   C. Does an unrecognized location string silently fall back to global?
//      → If "Wakanda" returns the same totalCount as "Modi'in", confirmed.
//   D. What location format actually filters to Israel?
//      ("Israel" / "ישראל" / "IL" / "Tel Aviv" / "Tel Aviv-Yafo" / "תל אביב")
//
// Also pulls one sample job per probe so we can SEE where the returned
// jobs actually live — totalCount alone doesn't tell us if filtering worked.
//
// Usage:
//   JOOBLE_API_KEY=... npx tsx scripts/jooble-probe.ts

const apiKey = process.env.JOOBLE_API_KEY;
if (!apiKey) {
  console.error("ERROR: JOOBLE_API_KEY env var required");
  process.exit(1);
}

const endpoint = `https://jooble.org/api/${apiKey}`;

interface ProbeResult {
  totalCount: number | null;
  sampleLocations: string[];   // first 3 jobs' .location values
  err?: string;
}

async function probe(keywords: string, location: string): Promise<ProbeResult> {
  // ResultOnPage=3 so we can SEE where the matched jobs actually live.
  const body = { keywords, location, page: "1", ResultOnPage: "3" };
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { totalCount: null, sampleLocations: [], err: `HTTP ${res.status}` };
    const data: any = await res.json();
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    return {
      totalCount: typeof data.totalCount === "number" ? data.totalCount : null,
      sampleLocations: jobs.slice(0, 3).map((j: any) => String(j.location ?? "(none)")),
    };
  } catch (e) {
    return { totalCount: null, sampleLocations: [], err: (e as Error).message };
  }
}

function fmt(n: number | null): string {
  if (n == null) return "    ??";
  return n.toLocaleString().padStart(8);
}

async function section(
  title: string,
  probes: Array<{ label: string; keywords: string; location: string }>,
) {
  console.log(`\n=== ${title} ===`);
  for (const p of probes) {
    const r = await probe(p.keywords, p.location);
    const totalStr = fmt(r.totalCount);
    const errStr = r.err ? ` [${r.err}]` : "";
    console.log(`  ${p.label.padEnd(46)} ${totalStr}${errStr}`);
    if (r.sampleLocations.length > 0) {
      for (const loc of r.sampleLocations) {
        console.log(`     ↳ sample job location: ${loc}`);
      }
    }
  }
}

async function main() {
  const t0 = Date.now();
  console.log(`Jooble location-format diagnostic — endpoint=${endpoint.replace(apiKey!, "<key>")}`);
  console.log("Each probe fetches totalCount + 3 sample job locations.\n");

  // ── Hypothesis A: is the API key working at all? ──────────────────────
  await section("A. Baseline — does the key return ANY data?", [
    { label: "empty keywords + empty location",  keywords: "",         location: "" },
    { label: "engineer + empty location",        keywords: "engineer", location: "" },
    { label: "software + empty location",        keywords: "software", location: "" },
  ]);

  // ── Hypothesis B: is the key region-restricted? ───────────────────────
  await section("B. Other countries — is the key region-restricted?", [
    { label: "London",                           keywords: "", location: "London" },
    { label: "New York",                         keywords: "", location: "New York" },
    { label: "Berlin",                           keywords: "", location: "Berlin" },
    { label: "Kyiv (Jooble's example city)",     keywords: "", location: "Kyiv" },
  ]);

  // ── Hypothesis C: unrecognized location → silent global fallback ──────
  // If "Wakanda" returns the same totalCount as "Modi'in", we've confirmed
  // that unknown strings get treated as "no filter" rather than "zero match".
  await section("C. Nonsense locations — fallback behavior check", [
    { label: "Wakanda (fictional)",              keywords: "", location: "Wakanda" },
    { label: "Atlantis (fictional)",             keywords: "", location: "Atlantis" },
    { label: "Zzzzzzzzz (gibberish)",            keywords: "", location: "Zzzzzzzzz" },
    { label: "Modi'in (with apostrophe)",        keywords: "", location: "Modi'in" },
    { label: "Modiin (no apostrophe)",           keywords: "", location: "Modiin" },
  ]);

  // ── Hypothesis D: which IL location format actually works? ────────────
  await section("D. Israel location formats — which one filters correctly?", [
    { label: "Israel (English)",                 keywords: "", location: "Israel" },
    { label: "ישראל (Hebrew)",                   keywords: "", location: "ישראל" },
    { label: "IL (ISO code)",                    keywords: "", location: "IL" },
    { label: "ISR (ISO 3-letter)",               keywords: "", location: "ISR" },
    { label: "Tel Aviv",                         keywords: "", location: "Tel Aviv" },
    { label: "Tel Aviv-Yafo (official name)",    keywords: "", location: "Tel Aviv-Yafo" },
    { label: "Tel Aviv, Israel",                 keywords: "", location: "Tel Aviv, Israel" },
    { label: "תל אביב (Hebrew city)",            keywords: "", location: "תל אביב" },
    { label: "Jerusalem",                        keywords: "", location: "Jerusalem" },
    { label: "ירושלים (Hebrew Jerusalem)",       keywords: "", location: "ירושלים" },
    { label: "Haifa",                            keywords: "", location: "Haifa" },
    { label: "חיפה (Hebrew Haifa)",              keywords: "", location: "חיפה" },
  ]);

  // ── Hypothesis E: keyword + location combined ─────────────────────────
  // If Tel Aviv works for empty keywords, does it work with a keyword too?
  await section("E. Sanity — keyword + best-IL-location combinations", [
    { label: "engineer + Tel Aviv",              keywords: "engineer", location: "Tel Aviv" },
    { label: "engineer + Israel",                keywords: "engineer", location: "Israel" },
    { label: "engineer + ISR",                   keywords: "engineer", location: "ISR" },
    { label: "מהנדס + Tel Aviv",                 keywords: "מהנדס",    location: "Tel Aviv" },
    { label: "מהנדס + ישראל",                    keywords: "מהנדס",    location: "ישראל" },
  ]);

  console.log("\n" + "=".repeat(70));
  console.log(`Wall: ${((Date.now() - t0) / 1000).toFixed(1)}s — ~35 requests sent`);
  console.log("=".repeat(70));
  console.log("\nWhat to look for:");
  console.log("  - Section A: should be huge numbers (millions) if key works at all.");
  console.log("  - Section B: if all non-IL cities return 0, key is IL-restricted (good!).");
  console.log("    If they return huge numbers, key is global.");
  console.log("  - Section C: if 'Wakanda' totalCount matches 'Modi'in' totalCount,");
  console.log("    Jooble silently drops unknown location filters → we were getting");
  console.log("    GLOBAL results all along, not Modi'in-specific.");
  console.log("  - Section D: whichever format returns a sensible number (5k-100k)");
  console.log("    AND whose sample locations are actually in IL is the right format.");
  console.log("  - Section E: confirms the chosen format works with a keyword filter.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
