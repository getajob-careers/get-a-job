import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

// Persistent right-edge agent drawer state. PR-A3 (Phase A of the agent
// drawer rollout) — Layout.jsx mounts a single provider so any
// authenticated surface can call `open({ seed, applicationId })` to
// surface the Career Agent inside the drawer without navigating.
//
// State shape: { isOpen, seed, applicationId }.
//   - seed populates ChatInterface's input box without autosending.
//   - applicationId scopes the conversation (same enum that CareerAgent
//     accepts via ?application_id=). null = general career strategy.
//   - close() drops isOpen but PRESERVES seed/applicationId so a quick
//     dismiss → reopen continues from where the user left off; a new
//     open(...) call replaces both.
//
// Default value is a no-op so a non-authenticated consumer doesn't blow
// up if it accidentally calls useAgentDrawer (Layout gates the provider
// mount on user && onboardingComplete).
const AgentDrawerContext = createContext({
  isOpen: false,
  seed: null,
  applicationId: null,
  open: (_opts) => {},
  close: () => {},
});

export function AgentDrawerProvider({ children }) {
  const [state, setState] = useState({ isOpen: false, seed: null, applicationId: null });

  const open = useCallback((opts) => {
    const seed = (opts && opts.seed) || null;
    const applicationId = (opts && opts.applicationId) || null;
    setState({ isOpen: true, seed, applicationId });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const value = useMemo(
    () => ({ ...state, open, close }),
    [state, open, close],
  );

  return (
    <AgentDrawerContext.Provider value={value}>
      {children}
    </AgentDrawerContext.Provider>
  );
}

export function useAgentDrawer() {
  return useContext(AgentDrawerContext);
}
