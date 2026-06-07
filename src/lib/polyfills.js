// Standard-API polyfills for older iOS Safari.
//
// pdfjs-dist 5.x calls a handful of recently-standardized JS APIs that
// only landed in WebKit late. On iPhone/iPad — where Safari is the
// engine for every browser — anything below the version that shipped
// the API throws a `TypeError: undefined is not a function (near
// '...n of e...')` the instant pdfjs internals try to call the missing
// method, killing CV upload during onboarding.
//
// This file is imported as the VERY FIRST line of src/main.jsx so the
// polyfills exist before any React component is constructed and well
// before StepResumeUpload's dynamic `import("pdfjs-dist")` resolves.
//
// Each polyfill is gated on a typeof check so it is a no-op on browsers
// that have the native implementation. No dependencies — these are all
// small enough to inline standard-compliant implementations.

// ── Promise.withResolvers ───────────────────────────────────────────
// Spec: TC39 Stage 4, ratified 2024. WebKit shipped in Safari 17.4 /
// iOS Safari 17.4 (March 2024). pdf.mjs uses it ~26 times — this is
// the actual cause of the mobile upload failure.
if (typeof Promise.withResolvers !== "function") {
  Promise.withResolvers = function withResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// ── globalThis.structuredClone ──────────────────────────────────────
// Shipped in iOS Safari 15.4 (March 2022). Belt-and-suspenders for the
// vanishing pre-15.4 long tail. pdf.mjs uses it 4 times. The
// JSON-round-trip fallback below is lossy vs spec (no Dates, no
// typed arrays preserved as the original type, no cycles), but it
// covers pdfjs's actual usage which is plain-object cloning of small
// configuration shapes.
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = function structuredClone(value) {
    return JSON.parse(JSON.stringify(value));
  };
}

// ── Array.prototype.findLast ────────────────────────────────────────
// Shipped in iOS Safari 15.4 (March 2022). Same long-tail rationale.
if (typeof Array.prototype.findLast !== "function") {
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Array.prototype, "findLast", {
    value: function findLast(predicate, thisArg) {
      for (let i = this.length - 1; i >= 0; i--) {
        const v = this[i];
        if (predicate.call(thisArg, v, i, this)) return v;
      }
      return undefined;
    },
    writable: true,
    configurable: true,
  });
}
