// QA2 P0 acceptance test. CV generation is now PROVIDER-OWNED and idempotent:
// a message.id generates AT MOST ONCE no matter how many times generation is
// triggered (double-click, or the dock + drawer panel both mounted over the same
// messages), and the result merges into the in-memory message so re-triggers /
// remounts don't re-fire. Guards symptoms A (double-fire) and B (regen-on-nav).
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const { calls } = vi.hoisted(() => ({ calls: [] }));

vi.mock("@/lib/coachActionHandlers", () => ({
  generateTailoredCVLinked: vi.fn(async (args) => {
    calls.push(args);
    return {
      ok: true,
      result: { cv_url: "https://x/cv.pdf", application_id: "a1" },
      linkedNewApp: false,
      unknownCompany: false,
    };
  }),
}));

const makeChain = () => {
  const c = {
    select: () => c,
    eq: () => c,
    is: () => c,
    or: () => c,
    in: () => c,
    ilike: () => c,
    neq: () => c,
    order: () => c,
    limit: () => c,
    insert: () => c,
    update: () => c,
    delete: () => c,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (r) => Promise.resolve({ data: [], error: null }).then(r),
  };
  return c;
};
vi.mock("@/api/supabaseClient", () => ({
  supabase: { from: () => makeChain() },
}));
vi.mock("@/api/invokeWithAuthRetry", () => ({ invokeWithAuthRetry: vi.fn() }));
vi.mock("@/lib/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));
vi.mock("@/lib/AgentDrawerContext", () => ({
  useAgentDrawer: () => ({ applicationId: null, pageContext: null }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/analytics", () => ({ track: vi.fn(), EVENTS: {} }));

import {
  CoachConversationProvider,
  useCoachConversation,
} from "@/lib/CoachConversationContext";

const VALID_APP_ID = "b698af3d-0000-4000-8000-000000000000";

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <CoachConversationProvider>{children}</CoachConversationProvider>
    </QueryClientProvider>
  );
}

// Flush the provider's async mount effects (load applications/messages) inside
// act so they don't log state-update-outside-act warnings.
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function renderProvider() {
  const rendered = renderHook(() => useCoachConversation(), { wrapper });
  await flush();
  return rendered;
}

describe("provider-owned CV generation — single-fire + result-merge (P0)", () => {
  it("fires generation ONCE per message.id even when triggered 3x (double-click / dual-mount)", async () => {
    calls.length = 0;
    const { result } = await renderProvider();
    act(() => {
      result.current.setMessages([
        {
          id: "m1",
          role: "assistant",
          suggestedCVGeneration: { target_role: "PM", application_id: VALID_APP_ID },
        },
      ]);
    });
    await act(async () => {
      await Promise.all([
        result.current.generateCvForMessage("m1"),
        result.current.generateCvForMessage("m1"),
        result.current.generateCvForMessage("m1"),
      ]);
    });
    expect(calls.length).toBe(1); // A: single owner, no double-fire
  });

  it("merges result into the in-memory message; a later trigger is a no-op (survives remount, no regen)", async () => {
    calls.length = 0;
    const { result } = await renderProvider();
    act(() => {
      result.current.setMessages([
        {
          id: "m2",
          role: "assistant",
          suggestedCVGeneration: { target_role: "PM", application_id: VALID_APP_ID },
        },
      ]);
    });
    await act(async () => {
      await result.current.generateCvForMessage("m2");
    });
    // B: result is now on the in-memory message (the durable done-state guard).
    await waitFor(() =>
      expect(
        result.current.messages[0].suggestedCVGeneration.result?.cv_url,
      ).toBe("https://x/cv.pdf"),
    );
    // A later trigger (e.g. a stray click after nav) does NOT re-generate.
    await act(async () => {
      await result.current.generateCvForMessage("m2");
    });
    expect(calls.length).toBe(1);
  });

  it("no generation happens without an explicit trigger (click-gated, no fire-on-mount)", async () => {
    calls.length = 0;
    const { result } = await renderProvider();
    act(() => {
      result.current.setMessages([
        {
          id: "m3",
          role: "assistant",
          suggestedCVGeneration: { target_role: "PM" },
        },
      ]);
    });
    // Merely having the proposal on a message fires nothing (C: no acceptance → no gen).
    await flush();
    expect(calls.length).toBe(0);
  });
});

describe("verbal accept + app-resolution + acceptance-survives-ask-flow (a / fork-2)", () => {
  it("accepted:true auto-fires generation once (verbal yes, no button click)", async () => {
    calls.length = 0;
    const { result } = await renderProvider();
    act(() => {
      result.current.setMessages([
        {
          id: "acc1",
          role: "assistant",
          suggestedCVGeneration: {
            target_role: "PM",
            accepted: true,
            application_id: VALID_APP_ID,
          },
        },
      ]);
    });
    await flush();
    expect(calls.length).toBe(1); // fired from the verbal acceptance, no click
  });

  it("a proposal WITHOUT accepted fires nothing (offer waits for the click)", async () => {
    calls.length = 0;
    const { result } = await renderProvider();
    act(() => {
      result.current.setMessages([
        {
          id: "off1",
          role: "assistant",
          suggestedCVGeneration: {
            target_role: "PM",
            application_id: VALID_APP_ID,
          },
        },
      ]);
    });
    await flush();
    expect(calls.length).toBe(0);
  });

  it("Generate with a known company creates+links (no orphan, no Unknown)", async () => {
    calls.length = 0;
    const { result } = await renderProvider();
    act(() => {
      result.current.setMessages([
        {
          id: "co1",
          role: "assistant",
          suggestedCVGeneration: {
            target_role: "Support",
            job_description: "JD",
          },
          suggestedApplicationActions: [
            {
              action: "add_application",
              company: "Copperfield Coffee",
              role_title: "Support",
            },
          ],
        },
      ]);
    });
    await act(async () => {
      await result.current.generateCvForMessage("co1");
    });
    expect(calls.length).toBe(1);
    // the real company's add_application was passed downstream to create+link
    expect(calls[0].appActions?.[0]?.company).toBe("Copperfield Coffee");
  });

  it("accepted + needsCompany + company-answer → exactly ONE generation, correctly linked (survives ask-flow)", async () => {
    calls.length = 0;
    const { result } = await renderProvider();
    // Turn 1: verbal yes, but no company and no linked app → parked, no generation.
    act(() => {
      result.current.setMessages([
        {
          id: "A",
          role: "assistant",
          suggestedCVGeneration: {
            target_role: "Support",
            accepted: true,
            job_description: "JD",
          },
        },
      ]);
    });
    await flush();
    expect(calls.length).toBe(0); // parked on the missing company — NOT orphaned

    // Later turn: the ask-flow yields a REAL company → the parked acceptance resumes.
    act(() => {
      result.current.setMessages([
        {
          id: "A",
          role: "assistant",
          suggestedCVGeneration: {
            target_role: "Support",
            accepted: true,
            job_description: "JD",
          },
        },
        {
          id: "D",
          role: "assistant",
          suggestedApplicationActions: [
            {
              action: "add_application",
              company: "Copperfield Coffee",
              role_title: "Support",
            },
          ],
        },
      ]);
    });
    await flush();
    expect(calls.length).toBe(1); // resumed from the ORIGINAL acceptance — one gen
    expect(calls[0].appActions?.[0]?.company).toBe("Copperfield Coffee"); // linked to the real company
    // result merged onto the original message
    await waitFor(() =>
      expect(
        result.current.messages[0].suggestedCVGeneration.result?.cv_url,
      ).toBe("https://x/cv.pdf"),
    );
  });
});
