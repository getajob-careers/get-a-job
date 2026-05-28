// Cheap, deterministic, transparent rule-based score for matching a
// company against a student's internship pitch strategy. Returns a
// 0–100ish integer (technically 5–85 given the current weights).
//
// Used by:
//   - supabase/functions/match-internship-companies/index.ts  (Stage 1
//     pre-filter that narrows ~500 companies → top 30 before the LLM
//     scoring stage)
//   - src/lib/internshipRuleScore.js (browse-page "cheap fit" chip on
//     every card in /Internship's Browse tab — no LLM, no edge call)
//
// Both callers must produce identical scores for the same inputs.
// Single source of truth lives here. Extending? Touch this file only.
// Tested via scripts/__tests__/internship-rule-score.test.ts.
//
// Bias: recall over precision. A borderline company should pass through
// (score in the mid band, not zero) — better to surface a soft match
// than hide it.

export interface ScorableCompany {
  name: string | null;
  description: string | null;
  industry: string | null;
  sector: string | null;
  stage: string | null;
  hq_country: string | null;
  // Other fields on the live row (id, domain, hq_city, employee_count_range,
  // ats, verified, origin, etc.) are not scored; callers can pass full rows
  // and unused fields are ignored.
}

export interface ScorableInternshipProfile {
  realistic_company_stages: string[];
  realistic_sectors: string[];
  realistic_signal_filters: string[];
  // Other internship_profile fields (pitchable_role_archetypes,
  // skill_gaps_to_close, etc.) feed the LLM stage, not the rule score.
}

// Transparent weights. Adjust here and both surfaces follow.
export const W_BASE   = 5;   // every authenticated company gets a floor
export const W_STAGE  = 30;  // exact stage match (vocabulary controlled
                             // by generate-internship-profile)
export const W_SECTOR = 25;  // sector OR industry substring overlap
export const W_SIGNAL = 15;  // realistic_signal_filters substring scan
export const W_GEO    = 10;  // IL boost (half-weight for US-HQ rows
                             // which usually have TLV offices)

export function ruleScore(
  company: ScorableCompany,
  profile: ScorableInternshipProfile,
): number {
  let score = W_BASE;

  if (company.stage && profile.realistic_company_stages.length > 0) {
    const cStage = company.stage.toLowerCase();
    if (profile.realistic_company_stages.some((s) => s.toLowerCase() === cStage)) {
      score += W_STAGE;
    }
  }

  if (profile.realistic_sectors.length > 0) {
    const haystacks = [company.sector, company.industry]
      .filter(Boolean)
      .map((s) => (s as string).toLowerCase());
    if (haystacks.length > 0) {
      const hit = profile.realistic_sectors.some((s) =>
        haystacks.some((h) => h.includes(s.toLowerCase()) || s.toLowerCase().includes(h)),
      );
      if (hit) score += W_SECTOR;
    }
  }

  if (profile.realistic_signal_filters.length > 0) {
    const haystack = [
      company.name,
      company.description,
      company.industry,
      company.sector,
    ]
      .filter(Boolean)
      .map((s) => (s as string).toLowerCase())
      .join(" | ");
    if (haystack) {
      const hits = profile.realistic_signal_filters.filter((sig) =>
        haystack.includes(sig.toLowerCase()),
      ).length;
      // Up to W_SIGNAL points total — one hit gets most of it, more
      // hits get incrementally more but capped.
      score += Math.min(W_SIGNAL, hits * (W_SIGNAL / 2));
    }
  }

  if (company.hq_country) {
    const country = company.hq_country.toLowerCase();
    if (country === "israel" || country === "il") {
      score += W_GEO;
    } else if (country === "united states" || country === "usa" || country === "us") {
      score += W_GEO / 2;
    }
  }

  return score;
}
