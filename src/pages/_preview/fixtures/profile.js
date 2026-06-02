// Profile preview fixtures — drive every render branch of Profile.jsx.
// Each fixture seeds the 6 query keys Profile (and its inner tabs)
// read:
//   ["userProfile", UID]         — useProfileQuery
//   ["projects", UID]            — inline in Profile.jsx
//   ["experiences", UID]         — useExperiencesQuery
//   ["stories", UID]             — inline in Profile.jsx (count pills)
//   ["education", UID]           — useEducationQuery (EducationTab)
//   ["certifications", UID]      — useCertificationsQuery (CertificationsSection)

const UID = "profile-fixture-user";

function baseProfile(overrides = {}) {
  return {
    id: UID,
    full_name: "Eli Englard",
    phone_number: "+972 54 123 4567",
    location: "Tel Aviv, Israel",
    linkedin_url: "https://linkedin.com/in/eli-englard",
    summary:
      "Business graduate with internships in product analytics and customer success. Looking for entry-level roles in product management or product operations at Israeli SaaS / fintech companies.",
    languages: [
      { language: "Hebrew", proficiency: "Native" },
      { language: "English", proficiency: "Fluent" },
    ],
    skills: ["SQL", "Excel", "Stakeholder management", "Salesforce", "Product analytics", "Customer success"],
    skills_canonical: ["sql", "excel", "stakeholder_management", "salesforce", "product_analytics", "customer_success"],
    skills_unmapped: [],
    onboarding_complete: true,
    qualification_level: "Junior",
    primary_domain: "product_management",
    adjacent_fields: ["Customer Success", "Operations"],
    target_job_titles: ["Associate PM", "Product Analyst", "BizOps Analyst"],
    target_industries: ["Fintech", "SaaS", "Cybersecurity"],
    five_year_role: "Senior Product Manager",
    employment_status: ["student", "looking_for_job"],
    work_environment: ["Startup", "Scale-up"],
    work_type: ["Hybrid", "Full-time"],
    available_start_date: "2026-09-01",
    open_to_lateral: true,
    open_to_outside_degree: false,
    biggest_challenge: [
      "I don't know which roles to target",
      "I get interviews but no offers",
    ],
    cv_tailoring_strategy: "sometimes",
    linkedin_outreach_strategy: "rarely",
    role_clarity_score: 3,
    job_search_efforts: "Applied to ~25 roles since March. Got 4 first-round interviews; no offers yet.",
    resume_url: null,
    last_reality_check_date: "2026-06-01T08:00:00.000Z",
    ...overrides,
  };
}

const EDUCATION = [
  {
    id: "edu-1",
    user_id: UID,
    institution: "Reichman University",
    education_level: "bachelors",
    degree_type: "B.A.",
    field_of_study: "Business Administration",
    start_date: "Oct 2023",
    end_date: "Jun 2026",
    is_current: true,
    gpa: "88/100",
    honors: ["Dean's List", "Merit Scholarship"],
    relevant_coursework: ["Marketing Strategy", "Statistics", "Corporate Finance"],
    academic_projects: ["Capstone: SaaS pricing model for Israeli scale-ups"],
    skills: ["financial modeling", "market research", "stakeholder management"],
    location: "Herzliya, Israel",
    display_order: 0,
  },
];

const CERTIFICATIONS = [
  {
    id: "cert-1",
    user_id: UID,
    name: "Google Data Analytics Professional Certificate",
    issuer: "Coursera / Google",
    date_earned: "Mar 2025",
    description: "8-course series covering SQL, R, Tableau, and the full analytics lifecycle. Capstone analysed bike-share usage patterns.",
    is_current: false,
    skills: ["SQL", "Tableau", "R"],
  },
  {
    id: "cert-2",
    user_id: UID,
    name: "HubSpot Inbound Marketing",
    issuer: "HubSpot Academy",
    date_earned: "Dec 2026",
    description: "Currently working through inbound, content, and email modules.",
    is_current: true,
    skills: ["Email Marketing", "Content Strategy"],
  },
];

const PROJECTS = [
  {
    id: "proj-1",
    user_id: UID,
    name: "IAI Internship Picker",
    url: "https://github.com/eli/iai-picker",
    description: "Built an internal tool to match incoming MBA interns to product teams. Used a simple scoring model + a Streamlit UI.",
    skills: ["Python", "Streamlit", "Scoring models"],
    created_at: "2026-03-15T00:00:00.000Z",
  },
  {
    id: "proj-2",
    user_id: UID,
    name: "Product Hunt Launch",
    url: "https://producthunt.com/posts/get-a-job",
    description: "Soft-launched a personal site that helps Israeli MBA students structure their job search. ~120 sign-ups in the first week.",
    skills: ["Product launch", "Marketing"],
    created_at: "2026-04-02T00:00:00.000Z",
  },
];

const EXPERIENCES = [
  {
    id: "exp-1",
    user_id: UID,
    title: "Product Analyst Intern",
    company: "monday.com",
    type: "internship",
    start_date: "Jun 2025",
    end_date: "Sep 2025",
    is_current: false,
    responsibilities:
      "Built activation funnel dashboards across 3 product surfaces.\nRan two A/B tests on the onboarding checklist; the winning variant lifted day-7 retention by 4.2 pp.\nPartnered with growth PM on weekly product-review readouts.",
    skills: ["SQL", "Mixpanel", "A/B testing", "Product analytics"],
    created_at: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "exp-2",
    user_id: UID,
    title: "Customer Success Intern",
    company: "Lightricks",
    type: "internship",
    start_date: "Jan 2025",
    end_date: "May 2025",
    is_current: false,
    responsibilities:
      "Owned onboarding playbook for SMB accounts. Reduced time-to-first-value from 11 days to 6 days. Built the QBR template still in use by the CS team.",
    skills: ["Customer success", "Salesforce", "Onboarding"],
    created_at: "2026-02-01T00:00:00.000Z",
  },
];

const STORIES = [
  { id: "story-1", experience_id: "exp-1" },
  { id: "story-2", experience_id: "exp-1" },
  { id: "story-3", experience_id: "exp-2" },
];

export const PROFILE_FIXTURES = {
  "profile-empty": {
    label: "Profile · empty (new user, all tabs blank)",
    profile: baseProfile({
      full_name: "",
      phone_number: "",
      location: "",
      linkedin_url: "",
      summary: "",
      languages: [],
      skills: [],
      skills_canonical: [],
      skills_unmapped: [],
      primary_domain: "",
      qualification_level: "",
      adjacent_fields: [],
      target_job_titles: [],
      target_industries: [],
      five_year_role: "",
      employment_status: [],
      work_environment: [],
      work_type: [],
      available_start_date: "",
      open_to_lateral: false,
      open_to_outside_degree: false,
      biggest_challenge: [],
      cv_tailoring_strategy: "",
      linkedin_outreach_strategy: "",
      role_clarity_score: null,
      job_search_efforts: "",
    }),
    education: [],
    certifications: [],
    projects: [],
    experiences: [],
    stories: [],
  },
  "profile-loading": {
    label: "Profile · loading skeleton (profile query in flight)",
    profile: null,
    education: [],
    certifications: [],
    projects: [],
    experiences: [],
    stories: [],
    loading: true,
  },
  "profile-populated": {
    label: "Profile · populated Profile tab (default view)",
    profile: baseProfile(),
    education: EDUCATION,
    certifications: CERTIFICATIONS,
    projects: PROJECTS,
    experiences: EXPERIENCES,
    stories: STORIES,
  },
  "profile-tab-education": {
    label: "Profile · Education tab (1 degree + 2 certifications)",
    profile: baseProfile(),
    education: EDUCATION,
    certifications: CERTIFICATIONS,
    projects: PROJECTS,
    experiences: EXPERIENCES,
    stories: STORIES,
    urlFlag: "tab=education",
  },
  "profile-tab-goals": {
    label: "Profile · Goals & preferences tab (seeded targets + tiles)",
    profile: baseProfile(),
    education: EDUCATION,
    certifications: CERTIFICATIONS,
    projects: PROJECTS,
    experiences: EXPERIENCES,
    stories: STORIES,
    urlFlag: "tab=goals",
  },
  "profile-tab-self-assessment": {
    label: "Profile · Self-assessment tab (challenges + stacked radios + clarity)",
    profile: baseProfile(),
    education: EDUCATION,
    certifications: CERTIFICATIONS,
    projects: PROJECTS,
    experiences: EXPERIENCES,
    stories: STORIES,
    urlFlag: "tab=self-assessment",
  },
  "profile-tab-projects": {
    label: "Profile · Projects tab (2 saved projects)",
    profile: baseProfile(),
    education: EDUCATION,
    certifications: CERTIFICATIONS,
    projects: PROJECTS,
    experiences: EXPERIENCES,
    stories: STORIES,
    urlFlag: "tab=projects",
  },
  "profile-tab-experience": {
    label: "Profile · Experience tab (2 experiences + story-count pills)",
    profile: baseProfile(),
    education: EDUCATION,
    certifications: CERTIFICATIONS,
    projects: PROJECTS,
    experiences: EXPERIENCES,
    stories: STORIES,
    urlFlag: "tab=experience",
  },
  "profile-experience-edit-mode": {
    label: "Profile · Experience tab · row in edit mode (form prefilled)",
    profile: baseProfile(),
    education: EDUCATION,
    certifications: CERTIFICATIONS,
    projects: PROJECTS,
    experiences: EXPERIENCES,
    stories: STORIES,
    urlFlag: "tab=experience&edit=exp-1",
  },
  "profile-unmapped-skills": {
    label: "Profile · UnmappedSkillsSection visible (golden hint card)",
    profile: baseProfile({
      // Catch-all skills array contains 2 labels the canonical resolver
      // can't match. UnmappedSkillsSection renders the warning + suggest
      // pills only when persisted skills_unmapped overlaps the user's
      // own skills array.
      skills: ["SQL", "Excel", "Stakeholder management", "produc analytcs", "team buildin"],
      skills_unmapped: ["produc analytcs", "team buildin"],
    }),
    education: EDUCATION,
    certifications: CERTIFICATIONS,
    projects: PROJECTS,
    experiences: EXPERIENCES,
    stories: STORIES,
  },
  "profile-resume-uploaded": {
    label: "Profile · Profile tab · 'Resume uploaded' indicator",
    profile: baseProfile({
      resume_url: "https://example.com/storage/resumes/eli-resume.pdf",
    }),
    education: EDUCATION,
    certifications: CERTIFICATIONS,
    projects: PROJECTS,
    experiences: EXPERIENCES,
    stories: STORIES,
  },
};

export const PROFILE_STATE_IDS = Object.keys(PROFILE_FIXTURES);
export const PROFILE_FIXTURE_UID = UID;
