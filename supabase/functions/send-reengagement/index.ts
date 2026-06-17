import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startMetric, finishMetric } from "../_shared/metrics.ts";
import { sendEmail } from "../_shared/send-email.ts";

// send-reengagement — admin-triggered reengagement campaign send.
//
// Mirrors send-welcome-email: reads the already-deployed RESEND_API_KEY
// secret from the function env (never pulled to disk or printed) and sends
// via the shared sendEmail (Resend + Idempotency-Key + reply_to).
//
// ADMIN-ONLY: verify_jwt=false (config.toml) + an in-code gate requiring
// Authorization: Bearer <SERVICE_ROLE_KEY>. No user can trigger it.
//
// Payload: { mode: 'dry' | 'live', confirm?: number }.
//   dry  — resolves the segments + merges every slot, returns the full
//          recipient list + per-segment counts. Sends nothing.
//   live — refuses unless `confirm` equals the resolved recipient count.
//          Per recipient: INSERT into campaign_sends first (skip on the
//          UNIQUE(campaign_id,user_id) conflict → idempotent), then sendEmail
//          with Idempotency-Key reengage:<campaign>:<uid>, then a
//          function_metrics row. Per-segment cap enforced.
//
// dry and live resolve the IDENTICAL set via resolveRecipients() — the
// recipient logic + buildBody are ported unchanged from scripts/send-
// reengagement.ts (PR #350), so dry reproduces exactly what live will send.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const APP = "https://getajob.careers";
const FROM = "Get A Job <noreply@getajob.careers>";
const REPLY_TO = "eli@getajob.careers";
const CAMPAIGN_ID = "reengage-2026-06";
const PER_SEGMENT_CAP = 50;
// Smoke: a SEPARATE campaign_id so it never touches the real campaign's
// idempotency rows. One representative per segment, all delivered to a single
// controlled inbox to eyeball every template in a real client.
const SMOKE_CAMPAIGN_ID = "reengage-2026-06-smoke";
const SMOKE_TO = "eli@getajob.careers";
const SMOKE_REPS: Record<string, string> = {
  A: "werner.gidon@gmail.com", // longest role line (Gidon)
  B: "idodagan1414@gmail.com", // company-examples variant (Ido)
  C: "redheadeg@gmail.com", // stalled (Ella)
  D: "adarevekalter@gmail.com", // cold no-profile ("there")
};

// ── Named memberships (explicit, from Eli) ─────────────────────────────────
const B_IDS = new Set([
  "a3eef263-d099-4538-a8d9-1944ab58c961", // Ido
  "cb6c2a44-3768-4a11-9d0a-9a608e9e1f37", // Adi
  "9518637e-2cc5-47ee-b7b8-a2e956554860", // Ofri
]);
const IDO = "a3eef263-d099-4538-a8d9-1944ab58c961";
const C_EMAILS = new Set(["redheadeg@gmail.com", "ybarshain@gmail.com"]);
const NEVERCONFIRM_MATCH = (e: string) =>
  /rachelimiller24/i.test(e) ||
  /^jenna@bettear\.com$/i.test(e) ||
  /gulicheric/i.test(e);

const titleCase = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const firstName = (full?: string | null) => {
  const tok = full?.trim().split(/\s+/)[0];
  return tok ? titleCase(tok) : "there";
};
const NAME_OVERRIDE: Record<string, string> = {
  "cb6c2a44-3768-4a11-9d0a-9a608e9e1f37": "Adi", // full_name "Adiburshan" has no space
};
const isCleanShortRole = (s: string) =>
  s.length > 0 &&
  s.length <= 48 &&
  s.split(/\s+/).length <= 7 &&
  !/[.,]/.test(s);

interface Rec {
  userId: string;
  email: string;
  segment: "A" | "B" | "C" | "D";
  slots: Record<string, string>;
  links: string[];
  subject: string;
}

// ── Recipient resolution (ported unchanged from PR #350 dry-run) ────────────
async function resolveRecipients(admin: any): Promise<{
  recipients: Rec[];
  neverConfirm: string[];
  untargeted: { email: string; why: string }[];
}> {
  const authUsers: any[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(`listUsers: ${error.message}`);
    authUsers.push(...data.users);
    if (data.users.length < 200) break;
  }

  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select(
      "id, invite_code, onboarding_complete, full_name, five_year_role, primary_domain",
    );
  if (pErr) throw new Error(`profiles: ${pErr.message}`);
  const profById = new Map<string, any>(
    (profiles ?? []).map((p: any) => [p.id, p]),
  );

  const { data: roles } = await admin
    .from("career_roles")
    .select("user_id, title, track, goal_alignment_score");
  const topRoleByUser = new Map<string, { t: string; s: number }>();
  for (const r of (roles ?? []) as any[]) {
    if (r.track !== "track_1" || !r.title) continue;
    const prev = topRoleByUser.get(r.user_id);
    if (!prev || (r.goal_alignment_score ?? 0) > prev.s) {
      topRoleByUser.set(r.user_id, {
        t: r.title,
        s: r.goal_alignment_score ?? 0,
      });
    }
  }
  const roleLine = (uid: string, prof: any): string | null => {
    const candidate = (
      topRoleByUser.get(uid)?.t ||
      prof?.five_year_role ||
      prof?.primary_domain ||
      ""
    ).trim();
    return isCleanShortRole(candidate) ? candidate : null;
  };

  const recipients: Rec[] = [];
  const neverConfirm: string[] = [];
  const untargeted: { email: string; why: string }[] = [];

  for (const u of authUsers) {
    const email = (u.email ?? "").toLowerCase();
    if (!email) continue;
    const confirmed = !!u.email_confirmed_at;
    const prof = profById.get(u.id);

    if (NEVERCONFIRM_MATCH(email) || (!confirmed && !prof)) {
      if (NEVERCONFIRM_MATCH(email)) neverConfirm.push(email);
      else
        untargeted.push({
          email,
          why: "unconfirmed (not in never-confirm list)",
        });
      continue;
    }
    if (!confirmed) {
      untargeted.push({ email, why: "unconfirmed" });
      continue;
    }

    const fn = NAME_OVERRIDE[u.id] ?? firstName(prof?.full_name);

    if (B_IDS.has(u.id)) {
      const isIdo = u.id === IDO;
      recipients.push({
        userId: u.id,
        email,
        segment: "B",
        slots: isIdo
          ? { first_name: fn, companies: "Datarails and Anyword" }
          : { first_name: fn },
        links: isIdo
          ? [`${APP}/CareerAgent`, `${APP}/Linkedin`, `${APP}/Career`]
          : [`${APP}/CareerAgent`, `${APP}/Linkedin`],
        subject: "A few companies we thought you'd find interesting",
      });
      continue;
    }
    if (C_EMAILS.has(email)) {
      recipients.push({
        userId: u.id,
        email,
        segment: "C",
        slots: { first_name: fn },
        links: [`${APP}/Onboarding`],
        subject: "Pick up where you left off",
      });
      continue;
    }
    if (prof?.invite_code === "GETAJOBPILOT" && prof?.onboarding_complete) {
      const role = roleLine(u.id, prof);
      recipients.push({
        userId: u.id,
        email,
        segment: "A",
        slots: role ? { first_name: fn, top_role: role } : { first_name: fn },
        links: [`${APP}/Career`, `${APP}/CareerAgent`],
        subject: "Your agents are ready when you are",
      });
      continue;
    }
    if (!prof) {
      recipients.push({
        userId: u.id,
        email,
        segment: "D",
        slots: { first_name: fn },
        links: [`${APP}/Onboarding`],
        subject: "Still want help landing a role?",
      });
      continue;
    }
    untargeted.push({
      email,
      why: `profile invite_code=${prof.invite_code ?? "(null)"} onboarded=${prof.onboarding_complete}`,
    });
  }
  return { recipients, neverConfirm, untargeted };
}

// ── Locked body copy (ported unchanged from PR #350) ────────────────────────
const SIGNOFF = "\n\n— The Get A Job team";
function buildBody(rec: Rec): string {
  const fn = rec.slots.first_name;
  if (rec.segment === "A") {
    const roleSentence = rec.slots.top_role
      ? ` They're locked on your target: ${rec.slots.top_role}.`
      : "";
    return (
      [
        `Hey ${fn},`,
        "",
        `Your five agents — career strategy, CV, interview, LinkedIn, skill development — are still here, and they've read your profile.${roleSentence}`,
        "",
        "If you've got ten minutes this week, start with the career agent: it knows your matched roles and can talk through which are worth your time.",
        "",
        rec.links.join("\n"),
        "",
        "Broken or unclear? Just reply — it goes straight to Eli.",
      ].join("\n") + SIGNOFF
    );
  }
  if (rec.segment === "B") {
    const hasCos = !!rec.slots.companies;
    const opening = hasCos
      ? `We've been mapping companies in the Israeli market, and a few stood out as worth a look for you — companies like ${rec.slots.companies}.`
      : "We've been mapping companies in the Israeli market that might be worth a look for someone with your background.";
    const second = hasCos
      ? "Nothing formal — just a starting point. The career agent can talk any of them through, and the LinkedIn hub will help you find a way in."
      : "Nothing formal — just a starting point. The career agent can help you explore which directions fit, and the LinkedIn hub will help you find a way in.";
    return (
      [
        `Hey ${fn},`,
        "",
        opening,
        "",
        second,
        "",
        rec.links.join("\n"),
        "",
        "Reply anytime — it reaches Eli directly.",
      ].join("\n") + SIGNOFF
    );
  }
  if (rec.segment === "C") {
    return (
      [
        `Hey ${fn},`,
        "",
        "You started setting up your Get A Job profile but didn't finish — you're a few minutes from having your five agents ready to work on your search.",
        "",
        "Pick up where you left off:",
        rec.links.join("\n"),
        "",
        "Stuck on something? Just reply — it goes straight to Eli.",
      ].join("\n") + SIGNOFF
    );
  }
  return (
    [
      `Hey ${fn},`,
      "",
      "You signed up for Get A Job but never set up your profile. If you're still job-hunting, it's worth ten minutes: five agents — career strategy, CV, interview, LinkedIn, skill development — built around your background.",
      "",
      "Start here:",
      rec.links.join("\n"),
      "",
      "Not for you? Ignore this. If you reply, it goes straight to Eli.",
    ].join("\n") + SIGNOFF
  );
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  // Admin gate via a custom header (forwarded untouched by the gateway, unlike
  // Authorization, which the platform consumes for its own apikey check).
  // Compared to REENGAGE_ADMIN_TOKEN — a dedicated secret set to the project's
  // legacy service_role key, so an operator can reproduce it via the CLI
  // (`supabase projects api-keys`), decoupled from the new-format
  // SUPABASE_SERVICE_ROLE_KEY the runtime injects. .trim() guards trailing \n.
  const ADMIN = (Deno.env.get("REENGAGE_ADMIN_TOKEN") ?? "").trim();
  const presented = (req.headers.get("x-admin-key") ?? "").trim();
  if (!ADMIN || presented !== ADMIN) {
    return json({ error: "Unauthorized — service-role only." }, 401);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", SRK, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const payload = await req.json().catch(() => ({}));
  const mode =
    payload?.mode === "live"
      ? "live"
      : payload?.mode === "smoke"
        ? "smoke"
        : "dry";
  const confirm = typeof payload?.confirm === "number" ? payload.confirm : null;

  const { recipients, neverConfirm, untargeted } =
    await resolveRecipients(admin);
  const counts = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
  for (const r of recipients) counts[r.segment]++;

  if (mode === "dry") {
    return json({
      mode: "dry",
      campaign_id: CAMPAIGN_ID,
      counts,
      total: recipients.length,
      never_confirmed: neverConfirm,
      untargeted_count: untargeted.length,
      recipients: recipients.map((r) => ({
        email: r.email,
        segment: r.segment,
        subject: r.subject,
        slots: r.slots,
        links: r.links,
      })),
    });
  }

  // ── SMOKE ───────────────────────────────────────────────────────────────────
  // One representative per segment, rendered with that recipient's real slots
  // but delivered to SMOKE_TO. Written under SMOKE_CAMPAIGN_ID so the real
  // campaign's rows stay untouched. Idempotent on (SMOKE_CAMPAIGN_ID, user_id)
  // → a re-run skips every row.
  if (mode === "smoke") {
    if (!Deno.env.get("RESEND_API_KEY")) {
      return json(
        { error: "RESEND_API_KEY not configured in function env" },
        500,
      );
    }
    const sends: any[] = [];
    for (const seg of ["A", "B", "C", "D"]) {
      const rep = recipients.find(
        (r) => r.email === SMOKE_REPS[seg] && r.segment === seg,
      );
      if (!rep) {
        sends.push({
          segment: seg,
          rep_email: SMOKE_REPS[seg],
          status: "rep_not_found",
        });
        continue;
      }
      const body = buildBody(rep);
      const m = startMetric("send-reengagement");
      m.userId = rep.userId;
      const { error: insErr } = await admin.from("campaign_sends").insert({
        campaign_id: SMOKE_CAMPAIGN_ID,
        user_id: rep.userId,
        email: SMOKE_TO,
        segment: seg,
        status: "sent",
      });
      if (insErr) {
        const skipped = (insErr as any).code === "23505";
        finishMetric(m, {
          ok: skipped,
          httpStatus: skipped ? 200 : 500,
          errorCode: skipped ? "skipped_duplicate" : "insert_failed",
        });
        sends.push({
          segment: seg,
          rep_email: rep.email,
          to: SMOKE_TO,
          subject: rep.subject,
          body,
          status: skipped ? "skipped" : "insert_failed",
          error: skipped ? undefined : insErr.message,
        });
        continue;
      }
      const res = await sendEmail({
        to: SMOKE_TO,
        from: FROM,
        replyTo: REPLY_TO,
        subject: rep.subject,
        text: body,
        idempotencyKey: `reengage:${SMOKE_CAMPAIGN_ID}:${rep.userId}`,
      });
      if (res.ok) {
        await admin
          .from("campaign_sends")
          .update({ resend_message_id: res.id ?? null, status: "sent" })
          .eq("campaign_id", SMOKE_CAMPAIGN_ID)
          .eq("user_id", rep.userId);
        finishMetric(m, { ok: true, httpStatus: 200, errorCode: null });
      } else {
        await admin
          .from("campaign_sends")
          .update({
            status: "failed",
            error: (res.error ?? "unknown").slice(0, 300),
          })
          .eq("campaign_id", SMOKE_CAMPAIGN_ID)
          .eq("user_id", rep.userId);
        finishMetric(m, {
          ok: false,
          httpStatus: res.status ?? 500,
          errorCode: "send_failed",
        });
      }
      sends.push({
        segment: seg,
        rep_email: rep.email,
        to: SMOKE_TO,
        subject: rep.subject,
        body,
        status: res.ok ? "sent" : "failed",
        resend_message_id: res.id,
        error: res.ok ? undefined : res.error,
      });
    }
    return json({ mode: "smoke", campaign_id: SMOKE_CAMPAIGN_ID, sends });
  }

  // ── LIVE ──────────────────────────────────────────────────────────────────
  if (confirm !== recipients.length) {
    return json(
      {
        error: `confirm (${confirm}) != resolved recipient count (${recipients.length})`,
      },
      400,
    );
  }
  for (const s of ["A", "B", "C", "D"]) {
    if (counts[s] > PER_SEGMENT_CAP) {
      return json(
        {
          error: `segment ${s} (${counts[s]}) exceeds PER_SEGMENT_CAP ${PER_SEGMENT_CAP}`,
        },
        400,
      );
    }
  }
  if (!Deno.env.get("RESEND_API_KEY")) {
    return json(
      { error: "RESEND_API_KEY not configured in function env" },
      500,
    );
  }

  const result = {
    A: { sent: 0, skipped: 0, failed: 0 },
    B: { sent: 0, skipped: 0, failed: 0 },
    C: { sent: 0, skipped: 0, failed: 0 },
    D: { sent: 0, skipped: 0, failed: 0 },
  } as Record<string, { sent: number; skipped: number; failed: number }>;
  const failures: { email: string; stage: string; error: string }[] = [];

  for (const rec of recipients) {
    const m = startMetric("send-reengagement");
    m.userId = rec.userId;

    // Claim the slot FIRST — UNIQUE(campaign_id,user_id) makes a re-run skip.
    const { error: insErr } = await admin.from("campaign_sends").insert({
      campaign_id: CAMPAIGN_ID,
      user_id: rec.userId,
      email: rec.email,
      segment: rec.segment,
      status: "sent",
    });
    if (insErr) {
      if ((insErr as any).code === "23505") {
        result[rec.segment].skipped++;
        finishMetric(m, {
          ok: true,
          httpStatus: 200,
          errorCode: "skipped_duplicate",
        });
      } else {
        result[rec.segment].failed++;
        failures.push({
          email: rec.email,
          stage: "insert",
          error: insErr.message,
        });
        finishMetric(m, {
          ok: false,
          httpStatus: 500,
          errorCode: "insert_failed",
        });
      }
      continue;
    }

    const res = await sendEmail({
      to: rec.email,
      from: FROM,
      replyTo: REPLY_TO,
      subject: rec.subject,
      text: buildBody(rec),
      idempotencyKey: `reengage:${CAMPAIGN_ID}:${rec.userId}`,
    });

    if (res.ok) {
      result[rec.segment].sent++;
      await admin
        .from("campaign_sends")
        .update({ resend_message_id: res.id ?? null, status: "sent" })
        .eq("campaign_id", CAMPAIGN_ID)
        .eq("user_id", rec.userId);
      finishMetric(m, { ok: true, httpStatus: 200, errorCode: null });
    } else {
      result[rec.segment].failed++;
      failures.push({
        email: rec.email,
        stage: "send",
        error: res.error ?? "unknown",
      });
      await admin
        .from("campaign_sends")
        .update({
          status: "failed",
          error: (res.error ?? "unknown").slice(0, 300),
        })
        .eq("campaign_id", CAMPAIGN_ID)
        .eq("user_id", rec.userId);
      finishMetric(m, {
        ok: false,
        httpStatus: res.status ?? 500,
        errorCode: "send_failed",
      });
    }
  }

  return json({ mode: "live", campaign_id: CAMPAIGN_ID, result, failures });
});
