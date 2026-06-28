// Carry a CV dropped on the landing page into onboarding, so the visitor does
// not upload twice. The raw File is stashed in IndexedDB BEFORE signup and the
// onboarding CV step (StepResumeUpload) auto-consumes it AFTER auth.
//
// PRIVACY: everything here is browser-only. NOTHING in this module touches the
// network. The dropped file stays in the visitor's own IndexedDB for the whole
// pre-signup window; it is never transmitted and is never parsed here. The
// parse/upload only happens later inside StepResumeUpload (auth-gated), i.e.
// after account creation + policy acceptance.
//
// IndexedDB (not localStorage) because a CV is a real binary file: IndexedDB
// stores the File/Blob natively with a large quota and survives the signup
// redirect (incl. Google OAuth's full-page round-trip and same-browser email
// confirm). localStorage is string-only (~5MB) and would force a lossy base64
// round-trip.

const DB_NAME = "gaj";
const STORE = "kv";
const KEY = "pending_cv";
// Bounds the pre-signup window so an abandoned signup is reaped rather than
// lingering indefinitely (covers a normal signup / email-confirm flow).
const TTL_MS = 30 * 60 * 1000; // 30 minutes

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined")
      return reject(new Error("indexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Stash the dropped File. Returns true on success, false if storage is
// unavailable (private mode / quota). Callers proceed to signup either way.
export async function savePendingCv(file) {
  if (!file) return false;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ file, savedAt: Date.now() }, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch {
    return false;
  }
}

// Return the carried File if present and not expired; else null. Expired
// entries are cleared. Never throws.
export async function getPendingCv() {
  try {
    const db = await openDb();
    const rec = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).get(KEY);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    if (!rec || !rec.file) return null;
    if (Date.now() - rec.savedAt > TTL_MS) {
      await clearPendingCv();
      return null;
    }
    return rec.file;
  } catch {
    return null;
  }
}

// Remove the carried CV. Idempotent; never throws. Called on pickup, on TTL
// expiry, and can be wired to a cancel/skip action.
export async function clearPendingCv() {
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
    db.close();
  } catch {
    /* ignore */
  }
}
