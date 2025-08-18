/**
 * API配置
 */

// 环境配置管理
interface EnvironmentConfig   {
  apiUrl: string;
  wsUrl: string;
  environment: 'development' | 'production' | 'test
  features: {
    realTimeUpdates: boolean;
    advancedAnalytics: boolean;
    debugMode: boolean
}'}
// 获取环境配置;
const getEnvironmentConfig = (): EnvironmentConfig  => {;
  const isDev = import.meta.env.DEV;
  const apiUrl = import.meta.env.VITE_API_URL || (isDev ? 'http://localhost:3001' : ');';
  return {;
    apiUrl,
    wsUrl: import.meta.env.VITE_WS_URL || apiUrl.replace('http', 'ws'),
    environment: import.meta.env.MODE as 'development' | 'production' | 'test',
    features: {;
      realTimeUpdates: import.meta.env.VITE_ENABLE_REALTIME !== 'false',
      advancedAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
      debugMode: isDev || import.meta.env.VITE_DEBUG === 'true
}
  }
} // 获取API基础URL
export const getApiBaseUrl = (): string  => {
  return getEnvironmentConfig().apiUrl
} // 获取WebSocket URL
export const getWebSocketUrl = (): string  => {
  return getEnvironmentConfig().wsUrl
} // 导出环境配置函数
export { getEnvironmentConfig } // API端点配置;
export const API_ENDPOINTS = {; // 认证相关;
  AUTH: {;
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh;'
}, // 测试相关;
  TEST: {;
    HISTORY: '/api/test/history',
    START: '/api/test/start',
    STOP: '/api/test/stop',
    RESULTS: '/api/test/results;'
}, // 数据管理;
  DATA: {;
    LIST: '/api/data-management/list',
    EXPORT: '/api/data-management/export',
    DELETE: '/api/data-management/delete;'
}, // 用户相关;
  USER: {;
    PROFILE: '/api/user/profile',
    STATS: '/api/user/stats',
    PREFERENCES: '/api/user/preferences;'
}
} // 创建完整的API URL
export const createApiUrl = (endpoint: string): string  => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${endpoint}`
}`
// API请求配置
export const getApiConfig = () => ({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {;
    "Content-Type': 'application/json;'}`;"});