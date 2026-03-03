export {};

declare global {
  interface Window {
    electronAPI?: {
      isDesktop: boolean;
      platform: string;

      getAppVersion: () => Promise<string>;
      getSystemInfo: () => Promise<Record<string, unknown>>;
      showSaveDialog: (
        options: Record<string, unknown>
      ) => Promise<{ canceled: boolean; filePath?: string }>;
      showOpenDialog: (
        options: Record<string, unknown>
      ) => Promise<{ canceled: boolean; filePaths: string[] }>;
      showMessageBox: (options: Record<string, unknown>) => Promise<{ response: number }>;
      onMenuAction: (callback: (event: string, ...args: unknown[]) => void) => () => void;

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

      storage: {
        readFile: (relativePath: string) => Promise<string | ArrayBuffer>;
        writeFile: (relativePath: string, data: string | ArrayBuffer) => Promise<void>;
        exists: (relativePath: string) => Promise<boolean>;
        mkdir: (relativePath: string) => Promise<void>;
        readdir: (relativePath: string) => Promise<string[]>;
      };

      system: {
        getResourceUsage: () => Promise<Record<string, unknown>>;
        getNetworkInterfaces: () => Promise<Record<string, unknown>>;
        getProcessList: () => Promise<Array<Record<string, unknown>>>;
      };

      network: {
        ping: (host: string) => Promise<Record<string, unknown>>;
        traceroute: (host: string) => Promise<Record<string, unknown>>;
        portScan: (host: string, ports: number[]) => Promise<Record<string, unknown>>;
        dnsLookup: (domain: string) => Promise<Record<string, unknown>>;
      };

      config: {
        get: (key: string) => Promise<unknown>;
        set: (key: string, value: unknown) => Promise<void>;
        getAll: () => Promise<Record<string, unknown>>;
        reset: () => Promise<void>;
        export: (path: string) => Promise<void>;
        import: (path: string) => Promise<void>;
      };

      report: {
        generatePDF: (data: unknown, template?: string) => Promise<string>;
        generateExcel: (data: unknown) => Promise<string>;
        generateWord: (data: unknown, template?: string) => Promise<string>;
        openReport: (path: string) => Promise<void>;
      };

      notification: {
        show: (title: string, body: string, options?: unknown) => Promise<void>;
        onAction: (callback: (action: unknown) => void) => () => void;
      };

      updater: {
        checkForUpdates: () => Promise<unknown>;
        downloadUpdate: () => Promise<void>;
        installUpdate: () => Promise<void>;
        onUpdateAvailable: (callback: (info: unknown) => void) => () => void;
        onUpdateDownloaded: (callback: (info: unknown) => void) => () => void;
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

      scheduler?: {
        addTask: (task: Record<string, unknown>) => Promise<{ success: boolean; task?: unknown }>;
        removeTask: (taskId: string) => Promise<{ success: boolean }>;
        toggleTask: (
          taskId: string,
          enabled: boolean
        ) => Promise<{ success: boolean; task?: unknown }>;
        listTasks: () => Promise<Array<Record<string, unknown>>>;
        onTaskCompleted: (callback: (data: Record<string, unknown>) => void) => () => void;
      };

      appState?: {
        get: () => Promise<{
          auth_mode: 'local' | 'cloud';
          active_user_id: string;
          active_workspace_id: string;
          cloud_server_url: string;
          cloud_token: string;
          cloud_user_id: string;
          cloud_username: string;
          cloud_email: string;
        } | null>;
        setCloudAuth: (payload: {
          serverUrl: string;
          token: string;
          refreshToken?: string;
          userId: string;
          username: string;
          email: string;
        }) => Promise<{ success: boolean }>;
        clearCloudAuth: () => Promise<{ success: boolean }>;
      };

      puppeteer?: {
        getStatus: () => Promise<Record<string, unknown>>;
        reset: () => Promise<{ success: boolean; error?: string }>;
      };

      auth?: {
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

      sync?: {
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
        getLogs: (limit?: number) => Promise<Array<Record<string, unknown>>>;
        onStatusChange: (
          callback: (status: { status: string; detail?: string }) => void
        ) => () => void;
      };

      testEngine?: {
        startLocalTest: (payload: {
          testType: string;
          url?: string;
          config?: Record<string, unknown>;
        }) => Promise<{ testId?: string; id?: string; status?: string }>;
        getLocalTestHistory: (payload?: {
          page?: number;
          limit?: number;
          testType?: string;
          keyword?: string;
        }) => Promise<{
          tests?: Array<Record<string, unknown>>;
          pagination?: Record<string, unknown>;
        }>;
        getLocalTestLogs: (payload: {
          testId: string;
          limit?: number;
          offset?: number;
          level?: string;
        }) => Promise<{ logs?: Array<Record<string, unknown>> }>;
        getLocalTestDetail: (payload: { testId: string }) => Promise<Record<string, unknown>>;
        getLocalTestStatus: (payload: { testId: string }) => Promise<Record<string, unknown>>;
        getLocalTestProgress: (payload: { testId: string }) => Promise<Record<string, unknown>>;
        getLocalTestResult: (payload: { testId: string }) => Promise<Record<string, unknown>>;
        updateLocalTest: (payload: { testId: string; tags?: string[] }) => Promise<unknown>;
        deleteLocalTest: (payload: { testId: string }) => Promise<unknown>;
        cancelLocalTest: (payload: { testId: string }) => Promise<unknown>;
        rerunLocalTest: (payload: { testId: string }) => Promise<Record<string, unknown>>;
        onTestEvent?: (
          callback: (event: string, payload: Record<string, unknown>) => void
        ) => () => void;
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
      localStressTest: {
        start: (
          config: Record<string, unknown>
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
  }
}
