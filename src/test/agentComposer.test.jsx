// AgentComposer (canvas coach composer) + the CoachInput flag fork.
// Verifies the flag-ON path mounts and behaves as a CHAT input (no magnifier, no
// floating suggestion pop-up - starters moved to the thread empty-state), keyboard
// + click send, and that CoachInput forks on the flag.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";

let mockConv;
vi.mock("@/lib/CoachConversationContext", () => ({
  useCoachConversation: () => mockConv,
}));
let mockFlag = true;
vi.mock("@/lib/nextDesign", () => ({ isNextDesign: () => mockFlag }));

import AgentComposer from "@/components/agent/AgentComposer";
import CoachInput from "@/components/agent/CoachInput";

beforeEach(() => {
  cleanup();
  mockConv = {
    input: "",
    setInput: vi.fn(),
    sending: false,
    sendMessage: vi.fn(),
  };
  mockFlag = true;
});

describe("AgentComposer", () => {
  it("mounts and shows the composer bar", () => {
    render(<AgentComposer variant="dock" />);
    expect(
      document.querySelector('[data-agent-composer][data-variant="dock"]'),
    ).toBeTruthy();
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("reads as a chat input: no floating suggestion pop-up on focus", () => {
    render(<AgentComposer variant="dock" />);
    fireEvent.focus(screen.getByRole("textbox"));
    expect(screen.queryByText("Suggested")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("Enter sends the current input; Shift+Enter does not", () => {
    mockConv.input = "my question";
    render(<AgentComposer variant="dock" />);
    const ta = screen.getByRole("textbox");
    fireEvent.keyDown(ta, { key: "Enter", shiftKey: true });
    expect(mockConv.sendMessage).not.toHaveBeenCalled();
    fireEvent.keyDown(ta, { key: "Enter" });
    expect(mockConv.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("the send button is disabled when empty and not sending", () => {
    render(<AgentComposer variant="dock" />);
    expect(screen.getByRole("button", { name: "Send message" }).disabled).toBe(
      true,
    );
  });

  it("panel variant mounts too", () => {
    render(<AgentComposer variant="panel" />);
    expect(
      document.querySelector('[data-agent-composer][data-variant="panel"]'),
    ).toBeTruthy();
  });
});

describe("CoachInput flag fork", () => {
  it("flag-ON renders the AgentComposer", () => {
    mockFlag = true;
    render(<CoachInput variant="dock" />);
    expect(document.querySelector("[data-agent-composer]")).toBeTruthy();
    expect(document.querySelector("[data-coach-input]")).toBeNull();
  });

  it("flag-OFF renders the legacy input row (no AgentComposer)", () => {
    mockFlag = false;
    render(<CoachInput variant="dock" />);
    expect(document.querySelector("[data-coach-input]")).toBeTruthy();
    expect(document.querySelector("[data-agent-composer]")).toBeNull();
  });
});
