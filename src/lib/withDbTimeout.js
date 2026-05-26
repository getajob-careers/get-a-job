// withDbTimeout.js — wrap a Promise-returning queryFn with a 30s ceiling
// so a hung Supabase REST/RPC call surfaces as a React Query error
// instead of leaving the UI stuck on a skeleton forever.
//
// Scoped to DIRECT DB queries only — supabase.from(...).select(),
// .rpc(), .insert(), etc. Do NOT wrap supabase.functions.invoke(...)
// here — edge functions like generate-career-analysis legitimately
// take 40–50s, and a 30s blanket cap would break onboarding completion.
//
// Behaviour:
// - resolves with the queryFn's value if it completes within 30s
// - rejects with a "db-timeout: ${name}" Error if it doesn't
// - propagates the original error if the queryFn itself rejects
//
// React Query reads the rejection via its standard error path: isError,
// error.message, retry, etc. No special handling needed at call sites.
//
// `name` is a label shown in the timeout message + dev-only console
// warning, useful for narrowing down which query hung in prod logs.

const DEFAULT_TIMEOUT_MS = 30_000;

export function withDbTimeout(queryFn, name = "db", timeoutMs = DEFAULT_TIMEOUT_MS) {
  return async (...args) => {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error(`db-timeout: ${name} (${timeoutMs}ms)`);
        err.code = "DB_TIMEOUT";
        err.queryName = name;
        reject(err);
      }, timeoutMs);
    });
    try {
      return await Promise.race([queryFn(...args), timeout]);
    } finally {
      clearTimeout(timer);
    }
  };
}
