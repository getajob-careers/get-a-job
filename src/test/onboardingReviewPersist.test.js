import { describe, it, expect } from "vitest";
import { buildReviewProfilePayload } from "@/lib/persistOnboardingProfileV2";
import { mapExtractedToOnboardingState } from "@/lib/mapExtractedToOnboarding";

// The stamp is the keystone of the precedence invariant: the review screen
// writes primary_domain_source='extracted' ONLY when a domain was extracted, so
// the direction screen's inference guard leaves an extracted domain untouched.
describe("buildReviewProfilePayload — the 'extracted' stamp", () => {
  it("stamps primary_domain_source='extracted' when a domain was extracted", () => {
    const payload = buildReviewProfilePayload({
      profileData: { full_name: "A", primary_domain: "product", skills: [] },
      experiences: [],
      educations: [],
      projects: [],
    });
    expect(payload.primary_domain).toBe("product");
    expect(payload.primary_domain_source).toBe("extracted");
  });

  it("does NOT stamp when no domain was extracted (leaves source unset)", () => {
    const payload = buildReviewProfilePayload({
      profileData: { full_name: "A", primary_domain: null, skills: [] },
      experiences: [],
      educations: [],
      projects: [],
    });
    expect(payload.primary_domain).toBeNull();
    expect(payload.primary_domain_source).toBeUndefined();
  });

  it("treats an empty-string domain as no domain (no stamp)", () => {
    const payload = buildReviewProfilePayload({
      profileData: { primary_domain: "   ", skills: [] },
      experiences: [],
      educations: [],
      projects: [],
    });
    expect(payload.primary_domain_source).toBeUndefined();
  });
});

describe("mapExtractedToOnboardingState — extraction → onboarding state", () => {
  const extracted = {
    full_name: "Dana Levi",
    summary: "Marketing student",
    skills: ["SEO", "Analytics"],
    primary_domain: "marketing",
    institution: "Reichman University",
    education_level: "Bachelor's",
    field_of_study: "Business",
    experiences: [
      {
        title: "Marketing Intern",
        company: "Acme",
        responsibilities: ["Ran campaigns", "Analysed funnels"],
        skills: ["SEO"],
      },
    ],
    projects: [{ name: "Capstone", description: "x" }],
    certifications: [{ name: "GA4", issuer: "Google" }],
  };

  it("maps profile scalars into the patch", () => {
    const { profilePatch } = mapExtractedToOnboardingState(extracted);
    expect(profilePatch.full_name).toBe("Dana Levi");
    expect(profilePatch.summary).toBe("Marketing student");
    expect(profilePatch.skills).toEqual(["SEO", "Analytics"]);
    expect(profilePatch.primary_domain).toBe("marketing");
  });

  it("builds a primary education row from root fields", () => {
    const { educations } = mapExtractedToOnboardingState(extracted);
    expect(educations[0].institution).toBe("Reichman University");
    expect(educations[0].field_of_study).toBe("Business");
    expect(educations[0].display_order).toBe(0);
  });

  it("maps experiences and joins array responsibilities into a string", () => {
    const { experiences } = mapExtractedToOnboardingState(extracted);
    expect(experiences).toHaveLength(1);
    expect(experiences[0].title).toBe("Marketing Intern");
    expect(experiences[0].responsibilities).toBe(
      "Ran campaigns\nAnalysed funnels",
    );
    expect(experiences[0].skills).toEqual(["SEO"]);
  });

  it("passes through projects and certifications", () => {
    const { projects, certifications } =
      mapExtractedToOnboardingState(extracted);
    expect(projects).toHaveLength(1);
    expect(certifications[0].name).toBe("GA4");
  });

  it("handles empty/missing extraction without throwing", () => {
    const out = mapExtractedToOnboardingState({});
    expect(out.experiences).toEqual([]);
    expect(out.projects).toEqual([]);
    expect(out.certifications).toEqual([]);
    expect(out.educations).toHaveLength(1); // always a primary row
    expect(out.profilePatch.primary_domain).toBeNull();
  });
});
