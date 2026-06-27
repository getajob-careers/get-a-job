/*
 * LandingV2Preview.jsx — DEV-only alternative landing page (/_preview/landing-v2)
 *
 * A fresh, self-serve marketing page built from a design DNA synthesised from
 * Isaac's inspiration set (Manatee Energy, outcrowd.io, Sparkline, CoreShift):
 * bold editorial display type, warm off-white ground, near-black ink, ONE coral
 * accent, pill buttons/nav, generous white space, an outline/line-art graphic
 * language, and tasteful motion (reveal-on-scroll, gentle parallax, a floating
 * orbit hero). Palette is anchored to our platform tokens so it matches the app.
 *
 * Self-contained on purpose (mirrors Landing.jsx): own inline-CSS token block,
 * own <head> effect, no shadcn imports. Gated to import.meta.env.DEV via the
 * route in App.jsx, and noindex'd, so it never ships/indexes by accident.
 * Promote to a public unlisted route when signed off.
 */

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

// ────────────────────────────────────────────────────────────────────────
const LV_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600;700;800;900&display=swap');
.lv {
  --bg: #FBF8F1;
  --bg-warm: #F4EEE2;
  --ink: #1C1815;
  --ink-soft: #6B6258;
  --ink-faint: #A39A8C;
  --accent: #EF5A41;
  --accent-deep: #C7461F;
  --accent-tint: #FCE6DF;
  --teal: #2E7C6B;
  --teal-tint: #DBEEE5;
  --golden: #B8841C;
  --golden-tint: #F7ECCF;
  --line: #E7DECE;
  --line-soft: #EFE8DA;
  --card: #FFFFFF;
  --ink-deep: #181410;
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
.lv .btn-accent { background: var(--accent); color: #fff; box-shadow: 0 8px 22px -6px rgba(239,90,65,.5); }
.lv .btn-accent:hover { background: var(--accent-deep); box-shadow: 0 12px 28px -6px rgba(239,90,65,.55); }
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
.lv-nav-pill { display: flex; align-items: center; gap: 4px; background: var(--card); border: 1px solid var(--line); border-radius: var(--r-pill); padding: 6px; box-shadow: 0 2px 10px rgba(28,24,21,.04); }
.lv-nav-pill a { font-size: 14px; color: var(--ink-soft); text-decoration: none; font-weight: 500; padding: 8px 14px; border-radius: var(--r-pill); transition: background .15s, color .15s; }
.lv-nav-pill a:hover { color: var(--ink); background: var(--bg-warm); }
.lv-nav-right { display: flex; align-items: center; gap: 12px; }

/* hero */
.lv-hero { position: relative; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 80px 0; overflow: hidden; }
.lv-hero-top { text-align: center; max-width: 880px; margin: 0 auto; }
.lv-hero h1 { font-family: var(--font-d); font-size: 70px; line-height: .98; letter-spacing: -.04em; font-weight: 800; }
.lv-hero h1 .accent { color: var(--accent); }
.lv-hero-sub { font-size: 18.5px; line-height: 1.5; color: var(--ink-soft); max-width: 540px; margin: 22px auto 0; }
.lv-hero-sub strong { color: var(--ink); font-weight: 600; }
.lv-hero-meta { display: flex; justify-content: center; gap: 16px; margin-top: 6px; font-size: 12.5px; color: var(--ink-faint); flex-wrap: wrap; }
.lv-hero-meta span { display: inline-flex; align-items: center; gap: 6px; }
.lv-hero-meta i { color: var(--teal); font-size: 14px; }
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
.lv-drop { position: relative; z-index: 3; width: 480px; max-width: 100%; min-height: 312px; background: var(--card); border: 2px dashed var(--line); border-radius: var(--r-lg); padding: 44px 36px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; cursor: pointer; box-shadow: 0 38px 84px -30px rgba(28,24,21,.36); transition: border-color .2s, box-shadow .2s, transform .2s, background .2s; }
.lv-drop:hover { border-color: var(--accent); transform: translateY(-3px); box-shadow: 0 38px 78px -28px rgba(239,90,65,.4); }
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
.lv-pchip-in { background: var(--card); border: 1px solid var(--line); border-radius: var(--r-pill); padding: 9px 15px; font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; box-shadow: 0 16px 34px -12px rgba(28,24,21,.24); }
.lv-pchip-in i { font-size: 16px; }
.lv-pchip-in .tag { font-family: var(--font-m); font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: var(--r-pill); }
.tag-t1 { background: var(--teal-tint); color: var(--teal); }
.tag-t2 { background: var(--accent-tint); color: var(--accent-deep); }
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
.lv-head { max-width: 640px; margin-bottom: 48px; }
.lv-head.center { margin-left: auto; margin-right: auto; text-align: center; }
.lv-head h2 { font-family: var(--font-d); font-size: 44px; line-height: 1.06; letter-spacing: -.03em; font-weight: 700; margin: 14px 0 0; }
.lv-head p { font-size: 17px; line-height: 1.55; color: var(--ink-soft); margin-top: 16px; }

/* offer stack */
.lv-offer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.lv-offer { background: var(--card); border: 1px solid var(--line); border-radius: var(--r); padding: 26px; transition: transform .2s, box-shadow .2s, border-color .2s; }
.lv-offer:hover { transform: translateY(-3px); box-shadow: 0 16px 40px -16px rgba(28,24,21,.16); border-color: var(--line); }
.lv-offer.wide { grid-column: span 2; display: flex; gap: 24px; align-items: center; }
.lv-offer.wide .lv-offer-body { flex: 1; }
.lv-offer-ic { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 16px; }
.lv-offer.wide .lv-offer-ic { margin-bottom: 0; flex-shrink: 0; }
.ic-coral { background: var(--accent-tint); color: var(--accent-deep); }
.ic-teal { background: var(--teal-tint); color: var(--teal); }
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
.lv-fx-tab:hover { transform: translateX(3px); box-shadow: 0 12px 26px -16px rgba(28,24,21,.2); }
.lv-fx-tab.on { border-color: var(--accent); background: var(--accent-tint); }
.lv-fx-tab .fx-ic { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 21px; flex-shrink: 0; background: var(--bg-warm); color: var(--ink); transition: background .15s, color .15s; }
.lv-fx-tab.on .fx-ic { background: var(--accent); color: #fff; }
.lv-fx-tab h4 { font-family: var(--font-d); font-size: 16px; font-weight: 600; }
.lv-fx-tab p { font-size: 12.5px; color: var(--ink-soft); margin-top: 3px; line-height: 1.4; }
.lv-fx-screen { background: var(--ink-deep); border-radius: var(--r-lg); padding: 13px; box-shadow: 0 34px 80px -30px rgba(28,24,21,.45); }
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
.lv-ws-item.on { background: var(--card); border-color: var(--line); box-shadow: 0 16px 34px -18px rgba(28,24,21,.22); }
.lv-ws-item .fx-ic { width: 44px; height: 44px; border-radius: 12px; background: var(--bg-warm); color: var(--ink); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; transition: background .15s, color .15s; }
.lv-ws-item.on .fx-ic { background: var(--accent); color: #fff; }
.lv-ws-item-name { font-family: var(--font-d); font-size: 17px; font-weight: 600; color: var(--ink); }

.lv-ws-screen { background: var(--ink-deep); border-radius: var(--r-lg); padding: 16px; box-shadow: 0 44px 100px -34px rgba(28,24,21,.55); }
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
.lv-ws-info li i { color: var(--teal); font-size: 20px; flex-shrink: 0; margin-top: 1px; }

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
.lv-diff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
.lv-diff h2 { font-family: var(--font-d); font-size: 40px; line-height: 1.08; letter-spacing: -.03em; font-weight: 700; margin-bottom: 18px; }
.lv-diff h2 .strike { color: var(--ink-faint); text-decoration: line-through; text-decoration-color: var(--accent); text-decoration-thickness: 3px; }
.lv-diff p { font-size: 16px; line-height: 1.6; color: var(--ink-soft); margin-bottom: 14px; }
.lv-diff p strong { color: var(--ink); font-weight: 600; }
.lv-diff-visual { position: relative; height: 320px; }

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
  .lv-hero-grid, .lv-diff-grid { grid-template-columns: 1fr; gap: 36px; }
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
`;

// ────────────────────────────────────────────────────────────────────────
function useLandingV2Head() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Get A Job — Your job search, finally connected";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex"; // preview only
    document.head.appendChild(robots);
    // Match the page ground so overscroll / any uncovered sliver never flashes
    // the browser's default white. Restored on unmount.
    const prevBodyBg = document.body.style.background;
    const prevHtmlBg = document.documentElement.style.background;
    document.body.style.background = "#FBF8F1";
    document.documentElement.style.background = "#FBF8F1";
    let tabler = document.head.querySelector("link[data-lv-tabler]");
    const existed = !!tabler;
    if (!tabler) {
      tabler = document.createElement("link");
      tabler.rel = "stylesheet";
      tabler.href = "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css";
      tabler.setAttribute("data-lv-tabler", "");
      document.head.appendChild(tabler);
    }
    return () => {
      document.title = prev;
      robots.remove();
      document.body.style.background = prevBodyBg;
      document.documentElement.style.background = prevHtmlBg;
      if (!existed) tabler.remove();
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
  const resume = () => { if (snapInstance && snapInstance.start) snapInstance.start(); };
  lenisInstance.scrollTo(target, { duration: 1.1, onComplete: resume });
  setTimeout(resume, 1700);
}

// Section snapping via Lenis's own Snap addon (folds the snap into the scroll
// physics instead of glide-then-snap). type:"proximity" only snaps when you stop
// near a snap point, so the long features tour — which has no inner points —
// stays free-scroll, and so do the short content sections below. We register ONLY
// the features section — NOT the hero, because snapping back to the top reverses
// the hero's scroll-recede (the content fades back in, which looks wrong).
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
        easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      });
      ["#features"].forEach((s) => {
        const el = document.querySelector(s);
        if (el && snap.addElement) snap.addElement(el, { align: "start" });
      });
      snapInstance = snap;
      console.info("[landing-v2] snap addon active");
    })
    .catch((e) => console.warn("[landing-v2] snap addon unavailable", e));
  return () => { cancelled = true; snapInstance = null; if (snap && snap.destroy) snap.destroy(); };
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
      reveals.forEach((el) => { el.style.opacity = "1"; el.style.transform = "none"; });
      if (heroWrap) { heroWrap.style.opacity = "1"; heroWrap.style.transform = "none"; }
      if (featTitle) featTitle.style.opacity = "1";
      return undefined;
    }

    // Measure each parallax layer's transform-free document-centre once.
    const measure = () =>
      parallax.forEach((el) => {
        el.style.transform = "";
        const r = el.getBoundingClientRect();
        el.dataset.base = String(Math.round(r.top + window.scrollY + r.height / 2));
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
        if (featTitle) featTitle.style.opacity = clamp01((y - 0.45 * heroH) / (0.5 * heroH)).toFixed(3);
      }
    };

    // Parallax runs immediately; arm the reveals only after webfonts settle the
    // layout (otherwise a block measured above the fold mid-load reveals, then
    // gets pushed down — showing already-on, un-animated). The hero's entrance
    // fires the moment we arm.
    measure();
    const arm = () => { if (!armed) { armed = true; measure(); } };
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
    const onResize = () => { measure(); update(); };
    window.addEventListener("resize", onResize);
    const onVis = () => { if (!document.hidden) { measure(); update(); } };
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
          const p = Math.min(1, Math.max(0, -outer.getBoundingClientRect().top / scrollable));
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

// ────────────────────────────────────────────────────────────────────────
function Nav({ isLoggedIn, onCTA }) {
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
          getajob<span className="dot" />
        </div>
        <div className="lv-nav-pill">
          <a href="#features" onClick={(e) => lvScrollTo(e, "#features")}>Features</a>
          <a href="#how" onClick={(e) => lvScrollTo(e, "#how")}>How it works</a>
          <a href="#faq" onClick={(e) => lvScrollTo(e, "#faq")}>FAQ</a>
        </div>
        <div className="lv-nav-right">
          <button type="button" className="btn btn-ink btn-sm" onClick={onCTA}>
            {isLoggedIn ? "Dashboard" : "Start free"}
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
  // We can't parse the CV here — selecting/dropping a file kicks off a friendly
  // "reading…" beat, then routes into the real signup/onboarding funnel.
  const start = () => {
    if (busy) return;
    setBusy(true);
    setTimeout(onUpload, 950);
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
        start();
      }}
    >
      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={start} />
      {busy ? (
        <>
          <div className="lv-spinner" />
          <div className="lv-drop-t">Reading your CV…</div>
          <div className="lv-drop-s">Building your roadmap</div>
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
              Upload &amp; see your roadmap <i className="ti ti-arrow-up-right" />
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// Scale stats for the hero. First two are placeholders — swap in real live
// numbers; the last two come from the repo's data (908 companies, 195 roles).
const HERO_STATS = [
  { to: 2000, suffix: "+", label: "live roles in the system", icon: "ti-briefcase" },
  { to: 150, suffix: "+", label: "new roles every week", icon: "ti-calendar-plus" },
  { to: 908, suffix: "", label: "Israeli companies tracked", icon: "ti-building-skyscraper" },
  { to: 195, suffix: "", label: "roles mapped to you", icon: "ti-target-arrow" },
];

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
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setTimeout(() => {
      reels.forEach((r, i) => {
        if (reduce) r.style.transition = "none";
        else r.style.transitionDelay = `${(delay + i * 0.07).toFixed(2)}s`;
        r.style.transform = `translateY(-${r.dataset.final}em)`;
      });
    }, reduce ? 0 : 90);
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
  return (
    <header className="lv-hero lv-dots">
      <div className="lv-deco lv-ring dash" data-parallax="-0.16" style={{ width: 320, height: 320, top: -80, right: -60 }} aria-hidden="true" />
      <div className="lv-deco lv-griddots" data-parallax="0.13" style={{ width: 132, height: 132, bottom: 30, left: 10 }} aria-hidden="true" />
      <div className="lv-deco lv-blob" data-parallax="0.2" style={{ width: 260, height: 260, background: "var(--accent)", opacity: 0.16, top: 70, left: -110 }} aria-hidden="true" />
      <div className="lv-deco lv-blob" data-parallax="-0.1" style={{ width: 220, height: 220, background: "var(--teal)", opacity: 0.13, bottom: -60, right: 60 }} aria-hidden="true" />
      <div className="lv-wrap">
        <div className="lv-hero-top">
          <h1 className="lv-reveal">
            Your whole job search.
            <br />
            <span className="accent">One place that knows you.</span>
          </h1>
          <p className="lv-hero-sub lv-reveal" data-d="1">
            A ranked roadmap, CVs tailored to each job, and live matches — all built from one profile and <strong>kept in sync</strong>.
          </p>
          <div className="lv-hero-cta lv-reveal" data-d="2">
            <button type="button" className="btn btn-accent" onClick={onCTA}>
              See your roadmap <i className="ti ti-arrow-up-right" />
            </button>
            <a className="lv-hero-link" href="#features" onClick={(e) => lvScrollTo(e, "#features")}>
              See how it works <i className="ti ti-arrow-down" />
            </a>
          </div>
        </div>
        <div className="lv-stats lv-reveal" data-d="3">
          {HERO_STATS.map((s, i) => (
            <div className="lv-stat" key={s.label}>
              <i className={`ti ${s.icon} lv-stat-ic`} aria-hidden="true" />
              <Odometer value={s.to} suffix={s.suffix} delay={i * 0.12} />
              <div className="lv-stat-l">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

// The CV upload — its own section, placed after the feature tour so the value is
// shown before the ask.
function DropSection({ onUpload }) {
  return (
    <section className="lv-section lv-dropsec lv-clip" id="start">
      <div className="lv-deco lv-ring dash" data-parallax="-0.12" style={{ width: 240, height: 240, top: -60, left: -50 }} aria-hidden="true" />
      <div className="lv-deco lv-blob" data-parallax="0.16" style={{ width: 240, height: 240, background: "var(--accent)", opacity: 0.12, bottom: -70, right: -40 }} aria-hidden="true" />
      <div className="lv-wrap">
        <div className="lv-head center lv-reveal">
          <div className="lv-eyebrow">Start in minutes</div>
          <h2>Drop your CV. We&apos;ll build the rest.</h2>
          <p>Your roadmap, tailored resumes, and live matches — from a single upload.</p>
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
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: "ti-route",
    name: "Career roadmap",
    desc: "Every role ranked against you, across three tracks.",
    url: "getajob.careers/career",
    screen: (
      <>
        <div className="lv-sc-eye">Career roadmap · ranked by fit</div>
        {[
          ["Product Manager", "TRACK 1", "tag-t1", "86%"],
          ["Business Analyst", "TRACK 1", "tag-t1", "81%"],
          ["Growth Marketing", "TRACK 2", "tag-t2", "67%"],
          ["Strategy Consultant", "TRACK 2", "tag-t2", "58%"],
        ].map(([role, t, c, fit]) => (
          <div className="lv-sc-row" key={role}>
            <span>{role}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "var(--font-d)", color: "var(--accent)" }}>{fit}</span>
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
    desc: "Rewritten per job from your real wins — never fabricated.",
    url: "getajob.careers/build",
    screen: (
      <>
        <div className="lv-sc-eye">Tailored · PM at monday.com</div>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 15, marginBottom: 13 }}>Isaac Selig — Product</div>
          {[100, 90].map((w) => (
            <div key={w} style={{ height: 7, width: `${w}%`, background: "var(--bg-warm)", borderRadius: 99, marginBottom: 10 }} />
          ))}
          {["Cut response time 40% with a triage system", "Found 3 upsell paths in demo-prep analysis"].map((t) => (
            <div
              key={t}
              style={{ background: "var(--accent-tint)", color: "var(--accent-deep)", fontSize: 12, fontWeight: 600, borderRadius: 7, padding: "8px 11px", marginBottom: 9 }}
            >
              <i className="ti ti-sparkles" style={{ fontSize: 12, marginRight: 6 }} />
              {t}
            </div>
          ))}
          {[86, 68].map((w) => (
            <div key={w} style={{ height: 7, width: `${w}%`, background: "var(--bg-warm)", borderRadius: 99, marginBottom: 10 }} />
          ))}
        </div>
      </>
    ),
  },
  {
    icon: "ti-briefcase",
    name: "Live job matches",
    desc: "Thousands of openings, filtered and scored to your fit.",
    url: "getajob.careers/jobs",
    screen: (
      <>
        <div className="lv-sc-eye">Live matches · today</div>
        {[
          ["M", "Associate PM", "monday.com · Tel Aviv", "92%"],
          ["R", "Product Analyst", "Riskified · Tel Aviv", "84%"],
          ["G", "Business Analyst", "Gong · Ramat Gan", "79%"],
        ].map(([ini, role, co, fit]) => (
          <div className="lv-sc-row" key={role}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 11 }}>
              <span className="lv-sc-sq" style={{ background: "var(--accent-tint)", color: "var(--accent-deep)" }}>{ini}</span>
              <span>
                <span style={{ display: "block" }}>{role}</span>
                <span style={{ display: "block", fontSize: 11, fontWeight: 400, color: "var(--ink-faint)" }}>{co}</span>
              </span>
            </span>
            <span className="lv-sc-pill" style={{ background: "var(--teal-tint)", color: "var(--teal)" }}>{fit} fit</span>
          </div>
        ))}
      </>
    ),
  },
  {
    icon: "ti-layout-kanban",
    name: "Pipeline",
    desc: "Track every application from saved to offer.",
    url: "getajob.careers/career",
    screen: (
      <>
        <div className="lv-sc-eye">Pipeline · 12 applications</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7 }}>
          {[
            ["Saved", "var(--ink-faint)", ["Wix", "Gong"]],
            ["Applied", "var(--golden)", ["Fiverr", "Monday"]],
            ["Interview", "var(--teal)", ["Riskified"]],
            ["Offer", "var(--accent)", ["Taboola"]],
          ].map(([label, dot, cards]) => (
            <div key={label} style={{ background: "var(--bg-warm)", borderRadius: 10, padding: 8, minHeight: 158 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 9 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: dot }} />
                <span style={{ fontSize: 10.5, fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 10, color: "var(--ink-faint)", marginLeft: "auto" }}>{cards.length}</span>
              </div>
              {cards.map((c) => (
                <div key={c} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 9px", marginBottom: 6, fontSize: 11, fontWeight: 600 }}>{c}</div>
              ))}
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    icon: "ti-microphone",
    name: "Interview prep",
    desc: "Practice real questions, scored on the spot.",
    url: "getajob.careers/interview",
    screen: (
      <>
        <div className="lv-sc-eye">Interview practice · behavioural</div>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "13px 15px", marginBottom: 13, fontSize: 13, fontWeight: 600 }}>
          &ldquo;Tell me about a time you turned data into a decision.&rdquo;
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 13 }}>
          <span style={{ fontFamily: "var(--font-d)", fontSize: 26, fontWeight: 700, color: "var(--teal)" }}>8.4</span>
          <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>/ 10 · strong answer</span>
        </div>
        {[
          ["Structure", 90],
          ["Specifics", 78],
          ["Outcome", 86],
        ].map(([l, v]) => (
          <div key={l} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 4 }}>
              <span>{l}</span>
              <span>{v}%</span>
            </div>
            <div className="lv-sc-bar">
              <i style={{ width: `${v}%` }} />
            </div>
          </div>
        ))}
      </>
    ),
  },
  {
    icon: "ti-brand-linkedin",
    name: "LinkedIn optimiser",
    desc: "Profile, posts, and outreach — drafted from your wins.",
    url: "getajob.careers/linkedin",
    screen: (
      <>
        <div className="lv-sc-eye">LinkedIn optimiser</div>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 15 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 13 }}>
            <span className="lv-sc-sq" style={{ width: 42, height: 42, borderRadius: 99, background: "var(--accent-tint)", color: "var(--accent-deep)", fontSize: 15 }}>IS</span>
            <div>
              <div style={{ fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 14 }}>Isaac Selig</div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                Product · turning{" "}
                <span style={{ background: "var(--accent-tint)", color: "var(--accent-deep)", borderRadius: 4, padding: "0 4px" }}>data into decisions</span>
              </div>
            </div>
          </div>
          {["Rewrote your headline for recruiter search", "Drafted a post from your Q3 launch story"].map((t) => (
            <div key={t} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--ink-soft)", padding: "6px 0" }}>
              <i className="ti ti-check" style={{ color: "var(--teal)", fontSize: 15 }} /> {t}
            </div>
          ))}
        </div>
      </>
    ),
  },
];

// Benefit bullets for the right-hand explainer, index-aligned with FEATURES.
const FEATURE_POINTS = [
  ["Every role ranked against your profile", "Core, adjacent and stretch tracks", "Re-scores as you log new wins"],
  ["Rewritten per job from your real wins", "Never fabricates — only what's true", "Fully editable before you send"],
  ["Live openings across the Israeli market", "Scored to your fit, refreshed daily", "Filter by track, company and location"],
  ["Saved → Applied → Interview → Offer", "Every application on one board", "Deadlines and next steps in view"],
  ["Real questions for your target role", "Scored on structure, specifics, outcome", "Run as many practice rounds as you like"],
  ["Headline tuned for recruiter search", "Posts drafted from your wins", "Outreach that still sounds like you"],
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
            <h2>One workspace. It all knows you.</h2>
            <p>Six tools, one shared memory of your background — keep scrolling to move through them.</p>
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
                    <span className="lv-ws-item-name">{feat.name}</span>
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
                  <span className="lv-ws-info-eye">Tool {String(active + 1).padStart(2, "0")} / {String(FEATURES.length).padStart(2, "0")}</span>
                  <h3>{f.name}</h3>
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

function Differentiator() {
  return (
    <section className="lv-section lv-diff lv-clip lv-fade">
      <div className="lv-deco lv-griddots" data-parallax="0.17" style={{ width: 150, height: 150, top: 36, left: -40 }} aria-hidden="true" />
      <div className="lv-deco lv-ring dash" data-parallax="-0.15" style={{ width: 220, height: 220, bottom: -70, right: -60 }} aria-hidden="true" />
      <div className="lv-wrap lv-diff-grid">
        <div className="lv-reveal">
          <h2>
            <span className="strike">A chatbot</span> that forgets you. Not here.
          </h2>
          <p>
            Generic AI starts from zero every session — re-explain yourself, get a different answer, end up back at your
            old draft.
          </p>
          <p>
            <strong>Get A Job remembers.</strong> Every win, every job, every chat builds on the last. The more you use
            it, the sharper it gets.
          </p>
        </div>
        <div className="lv-diff-visual lv-reveal" data-d="1" aria-hidden="true">
          <svg className="lv-floaty" viewBox="0 0 420 320" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            <defs>
              <marker id="lvarrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="var(--accent)" />
              </marker>
            </defs>
            <circle cx="210" cy="160" r="50" fill="var(--card)" stroke="var(--accent)" strokeWidth="1.5" />
            <text x="210" y="156" textAnchor="middle" fontFamily="var(--font-m)" fontSize="11" fill="var(--ink)">
              Story
            </text>
            <text x="210" y="170" textAnchor="middle" fontFamily="var(--font-m)" fontSize="11" fill="var(--ink)">
              Bank
            </text>
            {[
              [70, 60, "CV"],
              [350, 60, "Posts"],
              [60, 260, "Interview"],
              [360, 260, "Roadmap"],
            ].map(([x, y, label], i) => (
              <g key={label}>
                <line className="lv-dflow" style={{ animationDelay: `${i * 0.3}s` }} x1="210" y1="160" x2={x} y2={y} stroke="var(--accent)" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="3 5" markerEnd="url(#lvarrow)" />
                <rect x={x - 42} y={y - 16} width="84" height="32" rx="16" fill="var(--card)" stroke="var(--line)" strokeWidth="1.5" />
                <text x={x} y={y + 4} textAnchor="middle" fontFamily="var(--font-b)" fontSize="12" fontWeight="600" fill="var(--ink)">
                  {label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { n: "01", h: "Upload your CV", p: "We read your skills, experience, and education — no forms to fill." },
  { n: "02", h: "See your roadmap", p: "Every role in the library, ranked against you across three tracks." },
  { n: "03", h: "Tailor and apply", p: "Pick a live job; your CV is rewritten from your real, matching wins." },
  { n: "04", h: "Track and improve", p: "Watch your pipeline, capture wins, and get a fresh move every morning." },
];

function HowItWorks() {
  return (
    <section className="lv-section lv-clip lv-fade" id="how">
      <div className="lv-deco lv-ring" data-parallax="0.14" style={{ width: 200, height: 200, top: -50, right: -60 }} aria-hidden="true" />
      <div className="lv-deco lv-griddots" data-parallax="-0.12" style={{ width: 120, height: 120, bottom: 20, left: -30 }} aria-hidden="true" />
      <div className="lv-wrap">
        <div className="lv-head lv-reveal">
          <div className="lv-eyebrow">From upload to first application</div>
          <h2>Four steps. Roughly a week.</h2>
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
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "What data do you collect, and where does it go?",
    a: "Your data powers AI features via OpenAI, which doesn't train on it and deletes it after 30 days. We don't sell data and we don't run ads.",
  },
  {
    q: "Will the AI make things up on my CV?",
    a: "No. The CV agent can only use what's in your Story Bank — if you didn't capture a metric or accomplishment, it can't invent one. Every output is editable before you send it.",
  },
  {
    q: "Do I need to be a designer or a writer?",
    a: "No. Upload your CV and the platform does the heavy lifting — roadmap, tailoring, job matching. You stay in control and edit anything.",
  },
  {
    q: "Can I delete my account?",
    a: "Yes — from Settings, type a confirmation phrase and your account plus every record is permanently deleted. Not a soft-delete.",
  },
];

function FAQSection() {
  const [open, setOpen] = useState(0);
  return (
    <section className="lv-section lv-fade" id="faq">
      <div className="lv-wrap lv-faq-wrap">
        <div className="lv-head lv-reveal">
          <div className="lv-eyebrow">Good questions</div>
          <h2>The honest answers.</h2>
        </div>
        <div className="lv-reveal" data-d="1">
          {FAQS.map((f, i) => (
            <div className={`lv-faq-item${open === i ? " open" : ""}`} key={f.q}>
              <button type="button" className="lv-faq-q" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
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
    <section className="lv-final lv-fade">
      <div className="lv-wrap">
        <div className="lv-final-card lv-reveal">
          <div className="lv-final-blob" style={{ width: 220, height: 220, background: "var(--accent)", top: -80, left: -40 }} data-parallax="0.05" />
          <div className="lv-final-blob" style={{ width: 180, height: 180, background: "var(--teal)", bottom: -70, right: -30, opacity: 0.4 }} data-parallax="-0.04" />
          <div style={{ position: "relative" }}>
            <div className="lv-eyebrow">Start in minutes</div>
            <h2>Your next role is in there. Let&apos;s find it.</h2>
            <p>Upload your CV and watch your roadmap, matches, and first tailored resume come together.</p>
            <button type="button" className="btn btn-accent" onClick={onCTA} style={{ fontSize: 16, padding: "15px 30px" }}>
              {isLoggedIn ? "Open your dashboard" : "Upload your CV — free"}
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
          getajob<span className="dot" />
        </div>
        <div>© 2026 Get A Job</div>
        <div className="lv-foot-links">
          <a href="#features" onClick={(e) => lvScrollTo(e, "#features")}>Features</a>
          <a href="#faq" onClick={(e) => lvScrollTo(e, "#faq")}>FAQ</a>
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
  const auth = useAuth?.() || {};
  const isLoggedIn = !!(auth.isAuthenticated && auth.user);
  const onCTA = () => navigate(isLoggedIn ? "/" : "/Login");

  const ref = useRef(null);
  return (
    <div className="lv" ref={ref}>
      <style>{LV_CSS}</style>
      <Nav isLoggedIn={isLoggedIn} onCTA={onCTA} />
      <Hero onCTA={onCTA} />
      <FeatureExplorer />
      <Differentiator />
      <HowItWorks />
      <DropSection onUpload={onCTA} />
      <FAQSection />
      <FinalCTA isLoggedIn={isLoggedIn} onCTA={onCTA} />
      <Footer />
    </div>
  );
}
