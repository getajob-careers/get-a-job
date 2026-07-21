// Per-key serialized write-through (CV RED write-layer fix).
//
// The Studio's source row is a re-derived cache with no load-time version, so
// its write-through concurrency is fail-open (last-write-wins). Two commits to
// the SAME field/entity firing close together could otherwise read the same
// stale "prior" concurrently, and last-write-wins could land an intermediate
// re-commit AFTER the user's newest edit - clobbering it out of the source
// (the reproduced exp_bullets race). This gives each key:
//   - strict FIFO: a task waits for the prior task on its key to settle, so two
//     writes for one key never execute (and never read prior) concurrently.
//   - burst coalescing: if a newer task for the key is enqueued before an older
//     one runs, the older one is SKIPPED (the newer writes the fresher value),
//     so an intermediate no-op cannot land after the latest edit.
// Keys are independent (different fields/entities run in parallel).
//
// Pure + framework-free so the guarantee is unit-tested directly, without a
// React render. `task` runs only if it is still the latest request for its key;
// otherwise `run` resolves to { skipped: true } and `task` is never called.
export function createSerializedWriter() {
  const chains = new Map(); // key -> { tail: Promise, seq: number }
  return function run(key, task) {
    const slot = chains.get(key) || { tail: Promise.resolve(), seq: 0 };
    const mySeq = slot.seq + 1;
    slot.seq = mySeq;
    chains.set(key, slot);
    const p = slot.tail.then(() => {
      // Superseded by a newer request on this key before we ran: skip (that
      // request writes the fresher value; running us would clobber it).
      if (chains.get(key)?.seq !== mySeq) return { skipped: true };
      return task();
    });
    // Swallow rejections on the CHAIN only (so one failed write doesn't wedge
    // the key); the returned promise `p` still rejects for the caller.
    slot.tail = p.then(
      () => {},
      () => {},
    );
    return p;
  };
}
