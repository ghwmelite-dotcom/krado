import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    css: false,
    // Runs `tsc --noEmit` over the whole program (tsconfig.json includes
    // src + test), so type errors anywhere fail `npm test`.
    typecheck: {
      enabled: true,
      checker: "tsc",
      tsconfig: "./tsconfig.json",
      include: ["test/**/*.test-d.{ts,tsx}"],
    },
  },
});
