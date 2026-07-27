// email-eligibility.ts — resolve the recipient segment for an automation email,
// server-side, reusing the scrubbed-usage real_users exclusion. No new schema
// (no RPC): reads auth users via the admin API + the public profiles /
// email_preferences tables with the service-role client.
//
// Segments:
//   job_digest    = confirmed email, onboarding COMPLETE, not unsubscribed,
//                   job_digest_enabled != false, not internal.
//   reengagement  = confirmed email, onboarding INCOMPLETE, not unsubscribed,
//                   not internal.
//   redesign_announcement = confirmed email, onboarding COMPLETE, not
//                   unsubscribed, not internal. The people who already use the
//                   platform and just got the redesign. Disjoint from
//                   reengagement by construction (the onboarding_complete split).
//
// Internal exclusion mirrors the real_users CTE: email pattern (isInternalEmail)
// + the Noms UUID (no email pattern to match).

import { isInternalEmail, type EmailType } from "./email-dispatch.ts";

const NOMS_UUID = "90bcf097-77f2-437f-9210-42755ba4d143";

export interface Recipient {
  userId: string;
  email: string;
  fullName: string | null;
}

// Page through the admin user list (small population; perPage 200 covers it in
// one or two pages) and keep confirmed, non-internal, non-Noms users.
async function listConfirmedRealUsers(
  svc: any,
): Promise<{ id: string; email: string }[]> {
  const out: { id: string; email: string }[] = [];
  let page = 1;
  const perPage = 200;
  // Hard cap the paging so a bug can never loop forever.
  for (let guard = 0; guard < 50; guard++) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[email-eligibility] listUsers failed:", error.message);
      break;
    }
    const users: any[] = data?.users ?? [];
    for (const u of users) {
      const email = String(u?.email ?? "");
      if (!email) continue;
      if (!u?.email_confirmed_at) continue; // confirmed only
      if (u?.deleted_at) continue;
      if (u?.id === NOMS_UUID) continue;
      if (isInternalEmail(email)) continue;
      out.push({ id: u.id, email });
    }
    if (users.length < perPage) break;
    page++;
  }
  return out;
}

export async function resolveEligibleRecipients(
  svc: any,
  segment: EmailType,
): Promise<Recipient[]> {
  const realUsers = await listConfirmedRealUsers(svc);
  if (realUsers.length === 0) return [];
  const ids = realUsers.map((u) => u.id);
  const emailById = new Map(realUsers.map((u) => [u.id, u.email]));

  // profiles: onboarding_complete + full_name for these users.
  const { data: profiles, error: pErr } = await svc
    .from("profiles")
    .select("id, full_name, onboarding_complete")
    .in("id", ids);
  if (pErr) {
    console.error("[email-eligibility] profiles query failed:", pErr.message);
    return [];
  }
  const profById = new Map(
    (profiles ?? []).map((p: any) => [p.id, p]),
  );

  // email_preferences: unsubscribed / digest-enabled for these users.
  const { data: prefs, error: prefErr } = await svc
    .from("email_preferences")
    .select("user_id, unsubscribed_at, job_digest_enabled")
    .in("user_id", ids);
  if (prefErr) {
    console.error("[email-eligibility] email_preferences query failed:", prefErr.message);
    return [];
  }
  const prefByUser = new Map(
    (prefs ?? []).map((r: any) => [r.user_id, r]),
  );

  const out: Recipient[] = [];
  for (const id of ids) {
    const prof: any = profById.get(id);
    const pref: any = prefByUser.get(id);
    if (pref?.unsubscribed_at) continue; // unsubscribed → never eligible
    const onboardingComplete = prof?.onboarding_complete === true;

    if (segment === "job_digest") {
      if (!onboardingComplete) continue;
      if (pref && pref.job_digest_enabled === false) continue;
    } else if (segment === "reengagement") {
      if (onboardingComplete) continue;
    } else {
      // redesign_announcement: users who ALREADY use the platform (onboarded).
      if (!onboardingComplete) continue;
    }
    out.push({ userId: id, email: emailById.get(id)!, fullName: prof?.full_name ?? null });
  }
  return out;
}
