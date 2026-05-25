// downloadFile.js — fetch-then-download helper for files referenced by
// signed Supabase storage URLs. Used by the CV download buttons so the
// raw signed URL (with token query param) never lands in the DOM as an
// <a href=...>, which would let users right-click → copy link, see it
// in the browser status bar, or accidentally share it.
//
// The token is still observable in the Network tab during the fetch
// itself — that's unavoidable for any browser-side download — but
// staying out of the DOM removes the easy exfiltration paths.
//
// Returns nothing; throws if the fetch fails so callers can surface
// a user-facing error.

export async function triggerBlobDownload(url, suggestedName) {
  if (!url) throw new Error("triggerBlobDownload: missing url");
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  // `download` triggers save-as instead of in-tab open. Browsers respect
  // this when same-origin OR (cross-origin) when the response carries
  // Content-Disposition: attachment — Supabase signed URLs typically
  // return application/pdf inline, so the explicit `download` attr is
  // what gets us a download dialog instead of an inline PDF view.
  a.download = suggestedName || "file";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Release the blob URL on next tick — some browsers race the click()
  // handler if we revoke immediately.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

// Pull a sensible default filename from a signed-URL path. Storage paths
// look like `{user.id}/{role}_CV_{timestamp}.pdf?token=...` — we want
// just the filename portion, stripped of the query string.
export function filenameFromSignedUrl(url, fallback = "cv.pdf") {
  if (!url) return fallback;
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop();
    return last ? decodeURIComponent(last) : fallback;
  } catch {
    return fallback;
  }
}
