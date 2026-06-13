// Is the user's career analysis pending (kicked off, not yet persisted)?
//
// Onboarding triggers generate-career-analysis (Onboarding.jsx) and Home
// self-heals it (Home.jsx:266-270) under exactly this condition. A
// just-signed-up user therefore sits with career_roles=0 WHILE the analysis
// runs — Career must show "building your matches", not the "Generate your
// roadmap first" dead-end (the Barabi-on-signup P0 sibling). This is the
// same predicate Home's self-heal effect gates on, so the two surfaces
// agree on "pending" vs "genuinely needs generation".
//
//   onboarding done  AND  analysis output never persisted
//   (qualification_level + last_reality_check_date are written together by
//    the analysis, so either being set means it has completed at least once)
export function isAnalysisPending(profile) {
  if (!profile) return false;
  return (
    !!profile.onboarding_complete &&
    !profile.qualification_level &&
    !profile.last_reality_check_date
  );
}
