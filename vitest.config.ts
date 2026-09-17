import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // setupFaceClassifier.test.ts es PREEXISTENTE y usa el runner `node:test`
    // (se ejecuta con node --test), no vitest: no se toca, solo se excluye.
    exclude: ["src/lib/setupFaceClassifier.test.ts"],
  },
});
