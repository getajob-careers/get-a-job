// Guards the Career -> MatchedRolesPanel extraction (item 9). The panel is
// flag-agnostic (no isNextDesign branch), so "byte-identical both flag states"
// reduces to: size="compact" must emit the SAME class tokens the original
// inline Career block emitted (the strings below are copied from
// Career.jsx@c5397c0, pre-extraction), and the shared sort / active-id helpers
// must reproduce Career's ordering. size="comfortable" must diverge (density).

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MatchedRolesPanel, {
  sortMatchedRoles,
  resolveActiveRoleId,
} from "@/components/career/MatchedRolesPanel";

const ROLES = [
  {
    id: "r_detour",
    track: "track_2",
    title: "Support Lead",
    readiness_score: 0.91,
    match_score: 0.91,
    goal_alignment_score: 0.3,
    matched_skills: ["crm"],
    missing_skills: [],
  },
  {
    id: "r_sweet",
    track: "track_1",
    title: "Product Analyst",
    readiness_score: 0.82,
    match_score: 0.82,
    goal_alignment_score: 0.6,
    matched_skills: ["excel", "sql"],
    missing_skills: ["python"],
  },
  {
    id: "r_growth",
    track: "track_3",
    title: "Data PM",
    readiness_score: 0.5,
    match_score: 0.5,
    goal_alignment_score: 0.9,
    matched_skills: [],
    missing_skills: [],
  },
];

function renderPanel(props = {}) {
  const sorted = sortMatchedRoles(ROLES);
  return render(
    <MemoryRouter>
      <MatchedRolesPanel
        roles={sorted}
        goalName="Product Lead"
        expandedId={resolveActiveRoleId(sorted, props.expandedRoleId ?? null)}
        onToggle={() => {}}
        size="compact"
        className="w-full md:flex-1 min-w-0"
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("sortMatchedRoles", () => {
  it("orders tier-first (sweet spot, growth, detour) then match_score DESC", () => {
    const ids = sortMatchedRoles(ROLES).map((r) => r.id);
    expect(ids).toEqual(["r_sweet", "r_growth", "r_detour"]);
  });

  it("does not mutate the input array", () => {
    const input = [...ROLES];
    sortMatchedRoles(input);
    expect(input.map((r) => r.id)).toEqual(ROLES.map((r) => r.id));
  });

  it("sorts unknown tracks last", () => {
    const withUnknown = [
      { id: "x", track: "track_9", match_score: 1 },
      ...ROLES,
    ];
    expect(sortMatchedRoles(withUnknown).at(-1).id).toBe("x");
  });
});

describe("resolveActiveRoleId", () => {
  const sorted = sortMatchedRoles(ROLES);
  it("defaults to the top sorted role when nothing is expanded", () => {
    expect(resolveActiveRoleId(sorted, null)).toBe("r_sweet");
  });
  it("respects a valid expanded id", () => {
    expect(resolveActiveRoleId(sorted, "r_growth")).toBe("r_growth");
  });
  it("falls back to the top role for a closed-<id> sentinel", () => {
    expect(resolveActiveRoleId(sorted, "closed-r_sweet")).toBe("r_sweet");
  });
  it("returns null for an empty list", () => {
    expect(resolveActiveRoleId([], null)).toBeNull();
  });
});

describe("MatchedRolesPanel compact = original Career classes (byte-identity)", () => {
  it("root carries the original panel-box tokens", () => {
    const { container } = renderPanel();
    const root = container.firstChild;
    // Original: w-full md:flex-1 min-w-0 bg-rd-bg-page border
    // border-rd-border-subtle rounded-[16px] p-3.5 md:self-start
    [
      "w-full",
      "md:flex-1",
      "min-w-0",
      "bg-rd-bg-page",
      "border",
      "border-rd-border-subtle",
      "rounded-[16px]",
      "p-3.5",
      "md:self-start",
    ].forEach((t) => expect(root).toHaveClass(t));
  });

  it("title, description and role-title carry the original type tokens", () => {
    renderPanel();
    expect(screen.getByText("Your matched roles")).toHaveClass(
      "font-display",
      "font-bold",
      "text-[14px]",
      "text-rd-text",
    );
    // Sweet-spot role is expanded by default and shows its title at 12.5px.
    expect(screen.getByText("Product Analyst")).toHaveClass(
      "flex-1",
      "min-w-0",
      "font-display",
      "font-bold",
      "text-[12.5px]",
      "leading-[1.25]",
      "text-rd-text",
    );
  });

  it("track chip carries the original chip + band tokens", () => {
    renderPanel();
    expect(screen.getByText("Sweet spot")).toHaveClass(
      "font-display",
      "font-semibold",
      "text-[10px]",
      "rounded-full",
      "px-2",
      "py-0.5",
      "bg-rd-primary-tint",
      "text-rd-primary-dark",
    );
  });

  it("expanded body shows numeral-free axes, skill chips and the roadmap link", () => {
    renderPanel();
    expect(screen.getByText("Qualified now")).toHaveClass(
      "text-[10px]",
      "text-rd-text-secondary",
      "w-[104px]",
      "flex-shrink-0",
    );
    expect(screen.getByText("Moves you to Product Lead")).toBeInTheDocument();
    // Numeral-free (RULINGS.md b): no "82%" rendered for the qualified axis.
    expect(screen.queryByText(/82%/)).toBeNull();
    expect(screen.getByText("Full role detail")).toHaveClass(
      "text-[11px]",
      "text-rd-primary-dark",
    );
  });

  it("renders the empty and loading states", () => {
    const { rerender } = render(
      <MemoryRouter>
        <MatchedRolesPanel roles={[]} goalName="X" onToggle={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getByText("No matched roles yet.")).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <MatchedRolesPanel
          roles={[]}
          goalName="X"
          onToggle={() => {}}
          isLoading
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Finding your matched roles/)).toBeInTheDocument();
  });
});

describe("MatchedRolesPanel comfortable diverges (density)", () => {
  it("uses larger type than compact", () => {
    render(
      <MemoryRouter>
        <MatchedRolesPanel
          roles={sortMatchedRoles(ROLES)}
          goalName="Product Lead"
          expandedId="r_sweet"
          onToggle={() => {}}
          size="comfortable"
        />
      </MemoryRouter>,
    );
    const title = screen.getByText("Your matched roles");
    expect(title).toHaveClass("text-[16px]");
    expect(title).not.toHaveClass("text-[14px]");
  });
});

describe("MatchedRolesPanel sort disclosure (Eli pre-cert item 1)", () => {
  const DISCLOSURE = /goal path are listed first, then by match strength/;

  it("renders on compact by default (Career gets it, every tier)", () => {
    renderPanel();
    expect(screen.getByText(DISCLOSURE)).toBeInTheDocument();
  });

  it("renders on comfortable by default", () => {
    renderPanel({ size: "comfortable" });
    expect(screen.getByText(DISCLOSURE)).toBeInTheDocument();
  });

  it("hides when sortDisclosure={false} (Browse Jobs shows it above the feed)", () => {
    renderPanel({ size: "comfortable", sortDisclosure: false });
    expect(screen.queryByText(DISCLOSURE)).toBeNull();
  });
});
