// "What we learned about you": a short, factual summary for the V2 review
// reveal (ReviewScreenV2's SuccessReveal). Phase 2 polish.
//
// HARD RULE: factual restatements ONLY. Every line restates something the
// extractor actually produced - companies the user listed, their field of
// study, a managed-people flag they set, the extractor's primary_domain, or a
// count of proof signals / certifications. Nothing is inferred, scored, or
// invented, and no line makes a judgment ("you're a strong leader"); it only
// says back what is on record ("You've managed people at X").
//
// EMPTY-SAFE: when extraction is thin the list comes back empty and the caller
// degrades to the plain count marquee. It never pads to hit a number; a weak
// or invented observation is worse than one fewer line. Capped at 3.

import { deslug } from "@/lib/humanizeTag";

// "Guardio" | "Guardio and Wix" | "Guardio, Wix and Payoneer" |
// "Guardio, Wix and 3 more". Dedupes and trims.
function formatNameList(names, max = 3) {
  const clean = [
    ...new Set(
      (names || []).map((n) => String(n || "").trim()).filter(Boolean),
    ),
  ];
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length <= max) {
    return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
  }
  return `${clean.slice(0, max).join(", ")} and ${clean.length - max} more`;
}

// Returns up to 3 factual observation strings, ordered most-concrete first.
// Pass the extracted review state; missing/thin fields simply yield fewer lines.
/**
 * @param {{
 *   experiences?: any[],
 *   educations?: any[],
 *   certifications?: any[],
 *   profileData?: Record<string, any>,
 * }} [input]
 * @returns {string[]}
 */
export function buildExtractionObservations({
  experiences,
  educations,
  certifications,
  profileData,
} = {}) {
  const exp = Array.isArray(experiences) ? experiences : [];
  const edu = Array.isArray(educations) ? educations : [];
  const certs = Array.isArray(certifications) ? certifications : [];
  const out = [];

  // 1) Companies / organizations - the most concrete identity signal.
  const companies = exp
    .map((e) => e?.company)
    .filter((c) => String(c || "").trim());
  if (companies.length > 0) {
    out.push(`You listed roles at ${formatNameList(companies)}.`);
  }

  // 2) Field of study + institution.
  const withField = edu.find(
    (e) =>
      String(e?.field_of_study || "").trim() &&
      String(e?.institution || "").trim(),
  );
  if (withField) {
    const verb = withField.is_current ? "You're studying" : "You studied";
    out.push(
      `${verb} ${withField.field_of_study.trim()} at ${withField.institution.trim()}.`,
    );
  }

  // 3) People management - restate the flag, not a judgment about it.
  const managed = exp.find(
    (e) => e?.managed_people && String(e?.company || "").trim(),
  );
  if (managed) {
    out.push(`You've managed people at ${managed.company.trim()}.`);
  }

  // 4) Extractor-derived domain (grounded in the CV; restated as-is).
  const domain = profileData?.primary_domain;
  if (typeof domain === "string" && domain.trim()) {
    out.push(`Your experience centers on ${deslug(domain)}.`);
  }

  // 5) Proof signals - a count of concrete achievements the extractor found.
  const proof = profileData?.proof_signals;
  if (Array.isArray(proof) && proof.length >= 2) {
    out.push(`We spotted ${proof.length} concrete achievements in your CV.`);
  }

  // 6) Certifications.
  const certNames = certs
    .map((c) => c?.name)
    .filter((n) => String(n || "").trim());
  if (certNames.length === 1) {
    out.push(`You hold a certification: ${String(certNames[0]).trim()}.`);
  } else if (certNames.length > 1) {
    out.push(`You hold ${certNames.length} certifications.`);
  }

  return out.slice(0, 3);
}
