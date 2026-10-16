import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

const { parsed } = dotenv.config({ path: ".env.test", override: true, quiet: true });

export default defineConfig({
  test: {
    env: parsed,
    globalSetup: "tests/globalSetup.js",
    setupFiles: "tests/setup.js",
    // Test files share one database.
    fileParallelism: false,
  },
});
