// scripts/test-cv-authoring-diff.ts
//
// CV authoring bake-off — Phase 0 gating harness.
// Rebuilt 2026-06-10 for the Sonnet-swap pre-flight (this file replaces the
// June 9 / June 10 sweeper-style harness; the model-list scan, the simplified
// OLD_BULLET_POLICY, the pre-PR-#234 `{title, company, dates, bullets}`
// schema, and the markdown-only output are all gone).
//
// What this harness gates:
//   Three-cell matrix, no scan, no bake-off-style discovery:
//     (a) gpt-4o + production-snapshot system prompt  → "gpt-4o (prod-snap)"
//     (b) gpt-4o + Option A bullet policy             → "gpt-4o (Option A)"
//     (c) claude-sonnet-4.6 + Option A bullet policy  → "sonnet (Option A)"
//
// Production-snapshot construction (Option Y from the 2026-06-10 scoping):
//   - Static prose blocks (ONE_PAGE_RULE, TRUTHFULNESS_RULES, STRUCTURE_RULES
//     with SPARSE ABOUT_ME inlined, TAILORING_RULES, plus intro/outro) are
//     vendored verbatim from generate-tailored-cv/index.ts:937-1085 +
//     1087-1128 + 1237-1249 as of current main, with backtick escapes
//     preserved per the 2026-06-03 lesson.
//   - CV_VOICE_RULES is imported from _shared/voice-rules.ts (its production
//     source-of-truth) — no vendoring, picks up library updates by import.
//   - LIBRARY_CONTEXT is computed at module load by importing the production
//     role library + sector-mapping.matchRoleToLibrary and replicating the
//     skill/proof-signal filtering logic from index.ts:884-928. The full
//     assembled prompt is SHA-256'd and written to
//     /tmp/cv-bakeoff-raw/production-prompt-snapshot.txt for point-in-time
//     auditability — the docs/research markdown includes the SHA + generation
//     timestamp in its header.
//   - For our run scenario (target "Customer Success Specialist", no JD, no
//     application_id): KEYWORD_INJECTION_BLOCK = "" (no JD), STRUCTURED_REQUIREMENTS_RULE
//     = "" (no application_id → null targetRoleContext), ABOUT_ME = SPARSE branch
//     (hasV4Grounding=false), LIBRARY_CONTEXT fires (CS Specialist matched).
//     Included blocks are stamped in the snapshot header.
//
// Schema (post-PR-#234):
//   System prompt's OUTPUT SCHEMA block requires `{index, bullets}` per
//   experience entry — index is an integer echoing USER DATA position; server
//   stamps title/company/dates by index in production via fillFromSource().
//   The schema text is copied verbatim from index.ts:1313-1340.
//
// Validation (per cell):
//   1. Index validity:  every emitted bucket's `index` field is integer,
//      0-based, in bucket order, no gaps, no duplicates. Pass/fail per cell,
//      raw index sequence reported on failure.
//   2. unsourcedBullets: production validator ported verbatim from
//      generate-tailored-cv/index.ts:2085-2153 — same QUANT_TOKEN_RE, same
//      6-source haystack composition.
//   3. Per-number detail: every quantified token detected in output bullets
//      with hit/miss against the haystack.
//   4. Range-token flag: dash-separated and "X to Y" numeric ranges in output
//      bullets, flagged for manual review (NOT counted as a failure).
//
// Profile set:
//   --invite-codes=GETAJOBPILOT,INTERNSHIPGETAJOB (mirrors
//   test-cv-extraction-bakeoff.ts:625-643). Filtered to profiles with an
//   uploaded CV (storage.list resumes/{user_id}/ non-empty). Discovered set
//   is logged at run start. agamf123@gmail.com presence is verified — if
//   absent, the run halts with an explicit explanation.
//
// Raw JSON dump:
//   Each cell's parsed LLM response is written to
//   /tmp/cv-bakeoff-raw/<email-slug>__<config>.json so any failure (bad
//   index sequence, bad parse, anomalous bullet content) can be inspected
//   directly without re-running the LLM.
//
// Output:
//   Default destination: docs/research/cv-bakeoff-2026-06.md (committed
//   evidence, not /tmp). Header carries snapshot SHA + generation timestamp.
//   Summary table at top: per cell — profiles run, index-validity pass rate,
//   total unsourced numbers, range flags, numbers-carried aggregate, p50
//   latency, cost. Per-profile detail below the summary.
//
// What this harness does NOT do (intentionally):
//   - No page-fit / shrink-to-fit measurement (that lives in
//     render-cv-eyeball.ts and stays there for Phase 2).
//   - No invocation of the production edge function (we hit OpenAI + OpenRouter
//     directly with the vendored snapshot, so this run cannot affect
//     production behavior).
//   - No retention of the old multi-model scan or the simplified OLD policy
//     as a default-run cell. POLICY_SLICE (renamed from OLD_BULLET_POLICY) is
//     preserved in this file as a runnable constant for ad-hoc use but is
//     excluded from the three-cell matrix.
//
// Usage (the user's keyed-run pattern):
//   SUPABASE_URL=https://ilmqmodklutztuybsvwd.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY="<inline-pull>" \
//     npx tsx scripts/test-cv-authoring-diff.ts \
//       --invite-codes=GETAJOBPILOT,INTERNSHIPGETAJOB \
//       --role="Customer Success Specialist" \
//       --out=docs/research/cv-bakeoff-2026-06.md \
//       2>&1 | tee /tmp/cv-bakeoff-preflight.log
//
// OPENAI_API_KEY + OPENROUTER_API_KEY assumed exported in the shell.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

// Production role library + matcher imports — used to build LIBRARY_CONTEXT
// at module load (Option Y). The .ts extension on these imports is the Deno
// edge-runtime convention; tsx tolerates them for pure-data exports and for
// matchRoleToLibrary (probe verified 2026-06-10).
import { roleLibrary } from "../supabase/functions/_shared/libraries/00_role_library.ts";
import { skillLibrary } from "../supabase/functions/_shared/libraries/01_skill_library.ts";
import { proofSignalLibrary } from "../supabase/functions/_shared/libraries/02_proof_signal_library.ts";
import { roleSkillMapping } from "../supabase/functions/_shared/libraries/04_role_skill_mapping.ts";
import { matchRoleToLibrary } from "../supabase/functions/_shared/cv-templates/sector-mapping.ts";
import { CV_VOICE_RULES } from "../supabase/functions/_shared/voice-rules.ts";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE || !OPENAI_API_KEY || !OPENROUTER_API_KEY) {
  console.error("ERROR: set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const arg = (n: string, d = ""): string =>
  args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;

// --emails overrides invite-code discovery if provided. Default: empty.
const EMAILS_ARG = arg("emails", "");
// --invite-codes activates discovery if --emails is not provided.
const INVITE_CODES = arg("invite-codes", "GETAJOBPILOT,INTERNSHIPGETAJOB")
  .split(",").map((s) => s.trim()).filter(Boolean);
const TARGET_ROLE = arg("role", "Customer Success Specialist");
const OUT = arg("out", "docs/research/cv-bakeoff-2026-06.md");
const RAW_DIR = "/tmp/cv-bakeoff-raw";
const SNAPSHOT_FILE = `${RAW_DIR}/production-prompt-snapshot.txt`;

// The three cells. Labels are stable identifiers used in the per-profile
// table column headers AND in the raw-JSON dump file names.
const CELL_PROD_SNAP = "gpt-4o (prod-snap)";
const CELL_GPT4O_OPTION_A = "gpt-4o (Option A)";
const CELL_SONNET_OPTION_A = "sonnet (Option A)";

const GPT4O_CONTROL = "gpt-4o";
const SONNET_SLUG = "anthropic/claude-sonnet-4.6";

const REASONING_MODEL_PATTERNS = [
  /^openai\/gpt-5(\.|$)/i,
  /^openai\/o[1-9](\.|-|$)/i,
  /-thinking$/i,
];
const isReasoningModel = (slug: string) => REASONING_MODEL_PATTERNS.some((rx) => rx.test(slug));

const PRICING_FALLBACK: Record<string, { in_per_m: number; out_per_m: number }> = {
  "gpt-4o": { in_per_m: 2.5, out_per_m: 10 },
  "anthropic/claude-sonnet-4.6": { in_per_m: 3, out_per_m: 15 },
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// ─── Latin-1 safe headers (carry-over from prior version) ───────────────

function latin1SafeHeader(s: string): string {
  return s
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2026]/g, "...")
    .replace(/[^\x00-\xff]/g, "");
}
function assertLatin1Headers(h: Record<string, string>): Record<string, string> {
  for (const [k, v] of Object.entries(h)) {
    for (let i = 0; i < v.length; i++) {
      if (v.charCodeAt(i) > 0xff) {
        throw new Error(`header "${k}" non-Latin-1 at index ${i}: U+${v.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0")}`);
      }
    }
  }
  return h;
}

// ═══════════════════════════════════════════════════════════════════════
// Production prompt vendored snapshot (Option Y).
// Static prose blocks are byte-identical copies of the deployed source on
// current main; backtick escapes (\`) preserved as-is per the 2026-06-03
// lesson — they are literal backticks inside the template literal.
// ═══════════════════════════════════════════════════════════════════════

// generate-tailored-cv/index.ts:937-956
const PROD_ONE_PAGE_RULE = `CONTENT DENSITY & QUALITY:

Page-fit is now handled by the PDF renderer — it measures your output and scales typography down (within readable bounds) until it fits on one page. Your job is not to ration content for the page; your job is to write the right amount of content at the right quality, and let the renderer handle layout.

Per-experience bullet counts:
- Professional experiences: 2-4 bullets per role. Pick the number based on richness of the source: a role with one short responsibility line gets 2 bullets; a role with multiple stories + named tools + measured outcomes gets 4.
- Military experiences: 2-3 bullets per role.
- Volunteering / Leadership: 1-3 bullets per role.
- Hard ceiling: 5 bullets per experience. Beyond that the section reads as a list rather than a profile.

Per-bullet word count (quality, not page-fit):
- Target 14-22 words for most bullets. Bullets shorter than 12 words usually under-describe the work and read as thin. Bullets longer than 26 words are almost always padded — tighten.
- A bullet running to two rendered lines should earn it with a real metric or specific tool, not with filler.

Section richness:
- Include every experience, education entry, certification, award, and language the user has. NEVER drop entries — the renderer will shrink before anything is cut.
- About Me density follows the path-specific rules below (3-4 sentences grounded, 1-2 sparse).

Recruiter scan order remains: professional experience top, then education, then skills/honors. Lead with your strongest material in each bucket — chronologically AND by relevance to the JD.
`;

// generate-tailored-cv/index.ts:958-980
const PROD_TRUTHFULNESS_RULES = `ABSOLUTE TRUTHFULNESS & PRESERVATION RULES — THESE OVERRIDE EVERY OTHER RULE:

A. Factual integrity (no invention):
1. NEVER invent, fabricate, or estimate any metrics, percentages, numbers, dollar amounts, team sizes, or durations that aren't EXPLICITLY in the user's source data. No "reduced response time by 20%", no "managed a team of 15", no "drove $1M in pipeline" unless those exact figures appear in the source.
2. NEVER add a quantified achievement unless the user's own data contains that exact number. If a bullet would be stronger with a metric, leave it without. Weaker-but-truthful beats strong-but-false.
3. NEVER add skills, tools, certifications, experiences, education entries, or awards the user doesn't actually have in the source data. If the JD asks for SQL and the user has no SQL anywhere, do not add it.

B. Preservation (don't drop, don't paraphrase identifiers — BUT fix obvious typos):
4. Use the EXACT job titles from the source data. Never shorten, generalize, or paraphrase a title — "Supervised and trained teams of soldiers" stays "Supervised and trained teams of soldiers", never "Soldier". "Senior Customer Success Manager" stays "Senior Customer Success Manager", never "CS Manager".
5. Use the EXACT company / institution / organization names from the source data. Don't re-capitalize, abbreviate, or translate them.
6. EXCEPTION to rules 4 and 5 — you MUST silently correct obvious spelling mistakes in degree names, field-of-study strings, institution names, and company names. "specilization" → "specialization". "Reichmann" → "Reichman". "Mangement" → "Management". "Engeering" → "Engineering". Only fix clear typos; never rephrase, re-order words, translate, or expand abbreviations. The user will be embarrassed if the CV goes to an employer with a misspelled degree or school.
7. Preserve every bullet from the source responsibilities. Rephrase for clarity and role alignment, but do not drop content. Five source bullets in → five bullets out.
8. Include EVERY experience, education entry, certification, award, and language present in USER DATA. Do not silently omit entries because they feel less relevant — reorder them, but include them all.

C. Surfacing awards and honors:
8. If a responsibility line mentions an award (e.g. "Awarded Presidential Award for Excellence"), keep it in the bullet AND surface the award in honors_and_awards[] so it appears in a dedicated Honors & Awards section.
9. CAPITALIZATION — all degree names, specializations, field-of-study strings, institution names, AND every entry in skills.domain (the role-specific capability list) must use TITLE CASE. "bachelor's degree in business administration-specialization in digital innovation" becomes "Bachelor's Degree in Business Administration - Specialization in Digital Innovation". "process improvement" in skills.domain becomes "Process Improvement". Small connector words like "in", "of", "and", "the", "a", "at" stay lowercase unless they're the first word. NOTE: skills.tools (brand names like "Figma", "HubSpot") and skills.technical (acronyms like "SQL", "AWS", "JavaScript") should preserve their natural casing — do NOT title-case acronyms or brand names. Apply this silently during the typo-correction step (rule 6) — the reader should never see a sentence-case or lower-case degree or domain skill.

D. What you MAY do:
9. MAY rephrase and tighten bullets for stronger action verbs, ATS keywords, and role alignment — while preserving facts.
10. MAY reorder experiences and bullets so the most role-relevant lead.
11. MAY write a tailored About Me that connects the user's real experience to the target role and (when provided) the target company by name.
`;

// generate-tailored-cv/index.ts:1042-1052 — SPARSE branch only. Our scenario
// has no JD and no application_id, so hasV4Grounding=false → SPARSE fires.
const PROD_ABOUT_ME_RULES_SPARSE = `- About Me — SPARSE MODE (no v4 grounding or zero skill overlap).
    Length: 1-2 sentences MAX. Shorter is more credible when grounding is thin — better to say less truthfully than more generically.
    Reference exactly two profile anchors from USER DATA:
      (a) the user's primary qualification — degree + institution from USER DATA.education_list[0], OR current role + company from USER DATA.professional_experiences[0]
      (b) one domain or focus area they ACTUALLY have, drawn from USER DATA.skills or one of their experiences.
    Example: "Business Administration student at State University with two years of operational support experience at the Civic Scholars Foundation, focused on customer-facing roles in product and operations."
    If you can't write 2 honestly-grounded sentences, write 1.
    ANTI-FABRICATION (load-bearing — read carefully):
    Do NOT infer domains, industries, or specialties from the user's DEGREE or the TARGET ROLE alone. A Business Administration degree alone does not give the user "consulting", "strategy", "finance", or "marketing" experience — only their actual experience rows + skills do. The target role's industry (e.g. "fintech", "cybersecurity") IS safe to reference when the user has experience at a company in that domain OR their skills/projects name that domain. If neither holds, leave the industry out.
    BAD: "Business Administration student at State University with consulting experience, interested in fintech." (Both inferred — neither traces.)
    GOOD: "Business Administration student at State University." (1 sentence — honest beats padded.)`;

// generate-tailored-cv/index.ts:1054-1085 — STRUCTURE_RULES with the SPARSE
// branch of ABOUT_ME_RULES interpolated into ${ABOUT_ME_RULES} at line 1063.
// Backticks in the STORY BANK PRECEDENCE / BINDING blocks (lines 1071-1076)
// are preserved as `\`` escapes; the SWC parser (per 2026-06-03 lesson) reads
// them as literal backticks at runtime.
const PROD_STRUCTURE_RULES = `OUTPUT STRUCTURE:
- Produce a single JSON document (see schema below). The PDF renderer reads it verbatim.
- Omit any section the user has no data for. Do NOT return empty arrays of placeholders.
- Experiences are pre-bucketed in USER DATA. You MUST honor those buckets — route each one into the correct output array:
    • bucket === "professional" → professional_experiences[]
    • bucket === "military"     → military_experiences[]
    • bucket === "volunteering" → volunteering_experiences[]
    • bucket === "leadership"   → leadership_experiences[]
- About Me: FACTUAL style with no pronouns and no candidate-speak. The subject of every sentence is the USER (their experience, work, skills) — NOT the target company. JD domain terms, tools, and skill names ARE allowed when they describe the user's real experience. What is NEVER allowed is the company's own MISSION / TAGLINE / MARKETING / SLOGAN language. The path-specific instruction below governs LENGTH and CONTENT — follow it exactly.
${PROD_ABOUT_ME_RULES_SPARSE}
  BAD: "Excited to join Acme's mission to revolutionize payroll." BAD: "Aligns with the company's vision of seamless workforce solutions." BAD: "Hands-on experience in customer success and process improvement." BAD: "Demonstrated ability to drive results across cross-functional teams."
- Experience bullets: lead with the ACHIEVEMENT, OUTCOME, or ACTION — never with a tool or instrument. Tools belong mid-sentence as the means, never as the subject of the bullet. PREFER the XYZ structure when the source has measurable outcomes: "Accomplished X (impact Y) by doing Z" — e.g. "Reduced ticket resolution time by 40% by building a triage workflow in Zendesk". The metric Y MUST come verbatim from the user's source data. When source has no metric, fall back to action-verb + concrete-outcome — but still NEVER start with a tool name (NEVER fabricate a number to fit the XYZ shape either — the truthfulness rules above always win).
  BAD (tool-first): "Used HubSpot to track customer health and renewal risk." → flat, instrumentation-first.
  BAD (tool-first): "Utilized Notion to manage scholarship registration pipeline." → tool name as subject.
  GOOD (outcome-first): "Drove a 15-point lift in renewal rate by rebuilding the health dashboard in HubSpot." → outcome leads, tool supports.
  GOOD (action-first, no metric): "Owned the scholarship registration pipeline end-to-end for 200 students, coordinating intake through Notion." → action leads, tool supports.
  When the verb you want to use is "Used" / "Utilized" / "Leveraged" / "Employed" — STOP and rewrite. Those verbs are a tell that the bullet is starting at the wrong place. Replace with the action the tool enabled.
- STORY BANK PRECEDENCE: When USER DATA.stories[] contains a story whose \`experience_label\` matches one of the user's experiences AND a JD requirement, prefer the story's \`result\` + \`metrics\` + \`tools_used\` as the bullet's content over the experience's freeform \`responsibilities\` text. Stories are user-confirmed STAR records — every metric, tool, and skill there is real and verbatim. Each bullet traces to ONE source: either a single story OR a responsibility line from one experience — NEVER combine two stories into one bullet, and NEVER blend story content with imagined details. Match a story to its parent experience by \`experience_label\` ("Role at Company"); place the bullet under that experience's bucket. If a story is irrelevant to the bullet you're writing, skip it — never force-fit.

  STORY BANK BINDING (mandatory for each matched story):
    (1) METRICS VERBATIM — for each story you use, write at least one bullet under that experience that contains every entry from the story's \`metrics\` array WORD-FOR-WORD. Numbers ("12", "88%", "$1M") and units ("interviews", "first quarter") stay exactly as the story has them. The TAILORING rule about rephrasing applies to action verbs and surrounding structure — NOT to the metric figures themselves. Example: a story with metrics ["12 user research interviews", "88% adoption in first quarter"] MUST produce a bullet like "Drove 88% adoption in first quarter via 12 user research interviews with security leads" — NOT "Led product discovery to enhance enterprise adoption" (which strips both metrics).
    (2) TOOLS PRESERVED — every entry from the story's \`tools_used\` array MUST appear in the CV: ideally in the matching experience's bullet, or — if it doesn't fit naturally there — in the Skills & Tools section. Story tools are confirmed-real and must surface somewhere visible.
    (3) NO CROSS-EXPERIENCE SMEARING — story content stays attached to its \`experience_label\`. Do not sprinkle the story's adoption/metric/result language across other experiences in the CV. If you wrote a bullet referencing "88% adoption" under Experience A, do not also reference "adoption metrics" or similar paraphrases under Experience B unless Experience B has its own story or responsibilities text supporting it.
- PROOF SIGNALS — USER DATA.proof_signals is a ranked list of pre-extracted, pre-scored evidence from the user's onboarding analysis. Each entry has a proof_signal name, mapped_skills, primary_domain, and confidence_score. When writing a professional bullet, FIRST check whether one of the proof_signals describes work the user did in that role — if so, prefer the proof_signal's evidence over rephrasing the freeform responsibilities text. Treat proof_signals as second only to Story Bank for bullet sourcing (Stories > proof_signals > responsibilities). Do NOT list proof_signal names in the output — they are inputs that ground bullets, not standalone CV content.
- EXPERIENCE SKILLS — every experience entry in USER DATA carries a skills[] array alongside its responsibilities text. This is the user's confirmed list of skills + tools/platforms for that specific role (one combined array). When writing bullets for that experience, surface specific items from skills[] whenever they fit naturally (e.g. a marketing internship with skills: ["HubSpot", "Google Analytics", "lifecycle marketing"] should mention HubSpot, Google Analytics, or lifecycle work in bullets that describe the matching work). Any platform-style entry that doesn't fit naturally in a bullet MUST still appear in skills.tools[] so it's visible.
- Skills & Tools: categorize as Domain (role-specific capabilities) and Tools (software/platforms/systems). Languages do NOT go here.
- Languages: human spoken/written languages only. Draw them from the user's skills list if language-like entries are there; draw also from language_hints[] which flags likely languages based on location. Include a proficiency level (Native | Fluent | Professional | Conversational | Basic) when the source or hint supports it, otherwise omit level.
- Education: include every entry from USER DATA.education_list — render them in the order provided. Do not invent additional entries; the LLM's job is to format what's given, not to synthesize a second entry from another source.
- Honors & Awards: include USER DATA.education.honors verbatim and any awards mentioned inside experience responsibilities.
- Military Service: preserve unit names and ranks (titles), but phrase bullets in civilian-readable language.
- Never keyword-stuff. JD keywords appear only where they genuinely apply to real experience.
`;

// generate-tailored-cv/index.ts:1087-1128
const PROD_TAILORING_RULES = `
TAILORING (per-bucket policy — different rules for different experience types):

THE CORE PRINCIPLE: tailoring must preserve the AUTHENTIC NATURE of each role. A volunteer educator coordinating youth programs is not a Product Analyst. Repackaging volunteer work in corporate-tech vocabulary ("monitored adoption dashboards", "stakeholder alignment on growth priorities") makes the CV worse, not better — recruiters spot the mismatch and trust the candidate less. Each role keeps its own register.

WHERE TO TAILOR AGGRESSIVELY:
- professional_experiences[] bullets — full JD-language rewriting, use must_include_phrases / action_verbs / domain_terms wherever they describe real work the user did
- About Me — describe the user's experience using JD vocabulary where it genuinely applies
- Skills & Tools — lead with JD-matching skills, then list others

WHERE TO PRESERVE AUTHENTIC REGISTER (do NOT force JD vocabulary):
- volunteering_experiences[] bullets — keep the language native to the volunteer context (curriculum, mentorship, community, youth, outreach, recruitment of volunteers, fundraising, etc). Use the user's actual responsibilities text and Story Bank metrics. JD keywords appear here ONLY when the activity genuinely maps (a volunteer running a coding bootcamp legitimately "taught Python"; a youth-education volunteer does NOT "monitor adoption dashboards").
- military_experiences[] bullets — civilian-readable but militarily authentic. Preserve unit names + ranks. Do NOT inject corporate-tech vocabulary; keep the language of operational leadership, training, missions, teams under pressure.
- leadership_experiences[] bullets — same authentic-register rule. Student-org leadership stays student-org-shaped, not corporate-shaped.

EXAMPLES:

✅ AUTHENTIC volunteering bullet (good): "Designed life-skills curricula for at-risk youth, covering financial literacy, career readiness, and conflict resolution."
✗ OVER-TAILORED volunteering bullet (bad): "Monitored adoption dashboards and engagement metrics across a youth program portfolio."

✅ AUTHENTIC volunteering bullet (good): "Coordinated weekly programming for a 12-volunteer team serving 80 students across two community centers."
✗ OVER-TAILORED volunteering bullet (bad): "Coordinated with stakeholders to ensure alignment on growth priorities."

✅ AUTHENTIC military bullet (good): "Led a 12-soldier squad through six-month operational deployment in Sector 4, including reconnaissance and patrol routes."
✗ OVER-TAILORED military bullet (bad): "Drove cross-functional alignment across operational stakeholders to deliver on mission KPIs."

✅ AUTHENTIC professional bullet (good): "Owned customer relationships and drove 88% adoption in Q1 via 12 user research interviews with security leads."
- (this is OK because the user actually did customer success work — JD keywords genuinely apply)

PROJECTS — reorder by JD relevance. When USER DATA.projects is non-empty, score each project on overlap between its skills[] and the JD's must_include_phrases / tools_and_platforms / domain_terms. Output the top 2-3 most relevant projects first; drop the least relevant if you're tight on space. Project bullets follow the same XYZ structure as experience bullets — what was built + tools used + outcome. Include the URL when present.

EDUCATION COURSEWORK — select by JD relevance. USER DATA.education_list[i].relevant_coursework[] is the user's full coursework array (up to 20 items). For the output education[i].coursework[], pick up to 5 courses ranked by overlap with the JD's domain_terms and must_include_phrases. A Finance JD should surface "Financial Modeling, Corporate Finance"; a Product JD should surface "Data Science, SQL, Product Management". Pad with breadth courses only if there's no JD-aligned coursework. NEVER invent course names.

EDUCATION ACADEMIC PROJECTS — surface when JD-relevant. USER DATA.education_list[i].academic_projects[] holds thesis/capstone/coursework projects. If any align with the JD, render them in education[i].academic_projects[] (new schema field — see OUTPUT SCHEMA). One line per project, format "Project name — short description". Cap at 2 per education entry.

UNIVERSAL RULES (apply to every bucket):
- TAILORING SCORE TARGET: at least 6 of the must_include_phrases (or close variants) appear across the CV — distributed across PROFESSIONAL bullets, Skills, and About Me. The score is NOT measured on volunteering/military/leadership bullets — those should never inflate the count by absorbing keywords that don't fit.
- REORDER bullets within each experience: put the most-JD-relevant responsibility first WHEN it genuinely applies. Don't reorder volunteering bullets to feature curriculum-design first because the JD says "design" — if the user spent more time on coordination, coordination leads.
- About Me must read like it was written FOR this specific role through the USER's relevant experience — not by quoting the company's mission. Domain reference is OK ("fintech", "B2B SaaS"); reciting the company's tagline is NOT.
- NEVER invent experiences, skills, tools, certifications, or metrics. Rephrasing is allowed; fabrication is not. "Managed multiple cases" can become "Prioritised and managed a backlog of concurrent cases" if that's what actually happened, but CANNOT become "Managed a product backlog" if the user didn't work on one.
- If unsure whether a rephrasing is truthful or natural to the role, keep the original wording. Conservative rephrasing > aggressive over-tailoring.
`;

// ─── LIBRARY_CONTEXT computation — production-equivalent by construction ──
// Replicates generate-tailored-cv/index.ts:884-928 + 1171-1184 verbatim.

function buildProductionLibraryContext(targetRole: string): string {
  const matchResult = (matchRoleToLibrary as any)(targetRole, roleLibrary as any);
  const targetRoleDef = matchResult?.role || null;

  if (!targetRoleDef) {
    return "NOTE: The target role was not found in the standardized role library. Tailor strictly using the job description and the user's actual profile data.\n";
  }

  const targetMapping = (roleSkillMapping as any).role_skill_mapping.find((m: any) =>
    m.role_id === (targetRoleDef?.role_id || targetRoleDef?.id || targetRole)
  );

  const allSkillIds = new Set<string>();
  if (targetMapping) {
    const flatBuckets = [
      ...(targetMapping.core_skills || []),
      ...(targetMapping.secondary_skills || []),
      ...(targetMapping.differentiator_skills || []),
    ];
    const nested = targetMapping.skills || {};
    const nestedBuckets = [
      ...(nested.core || []),
      ...(nested.secondary || []),
      ...(nested.differentiator || []),
    ];
    [...flatBuckets, ...nestedBuckets].forEach((entry: any) => {
      if (typeof entry === "string") allSkillIds.add(entry);
      else if (entry && typeof entry.skill_id === "string") allSkillIds.add(entry.skill_id);
    });
  }

  const relevantSkills = (skillLibrary as any).skill_library.filter(
    (s: any) => allSkillIds.has(s.skill_id || s.id),
  );

  const relevantSignals = (proofSignalLibrary as any).proof_signal_library.filter(
    (ps: any) => {
      const signalSkills = ps.mapped_skills || ps.skills || ps.skill_ids || [];
      return signalSkills.some((sid: any) => {
        if (typeof sid === "string") return allSkillIds.has(sid);
        if (sid && typeof sid.skill_id === "string") return allSkillIds.has(sid.skill_id);
        return false;
      });
    },
  );

  return `ROLE-LIBRARY CONTEXT (controlled vocabulary — use to pick which of the user's real skills to emphasize; DO NOT use to invent skills the user doesn't have):

TARGET ROLE DEFINITION:
${JSON.stringify(targetRoleDef, null, 2)}

ROLE-SKILL MAPPING (core = must-haves, secondary = nice-to-haves, differentiator = standouts):
${JSON.stringify(targetMapping, null, 2)}

RELEVANT SKILLS (only the skills mapped to this role):
${JSON.stringify(relevantSkills, null, 2)}

RELEVANT PROOF SIGNALS (map user experiences to these signals when possible):
${JSON.stringify(relevantSignals, null, 2)}
`;
}

// ─── Full production prompt assembly ────────────────────────────────────
// Mirrors generate-tailored-cv/index.ts:1237-1249 verbatim. Conditionals
// resolved for our scenario:
//   - STRUCTURED_REQUIREMENTS_RULE: "" (no application_id → null
//     targetRoleContext → falsy gate at index.ts:1192).
//   - LIBRARY_CONTEXT: computed above (CS Specialist matches the role
//     library, so it fires).
// The KEYWORD_INJECTION_BLOCK at the end of the production userPrompt is
// NOT part of the system prompt; we don't include it here. The bake-off
// user message is also JD-less, so production parity holds.

function buildProductionSystemPrompt(targetRole: string): string {
  const LIBRARY_CONTEXT = buildProductionLibraryContext(targetRole);
  const STRUCTURED_REQUIREMENTS_RULE = ""; // does not fire for our scenario

  return (
    `You are a CV Generation Engine for the "Get A Job" Career Operating System. Your job is to produce a tailored, one-page, truthful CV as JSON. The CV WILL be sent to real employers — so every word must be grounded in the user's actual data.\n\n` +
    `You are generating a TAILORED CV. The CV must be specifically customized for the target job description. Generic CVs that don't incorporate JD-specific language will be rejected.\n\n` +
    PROD_ONE_PAGE_RULE + `\n` +
    PROD_TRUTHFULNESS_RULES + `\n` +
    CV_VOICE_RULES + `\n` +
    PROD_STRUCTURE_RULES + `\n` +
    PROD_TAILORING_RULES + `\n` +
    STRUCTURED_REQUIREMENTS_RULE + `\n` +
    LIBRARY_CONTEXT + `\n` +
    `REMINDER: Truthfulness beats polish AND one-page fit is non-negotiable. If a bullet needs a metric to sound impressive but you have no metric in the source, leave it without. Do not invent. If content is overflowing, shorten bullets rather than dropping entries.

BEFORE FINALIZING THE JSON: count how many of the must_include_phrases appear anywhere in your output (case-insensitive substring match in any field). If fewer than 6 of 10 — or fewer than 60% of however many were provided — rewrite bullets to incorporate more, but ONLY where the user actually has the underlying experience. The factual-integrity rules above always win.`
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Post-PR-#234 OUTPUT SCHEMA block — `{index, bullets}` per bucket.
// Vendored verbatim from generate-tailored-cv/index.ts:1313-1338. The
// outer JSON-object boundaries are preserved so the schema reads as a
// complete shape. Used by all three configs so the LLM is asked for the
// same contract regardless of system prompt — what differs across cells
// is the bullet-policy + source-ranking guidance, not the output shape.
// ═══════════════════════════════════════════════════════════════════════

const SCHEMA_BLOCK = `
Return JSON only, exactly this shape:
{
  "about_me": "string — 2-4 sentences grounded in USER DATA",
  "professional_experiences": [
    { "index": "integer — the EXACT \`index\` from USER DATA.professional_experiences[]. You echo this number only; do NOT emit title, company, or dates.", "bullets": [
      "Action verb + what the user did + concrete outcome (tool / scope / metric). 14-22 words. Anchored in a story metric or proof_signal when available.",
      "Second bullet referencing a specific item from the experience's skills[] (a tool, platform, or named capability) or a named project — different facet of the role than bullet 1.",
      "Third bullet describing scope, stakeholders, or impact — preferably with a quantified outcome from the source data.",
      "Optional fourth bullet when the role has rich source material (multiple stories, multiple named tools, distinct facets). 5 bullets is the hard ceiling; beyond that the section reads as a list rather than a profile."
    ] }
  ],
  "military_experiences": [
    { "index": "integer — the EXACT \`index\` from USER DATA.military_experiences[]. You echo this number only; do NOT emit title, unit, or dates.", "bullets": [
      "Civilian-readable description of operational responsibility. 14-22 words.",
      "Second bullet describing team size, mission scope, or training led.",
      "Optional third bullet for honors / commendations earned in the role."
    ] }
  ],
  "volunteering_experiences": [
    { "index": "integer — the EXACT \`index\` from USER DATA.volunteering_experiences[]. You echo this number only; do NOT emit title, organization, or dates.", "bullets": [
      "Authentic volunteer-context bullet — what was built, taught, or coordinated.",
      "Second bullet — scope (audience size, duration, team coordinated)."
    ] }
  ],
  "leadership_experiences": [
    { "index": "integer — the EXACT \`index\` from USER DATA.leadership_experiences[]. You echo this number only; do NOT emit title, organization, or dates.", "bullets": [
      "What the user led + the concrete outcome.",
      "Second bullet — scope, format, frequency, or impact."
    ] }
  ],
  "skills": ["string", ...],
  "projects": [
    { "name": "string", "bullets": ["string", ...] }
  ]
}

SPECIFIC OUTPUT RULES:
- For every experience entry you output exactly two fields: \`index\` (the integer from the matching USER DATA bucket entry — 0, 1, 2…) and \`bullets\` (the array of bullet strings). DO NOT emit title, company, unit, organization, or dates — those are server-filled. Echoing them is wasted tokens and any value you put there is discarded.
- Emit at most one output entry per source index. The union of indices you emit must match the indices present in USER DATA (don't skip a real experience, don't invent indices beyond the source bucket length).
- Every bullet must trace to something in the user's responsibilities text. Rephrase, don't invent.
- Return ONLY valid JSON. No markdown, no prose outside the JSON object.`;

// ═══════════════════════════════════════════════════════════════════════
// Option A bullet policy (the bake-off winner) + the renamed POLICY_SLICE.
// POLICY_SLICE is the old OLD_BULLET_POLICY — preserved as a runnable
// constant for ad-hoc use but excluded from the default three-cell matrix.
// ═══════════════════════════════════════════════════════════════════════

export const TRUTHFULNESS_CORE = `TRUTHFULNESS — these override all other rules:
- NEVER invent metrics, numbers, percentages, durations, team sizes, dollar amounts, dates, company names, or tools that aren't EXPLICITLY in the user's source data.
- NEVER add skills, tools, certifications, or experiences the user doesn't have in the source.
- Use EXACT job titles and company names from the source.`;

export const VOICE_CORE = `WRITING VOICE:
- Action verbs that picture a real action ("Built", "Migrated", "Negotiated", "Reduced") — not category verbs ("leveraged", "drove growth").
- 14-22 words per bullet. No filler.
- Numbers belong in bullets when they exist in the source data. Round numbers that look invented are worse than no numbers.`;

// Renamed from OLD_BULLET_POLICY — kept runnable for ad-hoc use, not in the
// default three-cell matrix per the 2026-06-10 scoping.
export const POLICY_SLICE = `BULLET POLICY (legacy simplified slice — NOT a faithful production proxy):
- Professional experiences: 2-4 bullets per role. Pick the number based on richness of the source: a role with one short responsibility line gets 2 bullets; a role with multiple stories + named tools + measured outcomes gets 4.
- Hard ceiling: 5 bullets per experience.
- SOURCE PRECEDENCE: when stories[] contains a story whose experience_label matches an experience AND a JD requirement, PREFER the story's result + metrics + tools_used over the experience's freeform responsibilities text. Otherwise use the responsibilities text.
- VERBATIM METRICS (stories only): every entry from a matched story's metrics[] array must appear in a bullet WORD-FOR-WORD. Numbers in responsibilities text may be rephrased.`;

export const NEW_BULLET_POLICY = `BULLET POLICY (Option A):
- Professional experiences: ONE bullet per distinct responsibility line in the source, capped at 6. If the user wrote 5 responsibility lines, emit 5 bullets — do not compress to 3. If 1 short line, emit 1-2 bullets (split a compound responsibility if needed; do not invent). Faithfulness over compression. Drop the LEAST JD-relevant line only if you hit the 6-bullet ceiling.
- SOURCE PRECEDENCE — RESPONSIBILITIES FIRST: experience.responsibilities is the PRIMARY source. Stories are OPTIONAL ENRICHMENT — they may contribute a metric or named tool the responsibility omits, but never replace a responsibility line. Source ranking: responsibilities > proof_signals (enrichment) > stories (enrichment).
- VERBATIM METRICS (responsibilities AND stories): every number in the responsibilities text — counts, percentages, currency, durations, team sizes, volumes — MUST appear in a bullet for that experience. Rephrasing applies to verbs and structure, NOT to the numbers themselves. If a single bullet can't carry all numbers, distribute across multiple bullets for the same experience.
- SPARSE-PROFILE FALLBACK: when professional_experiences[] is empty or contains only a short single entry, the About Me must anchor on education + draw 2-3 specific claims from proof_signals. Render up to 4 academic_projects per education entry (cap rises from 2 to 4). Surface every project. Skills section carries the relevance signal.`;

const buildOptionASystemPrompt = (): string => `You are writing a tailored resume for a candidate applying to "${TARGET_ROLE}".

${TRUTHFULNESS_CORE}

${VOICE_CORE}

${NEW_BULLET_POLICY}
${SCHEMA_BLOCK}`;

// ═══════════════════════════════════════════════════════════════════════
// User context loading + user-message formatting.
// Output includes `index` per bucket entry so the LLM can echo it back per
// the post-PR-#234 schema contract.
// ═══════════════════════════════════════════════════════════════════════

export interface UserContext {
  email: string;
  full_name: string;
  profile_summary: string;
  professional_experiences: Array<{
    index: number;
    title: string;
    company: string;
    dates: string;
    responsibilities: string;
    skills: string[];
  }>;
  projects: Array<{ name: string; description: string; skills: string[] }>;
  education: Array<{
    institution: string;
    degree: string;
    field_of_study: string;
    academic_projects: string[];
  }>;
  proof_signals: any[];
  skills: string[];
}

let _userIndex: Map<string, string> | null = null;
async function userIdByEmail(email: string): Promise<string | null> {
  if (!_userIndex) {
    _userIndex = new Map();
    let page = 1;
    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(`auth.admin.listUsers failed: ${error.message}`);
      for (const u of data.users) {
        if (u.email) _userIndex.set(u.email.trim().toLowerCase(), u.id);
      }
      if (data.users.length < 1000) break;
      page++;
    }
  }
  return _userIndex.get(email.trim().toLowerCase()) ?? null;
}

export async function loadUser(email: string): Promise<UserContext | null> {
  const userId = await userIdByEmail(email);
  if (!userId) {
    console.error(`  could not resolve ${email}: not found in auth.users`);
    return null;
  }

  const [pRes, eRes, prRes, edRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("experiences").select("*").eq("user_id", userId),
    supabase.from("projects").select("*").eq("user_id", userId),
    supabase.from("education").select("*").eq("user_id", userId).order("display_order", { ascending: true }),
  ]);

  const p = pRes.data as any;
  if (!p) return null;

  const fmtDates = (e: any): string => {
    const s = String(e?.start_date ?? "").slice(0, 20);
    const en = e?.is_current ? "Present" : String(e?.end_date ?? "").slice(0, 20);
    if (!s && !en) return "";
    return `${s}${en ? ` – ${en}` : ""}`;
  };

  return {
    email,
    full_name: p.full_name ?? "",
    profile_summary: p.summary ?? "",
    professional_experiences: (eRes.data || []).map((e: any, i: number) => ({
      index: i,
      title: String(e.title || "").slice(0, 100),
      company: String(e.company || "").slice(0, 100),
      dates: fmtDates(e),
      responsibilities: String(e.responsibilities || "").slice(0, 4000),
      skills: Array.isArray(e.skills) ? e.skills.slice(0, 40).map((s: any) => String(s).slice(0, 60)) : [],
    })),
    projects: (prRes.data || []).map((pr: any) => ({
      name: String(pr.name || "").slice(0, 100),
      description: String(pr.description || "").slice(0, 500),
      skills: Array.isArray(pr.skills) ? pr.skills.slice(0, 20).map((s: any) => String(s).slice(0, 60)) : [],
    })),
    education: (edRes.data || []).map((e: any) => ({
      institution: String(e.institution || "").slice(0, 200),
      degree: String(e.degree_type || "").slice(0, 100),
      field_of_study: String(e.field_of_study || "").slice(0, 100),
      academic_projects: Array.isArray(e.academic_projects)
        ? e.academic_projects.slice(0, 10).map((x: any) => String(x).slice(0, 200))
        : [],
    })),
    proof_signals: Array.isArray(p.proof_signals) ? p.proof_signals.slice(0, 20) : [],
    skills: Array.isArray(p.skills) ? p.skills.slice(0, 50).map((s: any) => String(s).slice(0, 60)) : [],
  };
}

export function formatUserPayload(u: UserContext): string {
  return JSON.stringify({
    target_role: TARGET_ROLE,
    candidate: { full_name: u.full_name, summary: u.profile_summary, skills: u.skills },
    professional_experiences: u.professional_experiences,
    education: u.education,
    projects: u.projects,
    proof_signals: u.proof_signals,
    stories: [],
  }, null, 2);
}

// ═══════════════════════════════════════════════════════════════════════
// Model invocation. Token-param routing fix from 2026-06-10 preserved
// (never both max_tokens AND max_completion_tokens). Per-cell raw response
// JSON is written to /tmp/cv-bakeoff-raw/ for hand-inspection.
// ═══════════════════════════════════════════════════════════════════════

export interface CallResult {
  cv: any;
  raw_response_text: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  cost_usd: number;
  ok: boolean;
  error?: string;
  request_body?: any;
}

function priceFor(slug: string): { in_per_m: number; out_per_m: number } {
  return PRICING_FALLBACK[slug] ?? { in_per_m: 0, out_per_m: 0 };
}

export async function callModel(modelSlug: string, systemPrompt: string, userContent: string): Promise<CallResult> {
  const t0 = Date.now();
  const isDirectOpenAI = modelSlug === GPT4O_CONTROL;
  const url = isDirectOpenAI
    ? "https://api.openai.com/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";
  const key = isDirectOpenAI ? OPENAI_API_KEY! : OPENROUTER_API_KEY!;

  const reasoning = isReasoningModel(modelSlug);
  const completionCap = isDirectOpenAI ? 4096 : reasoning ? 16000 : 8000;

  const body: any = {
    model: modelSlug,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  };
  // Token-param routing — never send both. Mirrors test-cv-extraction-bakeoff.ts.
  if (reasoning) {
    body.max_completion_tokens = completionCap;
  } else {
    body.max_tokens = completionCap;
  }
  if (reasoning && !isDirectOpenAI) {
    body.reasoning = { effort: "low" };
    body.reasoning_effort = "low";
  }

  try {
    const headers = assertLatin1Headers({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(isDirectOpenAI ? {} : {
        "HTTP-Referer": latin1SafeHeader("https://getajob.careers"),
        "X-Title": latin1SafeHeader("Get A Job - CV bake-off eval"),
      }),
    });
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const latency_ms = Date.now() - t0;
    if (!res.ok) {
      const t = await res.text();
      return {
        cv: {}, raw_response_text: "",
        tokens_in: 0, tokens_out: 0, latency_ms,
        cost_usd: 0, ok: false,
        error: `HTTP ${res.status}: ${t.slice(0, 200)}`,
        request_body: body,
      };
    }
    const j = await res.json();
    const raw: string = j.choices?.[0]?.message?.content || "";
    const finish_reason: string = j.choices?.[0]?.finish_reason || "";
    const tokens_in = j.usage?.prompt_tokens ?? 0;
    const tokens_out = j.usage?.completion_tokens ?? 0;
    const p = priceFor(modelSlug);
    const cost_usd = (tokens_in / 1e6) * p.in_per_m + (tokens_out / 1e6) * p.out_per_m;

    const tryParse = (s: string): any => {
      try { return JSON.parse(s); } catch { return null; }
    };
    let parsed = tryParse(raw);
    if (!parsed) {
      const fenced = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/i);
      if (fenced) parsed = tryParse(fenced[1]);
    }
    if (!parsed) {
      const brace = raw.match(/\{[\s\S]*\}/);
      if (brace) parsed = tryParse(brace[0]);
    }
    if (!parsed) {
      const truncated = finish_reason === "length" || tokens_out >= completionCap - 50;
      const label = truncated
        ? `truncated finish_reason=${finish_reason} visible_tokens=${tokens_out}`
        : `bad_json finish_reason=${finish_reason}: ${raw.slice(0, 150)}`;
      return { cv: {}, raw_response_text: raw, tokens_in, tokens_out, latency_ms, cost_usd, ok: false, error: label, request_body: body };
    }
    if (finish_reason === "length") {
      return {
        cv: parsed, raw_response_text: raw,
        tokens_in, tokens_out, latency_ms, cost_usd,
        ok: false,
        error: `truncated_but_parsed finish_reason=length visible_tokens=${tokens_out} cap=${completionCap}`,
        request_body: body,
      };
    }
    return { cv: parsed, raw_response_text: raw, tokens_in, tokens_out, latency_ms, cost_usd, ok: true, request_body: body };
  } catch (e) {
    return {
      cv: {}, raw_response_text: "",
      tokens_in: 0, tokens_out: 0, latency_ms: Date.now() - t0,
      cost_usd: 0, ok: false,
      error: e instanceof Error ? e.message : String(e),
      request_body: body,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Validators
//   1. Index validity: integers, 0-based, in-order, no gaps/duplicates per
//      bucket.
//   2. unsourcedBullets — production validator port (verbatim from
//      generate-tailored-cv/index.ts:2085-2153).
//   3. Per-number detail: every quantified token with hit/miss.
//   4. Range tokens: flag for review, never a failure.
// ═══════════════════════════════════════════════════════════════════════

const BUCKETS = [
  "professional_experiences",
  "military_experiences",
  "volunteering_experiences",
  "leadership_experiences",
] as const;

interface IndexValidityResult {
  pass: boolean;
  fails: Array<{ bucket: string; reason: string; raw_sequence: any[] }>;
}

function checkIndexValidity(cv: any): IndexValidityResult {
  const fails: IndexValidityResult["fails"] = [];
  for (const bucket of BUCKETS) {
    const entries = Array.isArray(cv?.[bucket]) ? cv[bucket] : [];
    if (entries.length === 0) continue;
    const raw_sequence = entries.map((e: any) => e?.index);
    // (a) every index is an integer
    for (let i = 0; i < raw_sequence.length; i++) {
      const v = raw_sequence[i];
      if (typeof v !== "number" || !Number.isInteger(v)) {
        fails.push({ bucket, reason: `entry ${i} has non-integer index (got ${JSON.stringify(v)} typeof ${typeof v})`, raw_sequence });
        break;
      }
    }
    if (fails.find((f) => f.bucket === bucket)) continue;
    // (b) sequence is 0..N-1 in order, no gaps, no duplicates
    const expected = Array.from({ length: raw_sequence.length }, (_, i) => i);
    if (JSON.stringify(raw_sequence) !== JSON.stringify(expected)) {
      fails.push({ bucket, reason: `expected [${expected.join(",")}], got [${raw_sequence.join(",")}]`, raw_sequence });
    }
  }
  return { pass: fails.length === 0, fails };
}

// Production unsourcedBullets validator — copied verbatim from
// generate-tailored-cv/index.ts:2085-2153 to keep behavior identical.

const QUANT_TOKEN_RE = /\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?[%$€₪]?|[$€₪]\d+[KMB]?|\d+\+|\d+x|[A-Z][a-z]+(?:[A-Z][a-zA-Z]+)+|[A-Z]{3,})\b/g;
const TOKEN_BLOCKLIST = new Set(['Israel','Tel','Aviv','Hebrew','English','USA','UK','EU','API','CV','JD','PM','HR','CS','VIP','CEO','CFO','CTO','COO','SQL']);

const safeArray = (v: any): any[] => Array.isArray(v) ? v : [];

interface NumericToken { token: string; hit: boolean; bucket: string }
interface ValidatorResult {
  unsourcedBullets: Array<{ bucket: string; bullet: string; tokens: string[] }>;
  numericTokens: NumericToken[];
  rangeFlags: Array<{ bucket: string; bullet: string; matched: string }>;
}

const RANGE_TOKEN_RE = /\b\d+(?:\.\d+)?%?\s*[-–—]\s*\d+(?:\.\d+)?%?\b|\b\d+(?:\.\d+)?%?\s+to\s+\d+(?:\.\d+)?%?\b/g;

function runValidators(cv: any, u: UserContext): ValidatorResult {
  // Source haystack — production validator haystack composition (six sources,
  // index.ts:2101-2122).
  const sourceHaystackParts: string[] = [];
  for (const e of u.professional_experiences) {
    if (e.responsibilities) sourceHaystackParts.push(String(e.responsibilities));
    for (const s of (e.skills || [])) sourceHaystackParts.push(String(s));
  }
  for (const ps of safeArray(u.proof_signals)) {
    if (!ps) continue;
    for (const ev of safeArray((ps as any).supporting_evidence)) sourceHaystackParts.push(String(ev));
  }
  for (const s of (u.skills || [])) sourceHaystackParts.push(String(s));
  for (const p of (u.projects || [])) {
    if (p.description) sourceHaystackParts.push(String(p.description));
    for (const s of (p.skills || [])) sourceHaystackParts.push(String(s));
  }
  // Story bank not exercised in this bake-off (empty stories[]).
  const sourceHaystack = sourceHaystackParts.join(" \n ").toLowerCase();

  const unsourcedBullets: ValidatorResult["unsourcedBullets"] = [];
  const numericTokens: NumericToken[] = [];
  const rangeFlags: ValidatorResult["rangeFlags"] = [];

  const checkBullet = (bullet: string, bucket: string) => {
    const text = String(bullet || "").trim();
    if (!text) return;
    // Quantified-token detection + hit/miss.
    const tokens = text.match(QUANT_TOKEN_RE) || [];
    const unsourced: string[] = [];
    for (const tok of tokens) {
      if (TOKEN_BLOCKLIST.has(tok)) continue;
      const lower = tok.toLowerCase();
      const hit = sourceHaystack.includes(lower);
      numericTokens.push({ token: tok, hit, bucket });
      if (!hit) unsourced.push(tok);
    }
    if (unsourced.length > 0) unsourcedBullets.push({ bucket, bullet: text, tokens: unsourced });
    // Range-token flag — never counted as failure.
    const rangeMatch = text.match(RANGE_TOKEN_RE);
    if (rangeMatch) {
      for (const m of rangeMatch) rangeFlags.push({ bucket, bullet: text, matched: m });
    }
  };

  for (const bucket of BUCKETS) {
    const entries = Array.isArray(cv?.[bucket]) ? cv[bucket] : [];
    for (const e of entries) {
      for (const b of (e?.bullets || [])) checkBullet(b, bucket);
    }
  }
  // Also scan projects[] bullets per production validator (index.ts:2144).
  const projs = Array.isArray(cv?.projects) ? cv.projects : [];
  for (const p of projs) {
    for (const b of (p?.bullets || [])) checkBullet(b, "projects");
  }

  return { unsourcedBullets, numericTokens, rangeFlags };
}

// Also retain the legacy harness's source-number coverage check (numbers
// found in source experience.responsibilities — what % made it into output
// bullets). Kept for the "numbers carried X/Y" aggregate column.

function countNumbersInText(text: string): string[] {
  if (!text) return [];
  const matches = text.match(
    /\b\d+(?:[\.,]\d+)?\s*%|\$\s*\d+(?:[\.,]\d+)?\s*[MmKkBb]?|\b\d+\s*(?:k|K|M|B|m)\b|\b\d+(?:[\.,]\d+)?\s*(?:years?|months?|weeks?|days?|hours?|quarters?|Q[1-4]|FY|people|employees|team\s*members?|customers?|users?|students?|accounts?|projects?|deals?|leads?|interviews?|hires?|countries|cities|stores|stakeholders?)\b/gi,
  ) || [];
  return Array.from(new Set(matches.map((m) => m.trim())));
}

function bulletsContainNumber(bullets: string[], num: string): boolean {
  const blob = bullets.join(" \n ").toLowerCase();
  return blob.includes(num.toLowerCase());
}

// ═══════════════════════════════════════════════════════════════════════
// Per-user pipeline (three-cell matrix).
// ═══════════════════════════════════════════════════════════════════════

interface CellResult {
  config_label: string;
  ok: boolean;
  error?: string;
  cv: any;
  raw_response_text: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  cost_usd: number;
  total_bullets: number;
  numbers_carried_x: number;
  numbers_carried_y: number;
  index_validity: IndexValidityResult;
  validator: ValidatorResult;
}

interface UserReport {
  email: string;
  full_name: string;
  source: {
    exp_count: number;
    project_count: number;
    proof_signal_count: number;
    education_count: number;
    source_numbers: Record<string, string[]>;
  };
  cells: CellResult[];
}

const slugifyEmail = (email: string): string => email.split("@")[0].replace(/[^a-z0-9]+/gi, "_").toLowerCase();

function ensureRawDir(): void {
  if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, { recursive: true });
}

function dumpRawCell(email: string, configLabel: string, result: CallResult): void {
  ensureRawDir();
  const slug = slugifyEmail(email);
  const configSlug = configLabel.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  const responsePath = `${RAW_DIR}/${slug}__${configSlug}.json`;
  const requestPath = `${RAW_DIR}/${slug}__${configSlug}__request.json`;
  const responsePayload = {
    config_label: configLabel,
    ok: result.ok,
    error: result.error ?? null,
    latency_ms: result.latency_ms,
    cost_usd: result.cost_usd,
    tokens_in: result.tokens_in,
    tokens_out: result.tokens_out,
    raw_response_text: result.raw_response_text,
    parsed_cv: result.cv,
  };
  writeFileSync(responsePath, JSON.stringify(responsePayload, null, 2));
  // Request-body dump — exact body sent to the upstream API. Captures model,
  // both messages (system + user), temperature, response_format, token cap,
  // and any reasoning params. Lets a reviewer reconstruct the assembled
  // prompt for a cell without re-deriving it from the snapshot + harness.
  const requestPayload = {
    config_label: configLabel,
    request_body: result.request_body ?? null,
  };
  writeFileSync(requestPath, JSON.stringify(requestPayload, null, 2));
}

function tallyCellMetrics(cv: any, sourceNumbers: Record<string, string[]>): { total_bullets: number; numbers_carried_x: number; numbers_carried_y: number } {
  let total_bullets = 0;
  for (const bucket of BUCKETS) {
    const entries = Array.isArray(cv?.[bucket]) ? cv[bucket] : [];
    for (const e of entries) total_bullets += Array.isArray(e?.bullets) ? e.bullets.length : 0;
  }
  const projs = Array.isArray(cv?.projects) ? cv.projects : [];
  for (const p of projs) total_bullets += Array.isArray(p?.bullets) ? p.bullets.length : 0;

  // For the "numbers carried" aggregate, walk all professional bullets and
  // check against the source numbers detected from experience.responsibilities.
  let numbers_carried_x = 0;
  let numbers_carried_y = 0;
  const profEntries = Array.isArray(cv?.professional_experiences) ? cv.professional_experiences : [];
  for (let i = 0; i < profEntries.length; i++) {
    const entry = profEntries[i];
    const idx = typeof entry?.index === "number" ? entry.index : i;
    const key = `idx_${idx}`;
    const need = sourceNumbers[key] || [];
    const bullets = Array.isArray(entry?.bullets) ? entry.bullets : [];
    for (const n of need) {
      numbers_carried_y++;
      if (bulletsContainNumber(bullets, n)) numbers_carried_x++;
    }
  }
  return { total_bullets, numbers_carried_x, numbers_carried_y };
}

async function reportOneUser(email: string, productionSystemPrompt: string): Promise<UserReport | null> {
  console.error(`\n=== ${email} ===`);
  const u = await loadUser(email);
  if (!u) return null;
  console.error(`  ${u.full_name}: ${u.professional_experiences.length} exp / ${u.projects.length} projects / ${u.proof_signals.length} proof_signals / ${u.education.length} edu`);

  // Source numbers keyed by `idx_N` for downstream lookup keyed by index.
  const sourceNumbers: Record<string, string[]> = {};
  for (const exp of u.professional_experiences) {
    const nums = countNumbersInText(exp.responsibilities);
    if (nums.length > 0) sourceNumbers[`idx_${exp.index}`] = nums;
  }

  const userPayload = formatUserPayload(u);
  const optionASystemPrompt = buildOptionASystemPrompt() + `\n` + SCHEMA_BLOCK_FOR_OPTION_A();

  const cells: CellResult[] = [];
  const matrix: Array<{ label: string; model: string; system: string }> = [
    { label: CELL_PROD_SNAP, model: GPT4O_CONTROL, system: productionSystemPrompt + `\n` + SCHEMA_BLOCK },
    { label: CELL_GPT4O_OPTION_A, model: GPT4O_CONTROL, system: optionASystemPrompt },
    { label: CELL_SONNET_OPTION_A, model: SONNET_SLUG, system: optionASystemPrompt },
  ];
  for (const { label, model, system } of matrix) {
    console.error(`  → ${label}…`);
    const r = await callModel(model, system, userPayload);
    dumpRawCell(email, label, r);
    const tally = tallyCellMetrics(r.cv, sourceNumbers);
    const indexValidity = checkIndexValidity(r.cv);
    const validator = runValidators(r.cv, u);
    cells.push({
      config_label: label,
      ok: r.ok,
      error: r.error,
      cv: r.cv,
      raw_response_text: r.raw_response_text,
      tokens_in: r.tokens_in,
      tokens_out: r.tokens_out,
      latency_ms: r.latency_ms,
      cost_usd: r.cost_usd,
      total_bullets: tally.total_bullets,
      numbers_carried_x: tally.numbers_carried_x,
      numbers_carried_y: tally.numbers_carried_y,
      index_validity: indexValidity,
      validator,
    });
  }

  return {
    email,
    full_name: u.full_name,
    source: {
      exp_count: u.professional_experiences.length,
      project_count: u.projects.length,
      proof_signal_count: u.proof_signals.length,
      education_count: u.education.length,
      source_numbers: sourceNumbers,
    },
    cells,
  };
}

// SCHEMA_BLOCK is included once in PROD-SNAP cell + once in Option A cell.
// To avoid double-appending for Option A (which already has SCHEMA_BLOCK
// inside buildOptionASystemPrompt), use a no-op for Option A. The cleanest
// way to express this in the matrix above is via a marker function — Option
// A's prompt already includes SCHEMA_BLOCK so we don't append it again.
function SCHEMA_BLOCK_FOR_OPTION_A(): string { return ""; }

// ═══════════════════════════════════════════════════════════════════════
// Profile picking — invite-code fetch with CV-upload filter (mirrors
// test-cv-extraction-bakeoff.ts:625-643).
// ═══════════════════════════════════════════════════════════════════════

const REQUIRED_AGAMF = "agamf123@gmail.com";

async function userHasUploadedCv(userId: string): Promise<boolean> {
  const { data, error } = await supabase.storage.from("resumes").list(userId, { limit: 5 });
  if (error) return false;
  return (data || []).some((o: any) => o.name && !o.name.endsWith("/"));
}

async function pickEmails(): Promise<string[]> {
  if (EMAILS_ARG) {
    return EMAILS_ARG.split(",").map((s) => s.trim()).filter(Boolean);
  }
  // Default: pilot users via invite_code filter
  const { data, error } = await supabase
    .from("profiles")
    .select("id, invite_code")
    .in("invite_code", INVITE_CODES);
  if (error) throw new Error(`profiles query failed: ${error.message}`);
  await userIdByEmail("warmup@invalid.invalid"); // populate _userIndex
  const byId = new Map<string, string>();
  for (const [email, uid] of _userIndex!.entries()) byId.set(uid, email);

  const candidates: Array<{ email: string; userId: string }> = [];
  for (const row of (data || []) as any[]) {
    const email = byId.get(row.id);
    if (email) candidates.push({ email, userId: row.id });
  }

  // Filter to candidates with uploaded CV.
  const withCv: string[] = [];
  for (const c of candidates) {
    if (await userHasUploadedCv(c.userId)) withCv.push(c.email);
  }
  withCv.sort();

  console.error(`Discovered ${candidates.length} pilot profiles; ${withCv.length} have an uploaded CV.`);
  if (!withCv.includes(REQUIRED_AGAMF)) {
    console.error(`HALT: required sparse-profile case ${REQUIRED_AGAMF} not present in CV-uploaded set.`);
    const inCohort = candidates.find((c) => c.email === REQUIRED_AGAMF);
    if (!inCohort) {
      console.error(`  reason: not in invite-code cohort (${INVITE_CODES.join("+")}).`);
    } else {
      console.error(`  reason: in cohort, but no resume file under resumes/${inCohort.userId}/.`);
    }
    process.exit(2);
  }
  for (const e of withCv) console.error(`  - ${e}`);
  return withCv;
}

// ═══════════════════════════════════════════════════════════════════════
// Markdown report — summary table at top, per-profile detail below.
// ═══════════════════════════════════════════════════════════════════════

function pct(num: number, den: number): string {
  if (den === 0) return "—";
  return `${Math.round((num / den) * 100)}%`;
}

function renderMarkdown(reports: UserReport[], snapshotHeader: { sha: string; generatedAt: string; includedBlocks: string[]; excludedBlocks: string[] }): string {
  const lines: string[] = [];
  lines.push("# CV authoring bake-off — Phase 0 (Sonnet swap pre-flight)");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Target role: "${TARGET_ROLE}"`);
  lines.push(`Profiles run: ${reports.length}`);
  lines.push("");
  lines.push("## Production prompt snapshot");
  lines.push("");
  lines.push(`- File: \`${SNAPSHOT_FILE}\``);
  lines.push(`- SHA-256: \`${snapshotHeader.sha}\``);
  lines.push(`- Generated: ${snapshotHeader.generatedAt}`);
  lines.push(`- Included blocks (fired for this scenario): ${snapshotHeader.includedBlocks.map((s) => "`" + s + "`").join(", ")}`);
  lines.push(`- Excluded blocks (did not fire): ${snapshotHeader.excludedBlocks.map((s) => "`" + s + "`").join(", ")}`);
  lines.push(`- Validator haystack excludes story sources (metrics/result/action/skills_demonstrated/tools_used) — all pilot-cohort profiles have zero stories as of 2026-06-10; re-add before any run against story-bearing profiles.`);
  lines.push("");

  const cellLabels = [CELL_PROD_SNAP, CELL_GPT4O_OPTION_A, CELL_SONNET_OPTION_A];

  // Summary table.
  lines.push("## Per-cell summary");
  lines.push("");
  lines.push("| Cell | Profiles run | Index validity | Total unsourced | Range flags | Numbers carried | p50 latency (ms) | Cost ($) |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const label of cellLabels) {
    const cells = reports.map((r) => r.cells.find((c) => c.config_label === label)).filter(Boolean) as CellResult[];
    const okCells = cells.filter((c) => c.ok);
    const indexPass = okCells.filter((c) => c.index_validity.pass).length;
    const totalUnsourced = okCells.reduce((acc, c) => acc + c.validator.unsourcedBullets.length, 0);
    const rangeFlags = okCells.reduce((acc, c) => acc + c.validator.rangeFlags.length, 0);
    const numbersX = okCells.reduce((acc, c) => acc + c.numbers_carried_x, 0);
    const numbersY = okCells.reduce((acc, c) => acc + c.numbers_carried_y, 0);
    const lats = okCells.map((c) => c.latency_ms).sort((a, b) => a - b);
    const p50 = lats.length === 0 ? "—" : String(lats[Math.floor(lats.length / 2)]);
    const cost = okCells.reduce((acc, c) => acc + c.cost_usd, 0).toFixed(4);
    lines.push(
      `| \`${label}\` | ${okCells.length}/${cells.length} | ${indexPass}/${okCells.length} (${pct(indexPass, okCells.length)}) | ${totalUnsourced} | ${rangeFlags} | ${numbersX}/${numbersY} (${pct(numbersX, numbersY)}) | ${p50} | $${cost} |`,
    );
  }
  lines.push("");

  // Per-user detail.
  for (const r of reports) {
    lines.push("---");
    lines.push("");
    lines.push(`## ${r.full_name} — ${r.email}`);
    lines.push(`Source: ${r.source.exp_count} experiences, ${r.source.project_count} projects, ${r.source.proof_signal_count} proof_signals, ${r.source.education_count} education entries.`);
    lines.push("");
    if (Object.keys(r.source.source_numbers).length > 0) {
      lines.push("**Source numbers detected (target for carry-through):**");
      for (const [k, nums] of Object.entries(r.source.source_numbers)) {
        lines.push(`- ${k}: ${nums.join(" · ")}`);
      }
      lines.push("");
    }

    lines.push("| Cell | Bullets | Index validity | Unsourced | Range flags | Nums | Latency | Cost | Status |");
    lines.push("|---|---:|---|---:|---:|---:|---:|---:|---|");
    for (const c of r.cells) {
      const idxStr = c.ok ? (c.index_validity.pass ? "✓" : `✗ ${c.index_validity.fails.map((f) => `${f.bucket}=[${f.raw_sequence.join(",")}]`).join("; ")}`) : "—";
      const numsStr = c.numbers_carried_y > 0 ? `${c.numbers_carried_x}/${c.numbers_carried_y}` : "—";
      const status = c.ok ? "ok" : `**FAIL**: ${(c.error || "").slice(0, 80)}`;
      lines.push(
        `| \`${c.config_label}\` | ${c.total_bullets} | ${idxStr} | ${c.validator.unsourcedBullets.length} | ${c.validator.rangeFlags.length} | ${numsStr} | ${c.latency_ms}ms | $${c.cost_usd.toFixed(4)} | ${status} |`,
      );
    }
    lines.push("");

    // Per-cell detail: unsourced bullets + numeric tokens + range flags.
    for (const c of r.cells) {
      if (!c.ok) continue;
      const v = c.validator;
      if (v.unsourcedBullets.length === 0 && v.rangeFlags.length === 0 && v.numericTokens.length === 0) continue;
      lines.push(`### ${c.config_label} — detail`);
      lines.push("");
      if (v.unsourcedBullets.length > 0) {
        lines.push("**Unsourced bullets:**");
        for (const u of v.unsourcedBullets) {
          lines.push(`- [${u.bucket}] tokens=[${u.tokens.join(", ")}] — "${u.bullet.slice(0, 200)}"`);
        }
        lines.push("");
      }
      if (v.rangeFlags.length > 0) {
        lines.push("**Range tokens (manual-review flag, not a failure):**");
        for (const f of v.rangeFlags) {
          lines.push(`- [${f.bucket}] matched=\`${f.matched}\` — "${f.bullet.slice(0, 200)}"`);
        }
        lines.push("");
      }
      const hits = v.numericTokens.filter((t) => t.hit).length;
      const total = v.numericTokens.length;
      if (total > 0) {
        lines.push(`**Numeric tokens: ${hits}/${total} hit source haystack.**`);
        const misses = v.numericTokens.filter((t) => !t.hit);
        if (misses.length > 0) {
          lines.push(`Misses: ${misses.map((m) => `\`${m.token}\` (${m.bucket})`).join(", ")}`);
        }
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  // Step 1 — assemble the production-snapshot system prompt, hash it,
  // write to disk for audit.
  console.error("Assembling production system-prompt snapshot…");
  const productionSystemPrompt = buildProductionSystemPrompt(TARGET_ROLE);
  ensureRawDir();
  writeFileSync(SNAPSHOT_FILE, productionSystemPrompt);
  const sha = createHash("sha256").update(productionSystemPrompt).digest("hex");
  const generatedAt = new Date().toISOString();
  console.error(`  snapshot SHA-256: ${sha}`);
  console.error(`  snapshot written to ${SNAPSHOT_FILE} (${productionSystemPrompt.length} chars)`);

  const includedBlocks = ["ONE_PAGE_RULE", "TRUTHFULNESS_RULES", "CV_VOICE_RULES", "STRUCTURE_RULES (with SPARSE ABOUT_ME inlined)", "TAILORING_RULES", "LIBRARY_CONTEXT (CS Specialist matched)", "REMINDER"];
  const excludedBlocks = ["STRUCTURED_REQUIREMENTS_RULE (no application_id)", "KEYWORD_INJECTION_BLOCK (no JD)", "ABOUT_ME GROUNDED branch (no JD overlap)"];

  // Step 2 — discover profiles.
  console.error("Discovering pilot profiles…");
  const emails = await pickEmails();

  console.error(`Running ${emails.length} profiles × 3 cells = ${emails.length * 3} calls.`);
  const reports: UserReport[] = [];
  for (const email of emails) {
    try {
      const r = await reportOneUser(email, productionSystemPrompt);
      if (r) reports.push(r);
    } catch (e) {
      console.error(`  FATAL for ${email}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Step 3 — render and write report.
  const md = renderMarkdown(reports, { sha, generatedAt, includedBlocks, excludedBlocks });
  writeFileSync(OUT, md);
  console.error(`\nWrote ${OUT} (${reports.length} profiles × 3 cells).`);
  console.error(`Raw per-cell JSON dumps in ${RAW_DIR}/`);
}

// Guard against running main() as an import side-effect. The file's
// helpers (loadUser, callModel, formatUserPayload, prompt fragments) are
// imported by scripts/render-cv-eyeball.ts; without this guard, importing
// would trigger a full bake-off run.
//
// Cross-runtime entry-point check — works under both Node/tsx (the
// bake-off's standard runtime) and Deno (the eyeball script's runtime).
// Both expose process.argv; fileURLToPath is in node:url, which Deno 2.x
// ships under its Node compatibility surface.
import { fileURLToPath as __fileURLToPath } from "node:url";
const __isEntryPoint = (() => {
  try {
    return process.argv[1] === __fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();
if (__isEntryPoint) {
  main().catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  });
}
