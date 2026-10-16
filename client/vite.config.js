import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const apiUrl = "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/games": apiUrl,
      "/scenes": apiUrl,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "tests/setup.js",
    unstubGlobals: true,
  },
});
