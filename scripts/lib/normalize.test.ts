// Tests for finalSeniority — Variant B (title-wins for senior+, years
// refines mid). Locked 2026-05-20 after the 18% cache mis-tag audit.
//
// Co-located with the module (Vitest picks up *.test.ts anywhere).

import { describe, it, expect } from "vitest";
import {
  classifyLocation,
  detectSeniorityFromTitle,
  finalSeniority,
  parseExplicitJuniorSignal,
} from "./normalize";

describe("detectSeniorityFromTitle", () => {
  it("flags executive titles", () => {
    expect(detectSeniorityFromTitle("VP of Engineering")).toBe("executive");
    expect(detectSeniorityFromTitle("Chief Marketing Officer")).toBe("executive");
    expect(detectSeniorityFromTitle("Head of Product")).toBe("executive");
  });
  it("flags director titles", () => {
    expect(detectSeniorityFromTitle("Director of Customer Success")).toBe("director");
  });
  it("flags lead/principal/staff/architect titles", () => {
    expect(detectSeniorityFromTitle("Lead Engineer")).toBe("lead");
    expect(detectSeniorityFromTitle("Principal Designer")).toBe("lead");
    expect(detectSeniorityFromTitle("Staff Software Engineer")).toBe("lead");
    expect(detectSeniorityFromTitle("Solutions Architect")).toBe("lead");
  });
  it("flags senior titles", () => {
    expect(detectSeniorityFromTitle("Senior Software Engineer")).toBe("senior");
    expect(detectSeniorityFromTitle("Sr. Product Manager")).toBe("senior");
  });
  it("flags entry-level titles", () => {
    expect(detectSeniorityFromTitle("Junior Analyst")).toBe("entry");
    expect(detectSeniorityFromTitle("Marketing Intern")).toBe("entry");
    expect(detectSeniorityFromTitle("Associate Consultant")).toBe("entry");
    expect(detectSeniorityFromTitle("Graduate Engineer")).toBe("entry");
  });
  it("defaults to mid when no keyword matches", () => {
    expect(detectSeniorityFromTitle("Software Engineer")).toBe("mid");
    expect(detectSeniorityFromTitle("Marketing Manager")).toBe("mid");
  });
});

describe("finalSeniority — Variant B", () => {
  describe("title wins for senior/lead/director/executive (no demotion by years)", () => {
    it("'senior' title stays senior even when years.min=3", () => {
      expect(finalSeniority("senior", { min: 3, max: 5 })).toBe("senior");
    });
    it("'senior' title stays senior with no years signal", () => {
      expect(finalSeniority("senior", { min: null, max: null })).toBe("senior");
    });
    it("'lead' title stays lead even when years.min=4", () => {
      expect(finalSeniority("lead", { min: 4, max: 6 })).toBe("lead");
    });
    it("'director' title stays director even when years.min=4 (was unreachable pre-fix)", () => {
      expect(finalSeniority("director", { min: 4, max: null })).toBe("director");
    });
    it("'executive' title stays executive even when years.min=5 (was unreachable pre-fix)", () => {
      expect(finalSeniority("executive", { min: 5, max: null })).toBe("executive");
    });
  });

  describe("title wins for entry", () => {
    it("'entry' title stays entry even when years.min=4", () => {
      expect(finalSeniority("entry", { min: 4, max: null })).toBe("entry");
    });
  });

  describe("'mid' title (no seniority keyword) — years refines", () => {
    it("years.min ≤ 2 → mid (Variant C: years no longer demotes to entry)", () => {
      expect(finalSeniority("mid", { min: 0, max: null })).toBe("mid");
      expect(finalSeniority("mid", { min: 2, max: null })).toBe("mid");
    });
    it("years.min 3-5 → mid", () => {
      expect(finalSeniority("mid", { min: 3, max: null })).toBe("mid");
      expect(finalSeniority("mid", { min: 5, max: null })).toBe("mid");
    });
    it("years.min 6-8 → senior", () => {
      expect(finalSeniority("mid", { min: 6, max: null })).toBe("senior");
      expect(finalSeniority("mid", { min: 8, max: null })).toBe("senior");
    });
    it("years.min ≥ 9 → lead", () => {
      expect(finalSeniority("mid", { min: 9, max: null })).toBe("lead");
      expect(finalSeniority("mid", { min: 15, max: null })).toBe("lead");
    });
    it("no years signal → mid (the only bucket-default state)", () => {
      expect(finalSeniority("mid", { min: null, max: null })).toBe("mid");
    });
  });

  describe("classifyLocation — English coverage (existing baseline)", () => {
    it("recognizes major IL cities", () => {
      expect(classifyLocation("Tel Aviv, Israel").is_il).toBe(true);
      expect(classifyLocation("Haifa, Israel").is_il).toBe(true);
      expect(classifyLocation("Jerusalem").is_il).toBe(true);
      expect(classifyLocation("Herzliya").is_il).toBe(true);
      expect(classifyLocation("Yokneam Illit").is_il).toBe(true);
    });
    it("trusts structured country code", () => {
      expect(classifyLocation(null, "IL").is_il).toBe(true);
      expect(classifyLocation(null, "Israel").is_il).toBe(true);
      expect(classifyLocation("Unknown city", "IL").is_il).toBe(true);
    });
    it("country-level fallback when no city matches", () => {
      expect(classifyLocation("Remote — Israel").is_il).toBe(true);
      expect(classifyLocation("Some unlisted place, IL").is_il).toBe(true);
    });
    it("rejects non-IL locations that share substrings", () => {
      expect(classifyLocation("Springfield, Illinois").is_il).toBe(false);
      expect(classifyLocation("Lille, France").is_il).toBe(false);
      expect(classifyLocation("Toulouse, France").is_il).toBe(false);
      expect(classifyLocation("New York, USA").is_il).toBe(false);
      expect(classifyLocation("Bangalore, India").is_il).toBe(false);
    });
  });

  describe("classifyLocation — 'IL' state-code vs country-code disambiguation", () => {
    // Illinois fix: the original regex matched \bIL\b unconditionally,
    // so "Chicago, IL" was tagged as Israel (Illinois's USPS code is
    // literally "IL"). Live impact: 307 active rows; worst offenders
    // DoorDash 113, EY 77, Robinhood 21, Pinterest 18. The rule below
    // requires a CORROBORATING US signal (US ZIP, ", US/USA", or a
    // non-IL state code) before flipping to false — so small Israeli
    // towns not in the city map (e.g. "Yokneam, IL") stay IL.
    it("Chicago, IL with US ZIP → false (Illinois state code)", () => {
      expect(classifyLocation("Chicago, IL, US, 60606").is_il).toBe(false);
    });
    it("Chicago, IL with ', US' → false", () => {
      expect(classifyLocation("Chicago, IL, USA").is_il).toBe(false);
    });
    it("multi-city US string containing 'Chicago, IL' → false", () => {
      // Real DoorDash / Robinhood pattern — corroborated by other state codes
      expect(
        classifyLocation("Atlanta, GA; Austin, TX; Boston, MA; Chicago, IL; Denver, CO").is_il,
      ).toBe(false);
    });
    it("Yokneam, IL stays IL (no US corroborator → trust IL = country code)", () => {
      // Small Israeli town not in the IL_CITY_MAP needle list. The
      // looser version of this fix would have dropped this row.
      expect(classifyLocation("Yokneam, IL").is_il).toBe(true);
    });
    it("global-remote with Israel + US co-mention → true (Israel wins)", () => {
      expect(classifyLocation("Remote, Israel; Remote, US").is_il).toBe(true);
      expect(classifyLocation("Tel Aviv; San Francisco, CA").is_il).toBe(true);
    });
  });

  describe("classifyLocation — Hebrew coverage (2026-06-04 Workday-MNC pass)", () => {
    it("recognizes Hebrew city names from global ATSs", () => {
      // Global Workday boards (Forcepoint, Motorola, Mavenir) frequently
      // emit Hebrew location strings even on English UIs. Without these,
      // real IL postings were silently dropped at is_il=false.
      expect(classifyLocation("תל אביב").is_il).toBe(true);
      expect(classifyLocation("תל אביב").city).toBe("Tel Aviv");
      expect(classifyLocation("חיפה").is_il).toBe(true);
      expect(classifyLocation("ירושלים").is_il).toBe(true);
      expect(classifyLocation("הרצליה").is_il).toBe(true);
      expect(classifyLocation("רעננה").is_il).toBe(true);
      expect(classifyLocation("פתח תקווה").is_il).toBe(true);
      expect(classifyLocation("יקנעם").is_il).toBe(true);
      expect(classifyLocation("רחובות").is_il).toBe(true);
      expect(classifyLocation("נתניה").is_il).toBe(true);
      expect(classifyLocation("באר שבע").is_il).toBe(true);
      expect(classifyLocation("קיסריה").is_il).toBe(true);
      expect(classifyLocation("מודיעין").is_il).toBe(true);
    });
    it("recognizes the Hebrew country name", () => {
      expect(classifyLocation("ישראל").is_il).toBe(true);
      expect(classifyLocation("עבודה מהבית · ישראל").is_il).toBe(true);
    });
    it("recognizes mixed Hebrew + English locations", () => {
      expect(classifyLocation("Tel Aviv / תל אביב").is_il).toBe(true);
      expect(classifyLocation("Israel · ישראל").is_il).toBe(true);
    });
  });

  // ─── Variant C tests (2026-06-09 cache audit) ───────────────────────

  describe("detectSeniorityFromTitle — Variant C tightening", () => {
    it("'lead' is reserved for explicit lead-track titles", () => {
      expect(detectSeniorityFromTitle("Lead Engineer")).toBe("lead");
      expect(detectSeniorityFromTitle("Principal Designer")).toBe("lead");
      expect(detectSeniorityFromTitle("Staff Software Engineer")).toBe("lead");
      expect(detectSeniorityFromTitle("Solutions Architect")).toBe("lead");
      expect(detectSeniorityFromTitle("Team Leader")).toBe("lead");
      expect(detectSeniorityFromTitle("DevOps Team Leader")).toBe("lead");
      expect(detectSeniorityFromTitle("Group Product Manager")).toBe("lead");
    });
    it("bare Manager / Controller / Counsel → MID (not lead — 566-to-lead bug fix)", () => {
      expect(detectSeniorityFromTitle("Product Manager")).toBe("mid");
      expect(detectSeniorityFromTitle("Marketing Manager")).toBe("mid");
      expect(detectSeniorityFromTitle("Customer Success Manager")).toBe("mid");
      expect(detectSeniorityFromTitle("Account Manager")).toBe("mid");
      expect(detectSeniorityFromTitle("Controller")).toBe("mid");
      expect(detectSeniorityFromTitle("Assistant Controller")).toBe("mid");
      expect(detectSeniorityFromTitle("Legal Counsel")).toBe("mid");
    });
    it("Senior wins over Lead/Manager when both present", () => {
      expect(detectSeniorityFromTitle("Senior Product Manager")).toBe("senior");
      expect(detectSeniorityFromTitle("Senior Lead Engineer")).toBe("senior");
    });
    it("Head of X → executive, bare Head → lead", () => {
      expect(detectSeniorityFromTitle("Head of Marketing")).toBe("executive");
      expect(detectSeniorityFromTitle("Vice President of Sales")).toBe("executive");
      expect(detectSeniorityFromTitle("Department Head")).toBe("lead");
    });
    it("expanded entry signals: SDR / BDR / Coordinator / Representative", () => {
      expect(detectSeniorityFromTitle("SDR")).toBe("entry");
      expect(detectSeniorityFromTitle("BDR - Israel")).toBe("entry");
      expect(detectSeniorityFromTitle("Sales Development Representative")).toBe("entry");
      expect(detectSeniorityFromTitle("Business Development Representative")).toBe("entry");
      expect(detectSeniorityFromTitle("Marketing Coordinator")).toBe("entry");
      expect(detectSeniorityFromTitle("Customer Service Representative")).toBe("entry");
    });
    it("'Associate' is narrow: requires IC role-noun after", () => {
      expect(detectSeniorityFromTitle("Associate Engineer")).toBe("entry");
      expect(detectSeniorityFromTitle("Associate Consultant")).toBe("entry");
      expect(detectSeniorityFromTitle("Associate Analyst")).toBe("entry");
      // Standalone "Associate" alone doesn't trigger anymore — falls
      // through to mid. (Old regex would match `\bassociate\b` always.)
      expect(detectSeniorityFromTitle("Associate")).toBe("mid");
    });
  });

  describe("parseExplicitJuniorSignal", () => {
    it("matches the listed phrases", () => {
      expect(parseExplicitJuniorSignal("Requires 0-1 years of experience")).toBe(true);
      expect(parseExplicitJuniorSignal("0 to 1 year of experience preferred")).toBe(true);
      expect(parseExplicitJuniorSignal("No experience required")).toBe(true);
      expect(parseExplicitJuniorSignal("no prior experience needed")).toBe(true);
      expect(parseExplicitJuniorSignal("Open to recent graduates")).toBe(true);
      expect(parseExplicitJuniorSignal("Looking for a new grad")).toBe(true);
      expect(parseExplicitJuniorSignal("This is an entry-level position")).toBe(true);
      expect(parseExplicitJuniorSignal("Entry Level role")).toBe(true);
    });
    it("does NOT match bare years phrases (the original bug)", () => {
      expect(parseExplicitJuniorSignal("2 years of experience")).toBe(false);
      expect(parseExplicitJuniorSignal("1+ year")).toBe(false);
      expect(parseExplicitJuniorSignal("1-2 years experience")).toBe(false);
      expect(parseExplicitJuniorSignal("3-5 years required")).toBe(false);
    });
    it("returns false on null / empty", () => {
      expect(parseExplicitJuniorSignal(null)).toBe(false);
      expect(parseExplicitJuniorSignal("")).toBe(false);
    });
  });

  describe("finalSeniority — Variant C: years no longer demotes, JD promotion replaces it", () => {
    it("neutral IC title + years.min=1 → mid (NOT entry — bug fix)", () => {
      expect(finalSeniority("mid", { min: 1, max: null })).toBe("mid");
      expect(finalSeniority("mid", { min: 2, max: null })).toBe("mid");
    });
    it("neutral IC title + explicit junior JD → entry (promotion)", () => {
      expect(finalSeniority("mid", { min: null, max: null }, { explicitJunior: true })).toBe("entry");
      expect(finalSeniority("mid", { min: 1, max: null }, { explicitJunior: true })).toBe("entry");
    });
    it("Manager-title (mid) + explicit junior JD → mid (titleHasMgmtSignal blocks promotion)", () => {
      expect(
        finalSeniority("mid", { min: null, max: null }, { explicitJunior: true, titleHasMgmtSignal: true }),
      ).toBe("mid");
    });
    it("years STILL refines upward (no change)", () => {
      expect(finalSeniority("mid", { min: 7, max: null })).toBe("senior");
      expect(finalSeniority("mid", { min: 9, max: null })).toBe("lead");
    });
  });

  describe("regression cases from the 2026-05-20 cache audit", () => {
    it("'Senior Software Engineer, 3-5 yrs' → senior (was: mid)", () => {
      expect(finalSeniority(detectSeniorityFromTitle("Senior Software Engineer"), { min: 3, max: 5 })).toBe(
        "senior",
      );
    });
    it("'Director of CS, 4 yrs' → director (was: mid — unreachable)", () => {
      expect(finalSeniority(detectSeniorityFromTitle("Director of Customer Success"), { min: 4, max: null })).toBe(
        "director",
      );
    });
    it("'VP Marketing, 5 yrs' → executive (was: mid — unreachable)", () => {
      expect(finalSeniority(detectSeniorityFromTitle("VP of Marketing"), { min: 5, max: null })).toBe(
        "executive",
      );
    });
    it("untitled 'Software Engineer, 1 yr' → mid (Variant C: years no longer auto-demotes to entry)", () => {
      // Pre-Variant-C this returned "entry" — the demotion was too
      // aggressive (most JDs mention "1+ year" as a soft floor). Now
      // only an explicit JD junior signal ("entry-level", "new grad",
      // "0-1 years", "no experience required") promotes to entry.
      expect(finalSeniority(detectSeniorityFromTitle("Software Engineer"), { min: 1, max: null })).toBe(
        "mid",
      );
    });
    it("untitled 'Software Engineer, 1 yr, explicit junior JD' → entry (promotion)", () => {
      expect(
        finalSeniority(
          detectSeniorityFromTitle("Software Engineer"),
          { min: 1, max: null },
          { explicitJunior: true },
        ),
      ).toBe("entry");
    });
    it("untitled 'Software Engineer, 7 yrs' → senior (years refines mid bucket)", () => {
      expect(finalSeniority(detectSeniorityFromTitle("Software Engineer"), { min: 7, max: null })).toBe(
        "senior",
      );
    });
  });
});
