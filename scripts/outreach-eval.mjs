#!/usr/bin/env node
// LinkedIn-outreach quality eval harness (generate-linkedin-outreach-message).
//
// Runs the FROZEN synthetic input set (docs/eval/outreach-inputs.json) through
// the live outreach prompt stack and scores each output against the frozen
// rubric (docs/eval/outreach-rubric.md). real linkedin_outreach_conversations
// rows are n=1 user (internal) and PRE-date the current framework, so this
// synthetic set is the only forward-looking measure.
//
// Mirrors production EXACTLY (2026-06-11 lesson - a harness must never be more
// permissive than the deployed consumer):
//   - The full system prompt is ASSEMBLED the same way index.ts does at line
//     417: SYSTEM_PROMPT + "\n\n" + OUTREACH_VOICE_RULES + "\n\n" + framework.
//     All three parts are READ OUT of source at runtime (regex), never
//     re-typed, so the harness cannot drift from what ships.
//   - user prompt assembly mirrors index.ts:435-449 (goal, target_person,
//     targetCompany block, thread, userData, turn hint).
//   - parse is JSON.parse(content || "{}") + the same sanitizeSuggestion shape
//     (suggested_text trim/slice 4000, turn_type/state validation). No fence
//     stripping, no JSON-repair.
//   - the propose_internship-only regenerate loop (summer + 300-char note) is
//     reproduced; the other 8 goals get exactly one call, as in production.
//
// Usage:
//   OPENAI_API_KEY=sk-... node scripts/outreach-eval.mjs            # score all
//   OPENAI_API_KEY=sk-... node scripts/outreach-eval.mjs --judge    # + LLM judge
//   OPENAI_API_KEY=sk-... node scripts/outreach-eval.mjs --only alumni-warm-casual
//
// NO fixes are applied here - this scores the CURRENT deployed prompt so the
// baseline is honest. Fix experiments come after Eli confirms the taxonomy.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const args = process.argv.slice(2);
const JUDGE = args.includes("--judge");
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
// --dry-run exercises the ENTIRE path (generate loop, scoring, summary table,
// JSON write) with STUBBED chat responses and NO paid calls. Mandatory gate
// before any real baseline: a report-path bug (bare `l2`) crashed a full paid
// run on 2026-07-23 after all 12 cases had already been billed.
const DRY = args.includes("--dry-run");
const MODEL = "gpt-4o"; // must match generate-linkedin-outreach-message MODEL
const JUDGE_MODEL = "gpt-4o";

// Strip anything outside printable ASCII (U+2028/U+2029 burned a story-eval run
// on 2026-07-23). An OpenAI key is printable ASCII, no spaces.
const KEY = (process.env.OPENAI_API_KEY || "").replace(/[^\x21-\x7E]/g, "");

// ---- load frozen inputs + the LIVE prompt stack (drift-safe) ---------------
const inputsDoc = JSON.parse(
  readFileSync(join(ROOT, "docs/eval/outreach-inputs.json"), "utf8"),
);
const PERSONAS = inputsDoc.personas || {};
// Resolve user_data from the shared persona map (user_data_ref) unless the
// input carries an inline user_data. Keeps personas DRY across inputs.
const INPUTS = inputsDoc.inputs
  .filter((i) => !ONLY || i.id === ONLY)
  .map((i) => ({
    ...i,
    user_data: i.user_data || PERSONAS[i.user_data_ref] || {},
  }));

const EDGE = join(
  ROOT,
  "supabase/functions/generate-linkedin-outreach-message/index.ts",
);
const VOICE = join(ROOT, "supabase/functions/_shared/voice-rules.ts");
const FW = join(
  ROOT,
  "supabase/functions/_shared/outreach-frameworks/frameworks.ts",
);

function readConst(file, name) {
  const src = readFileSync(file, "utf8");
  const m = src.match(new RegExp(`const ${name} = \`([\\s\\S]*?)\`;?\\n`));
  if (!m) {
    console.error(`Could not read ${name} from ${file} - const shape changed.`);
    process.exit(1);
  }
  return m[1];
}

// Read a string-array const (or `new Set([...])`) out of source. Fix #1.5
// (2026-07-23): the phrase lists MUST be one source of truth shared by the
// edge fn (detectViolations + sanitizeSuggestion) and this harness, or they
// drift - a SHIPPED_DETECTOR stale copy let "i'm impressed by" read as SILENT
// while production actually chipped it. index.ts is that source; the harness
// consumes it here so drift is impossible.
function readArrayConst(file, name) {
  const src = readFileSync(file, "utf8");
  // Anchor on `=` so a `: string[]` type annotation's empty brackets are not
  // mistaken for the array; allow an optional `new Set(` wrapper. Entries are
  // double-quoted (apostrophes inside phrases are safe since the delimiter is ").
  const m = src.match(
    new RegExp(`const ${name}[^=]*=\\s*(?:new Set\\()?\\[([\\s\\S]*?)\\]`),
  );
  if (!m) {
    console.error(`Could not read array const ${name} from ${file}.`);
    process.exit(1);
  }
  const out = [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
  if (out.length === 0) {
    console.error(`Array const ${name} parsed to 0 entries - regex drift.`);
    process.exit(1);
  }
  return out;
}

const SYSTEM_PROMPT = readConst(EDGE, "SYSTEM_PROMPT");
const OUTREACH_VOICE_RULES = readConst(VOICE, "OUTREACH_VOICE_RULES");
// FRAMEWORK_BY_GOAL maps goal -> the *_FRAMEWORK const; mirror it here by
// reading each named framework const so the harness tracks source verbatim.
const FRAMEWORK_CONST_BY_GOAL = {
  message_recruiter: "MESSAGE_RECRUITER_FRAMEWORK",
  message_hiring_manager: "MESSAGE_HIRING_MANAGER_FRAMEWORK",
  message_alumni: "MESSAGE_ALUMNI_FRAMEWORK",
  request_informational_interview: "REQUEST_INFORMATIONAL_INTERVIEW_FRAMEWORK",
  thank_you_follow_up: "THANK_YOU_FOLLOW_UP_FRAMEWORK",
  reconnect_dormant: "RECONNECT_DORMANT_FRAMEWORK",
  ask_for_referral: "ASK_FOR_REFERRAL_FRAMEWORK",
  ask_for_recommendation: "ASK_FOR_RECOMMENDATION_FRAMEWORK",
  propose_internship: "PROPOSE_INTERNSHIP_FRAMEWORK",
};
const FRAMEWORK_BY_GOAL = Object.fromEntries(
  Object.entries(FRAMEWORK_CONST_BY_GOAL).map(([g, c]) => [
    g,
    readConst(FW, c),
  ]),
);

// ---- prompt assembly (mirrors index.ts:417-449) ---------------------------
function buildSystemPrompt(goal) {
  return (
    SYSTEM_PROMPT +
    "\n\n" +
    OUTREACH_VOICE_RULES +
    "\n\n" +
    FRAMEWORK_BY_GOAL[goal]
  );
}

// Effective thread mirrors index.ts:282-295: a new_them_reply (incl. the
// empty-string silence signal) is appended as a 'them' message before the
// prompt is built. mark_as_sent would append a 'user' message (not used here).
function effectiveThread(input) {
  const thread = [...(input.thread || [])];
  if (input.new_them_reply !== undefined && input.new_them_reply !== null) {
    thread.push({ role: "them", text: input.new_them_reply.trim() });
  }
  return thread;
}

function turnHint(input) {
  const thread = effectiveThread(input);
  if (thread.length === 0)
    return "OPENER - generate the first message of the conversation.";
  const last = thread[thread.length - 1];
  if (input.new_them_reply === "")
    return "FOLLOW_UP_AFTER_SILENCE - the user marked the recipient as silent (no reply yet). Coach a soft follow-up that does NOT pile on. Acknowledge silence honestly without being passive-aggressive.";
  if (last?.role === "them")
    return "NEXT_RESPONSE - the recipient just replied. Read their reply carefully and coach a response that advances the goal.";
  return "NEXT_TURN - the user wants the next AI suggestion. Read the thread state carefully and decide what to coach next.";
}

function userPrompt(input) {
  const tc = input.target_company;
  const thread = effectiveThread(input).map((msg, i) => ({
    turn: i + 1,
    role: msg.role,
    text: msg.text,
  }));
  return `OUTREACH GOAL: ${input.goal}

TARGET PERSON:
${JSON.stringify(input.target_person, null, 2)}

${tc ? `TARGET COMPANY (from registry - use description for the specific company hook, do NOT invent details):\n${JSON.stringify(tc, null, 2)}\n` : "TARGET COMPANY: (no registry row matched - do NOT invent company details, fall back to sector/stage framing only)\n"}
CONVERSATION THREAD (so far):
${thread.length === 0 ? "(empty - no messages sent yet)" : JSON.stringify(thread, null, 2)}

USER DATA (the SENDER's profile, experiences, Story Bank, internship pitch context, schools - use these to ground the message in real specifics):
${JSON.stringify(input.user_data, null, 2)}

TURN HINT: ${turnHint(input)}

Now produce the next AI-coached suggestion as JSON per the output spec. Apply the goal-specific framework above + OUTREACH_VOICE_RULES strictly. If the user is pushing for the goal's ask in a turn that's premature given thread state, set warm_up_advice with explicit coaching for the warm-up turn instead.`;
}

// ---- production-mirrored parse + sanitize (index.ts:591-642) ---------------
function sanitizeSuggestion(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const validTurnTypes = [
    "opener",
    "follow_up_after_silence",
    "next_response",
    "connection_request_note",
  ];
  const validStates = [
    "cold_open",
    "warming_up",
    "rapport_built",
    "making_the_ask",
    "awaiting_reply",
    "goal_complete",
  ];
  const turn_type =
    typeof r.turn_type === "string" && validTurnTypes.includes(r.turn_type)
      ? r.turn_type
      : "next_response";
  const conversation_state =
    typeof r.conversation_state === "string" &&
    validStates.includes(r.conversation_state)
      ? r.conversation_state
      : "warming_up";
  const suggested_text =
    typeof r.suggested_text === "string"
      ? r.suggested_text.trim().slice(0, 4000)
      : "";
  // Mirror the fn's widened warn-chip: chip BOTH the hard TEMPLATE_PHRASES and
  // the SOFT_TEMPLATE_PHRASES (the gate regenerates on hard only, but the user
  // still sees a chip for soft). Same source lists.
  const lower = norm(suggested_text);
  const programmaticWarnings = [];
  for (const p of [...TEMPLATE_PHRASES, ...SOFT_TEMPLATE_PHRASES]) {
    if (lower.includes(norm(p))) {
      const warn = `"${p}" reads as template outreach - replace it with a specific reason for reaching out.`;
      if (!programmaticWarnings.includes(warn)) programmaticWarnings.push(warn);
    }
  }
  const rawWarnings = Array.isArray(r.warnings)
    ? r.warnings
        .filter((w) => typeof w === "string" && w.trim())
        .map((w) => w.trim().slice(0, 300))
    : [];
  return {
    suggested_text,
    turn_type,
    angle: typeof r.angle === "string" ? r.angle.trim().slice(0, 200) : "",
    warm_up_advice:
      typeof r.warm_up_advice === "string"
        ? r.warm_up_advice.trim().slice(0, 800)
        : "",
    conversation_state,
    warnings: [...rawWarnings, ...programmaticWarnings].slice(0, 8),
  };
}

// ---- OpenAI ---------------------------------------------------------------
// Deterministic stub for --dry-run: no network, no key. Returns the same JSON
// SHAPE the real API returns (a content string), keyed off the prompt so the
// dry-run exercises gate-pass, gate-fail, the summer-retry loop, and the judge
// path across the frozen set. NOT meaningful scores - a path exerciser only.
function dryChat(messages) {
  const system = messages[0]?.content || "";
  const user = messages[1]?.content || "";
  if (/quality judge/i.test(system)) {
    return JSON.stringify({
      specificity: 70,
      register: 55,
      ask_calibration: 60,
      reply_worthiness: 72,
    });
  }
  const goal =
    (user.match(/OUTREACH GOAL: (\w+)/) || [])[1] || "message_recruiter";
  const retry = user.includes("PREVIOUS ATTEMPT VIOLATED");
  const CLEAN =
    "Hi there, I run VIP customer success at Guardio, a cyber startup, and I am targeting customer success roles. I saw your team is scaling the function, and I built a Slack bot that flagged stuck renewal deals and saved my team eight hours a week. Would a quick chat work, or I can send my resume over.";
  let text = CLEAN;
  let turn_type = "opener";
  if (goal === "message_hiring_manager") {
    // triggers anti_pattern gate fail + SILENT_TEMPLATE (undetected variant)
    text =
      "Hi there, I hope you're doing great. I run customer success at Guardio and would love to connect about how your team is scaling.";
  } else if (goal === "ask_for_recommendation") {
    text = "Hi, would you write me a recommendation? Thanks so much."; // length OFF-BAND
  } else if (goal === "propose_internship") {
    // summer on first attempt exercises the regenerate loop; clean on retry
    text = retry
      ? "Hi there, I'm in Reichman's Business Administration practicum, a supervised placement from November to February at about 12 hours a week, and I'd love to do mine in product operations at your company where the security-ops automation is compelling. I run VIP customer success at a cyber startup. Worth a quick 15-minute call."
      : "Hi there, I'd love to do a product operations internship for the summer at your company. I run VIP customer success at a cyber startup and would bring user-friction insight to product ops. Worth a quick call.";
  }
  return JSON.stringify({
    suggested_text: text,
    turn_type,
    angle: "dry-run stub",
    warm_up_advice: "",
    conversation_state: "cold_open",
    warnings: [],
  });
}

async function chat(model, messages, opts = {}) {
  if (DRY) return dryChat(messages);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.5, // matches index.ts:471
      max_tokens: opts.max_tokens ?? 1500,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok)
    throw new Error(
      `OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`,
    );
  const j = await res.json();
  return j.choices?.[0]?.message?.content || "{}";
}

// Reproduce the production generate loop. Fix #1 (2026-07-23): detectViolations
// enforces the rubric layer-1 gates for ALL goals with one regenerate; on
// exhaustion it falls through and accepts the last candidate. Mirrors
// index.ts detectViolations + the loop EXACTLY (harness must not be more/less
// strict than production).
async function generate(input) {
  const sys = buildSystemPrompt(input.goal);
  const base = userPrompt(input);
  const groundingScope = JSON.stringify({
    userData: input.user_data,
    targetCompany: input.target_company,
    activeTarget: input.target_person,
  }).toLowerCase();
  const MAX = 2;
  let lastViolation = null;
  for (let attempt = 0; attempt < MAX; attempt++) {
    const prompt =
      attempt === 0
        ? base
        : `${base}\n\nPREVIOUS ATTEMPT VIOLATED: ${lastViolation}. Regenerate the suggested_text with the violation fixed. Keep angle/conversation_state/warnings consistent.`;
    const content = await chat(MODEL, [
      { role: "system", content: sys },
      { role: "user", content: prompt },
    ]);
    let parsed;
    try {
      parsed = JSON.parse(content || "{}");
    } catch {
      return { suggestion: null, err: "json_parse", attempts: attempt + 1 };
    }
    const cand = sanitizeSuggestion(parsed);
    if (!cand.suggested_text)
      return {
        suggestion: null,
        err: "empty_suggestion",
        attempts: attempt + 1,
      };
    const violation = detectViolations(
      cand,
      input.goal,
      input.target_person,
      groundingScope,
    );
    if (violation) {
      lastViolation = violation;
      if (attempt < MAX - 1) continue;
    }
    if (
      input.goal === "propose_internship" &&
      cand.turn_type === "connection_request_note" &&
      cand.suggested_text.length > 300
    ) {
      lastViolation = `output was ${cand.suggested_text.length} chars - connection_request_note must be <= 300 chars.`;
      if (attempt < MAX - 1) continue;
    }
    return { suggestion: cand, err: null, attempts: attempt + 1 };
  }
  return { suggestion: null, err: "gen_violations", attempts: MAX };
}

// ---- Layer 1 scoring (deterministic hard gates) ---------------------------
// SINGLE SOURCE OF TRUTH: these lists are read verbatim from the edge fn
// (index.ts), which consumes them in BOTH detectViolations (the regenerate
// gate) and sanitizeSuggestion (the widened warn-chip). Reading them here
// means the harness scorer, the harness detectViolations mirror, and the
// harness sanitizer can never drift from what ships. (2026-07-23 fix: a
// hardcoded stale SHIPPED_DETECTOR let "i'm impressed by" read as SILENT.)
const TEMPLATE_PHRASES = readArrayConst(EDGE, "TEMPLATE_PHRASES");
// SOFT tier (hub ruling 2026-07-23): "impressed by <specific company detail>"
// is specific flattery - chipped but NOT regenerated and NOT an anti_pattern
// hard-fail. specificity/register judging + Fix #2 own the nuance.
const SOFT_TEMPLATE_PHRASES = readArrayConst(EDGE, "SOFT_TEMPLATE_PHRASES");
const RECALL_PHRASES = readArrayConst(EDGE, "RECALL_PHRASES");
const HEDGE_PHRASES = readArrayConst(EDGE, "HEDGE_PHRASES");
// Engagement-bait / weak closes OUTREACH_VOICE_RULES says to SKIP. Harness-only
// soft flag (not a gate, not in the edge fn).
const WEAK_CLOSE_PHRASES = [
  "looking forward to hearing from you",
  "excited to chat",
  "hope to hear back soon",
  "thoughts?",
];

const WORD_BANDS = {
  // [min, max] words for an opener. connection_request_note is char-capped.
  message_recruiter: [50, 150],
  message_hiring_manager: [50, 150],
  message_alumni: [50, 150],
  request_informational_interview: [50, 150],
  thank_you_follow_up: [50, 150],
  reconnect_dormant: [50, 100],
  ask_for_referral: [50, 150],
  ask_for_recommendation: [50, 150],
  propose_internship: [1, 80], // opener ≤ 80 words
};

// Framework-injected logistics numbers for propose_internship ONLY (practicum
// ~10-12 hrs/week + call-duration ask 15/20/30 min). Read from the edge fn so
// the exemption can't drift from production. See docs/eval/outreach-rubric.md.
const FRAMEWORK_STRUCTURAL_NUMBERS = new Set(
  readArrayConst(EDGE, "FRAMEWORK_STRUCTURAL_NUMBERS"),
);

function words(s) {
  return s.trim().split(/\s+/).filter(Boolean);
}
// Normalize curly apostrophes/quotes to straight so a model emitting "you’re"
// can't evade a phrase list written with "you're". Models emit both styles.
function norm(s) {
  return s.toLowerCase().replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"');
}
function hasAny(text, list) {
  const lower = norm(text);
  return list.filter((p) => lower.includes(norm(p)));
}
// mutual_context is "sparse" when it's null/empty or has < 6 words of actual
// content - too thin to license any recalled-conversation specifics.
function mutualContextSparse(input) {
  const mc = (input.target_person?.mutual_context || "").trim();
  return words(mc).length < 6;
}

// Generation-side gate: mirrors index.ts detectViolations EXACTLY so the
// harness reproduces Fix #1's regenerate loop and measures its effect. Returns
// a regenerate-hint string on the first violation, else null. This drives
// generate() only; the frozen scorer (scoreLayer1) is unchanged.
function detectViolations(candidate, goal, target, groundingScope) {
  const text = candidate.suggested_text;
  const lower = norm(text);
  for (const p of TEMPLATE_PHRASES)
    if (lower.includes(norm(p)))
      // Candidate B: mirror index.ts - forbid any opener pleasantry, require
      // the first sentence to be the specific hook.
      return `template phrase "${p}" is banned. Do NOT open with any greeting or pleasantry; make the FIRST sentence the specific hook or context (the role, the shared work, the reason you are writing). Warmth comes from specificity, not a pleasantry.`;
  for (const p of HEDGE_PHRASES)
    if (lower.includes(norm(p)))
      return `low-confidence hedging phrase "${p}"; state the value directly.`;
  if (mutualContextSparse({ target_person: target }))
    for (const p of RECALL_PHRASES)
      if (lower.includes(norm(p)))
        return `recalled shared-conversation content ("${p}") with no mutual_context to support it; reference only the fact of the connection.`;
  if (goal === "propose_internship" && /\bsummer\b/i.test(text))
    return 'the output contains "summer"; the practicum runs November to February.';
  const nums = (text.match(/\b\d[\d,]*\.?\d*%?\b/g) || [])
    .map((n) => n.replace(/[,%]/g, ""))
    .filter((n) => parseFloat(n) >= 10);
  for (const n of nums) {
    if (groundingScope.includes(n)) continue;
    if (goal === "propose_internship" && FRAMEWORK_STRUCTURAL_NUMBERS.has(n))
      continue;
    return `the number ${n} is not grounded in the provided data; remove invented figures.`;
  }
  return null;
}

function scoreLayer1(input, suggestion) {
  const text = suggestion.suggested_text;
  const wc = words(text).length;

  const template_hits = hasAny(text, TEMPLATE_PHRASES); // HARD tier only
  const soft_template_hits = hasAny(text, SOFT_TEMPLATE_PHRASES); // flag, not fail
  const hedge_hits = hasAny(text, HEDGE_PHRASES);
  const weak_close_hits = hasAny(text, WEAK_CLOSE_PHRASES);
  const recall_hits = mutualContextSparse(input)
    ? hasAny(text, RECALL_PHRASES)
    : [];
  const summer_hit =
    input.goal === "propose_internship" && /\bsummer\b/i.test(text);

  // Sender-side fabrication: any metric-shaped number in the message that
  // isn't groundable in user_data. Reuse a light metric-number gate.
  const inScope = JSON.stringify(input.user_data || {}).toLowerCase();
  const outNums = [...(text.match(/\b\d[\d,]*\.?\d*%?\b/g) || [])]
    .map((n) => n.replace(/[,%]/g, ""))
    .filter((n) => parseFloat(n) >= 10); // metric-shaped only
  const invented_numbers = outNums.filter((n) => {
    if (inScope.includes(n.toLowerCase())) return false;
    // Scoped exemption (2026-07-23, hub-authorized on verbatim confirmation):
    // propose_internship injects logistics numbers BY THE FRAMEWORK - the
    // practicum load (~10-12 hrs/week) and the call-duration ask (15/20/30
    // min) - which are not sender-claimed achievement metrics. Exempt them for
    // this goal ONLY so the anti_fab gate stops false-firing on every
    // internship message. Non-structural numbers (a fabricated 45% etc.) still
    // gate. See docs/eval/outreach-rubric.md anti_fab note.
    if (
      input.goal === "propose_internship" &&
      FRAMEWORK_STRUCTURAL_NUMBERS.has(n)
    )
      return false;
    return true;
  });

  // Which HARD template hits production's warn-chip would MISS (ship silently).
  // The chip catches BOTH tiers (TEMPLATE_PHRASES + SOFT_TEMPLATE_PHRASES), read
  // from the same source, so undetected is structurally empty. Live regression
  // guard against list/iteration drift; the verbatim sanitizer test is the
  // behavioral guard. Pre-Fix-#1 a stale narrow copy falsely reported
  // "i'm impressed by" as SILENT.
  const shipped_chip_hits = hasAny(text, [
    ...TEMPLATE_PHRASES,
    ...SOFT_TEMPLATE_PHRASES,
  ]);
  const undetected_template = template_hits.filter(
    (p) => !shipped_chip_hits.includes(p),
  );

  const anti_pattern_pass = template_hits.length === 0;
  const anti_fab_pass =
    recall_hits.length === 0 && invented_numbers.length === 0 && !summer_hit;
  const length_ok =
    wc >= WORD_BANDS[input.goal][0] && wc <= WORD_BANDS[input.goal][1];
  const hedge_pass = hedge_hits.length === 0;

  // Ask-calibration heuristic: for the two multi-step goals on a cold/dormant
  // FIRST turn, an explicit ask in the opener is a red flag - the framework
  // says warm up first. Detect explicit-ask verbs + empty thread + dormant.
  const firstTurn = (input.thread || []).length === 0;
  const multiStepColdAsk =
    firstTurn &&
    (input.goal === "reconnect_dormant" ||
      (input.goal === "ask_for_referral" && input.expect_path === "B")) &&
    /(refer me|referral|introduce me|intro to|would you be open to referring|recommend me|catch up sometime|would love to meet)/i.test(
      text,
    ) &&
    !suggestion.warm_up_advice;
  const ask_calibration_flag = multiStepColdAsk;

  return {
    word_count: wc,
    length_ok,
    anti_pattern_pass,
    template_hits,
    soft_template_hits, // chipped + flagged, NOT an anti_pattern hard-fail
    undetected_template, // ships with NO warning in production
    anti_fab_pass,
    recall_hits,
    invented_numbers,
    summer_hit,
    hedge_pass,
    hedge_hits,
    weak_close_hits,
    ask_calibration_flag,
    warm_up_advice_present: !!suggestion.warm_up_advice,
  };
}

// ---- Layer 2 judge --------------------------------------------------------
async function judge(input, suggestion) {
  const sys = `You are a strict LinkedIn-outreach quality judge for an Israeli-market career tool (business students -> Israeli tech). Score ONE suggested DM. Return ONLY JSON {"specificity":0-100,"register":0-100,"ask_calibration":0-100,"reply_worthiness":0-100}.
- specificity: does the message reference something CONCRETE about the recipient (from mutual_context) and the sender (real experience), or is it interchangeable filler that could be sent to anyone? Generic flattery scores LOW.
- register: is the tone CASUAL-DIRECT, the way Israelis actually message on LinkedIn - short, informal-but-respectful, no throat-clearing? That is the target and scores HIGH. Over-formality, US-corporate stiffness ("Dear Mr X, I am writing to inquire"), sycophancy, and stiff throat-clearing score LOW. Warm-but-professional-yet-still-formal is NOT the target - if it reads like a polished cover letter rather than a real person's DM, mark it DOWN.
- ask_calibration: is the ASK matched to the relationship temperature and the goal's framework? Asking the big thing (referral/intro/recommendation) on a cold or dormant first turn scores LOW. A withheld ask + warm-up on a dormant relationship scores HIGH.
- reply_worthiness: would a busy recipient actually reply? Weigh effort-signal, length fit, and a low-friction close.
PENALISE fabricated familiarity (claiming recalled conversations not supported by mutual_context) to 0 on specificity AND register.`;
  const usr = `GOAL: ${input.goal}
TARGET PERSON: ${JSON.stringify(input.target_person)}
SENDER user_data (the ONLY facts groundable about the sender): ${JSON.stringify(input.user_data)}
THREAD SO FAR: ${JSON.stringify(input.thread || [])}

SUGGESTED MESSAGE:
${suggestion.suggested_text}

warm_up_advice field: ${suggestion.warm_up_advice || "(empty)"}`;
  const content = await chat(
    JUDGE_MODEL,
    [
      { role: "system", content: sys },
      { role: "user", content: usr },
    ],
    { temperature: 0 },
  );
  try {
    return JSON.parse(content);
  } catch {
    return {
      specificity: null,
      register: null,
      ask_calibration: null,
      reply_worthiness: null,
    };
  }
}

// ---- composite ------------------------------------------------------------
function composite(l1, l2) {
  // Any hard-gate failure zeroes the composite (same discipline as story-eval).
  if (!l1.anti_pattern_pass || !l1.anti_fab_pass || !l1.hedge_pass) return 0;
  const parts = [l1.length_ok ? 1 : 0];
  if (l2 && typeof l2.specificity === "number")
    parts.push(
      l2.specificity / 100,
      l2.register / 100,
      l2.ask_calibration / 100,
      l2.reply_worthiness / 100,
    );
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

export {
  scoreLayer1,
  composite,
  sanitizeSuggestion,
  buildReport,
  detectViolations,
  WORD_BANDS,
  TEMPLATE_PHRASES,
};

// ---- run ------------------------------------------------------------------
function pct(x) {
  return x == null ? " n/a" : (x * 100).toFixed(0).padStart(3) + "%";
}

// Pure report builder. Extracted + exported so the ENTIRE reporting path is
// unit-testable with synthetic rows and NO OpenAI call - the 2026-07-23 bug was
// a bare `l2` in this block that only fired AFTER a full paid run finished.
// Reads nothing from module globals; all run metadata comes through opts.
function buildReport(rows, opts = {}) {
  const {
    judge: withJudge = false,
    model = MODEL,
    judgeModel = JUDGE_MODEL,
    n = rows.length,
  } = opts;
  const lines = [];
  lines.push(
    `\n=== Outreach eval - model=${model}${withJudge ? ` judge=${judgeModel}` : ""} - SYNTHETIC (n=${n}) ===\n`,
  );
  lines.push(
    "id                          goal                     len  wc   antiPat antiFab hedge  spec reg ask rep  QUALITY  flags",
  );
  lines.push("─".repeat(120));
  for (const r of rows) {
    if (r.err && !r.l1) {
      lines.push(
        `${r.id.padEnd(27)} ${(r.goal || "").padEnd(24)} ERR ${r.err}`,
      );
      continue;
    }
    const l = r.l1;
    const flags = [];
    if (l.undetected_template.length)
      flags.push(`SILENT_TEMPLATE(${l.undetected_template.length})`);
    if (l.soft_template_hits && l.soft_template_hits.length)
      flags.push("SOFT_TEMPLATE");
    if (l.recall_hits.length) flags.push("FABRICATED_RECALL");
    if (l.summer_hit) flags.push("SUMMER");
    if (l.hedge_hits.length) flags.push("HEDGE");
    if (l.weak_close_hits.length) flags.push("WEAK_CLOSE");
    if (l.ask_calibration_flag) flags.push("COLD_ASK");
    lines.push(
      [
        r.id.padEnd(27),
        (r.goal || "").padEnd(24),
        l.length_ok ? " ok " : "OFF ",
        String(l.word_count).padStart(3),
        l.anti_pattern_pass ? " ok  " : "FAIL ",
        l.anti_fab_pass ? " ok  " : "FAIL ",
        l.hedge_pass ? " ok " : "FAIL",
        r.l2 && typeof r.l2.specificity === "number"
          ? String(r.l2.specificity).padStart(3)
          : "n/a",
        r.l2 && typeof r.l2.register === "number"
          ? String(r.l2.register).padStart(3)
          : "n/a",
        r.l2 && typeof r.l2.ask_calibration === "number"
          ? String(r.l2.ask_calibration).padStart(3)
          : "n/a",
        r.l2 && typeof r.l2.reply_worthiness === "number"
          ? String(r.l2.reply_worthiness).padStart(3)
          : "n/a",
        " " + pct(r.quality),
        " " + flags.join(","),
      ].join(" "),
    );
  }
  lines.push("─".repeat(120));
  const scored = rows.filter((r) => r.l1);
  const mean = (f) =>
    scored.reduce((a, r) => a + f(r), 0) / Math.max(1, scored.length);
  const ids = (pred) =>
    scored
      .filter(pred)
      .map((r) => r.id)
      .join(", ") || "none";
  lines.push(`SET MEAN quality: ${pct(mean((r) => r.quality))}`);
  lines.push(
    `GATE FAILS  anti_pattern: ${ids((r) => !r.l1.anti_pattern_pass)}`,
  );
  lines.push(`            anti_fab:     ${ids((r) => !r.l1.anti_fab_pass)}`);
  lines.push(`            hedge:        ${ids((r) => !r.l1.hedge_pass)}`);
  lines.push(
    `SILENT TEMPLATE (ships w/ no warning chip): ${ids((r) => r.l1.undetected_template.length)}`,
  );
  lines.push(
    `FABRICATED RECALL (sparse mutual_context):   ${ids((r) => r.l1.recall_hits.length)}`,
  );
  lines.push(
    `COLD ASK (multi-step, ask w/o warm-up):      ${ids((r) => r.l1.ask_calibration_flag)}`,
  );
  lines.push(
    `LENGTH OFF-BAND:                             ${
      scored
        .filter((r) => !r.l1.length_ok)
        .map((r) => `${r.id}(${r.l1.word_count}w)`)
        .join(", ") || "none"
    }`,
  );
  if (withJudge)
    lines.push(
      `JUDGE MEANS  specificity: ${mean((r) => r.l2?.specificity || 0).toFixed(0)}  register: ${mean((r) => r.l2?.register || 0).toFixed(0)}  ask_calibration: ${mean((r) => r.l2?.ask_calibration || 0).toFixed(0)}  reply_worthiness: ${mean((r) => r.l2?.reply_worthiness || 0).toFixed(0)}`,
    );
  return lines.join("\n");
}

export async function main() {
  if (!DRY && !KEY) {
    console.error(
      "OPENAI_API_KEY is required (export it or prefix the command). Use --dry-run to exercise the full path with no key.",
    );
    process.exit(1);
  }
  if (DRY)
    process.stderr.write(
      "[DRY-RUN] stubbed generation + judge; no paid calls.\n",
    );
  const rows = [];
  for (const input of INPUTS) {
    process.stderr.write(`· ${input.id} (${input.goal})… `);
    let suggestion = null,
      l1 = null,
      l2 = null,
      err = null,
      attempts = 0;
    try {
      const g = await generate(input);
      suggestion = g.suggestion;
      err = g.err;
      attempts = g.attempts;
      if (suggestion) {
        l1 = scoreLayer1(input, suggestion);
        if (JUDGE || DRY) l2 = await judge(input, suggestion);
      }
    } catch (e) {
      err = e.message;
    }
    const q = l1 ? composite(l1, l2) : 0;
    rows.push({
      id: input.id,
      goal: input.goal,
      persona: input.persona,
      err,
      attempts,
      suggestion,
      l1,
      l2,
      quality: q,
    });
    process.stderr.write(
      err
        ? `ERR ${err}\n`
        : `q=${(q * 100).toFixed(0)}%${l1 && (!l1.anti_pattern_pass || !l1.anti_fab_pass) ? " GATE_FAIL" : ""}\n`,
    );
  }

  const report = buildReport(rows, {
    judge: JUDGE || DRY,
    model: MODEL,
    judgeModel: JUDGE_MODEL,
    n: INPUTS.length,
  });
  console.log(report);

  const outDir = join(ROOT, "docs/eval/results");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(
    outDir,
    `${DRY ? "outreach-dryrun" : `outreach-baseline${JUDGE ? "-judged" : ""}`}-${stamp}.json`,
  );
  writeFileSync(
    outPath,
    JSON.stringify(
      { model: MODEL, judge: JUDGE, dry: DRY, ts: stamp, rows },
      null,
      2,
    ),
  );
  console.log(
    `\nFull results (verbatim suggested_text) → ${outPath.replace(ROOT + "/", "")}`,
  );
}

// Run only when invoked directly, so the deterministic scorer can be imported
// and unit-tested without triggering a paid OpenAI run.
if (process.argv[1] && process.argv[1].endsWith("outreach-eval.mjs")) {
  main();
}
