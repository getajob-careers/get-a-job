// RouteFallback.jsx — generic chunk-loading skeleton + chunk-load-error
// boundary used as the Suspense fallback for every lazy-loaded page.
//
// Two responsibilities, one component:
// 1. While React.lazy is fetching the page's chunk, render a generic
//    skeleton that matches the platform's existing skeleton tone (the
//    shadcn `Skeleton` primitive). Single shape covers all 19+ lazy
//    pages; per-page refinement can come later if any specific route
//    looks jarring.
// 2. If the chunk fetch itself fails (ChunkLoadError mid-load, e.g.,
//    stale tab whose chunk Vercel rotated past its retention), the
//    embedded ErrorBoundary renders a "couldn't load — reload" CTA
//    instead of letting the failure crash the whole route tree.
//
// The companion piece is the global chunk-error handler in main.jsx
// which catches load failures BEFORE Suspense gets a chance and
// reloads once. RouteFallback's boundary covers the in-Suspense
// failure path the global handler can't reach.

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

function RouteSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header band — mirrors the eyebrow + h1 + sub pattern most pages use */}
      <div className="mb-7">
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-7 w-2/3 mb-1.5" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Card grid — 3 cards covers the bento dashboards + the simpler list pages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>

      {/* Two list rows — Tasks / Tracker / Stories all have this shape */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    </div>
  );
}

class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Only catch chunk-load failures here. Other errors should bubble to
    // GlobalErrorBoundary as they normally would. The match covers Vite's
    // failed-dynamic-import shape + the historical ChunkLoadError name.
    const msg = String(error?.message || error || "");
    const isChunkError =
      error?.name === "ChunkLoadError" ||
      /Failed to fetch dynamically imported module/.test(msg) ||
      /Loading chunk \d+ failed/.test(msg);
    return isChunkError ? { hasError: true } : { hasError: false };
  }

  componentDidCatch(error) {
    if (this.state.hasError) {
      console.warn("[RouteFallback] caught chunk load error:", error?.message || error);
    } else {
      throw error;
    }
  }

  handleReload = () => {
    // Force a full reload — the main.jsx sentinel will let this one
    // through since we're not in a same-tab reload loop scenario here
    // (the user explicitly clicked Reload).
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <p className="text-base font-semibold text-[#0E1014] mb-2">Couldn't load this page</p>
          <p className="text-sm text-[#52545A] mb-6">
            The app updated while your tab was open. A quick reload picks up the new version.
          </p>
          <Button onClick={this.handleReload} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Wraps a Suspense-fallback skeleton in a chunk-load-error boundary.
 * Use as: `<Suspense fallback={<RouteFallback />}>...</Suspense>`.
 *
 * Wait — that's wrong: ErrorBoundaries catch errors in their CHILDREN,
 * not in their own render. The correct pattern is to wrap the
 * Suspense itself with the boundary. See App.jsx for the actual usage.
 *
 * This component exports just the skeleton for use as the Suspense
 * fallback, and the boundary class for use one level up.
 */
export default RouteSkeleton;
export { ChunkErrorBoundary };
