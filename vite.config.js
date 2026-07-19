import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  // __PREVIEW_ROUTES__ is true ONLY on Vercel PREVIEW builds
  // (VERCEL_ENV === "preview"). A PRODUCTION build (VERCEL_ENV === "production")
  // folds it to false, so the _preview/* routes in src/App.jsx are stripped as
  // dead code. Evaluated here at build time (Node).
  define: {
    __PREVIEW_ROUTES__: JSON.stringify(process.env.VERCEL_ENV === "preview"),
  },
  plugins: [react()],
  // Pin the dev/preview server to a fixed port. strictPort makes vite FAIL if
  // 5173 is taken rather than silently rolling to 5174/5175 - the "port roulette"
  // that kept sending review links to the wrong port. Kill the stale instance
  // (pkill -f vite) instead of letting a second one grab a new port.
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Shared modules used by both the client and the Deno edge functions
      // (cv-master.ts, the deterministic master builder). One source of truth.
      "@shared": fileURLToPath(
        new URL("./supabase/functions/_shared", import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    css: false,
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.claude/**"],
  },
});
