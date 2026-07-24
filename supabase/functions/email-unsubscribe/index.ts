// email-unsubscribe — public one-click unsubscribe. NO login: the unguessable
// per-user unsubscribe_token (uuid) in the URL is the only credential. verify_jwt
// is FALSE for this function (config.toml) so the link works from any email client.
//
// GET /functions/v1/email-unsubscribe?token=<uuid>
//   -> sets email_preferences.unsubscribed_at = now(), job_digest_enabled = false
//      for the matching row (service role, RLS-bypassing), returns a tiny HTML page.
//
// Idempotent + safe: an unknown/already-used token returns a friendly 200 page,
// never an error. The token only flips the caller's own row; it is not enumerable
// (uuid v4) and cannot read or affect any other data.

import { createClient } from "npm:@supabase/supabase-js@2";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#f4ebda;font:400 16px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2b2b2b;">
<div style="max-width:480px;margin:64px auto;padding:32px;background:#fff;border:1px solid #e6dcc7;border-radius:12px;text-align:center;">
<div style="font:600 18px/1.2 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#60617d;margin-bottom:16px;">Get A Job</div>
${body}
</div></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = (url.searchParams.get("token") ?? "").trim();
    if (!UUID_RE.test(token)) {
      return page(
        "Unsubscribe",
        `<p>This unsubscribe link looks invalid or incomplete. If you keep getting emails you don't want, reply to any of them and we'll remove you.</p>`,
      );
    }

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await svc
      .from("email_preferences")
      .update({
        unsubscribed_at: new Date().toISOString(),
        job_digest_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("unsubscribe_token", token)
      .select("user_id")
      .maybeSingle();

    if (error) {
      console.error("[email-unsubscribe] update failed:", error.message);
      // Friendly page, not a 500 — the user shouldn't see a stack trace.
      return page(
        "Unsubscribe",
        `<p>We hit a snag processing that. Please try again in a moment, or reply to any email to be removed.</p>`,
      );
    }

    // Whether or not the token matched a row, we confirm success (never leak
    // whether a given token exists).
    return page(
      "Unsubscribed",
      `<p style="font-weight:600;">You're unsubscribed.</p>
<p>You won't receive job-match digest emails anymore. You can still use Get A Job normally, and change this later in your account settings.</p>`,
    );
  } catch (e) {
    console.error("[email-unsubscribe] error:", (e as Error).message);
    return page(
      "Unsubscribe",
      `<p>Something went wrong. Please try again, or reply to any email to be removed.</p>`,
    );
  }
});
