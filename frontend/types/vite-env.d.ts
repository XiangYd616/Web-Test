/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_ENABLE_REALTIME: string;
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_DEBUG: string;
  readonly VITE_ENABLE_MONITORING: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
