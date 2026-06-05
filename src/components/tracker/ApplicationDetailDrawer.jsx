import React from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import ApplicationRow from "./ApplicationRow";

// Right-side detail drawer wrapping the existing ApplicationRow's
// expanded view. The Tracker board surfaces this on card click so the
// click has an immediate visible result (the row used to expand far
// below the board, off-screen).
//
// The full ApplicationRow is rendered inside the drawer with
// `defaultExpanded` so the tabs are immediately interactive, and
// `initialTab="checklist"` so the user lands on Steps (the most
// common reason to open a tracked application).
//
// Cache discipline: this drawer takes the full app object from the
// parent's `["applications", uid]` wide query — see
// `fix(tracker): detail reads full application so JD persists on
// return` for the matching cache-key fix that keeps job_description
// from being trampled by narrow agent-page picker queries.
export default function ApplicationDetailDrawer({
  app,
  profile = null,
  listingInactive = false,
  open,
  onClose,
  onUpdate,
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose?.()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl p-0 overflow-y-auto bg-rd-bg-soft border-l border-rd-border"
      >
        {/* Hidden a11y title/description — the rendered ApplicationRow
            shows the role title + company prominently in its header, so
            we don't duplicate them visually. Radix Dialog requires a
            title for screen readers. */}
        {app && (
          <>
            <SheetTitle className="sr-only">
              {app.role_title || "Application"}
              {app.company ? ` at ${app.company}` : ""}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Application detail with status, steps checklist, target role,
              CV, skills, projects, networking, application details,
              interview prep, and follow-up tabs.
            </SheetDescription>
          </>
        )}

        {app && (
          <div className="p-4 sm:p-5 pt-12">
            <ApplicationRow
              app={app}
              profile={profile}
              listingInactive={listingInactive}
              defaultExpanded
              initialTab="checklist"
              onUpdate={onUpdate}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
