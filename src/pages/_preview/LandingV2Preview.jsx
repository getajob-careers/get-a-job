/*
 * LandingV2Preview.jsx — the LIVE public homepage (the / route in App.jsx).
 * Also reachable at /_preview/landing-v2 (the dev/preview harness route).
 *
 * A fresh, self-serve marketing page built from a design DNA synthesised from
 * Isaac's inspiration set (Manatee Energy, outcrowd.io, Sparkline, CoreShift):
 * bold editorial display type, warm off-white ground, near-black ink, ONE coral
 * accent, pill buttons/nav, generous white space, an outline/line-art graphic
 * language, and tasteful motion (reveal-on-scroll, gentle parallax, a floating
 * orbit hero). Palette is anchored to our platform tokens so it matches the app.
 *
 * Self-contained on purpose (mirrors Landing.jsx): own inline-CSS token block,
 * own <head> effect, no shadcn imports. Auth-aware: logged-in visitors at /
 * auto-bounce to /Home; the previous Landing stays at /Landing for rollback.
 */

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { savePendingCv } from "@/lib/pendingCv";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";

// ────────────────────────────────────────────────────────────────────────
const LV_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600;700;800;900&display=swap');
.lv {
  --bg: #F4EBDA;
  --bg-warm: #ECE0C9;
  --ink: #4A372D;
  --ink-soft: #7B675C;
  --ink-faint: #A6957F;
  --accent: #60617D;
  --accent-deep: #4B4C66;
  --accent-tint: #E3E3EC;
  --teal: #9B7D8A;
  --teal-tint: #EFE3E9;
  --teal-deep: #7B606D;
  --golden: #60483E;
  --golden-tint: #E9DECF;
  --line: #E0D2B9;
  --line-soft: #E9DEC8;
  --card: #FFFCF4;
  --ink-deep: #3A2A20;
  --r-sm: 10px; --r: 16px; --r-lg: 24px; --r-pill: 999px;
  --font-d: 'Geist', system-ui, sans-serif;
  --font-b: 'Geist', system-ui, sans-serif;
  --font-m: 'Geist Mono', ui-monospace, monospace;
  font-family: var(--font-b);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}
.lv *, .lv *::before, .lv *::after { margin: 0; padding: 0; box-sizing: border-box; }
.lv-wrap { max-width: 1180px; margin: 0 auto; padding: 0 40px; position: relative; z-index: 1; }
.lv-eyebrow { font-family: var(--font-m); font-size: 12px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); }

/* dotted-grid backdrop */
.lv-dots { background-image: radial-gradient(var(--line) 1.2px, transparent 1.2px); background-size: 22px 22px; }

/* decorative parallax layers */
.lv-clip { position: relative; overflow: hidden; }
.lv-deco { position: absolute; pointer-events: none; z-index: 0; will-change: transform; }
.lv-ring { border-radius: 50%; border: 1.5px solid var(--line); }
.lv-ring.dash { border-style: dashed; }
.lv-griddots { background-image: radial-gradient(var(--line) 1.5px, transparent 1.5px); background-size: 22px 22px; border-radius: 16px; }
.lv-blob { border-radius: 50%; filter: blur(56px); }

/* buttons */
.lv .btn { display: inline-flex; align-items: center; gap: 8px; padding: 13px 24px; border-radius: var(--r-pill); font-family: var(--font-b); font-size: 15px; font-weight: 600; cursor: pointer; border: none; text-decoration: none; transition: transform .18s ease, background .18s ease, box-shadow .18s ease, color .18s ease; }
.lv .btn:hover { transform: translateY(-2px); }
.lv .btn:active { transform: translateY(0) scale(.98); }
.lv .btn-accent { background: var(--accent); color: #fff; box-shadow: 0 8px 22px -6px rgba(96,97,125,.5); }
.lv .btn-accent:hover { background: var(--accent-deep); box-shadow: 0 12px 28px -6px rgba(96,97,125,.55); }
.lv .btn-ink { background: var(--ink-deep); color: var(--bg); }
.lv .btn-ink:hover { background: var(--accent); }
.lv .btn-ghost { background: transparent; color: var(--ink); border: 1.5px solid var(--line); }
.lv .btn-ghost:hover { border-color: var(--ink); background: rgba(0,0,0,.02); }
.lv .btn-sm { padding: 9px 18px; font-size: 14px; }

/* reveal-on-scroll */
/* Each .lv-reveal CONTENT block (headline, card, mockup, step) fades + grows
   into view as it enters — driven one-shot by getBoundingClientRect in
   useMotion's rAF; this CSS transition does the easing. Deliberately per content
   block, NOT whole sections: a viewport-tall section's fade finishes off-screen
   so you never see it. */
.lv-reveal { opacity: 0; transform: scale(0.9); transition: opacity .65s cubic-bezier(.22,.61,.36,1), transform .65s cubic-bezier(.22,.61,.36,1); will-change: opacity, transform; }
@media (prefers-reduced-motion: reduce) { .lv-reveal { opacity: 1; transform: none; transition: none; } .lv-float, .lv-floaty, .lv-dflow, .lv-spin, .lv-stage-lines path.flow { animation: none !important; } }

/* nav */
.lv-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: rgba(251,248,241,.82); backdrop-filter: blur(10px); border-bottom: 1px solid transparent; transition: border-color .2s; }
.lv-nav.scrolled { border-color: var(--line); }
.lv-nav-in { display: flex; align-items: center; justify-content: space-between; height: 70px; }
.lv-logo { display: flex; align-items: baseline; gap: 5px; font-family: var(--font-d); font-size: 21px; font-weight: 700; letter-spacing: -.02em; }
.lv-logo .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); transform: translateY(-2px); }
.lv-nav-pill { display: flex; align-items: center; gap: 4px; background: var(--card); border: 1px solid var(--line); border-radius: var(--r-pill); padding: 6px; box-shadow: 0 2px 10px rgba(96,72,62,.04); }
.lv-nav-pill a { font-size: 14px; color: var(--ink-soft); text-decoration: none; font-weight: 500; padding: 8px 14px; border-radius: var(--r-pill); transition: background .15s, color .15s; }
.lv-nav-pill a:hover { color: var(--ink); background: var(--bg-warm); }
.lv-nav-right { display: flex; align-items: center; gap: 12px; }
.lv-nav-login { background: none; border: none; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 500; color: var(--ink-soft); padding: 6px 4px; transition: color .15s; }
.lv-nav-login:hover { color: var(--ink); }

/* hero */
.lv-hero { position: relative; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 80px 0; overflow: hidden; }
.lv-hero-top { text-align: center; max-width: 880px; margin: 0 auto; }
.lv-hero h1 { font-family: var(--font-d); font-size: 70px; line-height: .98; letter-spacing: -.04em; font-weight: 800; }
.lv .accent { color: var(--accent); }
.lv-hero-sub { font-size: 18.5px; line-height: 1.5; color: var(--ink-soft); max-width: 540px; margin: 22px auto 0; }
.lv-hero-sub strong { color: var(--ink); font-weight: 600; }
.lv-hero-meta { display: flex; justify-content: center; gap: 16px; margin-top: 6px; font-size: 12.5px; color: var(--ink-faint); flex-wrap: wrap; }
.lv-hero-meta span { display: inline-flex; align-items: center; gap: 6px; }
.lv-hero-meta i { color: var(--teal-deep); font-size: 14px; }
.lv-hero-cta { display: flex; align-items: center; justify-content: center; gap: 22px; margin-top: 34px; flex-wrap: wrap; }
.lv-hero-link { display: inline-flex; align-items: center; gap: 7px; font-size: 15px; font-weight: 600; color: var(--ink); text-decoration: none; transition: color .15s; }
.lv-hero-link:hover { color: var(--accent); }
.lv-hero-link i { font-size: 16px; }
.lv-stats { display: flex; align-items: stretch; justify-content: center; margin: 66px auto 0; max-width: 880px; flex-wrap: wrap; }
.lv-stat { flex: 1 1 0; min-width: 150px; text-align: center; padding: 8px 24px; position: relative; transition: transform .2s ease; }
.lv-stat:hover { transform: translateY(-5px); }
.lv-stat + .lv-stat::before { content: ""; position: absolute; left: 0; top: 6px; bottom: 6px; width: 1px; background: var(--line); }
.lv-stat-ic { display: block; font-size: 23px; color: var(--ink-faint); margin: 0 auto 10px; transition: color .2s ease, transform .2s ease; }
.lv-stat:hover .lv-stat-ic { color: var(--accent); transform: scale(1.12); }
.lv-stat-n { font-family: var(--font-d); font-size: 38px; font-weight: 800; letter-spacing: -.03em; color: var(--ink); line-height: 1; }
.lv-stat-l { font-size: 13px; color: var(--ink-soft); margin-top: 9px; line-height: 1.35; }
.lv-stat-t { font-family: var(--font-d); font-size: 16px; font-weight: 700; color: var(--ink); line-height: 1.25; letter-spacing: -.01em; max-width: 168px; margin: 0 auto; }
/* odometer reels — each digit clips to 1em and rolls up to its value */
.lv-odometer { display: inline-flex; align-items: flex-start; justify-content: center; }
.lv-od-digit { display: inline-block; height: 1em; line-height: 1; overflow: hidden; }
.lv-od-reel { display: flex; flex-direction: column; will-change: transform; transition: transform 1.15s cubic-bezier(.2,.75,.25,1); }
.lv-od-num { height: 1em; line-height: 1; }
.lv-od-sep { display: inline-block; }
.lv-dropsec { padding: 112px 0; }
@media (max-width: 620px) { .lv-stat { flex-basis: 40%; min-width: 130px; } .lv-stat + .lv-stat::before { display: none; } }

/* interactive hero stage */
.lv-stage { position: relative; height: 480px; max-width: 920px; margin: 16px auto 4px; display: flex; align-items: center; justify-content: center; }
.lv-stage-lines { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; z-index: 1; }
.lv-stage-lines path { fill: none; stroke: var(--line); stroke-width: 1.5; stroke-dasharray: 4 7; }
.lv-stage-lines path.flow { stroke: var(--accent); stroke-width: 1.8; stroke-dasharray: 3 13; opacity: .6; animation: lvflow 1.5s linear infinite; }
@keyframes lvflow { to { stroke-dashoffset: -32; } }

/* drop zone — the hero CTA */
.lv-hero-drop { display: flex; justify-content: center; margin: 40px 0 0; }
.lv-drop { position: relative; z-index: 3; width: 480px; max-width: 100%; min-height: 312px; background: var(--card); border: 2px dashed var(--line); border-radius: var(--r-lg); padding: 44px 36px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; cursor: pointer; box-shadow: 0 38px 84px -30px rgba(96,72,62,.36); transition: border-color .2s, box-shadow .2s, transform .2s, background .2s; }
.lv-drop:hover { border-color: var(--accent); transform: translateY(-3px); box-shadow: 0 38px 78px -28px rgba(96,97,125,.4); }
.lv-drop:focus-visible { outline: none; border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-tint); }
.lv-drop.drag { border-style: solid; border-color: var(--accent); background: var(--accent-tint); transform: scale(1.03); }
.lv-drop.busy { border-style: solid; border-color: var(--teal); cursor: default; }
.lv-drop-ic { width: 70px; height: 70px; border-radius: 18px; background: var(--accent-tint); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 34px; margin-bottom: 20px; transition: transform .2s; }
.lv-drop:hover .lv-drop-ic { transform: translateY(-2px) scale(1.06); }
.lv-drop-t { font-family: var(--font-d); font-size: 25px; font-weight: 600; letter-spacing: -.01em; }
.lv-drop-s { font-size: 14px; color: var(--ink-faint); margin-top: 7px; }
.lv-drop-s .lk { color: var(--accent-deep); font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
.lv-drop-cta { margin-top: 18px; }
.lv-spinner { width: 28px; height: 28px; border: 3px solid var(--teal-tint); border-top-color: var(--teal); border-radius: 50%; animation: lvspin .8s linear infinite; margin-bottom: 14px; }
@keyframes lvspin { to { transform: rotate(360deg); } }

/* parallax chips (mouse-reactive) */
.lv-pchip { position: absolute; z-index: 2; transform: translate(calc(var(--px, 0) * var(--mul, 16px)), calc(var(--py, 0) * var(--mul, 16px))); transition: transform .35s cubic-bezier(.22,.61,.36,1); }
.lv-pchip-in { background: var(--card); border: 1px solid var(--line); border-radius: var(--r-pill); padding: 9px 15px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; box-shadow: 0 16px 34px -12px rgba(96,72,62,.24); }
.lv-pchip-in i { font-size: 16px; }
.lv-pchip-in .tag { font-family: var(--font-m); font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: var(--r-pill); }
.tag-t1 { background: var(--teal-tint); color: var(--teal-deep); }
.tag-t2 { background: var(--accent-tint); color: var(--accent-deep); }
.tag-t3 { background: var(--golden-tint); color: var(--golden); }
.lv-float { animation: lvfloat 7s ease-in-out infinite; }
@keyframes lvfloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
.lv-floaty { animation: lvfloat 11s ease-in-out infinite; }
.lv-dflow { animation: lvflow 1.8s linear infinite; }

@media (max-width: 980px) {
  .lv-stage { height: auto; padding: 8px 0 0; }
  .lv-stage-lines, .lv-pchip { display: none; }
}
@media (max-width: 600px) { .lv-drop { width: 100%; } }

/* credibility strip */
.lv-cred { border-top: 1px solid var(--line-soft); border-bottom: 1px solid var(--line-soft); background: var(--bg-warm); }
.lv-cred-in { display: flex; align-items: center; justify-content: space-between; gap: 30px; padding: 22px 0; flex-wrap: wrap; }
.lv-cred-label { font-family: var(--font-m); font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-faint); white-space: nowrap; }
.lv-cred-items { display: flex; gap: 28px; flex-wrap: wrap; }
.lv-cred-item { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--ink-soft); }
.lv-cred-item i { font-size: 18px; color: var(--ink); }

/* section heads */
.lv-section { padding: 96px 0; }
/* Full-viewport height + vertical centering, for sections registered with the
   scroll-snap addon whose own content is shorter than the viewport. Snap
   aligns each section to its own top edge ("start"), so a short section
   settles with dead space below it and the next section peeking in at the
   bottom — it only reads as "centered" if the section fills the viewport and
   centers its content inside, same recipe .lv-hero already uses. */
.lv-snap-fit { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
.lv-head { max-width: 640px; margin-bottom: 48px; }
.lv-head.center { margin-left: auto; margin-right: auto; text-align: center; }
.lv-head h2 { font-family: var(--font-d); font-size: 44px; line-height: 1.06; letter-spacing: -.03em; font-weight: 700; margin: 14px 0 0; }
.lv-head p { font-size: 17px; line-height: 1.55; color: var(--ink-soft); margin-top: 16px; }

/* offer stack */
.lv-offer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.lv-offer { background: var(--card); border: 1px solid var(--line); border-radius: var(--r); padding: 26px; transition: transform .2s, box-shadow .2s, border-color .2s; }
.lv-offer:hover { transform: translateY(-3px); box-shadow: 0 16px 40px -16px rgba(96,72,62,.16); border-color: var(--line); }
.lv-offer.wide { grid-column: span 2; display: flex; gap: 24px; align-items: center; }
.lv-offer.wide .lv-offer-body { flex: 1; }
.lv-offer-ic { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 16px; }
.lv-offer.wide .lv-offer-ic { margin-bottom: 0; flex-shrink: 0; }
.ic-coral { background: var(--accent-tint); color: var(--accent-deep); }
.ic-teal { background: var(--teal-tint); color: var(--teal-deep); }
.ic-gold { background: var(--golden-tint); color: var(--golden); }
.ic-ink { background: var(--bg-warm); color: var(--ink); }
.lv-offer h3 { font-family: var(--font-d); font-size: 18px; font-weight: 600; margin-bottom: 7px; letter-spacing: -.01em; }
.lv-offer p { font-size: 14px; line-height: 1.5; color: var(--ink-soft); }

/* product proof */
.lv-proof { background: var(--ink-deep); color: var(--bg); }
.lv-proof .lv-head h2 { color: #fff; }
.lv-proof .lv-head p { color: rgba(255,255,255,.62); }
.lv-mock { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); border-radius: var(--r-lg); padding: 14px; box-shadow: 0 40px 90px -30px rgba(0,0,0,.5); }
.lv-mock-chrome { display: flex; align-items: center; gap: 6px; padding: 6px 8px 12px; }
.lv-mock-chrome span { width: 11px; height: 11px; border-radius: 50%; background: rgba(255,255,255,.18); }
.lv-mock-chrome .url { margin-left: 12px; font-family: var(--font-m); font-size: 11px; color: rgba(255,255,255,.4); }
.lv-mock-body { background: var(--bg); border-radius: 14px; padding: 18px; display: grid; grid-template-columns: 170px 1fr 210px; gap: 14px; min-height: 330px; }
.lv-mock-side { background: var(--bg-warm); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 3px; }
.lv-mock-brand { font-family: var(--font-d); font-weight: 700; font-size: 13px; padding: 4px 8px 12px; }
.lv-mock-nav { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 8px; font-size: 12.5px; color: var(--ink-soft); font-weight: 500; }
.lv-mock-nav i { font-size: 15px; }
.lv-mock-nav.on { background: #fff; color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.lv-mock-main { display: flex; flex-direction: column; gap: 11px; min-width: 0; }
.lv-mock-eye { font-family: var(--font-m); font-size: 10px; letter-spacing: .06em; color: var(--ink-faint); text-transform: uppercase; }
.lv-mock-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
.lv-mock-stat { background: var(--bg-warm); border-radius: 10px; padding: 11px 13px; }
.lv-mock-stat .l { font-family: var(--font-m); font-size: 9.5px; letter-spacing: .05em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 5px; white-space: nowrap; }
.lv-mock-stat .n { font-family: var(--font-d); font-size: 25px; font-weight: 600; line-height: 1; }
.lv-mock-stat .n.t { color: var(--teal); } .lv-mock-stat .n.c { color: var(--accent); } .lv-mock-stat .n.g { color: var(--golden); }
.lv-mock-roles { background: var(--bg-warm); border-radius: 10px; padding: 13px; flex: 1; }
.lv-mock-roles h4 { font-family: var(--font-d); font-size: 13px; font-weight: 600; margin-bottom: 9px; }
.lv-mock-role { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--line-soft); font-size: 12.5px; font-weight: 500; }
.lv-mock-role:last-child { border: none; }
.lv-mock-pill { font-family: var(--font-m); font-size: 9.5px; font-weight: 600; padding: 2px 8px; border-radius: var(--r-pill); }
.lv-mock-aside { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.lv-mock-card { background: var(--ink-deep); color: #fff; border-radius: 10px; padding: 13px; position: relative; overflow: hidden; }
.lv-mock-card .e { font-family: var(--font-m); font-size: 9.5px; color: var(--accent); letter-spacing: .05em; margin-bottom: 5px; }
.lv-mock-card p { font-size: 12px; line-height: 1.4; }
.lv-mock-stories { background: var(--bg-warm); border-radius: 10px; padding: 13px; flex: 1; }
.lv-mock-stories h4 { font-family: var(--font-d); font-size: 12.5px; font-weight: 600; margin-bottom: 8px; }
.lv-mock-story { font-size: 11px; color: var(--ink-soft); padding: 5px 0; border-bottom: 1px solid var(--line-soft); }
.lv-mock-story:last-child { border: none; }
.lv-mock-story b { color: var(--ink); }
@media (max-width: 900px) { .lv-mock-body { grid-template-columns: 1fr; } .lv-mock-side, .lv-mock-aside { display: none; } }

/* feature explorer */
.lv-fx { display: grid; grid-template-columns: 360px 1fr; gap: 22px; align-items: start; }
.lv-fx-list { display: flex; flex-direction: column; gap: 9px; }
.lv-fx-tab { display: flex; gap: 14px; align-items: flex-start; text-align: left; background: var(--card); border: 1px solid var(--line); border-radius: var(--r); padding: 15px 17px; cursor: pointer; font-family: var(--font-b); transition: border-color .15s, background .15s, transform .15s, box-shadow .15s; }
.lv-fx-tab:hover { transform: translateX(3px); box-shadow: 0 12px 26px -16px rgba(96,72,62,.2); }
.lv-fx-tab.on { border-color: var(--accent); background: var(--accent-tint); }
.lv-fx-tab .fx-ic { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 21px; flex-shrink: 0; background: var(--bg-warm); color: var(--ink); transition: background .15s, color .15s; }
.lv-fx-tab.on .fx-ic { background: var(--accent); color: #fff; }
.lv-fx-tab h4 { font-family: var(--font-d); font-size: 16px; font-weight: 600; }
.lv-fx-tab p { font-size: 12.5px; color: var(--ink-soft); margin-top: 3px; line-height: 1.4; }
.lv-fx-screen { background: var(--ink-deep); border-radius: var(--r-lg); padding: 13px; box-shadow: 0 34px 80px -30px rgba(96,72,62,.45); }
.lv-fx-chrome { display: flex; align-items: center; gap: 6px; padding: 6px 8px 11px; }
.lv-fx-chrome span { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,.16); }
.lv-fx-chrome .url { margin-left: 12px; font-family: var(--font-m); font-size: 11px; color: rgba(255,255,255,.4); }
.lv-fx-frame { background: var(--bg); border-radius: 14px; min-height: 372px; padding: 20px; animation: lvfade .35s ease; }
@keyframes lvfade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.lv-sc-eye { font-family: var(--font-m); font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 14px; }
.lv-sc-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--card); border: 1px solid var(--line); border-radius: 11px; padding: 12px 14px; margin-bottom: 9px; font-size: 13.5px; font-weight: 600; }
.lv-sc-pill { font-family: var(--font-m); font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.lv-sc-sq { width: 30px; height: 30px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.lv-sc-bar { height: 6px; border-radius: 999px; background: var(--bg-warm); overflow: hidden; }
.lv-sc-bar i { display: block; height: 100%; background: var(--accent); border-radius: 999px; }
.lv-ws-soon { margin-left: 8px; font-family: var(--font-m); font-size: 9px; letter-spacing: .04em; text-transform: uppercase; background: var(--golden-tint); color: var(--golden); padding: 2px 7px; border-radius: 999px; font-weight: 700; }
.lv-ws-soon-tag { margin-left: 10px; font-family: var(--font-m); font-size: 10px; letter-spacing: .05em; text-transform: uppercase; background: var(--golden-tint); color: var(--golden); padding: 3px 9px; border-radius: 999px; font-weight: 700; vertical-align: middle; white-space: nowrap; }
@media (max-width: 900px) { .lv-fx { grid-template-columns: 1fr; } }

/* feature workspace — selectable list · dominant screenshot · live explainer.
   Breaks out wider than the 1180 page wrap so the screenshot reads large. */
/* The title card pins (centred) while the workspace below rises up and COVERS it
   (solid bg, higher layer), then the workspace itself pins for the tool scroll-
   through. Section must NOT be overflow:hidden or position:sticky breaks. */
.lv-feat { position: relative; }
.lv-feat-title { position: sticky; top: 0; height: 100vh; display: flex; align-items: center; justify-content: center; z-index: 0; }
.lv-feat-title .lv-head { margin-bottom: 0; }
.lv-pin-outer { position: relative; height: 460vh; z-index: 1; }
.lv-pin-inner { position: sticky; top: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 30px 0; background: var(--bg); }

.lv-ws-wrap { width: 100%; max-width: 1480px; margin: 0 auto; padding: 0 44px; }
.lv-ws { display: grid; grid-template-columns: 312px minmax(0, 1fr) 312px; gap: 34px; align-items: center; }
.lv-ws-list { display: flex; flex-direction: column; gap: 6px; }
.lv-ws-item { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 15px; border: 1px solid transparent; background: transparent; cursor: pointer; text-align: left; font-family: var(--font-b); transition: background .15s, border-color .15s, box-shadow .15s; }
.lv-ws-item:hover { background: var(--card); }
.lv-ws-item.on { background: var(--card); border-color: var(--line); box-shadow: 0 16px 34px -18px rgba(96,72,62,.22); }
.lv-ws-item .fx-ic { width: 44px; height: 44px; border-radius: 12px; background: var(--bg-warm); color: var(--ink); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; transition: background .15s, color .15s; }
.lv-ws-item.on .fx-ic { background: var(--accent); color: #fff; }
.lv-ws-item-name { font-family: var(--font-d); font-size: 17px; font-weight: 600; color: var(--ink); }

.lv-ws-screen { background: var(--ink-deep); border-radius: var(--r-lg); padding: 16px; box-shadow: 0 44px 100px -34px rgba(96,72,62,.55); }
.lv-ws-screen .lv-fxr-frame { min-height: 522px; padding: 16px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
/* every mockup is authored at ~404px wide — scale the whole thing up uniformly so
   it fills the larger frame at a readable size. Dialled down on narrower screens
   so it never overflows the frame. */
.lv-ws-screen .lv-sc-scale { width: 404px; flex: none; transform: scale(1.5); transform-origin: center; }
@media (max-width: 1500px) { .lv-ws-screen .lv-sc-scale { transform: scale(1.3); } }
@media (max-width: 1200px) { .lv-ws-screen .lv-sc-scale { transform: scale(1.12); } }

.lv-ws-info { align-self: center; }
.lv-ws-info-inner { animation: lvfade .35s ease; }
.lv-ws-info-eye { font-family: var(--font-m); font-size: 12.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--accent); }
.lv-ws-info h3 { font-family: var(--font-d); font-size: 32px; font-weight: 700; letter-spacing: -.02em; margin: 13px 0 0; }
.lv-ws-info p { font-size: 18px; line-height: 1.6; color: var(--ink-soft); margin-top: 16px; }
.lv-ws-info ul { list-style: none; margin-top: 24px; display: flex; flex-direction: column; gap: 15px; }
.lv-ws-info li { display: flex; gap: 11px; align-items: flex-start; font-size: 17px; color: var(--ink); line-height: 1.45; }
.lv-ws-info li i { color: var(--teal-deep); font-size: 20px; flex-shrink: 0; margin-top: 1px; }

/* browser chrome + frame, shared by the centre screenshot */
.lv-fxr-chrome { display: flex; gap: 6px; align-items: center; padding: 6px 8px 13px; }
.lv-fxr-chrome span { width: 11px; height: 11px; border-radius: 50%; background: rgba(255,255,255,.16); }
.lv-fxr-chrome .url { margin-left: 12px; font-family: var(--font-m); font-size: 12px; color: rgba(255,255,255,.4); }
.lv-fxr-frame { background: var(--bg); border-radius: 14px; min-height: 326px; padding: 18px; animation: lvfade .35s ease; }

@media (max-width: 1000px) {
  .lv-ws-wrap { padding: 0 24px; }
  .lv-ws { grid-template-columns: 1fr; gap: 20px; }
  .lv-ws-list { flex-direction: row; flex-wrap: wrap; }
  .lv-ws-item { flex: 1 1 150px; }
  .lv-ws-screen { order: -1; }
  .lv-ws-screen .lv-fxr-frame { display: block; min-height: 0; padding: 18px; }
  .lv-ws-screen .lv-sc-scale { width: 100%; transform: none; }
}

/* differentiator */
.lv-diff { background: var(--bg-warm); border-top: 1px solid var(--line-soft); border-bottom: 1px solid var(--line-soft); }
.lv-diff-intro { max-width: 640px; }
.lv-diff h2 { font-family: var(--font-d); font-size: 40px; line-height: 1.08; letter-spacing: -.03em; font-weight: 700; margin-bottom: 18px; }
.lv-diff h2 .strike { color: var(--ink-faint); text-decoration: line-through; text-decoration-color: var(--accent); text-decoration-thickness: 3px; }
.lv-diff p { font-size: 16px; line-height: 1.6; color: var(--ink-soft); margin-bottom: 14px; }
.lv-diff p strong { color: var(--ink); font-weight: 600; }

/* how it works — numbered */
.lv-steps { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.lv-step { background: var(--card); border: 1px solid var(--line); border-radius: var(--r); padding: 26px; display: flex; gap: 18px; align-items: flex-start; transition: border-color .2s, transform .2s; }
.lv-step:hover { transform: translateY(-2px); border-color: var(--accent); }
.lv-step-n { font-family: var(--font-d); font-size: 15px; font-weight: 700; color: var(--accent); width: 38px; height: 38px; border-radius: 50%; border: 1.5px solid var(--accent-tint); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lv-step h4 { font-family: var(--font-d); font-size: 18px; font-weight: 600; margin-bottom: 6px; }
.lv-step p { font-size: 14px; line-height: 1.5; color: var(--ink-soft); }

/* faq */
.lv-faq-wrap { max-width: 760px; }
.lv-faq-item { border-top: 1px solid var(--line); padding: 22px 0; }
.lv-faq-item:last-child { border-bottom: 1px solid var(--line); }
.lv-faq-q { width: 100%; background: none; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 16px; font-family: var(--font-b); font-size: 16.5px; font-weight: 600; color: var(--ink); text-align: left; }
.lv-faq-q i { font-size: 19px; color: var(--ink-faint); transition: transform .2s; flex-shrink: 0; }
.lv-faq-item.open .lv-faq-q i { transform: rotate(45deg); color: var(--accent); }
.lv-faq-a { font-size: 14.5px; line-height: 1.65; color: var(--ink-soft); max-height: 0; overflow: hidden; transition: max-height .3s ease, padding-top .3s ease; }
.lv-faq-item.open .lv-faq-a { max-height: 320px; padding-top: 14px; }

/* final cta */
.lv-final { padding: 110px 0; }
.lv-final-card { position: relative; background: var(--ink-deep); color: var(--bg); border-radius: var(--r-lg); padding: 72px 56px; overflow: hidden; text-align: center; }
.lv-final-card .lv-eyebrow { color: var(--accent); }
.lv-final-card h2 { font-family: var(--font-d); font-size: 50px; line-height: 1.04; letter-spacing: -.03em; font-weight: 700; color: #fff; margin: 14px 0 16px; }
.lv-final-card p { font-size: 17px; color: rgba(255,255,255,.7); max-width: 480px; margin: 0 auto 32px; line-height: 1.55; }
.lv-final-blob { position: absolute; border-radius: 50%; filter: blur(2px); opacity: .5; }

/* footer */
.lv-foot { border-top: 1px solid var(--line); }
.lv-foot-in { display: flex; justify-content: space-between; align-items: center; padding: 32px 0; font-size: 13px; color: var(--ink-faint); flex-wrap: wrap; gap: 14px; }
.lv-foot-links a { color: var(--ink-faint); text-decoration: none; margin-left: 26px; transition: color .15s; }
.lv-foot-links a:hover { color: var(--ink); }

@media (max-width: 980px) {
  .lv-wrap { padding: 0 24px; }
  .lv-hero h1 { font-size: 48px; }
  .lv-hero-grid { grid-template-columns: 1fr; gap: 36px; }
  .lv-orbit { height: 380px; }
  .lv-nav-pill { display: none; }
  .lv-head h2 { font-size: 34px; }
  .lv-offer-grid { grid-template-columns: 1fr 1fr; }
  .lv-offer.wide { grid-column: span 2; }
  .lv-steps { grid-template-columns: 1fr; }
  .lv-final-card { padding: 52px 28px; }
  .lv-final-card h2 { font-size: 36px; }
}
@media (max-width: 600px) {
  .lv-hero h1 { font-size: 38px; }
  .lv-offer-grid { grid-template-columns: 1fr; }
  .lv-offer.wide { grid-column: span 1; flex-direction: column; align-items: flex-start; gap: 14px; }
  .lv-cred-in { justify-content: center; text-align: center; }
}

/* ─── merged sections: head-start · solve-the-challenge · memory rows · example result ─── */

/* horizontal card carousels (shared by head-start + solve-the-challenge) */
.lv-caro { position: relative; }
.lv-caro-ctrls { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 20px; }
.lv-caro-btn { width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid var(--line); background: var(--card); color: var(--ink); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; transition: border-color .15s, background .15s, transform .15s; }
.lv-caro-btn:hover { border-color: var(--ink); background: var(--bg-warm); transform: translateY(-2px); }
.lv-caro-btn:disabled { opacity: .35; cursor: default; }
.lv-caro-btn:disabled:hover { border-color: var(--line); background: var(--card); transform: none; }
.lv-caro-track { display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x proximity; padding: 6px 4px 20px; scrollbar-width: none; -ms-overflow-style: none; }
.lv-caro-track::-webkit-scrollbar { display: none; }
.lv-caro-track > * { scroll-snap-align: start; flex: 0 0 auto; }

/* head-start cards — each tinted so the carousel reads as colorful, not flat.
   Cycle is orange/gold/black/white (matches the Hero palette); orange is the
   same vivid var(--accent) as the Hero's CTA button, not the pale tint, so it
   reads as a real color instead of a wash. White is a plain light card, used
   deliberately next to black for contrast. Teal is intentionally absent from
   this cycle — it only survives as a small internal accent (e.g. a pill tag)
   inside a preview, never as a card's own background. */
.lv-hs-card { width: 336px; border: 1px solid var(--line); border-radius: var(--r-lg); padding: 22px; display: flex; flex-direction: column; gap: 14px; transition: transform .2s, box-shadow .2s, border-color .2s; }
.lv-hs-card:hover { transform: translateY(-4px); box-shadow: 0 20px 46px -22px rgba(96,72,62,.2); }
/* Ambient glow on hover — same diffused, bled-outward technique as the CV
   DropZone's hover state (large blur, negative spread, translucent color),
   just recolored per card tint instead of DropZone's fixed accent. Layered
   alongside the neutral lift-shadow above rather than replacing it. */
.lv-hs-card.t-orange:hover { box-shadow: 0 20px 46px -22px rgba(96,72,62,.2), 0 38px 78px -28px rgba(96,97,125,.4); }
.lv-hs-card.t-gold:hover { box-shadow: 0 20px 46px -22px rgba(96,72,62,.2), 0 38px 78px -28px rgba(184,132,28,.4); }
.lv-hs-card.t-ink:hover { box-shadow: 0 20px 46px -22px rgba(96,72,62,.2), 0 38px 78px -28px rgba(24,20,16,.5); }
.lv-hs-card.t-white:hover { box-shadow: 0 20px 46px -22px rgba(96,72,62,.2), 0 38px 78px -28px rgba(184,132,28,.22); }
.lv-hs-card.t-orange { background: var(--accent); border-color: transparent; }
.lv-hs-card.t-orange .lv-hs-name { color: #fff; }
.lv-hs-card.t-orange .lv-hs-desc { color: rgba(255,255,255,.78); }
.lv-hs-card.t-orange .lv-hs-tag { background: rgba(255,255,255,.2); color: #fff; }
.lv-hs-card.t-orange .lv-hs-preview { background: rgba(255,255,255,.18); }
.lv-hs-card.t-gold { background: var(--golden-tint); border-color: transparent; }
.lv-hs-card.t-ink { background: var(--ink-deep); border-color: transparent; }
.lv-hs-card.t-ink .lv-hs-name { color: #fff; }
.lv-hs-card.t-ink .lv-hs-desc { color: rgba(255,255,255,.62); }
.lv-hs-card.t-ink .lv-hs-tag { background: rgba(255,255,255,.14); color: #fff; }
.lv-hs-card.t-white { background: var(--card); }
.lv-hs-card.t-white .lv-hs-preview { background: var(--bg-warm); }
.lv-hs-preview { background: rgba(255,255,255,.6); border-radius: var(--r); padding: 14px; min-height: 168px; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
.lv-hs-card.t-ink .lv-hs-preview { background: rgba(255,255,255,.07); }
.lv-hs-name { font-family: var(--font-d); font-size: 17px; font-weight: 600; letter-spacing: -.01em; }
.lv-hs-desc { font-size: 13.5px; line-height: 1.5; color: var(--ink-soft); flex: 1; }
.lv-hs-tag { align-self: flex-start; font-family: var(--font-m); font-size: 9.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; }

/* solve-the-challenge cards — background tint matches the top-border color */
.lv-ch-card { width: 320px; border: 1px solid var(--line); border-top: 4px solid var(--ink-faint); border-radius: var(--r-lg); padding: 24px; display: flex; flex-direction: column; gap: 13px; transition: transform .2s, box-shadow .2s; }
.lv-ch-card:hover { transform: translateY(-4px); box-shadow: 0 20px 46px -22px rgba(96,72,62,.2); }
/* Same DropZone-style ambient glow as .lv-hs-card above, recolored per tint. */
.lv-ch-card.b-orange:hover { box-shadow: 0 20px 46px -22px rgba(96,72,62,.2), 0 38px 78px -28px rgba(96,97,125,.4); }
.lv-ch-card.b-gold:hover { box-shadow: 0 20px 46px -22px rgba(96,72,62,.2), 0 38px 78px -28px rgba(184,132,28,.4); }
.lv-ch-card.b-black:hover { box-shadow: 0 20px 46px -22px rgba(96,72,62,.2), 0 38px 78px -28px rgba(24,20,16,.5); }
.lv-ch-card.b-white:hover { box-shadow: 0 20px 46px -22px rgba(96,72,62,.2), 0 38px 78px -28px rgba(184,132,28,.22); }
.lv-ch-card.b-orange { border-top-color: var(--accent); background: var(--accent); border-color: transparent; }
.lv-ch-card.b-orange .lv-ch-name { color: rgba(255,255,255,.65); }
.lv-ch-card.b-orange .lv-ch-prob { color: #fff; }
.lv-ch-card.b-orange .lv-ch-sol { color: rgba(255,255,255,.85); }
.lv-ch-card.b-orange .lv-ch-cta { color: #fff; }
.lv-ch-card.b-gold { border-top-color: var(--golden); background: var(--golden-tint); border-color: transparent; }
.lv-ch-card.b-black { border-top-color: var(--ink-deep); background: var(--ink-deep); border-color: transparent; }
.lv-ch-card.b-black .lv-ch-name { color: rgba(255,255,255,.5); }
.lv-ch-card.b-black .lv-ch-prob { color: #fff; }
.lv-ch-card.b-black .lv-ch-sol { color: rgba(255,255,255,.66); }
.lv-ch-card.b-white { background: var(--card); border-top-color: var(--ink-faint); }
.lv-ch-name { font-family: var(--font-m); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-faint); }
.lv-ch-prob { font-family: var(--font-d); font-size: 18px; font-weight: 600; line-height: 1.32; letter-spacing: -.01em; }
.lv-ch-sol { font-size: 13.5px; line-height: 1.55; color: var(--ink-soft); flex: 1; }
.lv-ch-cta { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; font-family: var(--font-b); font-size: 14px; font-weight: 600; color: var(--accent-deep); background: none; border: none; padding: 0; cursor: pointer; transition: gap .15s; }
.lv-ch-cta:hover { gap: 10px; }

/* one-memory fan cards — a full-width row of portrait cards. Default state
   shows just the two-tier title in a compact width; hovering (or focusing,
   for keyboard users) one card widens it via React state (not a CSS :hover
   trick — see Differentiator's "hovered" state) so the desc + mockup are
   revealed while its siblings compress, a horizontal accordion "fan". The
   revealed content itself is wider than the collapsed card so it's simply
   clipped by the card's own overflow:hidden until expanded — same clip-and-
   reveal idea the old up/down accordion used, turned sideways. */
.lv-mem-fan { display: flex; gap: 14px; margin-top: 44px; height: 460px; width: 100vw; position: relative; left: 50%; right: 50%; margin-left: -50vw; margin-right: -50vw; padding: 0 40px; }
.lv-mem-card { position: relative; overflow: hidden; min-width: 210px; border-radius: var(--r-lg); background: var(--card); padding: 24px 22px; display: flex; flex-direction: column; cursor: pointer; transition: flex .45s cubic-bezier(.22,.61,.36,1); }
.lv-mem-card:focus-visible { outline: 2px solid var(--ink); outline-offset: -2px; }
.lv-mem-card-head { flex-shrink: 0; }
.lv-mem-card-name { font-family: var(--font-d); font-size: 16px; font-weight: 700; line-height: 1.25; transition: font-size .3s ease; }
/* Two-tier title: a bold headline phrase ("Log every win") plus a small,
   muted mono label naming the actual tool underneath ("Story Bank") — same
   label styling (mono, uppercase, faint) used for .lv-ch-name / .lv-exres-h
   elsewhere, just placed under the headline instead of above it. Long
   enough to wrap across lines rather than truncate; compressed by a hovered
   sibling, the card gets narrow enough that smaller sizes keep the wrap from
   running too tall against the card's own overflow:hidden. */
.lv-mem-card-tool { font-family: var(--font-m); font-size: 10.5px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-faint); margin-top: 4px; transition: font-size .3s ease; }
.lv-mem-card.compressed .lv-mem-card-name { font-size: 12.5px; }
.lv-mem-card.compressed .lv-mem-card-tool { font-size: 9px; }
.lv-mem-card-body { margin-top: 22px; min-width: 300px; display: flex; flex-direction: column; flex: 1; min-height: 0; opacity: 0; transition: opacity .2s ease; }
.lv-mem-card.on .lv-mem-card-body { opacity: 1; transition: opacity .3s ease .12s; }
.lv-mem-desc { font-size: 14px; line-height: 1.5; color: var(--ink-soft); margin-bottom: 16px; }
.lv-mem-shot { background: rgba(255,255,255,.55); border-radius: 10px; padding: 14px; flex: 1; overflow: hidden; }
.lv-mem-card.orange { background: var(--accent); }
.lv-mem-card.orange .lv-mem-card-name { color: #fff; }
.lv-mem-card.orange .lv-mem-card-tool { color: rgba(255,255,255,.7); }
.lv-mem-card.orange .lv-mem-desc { color: rgba(255,255,255,.78); }
.lv-mem-card.orange .lv-mem-shot { background: rgba(255,255,255,.16); }
.lv-mem-card.gold { background: var(--golden-tint); }
.lv-mem-card.black { background: var(--ink-deep); }
.lv-mem-card.black .lv-mem-card-name { color: #fff; }
.lv-mem-card.black .lv-mem-card-tool { color: rgba(255,255,255,.55); }
.lv-mem-card.black .lv-mem-desc { color: rgba(255,255,255,.66); }
.lv-mem-card.black .lv-mem-shot { background: rgba(255,255,255,.08); }
.lv-mem-card.white { background: var(--card); border: 1px solid var(--line); }
.lv-mem-card.white .lv-mem-shot { background: var(--bg-warm); }
@media (max-width: 980px) {
  /* Fanning four cards sideways needs real horizontal room — below the same
     breakpoint the nav collapses at, stack them and let each grow to full
     width instead. The inline flex style from JS is overridden here since it
     otherwise beats any stylesheet rule regardless of viewport. */
  .lv-mem-fan { flex-direction: column; height: auto; padding: 0 24px; }
  .lv-mem-card { flex: 1 1 auto !important; min-width: 0; }
  .lv-mem-card-body { min-width: 0; }
}

/* example result — cycles between a few illustrative personas under the CV
   drop. Its own keyframe (not the shared lvfade the tool showcase uses):
   slide + fade + a slight scale-in together read as a more deliberate swap
   than a flat crossfade. Reduced motion is handled the same way the rest of
   this component already does — the rotation interval never starts, so the
   slide never replays after its one-time mount animation. */
.lv-exres { max-width: 720px; margin: 42px auto 0; }
.lv-exres-label { font-family: var(--font-m); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-faint); text-align: center; margin-bottom: 14px; }
.lv-exres-card { background: var(--card); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 28px; box-shadow: 0 26px 64px -34px rgba(96,72,62,.26); overflow: hidden; }
.lv-exres-slide { animation: lvexresin .5s cubic-bezier(.22,.61,.36,1); }
@keyframes lvexresin { from { opacity: 0; transform: translateX(22px) scale(.97); } to { opacity: 1; transform: none; } }
.lv-exres-top { display: flex; gap: 24px; align-items: center; }
.lv-exres-score { font-family: var(--font-d); font-size: 62px; font-weight: 800; line-height: 1; letter-spacing: -.03em; color: var(--teal); text-align: center; }
.lv-exres-score-l { font-size: 13px; color: var(--ink-soft); margin-top: 7px; text-align: center; }
.lv-exres-blurb { font-size: 15px; line-height: 1.55; color: var(--ink-soft); flex: 1; }
.lv-exres-div { height: 1px; background: var(--line); margin: 22px 0; }
.lv-exres-h { font-family: var(--font-m); font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 12px; }
.lv-exres-role { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--line-soft); font-size: 14.5px; font-weight: 600; }
.lv-exres-role:last-child { border-bottom: none; }
.lv-exres-rr { display: inline-flex; align-items: center; gap: 12px; }
.lv-exres-pct { font-family: var(--font-d); color: var(--ink-soft); font-weight: 600; }
.lv-exres-act { display: flex; align-items: center; gap: 11px; padding: 8px 0; font-size: 14.5px; color: var(--ink); }
.lv-exres-act i { color: var(--accent); font-size: 17px; flex-shrink: 0; }

@media (max-width: 640px) {
  .lv-hs-card, .lv-ch-card { width: 260px; }
  .lv-exres-top { flex-direction: column; text-align: center; gap: 16px; }
}
`;

// ────────────────────────────────────────────────────────────────────────
// Canonical origin. The apex 308-redirects to www, so www is the authoritative
// host; both `/` and `/Landing` render this component and canonicalize to `/`.
const CANONICAL_URL = "https://www.getajob.careers/";

// Structured data ported from the retired Landing.jsx (Organization + FAQPage).
// Google renders JS so injecting at runtime is fine; social unfurlers ignore it.
const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Get A Job",
  url: CANONICAL_URL,
  description:
    "An AI-powered career operating system - specialist agents and a connected workspace that remembers your full background.",
};

// FAQPage JSON-LD is built at runtime from the SAME FAQS array the visible
// FAQSection renders (below) — Google requires structured-data FAQ to match
// on-page content, so this must never drift from what the user sees.

function useLandingV2Head() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Get A Job: Your job search, finally connected";
    // Match the page ground so overscroll / any uncovered sliver never flashes
    // the browser's default white. Restored on unmount.
    const prevBodyBg = document.body.style.background;
    const prevHtmlBg = document.documentElement.style.background;
    document.body.style.background = "#F4EBDA";
    document.documentElement.style.background = "#F4EBDA";
    let tabler = document.head.querySelector("link[data-lv-tabler]");
    const existed = !!tabler;
    if (!tabler) {
      tabler = document.createElement("link");
      tabler.rel = "stylesheet";
      // Pinned (was @latest) — an unpinned CDN dep on the public homepage is a
      // supply-chain + cache risk. Bump deliberately.
      tabler.href =
        "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.44.0/dist/tabler-icons.min.css";
      tabler.setAttribute("data-lv-tabler", "");
      document.head.appendChild(tabler);
    }
    // Canonical: /Landing → / (both render this component). Set only if we
    // create it, and remove on unmount so /privacy, /terms etc. are never
    // mis-canonicalized to the homepage.
    let canonical = document.head.querySelector("link[data-lv-canonical]");
    const canonicalExisted = !!canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      canonical.href = CANONICAL_URL;
      canonical.setAttribute("data-lv-canonical", "");
      document.head.appendChild(canonical);
    }
    // Structured data (Organization + FAQPage). FAQ derived from the live
    // FAQS array so the JSON-LD always mirrors the visible FAQ section.
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    };
    const schemaNodes = [ORGANIZATION_SCHEMA, faqSchema].map((schema) => {
      const node = document.createElement("script");
      node.type = "application/ld+json";
      node.setAttribute("data-lv-schema", "");
      node.textContent = JSON.stringify(schema);
      document.head.appendChild(node);
      return node;
    });
    return () => {
      document.title = prev;
      document.body.style.background = prevBodyBg;
      document.documentElement.style.background = prevHtmlBg;
      if (!existed) tabler.remove();
      if (!canonicalExisted) canonical.remove();
      schemaNodes.forEach((n) => n.remove());
    };
  }, []);
}

// Motion. The signature of the reference sites is SMOOTH-SCROLL (Lenis) with
// every animation POSITION-LINKED (scrubbed) on top — that inertia is what makes
// it feel deliberate instead of janky. So we load Lenis (smooth scroll) and run
// our scrubbed animations inside its rAF, every frame:
//   • Crossfade — each .lv-fade section's opacity tracks its position, so the
//     outgoing section dissolves while the next fades in.
//   • Parallax layers drift by their distance from the viewport centre.
// Falls back to native scroll if Lenis can't load.
// Shared so the pinned feature explorer can scroll instantly via Lenis (a smooth
// scroll across the pin flicks through every tool — feels buggy).
let lenisInstance = null;
let snapInstance = null;

// Smooth-scroll an in-page anchor through Lenis. The section-snap is paused for
// the glide — otherwise it yanks the scroll back to a snap point mid-flight —
// then resumed when the scroll lands.
function lvScrollTo(e, target) {
  e.preventDefault();
  if (!lenisInstance) {
    document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (snapInstance && snapInstance.stop) snapInstance.stop();
  const resume = () => {
    if (snapInstance && snapInstance.start) snapInstance.start();
  };
  lenisInstance.scrollTo(target, { duration: 1.1, onComplete: resume });
  setTimeout(resume, 1700);
}

// Section snapping via Lenis's own Snap addon (folds the snap into the scroll
// physics instead of glide-then-snap). type:"proximity" only snaps when you stop
// near a snap point, so free-scrolling within a section (e.g. reading the FAQ)
// is untouched — it only engages near a registered boundary. Deliberately NOT
// native CSS scroll-snap: Lenis intercepts wheel input and drives the scroll
// itself via rAF, so a browser-native re-snap on top of that fights it (two
// competing writers to scrollTop) and reintroduces the glide-then-snap jank
// this addon exists to avoid — so every boundary below is registered the same
// way as the original #features point, not via scroll-snap-type/-align.
// We do NOT register the hero — snapping back to the top would reverse the
// hero's scroll-recede (the content fades back in, which looks wrong).
function setupSnap(lenis) {
  let snap = null;
  let cancelled = false;
  import("lenis/snap")
    .then(({ default: Snap }) => {
      if (cancelled) return;
      snap = new Snap(lenis, {
        type: "proximity",
        // Default 50% yanks from far away (fights you); 25% was too loose. 38%
        // is the middle — engages once you're meaningfully into a transition.
        distanceThreshold: "38%",
        debounce: 200,
        duration: 0.6,
        easing: (t) =>
          t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
      });
      [
        "#features",
        "#head-start",
        "#challenge",
        "#differentiator",
        "#how",
        "#start",
        "#faq",
        "#final-cta",
      ].forEach((s) => {
        const el = document.querySelector(s);
        if (el && snap.addElement) snap.addElement(el, { align: "start" });
      });
      // The footer isn't a "stop" like the sections above (it stays its
      // natural short height, no full-viewport treatment) — but with no snap
      // point of its own, #final-cta (the last registered point) was the
      // only candidate anywhere near the bottom, and proximity's pull radius
      // (38% of viewport) covers the entire remaining scrollable distance
      // below it, so any attempt to scroll past FinalCTA into the footer
      // just snapped straight back up. Align "end" — the footer's bottom
      // flush with the viewport bottom — gives proximity a real competing
      // point once the user is actually trying to reach the footer, instead
      // of a top-aligned "stop" like every other registered section.
      const footerEl = /** @type {HTMLElement | null} */ (
        document.querySelector(".lv-foot")
      );
      if (footerEl && snap.addElement)
        snap.addElement(footerEl, { align: "end" });
      snapInstance = snap;
      console.info("[landing-v2] snap addon active");
    })
    .catch((e) => console.warn("[landing-v2] snap addon unavailable", e));
  return () => {
    cancelled = true;
    snapInstance = null;
    if (snap && snap.destroy) snap.destroy();
  };
}

function useMotion() {
  useEffect(() => {
    const reveals = Array.from(document.querySelectorAll(".lv-reveal"));
    const parallax = Array.from(document.querySelectorAll("[data-parallax]"));
    // Hero ↔ features crossfade. Only the CONTENT (.lv-wrap) shrinks + fades —
    // the decorative shapes and dotted ground are left exactly as they were.
    const heroEl = document.querySelector(".lv-hero");
    const heroWrap = document.querySelector(".lv-hero .lv-wrap");
    const featTitle = document.querySelector(".lv-feat-title");
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveals.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      if (heroWrap) {
        heroWrap.style.opacity = "1";
        heroWrap.style.transform = "none";
      }
      if (featTitle) featTitle.style.opacity = "1";
      return undefined;
    }

    // Measure each parallax layer's transform-free document-centre once.
    const measure = () =>
      parallax.forEach((el) => {
        el.style.transform = "";
        const r = el.getBoundingClientRect();
        el.dataset.base = String(
          Math.round(r.top + window.scrollY + r.height / 2),
        );
      });

    // Reveal each .lv-reveal block ONCE, when its top crosses into view: set
    // inline opacity/transform so the CSS transition eases it in (data-d adds a
    // little stagger). Triggered by getBoundingClientRect, NOT IntersectionObserver
    // — IO doesn't fire while a tab is hidden, which is what hid every earlier
    // reveal. Parallax tracks scroll continuously.
    const vh = () => window.innerHeight;
    let armed = false;
    const update = () => {
      const h = vh();
      if (armed) {
        reveals.forEach((el) => {
          if (!el.dataset.shown && el.getBoundingClientRect().top < 0.86 * h) {
            const d = parseFloat(el.dataset.d) || 0;
            if (d) el.style.transitionDelay = `${(d * 0.08).toFixed(2)}s`;
            el.style.opacity = "1";
            el.style.transform = "none";
            el.dataset.shown = "1";
          }
        });
      }
      const mid = window.scrollY + h / 2;
      parallax.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax) || 0;
        const base = parseFloat(el.dataset.base) || 0;
        el.style.transform = `translate3d(0, ${((base - mid) * speed).toFixed(1)}px, 0)`;
      });
      // Hero ↔ features crossfade. The hero content is PINNED against the scroll
      // (translateY counters scrollY) so it doesn't drift upward — it only shrinks
      // toward its centre and fades, receding straight into the page. It fades out
      // before the hero's clip edge would cut it. Decorations untouched.
      if (heroWrap && heroEl) {
        const heroH = heroEl.offsetHeight || h;
        const y = window.scrollY;
        const heroOp = clamp01(1 - (y - 0.02 * heroH) / (0.4 * heroH));
        const ty = Math.min(y, heroH);
        heroWrap.style.opacity = heroOp.toFixed(3);
        heroWrap.style.transform = `translateY(${ty.toFixed(1)}px) scale(${(0.7 + 0.3 * heroOp).toFixed(4)})`;
        if (featTitle)
          featTitle.style.opacity = clamp01(
            (y - 0.45 * heroH) / (0.5 * heroH),
          ).toFixed(3);
      }
    };

    // Parallax runs immediately; arm the reveals only after webfonts settle the
    // layout (otherwise a block measured above the fold mid-load reveals, then
    // gets pushed down — showing already-on, un-animated). The hero's entrance
    // fires the moment we arm.
    measure();
    const arm = () => {
      if (!armed) {
        armed = true;
        measure();
      }
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(arm);
    setTimeout(arm, 600);
    // Build marker so we can confirm in the console which motion build is live.
    console.info("[landing-v2] motion build 2026-06-27d — per-block reveals");

    // Reveals + parallax run in their OWN always-on rAF. Nothing Lenis does
    // (failing to load, hijacking the wheel so native scroll events stop firing,
    // throwing in its own callback) can stop this loop — it only pauses while the
    // tab is hidden, and onVis re-syncs on return.
    let rafId = requestAnimationFrame(function tick() {
      update();
      rafId = requestAnimationFrame(tick);
    });

    // Smooth-scroll inertia — Lenis, in a SEPARATE loop so it's purely additive.
    let lenis = null;
    let lenisRaf = 0;
    let cleanupSnap = null;
    let cancelled = false;
    import("lenis")
      .then(({ default: Lenis }) => {
        if (cancelled || typeof Lenis !== "function") return;
        lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
        lenisInstance = lenis;
        cleanupSnap = setupSnap(lenis);
        lenisRaf = requestAnimationFrame(function lraf(t) {
          lenis.raf(t);
          lenisRaf = requestAnimationFrame(lraf);
        });
        console.info("[landing-v2] Lenis active");
      })
      .catch((e) => console.warn("[landing-v2] Lenis failed", e));

    // Belt-and-braces: also update on raw scroll (covers the hidden-tab case
    // where rAF is paused but scroll events still fire).
    const onScroll = () => update();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onResize = () => {
      measure();
      update();
    };
    window.addEventListener("resize", onResize);
    const onVis = () => {
      if (!document.hidden) {
        measure();
        update();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (lenisRaf) cancelAnimationFrame(lenisRaf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      if (cleanupSnap) cleanupSnap();
      if (lenis && lenis.destroy) lenis.destroy();
      lenisInstance = null;
    };
  }, []);
}

// Pinned-scene primitive. `outer` is a tall spacer; its child is position:sticky
// (100vh). Scrolling the pinned span maps progress 0..1 → a stepped `active`
// index (content swaps). Own rAF + getBoundingClientRect, so it's background-tab-
// safe and rides Lenis. setActive only fires on change (no per-frame re-render).
// Below the pin threshold (mobile, scrollable ≤ 40) it leaves `active` alone.
function useStickyProgress(outerRef, steps, setActive) {
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const outer = outerRef.current;
      if (outer) {
        const scrollable = outer.offsetHeight - window.innerHeight;
        if (scrollable > 40) {
          const p = Math.min(
            1,
            Math.max(0, -outer.getBoundingClientRect().top / scrollable),
          );
          const idx = Math.max(0, Math.min(steps - 1, Math.floor(p * steps)));
          setActive((prev) => (prev === idx ? prev : idx));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [outerRef, steps, setActive]);
}

// Horizontal card carousel — a plain overflow-x track nudged one card-width
// per arrow click, honestly bounded at the real first/last card (no cloned
// duplicates, no loop). An earlier version cloned a couple of cards at each
// end to fake an infinite loop, but the "align this card to the track's left
// edge" scrollTo strategy is only reachable when a single card fills the
// viewport — once more than one card is visible at once (the normal desktop
// case), the browser's native max-scroll clamps before the cloned end cards
// can ever be scrolled into that leftmost position, so the loop physically
// can't engage on wide viewports no matter how the re-centering is wired up.
// A plain bounded carousel that reliably stops at its real ends beats a loop
// that silently dead-ends. Arrow buttons disable at each end instead.
function useCarousel(items) {
  const ref = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(items.length <= 1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => {
      // Compare against the first card's own offset, not a hardcoded 0-ish
      // guess — the track's left padding puts its natural resting position a
      // few px in, and that resting value differs slightly between a
      // button-triggered scrollBy and a native wheel/drag scroll.
      const startSlack = (el.firstElementChild?.offsetLeft ?? 0) + 2;
      setAtStart(el.scrollLeft <= startSlack);
      setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 2);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items]);

  const scrollByCards = (dir) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const behavior = reduce ? "auto" : "smooth";
    const first = el.firstElementChild;
    const step = first
      ? first.getBoundingClientRect().width + 16
      : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior });
  };

  return {
    ref,
    atStart,
    atEnd,
    prev: () => scrollByCards(-1),
    next: () => scrollByCards(1),
  };
}

// ────────────────────────────────────────────────────────────────────────
function Nav({ isLoggedIn, onCTA, onLogin }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className={`lv-nav${scrolled ? " scrolled" : ""}`}>
      <div className="lv-wrap lv-nav-in">
        <div className="lv-logo">
          getajob
          <span className="dot" />
        </div>
        <div className="lv-nav-pill">
          <a href="#features" onClick={(e) => lvScrollTo(e, "#features")}>
            Features
          </a>
          <a href="#how" onClick={(e) => lvScrollTo(e, "#how")}>
            How it works
          </a>
          <a href="#faq" onClick={(e) => lvScrollTo(e, "#faq")}>
            FAQ
          </a>
        </div>
        <div className="lv-nav-right">
          {!isLoggedIn && (
            <button type="button" className="lv-nav-login" onClick={onLogin}>
              Log in
            </button>
          )}
          <button type="button" className="btn btn-ink btn-sm" onClick={onCTA}>
            {isLoggedIn ? "Dashboard" : "Start"}
          </button>
        </div>
      </div>
    </nav>
  );
}

function DropZone({ onUpload }) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  // Real handoff (not a pantomime): stash the dropped CV in IndexedDB
  // (browser-only, no server call, no parse) so onboarding auto-consumes it
  // after signup, then route into the real signup funnel.
  const start = async (file) => {
    if (busy || !file) return;
    setBusy(true);
    await savePendingCv(file); // false in private mode / quota; we proceed either way
    onUpload();
  };
  return (
    <div
      className={`lv-drop${drag ? " drag" : ""}${busy ? " busy" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="Upload your CV"
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        start(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        style={{ display: "none" }}
        onChange={(e) => start(e.target.files?.[0])}
      />
      {busy ? (
        <>
          <div className="lv-drop-ic">
            <i className="ti ti-circle-check" />
          </div>
          <div className="lv-drop-t">Saved to this browser</div>
          <div className="lv-drop-s">
            Taking you to sign up. Your CV carries over.
          </div>
        </>
      ) : drag ? (
        <>
          <div className="lv-drop-ic">
            <i className="ti ti-file-download" />
          </div>
          <div className="lv-drop-t">Drop to start</div>
        </>
      ) : (
        <>
          <div className="lv-drop-ic">
            <i className="ti ti-cloud-upload" />
          </div>
          <div className="lv-drop-t">Drag your CV here</div>
          <div className="lv-drop-s">
            or <span className="lk">browse files</span> · PDF or DOCX
          </div>
          <div className="lv-drop-cta">
            <span className="btn btn-accent btn-sm">
              Upload &amp; see your roadmap{" "}
              <i className="ti ti-arrow-up-right" />
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// Hero scale stats. HERO_STATS_FALLBACK is an INTENTIONAL fallback, not
// dead code: it's what renders on first paint (before the live fetch
// resolves) and whatever the live landing_stats read fails or comes back
// stale — see useLiveHeroStats below. Keep "5,700+" / "525+" roughly
// current by hand regardless; they're the numbers a visitor sees on any
// read failure. Stats 1-2 animate a count-up; stats 3-4 are text-only
// (icon plus a line, no number). Text-only stats omit `to`; the render
// keys off that.
const HERO_STATS_FALLBACK = [
  {
    to: 5700,
    suffix: "+",
    label: "live roles",
    icon: "ti-briefcase",
  },
  {
    to: 525,
    suffix: "+",
    label: "companies hiring now",
    icon: "ti-building-skyscraper",
  },
  {
    text: "Sourced direct from company career pages",
    icon: "ti-plug-connected",
  },
  { text: "Refreshed every night", icon: "ti-moon" },
];

// landing_stats is populated nightly by scripts/refresh-jobs.ts (service
// role) right after that night's soft-delete sweep. A read past this
// window means the cron missed a run or two — trust HERO_STATS_FALLBACK
// over a live number that could be days stale.
const LANDING_STATS_STALE_MS = 48 * 60 * 60 * 1000;

// Reads the single landing_stats row and returns { live_roles_count,
// companies_hiring_count } when it's present AND fresh, else null. null
// means "use the fallback" — covers the row missing, the query erroring,
// the fetch still in flight, and staleness, all the same way, since none
// of those are cases where showing a stale/broken number beats the
// hand-maintained literal.
function useLiveHeroStats() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let cancelled = false;
    // landing_stats is a public SELECT-only counter (RLS guards the read).
    // Any failure (network, missing/stale row) is swallowed → the caller
    // falls back to the hardcoded HERO_STATS literals.
    (async () => {
      try {
        const { data, error } = await supabase
          .from("landing_stats")
          .select("live_roles_count, companies_hiring_count, updated_at")
          .eq("id", 1)
          .single();
        if (cancelled || error || !data) return;
        const age = Date.now() - new Date(data.updated_at).getTime();
        if (age > LANDING_STATS_STALE_MS) return;
        setStats(data);
      } catch {
        /* ignore — fall back to literals */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return stats;
}

// Rolls a stat up from 0 → target when it mounts (the hero is in view on load).
// Pauses harmlessly if the tab is backgrounded — rAF resumes on focus.
// Odometer: each digit is a vertical reel of 0–9 (rendered twice) that rolls up
// one full turn and lands on its value on load — mechanical-counter feel.
function Odometer({ value, suffix = "", delay = 0 }) {
  const ref = useRef(null);
  const str = value.toLocaleString();
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const reels = root.querySelectorAll(".lv-od-reel");
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const id = setTimeout(
      () => {
        reels.forEach((r, i) => {
          if (reduce) r.style.transition = "none";
          else r.style.transitionDelay = `${(delay + i * 0.07).toFixed(2)}s`;
          r.style.transform = `translateY(-${r.dataset.final}em)`;
        });
      },
      reduce ? 0 : 90,
    );
    return () => clearTimeout(id);
  }, [str, delay]);
  return (
    <span className="lv-stat-n lv-odometer" ref={ref}>
      {str.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span className="lv-od-digit" key={i}>
            <span className="lv-od-reel" data-final={10 + Number(ch)}>
              {Array.from({ length: 20 }, (_, n) => (
                <span className="lv-od-num" key={n}>
                  {n % 10}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span className="lv-od-sep" key={i}>
            {ch}
          </span>
        ),
      )}
      {suffix ? <span className="lv-od-sep">{suffix}</span> : null}
    </span>
  );
}

function Hero({ onCTA }) {
  const liveStats = useLiveHeroStats();
  // Only stats 0 ("live roles") and 1 ("companies hiring now") have a live
  // source; splice in their counts when fresh data is available, otherwise
  // render HERO_STATS_FALLBACK untouched (labels/icons/suffix always come
  // from the fallback array — only `to` ever changes).
  const heroStats = liveStats
    ? HERO_STATS_FALLBACK.map((s, i) => {
        if (i === 0) return { ...s, to: liveStats.live_roles_count };
        if (i === 1) return { ...s, to: liveStats.companies_hiring_count };
        return s;
      })
    : HERO_STATS_FALLBACK;
  return (
    <header className="lv-hero lv-dots">
      <div
        className="lv-deco lv-ring dash"
        data-parallax="-0.16"
        style={{ width: 320, height: 320, top: -80, right: -60 }}
        aria-hidden="true"
      />
      <div
        className="lv-deco lv-griddots"
        data-parallax="0.13"
        style={{ width: 132, height: 132, bottom: 30, left: 10 }}
        aria-hidden="true"
      />
      <div
        className="lv-deco lv-blob"
        data-parallax="0.2"
        style={{
          width: 260,
          height: 260,
          background: "var(--accent)",
          opacity: 0.16,
          top: 70,
          left: -110,
        }}
        aria-hidden="true"
      />
      <div
        className="lv-deco lv-blob"
        data-parallax="-0.1"
        style={{
          width: 220,
          height: 220,
          background: "var(--teal)",
          opacity: 0.13,
          bottom: -60,
          right: 60,
        }}
        aria-hidden="true"
      />
      <div className="lv-wrap">
        <div className="lv-hero-top">
          <h1 className="lv-reveal">
            Everything you need to
            <br />
            <span className="accent">get a job,</span>
            <br />
            all in one place.
          </h1>
          <p className="lv-hero-sub lv-reveal" data-d="1">
            A ranked roadmap, CVs tailored to each job, and live matches, all
            built from one profile and <strong>kept in sync</strong>.
          </p>
          <div className="lv-hero-cta lv-reveal" data-d="2">
            <button type="button" className="btn btn-accent" onClick={onCTA}>
              Start here <i className="ti ti-arrow-up-right" />
            </button>
            <a
              className="lv-hero-link"
              href="#features"
              onClick={(e) => lvScrollTo(e, "#features")}
            >
              See how it works <i className="ti ti-arrow-down" />
            </a>
          </div>
        </div>
        <div className="lv-stats lv-reveal" data-d="3">
          {heroStats.map((s, i) => (
            <div className="lv-stat" key={s.label ?? s.text}>
              <i className={`ti ${s.icon} lv-stat-ic`} aria-hidden="true" />
              {s.to != null ? (
                <>
                  <Odometer value={s.to} suffix={s.suffix} delay={i * 0.12} />
                  <div className="lv-stat-l">{s.label}</div>
                </>
              ) : (
                <div className="lv-stat-t">{s.text}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

// The CV upload, its own section, placed after the feature tour so the value is
// shown before the ask.
// A few illustrative personas the example-result card cycles through — never
// real user data, just proof-of-concept variety. Every variant keeps the same
// "illustrative only" label (rendered once, outside the crossfade, so it
// always applies regardless of which persona is showing).
const EXAMPLE_RESULTS = [
  {
    persona: "Jonathan Charles, Product",
    score: 78,
    blurb:
      "Based on a sample CV: strong overlap with product and analyst roles, a few quick wins away from your top matches.",
    roles: [
      { role: "Associate PM", pct: "82%", band: "Sweet spot", cls: "tag-t1" },
      {
        role: "Business Analyst",
        pct: "71%",
        band: "Sweet spot",
        cls: "tag-t1",
      },
      { role: "Growth Marketing", pct: "58%", band: "Growth", cls: "tag-t3" },
    ],
    actions: [
      "Tailor your CV for Associate PM at Google",
      "Add 2 more quantified wins to your Story Bank",
      "Apply to 3 new matches this week",
    ],
  },
  {
    persona: "Adam Miller, Ops",
    score: 81,
    blurb:
      "Based on a sample CV: a strong operations background that reads even stronger once it's angled toward business analyst and data-facing roles.",
    roles: [
      {
        role: "Business Analyst",
        pct: "84%",
        band: "Sweet spot",
        cls: "tag-t1",
      },
      { role: "Data Analyst", pct: "76%", band: "Sweet spot", cls: "tag-t1" },
      { role: "Operations Lead", pct: "63%", band: "Growth", cls: "tag-t3" },
    ],
    actions: [
      "Tailor your CV for Business Analyst at Microsoft",
      "Add a quantified win about a dashboard you shipped",
      "Apply to 2 new matches this week",
    ],
  },
  {
    persona: "Joseph Green, Growth",
    score: 79,
    blurb:
      "Based on a sample CV: strong growth and ops signal, one step from a clean pivot into product.",
    roles: [
      {
        role: "Growth Marketing",
        pct: "80%",
        band: "Sweet spot",
        cls: "tag-t1",
      },
      { role: "Associate PM", pct: "70%", band: "Sweet spot", cls: "tag-t1" },
      { role: "Business Analyst", pct: "62%", band: "Growth", cls: "tag-t3" },
    ],
    actions: [
      "Tailor your CV for Growth Marketing at Adobe",
      "Capture a story about a process you improved",
      "Apply to 4 new matches this week",
    ],
  },
  {
    persona: "Sarah Bennett, Sales",
    score: 86,
    blurb:
      "Based on a sample CV: a track record that converts cleanly into account management and business development, with room to grow into customer success too.",
    roles: [
      {
        role: "Account Executive",
        pct: "89%",
        band: "Sweet spot",
        cls: "tag-t1",
      },
      {
        role: "Business Development Rep",
        pct: "81%",
        band: "Sweet spot",
        cls: "tag-t1",
      },
      {
        role: "Customer Success Manager",
        pct: "67%",
        band: "Growth",
        cls: "tag-t3",
      },
    ],
    actions: [
      "Tailor your CV for Account Executive at Salesforce",
      "Add a quantified win about a quota or deal you closed",
      "Apply to 3 new matches this week",
    ],
  },
  {
    persona: "Michael Turner, Data",
    score: 91,
    blurb:
      "Based on a sample CV: excellent overlap with data and BI roles - your analysis and tooling background is exactly what these teams are hiring for.",
    roles: [
      { role: "Data Analyst", pct: "93%", band: "Sweet spot", cls: "tag-t1" },
      { role: "BI Analyst", pct: "85%", band: "Sweet spot", cls: "tag-t1" },
      {
        role: "Product Analyst",
        pct: "72%",
        band: "Growth",
        cls: "tag-t3",
      },
    ],
    actions: [
      "Tailor your CV for Data Analyst at Deloitte",
      "Add a quantified win about a model or dashboard you built",
      "Apply to 5 new matches this week",
    ],
  },
  {
    persona: "Rachel Adams, Design",
    score: 84,
    blurb:
      "Based on a sample CV: a strong design portfolio and process, already reading well for product design roles with UX research close behind.",
    roles: [
      {
        role: "Product Designer",
        pct: "87%",
        band: "Sweet spot",
        cls: "tag-t1",
      },
      {
        role: "UX Researcher",
        pct: "77%",
        band: "Sweet spot",
        cls: "tag-t1",
      },
      { role: "Brand Designer", pct: "65%", band: "Growth", cls: "tag-t3" },
    ],
    actions: [
      "Tailor your CV for Product Designer at Spotify",
      "Add a case study walkthrough to your Story Bank",
      "Apply to 3 new matches this week",
    ],
  },
];

// Cycles the example-result card through EXAMPLE_RESULTS every 5s, crossfading
// via the same lvfade keyframe the tool showcase already uses for its
// per-tool crossfade (key={idx} remounts .lv-exres-slide, retriggering it).
// Reduced motion: skip the auto-advance entirely (stays on the first persona)
// rather than keep silently swapping content behind the user's back.
function ExampleResult() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return undefined;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % EXAMPLE_RESULTS.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);
  const r = EXAMPLE_RESULTS[idx];
  return (
    <div className="lv-exres lv-reveal" data-d="3">
      <div className="lv-exres-label">Example result - illustrative only</div>
      <div className="lv-exres-card">
        <div className="lv-exres-slide" key={idx}>
          <div className="lv-exres-top">
            <div>
              <div className="lv-exres-score">{r.score}</div>
              <div className="lv-exres-score-l">Readiness score</div>
            </div>
            <p className="lv-exres-blurb">{r.blurb}</p>
          </div>
          <div className="lv-exres-div" />
          <div className="lv-exres-h">Matched roles</div>
          {r.roles.map((row) => (
            <div className="lv-exres-role" key={row.role}>
              <span>{row.role}</span>
              <span className="lv-exres-rr">
                <span className="lv-exres-pct">{row.pct}</span>
                <span className={`lv-sc-pill ${row.cls}`}>{row.band}</span>
              </span>
            </div>
          ))}
          <div className="lv-exres-div" />
          <div className="lv-exres-h">Suggested actions</div>
          {r.actions.map((a) => (
            <div className="lv-exres-act" key={a}>
              <i className="ti ti-arrow-right" />
              {a}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DropSection({ onUpload }) {
  return (
    <section className="lv-section lv-dropsec lv-clip" id="start">
      <div
        className="lv-deco lv-ring dash"
        data-parallax="-0.12"
        style={{ width: 240, height: 240, top: -60, left: -50 }}
        aria-hidden="true"
      />
      <div
        className="lv-deco lv-blob"
        data-parallax="0.16"
        style={{
          width: 240,
          height: 240,
          background: "var(--accent)",
          opacity: 0.12,
          bottom: -70,
          right: -40,
        }}
        aria-hidden="true"
      />
      <div className="lv-wrap">
        <div className="lv-head center lv-reveal">
          <div className="lv-eyebrow">Start in minutes</div>
          <h2>Drop your CV. We&apos;ll build the rest.</h2>
          <p>
            Your roadmap, tailored resumes, and live matches, from a single
            upload.
          </p>
        </div>
        <div className="lv-hero-drop lv-reveal" data-d="1">
          <DropZone onUpload={onUpload} />
        </div>
        <div className="lv-hero-meta lv-reveal" data-d="2">
          <span>
            <i className="ti ti-check" /> No card required
          </span>
          <span>
            <i className="ti ti-check" /> Roadmap in minutes
          </span>
          <span>
            <i className="ti ti-check" /> Delete anytime
          </span>
        </div>
        <ExampleResult />
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: "ti-route",
    name: "Career roadmap",
    desc: "Every role ranked against your real profile.",
    url: "getajob.careers/Roadmap",
    screen: (
      <>
        <div className="lv-sc-eye">Career roadmap · ranked by fit</div>
        {[
          ["Associate PM", "Sweet spot", "tag-t1", "72%"],
          ["Business Analyst", "Sweet spot", "tag-t1", "64%"],
          ["Growth Marketing", "Detour", "tag-t2", "53%"],
          ["Operations Lead", "Growth", "tag-t3", "39%"],
        ].map(([role, t, c, fit]) => (
          <div className="lv-sc-row" key={role}>
            <span>{role}</span>
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
            >
              <span
                style={{
                  fontFamily: "var(--font-d)",
                  color: "var(--ink-soft)",
                }}
              >
                {fit}
              </span>
              <span className={`lv-sc-pill ${c}`}>{t}</span>
            </span>
          </div>
        ))}
      </>
    ),
  },
  {
    icon: "ti-file-text",
    name: "Tailored CVs",
    desc: "Rewritten per job from your real experience, never invented.",
    url: "getajob.careers/CVAgent",
    screen: (
      <>
        <div className="lv-sc-eye">Tailored · Associate PM at Cisco</div>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-d)",
              fontWeight: 700,
              fontSize: 15,
              marginBottom: 13,
            }}
          >
            Jonathan Charles, Product
          </div>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            Product Analyst · Cisco
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              marginBottom: 13,
            }}
          >
            2022 – Present
          </div>
          {[
            "Partnered with engineering to ship a new customer intake workflow",
            "Turned recurring support themes into a prioritised product backlog",
          ].map((t) => (
            <div
              key={t}
              style={{
                background: "var(--accent-tint)",
                color: "var(--accent-deep)",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 7,
                padding: "8px 11px",
                marginBottom: 9,
              }}
            >
              <i
                className="ti ti-sparkles"
                style={{ fontSize: 12, marginRight: 6 }}
              />
              {t}
            </div>
          ))}
          {[
            "Owned the onboarding metrics dashboard used by 4 teams",
            "Ran quarterly product reviews with engineering and design",
          ].map((t) => (
            <div
              key={t}
              style={{
                fontSize: 11.5,
                color: "var(--ink-soft)",
                padding: "6px 0",
                borderBottom: "1px solid var(--line-soft)",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    icon: "ti-briefcase",
    name: "Live job matches",
    desc: "Thousands of openings, matched to your fit.",
    url: "getajob.careers/Career",
    screen: (
      <>
        <div className="lv-sc-eye">Live matches · today</div>
        {[
          [
            "A",
            "Associate PM",
            "Palo Alto Networks · Remote",
            "Strong match",
            "var(--teal)",
            "var(--teal-tint)",
          ],
          [
            "K",
            "Product Analyst",
            "SAP · Hybrid",
            "Strong match",
            "var(--teal)",
            "var(--teal-tint)",
          ],
          [
            "N",
            "Business Analyst",
            "Netflix · On-site",
            "Good match",
            "var(--golden)",
            "var(--golden-tint)",
          ],
        ].map(([ini, role, co, band, fg, bg]) => (
          <div className="lv-sc-row" key={role}>
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 11 }}
            >
              <span
                className="lv-sc-sq"
                style={{
                  background: "var(--accent-tint)",
                  color: "var(--accent-deep)",
                }}
              >
                {ini}
              </span>
              <span>
                <span style={{ display: "block" }}>{role}</span>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 400,
                    color: "var(--ink-faint)",
                  }}
                >
                  {co}
                </span>
              </span>
            </span>
            <span className="lv-sc-pill" style={{ background: bg, color: fg }}>
              {band}
            </span>
          </div>
        ))}
      </>
    ),
  },
  {
    icon: "ti-layout-kanban",
    name: "Pipeline",
    desc: "Track every application from saved to offer.",
    url: "getajob.careers/Career",
    screen: (
      <>
        <div className="lv-sc-eye">Pipeline · 6 applications</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 7,
          }}
        >
          {[
            ["Saved", "var(--ink-faint)", ["Adobe", "Qualcomm"]],
            ["Applied", "var(--golden)", ["Cisco", "SAP"]],
            ["Interview", "var(--teal)", ["PayPal"]],
            ["Offer", "var(--accent)", ["Stripe"]],
          ].map(([label, dot, cards]) => (
            <div
              key={label}
              style={{
                background: "var(--bg-warm)",
                borderRadius: 10,
                padding: 8,
                minHeight: 158,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 9,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 99,
                    background: dot,
                  }}
                />
                <span style={{ fontSize: 10.5, fontWeight: 600 }}>{label}</span>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--ink-faint)",
                    marginLeft: "auto",
                  }}
                >
                  {cards.length}
                </span>
              </div>
              {cards.map((c) => (
                <div
                  key={c}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: "8px 9px",
                    marginBottom: 6,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    icon: "ti-message-chatbot",
    name: "Your coach",
    desc: "An assistant that does the next step, not just talks.",
    url: "getajob.careers/CareerAgent",
    screen: (
      <>
        <div className="lv-sc-eye">Coach · career agent</div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 11,
          }}
        >
          <div
            style={{
              background: "var(--accent-tint)",
              color: "var(--accent-deep)",
              borderRadius: "12px 12px 4px 12px",
              padding: "10px 13px",
              fontSize: 12.5,
              fontWeight: 600,
              maxWidth: "82%",
            }}
          >
            What should I do next for the Associate PM role at Google?
          </div>
        </div>
        <div style={{ display: "flex", gap: 9, marginBottom: 13 }}>
          <span
            className="lv-sc-sq"
            style={{
              background: "var(--ink-deep)",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <i className="ti ti-sparkles" style={{ fontSize: 13 }} />
          </span>
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: "12px 12px 12px 4px",
              padding: "10px 13px",
              fontSize: 12.5,
              fontWeight: 500,
              color: "var(--ink-soft)",
              maxWidth: "82%",
            }}
          >
            Your CV still reads ops-first. Tailor it to product language before
            you apply.
          </div>
        </div>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>
            <i
              className="ti ti-plus"
              style={{ color: "var(--accent)", marginRight: 7 }}
            />
            Add &ldquo;Tailor CV for Associate PM&rdquo; to tasks?
          </span>
          <span
            style={{
              background: "var(--accent)",
              color: "#fff",
              fontSize: 11.5,
              fontWeight: 700,
              borderRadius: 8,
              padding: "7px 13px",
              whiteSpace: "nowrap",
            }}
          >
            Confirm
          </span>
        </div>
      </>
    ),
  },
  {
    icon: "ti-browser",
    name: "In your browser",
    desc: "Tailor a CV on any job posting, without leaving the page.",
    url: "careers.ibm.com",
    soon: true,
    screen: (
      <div style={{ position: "relative", minHeight: 250 }}>
        {/* the career page — fills the frame, reads as a real posting. Trimmed so the
            center-scaled composition fits the fixed frame and the panel header never
            clips at the top. All readable copy stays left of paddingRight. */}
        <div style={{ paddingRight: 150 }}>
          <div
            style={{
              fontFamily: "var(--font-m)",
              fontSize: 10,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              marginBottom: 10,
            }}
          >
            IBM · Careers
          </div>
          <div
            style={{
              fontFamily: "var(--font-d)",
              fontWeight: 800,
              fontSize: 21,
              letterSpacing: "-.02em",
              lineHeight: 1.12,
              marginBottom: 6,
            }}
          >
            Associate Product Manager
          </div>
          <div
            style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 15 }}
          >
            IBM · Remote
          </div>
          <div
            style={{
              fontFamily: "var(--font-m)",
              fontSize: 8.5,
              letterSpacing: ".07em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              marginBottom: 5,
            }}
          >
            About the role
          </div>
          <p
            style={{
              fontSize: 11,
              lineHeight: 1.5,
              color: "var(--ink-soft)",
              margin: "0 0 13px",
            }}
          >
            {
              "Help shape IBM's product from discovery to launch, with design and engineering."
            }
          </p>
          <div
            style={{
              fontFamily: "var(--font-m)",
              fontSize: 8.5,
              letterSpacing: ".07em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              marginBottom: 6,
            }}
          >
            {"What you'll do"}
          </div>
          {[
            "Talk to users, shape clear priorities",
            "Write specs, partner with engineering",
            "Track how features land and iterate",
          ].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                gap: 7,
                fontSize: 11,
                lineHeight: 1.45,
                color: "var(--ink-soft)",
                marginBottom: 6,
              }}
            >
              <span style={{ color: "var(--ink-faint)", flexShrink: 0 }}>
                •
              </span>
              <span>{t}</span>
            </div>
          ))}
        </div>
        {/* Get A Job extension — side panel docked to the right edge, over the page */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 140,
            background: "var(--ink-deep)",
            borderRadius: 12,
            padding: 14,
            color: "#fff",
            boxShadow: "-20px 0 44px -24px rgba(96,72,62,.5)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 15,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: "var(--accent)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-d)",
                fontWeight: 700,
                fontSize: 12.5,
              }}
            >
              Get A Job
            </span>
          </div>
          {/* real flow: paste the job description, then generate — NOT auto-detected */}
          <div
            style={{
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.16)",
              borderRadius: 8,
              padding: "10px 11px",
              minHeight: 54,
              marginBottom: 11,
              fontSize: 10.5,
              lineHeight: 1.5,
              color: "rgba(255,255,255,.42)",
            }}
          >
            Paste the job description…
          </div>
          <div
            style={{
              background: "var(--accent)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 8,
              padding: "10px 8px",
              textAlign: "center",
            }}
          >
            <i className="ti ti-file-text" style={{ marginRight: 5 }} />
            Generate tailored CV
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: "ti-brand-linkedin",
    name: "LinkedIn tools",
    desc: "Optimize your profile and get coached before you hit send.",
    url: "getajob.careers/Linkedin",
    screen: (
      <>
        <div className="lv-sc-eye">LinkedIn · profile &amp; outreach</div>
        <div style={{ display: "flex", gap: 7, marginBottom: 13 }}>
          {[
            { label: "Current", on: false },
            { label: "Optimized", on: true },
          ].map(({ label, on }) => (
            <span
              key={label}
              style={{
                fontFamily: "var(--font-m)",
                fontSize: 11,
                fontWeight: 600,
                padding: "5px 12px",
                borderRadius: 999,
                background: on ? "var(--accent)" : "var(--bg-warm)",
                color: on ? "#fff" : "var(--ink-soft)",
              }}
            >
              {label}
            </span>
          ))}
        </div>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 11,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-d)",
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 6,
            }}
          >
            Product-minded operator | ex-Ops
          </div>
          <p
            style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink-soft)" }}
          >
            Rewritten headline and About section, pulled from the same stories
            as your CV.
          </p>
        </div>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <div style={{ display: "flex", gap: 9, marginBottom: 10 }}>
            <span
              className="lv-sc-sq"
              style={{
                background: "var(--bg-warm)",
                color: "var(--ink)",
                flexShrink: 0,
              }}
            >
              in
            </span>
            <div
              style={{
                background: "var(--bg-warm)",
                borderRadius: 9,
                padding: "9px 12px",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              Congrats on the launch!
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--teal-deep)",
            }}
          >
            <i className="ti ti-circle-check" style={{ fontSize: 15 }} />
            Sounds genuine and on-brand - safe to post.
          </div>
        </div>
      </>
    ),
  },
];

// Benefit bullets for the right-hand explainer, index-aligned with FEATURES.
const FEATURE_POINTS = [
  [
    "Ranked against your real profile",
    "Sweet spot, Detour and Growth tracks",
    "Re-scores as you log new wins",
  ],
  [
    "Reframes your real experience per job",
    "Never fabricates, only what's true",
    "Fully editable before you send",
  ],
  [
    "Live openings from real company career pages",
    "Matched to your fit, refreshed daily",
    "Filter by track, company and location",
  ],
  [
    "Saved → Applied → Interview → Offer",
    "Every application on one board",
    "Deadlines and next steps in view",
  ],
  [
    "Suggests your next move from real gaps",
    "Updates your roadmap, tasks and applications",
    "Always one tap from confirming",
  ],
  [
    "Works on any company career page",
    "Paste a job, get a tailored CV",
    "Coming soon to the Chrome Web Store",
  ],
  [
    "Rewrites your headline, About and experience",
    "Comment coach checks tone before you post",
    "Built from the same profile as everything else",
  ],
];

function FeatureExplorer() {
  const outerRef = useRef(null);
  const [active, setActive] = useState(0);
  useStickyProgress(outerRef, FEATURES.length, setActive);
  const f = FEATURES[active];
  const points = FEATURE_POINTS[active];
  // Click a tool → jump the scroll to the middle of its segment; Lenis eases
  // there and the progress loop lands `active` on it.
  const goTo = (i) => {
    setActive(i);
    const outer = outerRef.current;
    if (!outer) return;
    const scrollable = outer.offsetHeight - window.innerHeight;
    if (scrollable <= 40) return;
    // Document offset (NOT offsetTop — the section is position:relative, so
    // offsetTop is relative to it, which lands ~a screen off → wrong tool).
    const outerTopDoc = outer.getBoundingClientRect().top + window.scrollY;
    const target = outerTopDoc + ((i + 0.5) / FEATURES.length) * scrollable;
    // Jump instantly: the scene is pinned, so the viewport doesn't move — only
    // the screenshot/explainer crossfade. A smooth scroll would flick through
    // every intermediate tool (the buggy feel).
    if (lenisInstance) lenisInstance.scrollTo(target, { immediate: true });
    else window.scrollTo(0, target);
  };
  return (
    <section className="lv-feat" id="features">
      <div className="lv-feat-title">
        <div className="lv-wrap">
          <div className="lv-head center">
            <div className="lv-eyebrow">Everything in one place</div>
            <h2>One workspace, one memory, always in sync.</h2>
            <p>
              Seven tools, one shared memory of your background. Scroll to move
              through them, or click a tool to jump straight there.
            </p>
          </div>
        </div>
      </div>
      <div className="lv-pin-outer" ref={outerRef}>
        <div className="lv-pin-inner">
          <div className="lv-ws-wrap">
            <div className="lv-ws">
              {/* left: tool list (highlights the active tool; click to jump) */}
              <div className="lv-ws-list" role="tablist" aria-label="Tools">
                {FEATURES.map((feat, i) => (
                  <button
                    type="button"
                    key={feat.name}
                    role="tab"
                    aria-selected={active === i}
                    className={`lv-ws-item${active === i ? " on" : ""}`}
                    onClick={() => goTo(i)}
                  >
                    <span className="fx-ic">
                      <i className={`ti ${feat.icon}`} />
                    </span>
                    <span className="lv-ws-item-name">
                      {feat.name}
                      {feat.soon ? (
                        <span className="lv-ws-soon">Soon</span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
              {/* centre: the screenshot (dominant, centred) */}
              <div className="lv-ws-screen">
                <div className="lv-fxr-chrome">
                  <span /> <span /> <span />
                  <span className="url">{f.url}</span>
                </div>
                <div className="lv-fxr-frame" key={active}>
                  <div className="lv-sc-scale">{f.screen}</div>
                </div>
              </div>
              {/* right: explanation that swaps with the active tool */}
              <div className="lv-ws-info">
                <div className="lv-ws-info-inner" key={active}>
                  <span className="lv-ws-info-eye">
                    Tool {String(active + 1).padStart(2, "0")} /{" "}
                    {String(FEATURES.length).padStart(2, "0")}
                  </span>
                  <h3>
                    {f.name}
                    {f.soon ? (
                      <span className="lv-ws-soon-tag">Coming soon</span>
                    ) : null}
                  </h3>
                  <p>{f.desc}</p>
                  <ul>
                    {points.map((pt) => (
                      <li key={pt}>
                        <i className="ti ti-check" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// "Get a head start" overview cards. Each card carries a small illustrative
// preview (built inline, the same way the FEATURES screens are), a description
// and a tag. Order mirrors the showcase above.
const HEAD_START = [
  {
    name: "Not sure which roles actually fit you?",
    desc: "Stop guessing from job titles alone. Every open role gets ranked against your real profile - skills, experience, and goals - so you know exactly which ones are a real shot before you spend an hour tailoring a CV.",
    tag: "Ranked by fit",
    tagClass: "tag-t1",
    preview: (
      <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
        <div
          style={{
            fontFamily: "var(--font-m)",
            fontSize: 9,
            letterSpacing: ".05em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,.7)",
            marginBottom: 12,
          }}
        >
          Your #1 match this week
        </div>
        <div
          style={{
            fontFamily: "var(--font-d)",
            fontWeight: 800,
            fontSize: 36,
            letterSpacing: "-.02em",
          }}
        >
          72%
        </div>
        <div
          style={{
            fontFamily: "var(--font-d)",
            fontWeight: 600,
            fontSize: 14,
            marginTop: 2,
          }}
        >
          Associate PM
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            marginTop: 12,
            fontSize: 10.5,
            color: "var(--teal-deep)",
            fontWeight: 600,
          }}
        >
          <i className="ti ti-arrow-up" style={{ fontSize: 13 }} />
          Up from 58% last month
        </div>
      </div>
    ),
  },
  {
    name: "Just graduated, CV still generic?",
    desc: "A CV that reads like a template gets ignored. Get a fresh version for every application, rewritten from your actual experience and accomplishments - never invented, just reframed to match what that specific job is asking for.",
    tag: "AI-written",
    tagClass: "tag-t2",
    preview: (
      <div>
        <div
          style={{
            fontFamily: "var(--font-m)",
            fontSize: 9,
            letterSpacing: ".05em",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
            marginBottom: 9,
          }}
        >
          Before → after
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--ink-faint)",
            textDecoration: "line-through",
            marginBottom: 8,
            padding: "7px 10px",
            background: "var(--bg-warm)",
            borderRadius: 6,
          }}
        >
          Worked on internal support tools
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <i
            className="ti ti-arrow-down"
            style={{ color: "var(--ink-faint)", fontSize: 14 }}
          />
        </div>
        <div
          style={{
            background: "var(--accent-tint)",
            color: "var(--accent-deep)",
            fontSize: 11.5,
            fontWeight: 600,
            borderRadius: 6,
            padding: "8px 11px",
          }}
        >
          <i
            className="ti ti-sparkles"
            style={{ fontSize: 11, marginRight: 5 }}
          />
          Shipped a new intake workflow used by 4 teams
        </div>
      </div>
    ),
  },
  {
    name: "Found a role, want in fast?",
    desc: "The good ones don't stay open long. Thousands of live openings are pulled straight from company career pages, refreshed every night and scored against your profile, so you know which ones are worth acting on right now.",
    tag: "Live data",
    tagClass: "tag-t1",
    preview: (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <span
            className="lv-sc-sq"
            style={{ background: "var(--teal-tint)", color: "var(--teal-deep)" }}
          >
            <i className="ti ti-bell" style={{ fontSize: 16 }} />
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>
              4 new matches overnight
            </div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.6)" }}>
              Refreshed at 2:00 AM
            </div>
          </div>
        </div>
        <div className="lv-sc-row">
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 9 }}
          >
            <span
              className="lv-sc-sq"
              style={{
                background: "var(--accent-tint)",
                color: "var(--accent-deep)",
              }}
            >
              N
            </span>
            <span>
              <span style={{ display: "block" }}>Business Analyst</span>
              <span
                style={{
                  display: "block",
                  fontSize: 10.5,
                  fontWeight: 400,
                  color: "var(--ink-faint)",
                }}
              >
                PayPal
              </span>
            </span>
          </span>
          <span className="lv-sc-pill tag-t1">92% fit</span>
        </div>
      </div>
    ),
  },
  {
    name: "Applying everywhere, losing track?",
    desc: "Spreadsheets and browser tabs lose track fast. One board holds every application from saved to interview to offer, with the next step for each one already attached - nothing falls through the cracks.",
    tag: "Saved → offer",
    tagClass: "tag-t3",
    preview: (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "var(--ink-faint)",
                marginBottom: 5,
              }}
            >
              APPLIED
            </div>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 99,
                background: "var(--golden)",
                margin: "0 auto",
              }}
            />
          </div>
          <i
            className="ti ti-arrow-right"
            style={{ color: "var(--ink-faint)", fontSize: 14 }}
          />
          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--teal-deep)",
                marginBottom: 5,
              }}
            >
              INTERVIEW
            </div>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 99,
                background: "var(--teal)",
                margin: "0 auto",
              }}
            />
          </div>
        </div>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "11px 13px",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>
            Snowflake
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
            Moved to Interview · 2 days ago
          </div>
        </div>
      </div>
    ),
  },
  {
    name: "Don't know what to do today?",
    desc: "Some days the next step isn't obvious. An assistant that knows your roadmap, pipeline, and stories tells you the one concrete thing to do next - and helps you actually do it.",
    tag: "Always on",
    tagClass: "tag-t1",
    preview: (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span
            className="lv-sc-sq"
            style={{
              background: "var(--ink-deep)",
              color: "#fff",
              width: 24,
              height: 24,
              flexShrink: 0,
            }}
          >
            <i className="ti ti-sparkles" style={{ fontSize: 11 }} />
          </span>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,.7)",
              fontWeight: 600,
            }}
          >
            Today's move
          </div>
        </div>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "11px 13px",
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 12.5 }}>
            Apply to PayPal's Business Analyst role
          </div>
          <div
            style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 4 }}
          >
            Posted 6 hours ago - matches your top skills
          </div>
        </div>
        <span className="lv-sc-pill tag-t1" style={{ fontSize: 10 }}>
          Streak: 12 days
        </span>
      </div>
    ),
  },
  {
    name: "Job hunting across a dozen tabs?",
    desc: "Switching between the posting and your CV gets old fast. Paste the job description into a side panel right on the posting itself, and get a CV tailored to that exact role back in seconds - without ever leaving the page.",
    tag: "Coming soon",
    tagClass: "tag-t3",
    preview: (
      <div
        style={{ background: "var(--ink-deep)", borderRadius: 10, padding: 12 }}
      >
        <div style={{ display: "flex", gap: 5, marginBottom: 11 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 20,
                borderRadius: "6px 6px 0 0",
                background:
                  i === 1 ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.05)",
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.14)",
            borderRadius: 8,
            padding: "9px 10px",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: "var(--accent)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,.62)",
              flex: 1,
            }}
          >
            Job posting detected
          </span>
          <span
            style={{
              background: "var(--accent)",
              color: "#fff",
              fontSize: 9.5,
              fontWeight: 700,
              borderRadius: 6,
              padding: "5px 8px",
              whiteSpace: "nowrap",
            }}
          >
            Tailor CV
          </span>
        </div>
      </div>
    ),
  },
  {
    name: "Profile's stale, network's quiet?",
    desc: "A headline you wrote two jobs ago won't open doors today. Rewrite it and your About section from the same accomplishments as your CV, then get your outreach messages checked for tone before you hit send.",
    tag: "Networking",
    tagClass: "tag-t2",
    preview: (
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: 13,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-m)",
                fontSize: 9,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
              }}
            >
              Profile views
            </div>
            <div
              style={{
                fontFamily: "var(--font-d)",
                fontWeight: 800,
                fontSize: 26,
                letterSpacing: "-.01em",
              }}
            >
              +40%
            </div>
          </div>
          <i
            className="ti ti-trending-up"
            style={{ fontSize: 28, color: "var(--teal)" }}
          />
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: "var(--ink-soft)",
            marginBottom: 10,
          }}
        >
          Since optimizing your headline 2 weeks ago
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 11,
            fontWeight: 600,
            color: "var(--teal-deep)",
          }}
        >
          <i className="ti ti-circle-check" style={{ fontSize: 14 }} />3
          recruiters viewed this week
        </div>
      </div>
    ),
  },
];

// Strict repeating 4-color cycle, by card position, reused across every
// carousel/row set below: coral, gold, teal, black.
const HS_TINT_CYCLE = ["t-orange", "t-gold", "t-ink", "t-white"];

function HeadStart() {
  const { ref, atStart, atEnd, prev, next } = useCarousel(HEAD_START);
  return (
    <section className="lv-section lv-clip" id="head-start">
      <div
        className="lv-deco lv-griddots"
        data-parallax="0.13"
        style={{ width: 132, height: 132, top: 40, right: -30 }}
        aria-hidden="true"
      />
      <div className="lv-wrap">
        <div className="lv-head lv-reveal">
          <div className="lv-eyebrow">Get a head start</div>
          <h2>Get a head start on your career.</h2>
          <p>
            One profile, seven tools - pick whichever one matches where you're
            stuck right now.
          </p>
        </div>
        <div className="lv-caro lv-reveal" data-d="1">
          <div className="lv-caro-ctrls">
            <button
              type="button"
              className="lv-caro-btn"
              aria-label="Previous cards"
              onClick={prev}
              disabled={atStart}
            >
              <i className="ti ti-arrow-left" />
            </button>
            <button
              type="button"
              className="lv-caro-btn"
              aria-label="Next cards"
              onClick={next}
              disabled={atEnd}
            >
              <i className="ti ti-arrow-right" />
            </button>
          </div>
          <div className="lv-caro-track" ref={ref}>
            {HEAD_START.map((c, i) => (
              <div
                className={`lv-hs-card ${HS_TINT_CYCLE[i % 4]}`}
                key={c.name}
              >
                <div className="lv-hs-preview">{c.preview}</div>
                <div className="lv-hs-name">{c.name}</div>
                <div className="lv-hs-desc">{c.desc}</div>
                <span className={`lv-hs-tag ${c.tagClass}`}>{c.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// "Solve the challenge" problem/solution cards. Each names a pain, answers it,
// and offers a CTA that opens the same signup funnel as every other CTA.
const CH_BORDER_CYCLE = ["b-orange", "b-gold", "b-black", "b-white"];

const CHALLENGES = [
  {
    name: "Roadmap",
    prob: "You don't know which roles you're actually qualified for.",
    sol: "Every open role is ranked against your real profile, so you stop guessing and start applying where you have a real shot.",
    cta: "See your roadmap",
  },
  {
    name: "CVs",
    prob: "Rewriting your CV for every job takes hours you don't have.",
    sol: "Get a version tailored to each posting in minutes, pulled from your real, matching experience - never invented.",
    cta: "Try tailored CVs",
  },
  {
    name: "LinkedIn",
    prob: "Your profile and outreach don't reflect what you can actually do.",
    sol: "Optimize your profile and get coached on networking messages before you hit send, from the same profile as everything else.",
    cta: "Optimize your profile",
  },
  {
    name: "Application tracking",
    prob: "Spreadsheets and browser tabs lose track of where you actually stand.",
    sol: "One pipeline board holds every application from saved to offer, with next steps attached.",
    cta: "See your pipeline",
  },
  {
    name: "Daily focus",
    prob: "Some days you have no idea what to do next.",
    sol: "Your coach suggests the one next move each day, built from real gaps in your roadmap.",
    cta: "Meet your coach",
  },
];

function SolveChallenge({ onCTA }) {
  const { ref, atStart, atEnd, prev, next } = useCarousel(CHALLENGES);
  return (
    <section className="lv-section lv-clip" id="challenge">
      <div
        className="lv-deco lv-ring dash"
        data-parallax="-0.14"
        style={{ width: 200, height: 200, bottom: -50, left: -50 }}
        aria-hidden="true"
      />
      <div className="lv-wrap">
        <div className="lv-head lv-reveal">
          <div className="lv-eyebrow">The honest problem</div>
          <h2>Solve the challenge of job-searching.</h2>
          <p>
            Five things that make job searching miserable - and how one
            connected profile fixes each.
          </p>
        </div>
        <div className="lv-caro lv-reveal" data-d="1">
          <div className="lv-caro-ctrls">
            <button
              type="button"
              className="lv-caro-btn"
              aria-label="Previous cards"
              onClick={prev}
              disabled={atStart}
            >
              <i className="ti ti-arrow-left" />
            </button>
            <button
              type="button"
              className="lv-caro-btn"
              aria-label="Next cards"
              onClick={next}
              disabled={atEnd}
            >
              <i className="ti ti-arrow-right" />
            </button>
          </div>
          <div className="lv-caro-track" ref={ref}>
            {CHALLENGES.map((c, i) => (
              <div
                className={`lv-ch-card ${CH_BORDER_CYCLE[i % 4]}`}
                key={c.name}
              >
                <div className="lv-ch-name">{c.name}</div>
                <div className="lv-ch-prob">{c.prob}</div>
                <div className="lv-ch-sol">{c.sol}</div>
                <button type="button" className="lv-ch-cta" onClick={onCTA}>
                  {c.cta}
                  <i className="ti ti-arrow-right" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Memory rows for the "One memory" section — hover-highlighted, one per surface.
// Tinted with the same strict orange/gold/black/white position cycle used
// by the two carousels above. Each mock mirrors its FeatureExplorer screen
// (condensed) instead of a generic shape, so it reads as that specific tool.
const MEM_CLS_CYCLE = ["orange", "gold", "black", "white"];

const MEMORY_ROWS = [
  {
    headline: "Log every win",
    tool: "Story Bank",
    desc: "Capture an accomplishment once in your Story Bank, and it resurfaces automatically in every future tailored CV where it's relevant - write it once, reuse it everywhere.",
    mock: (
      <>
        <div
          style={{
            fontFamily: "var(--font-m)",
            fontSize: 9,
            letterSpacing: ".05em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,.7)",
            marginBottom: 8,
          }}
        >
          Your Story Bank · 12 wins
        </div>
        {[
          "Shipped a new intake workflow",
          "Mentored 3 new hires through onboarding",
          "Cut support ticket backlog by 30%",
        ].map((win) => (
          <div
            key={win}
            style={{
              background: "rgba(255,255,255,.2)",
              color: "#fff",
              fontSize: 10.5,
              fontWeight: 600,
              borderRadius: 6,
              padding: "7px 10px",
              marginBottom: 7,
            }}
          >
            <i
              className="ti ti-sparkles"
              style={{ fontSize: 10, marginRight: 4 }}
            />
            {win}
          </div>
        ))}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "6px 0 8px",
          }}
        >
          <i
            className="ti ti-arrow-down"
            style={{ color: "rgba(255,255,255,.6)", fontSize: 14 }}
          />
        </div>
        <div
          style={{
            background: "var(--card)",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-d)",
              fontWeight: 700,
              fontSize: 11.5,
              marginBottom: 6,
            }}
          >
            Jonathan Charles, Product
          </div>
          <div
            style={{
              background: "var(--accent-tint)",
              color: "var(--accent-deep)",
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 5,
              padding: "6px 8px",
              marginBottom: 6,
            }}
          >
            <i
              className="ti ti-sparkles"
              style={{ fontSize: 9, marginRight: 3 }}
            />
            Shipped a new intake workflow
          </div>
          <div style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>
            Now in your CV for DoorDash
          </div>
        </div>
      </>
    ),
  },
  {
    headline: "Remembers every conversation",
    tool: "AI Career Coach",
    desc: "Tell your coach something once, and it stays part of your context - ask a question next month, and it already knows, without you repeating yourself.",
    mock: (
      <>
        <div
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: ".04em",
          }}
        >
          3 weeks ago
        </div>
        <div
          style={{
            background: "rgba(255,255,255,.55)",
            borderRadius: "11px 11px 11px 3px",
            padding: "8px 11px",
            marginBottom: 5,
            fontSize: 11.5,
            color: "var(--ink-soft)",
          }}
        >
          "I want to pivot into product eventually."
        </div>
        <div
          style={{
            display: "flex",
            gap: 7,
            alignItems: "flex-start",
            marginBottom: 8,
          }}
        >
          <span
            className="lv-sc-sq"
            style={{
              background: "var(--ink-deep)",
              color: "#fff",
              width: 20,
              height: 20,
              flexShrink: 0,
            }}
          >
            <i className="ti ti-sparkles" style={{ fontSize: 10 }} />
          </span>
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: "11px 11px 11px 3px",
              padding: "8px 11px",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--ink-soft)",
            }}
          >
            Got it - I'll start surfacing product-adjacent roles and
            highlighting your cross-functional work in future CVs.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <i
            className="ti ti-arrow-down"
            style={{ color: "var(--ink-faint)", fontSize: 14 }}
          />
        </div>
        <div
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: ".04em",
          }}
        >
          Today
        </div>
        <div
          style={{
            background: "rgba(255,255,255,.55)",
            borderRadius: "11px 11px 11px 3px",
            padding: "8px 11px",
            marginBottom: 5,
            fontSize: 11.5,
            color: "var(--ink-soft)",
          }}
        >
          Saw an opening at Spotify, is it worth applying?
        </div>
        <div
          style={{
            display: "flex",
            gap: 7,
            alignItems: "flex-start",
          }}
        >
          <span
            className="lv-sc-sq"
            style={{
              background: "var(--ink-deep)",
              color: "#fff",
              width: 20,
              height: 20,
              flexShrink: 0,
            }}
          >
            <i className="ti ti-sparkles" style={{ fontSize: 10 }} />
          </span>
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: "11px 11px 11px 3px",
              padding: "8px 11px",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--ink-soft)",
            }}
          >
            Yes - this Associate PM role is a strong match. Your intake-workflow
            launch and stakeholder work put you in the top tier for it, and
            it'll get competitive fast. Want me to tailor your CV for it now?
          </div>
        </div>
      </>
    ),
  },
  {
    headline: "Track every lead",
    tool: "Job Tracker",
    desc: "Every application you save, apply to, or move forward stays on one board - company, stage, and next step, all remembered in one place.",
    mock: (
      <>
        <div
          style={{
            fontFamily: "var(--font-m)",
            fontSize: 9,
            letterSpacing: ".05em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,.55)",
            marginBottom: 8,
          }}
        >
          Your Pipeline · 6 tracked
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 7,
          }}
        >
          {[
            ["Applied", "var(--golden)", ["Amazon", "Meta"]],
            ["Interview", "var(--teal)", ["NVIDIA", "Booking.com"]],
            ["Offer", "var(--accent)", ["Netflix"]],
          ].map(([label, dot, cos]) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,.08)",
                borderRadius: 8,
                padding: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 7,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 99,
                    background: dot,
                  }}
                />
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: "rgba(255,255,255,.75)",
                  }}
                >
                  {label}
                </span>
              </div>
              {cos.map((co) => (
                <div
                  key={co}
                  style={{
                    background: "var(--card)",
                    borderRadius: 6,
                    padding: "6px 8px",
                    marginBottom: 5,
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  {co}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10.5,
            color: "rgba(255,255,255,.6)",
            marginTop: 10,
          }}
        >
          <i
            className="ti ti-circle-check"
            style={{ fontSize: 12, color: "var(--teal-deep)" }}
          />
          NVIDIA moved to Interview · 2 days ago
        </div>
      </>
    ),
  },
  {
    headline: "Every version of your story",
    tool: "LinkedIn Optimizer",
    desc: "Your CV, your coach, and your LinkedIn all draw from the same profile, so your headline, your outreach, and your resume all sound like the same person - not three different rewrites of your story.",
    mock: (
      <>
        <div
          style={{
            background: "var(--bg-warm)",
            borderRadius: 8,
            padding: "9px 11px",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "var(--ink-faint)",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            CV summary
          </div>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            Product-minded operator, ex-Ops
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <i
            className="ti ti-equal"
            style={{ color: "var(--ink-faint)", fontSize: 13 }}
          />
        </div>
        <div
          style={{
            background: "var(--bg-warm)",
            borderRadius: 8,
            padding: "9px 11px",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "var(--ink-faint)",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            LinkedIn headline
          </div>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            Product-minded operator | ex-Ops
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--teal-deep)",
            marginTop: 8,
          }}
        >
          <i className="ti ti-circle-check" style={{ fontSize: 13 }} />
          Written from the same profile - no separate rewrite
        </div>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: 10,
            marginTop: 10,
          }}
        >
          <div style={{ display: "flex", gap: 7, marginBottom: 8 }}>
            <span
              className="lv-sc-sq"
              style={{
                background: "var(--bg-warm)",
                color: "var(--ink)",
                width: 20,
                height: 20,
                fontSize: 10,
                flexShrink: 0,
              }}
            >
              in
            </span>
            <div
              style={{
                background: "var(--bg-warm)",
                borderRadius: 7,
                padding: "7px 10px",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Congrats on the launch!
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--teal-deep)",
            }}
          >
            <i className="ti ti-circle-check" style={{ fontSize: 13 }} />
            Sounds genuine and on-brand - safe to post.
          </div>
        </div>
      </>
    ),
  },
];

function Differentiator() {
  // Which card index is expanded — driven by React state (hover AND focus,
  // for keyboard users) rather than a CSS :hover rule, so the fan's width
  // swap is explicit and doesn't depend on the browser's own hover timing.
  const [hovered, setHovered] = useState(null);
  return (
    <section className="lv-section lv-diff lv-clip lv-fade" id="differentiator">
      <div
        className="lv-deco lv-griddots"
        data-parallax="0.17"
        style={{ width: 150, height: 150, top: 36, left: -40 }}
        aria-hidden="true"
      />
      <div
        className="lv-deco lv-ring dash"
        data-parallax="-0.15"
        style={{ width: 220, height: 220, bottom: -70, right: -60 }}
        aria-hidden="true"
      />
      <div className="lv-wrap">
        <div className="lv-diff-intro lv-reveal">
          <h2>One memory across your entire job search.</h2>
          <p>
            Other AI platforms start from zero every session: re-explain
            yourself, get a different answer, end up back at your old draft.
          </p>
          <p>
            <strong>Get A Job remembers.</strong> Every win, every conversation,
            every application, every version of your story builds on what it
            knows about you. Hover a card below to see how.
          </p>
        </div>
      </div>
      {/* Breaks out of .lv-wrap's 1180px cap on purpose — this row reads
          better spanning the full viewport than boxed to the article width. */}
      <div className="lv-mem-fan lv-reveal" data-d="1">
        {MEMORY_ROWS.map((r, i) => {
          const on = hovered === i;
          const compressed = hovered !== null && !on;
          return (
            <div
              className={`lv-mem-card ${MEM_CLS_CYCLE[i % 4]}${on ? " on" : ""}${compressed ? " compressed" : ""}`}
              key={r.headline}
              style={{ flex: on ? "6 1 0%" : "1 1 0%" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered((h) => (h === i ? null : h))}
              tabIndex={0}
              role="button"
              aria-expanded={on}
            >
              <div className="lv-mem-card-head">
                <div className="lv-mem-card-name">{r.headline}</div>
                <div className="lv-mem-card-tool">{r.tool}</div>
              </div>
              <div className="lv-mem-card-body">
                <div className="lv-mem-desc">{r.desc}</div>
                <div className="lv-mem-shot">{r.mock}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: "01",
    h: "Upload your CV",
    p: "We read your skills, experience, and education. No skills to retype.",
  },
  {
    n: "02",
    h: "See your roadmap",
    p: "Every role in the library, ranked against you.",
  },
  {
    n: "03",
    h: "Tailor and apply",
    p: "Pick a live job; your CV is rewritten from your real, matching wins.",
  },
  {
    n: "04",
    h: "Track and improve",
    p: "Watch your pipeline, capture wins, and get a fresh move every morning.",
  },
];

function HowItWorks({ onCTA }) {
  return (
    <section className="lv-section lv-clip lv-fade lv-snap-fit" id="how">
      <div
        className="lv-deco lv-ring"
        data-parallax="0.14"
        style={{ width: 200, height: 200, top: -50, right: -60 }}
        aria-hidden="true"
      />
      <div
        className="lv-deco lv-griddots"
        data-parallax="-0.12"
        style={{ width: 120, height: 120, bottom: 20, left: -30 }}
        aria-hidden="true"
      />
      <div className="lv-wrap">
        <div className="lv-head lv-reveal">
          <div className="lv-eyebrow">From upload to first application</div>
          <h2>Four steps.</h2>
        </div>
        <div className="lv-steps">
          {STEPS.map((s, i) => (
            <div className="lv-step lv-reveal" data-d={(i % 2) + 1} key={s.n}>
              <div className="lv-step-n">{s.n}</div>
              <div>
                <h4>{s.h}</h4>
                <p>{s.p}</p>
              </div>
            </div>
          ))}
        </div>
        <div
          className="lv-reveal"
          data-d="1"
          style={{ marginTop: 40, textAlign: "center" }}
        >
          <button type="button" className="btn btn-accent" onClick={onCTA}>
            Get started <i className="ti ti-arrow-up-right" />
          </button>
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "What data do you collect, and where does it go?",
    a: "Your profile and CV data power the AI features, so it goes to our AI providers (OpenAI and Anthropic) to generate your roadmap, CVs, and matches. We don't sell your data and we don't run ads. The full detail of what's shared and where is in our privacy policy.",
  },
  {
    q: "Will the AI make things up on my CV?",
    a: "No. The CV agent works only from your real profile: your experience, education, skills, and the accomplishments you've captured. If you didn't provide a metric or achievement, it won't invent one. Every output is editable before you send it.",
  },
  {
    q: "Do I need to be a designer or a writer?",
    a: "No. Upload your CV and the platform does the heavy lifting: roadmap, tailoring, job matching. You stay in control and edit anything.",
  },
  {
    q: "Can I delete my account?",
    a: "Yes. From Settings, type a confirmation phrase and your account plus every record is permanently deleted. Not a soft-delete.",
  },
];

function FAQSection() {
  const [open, setOpen] = useState(0);
  return (
    <section className="lv-section lv-clip lv-fade lv-snap-fit" id="faq">
      <div
        className="lv-deco lv-griddots"
        data-parallax="0.13"
        style={{ width: 130, height: 130, top: -30, left: -30 }}
        aria-hidden="true"
      />
      <div className="lv-wrap lv-faq-wrap">
        <div className="lv-head lv-reveal">
          <div className="lv-eyebrow">Good questions</div>
          <h2>The honest answers.</h2>
        </div>
        <div className="lv-reveal" data-d="1">
          {FAQS.map((f, i) => (
            <div
              className={`lv-faq-item${open === i ? " open" : ""}`}
              key={f.q}
            >
              <button
                type="button"
                className="lv-faq-q"
                onClick={() => setOpen(open === i ? -1 : i)}
                aria-expanded={open === i}
              >
                {f.q}
                <i className="ti ti-plus" />
              </button>
              <div className="lv-faq-a">{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ isLoggedIn, onCTA }) {
  return (
    <section className="lv-final lv-fade lv-snap-fit" id="final-cta">
      <div className="lv-wrap">
        <div className="lv-final-card lv-reveal">
          <div
            className="lv-final-blob"
            style={{
              width: 220,
              height: 220,
              background: "var(--accent)",
              top: -80,
              left: -40,
            }}
            data-parallax="0.05"
          />
          <div
            className="lv-final-blob"
            style={{
              width: 180,
              height: 180,
              background: "var(--teal)",
              bottom: -70,
              right: -30,
              opacity: 0.4,
            }}
            data-parallax="-0.04"
          />
          <div style={{ position: "relative" }}>
            <div className="lv-eyebrow">Start in minutes</div>
            <h2>Your next role is in there. Let&apos;s find it.</h2>
            <p>
              Upload your CV and watch your roadmap, matches, and first tailored
              resume come together.
            </p>
            <button
              type="button"
              className="btn btn-accent"
              onClick={onCTA}
              style={{ fontSize: 16, padding: "15px 30px" }}
            >
              {isLoggedIn ? "Open your dashboard" : "Upload your CV, free"}
              <i className="ti ti-arrow-up-right" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lv-foot">
      <div className="lv-wrap lv-foot-in">
        <div className="lv-logo" style={{ fontSize: 17 }}>
          getajob
          <span className="dot" />
        </div>
        <div>© 2026 Get A Job</div>
        <div className="lv-foot-links">
          <a href="#features" onClick={(e) => lvScrollTo(e, "#features")}>
            Features
          </a>
          <a href="#faq" onClick={(e) => lvScrollTo(e, "#faq")}>
            FAQ
          </a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
      </div>
    </footer>
  );
}

// ────────────────────────────────────────────────────────────────────────
export default function LandingV2Preview() {
  useLandingV2Head();
  useMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth?.() || {};
  const isLoggedIn = !!(auth.isAuthenticated && auth.user);

  // Auto-bounce authenticated users into the app — but ONLY from /, the
  // implicit "default" entry point (email-confirmation, magic-link return,
  // fresh tab on a logged-in browser). /Landing stays the explicit "show me
  // the marketing page" route, so this never fires there. Mirrors the old
  // Landing's bounce so the live homepage behaves the same for logged-in users.
  useEffect(() => {
    if (isLoggedIn && location.pathname === "/") {
      navigate("/Home", { replace: true });
    }
  }, [isLoggedIn, navigate, location.pathname]);

  // Every new-visitor CTA (nav "Start", hero "Start here", the CV dropzone,
  // the bottom CTA) opens Login in signup / create-account mode — a returning
  // user uses the "Sign in" link inside that view. The dropzone saves the CV
  // to IndexedDB before this fires (see DropZone.start). A logged-in user
  // goes to /Home (the dashboard), never back to / which would loop.
  const onCTA = () => navigate(isLoggedIn ? "/Home" : "/Login?mode=signup");
  // Quiet nav-only "Log in" link for returning users — routes to the existing
  // signin mode so they skip the signup view that the primary CTAs open.
  const onLogin = () => navigate(isLoggedIn ? "/Home" : "/Login?mode=signin");

  const ref = useRef(null);
  return (
    <div className="lv" ref={ref}>
      <style>{LV_CSS}</style>
      <Nav isLoggedIn={isLoggedIn} onCTA={onCTA} onLogin={onLogin} />
      <Hero onCTA={onCTA} />
      <FeatureExplorer />
      <DropSection onUpload={onCTA} />
      <HeadStart />
      <HowItWorks onCTA={onCTA} />
      <SolveChallenge onCTA={onCTA} />
      <Differentiator />
      <FAQSection />
      <FinalCTA isLoggedIn={isLoggedIn} onCTA={onCTA} />
      <Footer />
    </div>
  );
}
