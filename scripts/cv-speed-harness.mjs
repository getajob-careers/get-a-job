// CV generation speed harness — the SPEED GUARD instrument.
//
// Repeatable timed generation on a disposable internal account. Warms the
// one-time JD-requirements snapshot, then times N warm runs of
// generate-tailored-cv and reports p50/mean/min/max total latency.
//
// Usage: SRK=<service_role_key> node scripts/cv-speed-harness.mjs [runs] [cv_model]
//   runs     default 5
//   cv_model default 'sonnet' (prod default). Pass 'gpt-4o' to compare.
//
// It creates ONE disposable application on the test account, runs against it
// (so the req_snapshot cache warms after run 1 = the steady-state path), then
// deletes everything it created (application + application_cvs + storage PDFs).
// Prints the numbers as a table for a before/after comparison.

import { createClient } from "@supabase/supabase-js";

const URL = "https://ilmqmodklutztuybsvwd.supabase.co";
const SRK = process.env.SRK;
if (!SRK) {
  console.error("set SRK env (service_role key)");
  process.exit(1);
}
const RUNS = Number(process.argv[2] || 5);
const CV_MODEL = process.argv[3] || "sonnet";
const TEST_EMAIL = "elienglard34+test90909090909@gmail.com"; // disposable internal, 5 experiences

// A representative Customer Success JD (matches the test profile's Guardio CS role).
const TARGET_ROLE = "Customer Success Manager";
const JOB_DESCRIPTION = `We are hiring a Customer Success Manager to own a portfolio of B2B SaaS accounts.
You will drive onboarding, adoption, renewals and expansion, run quarterly business reviews, and act as the
voice of the customer to product and engineering. Requirements: 2+ years in customer success or account
management at a SaaS company, strong communication, data-driven approach to health scoring and churn
prevention, experience with CRM and CS tooling (Salesforce, Gainsight, HubSpot), and comfort working with
technical and non-technical stakeholders. Fluent English; Hebrew a plus. Tel Aviv, hybrid.`;

const admin = createClient(URL, SRK, { auth: { persistSession: false } });

async function mintJwt(email) {
  const { data: link, error: e1 } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (e1) throw new Error("generateLink: " + e1.message);
  const { data: sess, error: e2 } = await admin.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (e2) throw new Error("verifyOtp: " + e2.message);
  return { jwt: sess.session.access_token, userId: sess.user.id };
}

async function generate(jwt, applicationId) {
  const t0 = process.hrtime.bigint();
  const r = await fetch(`${URL}/functions/v1/generate-tailored-cv`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      job_description: JOB_DESCRIPTION,
      target_role: TARGET_ROLE,
      application_id: applicationId,
      cv_model: CV_MODEL,
    }),
  });
  const body = await r.json().catch(() => ({}));
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { ms, status: r.status, ok: r.ok, body };
}

function pct(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length),
  );
  return sorted[idx];
}

const { jwt, userId } = await mintJwt(TEST_EMAIL);
console.log(
  `minted ${TEST_EMAIL} (${userId}); model=${CV_MODEL}; runs=${RUNS}`,
);

// create a disposable application to warm the req_snapshot cache against
const { data: app, error: appErr } = await admin
  .from("applications")
  .insert({
    user_id: userId,
    company: "Harness Co",
    role_title: TARGET_ROLE,
    job_description: JOB_DESCRIPTION,
    status: "interested",
    source: "manual",
  })
  .select("id")
  .single();
if (appErr) throw new Error("create app: " + appErr.message);
const appId = app.id;
console.log(`created disposable application ${appId}`);

const results = [];
try {
  // warm-up run (fires one-time stage-3 JD-requirements extraction; discarded)
  const warm = await generate(jwt, appId);
  console.log(
    `warm-up: ${warm.ms.toFixed(0)}ms status=${warm.status} (discarded)`,
  );

  for (let i = 1; i <= RUNS; i++) {
    const res = await generate(jwt, appId);
    results.push(res);
    console.log(
      `run ${i}: ${res.ms.toFixed(0)}ms status=${res.status} ok=${res.ok}`,
    );
  }
} finally {
  // cleanup: delete created application_cvs + storage pdfs + the application
  const { data: cvs } = await admin
    .from("application_cvs")
    .select("id")
    .eq("application_id", appId);
  if (cvs?.length)
    await admin.from("application_cvs").delete().eq("application_id", appId);
  await admin.from("applications").delete().eq("id", appId);
  // storage PDFs land under `${userId}/..._CV_<ts>.pdf`; list + remove ones created during the run
  const { data: files } = await admin.storage.from("cvs").list(userId, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  const recent = (files || [])
    .filter(
      (f) => Date.now() - new Date(f.created_at).getTime() < 15 * 60 * 1000,
    )
    .map((f) => `${userId}/${f.name}`);
  if (recent.length) {
    await admin.storage.from("cvs").remove(recent);
    console.log(`removed ${recent.length} storage pdf(s)`);
  }
  console.log(
    `cleaned up application ${appId} + ${cvs?.length || 0} application_cvs`,
  );
}

const oks = results
  .filter((r) => r.ok)
  .map((r) => r.ms)
  .sort((a, b) => a - b);
const mean = oks.length ? oks.reduce((a, b) => a + b, 0) / oks.length : null;
console.log("\n=== RESULTS (warm, ok runs only) ===");
console.log(
  JSON.stringify(
    {
      model: CV_MODEL,
      n_ok: oks.length,
      n_total: results.length,
      p50_s: oks.length ? (pct(oks, 50) / 1000).toFixed(1) : null,
      p90_s: oks.length ? (pct(oks, 90) / 1000).toFixed(1) : null,
      mean_s: mean ? (mean / 1000).toFixed(1) : null,
      min_s: oks.length ? (oks[0] / 1000).toFixed(1) : null,
      max_s: oks.length ? (oks[oks.length - 1] / 1000).toFixed(1) : null,
    },
    null,
    2,
  ),
);
