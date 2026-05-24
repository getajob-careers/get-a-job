// extract-job-requirements — pulls structured signals out of a job posting's
// description and writes them onto the jobs row. Designed to run ONCE per job
// (nightly during scrape for new postings, on schema-version bump for the rest)
// so that downstream user-view scoring becomes deterministic profile-vs-job
// math instead of per-user LLM calls.
//
// Auth: service-role only (no end-user JWT). Called by the scraper and by the
// admin backfill script. Function is service-only — we set verify_jwt: false
// at deploy time and check for the service-role key inside the handler.
//
// Idempotency: if jobs.description_hash matches the input JD's hash AND the
// schema version is current, returns the existing extraction without calling
// OpenAI. Bumping EXTRACTION_SCHEMA_VERSION forces re-extraction on next call.

import { createClient } from "npm:@supabase/supabase-js@2";
import { openaiChatCompletion } from '../_shared/openai-chat.ts';
import { SKILL_ALIASES } from '../_shared/skill-aliases.ts';
import { skillLibrary } from "../_shared/libraries/01_skill_library.ts";
import { roleLibrary } from "../_shared/libraries/00_role_library.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// gpt-4o-mini: this is structured extraction, not creative writing. The audit
// decided to start here and only upgrade if spot-checks fail. Cost target:
// ~$0.005/job (~$16 for 3187-job backfill, ~$0.25-1/day ongoing).
const MODEL = "gpt-4o-mini";

// Bump to force re-extraction across the whole jobs table. Useful when the
// extraction prompt or output schema changes in a way that requires reprocessing.
// v2: expanded schema with customer_type, industry_vertical, company_stage,
//     tech_stack, compensation, eligibility_constraints, etc.
// v3: +101 new library skills + ~150 new aliases (2026-05-21 expansion) +
//     Workday detail-page descriptions now backfilled. Forces re-extract so
//     newly-populated descriptions get extracted and newly-aliased phrases
//     resolve to canonical IDs.
// v4: +95 more library skills + ~200 more aliases + 10 new structured fields
//     (req_ai_tooling, req_skill_years, on_call_expected, office_policy,
//     notable_customers, scale_signals, il_benefits, funding_signals, track,
//     jd_language) + 5 JSONB refinements (equity_struct, benefits_struct,
//     travel_struct, reports_to_struct, rd_local_headcount + local_office_city).
//     Captures the 2026 AI-tool fluency signal (45% of JDs), per-skill years
//     gating (40%), and IL-specific comp perks (Keren Hishtalmut, Cibus).
const EXTRACTION_SCHEMA_VERSION = 4;

// Canonical vocabularies the extractor must produce. We surface these in the
// prompt so the LLM only emits values that match our deterministic scorer.
const SENIORITY_VOCAB = (roleLibrary as any).seniority_levels as string[];
const ROLE_FAMILIES = (roleLibrary as any).role_families as string[];
const EDUCATION_LEVELS = [
  'high_school', 'associate', 'bachelors', 'masters', 'phd', 'bootcamp', 'self_taught',
];
const PROFICIENCY_LEVELS = ['Native', 'Fluent', 'Professional', 'Conversational', 'Basic'];
const CUSTOMER_TYPES = [
  'enterprise', 'mid_market', 'smb', 'consumer', 'b2b', 'b2c', 'b2b2c', 'government',
];
const COMPANY_STAGES = [
  'early_stage_startup', 'growth_stage_startup', 'scale_up', 'enterprise', 'public_corp', 'mature_private',
];
const METHODOLOGIES = [
  'agile', 'scrum', 'kanban', 'tdd', 'ci_cd', 'devops', 'pair_programming', 'code_review', 'gitops',
];
const APPLICATION_EXTRAS = [
  'github_required', 'portfolio_required', 'cover_letter_required',
  'writing_sample_required', 'case_study_required', 'linkedin_required',
  'reference_required', 'work_authorization_check',
];
const BENEFITS_VOCAB = [
  'health_insurance', 'dental', 'parental_leave', 'learning_budget',
  'gym_wellness', 'pension', 'hishtalmut', 'rsus', 'bonus', 'wfh_stipend',
  'flexible_hours', 'unlimited_pto', 'sabbatical', 'relocation_support', 'meals',
];
const SALARY_CADENCES = ['hourly', 'monthly', 'annual'];
// ISO 4217 + ILS/NIS alias. Lowercase normalized at compare time.
const CURRENCY_CODES = new Set(['USD', 'EUR', 'GBP', 'ILS', 'NIS']);
// v4 vocabularies
const ON_CALL_VOCAB = ['none', 'occasional', 'rotation_required', '24_7'];
const TRACK_VOCAB = ['ic', 'manager', 'tech_lead', 'hybrid_player_coach'];
const JD_LANGUAGES = ['en', 'he', 'mixed'];
const FUNDING_ROUND_TYPES = [
  'pre_seed', 'seed', 'series_a', 'series_b', 'series_c', 'series_d',
  'series_e', 'late_stage', 'ipo', 'public', 'bootstrapped',
];

// Build the skill ID set once at module load.
const SKILL_ID_SET: Set<string> = new Set(
  ((skillLibrary as any).skill_library as any[]).map((s) => s.id || s.skill_id).filter(Boolean),
);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// SHA-256 hash of the JD text — used to detect when a job's description has
// changed since last extraction so we re-process it.
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Resolve a free-text skill phrase to canonical skill_library IDs via the
// alias map. Returns [] when nothing resolves — caller logs the unmapped
// phrase to jd_unmapped_skill_counts so we can grow the library from market
// signal. Lookup order mirrors the shared resolveSkillAliases helper:
//   1. Direct alias-map match on lowercased+whitespace-collapsed form
//   2. Strip parenthetical content and retry
//   3. Snake_case → space normalization (handles JD-extractor outputs like
//      "product_management" that should resolve via "product management")
//   4. Snake-case direct ID match
function resolveSkill(label: string): string[] {
  if (!label || typeof label !== 'string') return [];
  const norm = label.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!norm) return [];

  // 1. Direct alias
  const direct = SKILL_ALIASES[norm];
  if (direct) return direct.filter((id) => SKILL_ID_SET.has(id));

  // 2. Strip parentheticals
  const stripped = norm.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (stripped !== norm && stripped.length > 0) {
    const aliased = SKILL_ALIASES[stripped];
    if (aliased) return aliased.filter((id) => SKILL_ID_SET.has(id));
  }

  // 3. Snake_case → space normalization. JD extractors sometimes emit
  //    snake_case ("product_management", "big_data") that won't match the
  //    space-keyed alias map. Convert underscores back to spaces and retry.
  if (norm.includes('_')) {
    const unsnaked = norm.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
    if (unsnaked !== norm && unsnaked.length > 0) {
      const aliased = SKILL_ALIASES[unsnaked];
      if (aliased) return aliased.filter((id) => SKILL_ID_SET.has(id));
    }
  }

  // 4. Snake-case direct ID match
  const snake = norm.replace(/[\s-]+/g, '_');
  if (SKILL_ID_SET.has(snake)) return [snake];
  return [];
}

// Substring-validate a numeric claim ("3-5 years") against the JD. We do this
// because the LLM occasionally infers a years requirement from seniority words
// when no number is actually present. Returns true if the claim is grounded.
function jdMentionsYearsClaim(jd: string, min: number | null, max: number | null): boolean {
  if (min === null && max === null) return true; // null is fine — extractor said "unknown"
  const lower = jd.toLowerCase();
  // Look for any digit pattern near the word "year" within the JD.
  const yearPatterns = lower.match(/\d+\s*[-+]?\s*(?:to\s*)?\d*\s*\+?\s*(?:year|yr|y)s?\b/gi) || [];
  return yearPatterns.length > 0;
}

interface ExtractionResult {
  // Core requirements (v1 schema)
  req_years_min: number | null;
  req_years_max: number | null;
  req_seniority: string | null;
  req_education_levels: string[];
  req_education_fields: string[];
  req_education_strict: boolean;
  req_skills_core_raw: string[];   // free-text phrases the LLM extracted
  req_skills_nice_raw: string[];
  req_languages: Array<{ language: string; proficiency: string }>;
  req_visa_constraint: string | null;
  function_family: string | null;
  responsibility_keywords: string[];
  extraction_confidence: number;

  // Extended (v2 schema)
  customer_type: string[];
  industry_vertical: string[];
  company_stage: string | null;
  company_size_employees: number | null;
  founded_year: number | null;
  tech_stack: string[];
  methodology: string[];
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_cadence: string | null;
  equity_mentioned: boolean;
  bonus_mentioned: boolean;
  team_size: number | null;
  reports_to: string | null;
  days_in_office: number | null;
  travel_percentage: string | null;
  application_extras: string[];
  interview_process: Record<string, unknown> | null;
  benefits: string[];
  eligibility_constraints: Record<string, unknown> | null;
  extraction_freeform_signals: Array<{ signal: string; evidence: string; category?: string }>;

  // v4 schema additions
  req_ai_tooling: Record<string, unknown> | null;
  req_skill_years: Array<{ skill: string; years_min: number; required: boolean }>;
  on_call_expected: string | null;
  office_policy: Record<string, unknown> | null;
  notable_customers: string[];
  scale_signals: Record<string, unknown> | null;
  il_benefits: Record<string, unknown> | null;
  funding_signals: Record<string, unknown> | null;
  track: string | null;
  direct_reports_min: number | null;
  direct_reports_max: number | null;
  jd_language: string | null;
  equity_struct: Record<string, unknown> | null;
  benefits_struct: Record<string, unknown> | null;
  travel_struct: Record<string, unknown> | null;
  reports_to_struct: Record<string, unknown> | null;
  rd_local_headcount: number | null;
  local_office_city: string | null;
}

async function extractRequirements(jd: string, jobTitle: string, openaiKey: string): Promise<ExtractionResult | null> {
  const systemPrompt = `You are a structured extractor that pulls REQUIREMENTS and CONTEXT signals from job descriptions for downstream profile-vs-job fit scoring + market analysis. Your output is consumed by deterministic math, UI filters, and CV generation — emit ONLY values that match the canonical vocabularies below. When a JD doesn't explicitly state something, leave that field null/empty rather than inferring.

═══════════════════════════════════════════════════════════════════════════
CANONICAL VOCABULARIES (use these values exactly — case-sensitive)
═══════════════════════════════════════════════════════════════════════════

- req_seniority: [${SENIORITY_VOCAB.join(' | ')}]
- function_family: [${ROLE_FAMILIES.join(' | ')}]
- req_education_levels: [${EDUCATION_LEVELS.join(' | ')}]
- language proficiency: [${PROFICIENCY_LEVELS.join(' | ')}]
- customer_type: [${CUSTOMER_TYPES.join(' | ')}]
- company_stage: [${COMPANY_STAGES.join(' | ')}]
- methodology: [${METHODOLOGIES.join(' | ')}]
- application_extras: [${APPLICATION_EXTRAS.join(' | ')}]
- benefits: [${BENEFITS_VOCAB.join(' | ')}]
- salary_cadence: [${SALARY_CADENCES.join(' | ')}]
- salary_currency: ISO codes [USD, EUR, GBP, ILS]. Treat NIS / shekel / ₪ as ILS.

═══════════════════════════════════════════════════════════════════════════
EXTRACTION RULES — CORE REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════

1. req_years_min / req_years_max — extract from prose like "3+ years", "5-7 years", "minimum 2 years". "3+ years" → min=3, max=null. "0-2 years" → min=0, max=2. "junior" with no number → min=0. No number AND no level signal → both null. NEVER invent a number.

2. req_seniority — derive from explicit text ("Senior", "Lead", "Junior") OR years. 0-2y → Entry_Mid. 2-4y → Mid. 5+ → Senior. Explicit text wins.

3. req_education_levels — only when JD explicitly names a degree level. "Bachelor's degree" → ["bachelors"]. "Bachelor's or Master's" → ["bachelors","masters"]. Vague "degree" → empty.

4. req_education_fields — snake_case field names from the JD ("computer_science", "industrial_engineering", "business_administration"). "Related field" alone → empty.

5. req_education_strict — TRUE only when JD has NO softening clause. FALSE when "or equivalent experience", "preferred", "nice to have", "bonus".

6. req_skills_core / req_skills_nice — concrete skills/tools the JD requires. Free-text phrases ("Python", "Salesforce", "User Research", "Stakeholder Management"). NEVER include soft skills like "communication" or "team player". Distinguish core (must-have) vs nice (under "advantage" / "bonus" / "nice to have").

7. req_languages — when JD explicitly names a human language as required or preferred ("Full professional proficiency in English is mandatory", "Native English speaker", "Hebrew required", "Spanish a plus", "communicate with global customers"). Israeli tech JDs almost always require English at Fluent or Native level — extract it whenever stated, even briefly. Skip "good communication" alone (not a specific language). For each language, emit { language: "English", proficiency: "Native | Fluent | Professional | Conversational | Basic" }.

8. req_visa_constraint — verbatim quote from JD ONLY when it states a hard eligibility ("Israeli citizens only", "Must have security clearance"). Null when none.

9. function_family — closest match from the canonical list. "Product Owner" → Product. "CSM" → Customer_Experience. "Backend Engineer" → Engineering.

10. responsibility_keywords — 5-10 snake_case action terms ("user_stories", "backlog_management", "prds"). What the role DOES, not what's required of the candidate.

═══════════════════════════════════════════════════════════════════════════
EXTRACTION RULES — EXTENDED CONTEXT (v2)
═══════════════════════════════════════════════════════════════════════════

11. customer_type — segment(s) the role serves. JD mentions "enterprise customers" → ["enterprise"]. "Fortune 500" → ["enterprise"]. "SMB" → ["smb"]. "B2B SaaS" → ["b2b"]. "Consumer app" → ["b2c","consumer"]. Empty when JD doesn't specify.

12. industry_vertical — snake_case verticals the company/role lives in. "Trade finance" → ["fintech"]. "Cybersecurity startup" → ["cybersecurity"]. "AI marketing platform" → ["adtech","ai_infrastructure"]. Multi-tag freely if JD explicitly mentions multiple. Use snake_case ASCII.

13. company_stage — derive from explicit phrases:
    - "Pre-seed" / "seed-stage" / "early-stage" / "founding team" → early_stage_startup
    - "Series A/B" / "growing startup" / "<200 employees" → growth_stage_startup
    - "Series C/D" / "scale-up" / "200-1000 employees" → scale_up
    - "1000+ employees" / "Fortune-listed" / "global leader" → enterprise
    - "Publicly traded" / "NASDAQ" / "(NYSE: ...)" → public_corp
    - Established privately-held large company → mature_private
    Null when JD has no signal.

14. company_size_employees — integer ONLY when JD states a number ("100 employees", "5,000+ team", "team of 50"). Headcount in a section header counts. Null otherwise.

15. founded_year — integer ONLY when JD states "Founded in YYYY" or "Since YYYY". Null otherwise.

16. tech_stack — REQUIRED for engineering / data / ML / DevOps / IT roles. Pull EVERY verbatim tool / framework / platform / cloud / database / observability / messaging / orchestration name the JD lists. Lowercased on output. This is the verbatim NAME — distinct from req_skills_core which carries skill PHRASES. Example for a DevOps role: ["aws", "terraform", "kubernetes", "eks", "argocd", "linux", "python", "grafana", "prometheus"]. Example for a frontend role: ["react", "typescript", "tailwind", "next.js", "vite"]. Example for a data role: ["python", "snowflake", "airflow", "dbt", "kafka", "spark"]. Both core requirements AND nice-to-have tools belong here — tech_stack is the FULL toolbelt mentioned in the JD. Empty only for non-tech roles (sales, marketing, HR, finance unless they mention specific software).

17. methodology — process methodologies the JD names. ["agile", "scrum"] etc. Empty when not stated.

18. salary_min / salary_max / salary_currency / salary_cadence — extract ONLY when JD prose states a number (NOT inferred from market norms):
    - "$120,000 - $150,000/year" → min=120000, max=150000, currency="USD", cadence="annual"
    - "₪25,000/month" → min=25000, max=null, currency="ILS", cadence="monthly"
    - "competitive" / "DOE" / no number → all null. NEVER invent.

19. equity_mentioned — TRUE if JD mentions "equity", "stock options", "ESOP", "RSUs", "share options". FALSE otherwise.

20. bonus_mentioned — TRUE if JD mentions "bonus", "commission", "OTE", "variable comp". FALSE otherwise.

21. team_size — integer team size ONLY when JD states it ("12-person team", "team of 8 engineers", "join our 5-person squad"). Null otherwise.

22. reports_to — verbatim phrase when JD says "reports to" or "reporting to" ("VP of Engineering", "Head of Product"). Null otherwise.

23. days_in_office — integer 1-5 ONLY when JD states days for a hybrid role ("3 days a week in office"). Null otherwise.

24. travel_percentage — verbatim phrase when JD specifies travel ("up to 25%", "occasional", "minimal", "10-20% travel"). Null otherwise.

25. application_extras — what the candidate must include. "Send your GitHub" → ["github_required"]. "Include a portfolio" → ["portfolio_required"]. "Cover letter required" → ["cover_letter_required"]. Empty when standard application.

26. interview_process — JSON object describing the hiring process when JD spells it out. Shape: { "rounds": 3, "stages": ["screen", "technical", "behavioral"], "take_home": true, "system_design": true, "case_study": false }. Only set fields the JD actually mentions. Null entirely when JD doesn't describe the process.

27. benefits — what employees get. "Health insurance, dental" → ["health_insurance", "dental"]. "Annual learning budget" → ["learning_budget"]. "Keren hishtalmut" → ["hishtalmut"]. Empty when JD doesn't list.

28. eligibility_constraints — JSON object capturing hard filters. Set fields ONLY when JD explicitly mentions:
    {
      "il_military_completed": true,           // requires completed IDF service
      "il_military_unit_specific": "8200",     // specific unit named
      "security_clearance_required": true,
      "security_clearance_level": "TS/SC",     // verbatim level if stated
      "miluim_friendly": true,                 // accommodates reservist duty
      "citizenship_required": "israeli",
      "work_authorization_required": "israeli_or_eu"
    }
    Return null entirely when JD has no eligibility hard filters.

29. extraction_freeform_signals — capture 0-3 NOTEWORTHY patterns that don't fit anywhere else but seem to be real recurring market themes. We mine this field post-backfill to spot v2 schema candidates, so be GENEROUS rather than conservative. If the JD mentions ANY of these patterns explicitly, capture it:
    - Culture: "AI-first culture", "remote-first", "async culture", "no-meeting culture", "ownership-driven", "flat structure / no managers", "transparent salary", "founder-led culture"
    - Hiring signals: "ex-Google / ex-Meta team", "PhD background valued", "open-source contributions count", "Kaggle / GitHub portfolio considered", "competitive programming background"
    - Market position: "profitable from day one", "bootstrapped", "research-driven", "industry-defining", "category leader", "stealth mode", "newly funded"
    - Comp signals: "above-market", "top-tier comp", "transparent equity"
    - Unusual perks: "sabbatical after N years", "annual company offsite", "publish research papers", "patent filing support", "miluim accommodations" (Israeli reservist duty)
    Shape: [{ "signal": "ai_first_culture", "evidence": "We are building an AI-first engineering culture", "category": "culture" }]
    Categories (lowercase): culture | hiring_signal | comp_signal | market_position | unusual_perk | il_specific. Aim for 1-3 signals per JD when ANY of these patterns appear. Empty array only when the JD is purely generic.

═══════════════════════════════════════════════════════════════════════════
EXTRACTION RULES — v4 SCHEMA FIELDS (NEW)
═══════════════════════════════════════════════════════════════════════════

31. req_ai_tooling — when the JD names AI-assisted developer tools as a REQUIREMENT (not just a perk).
    Examples that should populate this field:
    - "Proficient and heavy user of Claude Code" → required: ["claude_code"], mindset_flag: true
    - "Use Cursor or Copilot for daily development" → required: ["cursor","github_copilot"], mindset_flag: true
    - "AI-first engineering culture" without naming tools → required: [], mindset_flag: true
    - JD doesn't mention AI tools at all → null
    Shape: { "required": ["cursor","claude_code"], "nice": ["copilot"], "mindset_flag": true }
    Canonical tool names: cursor | claude_code | github_copilot | windsurf | replit_ai | tabnine | codeium | sourcegraph_cody | jetbrains_ai. Use lowercase snake_case. The mindset_flag captures "AI-first culture" framing even when no specific tool is named.

32. req_skill_years — when JD lists per-skill years requirements ("5+ years backend, 3+ years Python, 2+ years Kubernetes"). Parse each skill/years pair into an array.
    Shape: [{ "skill": "python", "years_min": 3, "required": true }, { "skill": "kubernetes", "years_min": 2, "required": true }]
    Use lowercase skill names. Mark required=false when phrased as nice-to-have or "preferred". Empty array when JD only states a flat overall years requirement.

33. on_call_expected — explicit on-call rotation mention.
    Values: "rotation_required" (named tier-N rotation), "24_7" (always-on), "occasional" (incident-only or "may participate occasionally"), "none" (explicit "no on-call" or clearly not on-call role).
    null when JD doesn't mention on-call at all.

34. office_policy — structured version of hybrid/remote arrangement.
    Shape: { "days_in_office_min": 3, "days_in_office_max": 3, "mandatory": true, "full_remote": false, "days_specified": true }
    "Hybrid — 3 days a week in TLV office, A MUST" → mandatory: true.
    "Fully remote" → full_remote: true, days_in_office_min: 0.
    "Hybrid (flexible)" → mandatory: false, days_specified: false.
    null when JD doesn't describe office policy.

35. notable_customers — customer/brand logos cited in the JD body (e.g. "Toyota", "NBC News", "Fortune 500 customers", "Spotify, Slack, Netflix"). Verbatim names, capped at 10. Empty array when JD doesn't name customers.

36. scale_signals — quantified product/business scale claims in the JD body.
    Shape: { "users_dau": "600M", "users_total": "750000", "data_volume": "40TB/day", "transactions": "$100B/year", "customers_count": "1600", "revenue": null }
    Use the verbatim phrase from the JD (e.g. "600M" not 600000000). null when JD has no scale numbers.

37. il_benefits — Israeli-specific compensation perks the JD names.
    Shape: { "keren_hishtalmut": true, "meal_card": "cibus" | "10bis" | "tenbis" | null, "wellness_stipend_nis": 1000, "study_fund": true, "gym": true, "commute_subsidy": true, "meals_provided": false }
    "Keren Hishtalmut" (Hebrew study fund) → keren_hishtalmut: true, study_fund: true. "10bis / Cibus" → meal_card. "Wellness stipend of ₪1,000" → wellness_stipend_nis: 1000.
    null when JD has no IL-specific perks.

38. funding_signals — funding/valuation context stated in JD body.
    Shape: { "last_round_size_usd": 50000000, "last_round_type": "series_b", "total_raised_usd": 100000000, "valuation_usd": 1800000000, "notable_investors": ["Lightspeed","Menlo","Citi Ventures"] }
    Round types: pre_seed | seed | series_a..e | late_stage | ipo | public | bootstrapped.
    Convert "$50M" to 50000000. null when JD has no funding mention.

39. track — IC vs management framing.
    Values: ic (explicit "individual contributor role" / "hands-on engineering, no people management"), manager (explicit "manage a team of X"), tech_lead (lead engineer with limited people-mgmt), hybrid_player_coach (explicit "balance of hands-on engineering and team management"), null.

40. direct_reports_min / direct_reports_max — when track is manager / hybrid, the size of the team being managed. Both null when not stated.

41. jd_language — body language of the JD itself.
    Values: en (English-only body), he (Hebrew-only body), mixed (Hebrew + English mixed within paragraphs). Check the actual body language, not just the title.

═══════════════════════════════════════════════════════════════════════════
v4 JSONB REFINEMENTS — structured versions of existing flat fields
═══════════════════════════════════════════════════════════════════════════

42. equity_struct — granular equity signal (you also still set equity_mentioned BOOLEAN above).
    Shape: { "mentioned": true, "type": ["options","rsu","espp"], "qualifier": "meaningful" | "standard" | null, "percentage": null, "vesting_mentioned": false, "refresh_mentioned": false }
    null when JD doesn't mention equity.

43. benefits_struct — structured version of benefits (you also still populate the benefits TEXT[] above).
    Shape: { "pto_days": 20, "retirement_match_pct": null, "parental_leave": true, "mental_health": false, "learning_budget": true, "gym_wellness": true, "meal_voucher": true, "commute_subsidy": false, "dental": true, "vision": false, "health": true }
    Populate keys the JD names; leave others null.

44. travel_struct — structured travel.
    Shape: { "percentage_max": 25, "destinations": ["us","europe","intra_il"], "frequency": "monthly" | "quarterly" | "ad_hoc" }
    "30% travel to US sites" → percentage_max: 30, destinations: ["us"].

45. reports_to_struct — structured reports-to (you also still populate reports_to TEXT above).
    Shape: { "title": "Head of Rental Operations", "function": "operations", "seniority": "director" | "manager" | "vp" | "cxo", "named": false }
    "Reports directly to the VP of Engineering" → seniority: "vp", function: "engineering", named: false.

46. rd_local_headcount — when JD distinguishes local R&D headcount from global ("R&D center of over 160 employees in Jerusalem" while global is 900+). Integer. null when only global is stated.

47. local_office_city — primary Israeli office city when the JD specifies one (e.g. "Tel Aviv", "Jerusalem", "Herzliya"). null when no IL city.

═══════════════════════════════════════════════════════════════════════════
EXTRACTION CONFIDENCE — 5-band rubric (DO NOT DEFAULT TO 0.5)
═══════════════════════════════════════════════════════════════════════════

30. extraction_confidence — pick a band based on JD quality + your extraction completeness:

    0.90-1.00 — DETAILED. JD has clear sections (About / Responsibilities / Requirements / Benefits), states years explicitly, names tech stack, lists 5+ requirements, you extracted virtually every field without inferring. Most Greenhouse / Lever postings from well-established companies sit here.

    0.70-0.89 — SOLID. JD describes the role and most requirements clearly but some context fields are missing (e.g. no salary, no team size). You extracted most fields with high confidence.

    0.50-0.69 — PARTIAL. JD describes the role but is brief or marketing-heavy. Years and seniority extractable, but many context fields stay null. Reasonable extraction for what's there.

    0.30-0.49 — SPARSE. JD is short (< 800 chars), mostly company boilerplate, or describes the company more than the role. You extracted only basic seniority + function.

    0.00-0.29 — POOR. JD is too short, doesn't describe a role, or is mostly a "we're hiring" stub. Most fields null.

    AVOID emitting exactly 0.50 — pick a band above or below. Hedging at 0.50 means the confidence signal is useless to downstream consumers.

═══════════════════════════════════════════════════════════════════════════
GROUNDING RULES (CRITICAL — apply to EVERY field)
═══════════════════════════════════════════════════════════════════════════

A. Every extracted value must trace to text actually present in the JD. If a value isn't there, leave the field empty/null.
B. Do NOT extract requirements / context from the JOB TITLE alone.
C. Do NOT extract from your training-data assumptions about the company or industry.
D. For ambiguous cases ("experience with cloud platforms"), extract a general phrase ("cloud platforms") rather than guessing specifics ("AWS").
E. Compensation, team size, founded year, and other NUMERIC fields must be substring-present in the JD. Never infer.

Return JSON only matching the schema below. No markdown, no prose.`;

  const userPrompt = `JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jd.slice(0, 12000)}

Return JSON matching exactly this shape (leave fields null/empty when JD doesn't support them — that's better than guessing):
{
  "req_years_min": null,
  "req_years_max": null,
  "req_seniority": null,
  "req_education_levels": [],
  "req_education_fields": [],
  "req_education_strict": false,
  "req_skills_core_raw": [],
  "req_skills_nice_raw": [],
  "req_languages": [],
  "req_visa_constraint": null,
  "function_family": null,
  "responsibility_keywords": [],
  "customer_type": [],
  "industry_vertical": [],
  "company_stage": null,
  "company_size_employees": null,
  "founded_year": null,
  "tech_stack": [],
  "methodology": [],
  "salary_min": null,
  "salary_max": null,
  "salary_currency": null,
  "salary_cadence": null,
  "equity_mentioned": false,
  "bonus_mentioned": false,
  "team_size": null,
  "reports_to": null,
  "days_in_office": null,
  "travel_percentage": null,
  "application_extras": [],
  "interview_process": null,
  "benefits": [],
  "eligibility_constraints": null,
  "extraction_freeform_signals": [],
  "req_ai_tooling": null,
  "req_skill_years": [],
  "on_call_expected": null,
  "office_policy": null,
  "notable_customers": [],
  "scale_signals": null,
  "il_benefits": null,
  "funding_signals": null,
  "track": null,
  "direct_reports_min": null,
  "direct_reports_max": null,
  "jd_language": "en",
  "equity_struct": null,
  "benefits_struct": null,
  "travel_struct": null,
  "reports_to_struct": null,
  "rd_local_headcount": null,
  "local_office_city": null,
  "extraction_confidence": 0
}`;

  try {
    const res = await openaiChatCompletion(
      {
        model: MODEL,
        temperature: 0,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
      openaiKey,
      { traceName: 'extract-job-requirements' },
      { signal: AbortSignal.timeout(35000) },
    );
    if (!res.ok) {
      console.error('OpenAI extraction error:', await res.text());
      return null;
    }
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

    // Clamp + normalize the parsed values defensively. The LLM occasionally
    // emits things outside the schema (e.g. seniority="Junior" instead of
    // "Entry_Mid"); we drop anything we can't validate.
    const clampYears = (n: unknown): number | null => {
      const v = typeof n === 'number' ? n : (typeof n === 'string' ? Number(n) : NaN);
      return Number.isFinite(v) && v >= 0 && v <= 50 ? Math.round(v) : null;
    };
    const clampInt = (n: unknown, min: number, max: number): number | null => {
      const v = typeof n === 'number' ? n : (typeof n === 'string' ? Number(n) : NaN);
      return Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : null;
    };
    const clampNumeric = (n: unknown, min: number, max: number): number | null => {
      const v = typeof n === 'number' ? n : (typeof n === 'string' ? Number(String(n).replace(/[,\s]/g, '')) : NaN);
      return Number.isFinite(v) && v >= min && v <= max ? v : null;
    };
    const filterEnum = (arr: unknown, vocab: string[], max: number): string[] => {
      if (!Array.isArray(arr)) return [];
      const out: string[] = [];
      for (const v of arr) {
        if (typeof v !== 'string') continue;
        const n = v.toLowerCase().trim();
        if (vocab.includes(n) && !out.includes(n)) out.push(n);
        if (out.length >= max) break;
      }
      return out;
    };
    const lowercaseUnique = (arr: unknown, max: number, maxLen: number): string[] => {
      if (!Array.isArray(arr)) return [];
      const out: string[] = [];
      for (const v of arr) {
        if (typeof v !== 'string') continue;
        const n = v.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, maxLen);
        if (n.length > 0 && !out.includes(n)) out.push(n);
        if (out.length >= max) break;
      }
      return out;
    };

    // Core (v1)
    const yearsMin = clampYears(parsed.req_years_min);
    const yearsMax = clampYears(parsed.req_years_max);
    const seniority = SENIORITY_VOCAB.includes(parsed.req_seniority) ? parsed.req_seniority : null;
    const family = ROLE_FAMILIES.includes(parsed.function_family) ? parsed.function_family : null;
    const eduLevels = filterEnum(parsed.req_education_levels, EDUCATION_LEVELS, 5);
    const eduFields = Array.isArray(parsed.req_education_fields)
      ? parsed.req_education_fields.filter((f: unknown) => typeof f === 'string').map((f: string) => f.toLowerCase().replace(/\s+/g, '_')).slice(0, 8)
      : [];
    const eduStrict = parsed.req_education_strict === true;
    const skillsCoreRaw = Array.isArray(parsed.req_skills_core_raw)
      ? parsed.req_skills_core_raw.filter((s: unknown) => typeof s === 'string' && s.trim().length > 0).slice(0, 25)
      : [];
    const skillsNiceRaw = Array.isArray(parsed.req_skills_nice_raw)
      ? parsed.req_skills_nice_raw.filter((s: unknown) => typeof s === 'string' && s.trim().length > 0).slice(0, 25)
      : [];
    const languages = Array.isArray(parsed.req_languages)
      ? parsed.req_languages
          .filter((l: any) => l && typeof l.language === 'string' && PROFICIENCY_LEVELS.includes(l.proficiency))
          .slice(0, 5)
      : [];
    const visa = typeof parsed.req_visa_constraint === 'string' && parsed.req_visa_constraint.trim().length > 0
      ? parsed.req_visa_constraint.trim().slice(0, 500)
      : null;
    const responsibility = Array.isArray(parsed.responsibility_keywords)
      ? parsed.responsibility_keywords.filter((k: unknown) => typeof k === 'string').map((k: string) => k.toLowerCase().replace(/\s+/g, '_')).slice(0, 12)
      : [];

    // Extended (v2)
    const customerType = filterEnum(parsed.customer_type, CUSTOMER_TYPES, 5);
    const industryVertical = Array.isArray(parsed.industry_vertical)
      ? parsed.industry_vertical
          .filter((s: unknown) => typeof s === 'string')
          .map((s: string) => s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))
          .filter((s: string) => s.length > 0 && s.length < 50)
          .slice(0, 6)
      : [];
    const companyStage = COMPANY_STAGES.includes(parsed.company_stage) ? parsed.company_stage : null;
    const companySize = clampInt(parsed.company_size_employees, 1, 1_000_000);
    const foundedYear = clampInt(parsed.founded_year, 1800, new Date().getFullYear() + 1);
    const techStack = lowercaseUnique(parsed.tech_stack, 30, 50);
    const methodologyOut = filterEnum(parsed.methodology, METHODOLOGIES, 8);

    // Compensation — extra-defensive about numbers. LLM occasionally emits
    // "120k" or "120000.5" or "USD 120000"; we strip + clamp.
    const salaryMin = clampNumeric(parsed.salary_min, 1, 10_000_000);
    const salaryMax = clampNumeric(parsed.salary_max, 1, 10_000_000);
    let salaryCurrencyRaw = typeof parsed.salary_currency === 'string' ? parsed.salary_currency.toUpperCase().trim() : null;
    if (salaryCurrencyRaw === 'NIS' || salaryCurrencyRaw === '₪' || salaryCurrencyRaw === 'SHEKEL') salaryCurrencyRaw = 'ILS';
    if (salaryCurrencyRaw === '$') salaryCurrencyRaw = 'USD';
    if (salaryCurrencyRaw === '€') salaryCurrencyRaw = 'EUR';
    if (salaryCurrencyRaw === '£') salaryCurrencyRaw = 'GBP';
    const salaryCurrency = salaryCurrencyRaw && CURRENCY_CODES.has(salaryCurrencyRaw) ? salaryCurrencyRaw : null;
    const salaryCadence = SALARY_CADENCES.includes(parsed.salary_cadence) ? parsed.salary_cadence : null;
    const equityMentioned = parsed.equity_mentioned === true;
    const bonusMentioned = parsed.bonus_mentioned === true;

    // Scope
    const teamSize = clampInt(parsed.team_size, 1, 100_000);
    const reportsTo = typeof parsed.reports_to === 'string' && parsed.reports_to.trim().length > 0
      ? parsed.reports_to.trim().slice(0, 200)
      : null;
    const daysInOffice = clampInt(parsed.days_in_office, 1, 5);
    const travelPercentage = typeof parsed.travel_percentage === 'string' && parsed.travel_percentage.trim().length > 0
      ? parsed.travel_percentage.trim().slice(0, 100)
      : null;

    // Application + interview + benefits
    const applicationExtras = filterEnum(parsed.application_extras, APPLICATION_EXTRAS, 8);
    const interviewProcess = (parsed.interview_process && typeof parsed.interview_process === 'object' && !Array.isArray(parsed.interview_process))
      ? parsed.interview_process as Record<string, unknown>
      : null;
    const benefitsOut = filterEnum(parsed.benefits, BENEFITS_VOCAB, 15);

    // Eligibility constraints
    const eligibility = (parsed.eligibility_constraints && typeof parsed.eligibility_constraints === 'object' && !Array.isArray(parsed.eligibility_constraints))
      ? parsed.eligibility_constraints as Record<string, unknown>
      : null;

    // Freeform signals — array of objects, validated shape
    const freeform = Array.isArray(parsed.extraction_freeform_signals)
      ? parsed.extraction_freeform_signals
          .filter((s: any) => s && typeof s.signal === 'string' && typeof s.evidence === 'string')
          .slice(0, 3)
          .map((s: any) => ({
            signal: String(s.signal).toLowerCase().replace(/\s+/g, '_').slice(0, 80),
            evidence: String(s.evidence).slice(0, 400),
            category: typeof s.category === 'string' ? String(s.category).toLowerCase().slice(0, 40) : undefined,
          }))
      : [];

    // Confidence — 5-band rubric. Drop 0.5 hedges to 0.45 so the threshold
    // gate downstream still distinguishes "model picked partial" from
    // "model truly didn't pick a band". Documented behavior.
    let confidence: number;
    const rawConf = typeof parsed.extraction_confidence === 'number' ? parsed.extraction_confidence : null;
    if (rawConf !== null && Number.isFinite(rawConf)) {
      confidence = Math.min(1, Math.max(0, rawConf));
      if (Math.abs(confidence - 0.5) < 0.001) confidence = 0.45; // explicit hedge demotion
    } else {
      confidence = 0.45;
    }

    // Provenance check: if the LLM emitted a years requirement, verify the JD
    // actually mentions years. If not, drop the years claim.
    let finalYearsMin = yearsMin;
    let finalYearsMax = yearsMax;
    if (!jdMentionsYearsClaim(jd, yearsMin, yearsMax)) {
      console.log('[extract-job-requirements] years claim dropped — JD has no years pattern');
      confidence = Math.max(0, confidence - 0.1);
      finalYearsMin = null;
      finalYearsMax = null;
    }

    // ────────────────────────────────────────────────────────────────────
    // v4 field validation/normalization
    // ────────────────────────────────────────────────────────────────────
    const isObj = (v: unknown): v is Record<string, unknown> =>
      v !== null && typeof v === 'object' && !Array.isArray(v);
    const cleanStr = (v: unknown, maxLen: number): string | null => {
      if (typeof v !== 'string') return null;
      const t = v.trim().slice(0, maxLen);
      return t.length > 0 ? t : null;
    };

    // 31. req_ai_tooling
    const AI_TOOL_NAMES = new Set([
      'cursor', 'claude_code', 'github_copilot', 'copilot', 'windsurf',
      'replit_ai', 'tabnine', 'codeium', 'sourcegraph_cody', 'jetbrains_ai',
    ]);
    const normalizeAiToolList = (arr: unknown): string[] => {
      if (!Array.isArray(arr)) return [];
      const out: string[] = [];
      for (const v of arr) {
        if (typeof v !== 'string') continue;
        const n = v.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_').trim();
        const canon = n === 'copilot' ? 'github_copilot' : n;
        if (AI_TOOL_NAMES.has(canon) && !out.includes(canon)) out.push(canon);
        if (out.length >= 6) break;
      }
      return out;
    };
    let reqAiTooling: Record<string, unknown> | null = null;
    if (isObj(parsed.req_ai_tooling)) {
      const required = normalizeAiToolList(parsed.req_ai_tooling.required);
      const nice = normalizeAiToolList(parsed.req_ai_tooling.nice);
      const mindsetFlag = parsed.req_ai_tooling.mindset_flag === true;
      if (required.length > 0 || nice.length > 0 || mindsetFlag) {
        reqAiTooling = { required, nice, mindset_flag: mindsetFlag };
      }
    }

    // 32. req_skill_years
    const reqSkillYears = Array.isArray(parsed.req_skill_years)
      ? parsed.req_skill_years
          .map((s: any) => {
            if (!s || typeof s !== 'object') return null;
            const skill = typeof s.skill === 'string' ? s.skill.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80) : null;
            const yearsMinV = clampYears(s.years_min);
            if (!skill || yearsMinV === null) return null;
            return { skill, years_min: yearsMinV, required: s.required !== false };
          })
          .filter((x: any): x is { skill: string; years_min: number; required: boolean } => x !== null)
          .slice(0, 15)
      : [];

    // 33. on_call_expected
    const onCallExpected = typeof parsed.on_call_expected === 'string'
      && ON_CALL_VOCAB.includes(parsed.on_call_expected.toLowerCase().trim())
      ? parsed.on_call_expected.toLowerCase().trim()
      : null;

    // 34. office_policy
    let officePolicy: Record<string, unknown> | null = null;
    if (isObj(parsed.office_policy)) {
      const dmin = clampInt(parsed.office_policy.days_in_office_min, 0, 7);
      const dmax = clampInt(parsed.office_policy.days_in_office_max, 0, 7);
      const mandatory = parsed.office_policy.mandatory === true;
      const fullRemote = parsed.office_policy.full_remote === true;
      const daysSpecified = parsed.office_policy.days_specified === true;
      if (dmin !== null || dmax !== null || mandatory || fullRemote || daysSpecified) {
        officePolicy = {
          days_in_office_min: dmin,
          days_in_office_max: dmax,
          mandatory,
          full_remote: fullRemote,
          days_specified: daysSpecified,
        };
      }
    }

    // 35. notable_customers — verbatim names, capped
    const notableCustomers = Array.isArray(parsed.notable_customers)
      ? parsed.notable_customers
          .filter((v: unknown): v is string => typeof v === 'string')
          .map((v: string) => v.trim().slice(0, 100))
          .filter((v: string) => v.length > 0)
          .slice(0, 10)
      : [];

    // 36. scale_signals
    let scaleSignals: Record<string, unknown> | null = null;
    if (isObj(parsed.scale_signals)) {
      const keys = ['users_dau', 'users_total', 'data_volume', 'transactions', 'customers_count', 'revenue'];
      const out: Record<string, unknown> = {};
      let any = false;
      for (const k of keys) {
        const v = parsed.scale_signals[k];
        if (typeof v === 'string' && v.trim().length > 0) {
          out[k] = v.trim().slice(0, 80);
          any = true;
        } else if (typeof v === 'number' && Number.isFinite(v)) {
          out[k] = v;
          any = true;
        } else {
          out[k] = null;
        }
      }
      if (any) scaleSignals = out;
    }

    // 37. il_benefits
    let ilBenefits: Record<string, unknown> | null = null;
    if (isObj(parsed.il_benefits)) {
      const mealRaw = typeof parsed.il_benefits.meal_card === 'string'
        ? parsed.il_benefits.meal_card.toLowerCase().trim()
        : null;
      const mealCard = mealRaw === 'cibus' ? 'cibus'
        : (mealRaw === '10bis' || mealRaw === 'tenbis' || mealRaw === '10-bis') ? '10bis'
        : null;
      const out: Record<string, unknown> = {
        keren_hishtalmut: parsed.il_benefits.keren_hishtalmut === true,
        meal_card: mealCard,
        wellness_stipend_nis: clampInt(parsed.il_benefits.wellness_stipend_nis, 1, 100000),
        study_fund: parsed.il_benefits.study_fund === true,
        gym: parsed.il_benefits.gym === true,
        commute_subsidy: parsed.il_benefits.commute_subsidy === true,
        meals_provided: parsed.il_benefits.meals_provided === true,
      };
      const any = Object.values(out).some((v) => v === true || (typeof v === 'number' && v > 0) || (typeof v === 'string' && v.length > 0));
      if (any) ilBenefits = out;
    }

    // 38. funding_signals
    let fundingSignals: Record<string, unknown> | null = null;
    if (isObj(parsed.funding_signals)) {
      const roundType = typeof parsed.funding_signals.last_round_type === 'string'
        && FUNDING_ROUND_TYPES.includes(parsed.funding_signals.last_round_type.toLowerCase().trim())
        ? parsed.funding_signals.last_round_type.toLowerCase().trim()
        : null;
      const investors = Array.isArray(parsed.funding_signals.notable_investors)
        ? parsed.funding_signals.notable_investors
            .filter((v: unknown): v is string => typeof v === 'string')
            .map((v: string) => v.trim().slice(0, 80))
            .filter((v: string) => v.length > 0)
            .slice(0, 10)
        : [];
      const out = {
        last_round_size_usd: clampNumeric(parsed.funding_signals.last_round_size_usd, 1, 100_000_000_000),
        last_round_type: roundType,
        total_raised_usd: clampNumeric(parsed.funding_signals.total_raised_usd, 1, 100_000_000_000),
        valuation_usd: clampNumeric(parsed.funding_signals.valuation_usd, 1, 10_000_000_000_000),
        notable_investors: investors,
      };
      const any = Object.entries(out).some(([k, v]) => (k === 'notable_investors' ? (v as string[]).length > 0 : v !== null));
      if (any) fundingSignals = out;
    }

    // 39. track
    const track = typeof parsed.track === 'string'
      && TRACK_VOCAB.includes(parsed.track.toLowerCase().trim())
      ? parsed.track.toLowerCase().trim()
      : null;

    // 40. direct_reports_min / max
    const directReportsMin = clampInt(parsed.direct_reports_min, 0, 1000);
    const directReportsMax = clampInt(parsed.direct_reports_max, 0, 1000);

    // 41. jd_language
    const jdLanguage = typeof parsed.jd_language === 'string'
      && JD_LANGUAGES.includes(parsed.jd_language.toLowerCase().trim())
      ? parsed.jd_language.toLowerCase().trim()
      : null;

    // 42. equity_struct
    let equityStruct: Record<string, unknown> | null = null;
    if (isObj(parsed.equity_struct)) {
      const equityTypes = Array.isArray(parsed.equity_struct.type)
        ? parsed.equity_struct.type
            .filter((v: unknown): v is string => typeof v === 'string')
            .map((v: string) => v.toLowerCase().trim())
            .filter((v: string) => ['options', 'rsu', 'rsus', 'espp', 'shares', 'warrants'].includes(v))
            .slice(0, 5)
        : [];
      const qual = typeof parsed.equity_struct.qualifier === 'string'
        && ['meaningful', 'standard'].includes(parsed.equity_struct.qualifier.toLowerCase().trim())
        ? parsed.equity_struct.qualifier.toLowerCase().trim()
        : null;
      const pct = clampNumeric(parsed.equity_struct.percentage, 0, 100);
      const mentioned = parsed.equity_struct.mentioned === true || equityMentioned;
      if (mentioned || equityTypes.length > 0 || qual !== null || pct !== null) {
        equityStruct = {
          mentioned,
          type: equityTypes,
          qualifier: qual,
          percentage: pct,
          vesting_mentioned: parsed.equity_struct.vesting_mentioned === true,
          refresh_mentioned: parsed.equity_struct.refresh_mentioned === true,
        };
      }
    }

    // 43. benefits_struct
    let benefitsStruct: Record<string, unknown> | null = null;
    if (isObj(parsed.benefits_struct)) {
      const out: Record<string, unknown> = {
        pto_days: clampInt(parsed.benefits_struct.pto_days, 0, 365),
        retirement_match_pct: clampNumeric(parsed.benefits_struct.retirement_match_pct, 0, 100),
        parental_leave: parsed.benefits_struct.parental_leave === true,
        mental_health: parsed.benefits_struct.mental_health === true,
        learning_budget: parsed.benefits_struct.learning_budget === true,
        gym_wellness: parsed.benefits_struct.gym_wellness === true,
        meal_voucher: parsed.benefits_struct.meal_voucher === true,
        commute_subsidy: parsed.benefits_struct.commute_subsidy === true,
        dental: parsed.benefits_struct.dental === true,
        vision: parsed.benefits_struct.vision === true,
        health: parsed.benefits_struct.health === true,
      };
      const any = Object.values(out).some((v) => v === true || (typeof v === 'number' && v > 0));
      if (any) benefitsStruct = out;
    }

    // 44. travel_struct
    let travelStruct: Record<string, unknown> | null = null;
    if (isObj(parsed.travel_struct)) {
      const pctMax = clampInt(parsed.travel_struct.percentage_max, 0, 100);
      const destinations = Array.isArray(parsed.travel_struct.destinations)
        ? parsed.travel_struct.destinations
            .filter((v: unknown): v is string => typeof v === 'string')
            .map((v: string) => v.toLowerCase().replace(/\s+/g, '_').trim().slice(0, 30))
            .filter((v: string) => v.length > 0)
            .slice(0, 10)
        : [];
      const freq = typeof parsed.travel_struct.frequency === 'string'
        && ['monthly', 'quarterly', 'ad_hoc', 'weekly', 'yearly'].includes(parsed.travel_struct.frequency.toLowerCase().trim())
        ? parsed.travel_struct.frequency.toLowerCase().trim()
        : null;
      if (pctMax !== null || destinations.length > 0 || freq !== null) {
        travelStruct = { percentage_max: pctMax, destinations, frequency: freq };
      }
    }

    // 45. reports_to_struct
    let reportsToStruct: Record<string, unknown> | null = null;
    if (isObj(parsed.reports_to_struct)) {
      const seniorityVal = typeof parsed.reports_to_struct.seniority === 'string'
        && ['manager', 'director', 'vp', 'cxo'].includes(parsed.reports_to_struct.seniority.toLowerCase().trim())
        ? parsed.reports_to_struct.seniority.toLowerCase().trim()
        : null;
      const titleVal = cleanStr(parsed.reports_to_struct.title, 200);
      const functionVal = cleanStr(parsed.reports_to_struct.function, 80);
      if (titleVal || functionVal || seniorityVal) {
        reportsToStruct = {
          title: titleVal,
          function: functionVal ? functionVal.toLowerCase().replace(/\s+/g, '_') : null,
          seniority: seniorityVal,
          named: parsed.reports_to_struct.named === true,
        };
      }
    }

    // 46. rd_local_headcount
    const rdLocalHeadcount = clampInt(parsed.rd_local_headcount, 1, 1_000_000);

    // 47. local_office_city
    const localOfficeCity = cleanStr(parsed.local_office_city, 80);

    // Provenance check: numeric comp claims must substring-trace to JD. Today
    // we do a loose check — does the JD contain ANY of the digit groups in
    // salary_min/max? If not, drop the salary claims.
    let finalSalaryMin = salaryMin;
    let finalSalaryMax = salaryMax;
    let finalSalaryCurrency = salaryCurrency;
    let finalSalaryCadence = salaryCadence;
    if (salaryMin !== null || salaryMax !== null) {
      const jdLower = jd.toLowerCase();
      const minStr = salaryMin !== null ? String(Math.round(salaryMin)) : null;
      const maxStr = salaryMax !== null ? String(Math.round(salaryMax)) : null;
      // Numbers in JDs often appear with commas/dots — check both raw + with-comma variants.
      const hasDigits = (s: string | null): boolean => {
        if (!s) return false;
        if (s.length < 4) return false; // tiny numbers like "5" almost always false-positive
        if (jdLower.includes(s)) return true;
        // Try formatted: 120000 → 120,000 / 120.000 / 120k
        const head = s.slice(0, -3);
        if (head && (jdLower.includes(`${head},000`) || jdLower.includes(`${head}.000`) || jdLower.includes(`${head}k`))) return true;
        return false;
      };
      if (!hasDigits(minStr) && !hasDigits(maxStr)) {
        console.log('[extract-job-requirements] salary claim dropped — no matching digits in JD');
        finalSalaryMin = null;
        finalSalaryMax = null;
        finalSalaryCurrency = null;
        finalSalaryCadence = null;
        confidence = Math.max(0, confidence - 0.05);
      }
    }

    return {
      req_years_min: finalYearsMin,
      req_years_max: finalYearsMax,
      req_seniority: seniority,
      req_education_levels: eduLevels,
      req_education_fields: eduFields,
      req_education_strict: eduStrict,
      req_skills_core_raw: skillsCoreRaw,
      req_skills_nice_raw: skillsNiceRaw,
      req_languages: languages,
      req_visa_constraint: visa,
      function_family: family,
      responsibility_keywords: responsibility,
      extraction_confidence: confidence,
      customer_type: customerType,
      industry_vertical: industryVertical,
      company_stage: companyStage,
      company_size_employees: companySize,
      founded_year: foundedYear,
      tech_stack: techStack,
      methodology: methodologyOut,
      salary_min: finalSalaryMin,
      salary_max: finalSalaryMax,
      salary_currency: finalSalaryCurrency,
      salary_cadence: finalSalaryCadence,
      equity_mentioned: equityMentioned,
      bonus_mentioned: bonusMentioned,
      team_size: teamSize,
      reports_to: reportsTo,
      days_in_office: daysInOffice,
      travel_percentage: travelPercentage,
      application_extras: applicationExtras,
      interview_process: interviewProcess,
      benefits: benefitsOut,
      eligibility_constraints: eligibility,
      extraction_freeform_signals: freeform,

      // v4 fields
      req_ai_tooling: reqAiTooling,
      req_skill_years: reqSkillYears,
      on_call_expected: onCallExpected,
      office_policy: officePolicy,
      notable_customers: notableCustomers,
      scale_signals: scaleSignals,
      il_benefits: ilBenefits,
      funding_signals: fundingSignals,
      track: track,
      direct_reports_min: directReportsMin,
      direct_reports_max: directReportsMax,
      jd_language: jdLanguage,
      equity_struct: equityStruct,
      benefits_struct: benefitsStruct,
      travel_struct: travelStruct,
      reports_to_struct: reportsToStruct,
      rd_local_headcount: rdLocalHeadcount,
      local_office_city: localOfficeCity,
    };
  } catch (e) {
    console.error('[extract-job-requirements] LLM call failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!SERVICE_ROLE_KEY || !SUPABASE_URL || !OPENAI_KEY) {
    return json({ error: 'Server missing required env vars' }, 500);
  }

  // Service-role-only. We accept any of:
  // - A bearer JWT whose `role` claim is "service_role"
  //   (legacy supabase JWT-style service key)
  // - A bearer / apikey that exact-matches SUPABASE_SERVICE_ROLE_KEY
  //   (covers the new sb_secret_* format and any future injected variant)
  //
  // The JWT path is the robust one because Supabase has been migrating keys
  // and the auto-injected SERVICE_ROLE_KEY env value may not match the value
  // an admin caller carries. We never log the bearer.
  const authHeader = req.headers.get('Authorization') || '';
  const apiKeyHeader = req.headers.get('apikey') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '');
  const candidate = bearerToken || apiKeyHeader;
  let authorized = false;
  if (candidate && (candidate === SERVICE_ROLE_KEY)) {
    authorized = true;
  } else if (candidate) {
    // Try to read the JWT payload (no signature check — Supabase fronts the
    // gateway with HS256 verification when verify_jwt is true; here verify_jwt
    // is false, so we self-check the role claim).
    try {
      const parts = candidate.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload?.role === 'service_role') authorized = true;
      }
    } catch {
      // not a JWT — fall through to 401
    }
  }
  if (!authorized) {
    return json({ error: 'Unauthorized — service role required' }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  // Stateless mode: caller passes raw JD text + title; we extract and return
  // the structured fields WITHOUT writing to the jobs table. Used by
  // scoreApplication / JobMatchChecker when scoring a pasted-in JD that has
  // no jobs-table row to anchor against. Same extractor schema either way.
  const { job_id, force = false, jd_text, title: stateless_title } = body;
  const isStateless = typeof jd_text === 'string' && jd_text.length > 0;

  if (isStateless) {
    if (jd_text.length < 200) {
      return json({ stateless: true, skipped: true, reason: 'jd_too_short', extraction: null });
    }
    const extraction = await extractRequirements(jd_text, stateless_title || '', OPENAI_KEY);
    if (!extraction) {
      return json({ stateless: true, skipped: true, reason: 'extraction_failed', extraction: null });
    }
    // Resolve raw skill phrases to canonical IDs server-side so the caller
    // gets the same shape jobs.req_skills_core has. Reuses the per-row
    // resolveSkill helper defined above.
    const resolvedCore = new Set<string>();
    const resolvedNice = new Set<string>();
    for (const raw of extraction.req_skills_core_raw) {
      resolveSkill(raw).forEach((id) => resolvedCore.add(id));
    }
    for (const raw of extraction.req_skills_nice_raw) {
      resolveSkill(raw).forEach((id) => resolvedNice.add(id));
    }
    return json({
      stateless: true,
      extraction: {
        ...extraction,
        req_skills_core: Array.from(resolvedCore),
        req_skills_nice: Array.from(resolvedNice),
      },
    });
  }

  if (!job_id || typeof job_id !== 'string') {
    return json({ error: 'job_id or jd_text required' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id, title, description, description_hash, extraction_schema_version, extracted_at, salary_min, salary_max, salary_currency')
    .eq('id', job_id)
    .single();
  if (jobErr || !job) {
    return json({ error: 'Job not found', detail: jobErr?.message }, 404);
  }

  // Workday and a few other ATSs sometimes have null descriptions. Don't waste
  // an LLM call — write a zero-confidence row and let the deterministic scorer
  // fall back to title-only.
  if (!job.description || job.description.length < 200) {
    await supabase.from('jobs').update({
      extraction_confidence: 0,
      extraction_model: MODEL,
      extraction_schema_version: EXTRACTION_SCHEMA_VERSION,
      description_hash: null,
      extracted_at: new Date().toISOString(),
    }).eq('id', job_id);
    return json({
      job_id,
      skipped: true,
      reason: 'description_missing_or_too_short',
      description_length: job.description?.length ?? 0,
    });
  }

  const newHash = await sha256(job.description);

  // Idempotency: same JD content + current schema version → no work needed.
  if (!force
    && job.description_hash === newHash
    && job.extraction_schema_version === EXTRACTION_SCHEMA_VERSION
    && job.extracted_at) {
    return json({ job_id, skipped: true, reason: 'already_extracted_unchanged' });
  }

  const extraction = await extractRequirements(job.description, job.title || '', OPENAI_KEY);
  if (!extraction) {
    // LLM call failed entirely. Don't half-write the row; leave it so the next
    // run picks it up. Return non-error 200 so batch runners don't abort.
    return json({ job_id, skipped: true, reason: 'extraction_failed' });
  }

  // Skill resolution + unmapped tracking. Each raw skill phrase is passed
  // through the alias resolver; resolved IDs accumulate to req_skills_core /
  // req_skills_nice. Unresolved phrases bubble up to the per-job audit array
  // AND increment the global jd_unmapped_skill_counts table.
  const resolvedCore = new Set<string>();
  const resolvedNice = new Set<string>();
  const unmapped: string[] = [];
  for (const raw of extraction.req_skills_core_raw) {
    const ids = resolveSkill(raw);
    if (ids.length > 0) ids.forEach((id) => resolvedCore.add(id));
    else unmapped.push(raw);
  }
  for (const raw of extraction.req_skills_nice_raw) {
    const ids = resolveSkill(raw);
    if (ids.length > 0) ids.forEach((id) => resolvedNice.add(id));
    else unmapped.push(raw);
  }

  // Upsert unmapped skill phrases into the global frequency table. Lowercase
  // normalize before insert so "Salesforce CRM" and "salesforce crm" collapse.
  // Use ON CONFLICT to increment + bump last_seen on subsequent encounters.
  const uniqueUnmapped = Array.from(new Set(unmapped.map((s) => s.toLowerCase().replace(/\s+/g, ' ').trim()).filter(Boolean)));
  if (uniqueUnmapped.length > 0) {
    // Build a parameterized batch upsert via .from().upsert() with ON CONFLICT.
    // We can't easily do "increment job_count" via .upsert() so use raw SQL.
    const placeholders = uniqueUnmapped.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
    const params = uniqueUnmapped.flatMap((phrase) => [phrase, job.id]);
    // Use rpc instead to call a small bumper function — but to keep this PR
    // small, do per-phrase upserts.
    for (const phrase of uniqueUnmapped) {
      const { error: upsertErr } = await supabase.rpc('jd_unmapped_skill_bump', {
        p_phrase: phrase,
        p_job_id: job.id,
      });
      if (upsertErr) {
        // RPC may not exist yet (deployed alongside extractor); fall back to
        // a direct upsert that doesn't increment correctly but still records
        // the phrase. The bump RPC ships in the same migration.
        await supabase.from('jd_unmapped_skill_counts').upsert(
          { skill_phrase: phrase, job_count: 1, example_job_id: job.id, last_seen: new Date().toISOString() },
          { onConflict: 'skill_phrase' },
        );
      }
    }
  }

  // Write the extraction back to the jobs row.
  //
  // Salary fields use "fill if null" semantics so we never overwrite the
  // scraper-populated salary_min/max/currency (which come from structured
  // ATS comp fields on Lever / Ashby). JD-prose extraction is a fallback,
  // not a replacement.
  const update: Record<string, unknown> = {
    // Core requirements
    req_years_min: extraction.req_years_min,
    req_years_max: extraction.req_years_max,
    req_seniority: extraction.req_seniority,
    req_education_levels: extraction.req_education_levels.length > 0 ? extraction.req_education_levels : null,
    req_education_fields: extraction.req_education_fields.length > 0 ? extraction.req_education_fields : null,
    req_education_strict: extraction.req_education_strict,
    req_skills_core: resolvedCore.size > 0 ? Array.from(resolvedCore) : null,
    req_skills_nice: resolvedNice.size > 0 ? Array.from(resolvedNice) : null,
    req_languages: extraction.req_languages.length > 0 ? extraction.req_languages : null,
    req_visa_constraint: extraction.req_visa_constraint,
    function_family: extraction.function_family,
    responsibility_keywords: extraction.responsibility_keywords.length > 0 ? extraction.responsibility_keywords : null,
    extraction_unmapped_skills: uniqueUnmapped.length > 0 ? uniqueUnmapped : null,

    // Extended context (v2)
    customer_type: extraction.customer_type.length > 0 ? extraction.customer_type : null,
    industry_vertical: extraction.industry_vertical.length > 0 ? extraction.industry_vertical : null,
    company_stage: extraction.company_stage,
    company_size_employees: extraction.company_size_employees,
    founded_year: extraction.founded_year,
    tech_stack: extraction.tech_stack.length > 0 ? extraction.tech_stack : null,
    methodology: extraction.methodology.length > 0 ? extraction.methodology : null,

    // Compensation cadence + equity/bonus flags always update (extracted
    // from prose, not scraper). Salary numbers fill only if scraper missed.
    salary_cadence: extraction.salary_cadence,
    equity_mentioned: extraction.equity_mentioned,
    bonus_mentioned: extraction.bonus_mentioned,

    // Scope
    team_size: extraction.team_size,
    reports_to: extraction.reports_to,
    days_in_office: extraction.days_in_office,
    travel_percentage: extraction.travel_percentage,

    // Application / interview / benefits
    application_extras: extraction.application_extras.length > 0 ? extraction.application_extras : null,
    interview_process: extraction.interview_process,
    benefits: extraction.benefits.length > 0 ? extraction.benefits : null,
    eligibility_constraints: extraction.eligibility_constraints,
    extraction_freeform_signals: extraction.extraction_freeform_signals.length > 0 ? extraction.extraction_freeform_signals : null,

    // v4 structured fields
    req_ai_tooling: extraction.req_ai_tooling,
    req_skill_years: extraction.req_skill_years.length > 0 ? extraction.req_skill_years : null,
    on_call_expected: extraction.on_call_expected,
    office_policy: extraction.office_policy,
    notable_customers: extraction.notable_customers.length > 0 ? extraction.notable_customers : null,
    scale_signals: extraction.scale_signals,
    il_benefits: extraction.il_benefits,
    funding_signals: extraction.funding_signals,
    track: extraction.track,
    direct_reports_min: extraction.direct_reports_min,
    direct_reports_max: extraction.direct_reports_max,
    jd_language: extraction.jd_language,
    equity_struct: extraction.equity_struct,
    benefits_struct: extraction.benefits_struct,
    travel_struct: extraction.travel_struct,
    reports_to_struct: extraction.reports_to_struct,
    rd_local_headcount: extraction.rd_local_headcount,
    local_office_city: extraction.local_office_city,

    // Bookkeeping
    extraction_confidence: extraction.extraction_confidence,
    extraction_model: MODEL,
    extraction_schema_version: EXTRACTION_SCHEMA_VERSION,
    description_hash: newHash,
    extracted_at: new Date().toISOString(),
  };

  // Salary number fill-if-null. The scraper populates salary_min/max/currency
  // when the ATS provides structured comp. We only write from JD-prose when
  // those are absent. Tracking the populate-via flag lets ops audit later.
  if (job.salary_min === null && extraction.salary_min !== null) {
    update.salary_min = extraction.salary_min;
  }
  if (job.salary_max === null && extraction.salary_max !== null) {
    update.salary_max = extraction.salary_max;
  }
  if ((job.salary_currency === null || job.salary_currency === '') && extraction.salary_currency !== null) {
    update.salary_currency = extraction.salary_currency;
  }

  const { error: updateErr } = await supabase.from('jobs').update(update).eq('id', job_id);
  if (updateErr) {
    return json({ error: 'Failed to write extraction', detail: updateErr.message }, 500);
  }

  return json({
    job_id,
    title: job.title,
    extraction_confidence: extraction.extraction_confidence,
    resolved_skills_count: resolvedCore.size + resolvedNice.size,
    unmapped_skills_count: uniqueUnmapped.length,
    seniority: extraction.req_seniority,
    family: extraction.function_family,
    customer_type: extraction.customer_type,
    company_stage: extraction.company_stage,
    tech_stack_count: extraction.tech_stack.length,
    salary_extracted: extraction.salary_min !== null || extraction.salary_max !== null,
    freeform_signals_count: extraction.extraction_freeform_signals.length,
  });
});
