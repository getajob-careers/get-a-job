// send-redesign-announcement.ts - manual entrypoint for the one-off redesign
// announcement to onboarded users. Invokes the send-redesign-announcement edge
// function with the service-role client (so its bearer is the service key and
// isServiceRoleCaller passes). DRY-RUN by default; a real send requires
// EMAIL_REAL_SEND=true from the workflow (a dispatch with real_send=true) AND
// EMAIL_SEND_ENABLED="true" in the edge-function env.
//
// Run: npx tsx scripts/send-redesign-announcement.ts   (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const svc = createClient(url, key);

// EMAIL_REAL_SEND is set by the workflow: true only on an opt-in manual dispatch
// (real_send=true), false otherwise. dry_run is its inverse. Even dry_run false
// only sends when EMAIL_SEND_ENABLED=true in the edge-function env.
const realSend =
  String(process.env.EMAIL_REAL_SEND ?? "").toLowerCase() === "true";

const { data, error } = await svc.functions.invoke(
  "send-redesign-announcement",
  {
    body: { dry_run: !realSend },
  },
);

if (error) {
  console.error("[send-redesign-announcement] invoke failed:", error.message);
  process.exit(1);
}
console.log("[send-redesign-announcement]", JSON.stringify(data));
