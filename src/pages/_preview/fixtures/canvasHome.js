// Fixture data for the /_preview/home-3tab design canvas (CANVAS_FIXTURES mode).
//
// This is MOCK data — realistic Israeli-tech business-student shapes — so the
// canvas renders a full, dense design with zero live queries and zero prod
// mutation. Nothing here touches Supabase. The preview shell + tab clones read
// these arrays and mutate LOCAL React state only (kanban drags, Track, coach).
//
// Shapes mirror the real ones just enough for the presentational components:
//   applications → id, status, company, role_title, location, qualification_score
//                  (0–1 fraction, same as scoreJobFit.fit_score), date_applied,
//                  plus a little detail for the read-only drawer.
//   matches      → { job, scoreResult } where job/scoreResult match the fields
//                  deriveJobDisplay()/JobGridCard/JobDetailModal read.

// ───── Tracker: 12 applications across all 7 kanban columns ─────

export const CANVAS_APPLICATIONS = [
  // interested (2)
  {
    id: "cx-app-01",
    status: "interested",
    company: "Wiz",
    role_title: "Business Operations Analyst",
    location: "Tel Aviv",
    qualification_score: 0.82,
    date_applied: null,
    source: "Browse Jobs",
    note: "Referral contact: Maya (bootcamp cohort).",
  },
  {
    id: "cx-app-02",
    status: "interested",
    company: "Monday.com",
    role_title: "Revenue Operations Associate",
    location: "Tel Aviv",
    qualification_score: 0.74,
    date_applied: null,
    source: "LinkedIn",
    note: "",
  },
  // preparing (2)
  {
    id: "cx-app-03",
    status: "preparing",
    company: "Fiverr",
    role_title: "Junior Product Manager",
    location: "Tel Aviv",
    qualification_score: 0.68,
    date_applied: null,
    source: "Browse Jobs",
    note: "Tailoring CV to the growth-PM JD. Need one more metric bullet.",
  },
  {
    id: "cx-app-04",
    status: "preparing",
    company: "Melio",
    role_title: "GTM Strategy Analyst",
    location: "Tel Aviv / Hybrid",
    qualification_score: 0.71,
    date_applied: null,
    source: "Browse Jobs",
    note: "",
  },
  // applied (3)
  {
    id: "cx-app-05",
    status: "applied",
    company: "Riskified",
    role_title: "Financial Analyst, FP&A",
    location: "Tel Aviv",
    qualification_score: 0.79,
    date_applied: "Jul 2026",
    source: "Browse Jobs",
    note: "",
  },
  {
    id: "cx-app-06",
    status: "applied",
    company: "Taboola",
    role_title: "Sales Operations Coordinator",
    location: "Tel Aviv",
    qualification_score: 0.66,
    date_applied: "Jun 2026",
    source: "LinkedIn",
    note: "",
  },
  {
    id: "cx-app-07",
    status: "applied",
    company: "Gong",
    role_title: "Strategy & Operations Associate",
    location: "Ramat Gan",
    qualification_score: 0.77,
    date_applied: "Jun 2026",
    source: "Browse Jobs",
    note: "Waiting on recruiter reply.",
  },
  // interviewing (2)
  {
    id: "cx-app-08",
    status: "interviewing",
    company: "Lemonade",
    role_title: "Business Analyst, Growth",
    location: "Tel Aviv",
    qualification_score: 0.84,
    date_applied: "Jun 2026",
    source: "Referral",
    note: "Round 2 (case study) on Jul 2026. Prep STAR answers.",
  },
  {
    id: "cx-app-09",
    status: "interviewing",
    company: "Payoneer",
    role_title: "Associate Product Manager",
    location: "Petah Tikva",
    qualification_score: 0.72,
    date_applied: "Jun 2026",
    source: "Browse Jobs",
    note: "Phone screen done — liked the team.",
  },
  // offer (1)
  {
    id: "cx-app-10",
    status: "offer",
    company: "Similarweb",
    role_title: "Junior Data Analyst",
    location: "Tel Aviv",
    qualification_score: 0.81,
    date_applied: "Jun 2026",
    source: "Browse Jobs",
    note: "Verbal offer — comparing with Lemonade process.",
  },
  // accepted (1)
  {
    id: "cx-app-11",
    status: "accepted",
    company: "Deel",
    role_title: "Revenue Operations Analyst",
    location: "Remote (IL)",
    qualification_score: 0.88,
    date_applied: "May 2026",
    source: "Referral",
    note: "Signed! Starts Aug 2026.",
  },
  // rejected (1)
  {
    id: "cx-app-12",
    status: "rejected",
    company: "Snyk",
    role_title: "Product Operations Analyst",
    location: "Tel Aviv",
    qualification_score: 0.61,
    date_applied: "Jun 2026",
    source: "LinkedIn",
    note: "Rejected after screen — role wanted 2+ yrs.",
  },
];

// ───── CV tab: dense master CV ─────

export const CANVAS_PROFILE = {
  full_name: "Noa Ben-David",
  headline: "Business & Data — aspiring Product / Revenue Operations",
  location: "Tel Aviv, Israel",
  email: "noa.bendavid@example.com",
  phone: "+972 54-000-0000",
  linkedin: "linkedin.com/in/noabendavid",
  summary:
    "Final-year BA in Business Administration (Information Systems track) with hands-on analytics and go-to-market experience across two internships. Fluent in SQL, Excel modeling, and dashboarding; comfortable turning messy operational data into decisions. Looking for a first full-time role in Business/Revenue Operations, Product, or Analytics at an Israeli tech company.",
  work_type: ["hybrid", "onsite"],
};

export const CANVAS_EXPERIENCES = [
  {
    id: "cx-exp-1",
    title: "Business Operations Intern",
    company: "Armis Security",
    location: "Tel Aviv",
    start: "Jul 2025",
    end: "Present",
    bullets: [
      "Built a SQL + Looker dashboard tracking pipeline conversion across 4 sales regions, surfacing a 12% drop-off at the POC stage that reshaped the QBR agenda.",
      "Automated a weekly commissions reconciliation in Google Sheets + Apps Script, cutting a 3-hour manual task to 15 minutes.",
      "Partnered with RevOps to clean 6,000+ CRM account records, improving territory-routing accuracy ahead of the FY planning cycle.",
    ],
  },
  {
    id: "cx-exp-2",
    title: "Growth Analyst Intern",
    company: "Bringg",
    location: "Tel Aviv",
    start: "Jul 2024",
    end: "Feb 2025",
    bullets: [
      "Ran A/B tests on onboarding email flows; the winning variant lifted activation-to-first-value by 9%.",
      "Modeled CAC/LTV by acquisition channel in Excel, informing a reallocation of ~15% of paid budget to higher-ROI channels.",
      "Produced the monthly growth readout for the leadership team (funnel, cohort retention, channel mix).",
    ],
  },
  {
    id: "cx-exp-3",
    title: "Treasurer & Events Lead",
    company: "TAU Business Society (student org)",
    location: "Tel Aviv",
    start: "Oct 2023",
    end: "Jun 2024",
    bullets: [
      "Managed a ₪40k annual budget and ran a 250-attendee tech-careers night with 8 company sponsors.",
      "Negotiated sponsorship packages that grew event revenue 30% year over year.",
    ],
  },
];

export const CANVAS_EDUCATION = [
  {
    id: "cx-edu-1",
    school: "Tel Aviv University",
    degree: "B.A. Business Administration — Information Systems track",
    detail:
      "GPA 3.8 / 4.0 · Dean's List 2024. Coursework: Data Analytics, Financial Modeling, Operations Management, Marketing Analytics.",
    start: "2022",
    end: "2026 (expected)",
  },
  {
    id: "cx-edu-2",
    school: "ITC / Coursera",
    degree: "Google Data Analytics Professional Certificate",
    detail: "SQL, R, Tableau, data cleaning & visualization.",
    start: "2024",
    end: "2024",
  },
];

export const CANVAS_SKILLS = [
  "SQL",
  "Excel / Financial Modeling",
  "Looker / Tableau",
  "Salesforce CRM",
  "A/B Testing",
  "Cohort Analysis",
  "Python (pandas)",
  "Google Apps Script",
  "Stakeholder Communication",
  "Hebrew (native)",
  "English (fluent)",
];

// ───── Matches (CV-tab top matches + Browse Jobs feed) ─────
// { job, scoreResult } pairs with VARIED bands: strong/good → "picks",
// stretch/reach → "worth a stretch".

function mkJob(o) {
  return {
    id: o.id,
    ats_source: "canvas",
    external_id: o.id,
    title: o.title,
    company_name: o.company,
    company_slug: null,
    location_city: o.city,
    location_raw: o.city,
    is_remote: !!o.remote,
    is_agency: !!o.agency,
    seniority: o.seniority || "entry",
    years_experience_min: o.yrsMin ?? 0,
    years_experience_max: o.yrsMax ?? 2,
    date_posted: o.posted,
    apply_url: "#",
    industry: o.industry || null,
    function_family: o.family || "operations",
    description: o.description || "",
    req_skills_core: o.core || [],
    req_skills_nice: o.nice || [],
  };
}

function mkScore({
  fit,
  band,
  attain,
  relevance = "primary",
  matched = [],
  missing = [],
  strengths = [],
}) {
  return {
    fit_score: fit,
    attainability_band: band,
    attainability_score: attain,
    relevance_match: relevance,
    signals: { matched_skills: matched, missing_core_skills: missing },
    reasoning: { strengths },
  };
}

export const CANVAS_MATCHES = [
  {
    job: mkJob({
      id: "cx-job-1",
      title: "Revenue Operations Analyst",
      company: "HiBob",
      city: "Tel Aviv",
      posted: "2026-07-11",
      industry: "HR Tech",
      yrsMin: 0,
      yrsMax: 2,
      description:
        "Own RevOps reporting, keep the CRM clean, and build dashboards that GTM leadership trusts. Strong SQL + Excel; comfortable with Salesforce.",
    }),
    scoreResult: mkScore({
      fit: 0.9,
      band: "strong",
      attain: 0.88,
      matched: ["sql", "salesforce_crm", "excel_modeling", "dashboarding"],
      missing: [],
      strengths: [
        "Two RevOps-adjacent internships",
        "SQL + Looker already in your toolkit",
        "CRM hygiene experience at Armis",
      ],
    }),
  },
  {
    job: mkJob({
      id: "cx-job-2",
      title: "Business Analyst, Growth",
      company: "Lemonade",
      city: "Tel Aviv",
      posted: "2026-07-10",
      industry: "Insurtech",
      yrsMin: 0,
      yrsMax: 2,
      description:
        "Partner with growth + product to size opportunities, run analyses, and ship weekly readouts. A/B testing literacy a plus.",
    }),
    scoreResult: mkScore({
      fit: 0.85,
      band: "strong",
      attain: 0.8,
      matched: ["ab_testing", "cohort_analysis", "sql"],
      missing: ["python_pandas"],
      strengths: [
        "Ran A/B tests at Bringg",
        "Built the monthly growth readout",
      ],
    }),
  },
  {
    job: mkJob({
      id: "cx-job-3",
      title: "Junior Data Analyst",
      company: "Similarweb",
      city: "Tel Aviv",
      posted: "2026-07-09",
      industry: "Data / Analytics",
      yrsMin: 0,
      yrsMax: 1,
      description:
        "Turn product + market data into clear stories for internal stakeholders. SQL required; Python nice to have.",
    }),
    scoreResult: mkScore({
      fit: 0.78,
      band: "strong",
      attain: 0.76,
      matched: ["sql", "tableau"],
      missing: ["python_pandas"],
      strengths: ["Google Data Analytics cert", "Dashboarding at Armis"],
    }),
  },
  {
    job: mkJob({
      id: "cx-job-4",
      title: "Sales Operations Coordinator",
      company: "Gong",
      city: "Ramat Gan",
      posted: "2026-07-08",
      industry: "Revenue Intelligence",
      yrsMin: 0,
      yrsMax: 2,
      description:
        "Keep the sales engine running: CRM ops, territory routing, quota tracking, and enablement logistics.",
    }),
    scoreResult: mkScore({
      fit: 0.72,
      band: "good",
      attain: 0.7,
      matched: ["salesforce_crm", "excel_modeling"],
      missing: ["forecasting"],
      strengths: [
        "CRM cleanup + territory routing at Armis",
        "Commissions reconciliation automation",
      ],
    }),
  },
  {
    job: mkJob({
      id: "cx-job-5",
      title: "GTM Strategy Analyst",
      company: "Melio",
      city: "Tel Aviv",
      remote: true,
      posted: "2026-07-07",
      industry: "Fintech",
      yrsMin: 1,
      yrsMax: 3,
      description:
        "Support go-to-market planning with market sizing, segmentation, and performance analysis.",
    }),
    scoreResult: mkScore({
      fit: 0.68,
      band: "good",
      attain: 0.66,
      relevance: "adjacent",
      matched: ["excel_modeling", "cohort_analysis"],
      missing: ["market_sizing"],
      strengths: ["CAC/LTV modeling at Bringg", "Channel-mix analysis"],
    }),
  },
  {
    job: mkJob({
      id: "cx-job-6",
      title: "Associate Product Manager",
      company: "Payoneer",
      city: "Petah Tikva",
      posted: "2026-07-06",
      industry: "Fintech",
      yrsMin: 1,
      yrsMax: 3,
      description:
        "Own a slice of the product roadmap; write specs, work with design + eng, and measure impact.",
    }),
    scoreResult: mkScore({
      fit: 0.62,
      band: "stretch",
      attain: 0.55,
      relevance: "adjacent",
      matched: ["ab_testing", "stakeholder_communication"],
      missing: ["product_spec_writing", "roadmapping"],
      strengths: [
        "Growth-analytics background",
        "Comfortable with product metrics",
      ],
    }),
  },
  {
    job: mkJob({
      id: "cx-job-7",
      title: "Junior Product Manager",
      company: "Fiverr",
      city: "Tel Aviv",
      posted: "2026-07-05",
      industry: "Marketplace",
      yrsMin: 1,
      yrsMax: 3,
      description:
        "Drive growth experiments across the funnel; partner with data + design to ship and learn.",
    }),
    scoreResult: mkScore({
      fit: 0.6,
      band: "stretch",
      attain: 0.52,
      relevance: "adjacent",
      matched: ["ab_testing"],
      missing: ["product_spec_writing"],
      strengths: ["A/B testing experience", "Funnel analysis"],
    }),
  },
  {
    job: mkJob({
      id: "cx-job-8",
      title: "Financial Analyst, FP&A",
      company: "Riskified",
      city: "Tel Aviv",
      posted: "2026-07-04",
      industry: "Fintech",
      yrsMin: 1,
      yrsMax: 3,
      description:
        "Build and maintain financial models, budgets, and forecasts; partner with business leaders.",
    }),
    scoreResult: mkScore({
      fit: 0.55,
      band: "reach",
      attain: 0.44,
      relevance: "adjacent",
      matched: ["excel_modeling"],
      missing: ["fpa_forecasting", "us_gaap"],
      strengths: ["Strong Excel modeling", "Budget management (student org)"],
    }),
  },
  {
    job: mkJob({
      id: "cx-job-9",
      title: "Strategy & Operations Associate",
      company: "Wiz",
      city: "Tel Aviv",
      posted: "2026-07-03",
      industry: "Cloud Security",
      yrsMin: 2,
      yrsMax: 4,
      description:
        "High-ownership BizOps role: solve cross-functional problems, run analyses, and drive execution.",
    }),
    scoreResult: mkScore({
      fit: 0.5,
      band: "reach",
      attain: 0.4,
      relevance: "adjacent",
      matched: ["sql", "stakeholder_communication"],
      missing: ["strategy_consulting", "operating_cadence"],
      strengths: ["BizOps internship", "Analytical toolkit"],
    }),
  },
];

// ───── Coach: seeded thread ─────

export const CANVAS_COACH_MESSAGES = [
  {
    id: "cx-msg-1",
    role: "assistant",
    text: "Hey Noa — I can see your whole board and roadmap. You've got a verbal offer from Similarweb and a live Lemonade process. Want to talk through how to compare them, or prep the Lemonade case study?",
  },
  { id: "cx-msg-2", role: "user", text: "Let's prep the Lemonade case study." },
  {
    id: "cx-msg-3",
    role: "assistant",
    text: "Great. Round 2 is a growth case, and your Bringg A/B-testing work is your strongest edge. Let's structure a STAR story around the activation lift you drove, then I'll throw a sizing question at you like the ones Lemonade asks.",
  },
];

// Coach threads — mirrors REAL `public.conversations` rows exactly as the dock
// selects them (CoachConversationContext: id, title, updated_at, application_id).
// Not an invented shape.
//
// The titles are the honest contract, and they are deliberately unflattering:
// production sets `title = text.slice(0, 60)` of the user's FIRST message — a
// hard mid-word cut, no ellipsis, no LLM titling, and no rename anywhere in the
// product. So the list must survive a one-word "hi", a mid-word truncation, and
// Hebrew (users type Hebrew even though the coach answers in English). Real
// titles average ~32 chars. If these fixtures looked like tidy summaries, the
// design would be tuned for data that does not exist.
//
// `application_id: null` on every row is also load-bearing: the dock lists ONLY
// unanchored threads, which is what prevents the AG2 context bleed guarded at
// ChatInterface.jsx:570. App-anchored threads are a separate list.
export const CANVAS_COACH_THREADS = [
  {
    id: "cx-thread-1",
    title: "Let's prep the Lemonade case study.",
    updated_at: "2026-07-17T09:12:00Z",
    application_id: null,
  },
  {
    id: "cx-thread-2",
    title: "how do I explain the gap between my two internships withou",
    updated_at: "2026-07-15T18:40:00Z",
    application_id: null,
  },
  {
    id: "cx-thread-3",
    title: "עזרה עם קורות החיים שלי",
    updated_at: "2026-07-11T08:05:00Z",
    application_id: null,
  },
  {
    id: "cx-thread-4",
    title: "hi",
    updated_at: "2026-06-29T20:31:00Z",
    application_id: null,
  },
];

export const CANVAS_COACH_PROMPTS = [
  "What should I focus on this week?",
  "Compare my Similarweb offer vs Lemonade",
  "What's my biggest skill gap?",
];
