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
// pageContext shape (PR-B2): {page, application_id?, job_id?, role_id?,
// track?, company_target_id?}. The drawer forwards this object verbatim
// to ai-chat's request body so the server can fetch each entity by ID
// under the user's auth. IDs only — no titles, no entity content.
// `null` is a valid pageContext value (no context); each page calls
// setPageContext(null) on unmount to clear stale state.
const AgentDrawerContext = createContext({
  isOpen: false,
  seed: null,
  applicationId: null,
  pageContext: null,
  open: (_opts) => {},
  close: () => {},
  setPageContext: (_ctx) => {},
});

export function AgentDrawerProvider({ children }) {
  const [state, setState] = useState({ isOpen: false, seed: null, applicationId: null });
  // pageContext lives in a separate state slot so a page-context update
  // doesn't re-render anything that only cares about isOpen/seed (and
  // vice versa).
  const [pageContext, setPageContextRaw] = useState(null);

  const open = useCallback((opts) => {
    const seed = (opts && opts.seed) || null;
    const applicationId = (opts && opts.applicationId) || null;
    setState({ isOpen: true, seed, applicationId });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Shallow-equal guard so repeated calls with identical context don't
  // trigger downstream re-renders. Pages call this in useEffect on
  // every dep change; without the guard a parent re-render that yields
  // the same {page, ids…} would cascade to the drawer + ChatInterface.
  const setPageContext = useCallback((next) => {
    setPageContextRaw((prev) => {
      if (prev === next) return prev;
      if (prev == null && next == null) return prev;
      if (prev == null || next == null) return next;
      const keysA = Object.keys(prev);
      const keysB = Object.keys(next);
      if (keysA.length !== keysB.length) return next;
      for (const k of keysA) {
        if (prev[k] !== next[k]) return next;
      }
      return prev;
    });
  }, []);

  const value = useMemo(
    () => ({ ...state, pageContext, open, close, setPageContext }),
    [state, pageContext, open, close, setPageContext],
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
