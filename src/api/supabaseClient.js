import { createClient } from "@supabase/supabase-js";

// Under vitest the env vars may be absent (CI runs the test step without them,
// and there is no .env.local). Fall back to placeholders so modules that import
// this client load; the suites that touch it never make a real network call.
// Production and dev keep the hard throw so a genuine misconfiguration fails loud.
const isTest =
  import.meta.env.MODE === "test" || Boolean(import.meta.env.VITEST);

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (isTest ? "https://test-placeholder.supabase.co" : undefined);
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (isTest ? "test-placeholder-anon-key" : undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env.local file.",
  );
}

/** @type {import('@supabase/supabase-js').SupabaseClient<import('@/lib/database.types').Database>} */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
