import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletionWithRetry } from '../_shared/openai-chat.ts'
import { sha256Hex } from '../_shared/content-hash.ts'
import { pickPrimaryEducation, isCurrentlyStudent, formatEducationLine } from '../_shared/education-helpers.ts'
import { resolveSkillAliases } from '../_shared/skill-aliases.ts'

// --- Load JSON Libraries ---
import { roleLibrary } from "../_shared/libraries/00_role_library.ts";
import { skillLibrary } from "../_shared/libraries/01_skill_library.ts";
import { proofSignalLibrary } from "../_shared/libraries/02_proof_signal_library.ts";
import { roleSkillMapping } from "../_shared/libraries/04_role_skill_mapping.ts";
import { skillTransferMap } from "../_shared/libraries/15_skill_transfer_map.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// gpt-4o (not -mini): the deterministic scoring + per-role narrative
// generation prompt was taking 51s p50 / 71s max on -mini, well past the
// "feels broken" threshold. -4o cuts that to ~10-15s on the same prompt
// for a +$31/mo cost at ~1200 calls/mo across 100 students. Latency win
// dominates the cost trade for this user-clicked Refresh-Analysis path.
const MODEL = 'gpt-4o'
const RATE_LIMIT_CALLS = 10
const RATE_LIMIT_WINDOW = 3600 // 1 hour

// Cache TTL ceiling. Even when the user's input hash is unchanged, force
// a regen after this window so library / prompt / scoring-formula updates
// in code reach users without manual invalidation. 7 days = roughly one
// platform-update cycle; cheap enough at 100-student pilot scale (~14 LLM
// calls / week worst case for a fully-cached cohort).
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

// Fit scoring weights per fit_scoring_logic
const WEIGHTS = { core: 0.6, secondary: 0.3, differentiator: 0.1 } as const;

// Pure-fit thresholds — used only when no 5-year goal is known AND no
// primary_domain fallback exists. 0.70 was unreachable for junior profiles
// with sparse skill matches, so Track 1 was never populated in the no-goal
// path. 0.55 is calibrated against real onboarding profiles.
// Track-scoring constants — shared with src/lib/scoreJobFit.js and
// src/lib/scoreApplication.js so the Roadmap, Jobs page, and Tracker all
// apply the SAME ceiling values + alignment thresholds. Before PR-E the
// Roadmap was using more permissive values, surfacing Mid-level roles in
// Track 1 for students that the Jobs page would never show.
import {
  FIT_ONLY_THRESHOLDS,
  STAGE_T1_CEILING,
  GOAL_TRACK_THRESHOLDS as SHARED_GOAL_THRESHOLDS,
  DOMAIN_TO_FAMILIES as SHARED_DOMAIN_TO_FAMILIES,
} from "../_shared/track-scoring-constants.ts";

// Goal-aware thresholds — local mirror of the shared GOAL_TRACK_THRESHOLDS
// keyed in the original "track_N_min_*" shape this file already uses.
//
// T1 / T2 use the penalty-adjusted fitScore (skill overlap × seniority-gap
// penalty × family-experience penalty) because they measure "could be hired
// NOW." Penalties belong here.
//
// T3 ("Work Toward") uses RAW skill overlap (pre-penalty). T3 is aspirational
// — penalising "not ready yet" by lowering fit makes the threshold meant to
// capture aspirational roles unreachable for them.
const GOAL_TRACK_THRESHOLDS = {
  track_1_min_fit: SHARED_GOAL_THRESHOLDS.t1_min_fit_high_alignment,
  track_1_min_alignment: SHARED_GOAL_THRESHOLDS.t1_min_alignment_high_fit,
  track_2_min_fit: SHARED_GOAL_THRESHOLDS.t2_min_fit,
  track_3_min_raw_fit: SHARED_GOAL_THRESHOLDS.t3_min_fit,
  track_3_min_alignment: SHARED_GOAL_THRESHOLDS.t3_min_alignment,
} as const;

const MAX_T1 = 5, MAX_T2 = 5, MAX_T3 = 5;

// Track-1 seniority ceiling per experience level. Bridges the long-form
// stage keys this file uses (early_career / mid_career / senior_career)
// to the compact ones in the shared constants (early / mid / senior).
const T1_SENIORITY_CEILING: Record<"early_career" | "mid_career" | "senior_career", number> = {
  early_career: STAGE_T1_CEILING.early,
  mid_career: STAGE_T1_CEILING.mid,
  senior_career: STAGE_T1_CEILING.senior,
};

// Seniority-gap penalty applied to raw skill fit. A student with no Mid
// experience doesn't get credit for Mid-level overlap at face value — real
// hirability degrades with each rank above their current level.
// Multiplier = 0.90^gap, floored at 0.55.
function seniorityGapPenalty(roleSeniorityRank: number, userLevel: "early_career" | "mid_career" | "senior_career"): number {
  const userRank = userLevel === "early_career" ? 0 : userLevel === "mid_career" ? 2 : 4;
  const gap = Math.max(0, roleSeniorityRank - userRank);
  return Math.max(0.55, Math.pow(0.90, gap));
}

// Family-experience penalty: has the user ever worked in the role's family?
// Direct-match = full credit; adjacent family group = near-full; unrelated = penalised.
// Uses primary_domain as the user's home family anchor. A CS-background student
// claiming skills that overlap a Product role still doesn't have direct Product
// experience — recruiters weigh that heavily, so we do too.
//
// Entry-level roles get a softer penalty because they're designed for career
// pivoters — employers hiring for "Associate PM" / "Junior Analyst" don't
// expect prior family experience, so we shouldn't penalise a CS student
// applying to Product-family Entry roles the same way we'd penalise them
// applying to a Product-family Mid role.
function familyExperiencePenalty(
  roleFamily: string | null | undefined,
  userHomeFamilies: Set<string>,
  roleSeniorityRank: number
): number {
  if (!roleFamily) return 1.0;
  if (userHomeFamilies.has(roleFamily)) return 1.0;
  const isEntryLevel = roleSeniorityRank <= 1;  // Entry or Entry_Mid
  const roleGroup = FAMILY_GROUPS[roleFamily];
  for (const uf of userHomeFamilies) {
    if (FAMILY_GROUPS[uf] && FAMILY_GROUPS[uf] === roleGroup) {
      return isEntryLevel ? 0.97 : 0.92;
    }
  }
  return isEntryLevel ? 0.92 : 0.85;
}

// primary_domain → role families the user has direct experience in.
// Now sourced from the shared constants file (same map the Jobs page uses).
const PRIMARY_DOMAIN_TO_FAMILIES = SHARED_DOMAIN_TO_FAMILIES;

// ─── Helpers ────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  "the","a","an","of","to","and","or","in","on","for","with","at","by","from",
  "as","is","are","was","were","be","been","has","have","had","do","does","did",
  "that","this","these","those","it","its","their","them","they","you","your",
  "our","his","her","she","he","who","whom","which","what","when","where","why",
  "how","not","no","yes","also","but","if","then","so","than","such","can","could",
  "may","might","will","would","shall","should","must","role","person","often",
  "level","typically","usually","someone","user","users","work","working"
]);

function tokenize(s: string): string[] {
  return (s || "").toLowerCase().match(/[a-z][a-z-]{2,}/g) || [];
}

function containsPhrase(text: string, phrase: string): boolean {
  if (!phrase || phrase.length < 3) return false;
  const esc = phrase.toLowerCase().trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("\\b" + esc + "\\b").test(text);
}

function signalFires(signal: any, text: string): boolean {
  for (const t of signal.tags || []) {
    if (typeof t === "string" && containsPhrase(text, t.replace(/_/g, " "))) return true;
  }
  const desc = String(signal.description || "").toLowerCase();
  const descTokens = [...new Set(tokenize(desc).filter((t) => !STOPWORDS.has(t)))];
  if (descTokens.length === 0) return false;
  let hits = 0;
  for (const tok of descTokens) if (containsPhrase(text, tok)) hits++;
  return hits >= Math.max(3, Math.ceil(descTokens.length * 0.4));
}

// Extract skill IDs from a mapping (handles flat and nested schemas)
function bucketSkillIds(mapping: any, bucket: "core" | "secondary" | "differentiator"): string[] {
  if (!mapping) return [];
  const flat = mapping[`${bucket}_skills`];
  if (Array.isArray(flat) && flat.length > 0) {
    return flat
      .map((e: any) => (typeof e === "string" ? e : e?.skill_id))
      .filter((s: any): s is string => typeof s === "string");
  }
  const nested = mapping.skills;
  if (nested && typeof nested === "object" && Array.isArray(nested[bucket])) {
    return nested[bucket]
      .map((e: any) => (typeof e === "string" ? e : e?.skill_id))
      .filter((s: any): s is string => typeof s === "string");
  }
  return [];
}

// Pure-fit track — used only when the user has no 5-year goal
function assignTrackFitOnly(score: number): "track_1" | "track_2" | "track_3" | null {
  if (score >= FIT_ONLY_THRESHOLDS.t1) return "track_1";
  if (score >= FIT_ONLY_THRESHOLDS.t2) return "track_2";
  if (score >= FIT_ONLY_THRESHOLDS.t3) return "track_3";
  return null;
}

// Goal-aware track — combines readiness (fit), alignment to the 5-year goal,
// AND whether the role is at a seniority the user could actually be hired
// for NOW. Mid-level roles that are goal-aligned flow to Track 3 (aspirational)
// even if their adjusted fit looks high, because a student can't skip levels.
// Track 1 = could-hire-now + strong fit + strong goal alignment (best next move)
// Track 2 = could-hire-now + strong fit + weak alignment (viable but off-path)
// Track 3 = on-path + some baseline fit, regardless of seniority (aspirational)
function assignTrackWithGoal(
  fitScore: number,
  goalAlignment: number,
  roleSeniorityRank: number,
  userLevel: "early_career" | "mid_career" | "senior_career",
  rawSkillFit: number
): "track_1" | "track_2" | "track_3" | null {
  const t = GOAL_TRACK_THRESHOLDS;
  const canHireNow = roleSeniorityRank <= T1_SENIORITY_CEILING[userLevel];

  if (canHireNow) {
    if (fitScore >= t.track_1_min_fit && goalAlignment >= t.track_1_min_alignment) return "track_1";
    // Strong-alignment relaxation: roles that align tightly with the 5-year goal
    // (same family or natural/stretch transfer path) qualify for Track 1 at a
    // lower fit bar, because the career trajectory matters and recruiters weigh
    // "visible path to the role" nearly as much as raw readiness.
    if (fitScore >= 0.40 && goalAlignment >= 0.70) return "track_1";
    if (fitScore >= t.track_2_min_fit) return "track_2";
  }
  // T3 uses raw skill overlap (pre-penalty) so goal-aligned aspirational
  // roles aren't crushed by the seniority + family penalties — those
  // penalties model "not ready NOW" which is exactly what T3 represents.
  // See GOAL_TRACK_THRESHOLDS comment above.
  if (rawSkillFit >= t.track_3_min_raw_fit && goalAlignment >= t.track_3_min_alignment) return "track_3";
  return null;
}

// ─── Pre-computed indexes ──────────────────────────────────────────────
const allRoles: any[] = (roleLibrary as any).roles;
const allSkills: any[] = (skillLibrary as any).skill_library;
const allSignals: any[] = (proofSignalLibrary as any).proof_signal_library;
const allMappings: any[] = (roleSkillMapping as any).role_skill_mapping;
const allTransfers: any[] = (skillTransferMap as any).transfers;

const ROLE_BY_ID = new Map<string, any>();
for (const r of allRoles) ROLE_BY_ID.set(r.id || r.role_id, r);

const MAPPING_BY_ROLE = new Map<string, any>();
for (const m of allMappings) MAPPING_BY_ROLE.set(m.role_id, m);

const SKILL_BY_ID = new Map<string, any>();
for (const s of allSkills) SKILL_BY_ID.set(s.id || s.skill_id, s);

// Index transfers by (source, target) for O(1) lookup: find how candidate → goal transitions
const TRANSFER_BY_S_T = new Map<string, any>();
for (const t of allTransfers) TRANSFER_BY_S_T.set(`${t.s}→${t.t}`, t);

function skillName(id: string): string {
  return SKILL_BY_ID.get(id)?.name || id;
}

// Resolve the user's free-text 5-year goal into a role_id from the library.
// Two-pass scored matcher (defensive against noisy user input):
//   1. Exact normalized match on standardized_title or any alternate_title → immediate win
//   2. Whole-word substring match scored by (inputLen / titleLen). Drops short
//      alternate titles (< 5 chars) to avoid matching on abbreviations like "Lead".
//      Never uses `norm.includes(title)` — that direction matches generic user
//      input against overly-broad short titles and produces wrong results.
//   Tiebreak by seniority_rank desc — students typically aspire to the senior
//   version of an ambiguous family ("marketing" → Marketing Manager, not Coordinator).
//   Returns null when best score < MIN_GOAL_RESOLUTION_SCORE so the track system
//   falls back to pure-fit thresholds rather than picking a garbage role.
const SENIORITY_RANK: Record<string, number> = {
  "Entry": 0, "entry": 0,
  "Entry_Mid": 1,
  "Mid": 2, "mid": 2,
  "mid_to_senior": 3,
  "Senior": 3, "senior": 3,
  "Lead_Manager": 4, "lead": 4,
  "Director_Head": 5,
  "VP_Executive": 6, "executive": 6,
};
const MIN_GOAL_RESOLUTION_SCORE = 0.30;

// Seniority cap by user experience level — applies only to scored pass (Pass 2).
// Exact matches (Pass 1) always win regardless — if a student explicitly types
// "VP Marketing" we respect that.
type ExperienceLevel = "early_career" | "mid_career" | "senior_career";
const SENIORITY_CAP: Record<ExperienceLevel, number> = {
  early_career: 3,  // Senior and below
  mid_career: 5,    // Director_Head and below
  senior_career: 6, // VP_Executive (no effective cap)
};

function resolveGoalRoleId(
  goalText: string | null | undefined,
  experienceLevel: ExperienceLevel = "mid_career"
): string | null {
  if (!goalText) return null;
  const norm = goalText.toLowerCase().replace(/[\s_\-]+/g, " ").trim();
  if (!norm) return null;

  // Pass 1 — exact normalized match (no cap; user's explicit choice wins)
  for (const r of allRoles) {
    const id = r.id || r.role_id;
    const titles = [r.standardized_title, ...(r.alternate_titles || [])]
      .filter(Boolean)
      .map((t: string) => t.toLowerCase().replace(/[\s_\-]+/g, " ").trim());
    if (titles.some((t: string) => t === norm)) return id;
  }

  // Pass 2 — token-set Jaccard with 5-char stem folding. Survives typos like
  // "Product managment" → "Product Manager" where whole-phrase regex fails.
  // Tokens with 5+ matching leading chars are treated as the same stem so
  // manag/manager/managment/management all collapse to one token match.
  const cap = SENIORITY_CAP[experienceLevel];
  const goalTokens = tokenize(norm).filter(t => !STOPWORDS.has(t));
  if (goalTokens.length === 0) return null;

  const stemMatch = (a: string, b: string): boolean => {
    if (a === b) return true;
    const minLen = Math.min(a.length, b.length);
    return minLen >= 5 && a.slice(0, 5) === b.slice(0, 5);
  };

  // Early-career users typing "Product management" mean Product Manager (Mid),
  // not Technical Product Manager (Senior) — so cap goal seniority below the
  // user's overall seniorityCap. Otherwise the tiebreak can pick a too-advanced
  // goal just because one alt title happens to strip to the same tokens.
  const goalCap = experienceLevel === "early_career" ? 2   // up to Mid
                : experienceLevel === "mid_career"   ? 4   // up to Lead/Manager
                :                                      6;

  let best: { id: string; score: number; stdTitleHit: boolean; seniorityRank: number } | null = null;
  for (const r of allRoles) {
    const seniorityRank = SENIORITY_RANK[r.seniority] ?? 2;
    if (seniorityRank > goalCap) continue;

    const id = r.id || r.role_id;
    const stdTitle = r.standardized_title ? String(r.standardized_title) : null;
    const altTitles = (r.alternate_titles || []).map(String).filter(a => a.length >= 5);

    const scoreTitle = (title: string): number => {
      const titleTokens = tokenize(title).filter(t => !STOPWORDS.has(t));
      if (titleTokens.length === 0) return 0;
      let overlap = 0;
      const matchedTitleIdx = new Set<number>();
      for (const gt of goalTokens) {
        for (let i = 0; i < titleTokens.length; i++) {
          if (matchedTitleIdx.has(i)) continue;
          if (stemMatch(gt, titleTokens[i])) { overlap++; matchedTitleIdx.add(i); break; }
        }
      }
      const denom = goalTokens.length + titleTokens.length - overlap;
      return denom > 0 ? overlap / denom : 0;
    };

    const stdScore = stdTitle ? scoreTitle(stdTitle) : 0;
    let altScore = 0;
    for (const a of altTitles) { const s = scoreTitle(a); if (s > altScore) altScore = s; }

    const bestHere = Math.max(stdScore, altScore);
    const stdTitleHit = stdScore >= altScore && stdScore > 0;

    if (bestHere > 0) {
      // Tiebreak preference: (1) higher score, (2) matched via standardized_title
      // not alternate, (3) lower seniority (closer to the user's real ceiling).
      const replace = !best
        || bestHere > best.score
        || (bestHere === best.score && stdTitleHit && !best.stdTitleHit)
        || (bestHere === best.score && stdTitleHit === best.stdTitleHit && seniorityRank < best.seniorityRank);
      if (replace) best = { id, score: bestHere, stdTitleHit, seniorityRank };
    }
  }

  return best && best.score >= MIN_GOAL_RESOLUTION_SCORE ? best.id : null;
}

function yearFromDate(s: unknown): number | null {
  if (!s) return null;
  const m = String(s).match(/\b(19|20)\d{2}\b/);
  return m ? parseInt(m[0], 10) : null;
}

// Count only career-building employment toward experience years. Military,
// volunteer, and student-leadership roles don't make someone a mid-career
// professional. Part-time IS counted as of 2026-05-27 — the old rationale
// (students hold part-time school jobs) was over-fitted. The seniority
// ceiling already prevents juniors from being shown Mid+ roles in Track 1,
// so years calc doesn't need to gatekeep too. Real users with target-domain
// part-time roles were getting zero years credit, dropping fit_score on
// otherwise-qualifying jobs. Stays aligned with src/lib/experienceLevel.js.
const CAREER_COUNTABLE_TYPES = new Set(["internship", "full_time", "freelance", "part_time", "founder"]);

// Narrower set used by inferQualificationLevel — internships excluded
// because they're training, not qualifying career work (the "PR #60 line").
// Volunteer / military / leadership stay out for the same reason. Founder
// is included: real work of any commitment counts toward qualification.
// Mirrors src/lib/experienceLevel.js QUAL_COUNTABLE_TYPES.
const QUAL_COUNTABLE_TYPES = new Set(["full_time", "part_time", "freelance", "founder"]);

// Re-infer experience type from title/company/responsibilities, used when the
// stored type is missing or obviously wrong (e.g. legacy rows from before the
// CV extractor learned to classify military service — everything was stamped
// "full_time" regardless). Mirrors the client-side inferExperienceType.
function reinferType(exp: any): string {
  const stored = String(exp?.type ?? "").toLowerCase();
  const text = `${exp?.title || ""} ${exp?.company || ""} ${Array.isArray(exp?.responsibilities) ? exp.responsibilities.join(" ") : (exp?.responsibilities || "")}`.toLowerCase();

  if (/\b(idf|nahal|givati|golani|paratroopers|sayeret|matkal|shaldag|duvdevan|kfir|unit 8200|\b8200\b|mamram|talpiot|israeli? defense forces|military service|army|idf reserves|soldier|officer training|bahad)\b/.test(text)) return "military";
  if (/\b(volunteer|volunteering|pro bono|mentor(ed|ing)? at)\b/.test(text)) return "volunteer";
  if (/\b(intern|internship)\b/.test(text)) return "internship";
  if (/\b(freelance|freelancer|self-employed|contractor|consultant)\b/.test(text)) return "freelance";
  if (/\b(president|captain|chair|founder|co-founder|team lead(er)?)\b/.test(text) && /\b(club|society|association|student|chapter)\b/.test(text)) return "leadership";
  // Real-company founders / self-employed (the leadership branch above
  // catches student-club founders first via the club/society guard).
  if (/\b(founder|co-?founder|self-?employed|ceo)\b/.test(text)) return "founder";

  return stored || "full_time";
}

function totalYearsOfExperience(experiences: any[]): number {
  const now = new Date().getFullYear();
  let total = 0;
  for (const exp of experiences || []) {
    const t = reinferType(exp);
    if (!CAREER_COUNTABLE_TYPES.has(t)) continue;
    const start = yearFromDate(exp.start_date);
    if (start === null) continue;
    const endRaw = String(exp.end_date ?? "").toLowerCase();
    const isCurrent = exp.is_current || !endRaw || endRaw.includes("present") || endRaw.includes("current");
    const end = isCurrent ? now : (yearFromDate(exp.end_date) ?? now);
    total += Math.max(0, end - start);
  }
  return total;
}

// Resolve role families the user has direct experience in by exact-matching
// experience titles against library role titles. Output is unioned with the
// primary_domain-derived families to form userHomeFamilies for the
// family-experience penalty.
//
// Intentionally conservative: exact normalised match only (the same Pass 1
// matcher resolveGoalRoleId uses). No fuzzy/token-set fallback — a false
// positive here grants the user an entire family of penalty-free roles, so
// we'd rather miss a match than mis-credit. "Senior Product Manager" won't
// match "Product Manager" — accepted trade-off; the penalty merely stays at
// its pre-fix level for those rows.
//
// Filters by CAREER_COUNTABLE_TYPES (full_time | internship | freelance) so
// volunteering / academic_project rows don't grant family credit. Aligns with
// totalYearsOfExperience for consistency.
function rolesFamiliesFromExperiences(experiences: any[]): Set<string> {
  const families = new Set<string>();
  for (const exp of experiences || []) {
    const t = reinferType(exp);
    if (!CAREER_COUNTABLE_TYPES.has(t)) continue;
    const norm = String(exp.title || "")
      .toLowerCase()
      .replace(/[\s_\-]+/g, " ")
      .trim();
    if (!norm) continue;
    for (const r of allRoles) {
      const titles = [r.standardized_title, ...(r.alternate_titles || [])]
        .filter(Boolean)
        .map((s: string) => String(s).toLowerCase().replace(/[\s_\-]+/g, " ").trim());
      if (titles.some((s: string) => s === norm)) {
        if (r.role_family) families.add(r.role_family);
        break;
      }
    }
  }
  return families;
}

// Heuristic for student detection on the profile row. Education level values
// we've seen in the wild: "high_school", "bachelors", "masters", "phd",
// "bootcamp", "self_taught". Undergrad in progress is usually stored as
// "bachelors" (the target degree) with no completion flag, so we also look
// at whether any career-countable role started long enough ago to suggest
// post-grad. If the only non-excluded experience is a sub-2-year part-time
// gig overlapping with education, treat as still-a-student.
function inferExperienceLevel(experiences: any[], profile: any): ExperienceLevel {
  const years = totalYearsOfExperience(experiences);
  // Phase B: student detection uses the education table's is_current flag
  // on undergrad-or-above rows. Previously this read profile.education_level
  // as a single string and looked for substrings like "student" / "in
  // progress" — which never matched because the column held canonical
  // enum values like "bachelors". The new check is real.
  const explicitStudent = isCurrentlyStudent(profile?.education || []);
  if (explicitStudent || years < 3) return "early_career";
  if (years < 8) return "mid_career";
  return "senior_career";
}

// Canonical maps moved to _shared/internship-target.ts (PR9) so the
// internship-flow consumers (generate-internship-profile + matcher)
// can reuse them without duplicating. Behavioral identity preserved.
import {
  PRIMARY_DOMAIN_TO_ROLE_ID,
  FAMILY_TO_PRIMARY_DOMAIN,
} from "../_shared/internship-target.ts";

// Broad role family groups — for low-alignment "related but not adjacent" fallback.
// Only used when no transfer path and no family match exist.
const FAMILY_GROUPS: Record<string, string> = {
  Support: "customer_ops",
  Relationship_Growth: "customer_ops",
  Customer_Experience: "customer_ops",
  Onboarding_Implementation: "customer_ops",
  Sales: "commercial",
  BD_Partnerships: "commercial",
  Marketing: "commercial",
  RevOps_BizOps: "analytics_ops",
  Operations: "analytics_ops",
  Data: "analytics_ops",
  Finance: "analytics_ops",
  Consulting: "analytics_ops",
  Product: "product_tech",
  Engineering: "product_tech",
  Design_UX: "product_tech",
  AI_ML: "product_tech",
  Solutions_Engineering: "product_tech",
  HR_People: "people_admin",
  Admin_GA: "people_admin",
  IT_Security: "product_tech",
  Leadership: "leadership",
};

// Compute goal alignment score 0–1 for a candidate role given the user's goal role id.
// Returns a reason string so the LLM/frontend can explain the number.
function computeGoalAlignment(
  candidateId: string,
  goalRoleId: string | null
): { score: number; reason: string } {
  if (!goalRoleId) return { score: 0, reason: "no goal provided" };
  if (candidateId === goalRoleId) return { score: 1.0, reason: "exact target role" };

  const cand = ROLE_BY_ID.get(candidateId);
  const goal = ROLE_BY_ID.get(goalRoleId);
  if (!cand || !goal) return { score: 0.1, reason: "candidate or goal missing from library" };

  // Transfer path candidate → goal
  const transfer = TRANSFER_BY_S_T.get(`${candidateId}→${goalRoleId}`);
  if (transfer) {
    const type = String(transfer.type || "").toLowerCase();
    if (type === "natural") return { score: 0.85, reason: "natural transfer path to goal" };
    if (type === "stretch") return { score: 0.70, reason: "stretch transfer path to goal" };
    if (type === "pivot")   return { score: 0.50, reason: "pivot transfer path to goal" };
    return { score: 0.65, reason: `known transfer path to goal (${type || "unspecified"})` };
  }

  // Same role_family (covers reverse transfers / adjacent same-track roles)
  if (cand.role_family && goal.role_family && cand.role_family === goal.role_family) {
    return { score: 0.9, reason: `same role family (${cand.role_family})` };
  }

  // Related broad family group
  const candGroup = FAMILY_GROUPS[cand.role_family];
  const goalGroup = FAMILY_GROUPS[goal.role_family];
  if (candGroup && goalGroup && candGroup === goalGroup) {
    return { score: 0.5, reason: `related category (${candGroup})` };
  }

  return { score: 0.1, reason: "no clear connection to goal" };
}

// Deterministic scoring. Fit starts with skill overlap, then is adjusted by
// seniority gap and family-experience penalties so the final number reflects
// actual hirability — not just how many generic skills overlap. The raw
// skill_fit is preserved on the result for diagnostics.
function computeRoleScore(
  roleId: string,
  userSkillIds: Set<string>,
  goalRoleId: string | null,
  userLevel: "early_career" | "mid_career" | "senior_career",
  userHomeFamilies: Set<string>
) {
  const mapping = MAPPING_BY_ROLE.get(roleId);
  const roleDef = ROLE_BY_ID.get(roleId);
  const buckets = {
    core: bucketSkillIds(mapping, "core"),
    secondary: bucketSkillIds(mapping, "secondary"),
    differentiator: bucketSkillIds(mapping, "differentiator"),
  };
  const matchedBy: Record<string, string[]> = { core: [], secondary: [], differentiator: [] };
  const missingBy: Record<string, string[]> = { core: [], secondary: [], differentiator: [] };
  for (const b of ["core", "secondary", "differentiator"] as const) {
    for (const sid of buckets[b]) {
      (userSkillIds.has(sid) ? matchedBy[b] : missingBy[b]).push(sid);
    }
  }
  const ratio = (matched: number, total: number) => (total > 0 ? matched / total : 0);
  const skillFit =
    ratio(matchedBy.core.length, buckets.core.length) * WEIGHTS.core +
    ratio(matchedBy.secondary.length, buckets.secondary.length) * WEIGHTS.secondary +
    ratio(matchedBy.differentiator.length, buckets.differentiator.length) * WEIGHTS.differentiator;

  const roleSeniorityRank = SENIORITY_RANK[roleDef?.seniority] ?? 2;
  const senPenalty = seniorityGapPenalty(roleSeniorityRank, userLevel);
  const famPenalty = familyExperiencePenalty(roleDef?.role_family, userHomeFamilies, roleSeniorityRank);
  const fitScore = skillFit * senPenalty * famPenalty;

  const { score: goalAlignment, reason: alignmentReason } =
    computeGoalAlignment(roleId, goalRoleId);

  const track = goalRoleId
    ? assignTrackWithGoal(fitScore, goalAlignment, roleSeniorityRank, userLevel, skillFit)
    : assignTrackFitOnly(fitScore);

  const matchedSkillIds = [...matchedBy.core, ...matchedBy.secondary, ...matchedBy.differentiator];
  const missingSkillIds = [...missingBy.core, ...missingBy.secondary];
  return {
    role_id: roleId,
    title: roleDef?.standardized_title || roleDef?.title || roleId,
    score: Math.round(fitScore * 1000) / 1000,
    raw_skill_fit: Math.round(skillFit * 1000) / 1000,
    seniority_penalty: Math.round(senPenalty * 1000) / 1000,
    family_penalty: Math.round(famPenalty * 1000) / 1000,
    goal_alignment_score: Math.round(goalAlignment * 1000) / 1000,
    alignment_reason: alignmentReason,
    track,
    matched_skill_ids: matchedSkillIds,
    missing_skill_ids: missingSkillIds,
    matched_skills: matchedSkillIds.map(skillName),
    missing_skills: missingSkillIds.map(skillName),
    role_family: roleDef?.role_family,
    seniority: roleDef?.seniority,
    mapping_exists: Boolean(mapping),
  };
}

// Duration-based qualification level. Uses QUAL_COUNTABLE_TYPES (excludes
// internship — the "PR #60 line"; internships are training, not qualifying
// career work). Volunteer / military / leadership stay out too.
//
// Different axis from inferExperienceLevel (the years-tier):
//   * inferExperienceLevel uses CAREER_COUNTABLE_TYPES (incl. internship)
//     and has an isCurrentlyStudent → early_career shortcut.
//   * inferQualificationLevel uses QUAL_COUNTABLE_TYPES (excl. internship)
//     and has NO student override on purpose — a currently-enrolled
//     student with 4 years of full_time work should read Mid-Level by
//     duration.
//
// Thresholds (3 / 8) match inferExperienceLevel so the two stay aligned.
//
// managed_people bumps the duration-derived level up exactly one tier
// (Junior→Mid-Level, Mid-Level→Senior, Senior stays), and only when the
// row carrying managed_people=true has ≥1 year of parseable duration.
// A 0-year managed row bumps nobody.
//
// Known limitation: per-row spans are summed naively, so two concurrent
// roles double-count. Depth/overlap handling is a follow-up.
//
// ⚠️ DRIFT WARNING — duplicate logic lives in
// src/lib/experienceLevel.js inferQualificationLevel(). The drift test
// in src/test/experienceLevel.test.js covers both.
function inferQualificationLevel(experiences: any[]): "Junior" | "Mid-Level" | "Senior" {
  const now = new Date().getFullYear();
  let years = 0;
  let hasManagedWithDuration = false;
  for (const exp of experiences || []) {
    const t = reinferType(exp);
    if (!QUAL_COUNTABLE_TYPES.has(t)) continue;
    const start = yearFromDate(exp.start_date);
    if (start === null) continue;
    const endRaw = String(exp.end_date ?? "").toLowerCase();
    const isCurrent = exp.is_current || !endRaw || endRaw.includes("present") || endRaw.includes("current");
    const end = isCurrent ? now : (yearFromDate(exp.end_date) ?? now);
    const dur = Math.max(0, end - start);
    years += dur;
    if (exp.managed_people && dur >= 1) hasManagedWithDuration = true;
  }
  let base: "Junior" | "Mid-Level" | "Senior";
  if (years >= 8) base = "Senior";
  else if (years >= 3) base = "Mid-Level";
  else base = "Junior";
  if (hasManagedWithDuration) {
    if (base === "Junior") return "Mid-Level";
    if (base === "Mid-Level") return "Senior";
  }
  return base;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const m = startMetric('generate-career-analysis')
  let _ok = false
  let _http = 500
  let _err: string | null = null

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      _http = 500; _err = 'no_openai_key'
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      _http = 401; _err = 'auth'
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      _http = 401; _err = 'auth'
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    m.userId = user.id

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: allowed } = await serviceClient.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_function_name: 'generate-career-analysis',
      p_max_calls: RATE_LIMIT_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW,
    })
    if (!allowed) {
      // Best-effort error logging — failure to log must not mask the 429.
      // Supabase's PostgrestBuilder is then-able but does NOT expose .catch,
      // so we wrap the await in try/catch instead of chaining .catch().
      try {
        await serviceClient.rpc('log_error', {
          p_user_id: user.id,
          p_function_name: 'generate-career-analysis',
          p_error_message: 'Rate limit exceeded',
          p_error_details: null,
        })
      } catch { /* swallow — logging is non-essential here */ }
      _http = 429; _err = 'rate_limit'
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in an hour.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const rawBody = JSON.stringify(body);
    if (rawBody.length > 100_000) {
      _http = 413; _err = 'payload_too_large'
      return new Response(JSON.stringify({ error: 'Request payload too large.' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { dream_roles } = body

    // Nested select pulls the user's education rows in the same round trip
    // (Phase B refactor). inferExperienceLevel and the LLM prompt both
    // consume the array; sanitisedProfile uses pickPrimaryEducation to
    // surface the highest current/completed entry for the single-line
    // education context in the prompt.
    const { data: profiles } = await supabase.from('profiles').select('*, education(*)').eq('id', user.id)
    const { data: experiences } = await supabase.from('experiences').select('*').eq('user_id', user.id)
    const { data: projects } = await supabase.from('projects').select('*').eq('user_id', user.id)
    const { data: certifications } = await supabase.from('certifications').select('*').eq('user_id', user.id)

    const profile = profiles?.[0]
    if (!profile) {
      _http = 404; _err = 'no_profile'
      return new Response(JSON.stringify({ error: 'No profile found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const primaryEdu = pickPrimaryEducation(profile.education || [])

    const trunc = (s: unknown, max: number) => String(s ?? '').slice(0, max);
    const sanitisedProfile = {
      full_name: trunc(profile.full_name, 100),
      skills: (profile.skills || []).slice(0, 50).map((s: unknown) => trunc(s, 60)),
      degree: trunc(primaryEdu?.degree_type ?? '', 100),
      field_of_study: trunc(primaryEdu?.field_of_study ?? '', 100),
      education_level: trunc(primaryEdu?.education_level ?? '', 50),
      summary: trunc(profile.summary, 500),
      five_year_role: trunc(profile.five_year_role, 100),
      target_job_titles: (profile.target_job_titles || []).slice(0, 10).map((t: unknown) => trunc(t, 100)),
      target_industries: (profile.target_industries || []).slice(0, 10).map((i: unknown) => trunc(i, 100)),
      location: trunc(profile.location, 100),
      employment_status: (profile.employment_status || []).join(', ').slice(0, 100),
      open_to_lateral: profile.open_to_lateral ?? false,
      open_to_outside_degree: profile.open_to_outside_degree ?? false,
    };
    // P1.3 read switch: experiences.skills + projects.skills are the
    // unified columns (P1.1 backfilled them as the union of legacy
    // skills_used + tools_used / skills_demonstrated). The legacy
    // columns still exist until P1.4 but aren't read here.
    const sanitisedExperiences = (experiences || []).slice(0, 10).map((e: any) => ({
      title: trunc(e.title, 100),
      company: trunc(e.company, 100),
      responsibilities: trunc(e.responsibilities, 300),
      skills: (e.skills || []).slice(0, 40).map((s: unknown) => trunc(s, 60)),
      managed_people: e.managed_people ?? false,
      cross_functional: e.cross_functional ?? false,
      type: trunc(e.type, 50),
    }));
    const sanitisedProjects = (projects || []).slice(0, 10).map((p: any) => ({
      name: trunc(p.name, 100),
      description: trunc(p.description, 300),
      skills: (p.skills || []).slice(0, 20).map((s: unknown) => trunc(s, 60)),
    }));
    const sanitisedCerts = (certifications || []).slice(0, 10).map((c: any) => ({
      name: trunc(c.name, 100),
      issuer: trunc(c.issuer, 100),
    }));
    const sanitisedDreamRoles = (dream_roles || []).slice(0, 10).map((r: unknown) => trunc(r, 100));
    const dreamRolesForPrompt = sanitisedDreamRoles.length
      ? sanitisedDreamRoles
      : (profile.five_year_role ? [trunc(profile.five_year_role, 100)] : []);

    // ─── Change-detection cache ────────────────────────────────────────
    // Hash the sanitised LLM inputs (same data that ends up in the prompt)
    // and short-circuit when the hash matches function_cache + the cached
    // marker is within TTL. Frontend receives `cached: true` and skips its
    // replace_career_roles RPC + cache invalidations — the existing
    // career_roles rows are already current for these inputs.
    //
    // Forced bypass: caller passes `force: true` in the body. The Refresh
    // Analysis button wires this so users can re-run on demand.
    //
    // Fail-open: any read error against function_cache (RLS misconfig,
    // table missing during a migration race, etc.) falls through to full
    // regeneration. Cache is a perf optimisation, not a correctness
    // guarantee — never block the function on its absence.
    const forceRefresh = body?.force === true
    const inputHashPayload = {
      profile: sanitisedProfile,
      experiences: sanitisedExperiences,
      projects: sanitisedProjects,
      certifications: sanitisedCerts,
      dream_roles: sanitisedDreamRoles,
    }
    const inputHash = await sha256Hex(inputHashPayload)

    if (!forceRefresh) {
      try {
        const { data: cacheRow } = await serviceClient
          .from('function_cache')
          .select('input_hash, cached_at')
          .eq('user_id', user.id)
          .eq('function_name', 'generate-career-analysis')
          .maybeSingle()
        if (cacheRow && cacheRow.input_hash === inputHash) {
          const cachedAt = new Date(cacheRow.cached_at).getTime()
          if (Date.now() - cachedAt < CACHE_TTL_MS) {
            _ok = true; _http = 200
            return new Response(JSON.stringify({ cached: true, input_hash: inputHash }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }
        }
      } catch (err) {
        // Fail-open. Log and continue to regeneration.
        console.warn('[generate-career-analysis] cache read failed (non-fatal):', (err as Error)?.message)
      }
    }

    // ─── PHASE 1: Deterministic scoring ────────────────────────────────

    // 1a. Build profile text for proof signal matching
    const profileTextParts: string[] = [
      sanitisedProfile.full_name,
      sanitisedProfile.summary,
      sanitisedProfile.degree,
      sanitisedProfile.field_of_study,
      sanitisedProfile.education_level,
      sanitisedProfile.skills.join(" "),
      ...sanitisedExperiences.map(e => `${e.title} at ${e.company}. ${e.responsibilities} ${(e.skills || []).join(" ")}`),
      ...sanitisedProjects.map(p => `${p.name}. ${p.description} ${(p.skills || []).join(" ")}`),
      ...sanitisedCerts.map(c => `${c.name} ${c.issuer}`),
      sanitisedProfile.target_job_titles.join(" "),
    ];
    const profileText = profileTextParts.filter(Boolean).join(" ").toLowerCase();

    // 1b. Extract user skill IDs from proof signals + stated skills
    const userSkillIds = new Set<string>();
    for (const sig of allSignals) {
      if (signalFires(sig, profileText)) {
        for (const sid of sig.maps_to_skills || []) {
          if (typeof sid === "string") userSkillIds.add(sid);
        }
      }
    }
    // Skill resolution. PR-E: prefer profiles.skills_canonical (resolved at
    // save time via the same alias map) so the Roadmap sees the SAME ID set
    // the Jobs page sees — eliminates a drift source between the two
    // surfaces. Falls back to the in-function alias resolution loop when
    // canonical isn't populated (legacy rows pre-PR-B / backfill races).
    const SKILL_ID_KEYSET = new Set(SKILL_BY_ID.keys());
    const canonical = Array.isArray((profile as any).skills_canonical)
      ? (profile as any).skills_canonical as string[]
      : null;
    if (canonical && canonical.length > 0) {
      for (const sid of canonical) {
        if (SKILL_ID_KEYSET.has(sid)) userSkillIds.add(sid);
      }
    } else {
      for (const stated of sanitisedProfile.skills) {
        for (const sid of resolveSkillAliases(stated, SKILL_ID_KEYSET)) {
          userSkillIds.add(sid);
        }
      }
    }

    // 1c. Infer experience level and resolve goal within that ceiling.
    // If five_year_role can't be resolved (e.g. typo), fall back to
    // primary_domain so alignment still has a target. Without this, the
    // whole run collapses to pure-fit scoring and Track 1 almost never
    // populates for junior profiles.
    const experienceLevel = inferExperienceLevel(experiences || [], profile);
    let goalRoleId = resolveGoalRoleId(sanitisedProfile.five_year_role, experienceLevel);
    let goalSource: "five_year_role" | "primary_domain" | "none" = goalRoleId ? "five_year_role" : "none";
    if (!goalRoleId && profile.primary_domain) {
      const domainFallback = PRIMARY_DOMAIN_TO_ROLE_ID[String(profile.primary_domain).toLowerCase()];
      if (domainFallback && ROLE_BY_ID.has(domainFallback)) {
        goalRoleId = domainFallback;
        goalSource = "primary_domain";
      }
    }
    const seniorityCap = SENIORITY_CAP[experienceLevel];

    // User's "home" role families — which parts of the role space do they
    // have real direct experience in? Seeded from primary_domain (set during
    // onboarding). Used for the family-experience penalty so candidate roles
    // that are a total domain jump (e.g. CS → Product) don't inherit full
    // skill-fit credit just from generic skill overlap.
    const userHomeFamilies = new Set<string>([
      ...(PRIMARY_DOMAIN_TO_FAMILIES[String(profile.primary_domain ?? "").toLowerCase()] || []),
      ...rolesFamiliesFromExperiences(experiences || []),
    ]);

    // 1d. Score all roles (with goal alignment), filtered by experience-level cap.
    //   - early_career  → excludes Lead/Director/VP (ranks 4–6)
    //   - mid_career    → excludes VP (rank 6)
    //   - senior_career → no cap
    // A student should NEVER see Director or VP roles in their results, even if the
    // scoring math would otherwise surface them. Apply BEFORE scoring so the LLM
    // never receives an over-cap role to explain.
    const allScored = allRoles
      .filter(r => (SENIORITY_RANK[r.seniority] ?? 2) <= seniorityCap)
      .map(r => computeRoleScore(r.id || r.role_id, userSkillIds, goalRoleId, experienceLevel, userHomeFamilies))
      .filter(r => r.mapping_exists && r.track !== null);
    console.log(`[career-analysis] experienceLevel=${experienceLevel} cap=${seniorityCap} homeFamilies=${[...userHomeFamilies].join(',') || 'none'} candidates=${allScored.length} (of ${allRoles.length} library roles)`);

    // 1e. Build candidate pool: targeted roles + strong matches
    const allTargets = Array.from(new Set([
      ...sanitisedProfile.target_job_titles,
      ...dreamRolesForPrompt,
    ])).filter(Boolean).map(t => t.toLowerCase());

    const isTargeted = (roleId: string): boolean => {
      if (allTargets.length === 0) return false;
      const def = ROLE_BY_ID.get(roleId);
      if (!def) return false;
      const titles = [def.standardized_title, ...(def.alternate_titles || [])]
        .filter(Boolean).map((s: string) => s.toLowerCase());
      return titles.some((t: string) => allTargets.some(a => t.includes(a) || a.includes(t)));
    };

    const targeted = allScored.filter(r => isTargeted(r.role_id));
    // All three tracks are candidates. Filtering out track_3 here meant the
    // "Work Toward" column never populated unless the user explicitly typed
    // an aspirational title into target_job_titles. The MAX_T3=1 cap downstream
    // still keeps the output size small.
    const strongUntargeted = allScored
      .filter(r => !isTargeted(r.role_id) && (r.track === "track_1" || r.track === "track_2" || r.track === "track_3"));
    const candidatePool = [...targeted, ...strongUntargeted];

    // 1f. Select final set: top-N per track with track-appropriate sort
    //   - Track 1 sorted by combined score (0.5 * fit + 0.5 * alignment) — both dimensions matter
    //   - Track 2 sorted by fit desc — viable-now roles
    //   - Track 3 sorted by alignment desc — aspirational on-path roles
    const combinedT1 = (r: any) => 0.5 * r.score + 0.5 * r.goal_alignment_score;
    const byTrack = {
      track_1: candidatePool
        .filter(r => r.track === "track_1")
        .sort((a, b) => combinedT1(b) - combinedT1(a))
        .slice(0, MAX_T1),
      track_2: candidatePool
        .filter(r => r.track === "track_2")
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_T2),
      track_3: candidatePool
        .filter(r => r.track === "track_3")
        .sort((a, b) => b.goal_alignment_score - a.goal_alignment_score)
        .slice(0, MAX_T3),
    };
    const selected = [...byTrack.track_1, ...byTrack.track_2, ...byTrack.track_3];
    console.log(`[career-analysis] selected tracks → t1=${byTrack.track_1.map(r=>`${r.title}(fit=${r.score},align=${r.goal_alignment_score})`).join('|') || '-'} | t2=${byTrack.track_2.map(r=>`${r.title}(fit=${r.score},align=${r.goal_alignment_score})`).join('|') || '-'} | t3=${byTrack.track_3.map(r=>`${r.title}(fit=${r.score},align=${r.goal_alignment_score})`).join('|') || '-'}`);

    if (selected.length === 0) {
      _ok = true; _http = 200
      const qualLevel = inferQualificationLevel(sanitisedExperiences);
      // Branch copy by qualification — "build foundational skills" is patronizing
      // (and contradictory) for a Mid-Level user; conversely, telling a Junior
      // user their skills "didn't match the library" misdirects them. The
      // underlying cause is usually skill-name normalization (see PR-D3) but
      // until that lands, the message at least shouldn't contradict the
      // qualification badge shown next to it.
      const overall_assessment = qualLevel === "Junior"
        ? "We couldn't find clear role matches yet — adding more skills, refining your 5-year role goal, or filling in experience details on the Profile page gives the algorithm more to work with. Then run Refresh."
        : "We couldn't match your skill set to roles in our library. Your stated skills may not align with how our library names them — try refining your skills on the Profile page (use specific tool/method names like 'Salesforce' or 'A/B Testing'), then run Refresh.";
      return new Response(JSON.stringify({
        qualification_level: qualLevel,
        experience_level: experienceLevel,
        overall_assessment,
        skill_gaps: [],
        roles: [],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Candidate skill IDs for the LLM's semantic-credit pass (Layer 2 of the
    // D3 skill-propagation fix). Union of skill IDs required by the selected
    // roles' core/secondary/differentiator buckets, minus the ones the user
    // already has credited. The LLM is asked to identify which of these the
    // user demonstrably has based on their raw stated skills + experiences —
    // catching gaps the alias map missed (e.g. "Pandas → python_data",
    // "Stakeholder Communication → stakeholder_management"). Capped at 80 to
    // keep prompt size sane.
    const candidateSkillIds = new Set<string>();
    for (const role of selected) {
      const mapping = MAPPING_BY_ROLE.get(role.role_id);
      for (const b of ["core", "secondary", "differentiator"] as const) {
        for (const sid of bucketSkillIds(mapping, b)) {
          if (!userSkillIds.has(sid)) candidateSkillIds.add(sid);
        }
      }
    }
    const candidateSkillsForLLM = [...candidateSkillIds]
      .slice(0, 80)
      .map(id => ({ id, name: skillName(id) }));

    // ─── PHASE 2: LLM writes explanations + identifies missed skills ─────
    const rolesForLLM = selected.map(r => ({
      title: r.title,
      track: r.track,
      seniority: r.seniority,
      readiness_score: r.score,
      raw_skill_overlap: r.raw_skill_fit,
      seniority_penalty: r.seniority_penalty,
      family_penalty: r.family_penalty,
      goal_alignment_score: r.goal_alignment_score,
      alignment_reason: r.alignment_reason,
      matched_skills: r.matched_skills,
      missing_skills: r.missing_skills,
    }));

    const goalRoleTitle = goalRoleId ? ROLE_BY_ID.get(goalRoleId)?.standardized_title : null;
    const goalDisplay = goalSource === "five_year_role"
      ? `RESOLVED 5-YEAR GOAL ROLE (matched to library): ${goalRoleTitle}`
      : goalSource === "primary_domain"
      ? `FALLBACK ANCHOR ROLE (from primary_domain "${profile.primary_domain}"): ${goalRoleTitle}. The user's typed 5-year goal could not be matched to a library role; alignment scoring uses this domain anchor instead.`
      : `NO 5-YEAR GOAL PROVIDED — track assignment used fit score only.`;
    console.log(`[career-analysis] goalSource=${goalSource} goalRoleId=${goalRoleId ?? 'null'} five_year_role="${sanitisedProfile.five_year_role}"`);

    const expLevelLabel = experienceLevel === 'early_career' ? 'early-career (student / 0–2 years)'
      : experienceLevel === 'mid_career' ? 'mid-career (3–7 years)'
      : 'senior (8+ years)';
    const capLabel = experienceLevel === 'early_career'
      ? 'Entry, Entry_Mid, Mid, and Senior individual-contributor roles only. ABSOLUTELY NO Director, Head of, VP, Chief, or "Lead / Manager" titles.'
      : experienceLevel === 'mid_career'
      ? 'Up to Director-level. No VP or Chief titles.'
      : 'All seniority levels permitted.';

    const systemPrompt = `You are a career advisor for the "Get A Job" platform.

You will receive a user's profile and a set of pre-scored role recommendations with their fit scores, tracks, matched skills, and skill gaps.

Your job has two parts:
(1) Write clear, helpful reasoning + action items for each role.
(2) Identify which CANDIDATE_SKILLS the user demonstrably has based on their stated_skills text, experiences, projects, and certifications. The deterministic matcher uses strict library-ID matching and misses semantic equivalents (e.g. user wrote "Stakeholder Communication" but the library uses "stakeholder_management"; user listed "Pandas" which implies "python_data"; user used "Monday.com" which implies "project_management"). You catch these. Return ONLY skill IDs from the CANDIDATE_SKILLS list — never invent IDs not in that list, and only credit when there's clear textual evidence.

You do NOT compute scores, assign tracks, or change matched/missing skill values. The server re-scores after applying your skill credits.

USER SENIORITY CONTEXT: This user is ${expLevelLabel}. Appropriate roles: ${capLabel}. The server has already filtered the pre-scored list to respect this cap, so every role in the input is safe to recommend. Do not name, suggest, or mention any role above the user's cap in your reasoning, action_items, or alignment_to_goal text — if a Track 3 aspirational role is shown, it's already within the cap.

Write in a supportive, actionable tone. Reference the user's specific experiences and skills. Do not invent facts about the user. Do not modify the titles, tracks, scores, matched_skills, or missing_skills values — those come from the server.`;

    const userPrompt = `USER PROFILE:
- Name: ${sanitisedProfile.full_name || 'Not provided'}
- Education: ${sanitisedProfile.degree} in ${sanitisedProfile.field_of_study} (${sanitisedProfile.education_level})
- Summary: ${sanitisedProfile.summary || 'Not provided'}
- 5-Year Goal: ${sanitisedProfile.five_year_role || 'Not provided'}
- Target Job Titles: ${JSON.stringify(sanitisedProfile.target_job_titles)}
- Target Industries: ${JSON.stringify(sanitisedProfile.target_industries)}
- Location: ${sanitisedProfile.location || 'Not provided'}
- Employment Status: ${sanitisedProfile.employment_status || 'Not provided'}
- Open to Lateral Roles: ${sanitisedProfile.open_to_lateral}
- Open to Roles Outside Degree: ${sanitisedProfile.open_to_outside_degree}
- Stated Skills: ${JSON.stringify(sanitisedProfile.skills)}
- Experiences: ${JSON.stringify(sanitisedExperiences)}
- Projects: ${JSON.stringify(sanitisedProjects)}
- Certifications: ${JSON.stringify(sanitisedCerts)}
${dreamRolesForPrompt.length ? `- Dream Roles: ${dreamRolesForPrompt.join(', ')}` : ''}

TRACK DEFINITIONS (for your reasoning — the server has already assigned tracks):
- Track 1: strong hirability NOW at a seniority the user could actually get + strong goal alignment — the best immediate next move
- Track 2: strong hirability NOW but weak goal alignment — viable but pulls from the long-term path
- Track 3: aspirational roles (usually one seniority step up or in a new family) that align with the 5-year goal — work toward these

SCORE INTERPRETATION:
- readiness_score is a hirability-adjusted fit (skill overlap × seniority-gap penalty × family-experience penalty). It answers "would a recruiter consider this person for this role right now?"
- raw_skill_overlap is the unadjusted skill match. If readiness_score is much lower than raw_skill_overlap, it means the role is above the user's current seniority OR outside their current role family — i.e. they have the skills on paper but lack the direct experience a hiring manager would look for.
- goal_alignment_score is separate: how well this role leads toward the 5-year goal.

${goalDisplay}

PRE-SCORED ROLE RECOMMENDATIONS (do not modify title, track, scores, or skill lists):
${JSON.stringify(rolesForLLM, null, 2)}

CANDIDATE_SKILLS — skill IDs the user MIGHT have based on their text but the deterministic matcher missed. Decide which the user demonstrably has, based on their stated_skills, experiences, projects, and certifications. Be conservative: only credit when there's clear textual evidence (a named tool, technique, or domain in their text that maps to this skill). Do not credit a skill just because the user works in an adjacent area.
${JSON.stringify(candidateSkillsForLLM, null, 2)}

For each role listed above, write:
1. reasoning: 2-3 sentences explaining why this user is/isn't a strong fit, referencing their specific experiences and skills. Mention both the fit score and the goal alignment score when relevant.
2. action_items: 2-3 concrete, specific next steps to close the skill gaps
3. alignment_to_goal: 1 sentence explaining the goal alignment score using the alignment_reason as a factual anchor (e.g. "natural transfer path", "same role family", "no clear connection")

Also write at the top level:
- overall_assessment: 2-3 sentences summarising the user's current position and strongest signals
- qualification_level: "Junior", "Mid-Level", or "Senior" based on their experience depth
- additional_credited_skill_ids: array of skill IDs FROM THE CANDIDATE_SKILLS LIST ABOVE that the user demonstrably has based on their text. Empty array if none. NEVER include IDs not in CANDIDATE_SKILLS.

Return JSON matching this exact structure:
{
  "qualification_level": "string",
  "overall_assessment": "string",
  "additional_credited_skill_ids": ["string", ...],
  "roles": [
    {
      "title": "string (copy exactly from the input)",
      "track": "string (copy exactly)",
      "readiness_score": number (copy exactly),
      "goal_alignment_score": number (copy exactly),
      "matched_skills": [strings] (copy exactly),
      "missing_skills": [strings] (copy exactly),
      "reasoning": "string (YOU write this)",
      "action_items": [strings] (YOU write this),
      "alignment_to_goal": "string (YOU write this)"
    }
  ]
}

CRITICAL: Do not change any title, track, readiness_score, goal_alignment_score, matched_skills, or missing_skills value. Copy them verbatim. You are only authoring reasoning, action_items, alignment_to_goal, overall_assessment, qualification_level, and additional_credited_skill_ids.

Return ONLY valid JSON.`;

    const openaiResponse = await openaiChatCompletionWithRetry(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 4500,
        response_format: { type: 'json_object' },
      },
      openaiKey,
      {
        traceName: 'generate-career-analysis',
        userId: user.id,
      },
      // Was 45s — observed cold-cache requests landing right at 38–42s with
      // max_tokens=4500 + 15-role payload, so 45s timed out intermittently
      // and bubbled "Signal timed out" up to onboarding's track reveal step.
      { signal: AbortSignal.timeout(90000) },
    )

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text()
      // D2 — keep upstream detail server-side only (log_error RPC + console.error
      // backup); client gets generic message.
      await serviceClient.rpc('log_error', {
        p_user_id: user.id,
        p_function_name: 'generate-career-analysis',
        p_error_message: 'OpenAI API error',
        p_error_details: { status: openaiResponse.status, details: errText },
      })
      console.error(`[generate-career-analysis] OpenAI ${openaiResponse.status}: ${errText}`)
      _http = 502; _err = `openai_${openaiResponse.status}`
      m.modelUsed = MODEL
      return new Response(JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const completion = await openaiResponse.json()
    m.modelUsed = MODEL
    m.tokensIn = completion.usage?.prompt_tokens ?? null
    m.tokensOut = completion.usage?.completion_tokens ?? null
    let llmResult: Record<string, any>;
    try {
      llmResult = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
    } catch {
      _http = 500; _err = 'json_parse'
      return new Response(JSON.stringify({ error: 'AI returned an invalid response format. Please try again.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── PHASE 3: Validate LLM credits + re-score with augmented skills ──
    //
    // Layer 2 of the D3 fix: the LLM may have credited additional skill IDs
    // from CANDIDATE_SKILLS based on the user's raw text. Validate strictly
    // (must be a known library ID AND must have been in the offered list to
    // prevent hallucination), then re-score the same selected roles with the
    // augmented skill set. Re-scoring can only IMPROVE scores (skill_fit is
    // monotonic in matched-skill count), so tracks can only stay or move up.
    const validatedCredits = new Set<string>();
    if (Array.isArray(llmResult.additional_credited_skill_ids)) {
      for (const sid of llmResult.additional_credited_skill_ids) {
        if (typeof sid === "string" && candidateSkillIds.has(sid) && SKILL_BY_ID.has(sid)) {
          validatedCredits.add(sid);
        }
      }
    }
    console.log(`[career-analysis] LLM credit pass: offered=${candidateSkillIds.size} proposed=${(llmResult.additional_credited_skill_ids || []).length} validated=${validatedCredits.size} credited=[${[...validatedCredits].join(',')}]`);

    let finalSelected = selected;
    if (validatedCredits.size > 0) {
      const augmentedSkillIds = new Set([...userSkillIds, ...validatedCredits]);
      finalSelected = selected.map(s =>
        computeRoleScore(s.role_id, augmentedSkillIds, goalRoleId, experienceLevel, userHomeFamilies)
      );
      console.log(`[career-analysis] re-scored ${finalSelected.length} roles with ${validatedCredits.size} credits`);
    }

    // Aggregate skill_gaps from the (possibly re-scored) final set
    const allMissing = new Set<string>();
    for (const r of finalSelected) for (const sid of r.missing_skill_ids) allMissing.add(sid);
    const aggregatedGaps = [...allMissing].slice(0, 8).map(skillName);

    const llmRolesByTitle = new Map<string, any>();
    if (Array.isArray(llmResult.roles)) {
      for (const r of llmResult.roles) {
        if (typeof r?.title === "string") llmRolesByTitle.set(r.title, r);
      }
    }

    const finalRoles = finalSelected.map(server => {
      const llm = llmRolesByTitle.get(server.title) || {};
      return {
        title: server.title,
        track: server.track,
        readiness_score: server.score,
        goal_alignment_score: server.goal_alignment_score,
        alignment_reason: server.alignment_reason,
        matched_skills: server.matched_skills,
        missing_skills: server.missing_skills,
        reasoning: typeof llm.reasoning === "string" ? llm.reasoning : "",
        action_items: Array.isArray(llm.action_items)
          ? llm.action_items.filter((x: any) => typeof x === "string").slice(0, 5)
          : [],
        alignment_to_goal: typeof llm.alignment_to_goal === "string" ? llm.alignment_to_goal : "",
      };
    });

    // Direction-aligned primary_domain. extract-proof-signals (which sets
    // primary_domain at CV-upload time) only sees the CV — never the user's
    // stated five_year_role. For most pilot users (students breaking into
    // new fields) this means primary_domain reflects their CURRENT job, not
    // their TARGET direction. That penalizes target-domain jobs through
    // scoreJobFit's family axis (0.35 vs 1.0 → ~0.065 swing on composite,
    // enough to flip Track 1 → Track 2 on borderline jobs).
    //
    // Fix: career-analysis is the canonical "what direction is this user
    // going?" computation. Once we've resolved their goal role from
    // five_year_role, derive primary_domain from the role's role_family
    // and persist via service_role. Skipped silently when goal can't be
    // resolved or family doesn't map — keep existing primary_domain in
    // those cases (better than nulling it out).
    let resolvedPrimaryDomain: string | null = null;
    if (goalRoleId) {
      const goalRole = ROLE_BY_ID.get(goalRoleId);
      const family = goalRole?.role_family ?? null;
      const mapped = family ? FAMILY_TO_PRIMARY_DOMAIN[family] : null;
      if (mapped && mapped !== (profile as any).primary_domain) {
        resolvedPrimaryDomain = mapped;
        try {
          const serviceClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );
          const { error: domainErr } = await serviceClient
            .from('profiles')
            .update({ primary_domain: mapped })
            .eq('id', user.id);
          if (domainErr) {
            console.warn('[career-analysis] primary_domain update failed (non-fatal):', domainErr.message);
            resolvedPrimaryDomain = null;  // don't claim success in response
          } else {
            console.log(`[career-analysis] primary_domain: "${(profile as any).primary_domain ?? 'null'}" → "${mapped}" (from five_year_role="${sanitisedProfile.five_year_role}" → role_family="${family}")`);
          }
        } catch (err) {
          console.warn('[career-analysis] primary_domain update threw (non-fatal):', (err as Error)?.message);
          resolvedPrimaryDomain = null;
        }
      }
    }

    const response = {
      qualification_level: ["Junior", "Mid-Level", "Senior"].includes(llmResult.qualification_level)
        ? llmResult.qualification_level
        : inferQualificationLevel(sanitisedExperiences),
      experience_level: experienceLevel,
      overall_assessment: typeof llmResult.overall_assessment === "string" && llmResult.overall_assessment.trim()
        ? llmResult.overall_assessment
        : "",
      skill_gaps: aggregatedGaps,
      roles: finalRoles,
      // null when no change applied. Frontend can use this to invalidate
      // the userProfile cache so scoreJobFit sees the new domain on next
      // render. Existing invalidateAfterCareerAnalysis already covers it.
      primary_domain: resolvedPrimaryDomain,
      // Pass the input fingerprint back so the frontend forwards it to
      // replace_career_roles, which writes it to function_cache atomically
      // with the career_roles content. See content-hash.ts + migration
      // 20260526_function_cache.sql.
      input_hash: inputHash,
    };

    _ok = true; _http = 200
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    try {
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      await serviceClient.rpc('log_error', {
        p_user_id: null,
        p_function_name: 'generate-career-analysis',
        p_error_message: (error as Error).message,
        p_error_details: null,
      })
    } catch { /* best-effort logging */ }
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})
