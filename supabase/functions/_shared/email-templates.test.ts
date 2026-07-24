// Tests for the automation email templates. The load-bearing property: EVERY
// email (html + text) carries the working unsubscribe link — a compliance +
// trust requirement. Also pins HTML-escaping so a crafted job title / name can't
// inject markup.

import { describe, it, expect } from "vitest";
import { renderJobDigestEmail, renderReengagementEmail } from "./email-templates";

const UNSUB = "https://x.supabase.co/functions/v1/email-unsubscribe?token=abc";

describe("renderJobDigestEmail", () => {
  const base = {
    fullName: "Maya Cohen",
    jobs: [
      { title: "Product Manager", company: "Playtika", location: "Herzliya", url: "https://ex/1", band: "good", scorePct: 61 },
      { title: "Analyst", company: "Taboola", location: "Tel Aviv", url: "https://ex/2", band: "good", scorePct: 45 },
    ],
    unsubscribeUrl: UNSUB,
    appUrl: "https://getajob.careers",
  };

  it("subject counts the jobs", () => {
    expect(renderJobDigestEmail(base).subject).toBe("2 new jobs that match your profile");
    expect(renderJobDigestEmail({ ...base, jobs: [base.jobs[0]] }).subject).toBe("1 new job that matches your profile");
  });

  it("includes the unsubscribe link in BOTH html and text", () => {
    const { html, text } = renderJobDigestEmail(base);
    expect(html).toContain(UNSUB);
    expect(text).toContain(UNSUB);
  });

  it("renders every job's title + company + url", () => {
    const { html, text } = renderJobDigestEmail(base);
    for (const j of base.jobs) {
      expect(html).toContain(j.title);
      expect(html).toContain(j.company);
      expect(html).toContain(j.url);
      expect(text).toContain(j.title);
    }
  });

  it("uses the first name in the greeting, falls back to 'there'", () => {
    expect(renderJobDigestEmail(base).text).toContain("Hi Maya,");
    expect(renderJobDigestEmail({ ...base, fullName: null }).text).toContain("Hi there,");
  });

  it("HTML-escapes job fields (no markup injection)", () => {
    const { html } = renderJobDigestEmail({
      ...base,
      jobs: [{ title: "<script>x</script>PM", company: "A&B", location: "", url: "https://ex/1", band: "good", scorePct: 50 }],
    });
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A&amp;B");
  });
});

describe("renderReengagementEmail", () => {
  it("includes the unsubscribe link in both bodies + a finish-setup CTA", () => {
    const { subject, html, text } = renderReengagementEmail({
      fullName: "Daniel Levi",
      unsubscribeUrl: UNSUB,
      appUrl: "https://getajob.careers/onboarding",
    });
    expect(subject.length).toBeGreaterThan(0);
    expect(html).toContain(UNSUB);
    expect(text).toContain(UNSUB);
    expect(html).toContain("https://getajob.careers/onboarding");
    expect(text).toContain("Hi Daniel,");
  });
});
