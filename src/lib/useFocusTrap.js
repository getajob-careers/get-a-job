import { useEffect, useRef } from "react";

// useFocusTrap - modal-dialog focus management (WCAG 2.4.3 Focus Order + 2.1.2
// No Keyboard Trap). When `active`, on the returned container ref it:
//   - remembers the element focused before the dialog opened,
//   - moves focus INTO the dialog (first focusable, else the container),
//   - traps Tab / Shift+Tab within the dialog,
//   - restores focus to the opener when the dialog deactivates or unmounts.
//
// Pass `onEscape` ONLY for dialogs that do not already handle Escape themselves,
// so we never double-close. Returns a ref to attach to the dialog container
// (give that container tabIndex={-1} so it is focusable as a fallback).
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useFocusTrap(active, onEscape) {
  const ref = useRef(null);
  // Keep onEscape current without re-running the effect every render (callers
  // commonly pass an inline arrow).
  const escRef = useRef(onEscape);
  escRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusables = () =>
      Array.from(container.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.hidden && el.getAttribute("aria-hidden") !== "true",
      );

    // Move focus into the dialog next frame (content is mounted / animated in).
    const raf = requestAnimationFrame(() => {
      const items = focusables();
      (items[0] || container).focus?.();
    });

    const onKey = (e) => {
      if (e.key === "Escape" && escRef.current) {
        e.preventDefault();
        escRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        container.focus?.();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && (activeEl === first || !container.contains(activeEl))) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (activeEl === last || !container.contains(activeEl))
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      // Restore focus to the opener if it is still in the document.
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [active]);

  return ref;
}
