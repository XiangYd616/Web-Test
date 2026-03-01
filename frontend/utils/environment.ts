/**
 * 统一的运行环境检测工具
 * 所有前端代码应通过此模块判断运行环境，避免检测逻辑不一致
 */

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
