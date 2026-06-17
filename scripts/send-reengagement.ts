// send-reengagement.ts (Deno) — reengagement campaign send harness, built
// on the welcome-email sender (_shared/send-email.ts: Resend + Idempotency-Key
// + reply_to). Models the welcome harness's sendEmail + function_metrics
// pattern, but resolves recipients by SEGMENT and merges per-segment slots.
//
// SAFETY: dry-run is the DEFAULT and the ONLY mode that runs without an
// explicit --live flag. Dry-run resolves segments + every merge slot and
// prints the full per-recipient list + per-segment counts, and SENDS NOTHING.
// Live send additionally requires --confirm=<N> matching the exact total, a
// per-segment cap, the RESEND_API_KEY env (function secret), and writes a
// per-recipient idempotency row to campaign_sends (see IDEMPOTENCY below).
//
// Creds: SUPABASE_SERVICE_ROLE_KEY (inline CLI pull at invocation, never
// printed) for DB reads + metrics + sent-log. RESEND_API_KEY only needed for
// --live. No user-JWT minting — sends go straight through Resend.
//
// Run (dry-run):
//   SUPABASE_SERVICE_ROLE_KEY="$(supabase projects api-keys --project-ref ilmqmodklutztuybsvwd | grep service_role | awk '{print $3}')" \
//     deno run --allow-net --allow-env scripts/send-reengagement.ts
//
// IDEMPOTENCY (recommendation, used by --live): two layers.
//   1. Persistent sent-log table `campaign_sends(campaign_id, user_id, ...)`
//      with UNIQUE(campaign_id, user_id). Before sending we INSERT ... the
//      send only proceeds if the row is newly created; a re-run finds the
//      row and skips. This is the durable guard (survives >24h, edits, retries).
//   2. Resend Idempotency-Key `reengage:<campaign_id>:<user_id>` — backstop
//      that dedupes within Resend's 24h window even if (1) races.
//   function_metrics is logging, not a uniqueness guard, so it is NOT the
//   idempotency source of truth — it records each attempt for observability.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Live-path sender (reused verbatim from the welcome harness). Not called in dry-run.
import { sendEmail } from "../supabase/functions/_shared/send-email.ts";

const URL = "https://ilmqmodklutztuybsvwd.supabase.co";
const APP = "https://getajob.careers";
const FROM = "Get A Job <noreply@getajob.careers>";
const REPLY_TO = "eli@getajob.careers"; // Eli's real inbox
const CAMPAIGN_ID = "reengage-2026-06"; // bump per campaign; part of idempotency key

const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
if (!SRK) {
  console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY required");
  Deno.exit(1);
}

const args = new Set(Deno.args);
const LIVE = args.has("--live");
const confirmArg = Deno.args.find((a) => a.startsWith("--confirm="));
const CONFIRM = confirmArg ? Number(confirmArg.split("=")[1]) : null;
const PER_SEGMENT_CAP = 50; // safety cap; live send aborts if any segment exceeds

const admin = createClient(URL, SRK, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Named memberships (explicit, from Eli) ─────────────────────────────────
const B_IDS = new Set([
  "a3eef263-d099-4538-a8d9-1944ab58c961", // Ido
  "cb6c2a44-3768-4a11-9d0a-9a608e9e1f37", // Adi
  "9518637e-2cc5-47ee-b7b8-a2e956554860", // Ofri
]);
const IDO = "a3eef263-d099-4538-a8d9-1944ab58c961";
const C_EMAILS = new Set(["redheadeg@gmail.com", "ybarshain@gmail.com"]); // stalled
// Never-confirmed: SEPARATE confirmation-email resend, NOT a campaign segment.
const NEVERCONFIRM_MATCH = (e: string) =>
  /rachelimiller24/i.test(e) ||
  /^jenna@bettear\.com$/i.test(e) ||
  /gulicheric/i.test(e);

// Title-case the derived first token; name-less recipients (most of D) get a
// neutral "there" (no email-handle fallback — "Hey adarevekalter," reads broken).
const titleCase = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const firstName = (full?: string | null) => {
  const tok = full?.trim().split(/\s+/)[0];
  return tok ? titleCase(tok) : "there";
};
// Hand-fixed outliers: title-case already fixes GIDON→Gidon / AMITAI→Amitai;
// Adi's full_name "Adiburshan" has no space, so override by id.
const NAME_OVERRIDE: Record<string, string> = {
  "cb6c2a44-3768-4a11-9d0a-9a608e9e1f37": "Adi",
};

// ── Load auth users (paginated) + profiles + career_roles ──────────────────
async function loadAuthUsers() {
  const out: any[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(`listUsers: ${error.message}`);
    out.push(...data.users);
    if (data.users.length < 200) break;
  }
  return out;
}

const authUsers = await loadAuthUsers();
const { data: profiles, error: pErr } = await admin
  .from("profiles")
  .select(
    "id, invite_code, onboarding_complete, full_name, five_year_role, primary_domain",
  );
if (pErr) {
  console.error("profiles:", pErr.message);
  Deno.exit(1);
}
const profById = new Map<string, any>(
  (profiles ?? []).map((p: any) => [p.id, p]),
);

const { data: roles } = await admin
  .from("career_roles")
  .select("user_id, title, track, goal_alignment_score");
const topRoleByUser = new Map<string, string>();
for (const r of (roles ?? []) as any[]) {
  if (r.track !== "track_1" || !r.title) continue;
  const cur = topRoleByUser.get(r.user_id);
  // keep the highest goal_alignment_score Track-1 title
  if (!cur)
    topRoleByUser.set(
      r.user_id,
      JSON.stringify({ t: r.title, s: r.goal_alignment_score ?? 0 }),
    );
  else {
    const prev = JSON.parse(cur);
    if ((r.goal_alignment_score ?? 0) > prev.s)
      topRoleByUser.set(
        r.user_id,
        JSON.stringify({ t: r.title, s: r.goal_alignment_score ?? 0 }),
      );
  }
}
// Clean-role rule: include {top_role} only when it resolves to a clean short
// label. Track-1 title preferred; else five_year_role/primary_domain — but if
// that's a long sentence (e.g. rpress13), DROP the role mention rather than
// printing prose. Returns null = omit the role line entirely (exclude no one).
const isCleanShortRole = (s: string) =>
  s.length > 0 &&
  s.length <= 48 &&
  s.split(/\s+/).length <= 7 &&
  !/[.,]/.test(s);
const roleLine = (uid: string, prof: any): string | null => {
  const c = topRoleByUser.get(uid);
  const candidate = (
    (c && JSON.parse(c).t) ||
    prof?.five_year_role ||
    prof?.primary_domain ||
    ""
  ).trim();
  return isCleanShortRole(candidate) ? candidate : null;
};

// ── Segment assignment (precedence: never-confirm → B → C → A → D) ──────────
type Rec = {
  email: string;
  segment: string;
  slots: Record<string, string>;
  links: string[];
  subject: string;
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
      email,
      segment: "D",
      slots: { first_name: fn },
      links: [`${APP}/Onboarding`],
      subject: "Still want help landing a role?",
    });
    continue;
  }
  // Has a profile but not in A/B/C: (null)/TEAMGETAJOB invite, or GETAJOBPILOT
  // not-onboarded that isn't one of the 2 named C users. NOT targeted.
  untargeted.push({
    email,
    why: `profile invite_code=${prof.invite_code ?? "(null)"} onboarded=${prof.onboarding_complete}`,
  });
}

// ── Locked body copy (rendered exactly here; the live path reuses buildBody) ─
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
  // D
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

// ── Per-segment counts ─────────────────────────────────────────────────────
const bySeg: Record<string, Rec[]> = { A: [], B: [], C: [], D: [] };
for (const r of recipients) bySeg[r.segment].push(r);

console.log("=== SEGMENT COUNTS ===");
for (const s of ["A", "B", "C", "D"]) console.log(`  ${s}: ${bySeg[s].length}`);
console.log(`  TOTAL campaign recipients: ${recipients.length}`);
console.log(
  `  never-confirmed (SEPARATE confirmation resend, NOT campaign): ${neverConfirm.length} → ${neverConfirm.join(", ")}`,
);
console.log(`  untargeted (excluded): ${untargeted.length}`);

console.log("\n=== PER-RECIPIENT (dry-run; nothing sent) ===");
for (const s of ["A", "B", "C", "D"]) {
  console.log(`\n-- Segment ${s} (${bySeg[s].length}) --`);
  for (const r of bySeg[s]) {
    console.log(`  ${r.email}`);
    console.log(`    subject: ${r.subject}`);
    console.log(`    slots:   ${JSON.stringify(r.slots)}`);
    if (s === "A")
      console.log(
        `    role:    ${r.slots.top_role ?? "(omitted — no clean short label)"}`,
      );
    console.log(`    links:   ${r.links.join("  ")}`);
  }
}
if (untargeted.length) {
  console.log("\n-- untargeted (for your audit) --");
  for (const u of untargeted) console.log(`  ${u.email}  (${u.why})`);
}

// ── LOCKED BODY COPY — fully-resolved samples (one+ per segment) ────────────
const SAMPLE_EMAILS = [
  "werner.gidon@gmail.com", // A — longest role line (Gidon)
  "ymayberg@gmail.com", // A — slash role (Yacova)
  "rpress13@gmail.com", // A — role omitted (Raphael)
  "idodagan1414@gmail.com", // B — Ido (company examples)
  "burshanadi62@gmail.com", // B — no-company block (Adi)
  "redheadeg@gmail.com", // C — stalled (Ella)
  "adarevekalter@gmail.com", // D — cold no-profile (there)
];
console.log(
  "\n\n================ LOCKED BODY COPY (fully resolved) ================",
);
for (const se of SAMPLE_EMAILS) {
  const r = recipients.find((x) => x.email === se);
  if (!r) {
    console.log(`\n(${se} not in recipients)`);
    continue;
  }
  console.log(`\n----- Segment ${r.segment} — ${r.email} -----`);
  console.log(`From:     ${FROM}`);
  console.log(`Reply-To: ${REPLY_TO}`);
  console.log(`Subject:  ${r.subject}`);
  console.log("");
  console.log(buildBody(r));
}

if (!LIVE) {
  console.log(
    "\n[DRY-RUN] No emails sent. Re-run with --live --confirm=<total> to send (gated).",
  );
  Deno.exit(0);
}

// ── LIVE SEND (gated) ───────────────────────────────────────────────────────
if (CONFIRM !== recipients.length) {
  console.error(
    `LIVE ABORTED: --confirm=${CONFIRM} does not match resolved total ${recipients.length}.`,
  );
  Deno.exit(1);
}
for (const s of ["A", "B", "C", "D"]) {
  if (bySeg[s].length > PER_SEGMENT_CAP) {
    console.error(
      `LIVE ABORTED: segment ${s} (${bySeg[s].length}) exceeds PER_SEGMENT_CAP ${PER_SEGMENT_CAP}.`,
    );
    Deno.exit(1);
  }
}
if (!Deno.env.get("RESEND_API_KEY")) {
  console.error("LIVE ABORTED: RESEND_API_KEY not set.");
  Deno.exit(1);
}
console.error(
  "LIVE send path is wired but intentionally not exercised in this build — copy is not locked. Stopping.",
);
Deno.exit(2);
