// Settings fixtures — PR 3N.
//
// HIGHEST-STAKES PAGE — fixtures capture VISUAL STATES ONLY. Every
// destructive handler (delete-account edge fn, reset_user_data RPC,
// auth.reauthenticate/updateUser) is mocked to no-op {error: null} at
// the harness level; the handlers are never invoked. The flows are
// prod-smoke-tested manually post-merge per the PR body checklist.
//
// 5 fixtures:
//   1. settings-default            — full page, default state (all
//                                    destructive forms idle)
//   2. settings-password-verify    — PasswordCard standalone in
//                                    `verify` step (nonce input visible)
//   3. settings-password-done      — PasswordCard standalone in `done`
//                                    step (success banner + "Change it
//                                    again" link)
//   4. settings-reset-confirming   — full page, Onboarding section with
//                                    resetConfirming=true (Confirm/Cancel
//                                    pair visible)
//   5. settings-delete-typed       — full page, Danger zone with typed
//                                    "DELETE my account" → delete button
//                                    enabled (visual state only, NOT clicked)

export const SETTINGS_FIXTURES = {
  "settings-default": {
    label: "Settings · default (all forms idle)",
    passwordStep: "compose",
    resetConfirming: false,
    deleteInput: "",
  },
  "settings-password-verify": {
    label: "Settings · PasswordCard standalone · verify step (nonce input)",
    subtreeOnly: "password-card",
    passwordStep: "verify",
  },
  "settings-password-done": {
    label: "Settings · PasswordCard standalone · done step (success banner)",
    subtreeOnly: "password-card",
    passwordStep: "done",
  },
  "settings-reset-confirming": {
    label: "Settings · Onboarding section · resetConfirming=true (Confirm/Cancel pair)",
    passwordStep: "compose",
    resetConfirming: true,
    deleteInput: "",
  },
  "settings-delete-typed": {
    label: "Settings · Danger zone · typed phrase, delete button enabled (NOT clicked)",
    passwordStep: "compose",
    resetConfirming: false,
    deleteInput: "DELETE my account",
  },
};

export const SETTINGS_STATE_IDS = Object.keys(SETTINGS_FIXTURES);
