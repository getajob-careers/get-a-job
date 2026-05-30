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
- Good: "Hi Sarah — I'm a final-year business student graduating in June, targeting Customer Success roles in B2B SaaS. I saw your company is hiring for Customer Success Specialist; I built a Slack bot during my last internship that auto-flagged stuck deals and saved the CS team 8 hours/week. Open to a quick chat about whether the role might be a fit?"
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
- Good: "Hi Daniel — I'm finishing my undergrad business degree this June. Read your post last week on how your team is rethinking onboarding for SMB CS — really sharp framing on the 'time-to-value vs feature breadth' trade-off. I spent my last internship in CS shadowing the renewal cohort and built a Slack bot that flagged stuck deals; I'd love to learn how your team thinks about the same problem at your scale. Open to 15 minutes in the next two weeks?"
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
- Good: "Hi Maya — fellow alum from your program, I'm finishing this June. Saw you've been at your current company for 3 years now in CS, and that's exactly the path I'm targeting (B2B SaaS, CS function). Would love 20 minutes to ask how you decided between the offers you had post-grad and what you'd tell your final-year self. Easiest for you in person, async, or a quick call?"
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
- Good: "Hi David — I'm a final-year business student trying to decide between Customer Success and Product Marketing for my first role. Saw you spent 3 years in CS before moving to PMM at your current company — you're the rare person who's actually done both. Would love 25 minutes to ask: what surprised you about PMM coming from CS? What does the day-to-day actually look like? What would have made the move easier? Happy to do this async over voice notes if a call is hard to fit in."
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
- Good: "Hi Maya — really appreciated the 25 minutes today. Your point about CS being the function where 'you learn what the customer's job actually is' before moving into product is reframing how I'm thinking about the next 2 years. I'm going to reach out to Daniel next week (the alum you mentioned) — thanks for the warm intro offer. If a CS slot opens up on your team in Q3, would love to be on your radar."
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
- Good: "Hey Maya — feels like ages since the marketing strategy group. Saw your post about moving into the new PMM role last month — congrats. Last I knew you were torn between staying put and trying B2B SaaS, so it sounds like the call landed. How's the first 90 days going?"
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
- Good: "Hi Sarah — saw your company posted the Customer Success Specialist role yesterday (req here: [link]). You managed me in CS for 8 months and saw the renewal-cohort work directly — would you be open to referring me? Happy to send the tailored resume + a 1-page brief on why I think the fit makes sense given the team's ICP shift toward enterprise."
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

OPENER STRUCTURE (50-150 words):
1. First sentence — name the relationship clearly. "You managed me during my internship at your company in 2025." This grounds them.
2. Second sentence — why now. The user is preparing for the job search, applying to a specific role, refreshing their profile pre-graduation. Concrete.
3. Third sentence — THE LIFT-REDUCTION OFFER. This is the load-bearing part: offer to send 2-3 specific things you'd love them to highlight, OR a draft they can edit, OR specific examples they can pick from. Recommendations get written when the lift is low; they don't get written when the recommender has to start from blank.
4. Closing — explicit timeline + easy out. "No rush, anytime in the next 3 weeks would be wonderful — and totally fine if your bandwidth doesn't allow, no pressure at all."

EXAMPLES:
- Good: "Hi Daniel — you managed me during my CS internship last summer. I'm starting my job search in earnest now ahead of June graduation, and a LinkedIn recommendation from you would mean a lot. Happy to make this as low-lift as possible — I can send you 3 specific moments from the internship I'd love you to reference (the renewal-cohort work, the Slack bot for stuck deals, the customer-call shadowing project), or send a draft you can edit. No rush — anytime in the next 3 weeks works, and totally fine if bandwidth is tight."
- Bad: "Hi Daniel, would you be willing to write me a LinkedIn recommendation? It would mean so much to me."

ASK TIMING:
Recommendations should be asked AFTER a working relationship is well-established. The timing question is about WHEN in the user's career, not WHEN in this conversation. In-conversation, the ask is in turn 1.

WARM-UP ADVICE TRIGGERS:
- No lift-reduction offer (no draft, no specific moments, no examples) → coach to add one
- Vague timeline / no easy out → coach to add both
- The relationship is too thin for a recommendation (e.g. "we met at one event") → coach: "this is too thin for a recommendation ask; consider asking for a referral or informational interview instead"

GOAL_COMPLETE SIGNAL:
Recommender replied with: (a) a yes + accepted the lift-reduction offer (will use draft / specific moments), (b) a yes + will write from scratch, (c) a polite no. All three close the loop. The follow-through (actually getting the recommendation written and posted) happens outside this conversation.

RECIPIENT REGISTER:
Grateful, low-pressure, easy-to-say-yes-to. The recommender is doing the user a real favor; the message must acknowledge that without groveling.`

export const PROPOSE_INTERNSHIP_FRAMEWORK = `OUTREACH GOAL — PROPOSE AN INTERNSHIP IN A TARGET FUNCTION:

The user is proposing themselves for an UNPOSTED internship in a specific function at a company — not applying to a listed req, not asking "are you hiring." The recipient is the function's leader (Head of Product, Head of Marketing, etc.) — someone who could actually host an intern in that function. This is high-leverage but high-bar: the message must be value-forward and respect that the recipient isn't in recruiting mode.

OPENER STRUCTURE (60-150 words):
1. Who you are — student status + the function you want to intern in. State both up front so the recipient knows in 5 seconds what this DM is about. If user_data.in_practicum is true, you MAY reference the program as a credibility lever ("part of my university's internship program, which places students in a structured internship"). If user_data.in_practicum is false, do NOT mention any program — claiming program backing the user doesn't have is fabrication.
2. The bridge — name a specific current signal from the user's real experience that connects to the target function. Pattern: "Your <real current signal> gives you a credible angle into <target function surface area>." Do NOT invent target-domain experience.
3. The value — one specific contribution the user can credibly deliver FROM THEIR REAL VANTAGE in the next 2-3 months. The contribution must be something the user can actually do given what they currently know and have access to — NOT something that implies target-domain expertise they don't have. A CS-experience student bridging into product could "map recurring CS escalations to product gaps" (their real vantage) — NOT "own the onboarding workflow redesign" (that requires product-domain expertise). The phrasing should be "what I can do from where I stand," not "a workflow I'd own."
4. The ask — explicit, soft: "Would you be open to a 20-minute conversation about whether a <function> internship at <company> could work for the summer?" Or: "I'd love to propose a specific project — can I send you a one-pager?"

EXAMPLES (assume user_data.in_practicum = true):
- Good: "Hi Daniel — final-year business student, part of my university's internship program, targeting a Product Operations internship for the summer. Currently a CSM at a cybersecurity startup, so I see the friction between customer signal and product roadmap from the customer side every day. I'd love to propose a 10-week project mapping recurring CS escalations to product gaps for your team — would you be open to a 20-minute conversation about whether that could fit?"
- Bad: "Hi Daniel — are you hiring product interns? I'd be a great fit for your team."

EXAMPLES (assume user_data.in_practicum = false):
- Good: "Hi Daniel — final-year business student graduating in June, targeting a Product Operations internship for the summer. Currently a CSM at a cybersecurity startup, so I see the friction between customer signal and product roadmap from the customer side every day. I'd love to propose a 10-week project mapping recurring CS escalations to product gaps for your team — open to a 20-minute conversation?"
- Bad (fabricates program): "Hi Daniel — part of my university's structured internship program…" (when user is NOT in a practicum)
- Bad (job-app framing): "Hi Daniel — are you hiring product interns?"

ANTI-FAB (CRITICAL):
- The pitched function is what the user is BRIDGING TOWARD, not what they already do. Don't invent target-domain experience. A CS-experience student bridging into product writes "customer-side perspective" not "previous Product Ops work."
- The senior version of the function ("Senior PM", "Director of Product Operations") is NOT what the user is proposing — that's the long-term goal, not the internship. Coach the user to entry-rung framing.
- The value/contribution must be grounded in the user's REAL vantage. A CS-experience student bridging into product can "share patterns from customer escalations" — they CANNOT "own product roadmap planning" or "redesign the onboarding flow."
- Program backing is GATED: only available when user_data.in_practicum is true. Never assert it when false.

ASK TIMING:
The ask is in the first message — internships need clarity early. But framed as "propose a project / function focus" not "give me a job." A learning-conversation framing ("can we talk about whether this could work") beats a direct ask ("will you hire me as an intern").

WARM-UP ADVICE TRIGGERS:
- Opener treats this as a posted-req application ("Are you hiring interns?") → coach to proposal framing
- No specific bridge from real experience → coach to add one
- Asks for senior-target role ("PM internship" when target is "Product Operations") → coach to entry-rung function
- "Value to add" is generic ("happy to help anywhere") or implies target-domain expertise the user doesn't have ("I'd own your roadmap") → coach to a specific contribution grounded in real vantage
- References a practicum program when user_data.in_practicum is false → coach to remove the program claim

GOAL_COMPLETE SIGNAL:
Recipient replied with: (a) yes to a call + scheduling, (b) yes but routed to another function leader who'd be a better host, (c) no with explanation + offer to keep on file, or (d) routed user to a formal internship program if one exists. All four close the loop.

RECIPIENT REGISTER:
Peer-to-peer respect, value-forward. The recipient is being asked to host an intern in an unposted slot — that's a real ask of their time and headcount. The message must implicitly acknowledge that.`

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
