// Pure batch-splitting helper for the internship matcher. Extracted from
// index.ts so the batch math is unit-testable (index.ts runs Deno.serve and
// is not importable under vitest).
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return arr.length ? [arr.slice()] : [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
