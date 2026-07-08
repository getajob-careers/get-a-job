// CV Excellence Arc P0 — locks the cv_generated observability schema.
// The client is the ONLY observer of a platform-level generation failure
// (the edge function never runs, so it cannot write its own metrics row), so
// this event is the complete generation-attempt ledger. These assertions
// guard the contract every entry path (coach/studio/tracker) emits through.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let captured;
vi.mock("posthog-js", () => ({
  default: {
    capture: (event, props) => captured.push({ event, props }),
    captureException: () => {},
  },
}));

import { trackCvGenerated } from "@/lib/analytics";

beforeEach(() => {
  captured = [];
});
afterEach(() => vi.clearAllMocks());

describe("trackCvGenerated", () => {
  it("emits cv_generated with success + source and defaults unsourced to 0", () => {
    trackCvGenerated({ success: true, source: "studio" });
    expect(captured).toHaveLength(1);
    expect(captured[0].event).toBe("cv_generated");
    expect(captured[0].props).toMatchObject({
      success: true,
      source: "studio",
      application_id: null,
      unsourced_bullets_count: 0,
    });
    // success rows never carry a failure_reason
    expect(captured[0].props.failure_reason).toBeUndefined();
  });

  it("on failure always carries a failure_reason (never silently dropped) and no unsourced count", () => {
    trackCvGenerated({
      success: false,
      source: "tracker",
      application_id: "app-1",
    });
    expect(captured[0].props.success).toBe(false);
    expect(captured[0].props.failure_reason).toBe("unknown"); // defaulted, never absent
    expect(captured[0].props.unsourced_bullets_count).toBeUndefined();
  });

  it("passes through model/role/duration/unsourced when provided", () => {
    trackCvGenerated({
      success: true,
      source: "chat",
      model: "sonnet",
      application_id: "app-2",
      role_title: "AI Specialist",
      duration_ms: 4321,
      unsourced_bullets_count: 3,
    });
    expect(captured[0].props).toMatchObject({
      source: "chat",
      model: "sonnet",
      application_id: "app-2",
      role_title: "AI Specialist",
      duration_ms: 4321,
      unsourced_bullets_count: 3,
    });
  });
});
