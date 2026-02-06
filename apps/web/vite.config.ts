import tailwindcss from "@tailwindcss/vite";
import path from "path";

import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import reactOxc from "@vitejs/plugin-react-oxc";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [TanStackRouterVite(), reactOxc(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("maplibre-gl")) {
            return "maplibre";
          }
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react-vendor";
          }
        },
      },
    },
  },
});
