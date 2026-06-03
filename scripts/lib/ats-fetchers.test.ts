// Unit tests for the per-job description detail fetchers added by the
// workday-detail-fetch PR (2026-06-03). Locks two contracts:
//   1. URL construction matches the public CXS / SR detail endpoints
//      exactly — getting these wrong silently regresses ~15% of the
//      active IL corpus to null descriptions.
//   2. Network / HTTP failures degrade silently to `null` — a hanging
//      tenant must NOT propagate up and break the ingest path. The
//      brief explicitly required an AbortController-backed timeout
//      and try/catch envelope; tests assert the contract from the
//      caller's perspective.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWorkdayDetail, fetchSmartRecruitersDetail } from "./ats-fetchers.ts";

const realFetch = globalThis.fetch;

function mockFetchOnce(impl: (url: string) => Promise<Response> | Response) {
  globalThis.fetch = vi.fn().mockImplementation((url: any) =>
    Promise.resolve(impl(typeof url === "string" ? url : String(url))),
  ) as any;
}

beforeEach(() => {
  // Reset every test so concurrent mocks don't leak.
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("fetchWorkdayDetail — URL construction", () => {
  it("builds the canonical CXS detail URL from slug + externalPath", async () => {
    let capturedUrl = "";
    mockFetchOnce((url) => {
      capturedUrl = url;
      return new Response(
        JSON.stringify({ jobPostingInfo: { jobDescription: "<p>hello</p>" } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const html = await fetchWorkdayDetail(
      "nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite",
      "/job/Israel/Software-Engineer_JR123",
    );

    // externalPath already starts with /job/... (Workday returns it that
    // way in the list payload), so the helper just concatenates host +
    // /wday/cxs/{tenant}/{site} + externalPath — no extra /job prefix.
    // Probed 2026-06-03 against a real NVIDIA posting: this exact shape
    // returns HTTP 200 + jobPostingInfo; prepending an extra /job
    // segment (the pre-hotfix shape) returned 406 on every tenant.
    expect(capturedUrl).toBe(
      "https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/job/Israel/Software-Engineer_JR123",
    );
    expect(html).toBe("<p>hello</p>");
  });

  it("tolerates externalPath without a leading slash", async () => {
    let capturedUrl = "";
    mockFetchOnce((url) => {
      capturedUrl = url;
      return new Response(JSON.stringify({ jobPostingInfo: { jobDescription: "x" } }), { status: 200 });
    });

    await fetchWorkdayDetail("tenant.wd1.myworkdayjobs.com/Careers", "job/foo");

    // Helper prepends the leading slash so Workday accepts it.
    expect(capturedUrl).toBe("https://tenant.wd1.myworkdayjobs.com/wday/cxs/tenant/Careers/job/foo");
  });

  it("falls back to `description` field when `jobDescription` is missing", async () => {
    mockFetchOnce(() => new Response(
      JSON.stringify({ jobPostingInfo: { description: "<p>via description field</p>" } }),
      { status: 200 },
    ));
    const html = await fetchWorkdayDetail("t.wd1.myworkdayjobs.com/site", "/job/x");
    expect(html).toBe("<p>via description field</p>");
  });

  it("returns null for malformed slug (no host/site separator)", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as any;
    const html = await fetchWorkdayDetail("just-a-host-no-slash", "/job/x");
    expect(html).toBeNull();
    expect(spy).not.toHaveBeenCalled();   // no network call attempted
  });

  it("returns null when externalPath is empty", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as any;
    const html = await fetchWorkdayDetail("t.wd1.myworkdayjobs.com/site", "");
    expect(html).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("fetchSmartRecruitersDetail — URL construction", () => {
  it("builds the v1 postings detail URL", async () => {
    let capturedUrl = "";
    mockFetchOnce((url) => {
      capturedUrl = url;
      return new Response(
        JSON.stringify({ jobAd: { sections: { jobDescription: { text: "SR body" } } } }),
        { status: 200 },
      );
    });

    const html = await fetchSmartRecruitersDetail("AcmeCo", "abc-123");

    expect(capturedUrl).toBe(
      "https://api.smartrecruiters.com/v1/companies/AcmeCo/postings/abc-123",
    );
    expect(html).toBe("SR body");
  });

  it("returns null when the nested jobDescription.text is missing", async () => {
    mockFetchOnce(() => new Response(
      JSON.stringify({ jobAd: { sections: {} } }),
      { status: 200 },
    ));
    const html = await fetchSmartRecruitersDetail("AcmeCo", "id-1");
    expect(html).toBeNull();
  });
});

describe("detail fetchers — silent degradation contract", () => {
  it("fetchWorkdayDetail returns null when fetch throws (network error)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as any;
    const html = await fetchWorkdayDetail("t.wd1.myworkdayjobs.com/site", "/job/x");
    expect(html).toBeNull();
  });

  it("fetchWorkdayDetail returns null on non-200 HTTP", async () => {
    mockFetchOnce(() => new Response("Not Found", { status: 404 }));
    const html = await fetchWorkdayDetail("t.wd1.myworkdayjobs.com/site", "/job/x");
    expect(html).toBeNull();
  });

  it("fetchWorkdayDetail returns null when the upstream returns invalid JSON", async () => {
    mockFetchOnce(() => new Response("not json{", { status: 200 }));
    const html = await fetchWorkdayDetail("t.wd1.myworkdayjobs.com/site", "/job/x");
    expect(html).toBeNull();
  });

  it("fetchWorkdayDetail returns null when the fetch is aborted (timeout)", async () => {
    // Simulate an AbortController-triggered abort the same way the
    // 8s detail timeout would surface inside httpGetJson.
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const err = new Error("The operation was aborted");
      (err as any).name = "AbortError";
      throw err;
    }) as any;
    const html = await fetchWorkdayDetail("t.wd1.myworkdayjobs.com/site", "/job/x");
    expect(html).toBeNull();
  });

  it("fetchSmartRecruitersDetail returns null on fetch throw", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as any;
    const html = await fetchSmartRecruitersDetail("AcmeCo", "id-1");
    expect(html).toBeNull();
  });
});
