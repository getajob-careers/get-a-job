// voice-rules.ts — positive writing-quality rules for CV + LinkedIn
// generation. Replaces the banned-vocabulary lists that previously lived
// inline in each prompt (deleted from generate-tailored-cv and
// generate-linkedin-content as part of this change).
//
// Why we shifted away from banned-word lists:
// - Empirical: in PR #16 testing, repeating the LinkedIn banned-word list
//   THREE times across the same system prompt did NOT eliminate "leverage"
//   / "seamless" leaks (still ~1-2 per generation). The failure mode isn't
//   "model didn't see the ban" — it's "model defaults to filler when
//   grounding is thin." Positive specificity rules attack the root cause:
//   when the model has concrete facts to write about, it stops reaching
//   for vocabulary filler.
// - Architectural: the role/skill libraries
//   (00_role_library.ts, 01_skill_library.ts, etc.) contain words like
//   "leverage" as canonical skill descriptors. Banning words the libraries
//   use creates mixed signal. Positive rules don't enumerate vocab so the
//   conflict disappears.
// - Maintenance: word lists drift. LinkedIn and CV prompts had different
//   ban lists for the same concept. Heuristics travel cleanly between
//   prompts; word lists don't.
//
// LINKEDIN_VOICE_RULES is research-grounded — see PR description / commit
// for sources (LinkedIn Talent Blog, Harvard FAS, Sacred Heart career
// center, Tim Queen, JobEase eye-tracking study, Konnector). Concrete
// claims (220-char headline, 1800-2200 char About, recruiter scan order)
// trace to those sources.
//
// CV_VOICE_RULES is built on the empirically-validated patterns from
// generate-tailored-cv's prior BANNED_VOCAB_RULES — promoting the
// "remove-the-word test" exception clause from edge case to core
// principle. The "interchangeable-candidate test" is new (no prior
// equivalent in the codebase).
//
// The two are intentionally NOT identical. CV is bullet-driven and
// compressed (recruiter 6-second scan); LinkedIn is conversational and
// supports longer prose (sweet-spot About is 1800-2200 chars per current
// guidance). They share the specificity-beats-filler core.

export const CV_VOICE_RULES = `WRITING QUALITY — RESUME VOICE:

Resume bullets are read in 6 seconds by humans and parsed by ATS. Every word should add a fact about what the user did or what changed because of it.

THE SPECIFICITY TEST (apply to every bullet):
Remove the most generic-feeling word in the bullet. Does the bullet still convey the same specific information? If yes, that word was filler — replace it with a concrete verb or specific noun, or delete it entirely. Run this once per bullet before emitting.

ACTION VERBS — name a real action, not a category:
A verb that lets a reader picture exactly what the user did is doing its job. A verb that names a category of action ("drove growth", "leveraged data", "facilitated alignment") is filler — the reader can't tell what actually happened. Prefer the verb that pictures the action: "Built", "Migrated", "Negotiated", "Reduced", "Coordinated", "Wrote", "Shipped".

CLICHÉS WASTE A LINE:
"Team player", "results-driven", "passionate about X", "strong communicator", "perfect fit" — recruiters skim past these because they're true of every candidate. If you'd write a bullet that describes a trait, replace it with a bullet that DEMONSTRATES the trait through a specific action. Instead of "Team player who collaborates across functions" → "Coordinated 4-person handoff between design and engineering on the checkout redesign". The action proves the trait.

GENERIC LLM PHRASES — DO NOT WRITE:
These phrases signal LLM generation rather than human writing. They describe a CATEGORY of work without naming the work, which is always replaceable with the specific activity. The list below is illustrative, not exhaustive — the underlying principle is "any verb or phrase that names a category instead of a specific action is banned." If you find yourself reaching for a verb that sounds polished but doesn't picture a concrete action, REPLACE IT with the specific activity. Banned across About Me and bullets:
  - "hands-on experience in" / "hands-on experience with"
  - "demonstrated ability to"
  - "strong background in"
  - "proven track record"
  - "passionate about" (reinforced)
  - "leveraged" / "leverage" (the verb in any tense)
  - "utilized" / "utilize" / "utilizing" — structurally identical to "leveraged"; same ban
  - "employed" (as a transitive verb meaning "used") / "made use of"
  - "drove growth" / "drove adoption" / "drove results"
  - "spearheaded" / "orchestrated" / "facilitated" (when not naming a real action)
Replace each with the specific activity:
  BAD: "Hands-on experience in customer success and process improvement"
  GOOD: "Two years owning the post-sales handoff at a B2B SaaS startup, including running QBRs for 12 enterprise accounts"
  BAD: "Demonstrated ability to drive results across cross-functional teams"
  GOOD: "Shipped the Q3 onboarding redesign with PMs from 3 squads, cutting time-to-first-value from 9 days to 4"

NUMBERS WHEN REAL, NOT DECORATIVE:
Numbers belong in bullets when they exist in the user's source data (Story Bank metrics, responsibilities text). Round numbers that look invented ("Improved efficiency by 40%") are worse than no numbers — recruiters spot them. If the source has "shipped 2 weeks early", write that. If it doesn't, write the action without padding it with imaginary numbers. Anti-fabrication rules apply here without exception.

THE INTERCHANGEABLE-CANDIDATE TEST:
If you swap the user's name for any other student in the program and the bullet still makes sense unchanged, the bullet is filler. Real bullets reference the user's specific company, their specific tools, their specific outcomes. Generic bullets get cut.

LENGTH:
Aim for 14-22 words per bullet — enough room for action verb + what was done + concrete outcome (tool, scope, stakeholder, or metric when real). Bullets shorter than 12 words usually under-describe the work and read as thin; bullets longer than 26 words are almost always padded with adverbs and should be tightened. A bullet that runs to two rendered lines should earn it with a real metric or specific tool, not with filler.`

export const LINKEDIN_VOICE_RULES = `WRITING QUALITY — LINKEDIN VOICE:

LinkedIn copy should sound like the user wrote it, not like a brand wrote it. The reader's question on every line is "would a real person say this out loud?" If the answer is no, rewrite.

THE READ-ALOUD TEST:
Before emitting any sentence, mentally read it aloud in the user's voice. If it sounds like a press release, a corporate bio page, or LinkedIn-influencer copy — rewrite in plainer words. Conviction and personality are welcome; performance and polish-for-its-own-sake are not.

SPECIFICITY OVER POSTURING:
"Drove growth" is everywhere; "Doubled signups in Q1 by rewriting the onboarding flow" tells the reader something. The same specificity test from resume writing applies: remove the most generic-feeling word in a sentence — if the sentence still conveys the same specific information, that word was filler. Concrete verbs that name a real action beat verbs that name a category of action.

LINKEDIN-INFLUENCER MANNERISMS TO SKIP:
Opening with "Excited to share that..." or "Thrilled to announce", ending with "Thoughts?" or "Let's connect", scattering "humbled to" and "honored to" through prose without specific honoring context — these read as performative and recruiters skim past them. They also signal LLM-written copy. If a real person you know wouldn't text you a sentence in this register, don't write it for them.

CLICHÉ STATEMENTS ABOUT THE CANDIDATE:
"Passionate about", "results-driven", "thrives in fast-paced environments" — these tell the reader nothing because they're true of every candidate's self-description. If you'd write a sentence that describes a trait, replace it with a sentence that demonstrates the trait through specifics. Instead of "I'm passionate about user experience" → "I think onboarding is the highest-leverage place to spend a PM's first 6 weeks — that's where I've focused at Guardio." The opinion grounded in a specific claim is fine; the trait-statement is not.

HEADLINE — three pillars, each a fact, ordered by recruiter relevance:
The leading ~60 characters get the most recruiter attention (eye-tracking data shows fixation on the start of the headline). Lead with the most search-relevant pillar, not chronology or modesty. Cap at 220 characters.

For working professionals: <Current or aspirational role> | <Domain expertise> | <Concrete proof>. Example: "Customer Success Specialist at Guardio | Enterprise adoption | Drove 88% adoption in Q1 via 12 user research interviews".

For students without a current professional role: <Study area> Student at <University> | Aspiring <Target Role> | <Specific skill or proof>. "Aspiring [Role]" is acceptable in the headline for students in a way it isn't for mid-career — students should signal direction. Example: "Business Administration Student at Reichman University | Aspiring Product Manager | Customer success metrics from internship at Guardio".

Every pillar should be a verifiable fact, not a slogan. Mobile preview shows even less than desktop — front-load.

ABOUT — sound like the user, not like a brand:
First person. Aim for 1,800-2,200 characters (300-350 words) when the user's material supports it. Never pad to fill space — short and specific beats long and generic. The first sentence shows above the fold on mobile, so it must be specific from word one. Reference the user's actual roles by name, real metrics from their stories, and where they're heading (target job titles). Personality and a point of view are welcome; trait-statements like "I'm passionate about building great products" are not.

EXPERIENCE / VOLUNTEERING / MILITARY DESCRIPTIONS:
Hybrid format works best on LinkedIn: 1-2 lines of prose context (role scope, team size, mandate) followed by 3-4 outcome bullets. Pure resume-bullet copy-paste reads as lazy — context first, results second. Same specificity test applies. Real metrics from the Story Bank go verbatim per the binding rules. For military: civilian-readable framing ("Led a 12-person team through high-pressure operational deployments"), preserve unit + rank verbatim, never invent military details.

KEYWORDS RECRUITERS ACTUALLY SEARCH:
LinkedIn Headlines and About are indexed by LinkedIn Recruiter search. When the user's target_job_titles or stories include industry/function terms recruiters search for ("Product Marketing", "B2B SaaS", "Growth Analyst", "Customer Success"), surface them in the Headline and the first paragraph of About — not just the Experience section. Generic descriptions ("technology professional") aren't searchable; specific function terms are.

RECRUITER SCAN ORDER:
Recruiters typically scan: most recent Experience title/company → Headline → first 1-2 Experience entries → About (only if the first three hooked them, ~23 seconds of attention if they reach it). Load-bearing facts go in Headline + the most recent Experience entry. Don't bury a key proof point in paragraph 2 of About — it won't be read.`

// POST_VOICE_RULES — for the LinkedIn Post Creator (PRs #31-33+).
//
// Grounded in docs/research/linkedin-post-performance.md (research dated
// 2026-05-06, sources cross-validated where possible). When pilot data
// contradicts a claim here, update the research doc first then revise this
// constant. The doc tags each finding as cross-validated / single-sourced /
// contested — this constant asserts cross-validated rules and surfaces
// trade-offs on contested ones rather than picking sides.
//
// Critical pilot context: every pilot user is under 5K followers. Format
// + structure prescriptions in this rule set are calibrated for that
// audience, not for executive thought-leadership accounts.
export const POST_VOICE_RULES = `WRITING QUALITY — LINKEDIN POSTS:

DESIGN FOR SAVES, NOT JUST LIKES:
LinkedIn's 2025-2026 ranking weights saves at roughly 5x a like and 2x a meaningful comment. Posts that get SAVED contain frameworks, takeaways, lessons, or specific how-tos the reader returns to. Pure narrative without explicit takeaways gets liked once and forgotten. Numbered lists, before/after pairs, mistake-and-fix sequences — these are saveable. Make takeaways explicit ("What I learned: X, Y, Z" beats hoping the reader infers).

THE HOOK (first 140 characters — mobile truncation point):
Mobile is 91% of LinkedIn engagement. The first 140 characters either earn the click-to-expand or lose the reader.
- Specific number > generic claim: "I cut onboarding from 14 days to 3" beats "I improved onboarding."
- A specific moment > a topic header: "Last Tuesday at 11pm I realized..." beats "Reflections on engineering culture."
- Skip "Excited to share that..." / "Thrilled to announce..." / "Humbled to..." — these are now algorithmically suppressed in 2025-2026 (research-backed, not opinion).
- The hook should be readable standalone — if the truncated 140 chars don't make sense without expansion, rewrite.

STRUCTURE FOR DWELL TIME:
Posts with 15+ second dwell time get 3.2x higher distribution; posts at 0-3 second dwell get ~1.2% engagement vs 15.6% at 61+ seconds. Dwell time correlates with scannable formatting on mobile.
- 1-2 sentences per line, blank line between thoughts.
- No dense paragraphs. Mobile readers bounce off walls of text.
- Visual rhythm matters — short line, longer line, short line creates flow.

LENGTH:
Sweet spot is 1,200-2,500 characters (research n=372,126 personal posts: 27% higher engagement than posts under 400 chars).
- Under 400 chars: tells the reader you didn't have anything substantive to say.
- 1,300-2,500 chars: peak engagement.
- Over 3,000 chars: truncated below the fold and loses dwell time.

ENGAGEMENT-BAIT BLACKLIST (algorithmically suppressed 30-40%, sometimes ~0% reach):
NEVER use these in any post:
- "Agree?" / "Thoughts?" / "Comment YES if..." / "Drop a 🔥 if you..."
- "Tag someone who..." / "Like if you agree" / "Type X for the link"
- "Comment to learn more" / "Share if this resonates"
End with substance, not solicitation. If asking a question, ask a genuine one tied to the specifics of the post (not a formulaic prompt). Asking "What did I miss?" after sharing a specific framework is fine; "Thoughts?" alone is not.

HASHTAGS:
- 3-5 specific hashtags placed at the end of the post.
- Specific function/industry tags ("#productmanagement #b2bsaas #customersuccess") outperform generic lifestyle tags ("#career #motivation #grindset").
- More than 5-6 hashtags triggers spam suppression.
- Hashtags-in-first-comment was old advice — provides no algorithmic benefit anymore.
- Skip if you can't think of 3 specific ones; better than padding with generic tags.

EMOJIS:
- 1-3 functional emojis maximum, used as visual punctuation (e.g. a single ✅ before a takeaway, or a ⚡ before a key insight).
- Not as filler. Not as decoration. Not at every line break.

VOICE CONSISTENCY WITH PROFILE:
The post should sound like the same person who wrote the user's About. If baseline_data.profile.about is provided in the prompt context, match its register. A reader who sees both the post in their feed and clicks through to the profile expects the same voice — inconsistency reads as ghost-written.

SPECIFICITY (carries over from LINKEDIN_VOICE_RULES):
- "I deployed our first integration last Thursday" beats "I have experience deploying integrations."
- A real opinion grounded in a specific claim beats a safe observation. Conviction is welcome; posturing isn't.
- Cliché trait-statements ("I'm passionate about user experience", "I thrive in fast-paced environments") tell the reader nothing — replace with sentences that demonstrate the trait through specifics.

NO FABRICATION:
- Numbers in posts must come from the user's source data (Story Bank metrics, profile experiences, attached story). Round numbers that look invented hurt credibility — recruiters spot them.
- Tools, companies, projects mentioned must be real. The post becomes part of the user's public record.

FORMAT PRESCRIPTION (under 5K followers — applies to all pilot users):
LinkedIn's algorithm rewards low-friction formats for accounts under 5K followers. The default visual format for our pilot is TEXT + SINGLE IMAGE, not carousels. Carousels become optimal only above 20K followers; for sub-5K accounts they reach less and convert worse than text + image. The post body itself should be optimized first — visual format is a secondary lever.`

// COMMENT_VOICE_RULES — for substantive comments on OTHER people's
// LinkedIn posts (PR #34). Per the LinkedIn research doc, commenting on
// others' posts is the highest-leverage networking activity for sub-1K-
// follower accounts: 15+-word substantive comments delivered 5-10x daily
// reportedly produce a ~55% lift in profile views. The motion matters
// MORE than posting for our pilot users.
//
// Comments are NOT posts. Different rhetorical purpose (joining someone
// else's conversation, not starting one), different length (50-150 words
// is the sweet spot, not 1200-2500 chars), different register
// (conversational, not declarative).
//
// Grounded in docs/research/linkedin-post-performance.md section 5
// (early-career posting). When pilot data contradicts a rule here, update
// the research doc first then revise this constant.
export const COMMENT_VOICE_RULES = `WRITING QUALITY — LINKEDIN COMMENTS:

THE COMMENT'S JOB:
You are not writing a post. You are joining someone else's conversation. The goal is twofold: (1) add genuine value to the discussion the original poster started, and (2) make a memorable impression on the original poster + readers who scan the comments. Both happen when the comment is specific, substantive, and grounded in your real experience.

LENGTH:
Sweet spot is 50-150 words. Comments under 15 words ("Great post!", "So true!", "Love this!") signal low effort and add nothing — research shows substantive 15+-word comments are what drive the profile-view lift. Comments over 200 words read as hijacking the post for your own monologue.

STRUCTURE:
1. Reference SOMETHING SPECIFIC the original poster said (a phrase, a number, a claim) — not "I agree with everything you said." Show you actually read it.
2. Add YOUR perspective grounded in real experience — a specific example you saw, a number you tracked, a counterexample you encountered.
3. Optional: ask a genuine question that tightens the conversation (NOT engagement-bait — see blacklist below).

ANTI-PATTERNS — these are LinkedIn comment cliches that signal low effort:
- "Great post!" / "Love this!" / "So true!" / "Couldn't agree more!" / "100%" / "This!" — meaningless agreement
- Tagging random people without context ("@friend you should see this")
- Restating the original poster's point back to them ("Yes, X is so important")
- Generic platitudes ("communication is key", "people first")
- Self-promotion ("I wrote about this here: [link]") — kills credibility instantly
- Engagement-bait questions ("Agree?", "Thoughts?")

SPECIFICITY CHECKLIST:
- Does the comment reference something only THIS post triggered? If you could paste the same comment under any post on the same topic, it's filler.
- Does the comment include a concrete example, number, or specific from your real experience? If not, it's an opinion floating in air.
- Does the comment respect the original poster's context (their seniority, their post's tone)? A jokey comment under a serious post reads as tone-deaf.

VOICE:
- Match the original poster's tone — formal post → formal comment; casual post → casual comment.
- First person.
- No emojis as filler. One emoji is fine if it's functional and matches the post's register.
- No hashtags in comments — they're for posts.

ANTI-FABRICATION:
- Numbers, projects, tools you mention must come from the user's real profile/experiences. Same discipline as posts.
- If the user has nothing relevant to add to a particular post, the right move is to NOT comment, not to fabricate relevance.

ISRAELI MARKET NOTE:
Cross-cultural courtesy applies here too — Israeli LinkedIn users tend to comment more directly and conversationally than US norms. Don't soften the comment with excessive American hedging ("just my two cents", "happy to be wrong"). Direct + specific is the safer register for our pilot's audience.`

// OUTREACH_VOICE_RULES — for LinkedIn DM outreach (PR #35). Fundamentally
// different from posts and comments: 1:1 communication where the
// recipient EXPECTS a personal message, not content. Different rules:
// brevity is mandatory, cold-outreach reply rates depend on signal-of-
// effort (research: 12.1% reply rate for HR/talent, 16.9% for first-
// degree connections), and most DMs that fail do so because they ask
// too much too fast.
//
// Grounded in docs/research/linkedin-post-performance.md section 6
// (networking for job seekers). When pilot data contradicts a rule
// here, update the research doc first then revise this constant.
export const OUTREACH_VOICE_RULES = `WRITING QUALITY — LINKEDIN OUTREACH MESSAGES:

THE OUTREACH CONTRACT:
This is a 1:1 message to a real person with their own time, attention, and reasons-to-respond. Every message must EARN a reply. The recipient is asking three questions in their head as they read: (1) Why are you in my inbox? (2) What do you actually want? (3) Why should I care? Answer all three within the first 2 sentences or you've lost them.

LENGTH:
- Opening message: 50-150 words. Under 30 reads as low-effort; over 200 reads as a wall to deflect.
- Connection-request notes: ≤200 characters. LinkedIn's hard cap is ~300; staying under 200 leaves room for personalization.
- Follow-ups + reply messages: 30-100 words. Shorter than openers — the relationship is established.

THE FIRST 2 SENTENCES MUST DO ALL OF:
1. Why you're reaching out (specific reason — referenced their work, their company, your shared connection, the role they posted).
2. What you actually want (1-line of substantive ask — even "I'd love to connect" is acceptable when it's accurate; "looking to connect with industry leaders" is fluff).
3. Earn the reader's continued attention by being specific (no generic openers).

ANTI-PATTERNS — these kill outreach reply rates:
- "I hope this message finds you well." / "I hope you're doing well!" / "Hope you're well!" / "Trust this email finds you well." — 0% information density, all template signals. NONE of these phrasings are acceptable, in any sentence position.
- "I'd love to pick your brain." — generic, common, ignored
- "I came across your profile and was impressed by..." — hollow flattery
- "I'm reaching out because..." — burns a sentence on what should be obvious
- Asking for the big thing in turn 1 (referral, intro, recommendation) — almost always premature
- Long resume-recap of the sender's background ("As you can see from my background...")
- "Looking to connect with industry leaders / thought leaders" — generic + reads as sycophantic
- Any sentence that could be in a template — assume the recipient has seen 50 versions of it

WARMTH > FORMALITY:
Israeli LinkedIn users (our pilot's primary audience) skew direct and conversational. American formality reads as cold or robotic. Match the recipient's likely register: an alumni with a casual headline gets a casual opener; a VP at a multinational gets a slightly warmer-but-still-professional tone. Never go full-corporate ("Dear Mr. Smith, I am writing to inquire...").

SPECIFICITY:
- Reference something specific the recipient has done, said, posted, or worked on. Not their job title.
- If you have shared context (school, mutual connection, attended their talk), name it specifically with the detail (year, course, event name) — not "I see we have shared connections."
- If you have NO genuine shared context, say so honestly: "We don't know each other but..." > inventing fake intimacy.

THE ASK PRINCIPLE:
A message can have an implicit ask (introduce yourself, build relationship) or an explicit ask (15-min call, referral, recommendation). Match the ask to the relationship temperature:
- Cold + first message: implicit ask only (introduce, build context)
- Warm + first message: small explicit ask OK (15-min informational call)
- Established relationship: bigger asks OK (referral, recommendation), still framed as a request not a demand

ANTI-FABRICATION (load-bearing — outreach with fabricated specifics is more damaging than no message at all, because the recipient remembers what was actually said and discussed):
- Numbers, projects, employers, schools you reference about YOURSELF must come from the user's real profile/experiences. Never invent.
- Statements about the RECIPIENT must come from what the user provided in target_person.mutual_context or be safely-generic ("I see you're at [Company]"). Never fabricate that you've met them, attended their talk, or have inside info you don't have.
- CRITICAL — when target_person.mutual_context is sparse (e.g. "met once at X meetup"), DO NOT INVENT what you discussed there. Reference only what was provided. If you don't know what was discussed, write "We met briefly at [the event]" — not "I remember our chat about [made-up topic]." The recipient remembers what they actually talked about with you; inventing topics is detected immediately and burns trust permanently.
- Same rule for shared courses / shared events: if you only know "took the same course," do NOT fabricate which lecture, which professor's anecdote, or which assignment you both worked on. Only the fact of the shared course is grounded.

REPLY-WORTHY CLOSE:
End with a clear next-step offer that's small enough they'd say yes:
- "Open to a quick 15-min call any time next week — happy to work around your schedule" (specific time scope + flexibility)
- "Even a 1-line response would mean a lot" (lowers the bar)
- "No worries if not — totally understand" (when asking something with non-zero cost to the recipient)
SKIP: "Thoughts?" / "Looking forward to hearing from you!" / "Excited to chat!" / "Hope to hear back soon!"

PROOF-OF-EFFORT SIGNALS:
Recipients evaluate effort within 3 seconds. The signals they look for: (1) message references something specific to them, (2) length is reasonable (not 2-line and not 500-word), (3) clear ask matched to relationship temperature, (4) typo-free, (5) ends with a low-friction reply path.`
