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
    expect(detectSeniorityFromTitle("Chief Marketing Officer")).toBe(
      "executive",
    );
    expect(detectSeniorityFromTitle("Head of Product")).toBe("executive");
  });
  it("flags director titles", () => {
    expect(detectSeniorityFromTitle("Director of Customer Success")).toBe(
      "director",
    );
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
      expect(finalSeniority("director", { min: 4, max: null })).toBe(
        "director",
      );
    });
    it("'executive' title stays executive even when years.min=5 (was unreachable pre-fix)", () => {
      expect(finalSeniority("executive", { min: 5, max: null })).toBe(
        "executive",
      );
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
        classifyLocation(
          "Atlanta, GA; Austin, TX; Boston, MA; Chicago, IL; Denver, CO",
        ).is_il,
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

  describe("classifyLocation: Illinois suppression (PR #387)", () => {
    // The ~164 residual US-Illinois false positives: Illinois suburbs not in the
    // tech-hub allowlist, dotted "U.S." / "U.S.A." forms, and structured_country
    // = "US". The bare ", IL" continues to mean Israel only when no US signal is
    // present.
    it("Chicago, IL → not IL (US)", () => {
      expect(classifyLocation("Chicago, IL").is_il).toBe(false);
    });
    it("Chicago, IL 60606 → not IL (US ZIP)", () => {
      expect(classifyLocation("Chicago, IL 60606").is_il).toBe(false);
    });
    it("Chicago, Illinois, US → not IL (US token)", () => {
      expect(classifyLocation("Chicago, Illinois, US").is_il).toBe(false);
    });
    it("Remote, US or IL → not IL (US token present)", () => {
      expect(classifyLocation("Remote, US or IL").is_il).toBe(false);
    });
    it("Illinois suburbs that pair with IL → not IL", () => {
      expect(classifyLocation("Naperville, IL").is_il).toBe(false);
      expect(classifyLocation("Schaumburg, IL").is_il).toBe(false);
      expect(classifyLocation("Springfield, IL").is_il).toBe(false);
      expect(classifyLocation("Aurora, IL").is_il).toBe(false);
      expect(classifyLocation("Elgin, IL").is_il).toBe(false);
    });
    it("dotted U.S. / U.S.A. token alongside IL → not IL", () => {
      expect(classifyLocation("Remote, IL, U.S.").is_il).toBe(false);
      expect(classifyLocation("Remote, IL, U.S.A.").is_il).toBe(false);
    });
    it("structured_country = 'US' alongside a bare IL string → not IL", () => {
      expect(classifyLocation("Somewhere, IL", "US").is_il).toBe(false);
      expect(classifyLocation("Unknown place, IL", "USA").is_il).toBe(false);
    });

    it("', IL' alone → IL (preserve current behavior)", () => {
      expect(classifyLocation(", IL").is_il).toBe(true);
    });
    it("Tel Aviv, IL → IL", () => {
      expect(classifyLocation("Tel Aviv, IL").is_il).toBe(true);
    });
    it("Tel Aviv-Yafo → IL (existing city map)", () => {
      expect(classifyLocation("Tel Aviv-Yafo").is_il).toBe(true);
    });
    it("Haifa, IL → IL (existing city map)", () => {
      expect(classifyLocation("Haifa, IL").is_il).toBe(true);
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

  describe("classifyLocation: IL_CITY_MAP expansion (PR #387)", () => {
    // SuccessFactors silent drop (53% of SF IL rows had NULL city) + the
    // Greenhouse/Lever/Ashby city-only tail. Each new city resolves is_il=true
    // AND a non-null canonical city, including the city-only form (no country
    // token) that was the SuccessFactors NULL-city case.
    it("Nes Ziona (English + Hebrew + variants)", () => {
      expect(classifyLocation("Nes Ziona").city).toBe("Nes Ziona");
      expect(classifyLocation("Ness Ziona, Israel").city).toBe("Nes Ziona");
      expect(classifyLocation("נס ציונה").is_il).toBe(true);
    });
    it("Rosh HaAyin (apostrophe + dash variants)", () => {
      expect(classifyLocation("Rosh HaAyin").city).toBe("Rosh HaAyin");
      expect(classifyLocation("Rosh Ha'Ayin").city).toBe("Rosh HaAyin");
      expect(classifyLocation("Rosh Ha-Ayin").is_il).toBe(true);
      expect(classifyLocation("ראש העין").city).toBe("Rosh HaAyin");
    });
    it("Kiryat Gat (single + double yod Hebrew)", () => {
      expect(classifyLocation("Kiryat Gat").city).toBe("Kiryat Gat");
      expect(classifyLocation("קריית גת").city).toBe("Kiryat Gat");
      expect(classifyLocation("קרית גת").is_il).toBe(true);
    });
    it("Migdal HaEmek (variants)", () => {
      expect(classifyLocation("Migdal HaEmek").city).toBe("Migdal HaEmek");
      expect(classifyLocation("Migdal Ha'Emek").city).toBe("Migdal HaEmek");
      expect(classifyLocation("מגדל העמק").is_il).toBe(true);
    });
    it("Airport City (English + Hebrew)", () => {
      expect(classifyLocation("Airport City").city).toBe("Airport City");
      expect(classifyLocation("עיר נמל התעופה").is_il).toBe(true);
    });
    it("Tel-Hai, and does not shadow Tel Aviv", () => {
      expect(classifyLocation("Tel-Hai").city).toBe("Tel-Hai");
      expect(classifyLocation("Tel Hai").city).toBe("Tel-Hai");
      expect(classifyLocation("תל חי").city).toBe("Tel-Hai");
      expect(classifyLocation("Tel Aviv").city).toBe("Tel Aviv");
    });
    it("Sdom", () => {
      expect(classifyLocation("Sdom").city).toBe("Sdom");
      expect(classifyLocation("סדום").is_il).toBe(true);
    });
    it("Neot Hovav", () => {
      expect(classifyLocation("Neot Hovav").city).toBe("Neot Hovav");
      expect(classifyLocation("נאות חובב").is_il).toBe(true);
    });
    it("Karmiel (Karmiel + Carmiel + Hebrew)", () => {
      expect(classifyLocation("Karmiel").city).toBe("Karmiel");
      expect(classifyLocation("Carmiel").city).toBe("Karmiel");
      expect(classifyLocation("כרמיאל").is_il).toBe(true);
    });
    it("Petah Tikva single-vav Hebrew variant", () => {
      expect(classifyLocation("פתח תקוה").city).toBe("Petah Tikva");
    });
    it("city-only locations still classify (the SuccessFactors silent-drop case)", () => {
      expect(classifyLocation("Nes Ziona").is_il).toBe(true);
      expect(classifyLocation("Kiryat Gat").is_il).toBe(true);
      expect(classifyLocation("Migdal HaEmek").is_il).toBe(true);
    });
    it("already-present cities are unchanged", () => {
      expect(classifyLocation("Modi'in").city).toBe("Modi'in");
      expect(classifyLocation("Yokneam Illit").city).toBe("Yokneam");
      expect(classifyLocation("Caesarea").city).toBe("Caesarea");
      expect(classifyLocation("Or Yehuda").city).toBe("Or Yehuda");
    });
  });

  // ─── PR-M1 step (a): US tech-hub city co-mention ─────────────────────
  //
  // Bare "Chicago, IL" used to pass through as IL because no other US
  // signal was present and the explicit caveat in the comment block
  // accepted ~46 false-positive rows. PR-M1 step (a) audit (2026-06-12)
  // counted 67 active production false-positives across Greenhouse +
  // Workday — and Google/Microsoft/Meta/Amazon Workday boards (added in
  // step (b)) would multiply that by an order of magnitude. The US-city
  // allowlist closes the hole. Additive (only flips when paired with
  // `\bIL\b` and zero other Israel signal), so currently-correct IL
  // rows cannot regress.

  describe("classifyLocation — US tech-hub city co-mention flips bare 'IL'", () => {
    // Single-word US cities — these were the original 67 false-positives.
    it("Chicago, IL → false (the canonical bug)", () => {
      expect(classifyLocation("Chicago, IL").is_il).toBe(false);
    });
    it("Seattle, IL → false", () => {
      expect(classifyLocation("Seattle, IL").is_il).toBe(false);
    });
    it("Boston, IL → false", () => {
      expect(classifyLocation("Boston, IL").is_il).toBe(false);
    });
    it("Austin, IL → false", () => {
      expect(classifyLocation("Austin, IL").is_il).toBe(false);
    });
    it("Phoenix, IL → false (malformed US miscoding; the Israeli insurer 'Phoenix Insurance' is a company name, not a location)", () => {
      expect(classifyLocation("Phoenix, IL").is_il).toBe(false);
    });

    // Multi-word US cities — Eli specifically named these as the
    // long-tail risk in MNC boards.
    it("New York, IL → false (multi-word)", () => {
      expect(classifyLocation("New York, IL").is_il).toBe(false);
    });
    it("Los Angeles, IL → false (multi-word)", () => {
      expect(classifyLocation("Los Angeles, IL").is_il).toBe(false);
    });
    it("San Francisco, IL → false (multi-word)", () => {
      expect(classifyLocation("San Francisco, IL").is_il).toBe(false);
    });
    it("San Jose, IL → false (multi-word)", () => {
      expect(classifyLocation("San Jose, IL").is_il).toBe(false);
    });
    it("Mountain View, IL → false (multi-word, Google HQ)", () => {
      expect(classifyLocation("Mountain View, IL").is_il).toBe(false);
    });
    it("Menlo Park, IL → false (multi-word, Meta HQ)", () => {
      expect(classifyLocation("Menlo Park, IL").is_il).toBe(false);
    });
    it("Santa Clara, IL → false (multi-word, Nvidia/Intel)", () => {
      expect(classifyLocation("Santa Clara, IL").is_il).toBe(false);
    });
    it("Palo Alto, IL → false (multi-word, HP/VMware)", () => {
      expect(classifyLocation("Palo Alto, IL").is_il).toBe(false);
    });
    it("Salt Lake City, IL → false (three-word — boundary handling)", () => {
      expect(classifyLocation("Salt Lake City, IL").is_il).toBe(false);
    });
    it("Saint Louis, IL → false (both 'Saint Louis' and 'St. Louis' spellings)", () => {
      expect(classifyLocation("Saint Louis, IL").is_il).toBe(false);
      expect(classifyLocation("St. Louis, IL").is_il).toBe(false);
    });

    // Israeli wins ARE preserved — Israel signal beats US-city signal,
    // exact same precedence as the existing state-code rule.
    it("Tel Aviv + San Francisco co-mention → still true (city map wins)", () => {
      expect(classifyLocation("Tel Aviv; San Francisco, CA").is_il).toBe(true);
    });
    it("San Francisco; Remote, Israel → still true ('Israel' word wins)", () => {
      expect(classifyLocation("San Francisco; Remote, Israel").is_il).toBe(
        true,
      );
    });
    it("Phoenix Insurance, Tel Aviv → still true (Tel Aviv via city map; the company-name collision is irrelevant)", () => {
      expect(classifyLocation("Phoenix Insurance, Tel Aviv").is_il).toBe(true);
      expect(classifyLocation("Phoenix Insurance, Tel Aviv").city).toBe(
        "Tel Aviv",
      );
    });

    // Yokneam-class small-town protection — still works because no US
    // city is in the string.
    it("Yokneam, IL still true (no US city → trust IL = country code) — PR #269 contract preserved", () => {
      expect(classifyLocation("Yokneam, IL").is_il).toBe(true);
    });
    it("Sdom, IL still true (small Israeli locale; no US co-mention)", () => {
      expect(classifyLocation("Sdom, IL").is_il).toBe(true);
    });

    // Case-insensitivity check — ATSs occasionally yell.
    it("SAN FRANCISCO, IL → false (case-insensitive city match)", () => {
      expect(classifyLocation("SAN FRANCISCO, IL").is_il).toBe(false);
    });
  });

  // ─── PR-M1 step (a): Hebrew region tags ──────────────────────────────
  //
  // Audit found 222 active production rows landing as is_il=true but
  // city=NULL because the location_raw was a bare Hebrew district tag
  // (גוש דן 122, השפלה 55, דרום 24, השרון 13, מרכז 8). They're now
  // mapped to canonical Israeli district names. Specific cities always
  // win first — a real city in the same string is never overridden by
  // a region.

  describe("classifyLocation — Hebrew region tags resolve to districts", () => {
    it("גוש דן → Tel Aviv District", () => {
      const r = classifyLocation("גוש דן");
      expect(r.is_il).toBe(true);
      expect(r.city).toBe("Tel Aviv District");
    });
    it("השפלה → Central District", () => {
      const r = classifyLocation("השפלה");
      expect(r.is_il).toBe(true);
      expect(r.city).toBe("Central District");
    });
    it("השרון → Central District", () => {
      const r = classifyLocation("השרון");
      expect(r.is_il).toBe(true);
      expect(r.city).toBe("Central District");
    });
    it("דרום → Southern District", () => {
      const r = classifyLocation("דרום");
      expect(r.is_il).toBe(true);
      expect(r.city).toBe("Southern District");
    });
    it("צפון → Northern District", () => {
      const r = classifyLocation("צפון");
      expect(r.is_il).toBe(true);
      expect(r.city).toBe("Northern District");
    });
    it("מרכז → Central District", () => {
      const r = classifyLocation("מרכז");
      expect(r.is_il).toBe(true);
      expect(r.city).toBe("Central District");
    });
    it("substring match works for the real production shape 'גוש דן | <employer>'", () => {
      // The actual top-producing strings from the audit: "גוש דן | משרד הביטחון"
      // (30 jobs), "גוש דן | IBI" (18), etc.
      const r = classifyLocation("גוש דן | משרד הביטחון");
      expect(r.is_il).toBe(true);
      expect(r.city).toBe("Tel Aviv District");
    });
    it("English 'Gush Dan' transliteration resolves too", () => {
      const r = classifyLocation("Gush Dan, Israel");
      expect(r.is_il).toBe(true);
      expect(r.city).toBe("Tel Aviv District");
    });

    // Specific city precedence: a real city name in the same string
    // always beats the region tag.
    it("'Tel Aviv-Yafo, Gush Dan, Israel' resolves to Tel Aviv (city wins over region)", () => {
      const r = classifyLocation("Tel Aviv-Yafo, Gush Dan, Israel");
      expect(r.is_il).toBe(true);
      expect(r.city).toBe("Tel Aviv");
    });

    // Structured-country path also gets the region resolution.
    it("structuredCountry='IL' with Hebrew region in raw → district city", () => {
      const r = classifyLocation("גוש דן", "IL");
      expect(r.is_il).toBe(true);
      expect(r.city).toBe("Tel Aviv District");
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
      expect(detectSeniorityFromTitle("Vice President of Sales")).toBe(
        "executive",
      );
      expect(detectSeniorityFromTitle("Department Head")).toBe("lead");
    });
    it("expanded entry signals: SDR / BDR / Coordinator / Representative", () => {
      expect(detectSeniorityFromTitle("SDR")).toBe("entry");
      expect(detectSeniorityFromTitle("BDR - Israel")).toBe("entry");
      expect(detectSeniorityFromTitle("Sales Development Representative")).toBe(
        "entry",
      );
      expect(
        detectSeniorityFromTitle("Business Development Representative"),
      ).toBe("entry");
      expect(detectSeniorityFromTitle("Marketing Coordinator")).toBe("entry");
      expect(detectSeniorityFromTitle("Customer Service Representative")).toBe(
        "entry",
      );
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
      expect(
        parseExplicitJuniorSignal("Requires 0-1 years of experience"),
      ).toBe(true);
      expect(
        parseExplicitJuniorSignal("0 to 1 year of experience preferred"),
      ).toBe(true);
      expect(parseExplicitJuniorSignal("No experience required")).toBe(true);
      expect(parseExplicitJuniorSignal("no prior experience needed")).toBe(
        true,
      );
      expect(parseExplicitJuniorSignal("Open to recent graduates")).toBe(true);
      expect(parseExplicitJuniorSignal("Looking for a new grad")).toBe(true);
      expect(parseExplicitJuniorSignal("This is an entry-level position")).toBe(
        true,
      );
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
    it("matches bare Hebrew junior phrases (AdamTotal / Comeet)", () => {
      expect(
        parseExplicitJuniorSignal("הזדמנות מצוינת לעבודה ראשונה בתחום"),
      ).toBe(true); // עבודה ראשונה = first job
      expect(parseExplicitJuniorSignal("התפקיד מתאים גם ללא ניסיון קודם")).toBe(
        true,
      ); // ללא ניסיון = no experience
      expect(parseExplicitJuniorSignal("דרוש/ה מפתח/ת ג'וניור לצוות")).toBe(
        true,
      ); // ג'וניור = junior (geresh)
      expect(parseExplicitJuniorSignal("המשרה ללא נסיון נדרש")).toBe(true); // נסיון spelling variant (no yod)
    });
    it("scoped דרושים: bare hiring headline does NOT promote; promotes only with a nearby no-experience qualifier", () => {
      // 'דרושים/דרושות' = generic 'wanted' headline on most IL posts — must NOT promote alone
      expect(parseExplicitJuniorSignal("דרושים מהנדס תוכנה")).toBe(false);
      expect(parseExplicitJuniorSignal("דרושות נציגות מכירות מנוסות")).toBe(
        false,
      );
      // same headline WITH a no-experience qualifier nearby → promotes
      expect(
        parseExplicitJuniorSignal("דרושים נציגי שירות, ללא ניסיון נדרש"),
      ).toBe(true);
      expect(
        parseExplicitJuniorSignal("עבודה ראשונה? דרושים עובדים חדשים"),
      ).toBe(true);
    });
  });

  describe("finalSeniority — Variant C: years no longer demotes, JD promotion replaces it", () => {
    it("neutral IC title + years.min=1 → mid (NOT entry — bug fix)", () => {
      expect(finalSeniority("mid", { min: 1, max: null })).toBe("mid");
      expect(finalSeniority("mid", { min: 2, max: null })).toBe("mid");
    });
    it("neutral IC title + explicit junior JD → entry (promotion)", () => {
      expect(
        finalSeniority(
          "mid",
          { min: null, max: null },
          { explicitJunior: true },
        ),
      ).toBe("entry");
      expect(
        finalSeniority("mid", { min: 1, max: null }, { explicitJunior: true }),
      ).toBe("entry");
    });
    it("Manager-title (mid) + explicit junior JD → mid (titleHasMgmtSignal blocks promotion)", () => {
      expect(
        finalSeniority(
          "mid",
          { min: null, max: null },
          { explicitJunior: true, titleHasMgmtSignal: true },
        ),
      ).toBe("mid");
    });
    it("years STILL refines upward (no change)", () => {
      expect(finalSeniority("mid", { min: 7, max: null })).toBe("senior");
      expect(finalSeniority("mid", { min: 9, max: null })).toBe("lead");
    });
  });

  describe("regression cases from the 2026-05-20 cache audit", () => {
    it("'Senior Software Engineer, 3-5 yrs' → senior (was: mid)", () => {
      expect(
        finalSeniority(detectSeniorityFromTitle("Senior Software Engineer"), {
          min: 3,
          max: 5,
        }),
      ).toBe("senior");
    });
    it("'Director of CS, 4 yrs' → director (was: mid — unreachable)", () => {
      expect(
        finalSeniority(
          detectSeniorityFromTitle("Director of Customer Success"),
          { min: 4, max: null },
        ),
      ).toBe("director");
    });
    it("'VP Marketing, 5 yrs' → executive (was: mid — unreachable)", () => {
      expect(
        finalSeniority(detectSeniorityFromTitle("VP of Marketing"), {
          min: 5,
          max: null,
        }),
      ).toBe("executive");
    });
    it("untitled 'Software Engineer, 1 yr' → mid (Variant C: years no longer auto-demotes to entry)", () => {
      // Pre-Variant-C this returned "entry" — the demotion was too
      // aggressive (most JDs mention "1+ year" as a soft floor). Now
      // only an explicit JD junior signal ("entry-level", "new grad",
      // "0-1 years", "no experience required") promotes to entry.
      expect(
        finalSeniority(detectSeniorityFromTitle("Software Engineer"), {
          min: 1,
          max: null,
        }),
      ).toBe("mid");
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
      expect(
        finalSeniority(detectSeniorityFromTitle("Software Engineer"), {
          min: 7,
          max: null,
        }),
      ).toBe("senior");
    });
  });
});
