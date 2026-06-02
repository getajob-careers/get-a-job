# Visual redesign — standing rules + status

The full visual redesign of `getajob.careers` rolls forward page by page in
funnel order. Login is first. These two rules apply to every page rebuild,
not just the first one.

---

## Standing rules (every redesign PR)

### 1. RESTYLE-ONLY ON BEHAVIOR

Apply the new visual system, but preserve every required section, state,
and behavior the page already has.

- The LIVE page/component is the source of truth for what must be preserved.
- The mockups in `docs/design/redesign/` are visual style ONLY, never a
  functional spec.
- Before any redesign PR touches a page, inventory the live file first
  (every section, state, query param, error mode, edge function call,
  analytics event, loading/disabled state). Then map each inventory item
  into the new design. Lose nothing.

### 2. SHIP A VISUAL PREVIEW

Every page rebuild produces a preview artifact so the result can be
reviewed without running the app.

- Public routes: render the built page in headless Playwright; export a
  multi-screenshot PDF (desktop + mobile widths, every distinct visual
  state of the page).
- Auth-gated pages: propose the preview approach (test session vs.
  component harness in a sandbox route) BEFORE building, since neither
  is automatic.
- Save the preview at `docs/design/redesign/previews/<page>.pdf` and link
  it in the PR body.

---

## Typecheck baseline (locked)

`npm run typecheck`: **434 errors** as of 2026-06-02 (after PR #212).

**Rule:** no redesign PR may increase this count. Each redesign PR runs
`npm run typecheck`, diffs against 434, and reports the delta in its PR
body. If a PR would raise the count, fix the regression in the same PR
or scope-cut.

| PR | Date | TS errors | Δ vs baseline |
|---|---|---|---|
| Baseline | 2026-06-02 | 434 | — |
| `eli/redesign-foundation-login` (foundation + Login) | 2026-06-02 | 432 | −2 |

---

## Foundation (PR #1 — `eli/redesign-foundation-login`)

Ships additively. Nothing reads `--rd-*` until a page opts in, so all
live pages keep working untouched.

- `src/index.css` — `--rd-*` tokens inlined inside `@layer base { :root { … } }`
  (additive; the existing shadcn `:root` block stays untouched). The
  tokens were briefly kept in `src/styles/redesignTokens.css` and pulled
  in via `@import`, but CSS spec requires `@import` to precede every
  other rule — placing it after the `@tailwind` directives meant PostCSS
  silently dropped it and every `--rd-*` resolved to its fallback.
  Inlining is the safest pattern; edits go to `index.css` directly.
- `tailwind.config.js` — `theme.extend.colors.rd.*` + `fontFamily.display`
  added (existing entries untouched).
- `index.html` — `<link>` for Rokkitt weights 500/600/700/800.
- `src/components/redesign/RdButton.jsx` — coral pill primary.
- `src/components/redesign/RdCard.jsx` — white card, radius 18px, soft
  warm shadow.

Deferred to later PRs: `RdTabs`, `RdPill`, `RdBadge`, and any retro of
existing Direction-3 surfaces. `src/lib/trackConfig.js` is NOT touched.

---

## Login restyle (PR #1, same branch as foundation)

First page-by-page rebuild — public, auth-funnel entry. Restyle-only on
behavior: every section / state / behavior from the live Login.jsx is
preserved (URL-driven modes, ?deleted=1 toast, invite-code redemption →
inline waitlist, full Turnstile gating, PasswordRequirements, post-signup
PostHog flag). Direction 3 scoped `.login` styles fully replaced with
`--rd-*` tokens + RdButton / RdCard.

**Things added (not pure restyle but in-scope):**
- `/privacy` + `/terms` route shells (`src/pages/Privacy.jsx`,
  `src/pages/Terms.jsx`) so the new consent checkbox links resolve.
  Real content lands in a follow-up PR.
- Required Terms & Privacy consent checkbox on signup; gates submit.
- `?preview=waitlist` URL hatch — initializes `waitlistMode=true` so
  the preview pipeline can capture this branch without hitting the
  live `redeem_invite_code` RPC. Harmless in production.

**Things intentionally deferred:**
- "Email not confirmed" resend button (backlog).
- Real Terms / Privacy copy.

**Preview pipeline:** `scripts/preview-login.mjs`. Headless Chromium
(Playwright) renders `/login` in the 4 states × 2 viewports (1280×900 +
390×844), blocks `challenges.cloudflare.com` so Turnstile's iframe
doesn't churn capture, then `pdf-lib` assembles 8 pages →
`docs/design/redesign/previews/login.pdf`.

**Auth-gated previews (forward note):** PR 2 onward will need a
different strategy. Pick before building each page:
1. **Test-session via Supabase auth admin API** — script creates a
   throwaway user, signs them in, drives the page in their session,
   tears down. Higher fidelity (real layout chrome, real data shape)
   at the cost of side effects on prod data.
2. **Component harness on a `/_preview/<page>` route gated to
   `import.meta.env.DEV`** — renders the target page in isolation with
   hand-mocked props/queries. Cheaper, isolated from auth + DB, but
   risks drift if the harness mocks don't track the live page's
   contract.
Recommendation written in each PR's investigation step.

---

## Token reference (`--rd-*`, locked palette)

| Token | Value | Role |
|---|---|---|
| `--rd-bg-page` | `#FAF6F0` | warm cream page background |
| `--rd-bg-card` | `#FFFFFF` | card surfaces |
| `--rd-bg-sidebar` | `#EFE7DB` | sidebar/brand-panel background |
| `--rd-bg-soft` | `#F3ECE0` | filter pills, secondary fills |
| `--rd-border` | `#F0E7D8` | card/input borders |
| `--rd-border-subtle` | `#EDE7DD` | hairlines, tab separators |
| `--rd-border-hover` | `#E0D6C4` | card hover state |
| `--rd-text` | `#211D18` | primary text |
| `--rd-text-secondary` | `#928C80` | metadata, captions |
| `--rd-text-tertiary` | `#857F74` | nav inactive |
| `--rd-text-eyebrow` | `#A38E6F` | overlines |
| `--rd-coral` | `#EF5A41` | primary CTA accent |
| `--rd-coral-dark` | `#C7461F` | coral hover / emphasis |
| `--rd-coral-tint` | `#FCE6DF` | coral-on-cream backgrounds |
| `--rd-teal` | `#54B5A2` | success / progress |
| `--rd-teal-dark` | `#2E7C6B` | teal text emphasis |
| `--rd-teal-tint` | `#DBEEE8` | teal backgrounds |
| `--rd-golden` | `#EFB23E` | stats / info accent |
| `--rd-golden-dark` | `#7A5408` | golden text emphasis |
| `--rd-golden-tint` | `#FBEBC9` | golden backgrounds |
| `--rd-peach` | `#E79B7D` | decorative |
| `--rd-shadow` | `0 10px 28px rgba(40,25,10,.07)` | elevated card |
| `--rd-font-display` | `'Rokkitt', Georgia, serif` | headings (body stays system stack) |
