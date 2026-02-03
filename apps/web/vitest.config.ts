import react from "@vitejs/plugin-react-oxc";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["**/*.{test,spec}.{js,jsx,ts,tsx}"],
    exclude: ["node_modules", "dist", "build"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.{js,jsx,ts,tsx}",
        "src/**/*.spec.{js,jsx,ts,tsx}",
        "src/test/**/*",
        "src/mocks/**/*",
      ],
    },
    typecheck: {
      tsconfig: "./tsconfig.app.json",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@my-bus-assistant/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
});
