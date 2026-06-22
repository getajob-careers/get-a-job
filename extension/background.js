// Background service worker. Opens the side panel when the toolbar icon is
// clicked (and the panel then stays open until the user dismisses it with the
// panel's own close control — unlike the old action popup, which closed on blur
// and broke pasting a JD).
//
// With openPanelOnActionClick:true the action click is handled by the side-panel
// system, so chrome.action.onClicked does NOT fire — a manual click-to-toggle
// would conflict with it, and the stable API has no reliable close(), so we rely
// on the panel's built-in close control.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error("[sidePanel] setPanelBehavior failed:", err));
