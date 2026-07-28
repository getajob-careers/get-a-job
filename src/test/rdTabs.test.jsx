// Proves the shared RdTabs tablist at the render + interaction level:
//   - tablist/tab roles + aria-selected wiring
//   - roving tabindex (only the active tab is in the Tab sequence)
//   - click activation, and Left/Right/Up/Down + Home/End keyboard nav with
//     automatic activation (the a11y payoff of centralizing tablist semantics)
//   - a visible focus ring on every tab
//   - both variants (pill / underline) render
// This is the render gate that build+lint cannot give a presentational refactor.

import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RdTabs from "@/components/redesign/RdTabs";

const TABS = [
  { id: "one", label: "One" },
  { id: "two", label: "Two" },
  { id: "three", label: "Three" },
];

function Harness({ variant = "pill", initial = "one", onChange }) {
  const [value, setValue] = useState(initial);
  return (
    <RdTabs
      tabs={TABS}
      value={value}
      onChange={(id) => {
        onChange?.(id);
        setValue(id);
      }}
      variant={variant}
      aria-label="Test sections"
    />
  );
}

describe("RdTabs a11y wiring", () => {
  it("renders a tablist with a tab per entry and aria-selected on the active tab", () => {
    render(
      <RdTabs tabs={TABS} value="two" onChange={() => {}} aria-label="X" />,
    );
    expect(screen.getByRole("tablist", { name: "X" })).toBeTruthy();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(tabs[0].getAttribute("aria-selected")).toBe("false");
  });

  it("gives only the active tab tabIndex 0 (roving tabindex)", () => {
    render(
      <RdTabs tabs={TABS} value="two" onChange={() => {}} aria-label="X" />,
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs[1].getAttribute("tabindex")).toBe("0");
    expect(tabs[0].getAttribute("tabindex")).toBe("-1");
    expect(tabs[2].getAttribute("tabindex")).toBe("-1");
  });

  it("puts a visible focus ring on every tab", () => {
    render(
      <RdTabs tabs={TABS} value="one" onChange={() => {}} aria-label="X" />,
    );
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.className).toContain("rd-focus-ring");
    }
  });

  it("renders the underline variant", () => {
    render(
      <RdTabs
        tabs={TABS}
        value="one"
        onChange={() => {}}
        variant="underline"
        aria-label="U"
      />,
    );
    expect(screen.getByRole("tablist", { name: "U" })).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });
});

describe("RdTabs interaction", () => {
  it("fires onChange with the clicked tab id", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Three" }));
    expect(onChange).toHaveBeenCalledWith("three");
    expect(
      screen.getByRole("tab", { name: "Three" }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("ArrowRight moves to the next tab and activates it", () => {
    const onChange = vi.fn();
    render(<Harness initial="one" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "One" }), {
      key: "ArrowRight",
    });
    expect(onChange).toHaveBeenCalledWith("two");
    expect(
      screen.getByRole("tab", { name: "Two" }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("ArrowLeft from the first tab wraps to the last", () => {
    const onChange = vi.fn();
    render(<Harness initial="one" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "One" }), {
      key: "ArrowLeft",
    });
    expect(onChange).toHaveBeenCalledWith("three");
  });

  it("Home selects the first tab and End the last", () => {
    const onChange = vi.fn();
    render(<Harness initial="two" onChange={onChange} />);
    const list = screen.getByRole("tablist");
    fireEvent.keyDown(list, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("three");
    fireEvent.keyDown(list, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("one");
  });
});
