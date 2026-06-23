// Phase 2.2 — refine re-bake harness (NOT auto-run; invoked manually after review).
//
// Decides whether the Sonnet refine (refine-cv) is NON-INFERIOR to from-scratch
// (generate-tailored-cv), beyond keyword coverage. Mirrors the design in
// docs/research/refine-rebake-harness-2026-06.md.
//
// Run (manual, after the disable_retry PR #363 is deployed):
//   SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... OPENAI_API_KEY=... OPENROUTER_API_KEY=... \
//     node scripts/refine-rebake.mjs            # full run
//     node scripts/refine-rebake.mjs --cleanup  # only remove tagged throwaway apps
//
// It DOES NOT flip CV_REFINE_ENABLED. It prints a verdict + per-pair table + the
// single-pass coverage distribution (for the retry-threshold recommendation).
//
// Faithfulness: both arms invoke the DEPLOYED functions (not replicas). refine-cv
// needs an application_id, so per pair the harness creates a THROWAWAY application
// (company tagged HARNESS_TAG) under the pair's user, runs both arms against it,
// captures the resulting application_cvs rows, then DELETES the throwaway app + its
// cv rows. --cleanup re-runs the deletion idempotently.

import { createClient } from "@supabase/supabase-js";

const URL = "https://ilmqmodklutztuybsvwd.supabase.co";
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY || process.env.SMOKE_ANON_KEY;
const OPENAI = process.env.OPENAI_API_KEY;
const OPENROUTER = process.env.OPENROUTER_API_KEY;
const HARNESS_TAG = "__REBAKE_HARNESS__";

// ── Seed-account safety gate (added per PR #385 findings) ─────────────────────
// WHY THIS EXISTS: this harness mints real magic-link JWTs for every profile it
// selects and writes throwaway applications + CVs against their real user_id. A
// 2026-06-19 run wrote 9 applications + 11 CVs against 8 real accounts, 5 of them
// real non-team pilot users, because the eligible set was "every onboarded
// profile with a master CV". See scripts/findings/harness-contamination-cleanup.md
// (PR #385) for the full contamination map and cleanup.
//
// To make "write to a real user_id in production" impossible, the harness now
// runs ONLY against the dedicated +-convention seed accounts below, and HARD
// ABORTS (fail closed, no override flag, no --force) if any selected user_id is
// not a seed. Eli's real id (4b243f3a-...) is deliberately NOT in this list.
const SEED_ACCOUNTS = new Set([
  "42d8133f-302f-4b75-99a0-d3b6d322b8fa", // isaacselig+demo@gmail.com (early-career seed)
  "78260897-3641-4c8f-a769-81c46580d5bd", // yishailieser+demo3@gmail.com (mid seed)
]);

// Throws (fail closed) if any target user_id is not a dedicated seed account.
// The thrown error names the offending id(s); main()'s catch prints it and exits 1.
function assertSeedOnly(userIds) {
  const offenders = [...new Set(userIds)].filter(
    (id) => !SEED_ACCOUNTS.has(id),
  );
  if (offenders.length > 0) {
    throw new Error(
      `SEED GATE: refusing to run. Non-seed user_id(s) in the target set: ` +
        `${offenders.join(", ")}. This harness writes throwaway applications + CVs ` +
        `against real user accounts, so it may only target the dedicated seed ` +
        `accounts in SEED_ACCOUNTS (see scripts/findings/harness-contamination-cleanup.md, ` +
        `PR #385). There is no override flag by design.`,
    );
  }
}

const N_ALIGNED = 30;
const N_STRETCH = 30;
const CONCURRENCY = 3; // keep low — the concurrent-OpenAI-load lesson (gen 500s under ~4 concurrent)

// Pass bar (all must hold to even consider flipping the flag — the harness only reports)
const PASS = {
  coverageMedianMargin: 5, // refine median >= from-scratch median - 5
  coverageNonInferiorPairFrac: 0.8, // refine >= from-scratch on >= 80% of pairs
  fromScratchPreferredMaxFrac: 0.2, // from-scratch preferred on <= 20% of pairs
  refineDroppedStrongMaxFrac: 0.1, // dropped_strong_bullet=refine on <= 10% of pairs
};

const admin = createClient(URL, SRK, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const safeArray = (v) => (Array.isArray(v) ? v : []);
const stripHtml = (s) =>
  String(s || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const median = (xs) => {
  const a = [...xs].sort((p, q) => p - q);
  const n = a.length;
  return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : 0;
};

// ── Coverage scorer (verbatim from refine-cv / generate-tailored-cv) ──────────
const KW_STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "as",
  "is",
  "are",
  "be",
  "been",
  "into",
  "over",
  "through",
  "across",
  "from",
  "up",
  "out",
  "via",
]);
const tokenizePhrase = (s) =>
  String(s)
    .toLowerCase()
    .split(/[\s\-_,.:;!?()\[\]\/]+/)
    .map((t) => t.trim())
    .filter((t) => t && !KW_STOP.has(t));
const MATCH_WINDOW = 200;
function phraseMatchesProximity(phrase, cvLower) {
  const tokens = tokenizePhrase(phrase);
  if (!tokens.length) return false;
  const required = tokens.length <= 3 ? tokens.length : tokens.length - 1;
  const positions = tokens.map((tok) => {
    const out = [];
    let idx = 0;
    while ((idx = cvLower.indexOf(tok, idx)) !== -1) {
      out.push(idx);
      idx += tok.length;
    }
    return out;
  });
  if (positions.filter((p) => p.length).length < required) return false;
  for (let a = 0; a < positions.length; a++)
    for (const ap of positions[a]) {
      let w = 1;
      for (let b = 0; b < positions.length; b++) {
        if (b === a) continue;
        if (positions[b].some((p) => Math.abs(p - ap) <= MATCH_WINDOW)) w++;
      }
      if (w >= required) return true;
    }
  return false;
}
// Score cv_data against a FROZEN must_include set (the key determinism fix).
function scoreCoverage(cvData, mustInclude) {
  if (!mustInclude.length) return { score: 0, matched: [], missed: [] };
  const cvLower = JSON.stringify(cvData).toLowerCase();
  const matched = [],
    missed = [];
  for (const p of mustInclude) {
    const pl = String(p).toLowerCase();
    cvLower.includes(pl) || phraseMatchesProximity(p, cvLower)
      ? matched.push(p)
      : missed.push(p);
  }
  return {
    score: Math.round((matched.length / mustInclude.length) * 100),
    matched,
    missed,
  };
}

// ── Anti-fab primitives (verbatim) ───────────────────────────────────────────
const QUANT_TOKEN_RE =
  /\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?[%$€₪]?|[$€₪]\d+[KMB]?|\d+\+|\d+x|[A-Z][a-z]+(?:[A-Z][a-zA-Z]+)+|[A-Z]{3,})\b/g;
const TOKEN_BLOCKLIST = new Set([
  "Israel",
  "Tel",
  "Aviv",
  "Hebrew",
  "English",
  "USA",
  "UK",
  "EU",
  "API",
  "CV",
  "JD",
  "PM",
  "HR",
  "CS",
  "VIP",
  "CEO",
  "CFO",
  "CTO",
  "COO",
  "SQL",
]);
// Audit: bullets are STRICT master-only; the summary uses master ∪ JD keyword set
// and flags ONLY a tool/skill claim (a tools_and_platforms term) present in neither —
// never a legitimate framing term. Returns the list of violating tokens per arm.
function antifabAudit(cvData, masterHaystackLower, jdKw) {
  const violations = { bullets: [], summary: [] };
  const tools = new Set(
    safeArray(jdKw.tools_and_platforms).map((t) => String(t).toLowerCase()),
  );
  const jdAllLower = [
    ...safeArray(jdKw.must_include_phrases),
    ...safeArray(jdKw.tools_and_platforms),
    ...safeArray(jdKw.domain_terms),
  ]
    .join(" \n ")
    .toLowerCase();
  const bulletBuckets = [
    "professional_experiences",
    "military_experiences",
    "volunteering_experiences",
    "leadership_experiences",
    "projects",
  ];
  for (const b of bulletBuckets)
    for (const e of safeArray(cvData?.[b]))
      for (const bullet of safeArray(e?.bullets)) {
        for (const tok of String(bullet || "").match(QUANT_TOKEN_RE) || []) {
          if (TOKEN_BLOCKLIST.has(tok)) continue;
          if (!masterHaystackLower.includes(tok.toLowerCase()))
            violations.bullets.push(tok); // bullets: STRICT master-only
        }
      }
  for (const tok of String(cvData?.summary || "").match(QUANT_TOKEN_RE) || []) {
    if (TOKEN_BLOCKLIST.has(tok)) continue;
    const lower = tok.toLowerCase();
    if (/\d/.test(tok)) {
      if (!masterHaystackLower.includes(lower)) violations.summary.push(tok);
      continue;
    } // numbers strict
    // proper-noun: only flag if it's a TOOL/SKILL claim (a JD tools_and_platforms term) present in NEITHER master NOR JD —
    // never a legitimate framing term (those are allowed by the prod gate and not audited).
    const isToolClaim = tools.has(lower) || /[A-Z]{2,}/.test(tok); // acronym-ish or a named tool
    if (
      isToolClaim &&
      !masterHaystackLower.includes(lower) &&
      !jdAllLower.includes(lower)
    )
      violations.summary.push(tok);
  }
  return violations;
}

// ── JD pair selection (frozen) ────────────────────────────────────────────────
// Aligned: a corpus JD whose text plausibly matches the profile's primary_domain /
// top career_role (realistic target). Stretch: a dense/demanding JD (long, many
// requirements) to stress SELECTION (where the dropped-strong-bullet risk lives).
// Selection is deterministic (stable ORDER BY id) so re-runs use the same pairs.
async function pickAlignedJd(profile) {
  const dom = String(profile.primary_domain || "").replace(/_/g, " ");
  const { data } = await admin
    .from("jobs")
    .select("id, title, description")
    .eq("jd_language", "en")
    .not("description", "is", null)
    .ilike("description", `%${dom.split(" ")[0] || "manager"}%`)
    .order("id", { ascending: true })
    .limit(1);
  return data?.[0] || null;
}
async function pickStretchJd(usedIds) {
  // a long, requirement-dense English JD not already used; stable order
  const { data } = await admin
    .from("jobs")
    .select("id, title, description")
    .eq("jd_language", "en")
    .not("description", "is", null)
    .order("id", { ascending: true })
    .limit(400);
  for (const j of data || []) {
    if (!usedIds.has(j.id) && (j.description || "").length > 3500) return j;
  }
  return null;
}

// ── extractJDKeywords (verbatim gpt-4o call) — frozen once per JD ─────────────
async function extractJDKeywords(jd) {
  const empty = {
    must_include_phrases: [],
    action_verbs: [],
    tools_and_platforms: [],
    domain_terms: [],
    soft_skill_keywords: [],
  };
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an ATS keyword extraction specialist. Extract the most important keywords and phrases from job descriptions that should appear in a tailored CV. Return JSON only, no markdown.",
          },
          {
            role: "user",
            content: `Extract keywords from this job description. Return JSON with these exact fields:\n- must_include_phrases: 8-12 exact multi-word phrases from the JD that are core to the role\n- action_verbs: 5-8 action verbs the JD uses\n- tools_and_platforms: all specific tools, platforms, technologies mentioned\n- domain_terms: 5-8 domain/industry terms\n- soft_skill_keywords: 3-5 soft skill phrases\n\nJOB DESCRIPTION:\n${jd}`,
          },
        ],
      }),
    });
    const d = await r.json();
    const parsed = JSON.parse(
      (d.choices?.[0]?.message?.content || "{}")
        .replace(/```json|```/g, "")
        .trim(),
    );
    const jdLower = jd.toLowerCase();
    const grounded = (arr, max, strict = true) => {
      if (!Array.isArray(arr)) return [];
      const o = [];
      for (const it of arr) {
        const s = String(it).trim();
        if (!s) continue;
        if (strict && !jdLower.includes(s.toLowerCase())) continue;
        o.push(s);
        if (o.length >= max) break;
      }
      return o;
    };
    return {
      must_include_phrases: grounded(parsed.must_include_phrases, 15),
      action_verbs: grounded(parsed.action_verbs, 10),
      tools_and_platforms: grounded(parsed.tools_and_platforms, 20),
      domain_terms: grounded(parsed.domain_terms, 10),
      soft_skill_keywords: grounded(parsed.soft_skill_keywords, 8, false),
    };
  } catch {
    return empty;
  }
}

// ── Blinded, order-randomized LLM judge ───────────────────────────────────────
function bulletsOf(cv) {
  const out = [];
  // selection-delta scope: the four tailored experience buckets only (projects
  // are verbatim master carry-over, not a refine selection signal).
  for (const b of [
    "professional_experiences",
    "military_experiences",
    "volunteering_experiences",
    "leadership_experiences",
  ])
    for (const e of safeArray(cv?.[b]))
      for (const x of safeArray(e?.bullets)) out.push(String(x));
  return out;
}
async function judge(jd, cvRefine, cvScratch, coinHeads) {
  // blind: A/B randomized per pair so the judge can't learn which arm is which
  const A = coinHeads ? cvRefine : cvScratch;
  const B = coinHeads ? cvScratch : cvRefine;
  // SCOPE: show the judge ONLY the surfaces the refine actually tailors — the
  // summary + the four experience buckets (selection + rewording). Projects,
  // education, header, languages, certifications are verbatim master carry-over
  // (the refine clones them, does not tailor them), so they are NOT shown and
  // cannot influence winner / dropped_strong_bullet — including the master's
  // null-title projects. A from-scratch edge in those sections is not a refine
  // selection failure.
  const expView = (cv, k) =>
    safeArray(cv?.[k]).map((e) => ({ title: e.title, bullets: e.bullets }));
  const view = (cv) => ({
    summary: cv?.summary,
    professional_experiences: expView(cv, "professional_experiences"),
    military_experiences: expView(cv, "military_experiences"),
    volunteering_experiences: expView(cv, "volunteering_experiences"),
    leadership_experiences: expView(cv, "leadership_experiences"),
  });
  const sys =
    "You are an expert technical recruiter comparing two one-page CVs (A and B) tailored to the same job. You are shown ONLY the tailored surfaces: the summary and the four experience sections (professional, military, volunteering, leadership). Projects, education, header, languages, and certifications are intentionally omitted — they are verbatim carry-over that neither CV tailors, so they MUST NOT affect your judgment. Judge ONLY which of the shown surfaces presents the more specific, higher-impact, JD-relevant achievements through selection and wording, and base dropped_strong_bullet ONLY on the shown experience bullets. Return JSON only.";
  const user = `JOB DESCRIPTION:\n${jd.slice(0, 4000)}\n\nCV A:\n${JSON.stringify(view(A))}\n\nCV B:\n${JSON.stringify(view(B))}\n\nReturn JSON:\n{\n  "winner": "A" | "B" | "tie",\n  "dropped_strong_bullet": "A" | "B" | "none",   // did one OMIT a strong, JD-relevant achievement the other included? which one dropped it\n  "quote": "the dropped achievement, verbatim, or empty",\n  "rationale": "one sentence"\n}`;
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4.6",
      temperature: 0,
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });
  const d = await r.json();
  let j;
  try {
    j = JSON.parse(
      (d.choices?.[0]?.message?.content || "{}")
        .replace(/```json|```/g, "")
        .trim(),
    );
  } catch {
    return {
      winner: "tie",
      dropped_strong_bullet: "none",
      quote: "",
      rationale: "parse_fail",
    };
  }
  // de-blind A/B -> refine/from_scratch
  const map = (x) =>
    x === "A"
      ? coinHeads
        ? "refine"
        : "from_scratch"
      : x === "B"
        ? coinHeads
          ? "from_scratch"
          : "refine"
        : x;
  return {
    winner: map(j.winner),
    dropped_strong_bullet: map(j.dropped_strong_bullet),
    quote: String(j.quote || ""),
    rationale: String(j.rationale || ""),
  };
}

// ── Per-pair run: throwaway app → both arms → capture → score/judge/audit ──────
async function mintJwt(email) {
  const { data: link, error: le } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (le) throw new Error("link:" + le.message);
  const mc = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: otp, error } = await mc.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "magiclink",
  });
  if (error) throw new Error("otp:" + error.message);
  return otp.session.access_token;
}

async function runPair(pair, frozenKw) {
  const { profile, email, job } = pair;
  const jd = stripHtml(job.description).slice(0, 10000);
  const jwt = await mintJwt(email);
  const c = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  // throwaway application (tagged) holding this JD
  const { data: app, error: appErr } = await c
    .from("applications")
    .insert({
      user_id: profile.id,
      role_title: job.title || "Target Role",
      company: HARNESS_TAG,
      job_description: job.description,
      status: "interested",
    })
    .select("id")
    .single();
  if (appErr || !app)
    return { pair, error: "app_insert:" + (appErr?.message || "?") };
  const appId = app.id;
  try {
    // from-scratch (as it ships): generate-tailored-cv with the app
    const fs = await c.functions.invoke("generate-tailored-cv", {
      body: {
        application_id: appId,
        target_role: job.title || "Target Role",
        job_description: job.description,
        cv_model: "sonnet",
      },
    });
    // refine, single-pass
    const rf = await c.functions.invoke("refine-cv", {
      body: {
        application_id: appId,
        job_description: job.description,
        cv_model: "sonnet",
        disable_retry: true,
      },
    });
    // capture both cv_data rows for this app (non-master). Newest = refine, prior = from-scratch.
    const { data: rows } = await admin
      .from("application_cvs")
      .select("id, cv_data, source_jd, created_at")
      .eq("application_id", appId)
      .eq("is_master", false)
      .order("created_at", { ascending: true });
    const cvScratch = rows?.[0]?.cv_data,
      cvRefine = rows?.[rows.length - 1]?.cv_data;
    if (!cvScratch || !cvRefine || rows.length < 2)
      return {
        pair,
        error: "missing_arm_rows",
        fsErr: fs.error?.message,
        rfErr: rf.error?.message,
      };
    const must = frozenKw.must_include_phrases;
    const covR = scoreCoverage(cvRefine, must),
      covS = scoreCoverage(cvScratch, must);
    const rfSingleScore = rf.data?.tailoring?.tailoring_score; // single-pass score from the function (disable_retry)
    // master haystack for anti-fab audit
    const { data: m } = await admin
      .from("application_cvs")
      .select("cv_data")
      .eq("user_id", profile.id)
      .eq("is_master", true)
      .maybeSingle();
    const masterHay = JSON.stringify(m?.cv_data || {}).toLowerCase();
    const auditR = antifabAudit(cvRefine, masterHay, frozenKw),
      auditS = antifabAudit(cvScratch, masterHay, frozenKw);
    // selection-delta + strongest-bullet presence (deterministic guardrails)
    const bR = new Set(bulletsOf(cvRefine).map((x) => x.toLowerCase())),
      bS = bulletsOf(cvScratch);
    const droppedFromScratchOnly = bS.filter((x) => !bR.has(x.toLowerCase())); // bullets fs kept, refine dropped
    const coin = Number(String(appId).replace(/\D/g, "").slice(-1)) % 2 === 0; // stable per-app blinding
    const jdg = await judge(jd, cvRefine, cvScratch, coin);
    return {
      pair,
      ok: true,
      covRefine: covR.score,
      covScratch: covS.score,
      rfSingleScore,
      judge: jdg,
      droppedDeltaCount: droppedFromScratchOnly.length,
      auditRefine: auditR.bullets.length + auditR.summary.length,
      auditScratch: auditS.bullets.length + auditS.summary.length,
      summaryOverclaimRefine: auditR.summary.length,
    };
  } finally {
    // cleanup throwaway: delete its cv rows + the app
    await admin.from("application_cvs").delete().eq("application_id", appId);
    await admin.from("applications").delete().eq("id", appId);
  }
}

async function cleanup() {
  const { data } = await admin
    .from("applications")
    .select("id")
    .eq("company", HARNESS_TAG);
  for (const a of data || []) {
    await admin.from("application_cvs").delete().eq("application_id", a.id);
    await admin.from("applications").delete().eq("id", a.id);
  }
  console.log(
    `cleanup: removed ${(data || []).length} tagged throwaway applications`,
  );
}

async function main() {
  if (process.argv.includes("--cleanup")) return cleanup();

  // load onboarded profiles that have a master, + emails
  const { data: profs } = await admin
    .from("profiles")
    .select("id, primary_domain")
    .eq("onboarding_complete", true);
  const { data: masters } = await admin
    .from("application_cvs")
    .select("user_id")
    .eq("is_master", true);
  const haveMaster = new Set((masters || []).map((r) => r.user_id));
  const { data: list } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const emailById = new Map((list?.users || []).map((u) => [u.id, u.email]));
  const eligible = (profs || []).filter(
    (p) =>
      haveMaster.has(p.id) && emailById.get(p.id) && SEED_ACCOUNTS.has(p.id),
  );

  // build frozen pair set
  const usedJobIds = new Set();
  const pairs = [];
  for (const p of eligible.slice(0, N_ALIGNED)) {
    const j = await pickAlignedJd(p);
    if (j) {
      usedJobIds.add(j.id);
      pairs.push({
        type: "aligned",
        profile: p,
        email: emailById.get(p.id),
        job: j,
      });
    }
  }
  for (const p of eligible.slice(0, N_STRETCH)) {
    const j = await pickStretchJd(usedJobIds);
    if (j) {
      usedJobIds.add(j.id);
      pairs.push({
        type: "stretch",
        profile: p,
        email: emailById.get(p.id),
        job: j,
      });
    }
  }
  console.log(
    `pairs: ${pairs.length} (${pairs.filter((x) => x.type === "aligned").length} aligned + ${pairs.filter((x) => x.type === "stretch").length} stretch)`,
  );

  // Fail-closed seed gate: hard-abort before any JWT mint or DB write if any
  // selected target is not a dedicated seed account. The eligible filter above
  // already restricts to seeds; this is the backstop that makes a real-user
  // write impossible even if selection logic changes. See PR #385.
  assertSeedOnly(pairs.map((pr) => pr.profile.id));

  // freeze keywords once per distinct JD
  const frozen = new Map();
  for (const jid of usedJobIds) {
    const job = pairs.find((p) => p.job.id === jid).job;
    frozen.set(
      jid,
      await extractJDKeywords(stripHtml(job.description).slice(0, 10000)),
    );
  }

  // run pairs (bounded concurrency)
  const results = [];
  let i = 0;
  async function worker() {
    while (i < pairs.length) {
      const pr = pairs[i++];
      try {
        results.push(await runPair(pr, frozen.get(pr.job.id)));
      } catch (e) {
        results.push({ pair: pr, error: e.message });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // aggregate
  const ok = results.filter((r) => r.ok);
  const covR = ok.map((r) => r.covRefine),
    covS = ok.map((r) => r.covScratch);
  const nonInf =
    ok.filter((r) => r.covRefine >= r.covScratch).length / (ok.length || 1);
  const fsPreferred =
    ok.filter((r) => r.judge.winner === "from_scratch").length /
    (ok.length || 1);
  const refineDropped =
    ok.filter((r) => r.judge.dropped_strong_bullet === "refine").length /
    (ok.length || 1);
  const antifabRegress = ok.filter(
    (r) => r.auditRefine > r.auditScratch,
  ).length;
  const summaryOverclaims = ok.filter(
    (r) => r.summaryOverclaimRefine > 0,
  ).length;

  const verdict = {
    pairs_ok: ok.length,
    pairs_failed: results.length - ok.length,
    coverage_median_refine: median(covR),
    coverage_median_scratch: median(covS),
    coverage_non_inferior_pair_frac: +nonInf.toFixed(2),
    from_scratch_preferred_frac: +fsPreferred.toFixed(2),
    refine_dropped_strong_frac: +refineDropped.toFixed(2),
    antifab_regression_pairs: antifabRegress,
    summary_overclaim_pairs: summaryOverclaims,
    single_pass_score_distribution: covR.sort((a, b) => a - b), // for the retry-threshold recommendation
  };
  const pass =
    verdict.coverage_median_refine >=
      verdict.coverage_median_scratch - PASS.coverageMedianMargin &&
    verdict.coverage_non_inferior_pair_frac >=
      PASS.coverageNonInferiorPairFrac &&
    verdict.from_scratch_preferred_frac <= PASS.fromScratchPreferredMaxFrac &&
    verdict.refine_dropped_strong_frac <= PASS.refineDroppedStrongMaxFrac &&
    antifabRegress === 0 &&
    summaryOverclaims === 0;

  console.log("\n=== VERDICT ===");
  console.log(JSON.stringify(verdict, null, 2));
  console.log(
    `\nNON-INFERIOR (all bars pass): ${pass}  — DOES NOT flip the flag; this is advisory.`,
  );
  console.log(
    "Retry-threshold note: set it below the single_pass_score_distribution cluster (~20th percentile).",
  );
}

// Only run the harness when invoked directly (node scripts/refine-rebake.mjs).
// Guarded so the seed gate can be imported and unit-tested without running main.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { SEED_ACCOUNTS, assertSeedOnly };
