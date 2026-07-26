// feedbackStore wiring: the flag-on avatar "Send feedback" item and the flag-off
// pill both open the same dialog by calling openFeedback(); FeedbackWidget reads
// the state via useFeedbackOpen(). This locks the store contract that decouples
// the trigger from the dialog.
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  openFeedback,
  closeFeedback,
  useFeedbackOpen,
} from "@/lib/feedbackStore";

afterEach(() => {
  // Reset shared module state between tests.
  act(() => closeFeedback());
});

describe("feedbackStore", () => {
  it("starts closed", () => {
    const { result } = renderHook(() => useFeedbackOpen());
    expect(result.current).toBe(false);
  });

  it("openFeedback opens and subscribers observe it", () => {
    const { result } = renderHook(() => useFeedbackOpen());
    act(() => openFeedback());
    expect(result.current).toBe(true);
  });

  it("closeFeedback closes again", () => {
    const { result } = renderHook(() => useFeedbackOpen());
    act(() => openFeedback());
    expect(result.current).toBe(true);
    act(() => closeFeedback());
    expect(result.current).toBe(false);
  });

  it("openFeedback is idempotent (stays open, single source of truth)", () => {
    const { result } = renderHook(() => useFeedbackOpen());
    act(() => {
      openFeedback();
      openFeedback();
    });
    expect(result.current).toBe(true);
  });
});
