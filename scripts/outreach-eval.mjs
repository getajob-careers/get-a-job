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
  return {
    suggested_text,
    turn_type,
    angle: typeof r.angle === "string" ? r.angle.trim().slice(0, 200) : "",
    warm_up_advice:
      typeof r.warm_up_advice === "string"
        ? r.warm_up_advice.trim().slice(0, 800)
        : "",
    conversation_state,
    warnings: Array.isArray(r.warnings)
      ? r.warnings
          .filter((w) => typeof w === "string" && w.trim())
          .map((w) => w.trim().slice(0, 300))
      : [],
  };
}

// ---- OpenAI ---------------------------------------------------------------
async function chat(model, messages, opts = {}) {
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

// Reproduce the production generate loop: propose_internship gets the
// summer/300-char regenerate; every other goal gets exactly one call.
async function generate(input) {
  const sys = buildSystemPrompt(input.goal);
  const base = userPrompt(input);
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
    if (input.goal === "propose_internship") {
      if (/\bsummer\b/i.test(cand.suggested_text)) {
        lastViolation =
          'output contained the word "summer" - the practicum is November - February. Remove all references to summer.';
        if (attempt < MAX - 1) continue;
      }
      if (
        cand.turn_type === "connection_request_note" &&
        cand.suggested_text.length > 300
      ) {
        lastViolation = `output was ${cand.suggested_text.length} chars - connection_request_note must be ≤ 300 chars.`;
        if (attempt < MAX - 1) continue;
      }
    }
    return { suggestion: cand, err: null, attempts: attempt + 1 };
  }
  return { suggestion: null, err: "gen_violations", attempts: MAX };
}

// ---- Layer 1 scoring (deterministic hard gates) ---------------------------
// Superset of the SYSTEM_PROMPT hard-rule-1 phrases + OUTREACH_VOICE_RULES
// anti-patterns + sanitizeSuggestion list. This is intentionally WIDER than
// the shipped sanitizeSuggestion detector - the gap between the two is itself
// a finding (see docs/eval/outreach-failure-taxonomy.md, Mode A).
const TEMPLATE_PHRASES = [
  "i hope this finds you well",
  "i hope this email finds you well",
  "i hope this message finds you well",
  "i hope you're doing well",
  "i hope you are doing well",
  "i hope you're well",
  "i hope you are well",
  "hope you're doing well",
  "hope you are doing well",
  "hope you're well",
  "hope you are well",
  "hope all is good",
  "hope all is well",
  "how have you been",
  "trust this finds you well",
  "trust this email finds you well",
  "i hope you're doing great", // shmuel-row variant sanitizeSuggestion misses
  "i hope you are doing great",
  "pick your brain",
  "i came across your profile",
  "i'm reaching out because",
  "i am reaching out because",
  "looking to connect with industry leaders",
  "looking to connect with thought leaders",
  "was very impressed by",
  "was really impressed by",
  "i'm impressed by",
];
// Phrases that assert recalled shared-conversation content - HARD RULE 2/3
// fabrication risk. Only a violation when the input's mutual_context does NOT
// support recalled content (sparse / factual-only).
const RECALL_PHRASES = [
  "i remember our chat",
  "i remember our conversation",
  "i recall you shared",
  "i recall our",
  "i remember we discussed",
  "i remember when we",
  "your point about",
  "stuck with me",
  "i often think back",
  "the insights i gained",
  "what you shared about",
  "when we discussed",
  "our discussion about",
];
// Hedging phrases the propose_internship framework H3 bans outright.
const HEDGE_PHRASES = [
  "i don't have much experience",
  "i'm still learning",
  "if it'd be useful",
  "if it would be useful",
  "to see if that could be a fit",
  "moderate bridge",
  "happy to chat anywhere",
  "open to anything",
];
// Engagement-bait / weak closes OUTREACH_VOICE_RULES says to SKIP.
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

function scoreLayer1(input, suggestion) {
  const text = suggestion.suggested_text;
  const wc = words(text).length;

  const template_hits = hasAny(text, TEMPLATE_PHRASES);
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
  const invented_numbers = outNums.filter(
    (n) => !inScope.includes(n.toLowerCase()),
  );

  // whether the anti-pattern chip WOULD fire in production (narrower list) - // lets us measure the detector-gap directly.
  const SHIPPED_DETECTOR = [
    "i hope this finds you well",
    "i hope this email finds you well",
    "i hope this message finds you well",
    "i hope you're doing well",
    "i hope you're well",
    "hope you are doing well",
    "hope you are well",
    "trust this finds you well",
    "pick your brain",
    "i came across your profile",
  ];
  const shipped_chip_hits = hasAny(text, SHIPPED_DETECTOR);
  // template phrases we catch that production would ship SILENTLY (no chip):
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
- register: is the tone right for the Israeli market and this recipient's warmth? Israeli professional culture is direct; US-corporate stiffness ("Dear Mr X, I am writing to inquire"), sycophancy, and over-formality score LOW. Warm-but-professional and specific score HIGH.
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
  WORD_BANDS,
  TEMPLATE_PHRASES,
};

// ---- run ------------------------------------------------------------------
function pct(x) {
  return x == null ? " n/a" : (x * 100).toFixed(0).padStart(3) + "%";
}

export async function main() {
  if (!KEY) {
    console.error(
      "OPENAI_API_KEY is required (export it or prefix the command).",
    );
    process.exit(1);
  }
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
        if (JUDGE) l2 = await judge(input, suggestion);
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

  // ---- report -------------------------------------------------------------
  const lines = [];
  lines.push(
    `\n=== Outreach eval - model=${MODEL}${JUDGE ? ` judge=${JUDGE_MODEL}` : ""} - SYNTHETIC (n=${INPUTS.length}) ===\n`,
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
        l2 && typeof l2.specificity === "number"
          ? String(l2.specificity).padStart(3)
          : "n/a",
        l2 && typeof l2.register === "number"
          ? String(l2.register).padStart(3)
          : "n/a",
        l2 && typeof l2.ask_calibration === "number"
          ? String(l2.ask_calibration).padStart(3)
          : "n/a",
        l2 && typeof l2.reply_worthiness === "number"
          ? String(l2.reply_worthiness).padStart(3)
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
  lines.push(`SET MEAN quality: ${pct(mean((r) => r.quality))}`);
  lines.push(
    `GATE FAILS  anti_pattern: ${
      scored
        .filter((r) => !r.l1.anti_pattern_pass)
        .map((r) => r.id)
        .join(", ") || "none"
    }`,
  );
  lines.push(
    `            anti_fab:     ${
      scored
        .filter((r) => !r.l1.anti_fab_pass)
        .map((r) => r.id)
        .join(", ") || "none"
    }`,
  );
  lines.push(
    `            hedge:        ${
      scored
        .filter((r) => !r.l1.hedge_pass)
        .map((r) => r.id)
        .join(", ") || "none"
    }`,
  );
  lines.push(
    `SILENT TEMPLATE (ships w/ no warning chip): ${
      scored
        .filter((r) => r.l1.undetected_template.length)
        .map((r) => r.id)
        .join(", ") || "none"
    }`,
  );
  lines.push(
    `FABRICATED RECALL (sparse mutual_context):   ${
      scored
        .filter((r) => r.l1.recall_hits.length)
        .map((r) => r.id)
        .join(", ") || "none"
    }`,
  );
  lines.push(
    `COLD ASK (multi-step, ask w/o warm-up):      ${
      scored
        .filter((r) => r.l1.ask_calibration_flag)
        .map((r) => r.id)
        .join(", ") || "none"
    }`,
  );
  lines.push(
    `LENGTH OFF-BAND:                             ${
      scored
        .filter((r) => !r.l1.length_ok)
        .map((r) => `${r.id}(${r.l1.word_count}w)`)
        .join(", ") || "none"
    }`,
  );
  if (JUDGE)
    lines.push(
      `JUDGE MEANS  specificity: ${mean((r) => r.l2?.specificity || 0).toFixed(0)}  register: ${mean((r) => r.l2?.register || 0).toFixed(0)}  ask_calibration: ${mean((r) => r.l2?.ask_calibration || 0).toFixed(0)}  reply_worthiness: ${mean((r) => r.l2?.reply_worthiness || 0).toFixed(0)}`,
    );

  const report = lines.join("\n");
  console.log(report);

  const outDir = join(ROOT, "docs/eval/results");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(
    outDir,
    `outreach-baseline${JUDGE ? "-judged" : ""}-${stamp}.json`,
  );
  writeFileSync(
    outPath,
    JSON.stringify({ model: MODEL, judge: JUDGE, ts: stamp, rows }, null, 2),
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
