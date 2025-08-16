/// <reference types= 'vite/client' />'
interface ImportMetaEnv   {
  readonly VITE_API_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_ELECTRON_MODE: string
  readonly VITE_DEV_PORT: string
  readonly VITE_MAX_LOGIN_ATTEMPTS: string
  readonly VITE_LOCKOUT_DURATION: string
  readonly VITE_SESSION_TIMEOUT: string
  readonly VITE_API_RATE_LIMIT: string
  readonly VITE_ADMIN_API_RATE_LIMIT: string
  // 更多环境变量...
}

interface ImportMeta   {
  readonly env: ImportMetaEnv
}
