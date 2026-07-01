import { describe, it, expect } from "vitest";
import { isDegenerateReword, resolveBullets } from "./reword.ts";

describe("isDegenerateReword (garbled punctuation guard)", () => {
  it("flags the punctuation-only / scaffolding fragments the model emits on failure", () => {
    for (const junk of [
      ", , - .",
      "SQL — ; .",
      "VIP — , .",
      "— ; .",
      "  ",
      "",
      ". . .",
      "AI / ML — .",
    ]) {
      expect(isDegenerateReword(junk)).toBe(true);
    }
  });
  it("keeps real reworded bullets (has words, letters, a 4+ letter word)", () => {
    for (const good of [
      "Led a cross-functional QA project on an AI customer-service voice bot.",
      "Built 15 dashboards used by senior management.",
      "Improved retention",
      "Reduced processing time by 30% via ETL redesign.",
    ]) {
      expect(isDegenerateReword(good)).toBe(false);
    }
  });
});

describe("resolveBullets (failed reword falls back to the ORIGINAL bullet, whole)", () => {
  const master = [
    "Redesigned the social media auto-moderation system from scratch, improving response relevance.",
    "Built an internal AI assistant with Cursor and Claude that flags likely issues before calls.",
  ];
  const haystack = master.join(" \n ").toLowerCase();

  it("a degenerate (punctuation-only) reword keeps the original bullet intact", () => {
    // simulates the malformed/garbled model output for bullet #0
    const rewordById = new Map([["E1#0", "SQL — ; ."]]);
    const { bullets, rejected } = resolveBullets(
      master,
      "E1",
      rewordById,
      haystack,
    );
    expect(bullets[0]).toBe(master[0]); // ORIGINAL survives whole, not "SQL — ; ."
    expect(bullets[1]).toBe(master[1]);
    expect(rejected).toBe(1);
  });

  it("empty / whitespace reword keeps the original", () => {
    const { bullets } = resolveBullets(
      master,
      "E1",
      new Map([["E1#0", "   "]]),
      haystack,
    );
    expect(bullets[0]).toBe(master[0]);
  });

  it("a valid, gate-passing reword is applied", () => {
    const good =
      "Rebuilt the social media auto-moderation system from scratch, lifting response relevance.";
    const { bullets, rejected } = resolveBullets(
      master,
      "E1",
      new Map([["E1#0", good]]),
      haystack,
    );
    expect(bullets[0]).toBe(good);
    expect(rejected).toBe(0);
  });

  it("a reword that fabricates a new number is rejected -> original kept", () => {
    // "300%" is not in the master content -> anti-fab gate rejects it
    const fab =
      "Redesigned the auto-moderation system, improving relevance by 300%.";
    const { bullets, rejected } = resolveBullets(
      master,
      "E1",
      new Map([["E1#0", fab]]),
      haystack,
    );
    expect(bullets[0]).toBe(master[0]);
    expect(rejected).toBe(1);
  });

  it("no reword for a bullet leaves it verbatim; count preserved (never drops a bullet)", () => {
    const { bullets } = resolveBullets(master, "E1", new Map(), haystack);
    expect(bullets).toEqual(master);
  });

  it("unstamped experience (no expId) keeps all bullets verbatim", () => {
    const { bullets } = resolveBullets(
      master,
      null,
      new Map([["E1#0", "SQL — ; ."]]),
      haystack,
    );
    expect(bullets).toEqual(master);
  });
});
