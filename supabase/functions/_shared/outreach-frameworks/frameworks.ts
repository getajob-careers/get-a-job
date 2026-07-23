// frameworks.ts — per-outreach-goal coaching templates injected into the
// LLM system prompt alongside OUTREACH_VOICE_RULES.
//
// Each framework specifies: opening tone for cold contact, warm-up
// requirements (multi-step goals like ask_for_referral need rapport
// before the ask), ask timing, what "goal_complete" looks like, and
// per-recipient register guidance (recruiter vs alumni vs hiring
// manager all want different framings).
//
// Per Eli's design call PR #34: per-goal templates over a single
// universal outreach prompt. Same architectural pattern as the post
// frameworks — explicit structure produces sharper output than relying
// on the LLM to infer the right register from inputs.
//
// Grounded in docs/research/linkedin-post-performance.md sections 5-6
// (recipient-type reply rates, connection-note research, networking
// principles). Reply rates by recipient: HR/TA ~12.1%, hiring managers
// ~6%, first-degree connections ~16.9%. These shape per-goal expectations.
//
// CRITICAL ANTI-PATTERN — the "ask immediately" trap:
// The default LLM behavior on outreach is to ask for the thing in the
// first message because that's what the user told it to do. For
// multi-step goals (ask_for_referral, request_informational_interview,
// reconnect_dormant), this is wrong. The framework must explicitly
// coach: "do NOT make the ask in the first message; warm up first."
// The AI emits a `warm_up_advice` field when the user pushes for the
// ask too early — this is what makes this a conversation coach, not a
// message generator.

export const MESSAGE_RECRUITER_FRAMEWORK = `OUTREACH GOAL — MESSAGE A RECRUITER:

The user is reaching out to a recruiter / talent acquisition person about a role. RECRUITERS HAVE THE HIGHEST REPLY RATES of any outreach target (~12.1% per our research) — they read DMs as part of the job. The bar is not to be charming; the bar is to be respectful of their time and easy to act on.

OPENER STRUCTURE (50-150 words, OR ≤200 chars if it's a connection-request note):
1. First sentence — state who you are and what you're interested in. No "I hope this finds you well." No "I came across your profile."
2. Second sentence — the specific role / type of role. If you saw an open req, name it. If you're cold, name the function + level.
3. Third sentence — ONE concrete signal: a relevant recent project, a metric, a course, a prior internship. Not your whole resume.
4. Closing — explicit, low-friction ask: "Open to a quick chat?" or "Happy to send my resume if there's a fit."

EXAMPLES:
- Good: "Hi Sarah! Saw you're hiring for a Customer Success Specialist. I'm a final-year business student headed into CS in B2B SaaS, and on my last internship I built a Slack bot that auto-flagged stuck deals and saved the team 8 hours a week. Worth a quick chat about whether I'd be a fit?"
- Bad: "Hi Sarah, I hope this finds you well. I came across your profile and was very impressed by your background. I would love to connect and learn more about opportunities at your company."

ASK TIMING:
The ask is in the FIRST message — that's the contract with recruiters. Do NOT advise warming up first. Recruiters expect a clear ask; they're paid to triage them.

WARM-UP ADVICE TRIGGERS:
- The user is targeting a non-listed role with a vague ask → coach toward naming a specific function/level
- The opener is more than 150 words → coach to cut

GOAL_COMPLETE SIGNAL:
Recruiter has either (a) replied with interest + next-step (interview, screen, calendar link), (b) replied with a specific "no fit right now" + offered to keep on file, or (c) passed the user to another recruiter. In all three, the conversation has done its job.

RECIPIENT REGISTER:
Direct, professional, brief. Recruiters skim. They want to know in 5 seconds: who, what role, what's the signal, what do they want me to do.`

export const MESSAGE_HIRING_MANAGER_FRAMEWORK = `OUTREACH GOAL — MESSAGE A HIRING MANAGER:

The user is reaching out to the person who would actually be their boss — function head, team lead, founder. REPLY RATE IS LOWER (~6%) than recruiters because hiring managers don't read DMs as part of the job; they're busy doing the work. The bar is much higher: you must be obviously worth a 30-second read, and the message must respect that they're not in recruiting mode.

OPENER STRUCTURE (50-150 words):
1. First sentence — who you are + a hook that signals you've actually thought about THEIR work, not just any company. This is what differentiates from spam.
2. Second sentence — the specific connection: a post they wrote, a product they shipped, a talk they gave, a problem you saw their team is working on.
3. Third sentence — ONE concrete signal of relevance — work you've done that maps to what they're hiring for, NOT your full resume.
4. Closing — soft ask. "Would love 15 minutes to learn how your team thinks about [specific thing]" beats "Are you hiring?" Hiring managers are more responsive to learning conversations than to direct asks (it's about how their job works, not coyness).

EXAMPLES:
- Good: "Hi Daniel - your post last week on rethinking onboarding for SMB CS stuck with me, especially the 'time-to-value vs feature breadth' framing. I spent my last internship shadowing the renewal cohort and built a Slack bot that flagged stuck deals, so I'd love to hear how your team thinks about the same problem at your scale. Open to 15 minutes in the next couple weeks?"
- Bad: "Hi Daniel, I noticed your company is hiring and I would love to be considered. Please find my resume attached. Thank you for your time."

ASK TIMING:
The ask is implicit in the first message — a "learning conversation" framing, not a "job please" framing. After the call, if it goes well, the explicit "I'd love to be considered for X role" can come.

WARM-UP ADVICE TRIGGERS:
- The opener treats the hiring manager like a recruiter ("Are you hiring?") → coach toward learning-conversation framing
- No specific reference to the manager's actual work → coach to find one (a post, a talk, a product line)
- The user treats this as one-shot when it should be a follow-up to an earlier touchpoint → coach to acknowledge the prior context

GOAL_COMPLETE SIGNAL:
Hiring manager replied with: (a) a yes to the call, (b) a no with a referral to someone on their team, or (c) a thoughtful explanation of why now isn't the right time. All three close the loop.

RECIPIENT REGISTER:
Peer-to-peer respect, not job-seeker desperate. The user is asking for the manager's TIME, which is the manager's most expensive resource. The message must visibly justify the spend.`

export const MESSAGE_ALUMNI_FRAMEWORK = `OUTREACH GOAL — MESSAGE AN ALUM FROM YOUR SCHOOL:

The user is reaching out to a fellow alum from their school or program. ALUMNI RESPOND AT VERY HIGH RATES because the shared affiliation is real social capital — a strong professional norm in most cultures is to help fellow alumni. Don't squander this by being vague.

OPENER STRUCTURE (50-150 words, OR ≤200 chars connection note):
1. First sentence — lead with the alumni connection. "Fellow [school] grad here — finishing this June, you're class of 2018." This activates the social capital up front.
2. Second sentence — what they're doing now that's relevant + the specific reason you're reaching out. Be concrete.
3. Third sentence — what you specifically want from them. Alumni want to help but don't know HOW unless you tell them.
4. Closing — explicit, easy-to-say-yes ask. "Open to a 20-min coffee?" "Happy to send a few specific questions you can answer async if easier."

EXAMPLES:
- Good: "Hi Maya! Fellow alum here, finishing my degree this June. Saw you've been in CS at your company for 3 years now - that's exactly the path I'm chasing (B2B SaaS, CS function). Would love 20 minutes to ask how you picked between the offers you had post-grad, and what you'd tell your final-year self about breaking into CS. Coffee, call, or async voice notes, whatever's easiest?"
- Bad: "Hi Maya, I noticed you went to my school. I would love to connect and pick your brain about your career."

ASK TIMING:
The ask is in the first message — alumni outreach without an ask reads as "what does this person want from me?" and creates anxiety. A clear, small, specific ask up front is the gift.

WARM-UP ADVICE TRIGGERS:
- "Pick your brain" or "love to chat" without a specific topic → coach toward a specific question
- 30-min ask → suggest 20 min (more likely to get a yes)
- No mention of why the alum specifically (vs any random alum) → coach to add the specific reason

GOAL_COMPLETE SIGNAL:
Alum replied with a yes to the meeting, async answers, or a referral to another more relevant alum. All three close the loop.

RECIPIENT REGISTER:
Warm, specific, peer-to-peer. The shared school affiliation lets the user skip "I hope this finds you well" — the connection is already there. Match the directness of the alum's LinkedIn presence; don't over-hedge.`

export const REQUEST_INFORMATIONAL_INTERVIEW_FRAMEWORK = `OUTREACH GOAL — REQUEST AN INFORMATIONAL INTERVIEW:

The user is asking to spend 20-30 minutes with someone working in a role/company/function they're interested in, to learn how that person got there and what the work is actually like. This is a SPECIFIC FORMAT — informational interviews are NOT veiled job asks; they are genuine learning conversations. Treating them as veiled job asks is the fastest way to get ghosted.

OPENER STRUCTURE (50-150 words):
1. First sentence — who you are + what you're trying to learn (not "what you want from them"). Frame the user as someone TRYING TO MAKE A DECISION, not someone trying to get a job.
2. Second sentence — why this person specifically. Their background, their company, their function — what makes them the right person to talk to about your specific question. Vague compliments are spam; specific reasons are real.
3. Third sentence — what the conversation would actually be about. 2-3 specific questions you'd ask. This is what makes the request easy to say yes to.
4. Closing — explicit ask for time. 20-30 minutes is the standard. Phone or async are both fine — offer flexibility.

EXAMPLES:
- Good: "Hi David! I'm trying to decide between Customer Success and Product Marketing for my first role, and you're the rare person who's actually done both - three years in CS, then the jump to PMM. Would love 25 minutes to ask: what surprised you about PMM coming from CS? What's the day-to-day actually like? What would've made the move easier? Happy to do it async over voice notes if a call's hard to fit."
- Bad: "Hi David, I would love to learn more about your career path. Are you free for a coffee?"

ASK TIMING:
The ask IS the message. Don't warm up first — informational interview requests are direct. The framing as "I'm trying to learn" is what makes the ask work; it's not coy.

WARM-UP ADVICE TRIGGERS:
- The questions are vague ("what's it like to work in CS?") → coach toward 2-3 specific questions
- The framing is "are you hiring" disguised as informational → coach to either commit to genuine informational OR switch goal to message_recruiter / message_hiring_manager
- 60-min ask → suggest 25 min

GOAL_COMPLETE SIGNAL:
Person replied with a yes (calendar slot, voice-note offer, async question form), OR a no with a referral to a better-fit person. Both close the loop. A pure no without referral is also goal_complete — sometimes informational asks aren't picked up; the user logged the touch and moves on.

RECIPIENT REGISTER:
Curious learner, not job seeker. The user is asking for the person's PERSPECTIVE — that's what informational interviews are for. People give perspective generously when they don't feel the user wants their job slot.`

export const THANK_YOU_FOLLOW_UP_FRAMEWORK = `OUTREACH GOAL — THANK YOU AFTER A CONVERSATION / INTERVIEW:

The user just had a meeting (interview, informational coffee, intro call) and is following up to thank the person. This is one of the highest-leverage messages in professional life — almost no one does it well, and the people who do are remembered. Bar is to be specific about what was useful, NOT a generic "thanks for your time."

OPENER STRUCTURE (50-150 words):
1. First sentence — direct, specific thank you. NOT "I just wanted to thank you for taking the time to chat." Lead with what was useful: "Your point about [specific thing they said] is sticking with me."
2. Second sentence — what you took from the conversation. Reference 1-2 specific things they said, named back at them. This proves you actually listened.
3. Third sentence — what you're doing with what they said. "I'm going to talk to [person they suggested] this week." "I'm rewriting my cover letter using the framing you described." Specific.
4. Closing — appropriate next-step. If interview: "Looking forward to hearing about next steps" + restate specific interest. If informational: "I'll keep you posted on what I decide" or "Definitely open to staying in touch."

EXAMPLES:
- Good: "Hi Maya - really appreciated the 25 minutes today. Your point about CS being where 'you learn what the customer's job actually is' before moving into product is reframing how I'm thinking about the next two years. I'm reaching out to Daniel next week (the alum you mentioned) - thanks for the intro offer. And if a CS slot opens on your team in Q3, I'd love to be on your radar."
- Bad: "Hi Maya, thank you so much for taking the time to chat with me yesterday. I really enjoyed our conversation and learned a lot. I would love to stay in touch."

ASK TIMING:
There is no ASK in a thank-you message — it's closing the loop. Restating interest is fine; demanding next steps is not. If there's a clear next step from the conversation (intro to someone, follow-up question), reference it concretely.

WARM-UP ADVICE TRIGGERS:
- Generic "thank you for your time" with no specifics → coach to name 1-2 things they said
- Adding a NEW ask not part of the original conversation → coach to keep that for a separate message
- More than 24-48 hours since the meeting → coach to send NOW, not later (timeliness matters)

GOAL_COMPLETE SIGNAL:
Thank-you sent, conversation closed. Goal_complete the moment the message goes out — there's no required reply for the goal to count as achieved. If they reply, that's a bonus.

RECIPIENT REGISTER:
Warm, specific, brief. This is the message that builds long-term reputation. Hedging ("I just wanted to") undercuts it.`

export const RECONNECT_DORMANT_FRAMEWORK = `OUTREACH GOAL — RECONNECT WITH A DORMANT CONNECTION:

The user has someone in their network they haven't talked to in 6+ months — former colleague, classmate, intern peer, manager from a past role — and wants to re-engage. THIS IS A MULTI-STEP GOAL: do NOT make an ask in the first message. The first message must be 100% reconnection, no ask, no agenda. Only after a real exchange does the user bring up what they need.

OPENER STRUCTURE (50-100 words, lighter than other goals):
1. First sentence — acknowledge the gap honestly. "Hey — been a while since [shared context]." NOT "I hope this finds you well." NOT pretending no time passed.
2. Second sentence — a specific, real reason for thinking of them now: their recent post, their job change, an article that reminded you of something you discussed, a mutual person you ran into. Concrete.
3. Third sentence — ask how they are, briefly. Not as filler — as actual interest. Reference what you know they were working on.
4. Closing — leave it open. NO ask. NO meeting request. NO "would love to catch up sometime" (which translates to "I want something").

EXAMPLES:
- Good: "Hey Maya! Feels like ages since the marketing strategy group. Saw your post about the move into the new PMM role last month - congrats! Last I knew you were torn between staying put and trying B2B SaaS, so sounds like the call landed. How are the first 90 days going?"
- Bad: "Hi Maya, I hope this finds you well. It's been a while! I was wondering if you might be able to introduce me to someone at your company — I'm looking at PMM roles."

ASK TIMING — CRITICAL:
The ask is NEVER in the first reconnection message. If the user wants to ask for something (referral, intro, advice), the AI should EXPLICITLY coach: "Send this opener first. Wait for a real reply. Then in turn 2 or 3, once they've engaged, you can bring up what you need." This is the load-bearing rule of this goal.

WARM-UP ADVICE TRIGGERS (CRITICAL — fires often on this goal):
- User pasted an opener that includes any kind of ask → emit warm_up_advice: "Reconnection messages with an ask in turn 1 read as transactional. Send this without the ask first. After they reply, in your next turn we'll work the ask in naturally."
- Opener pretends no time has passed ("Hey, just wanted to say hi") → coach to acknowledge the gap honestly
- "Long time no speak, hope you're well" with nothing real → coach to add a specific real reason for thinking of them now

GOAL_COMPLETE SIGNAL:
For pure reconnection (no further ask): goal_complete the moment they reply with engagement. The relationship is re-warmed; future asks can come later.
If the conversation evolved into an ask (intro, referral, etc.) and the ask was answered: goal_complete when the ask is handled.

RECIPIENT REGISTER:
Warm, low-pressure, peer-to-peer. The user is rebuilding a relationship, not extracting a favor. Un-transactional reconnection compounds over time — the people who do it well are the ones who get help later.`

export const ASK_FOR_REFERRAL_FRAMEWORK = `OUTREACH GOAL — ASK FOR A REFERRAL:

The user wants someone in their network to refer them to a specific role at the person's company. THIS IS A MULTI-STEP GOAL — referrals are a real ask of social capital and trust. The framework distinguishes two paths based on relationship temperature:

PATH A — strong existing relationship (former manager, close colleague, frequent contact):
Direct ask is appropriate in turn 1. Skip the warm-up, make the ask clean.

PATH B — warm but dormant relationship (worked together once, classmate from a course, met at one event):
DO NOT ask in turn 1. Reconnect first. Make the ask in turn 2 or 3 only after they've engaged. The AI should detect this from the relationship description and coach accordingly.

OPENER STRUCTURE (50-150 words):

PATH A (direct ask):
1. Opening — name the relationship + specific reason to ask them. "You knew my work on the renewal-cohort project better than anyone."
2. The role — specific role title + req link if available + company.
3. Why you're a fit — 2-3 specific signals tied to the role. Not your full resume.
4. The ask — clean and explicit. "Would you be open to referring me?" + offer of materials. "Happy to send the tailored resume + a 1-pager on why this fit makes sense."

PATH B (warm-up first — see RECONNECT_DORMANT_FRAMEWORK):
First message is reconnection only. The ask goes in turn 2 or 3.

EXAMPLES (Path A):
- Good: "Hi Sarah! Saw your company posted the Customer Success Specialist role yesterday (req here: [link]) and thought of you right away - you managed me in CS for 8 months and saw the renewal-cohort work firsthand. Would you be open to referring me? Happy to send the tailored resume plus a 1-page brief on why the fit makes sense given the team's ICP shift toward enterprise."
- Bad (Path B violation): "Hey, long time no speak! I saw a role at your company and was wondering if you'd be willing to refer me?"

ASK TIMING:
Path A: turn 1. Path B: turn 2-3, after a real exchange.

WARM-UP ADVICE TRIGGERS (CRITICAL — fires often):
- User describes the relationship as dormant / weak / loose (e.g. "we worked together briefly", "I knew them from one course", "haven't spoken in a year") AND the opener has the ask in it → emit warm_up_advice: "This relationship is warm but not strong enough for a turn-1 ask. Send a reconnection message first, then bring up the referral in your next turn. Path B is the play here."
- The role isn't named specifically → coach to name the exact role + req link
- The "why I'm a fit" is generic → coach to give 2-3 specific signals

GOAL_COMPLETE SIGNAL:
Person replied with: (a) a yes to refer + asked for materials, (b) a yes to refer + already submitted, (c) a no with a referral to a colleague who's a better fit, (d) a no with explanation. All four close the loop on the ask.

RECIPIENT REGISTER:
Respectful of the social capital being requested. Referrals stake the referrer's reputation on the referred — the message must implicitly acknowledge that. NOT desperate, NOT entitled. Calm, direct, easy to say yes to.`

export const ASK_FOR_RECOMMENDATION_FRAMEWORK = `OUTREACH GOAL — ASK FOR A LINKEDIN RECOMMENDATION:

The user wants a LinkedIn recommendation from someone they worked with — former manager, professor, mentor, internship lead. THIS IS A REAL ASK — writing a thoughtful recommendation takes 30+ minutes. The framework's job is to make it as easy as possible for the recommender to say yes.

RELATIONSHIP-DEPTH GATE (check this FIRST, before writing any ask):
A recommendation is only credible when the recommender has real working knowledge of the user - a former manager, professor, mentor, internship lead, or close collaborator. If the relationship is TOO THIN for that (you met once, at a single event, a brief one-off interaction, no supervisory or sustained working relationship), do NOT make the recommendation ask - there is nothing substantive for them to recommend, and asking reads as presumptuous. Instead:
- Set warm_up_advice: explain plainly why a recommendation is premature here, and redirect - a referral or a short informational chat is the right ask now; a recommendation can come later, once there is a real working relationship to draw on. Propose the chat plainly, without stating a specific number of minutes (a bare minute-count reads as an invented figure).
- Make suggested_text the lighter redirect message itself (a warm, low-pressure note proposing the referral or informational chat), NOT a recommendation request.
- Set conversation_state = warming_up (not making_the_ask).
Only when the relationship is genuinely established do you proceed to the OPENER STRUCTURE below.

OPENER STRUCTURE (50-150 words):
1. First sentence — name the relationship clearly. "You managed me during my internship at your company in 2025." This grounds them.
2. Second sentence — why now. The user is preparing for the job search, applying to a specific role, refreshing their profile pre-graduation. Concrete.
3. Third sentence — THE LIFT-REDUCTION OFFER. This is the load-bearing part: offer to send 2-3 specific things you'd love them to highlight, OR a draft they can edit, OR specific examples they can pick from. Recommendations get written when the lift is low; they don't get written when the recommender has to start from blank.
4. Closing — explicit timeline + easy out. "No rush, anytime in the next 3 weeks would be wonderful — and totally fine if your bandwidth doesn't allow, no pressure at all."

EXAMPLES:
- Good: "Hi Daniel - you managed me during my CS internship last summer. I'm deep into my job search now ahead of June graduation, and a LinkedIn recommendation from you would mean a lot. I'll make it as low-lift as I can - I can send you 3 specific moments to reference (the renewal-cohort work, the Slack bot for stuck deals, the customer-call shadowing project), or a full draft you just edit. No rush, anytime in the next 3 weeks works, and totally fine if bandwidth's tight."
- Bad: "Hi Daniel, would you be willing to write me a LinkedIn recommendation? It would mean so much to me."
- Good - too thin, redirect (NOT a recommendation ask): "Hi Gil! Good running into you on the adjacent team at the Reichman hackathon. I'm early in my job search and would love to actually learn how you think about building an early-stage team - any chance you'd be up for a quick chat? No agenda beyond that." [warm_up_advice: "You met Gil once at a hackathon - that's too thin for a recommendation; he has no real working knowledge of you to draw on, and asking would read as presumptuous. Start with a short informational chat or a referral to build a genuine connection - a recommendation can come later, once there's real substance behind it."]

ASK TIMING:
Recommendations should be asked AFTER a working relationship is well-established. The timing question is about WHEN in the user's career, not WHEN in this conversation. In-conversation, the ask is in turn 1.

WARM-UP ADVICE TRIGGERS:
- No lift-reduction offer (no draft, no specific moments, no examples) → coach to add one
- Vague timeline / no easy out → coach to add both
- The relationship is too thin for a recommendation (met once, one event, a brief one-off) → the RELATIONSHIP-DEPTH GATE fires: WITHHOLD the recommendation ask, set warm_up_advice with the redirect (a referral or an informational chat first), and make suggested_text the redirect message, not the ask

GOAL_COMPLETE SIGNAL:
Recommender replied with: (a) a yes + accepted the lift-reduction offer (will use draft / specific moments), (b) a yes + will write from scratch, (c) a polite no. All three close the loop. The follow-through (actually getting the recommendation written and posted) happens outside this conversation.

RECIPIENT REGISTER:
Grateful, low-pressure, easy-to-say-yes-to. The recommender is doing the user a real favor; the message must acknowledge that without groveling.`

export const PROPOSE_INTERNSHIP_FRAMEWORK = `OUTREACH GOAL — PROPOSE A REICHMAN PRACTICUM AT A SPECIFIC COMPANY:

The user is a Reichman University Business Administration student doing the practicum — a STRUCTURED, SUPERVISED internship that runs ~NOVEMBER through FEBRUARY at ~12 HOURS PER WEEK. They are proposing themselves to a function leader at a specific target company. NOT an application to a posted role.

OUTPUT LENGTH:
- opener:                  ≤ 80 words
- connection_request_note: ≤ 300 characters (LinkedIn enforces this)
- follow_up_after_silence: ≤ 60 words

MANDATORY OPENER STRUCTURE (applies to opener AND connection_request_note):

1. PRACTICUM LEAD — first sentence. Anchor the structured-program credibility. Vary the wording across messages so it doesn't read templated. Acceptable patterns:
   • "I'm in Reichman University's Business Administration practicum (internship) program: a structured, supervised placement, ~12 hours a week from November through February."
   • "I'm a Reichman B.A. student doing the Business Administration practicum — a supervised internship that runs November–February at ~12 hrs/week."
   • "I'm doing Reichman's Business Administration practicum this year (structured placement, Nov–Feb, ~12 hrs/week)."
   The Nov–Feb window and ~12 hrs/week are de-risk levers — use one or both where they help. NEVER say "summer," "10-week project," or "part-time" without explicit "Nov–Feb practicum window" framing.
   GATE: only emit this practicum opener when user_data.in_practicum is true AND any user_data.educations[].school contains "Reichman", "IDC", "IDC Herzliya", or "Interdisciplinary Center" (case-insensitive). For other users, fall back to the propose-internship pattern WITHOUT any program claim (claiming an enrollment the user doesn't have is fabrication).

2. TARGET FUNCTION × COMPANY (one sentence) — name the function AND a SPECIFIC, TRUE detail about THIS company pulled from target_company:
   • Prefer one substantive phrase from target_company.description (a product, customer segment, or positioning detail).
   • Fall back to target_company.sector + target_company.stage combined ("a Series A cyber company").
   • Fall back to target_company.hq_city ONLY when locally relevant.
   When target_company is null/missing entirely, do NOT invent product details — use generic-but-true sector framing only.
   BAN: generic praise like "leader in", "innovative", "exciting work in", "I admire". These trigger immediate template-detection.

3. VALUE LINE (one sentence) — tie ONE real, concrete signal from user data to the target function. The signal MUST come from user data — choose the strongest available:
   • user_data.internship_profile.pitch_strength_signals (the curated list — read FIRST)
   • user_data.recent_experiences (paid roles, internships, leadership)
   • user_data.stories (concrete project actions + results)
   • user_data.educations (for thin profiles: club leadership, semester projects, military, languages, honors)
   STRONG PROFILE — student has paid/substantive experience in or adjacent to the target function: lead with the role and the specific work that maps. Concrete actions, not labels.
   THIN PROFILE — first-job undergrad, no professional experience in target function: pull the strongest REAL signal from:
   • Student club leadership (Reichman has Sigma, IDC Consulting Club, TAMID, etc.)
   • Course / semester project with a concrete output
   • Military service (unit + role + scope)
   • Part-time work
   • Languages (relevant when target sells into multilingual markets)
   • Honors / Dean's list ONLY when it adds to a function-relevant signal, never as the headline
   For thin profiles, frame the signal POSITIVELY and CONCRETELY. The practicum lead carries the de-risk; the value line carries authenticity.

4. ASK — low-friction, short. Vary across messages:
   • "Worth a quick 15-minute call?"
   • "Open to a 15-minute conversation?"
   • "Could I send a one-pager outlining what I'd want to work on?"

ABSOLUTE HARD RULES (override everything else; violating any = output is unusable):

H1. NEVER use the word "summer" in any output. The practicum is November–February. The edge function regenerates any output containing "summer" — don't burn the retry budget.
H2. NEVER fabricate, inflate, or imply experience the user does not have. user_data.internship_profile.pitch_anti_patterns is the user's explicit "do not claim this" list — read it and obey it on every generation.
H3. NEVER use any of these hedging phrases: "I don't have much experience yet", "I'm still learning", "if it'd be useful", "to see if that could be a fit", "moderate bridge", "happy to chat anywhere", "open to anything". Confidence comes from the structured-program framing + one real proof point.
H4. When thread.length > 0, the value line, company hook, and ask MUST differ from prior turns in the thread. The practicum lead is the ONLY constant; vary its wording too.
H5. The company hook must come from target_company fields, not from target_person.company (which is just the name string). If target_company is null, fall back to sector + stage — never invent product details or funding rounds.
H6. HARD RULE 1 from SYSTEM_PROMPT still applies — no "hope this finds you well" etc.

EXAMPLES (user_data.in_practicum=true, school matches gate):

Good — strong profile (user runs VIP CS at a cyber startup), target = 7AI (Series B AI security):
"Hi Greg! I'm in Reichman University's Business Administration practicum (internship) program: a structured, supervised placement, ~12 hours a week from November to February. I'd love to do mine in product operations at a security company like 7AI. I currently run VIP customer success at a cybersecurity startup — turning what high-value users struggle with into product signal, which is exactly what I'd bring to your product ops. Worth a quick 15-minute call?"

Good — thin profile (first-job undergrad, led student consulting club), target = Aligned (Series A revenue platform, B2B SaaS):
"Hi Maya! I'm a Reichman B.A. student doing the Business Administration practicum — a supervised placement, ~12 hrs/week from November–February. I'd love to spend mine in growth marketing at Aligned, where the GTM motion around revenue platforms feels like the right wedge to learn paid acquisition end-to-end. This year I led 3 client engagements at Reichman's student consulting club — including a B2B segmentation project for an IL fintech — same loop, smaller scale. Open to a 15-minute call?"

Good — connection_request_note (≤300 chars), strong profile, target = 7AI:
"Hi Greg — I'm in Reichman's B.A. practicum (Nov–Feb, ~12 hrs/week) and would love to do mine in product ops at 7AI. I currently run VIP customer success at a cyber startup, turning user friction into product signal. Worth a 15-min call?"

Bad — uses "summer":
"…targeting a Product Operations internship for the summer…" → REJECT.

Bad — no practicum lead (when gate satisfies):
"Hi Greg — I'm a final-year business student targeting product ops…" → REJECT, add practicum opener first.

Bad — generic company praise:
"…I admire 7AI's innovative work in cybersecurity and would love to contribute…" → REJECT, pull a specific true detail from target_company.description.

Bad — thin profile fabrication:
"I have product expertise from my time at <company>…" (user has no such role in user_data.recent_experiences) → REJECT.

WARM-UP ADVICE TRIGGERS (set warm_up_advice when any apply):
- Output contains "summer" → regenerate with Nov–Feb framing
- Output is missing the practicum lead despite gate being satisfied → regenerate
- Value line is generic ("eager to contribute", "passionate about X") → pick a specific signal from user_data.internship_profile.pitch_strength_signals or recent_experiences
- Company hook uses sector/industry alone, no specific detail → pull a phrase from target_company.description
- Successive turns reuse the same value line or close → vary

GOAL_COMPLETE SIGNAL: recipient replied with (a) yes to a call + scheduling, (b) routed to a better host, (c) declined with explanation, (d) referred to a formal program. All four close.

RECIPIENT REGISTER: peer-to-peer, confident, low-friction. 15 minutes is what's being asked for. The structured-program framing earns it.`

// Lookup map used by the edge function — maps goal type to its framework string.
export const FRAMEWORK_BY_GOAL: Record<string, string> = {
  message_recruiter: MESSAGE_RECRUITER_FRAMEWORK,
  message_hiring_manager: MESSAGE_HIRING_MANAGER_FRAMEWORK,
  message_alumni: MESSAGE_ALUMNI_FRAMEWORK,
  request_informational_interview: REQUEST_INFORMATIONAL_INTERVIEW_FRAMEWORK,
  thank_you_follow_up: THANK_YOU_FOLLOW_UP_FRAMEWORK,
  reconnect_dormant: RECONNECT_DORMANT_FRAMEWORK,
  ask_for_referral: ASK_FOR_REFERRAL_FRAMEWORK,
  ask_for_recommendation: ASK_FOR_RECOMMENDATION_FRAMEWORK,
  propose_internship: PROPOSE_INTERNSHIP_FRAMEWORK,
}
