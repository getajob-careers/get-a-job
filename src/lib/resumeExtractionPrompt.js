// Resume-extraction prompt for the `resume-extractor` ai-chat agent.
//
// Extracted from StepResumeUpload.jsx so the directive text is testable
// in isolation — the EXPERIENCE.skills directive is snapshot-locked in
// src/test/resume.extraction.test.js because regressions on it cause
// silent per-experience skill gaps (see investigation that produced
// this file).

export const EXPERIENCE_SKILLS_DIRECTIVE = `EXPERIENCE.skills — for EACH role, return 3-8 skills the role demonstrated. Sources of evidence (use ALL together):
- Title (e.g. "Data Analyst" → SQL, Excel, data analysis)
- Company / sector (e.g. consulting firm → research, presentations)
- Responsibilities bullets — the most direct source
- The resume's global Skills / Tools section — include any entry that plausibly applied to this role
Skills repeating across multiple roles is EXPECTED and CORRECT — the same Excel skill used in 3 jobs should appear in all 3.

HARD anti-hallucination rule: EVERY skill you return MUST appear somewhere in the resume text — in this role's bullets, in another role, in the Skills section, in the Tools section, in projects, anywhere. If you cannot point to the skill verbatim somewhere in the resume, NEVER invent it.

Return [] ONLY when the role has empty responsibilities AND no skill from anywhere in the resume plausibly applies — rare; most real roles will hit the 3-8 range.`;

export function buildResumeExtractionPrompt(fileText) {
  const safeText = String(fileText ?? "").slice(0, 15000);
  return `Extract structured information from this resume text. Return ONLY a raw JSON object (no markdown, no code blocks) with these fields: full_name, phone_number, location, linkedin_url, summary, institution, degree, field_of_study, education_level, education_dates (string, e.g. "2023 - Present"), gpa (string, e.g. "3.7" or "85"), honors (array of strings — named academic honors ONLY if explicitly stated in the resume text; return [] otherwise, never infer or add examples), academic_projects (array of strings — thesis title, capstone projects, named coursework projects. Do NOT include workplace projects), secondary_education (object with {institution, dates, location, highlights} — only if a high school OR earlier institution is mentioned, otherwise omit the field entirely), languages (array of {language, proficiency} — proficiency is one of "Native", "Fluent", "Conversational", "Basic"), skills (one flat array of every skill, tool, methodology, language, and competency you can identify in the resume — do NOT bucket into categories, just return one combined deduplicated list), experiences (array of {title, company, type, start_date, end_date, is_current, responsibilities, skills}), projects (array of {name, description, url, skills}), certifications (array of {name, issuer, date_earned}).

INSTITUTION — official name of the school/university for the MOST RECENT degree, exactly as it appears on the CV (e.g. "Reichman University", "Tel Aviv University", "IDC Herzliya", "Hebrew University of Jerusalem", "Technion - Israel Institute of Technology"). Do NOT abbreviate. If multiple institutions appear, pick the one matching the most recent degree (i.e. the one in education_dates). Leave "" if no institution is named.

DEGREE — the full credential name for the MOST RECENT degree, as a human-readable string exactly as written on the CV (e.g. "B.Sc. in Computer Science", "BA Economics", "MBA", "LL.B", "Master of Public Health"). This is the specific degree title, distinct from education_level (the canonical enum) and field_of_study (the major alone). If the CV names the degree, ALWAYS return it here — do NOT leave it blank when a degree is clearly stated. Leave "" only when no degree credential is named at all.

EDUCATION_LEVEL — return EXACTLY one of these lowercase strings: "high_school" | "associate" | "bachelors" | "masters" | "phd" | "bootcamp" | "self_taught". Map credentials as follows: B.A. / B.Sc. / BA / BSc / LLB / "undergraduate" → "bachelors"; M.A. / M.Sc. / MA / MSc / MBA / J.D. / M.D. / LL.M / "graduate" → "masters"; Ph.D. / doctorate → "phd". For a degree in progress, return the level of the degree being pursued (an undergraduate currently studying returns "bachelors", not the high school they previously completed). Do NOT return free-text like "Bachelor's Degree" or "BA" — return the canonical lowercase value.

ACADEMIC_PROJECTS — only items the resume itself labels as academic / coursework / thesis / capstone. Do NOT promote bullet points from job experiences into this array. Empty array if none mentioned.

PROJECTS / CERTIFICATIONS — only extract real ones:
- projects: standalone work (capstone, side project, hackathon, open source). NOT coursework. NOT job responsibilities.
- certifications: industry credentials (AWS, Coursera Pro, CFA, PMP, Google certifications). NOT bootcamps in progress, NOT online courses without a credential.

EDUCATION DATES — set education_dates to the date range of the MOST RECENT degree (e.g. "2023 - Present", "2020 - 2024"). Use "Present" for current students.

GPA / HONORS — return at the root level for the MOST RECENT degree only. Honours is the awards earned during that degree — ONLY awards explicitly named in the resume text; never infer, generalize, or add examples. Do NOT include workplace awards here — those belong in experiences[].responsibilities.

SECONDARY EDUCATION — only populate if the resume lists a high school or earlier institution separately from the main degree. Otherwise OMIT the field entirely (do not return null, do not return {}). Highlights array is for student-leadership roles or notable achievements at that school.

LANGUAGES — only include human languages (English, Hebrew, Spanish, etc.), NEVER programming languages. If proficiency level isn't stated, infer "Fluent" for the resume's primary language (matches the writing tone) and "Conversational" for any others mentioned.

EXPERIENCE.is_current — set to true if the role's end_date is "Present", "Current", missing, or the resume otherwise indicates ongoing employment. Otherwise false.

${EXPERIENCE_SKILLS_DIRECTIVE}

SKILLS (top-level array) — HARD CAP AND DEDUP:
- Return AT MOST 40 unique skills in the top-level skills array.
- Deduplicate case-insensitively ("Excel" and "excel" count as one; "Project Management" and "project management" count as one). Prefer Title Case for the surviving entry.
- If you'd otherwise emit more than 40, drop the least-supported ones first: a skill mentioned only once in the resume with no per-role appearance ranks below a skill mentioned in 3 roles or in both a per-role skills array AND the global Skills section.
- Stronger models tend to over-extract (one CV produced 116 entries against a 1-page resume). The downstream canonical-skill resolver doesn't benefit from this; the duplicates dilute matching.

THIN-CV ANTI-HALLUCINATION GUARD:
- If the resume's responsibilities are sparse (under 300 characters total across ALL experiences combined) AND the global Skills / Tools section is empty or absent, return skills: [] rather than inferring skills from job titles alone.
- "Marketing Intern" alone is NOT evidence the candidate has "Social Media Marketing" — that's a title-based fabrication and the verbatim rule above already forbids it. Returning an empty skills array is the correct response when the resume genuinely doesn't list any.
- This guard fires rarely (most CVs have either real responsibilities OR a Skills section) but prevents the LLM from confabulating to fill an array it thinks the schema expects.

PHONE NUMBER — scan the full document, not just the header:
- Search the ENTIRE resume text for a phone number, including the header, "Contact" section, email signature area, and anywhere near the email/LinkedIn.
- Accept any of these formats and keep the original formatting:
  • Israeli mobile: "054-3000613", "050 123 4567", "+972-54-300-0613", "+972 54 300 0613"
  • US: "(212) 555-0100", "212-555-0100", "+1 212 555 0100"
  • International: "+44 20 7946 0958", "+49 30 12345678"
- Strip any labels ("Phone:", "Mobile:", "M:", "Tel:") from the value.
- If no phone number is present in the resume, leave phone_number as an empty string — do NOT fabricate.

JOB TITLE RULES — applies to EVERY experience (professional, military, volunteering, leadership):
- The title field is a SHORT NOUN PHRASE, typically 2–5 words (e.g. "Senior Product Manager", "Sergeant First Class", "Marketing Intern", "President of Debate Club").
- NEVER put a responsibility sentence or action-verb statement in the title field. "Supervised and trained teams of soldiers" is NOT a title — it is a responsibility bullet. If the resume shows a block like:
    Nahal Brigade | 2020–2022
    • Supervised and trained teams of up to 30 soldiers...
  then the title is a RANK (see MILITARY section below), NOT the bullet text.
- Titles never start with verbs like Supervised / Managed / Led / Coordinated / Trained / Oversaw / Delivered / Assisted / Designed. If you see one of these starting a candidate-title, it's a responsibility — route it into the responsibilities array, not title.
- Never leave the title blank. If the resume doesn't state a title explicitly, infer the most likely short title from context (see MILITARY defaults below for military roles). For non-military roles without a clear title, use the closest standard role name (e.g. "Marketing Intern", "Research Assistant", "Program Coordinator").

EXPERIENCE TYPE CLASSIFICATION (required for every experience):
Set the "type" field on each experience to EXACTLY ONE of these values:
- "military"    — any military service. See military section below.
- "internship"  — explicit internships or summer placements
- "full_time"   — regular full-time employment (default when unclear but the role looks like a paid job)
- "part_time"   — part-time paid work
- "freelance"   — freelance / contract / self-employed / consulting
- "volunteer"   — unpaid volunteer work, community service, pro bono
- "leadership"  — student club president, team captain, society chair, founder of a student initiative

MILITARY SERVICE — recognise and extract carefully:
Treat any of the following as MILITARY experience (type="military"):
- English mentions: "IDF", "Israel Defense Forces", "Israeli Defense Forces", "Israeli military", "army service", "mandatory service", "reserve service", "commander", "combat soldier"
- Hebrew mentions: "צה״ל", "צהל", "שירות צבאי", "שירות מילואים", "מפקד"
- Specific units/corps (any of these → military): Givati, Golani, Nahal, Nachal, Paratroopers, Tzanhanim, Sayeret, Sayeret Matkal, Shaldag, Duvdevan, Kfir, Egoz, Maglan, Unit 8200, 8200, Mamram, Talpiot, Havatzalot, Intelligence Corps, Modi'in, Cyber Defense, IAF, Israeli Air Force, Navy, Shayetet, Home Front Command, Pikud Haoref, Combat Engineering, Artillery Corps, Armored Corps, Gaza Division, Officer's School, Bahad 1

When you classify an experience as military:
- Set company to the specific unit if named ("Nahal Brigade", "Unit 8200", "Golani Brigade", etc.), otherwise "Israel Defense Forces (IDF)".
- Title MUST be a rank or a short role name — NEVER a responsibility sentence. Prefer, in this priority order:
    1. An explicit rank named in the resume: "Sergeant First Class", "Staff Sergeant", "First Sergeant", "Lieutenant", "Captain", "Major", "Samal Rishon", "Samal", "Segen", "Seren", etc.
    2. An explicit role named in the resume: "Squad Commander", "Team Commander", "Platoon Commander", "Company Commander", "Intelligence Officer", "Intelligence Analyst", "Signals Intelligence Analyst", "Cyber Analyst", "Software Developer (IDF)", "Combat Medic", "Instructor", "Drill Sergeant".
    3. If the resume says the person was a commander/team lead but gives no explicit rank or role, use "Team Commander".
    4. If the resume shows only combat service with no rank or role named, use "Combat Soldier".
    5. Absolute last resort: "Military Service Member". Never leave title blank and never use a bullet-point sentence.
- Keep awards/commendations (Presidential Award for Excellence, unit citations, excellence commendations) in the responsibilities text — do not drop them.
- Translate Hebrew responsibility bullets to concise English.

Here is the resume:\n\n${safeText}`;
}
