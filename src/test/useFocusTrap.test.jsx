// useFocusTrap - modal focus management (WCAG 2.4.3 / 2.1.2). Guards initial
// focus, Escape (opt-in), Tab/Shift+Tab wrapping, and focus restore on close.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { useFocusTrap } from "@/lib/useFocusTrap";

afterEach(cleanup);

function Dialog({ active, onEscape }) {
  const ref = useFocusTrap(active, onEscape);
  return (
    <div ref={ref} tabIndex={-1} data-testid="dialog">
      <button>first</button>
      <button>second</button>
      <button>last</button>
    </div>
  );
}

describe("useFocusTrap", () => {
  it("moves focus into the dialog on activate", async () => {
    const { getByText } = render(<Dialog active />);
    await waitFor(() =>
      expect(document.activeElement).toBe(getByText("first")),
    );
  });

  it("Escape calls onEscape when provided", async () => {
    const onEscape = vi.fn();
    const { getByText } = render(<Dialog active onEscape={onEscape} />);
    await waitFor(() =>
      expect(document.activeElement).toBe(getByText("first")),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("does not act on Escape when inactive", () => {
    const onEscape = vi.fn();
    render(<Dialog active={false} onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("Tab at the last focusable wraps to the first", async () => {
    const { getByText } = render(<Dialog active />);
    await waitFor(() =>
      expect(document.activeElement).toBe(getByText("first")),
    );
    getByText("last").focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(getByText("first"));
  });

  it("Shift+Tab at the first focusable wraps to the last", async () => {
    const { getByText } = render(<Dialog active />);
    await waitFor(() =>
      expect(document.activeElement).toBe(getByText("first")),
    );
    getByText("first").focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(getByText("last"));
  });

  it("restores focus to the opener on unmount", async () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { unmount, getByText } = render(<Dialog active />);
    await waitFor(() =>
      expect(document.activeElement).toBe(getByText("first")),
    );
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
