// MUST be the very first import — installs standard-API polyfills
// (Promise.withResolvers, structuredClone, Array.prototype.findLast)
// before any other module loads. Particularly, pdfjs-dist's dynamic
// import in StepResumeUpload calls Promise.withResolvers internally;
// older iOS Safari (<17.4) lacks it and crashes the CV upload. The
// polyfill must exist before pdfjs evaluates, which means before
// anything React-side has a chance to lazy-load it.
import '@/lib/polyfills'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary'
import { initPostHog } from '@/lib/posthogClient'
import { hasAnalyticsConsent, isAnonymousAnalyticsEnabled } from '@/lib/cookieConsent'

// Early analytics init for ANONYMOUS visitors, gated by BOTH a master env flag
// and the visitor's stored cookie-consent choice.
//
// Why: PostHog previously initialised only inside PostHogProvider, which mounts
// only for authenticated users, so logged-out visitors who land and bounce
// before the app boots were never counted. Initialising here, before React
// renders, fires the initial $pageview for a fast-bouncing logged-out visitor.
//
// ACCEPT-FIRST: nothing initialises on load unless a stored 'accepted' choice
// already exists (set by the cookie banner on a prior visit). No choice yet, or
// 'rejected', means no init, no analytics cookie, no pageview. The banner calls
// initPostHog the moment a visitor clicks Accept, so the current session starts
// tracking from that point without a reload.
//
// Master gate: VITE_POSTHOG_EARLY_INIT must be 'true' for any of this to run,
// so activation stays controlled until the consent flow is approved. Both reads
// are wrapped and fail to the safe state (no tracking), so this never blocks
// app boot. Authenticated tracking is unaffected: it runs via PostHogProvider.
if (isAnonymousAnalyticsEnabled() && hasAnalyticsConsent()) {
  initPostHog({ enableSessionRecording: false })
}

// Chunk-load-error auto-reload guard.
//
// Why: with route-level code splitting, a tab open across a Vercel
// deploy may try to fetch a chunk whose content-hash no longer exists.
// React.lazy raises a ChunkLoadError when that happens. The
// in-Suspense path is covered by RouteFallback's ChunkErrorBoundary
// (renders a "couldn't load — reload" CTA). This handler covers the
// pre-Suspense path: dynamic imports raised by non-route code (the
// lazy-loaded pdfjs / jsPDF inside StepResumeUpload + MessageBubble)
// surface as `unhandledrejection` events from outside Suspense.
//
// Sentinel: sessionStorage flag prevents a reload loop when the chunk
// is GENUINELY missing (deploy failure, CDN issue). One auto-reload
// per session — if the chunk still fails after reload, the user sees
// the underlying error and can investigate manually.
const CHUNK_RELOAD_SENTINEL = 'gaj_chunk_reload_attempted_at'
const CHUNK_RELOAD_COOLDOWN_MS = 60_000

function isChunkLoadError(reason) {
  const msg = String(reason?.message || reason || '')
  return (
    reason?.name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/.test(msg) ||
    /Loading chunk \d+ failed/.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  )
}

window.addEventListener('error', (e) => {
  if (!isChunkLoadError(e?.error)) return
  maybeReloadOnce()
})
window.addEventListener('unhandledrejection', (e) => {
  if (!isChunkLoadError(e?.reason)) return
  maybeReloadOnce()
})

function maybeReloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_SENTINEL) || 0)
    if (last && Date.now() - last < CHUNK_RELOAD_COOLDOWN_MS) {
      console.warn('[chunk-reload] suppressing reload — already attempted recently')
      return
    }
    sessionStorage.setItem(CHUNK_RELOAD_SENTINEL, String(Date.now()))
    console.warn('[chunk-reload] stale chunk detected, reloading once')
    window.location.reload()
  } catch {
    // sessionStorage may be unavailable (private mode in some browsers).
    // Skip the reload in that edge case — better a manual fix than a loop.
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
)
