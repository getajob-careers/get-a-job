// F1: CV Honors & Awards must be a DETERMINISTIC aggregation of stored
// structured sources ONLY (education.honors + experiences.awards). The
// generation path used to let the LLM author this section, which fabricated
// unearned awards ("Dean's List") and surfaced items with no stored provenance.
// This locks the provenance rule at the deterministic-builder level (the same
// aggregate the generate-tailored-cv path now overwrites the LLM output with).
import { describe, it, expect } from "vitest";
import { buildMasterCvData } from "@/lib/cvDataAdapter";
import { toCvData, fromCvData } from "@/lib/cvDataAdapter";

const profile = { full_name: "Test User", skills: [], email: "t@x.com" };

describe("honors provenance - deterministic aggregation from stored sources (F1)", () => {
  it("aggregates experiences[].awards (the new stored home) into honors_and_awards", () => {
    const experiences = [
      {
        id: "e1",
        title: "Combat Soldier",
        company: "Nahal Brigade",
        type: "military",
        bullets: ["Led a team of 30."],
        awards: [
          "Presidential Award for Excellence",
          "IDF Advanced Training award",
        ],
      },
    ];
    const m = buildMasterCvData(profile, experiences, [], profile.email);
    expect(m.honors_and_awards).toEqual([
      "Presidential Award for Excellence",
      "IDF Advanced Training award",
    ]);
  });

  it("combines education.honors + experiences.awards, deduped case-insensitively, education first", () => {
    const experiences = [
      {
        id: "e1",
        title: "X",
        company: "Y",
        awards: ["Merit Award", "presidential award"],
      },
    ];
    const education = [
      {
        institution: "Reichman",
        honors: ["Excellence Scholarship", "Presidential Award"],
      },
    ];
    const m = buildMasterCvData(profile, experiences, education, profile.email);
    expect(m.honors_and_awards).toEqual([
      "Excellence Scholarship",
      "Presidential Award", // "presidential award" from awards dedups against this
      "Merit Award",
    ]);
  });

  it("surfaces NOTHING when no stored source has an entry (no LLM composition can leak in)", () => {
    const experiences = [
      {
        id: "e1",
        title: "X",
        company: "Y",
        bullets: ["did stuff"],
        awards: [],
      },
    ];
    const education = [{ institution: "Reichman", honors: [] }];
    const m = buildMasterCvData(profile, experiences, education, profile.email);
    expect(m).not.toHaveProperty("honors_and_awards");
  });
});

describe("mapExpOut drops fully-blank entries (F3: PDF extra-line bug)", () => {
  it("a fresh blank editor row does not survive round-trip into cv_data", () => {
    const cvData = {
      header: { name: "Test User" },
      professional_experiences: [
        {
          title: "Real Job",
          company: "Acme",
          dates: "2023 – Present",
          bullets: ["Did a thing."],
        },
      ],
    };
    const model = fromCvData(cvData);
    // Simulate "add experience": a blank row appended. The editor model keys
    // the professional bucket as `experiences` (mapped to
    // professional_experiences on output).
    model.experiences.push({ title: "", org: "", dates: "", bullets: [] });
    const out = toCvData(model);
    // The blank row must be filtered out, only the real entry persists.
    expect(out.professional_experiences).toHaveLength(1);
    expect(out.professional_experiences[0].title).toBe("Real Job");
  });
});
