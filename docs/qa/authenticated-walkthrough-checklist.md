# Manual QA Walkthrough — Get A Job (authenticated app)

> Read-only audit deliverable, 2026-07-08. Execute with (a) a signed-in user with a completed profile + generated roadmap, a few tracked applications, and ≥1 saved story, AND (b) a brand-new account (no roles/apps/stories) to hit empty states. Turnstile CAPTCHA gates auth.

## Route map (src/App.jsx + src/pages.lazy.js)

- `/`, `/Landing` → public landing (LandingV2Preview), NOT gated
- `/Home`, `/Career`, `/CVAgent`, `/CareerAgent`, `/InterviewCoach`, `/SkillDevelopmentAdvisor`, `/Linkedin`, `/StoryBank`, `/Internship`, `/Resources`, `/Settings`, `/Profile`, `/Roadmap`, `/Tasks`, `/Calendar` → auth-gated
- `/Jobs` → 302 `/Career`; `/Tracker` → 302 `/Career?pipeline=open`; `/Practicum` → 302 `/Internship`

---

## Global shell — src/Layout.jsx

□ Sidebar: Today/Career/Chat(collapsible)/Profile; Internship appears only when profile.practicum_path set
□ Chat section expand/collapse; 4 sub-items; active section auto-expands, can't collapse while active
□ Active page coral tint + dot; TopLoadingBar on nav (~600ms)
□ Mobile <1024px: hamburger overlay, X/backdrop close; MobileCoachTrigger chip; centered brand
□ SidebarFooter: initials avatar → /Settings; name/email render
□ RISKY: Sign out → logout() → redirect + session cleared
□ "About Get A Job" → /Landing (no bounce for logged-in)
□ Chrome-gate: brief no-sidebar window on first load; onboarding_complete=false bounces to /Onboarding
□ FeedbackWidget on every authed page EXCEPT /Onboarding and /CVAgent
□ Feedback modal: 4 category chips → textarea + route + counter (max 2000); disabled until category+message; success/error toasts; message preserved on error

## Home / Today — src/pages/Home.jsx

□ Onboarding incomplete / no profile / profile error → redirect to Onboarding
□ Self-heal fires ONCE (generate-career-analysis force:true); does NOT re-fire on re-render
□ Self-heal >85s → red banner "Analysis is taking longer than expected." + Try again
□ 503 vs generic vs persist-failure copy variants; `?preview-selfheal=1` paints pending
□ Loading → HomeSkeleton; rolesError/appsError → red refresh banner; stale → golden "Refresh roadmap"
□ GoalRefinementNudge (vague goal) once/session; First-CV CTA (roles≥1, no non-master CV)
□ Progress ring when ringTotal>0; focus card checkbox persists per-day; focus body → focusDestination (dailyAction null → Roadmap)
□ 4 StatBlocks deep-links; liveMatchCount null → "—" (RPC count_active_jobs_by_role_titles)
□ Today's plan: ≤4 tasks, optimistic flip + rollback; empty variants; Quick tiles; Pipeline funnel + "worth your attention" (max 2) + empty variants
□ Coach band headline ladder; CTA OPENS DRAWER pre-seeded (not nav)

## Career — Jobs feed — src/pages/Career.jsx / src/components/jobs/UnifiedJobsFeed.jsx

□ /Jobs → 302 /Career; ?role= → Search-All tab + prefilled keyword
□ Cold load spinner; roles==0 + pending → "Building your matches…"; roles==0 not pending → "Generate your roadmap first" → /Roadmap
□ Tabs Job search / Pipeline (?pipeline=open) must NOT remount feed on switch
□ RISK: search_jobs_by_role_titles error → red banner NO retry (recover via tab/reload)
□ Empty variants: no_roles ("Track 1" hardcoded — FRAGILE), no_matches, relevance-gated
□ "Load more" +60, dedupe, guarded vs double-click (requestSeqRef)
□ Search All Jobs: 1000/page pagination; filters (keyword/seniority/worktype/function/location); "Clear filters"; zero-result copy; "Load more" +24
□ Job cards: click/Enter/Space → modal; hover-dwell ~450ms PEEK (no flicker on scroll); badge omitted when unscored (NOT "0%")
□ Job detail modal: Esc/backdrop, scroll lock, description load/"No description"; Track (optimistic, revert+toast on fail, dup→no double-insert); Apply link only when apply_url
□ Matched-roles panel: auto-expand first, AxisBars (no numerals), null score omits bar, "Full role detail →" → /Roadmap

## Career — Tracker/Pipeline — src/components/tracker/*

□ /Tracker → 302 ?pipeline=open; ?app=<id> opens drawer; ?app=<bad-id> → no crash
□ Funnel strip counts; "How to use" guide dismiss persists (localStorage); "Add manually"; empty state
□ Kanban desktop 7 cols; drag → optimistic status, fail → "Reverted." toast + snap back; client must NOT write status_changes
□ Card click vs drag → drawer; match% only when scored (0.62→"62%", unscored→no "0%"); "May be inactive" cross-ref (error → warn, no crash)
□ Kanban mobile <768px accordion + "Move to:" select
□ AddApplicationDialog: Add disabled until Role; JD → insert+score ("Analysing…"); no JD → Unclassified no error; insert fail → inline error, stays open
□ Detail drawer tabs: Steps/Target role/CV/Skills/Projects/Networking/Application/Interview(locked <Interviewing)/Follow-up(locked <Offer)
□ Status select fail toast; Track badge / "Retry scoring" / "Calculating…"; Delete two-step confirm + fail toast; collapse-with-unsaved → window.confirm
□ Steps checklist N/7; step 6 locked until 1–5; step 1 → /CareerAgent?application_id (guard vs null); step 3 generate-tailored-cv (no JD→toast, fail→toast, success→toast+Open in CV Agent); step 5 → /Linkedin networking (company fallback); step 7 → /InterviewCoach (guard)
□ CV tab: Generate (no JD→toast, thin-source→confirm modal, auth-expired), Download (blob, fail toast), "Chat with CV Agent" (no application_id — verify intended)

## CV Studio — src/components/cv-studio/CVStudioLive.jsx

□ Signed-out → "Sign in to load your CVs."; EMPTY → "No master CV yet" + "Build my master CV" (disabled until profile)
□ RISKY build → "Building…" → studio / fail toast
□ CV selector dropdown (Master golden / tailored teal); hover row → Trash; delete → window.confirm (master vs tailored copy) + fail toast
□ Save-state pill: saved / saving… / save failed
□ Download → "Rendering PDF…" (render-cv); errors; dense→8s notice (not error); master renders
□ Templates rail 5 cards → live accent/font swap
□ Inline edit name/headline/email/etc → autosave (800ms) pill; fail → toast; MASTER bullet edit → "Save to profile" action
□ Experience edit/add bullet/drag reorder; conditional sections (Military/Volunteering/Leadership) only when present
□ CV Agent chips (Rewrite/Tighten/Keywords/Tailor) → edit-cv; error copy; omitted sections preserved after edit
□ RISKY tailoring (refine-cv): app WITH JD → banner sequence; no master → "Preparing master (~40s)"; NO application_id → No-JD card (does NOT fire → avoids 400); 429 "limit reached (30/hour)"; fallback "refresh to see it"
□ Tailor outcome card (fit phrases, View/Download); No-JD card modal (tracked-apps list + paste box); deep-link ?cv=/?application_id= selects correct CV

## Coach / Chat (shared) — src/components/chat/ChatInterface.jsx

□ Input: Send enables on text; Enter/Shift+Enter; no double-send; auto-grow; initialInput seed
□ Empty state introMessage + suggested chips (send on click); loading/streaming dots
□ Happy path: optimistic user bubble persisted; lazy convo creation (insert fail toast)
□ EDGE-FN FAIL: red bubble "couldn't reach the AI… Retry"; 401 → 1 auto refresh+retry, else "session expired… sign out" + Retry suppressed; empty reply → generic + Retry
□ Convo switcher (page only): New / select (rehydrate CV cards) / delete (active→clear, error toast); cold-mount does NOT auto-resume
□ application_id scoping (no context bleed; key remount)
□ Action cards MUTATE data — Task/Roadmap/Application/CompanyTarget/AgentRedirect; each Apply idempotent (no double-write)
□ CVGenerationCard: CLICK-GATED (no fire-on-mount); Download/Open in Studio/View in tracker (latter two only w/ application_id); error → Try again
□ RISKY (MEMORY 400): CV gen with application_id null must NOT orphan — unknownCompany toast; confirm no 400

## Chat cards + rendering — MessageBubble.jsx, BulletSaveCard, AddSkillCard, AgentIntro, CoachDock, AgentDrawer, MobileCoachTrigger

□ FRAGILE isCV() substring heuristic can spuriously offer "Download CV as PDF" on normal chat
□ Download-as-PDF lazy jsPDF; FunctionDisplay tool_calls expand
□ BulletSaveCard: target picker, empty-profile note, Draft/Preview/Save (in-memory only), Undo
□ AddSkillCard: Add to profile / "Already on that experience" / error
□ AgentIntro expand/collapse (visits 1–2 expanded, 3+ collapsed, localStorage)
□ Context dropdown on CareerAgent + InterviewCoach ONLY; empty apps → General only; FRAGILE InterviewCoach "role at company" no null guard
□ CoachDock: permanent sidebar, Maximize2 → drawer same convo; short-viewport collapse; empty prompts; edge-fn fail retry; SuggestionRow per-kind isolation; CV click-gated single-fire (cvFiredRef); MEMORY 400 needsCompany parking + verbal-accept auto-fire once
□ AgentDrawer: open/close (X/overlay/Esc) preserve seed; desktop right 520px / mobile bottom sheet; z-order above ApplicationDetailDrawer
□ MobileCoachTrigger chip <768px opens drawer

## LinkedIn — ProfileTab / PostsTab / NetworkingTab

□ Page tabs Profile/Posts/Networking underline + ?tab= sync; ?tab=garbage → Profile
□ RISKY generate-linkedin-content: Generate/Regenerate; 429/404/fallback/network errors; hydration from linkedin_optimizations; empty state + tip
□ ArchiveUploader (import-linkedin-archive): non-zip / >50MB / 429/413/400 errors; "Parsing…" → baseline chip
□ ProfilePreview Current/Optimized toggle; per-section Refine (409 "run full Generate first"); Copy (client) states
□ Posts: view machine idle→compose→preview; 7 type pills; per-type canSubmit gating; RISKY generate-linkedin-post (429/404/malformed); StoryBankSidebar attach/detach; PostPreview autosave (silent fail — FRAGILE), FRAGILE post.hook_preview no guard, inert engagement buttons; Refine; PostImageUpload (type/size/orphan-on-remove); PostsList delete (optimistic, NO restore on fail — FRAGILE)
□ Networking: strategy guide → Resources; deep-links (goal/prefill*); OutreachConversationsList states; OutreachComposer goal→target→thread; RISKY generate-linkedin-outreach-message (5 shapes, shared lock, 429/404 errors); thread edit/reply/suggestion (warm_up_advice load-bearing); status Done/Shelve; CommentCoach (generate-linkedin-comment) anti-fab "no genuine relevance" branch, ephemeral

## Story Bank — src/pages/StoryBank.jsx

□ Empty state (icon + copy); empty w/ experience → create modal, zero experience → /Profile?tab=experience
□ Filter chips All/Linked/General + ?filter=; stale-filter guard (no empty page); experience_id filter pill
□ StorySaveCard: Extract&preview (extract-story-from-text) → STAR preview edit → Save (DB insert), fail → toast + back to preview
□ Daily Action handoff (location.state.dailyAction) auto-opens + marks done (FRAGILE mark-done only console.warns)
□ StoryCard expand/tags/preview; delete two-step; StoryEditor STAR+arrays, scoped update, fail toast

## Internship — src/pages/Internship.jsx

□ No practicum_path → redirect Home; loading skeleton; tabs Pipeline/Browse + ?tab=browse
□ self_sourced no profile → NoInternshipProfile CTA; FRAGILE inert "Generator landing Tuesday" hardcoded label
□ RISKY generate-internship-profile (429/400/empty/catch); profile strip staleness banner
□ FindCompaniesCard (match-internship-companies 4/hr): scored toast / 0-match / errors
□ AddOwnCompanyModal: name required; dup (23505) toast; FRAGILE orphan rollback (delete companies row if target insert fails)
□ Kanban desktop 6 cols / mobile accordion; drag optimistic + revert; drawer (generate-internship-pitch 400 missing_profile/429); status two-phase write; notes autosave on blur; remove → AlertDialog + hard DELETE
□ Browse: ~819 companies, faceted filters, cards (Live jobs badge, match band), CompanyDetailDrawer (?company=, pitch on open, Add to pipeline, dup 23505)

## Roadmap — src/pages/Roadmap.jsx

□ Error/loading states; empty (no profile / 0 roles → "Build my roadmap")
□ RISKY handleGenerate: refreshSession → generate-career-analysis(force) → replace_career_roles RPC (DESTRUCTIVE) → profile stamp; session-expired / timeout / 503 / partial-persist copy
□ GeneratingBanner (~80s) dims list; QualificationBand; tab routing (?tab=)
□ WhyTab quadrant → jump to track; TrackTab prev/next arrows disabled at ends; RoleCard expand, bars, "See <role> jobs" → Career?role=, low-coverage gate copy

## Tasks — src/pages/Tasks.jsx

□ Loading/error; empty copy variants (no profile / 0 roles / ready)
□ RISKY generate-tasks (DESTRUCTIVE delete-then-insert incompletes); error → inline banner + Try again; cleanup-delete-fail toast
□ Onboarding-fallback banner; category filters; toggle complete (optimistic+rollback, guarded); delete (optimistic+rollback); due-date inline (range validation); priority badge; sort order

## Calendar — src/pages/Calendar.jsx

□ Loading; eventsError banner (apps/tasks load errors SILENT — FRAGILE); legend 4 categories
□ Aggregation (events/tasks/applications); Month/Week/Day toggle; nav Prev/Next/Today
□ Right-rail empty/populated; ItemCard click routing; AddEventDialog (validations, all-day, link-to-application, insert fail toast)

## Resources — src/pages/Resources.jsx

□ 9 accordion cards (static, no Supabase); single-open behavior; first = NetworkingPrinciples; markdown formatting; keyboard nav; no external links/downloads

## Settings — src/pages/Settings.jsx

□ PasswordCard: reauthenticate() 6-digit nonce → updateUser({password,nonce}); send-code / verify / expired / start-over
□ Reset onboarding (DESTRUCTIVE reset_user_data RPC): two-step confirm → clears caches → /Onboarding; error toast
□ Delete account (DESTRUCTIVE delete-account edge-fn): type "delete my account" to enable; success → logout + /Login?deleted=1 banner; double-submit guarded

## Profile — src/pages/Profile.jsx

□ 6 tabs (Profile/Education/Goals/Self-assessment/Projects/Experience); ?tab= sync; legacy certifications→education
□ Profile tab: name/phone/location/linkedin/summary; SkillTagInput (595 lib); UnmappedSkills "Did you mean"; Languages; RISKY resume upload — RAW supabase.storage.upload, NO timeout/retry (onboardingUploadResiliency NOT wired here — test slow/large/hang); Save (fresh spine read)
□ Education: form validations, recomputeProfileSkillsCanonical (fail console-only), SkillTagInputs, delete confirm(), BulletsEditor, CertificationsSection
□ Goals & preferences: 5yr role, domain, qualification, tag editors, employment MultiSelectTiles, work env, start date
□ Self-assessment: challenges multi-select, StackedRadio custom, role clarity 1–5, save
□ Projects: name required, delete NO confirm (instant — FRAGILE)
□ Experience: story-bank summary card, form (title+company required), recompute, delete NO confirm (instant), BulletsEditor
□ BulletsEditor (Experience+Education): add/move/delete; "Add with AI" (extract-bullets, anti-fab gated); Save merges pendingSkills

---

## Cross-cutting fragile paths to prioritize

1. **Coach "Generate CV" on an unlinked/general chat** (MEMORY known P0: 400 on application_id:null) — test Coach Dock AND full-page chat with no application; confirm no 400 / no orphaned CV.
2. **Profile resume upload has NO timeout/retry** (raw supabase.storage.upload; onboardingUploadResiliency NOT wired here) — most fragile uncovered upload path.
3. **Every generate button** (LinkedIn/Coach/Roadmap/Tasks/Internship) can 429/404/400/malformed-JSON — verify each error banner/toast + buttons re-enable (no stuck spinners).
4. **Destructive writes**: Roadmap Refresh (replace_career_roles), Tasks Generate (delete-then-insert), Settings reset/delete, all deletes — confirm-gates + rollbacks.
5. **Silent-failure UI**: LinkedIn PostPreview autosave, PostsList optimistic delete (no restore), Calendar apps/tasks load errors, StoryBank mark-done.
6. **isCV() substring heuristic** — spurious "Download CV as PDF" on normal chat.
