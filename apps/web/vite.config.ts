import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/app/",
  plugins: [react()],
  server: {
    proxy: {
      // Local API worker (wrangler dev)
      "/api": "http://localhost:8787",
      // Portfolio photos served from R2 via the worker
      "/media": "http://localhost:8787",
    },
  },
  build: {
    // The worker serves apps/web/dist as the asset root; the PWA lives at
    // /app/, so the build lands in dist/app/ (sw.js, manifest and icons too).
    outDir: "dist/app",
    emptyOutDir: true,
  },
});
