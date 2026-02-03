/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_THROTTLE_INTERVAL_MS: string;
  readonly VITE_BUS_STOPS_REFRESH_DAYS: string;
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
