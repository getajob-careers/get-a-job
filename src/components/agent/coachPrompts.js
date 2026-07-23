// Static starter suggestions for the coach composer. ONE source so the flag-on
// pop-up affordance (AgentComposer) and the flag-off thread empty-state chips
// (CoachThread) never drift. Passed in via a `suggestions` prop per surface, so
// a context-aware v2 can hand tailored suggestions to either consumer without
// changing them. Items may be plain strings or { icon, label } objects.
export const DEFAULT_DOCK_PROMPTS = [
  "What should I focus on?",
  "Am I ready to apply?",
  "What's my biggest gap?",
];
