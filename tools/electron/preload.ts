import { contextBridge, ipcRenderer } from 'electron';

// 类型定义
interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  title?: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  electronVersion: string;
  chromeVersion: string;
  totalMemory: number;
  freeMemory: number;
  cpus: number;
  hostname: string;
  userInfo: any;
}

interface StressTestConfig {
  [key: string]: any;
}

interface TestConfig {
  [key: string]: any;
}

interface NetworkInterfaces {
  [key: string]: Array<{
    address: string;
    netmask: string;
    family: string;
    mac: string;
    internal: boolean;
  }>;
}

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
}

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  getSystemInfo: (): Promise<SystemInfo> => ipcRenderer.invoke('get-system-info'),

  // 文件系统操作
  showSaveDialog: (options: SaveDialogOptions): Promise<{ canceled: boolean; filePath?: string }> =>
    ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (
    options: OpenDialogOptions
  ): Promise<{ canceled: boolean; filePaths: string[] }> =>
    ipcRenderer.invoke('show-open-dialog', options),
  showMessageBox: (
    options: MessageBoxOptions
  ): Promise<{ response: number; checkboxChecked?: boolean }> =>
    ipcRenderer.invoke('show-message-box', options),

  // 菜单事件监听
  onMenuAction: (callback: (event: string, ...args: any[]) => void): (() => void) => {
    const menuEvents = [
      'menu-new-test',
      'menu-open-history',
      'menu-export-report',
      'menu-stress-test',
      'menu-compatibility-test',
      'menu-security-test',
      'menu-api-test',
      'menu-database-manager',
      'menu-network-diagnostic',
      'menu-system-info',
      'menu-settings',
    ];

    menuEvents.forEach(event => {
      ipcRenderer.on(event, (_, ...args) => callback(event, ...args));
    });

    // 返回清理函数
    return () => {
      menuEvents.forEach(event => {
        ipcRenderer.removeAllListeners(event);
      });
    };
  },

  // 桌面特有功能标识
  isDesktop: true,
  platform: process.platform,

  // 数据库操作（桌面版专用）
  database: {
    init: (): Promise<any> => ipcRenderer.invoke('db-init'),
    query: (sql: string, params?: any[]): Promise<any> =>
      ipcRenderer.invoke('db-query', sql, params),
    backup: (path: string): Promise<any> => ipcRenderer.invoke('db-backup', path),
    restore: (path: string): Promise<any> => ipcRenderer.invoke('db-restore', path),
    export: (format: string, path: string): Promise<any> =>
      ipcRenderer.invoke('db-export', format, path),
    getStats: (): Promise<any> => ipcRenderer.invoke('db-stats'),
  },

  // 网络诊断（桌面版专用）
  network: {
    ping: (host: string): Promise<any> => ipcRenderer.invoke('network-ping', host),
    traceroute: (host: string): Promise<any> => ipcRenderer.invoke('network-traceroute', host),
    portScan: (host: string, ports: number[]): Promise<any> =>
      ipcRenderer.invoke('network-port-scan', host, ports),
    dnsLookup: (domain: string): Promise<any> => ipcRenderer.invoke('network-dns-lookup', domain),
  },

  // 系统监控（桌面版专用）
  system: {
    getResourceUsage: (): Promise<any> => ipcRenderer.invoke('system-resource-usage'),
    getNetworkInterfaces: (): Promise<NetworkInterfaces> =>
      ipcRenderer.invoke('system-network-interfaces'),
    getProcessList: (): Promise<ProcessInfo[]> => ipcRenderer.invoke('system-process-list'),
  },

  // 文件操作（桌面版专用）
  file: {
    readFile: (path: string): Promise<string | Buffer> => ipcRenderer.invoke('file-read', path),
    writeFile: (path: string, data: string | Buffer): Promise<void> =>
      ipcRenderer.invoke('file-write', path, data),
    exists: (path: string): Promise<boolean> => ipcRenderer.invoke('file-exists', path),
    mkdir: (path: string): Promise<void> => ipcRenderer.invoke('file-mkdir', path),
    readdir: (path: string): Promise<string[]> => ipcRenderer.invoke('file-readdir', path),
  },

  // 测试引擎（桌面版增强）
  testEngine: {
    // Playwright集成
    runPlaywrightTest: (config: TestConfig): Promise<any> =>
      ipcRenderer.invoke('test-playwright', config),

    // K6集成
    runK6Test: (script: string, config: TestConfig): Promise<any> =>
      ipcRenderer.invoke('test-k6', script, config),

    // 本地数据库测试
    runDatabaseTest: (config: TestConfig): Promise<any> =>
      ipcRenderer.invoke('test-database', config),

    // 系统级性能测试
    runSystemTest: (config: TestConfig): Promise<any> => ipcRenderer.invoke('test-system', config),
  },

  // 报告生成（桌面版专用）
  report: {
    generatePDF: (data: any, template?: string): Promise<string> =>
      ipcRenderer.invoke('report-generate-pdf', data, template),
    generateExcel: (data: any): Promise<string> =>
      ipcRenderer.invoke('report-generate-excel', data),
    generateWord: (data: any, template?: string): Promise<string> =>
      ipcRenderer.invoke('report-generate-word', data, template),
    openReport: (path: string): Promise<void> => ipcRenderer.invoke('report-open', path),
  },

  // 配置管理（桌面版专用）
  config: {
    get: (key: string): Promise<any> => ipcRenderer.invoke('config-get', key),
    set: (key: string, value: any): Promise<void> => ipcRenderer.invoke('config-set', key, value),
    getAll: (): Promise<Record<string, any>> => ipcRenderer.invoke('config-get-all'),
    reset: (): Promise<void> => ipcRenderer.invoke('config-reset'),
    export: (path: string): Promise<void> => ipcRenderer.invoke('config-export', path),
    import: (path: string): Promise<void> => ipcRenderer.invoke('config-import', path),
  },

  // 更新检查（桌面版专用）
  updater: {
    checkForUpdates: (): Promise<any> => ipcRenderer.invoke('updater-check'),
    downloadUpdate: (): Promise<void> => ipcRenderer.invoke('updater-download'),
    installUpdate: (): Promise<void> => ipcRenderer.invoke('updater-install'),
    onUpdateAvailable: (callback: (info: any) => void): (() => void) => {
      ipcRenderer.on('update-available', (_, info) => callback(info));
      return () => ipcRenderer.removeListener('update-available', callback);
    },
    onUpdateDownloaded: (callback: (info: any) => void): (() => void) => {
      ipcRenderer.on('update-downloaded', (_, info) => callback(info));
      return () => ipcRenderer.removeListener('update-downloaded', callback);
    },
  },

  // 通知系统（桌面版专用）
  notification: {
    show: (title: string, body: string, options?: any): Promise<void> =>
      ipcRenderer.invoke('notification-show', title, body, options),
    onAction: (callback: (action: any) => void): (() => void) => {
      ipcRenderer.on('notification-action', (_, action) => callback(action));
      return () => ipcRenderer.removeListener('notification-action', callback);
    },
  },

  // 窗口控制
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window-minimize'),
    maximize: (): Promise<void> => ipcRenderer.invoke('window-maximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window-close'),
    setTitle: (title: string): Promise<void> => ipcRenderer.invoke('window-set-title', title),
    setSize: (width: number, height: number): Promise<void> =>
      ipcRenderer.invoke('window-set-size', width, height),
    center: (): Promise<void> => ipcRenderer.invoke('window-center'),
  },
});

// 环境标识
contextBridge.exposeInMainWorld('environment', {
  isElectron: true,
  isDesktop: true,
  isBrowser: false,
  platform: process.platform,
  arch: process.arch,
  nodeVersion: process.version,
  electronVersion: process.versions.electron,

  // 本地压力测试API（桌面版专用）
  localStressTest: {
    start: (
      config: StressTestConfig
    ): Promise<{ success: boolean; testId?: string; error?: string }> =>
      ipcRenderer.invoke('stress-test-start', config),
    stop: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('stress-test-stop'),
    getStatus: (): Promise<any> => ipcRenderer.invoke('stress-test-status'),
    getSystemUsage: (): Promise<any> => ipcRenderer.invoke('stress-test-system-usage'),

    // 事件监听
    onTestStarted: (callback: (data: any) => void): (() => void) => {
      ipcRenderer.on('stress-test-started', (_, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('stress-test-started');
    },
    onTestUpdate: (callback: (data: any) => void): (() => void) => {
      ipcRenderer.on('stress-test-update', (_, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('stress-test-update');
    },
    onTestCompleted: (callback: (data: any) => void): (() => void) => {
      ipcRenderer.on('stress-test-completed', (_, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('stress-test-completed');
    },
    onTestError: (callback: (data: any) => void): (() => void) => {
      ipcRenderer.on('stress-test-error', (_, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('stress-test-error');
    },
  },
});

// 开发环境特殊处理
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('devTools', {
    openDevTools: (): Promise<void> => ipcRenderer.invoke('dev-tools-open'),
    closeDevTools: (): Promise<void> => ipcRenderer.invoke('dev-tools-close'),
    toggleDevTools: (): Promise<void> => ipcRenderer.invoke('dev-tools-toggle'),
    reload: (): Promise<void> => ipcRenderer.invoke('dev-reload'),
    forceReload: (): Promise<void> => ipcRenderer.invoke('dev-force-reload'),
  });
}

// 全局类型声明
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getSystemInfo: () => Promise<SystemInfo>;
      showSaveDialog: (
        options: SaveDialogOptions
      ) => Promise<{ canceled: boolean; filePath?: string }>;
      showOpenDialog: (
        options: OpenDialogOptions
      ) => Promise<{ canceled: boolean; filePaths: string[] }>;
      showMessageBox: (
        options: MessageBoxOptions
      ) => Promise<{ response: number; checkboxChecked?: boolean }>;
      onMenuAction: (callback: (event: string, ...args: any[]) => void) => () => void;
      isDesktop: boolean;
      platform: string;
      database: {
        init: () => Promise<any>;
        query: (sql: string, params?: any[]) => Promise<any>;
        backup: (path: string) => Promise<any>;
        restore: (path: string) => Promise<any>;
        export: (format: string, path: string) => Promise<any>;
        getStats: () => Promise<any>;
      };
      network: {
        ping: (host: string) => Promise<any>;
        traceroute: (host: string) => Promise<any>;
        portScan: (host: string, ports: number[]) => Promise<any>;
        dnsLookup: (domain: string) => Promise<any>;
      };
      system: {
        getResourceUsage: () => Promise<any>;
        getNetworkInterfaces: () => Promise<NetworkInterfaces>;
        getProcessList: () => Promise<ProcessInfo[]>;
      };
      file: {
        readFile: (path: string) => Promise<string | Buffer>;
        writeFile: (path: string, data: string | Buffer) => Promise<void>;
        exists: (path: string) => Promise<boolean>;
        mkdir: (path: string) => Promise<void>;
        readdir: (path: string) => Promise<string[]>;
      };
      testEngine: {
        runPlaywrightTest: (config: TestConfig) => Promise<any>;
        runK6Test: (script: string, config: TestConfig) => Promise<any>;
        runDatabaseTest: (config: TestConfig) => Promise<any>;
        runSystemTest: (config: TestConfig) => Promise<any>;
      };
      report: {
        generatePDF: (data: any, template?: string) => Promise<string>;
        generateExcel: (data: any) => Promise<string>;
        generateWord: (data: any, template?: string) => Promise<string>;
        openReport: (path: string) => Promise<void>;
      };
      config: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
        getAll: () => Promise<Record<string, any>>;
        reset: () => Promise<void>;
        export: (path: string) => Promise<void>;
        import: (path: string) => Promise<void>;
      };
      updater: {
        checkForUpdates: () => Promise<any>;
        downloadUpdate: () => Promise<void>;
        installUpdate: () => Promise<void>;
        onUpdateAvailable: (callback: (info: any) => void) => () => void;
        onUpdateDownloaded: (callback: (info: any) => void) => () => void;
      };
      notification: {
        show: (title: string, body: string, options?: any) => Promise<void>;
        onAction: (callback: (action: any) => void) => () => void;
      };
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
        setTitle: (title: string) => Promise<void>;
        setSize: (width: number, height: number) => Promise<void>;
        center: () => Promise<void>;
      };
    };
    environment: {
      isElectron: boolean;
      isDesktop: boolean;
      isBrowser: boolean;
      platform: string;
      arch: string;
      nodeVersion: string;
      electronVersion: string;
      localStressTest: {
        start: (
          config: StressTestConfig
        ) => Promise<{ success: boolean; testId?: string; error?: string }>;
        stop: () => Promise<{ success: boolean; error?: string }>;
        getStatus: () => Promise<any>;
        getSystemUsage: () => Promise<any>;
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

export {};
