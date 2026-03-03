/**
 * 统一的运行环境检测工具
 * 所有前端代码应通过此模块判断运行环境，避免检测逻辑不一致
 */

/** 生产环境默认云端 API 地址（与后端 SyncConfigStore.DEFAULT_SERVER_URL 保持一致） */
export const DEFAULT_CLOUD_API_URL =
  import.meta.env.VITE_API_URL || 'https://api.xiangweb.space/api';

/** 获取当前云端 API URL：localStorage > 环境变量 > 硬编码默认值 */
export const getCloudApiUrl = (): string => DEFAULT_CLOUD_API_URL;

/** 是否运行在 Electron 桌面环境中 */
export const isDesktop = (): boolean =>
  typeof window !== 'undefined' && Boolean(window.electronAPI);

/** 是否为本地模式（使用后端 JWT 认证） */
export const isLocalMode = (): boolean => true;

/** 是否有可用的本地测试引擎（Electron + testEngine 已注册） */
export const hasLocalTestEngine = (): boolean =>
  isDesktop() && Boolean(window.electronAPI?.testEngine);

/** 获取本地测试引擎实例，不可用时返回 null */
export const getLocalTestEngine = () => {
  if (!hasLocalTestEngine()) {
    return null;
  }
  return window.electronAPI?.testEngine ?? null;
};
