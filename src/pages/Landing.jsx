/*
 * Landing.jsx — public landing page for getajob.careers
 *
 * ─── DESIGN-TOKEN DIVERGENCE ─────────────────────────────────────────────
 * This page INTENTIONALLY uses its own visual system, distinct from the
 * authenticated dashboard. The dashboard is the canonical token system; the
 * landing page is a one-off marketing surface that diverges on purpose.
 *
 *                      Dashboard                Landing (this file)
 *  Background          #FAFAFA neutral          #FBF7F0 warm cream
 *  Primary text        #0A0A0A near-black       #1A1612 ink-with-brown
 *  Accent              gradient (indigo→violet) #E86833 orange (Fraunces+accent)
 *  Typography          Geist (sans only)        Fraunces (display) + Geist
 *  Border radius       rounded-lg / -xl         8 / 14 / 20px tokens
 *
 * Why diverge: the landing page sells a feeling (warmth, deliberateness,
 * editorial trust); the dashboard is a tool (neutrality, density, fast scan).
 * Same brand, different jobs.
 *
 * Rules going forward:
 *   1. Any NEW shared component (button, card, input) should map to the
 *      DASHBOARD tokens — those are the system of record.
 *   2. Landing-specific components live here; if we extract them later
 *      they go under src/components/landing/ with their own token file.
 *   3. Do not import shadcn primitives into this file. The landing has its
 *      own button/input styles to keep the visual system pure.
 *
 * ─── DECISIONS MADE PRE-BUILD (from V3 design review) ───────────────────
 *   • Hero CTA → invite-code signup; waitlist gate kicks in at cap.
 *   • "Career operating system" defined inline on first use.
 *   • Help Agent dropped (4 agents, not 5).
 *   • Timeline Day 6 = outreach.
 *   • No social proof claims (no pseudo-quotes, no name credits).
 *   • Pain card #1 broadened from "ChatGPT" to "AI tools that don't know you".
 *   • Students section keeps practicum/internship framing, drops Reichman.
 *   • FAQ data answer: explicit 30-day OpenAI retention statement.
 *
 * ─── KNOWN INFRASTRUCTURE GAPS (follow-up PRs) ──────────────────────────
 *   • Cap-check: this file reads `?cap=hit` to toggle waitlist state for
 *     preview/testing. Real cap-check needs a public RPC like
 *     `public.get_pilot_status()` (SECURITY DEFINER, SELECT COUNT auth.users).
 *   • Waitlist persistence: the submit handler currently stubs to
 *     localStorage + console + toast. Production needs a `waitlist` table
 *     with anon INSERT policy and an idempotent-by-email constraint.
 *   • Invite-code signup flow: the "Get an invite" CTA routes to /Login
 *     today. The invite-code gate (signup blocked unless code is valid)
 *     belongs in Login.jsx + a `signup_invite_codes` table.
 */

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

// ────────────────────────────────────────────────────────────────────────
// Inline CSS — landing-page tokens. See file header for the dashboard-vs-
// landing divergence rationale. Mobile breakpoints added at 900px and 640px.
// ────────────────────────────────────────────────────────────────────────

const LANDING_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600;700;800;900&display=swap');
.lp {
  /* Direction 3 — "Bold Neutral" tokens (locked 2026-05-20).
   * Warm slate background + electric coral accent + Geist-only typography.
   * Distinct from the warm-cream-and-serif Claude family identity that the
   * previous palette inherited. Home.jsx uses the same tokens. */
  --lp-bg: #F4F4F2;
  --lp-bg-tinted: #E8E8E5;
  --lp-ink: #0E1014;
  --lp-ink-soft: #52545A;
  --lp-ink-faded: #9C9DA1;
  --lp-accent: #F87060;
  --lp-accent-deep: #C84F40;
  --lp-accent-tint: #FDE7E3;
  --lp-green: #1D7556;
  --lp-green-tint: #DBEEE5;
  --lp-blue: #2B5DC4;
  --lp-blue-tint: #DEE6F7;
  --lp-violet: #6B4FBF;
  --lp-violet-tint: #E7E0F5;
  --lp-amber: #B8841C;
  --lp-amber-tint: #F5E8C9;
  --lp-ink-card: #0E1014;
  --lp-line: #DDDDDB;
  --lp-line-soft: #E8E8E5;
  --lp-card: #FFFFFF;
  --lp-radius-sm: 8px;
  --lp-radius: 14px;
  --lp-radius-lg: 20px;
  /* Geist for display at large sizes with tight tracking. No serif anywhere. */
  --lp-font-display: 'Geist', system-ui, sans-serif;
  --lp-font-body: 'Geist', system-ui, sans-serif;
  --lp-font-mono: 'Geist Mono', ui-monospace, monospace;
  font-family: var(--lp-font-body);
  color: var(--lp-ink);
  background: var(--lp-bg);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}
.lp * { margin: 0; padding: 0; box-sizing: border-box; }
.lp html { scroll-behavior: smooth; }

.lp-nav { display: flex; justify-content: space-between; align-items: center; padding: 22px 40px; max-width: 1180px; margin: 0 auto; }
.lp-logo { display: flex; align-items: baseline; gap: 6px; }
.lp-logo-mark { font-family: var(--lp-font-display); font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: var(--lp-ink); }
.lp-logo-dot { width: 7px; height: 7px; background: var(--lp-accent); border-radius: 50%; display: inline-block; transform: translateY(-2px); }
.lp-nav-links { display: flex; gap: 36px; align-items: center; }
.lp-nav-links a { font-size: 14px; color: var(--lp-ink-soft); text-decoration: none; font-weight: 500; transition: color 0.15s; }
.lp-nav-links a:hover { color: var(--lp-ink); }

.lp .btn { display: inline-flex; align-items: center; gap: 6px; padding: 11px 22px; border-radius: 100px; font-size: 14px; font-weight: 600; font-family: var(--lp-font-body); cursor: pointer; text-decoration: none; border: none; transition: transform 0.15s ease, background 0.15s ease; }
.lp .btn:hover { transform: translateY(-1px); }
.lp .btn:active { transform: scale(0.97); }
.lp .btn-primary { background: var(--lp-ink-card); color: var(--lp-bg); box-shadow: 0 4px 16px rgba(232, 104, 51, 0.18); }
.lp .btn-primary:hover { background: var(--lp-accent); }
.lp .btn-accent { background: var(--lp-accent); color: white; box-shadow: 0 4px 18px rgba(232, 104, 51, 0.22); }
.lp .btn-accent:hover { background: var(--lp-accent-deep); }
.lp .btn-ghost { background: transparent; color: var(--lp-ink); border: 1px solid var(--lp-line); }
.lp .btn-ghost:hover { background: var(--lp-bg-tinted); }

.lp-hero { padding: 60px 40px 40px; max-width: 1180px; margin: 0 auto; }
.lp-hero-tag { display: inline-flex; align-items: center; gap: 8px; font-family: var(--lp-font-mono); font-size: 12px; font-weight: 500; color: var(--lp-ink-soft); padding: 5px 12px; border: 1px solid var(--lp-line); border-radius: 100px; background: var(--lp-card); margin-bottom: 26px; letter-spacing: 0.02em; }
.lp-hero-tag .pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--lp-green); position: relative; }
.lp-hero-tag .pulse::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; background: var(--lp-green); opacity: 0.4; animation: lp-pulse 2s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .lp-hero-tag .pulse::after { animation: none; }
}
@keyframes lp-pulse { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(2.4); opacity: 0; } }

.lp-hero-title { font-family: var(--lp-font-display); font-size: 64px; font-weight: 700; line-height: 1.04; letter-spacing: -0.035em; max-width: 880px; margin-bottom: 24px; color: var(--lp-ink); }
/* Italic dropped with Direction 3 — Geist italics read awkward at display sizes.
   Differentiate via accent color + slightly lighter weight instead. */
.lp-hero-title .accent { color: var(--lp-accent); font-weight: 500; }
.lp-hero-sub { font-size: 19px; line-height: 1.55; color: var(--lp-ink-soft); max-width: 640px; margin-bottom: 38px; font-weight: 400; }
.lp-hero-sub strong { color: var(--lp-ink); font-weight: 600; }
.lp-hero-cta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.lp-hero-cta-note { font-size: 13px; color: var(--lp-ink-faded); margin-left: 4px; }

.lp-product { max-width: 1100px; margin: 60px auto 0; padding: 0 40px; }
.lp-product-frame { background: var(--lp-ink-card); border-radius: var(--lp-radius-lg); padding: 14px; position: relative; box-shadow: 0 30px 80px -20px rgba(26, 22, 18, 0.25), 0 8px 24px rgba(232, 104, 51, 0.06); }
.lp-product-chrome { display: flex; align-items: center; gap: 6px; padding: 6px 8px 12px; }
.lp-product-chrome span { width: 11px; height: 11px; border-radius: 50%; }
.lp-product-chrome span:nth-child(1) { background: #FF5F57; }
.lp-product-chrome span:nth-child(2) { background: #FEBC2E; }
.lp-product-chrome span:nth-child(3) { background: #28C840; }
.lp-product-chrome .url { margin-left: 14px; font-family: var(--lp-font-mono); font-size: 11px; color: rgba(255,255,255,0.5); }
.lp-product-body { background: var(--lp-bg); border-radius: 12px; padding: 18px; display: grid; grid-template-columns: 180px 1fr 220px; gap: 14px; min-height: 340px; }
.lp-p-sidebar { background: var(--lp-bg-tinted); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 3px; }
.lp-p-sidebar-brand { font-family: var(--lp-font-display); font-size: 14px; font-weight: 700; padding: 4px 8px 12px; }
.lp-p-side-item { display: flex; align-items: center; gap: 9px; padding: 7px 10px; border-radius: 7px; font-size: 12.5px; color: var(--lp-ink-soft); font-weight: 500; }
.lp-p-side-item i { font-size: 15px; }
.lp-p-side-item.active { background: white; color: var(--lp-ink); box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.lp-p-main { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.lp-p-greeting { font-size: 11px; color: var(--lp-ink-faded); font-family: var(--lp-font-mono); letter-spacing: 0.05em; }
.lp-p-stat-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.lp-p-stat { background: var(--lp-bg-tinted); border-radius: 10px; padding: 12px 14px; min-width: 0; }
.lp-p-stat .lbl { font-size: 10px; color: var(--lp-ink-faded); font-family: var(--lp-font-mono); margin-bottom: 6px; letter-spacing: 0.06em; text-transform: uppercase; line-height: 1.2; white-space: nowrap; }
.lp-p-stat .num { font-family: var(--lp-font-display); font-size: 26px; font-weight: 600; line-height: 1; }
.lp-p-stat .num.g { color: var(--lp-green); }
.lp-p-stat .num.b { color: var(--lp-blue); }
.lp-p-stat .num.v { color: var(--lp-violet); }
.lp-p-roles { background: var(--lp-bg-tinted); border-radius: 10px; padding: 13px 14px; flex: 1; }
.lp-p-roles-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.lp-p-roles-head h4 { font-family: var(--lp-font-display); font-size: 13px; font-weight: 600; }
.lp-p-roles-head .tag { font-family: var(--lp-font-mono); font-size: 10px; color: var(--lp-ink-faded); }
.lp-p-role { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid rgba(229, 220, 204, 0.7); font-size: 12.5px; font-weight: 500; }
.lp-p-role:last-child { border-bottom: none; }
.lp-p-tier { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 100px; font-family: var(--lp-font-mono); letter-spacing: 0.02em; }
.lp-t1 { background: var(--lp-green-tint); color: var(--lp-green); }
.lp-t2 { background: var(--lp-blue-tint); color: var(--lp-blue); }
.lp-t3 { background: var(--lp-violet-tint); color: var(--lp-violet); }
.lp-p-right { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.lp-p-action { background: var(--lp-ink-card); color: white; border-radius: 10px; padding: 14px; position: relative; overflow: hidden; }
.lp-p-action::after { content: ''; position: absolute; top: -40px; right: -20px; width: 80px; height: 80px; border-radius: 50%; background: var(--lp-accent); opacity: 0.15; }
.lp-p-action .eyebrow { font-family: var(--lp-font-mono); font-size: 10px; color: var(--lp-accent); letter-spacing: 0.05em; margin-bottom: 5px; }
.lp-p-action p { font-size: 12.5px; line-height: 1.42; font-weight: 500; color: white; }
.lp-p-stories { background: var(--lp-bg-tinted); border-radius: 10px; padding: 13px 14px; flex: 1; }
.lp-p-stories h4 { font-family: var(--lp-font-display); font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.lp-p-story { font-size: 11.5px; color: var(--lp-ink-soft); padding: 6px 0; border-bottom: 1px solid rgba(229, 220, 204, 0.7); line-height: 1.4; }
.lp-p-story:last-child { border-bottom: none; }
.lp-p-story strong { color: var(--lp-ink); font-weight: 600; }

@media (max-width: 900px) {
  .lp-product-body { grid-template-columns: 180px 1fr; }
  .lp-p-right { display: none; }
}
@media (max-width: 640px) {
  .lp-product-body { grid-template-columns: 1fr; padding: 14px; }
  .lp-p-sidebar { display: none; }
}

.lp-explainer { padding: 100px 40px 80px; max-width: 1180px; margin: 0 auto; }
.lp-explainer-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 80px; align-items: start; }
.lp-explainer-eyebrow { font-family: var(--lp-font-mono); font-size: 12px; color: var(--lp-accent); font-weight: 500; letter-spacing: 0.06em; margin-bottom: 18px; }
.lp-explainer h2 { font-family: var(--lp-font-display); font-size: 44px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.1; margin-bottom: 24px; }
.lp-explainer p { font-size: 17px; line-height: 1.6; color: var(--lp-ink-soft); margin-bottom: 16px; }
.lp-explainer p strong { color: var(--lp-ink); font-weight: 600; }
.lp-explainer-card { background: var(--lp-card); border-radius: var(--lp-radius); padding: 28px; border: 1px solid var(--lp-line); box-shadow: 0 4px 24px rgba(184, 80, 31, 0.04); }
.lp-explainer-card h3 { font-family: var(--lp-font-display); font-size: 18px; font-weight: 600; margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }
.lp-explainer-card h3 i { font-size: 22px; color: var(--lp-accent); }
.lp-explainer-card ul { list-style: none; }
.lp-explainer-card li { display: flex; gap: 10px; padding: 9px 0; font-size: 14.5px; color: var(--lp-ink-soft); border-bottom: 1px solid var(--lp-line-soft); line-height: 1.5; }
.lp-explainer-card li:last-child { border-bottom: none; }
.lp-explainer-card li i { color: var(--lp-green); font-size: 17px; flex-shrink: 0; margin-top: 1px; }

@media (max-width: 900px) {
  .lp-explainer-grid { grid-template-columns: 1fr; gap: 40px; }
}

.lp-pain { padding: 70px 40px; background: var(--lp-bg-tinted); border-top: 1px solid var(--lp-line-soft); border-bottom: 1px solid var(--lp-line-soft); }
.lp-pain-wrap { max-width: 1100px; margin: 0 auto; }
.lp-pain h2 { font-family: var(--lp-font-display); font-size: 36px; font-weight: 700; letter-spacing: -0.02em; max-width: 600px; margin-bottom: 50px; line-height: 1.15; }
.lp-pain-grid { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 18px; }
.lp-pain-card { background: var(--lp-card); border-radius: var(--lp-radius); padding: 26px; border: 1px solid var(--lp-line); }
.lp-pain-card:first-child { background: var(--lp-ink-card); color: var(--lp-bg); border-color: var(--lp-ink-card); }
.lp-pain-card:first-child .lp-pain-h { color: white; }
.lp-pain-card:first-child .lp-pain-p { color: rgba(255,255,255,0.65); }
.lp-pain-card:first-child .lp-pain-mock { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
.lp-pain-card:first-child .lp-pain-mock-line { background: rgba(255,255,255,0.12); }
.lp-pain-h { font-family: var(--lp-font-display); font-size: 19px; font-weight: 600; margin-bottom: 8px; line-height: 1.25; }
.lp-pain-p { font-size: 14px; color: var(--lp-ink-soft); line-height: 1.5; margin-bottom: 16px; }
.lp-pain-mock { background: var(--lp-bg-tinted); border: 1px solid var(--lp-line); border-radius: 8px; padding: 12px; margin-top: 14px; }
.lp-pain-mock-line { height: 6px; background: var(--lp-line); border-radius: 100px; margin-bottom: 5px; }
.lp-pain-mock-line:nth-child(1) { width: 100%; }
.lp-pain-mock-line:nth-child(2) { width: 88%; }
.lp-pain-mock-line:nth-child(3) { width: 65%; }

@media (max-width: 800px) {
  .lp-pain-grid { grid-template-columns: 1fr; }
}

.lp-agents { padding: 120px 40px 80px; max-width: 1180px; margin: 0 auto; }
.lp-section-eyebrow { font-family: var(--lp-font-mono); font-size: 12px; color: var(--lp-accent); font-weight: 500; letter-spacing: 0.06em; margin-bottom: 18px; }
.lp-section-head { display: flex; justify-content: space-between; align-items: end; gap: 60px; margin-bottom: 50px; }
.lp-section-head-left { max-width: 580px; }
.lp-section-head h2 { font-family: var(--lp-font-display); font-size: 44px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.1; }
.lp-section-head h2 .strike { text-decoration: line-through; text-decoration-color: var(--lp-accent); text-decoration-thickness: 3px; color: var(--lp-ink-faded); }
.lp-section-head-right { font-size: 15px; color: var(--lp-ink-soft); line-height: 1.55; max-width: 380px; }
.lp-agents-grid { display: grid; grid-template-columns: repeat(6, 1fr); grid-template-rows: auto auto; gap: 14px; }
.lp-agent { background: var(--lp-card); border-radius: var(--lp-radius); padding: 24px; border: 1px solid var(--lp-line); transition: transform 0.2s ease, box-shadow 0.2s ease; display: flex; flex-direction: column; }
.lp-agent:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(184, 80, 31, 0.08); }
.lp-agent-a { grid-column: span 3; }
.lp-agent-b { grid-column: span 3; }
.lp-agent-c { grid-column: span 2; }
.lp-agent-d { grid-column: span 2; }
.lp-agent-e { grid-column: span 2; }
.lp-agent-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 18px; }
.lp-agent-icon.career { background: var(--lp-accent-tint); color: var(--lp-accent); }
.lp-agent-icon.cv { background: var(--lp-green-tint); color: var(--lp-green); }
.lp-agent-icon.interview { background: var(--lp-blue-tint); color: var(--lp-blue); }
.lp-agent-icon.skill { background: var(--lp-violet-tint); color: var(--lp-violet); }
.lp-agent-name { font-family: var(--lp-font-display); font-size: 19px; font-weight: 600; margin-bottom: 6px; }
.lp-agent-desc { font-size: 14px; color: var(--lp-ink-soft); line-height: 1.55; margin-bottom: 14px; flex: 1; }
.lp-agent-quote { background: var(--lp-bg-tinted); border-left: 2px solid var(--lp-accent); padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 13px; color: var(--lp-ink); font-style: italic; line-height: 1.45; }

/* Four agents (Help dropped). Layout: 3+3 / 2+2+2 → with 4 agents we
   pair as 3+3 on row 1 and 3+3 on row 2 (Interview + Skill each span 3
   to keep them equal-weight instead of half-width orphans). */
@media (max-width: 1024px) {
  .lp-agents-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-agent-a, .lp-agent-b, .lp-agent-c, .lp-agent-d, .lp-agent-e { grid-column: span 1; }
}
@media (max-width: 640px) {
  .lp-agents-grid { grid-template-columns: 1fr; }
  .lp-section-head { flex-direction: column; align-items: start; gap: 16px; }
}

.lp-spine { padding: 90px 40px; background: var(--lp-ink-card); color: var(--lp-bg); margin: 40px 0 0; }
.lp-spine-wrap { max-width: 1180px; margin: 0 auto; }
.lp-spine .lp-section-eyebrow { color: var(--lp-accent); }
.lp-spine .lp-section-head h2 { color: white; max-width: 620px; }
.lp-spine .lp-section-head-right { color: rgba(255,255,255,0.6); }
.lp-spine-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 16px; }
.lp-spine-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--lp-radius); padding: 26px; transition: background 0.2s ease, border-color 0.2s ease; }
.lp-spine-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(232, 104, 51, 0.25); }
.lp-spine-card-big { grid-row: span 2; display: flex; flex-direction: column; }
.lp-spine-card-icon { display: inline-flex; align-items: center; gap: 6px; font-family: var(--lp-font-mono); font-size: 11px; color: var(--lp-accent); font-weight: 500; letter-spacing: 0.05em; margin-bottom: 16px; padding: 4px 10px; background: rgba(232, 104, 51, 0.1); border-radius: 100px; align-self: flex-start; }
.lp-spine-card h3 { font-family: var(--lp-font-display); font-size: 22px; font-weight: 600; margin-bottom: 10px; color: white; letter-spacing: -0.015em; }
.lp-spine-card-big h3 { font-size: 26px; }
.lp-spine-card p { font-size: 14px; color: rgba(255,255,255,0.65); line-height: 1.6; }
.lp-spine-card-visual { margin-top: 22px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,0.08); flex: 1; display: flex; flex-direction: column; }
.lp-spine-card-visual-label { font-family: var(--lp-font-mono); font-size: 10px; color: rgba(255,255,255,0.45); letter-spacing: 0.08em; margin-bottom: 12px; text-transform: uppercase; }
.lp-spine-pills { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-start; }
.lp-spine-pill { font-family: var(--lp-font-mono); font-size: 11px; padding: 5px 11px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.7); }
.lp-spine-pill.glow { border-color: var(--lp-accent); color: var(--lp-accent); }

@media (max-width: 900px) {
  .lp-spine-grid { grid-template-columns: 1fr 1fr; }
  .lp-spine-card-big { grid-row: auto; grid-column: span 2; }
}
@media (max-width: 640px) {
  .lp-spine-grid { grid-template-columns: 1fr; }
  .lp-spine-card-big { grid-column: span 1; }
}

.lp-students { padding: 80px 40px; max-width: 1180px; margin: 0 auto; }
.lp-students-head { margin-bottom: 32px; }
.lp-students-head h2 { font-family: var(--lp-font-display); font-size: 32px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; max-width: 620px; }
.lp-students-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.lp-student-card { background: var(--lp-card); border: 1px solid var(--lp-line); border-radius: var(--lp-radius); padding: 28px; display: flex; gap: 20px; align-items: start; }
.lp-student-icon { width: 48px; height: 48px; border-radius: 12px; background: var(--lp-accent-tint); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lp-student-icon i { font-size: 22px; color: var(--lp-accent); }
.lp-student-card h4 { font-family: var(--lp-font-display); font-size: 19px; font-weight: 600; margin-bottom: 6px; }
.lp-student-card p { font-size: 14px; color: var(--lp-ink-soft); line-height: 1.55; }

@media (max-width: 700px) {
  .lp-students-grid { grid-template-columns: 1fr; }
}

.lp-timeline { padding: 100px 40px; background: var(--lp-bg-tinted); border-top: 1px solid var(--lp-line-soft); }
.lp-timeline-wrap { max-width: 1100px; margin: 0 auto; }
.lp-timeline h2 { font-family: var(--lp-font-display); font-size: 40px; font-weight: 700; letter-spacing: -0.025em; max-width: 700px; margin-bottom: 12px; line-height: 1.1; }
.lp-timeline-sub { font-size: 16px; color: var(--lp-ink-soft); margin-bottom: 48px; }
.lp-timeline-list { display: flex; flex-direction: column; gap: 0; border-top: 1px solid var(--lp-line); }
.lp-tl-row { display: grid; grid-template-columns: 100px 1fr 220px; gap: 32px; align-items: center; padding: 24px 0; border-bottom: 1px solid var(--lp-line); }
.lp-tl-day { font-family: var(--lp-font-mono); font-size: 13px; color: var(--lp-accent); font-weight: 500; letter-spacing: 0.05em; }
.lp-tl-action { font-family: var(--lp-font-display); font-size: 20px; font-weight: 600; line-height: 1.25; letter-spacing: -0.01em; }
.lp-tl-detail { font-size: 13.5px; color: var(--lp-ink-soft); line-height: 1.5; }

@media (max-width: 800px) {
  .lp-tl-row { grid-template-columns: 80px 1fr; gap: 16px; }
  .lp-tl-detail { grid-column: 2; padding-top: 4px; }
}

.lp-cta { padding: 110px 40px; max-width: 760px; margin: 0 auto; }
.lp-cta-eyebrow { font-family: var(--lp-font-mono); font-size: 12px; color: var(--lp-accent); font-weight: 500; letter-spacing: 0.06em; margin-bottom: 18px; }
.lp-cta h2 { font-family: var(--lp-font-display); font-size: 56px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.05; margin-bottom: 20px; }
.lp-cta p { font-size: 17px; color: var(--lp-ink-soft); line-height: 1.55; margin-bottom: 36px; max-width: 540px; }
.lp-cta-form { display: flex; gap: 10px; max-width: 480px; }
.lp-cta-form input { flex: 1; padding: 14px 20px; border-radius: 100px; border: 1.5px solid var(--lp-line); font-size: 14.5px; font-family: var(--lp-font-body); background: var(--lp-card); outline: none; transition: border-color 0.15s; color: var(--lp-ink); }
.lp-cta-form input:focus { border-color: var(--lp-accent); box-shadow: 0 0 0 4px rgba(232, 104, 51, 0.12); }
.lp-cta-meta { display: flex; gap: 18px; margin-top: 24px; font-size: 13px; color: var(--lp-ink-faded); flex-wrap: wrap; }
.lp-cta-meta span { display: flex; align-items: center; gap: 6px; }
.lp-cta-meta i { font-size: 14px; color: var(--lp-green); }

@media (max-width: 640px) {
  .lp-cta h2 { font-size: 40px; }
  .lp-cta-form { flex-direction: column; }
  .lp-hero-title { font-size: 44px; }
}

.lp-faq { padding: 60px 40px 80px; max-width: 760px; margin: 0 auto; }
.lp-faq h2 { font-family: var(--lp-font-display); font-size: 32px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px; }
.lp-faq-sub { font-size: 15px; color: var(--lp-ink-soft); margin-bottom: 36px; }
.lp-faq-item { border-top: 1px solid var(--lp-line); padding: 22px 0; }
.lp-faq-item:last-child { border-bottom: 1px solid var(--lp-line); }
.lp-faq-q { font-size: 16px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: var(--lp-ink); background: none; border: none; width: 100%; text-align: left; font-family: var(--lp-font-body); padding: 0; }
.lp-faq-q i { font-size: 18px; color: var(--lp-ink-faded); transition: transform 0.2s; flex-shrink: 0; margin-left: 16px; }
.lp-faq-a { font-size: 14.5px; color: var(--lp-ink-soft); line-height: 1.65; max-height: 0; overflow: hidden; transition: max-height 0.3s, padding 0.3s; }
.lp-faq-item.open .lp-faq-a { max-height: 400px; padding-top: 14px; }
.lp-faq-item.open .lp-faq-q i { transform: rotate(180deg); }

.lp-foot { padding: 36px 40px; border-top: 1px solid var(--lp-line); display: flex; justify-content: space-between; align-items: center; max-width: 1180px; margin: 0 auto; font-size: 13px; color: var(--lp-ink-faded); flex-wrap: wrap; gap: 16px; }
.lp-foot-links a { color: var(--lp-ink-faded); text-decoration: none; margin-left: 28px; }
.lp-foot-links a:hover { color: var(--lp-ink); }

/* Waitlist modal */
.lp-modal-overlay { position: fixed; inset: 0; background: rgba(15, 13, 10, 0.5); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
.lp-modal { background: var(--lp-card); border-radius: var(--lp-radius); padding: 36px; max-width: 480px; width: 100%; box-shadow: 0 24px 60px rgba(26, 22, 18, 0.25); }
.lp-modal-eyebrow { font-family: var(--lp-font-mono); font-size: 11px; color: var(--lp-accent); letter-spacing: 0.06em; margin-bottom: 12px; }
.lp-modal h3 { font-family: var(--lp-font-display); font-size: 28px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; margin-bottom: 10px; }
.lp-modal p { font-size: 15px; color: var(--lp-ink-soft); line-height: 1.55; margin-bottom: 20px; }
.lp-modal-form { display: flex; flex-direction: column; gap: 10px; }
.lp-modal-form input { padding: 14px 20px; border-radius: 100px; border: 1.5px solid var(--lp-line); font-size: 14.5px; font-family: var(--lp-font-body); background: var(--lp-bg); outline: none; transition: border-color 0.15s; color: var(--lp-ink); }
.lp-modal-form input:focus { border-color: var(--lp-accent); box-shadow: 0 0 0 4px rgba(232, 104, 51, 0.12); }
.lp-modal-actions { display: flex; gap: 8px; align-items: center; justify-content: flex-end; margin-top: 4px; }
.lp-modal-success { text-align: center; padding: 12px 0 4px; }
.lp-modal-success i { font-size: 40px; color: var(--lp-green); }

@media (max-width: 960px) {
  .lp-nav-links { gap: 20px; }
  .lp-nav-links a:not(.btn) { display: none; }
}
`;

// ────────────────────────────────────────────────────────────────────────
// Schema.org structured data (Organization + FAQPage). Injected as JSON-LD
// into <head> via the head effect below.
// ────────────────────────────────────────────────────────────────────────

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Get A Job",
  url: "https://getajob.careers",
  description:
    "An AI-powered career operating system — five specialist agents and a connected workspace that remembers your full background.",
};

const FAQ_ITEMS = [
  {
    q: "What data do you collect, and where does it go?",
    a: "Your data is sent to OpenAI to power AI features. OpenAI doesn't train on API data and deletes it after 30 days. We don't sell data, we don't run ads, and you can delete your account at any time.",
  },
  {
    q: "Can I delete my account?",
    a: "Yes. From your Settings page, type a confirmation phrase, and your account plus every associated record is deleted. Not a soft-delete. Not a 30-day grace period that hides your data. Gone.",
  },
  {
    q: "What AI is under the hood?",
    a: "OpenAI's most capable models. Every output has anti-fabrication safeguards — the CV agent literally cannot invent a metric or accomplishment. If your Story Bank doesn't have it, the CV doesn't either.",
  },
  {
    q: "How much does it cost after the trial?",
    a: "$12/month. Full access to all four agents and every tool. No free tier, no feature-gating, no upsells.",
  },
  {
    q: "What if the agents get something wrong?",
    a: "They will, sometimes — that's the honest answer. Every output is editable. Every tailored CV gets a review pass before you send it. The agents are augmenting your judgment, not replacing it.",
  },
];

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

// ────────────────────────────────────────────────────────────────────────
// Document head effect: title, meta tags, Tabler icons CDN, structured data.
// Restores defaults on unmount so navigating away from /Landing doesn't
// keep the marketing-page metadata applied to the dashboard.
// ────────────────────────────────────────────────────────────────────────

function useLandingHead() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Get A Job — A career operating system, not a chatbot";

    const setOrUpdate = (selector, attrs) => {
      let el = document.head.querySelector(selector);
      const wasExisting = !!el;
      if (!el) {
        el = document.createElement(
          selector.startsWith("link") ? "link" : selector.startsWith("script") ? "script" : "meta",
        );
        document.head.appendChild(el);
      }
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      return { el, wasExisting };
    };

    const description =
      "Five AI agents and one connected workspace — career roadmap, tailored CVs, LinkedIn content, interview prep, story bank. Built for real job searches.";

    const meta = [
      setOrUpdate('meta[name="description"]', { name: "description", content: description }),
      setOrUpdate('meta[property="og:title"]', {
        property: "og:title",
        content: "Get A Job — A career operating system, not a chatbot",
      }),
      setOrUpdate('meta[property="og:description"]', { property: "og:description", content: description }),
      setOrUpdate('meta[property="og:type"]', { property: "og:type", content: "website" }),
      setOrUpdate('meta[property="og:url"]', { property: "og:url", content: "https://getajob.careers" }),
      setOrUpdate('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" }),
    ];

    // Tabler icons webfont via CDN — matches the icon classes used in JSX.
    let tablerLink = document.head.querySelector('link[data-lp-tabler]');
    const tablerExisted = !!tablerLink;
    if (!tablerLink) {
      tablerLink = document.createElement("link");
      tablerLink.rel = "stylesheet";
      tablerLink.href = "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css";
      tablerLink.setAttribute("data-lp-tabler", "");
      document.head.appendChild(tablerLink);
    }

    // Structured data
    const schemas = [ORGANIZATION_SCHEMA, FAQ_SCHEMA];
    const schemaNodes = schemas.map((s) => {
      const node = document.createElement("script");
      node.type = "application/ld+json";
      node.setAttribute("data-lp-schema", "");
      node.textContent = JSON.stringify(s);
      document.head.appendChild(node);
      return node;
    });

    return () => {
      document.title = prevTitle;
      // Only remove the meta tags WE added. If they pre-existed (e.g. set
      // by index.html), leave the values as we found them since other
      // pages may rely on the index defaults.
      meta.forEach(({ el, wasExisting }) => {
        if (!wasExisting) el.remove();
      });
      if (!tablerExisted) tablerLink.remove();
      schemaNodes.forEach((n) => n.remove());
    };
  }, []);
}

// ────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────

function LandingNav({ isLoggedIn, onCTA }) {
  return (
    <nav className="lp-nav">
      <div className="lp-logo">
        <span className="lp-logo-mark">getajob</span>
        <span className="lp-logo-dot" />
      </div>
      <div className="lp-nav-links">
        <a href="#agents">Agents</a>
        <a href="#tools">Tools</a>
        <a href="#timeline">7 days</a>
        <a href="#faq">FAQ</a>
        <button type="button" className="btn btn-primary" onClick={onCTA}>
          {isLoggedIn ? "See your dashboard" : "Get an invite"}
        </button>
      </div>
    </nav>
  );
}

function Hero({ isLoggedIn, onCTA }) {
  return (
    <section className="lp-hero">
      <div className="lp-hero-tag">
        <span className="pulse" />
        Pilot now open — 100 invites in this wave
      </div>
      <h1 className="lp-hero-title">
        Your career is too important for <span className="accent">copy-paste prompts.</span>
      </h1>
      <p className="lp-hero-sub">
        Get A Job is a <strong>career operating system</strong> — every tool your job search needs, in one workspace that
        remembers you. Four AI agents share the same understanding of your background. Not a chatbot that forgets every
        session.
      </p>
      <div className="lp-hero-cta">
        <button type="button" className="btn btn-accent" onClick={onCTA}>
          {isLoggedIn ? (
            <>See your dashboard <i className="ti ti-arrow-up-right" aria-hidden="true" /></>
          ) : (
            <>Upload your CV — see your roadmap <i className="ti ti-arrow-up-right" aria-hidden="true" /></>
          )}
        </button>
        <a className="btn btn-ghost" href="#agents">
          See the agents
        </a>
        {!isLoggedIn && <span className="lp-hero-cta-note">7-day free trial · $12/mo after</span>}
      </div>
    </section>
  );
}

function ProductMockup() {
  return (
    <section className="lp-product" aria-label="Product preview">
      <div className="lp-product-frame">
        <div className="lp-product-chrome">
          <span /> <span /> <span />
          <div className="url">getajob.careers/home</div>
        </div>
        <div className="lp-product-body">
          <div className="lp-p-sidebar">
            <div className="lp-p-sidebar-brand">getajob</div>
            <div className="lp-p-side-item active">
              <i className="ti ti-home" aria-hidden="true" />
              Home
            </div>
            <div className="lp-p-side-item">
              <i className="ti ti-chart-dots-3" aria-hidden="true" />
              Career
            </div>
            <div className="lp-p-side-item">
              <i className="ti ti-briefcase" aria-hidden="true" />
              Jobs
            </div>
            <div className="lp-p-side-item">
              <i className="ti ti-tools" aria-hidden="true" />
              Build
            </div>
            <div className="lp-p-side-item">
              <i className="ti ti-brand-linkedin" aria-hidden="true" />
              LinkedIn
            </div>
            <div className="lp-p-side-item">
              <i className="ti ti-messages" aria-hidden="true" />
              Agents
            </div>
          </div>
          <div className="lp-p-main">
            <div className="lp-p-greeting">GOOD MORNING</div>
            <div className="lp-p-stat-row">
              <div className="lp-p-stat">
                <div className="lbl">Tier 1 fits</div>
                <div className="num g">4</div>
              </div>
              <div className="lp-p-stat">
                <div className="lbl">Applications</div>
                <div className="num b">12</div>
              </div>
              <div className="lp-p-stat">
                <div className="lbl">Stories</div>
                <div className="num v">7</div>
              </div>
            </div>
            <div className="lp-p-roles">
              <div className="lp-p-roles-head">
                <h4>Career roadmap</h4>
                <span className="tag">UPDATED 2H AGO</span>
              </div>
              <div className="lp-p-role">
                <span>Product Manager</span>
                <span className="lp-p-tier lp-t1">TIER 1</span>
              </div>
              <div className="lp-p-role">
                <span>Business Analyst</span>
                <span className="lp-p-tier lp-t1">TIER 1</span>
              </div>
              <div className="lp-p-role">
                <span>Growth Marketing</span>
                <span className="lp-p-tier lp-t2">TIER 2</span>
              </div>
              <div className="lp-p-role">
                <span>Strategy Consultant</span>
                <span className="lp-p-tier lp-t3">TIER 3</span>
              </div>
            </div>
          </div>
          <div className="lp-p-right">
            <div className="lp-p-action">
              <div className="eyebrow">TODAY&apos;S ACTION</div>
              <p>
                Tailor your CV for the Product Manager role you bookmarked yesterday — your customer triage story is a
                strong fit.
              </p>
            </div>
            <div className="lp-p-stories">
              <h4>Story Bank</h4>
              <div className="lp-p-story">
                <strong>Customer triage</strong> — cut response time 40%
              </div>
              <div className="lp-p-story">
                <strong>Demo prep</strong> — found 3 upsell paths
              </div>
              <div className="lp-p-story">
                <strong>Budget redesign</strong> — saved 22%
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExplainerSection() {
  return (
    <section className="lp-explainer">
      <div className="lp-explainer-grid">
        <div>
          <div className="lp-explainer-eyebrow">THE SHORT VERSION</div>
          <h2>An operating system for the next role you&apos;re going to land.</h2>
          <p>
            Most career tools do one thing — a CV builder here, an interview app there. You end up with five disconnected
            tabs and zero memory across them.
          </p>
          <p>
            <strong>Get A Job is one workspace.</strong> Upload your CV once. The platform reads it, builds your career
            roadmap, surfaces matching jobs, tailors CVs per role, drafts your LinkedIn posts, and remembers everything
            along the way.
          </p>
          <p>
            Every win you capture in your Story Bank feeds the next CV. Every job you track teaches the system what you
            actually want. Every conversation with an agent builds on the last one.
          </p>
        </div>
        <div className="lp-explainer-card">
          <h3>
            <i className="ti ti-bolt" aria-hidden="true" />
            What you&apos;ll do in your first hour
          </h3>
          <ul>
            <li>
              <i className="ti ti-check" aria-hidden="true" />
              Upload your CV — the platform extracts your skills, education, and experience
            </li>
            <li>
              <i className="ti ti-check" aria-hidden="true" />
              Get a 3-tier career roadmap with roles ranked by qualification fit
            </li>
            <li>
              <i className="ti ti-check" aria-hidden="true" />
              Browse live job listings from real companies that are hiring right now
            </li>
            <li>
              <i className="ti ti-check" aria-hidden="true" />
              Tailor your first CV to a specific job in under 30 seconds
            </li>
            <li>
              <i className="ti ti-check" aria-hidden="true" />
              Capture your first achievement in the Story Bank
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function PainSection() {
  return (
    <section className="lp-pain">
      <div className="lp-pain-wrap">
        <h2>You&apos;ve been here before.</h2>
        <div className="lp-pain-grid">
          <div className="lp-pain-card">
            <div className="lp-pain-h">Using AI tools that don&apos;t know you.</div>
            <div className="lp-pain-p">
              Generic suggestions. No memory of your background. Different output every time you ask. By the end you&apos;re
              back to your old draft.
            </div>
            <div className="lp-pain-mock">
              <div className="lp-pain-mock-line" />
              <div className="lp-pain-mock-line" />
              <div className="lp-pain-mock-line" />
            </div>
          </div>
          <div className="lp-pain-card">
            <div className="lp-pain-h">Sending the same resume everywhere.</div>
            <div className="lp-pain-p">
              No tailoring. No strategy. The &quot;spray and pray&quot; approach that gets you no replies.
            </div>
          </div>
          <div className="lp-pain-card">
            <div className="lp-pain-h">No clue which roles actually fit you.</div>
            <div className="lp-pain-p">
              You want &quot;something in tech.&quot; But which roles? Which are realistic? Which to build toward?
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AgentsSection() {
  return (
    <section className="lp-agents" id="agents">
      <div className="lp-section-head">
        <div className="lp-section-head-left">
          <div className="lp-section-eyebrow">THE AGENTS</div>
          <h2>
            <span className="strike">One chatbot.</span> Four specialists.
          </h2>
        </div>
        <div className="lp-section-head-right">
          Each agent owns a part of your job search. They share the same memory — your profile, your stories, your
          applications. Ask one, the others already know.
        </div>
      </div>
      <div className="lp-agents-grid">
        <div className="lp-agent lp-agent-a">
          <div className="lp-agent-icon career">
            <i className="ti ti-route" aria-hidden="true" />
          </div>
          <div className="lp-agent-name">Career Agent</div>
          <div className="lp-agent-desc">
            Multi-turn strategy partner. Plans your roadmap, suggests next moves, weighs trade-offs between paths.
            Doesn&apos;t forget what you told it yesterday.
          </div>
          <div className="lp-agent-quote">
            &quot;Should I take the offer on the table, or hold out for a bigger company?&quot;
          </div>
        </div>
        <div className="lp-agent lp-agent-b">
          <div className="lp-agent-icon cv">
            <i className="ti ti-file-text" aria-hidden="true" />
          </div>
          <div className="lp-agent-name">CV Agent</div>
          <div className="lp-agent-desc">
            Tailors your resume to a specific job description. Pulls metrics, tools, and outcomes from your Story Bank.
            Never fabricates a single line.
          </div>
          <div className="lp-agent-quote">&quot;Tailor my CV for the PM role I just bookmarked.&quot;</div>
        </div>
        <div className="lp-agent lp-agent-a">
          <div className="lp-agent-icon interview">
            <i className="ti ti-microphone" aria-hidden="true" />
          </div>
          <div className="lp-agent-name">Interview Agent</div>
          <div className="lp-agent-desc">
            Practice behavioral and role-specific questions. Scores your answers on structure, specificity, and outcome.
          </div>
          <div className="lp-agent-quote">
            &quot;Run me through three behavioral questions for a customer success role.&quot;
          </div>
        </div>
        <div className="lp-agent lp-agent-b">
          <div className="lp-agent-icon skill">
            <i className="ti ti-bulb" aria-hidden="true" />
          </div>
          <div className="lp-agent-name">Skill Advisor</div>
          <div className="lp-agent-desc">
            Maps your skill gaps against target roles. Recommends courses and projects that close them, in priority order.
          </div>
          <div className="lp-agent-quote">
            &quot;What&apos;s the fastest way to close the SQL gap on my Tier 2 roles?&quot;
          </div>
        </div>
      </div>
    </section>
  );
}

function SpineSection() {
  return (
    <section className="lp-spine" id="tools">
      <div className="lp-spine-wrap">
        <div className="lp-section-head">
          <div className="lp-section-head-left">
            <div className="lp-section-eyebrow">THE SPINE</div>
            <h2>Five tools. One memory.</h2>
          </div>
          <div className="lp-section-head-right">
            The agents don&apos;t work in isolation — they pull from a shared layer of tools that all know you. Capture
            once, use everywhere. That&apos;s where the compound effect lives.
          </div>
        </div>
        <div className="lp-spine-grid">
          <div className="lp-spine-card lp-spine-card-big">
            <div className="lp-spine-card-icon">
              <i className="ti ti-bookmarks" aria-hidden="true" style={{ fontSize: 13 }} />
              STORY BANK
            </div>
            <h3>Capture wins once. Use them everywhere.</h3>
            <p>
              The cornerstone of the platform. Every achievement, project, and outcome lives in your Story Bank with
              structured metadata — metrics, tools, skills demonstrated. Your CV agent uses it. Your interview agent uses
              it. Your LinkedIn posts use it. Capture is one click; payoff compounds across every other tool.
            </p>
            <div className="lp-spine-card-visual">
              <div className="lp-spine-card-visual-label">Stories in your bank</div>
              <div className="lp-spine-pills">
                <span className="lp-spine-pill glow">Customer triage system</span>
                <span className="lp-spine-pill">Demo prep analysis</span>
                <span className="lp-spine-pill">Budget redesign</span>
                <span className="lp-spine-pill">Q3 launch retro</span>
                <span className="lp-spine-pill">+3 more</span>
              </div>
            </div>
          </div>
          <div className="lp-spine-card">
            <div className="lp-spine-card-icon">
              <i className="ti ti-chart-dots-3" aria-hidden="true" style={{ fontSize: 13 }} />
              CAREER ROADMAP
            </div>
            <h3>Three tiers, ranked by fit.</h3>
            <p>
              183-role library. Tier 1 = ready now. Tier 2 = stretch. Tier 3 = build toward. Each ranking comes with
              qualification scores and a path to close the gap.
            </p>
          </div>
          <div className="lp-spine-card">
            <div className="lp-spine-card-icon">
              <i className="ti ti-briefcase" aria-hidden="true" style={{ fontSize: 13 }} />
              JOB LISTINGS
            </div>
            <h3>Roles that match your tier, refreshed daily.</h3>
            <p>
              Browse thousands of live openings filtered to your career roadmap. Score any role against your profile in
              one click — see your fit, your gaps, your strongest stories for it.
            </p>
          </div>
          <div className="lp-spine-card">
            <div className="lp-spine-card-icon">
              <i className="ti ti-layout-kanban" aria-hidden="true" style={{ fontSize: 13 }} />
              APPLICATION TRACKER
            </div>
            <h3>Pipeline, not spreadsheet.</h3>
            <p>
              Every application from saved to offer. Track outcomes. The system learns from rejections and offers,
              surfaces patterns when you have enough data.
            </p>
          </div>
          <div className="lp-spine-card">
            <div className="lp-spine-card-icon">
              <i className="ti ti-brand-linkedin" aria-hidden="true" style={{ fontSize: 13 }} />
              LINKEDIN HUB
            </div>
            <h3>Profile. Posts. Comments. Outreach.</h3>
            <p>
              Four LinkedIn surfaces in one place. Optimizer rewrites your profile. Composer drafts posts from your Story
              Bank. Comment Coach lifts profile views. Outreach Coach runs warm-up conversations.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function StudentsSection() {
  return (
    <section className="lp-students">
      <div className="lp-students-head">
        <div className="lp-section-eyebrow">IF YOU&apos;RE IN A PROGRAM</div>
        <h2>Built for the in-between — when you&apos;re still in a practicum or internship program but already looking.</h2>
      </div>
      <div className="lp-students-grid">
        <div className="lp-student-card">
          <div className="lp-student-icon">
            <i className="ti ti-target" aria-hidden="true" />
          </div>
          <div>
            <h4>Internship Helper</h4>
            <p>
              Pick target companies from a curated list, or add your own. Drag-and-drop kanban from exploring → outreach
              → interview → offered. Outreach Coach prefills with company context.
            </p>
          </div>
        </div>
        <div className="lp-student-card">
          <div className="lp-student-icon">
            <i className="ti ti-book" aria-hidden="true" />
          </div>
          <div>
            <h4>Learning Paths</h4>
            <p>
              Skill gaps from your roadmap become recommended courses. Sourced from real catalogs, with completion
              tracking and priority weighting.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const TIMELINE_ROWS = [
  {
    day: "DAY 1",
    action: "Upload CV. See your roadmap.",
    detail: "The platform extracts your profile and ranks every role in the library against you.",
  },
  {
    day: "DAY 2",
    action: "Browse jobs in your Tier 1 roles.",
    detail: "Score the ones that catch your eye. Save the strong fits to your tracker.",
  },
  {
    day: "DAY 3",
    action: "First tailored CV, sent.",
    detail: "CV Agent rewrites your resume for a specific job, pulling your strongest matching story.",
  },
  {
    day: "DAY 4",
    action: "Capture three more stories.",
    detail: "Each one fuels future CVs, LinkedIn posts, and interview answers. Compound starts.",
  },
  {
    day: "DAY 5",
    action: "LinkedIn profile, rewritten.",
    detail: "Headline, About, experience bullets — all tightened against your actual achievements.",
  },
  {
    day: "DAY 6",
    action: "First warm outreach, drafted.",
    detail:
      "Outreach Coach drafts a message to a recruiter or alumni at one of your target companies — grounded in your real story bank, not a template.",
  },
  {
    day: "DAY 7",
    action: "Five applications tracked.",
    detail: "Pipeline visible. Daily Action Card has a new priority every morning. Momentum.",
  },
];

function TimelineSection() {
  return (
    <section className="lp-timeline" id="timeline">
      <div className="lp-timeline-wrap">
        <h2>From upload to first application, in a week.</h2>
        <p className="lp-timeline-sub">What the platform looks like across your first seven days.</p>
        <div className="lp-timeline-list">
          {TIMELINE_ROWS.map((row) => (
            <div className="lp-tl-row" key={row.day}>
              <div className="lp-tl-day">{row.day}</div>
              <div className="lp-tl-action">{row.action}</div>
              <div className="lp-tl-detail">{row.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection({
  isLoggedIn,
  atCap,
  onPrimary,
  onWaitlistSubmit,
  waitlistEmail,
  setWaitlistEmail,
  waitlistSubmitted,
}) {
  if (isLoggedIn) {
    return (
      <section className="lp-cta" id="join">
        <div className="lp-cta-eyebrow">WELCOME BACK</div>
        <h2>Welcome back. Your dashboard is ready.</h2>
        <p>Pick up where you left off — your roadmap, applications, and Story Bank are waiting.</p>
        <div className="lp-cta-form">
          <button className="btn btn-accent" type="button" onClick={onPrimary} style={{ width: "100%" }}>
            Go to your dashboard <i className="ti ti-arrow-up-right" aria-hidden="true" />
          </button>
        </div>
      </section>
    );
  }

  if (atCap) {
    return (
      <section className="lp-cta" id="join">
        <div className="lp-cta-eyebrow">PILOT IS FULL — JOIN THE WAITLIST</div>
        <h2>We&apos;ll let you know the moment a spot opens.</h2>
        <p>
          The 100 pilot invites are claimed. Drop your email and we&apos;ll send your invite as soon as the next wave opens
          up. No spam, no marketing list — just the invite when it&apos;s ready.
        </p>
        {waitlistSubmitted ? (
          <div className="lp-cta-form">
            <span style={{ color: "var(--lp-green)", fontSize: 15 }}>
              <i className="ti ti-check" aria-hidden="true" /> You&apos;re on the list. We&apos;ll be in touch.
            </span>
          </div>
        ) : (
          <form
            className="lp-cta-form"
            onSubmit={(e) => {
              e.preventDefault();
              onWaitlistSubmit();
            }}
          >
            <input
              type="email"
              required
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              placeholder="you@email.com"
              aria-label="Email for the waitlist"
            />
            <button className="btn btn-accent" type="submit">
              Tell me when
            </button>
          </form>
        )}
        <div className="lp-cta-meta">
          <span>
            <i className="ti ti-check" aria-hidden="true" />
            No spam
          </span>
          <span>
            <i className="ti ti-check" aria-hidden="true" />
            One email, when a spot opens
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="lp-cta" id="join">
      <div className="lp-cta-eyebrow">PILOT ACCESS</div>
      <h2>100 invites in this wave. First come, first served.</h2>
      <p>
        Sign up takes 60 seconds. Upload your CV and your career roadmap is ready before you finish your coffee. Seven
        days free, then $12/month — cancel any time from your Settings page.
      </p>
      <div className="lp-cta-form">
        <button className="btn btn-accent" type="button" onClick={onPrimary} style={{ width: "100%" }}>
          Upload your CV — see your roadmap <i className="ti ti-arrow-up-right" aria-hidden="true" />
        </button>
      </div>
      <div className="lp-cta-meta">
        <span>
          <i className="ti ti-check" aria-hidden="true" />
          7-day free trial
        </span>
        <span>
          <i className="ti ti-check" aria-hidden="true" />
          $12/mo after
        </span>
        <span>
          <i className="ti ti-check" aria-hidden="true" />
          Cancel anytime
        </span>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);
  return (
    <section className="lp-faq" id="faq">
      <h2>Before you sign up</h2>
      <p className="lp-faq-sub">The most-asked questions, answered straight.</p>
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div className={`lp-faq-item${isOpen ? " open" : ""}`} key={item.q}>
            <button
              type="button"
              className="lp-faq-q"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : i)}
            >
              {item.q}
              <i className="ti ti-chevron-down" aria-hidden="true" />
            </button>
            <div className="lp-faq-a">{item.a}</div>
          </div>
        );
      })}
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="lp-foot">
      <span>© 2026 Get A Job</span>
      <div className="lp-foot-links">
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="mailto:hello@getajob.careers">Contact</a>
      </div>
    </footer>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Root component
// ────────────────────────────────────────────────────────────────────────

export default function Landing() {
  const [searchParams] = useSearchParams();
  // ?cap=hit toggles the waitlist state for preview/testing. Real cap-check
  // belongs in a SECURITY DEFINER RPC like public.get_pilot_status() —
  // tracked in the file-header KNOWN INFRASTRUCTURE GAPS block.
  const atCap = searchParams.get("cap") === "hit";
  const navigate = useNavigate();
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  // Auth-aware CTAs. During isLoadingAuth we render the logged-out version
  // optimistically (fast perceived load for the common case); the CTA labels
  // flip when auth resolves. Brief flicker is the trade-off — accepted.
  const { isLoadingAuth, isAuthenticated, user } = useAuth();
  const isLoggedIn = !isLoadingAuth && isAuthenticated && !!user;

  useLandingHead();

  // Auto-bounce authenticated users into the app. Without this, anyone
  // who lands on / while logged-in (post-email-confirmation, magic-link
  // return, fresh tab on a logged-in browser) gets stranded on the
  // marketing page. Home routes onward to /Onboarding if onboarding isn't
  // complete, so we only need a single hop here.
  useEffect(() => {
    if (isLoggedIn) {
      navigate("/Home", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  // Smooth scroll for anchor links (#agents, #tools, #timeline, #faq).
  // CSS `scroll-behavior: smooth` is set inside .lp; this is a no-op
  // fallback for old browsers that ignore it.
  useEffect(() => {
    const onAnchorClick = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    document.addEventListener("click", onAnchorClick);
    return () => document.removeEventListener("click", onAnchorClick);
  }, []);

  const handleSignupCTA = () => {
    if (isLoggedIn) {
      navigate("/Home");
      return;
    }
    if (atCap) {
      // Scroll to the waitlist CTA section so the email form is visible.
      const cta = document.getElementById("join");
      if (cta) cta.scrollIntoView({ behavior: "smooth" });
      return;
    }
    // Every landing-page CTA targets new users — deeplink to the signup
    // tab so first-time visitors don't land on a sign-in form that will
    // reject them. Login reads ?mode= via useSearchParams.
    navigate("/login?mode=signup");
  };

  const handleWaitlistSubmit = () => {
    const email = waitlistEmail.trim();
    if (!email) return;
    // Stub: log + localStorage. Real persistence requires a `waitlist`
    // table with anon INSERT policy — tracked in the file-header KNOWN
    // INFRASTRUCTURE GAPS block.
    try {
      const prev = JSON.parse(localStorage.getItem("gaj.waitlist") || "[]");
      const next = [...prev, { email, at: new Date().toISOString() }];
      localStorage.setItem("gaj.waitlist", JSON.stringify(next));
    } catch {
      /* ignore */
    }
    console.warn("[landing] waitlist submit (stub):", email);
    setWaitlistSubmitted(true);
    toast.success("You're on the waitlist.");
  };

  return (
    <>
      <style>{LANDING_CSS}</style>
      <div className="lp">
        <LandingNav isLoggedIn={isLoggedIn} onCTA={handleSignupCTA} />
        <Hero isLoggedIn={isLoggedIn} onCTA={handleSignupCTA} />
        <ProductMockup />
        <ExplainerSection />
        <PainSection />
        <AgentsSection />
        <SpineSection />
        <StudentsSection />
        <TimelineSection />
        <CTASection
          isLoggedIn={isLoggedIn}
          atCap={atCap}
          onPrimary={handleSignupCTA}
          onWaitlistSubmit={handleWaitlistSubmit}
          waitlistEmail={waitlistEmail}
          setWaitlistEmail={setWaitlistEmail}
          waitlistSubmitted={waitlistSubmitted}
        />
        <FAQSection />
        <LandingFooter />
      </div>
    </>
  );
}
