import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@shared/*": path.resolve(__dirname, "shared/*"),
    },
  },
});
