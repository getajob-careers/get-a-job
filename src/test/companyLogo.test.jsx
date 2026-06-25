// Proves the company-logo system end to end at the logic + render level:
//   1. companyDomainFor resolves a job → domain (slug match, name match,
//      no match → null).
//   2. CompanyLogo renders a real-logo <img> when a domain is present and
//      degrades to the letter-avatar placeholder when it isn't.

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { companyDomainFor } from "@/lib/queries/useCompanyDomains";
import CompanyLogo, { logoSources } from "@/components/jobs/CompanyLogo";

const DOMAINS = {
  bySlug: { wix: "wix.com", monday: "monday.com" },
  byName: { fiverr: "fiverr.com" },
};

describe("companyDomainFor", () => {
  it("resolves by company_slug → ats_slug", () => {
    expect(companyDomainFor(DOMAINS, { company_slug: "wix", company_name: "Wix" })).toBe("wix.com");
  });

  it("falls back to normalized company_name when slug misses", () => {
    expect(companyDomainFor(DOMAINS, { company_slug: "unknown-slug", company_name: "Fiverr Ltd." })).toBe("fiverr.com");
  });

  it("returns null when nothing matches (→ placeholder path)", () => {
    expect(companyDomainFor(DOMAINS, { company_slug: "nope", company_name: "Stealth Co" })).toBeNull();
  });

  it("is null-safe when the map hasn't loaded yet", () => {
    expect(companyDomainFor(undefined, { company_name: "Wix" })).toBeNull();
  });
});

describe("CompanyLogo", () => {
  it("renders a real-logo image when a domain is present", () => {
    render(<CompanyLogo domain="wix.com" companyName="Wix" fallbackStyle={{}} />);
    const img = screen.getByAltText("Wix logo");
    expect(img).toBeInTheDocument();
    // Tokenless default tier = DuckDuckGo icon service for the domain.
    expect(img.getAttribute("src")).toContain("icons.duckduckgo.com/ip3/wix.com");
  });

  it("renders the letter-avatar placeholder when there's no domain", () => {
    render(<CompanyLogo domain={null} companyName="Stealth Co" fallbackStyle={{}} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("rejects DuckDuckGo's 48x48 grey-chevron placeholder and falls through to the letter", () => {
    // (token-cascade cases below; this DDG case is the tokenless path)
    render(<CompanyLogo domain="unknown-co.co.il" companyName="Unknown Co" fallbackStyle={{}} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toContain("icons.duckduckgo.com");
    // Simulate DDG returning its 48x48 placeholder for a domain it lacks.
    Object.defineProperty(img, "naturalWidth", { value: 48, configurable: true });
    Object.defineProperty(img, "naturalHeight", { value: 48, configurable: true });
    fireEvent.load(img);
    // No more tiers after DDG → the letter avatar replaces the image.
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("U")).toBeInTheDocument();
  });
});

describe("logoSources (the cascade)", () => {
  const TOKEN = "pk_test";

  it("tokenless: only the DuckDuckGo favicon, and only when there's a domain", () => {
    expect(logoSources("wix.com", "Wix", null)).toEqual([
      "https://icons.duckduckgo.com/ip3/wix.com.ico",
    ]);
    // No token and no domain → nothing to try → letter avatar.
    expect(logoSources(null, "Wix", null)).toEqual([]);
  });

  it("with a token + domain: logo.dev by domain, then by name, then favicon", () => {
    const out = logoSources("wix.com", "Wix", TOKEN);
    expect(out[0]).toContain("img.logo.dev/wix.com");
    expect(out[1]).toContain("img.logo.dev/name/Wix");
    expect(out[2]).toContain("icons.duckduckgo.com/ip3/wix.com");
  });

  it("with a token but NO domain: resolves by company name (the coverage win)", () => {
    const out = logoSources(null, "Riskified", TOKEN);
    expect(out).toEqual([
      `https://img.logo.dev/name/Riskified?token=${TOKEN}&size=80&format=png&fallback=404`,
    ]);
  });

  it("url-encodes company names with spaces", () => {
    const out = logoSources(null, "Bank Leumi", TOKEN);
    expect(out[0]).toContain("img.logo.dev/name/Bank%20Leumi");
  });
});
