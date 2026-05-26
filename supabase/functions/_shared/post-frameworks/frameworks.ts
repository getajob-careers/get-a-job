// frameworks.ts — per-post-type structural templates injected into the
// LLM system prompt alongside POST_VOICE_RULES.
//
// Each framework is the structural template the LLM follows for that
// post type — what hook style, what body structure, what required
// signals (named gratitude for milestone, lessons numbered for lessons),
// what hashtag direction, what format recommendation.
//
// Per Eli's design call PR #32: per-post-type templates over a single
// universal prompt. ~30-50 lines each. Per-type produces sharper output
// because the model gets explicit structure rather than inferring from
// inputs alone — same pattern that worked for generate-tailored-cv.
//
// Grounded in docs/research/linkedin-post-performance.md sections 4
// (post structure) + 5 (early-career posting). When pilot data
// contradicts a framework rule, update the research doc first then
// revise here.

export const PROJECT_FRAMEWORK = `POST TYPE — PROJECT SHOWCASE:

The user finished a class project, side project, hackathon piece, or internship deliverable and wants to share it. Audience is recruiters + peers + potential collaborators.

HOOK (first 140 chars — mobile truncation point):
Anchor on the specific outcome, not the topic. The reader should know what shipped or what changed in the first sentence.
- Good: "I cut our team's onboarding time from 14 days to 3 — here's how I redesigned the flow."
- Good: "Built a Slack bot that auto-flags stuck deals — saved my CS team 8 hours a week."
- Bad: "Recently I had the opportunity to work on an exciting project..."
- Bad: "Some thoughts on customer onboarding."

BODY STRUCTURE (1,200-2,500 chars):
1. Context (1-2 sentences): the project, where it lived (course / company / hackathon), why it mattered.
2. What was built (2-3 sentences): the specific work. Name the tools, methods, scope. Avoid generic verbs ("collaborated", "leveraged"); prefer concrete actions ("designed the schema", "ran 12 user interviews", "deployed via X").
3. What was learned or what changed (2-3 sentences): the concrete takeaways. Numbers and named outcomes when present. Skip "I learned a lot" — name the specific thing.
4. Optional close: what's next, who you'd love feedback from, where to find the work.

HASHTAGS (3-5 at end):
Function/domain specific based on the work — e.g. #userresearch #productdesign #b2bsaas. Skip generic lifestyle tags (#career #motivation).

FORMAT RECOMMENDATION:
For under-5K-follower accounts (all pilot users), recommend 'image_text'. The image should be the project artifact itself — screenshot, demo photo, presentation slide. Carousels are not the right format for this audience yet.

SAVEABLE_SCORE GUIDANCE:
Score higher (7-10) when the post contains a concrete framework, methodology, or numbered takeaway readers might come back to. Score lower (3-6) when the post is primarily narrative without explicit takeaways.`

export const LESSONS_FRAMEWORK = `POST TYPE — LESSONS LEARNED:

The user finished something (course, role, project, book, event) and is sharing 3-5 specific lessons. This is the most natively saveable post type — numbered lists are the format readers come back to.

HOOK (first 140 chars):
Name the source AND give a teaser of what's at stake. The reader should know what experience the lessons came from in the first sentence.
- Good: "5 lessons from running my first user research study at Guardio — including the one that changed how I write interview scripts."
- Good: "I just finished my Customer Discovery course. Here are the 4 things I'm taking back to my internship."
- Bad: "Some lessons I learned recently."
- Bad: "Reflections on customer discovery."

BODY STRUCTURE (1,200-2,500 chars):
- 1 sentence setting context after the hook: when, where, what you were doing.
- Numbered list of 3-5 lessons. Each lesson:
  - Headline (one short sentence stating the lesson).
  - 1-2 sentences elaborating with a SPECIFIC EXAMPLE from the user's actual experience (not abstract). The example is what makes the lesson saveable — readers save concrete evidence, not abstract claims.
- Optional close: what you're taking forward, or an open question that ties to the specifics of the post (NOT "Thoughts?" — that's engagement-bait).

HASHTAGS (3-5 at end):
Topic + audience specific — e.g. #userresearch #earlycareer #productmanagement. Skip generic.

FORMAT RECOMMENDATION:
For under-5K-follower accounts, 'text_only' or 'image_text' both work. If using an image, it should be a visual list / infographic / screenshot of the work — not a stock photo or motivational quote graphic.

SAVEABLE_SCORE GUIDANCE:
This format inherently scores high (8-10) when the lessons are concrete and example-backed. Score lower if the lessons are abstract ("be a good listener", "communication matters") without specifics — those don't get saved.`

export const MILESTONE_FRAMEWORK = `POST TYPE — CAREER MILESTONE:

The user is sharing news: internship offer, role start, certification, graduation, or other career-significant event. This is the highest-temptation post type for the algorithmically-suppressed openers ("Excited to share that...", "Thrilled to announce...", "Humbled to share..."). Avoid them strictly.

HOOK (first 140 chars):
Name the specific milestone with concrete detail, NOT generic excitement.
- Good: "Just signed my offer — joining Guardio as a Customer Success Specialist starting October."
- Good: "Walked the stage today. Bachelor's in Business Administration, specialization in Digital Innovation."
- Good: "Today's my first day at Atera. Spent the morning reading the renewal playbook our CS lead wrote — already learning."
- Bad: "Excited to share that I've accepted a new role!"
- Bad: "Thrilled to announce that I'm graduating today."
- Bad: "Humbled to be joining the [Company] team."

BODY STRUCTURE (1,200-2,500 chars — milestone posts can run shorter, 600-1,500, since they're news-shaped):
1. The hook (first sentence): the specific milestone.
2. Context (1-2 sentences): how you got here. The journey, the work, the choice. Concrete, not generic.
3. NAMED GRATITUDE (this is the load-bearing part of milestone posts):
   - Real names of real people (not "everyone who supported me along the way")
   - Real reasons specific to each person (not "for believing in me")
   - Examples: "Thanks to Sarah Chen for the mock-interview prep", "Thanks to Prof. Lee for the customer-discovery framework I used in the final-round case"
   - Tag people if they're on LinkedIn — research shows tagging materially lifts reach.
4. Forward-look (optional, 1 sentence): what you're starting on / what you'll actually be doing. SKIP "excited to learn", "excited to dive in", "looking forward to" — these are generic across every milestone post and add nothing. Specific is mandatory: "First week I'm shadowing the renewal cohort", "Spent the morning reading the playbook our CS lead wrote." If you can't be specific, omit the forward-look entirely. Tightened in PR #33 after Phase 2 smoke produced "I'm excited to dive into my first two weeks" — the prior framework allowed it conditionally; now it's an absolute rule.

HASHTAGS (3-5 at end):
Industry + role specific — e.g. #customersuccess #b2bsaas #firstrole #studentlife (only if accurate). Avoid #blessed, #grateful, #journey — these signal LinkedIn-influencer voice.

FORMAT RECOMMENDATION:
'image_text' for milestone posts works well — graduation photo, offer letter (with sensitive info redacted), team photo, certification badge. Personal photos lift engagement materially. 'text_only' works for milestones without a natural visual.

SAVEABLE_SCORE GUIDANCE:
Milestone posts are typically liked, not saved (they're news, not reference material). Score 4-6 unless the post contains a specific framework or takeaway that other early-career readers might save (e.g. "the mock-interview prep approach that worked for me").

WARNINGS TO EMIT:
- If milestone_type is 'internship_offer' or 'role_start' AND the user's profile has no public Open To Work badge, do NOT emit a warning. If the user has Open To Work currently public, emit: "Public Open To Work badge is contested for competitive markets per our research — consider switching to the private 'Open to Recruiters' toggle once you've started the role." (Phase 2 doesn't have OTW state in profile yet — defer this warning. Just leave warnings empty for milestone v1.)`

export const RECAP_FRAMEWORK = `POST TYPE — EVENT / HACKATHON RECAP:

The user participated in an event (hackathon, conference, competition, workshop, panel) and wants to share what happened. Audience is recruiters + peers + future participants.

HOOK (first 140 chars):
Anchor on the specific outcome of the event, not "I attended X." Lead with what was built, what was won, who you presented to, what you walked away with concretely.
- Good: "Won 1st place at the TechCrunch Disrupt Hackathon this weekend — built a multilingual code-switching translator with two friends in 26 hours."
- Good: "Presented our customer-discovery findings to a regional CMO as part of my marketing strategy course final."
- Bad: "Excited to share that I attended the Hackathon this past weekend!"
- Bad: "Last week was an amazing experience..."

BODY STRUCTURE (1,200-2,500 chars; recaps can run shorter, 800-1,500, since they're news-shaped):
1. Hook (first sentence): the specific outcome.
2. Event context (1-2 sentences): what the event was, what you/your team did.
3. The work (2-3 sentences): what you specifically built / presented / contributed. Name the tools, methods, scope. Concrete actions ("designed the schema", "ran the user research") not generic verbs.
4. People to tag (REQUIRED when team_members has entries): name each person with their specific contribution. Format: "Big thanks to [Name] (@handle if available) for [specific contribution]." Tagging is the engagement-per-reach lever for recap posts — research-backed.
5. Optional close: the key_lesson if provided, OR what's next, OR an open invitation to anyone who's done something similar.

HASHTAGS (3-5 at end):
Event-specific hashtag if known (e.g. "#TechCrunchHackathon"), plus topic/function tags. Skip generic.

FORMAT RECOMMENDATION:
'image_text' is the strong default — group photos, demo screenshots, prize/award photos, presentation slides. Recaps without an image significantly underperform.

SAVEABLE_SCORE GUIDANCE:
Recaps are typically liked, not saved (they're news). Score 5-7 baseline. Score higher (7-9) when the key_lesson is concrete enough that another student facing a similar event would save it as advice.`

export const OBSERVATION_FRAMEWORK = `POST TYPE — INDUSTRY OBSERVATION:

The user has a perspective on a trend in their target industry. THIS IS THE HIGHEST-RISK FORMAT FOR EARLY-CAREER USERS — easy to come off as overreach, easy to publish a hot take that hurts credibility. The user provided three inputs: trend, specific_example, your_take. Without the specific_example anchoring authority, this format reads as posturing.

HOOK (first 140 chars):
Anchor on the trend or the example — NOT a generic "I think" opener. The reader should know what observation is coming in the first sentence.
- Good: "Most CS leaders I've talked to in B2B SaaS are quietly de-emphasizing CSAT. Here's what they're tracking instead."
- Good: "Spent my internship at a fintech watching three product launches. The pattern that worked: tight scope + brutal QA. The pattern that didn't: shipping to look fast."
- Bad: "I think customer success is changing."
- Bad: "Some thoughts on the future of B2B SaaS..."

BODY STRUCTURE (1,200-2,500 chars):
1. Hook (first sentence): the trend or the specific example.
2. The trend (1-2 sentences): describe what's happening. Concrete, not vague.
3. THE SPECIFIC EXAMPLE (2-3 sentences): this is the load-bearing part. The user's anchoring authority — what they directly saw / did / learned that gives them standing to comment on the trend. Names, numbers, places where appropriate. WITHOUT THIS, the post reads as overreach.
4. Your take (2-3 sentences): the actual opinion grounded in the example. Conviction is welcome; positioning yourself as a thought leader on a trend you only know secondhand is not.
5. Optional close: invite people who've seen the same thing to compare notes. NOT engagement-bait — a genuine invitation to specific kinds of input ("anyone running this play in a sub-50-person CS team would love your read").

HASHTAGS (3-5 at end):
Industry/topic specific. Skip personal-brand hashtags.

FORMAT RECOMMENDATION:
'text_only' is appropriate for observation posts — the value is the take, not a visual. Don't add a stock image just to have one.

SAVEABLE_SCORE GUIDANCE:
Observation posts that land well score 7-8 (readers save sharp takes for reference). Posts without a strong specific_example score 4-5 — the take feels detached from the user's authority, gets liked socially but not saved.`

export const QUESTION_FRAMEWORK = `POST TYPE — QUESTION FOR COMMUNITY:

The user is genuinely asking for input on a decision or topic. Provided three inputs: decision_or_topic, what_youve_considered, what_youre_stuck_on. The middle field is mandatory — questions that skip "what I've already considered" read as lazy and underperform sharply.

HOOK (first 140 chars):
The question itself, OR a 1-sentence framing that makes the question concrete.
- Good: "I'm picking between a Customer Success offer at Guardio and a Product Analyst offer at a Series-B fintech. Curious how others have weighed this."
- Good: "Anyone here moved from CS into Product without a PM internship in between? How did you bridge it?"
- Bad: "What's the best path into Product Management?"
- Bad: "Looking for advice..."

BODY STRUCTURE (800-2,000 chars — questions can run shorter):
1. Hook (first sentence): the question with concrete framing.
2. WHAT YOU'VE CONSIDERED (2-4 sentences): show the thinking that's already happened. The factors you've weighed, the people you've talked to, the constraints you're working with. This is what makes the post NOT lazy. Posts that skip this read as "tell me what to do" and get ignored.
3. The specific stuck point (1-2 sentences): what you actually need help with. Not the broad question, the narrow place where outside input would change your decision.
4. Closing: invite specific kinds of input, not generic reactions. "Anyone who's chosen between [these two paths] would love your take" beats "Thoughts?" (which is engagement-bait and algorithmically suppressed).

HASHTAGS (3-5 at end):
Topic specific.

FORMAT RECOMMENDATION:
'text_only' is the right format. Questions don't need imagery.

SAVEABLE_SCORE GUIDANCE:
Questions are conversational, not reference material. Score 4-6 typically. Score higher (7+) only if the question itself becomes a useful framework someone else might save (e.g. "the 4 factors I'm weighing" is reusable).`

export const FREE_FORM_FRAMEWORK = `POST TYPE — FREE-FORM:

The user supplied a topic + an intent. This is the escape hatch for cases not covered by the structured types. CRITICAL: free-form input is NOT permission to skip POST_VOICE_RULES, the engagement-bait blacklist, or anti-fabrication discipline. Apply ALL of those rules identically — the absence of a structural framework doesn't loosen the writing-quality bar.

INTENT INTERPRETATION:
The user picked one of: share_experience / ask_question / make_announcement / spark_discussion / showcase_work. Use this as a structural hint:
- share_experience: narrative with explicit takeaways at the end (saveable structure)
- ask_question: follow QUESTION_FRAMEWORK structure — what they've considered + what they're stuck on
- make_announcement: follow MILESTONE_FRAMEWORK — specific opener (no "Excited to share"), named gratitude if relevant, concrete forward-look
- spark_discussion: follow OBSERVATION_FRAMEWORK — anchor on a specific example before sharing the take
- showcase_work: follow PROJECT_FRAMEWORK — lead with the outcome, name what was built, name the tools

HOOK (first 140 chars):
Same rules as every other post type. Specific > generic. No suppressed openers ("Excited to share", "Thrilled to announce", "Humbled to"). Anchor on a fact, a number, a specific moment.

BODY STRUCTURE (1,200-2,500 chars):
Use the intent's framework above to pick structure. If intent is ambiguous, default to share_experience (narrative + explicit takeaways).

GROUNDING (REQUIRED):
The user's topic is FREE-FORM, but the post must still be grounded in the user's REAL profile/experiences. Do NOT generate generic content about the topic — connect it to specifics from USER DATA (current role, recent experiences, target industry, attached story if present). If the topic is genuinely abstract and can't be grounded in the user's reality, prefer narrowing the post over going generic.

HASHTAGS (3-5 at end):
Topic specific.

FORMAT RECOMMENDATION:
Pick based on intent — share_experience and showcase_work lean image_text; ask_question and spark_discussion lean text_only.

SAVEABLE_SCORE GUIDANCE:
Score per the intent's typical range — share_experience and showcase_work can hit 8+; ask_question and spark_discussion typically 4-7; make_announcement 4-6.`
