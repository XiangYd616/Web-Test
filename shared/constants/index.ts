/**
 * 共享常量定义
 * 包含API、测试类型、状态码等常量配置
 */

// API相关常量
export const API_CONSTANTS = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  API_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const;

// HTTP状态码
export const HTTP_STATUS = {
  // 成功状态
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // 重定向状态
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  
  // 客户端错误
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  
  // 服务器错误
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// 测试类型
export const TEST_TYPES = {
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  SEO: 'seo',
  ACCESSIBILITY: 'accessibility',
  COMPATIBILITY: 'compatibility',
  API: 'api',
  LOAD: 'load',
  STRESS: 'stress',
  UPTIME: 'uptime',
  UX: 'ux',
  FUNCTIONAL: 'functional',
} as const;

// 测试状态
export const TEST_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused',
} as const;

// 测试结果
export const TEST_RESULT = {
  PASSED: 'passed',
  FAILED: 'failed',
  WARNING: 'warning',
  SKIPPED: 'skipped',
  ERROR: 'error',
} as const;

// 严重级别
export const SEVERITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
} as const;

// 评分等级
export const SCORE_GRADES = {
  A: { min: 90, max: 100, label: '优秀', color: '#4caf50' },
  B: { min: 80, max: 89, label: '良好', color: '#8bc34a' },
  C: { min: 70, max: 79, label: '中等', color: '#ffeb3b' },
  D: { min: 60, max: 69, label: '及格', color: '#ff9800' },
  F: { min: 0, max: 59, label: '不及格', color: '#f44336' },
} as const;

// 用户角色
export const USER_ROLES = {
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  TESTER: 'tester',
  VIEWER: 'viewer',
  GUEST: 'guest',
} as const;

// 权限级别
export const PERMISSION_LEVELS = {
  FULL: 'full',
  WRITE: 'write',
  READ: 'read',
  NONE: 'none',
} as const;

// 文件类型
export const FILE_TYPES = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  VIDEO: ['mp4', 'webm', 'ogg', 'avi', 'mov'],
  AUDIO: ['mp3', 'wav', 'ogg', 'aac'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
  CODE: ['js', 'ts', 'jsx', 'tsx', 'css', 'html', 'json', 'xml'],
  ARCHIVE: ['zip', 'rar', '7z', 'tar', 'gz'],
} as const;

// 文件大小限制（字节）
export const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  DOCUMENT: 20 * 1024 * 1024, // 20MB
  TOTAL: 500 * 1024 * 1024, // 500MB
} as const;

// 时间相关常量（毫秒）
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

// 分页相关
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const;

// 表单验证
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 32,
  MAX_EMAIL_LENGTH: 254,
  MAX_URL_LENGTH: 2048,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_COMMENT_LENGTH: 1000,
} as const;

// 正则表达式
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/,
  PHONE_CN: /^1[3-9]\d{9}$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,32}$/,
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  IP_V4: /^(\d{1,3}\.){3}\d{1,3}$/,
  IP_V6: /^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$/,
} as const;

// 错误消息
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  SERVER_ERROR: '服务器错误，请稍后重试',
  AUTH_FAILED: '认证失败，请重新登录',
  PERMISSION_DENIED: '权限不足，无法执行此操作',
  NOT_FOUND: '请求的资源不存在',
  VALIDATION_ERROR: '输入数据验证失败',
  TIMEOUT: '请求超时，请重试',
  UNKNOWN_ERROR: '发生未知错误',
} as const;

// 成功消息
export const SUCCESS_MESSAGES = {
  SAVED: '保存成功',
  CREATED: '创建成功',
  UPDATED: '更新成功',
  DELETED: '删除成功',
  UPLOADED: '上传成功',
  SENT: '发送成功',
  COMPLETED: '操作完成',
} as const;

// 浏览器类型
export const BROWSER_TYPES = {
  CHROME: 'Chrome',
  FIREFOX: 'Firefox',
  SAFARI: 'Safari',
  EDGE: 'Edge',
  OPERA: 'Opera',
  IE: 'Internet Explorer',
} as const;

// 设备类型
export const DEVICE_TYPES = {
  DESKTOP: 'desktop',
  TABLET: 'tablet',
  MOBILE: 'mobile',
} as const;

// 操作系统
export const OS_TYPES = {
  WINDOWS: 'Windows',
  MACOS: 'macOS',
  LINUX: 'Linux',
  ANDROID: 'Android',
  IOS: 'iOS',
} as const;

// 主题类型
export const THEME_TYPES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

// 语言代码
export const LANGUAGE_CODES = {
  ZH_CN: 'zh-CN',
  EN_US: 'en-US',
  JA_JP: 'ja-JP',
  KO_KR: 'ko-KR',
  ES_ES: 'es-ES',
  FR_FR: 'fr-FR',
  DE_DE: 'de-DE',
} as const;

// 颜色主题
export const COLOR_PALETTE = {
  PRIMARY: '#1976d2',
  SECONDARY: '#dc004e',
  SUCCESS: '#4caf50',
  WARNING: '#ff9800',
  ERROR: '#f44336',
  INFO: '#2196f3',
  LIGHT: '#f5f5f5',
  DARK: '#212121',
} as const;

// 动画时长（毫秒）
export const ANIMATION_DURATION = {
  INSTANT: 0,
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
} as const;

// 键盘按键码
export const KEY_CODES = {
  ENTER: 13,
  ESC: 27,
  SPACE: 32,
  TAB: 9,
  ARROW_UP: 38,
  ARROW_DOWN: 40,
  ARROW_LEFT: 37,
  ARROW_RIGHT: 39,
  DELETE: 46,
  BACKSPACE: 8,
} as const;

// 默认导出
export default {
  API_CONSTANTS,
  HTTP_STATUS,
  TEST_TYPES,
  TEST_STATUS,
  TEST_RESULT,
  SEVERITY_LEVELS,
  SCORE_GRADES,
  USER_ROLES,
  PERMISSION_LEVELS,
  FILE_TYPES,
  FILE_SIZE_LIMITS,
  TIME_CONSTANTS,
  PAGINATION,
  VALIDATION,
  REGEX_PATTERNS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  BROWSER_TYPES,
  DEVICE_TYPES,
  OS_TYPES,
  THEME_TYPES,
  LANGUAGE_CODES,
  COLOR_PALETTE,
  ANIMATION_DURATION,
  KEY_CODES,
};
