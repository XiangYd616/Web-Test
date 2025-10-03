/// <reference types="vite/client" />

/**
 * Vite 环境变量类型定义
 * 为所有自定义的环境变量提供TypeScript类型支持
 */
interface ImportMetaEnv {
  // API 配置
  readonly VITE_API_URL: string
  readonly VITE_REQUEST_TIMEOUT: string
  
  // 应用配置
  readonly VITE_APP_TITLE: string
  readonly VITE_ELECTRON_MODE: string
  readonly VITE_DEV_PORT: string
  
  // 安全配置
  readonly VITE_MAX_LOGIN_ATTEMPTS: string
  readonly VITE_LOCKOUT_DURATION: string
  readonly VITE_SESSION_TIMEOUT: string
  
  // API 限流
  readonly VITE_API_RATE_LIMIT: string
  readonly VITE_ADMIN_API_RATE_LIMIT: string
  
  // 功能开关
  readonly VITE_ENABLE_DEBUG?: string
  readonly VITE_ENABLE_ANALYTICS?: string
  
  // 第三方服务（可选）
  readonly VITE_GOOGLE_PAGESPEED_API_KEY?: string
  
  // 注意：Vite 内置变量已自带类型，无需额外定义
  // MODE: 'development' | 'production' | 'test'
  // DEV: boolean
  // PROD: boolean
  // SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
