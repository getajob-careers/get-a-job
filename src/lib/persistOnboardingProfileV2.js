import { supabase } from "@/api/supabaseClient";
import { cleanProfilePayload } from "@/lib/onboardingPayload";

// V2 review-screen profiles persist — the first persistence in the Onboarding
// V2 flow. Writes the profiles ROW only (scalar fields + skills_canonical
// computed from the extracted entities' union) plus the primary_domain
// provenance stamp.
//
// SCOPE: entity-table rows (experiences / education / projects / certifications)
// are NOT written here — that is a later slice (PR 6), ideally via a shared
// persist helper both V1 and V2 call rather than a V2-only duplicate. The
// entities are still passed in so cleanProfilePayload can union their skills
// into skills_canonical (the CV-grounding contract), matching V1.
//
// THE STAMP IS THE KEYSTONE of the precedence invariant. By stamping
// primary_domain_source='extracted' HERE (review = screen 1), the direction
// screen's inference (screen 2) sees a non-null, non-'inferred' primary_domain
// and its guard (`WHERE primary_domain IS NULL OR primary_domain_source =
// 'inferred'`) leaves it untouched. Extraction wins by ordering + provenance —
// exactly what _shared/infer-primary-domain.ts intends. Stamp ONLY when a
// domain is actually being written from extraction; a null domain leaves the
// source null (authoritative, never 'inferred').

export function buildReviewProfilePayload({
  profileData,
  experiences,
  educations,
  projects,
}) {
  const base = cleanProfilePayload({
    ...profileData,
    experiences: experiences || [],
    educations: educations || [],
    projects: projects || [],
  });
  const hasDomain =
    base.primary_domain != null && String(base.primary_domain).trim() !== "";
  return hasDomain ? { ...base, primary_domain_source: "extracted" } : base;
}

export async function persistReviewProfile({
  userId,
  profileData,
  experiences,
  educations,
  projects,
}) {
  if (!userId) return { ok: false, error: new Error("missing userId") };
  const payload = buildReviewProfilePayload({
    profileData,
    experiences,
    educations,
    projects,
  });
  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId);
  if (error) {
    console.warn(
      "[persistReviewProfile] profiles update failed:",
      error.message,
    );
    return { ok: false, error };
  }
  return { ok: true, error: null };
}
