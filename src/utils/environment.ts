/**
 * 环境检测工具
 */

// 检查是否在浏览器环境中
export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// 检查是否在 Node.js 环境中
export const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

// 检查是否在 Electron 环境中
export const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type;

// 检查是否在桌面环境中运行
export const isDesktopEnvironment = () => {
  return !!(
    typeof window !== 'undefined' &&
    (
      (window as any).electronAPI ||
      (window as any).electron ||
      (window as any).__TAURI__ ||
      navigator.userAgent.includes('Electron') ||
      isElectron
    )
  );
};

// 检查是否在开发环境中
export const isDevelopment = process.env.NODE_ENV === 'development';

// 检查是否在生产环境中
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * 检查是否可以使用数据库功能
 * 只有在 Node.js 或 Electron 环境中才能使用数据库
 */
export const canUseDatabase = isNode || isElectron;

/**
 * 检查是否可以使用文件系统
 * 只有在 Node.js 或 Electron 环境中才能使用文件系统
 */
export const canUseFileSystem = isNode || isElectron;

/**
 * 检查是否可以使用 Playwright
 * 只有在桌面应用中才能使用 Playwright
 */
export const canUsePlaywright = isElectron || (isNode && !isBrowser);

/**
 * 检查是否支持特定功能
 */
export const isFeatureSupported = (feature: string): boolean => {
  switch (feature) {
    case 'playwright':
      return canUsePlaywright;
    case 'k6':
      return isDesktopEnvironment();
    case 'database':
      return canUseDatabase;
    case 'file-system':
      return canUseFileSystem;
    case 'admin-panel':
      return isBrowser && !isDesktopEnvironment();
    case 'remote-api':
      return isBrowser && !isDesktopEnvironment();
    default:
      return false;
  }
};

/**
 * 获取当前环境描述
 */
export const getEnvironmentInfo = () => {
  return {
    isBrowser,
    isNode,
    isElectron,
    isDevelopment,
    isProduction,
    canUseDatabase,
    canUseFileSystem,
    canUsePlaywright
  };
};
