// match-eval-harness.ts — reproduces each profile's LIVE Jobs-for-you top-10
// EXACTLY as UnifiedJobsFeed.jsx serves it: same candidate-gen RPC, the same
// (imported) scoreJobFit, the same gate → sort → section. Read-only.
//
// Run (from repo root):
//   deno run --allow-env --allow-read --allow-net --import-map=scripts/match-eval-imap.json \
//     scripts/match-eval-harness.ts
// Keys: SUPABASE_SERVICE_ROLE_KEY (env or scripts/.bakeoff.env).
//
// Faithfulness: the scorer is the real src/lib/scoreJobFit.js; the candidate
// set is the real search_jobs_by_role_titles RPC; the union/seniority/gate/sort
// /section mirror UnifiedJobsFeed.jsx:87-180 + jobsFeed.js line-for-line.

import { scoreJobFit } from "../src/lib/scoreJobFit.js";
import {
  allowedSenioritiesForLevel,
  inferExperienceLevel,
} from "../src/lib/experienceLevel.js";
import { stretchAwareSeniorityFor } from "../src/lib/jobsFeed.js";

const SUPABASE_URL = "https://ilmqmodklutztuybsvwd.supabase.co";
const TRACK_ORDER = ["track_1", "track_2", "track_3"];
const UNIFIED_MAX_ROLES = 24;
const TRACK_SIMILARITY_THRESHOLD = 0.3;
const MATCHES_FETCH_SIZE = 120;
const TIER: Record<string, number> = { primary: 0, adjacent: 1, unknown: 2 };

function loadKey(): string {
  const e = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (e) return e;
  for (const line of Deno.readTextFileSync(
    new URL("./.bakeoff.env", import.meta.url),
  ).split("\n")) {
    const m = line.match(/^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  console.error("no service-role key");
  Deno.exit(1);
}
const KEY = loadKey();
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const rest = async (path: string) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H });
  if (!r.ok) {
    console.error("REST", r.status, path, await r.text());
    Deno.exit(1);
  }
  return r.json();
};

const PROFILES = [
  ["P01", "Data (jr→mid)", "da2e36ea-a066-416a-85db-ca554a5e5f91"],
  ["P02", "Data (senior)", "4ab9973c-862a-477d-970a-1de06e7dfbad"],
  ["P03", "HR/Talent (mid)", "de7b9a5f-f0c9-4f89-9c81-910d28d4ff30"],
  ["P04", "HR (senior)", "47681980-7b08-4d22-81e0-11a7a74a5a8c"],
  ["P05", "Sales/CS (entry)", "9518637e-2cc5-47ee-b7b8-a2e956554860"],
  ["P06", "BD/Partnerships (jr)", "24f64abc-ad93-463a-8822-73d37813a5a4"],
  ["P07", "Customer Success (jr)", "85cd78b7-dde1-404b-9098-66bccf9c1a87"],
  ["P08", "Product (mid)", "1c2e0229-4a7d-488a-98f3-7c232e3d6b63"],
  ["P09", "Product (senior)", "b90e86c3-73c4-46e8-b342-0dbdebbb8478"],
  ["P10", "Finance (mid)", "c9f9ea10-bdd4-4f43-876f-efb438acffa4"],
  ["P11", "Marketing (mid)", "2f746d87-fbd2-4ea5-8a61-74348703d384"],
  ["P12", "Marketing (entry)", "3ece3598-53f0-4826-b11e-856978530967"],
  ["P13", "Engineering (jr pivot)", "7d6a7d2a-b2c5-41ff-a4fe-7025e875706f"],
  ["P14", "Engineering (senior)", "6a347a9f-f7bd-41bc-b784-833db5ca6c65"],
  ["P15", "Operations (pivot)", "cb6c2a44-3768-4a11-9d0a-9a608e9e1f37"],
  ["ELI", "Eli (own account)", "4b243f3a-5035-474e-a89d-aff13fe06cc2"],
];

const arr = (a: unknown): string[] => (Array.isArray(a) ? (a as string[]) : []);
function reqSummary(j: any): string {
  const core = arr(j.req_skills_core).slice(0, 4).join(", ") || "—";
  const yrs =
    j.req_years_min != null
      ? `${j.req_years_min}${j.req_years_max ? "-" + j.req_years_max : "+"}y`
      : "any yrs";
  const sen = j.req_seniority || "any sen";
  const edu = arr(j.req_education_levels)[0] || "any edu";
  return `core: ${core} · ${yrs} · ${sen} · ${edu}`;
}

const md: string[] = [];
md.push("# Match-quality eval — labeling sheet\n");
md.push(
  "**Label each row** in the LABEL column: **GOOD** (right to show in top picks) / **STRETCH** (fair as a growth suggestion) / **BAD** (should not be near the top).",
);
md.push(
  "**Notes** = free-text gripes — your gripes are data. Order below is the LIVE served order (picks section then stretch section, exactly as the page renders).\n",
);

const pinned: any = {
  generated: "2026-07-15",
  method:
    "UnifiedJobsFeed reproduction (real RPC + scoreJobFit + gate/sort/section)",
  profiles: [],
};

for (const [label, seg, uid] of PROFILES) {
  const [careerRoles, prof, experiences] = await Promise.all([
    rest(`career_roles?user_id=eq.${uid}&select=title,track,readiness_score`),
    rest(
      `profiles?id=eq.${uid}&select=skills_canonical,qualification_level,primary_domain,work_type,target_job_titles,five_year_role`,
    ),
    rest(
      `experiences?user_id=eq.${uid}&select=title,start_date,end_date,is_current`,
    ),
  ]);
  const profile = prof[0];
  if (!profile) {
    console.error(`${label}: no profile`);
    continue;
  }
  const educations: any[] = [];

  // union titles (mirror UnifiedJobsFeed.jsx:87-100 + 191-201)
  const groups: Record<string, any[]> = {
    track_1: [],
    track_2: [],
    track_3: [],
  };
  for (const r of careerRoles)
    if (r?.title && groups[r.track]) groups[r.track].push(r);
  for (const t of TRACK_ORDER)
    groups[t].sort(
      (a, b) =>
        (Number(b.readiness_score) || 0) - (Number(a.readiness_score) || 0),
    );
  const unioned: string[] = [];
  const seen = new Set<string>();
  for (const t of TRACK_ORDER) {
    for (const r of groups[t]) {
      if (!r.title || seen.has(r.title)) continue;
      seen.add(r.title);
      unioned.push(r.title);
      if (unioned.length >= UNIFIED_MAX_ROLES) break;
    }
    if (unioned.length >= UNIFIED_MAX_ROLES) break;
  }

  const level = inferExperienceLevel(experiences, educations);
  const stretch = stretchAwareSeniorityFor(allowedSenioritiesForLevel(level));
  const workTypes = Array.isArray(profile.work_type) ? profile.work_type : [];

  // candidate-gen RPC
  const rpcRes = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/search_jobs_by_role_titles`,
    {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_role_titles: unioned,
        p_limit: MATCHES_FETCH_SIZE,
        p_offset: 0,
        p_similarity_threshold: TRACK_SIMILARITY_THRESHOLD,
        p_max_seniority: stretch,
        p_work_types: workTypes.length ? workTypes : null,
      }),
    },
  );
  if (!rpcRes.ok) {
    console.error(`${label} RPC`, rpcRes.status, await rpcRes.text());
    continue;
  }
  const candidates: any[] = await rpcRes.json();

  // score + gate + sort (UnifiedJobsFeed.jsx:131-158)
  const scored = candidates
    .map((job) => {
      const s = scoreJobFit({ profile, experiences, educations }, job);
      const matched = arr(profile.skills_canonical).filter(
        (x) =>
          arr(job.req_skills_core).includes(x) ||
          arr(job.req_skills_nice).includes(x),
      );
      return {
        job,
        s,
        matched,
        // Canonical for-you-feed score is attainability (Option A). fitPct is
        // the Search-tab number, kept only for the fit-vs-attain divergence report.
        pct: Math.round((s.attainability_score ?? 0) * 100),
        fitPct: Math.round((s.fit_score ?? 0) * 100),
      };
    })
    .filter((r) => r.s.relevance_match !== "off");
  // Mirror live /Career sort (UnifiedJobsFeed.jsx): attainability DESC, then
  // relevance_tier, then fit_score as the final tiebreak.
  scored.sort(
    (a, b) =>
      (b.s.attainability_score ?? 0) - (a.s.attainability_score ?? 0) ||
      (TIER[a.s.relevance_match] ?? 2) - (TIER[b.s.relevance_match] ?? 2) ||
      (b.s.fit_score ?? 0) - (a.s.fit_score ?? 0),
  );

  // section: picks (strong|good) then stretch (rest) — preserve order (UnifiedJobsFeed.jsx:171-180)
  const picks = scored.filter((r) =>
    ["strong", "good"].includes(r.s.attainability_band),
  );
  const stretchSec = scored.filter(
    (r) => !["strong", "good"].includes(r.s.attainability_band),
  );
  const served = [...picks, ...stretchSec].slice(0, 10);

  // profile card
  const skills = arr(profile.skills_canonical);
  md.push(`\n## ${label} — ${seg}`);
  md.push(
    `Card: **${profile.qualification_level ?? "?"}** · domain \`${profile.primary_domain ?? "?"}\` · targets ${arr(profile.target_job_titles).slice(0, 3).join(" / ") || profile.five_year_role || "—"} · ${skills.length} skills (${skills.slice(0, 6).join(", ")}…)`,
  );
  md.push(
    `Candidate set: ${candidates.length} jobs from ${unioned.length} roadmap titles; level=${level}.\n`,
  );
  md.push(
    "| rank | attain% | fit% | band | title | company | matched skills | requirements | LABEL | notes |",
  );
  md.push("|---|---|---|---|---|---|---|---|---|---|");
  const tuples: any[] = [];
  served.forEach((r, i) => {
    md.push(
      `| ${i + 1} | ${r.pct}% | ${r.fitPct}% | ${r.s.attainability_band} | ${(r.job.title || "").replace(/\|/g, "/")} | ${(r.job.company_name || "").replace(/\|/g, "/")} | ${r.matched.slice(0, 5).join(", ") || "—"} | ${reqSummary(r.job)} |  |  |`,
    );
    tuples.push({
      rank: i + 1,
      job_id: r.job.id,
      score: r.pct,
      fit_score: r.fitPct,
      band: r.s.attainability_band,
      track: r.s.track,
    });
  });
  pinned.profiles.push({
    profile_id: label,
    seg,
    user_id: uid,
    candidate_count: candidates.length,
    tuples,
  });
  console.error(
    `${label}: ${candidates.length} candidates → ${served.length} served`,
  );
}

Deno.writeTextFileSync("docs/eval/match-eval-labels.md", md.join("\n") + "\n");
Deno.writeTextFileSync(
  "docs/eval/match-eval-pinned.json",
  JSON.stringify(pinned, null, 1),
);
console.error(
  "\nwrote docs/eval/match-eval-labels.md + match-eval-pinned.json",
);
