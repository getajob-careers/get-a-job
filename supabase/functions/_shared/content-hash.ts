// content-hash.ts — stable sha-256 fingerprinting for caching edge-function
// outputs by input identity.
//
// Used by `function_cache`-backed caching: hash the user's relevant inputs,
// compare against the stored hash, regenerate only on mismatch (or after
// the function's TTL ceiling). See `supabase/migrations/<...>_function_cache.sql`
// for the storage shape.
//
// Why stable-stringify before hashing: JSON.stringify is non-deterministic
// for object key order across Deno versions / hash-map perturbations.
// Same logical input must produce the same hash on every call, so we
// sort object keys and walk arrays by index. Order in arrays is preserved
// (it's semantically meaningful for, e.g., experiences ordered by date).

import { crypto as denoCrypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * Deterministic JSON stringify. Stable across runs for any plain
 * JSON-able input (object, array, string, number, boolean, null).
 *
 * - Object keys sorted lexicographically (recursive).
 * - Array order preserved (the caller controls semantic ordering).
 * - `undefined` values dropped (matches JSON.stringify semantics).
 * - `Date` → `.toISOString()` for cross-run stability.
 * - Non-finite numbers → null (matches JSON.stringify).
 */
export function stableStringify(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "null";

  const t = typeof value;
  if (t === "boolean") return value ? "true" : "false";
  if (t === "number") return Number.isFinite(value) ? String(value) : "null";
  if (t === "string") return JSON.stringify(value);

  if (value instanceof Date) return JSON.stringify(value.toISOString());

  if (Array.isArray(value)) {
    return "[" + value.map((v) => stableStringify(v)).join(",") + "]";
  }

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
  }

  // Functions, symbols, bigints — not part of our cacheable input shapes.
  // Drop silently rather than throw; the caller controls what gets passed in.
  return "null";
}

/**
 * sha-256 hex digest of the deterministic stringification of `input`.
 * Use this as the value for `function_cache.input_hash`.
 */
export async function sha256Hex(input: unknown): Promise<string> {
  const canonical = stableStringify(input);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await denoCrypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
