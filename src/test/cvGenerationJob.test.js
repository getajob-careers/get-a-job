// cvGenerationJob store: the single in-flight "Generate CV" run shared across the
// JobGridCard and the JobDetailModal. These lock the supersede guards - a slow
// finished or failed run must NOT clobber, or report over, a newer run the user has
// since started on a different job (the QA finding behind the ready-toast and
// error-toast gating in useJobCardActions).
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  startCvGeneration,
  markCvGenerationReady,
  markCvGenerationError,
  clearCvGeneration,
  jobKeyOf,
  useCvGenerationJob,
} from "@/lib/cvGenerationJob";

afterEach(() => {
  // Reset shared module state between tests (unconditional clear).
  act(() => clearCvGeneration());
});

const A = "greenhouse::job-a";
const B = "lever::job-b";

describe("cvGenerationJob store", () => {
  it("jobKeyOf builds a stable (ats_source, external_id) key, title fallback otherwise", () => {
    expect(jobKeyOf({ ats_source: "greenhouse", external_id: "42" })).toBe(
      "greenhouse::42",
    );
    expect(jobKeyOf({ title: "  Data Analyst " })).toBe("title::data analyst");
    expect(jobKeyOf(null)).toBe("");
  });

  it("markCvGenerationReady returns false and leaves state untouched when a newer run superseded it", () => {
    const { result } = renderHook(() => useCvGenerationJob());
    act(() => startCvGeneration(A));
    act(() => startCvGeneration(B)); // user starts run B; A is superseded
    let applied;
    act(() => {
      applied = markCvGenerationReady(A, "app-a");
    });
    expect(applied).toBe(false);
    // B's running state is intact - A's late "ready" did not clobber it.
    expect(result.current).toEqual({
      jobKey: B,
      applicationId: null,
      status: "running",
    });
  });

  it("markCvGenerationError returns false and is a no-op when a newer run superseded it", () => {
    const { result } = renderHook(() => useCvGenerationJob());
    act(() => startCvGeneration(A));
    act(() => startCvGeneration(B));
    let applied;
    act(() => {
      applied = markCvGenerationError(A);
    });
    expect(applied).toBe(false);
    expect(result.current).toEqual({
      jobKey: B,
      applicationId: null,
      status: "running",
    });
  });

  it("markCvGenerationError returns true and sets error when this run is still active", () => {
    const { result } = renderHook(() => useCvGenerationJob());
    act(() => startCvGeneration(A));
    let applied;
    act(() => {
      applied = markCvGenerationError(A);
    });
    expect(applied).toBe(true);
    expect(result.current.jobKey).toBe(A);
    expect(result.current.status).toBe("error");
  });

  it("clearCvGeneration(jobKey) only clears a matching run", () => {
    const { result } = renderHook(() => useCvGenerationJob());
    act(() => startCvGeneration(A));
    // Non-matching clear is ignored.
    act(() => clearCvGeneration(B));
    expect(result.current.jobKey).toBe(A);
    expect(result.current.status).toBe("running");
    // Matching clear resets the store.
    act(() => clearCvGeneration(A));
    expect(result.current).toEqual({
      jobKey: null,
      applicationId: null,
      status: null,
    });
  });
});
