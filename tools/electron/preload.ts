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
  userInfo: unknown;
}

interface StressTestConfig {
  [key: string]: unknown;
}

interface TestConfig {
  [key: string]: unknown;
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
  onMenuAction: (callback: (event: string, ...args: unknown[]) => void): (() => void) => {
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
    init: (): Promise<unknown> => ipcRenderer.invoke('db-init'),
    query: (sql: string, params?: unknown[]): Promise<unknown> =>
      ipcRenderer.invoke('db-query', sql, params),
    transaction: (statements: Array<{ sql: string; params?: unknown[] }>): Promise<unknown> =>
      ipcRenderer.invoke('db-transaction', statements),
    backup: (path: string): Promise<unknown> => ipcRenderer.invoke('db-backup', path),
    restore: (path: string): Promise<unknown> => ipcRenderer.invoke('db-restore', path),
    export: (format: string, path: string): Promise<unknown> =>
      ipcRenderer.invoke('db-export', format, path),
    getStats: (): Promise<unknown> => ipcRenderer.invoke('db-stats'),
    listBackups: (): Promise<Array<{ name: string; path: string; size: number; date: string }>> =>
      ipcRenderer.invoke('db-list-backups'),
  },

  // 应用状态（本地/云端模式切换）
  appState: {
    get: (): Promise<unknown> => ipcRenderer.invoke('get-app-state'),
    setCloudAuth: (payload: {
      serverUrl: string;
      token: string;
      userId: string;
      username: string;
      email: string;
    }): Promise<unknown> => ipcRenderer.invoke('set-cloud-auth', payload),
    clearCloudAuth: (): Promise<unknown> => ipcRenderer.invoke('clear-cloud-auth'),
  },

  // 浏览器登录（Postman 风格）
  auth: {
    openBrowserLogin: (payload: {
      serverUrl: string;
      mode?: 'login' | 'register';
    }): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('auth:open-browser-login', payload),
    onCallbackResult: (
      callback: (result: {
        success: boolean;
        user?: { id: string; username: string; email: string };
        tokens?: { accessToken: string; refreshToken: string };
        serverUrl?: string;
        error?: string;
      }) => void
    ) => {
      const handler = (_event: Electron.IpcRendererEvent, result: Parameters<typeof callback>[0]) =>
        callback(result);
      ipcRenderer.on('auth:callback-result', handler);
      return () => ipcRenderer.removeListener('auth:callback-result', handler);
    },
  },

  // 网络诊断（桌面版专用）
  network: {
    ping: (host: string): Promise<unknown> => ipcRenderer.invoke('network-ping', host),
    traceroute: (host: string): Promise<unknown> => ipcRenderer.invoke('network-traceroute', host),
    portScan: (host: string, ports: number[]): Promise<unknown> =>
      ipcRenderer.invoke('network-port-scan', host, ports),
    dnsLookup: (domain: string): Promise<unknown> =>
      ipcRenderer.invoke('network-dns-lookup', domain),
  },

  // 系统监控（桌面版专用）
  system: {
    getResourceUsage: (): Promise<unknown> => ipcRenderer.invoke('system-resource-usage'),
    getNetworkInterfaces: (): Promise<NetworkInterfaces> =>
      ipcRenderer.invoke('system-network-interfaces'),
    getProcessList: (): Promise<ProcessInfo[]> => ipcRenderer.invoke('system-process-list'),
  },

  // 沙箱化存储操作（仅限 userData/downloads/temp 目录，主进程校验路径）
  storage: {
    readFile: (relativePath: string): Promise<string | Buffer> =>
      ipcRenderer.invoke('file-read', relativePath),
    writeFile: (relativePath: string, data: string | Buffer): Promise<void> =>
      ipcRenderer.invoke('file-write', relativePath, data),
    exists: (relativePath: string): Promise<boolean> =>
      ipcRenderer.invoke('file-exists', relativePath),
    mkdir: (relativePath: string): Promise<void> => ipcRenderer.invoke('file-mkdir', relativePath),
    readdir: (relativePath: string): Promise<string[]> =>
      ipcRenderer.invoke('file-readdir', relativePath),
  },

  // 测试引擎（桌面版）
  testEngine: {
    // 本地测试执行
    startLocalTest: (payload: {
      testType: string;
      url?: string;
      config?: TestConfig;
    }): Promise<unknown> => ipcRenderer.invoke('local-test-start', payload),
    getLocalTestHistory: (payload?: { page?: number; limit?: number }): Promise<unknown> =>
      ipcRenderer.invoke('local-test-history', payload),
    getLocalTestLogs: (payload: {
      testId: string;
      limit?: number;
      offset?: number;
      level?: string;
    }): Promise<unknown> => ipcRenderer.invoke('local-test-logs', payload),
    getLocalTestDetail: (payload: { testId: string }): Promise<unknown> =>
      ipcRenderer.invoke('local-test-detail', payload),
    getLocalTestStatus: (payload: { testId: string }): Promise<unknown> =>
      ipcRenderer.invoke('local-test-status', payload),
    getLocalTestProgress: (payload: { testId: string }): Promise<unknown> =>
      ipcRenderer.invoke('local-test-progress', payload),
    getLocalTestResult: (payload: { testId: string }): Promise<unknown> =>
      ipcRenderer.invoke('local-test-result', payload),
    updateLocalTest: (payload: { testId: string; tags?: string[] }): Promise<unknown> =>
      ipcRenderer.invoke('local-test-update', payload),
    deleteLocalTest: (payload: { testId: string }): Promise<unknown> =>
      ipcRenderer.invoke('local-test-delete', payload),
    cancelLocalTest: (payload: { testId: string }): Promise<unknown> =>
      ipcRenderer.invoke('local-test-cancel', payload),
    rerunLocalTest: (payload: { testId: string }): Promise<unknown> =>
      ipcRenderer.invoke('local-test-rerun', payload),

    // 监听主进程推送的测试事件（进度/日志/完成/失败）
    onTestEvent: (
      callback: (event: string, payload: Record<string, unknown>) => void
    ): (() => void) => {
      const events = ['test-progress', 'test-log', 'test-completed', 'test-error'] as const;
      const handlers = events.map(evt => {
        const handler = (_: unknown, data: Record<string, unknown>) => callback(evt, data);
        ipcRenderer.on(evt, handler as (...args: unknown[]) => void);
        return { evt, handler };
      });
      return () => {
        handlers.forEach(({ evt, handler }) => {
          ipcRenderer.removeListener(evt, handler as (...args: unknown[]) => void);
        });
      };
    },
  },

  // Puppeteer 浏览器引擎状态（桌面版核心能力）
  puppeteer: {
    getStatus: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('puppeteer-status'),
    reset: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('puppeteer-reset'),
  },

  // 定时测试调度器（桌面端观测中心）
  scheduler: {
    addTask: (task: Record<string, unknown>): Promise<{ success: boolean; task?: unknown }> =>
      ipcRenderer.invoke('scheduler-add-task', task),
    removeTask: (taskId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('scheduler-remove-task', taskId),
    toggleTask: (taskId: string, enabled: boolean): Promise<{ success: boolean; task?: unknown }> =>
      ipcRenderer.invoke('scheduler-toggle-task', taskId, enabled),
    listTasks: (): Promise<Array<Record<string, unknown>>> =>
      ipcRenderer.invoke('scheduler-list-tasks'),
    onTaskCompleted: (callback: (data: Record<string, unknown>) => void): (() => void) => {
      const handler = (_event: unknown, data: Record<string, unknown>) => callback(data);
      ipcRenderer.on('scheduled-test-completed', handler as (...args: unknown[]) => void);
      return () => {
        ipcRenderer.removeListener(
          'scheduled-test-completed',
          handler as (...args: unknown[]) => void
        );
      };
    },
  },

  // 报告生成（桌面版专用）
  report: {
    generatePDF: (data: unknown, template?: string): Promise<string> =>
      ipcRenderer.invoke('report-generate-pdf', data, template),
    generateExcel: (data: unknown): Promise<string> =>
      ipcRenderer.invoke('report-generate-excel', data),
    generateWord: (data: unknown, template?: string): Promise<string> =>
      ipcRenderer.invoke('report-generate-word', data, template),
    openReport: (path: string): Promise<void> => ipcRenderer.invoke('report-open', path),
  },

  // 配置管理（桌面版专用）
  config: {
    get: (key: string): Promise<unknown> => ipcRenderer.invoke('config-get', key),
    set: (key: string, value: unknown): Promise<void> =>
      ipcRenderer.invoke('config-set', key, value),
    getAll: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('config-get-all'),
    reset: (): Promise<void> => ipcRenderer.invoke('config-reset'),
    export: (path: string): Promise<void> => ipcRenderer.invoke('config-export', path),
    import: (path: string): Promise<void> => ipcRenderer.invoke('config-import', path),
  },

  // 更新检查（桌面版专用）
  updater: {
    checkForUpdates: (): Promise<unknown> => ipcRenderer.invoke('updater-check'),
    downloadUpdate: (): Promise<void> => ipcRenderer.invoke('updater-download'),
    installUpdate: (): Promise<void> => ipcRenderer.invoke('updater-install'),
    onUpdateAvailable: (callback: (info: unknown) => void): (() => void) => {
      const handler = (_event: unknown, info: unknown) => callback(info);
      ipcRenderer.on('update-available', handler as (...args: unknown[]) => void);
      return () =>
        ipcRenderer.removeListener('update-available', handler as (...args: unknown[]) => void);
    },
    onUpdateDownloaded: (callback: (info: unknown) => void): (() => void) => {
      const handler = (_event: unknown, info: unknown) => callback(info);
      ipcRenderer.on('update-downloaded', handler as (...args: unknown[]) => void);
      return () =>
        ipcRenderer.removeListener('update-downloaded', handler as (...args: unknown[]) => void);
    },
  },

  // 通知系统（桌面版专用）
  notification: {
    show: (title: string, body: string, options?: unknown): Promise<void> =>
      ipcRenderer.invoke('notification-show', title, body, options),
    onAction: (callback: (action: unknown) => void): (() => void) => {
      const handler = (_event: unknown, action: unknown) => callback(action);
      ipcRenderer.on('notification-action', handler as (...args: unknown[]) => void);
      return () =>
        ipcRenderer.removeListener('notification-action', handler as (...args: unknown[]) => void);
    },
  },

  // 云端同步（桌面端双向同步）
  sync: {
    triggerSync: (): Promise<{
      success: boolean;
      pulled?: number;
      pushed?: number;
      conflicts?: number;
      error?: string;
    }> => ipcRenderer.invoke('sync-trigger'),
    getStatus: (): Promise<{
      status: string;
      lastSyncAt?: string;
      pendingChanges?: number;
      pendingConflicts?: number;
    }> => ipcRenderer.invoke('sync-status'),
    setConfig: (config: {
      serverUrl?: string;
      intervalMs?: number;
      enabled?: boolean;
    }): Promise<void> => ipcRenderer.invoke('sync-set-config', config),
    getConfig: (): Promise<{
      serverUrl: string;
      intervalMs: number;
      enabled: boolean;
      deviceId: string;
    }> => ipcRenderer.invoke('sync-get-config'),
    resolveConflict: (
      conflictId: string,
      resolution: 'local' | 'remote'
    ): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('sync-resolve-conflict', conflictId, resolution),
    getConflicts: (): Promise<Array<Record<string, unknown>>> =>
      ipcRenderer.invoke('sync-get-conflicts'),
    getLogs: (limit?: number): Promise<Array<Record<string, unknown>>> =>
      ipcRenderer.invoke('sync-get-logs', limit),
    onStatusChange: (
      callback: (status: { status: string; detail?: string }) => void
    ): (() => void) => {
      const handler = (_event: unknown, data: { status: string; detail?: string }) =>
        callback(data);
      ipcRenderer.on('sync-status-changed', handler as (...args: unknown[]) => void);
      return () => {
        ipcRenderer.removeListener('sync-status-changed', handler as (...args: unknown[]) => void);
      };
    },
  },

  // 窗口控制（原生融合：自定义标题栏需要）
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window-minimize'),
    maximize: (): Promise<void> => ipcRenderer.invoke('window-maximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window-close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window-is-maximized'),
    onMaximizedChange: (callback: (maximized: boolean) => void): (() => void) => {
      const handler = (_event: unknown, maximized: boolean) => callback(maximized);
      ipcRenderer.on('window-maximized-changed', handler as (...args: unknown[]) => void);
      return () => {
        ipcRenderer.removeListener(
          'window-maximized-changed',
          handler as (...args: unknown[]) => void
        );
      };
    },
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
    getStatus: (): Promise<unknown> => ipcRenderer.invoke('stress-test-status'),
    getSystemUsage: (): Promise<unknown> => ipcRenderer.invoke('stress-test-system-usage'),

    // 事件监听
    onTestStarted: (callback: (data: unknown) => void): (() => void) => {
      const handler = (_event: unknown, data: unknown) => callback(data);
      ipcRenderer.on('stress-test-started', handler as (...args: unknown[]) => void);
      return () =>
        ipcRenderer.removeListener('stress-test-started', handler as (...args: unknown[]) => void);
    },
    onTestUpdate: (callback: (data: unknown) => void): (() => void) => {
      const handler = (_event: unknown, data: unknown) => callback(data);
      ipcRenderer.on('stress-test-update', handler as (...args: unknown[]) => void);
      return () =>
        ipcRenderer.removeListener('stress-test-update', handler as (...args: unknown[]) => void);
    },
    onTestCompleted: (callback: (data: unknown) => void): (() => void) => {
      const handler = (_event: unknown, data: unknown) => callback(data);
      ipcRenderer.on('stress-test-completed', handler as (...args: unknown[]) => void);
      return () =>
        ipcRenderer.removeListener(
          'stress-test-completed',
          handler as (...args: unknown[]) => void
        );
    },
    onTestError: (callback: (data: unknown) => void): (() => void) => {
      const handler = (_event: unknown, data: unknown) => callback(data);
      ipcRenderer.on('stress-test-error', handler as (...args: unknown[]) => void);
      return () =>
        ipcRenderer.removeListener('stress-test-error', handler as (...args: unknown[]) => void);
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
      onMenuAction: (callback: (event: string, ...args: unknown[]) => void) => () => void;
      isDesktop: boolean;
      platform: string;
      database: {
        init: () => Promise<unknown>;
        query: (sql: string, params?: unknown[]) => Promise<unknown>;
        transaction: (statements: Array<{ sql: string; params?: unknown[] }>) => Promise<unknown>;
        backup: (path: string) => Promise<unknown>;
        restore: (path: string) => Promise<unknown>;
        export: (format: string, path: string) => Promise<unknown>;
        getStats: () => Promise<unknown>;
        listBackups: () => Promise<
          Array<{ name: string; path: string; size: number; date: string }>
        >;
      };
      network: {
        ping: (host: string) => Promise<unknown>;
        traceroute: (host: string) => Promise<unknown>;
        portScan: (host: string, ports: number[]) => Promise<unknown>;
        dnsLookup: (domain: string) => Promise<unknown>;
      };
      system: {
        getResourceUsage: () => Promise<unknown>;
        getNetworkInterfaces: () => Promise<NetworkInterfaces>;
        getProcessList: () => Promise<ProcessInfo[]>;
      };
      storage: {
        readFile: (relativePath: string) => Promise<string | Buffer>;
        writeFile: (relativePath: string, data: string | Buffer) => Promise<void>;
        exists: (relativePath: string) => Promise<boolean>;
        mkdir: (relativePath: string) => Promise<void>;
        readdir: (relativePath: string) => Promise<string[]>;
      };
      testEngine: {
        startLocalTest: (payload: {
          testType: string;
          url?: string;
          config?: TestConfig;
        }) => Promise<unknown>;
        getLocalTestHistory: (payload?: {
          page?: number;
          limit?: number;
          testType?: string;
          keyword?: string;
        }) => Promise<unknown>;
        getLocalTestLogs: (payload: {
          testId: string;
          limit?: number;
          offset?: number;
          level?: string;
        }) => Promise<unknown>;
        getLocalTestDetail: (payload: { testId: string }) => Promise<Record<string, unknown>>;
        getLocalTestStatus: (payload: { testId: string }) => Promise<Record<string, unknown>>;
        getLocalTestProgress: (payload: { testId: string }) => Promise<Record<string, unknown>>;
        getLocalTestResult: (payload: { testId: string }) => Promise<Record<string, unknown>>;
        updateLocalTest: (payload: { testId: string; tags?: string[] }) => Promise<unknown>;
        deleteLocalTest: (payload: { testId: string }) => Promise<unknown>;
        cancelLocalTest: (payload: { testId: string }) => Promise<unknown>;
        rerunLocalTest: (payload: { testId: string }) => Promise<Record<string, unknown>>;
      };
      puppeteer: {
        getStatus: () => Promise<Record<string, unknown>>;
        reset: () => Promise<{ success: boolean; error?: string }>;
      };
      appState: {
        get: () => Promise<unknown>;
        setCloudAuth: (payload: {
          serverUrl: string;
          token: string;
          userId: string;
          username: string;
          email: string;
        }) => Promise<unknown>;
        clearCloudAuth: () => Promise<unknown>;
      };
      auth: {
        openBrowserLogin: (payload: {
          serverUrl: string;
          mode?: 'login' | 'register';
        }) => Promise<{ success: boolean; error?: string }>;
        onCallbackResult: (
          callback: (result: {
            success: boolean;
            user?: { id: string; username: string; email: string };
            tokens?: { accessToken: string; refreshToken: string };
            serverUrl?: string;
            error?: string;
          }) => void
        ) => () => void;
      };
      scheduler: {
        addTask: (task: Record<string, unknown>) => Promise<{ success: boolean; task?: unknown }>;
        removeTask: (taskId: string) => Promise<{ success: boolean }>;
        toggleTask: (
          taskId: string,
          enabled: boolean
        ) => Promise<{ success: boolean; task?: unknown }>;
        listTasks: () => Promise<Array<Record<string, unknown>>>;
        onTaskCompleted: (callback: (data: Record<string, unknown>) => void) => () => void;
      };
      report: {
        generatePDF: (data: unknown, template?: string) => Promise<string>;
        generateExcel: (data: unknown) => Promise<string>;
        generateWord: (data: unknown, template?: string) => Promise<string>;
        openReport: (path: string) => Promise<void>;
      };
      config: {
        get: (key: string) => Promise<unknown>;
        set: (key: string, value: unknown) => Promise<void>;
        getAll: () => Promise<Record<string, unknown>>;
        reset: () => Promise<void>;
        export: (path: string) => Promise<void>;
        import: (path: string) => Promise<void>;
      };
      updater: {
        checkForUpdates: () => Promise<unknown>;
        downloadUpdate: () => Promise<void>;
        installUpdate: () => Promise<void>;
        onUpdateAvailable: (callback: (info: unknown) => void) => () => void;
        onUpdateDownloaded: (callback: (info: unknown) => void) => () => void;
      };
      notification: {
        show: (title: string, body: string, options?: unknown) => Promise<void>;
        onAction: (callback: (action: unknown) => void) => () => void;
      };
      sync: {
        triggerSync: () => Promise<{
          success: boolean;
          pulled?: number;
          pushed?: number;
          conflicts?: number;
          error?: string;
        }>;
        getStatus: () => Promise<{
          status: string;
          lastSyncAt?: string;
          pendingChanges?: number;
          pendingConflicts?: number;
        }>;
        setConfig: (config: {
          serverUrl?: string;
          intervalMs?: number;
          enabled?: boolean;
        }) => Promise<void>;
        getConfig: () => Promise<{
          serverUrl: string;
          intervalMs: number;
          enabled: boolean;
          deviceId: string;
        }>;
        resolveConflict: (
          conflictId: string,
          resolution: 'local' | 'remote'
        ) => Promise<{ success: boolean }>;
        getConflicts: () => Promise<Array<Record<string, unknown>>>;
        onStatusChange: (
          callback: (status: { status: string; detail?: string }) => void
        ) => () => void;
      };
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
        onMaximizedChange: (callback: (maximized: boolean) => void) => () => void;
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
        getStatus: () => Promise<unknown>;
        getSystemUsage: () => Promise<unknown>;
        onTestStarted: (callback: (data: unknown) => void) => () => void;
        onTestUpdate: (callback: (data: unknown) => void) => () => void;
        onTestCompleted: (callback: (data: unknown) => void) => () => void;
        onTestError: (callback: (data: unknown) => void) => () => void;
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
