import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Lichtblick packages aliases
      "@lichtblick/suite-base": path.resolve(
        __dirname,
        "./lichtblick/packages/suite-base/src"
      ),
      "@lichtblick/suite-base/App": path.resolve(
        __dirname,
        "./lichtblick/packages/suite-base/src/App"
      ),
      "@lichtblick/hooks": path.resolve(
        __dirname,
        "./lichtblick/packages/hooks/src"
      ),
      "@lichtblick/log": path.resolve(
        __dirname,
        "./lichtblick/packages/log/src"
      ),
      "@lichtblick/den": path.resolve(
        __dirname,
        "./lichtblick/packages/den/src"
      ),
    },
  },
});
