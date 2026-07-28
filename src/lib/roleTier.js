// C4 role tier — deterministic IC / lead / manager classifier (classifier "A").
//
// Spec + all numbers: docs/eval/scoring-c4-roletier-spike.md (#602). Measured on
// a random trap-weighted 96-title hand-label: 95% 3-way accuracy, 95% on the
// binary manager-vs-not axis the penalty actually uses, 100% recall on real
// managers. Extraction (B) was rejected: +3% for a schema change + a ~6k-job
// re-extract, not worth it for a NEGATIVE signal where abstaining is already
// the safe side.
//
// WHY ABSTAIN IS EVERYWHERE: the C4 signal is a demotion. Refusing to classify
// costs us a penalty we might have applied; guessing wrong applies a penalty to
// a job that did not earn it. Those are not symmetric, so every uncertain path
// returns null and the caller must treat null as "no penalty".
//
// The corpus's own fields (function_family="Leadership", req_seniority
// Lead_Manager/Director_Head) are high-precision but low-recall — even CLEAR
// people-managers land there only 39% of the time — so they are used ONLY as a
// corroborator to promote an otherwise-ambiguous "*Manager", never as the
// primary signal and never to demote.

export const TIER_RANK = { ic: 0, lead: 1, manager: 2 };

// 57% of all "* Manager" titles in the corpus are IC-track disciplines. Without
// this list a naive keyword rule fires the underleveled penalty BACKWARDS on
// more than half of them. This list is the crux of the classifier; it needs
// maintenance as new IC-track "Manager" disciplines appear (spike failure mode 4).
const IC_MANAGER_DISCIPLINES = [
  "product",
  "program",
  "project",
  "account",
  "brand",
  "campaign",
  "customer success",
  "marketing",
  "community",
  "partnership",
  "partnerships",
  "content",
  "social media",
];

// Spike failure mode 1, the ONLY error cluster on classifiable titles (~6% of
// non-manager titles): "X Operations / Office / Quality Manager" is genuinely
// ambiguous — IC-owns-a-process vs leads-a-small-team — and even the human
// annotator flagged every one as borderline. The dangerous direction is calling
// an IC ops role "manager" and over-firing the penalty on an IC-target user, so
// mitigation #1 is baked in HERE: this cluster abstains rather than defaulting
// to manager. Eli's binding requirement.
const AMBIGUOUS_MANAGER_DISCIPLINES = [
  "operations",
  "operational",
  "office",
  "quality",
  "revenue operations",
  "sales operations",
  "business operations",
];

// Spike failure mode 2: keyword-less leadership titles. "Assistant Controller"
// classified as ic (wrong — Controller is finance leadership) and "FP&A Business
// Partner" abstained. Eli's binding requirement: this lexicon ships from the
// START, not as a follow-up, because P10 (the profile behind 4 of the 5 human
// overrides) is exactly this finance-leadership shape.
// Deliberately EXCLUDES "Partner", which the spike floated for this lexicon.
// Adding it would classify "FP&A Business Partner" as manager — and that title
// is one of P10's five human overrides, where the human read it as BELOW the
// manager target. Calling it manager suppresses the penalty the override says
// should fire, i.e. it breaks the override in the WRONG direction. Abstaining
// (the spike's own "conservative miss") is strictly safer, so the spike's
// suggestion is not taken. In finance "Business Partner" is an IC analyst role.
const EXEC_LEADERSHIP_SUBSTRINGS = ["controller", "comptroller", "chief"];

// Matched as whole words, never substrings: as bare substrings "coo" hits
// "coordinator" and "cro" hits "microsoft"/"macro", each of which would classify
// an IC role as manager and fire the underleveled penalty backwards — the exact
// failure the exception list exists to prevent.
const EXEC_LEADERSHIP_TOKENS = ["cfo", "ceo", "coo", "cto", "cmo", "cro"];

const ORG_LEADERSHIP_MARKERS = [
  "head of",
  "head",
  "vp",
  "vice president",
  "director",
  "general manager",
  "managing director",
];

// Staff/Principal/Lead are SENIOR IC tracks, not people-management. They rank
// above ic so a lead-target user is not told a plain IC role is on-tier, but
// below manager so they never trip the manager comparison.
// KNOWN GAP (accepted, inside the spike's measured 95%): "Lead Generation
// Specialist" reads as lead. It is an IC marketing title; the word "lead" is the
// noun, not the rank. Rare enough to leave rather than special-case, but it is
// the first thing to look at if the lead tier ever looks inflated.
const LEAD_MARKERS = ["staff", "principal", "lead", "team lead"];

const IC_MARKERS = [
  "analyst",
  "engineer",
  "developer",
  "designer",
  "specialist",
  "associate",
  "coordinator",
  "assistant",
  "consultant",
  "accountant",
  "auditor",
  "representative",
  "clerk",
  "intern",
  "researcher",
  "recruiter",
  "bookkeeper",
];

const norm = (t) =>
  ` ${String(t || "")
    .toLowerCase()
    .trim()} `;

// Every list here matches on WORD BOUNDARIES, never raw substrings. Substring
// matching silently inverts the classifier on real titles:
//   "account"    matches "ACCOUNTing Manager"  -> a finance people-manager read
//                as an IC account manager (and it is one of P10's own targets)
//   "coo"        matches "COOrdinator"         -> an IC role read as an exec
//   "cro"        matches "miCROsoft"           -> an IC role read as an exec
// Each of those fires the underleveled penalty BACKWARDS, which is the exact
// failure the exception lists exist to prevent. Caught by roleTier.test.js.
const hasWord = (hay, words) =>
  words.some((w) =>
    new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(hay),
  );

// Classify one job/role title. Returns "ic" | "lead" | "manager" | null.
// null = abstain = the caller applies NO penalty. Rule order is load-bearing and
// mirrors the spike exactly; reordering changes the measured accuracy.
export function roleTierFromTitle(title, job = null) {
  const t = norm(title);
  if (!t.trim()) return null;

  // 1. Org leadership first: "Director of Product" must not be caught by the
  //    Product IC-discipline exception below, and "General Manager" must not be
  //    read as an ambiguous ops manager.
  if (hasWord(t, ORG_LEADERSHIP_MARKERS)) return "manager";

  // 2. Exec/finance leadership lexicon (mitigation #2) — before IC markers, so
  //    "Assistant Controller" does not fall through to "assistant" → ic.
  if (hasWord(t, EXEC_LEADERSHIP_SUBSTRINGS)) return "manager";
  if (hasWord(t, EXEC_LEADERSHIP_TOKENS)) return "manager";

  // 3. Senior-IC lead track.
  if (hasWord(t, LEAD_MARKERS)) return "lead";

  // 4. "* Manager" disambiguation — the crux.
  if (hasWord(t, ["manager"])) {
    if (hasWord(t, AMBIGUOUS_MANAGER_DISCIPLINES)) return null; // mitigation #1
    if (hasWord(t, IC_MANAGER_DISCIPLINES)) return "ic";
    return "manager"; // corroborated or plain "Manager"
  }

  // 5. Corpus corroborator: high-precision, low-recall, so it can only PROMOTE
  //    a title that carried no tier keyword of its own. Never used to demote.
  const fam = job?.function_family || null;
  const sen = job?.req_seniority || null;
  if (fam === "Leadership" || sen === "Lead_Manager" || sen === "Director_Head")
    return "manager";

  // 6. IC keywords.
  if (hasWord(t, IC_MARKERS)) return "ic";

  // 7. ~34% of the corpus reaches here with no keyword at all. Abstain.
  return null;
}

// The user's target tier is the MAX across their target titles, not the nearest
// step — a C4 design decision the spike surfaced. A target set is a PATH, not a
// point: P10 lists IC titles (Senior Accountant, Internal Auditor) alongside
// manager ones (Accounting Manager, AP Manager), and the human's mental model
// anchored on the aspirational end (the 5-year Assistant-Controller aim). Taking
// MAX is what reproduces 4 of the 5 human overrides; taking the nearest step
// would classify P10 as an IC target and fire nothing.
// Returns null if every title abstains — no target tier means no penalty.
export function targetTierFromTitles(titles) {
  const list = Array.isArray(titles) ? titles : [];
  let best = null;
  for (const title of list) {
    const tier = roleTierFromTitle(title);
    if (!tier) continue;
    if (best === null || TIER_RANK[tier] > TIER_RANK[best]) best = tier;
  }
  return best;
}
