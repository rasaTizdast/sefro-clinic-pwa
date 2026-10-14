import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
    testTimeout: 15000,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    exclude: [
      "**/node_modules/**",
      ".opencode/**",
      "backend/**",
      // Exclude only Playwright specs; the e2e mock contract tests ARE run here.
      "e2e/**/*.spec.ts",
    ],
    // The e2e mock contract handlers are pure functions; unit-test them here so
    // the backend rules stay verified without launching Playwright. The
    // *.spec.ts files under e2e/ are Playwright's and stay excluded above.
    include: ["src/**/*.test.{ts,tsx}", "e2e/mocks/__tests__/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
