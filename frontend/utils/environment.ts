
// 检查是否在浏览器环境中
export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// 检查是否在 Node.js 环境�?export const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

// 检查是否在 Electron 环境�?export const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type;

// 检查是否在桌面环境中运�?export const isDesktopEnvironment = () => {
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
export const isDevelopment = import.meta.env.MODE === 'development';

// 检查是否在生产环境�?export const isProduction = import.meta.env.MODE === 'production';

export const canUseDatabase = isNode || isElectron;

export const canUseFileSystem = isNode || isElectron;

export const canUsePlaywright = isElectron || (isNode && !isBrowser);

const isFeatureSupported = (feature: string): boolean => {
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

const getEnvironmentInfo = () => {
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
