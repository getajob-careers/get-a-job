// Unit tests for the deterministic scorer in outreach-eval.mjs.
// Picked up by `npm test` (vitest default globs). Importing the harness runs
// only module-level setup - main() is guarded behind a direct-invocation check,
// so no OpenAI call fires here.
import { describe, it, expect } from "vitest";
import {
  scoreLayer1,
  composite,
  buildReport,
  detectViolations,
  sanitizeSuggestion,
} from "./outreach-eval.mjs";

const alumniSparse = {
  goal: "message_alumni",
  thread: [],
  target_person: { name: "Idan", mutual_context: "both went to Reichman" },
  user_data: { full_name: "Noa", summary: "consulting club lead" },
};

describe("scoreLayer1 - template-phrase gate + detector gap", () => {
  it("passes a clean, specific opener within band", () => {
    const s = scoreLayer1(
      {
        goal: "message_recruiter",
        thread: [],
        target_person: { mutual_context: "posted a req" },
        user_data: { note: "Guardio Slack bot saved 8 hours" },
      },
      {
        suggested_text:
          "Hi Sarah, I run VIP customer success at Guardio, a cyber startup, and I am targeting Customer Success roles. I saw Wiz posted a Customer Success Specialist req. I built a Slack bot that flagged stuck renewal deals and saved my team eight hours a week. Open to a quick chat, or happy to send my resume.",
        warm_up_advice: "",
      },
    );
    expect(s.anti_pattern_pass).toBe(true);
    expect(s.length_ok).toBe(true);
    expect(composite(s, null)).toBe(1);
  });

  it("fails the template gate on 'I hope this finds you well'", () => {
    const s = scoreLayer1(alumniSparse, {
      suggested_text:
        "Hi Idan, I hope this finds you well. Fellow Reichman grad here, would love to connect and hear about your path.",
      warm_up_advice: "",
    });
    expect(s.anti_pattern_pass).toBe(false);
    expect(s.template_hits).toContain("i hope this finds you well");
  });

  // Mode A closed by Fix #1: "i hope you're doing great" was silent pre-fix
  // (shipped detector missed it). Post-fix the sanitizer's list == the full
  // shared TEMPLATE_PHRASES, so it is DETECTED (chipped), not silent. It is
  // still an anti_pattern hard-fail because the phrase is in the text.
  it("no longer reports a widened-list template variant as silent (Fix #1)", () => {
    const s = scoreLayer1(alumniSparse, {
      suggested_text:
        "Hi Idan, I hope you're doing great. Fellow Reichman grad here and would love to connect about growth marketing.",
      warm_up_advice: "",
    });
    expect(s.anti_pattern_pass).toBe(false);
    expect(s.template_hits).toContain("i hope you're doing great");
    expect(s.undetected_template).toEqual([]);
  });

  it("normalizes curly apostrophes so 'you’re' cannot evade the gate", () => {
    const s = scoreLayer1(alumniSparse, {
      suggested_text:
        "Hi Idan, I hope you’re doing well. Reichman grad here, would love to connect and learn about your marketing path over the years.",
      warm_up_advice: "",
    });
    expect(s.anti_pattern_pass).toBe(false);
  });
});

describe("scoreLayer1 - fabricated-recall gate keys off mutual_context", () => {
  const recallText = {
    suggested_text:
      "Hi Idan, I remember our chat about growth and your point about lifecycle really stuck with me. Reichman grads should stick together. Would love twenty minutes to hear how you approach marketing analytics today and where the field is heading.",
    warm_up_advice: "",
  };

  it("fails when mutual_context is sparse (invents a shared memory)", () => {
    const s = scoreLayer1(alumniSparse, recallText);
    expect(s.anti_fab_pass).toBe(false);
    expect(s.recall_hits.length).toBeGreaterThan(0);
    expect(composite(s, null)).toBe(0);
  });

  it("does NOT fire when mutual_context actually supports recalled content", () => {
    const richCtx = {
      ...alumniSparse,
      target_person: {
        name: "Yael",
        mutual_context:
          "we both took Prof Lee's Customer Discovery course and she TA'd my section, we talked about segmentation after class",
      },
    };
    const s = scoreLayer1(richCtx, recallText);
    expect(s.recall_hits.length).toBe(0);
  });
});

describe("scoreLayer1 - sender-side number fabrication", () => {
  it("flags a metric-shaped number not groundable in user_data", () => {
    const s = scoreLayer1(
      {
        goal: "message_recruiter",
        thread: [],
        target_person: { mutual_context: "req" },
        user_data: { note: "saved 8 hours a week" },
      },
      {
        suggested_text:
          "Hi Sarah, I run customer success at Guardio and drove a 45% increase in renewals last quarter across the enterprise segment which is exactly the motion your team is scaling right now.",
        warm_up_advice: "",
      },
    );
    expect(s.anti_fab_pass).toBe(false);
    expect(s.invented_numbers).toContain("45");
  });

  // Scoped exemption (2026-07-23): propose_internship's framework-injected
  // logistics numbers (~12 hrs/week practicum, 15-min ask) must NOT gate.
  it("does NOT flag framework-structural 12/15 for propose_internship", () => {
    const s = scoreLayer1(
      {
        goal: "propose_internship",
        thread: [],
        target_person: { mutual_context: null },
        user_data: { summary: "consulting club lead, B2B segmentation" },
      },
      {
        suggested_text:
          "Hi Greg, I'm doing Reichman's Business Administration practicum this year (structured placement, Nov-Feb, ~12 hrs/week). I led three client engagements at the consulting club including a B2B segmentation project. Open to a 15-minute conversation?",
        warm_up_advice: "",
      },
    );
    expect(s.invented_numbers).toEqual([]);
    expect(s.anti_fab_pass).toBe(true);
  });

  it("STILL flags a fabricated non-structural number for propose_internship", () => {
    const s = scoreLayer1(
      {
        goal: "propose_internship",
        thread: [],
        target_person: { mutual_context: null },
        user_data: { summary: "consulting club lead" },
      },
      {
        suggested_text:
          "Hi Greg, I'm in Reichman's practicum (~12 hrs/week). I drove a 45% lift in adoption on a client project. Open to a 15-minute conversation?",
        warm_up_advice: "",
      },
    );
    expect(s.invented_numbers).toContain("45");
    expect(s.anti_fab_pass).toBe(false);
  });

  it("keeps the exemption SCOPED: 15 still gates for non-internship goals", () => {
    const s = scoreLayer1(
      {
        goal: "message_recruiter",
        thread: [],
        target_person: { mutual_context: "posted a req" },
        user_data: { note: "customer success at Guardio" },
      },
      {
        suggested_text:
          "Hi Sarah, I run customer success at Guardio and I am targeting customer success roles at your company where the team is scaling fast. I closed 15 enterprise renewals last quarter and would bring that motion to the role. Open to a quick chat about the fit soon?",
        warm_up_advice: "",
      },
    );
    expect(s.invented_numbers).toContain("15");
    expect(s.anti_fab_pass).toBe(false);
  });
});

describe("scoreLayer1 - hedging + length + ask calibration", () => {
  it("fails the hedge gate on a propose_internship banned phrase", () => {
    const s = scoreLayer1(
      {
        goal: "propose_internship",
        thread: [],
        target_person: { mutual_context: null },
        user_data: {},
      },
      {
        suggested_text:
          "Hi Greg, I'm in Reichman's practicum program and would love to explore product ops at 7AI. My customer success work could be a moderate bridge to product operations, if it'd be useful to chat.",
        warm_up_advice: "",
      },
    );
    expect(s.hedge_pass).toBe(false);
    expect(s.hedge_hits).toContain("moderate bridge");
    expect(s.hedge_hits).toContain("if it'd be useful");
  });

  it("flags a cold ask on a dormant reconnect first turn with no warm_up_advice", () => {
    const s = scoreLayer1(
      {
        goal: "reconnect_dormant",
        thread: [],
        target_person: {
          mutual_context: "sat on the same intern project two summers ago",
        },
        user_data: {},
      },
      {
        suggested_text:
          "Hey Roi, been a while since our intern project. I'm job hunting now and was wondering if you'd be open to introducing me to recruiting at Fireblocks. Would love to catch up sometime and hear how things are going for you over there.",
        warm_up_advice: "",
      },
    );
    expect(s.ask_calibration_flag).toBe(true);
  });

  it("does not flag the cold ask when warm_up_advice is present", () => {
    const s = scoreLayer1(
      {
        goal: "reconnect_dormant",
        thread: [],
        target_person: {
          mutual_context: "sat on the same intern project two summers ago",
        },
        user_data: {},
      },
      {
        suggested_text:
          "Hey Roi, been a while since our intern project two years back. Saw you moved into product at Fireblocks, congrats. How are the first months treating you?",
        warm_up_advice:
          "Send this reconnection first, no ask. After Roi replies, we'll bring up the intro in your next turn.",
      },
    );
    expect(s.ask_calibration_flag).toBe(false);
  });

  it("marks an off-band (too short) opener", () => {
    const s = scoreLayer1(
      {
        goal: "message_recruiter",
        thread: [],
        target_person: { mutual_context: "req" },
        user_data: {},
      },
      {
        suggested_text: "Hi Sarah, are you hiring? Thanks.",
        warm_up_advice: "",
      },
    );
    expect(s.length_ok).toBe(false);
  });
});

// Regression coverage for the 2026-07-23 crash: a bare `l2` (should be `r.l2`)
// in the report loop threw ReferenceError AFTER a full paid run, killing the
// summary + JSON write. buildReport is the extracted, pure report path; these
// exercise every row shape it must render without throwing.
describe("buildReport - reporting path (no OpenAI)", () => {
  const l1full = {
    word_count: 60,
    length_ok: true,
    anti_pattern_pass: true,
    template_hits: [],
    undetected_template: [],
    anti_fab_pass: true,
    recall_hits: [],
    invented_numbers: [],
    summer_hit: false,
    hedge_pass: true,
    hedge_hits: [],
    weak_close_hits: [],
    ask_calibration_flag: false,
    warm_up_advice_present: false,
  };
  const gateFailL1 = {
    ...l1full,
    anti_pattern_pass: false,
    template_hits: ["i hope you're doing great"],
    undetected_template: ["i hope you're doing great"],
    length_ok: false,
    word_count: 24,
  };

  const rows = [
    {
      id: "with-judge",
      goal: "message_recruiter",
      l1: l1full,
      l2: {
        specificity: 70,
        register: 55,
        ask_calibration: 60,
        reply_worthiness: 72,
      },
      quality: 0.71,
    },
    // The exact shape that crashed: an l1 row with NO l2 (judge absent).
    {
      id: "no-judge",
      goal: "message_alumni",
      l1: l1full,
      l2: null,
      quality: 0.5,
    },
    {
      id: "gate-fail",
      goal: "message_hiring_manager",
      l1: gateFailL1,
      l2: null,
      quality: 0,
    },
    {
      id: "err-row",
      goal: "thank_you_follow_up",
      l1: null,
      l2: null,
      err: "openai_502",
      quality: 0,
    },
  ];

  it("renders every row shape without throwing (judge on)", () => {
    const out = buildReport(rows, {
      judge: true,
      model: "gpt-4o",
      judgeModel: "gpt-4o",
      n: rows.length,
    });
    expect(typeof out).toBe("string");
    expect(out).toContain("with-judge");
    expect(out).toContain("no-judge");
    expect(out).toContain("n/a"); // the no-l2 row renders n/a, not a crash
    expect(out).toContain("ERR openai_502");
    expect(out).toContain("GATE FAILS  anti_pattern: gate-fail");
    expect(out).toContain(
      "SILENT TEMPLATE (ships w/ no warning chip): gate-fail",
    );
    expect(out).toContain("JUDGE MEANS");
  });

  it("renders without throwing when judge is off (no JUDGE MEANS line)", () => {
    const out = buildReport(rows, {
      judge: false,
      model: "gpt-4o",
      judgeModel: "gpt-4o",
      n: rows.length,
    });
    expect(typeof out).toBe("string");
    expect(out).not.toContain("JUDGE MEANS");
    expect(out).toContain("LENGTH OFF-BAND:");
  });

  it("handles an all-error set (no scored rows) without dividing by zero", () => {
    const errOnly = [
      {
        id: "e1",
        goal: "message_recruiter",
        l1: null,
        l2: null,
        err: "boom",
        quality: 0,
      },
    ];
    expect(() => buildReport(errOnly, { judge: true })).not.toThrow();
  });
});

// Fix #1 (2026-07-23): detectViolations is the generation-side gate that drives
// the regenerate loop for ALL goals. It mirrors index.ts detectViolations.
describe("detectViolations - Fix #1 enforcement gate", () => {
  const cand = (t) => ({ suggested_text: t });
  const scope = (o) => JSON.stringify(o || {}).toLowerCase();

  it("flags a template phrase (any goal)", () => {
    const v = detectViolations(
      cand("Hi Sarah, I hope this finds you well. I run CS at Guardio."),
      "message_recruiter",
      { mutual_context: "req" },
      scope({ note: "guardio" }),
    );
    expect(v).toMatch(/template phrase/i);
  });

  it("flags a hedging phrase", () => {
    const v = detectViolations(
      cand("Hi, my CS work could be a moderate bridge to product ops."),
      "message_hiring_manager",
      { mutual_context: "posted" },
      scope({}),
    );
    expect(v).toMatch(/hedging/i);
  });

  it("flags fabricated recall only when mutual_context is sparse", () => {
    const sparse = detectViolations(
      cand("Great to reconnect - your point about growth stuck with me."),
      "message_alumni",
      { mutual_context: "both at Reichman" },
      scope({}),
    );
    expect(sparse).toMatch(/recalled/i);
    const rich = detectViolations(
      cand("Great to reconnect - your point about growth stuck with me."),
      "message_alumni",
      {
        mutual_context:
          "we took Prof Lee's Customer Discovery course and talked after class about segmentation",
      },
      scope({}),
    );
    expect(rich).toBeNull();
  });

  it("flags summer for propose_internship", () => {
    const v = detectViolations(
      cand("I'd love a product ops internship for the summer at your company."),
      "propose_internship",
      { mutual_context: null },
      scope({}),
    );
    expect(v).toMatch(/summer/i);
  });

  it("flags an invented number not in the grounding scope", () => {
    const v = detectViolations(
      cand("I drove a 45% lift in renewals last quarter."),
      "message_recruiter",
      { mutual_context: "req" },
      scope({ note: "customer success" }),
    );
    expect(v).toMatch(/45/);
  });

  it("passes a number that IS grounded (in scope)", () => {
    const v = detectViolations(
      cand("My Slack bot saved the team 40 hours a month."),
      "message_recruiter",
      { mutual_context: "req" },
      scope({ story: "saved 40 hours a month" }),
    );
    expect(v).toBeNull();
  });

  it("passes framework-structural 12/15 for propose_internship", () => {
    const v = detectViolations(
      cand(
        "Reichman practicum, ~12 hrs/week, Nov-Feb. Open to a 15-minute call?",
      ),
      "propose_internship",
      { mutual_context: null },
      scope({ summary: "consulting club" }),
    );
    expect(v).toBeNull();
  });

  it("returns null for a clean, grounded message", () => {
    const v = detectViolations(
      cand(
        "Hi Sarah, I run customer success at Guardio and saw your Customer Success req. Open to a quick chat about the fit?",
      ),
      "message_recruiter",
      { mutual_context: "posted a req" },
      scope({ note: "customer success at guardio" }),
    );
    expect(v).toBeNull();
  });

  // The Riverside gate-re-run survivor, post-soften ruling (2026-07-23): its
  // "i'm impressed by <specific named company detail>" is SOFT-tier. So it must
  // PASS the regenerate gate (no hard violation) yet STILL get a chip, and NOT
  // be an anti_pattern hard-fail. This is the exact case the ruling targets.
  it("Riverside verbatim: SOFT phrase passes the gate but is still chipped", () => {
    const verbatim =
      "Hi Avi, I'm Maya Rosen, a final-year Business student at Tel Aviv University focusing on growth marketing. I'm impressed by Riverside's platform for recording studio-quality podcasts and videos remotely. In my role as Marketing Lead at the TAU Entrepreneurship Club, I successfully increased signups for our annual startup competition through strategic email and social campaigns. I'd love to explore opportunities to apply my skills at Riverside. Could we set up a brief 15-minute call to discuss this further?";
    const target = { mutual_context: null };
    const gscope = scope({ summary: "TAU entrepreneurship club marketing" });
    // 1. detectViolations does NOT regenerate on a soft phrase (no hard hit).
    const v = detectViolations(
      cand(verbatim),
      "propose_internship",
      target,
      gscope,
    );
    expect(v).toBeNull();
    // 2. sanitizeSuggestion STILL chips the soft phrase (user sees it).
    const chips = sanitizeSuggestion({ suggested_text: verbatim }).warnings;
    expect(chips.some((w) => w.includes("impressed by"))).toBe(true);
    // 3. The scorer: soft flag, NOT an anti_pattern hard-fail, not SILENT.
    const l1 = scoreLayer1(
      {
        goal: "propose_internship",
        thread: [],
        target_person: target,
        user_data: { summary: "TAU" },
      },
      { suggested_text: verbatim, warm_up_advice: "" },
    );
    expect(l1.anti_pattern_pass).toBe(true);
    expect(l1.template_hits).toEqual([]);
    expect(l1.soft_template_hits).toContain("i'm impressed by");
    expect(l1.undetected_template).toEqual([]);
  });

  it("SOFT tier: chipped + flagged but NOT a violation; HARD tier still regenerates", () => {
    const soft = cand(
      "Hi Dana, I'm impressed by Snyk's developer-first security scanning. I run CS at Guardio and would love to compare notes on the motion.",
    );
    const softV = detectViolations(
      soft,
      "message_hiring_manager",
      { mutual_context: "posted" },
      scope({ note: "guardio" }),
    );
    expect(softV).toBeNull(); // soft does not regenerate
    const softL1 = scoreLayer1(
      {
        goal: "message_hiring_manager",
        thread: [],
        target_person: { mutual_context: "posted" },
        user_data: { note: "guardio" },
      },
      { suggested_text: soft.suggested_text, warm_up_advice: "" },
    );
    expect(softL1.anti_pattern_pass).toBe(true);
    expect(softL1.soft_template_hits).toContain("i'm impressed by");
    expect(
      sanitizeSuggestion(soft).warnings.some((w) => w.includes("impressed by")),
    ).toBe(true);

    // HARD tier phrase still regenerates + hard-fails.
    const hard = cand(
      "Hi Dana, I hope this finds you well. I run CS at Guardio.",
    );
    expect(
      detectViolations(
        hard,
        "message_hiring_manager",
        { mutual_context: "posted" },
        scope({}),
      ),
    ).toMatch(/template phrase/i);
  });
});
