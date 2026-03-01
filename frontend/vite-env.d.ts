/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DEV_PORT?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GTMETRIX_API_KEY?: string;
  readonly VITE_WEBPAGETEST_API_KEY?: string;
  readonly VITE_USE_MOCK_DATA?: string;
  readonly VITE_MOCK_API_DELAY?: string;
  readonly VITE_ENABLE_OFFLINE_MODE?: string;
  readonly VITE_GOOGLE_ANALYTICS_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
