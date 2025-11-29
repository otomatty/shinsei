import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [react()],

  resolve: {
    alias: {
      // Lichtblick packages
      "@lichtblick/suite-base": fileURLToPath(
        new URL("./lichtblick/packages/suite-base/src", import.meta.url)
      ),
      "@lichtblick/log": fileURLToPath(
        new URL("./lichtblick/packages/log/src", import.meta.url)
      ),
      "@lichtblick/hooks": fileURLToPath(
        new URL("./lichtblick/packages/hooks/src", import.meta.url)
      ),
      "@lichtblick/message-path": fileURLToPath(
        new URL("./lichtblick/packages/message-path/src", import.meta.url)
      ),
      "@lichtblick/theme": fileURLToPath(
        new URL("./lichtblick/packages/theme/src", import.meta.url)
      ),
      "@lichtblick/den": fileURLToPath(
        new URL("./lichtblick/packages/den/src", import.meta.url)
      ),
      "@lichtblick/mcap-support": fileURLToPath(
        new URL("./lichtblick/packages/mcap-support/src", import.meta.url)
      ),
      "@lichtblick/suite": fileURLToPath(
        new URL("./lichtblick/packages/suite/src", import.meta.url)
      ),
      "@lichtblick/comlink-transfer-handlers": fileURLToPath(
        new URL(
          "./lichtblick/packages/comlink-transfer-handlers/src",
          import.meta.url
        )
      ),
      // Node.js polyfills for browser
      path: "path-browserify",
      crypto: "crypto-browserify",
      stream: "readable-stream",
      zlib: "browserify-zlib",
      vm: "vm-browserify",
      buffer: "buffer/",
    },
  },

  define: {
    // Define process.env for browser compatibility
    "process.env": "import.meta.env",
    global: "globalThis",
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@mui/material",
      "@emotion/react",
      "@emotion/styled",
      "path-browserify",
      "crypto-browserify",
      "readable-stream",
      "browserify-zlib",
      "vm-browserify",
      "buffer",
    ],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
