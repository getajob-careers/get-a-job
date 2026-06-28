import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  // __PREVIEW_ROUTES__ is true ONLY on Vercel PREVIEW builds
  // (VERCEL_ENV === "preview"). A PRODUCTION build (VERCEL_ENV === "production")
  // folds it to false, so the _preview/* routes in src/App.jsx are stripped as
  // dead code. Evaluated here at build time (Node).
  define: {
    __PREVIEW_ROUTES__: JSON.stringify(process.env.VERCEL_ENV === "preview"),
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    exclude: ['**/node_modules/**', '**/e2e/**', '**/.claude/**'],
  },
});