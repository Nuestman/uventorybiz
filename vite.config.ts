import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "fs";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
);

export default defineConfig({
  plugins: [
    react(),
  ],
  esbuild: {
    // esbuild 0.28+ errors when targets include Safari <14.1 but cannot downlevel
    // destructuring. Our minimum browsers support it natively (see build.target).
    supported: {
      destructuring: true,
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Dev pre-bundling uses Vite's ESBUILD_MODULES_TARGET (includes safari14)
      // and does not inherit top-level `esbuild` — set explicitly for esbuild 0.28+.
      target: "es2020",
      supported: {
        destructuring: true,
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    target: ["es2020", "chrome87", "edge88", "firefox78", "safari14.1"],
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
