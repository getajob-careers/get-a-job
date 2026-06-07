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
