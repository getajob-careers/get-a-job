// Validation helpers for the chat agent's "Apply Changes" handlers
// (handleApplyRoadmapChanges, handleApplyApplicationActions in
// ChatInterface.jsx). The chat agent emits suggested actions; we
// validate AI-emitted values against allowed lists and against the
// user's actual profile data before writing to the DB.

export const VALID_TIERS = ["track_1", "track_2", "track_3"];

// Mirrors the chk_applications_status DB CHECK constraint.
export const VALID_STATUSES = [
  "interested", "preparing", "applied", "interviewing",
  "offer", "accepted", "rejected",
];

// Matches the canonical examples in the ai-chat ROADMAP_CHANGES_RULES
// prompt (functions/ai-chat/index.ts line ~137). Keep this list in sync
// with that prompt — agent values that aren't in this list get dropped
// silently.
export const VALID_INTERVIEW_STAGES = [
  "phone_screen", "technical", "onsite", "final_round", "reference_check",
];

export const validTrack = (t) => (VALID_TIERS.includes(t) ? t : null);
export const validStatus = (s) => (VALID_STATUSES.includes(s) ? s : null);
export const validInterviewStage = (s) =>
  (VALID_INTERVIEW_STAGES.includes(s) ? s : null);

// Normalise to alphanumeric-lowercase for skill comparisons. Bridges
// the casing/punctuation differences between AI-proposed strings and
// the user's actual profile.skills entries.
const skillKey = (s) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

// Filters AI-proposed matched_skills against the user's profile.skills.
// Returns an array of the user's actual skill strings (preserving their
// original casing) for each proposed skill that has a normalised match.
// Drops anything that doesn't correspond to a real user skill — this is
// the anti-fabrication guard.
export function validateMatchedSkills(proposed, userSkills) {
  if (!Array.isArray(proposed) || !Array.isArray(userSkills)) return [];
  const userSkillByKey = new Map();
  for (const s of userSkills) {
    if (typeof s !== "string") continue;
    userSkillByKey.set(skillKey(s), s);
  }
  const out = [];
  const seen = new Set();
  for (const p of proposed) {
    if (typeof p !== "string") continue;
    const key = skillKey(p);
    if (!key || seen.has(key)) continue;
    const userSkill = userSkillByKey.get(key);
    if (userSkill) {
      out.push(userSkill);
      seen.add(key);
    }
  }
  return out;
}

// Sanitises AI-proposed missing_skills. These are aspirational —
// skills the user doesn't have — so we don't validate against
// profile.skills. Just enforce shape: trim, dedupe, cap length.
export function sanitizeMissingSkills(proposed) {
  if (!Array.isArray(proposed)) return [];
  const out = [];
  const seen = new Set();
  for (const p of proposed) {
    if (typeof p !== "string") continue;
    const trimmed = p.trim();
    if (!trimmed) continue;
    const key = skillKey(trimmed);
    if (seen.has(key)) continue;
    out.push(trimmed);
    seen.add(key);
  }
  return out.slice(0, 20);
}

// Coerces an AI-emitted readiness/match score to a number in [0, 1].
// Returns null if the value isn't a number — caller decides whether to
// drop the field or substitute a default.
export function clampScore(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return null;
  return Math.max(0, Math.min(1, v));
}

// Trims a string and caps its length. Used for AI-emitted reasoning,
// alignment_to_goal, and similar prose fields. Returns empty string
// for non-string input rather than null so the field renders empty
// instead of breaking conditional checks.
export function sanitizeText(s, maxLen = 500) {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, maxLen);
}

// Detects an obviously-corrupted company name — the kind produced when the
// chat agent extracts a company from scraped careers-page text whose brand /
// nav strings arrive run-together with no spaces (e.g. "AnyRMFlowtoXprien",
// where the site's "About Us · Careers · Contact Us" logo text was jammed
// into one token). Two signals, both conservative so legitimate single-token
// camelCase brands (SentinelOne, MazeBolt, MongoDB, DealHub, NetApp, LayerX —
// all <=11 chars, <=3 capitals in real data) are NEVER flagged:
//   1. embedded nav / boilerplate phrases that never appear in a real name;
//   2. a long no-whitespace token (>=16 chars) that looks like several words
//      concatenated — >=4 capital letters OR >=3 lowercase->uppercase
//      transitions.
const COMPANY_BOILERPLATE_RE =
  /(about\s*us|contact\s*us|careers|back to positions|all rights reserved|apply (for|now)|full[-\s]?time|part[-\s]?time)/i;

export function isSuspiciousCompany(raw) {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return false;
  if (COMPANY_BOILERPLATE_RE.test(s)) return true;
  // Placeholder names the model reaches for when the JD never states the
  // company. Treating them as suspicious routes them to FALLBACK_COMPANY so a
  // literal "Unknown" never persists, and lets add_application detect that the
  // coach supplied no real company (see placeholderCompanyIds).
  if (/^(unknown|n\/?a|none|tbd|not\s+specified|company|the\s+company)$/i.test(s)) return true;
  if (!/\s/.test(s) && s.length >= 16) {
    const caps = (s.match(/[A-Z]/g) || []).length;
    const transitions = (s.match(/[a-z][A-Z]/g) || []).length;
    if (caps >= 4 || transitions >= 3) return true;
  }
  return false;
}

// Neutral placeholder stored when a company is missing or flagged corrupted.
// NOT null on purpose: applications.company is NOT NULL, so returning null
// would make the whole add_application insert fail — worse than storing a
// clean placeholder. "Company" renders acceptably in the
// "Tailored for [role] · [company]" label.
export const FALLBACK_COMPANY = "Company";

// Cleans an AI-emitted company name for storage. Returns the trimmed string,
// or FALLBACK_COMPANY when it's empty or flagged corrupted by
// isSuspiciousCompany — so garbage never persists and the NOT NULL company
// column always receives a clean, non-null value.
export function sanitizeCompany(raw) {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s || isSuspiciousCompany(s)) return FALLBACK_COMPANY;
  return s;
}

// Sanitises AI-emitted action_items. Each item is trimmed and capped
// at maxItemLen; empty items are dropped; the array is capped at
// maxItems. Mirrors the analysis pipeline's expected shape (string[]).
export function sanitizeActionItems(arr, maxItems = 5, maxItemLen = 200) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((s) => typeof s === "string")
    .map((s) => s.trim().slice(0, maxItemLen))
    .filter(Boolean)
    .slice(0, maxItems);
}
