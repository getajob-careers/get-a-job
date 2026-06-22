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
import {
  fetchWorkdayDetail,
  fetchSmartRecruitersDetail,
  fetchAmazonJobs,
  mapBezeqJobs,
} from "./ats-fetchers.ts";
import type { CompanyEntry } from "./normalize.ts";

const realFetch = globalThis.fetch;

function mockFetchOnce(impl: (url: string) => Promise<Response> | Response) {
  globalThis.fetch = vi
    .fn()
    .mockImplementation((url: any) =>
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
      return new Response(
        JSON.stringify({ jobPostingInfo: { jobDescription: "x" } }),
        { status: 200 },
      );
    });

    await fetchWorkdayDetail("tenant.wd1.myworkdayjobs.com/Careers", "job/foo");

    // Helper prepends the leading slash so Workday accepts it.
    expect(capturedUrl).toBe(
      "https://tenant.wd1.myworkdayjobs.com/wday/cxs/tenant/Careers/job/foo",
    );
  });

  it("falls back to `description` field when `jobDescription` is missing", async () => {
    mockFetchOnce(
      () =>
        new Response(
          JSON.stringify({
            jobPostingInfo: { description: "<p>via description field</p>" },
          }),
          { status: 200 },
        ),
    );
    const html = await fetchWorkdayDetail(
      "t.wd1.myworkdayjobs.com/site",
      "/job/x",
    );
    expect(html).toBe("<p>via description field</p>");
  });

  it("returns null for malformed slug (no host/site separator)", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as any;
    const html = await fetchWorkdayDetail("just-a-host-no-slash", "/job/x");
    expect(html).toBeNull();
    expect(spy).not.toHaveBeenCalled(); // no network call attempted
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
        JSON.stringify({
          jobAd: { sections: { jobDescription: { text: "SR body" } } },
        }),
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
    mockFetchOnce(
      () =>
        new Response(JSON.stringify({ jobAd: { sections: {} } }), {
          status: 200,
        }),
    );
    const html = await fetchSmartRecruitersDetail("AcmeCo", "id-1");
    expect(html).toBeNull();
  });
});

describe("detail fetchers — silent degradation contract", () => {
  it("fetchWorkdayDetail returns null when fetch throws (network error)", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError("fetch failed")) as any;
    const html = await fetchWorkdayDetail(
      "t.wd1.myworkdayjobs.com/site",
      "/job/x",
    );
    expect(html).toBeNull();
  });

  it("fetchWorkdayDetail returns null on non-200 HTTP", async () => {
    mockFetchOnce(() => new Response("Not Found", { status: 404 }));
    const html = await fetchWorkdayDetail(
      "t.wd1.myworkdayjobs.com/site",
      "/job/x",
    );
    expect(html).toBeNull();
  });

  it("fetchWorkdayDetail returns null when the upstream returns invalid JSON", async () => {
    mockFetchOnce(() => new Response("not json{", { status: 200 }));
    const html = await fetchWorkdayDetail(
      "t.wd1.myworkdayjobs.com/site",
      "/job/x",
    );
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
    const html = await fetchWorkdayDetail(
      "t.wd1.myworkdayjobs.com/site",
      "/job/x",
    );
    expect(html).toBeNull();
  });

  it("fetchSmartRecruitersDetail returns null on fetch throw", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError("fetch failed")) as any;
    const html = await fetchSmartRecruitersDetail("AcmeCo", "id-1");
    expect(html).toBeNull();
  });
});

// ───── fetchAmazonJobs — M1 step (b), Amazon.jobs search.json ────────
//
// Pins three contracts the live amazon.jobs surface depends on:
//   1. URL construction matches the public endpoint (search.json with
//      country, result_limit, offset). The hardcoded ?country=ISR shape
//      was the actual probe URL that returned 143 IL hits 2026-06-12.
//   2. The fetcher pages via offset until hits is exhausted (full IL
//      surface, not just the first 10 / 100 result_limit).
//   3. structured_country='IL' on every row — short-circuits the
//      downstream classifier. The search filter guarantees Israel; the
//      hardcoded country tag is the contract.

const amazonEntry: CompanyEntry = {
  name: "Amazon",
  type: "international_il_rd",
  industry: "Cloud/E-commerce",
  domain: "amazon.com",
  careers_url: "https://www.amazon.jobs/en/",
  ats: "amazon_jobs",
  slug: "ISR",
  api_url: "https://www.amazon.jobs/en/search.json",
  verified: true,
  notes: null,
};

function makeJob(
  id: string,
  title: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id_icims: id,
    title,
    job_path: `/en/jobs/${id}/${title.toLowerCase().replace(/\s+/g, "-")}`,
    location: "IL, Haifa",
    normalized_location: "Haifa, Israel",
    posted_date: "2026-06-01",
    description: "<p>Build the thing.</p>",
    description_short: "Build the thing.",
    basic_qualifications: "<p>5+ years of building things.</p>",
    preferred_qualifications: "<p>Bonus: things.</p>",
    country_code: "ISR",
    city: "Haifa",
    state: "Haifa District",
    is_intern: false,
    is_manager: false,
    university_job: false,
    team: { label: "AWS Israel" },
    business_category: "Software Development",
    ...overrides,
  };
}

describe("fetchAmazonJobs — URL construction + IL filter", () => {
  it("constructs the canonical search.json URL with country=ISR + result_limit=100 + offset=0", async () => {
    let capturedUrl = "";
    globalThis.fetch = vi.fn().mockImplementation((url: any) => {
      capturedUrl = String(url);
      return Promise.resolve(
        new Response(JSON.stringify({ hits: 0, jobs: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }) as any;

    await fetchAmazonJobs(amazonEntry);

    expect(capturedUrl).toBe(
      "https://www.amazon.jobs/en/search.json?country=ISR&result_limit=100&offset=0",
    );
  });

  it("returns [] when api_url or slug is missing (misconfigured registry row)", async () => {
    expect(await fetchAmazonJobs({ ...amazonEntry, api_url: null })).toEqual(
      [],
    );
    expect(await fetchAmazonJobs({ ...amazonEntry, slug: null })).toEqual([]);
  });
});

describe("fetchAmazonJobs — RawJob mapping", () => {
  it("maps id_icims → external_id, builds apply_url from api_url host + job_path, marks structured_country='IL'", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          hits: 1,
          jobs: [
            makeJob("3001234", "Senior Software Engineer, AWS ElastiCache", {
              job_path:
                "/en/jobs/3001234/senior-software-engineer-aws-elasticache",
            }),
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as any;

    const rows = await fetchAmazonJobs(amazonEntry);

    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.external_id).toBe("3001234");
    expect(r.title).toBe("Senior Software Engineer, AWS ElastiCache");
    expect(r.apply_url).toBe(
      "https://www.amazon.jobs/en/jobs/3001234/senior-software-engineer-aws-elasticache",
    );
    // Every Amazon row is Israel-only by construction — pre-set so the
    // downstream classifier doesn't need to introspect location strings.
    expect(r.structured_country).toBe("IL");
    expect(r.location_raw).toBe("Haifa, Israel");
    expect(r.date_posted).toBe("2026-06-01");
  });

  it("falls back to id when id_icims is missing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          hits: 1,
          jobs: [
            {
              ...makeJob("ignored", "T"),
              id_icims: undefined,
              id: "fallback-id-99",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as any;
    const rows = await fetchAmazonJobs(amazonEntry);
    expect(rows[0].external_id).toBe("fallback-id-99");
  });

  it("concatenates description_short + description + basic_qualifications + preferred_qualifications into description_html", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ hits: 1, jobs: [makeJob("1", "T")] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as any;
    const rows = await fetchAmazonJobs(amazonEntry);
    const desc = rows[0].description_html!;
    expect(desc).toContain("Build the thing.");
    expect(desc).toContain("<p>5+ years of building things.</p>");
    expect(desc).toContain("Basic Qualifications");
    expect(desc).toContain("Preferred Qualifications");
  });

  it("captures is_intern + is_manager + university_job in raw_payload (signal for downstream entry-level metrics)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          hits: 1,
          jobs: [
            makeJob("X", "Intern", { is_intern: true, university_job: true }),
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as any;
    const rows = await fetchAmazonJobs(amazonEntry);
    expect((rows[0].raw_payload as any).is_intern).toBe(true);
    expect((rows[0].raw_payload as any).university_job).toBe(true);
  });
});

describe("fetchAmazonJobs — pagination", () => {
  it("pages by offset until offset >= hits", async () => {
    const allJobs = Array.from({ length: 143 }, (_, i) =>
      makeJob(String(10000 + i), `Job ${i}`, {
        job_path: `/en/jobs/${10000 + i}/job-${i}`,
      }),
    );
    let callCount = 0;
    const seenUrls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: any) => {
      seenUrls.push(String(url));
      callCount++;
      const u = new URL(String(url));
      const offset = Number(u.searchParams.get("offset") ?? "0");
      const limit = Number(u.searchParams.get("result_limit") ?? "100");
      return Promise.resolve(
        new Response(
          JSON.stringify({
            hits: 143,
            jobs: allJobs.slice(offset, offset + limit),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }) as any;

    const rows = await fetchAmazonJobs(amazonEntry);

    // 143 / 100 = 2 pages (page 1: 0..99 → 100 jobs; page 2: 100..142 → 43 jobs).
    expect(callCount).toBe(2);
    expect(seenUrls[0]).toContain("offset=0");
    expect(seenUrls[1]).toContain("offset=100");
    expect(rows).toHaveLength(143);
  });

  it("dedupes by external_id across pages so a server-side duplicate doesn't double-count", async () => {
    let call = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      call++;
      const payload =
        call === 1
          ? { hits: 200, jobs: [makeJob("A", "First"), makeJob("B", "Second")] }
          : {
              hits: 200,
              jobs: [makeJob("B", "Second-dup"), makeJob("C", "Third")],
            };
      return Promise.resolve(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }) as any;
    const rows = await fetchAmazonJobs(amazonEntry);
    const ids = rows.map((r) => r.external_id);
    expect(ids.sort()).toEqual(["A", "B", "C"]);
  });
});

// mapBezeqJobs is the pure schema mapper for the Bezeq per-publisher JSON
// endpoint. These lock the non-obvious field mapping (title in `description`,
// body in `notes`, numeric requirement codes that must NOT become the
// description) and the IL + Hebrew + apply-URL contract.
describe("mapBezeqJobs — Bezeq per-publisher schema mapping", () => {
  const rec = {
    order_id: 2913,
    description: "מנהל.ת מכירות שטח",
    notes: "<p>תיאור התפקיד</p>",
    notes_text: "תיאור התפקיד plain",
    living_area1: "",
    living_area2: "גוש דן",
    profession_name: "משרות מטה",
    requirement1: 0,
    requirement2: 0,
    orderDate: "2026-06-04T00:00:00",
    update_date: "2026-06-22T11:04:57",
    close_date: "1900-01-01T00:00:00",
  };

  it("maps title from description, body from notes, id from order_id", () => {
    const [j] = mapBezeqJobs([rec]);
    expect(j.external_id).toBe("2913");
    expect(j.title).toBe("מנהל.ת מכירות שטח");
    expect(j.description_html).toBe("<p>תיאור התפקיד</p>");
  });

  it("tags every row IL + Hebrew and builds the apply URL from order_id", () => {
    const [j] = mapBezeqJobs([rec]);
    expect(j.structured_country).toBe("IL");
    expect((j.raw_payload as any).jd_language).toBe("he");
    expect(j.apply_url).toBe("https://www.bezeq.co.il/career_new/?jobId=2913");
  });

  it("keeps numeric requirement codes in raw_payload, not in the description", () => {
    const [j] = mapBezeqJobs([rec]);
    expect((j.raw_payload as any).requirement1).toBe(0);
    expect((j.raw_payload as any).requirement2).toBe(0);
    expect(j.description_html).toBe("<p>תיאור התפקיד</p>");
  });

  it("picks the first non-empty living_area for location", () => {
    const [j] = mapBezeqJobs([rec]);
    expect(j.location_raw).toBe("גוש דן");
  });

  it("treats the 1900-01-01 placeholder as no date and parses orderDate", () => {
    const [j] = mapBezeqJobs([rec]);
    expect(j.date_posted).not.toBeNull();
    expect(new Date(j.date_posted as string).getUTCFullYear()).toBe(2026);
    expect((j.raw_payload as any).close_date).toBe("1900-01-01T00:00:00");
  });

  it("falls back to notes_text when notes is absent, and skips records with no order_id", () => {
    const [j] = mapBezeqJobs([{ ...rec, notes: null }]);
    expect(j.description_html).toBe("תיאור התפקיד plain");
    expect(mapBezeqJobs([{ description: "x" } as any])).toHaveLength(0);
  });
});
