// send-job-digest.ts — cron entrypoint for the job-match digest. Invokes the
// send-job-digest edge function with the service-role client (so its bearer is
// the service key → isServiceRoleCaller passes). DRY-RUN is forced here AND is
// the function default; nothing sends until Eli enables it in the dispatch layer.
//
// Run: npx tsx scripts/send-job-digest.ts   (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const svc = createClient(url, key);

const { data, error } = await svc.functions.invoke("send-job-digest", {
  // Explicit dry_run:true (belt-and-suspenders; the function also defaults to it).
  body: { dry_run: true },
});

if (error) {
  console.error("[send-job-digest] invoke failed:", error.message);
  process.exit(1);
}
console.log("[send-job-digest]", JSON.stringify(data));
