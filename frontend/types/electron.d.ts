// Electron API类型声明
declare global {
  interface Window   {
    electronAPI?: {
      // 应用信息
      getAppVersion: () => Promise<string>;
      getSystemInfo: () => Promise<any>;

      // 文件系统操作
      showSaveDialog: (options: any) => Promise<any>;
      showOpenDialog: (options: any) => Promise<any>;
      showMessageBox: (options: any) => Promise<any>;

      // 菜单事件监听
      onMenuAction: (callback: (event: string, ...args: any[]) => void) => () => void;

      // 桌面特有功能标识
      isDesktop: boolean;
      platform: string;

      // 数据库操作（桌面版专用）
      database: {
        init: () => Promise<any>;
        query: (sql: string, params?: any[]) => Promise<any>;
        backup: (backupPath: string) => Promise<any>;
        restore: (backupPath: string) => Promise<any>;
        export: (format: string, exportPath: string) => Promise<any>;
        getStats: () => Promise<any>;
      };
    };

    environment?: {
      isElectron: boolean;
      isDesktop: boolean;
      isBrowser: boolean;
      platform: string;
      arch: string;
      nodeVersion: string;
      electronVersion: string;

      // 本地压力测试API（桌面版专用）
      localStressTest?: {
        start: (config: LocalStressTestConfig) => Promise<{ success: boolean; testId?: string; error?: string }>;
        stop: () => Promise<{ success: boolean; error?: string }>;
        getStatus: () => Promise<LocalStressTestResults>;
        getSystemUsage: () => Promise<SystemUsage>;

        // 事件监听
        onTestStarted: (callback: (data: any) => void) => () => void;
        onTestUpdate: (callback: (data: any) => void) => () => void;
        onTestCompleted: (callback: (data: any) => void) => () => void;
        onTestError: (callback: (data: any) => void) => () => void;
      };
    };

    devTools?: {
      openDevTools: () => Promise<void>;
      closeDevTools: () => Promise<void>;
      toggleDevTools: () => Promise<void>;
      reload: () => Promise<void>;
      forceReload: () => Promise<void>;
    };
  }
}

// 本地压力测试配置接口
interface LocalStressTestConfig   {
  url: string;
  users: number;
  duration: number;
  testType: 'load' | 'stress' | 'spike' | 'volume';
  rampUp?: number;
  thinkTime?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

// 本地压力测试结果接口
interface LocalStressTestResults   {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  responseTimes: number[];
  errors: any[];
  startTime: number | null;
  endTime: number | null;
  throughput: number;
  successRate: number;
  errorRate: number;
  duration: number;
  isRunning: boolean;
  systemInfo: any;
}

// 系统使用情况接口
interface SystemUsage   {
  memory: {
    used: number;
    total: number;
    external: number;
    percentage: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  workers: number;
  uptime: number;
}

export {};
