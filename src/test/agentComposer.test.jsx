// AgentComposer (canvas coach composer) + the CoachInput flag fork.
// Verifies the flag-ON path mounts and behaves (the pop-up affordance, keyboard
// + click send, empty-only trigger) and that CoachInput forks on the flag.
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
import { DEFAULT_DOCK_PROMPTS } from "@/components/agent/coachPrompts";

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
    render(<AgentComposer variant="dock" suggestions={DEFAULT_DOCK_PROMPTS} />);
    expect(
      document.querySelector('[data-agent-composer][data-variant="dock"]'),
    ).toBeTruthy();
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("reveals the suggestion pop-up when focused and empty", () => {
    render(<AgentComposer variant="dock" suggestions={DEFAULT_DOCK_PROMPTS} />);
    expect(screen.queryByText("Suggested")).toBeNull();
    fireEvent.focus(screen.getByRole("textbox"));
    expect(screen.getByText("Suggested")).toBeTruthy();
    expect(
      screen.getByRole("option", { name: "What should I focus on?" }),
    ).toBeTruthy();
  });

  it("does NOT show the pop-up when the input has text", () => {
    mockConv.input = "hello";
    render(<AgentComposer variant="dock" suggestions={DEFAULT_DOCK_PROMPTS} />);
    fireEvent.focus(screen.getByRole("textbox"));
    expect(screen.queryByText("Suggested")).toBeNull();
  });

  it("does NOT show the pop-up when there are no suggestions", () => {
    render(<AgentComposer variant="dock" suggestions={[]} />);
    fireEvent.focus(screen.getByRole("textbox"));
    expect(screen.queryByText("Suggested")).toBeNull();
  });

  it("sends the suggestion label when a pop-up item is selected", () => {
    render(<AgentComposer variant="dock" suggestions={DEFAULT_DOCK_PROMPTS} />);
    fireEvent.focus(screen.getByRole("textbox"));
    fireEvent.mouseDown(
      screen.getByRole("option", { name: "Am I ready to apply?" }),
    );
    expect(mockConv.sendMessage).toHaveBeenCalledWith("Am I ready to apply?");
  });

  it("Enter sends the current input; Shift+Enter does not", () => {
    mockConv.input = "my question";
    render(<AgentComposer variant="dock" suggestions={DEFAULT_DOCK_PROMPTS} />);
    const ta = screen.getByRole("textbox");
    fireEvent.keyDown(ta, { key: "Enter", shiftKey: true });
    expect(mockConv.sendMessage).not.toHaveBeenCalled();
    fireEvent.keyDown(ta, { key: "Enter" });
    expect(mockConv.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("the send button is disabled when empty and not sending", () => {
    render(<AgentComposer variant="dock" suggestions={DEFAULT_DOCK_PROMPTS} />);
    expect(screen.getByRole("button", { name: "Send message" }).disabled).toBe(
      true,
    );
  });

  it("panel variant mounts too", () => {
    render(
      <AgentComposer variant="panel" suggestions={DEFAULT_DOCK_PROMPTS} />,
    );
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
