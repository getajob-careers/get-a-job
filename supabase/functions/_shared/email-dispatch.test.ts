// Tests for the dispatch dry-run safety — the guard that makes "nothing sends to
// a real address" true by construction. A real send requires ALL THREE:
// dryRun===false AND EMAIL_SEND_ENABLED==="true" AND a non-internal recipient.
// Any missing condition logs to email_dry_run_log instead. If someone weakens
// this, these tests go red.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Resend wrapper so no real fetch happens and we can assert send calls.
const sendEmailMock = vi.fn(async () => ({ ok: true, id: "sent-1", status: 200 }));
vi.mock("./send-email.ts", () => ({ sendEmail: (...a: any[]) => sendEmailMock(...a) }));

// Stub Deno.env for the module under test (runs under node/vitest).
let envMap: Record<string, string> = {};
(globalThis as any).Deno = { env: { get: (k: string) => envMap[k] } };

import { dispatchEmail, isInternalEmail } from "./email-dispatch";

function mockSvc() {
  const insert = vi.fn(() => ({
    select: () => ({ single: async () => ({ data: { id: "log-1" }, error: null }) }),
  }));
  const from = vi.fn(() => ({ insert }));
  return { from, insert } as any;
}

const msg = (to = "user@example.com") => ({
  userId: "u1",
  emailType: "job_digest" as const,
  to,
  from: "from",
  subject: "s",
  text: "t",
  html: "h",
});

beforeEach(() => {
  sendEmailMock.mockClear();
  envMap = {};
});

describe("dispatchEmail — dry-run safety", () => {
  it("dryRun=true → logs to email_dry_run_log, never sends", async () => {
    const svc = mockSvc();
    const r = await dispatchEmail(svc, msg(), { dryRun: true });
    expect(r.dryRun).toBe(true);
    expect(r.sent).toBe(false);
    expect(svc.from).toHaveBeenCalledWith("email_dry_run_log");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("dryRun=false WITHOUT EMAIL_SEND_ENABLED → still does NOT send (the absolute rule)", async () => {
    const svc = mockSvc();
    const r = await dispatchEmail(svc, msg(), { dryRun: false });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(r.dryRun).toBe(true);
  });

  it("dryRun=false + EMAIL_SEND_ENABLED but INTERNAL recipient → does NOT send", async () => {
    envMap.EMAIL_SEND_ENABLED = "true";
    const svc = mockSvc();
    const r = await dispatchEmail(svc, msg("elienglard+demo@gmail.com"), { dryRun: false });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(r.dryRun).toBe(true);
  });

  it("ONLY dryRun=false + EMAIL_SEND_ENABLED=true + external recipient → sends", async () => {
    envMap.EMAIL_SEND_ENABLED = "true";
    const svc = mockSvc();
    const r = await dispatchEmail(svc, msg("real@company.com"), { dryRun: false });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(r.sent).toBe(true);
    expect(r.dryRun).toBe(false);
  });
});

describe("isInternalEmail", () => {
  it("flags internal / test addresses", () => {
    for (const e of [
      "elienglard@gmail.com",
      "x+demo@y.com",
      "a+test@b.com",
      "foo@getajob.careers",
      "isaacselig@x.com",
      "yishailieser@x.com",
    ])
      expect(isInternalEmail(e)).toBe(true);
  });
  it("passes external addresses", () => {
    for (const e of ["maya@company.com", "daniel.levi@startup.io"])
      expect(isInternalEmail(e)).toBe(false);
  });
});
