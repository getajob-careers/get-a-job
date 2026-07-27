// NEXT_DESIGN bootstrap - default-on + ?next=0 kill switch (Flip 2).
//
// Locks the reveal cutover: a fresh visitor (no param, no localStorage) gets the
// redesign, ?next=0 forces legacy AND STICKS across reloads, ?next=1 is a no-op on
// the default. Runs the REAL inline bootstrap extracted from index.html (not a
// re-implementation) so the shipped resolver is what's under test. Mirrors the
// ?scoring_v2=0 default-on lock in flags.test.js.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach } from "vitest";

// Extract the bootstrap IIFE (the <script> block that resolves data-next-design).
// Read from cwd (vitest runs at repo root); import.meta.url is not a file:// URL
// under the jsdom environment.
const html = readFileSync(path.resolve(process.cwd(), "index.html"), "utf8");
const bootstrap = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((m) => m[1])
  .find((body) => body.includes("data-next-design"));

if (!bootstrap) throw new Error("bootstrap script not found in index.html");

const runBootstrap = (search) => {
  window.history.replaceState({}, "", search || "/");
  document.documentElement.removeAttribute("data-next-design");

  new Function(bootstrap)();
  return document.documentElement.hasAttribute("data-next-design");
};

describe("NEXT_DESIGN bootstrap - default-on + ?next=0 kill switch", () => {
  beforeEach(() => localStorage.clear());

  it("defaults ON: a fresh visitor (no param, empty storage) gets the redesign", () => {
    expect(runBootstrap("/")).toBe(true);
  });

  it("?next=0 forces legacy AND persists (localStorage 'nextDesign' = '0')", () => {
    expect(runBootstrap("/?next=0")).toBe(false);
    expect(localStorage.getItem("nextDesign")).toBe("0");
  });

  it("?next=0 STICKS: a later bare reload stays legacy", () => {
    runBootstrap("/?next=0");
    expect(runBootstrap("/")).toBe(false);
  });

  it("?next=1 re-enables and sticks (a no-op on the default)", () => {
    expect(runBootstrap("/?next=1")).toBe(true);
    expect(localStorage.getItem("nextDesign")).toBe("1");
    expect(runBootstrap("/")).toBe(true);
  });

  it("?next=1 flips an opted-out browser back on", () => {
    runBootstrap("/?next=0");
    expect(runBootstrap("/?next=1")).toBe(true);
    expect(runBootstrap("/")).toBe(true);
  });

  it("legacy opt-out (old code left storage empty) now resolves ON", () => {
    // Pre-Flip-2 ?next=0 did removeItem, so opted-out browsers have no key.
    // The reveal must sweep them in.
    expect(localStorage.getItem("nextDesign")).toBe(null);
    expect(runBootstrap("/")).toBe(true);
  });
});
