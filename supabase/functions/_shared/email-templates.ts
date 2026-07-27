// email-templates.ts — render the automation emails to { subject, html, text }.
// Pure functions, no I/O, no send. Email-safe HTML: inline styles + table layout
// for the CTA button (Outlook/Gmail render inline styles, not <style> blocks or
// flex/grid). Every email carries a working one-click unsubscribe link.
//
// Palette kept minimal + warm to match the landing (bg #f4ebda, slate accent
// #60617d, ink #2b2b2b, muted #7b675c) — but inlined, not tokenized, because
// email clients strip <style>/CSS-vars.

const BRAND = {
  bg: "#f4ebda",
  card: "#ffffff",
  ink: "#2b2b2b",
  muted: "#7b675c",
  accent: "#60617d",
  border: "#e6dcc7",
};

export type DigestJob = {
  title: string;
  company: string;
  location: string;
  url: string;
  band: string; // 'strong' | 'good' | ...
  scorePct: number; // 0-100, rounded
};

const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// First name only, for a warm-but-not-creepy greeting; falls back to "there".
const firstName = (full: string | null | undefined): string => {
  const n = String(full ?? "").trim().split(/\s+/)[0];
  return n && n.length > 1 ? n : "there";
};

function shell(innerHtml: string, unsubscribeUrl: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:4px 8px 16px;font:600 18px/1.2 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.accent};">Get&nbsp;A&nbsp;Job</td></tr>
<tr><td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:12px;padding:24px;">
${innerHtml}
</td></tr>
<tr><td style="padding:16px 8px;font:400 12px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.muted};">
You're receiving this because you signed up for Get A Job.
<a href="${esc(unsubscribeUrl)}" style="color:${BRAND.muted};text-decoration:underline;">Unsubscribe</a> from these emails.
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="border-radius:8px;background:${BRAND.accent};">
<a href="${esc(href)}" style="display:inline-block;padding:11px 20px;font:600 14px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(label)}</a>
</td></tr></table>`;
}

// ── Job-match digest ──────────────────────────────────────────────────────────
export function renderJobDigestEmail(args: {
  fullName?: string | null;
  jobs: DigestJob[];
  unsubscribeUrl: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const name = firstName(args.fullName);
  const n = args.jobs.length;
  const subject = `${n} new ${n === 1 ? "job that matches" : "jobs that match"} your profile`;

  const jobCards = args.jobs
    .map(
      (j) => `<tr><td style="padding:14px 0;border-bottom:1px solid ${BRAND.border};">
<div style="font:600 15px/1.3 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">${esc(j.title)}</div>
<div style="font:400 13px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.muted};padding-top:2px;">${esc(j.company)}${j.location ? " · " + esc(j.location) : ""}</div>
<div style="padding-top:8px;"><a href="${esc(j.url)}" style="font:600 13px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.accent};text-decoration:none;">View role &rarr;</a></div>
</td></tr>`,
    )
    .join("");

  const inner = `<div style="font:400 15px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
<p style="margin:0 0 8px;">Hi ${esc(name)},</p>
<p style="margin:0 0 16px;">Here ${n === 1 ? "is" : "are"} ${n} new ${n === 1 ? "role" : "roles"} that match your profile since we last checked:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${jobCards}</table>
<div style="padding-top:20px;">${ctaButton(args.appUrl, "See all your matches")}</div>
</div>`;

  const text = [
    `Hi ${name},`,
    ``,
    `Here ${n === 1 ? "is" : "are"} ${n} new ${n === 1 ? "role" : "roles"} that match your profile since we last checked:`,
    ``,
    ...args.jobs.map(
      (j) =>
        `- ${j.title} — ${j.company}${j.location ? " (" + j.location + ")" : ""}\n  ${j.url}`,
    ),
    ``,
    `See all your matches: ${args.appUrl}`,
    ``,
    `---`,
    `You're receiving this because you signed up for Get A Job.`,
    `Unsubscribe: ${args.unsubscribeUrl}`,
  ].join("\n");

  return { subject, html: shell(inner, args.unsubscribeUrl), text };
}

// ── Redesign announcement (to onboarded users) ────────────────────────────────
export function renderRedesignAnnouncementEmail(args: {
  fullName?: string | null;
  unsubscribeUrl: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const name = firstName(args.fullName);
  const subject = "Get A Job has a whole new look";

  const inner = `<div style="font:400 15px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
<p style="margin:0 0 12px;">Hi ${esc(name)},</p>
<p style="margin:0 0 12px;">We rebuilt the Get A Job experience, and it's live now. The Home page, job browsing, your CV bank, and the Coach have all been redesigned to make finding your next role feel clearer and calmer.</p>
<p style="margin:0 0 16px;">Come take a look.</p>
<div style="padding-top:4px;">${ctaButton(args.appUrl, "See what's new")}</div>
</div>`;

  const text = [
    `Hi ${name},`,
    ``,
    `We rebuilt the Get A Job experience, and it's live now. The Home page, job browsing, your CV bank, and the Coach have all been redesigned to make finding your next role feel clearer and calmer.`,
    ``,
    `Come take a look.`,
    ``,
    `See what's new: ${args.appUrl}`,
    ``,
    `---`,
    `You're receiving this because you signed up for Get A Job.`,
    `Unsubscribe: ${args.unsubscribeUrl}`,
  ].join("\n");

  return { subject, html: shell(inner, args.unsubscribeUrl), text };
}

// ── Onboarding-incomplete re-engagement ───────────────────────────────────────
export function renderReengagementEmail(args: {
  fullName?: string | null;
  unsubscribeUrl: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const name = firstName(args.fullName);
  const subject = "We rebuilt onboarding — come see your job matches";

  const inner = `<div style="font:400 15px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
<p style="margin:0 0 12px;">Hi ${esc(name)},</p>
<p style="margin:0 0 12px;">You started setting up your Get A Job profile but didn't finish — so you haven't seen your job matches yet.</p>
<p style="margin:0 0 16px;">We just rebuilt the setup flow to be much faster: a few quick questions and you're matched to real, current roles from Israeli tech companies. It takes about two minutes.</p>
<div style="padding-top:4px;">${ctaButton(args.appUrl, "Finish setting up")}</div>
</div>`;

  const text = [
    `Hi ${name},`,
    ``,
    `You started setting up your Get A Job profile but didn't finish — so you haven't seen your job matches yet.`,
    ``,
    `We just rebuilt the setup flow to be much faster: a few quick questions and you're matched to real, current roles from Israeli tech companies. It takes about two minutes.`,
    ``,
    `Finish setting up: ${args.appUrl}`,
    ``,
    `---`,
    `You're receiving this because you signed up for Get A Job.`,
    `Unsubscribe: ${args.unsubscribeUrl}`,
  ].join("\n");

  return { subject, html: shell(inner, args.unsubscribeUrl), text };
}
