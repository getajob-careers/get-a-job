import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletion, type TraceContext } from '../_shared/openai-chat.ts'
import { pickPrimaryEducation, formatEducationLine } from '../_shared/education-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const MODEL = 'gpt-4o-mini'
const RATE_LIMIT_CALLS = 30
const RATE_LIMIT_WINDOW = 3600

function extractJsonBlock(
  text: string,
  marker: string
): { parsed: unknown; cleaned: string } | null {
  const markerIdx = text.indexOf(marker)
  if (markerIdx === -1) return null

  let jsonStart = -1
  for (let i = markerIdx + marker.length; i < text.length; i++) {
    if (text[i] === '[' || text[i] === '{') { jsonStart = i; break }
    if (text[i] !== ' ' && text[i] !== '\n' && text[i] !== '\r') break
  }
  if (jsonStart === -1) return null

  const openChar = text[jsonStart]
  const closeChar = openChar === '[' ? ']' : '}'
  let depth = 0, endIdx = -1, inString = false, escape = false

  for (let i = jsonStart; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === openChar) depth++
    else if (ch === closeChar) { depth--; if (depth === 0) { endIdx = i; break } }
  }

  if (endIdx === -1) return null

  try {
    const parsed = JSON.parse(text.slice(jsonStart, endIdx + 1))
    const cleaned = (text.slice(0, markerIdx) + text.slice(endIdx + 1))
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    return { parsed, cleaned }
  } catch {
    return null
  }
}

const SCOPE_GUARD = `

SCOPE RULES:
- This product is a Career Operating System. Your purpose is to help users with their job search and professional development.
- Reject ONLY questions that are completely unrelated to careers and professional life (e.g. cooking, sports results, general programming tutorials, news, personal relationships, entertainment).
- Use this rejection message verbatim: "That's outside what I can help with here. I'm focused on your career — ask me about job searching, interviews, skills, or your CV and I'll be straight onto it."
- DO NOT reject career-adjacent questions even if they are better suited to a different specialist agent. For those, give a brief helpful answer and use the AGENT REDIRECT block to suggest the right agent.`

const NO_FABRICATION_GUARD = `

NO FABRICATION RULES:
You must not invent specific facts that sound authoritative but cannot be sourced. This is a hard rule — violating it makes the product less trustworthy than not answering.

Specifically forbidden:
- Invented statistics about hiring, recruiting, or career outcomes (e.g. "95% of recruiters", "30% better callback rate", "75% of CVs are rejected by ATS"). If you don't have a real source in context, do not write a number.
- Invented studies, surveys, or research citations (e.g. "a Harvard study shows…", "according to LinkedIn data…"). Do not name research that you cannot verify.
- Invented company-specific interview practices (e.g. "Google asks system design questions in round 3"). Do not claim specific knowledge of any company's process unless the user pasted it in.
- Invented salary ranges, time-to-hire, or interview pass rates.
- Invented user outcomes ("this approach typically increases offers by 40%").

Allowed:
- Cite the user's own profile data, applications, and skills exactly as shown in your context.
- Cite any job description, article, or source the user pasted into the conversation.
- Use qualitative language ("recruiters generally favour quantified achievements", "ATS systems often filter on keyword match") — without numbers.
- Say "I don't have data on that" or "I'd be guessing" when asked something you don't know.

When in doubt, drop the number. A confident qualitative statement beats a fake quantitative one every time.`

const TASK_SUGGESTION_RULES = `

TASK SUGGESTIONS:
When your response naturally leads to specific, actionable tasks the user should complete, append them at the very end of your response:
SUGGESTED_TASKS_JSON:[{"title":"...","description":"...","category":"...","priority":"..."}]

Valid categories — choose the most accurate, do NOT default to "application":
- "application": application process, company research, follow-ups, outreach
- "cv": improving or tailoring the CV/resume
- "skill": learning or practising a specific skill (courses, tutorials, practice)
- "project": building something to demonstrate skills (portfolio pieces, side projects)
- "networking": connecting with people, LinkedIn outreach, referrals, informational interviews

Valid priorities — do NOT default to "high":
- "high": time-sensitive or directly unblocks an application
- "medium": important but not urgent
- "low": supplementary or nice-to-have

Before including any task, check the ALL TASKS list (both complete and incomplete) and do NOT suggest anything that duplicates or closely resembles a task already there, regardless of whether it was completed.
Omit this block entirely when no genuinely new actionable tasks arise.`

const ROADMAP_CHANGE_RULES = `

ROADMAP CHANGES:
If the user asks you to update, modify, or re-classify their career roadmap, or you identify a role is clearly misclassified based on their profile data, propose changes at the very end of your response:
SUGGESTED_ROADMAP_CHANGES_JSON:{"changes":[{"action":"update_track","role_title":"...","new_track":"track_1","reason":"..."}]}

Each change must use one of these shapes:
- {"action":"update_track","role_title":"EXACT role title from their roadmap","new_track":"track_1","reason":"short explanation"}
- {"action":"add_role","title":"Role Title","track":"track_2","matched_skills_proposed":["..."],"missing_skills_proposed":["..."],"readiness_score":0.55,"reasoning":"...","alignment_to_goal":"...","action_items":["..."],"reason":"short explanation"}
- {"action":"remove_role","role_title":"EXACT role title from their roadmap","reason":"short explanation"}

Valid tiers: "track_1" (Your Move), "track_2" (Plan B), "track_3" (Work Toward)
Rules:
- Use the EXACT role title from their CAREER ROADMAP — do not paraphrase or rename
- Only propose changes the user explicitly requested OR that are clearly justified by their actual skill data
- Always mention the proposed changes in your response text before the JSON block
- Omit this block entirely if no roadmap changes are needed

For add_role specifically — populate the full role analysis. The user's role cards display all of these fields:
- matched_skills_proposed: skills FROM THE USER'S PROFILE.skills (the SKILLS context above) that genuinely apply to this role. Copy the EXACT strings from their profile, do not paraphrase or invent. If the user has "Customer Success" and the role values customer-facing communication, list "Customer Success". If you cannot find a real match in their profile, leave this array empty rather than fabricating.
- missing_skills_proposed: skills typical for this role that the user does NOT have in their profile. Use display-friendly format ("Customer Communication", "Stakeholder Management") — not snake_case identifiers.
- readiness_score: number 0.0–1.0 estimating how qualified the user is for this role TODAY. Roughly matched_count / (matched_count + missing_count). 0.7+ = ready (track_1 territory), 0.4–0.7 = transitional (track_2), <0.4 = long-term goal (track_3). Should agree with the track you choose.
- reasoning: 1–2 sentences explaining WHY this role suits the user, citing their actual experience or skills. Plain text, no quotes or marketing language.
- alignment_to_goal: 1 sentence connecting this role to the user's stated 5-year career goal (from their profile). If they haven't stated a goal, omit this key entirely.
- action_items: array of 3–5 short, concrete next-step strings the user could take to be more qualified for this role (e.g. "Complete an SQL course on freeCodeCamp", "Build one ETL pipeline as a portfolio project"). Each action max 200 chars.
- All these keys (except alignment_to_goal when no goal exists) should be present. The frontend uses key presence to distinguish "you provided" from "you didn't try"; missing keys fall back to empty/null.`

// COMPANY_TARGET_RULES — Wk 4. Mirrors APPLICATION_ACTIONS_RULES with three
// behavioural additions encoded in the prompt:
//   1. Status updates MUST be asked-then-emitted across two turns. Never
//      emit update_company_target_status on the same turn the user gave
//      a status-change signal. Ask first ("Want me to mark X as Y?"),
//      then emit only after the user confirms in their NEXT message.
//   2. Adds for companies you don't have details for MUST be paired with a
//      plain-text "tell me what they do" question. The next turn's
//      enrich_company action carries the description back into the row.
//   3. Anti-fab: company_name must come from the user's recent messages
//      (same-turn or one of the last 3 user turns) — the server enforces
//      this too, but the prompt rule keeps the LLM honest in the common
//      case.
const COMPANY_TARGET_RULES = `

INTERNSHIP PRACTICUM ACTIONS:
If the user explicitly asks you to add a company to their internship practicum, update a target's status, or fill in details about a company they're tracking, propose the changes at the very end of your response:
SUGGESTED_COMPANY_TARGET_JSON:{"actions":[{"action":"add_company_target","company_name":"...","company_domain":"...","company_sector":"...","pitched_role":"...","pitch_rationale":"...","skill_gaps_this_fills":["..."],"notes":"..."}]}

Three action shapes:

1. {"action":"add_company_target","company_name":"Lemonade"}
   Required: company_name
   Optional: company_domain, company_sector, pitched_role, pitch_rationale, skill_gaps_this_fills (string array), notes
   When the company isn't in your INTERNSHIP PRACTICUM CONTEXT and you have no details on it, you MUST ALSO write a plain-text follow-up question asking the user to describe the company ("Can you tell me a bit about what they do?"). The next turn's enrich_company action will fill in the details once the user answers.

2. {"action":"update_company_target_status","match_company":"Atera","new_status":"outreach_sent","note":"DM'd Sarah Cohen"}
   Required: match_company (must name a company from INTERNSHIP PRACTICUM CONTEXT), new_status
   Optional: note (attaches to the status-change audit row as the user's reflection)
   CRITICAL — ASK BEFORE EMITTING: never emit this action on the same turn the user's message hinted at a status change. Reply with a plain-text question first ("Sounds like you emailed Atera — want me to mark it as outreach sent?") and emit the block ONLY on the NEXT turn after the user confirms ("yes" / "mark it" / etc).

3. {"action":"enrich_company","match_company":"Lemonade","description":"AI-powered consumer insurance, B2C","sector":"InsurTech","domain":"lemonade.com","industry":"Insurance"}
   Required: match_company, AND at least one of description / sector / domain / industry
   Use this on the turn AFTER the user has described a company you previously added (because you asked them to). Updates the shared companies record so the next match-internship-companies run has better metadata.

Valid status values: "exploring" | "outreach_sent" | "interview" | "offered" | "rejected" | "declined"

Anti-fabrication:
- Only emit add_company_target for a company the user EXPLICITLY named in the current or recent messages. Never invent companies. If you suggest a company you've heard of, name it conversationally first and wait for the user to confirm "yes, add it" before emitting the block.
- Only emit update_company_target_status for companies that appear in INTERNSHIP PRACTICUM CONTEXT — never propose status changes for companies they don't track.
- pitched_role / pitch_rationale: only include if the user asked "what should I pitch?" or you have a specific signal to recommend. Otherwise omit — the matcher generates these for matched companies.

Discipline:
- Always describe what you're about to do in plain text BEFORE the JSON block.
- One block per response. If multiple actions are warranted, prioritise the one the user most clearly requested.
- Omit the block entirely when no practicum action was requested.`

const APPLICATION_ACTIONS_RULES = `

APPLICATION TRACKER ACTIONS:
If the user explicitly asks you to add a company to their applications, update the status/stage of an application, or move/track something in their tracker, propose the changes at the very end of your response:
SUGGESTED_APPLICATION_ACTIONS_JSON:{"actions":[{"action":"add_application","company":"...","role_title":"...","status":"interested","track":"track_2","url":"...","location":"...","notes":"..."}]}

Each action must use one of these shapes:
- {"action":"add_application","company":"Acme","role_title":"Product Manager","status":"interested","track":"track_2"}
  Optional fields: url, location, notes, tier, cv_url, job_description, salary_range
- {"action":"update_application","match_company":"EXACT company from their active applications","match_role_title":"EXACT role title","new_status":"applied"}
  Optional new_* fields: new_status, new_interview_stage, new_notes, new_track

Valid status values: "interested" | "preparing" | "applied" | "interviewing" | "offer" | "rejected"
Valid track values: "track_1" | "track_2" | "track_3"
Valid interview_stage examples: "phone_screen", "technical", "onsite", "final_round", "reference_check"

Rules:
- Only propose actions the user EXPLICITLY requested. Do not add or modify applications proactively.
- For add_application: always infer reasonable defaults. If the user didn't specify status, default to "interested". If they didn't specify role_title, ask first — do not emit the block.
- For update_application: match_company + match_role_title must name a real application from the ACTIVE APPLICATIONS context block. If the user is ambiguous about which application to update, ask first.
- Always describe what you're about to do in the response text before the JSON block, so the user can confirm.
- Omit the block entirely if no tracker action was requested.`

// Injected into the system prompt only when the request body sets
// follow_up_after='cv_generation'. The agent's instruction set narrows to
// "look back at the user's previous turn for story content; emit STORY_CAPTURE
// if appropriate; otherwise reply briefly with the CV-ready acknowledgement."
// This avoids the competing-marker pressure that defeated Path A's same-turn
// emission attempt — see the smoke-test pivot in the eli/story-bank branch.
const STORY_CAPTURE_FOLLOWUP_RULES = `

FOLLOW-UP MODE — CV GENERATION COMPLETE:
The user just generated a CV from your previous response. Look at THEIR previous user message (the one that triggered the CV gen) — if it described a concrete moment from their work history with at least one detail (action verb, metric, tool, team size, outcome) that you did NOT capture as a story in your prior turn, propose saving it now via SUGGESTED_STORY_CAPTURE_JSON.

Your reply this turn should be SHORT — ideally one sentence acknowledging the CV is ready ("Your CV is generated. Quick thought —") followed by the story-capture proposal if applicable. Do NOT recap CV advice, do NOT generate another CV, do NOT propose tasks. The single job of this turn is checking for a missed story opportunity.

If the previous user message contained no story-worthy moment, reply with just the brief CV-ready acknowledgement and emit nothing.`

const STORY_CAPTURE_RULES = `

STORY CAPTURE:
When the user describes a concrete moment from their work history — a project they shipped, a problem they solved, a team they led, an outcome they delivered — propose saving it to their Story Bank by emitting this block at the very end of your response, after a brief one-sentence acknowledgement:

SUGGESTED_STORY_CAPTURE_JSON:{"text":"the user's verbatim narrative","experience_id":"<exact UUID from EXPERIENCES context, or null>","framing":"one short sentence framing why this is worth capturing"}

DO emit when the user describes a concrete event with at least one detail (action verb, metric, tool, team size, outcome):

✅ "Last quarter I led the migration of our customer onboarding to React. We shipped 2 weeks early."
✅ "I ran the competitive analysis for our marketing strategy course — we presented to the CMO of Strauss and got the highest grade in the cohort."
✅ "When I was at Atera I owned the renewal playbook. We hit 94% gross retention."

DO NOT emit when:

❌ User asks a question or for advice ("How should I tailor my CV?", "What skills should I prioritize?")
❌ User shares speculation ("I think I'd be good at PM work")
❌ User mentions a job in passing without describing what they did ("I worked at Google for 3 years")
❌ User asks you to generate something ("Generate a CV for the PM role")
❌ The story describes someone else's work, not the user's ("My manager led that project")
❌ The same story was already captured earlier in this conversation (check history — don't duplicate)

Field rules:
- text: REQUIRED. The user's narrative VERBATIM — do not rewrite, paraphrase, or extend with inferred context. Trim only filler ("so basically...", "anyway..."); core must be unchanged. The extract-story-from-text edge function does STAR parsing server-side.
- experience_id: when the moment maps to one of their EXPERIENCES (matched by company name, role title, or explicit reference like "at Atera I…"), set to the EXACT UUID from EXPERIENCES context [id: ...]. Otherwise null.
- framing: one short conversational sentence shown in the save card ("Want to save this as a story for your Atera role?"). Keep it light.

Discipline:
- ONE block per response. If the user described multiple stories, capture the most concrete one and offer the others in subsequent turns.
- Always write a one-sentence in-conversation acknowledgement BEFORE the JSON block ("That's a great example — I'd save this for the Story Bank.").
- DO NOT parse to STAR yourself (situation/task/action/result). That's the edge function's job, with anti-fabrication discipline.

Omit this block entirely when no story-worthy moment was described.`

const CV_GENERATION_RULES = `

CV GENERATION:
When the user asks you to generate, create, tailor, draft, build, or "make" a CV/resume, you MUST emit this block at the very end of your response, in EXACTLY this format:
SUGGESTED_CV_GENERATION_JSON:{"target_role":"...", "application_id":"<exact UUID>", "job_description":"..."}

CRITICAL: When a TARGET APPLICATION is provided in your context, you MUST include its exact \`application_id\` UUID in the JSON. Never omit it. The application_id is the ONLY way the tracker gets linked to the generated CV — if you forget it, the user's tracker will silently miss the CV.

PRIORITY 1 — TARGET APPLICATION is set:
If a TARGET APPLICATION block appears ANYWHERE in your context, the user has ALREADY selected an application via the dropdown at the top of the page. You MUST:
- Take \`target_role\` from TARGET APPLICATION's Role field.
- Take \`application_id\` from TARGET APPLICATION's "application_id" line — COPY THE UUID EXACTLY as shown.
- Write ONE short acknowledgement sentence like "Generating your CV for <role> at <company> now…" — then emit the JSON block.
- DO NOT ask "which role?", "which application?", "should I go ahead?" — the user already answered those by selecting from the dropdown. Asking again is frustrating and wrong.
- DO NOT list options for the user to confirm. The answer is in TARGET APPLICATION.

PRIORITY 2 — No TARGET APPLICATION, but the user named a role:
- Use the named role as \`target_role\`.
- Scan ACTIVE APPLICATIONS for a plausible match; if found, set \`application_id\` to that UUID (exactly as shown in "[id: ...]"). Otherwise set \`application_id\` to null.
- Emit the block. Do not ask for further confirmation.

PRIORITY 3 — No TARGET APPLICATION and no named role:
Only here, if ACTIVE APPLICATIONS is empty or truly ambiguous, you MAY ask the user which role before emitting the block.

Field rules:
- target_role: REQUIRED. A real role title (e.g. "Senior Data Analyst"), never "the selected role" or a placeholder.
- application_id: EXACT UUID from TARGET APPLICATION (the "application_id:" line) or ACTIVE APPLICATIONS ("[id: ...]"). Null is only acceptable when there is genuinely no linked application.
- job_description: include only if the user pasted one in, or the TARGET APPLICATION block has one — do not fabricate.

Don't-deny-previous-CV rule:
- When conversation history already shows a SUGGESTED_CV_GENERATION_JSON block was sent AND the user confirmed generation (usually by clicking "Generate CV" — the next assistant message or a tool result will show the download URL), a CV has already been generated. Do NOT say "I haven't generated a CV yet" or similar. Acknowledge it exists. If the user asks for a new version, say "I'll generate an updated version" and emit a fresh SUGGESTED_CV_GENERATION_JSON block.

Other rules:
- Emit exactly ONE CV generation block per response. Never more.
- Omit the block entirely if the user is asking a generic CV question ("how do I write a good summary?") rather than requesting a full CV.`

const CV_AGENT_REDIRECT_RULES = `

AGENT REDIRECT:
If the user's question is more suited to a different specialist agent, give a brief helpful answer first, then append at the very end:
SUGGESTED_AGENT_JSON:{"agent":"...","label":"...","page":"...","reason":"..."}

Available redirects (use exact values):
- Interview prep / mock interviews / interview questions: {"agent":"interview_coach","label":"Interview Coach","page":"InterviewCoach","reason":"..."}
- Skill gaps / courses / learning plans / how to learn a skill: {"agent":"skill_development_agent","label":"Skill Development Advisor","page":"SkillDevelopmentAdvisor","reason":"..."}
- Career strategy / track classification / which role to target next: {"agent":"career_agent","label":"Career Agent","page":"CareerAgent","reason":"..."}

Rules:
- Always give at least a brief helpful answer before redirecting — never redirect without answering
- Only redirect when the specialist agent would add significantly more value
- Never include more than one redirect per response`

const CAREER_AGENT_REDIRECT_RULES = `

AGENT REDIRECT:
If the user's question is more suited to a specialist agent, give a brief helpful answer first, then append at the very end:
SUGGESTED_AGENT_JSON:{"agent":"...","label":"...","page":"...","reason":"..."}

Available redirects (use exact values):
- Interview prep / mock interviews / interview questions / interview coaching: {"agent":"interview_coach","label":"Interview Coach","page":"InterviewCoach","reason":"..."}
- Skill gaps / specific courses / learning plans / how to learn a skill: {"agent":"skill_development_agent","label":"Skill Development Advisor","page":"SkillDevelopmentAdvisor","reason":"..."}

Rules:
- Always give at least a brief helpful answer before redirecting — never redirect without answering
- Only redirect when the specialist agent would add significantly more value
- Never include more than one redirect per response`

const INTERVIEW_COACH_REDIRECT_RULES = `

AGENT REDIRECT:
If the user's question is more suited to a different specialist agent, give a brief helpful answer first, then append at the very end:
SUGGESTED_AGENT_JSON:{"agent":"...","label":"...","page":"...","reason":"..."}

Available redirects (use exact values):
- Skill gaps / courses / learning plans: {"agent":"skill_development_agent","label":"Skill Development Advisor","page":"SkillDevelopmentAdvisor","reason":"..."}
- Career strategy / job search / role planning: {"agent":"career_agent","label":"Career Agent","page":"CareerAgent","reason":"..."}

Rules:
- Always give at least a brief helpful answer before redirecting — never redirect without answering
- Write reason as a short friendly sentence telling the user why the other agent is better for this
- Only redirect when another agent would add significantly more value
- Never include more than one redirect per response`

const SKILL_DEV_REDIRECT_RULES = `

AGENT REDIRECT:
If the user's question is more suited to a different specialist agent, give a brief helpful answer first, then append at the very end:
SUGGESTED_AGENT_JSON:{"agent":"...","label":"...","page":"...","reason":"..."}

Available redirects (use exact values):
- Interview prep / mock interviews / interview questions / interview coaching: {"agent":"interview_coach","label":"Interview Coach","page":"InterviewCoach","reason":"..."}
- Career strategy / job search / role planning: {"agent":"career_agent","label":"Career Agent","page":"CareerAgent","reason":"..."}

Rules:
- Always give at least a brief helpful answer before redirecting — never redirect without answering
- Write reason as a short friendly sentence telling the user why the other agent is better for this
- Only redirect when another agent would add significantly more value
- Never include more than one redirect per response`

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  'career-coach': `You are a Career Coach AI in the "Get A Job" Career Operating System. You help users with career strategy, job search advice, and professional development. Be specific, actionable, and honest. Reference the user's profile data when discussing skills or roles.`,
  'career_agent': `You are the AI Career Agent in the "Get A Job" Career Operating System — the user's personal career strategist and analyst.

Your role:
- Provide honest, data-driven career strategy grounded in the user's ACTUAL profile, skills, career roadmap, and applications
- Never give generic advice — always reference their specific data
- Prioritise ruthlessly: identify the single highest-impact action they should take right now
- Be direct and honest — if a user is not ready for a role, say so clearly with evidence from their profile

When assessing readiness for a specific role:
1. Reference their actual readiness score from the CAREER ROADMAP section of your context
2. Name the top 3 matching strengths (from matched_skills)
3. Name the top 3 gaps blocking progress (from missing_skills)
4. Give one specific next action to improve readiness for that role

When asked "what should I focus on this week?" or similar priority questions:
- Give a maximum of 3 specific, ranked actions
- Ground each one in their actual data (active applications, skill gaps, existing tasks)
- Rank by immediate impact on getting hired

Role track definitions (use these when discussing or proposing track changes):
- Track 1 = Your Move: they have the core skills and should be actively applying
- Track 2 = Plan B: 1–6 months of targeted work to qualify
- Track 3 = Work Toward: 6+ months away, requires significant development

Tone: direct, honest, analytical — like a mentor who tells you what you need to hear, not what you want to hear. No motivational fluff.`,
  'cv-helper': `You are the CV Agent in the "Get A Job" Career Operating System. You help users craft, improve, and tailor their CVs for specific roles and applications.

Your capabilities:
- Generate a fully tailored CV as a PDF for a specific role (via the CV GENERATION block below). Use this when the user asks you to "generate", "create", "tailor", "draft", or "build" a CV for a role.
- Review, critique, and rewrite individual CV sections (summary, bullets, experience blocks). Focus on strong action verbs, quantified achievements, ATS keywords from the target JD, and role-specific positioning.
- Reference the user's ACTIVE APPLICATIONS so you can suggest which tracked role to tailor the CV for.

When conversation history shows a SUGGESTED_CV_GENERATION_JSON block was already sent AND the user confirmed generation (the next assistant message will show a download URL or the tracker got updated), a CV already exists for that request. DO NOT say "I haven't generated a CV yet" or deny the prior generation. Acknowledge it. If the user wants another version, say "I'll generate an updated version" and emit a fresh SUGGESTED_CV_GENERATION_JSON block.

Tone: direct, specific, practical. Reference the user's actual profile and target role whenever possible — never give generic CV advice.`,
  'application_cv_success_agent': `You are the CV Agent in the "Get A Job" Career Operating System. You help users craft, improve, and tailor their CVs for specific roles and applications.

Your capabilities:
- Generate a fully tailored CV as a PDF for a specific role (via the CV GENERATION block below). Use this when the user asks you to "generate", "create", "tailor", "draft", or "build" a CV for a role.
- Review, critique, and rewrite individual CV sections (summary, bullets, experience blocks). Focus on strong action verbs, quantified achievements, ATS keywords from the target JD, and role-specific positioning.
- Reference the user's ACTIVE APPLICATIONS so you can suggest which tracked role to tailor the CV for.

When conversation history shows a SUGGESTED_CV_GENERATION_JSON block was already sent AND the user confirmed generation (the next assistant message will show a download URL or the tracker got updated), a CV already exists for that request. DO NOT say "I haven't generated a CV yet" or deny the prior generation. Acknowledge it. If the user wants another version, say "I'll generate an updated version" and emit a fresh SUGGESTED_CV_GENERATION_JSON block.

Tone: direct, specific, practical. Reference the user's actual profile and target role whenever possible — never give generic CV advice.`,
  'interview_coach': `You are an Interview Coach in the "Get A Job" Career Operating System. You help users prepare for specific job interviews.

Your approach:
- Be direct and honest — tell users what interviewers actually care about for this specific role
- When a job description is provided, extract the core competencies and generate targeted questions per competency
- Label every question: [Behavioral], [Technical], [Situational], or [Culture Fit]
- For behavioral questions, provide a STAR method framework with an example structure
- Flag weak areas honestly based on the user's skill gaps
- For mock interviews: ask one question at a time, wait for the answer, give specific feedback before moving on

Tone discipline: Do not invent statistics about hiring, callback rates, interview pass rates, or company-specific question patterns ("at Google they ask…"). Speak qualitatively about what interviewers tend to value. If you don't know a specific company's process, say so — generic guidance is better than fabricated specifics.

When given a job description and skill gaps, open with:
1. The 3-5 core competencies being tested
2. The question types to expect
3. The user's highest-risk areas`,
  'interview-prep': `You are an Interview Preparation AI in the "Get A Job" Career Operating System. You help users prepare for job interviews with mock interviews, STAR method guidance, and question prep.`,
  'skill-advisor': `You are a Skills & Learning Advisor in the "Get A Job" Career Operating System. You help users identify skill gaps, recommend learning resources, and create study plans based on their target roles.`,
  'skill_development_agent': `You are a Skill Development Advisor in the "Get A Job" Career Operating System. You help users close skill gaps and build proof of skills for their target roles.

Your approach:
- Always start from the CAREER ROADMAP block in your context. Reference the user's actual matched_skills and missing_skills per role — never give generic skill advice when the user's real gap data is right there.
- Recommend specific, named courses (e.g. "Coursera: Google Data Analytics Certificate", "freeCodeCamp Responsive Web Design"). Cite the platform + course title.
- Suggest concrete projects the user can build to demonstrate skills to employers
- Build structured learning plans with realistic timelines when asked
- Prioritise by impact: which skill, if added, most improves their chances of landing a TRACK 1 role from their roadmap (use the readiness % to pick the highest-leverage role to close gaps for)?
- Be honest about timelines — don't oversell how fast gaps can be closed

URL discipline: Do NOT include URLs to specific courses. You don't have a real-time catalogue and any URL you write will likely be a hallucinated 404. Frame each recommendation as "search [platform] for [course title]" so the user self-verifies. If the user explicitly asks for links, say plainly that you can name the course but not the URL, and let them search.`,
  'resume-extractor': `You are a strict data extraction AI. Extract the requested fields from the resume text and format exactly as a valid JSON object. Do not include markdown formatting or commentary.`
}

// Server-side retry on transient OpenAI errors. Pairs with the B7
// frontend Retry button: 1 server attempt + 1 silent server retry +
// 1 manual frontend retry. Catches the common case where OpenAI 429s
// or 503s once and recovers immediately, invisible to the user.
//
// Permanent errors (4xx auth/validation) are NOT retried — retry
// won't help and just doubles latency / cost.
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504])

async function fetchOpenAIWithRetry(
  payload: Record<string, unknown>,
  apiKey: string,
  traceCtx: TraceContext,
  options: { timeoutMs?: number; retries?: number; backoffMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 45000, retries = 1, backoffMs = 1200 } = options
  let lastError: Response | Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      // openaiChatCompletion replaces the raw fetch — adds Langfuse tracing.
      // Each retry attempt emits its own trace (visibility into retry behaviour).
      const res = await openaiChatCompletion(payload, apiKey, traceCtx, { signal: ctrl.signal })
      clearTimeout(timer)
      // Success or permanent failure — return immediately, no retry.
      if (res.ok || !RETRYABLE_STATUSES.has(res.status)) return res
      // Transient failure — log and (if attempts remain) retry after backoff.
      console.warn(`[ai-chat] OpenAI ${res.status} on attempt ${attempt + 1}/${retries + 1}`)
      lastError = res
    } catch (err: any) {
      clearTimeout(timer)
      console.warn(`[ai-chat] OpenAI fetch error on attempt ${attempt + 1}/${retries + 1}:`, err?.message || err)
      lastError = err instanceof Error ? err : new Error(String(err))
    }
    if (attempt < retries) {
      // Jittered backoff to avoid thundering-herd on a transient outage.
      await new Promise((r) => setTimeout(r, backoffMs + Math.random() * 500))
    }
  }

  // All attempts exhausted. Return the last Response if we have one so the
  // caller's existing error path handles it. Otherwise throw the network error.
  if (lastError instanceof Response) return lastError
  throw lastError ?? new Error('OpenAI fetch failed (no response)')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const m = startMetric('ai-chat')
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

    const authHeader = req.headers.get('Authorization')!
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
      p_function_name: 'ai-chat',
      p_max_calls: RATE_LIMIT_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW,
    })
    if (!allowed) {
      _http = 429; _err = 'rate_limit'
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in an hour.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rawBody = await req.text()
    if (rawBody.length > 50_000) {
      _http = 413; _err = 'payload_too_large'
      return new Response(JSON.stringify({ error: 'Request payload too large.' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { message, agent, conversation_history = [], application_id, follow_up_after } = JSON.parse(rawBody)

    if (!message || !agent) {
      _http = 400; _err = 'missing_input'
      return new Response(JSON.stringify({ error: 'message and agent are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Path B follow-up trigger. The frontend sets this after a side-effect
    // completes (currently only 'cv_generation') so the agent can do a clean
    // second pass for things missed when the user had a competing explicit ask.
    // Whitelist the values to keep the contract tight.
    const VALID_FOLLOW_UPS = new Set(['cv_generation'])
    const safeFollowUp = typeof follow_up_after === 'string' && VALID_FOLLOW_UPS.has(follow_up_after)
      ? follow_up_after : null

    const [profileRes, experiencesRes, careerRolesRes] = await Promise.all([
      supabase.from('profiles').select('*, education(*)').eq('id', user.id),
      supabase.from('experiences').select('*').eq('user_id', user.id),
      supabase.from('career_roles').select('*').eq('user_id', user.id),
    ])
    const profile = profileRes.data?.[0]

    let userContext = ''
    if (profile) {
      const eduLine = formatEducationLine(pickPrimaryEducation((profile as any).education || []))
      userContext = `\n\nUSER PROFILE:\n- Name: ${profile.full_name || 'Not provided'}\n- Skills: ${(profile.skills || []).join(', ') || 'None listed'}\n- Education: ${eduLine}\n- Location: ${profile.location || 'Not provided'}\n- Summary: ${profile.summary || 'Not provided'}`
    }
    if (experiencesRes.data?.length) {
      // Include experience UUIDs so agents that emit story-capture or
      // experience-linked suggestions (cv-helper STORY_CAPTURE, future
      // career_agent / interview_coach uses) can pass the exact id back.
      // Same `[id: ...]` convention as ACTIVE APPLICATIONS below.
      userContext += `\n- Experience: ${experiencesRes.data.map((e: { id: string; title: string; company: string }) => `${e.title} at ${e.company} [id: ${e.id}]`).join(', ')}`
    }

    // Build career roles context — detailed for the agents that need to
    // reason about gaps (career_agent picks priorities, skill_development_agent
    // recommends learning to close them, interview_coach prepares answers
    // grounded in skill gaps + readiness); summary for others.
    if (careerRolesRes.data?.length) {
      if (agent === 'career_agent' || agent === 'skill_development_agent' || agent === 'interview_coach') {
        const byTrack: Record<string, typeof careerRolesRes.data> = { track_1: [], track_2: [], track_3: [], other: [] }
        for (const r of careerRolesRes.data) {
          const group = byTrack[r.track as string] ?? byTrack.other
          group.push(r)
        }
        userContext += '\n\nCAREER ROADMAP:'
        const trackLabels: Record<string, string> = { track_1: 'Track 1 (Your Move)', track_2: 'Track 2 (Plan B)', track_3: 'Track 3 (Work Toward)', other: 'Uncategorised' }
        for (const [track, label] of Object.entries(trackLabels)) {
          const roles = byTrack[track]
          if (!roles?.length) continue
          userContext += `\n${label}:`
          for (const r of roles) {
            userContext += `\n- ${r.title}`
            // DB stores scores as 0.0–1.0; render as percent.
            if (r.readiness_score != null) userContext += ` | Readiness: ${Math.round(Number(r.readiness_score) * 100)}%`
            if (r.goal_alignment_score != null) userContext += ` | Goal alignment: ${Math.round(Number(r.goal_alignment_score) * 100)}%`
            if ((r.matched_skills as string[])?.length) userContext += ` | Matched: ${(r.matched_skills as string[]).slice(0, 5).join(', ')}`
            if ((r.missing_skills as string[])?.length) userContext += ` | Gaps: ${(r.missing_skills as string[]).slice(0, 5).join(', ')}`
            if (r.alignment_reason) userContext += `\n  Alignment basis: ${r.alignment_reason}`
            if (r.reasoning) userContext += `\n  Reasoning: ${r.reasoning}`
          }
        }
      } else {
        userContext += `\n- Target Roles: ${careerRolesRes.data.map((r: { title: string }) => r.title).join(', ')}`
      }
    }

    // Fetch tasks for agents that support task suggestions and the career agent
    const agentSupportsTasks =
      agent === 'interview_coach' ||
      agent === 'skill_development_agent' ||
      agent === 'career_agent' ||
      agent === 'application_cv_success_agent' ||
      agent === 'cv-helper'
    if (agentSupportsTasks) {
      const { data: allTasks } = await supabase
        .from('tasks').select('title, is_complete').eq('user_id', user.id).limit(100)
      if (allTasks?.length) {
        const incomplete = allTasks.filter((t: { is_complete: boolean }) => !t.is_complete)
        const complete = allTasks.filter((t: { is_complete: boolean }) => t.is_complete)
        if (incomplete.length > 0) {
          userContext += `\n\nACTIVE TASKS (do not suggest duplicates):\n${incomplete.map((t: { title: string }) => `- ${t.title}`).join('\n')}`
        }
        if (complete.length > 0) {
          userContext += `\n\nCOMPLETED TASKS (do not re-suggest these either):\n${complete.map((t: { title: string }) => `- ${t.title}`).join('\n')}`
        }
      }
    }

    // Fetch active applications for the career agent and the CV agent. The CV
    // agent needs the application_id so it can match its CV generation proposals
    // to a specific tracked application; the career agent doesn't use the id.
    const agentWantsApplications =
      agent === 'career_agent' ||
      agent === 'application_cv_success_agent' ||
      agent === 'cv-helper'
    if (agentWantsApplications) {
      const { data: apps } = await supabase
        .from('applications')
        .select('id, role_title, company, status, track')
        .eq('user_id', user.id)
        .limit(20)
      if (apps?.length) {
        userContext += `\n\nACTIVE APPLICATIONS:\n${apps.map((a: { id: string; role_title: string; company: string; status: string; track: string }) => `- ${a.role_title}${a.company ? ` at ${a.company}` : ''} (${a.status}${a.track ? `, ${a.track}` : ''}) [id: ${a.id}]`).join('\n')}`
      }
    }

    // Practicum context — only for career_agent. Pulls the user's
    // internship_profile (pitch strategy) + company_targets (current
    // pipeline) + practicum_path so the agent knows whether the user is
    // in a practicum at all and what they're already tracking. Used by
    // COMPANY_TARGET_RULES for grounding + anti-fab (must reference a
    // company from this context for update_company_target_status).
    if (agent === 'career_agent') {
      const [practicumProfileRes, internshipProfileRes, companyTargetsRes] = await Promise.all([
        supabase.from('profiles').select('practicum_path, practicum_cohort, practicum_status').eq('id', user.id).maybeSingle(),
        supabase.from('internship_profiles').select('realistic_company_stages, realistic_sectors, pitchable_role_archetypes, pitch_strength_signals, skill_gaps_to_close').eq('user_id', user.id).maybeSingle(),
        supabase.from('company_targets')
          .select('id, status, source, pitched_role, companies (name, sector, stage)')
          .eq('user_id', user.id)
          .limit(20),
      ])
      const practicumProfile = practicumProfileRes.data as { practicum_path?: string; practicum_status?: string; practicum_cohort?: string } | null
      const internshipProfile = internshipProfileRes.data as {
        realistic_company_stages?: string[]
        realistic_sectors?: string[]
        pitchable_role_archetypes?: string[]
        pitch_strength_signals?: string[]
        skill_gaps_to_close?: string[]
      } | null
      const companyTargets = (companyTargetsRes.data || []) as Array<{
        id: string; status: string; source: string; pitched_role: string | null;
        companies: { name: string; sector: string | null; stage: string | null } | null
      }>

      const practicumPath = practicumProfile?.practicum_path || null
      if (practicumPath || internshipProfile || companyTargets.length > 0) {
        userContext += `\n\nINTERNSHIP PRACTICUM CONTEXT:`
        userContext += `\n- Practicum path: ${practicumPath || 'not set'}`
        if (practicumProfile?.practicum_status) userContext += `\n- Practicum status: ${practicumProfile.practicum_status}`
        if (practicumProfile?.practicum_cohort) userContext += `\n- Cohort: ${practicumProfile.practicum_cohort}`
        if (internshipProfile) {
          const lines = [
            internshipProfile.realistic_company_stages?.length ? `realistic stages: ${internshipProfile.realistic_company_stages.join(', ')}` : null,
            internshipProfile.realistic_sectors?.length ? `realistic sectors: ${internshipProfile.realistic_sectors.join(', ')}` : null,
            internshipProfile.pitchable_role_archetypes?.length ? `pitchable archetypes: ${internshipProfile.pitchable_role_archetypes.join(', ')}` : null,
            internshipProfile.pitch_strength_signals?.length ? `strength signals: ${internshipProfile.pitch_strength_signals.slice(0, 6).join(', ')}` : null,
            internshipProfile.skill_gaps_to_close?.length ? `skill gaps to close: ${internshipProfile.skill_gaps_to_close.slice(0, 6).join(', ')}` : null,
          ].filter(Boolean)
          if (lines.length > 0) userContext += `\n- Pitch strategy: ${lines.join(' | ')}`
        }
        if (companyTargets.length > 0) {
          userContext += `\n- Current pipeline (do not duplicate-add, do not invent status changes for companies not on this list):`
          for (const t of companyTargets) {
            const name = t.companies?.name || '(unnamed)'
            const sector = t.companies?.sector ? ` · ${t.companies.sector}` : ''
            const stage = t.companies?.stage ? ` · ${t.companies.stage}` : ''
            userContext += `\n  - ${name}${sector}${stage} (status: ${t.status}, source: ${t.source})`
          }
        }
      }
    }

    if (application_id && typeof application_id === 'string') {
      const { data: appData } = await supabase
        .from('applications')
        .select('role_title, company, job_description, skills_required, status')
        .eq('id', application_id).eq('user_id', user.id).single()
      if (appData) {
        // Explicit "application_id:" line so the LLM can copy the UUID into
        // any SUGGESTED_CV_GENERATION_JSON / SUGGESTED_APPLICATION_ACTIONS_JSON
        // block without confusion. Key name matches the field name the client
        // forwards to generate-tailored-cv.
        userContext += `\n\nTARGET APPLICATION (use this exact application_id in any CV or application actions — the user has already selected this via the dropdown; do NOT ask which role):\n- application_id: ${application_id}\n- Role: ${appData.role_title}\n- Company: ${appData.company || '(not set)'}\n- Status: ${appData.status}`
        if (appData.job_description) userContext += `\n- Job Description:\n${String(appData.job_description).slice(0, 2000)}`
        if (Array.isArray(appData.skills_required) && appData.skills_required.length > 0) {
          const proven = appData.skills_required.filter((s: { status: string }) => s.status === 'proven')
          const gaps = appData.skills_required.filter((s: { status: string }) => s.status === 'missing' || s.status === 'partial')
          if (proven.length > 0) userContext += `\n- Proven Skills: ${proven.map((s: { skill_name: string }) => s.skill_name).join(', ')}`
          if (gaps.length > 0) userContext += `\n- Skill Gaps: ${gaps.map((s: { skill_name: string; status: string }) => `${s.skill_name} (${s.status})`).join(', ')}`
        }
      }
    }

    const basePrompt = AGENT_SYSTEM_PROMPTS[agent] || AGENT_SYSTEM_PROMPTS['career-coach']
    let systemPrompt: string
    if (agent === 'resume-extractor') {
      systemPrompt = basePrompt + userContext
    } else if (agent === 'career_agent') {
      systemPrompt = basePrompt + TASK_SUGGESTION_RULES + ROADMAP_CHANGE_RULES + APPLICATION_ACTIONS_RULES + COMPANY_TARGET_RULES + CAREER_AGENT_REDIRECT_RULES + SCOPE_GUARD + NO_FABRICATION_GUARD + userContext
    } else if (agent === 'interview_coach') {
      systemPrompt = basePrompt + TASK_SUGGESTION_RULES + INTERVIEW_COACH_REDIRECT_RULES + SCOPE_GUARD + NO_FABRICATION_GUARD + userContext
    } else if (agent === 'skill_development_agent') {
      systemPrompt = basePrompt + TASK_SUGGESTION_RULES + SKILL_DEV_REDIRECT_RULES + SCOPE_GUARD + NO_FABRICATION_GUARD + userContext
    } else if (agent === 'application_cv_success_agent' || agent === 'cv-helper') {
      // Follow-up mode narrows the prompt — drops CV_GENERATION_RULES and
      // TASK_SUGGESTION_RULES so the agent isn't tempted to re-propose a CV
      // or a fresh task list on a turn that's purely a story-check pass.
      // STORY_CAPTURE_RULES still loads (so the agent knows the JSON shape +
      // discipline) AND STORY_CAPTURE_FOLLOWUP_RULES sits last so the
      // narrowed instruction takes precedence in the model's attention.
      systemPrompt = safeFollowUp === 'cv_generation'
        ? basePrompt + STORY_CAPTURE_RULES + STORY_CAPTURE_FOLLOWUP_RULES + SCOPE_GUARD + NO_FABRICATION_GUARD + userContext
        : basePrompt + CV_GENERATION_RULES + STORY_CAPTURE_RULES + TASK_SUGGESTION_RULES + CV_AGENT_REDIRECT_RULES + SCOPE_GUARD + NO_FABRICATION_GUARD + userContext
    } else {
      systemPrompt = basePrompt + SCOPE_GUARD + NO_FABRICATION_GUARD + userContext
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation_history.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]

    // temperature 0.4 + max_tokens 2048 (was 0.7 / 1024). Lower temp keeps
    // SUGGESTED_*_JSON markers + field names verbatim so the frontend's
    // extractJsonBlock parser doesn't miss them. Higher token cap stops the
    // CV agent's structured block from being truncated mid-emit, which was
    // causing the "Generate CV" button to never appear (A1/A2/A3 from the
    // session-13 audit). Aligned with generate-career-analysis (temp 0.4)
    // and generate-tasks (max 2048).
    //
    // Truncation retry: if 2048 STILL isn't enough (chat reply + multiple
    // structured blocks), one retry at 4096. Unlike analyze-job-match /
    // generate-tasks (where truncation = unparseable JSON = fatal error),
    // ai-chat tolerates truncation gracefully — even a partially-truncated
    // reply is more useful to the student than a 502. So if retry also
    // truncates, we still return what we got and let extractJsonBlock
    // best-effort the markers.
    const BASE_MAX_TOKENS = 2048
    const RETRY_MAX_TOKENS = 4096

    async function callOpenAI(maxTokens: number) {
      return await fetchOpenAIWithRetry(
        { model: MODEL, messages, temperature: 0.4, max_tokens: maxTokens },
        openaiKey,
        {
          traceName: 'ai-chat',
          userId: user.id,
          metadata: {
            agent,
            has_application_link: !!application_id,
            follow_up_after: follow_up_after || null,
            max_tokens: maxTokens,
          },
        },
      )
    }

    let openaiResponse = await callOpenAI(BASE_MAX_TOKENS)
    if (!openaiResponse.ok) {
      const errBody = await openaiResponse.text()
      console.error('OpenAI error:', errBody)
      // Persist the OpenAI failure so we can diagnose post-hoc — the
      // console.error logs aren't queryable from outside the Supabase
      // dashboard UI. log_error is best-effort; failure to log must not
      // mask the actual error response.
      try {
        await serviceClient.rpc('log_error', {
          p_user_id: user.id,
          p_function_name: 'ai-chat',
          p_error_message: `OpenAI ${openaiResponse.status} (agent=${agent})`,
          p_error_details: { status: openaiResponse.status, body: errBody.slice(0, 2000), agent },
        })
      } catch { /* swallow */ }
      _http = 502; _err = `openai_${openaiResponse.status}`
      m.modelUsed = MODEL
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let completion = await openaiResponse.json()
    let finishReason: string | undefined = completion.choices?.[0]?.finish_reason
    // Track usage additively across initial + retry. Both calls bill, so
    // the metric should reflect total consumption, not just the last response.
    m.modelUsed = MODEL
    m.tokensIn = completion.usage?.prompt_tokens ?? 0
    m.tokensOut = completion.usage?.completion_tokens ?? 0

    if (finishReason === 'length') {
      console.warn(`[ai-chat] truncation detected at max_tokens=${BASE_MAX_TOKENS}, retrying at ${RETRY_MAX_TOKENS}`)
      const retryResponse = await callOpenAI(RETRY_MAX_TOKENS)
      if (retryResponse.ok) {
        completion = await retryResponse.json()
        finishReason = completion.choices?.[0]?.finish_reason
        m.tokensIn = (m.tokensIn ?? 0) + (completion.usage?.prompt_tokens ?? 0)
        m.tokensOut = (m.tokensOut ?? 0) + (completion.usage?.completion_tokens ?? 0)
        if (finishReason === 'length') {
          console.warn(`[ai-chat] still truncated at max_tokens=${RETRY_MAX_TOKENS}; returning best-effort response`)
        }
      } else {
        console.warn(`[ai-chat] retry failed: ${retryResponse.status}; falling back to original truncated reply`)
      }
    }

    let reply: string = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'

    let suggested_tasks: Array<{ title: string; description: string; category: string; priority: string }> = []
    let suggested_agent: { agent: string; label: string; page: string; reason: string } | null = null
    let suggested_roadmap_changes: Array<{ action: string; role_title?: string; title?: string; new_track?: string; track?: string; reason: string }> | null = null

    // ─── Structured block extraction ──────────────────────────────────────
    // Important: ALWAYS strip the marker + JSON from `reply` whenever the
    // extractor parses it, regardless of whether the payload is valid for our
    // downstream fields. If we only strip "on success" the user ends up seeing
    // raw JSON in chat when the LLM emits a slightly-off shape (e.g. wraps
    // tasks in {tasks: [...]} instead of just [...]).
    const tasksResult = extractJsonBlock(reply, 'SUGGESTED_TASKS_JSON:')
    if (tasksResult) {
      reply = tasksResult.cleaned
      const VALID_CATEGORIES = new Set(['application', 'cv', 'skill', 'project', 'networking'])
      const VALID_PRIORITIES = new Set(['high', 'medium', 'low'])
      // Accept either a top-level array OR an object with a `tasks` array
      const arr = Array.isArray(tasksResult.parsed)
        ? tasksResult.parsed
        : (tasksResult.parsed && typeof tasksResult.parsed === 'object' && Array.isArray((tasksResult.parsed as any).tasks))
          ? (tasksResult.parsed as any).tasks
          : null
      if (Array.isArray(arr)) {
        suggested_tasks = (arr as Array<{ title: string; description: string; category: string; priority: string }>)
          .filter(t => t && typeof t.title === 'string' && t.title.trim())
          .map(t => ({
            ...t,
            category: VALID_CATEGORIES.has(t.category) ? t.category : 'application',
            priority: VALID_PRIORITIES.has(t.priority) ? t.priority : 'medium',
          }))
      }
    }

    const roadmapResult = extractJsonBlock(reply, 'SUGGESTED_ROADMAP_CHANGES_JSON:')
    if (roadmapResult) {
      reply = roadmapResult.cleaned
      const parsed = roadmapResult.parsed
      const changes = parsed && typeof parsed === 'object' && Array.isArray((parsed as any).changes)
        ? (parsed as any).changes as Array<{ action: string; role_title?: string; title?: string; new_track?: string; track?: string; matched_skills_proposed?: string[]; missing_skills_proposed?: string[]; readiness_score?: number; reasoning?: string; alignment_to_goal?: string; action_items?: string[]; reason: string }>
        : Array.isArray(parsed) ? parsed as any[] : null
      if (Array.isArray(changes) && changes.length > 0) {
        const VALID_TIERS = new Set(['track_1', 'track_2', 'track_3'])
        const VALID_ACTIONS = new Set(['update_track', 'add_role', 'remove_role'])
        const sanitiseSkillArray = (arr: any): string[] | undefined => {
          if (!Array.isArray(arr)) return undefined
          return arr.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
                    .slice(0, 20)
                    .map((s: string) => s.trim())
        }
        const sanitiseTextSrv = (s: any, maxLen = 500): string => {
          if (typeof s !== 'string') return ''
          return s.trim().slice(0, maxLen)
        }
        const clampScoreSrv = (n: any): number | null => {
          const v = Number(n)
          if (Number.isNaN(v)) return null
          return Math.max(0, Math.min(1, v))
        }
        const sanitiseActionItemsSrv = (arr: any): string[] | undefined => {
          if (!Array.isArray(arr)) return undefined
          return arr.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
                    .map((s: string) => s.trim().slice(0, 200))
                    .slice(0, 5)
        }
        const validChanges = changes
          .filter(c => c && VALID_ACTIONS.has(c.action))
          .map(c => {
            const out: any = { ...c }
            if (c.new_track) out.new_track = VALID_TIERS.has(c.new_track) ? c.new_track : 'track_2'
            if (c.track) out.track = VALID_TIERS.has(c.track) ? c.track : 'track_2'
            // Preserve key presence: if AI emitted any of these (even as an
            // empty array/null), keep the key so the handler distinguishes
            // "AI provided" from "AI didn't try".
            if ('matched_skills_proposed' in c) out.matched_skills_proposed = sanitiseSkillArray(c.matched_skills_proposed) ?? []
            if ('missing_skills_proposed' in c) out.missing_skills_proposed = sanitiseSkillArray(c.missing_skills_proposed) ?? []
            if ('readiness_score' in c) {
              const v = clampScoreSrv(c.readiness_score)
              if (v !== null) out.readiness_score = v
            }
            if ('reasoning' in c) out.reasoning = sanitiseTextSrv(c.reasoning, 500)
            if ('alignment_to_goal' in c) out.alignment_to_goal = sanitiseTextSrv(c.alignment_to_goal, 500)
            if ('action_items' in c) out.action_items = sanitiseActionItemsSrv(c.action_items) ?? []
            return out
          })
        if (validChanges.length > 0) suggested_roadmap_changes = validChanges
      }
    }

    const agentResult = extractJsonBlock(reply, 'SUGGESTED_AGENT_JSON:')
    if (agentResult) {
      reply = agentResult.cleaned
      if (typeof agentResult.parsed === 'object' && agentResult.parsed !== null) {
        suggested_agent = agentResult.parsed as { agent: string; label: string; page: string; reason: string }
      }
    }

    // Application tracker actions (career_agent only).
    type AppAction = {
      action: 'add_application' | 'update_application'
      company?: string
      role_title?: string
      status?: string
      track?: string
      url?: string
      location?: string
      notes?: string
      match_company?: string
      match_role_title?: string
      new_status?: string
      new_interview_stage?: string
      new_notes?: string
      new_track?: string
    }
    // CV generation proposal (CV agent only). The client uses this to render a
    // CVGenerationCard with a "Generate CV" button that calls the
    // generate-tailored-cv edge function when the user confirms.
    type CVGen = { target_role: string; application_id?: string | null; job_description?: string }
    let suggested_cv_generation: CVGen | null = null
    const cvGenResult = extractJsonBlock(reply, 'SUGGESTED_CV_GENERATION_JSON:')
    if (cvGenResult) {
      reply = cvGenResult.cleaned
      const parsed = cvGenResult.parsed as CVGen | null
      if (parsed && typeof parsed === 'object' && typeof parsed.target_role === 'string' && parsed.target_role.trim()) {
        suggested_cv_generation = {
          target_role: String(parsed.target_role).slice(0, 200).trim(),
          ...(typeof parsed.application_id === 'string' && parsed.application_id.trim()
            ? { application_id: parsed.application_id.trim() }
            : {}),
          ...(typeof parsed.job_description === 'string' && parsed.job_description.trim()
            ? { job_description: String(parsed.job_description).slice(0, 5000) }
            : {}),
        }
      }
    }

    // Story capture proposal (CV agents only). Raw user narrative + optional
    // experience_id link; the frontend's StorySaveCard calls
    // extract-story-from-text on confirm to do the STAR parsing. Keeping the
    // capture/extraction split as the design's safety mechanism — every
    // fabrication mistake is caught before storage.
    type StoryCapture = { text: string; experience_id?: string | null; framing?: string }
    let suggested_story_capture: StoryCapture | null = null
    const storyCaptureResult = extractJsonBlock(reply, 'SUGGESTED_STORY_CAPTURE_JSON:')
    if (storyCaptureResult) {
      reply = storyCaptureResult.cleaned
      const parsed = storyCaptureResult.parsed as StoryCapture | null
      if (parsed && typeof parsed === 'object' && typeof parsed.text === 'string' && parsed.text.trim()) {
        const isUuid = (v: unknown): v is string =>
          typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
        suggested_story_capture = {
          text: String(parsed.text).slice(0, 5000).trim(),
          ...(isUuid(parsed.experience_id) ? { experience_id: parsed.experience_id } : { experience_id: null }),
          ...(typeof parsed.framing === 'string' && parsed.framing.trim()
            ? { framing: String(parsed.framing).slice(0, 200).trim() }
            : {}),
        }
      }
    }

    let suggested_application_actions: AppAction[] | null = null
    const appActionsResult = extractJsonBlock(reply, 'SUGGESTED_APPLICATION_ACTIONS_JSON:')
    if (appActionsResult) {
      reply = appActionsResult.cleaned
      const parsed = appActionsResult.parsed
      const actions = parsed && typeof parsed === 'object' && Array.isArray((parsed as any).actions)
        ? (parsed as any).actions as AppAction[]
        : Array.isArray(parsed) ? parsed as AppAction[] : null
      if (Array.isArray(actions) && actions.length > 0) {
        const VALID_STATUSES = new Set(['interested', 'preparing', 'applied', 'interviewing', 'offer', 'rejected'])
        const VALID_TIERS = new Set(['track_1', 'track_2', 'track_3'])
        const VALID_ACTIONS = new Set(['add_application', 'update_application'])
        const cleaned: AppAction[] = []
        for (const raw of actions) {
          if (!VALID_ACTIONS.has(raw.action)) continue
          if (raw.action === 'add_application') {
            if (!raw.company?.trim() || !raw.role_title?.trim()) continue
            cleaned.push({
              action: 'add_application',
              company: String(raw.company).slice(0, 200).trim(),
              role_title: String(raw.role_title).slice(0, 200).trim(),
              status: raw.status && VALID_STATUSES.has(raw.status) ? raw.status : 'interested',
              ...(raw.track && VALID_TIERS.has(raw.track) && { track: raw.track }),
              ...(raw.url && { url: String(raw.url).slice(0, 2000) }),
              ...(raw.location && { location: String(raw.location).slice(0, 200) }),
              ...(raw.notes && { notes: String(raw.notes).slice(0, 2000) }),
            })
          } else {
            if (!raw.match_company?.trim() || !raw.match_role_title?.trim()) continue
            if (!raw.new_status && !raw.new_interview_stage && !raw.new_notes && !raw.new_track) continue
            cleaned.push({
              action: 'update_application',
              match_company: String(raw.match_company).slice(0, 200).trim(),
              match_role_title: String(raw.match_role_title).slice(0, 200).trim(),
              ...(raw.new_status && VALID_STATUSES.has(raw.new_status) && { new_status: raw.new_status }),
              ...(raw.new_interview_stage && { new_interview_stage: String(raw.new_interview_stage).slice(0, 100) }),
              ...(raw.new_notes && { new_notes: String(raw.new_notes).slice(0, 2000) }),
              ...(raw.new_track && VALID_TIERS.has(raw.new_track) && { new_track: raw.new_track }),
            })
          }
        }
        if (cleaned.length > 0) suggested_application_actions = cleaned
      }
    }

    // Company target actions (career_agent only). Three action shapes:
    // add_company_target / update_company_target_status / enrich_company.
    // Server-side anti-fab: drop any action whose company name doesn't
    // appear in the last few user messages or the assistant's current
    // reply (LLMs love inventing plausible Israeli startup names).
    type CompanyTargetAction =
      | { action: 'add_company_target'; company_name: string; company_domain?: string; company_sector?: string; pitched_role?: string; pitch_rationale?: string; skill_gaps_this_fills?: string[]; notes?: string }
      | { action: 'update_company_target_status'; match_company: string; new_status: string; note?: string }
      | { action: 'enrich_company'; match_company: string; description?: string; sector?: string; domain?: string; industry?: string }
    let suggested_company_target_actions: CompanyTargetAction[] | null = null
    const ctActionsResult = extractJsonBlock(reply, 'SUGGESTED_COMPANY_TARGET_JSON:')
    if (ctActionsResult) {
      reply = ctActionsResult.cleaned
      const parsed = ctActionsResult.parsed
      const actions = parsed && typeof parsed === 'object' && Array.isArray((parsed as any).actions)
        ? (parsed as any).actions as Array<any>
        : Array.isArray(parsed) ? parsed as Array<any> : null
      if (Array.isArray(actions) && actions.length > 0) {
        const VALID_STATUSES = new Set(['exploring', 'outreach_sent', 'interview', 'offered', 'rejected', 'declined'])
        const VALID_ACTIONS = new Set(['add_company_target', 'update_company_target_status', 'enrich_company'])

        // Anti-fab corpus: the last 3 user messages + current assistant reply.
        // Any company name in an action must appear (case-insensitive
        // substring) somewhere in this haystack. Prevents the model from
        // inventing companies the user never mentioned.
        const recentUserTurns = conversation_history
          .filter((m: { role: string; content: string }) => m.role === 'user')
          .slice(-3)
          .map((m: { content: string }) => m.content)
        const haystack = (
          recentUserTurns.join('\n') +
          '\n' + message +
          '\n' + reply
        ).toLowerCase()
        const isGroundedCompany = (name: string): boolean => {
          if (!name) return false
          return haystack.includes(name.trim().toLowerCase())
        }

        const cleaned: CompanyTargetAction[] = []
        for (const raw of actions) {
          if (!raw || !VALID_ACTIONS.has(raw.action)) continue
          if (raw.action === 'add_company_target') {
            const company_name = typeof raw.company_name === 'string' ? raw.company_name.trim() : ''
            if (!company_name) continue
            if (!isGroundedCompany(company_name)) {
              console.warn('[ai-chat] dropped add_company_target — name not grounded:', company_name)
              continue
            }
            const skillGaps = Array.isArray(raw.skill_gaps_this_fills)
              ? raw.skill_gaps_this_fills
                  .filter((s: unknown) => typeof s === 'string' && s.trim().length > 0)
                  .map((s: string) => s.trim().slice(0, 100))
                  .slice(0, 5)
              : []
            cleaned.push({
              action: 'add_company_target',
              company_name: company_name.slice(0, 200),
              ...(typeof raw.company_domain === 'string' && raw.company_domain.trim() && { company_domain: raw.company_domain.trim().slice(0, 200) }),
              ...(typeof raw.company_sector === 'string' && raw.company_sector.trim() && { company_sector: raw.company_sector.trim().slice(0, 100) }),
              ...(typeof raw.pitched_role === 'string' && raw.pitched_role.trim() && { pitched_role: raw.pitched_role.trim().slice(0, 200) }),
              ...(typeof raw.pitch_rationale === 'string' && raw.pitch_rationale.trim() && { pitch_rationale: raw.pitch_rationale.trim().slice(0, 600) }),
              ...(skillGaps.length > 0 && { skill_gaps_this_fills: skillGaps }),
              ...(typeof raw.notes === 'string' && raw.notes.trim() && { notes: raw.notes.trim().slice(0, 2000) }),
            })
          } else if (raw.action === 'update_company_target_status') {
            const match_company = typeof raw.match_company === 'string' ? raw.match_company.trim() : ''
            const new_status = typeof raw.new_status === 'string' ? raw.new_status.trim() : ''
            if (!match_company || !VALID_STATUSES.has(new_status)) continue
            if (!isGroundedCompany(match_company)) {
              console.warn('[ai-chat] dropped update_company_target_status — name not grounded:', match_company)
              continue
            }
            cleaned.push({
              action: 'update_company_target_status',
              match_company: match_company.slice(0, 200),
              new_status,
              ...(typeof raw.note === 'string' && raw.note.trim() && { note: raw.note.trim().slice(0, 1000) }),
            })
          } else {
            // enrich_company
            const match_company = typeof raw.match_company === 'string' ? raw.match_company.trim() : ''
            if (!match_company) continue
            if (!isGroundedCompany(match_company)) {
              console.warn('[ai-chat] dropped enrich_company — name not grounded:', match_company)
              continue
            }
            const description = typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim().slice(0, 1000) : undefined
            const sector = typeof raw.sector === 'string' && raw.sector.trim() ? raw.sector.trim().slice(0, 100) : undefined
            const domain = typeof raw.domain === 'string' && raw.domain.trim() ? raw.domain.trim().slice(0, 200) : undefined
            const industry = typeof raw.industry === 'string' && raw.industry.trim() ? raw.industry.trim().slice(0, 100) : undefined
            if (!description && !sector && !domain && !industry) continue
            cleaned.push({
              action: 'enrich_company',
              match_company: match_company.slice(0, 200),
              ...(description && { description }),
              ...(sector && { sector }),
              ...(domain && { domain }),
              ...(industry && { industry }),
            })
          }
        }
        if (cleaned.length > 0) suggested_company_target_actions = cleaned
      }
    }

    // Belt-and-suspenders sweep: if any marker still survives in the reply
    // (malformed JSON that extractJsonBlock couldn't parse, or a marker with
    // no JSON at all), strip from the marker through the end of the surrounding
    // block so the user never sees a raw `SUGGESTED_*_JSON:` string.
    const STRUCTURED_MARKERS = [
      'SUGGESTED_TASKS_JSON:',
      'SUGGESTED_ROADMAP_CHANGES_JSON:',
      'SUGGESTED_AGENT_JSON:',
      'SUGGESTED_APPLICATION_ACTIONS_JSON:',
      'SUGGESTED_COMPANY_TARGET_JSON:',
      'SUGGESTED_CV_GENERATION_JSON:',
      'SUGGESTED_STORY_CAPTURE_JSON:',
    ]
    for (const marker of STRUCTURED_MARKERS) {
      const idx = reply.indexOf(marker)
      if (idx === -1) continue
      // Drop everything from the marker onward — the whole structured block
      // is always the LAST thing in the response by design, so this is safe.
      reply = reply.slice(0, idx).replace(/\n+\s*$/, '').trim()
    }

    _ok = true; _http = 200
    return new Response(JSON.stringify({
      reply,
      agent,
      ...(suggested_tasks.length > 0 && { suggested_tasks }),
      ...(suggested_agent && { suggested_agent }),
      ...(suggested_roadmap_changes && { suggested_roadmap_changes }),
      ...(suggested_application_actions && { suggested_application_actions }),
      ...(suggested_company_target_actions && { suggested_company_target_actions }),
      ...(suggested_cv_generation && { suggested_cv_generation }),
      ...(suggested_story_capture && { suggested_story_capture }),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('ai-chat error:', error)
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})
