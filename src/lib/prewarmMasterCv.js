// prewarmMasterCv — author the user's master CV in the background at the end of
// onboarding so their FIRST tailored generation is warm.
//
// Regression context: refine-cv tailors a job CV by selecting + rewording from
// the user's is_master row. If that row is absent it lazy-authors it inline via
// generate-tailored-cv master mode (Sonnet, ~40-60s) — the cold path that shows
// up as a new user's first generation. Building the master here, deterministically
// (buildMasterCvData, no LLM, identical to the studio's "Build my master CV"),
// means refine-cv finds a warm master and skips straight to the ~16-23s reword.
//
// Contract:
// - Idempotent: no-op when a master already exists (checked, plus the partial
//   unique index on (user_id) WHERE is_master makes a concurrent insert fail
//   23505, which we swallow). So it never double-authors even if it races the
//   refine-cv self-heal or a second onboarding-finalise.
// - Non-fatal: every failure is swallowed and logged. refine-cv's self-heal is
//   the backstop, so a miss (e.g. the tab closes first) only costs that one user
//   their first-tailor warmth, never correctness.
// - Deterministic: no LLM, no cost. Re-reads the persisted rows (not React state)
//   because buildMasterCvData stamps experience_id from each experiences row id,
//   which refine-cv needs to address bullets for rewording.
//
// Returns a small result object for tests/telemetry: { status } where status is
// "built" | "skipped_exists" | "skipped_no_profile" | "raced" | "error".

import { buildMasterCvData } from "@/lib/cvDataAdapter";

export async function prewarmMasterCv({ supabase, user }) {
  if (!user?.id) return { status: "error", reason: "missing_user" };
  try {
    const { data: existingMaster } = await supabase
      .from("application_cvs")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_master", true)
      .maybeSingle();
    if (existingMaster?.id) return { status: "skipped_exists" };

    const [profRes, expRes, eduRes, projRes, certRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("experiences").select("*").eq("user_id", user.id),
      supabase
        .from("education")
        .select("*")
        .eq("user_id", user.id)
        .order("display_order", { ascending: true, nullsLast: true })
        .order("created_at", { ascending: true }),
      // Parallel, so projects/certifications sourcing adds no serial latency.
      supabase.from("projects").select("*").eq("user_id", user.id),
      supabase.from("certifications").select("*").eq("user_id", user.id),
    ]);
    if (!profRes?.data) return { status: "skipped_no_profile" };

    const cv_data = buildMasterCvData(
      profRes.data,
      expRes?.data || [],
      eduRes?.data || [],
      user.email,
      { projects: projRes?.data || [], certifications: certRes?.data || [] },
    );

    const { error: masterErr } = await supabase.from("application_cvs").insert({
      user_id: user.id,
      is_master: true,
      version: 1,
      application_id: null,
      cv_data,
    });

    // 23505 = the partial unique index rejected a concurrent second master
    // (refine-cv self-heal or a duplicate finalise beat us). Desired no-op.
    if (masterErr) {
      if (masterErr.code === "23505") return { status: "raced" };
      console.warn(
        "[prewarmMasterCv] insert failed (non-fatal, refine-cv self-heals):",
        masterErr,
      );
      return { status: "error", reason: masterErr.code || "insert_failed" };
    }
    return { status: "built" };
  } catch (err) {
    console.warn("[prewarmMasterCv] error (non-fatal):", err);
    return { status: "error", reason: "exception" };
  }
}
