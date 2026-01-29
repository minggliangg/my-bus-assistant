import path from "path";
import tailwindcss from "@tailwindcss/vite";

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-oxc";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useMockApi = env.VITE_USE_MOCK_API === "true";
  const mockApiUrl = env.VITE_MOCK_API_URL || "http://localhost:3001";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: useMockApi ? mockApiUrl : "https://datamall2.mytransport.sg",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          configure: (proxy, _options) => {
            if (!useMockApi) {
              proxy.on("proxyReq", (proxyReq) => {
                proxyReq.setHeader(
                  "AccountKey",
                  env.VITE_LTA_DATAMALL_API_KEY || "",
                );
              });
            }
          },
        },
      },
    },
  };
});
