// "Never silence" launch-gate: a single coach turn can carry any combination of
// action blocks (tasks + roadmap + application + company-target + CV). The dock's
// SuggestionRow previously EARLY-RETURNED on the first matching kind, silently
// swallowing the rest — so a tasks+app+CV turn showed only the tasks card and
// the generated CV was unreachable. This asserts the structural guarantee:
// N action blocks in a turn => N rendered cards.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Auto-fire + apply handlers are network — stub the whole module. The CV in the
// fixtures below is already "done" (has result.cv_url) so the auto-fire effect
// no-ops, but stubbing keeps the render pure regardless.
vi.mock("@/lib/coachActionHandlers", () => ({
  applyAllTaskSuggestions: vi.fn(),
  applyRoadmapChanges: vi.fn(),
  applyApplicationActions: vi.fn(),
  applyCompanyTargetActions: vi.fn(),
  generateTailoredCV: vi.fn(),
  generateTailoredCVLinked: vi.fn(async () => ({ ok: true, result: {} })),
  extractBullets: vi.fn(),
  appendBullets: vi.fn(),
  restoreBullets: vi.fn(),
  applyAddSkillToExperience: vi.fn(),
}));
vi.mock("@/lib/downloadFile", () => ({
  triggerBlobDownload: vi.fn(),
  cvFilename: () => "cv.pdf",
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SuggestionRow } from "@/components/agent/CoachThread";

const conv = {
  appliedSets: {
    tasks: {},
    roadmap: {},
    applications: {},
    companyTargets: {},
    cvGeneration: {},
  },
  markApplied: vi.fn(),
};

function renderRow(message) {
  // SuggestionRow now polls cv_generation_progress via react-query (the honest
  // CV ring), so it needs a QueryClient in context like the real app.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SuggestionRow
          message={message}
          conv={conv}
          user={{ id: "u1" }}
          queryClient={{ invalidateQueries: vi.fn() }}
          profileSkills={[]}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// A "done" CV so the auto-fire effect doesn't run during the render.
const doneCv = {
  target_role: "Support Specialist",
  result: { cv_url: "https://x/cv.pdf", application_id: "app-1" },
};

describe("SuggestionRow — renders EVERY action block a turn carries", () => {
  it("the exact reported bug: tasks + application + CV → all THREE cards render", () => {
    renderRow({
      id: "m1",
      role: "assistant",
      suggestedTasks: [{ title: "t" }],
      suggestedApplicationActions: [
        { action: "add_application", company: "X", role_title: "R" },
      ],
      suggestedCVGeneration: doneCv,
    });
    expect(screen.getByText("Tasks proposed")).toBeInTheDocument();
    expect(
      screen.getByText("Application updates proposed"),
    ).toBeInTheDocument();
    expect(screen.getByText("CV generation proposed")).toBeInTheDocument();
  });

  it("all FIVE action types in one turn → five cards (no swallow, any order)", () => {
    renderRow({
      id: "m2",
      role: "assistant",
      suggestedTasks: [{ title: "t" }],
      suggestedRoadmapChanges: [{ title: "r" }],
      suggestedApplicationActions: [
        { action: "add_application", company: "X", role_title: "R" },
      ],
      suggestedCompanyTargetActions: [
        { action: "add_company_target", company: "Y" },
      ],
      suggestedCVGeneration: doneCv,
    });
    for (const label of [
      "Tasks proposed",
      "Roadmap changes proposed",
      "Application updates proposed",
      "Internship updates proposed",
      "CV generation proposed",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("a single-kind turn still renders exactly its one card", () => {
    renderRow({
      id: "m3",
      role: "assistant",
      suggestedTasks: [{ title: "t" }],
    });
    expect(screen.getByText("Tasks proposed")).toBeInTheDocument();
    expect(
      screen.queryByText("CV generation proposed"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Application updates proposed"),
    ).not.toBeInTheDocument();
  });
});
