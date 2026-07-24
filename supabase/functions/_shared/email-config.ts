// email-config.ts — shared constants + gate for the automation-email functions.

// From / reply-to mirror send-welcome-email (the one existing transactional fn).
export const EMAIL_FROM = "Get A Job <noreply@getajob.careers>";
export const EMAIL_REPLY_TO = "eli@getajob.careers";

export function appBaseUrl(): string {
  return (Deno.env.get("APP_BASE_URL") ?? "https://getajob.careers").replace(/\/+$/, "");
}

export function unsubscribeUrl(token: string): string {
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
  return `${base}/functions/v1/email-unsubscribe?token=${encodeURIComponent(token)}`;
}

// Cron-secret gate: the batch send functions are invoked ONLY by the GitHub
// Actions cron / the hub, which hold the service role key. A request is
// authorized iff its bearer token equals the service role key. This keeps the
// batch functions non-invocable by ordinary authenticated users even though the
// gateway would accept any valid project JWT.
export function isServiceRoleCaller(req: Request): boolean {
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const key = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  return key.length > 0 && bearer === key;
}

// dry-run resolution: default TRUE. A real send additionally needs
// EMAIL_SEND_ENABLED="true" in the dispatch layer, so this alone never sends.
export function resolveDryRun(body: any): boolean {
  const v = body?.dry_run ?? Deno.env.get("EMAIL_DRY_RUN") ?? "true";
  return String(v).toLowerCase() !== "false";
}
