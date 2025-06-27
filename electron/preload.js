const { contextBridge, ipcRenderer } = require('electron');

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // 文件系统操作
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),

  // 菜单事件监听
  onMenuAction: (callback) => {
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
      'menu-settings'
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
    // 这些方法将在后续实现
    init: () => ipcRenderer.invoke('db-init'),
    query: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
    backup: (path) => ipcRenderer.invoke('db-backup', path),
    restore: (path) => ipcRenderer.invoke('db-restore', path),
    export: (format, path) => ipcRenderer.invoke('db-export', format, path)
  },

  // 网络诊断（桌面版专用）
  network: {
    ping: (host) => ipcRenderer.invoke('network-ping', host),
    traceroute: (host) => ipcRenderer.invoke('network-traceroute', host),
    portScan: (host, ports) => ipcRenderer.invoke('network-port-scan', host, ports),
    dnsLookup: (domain) => ipcRenderer.invoke('network-dns-lookup', domain)
  },

  // 系统监控（桌面版专用）
  system: {
    getResourceUsage: () => ipcRenderer.invoke('system-resource-usage'),
    getNetworkInterfaces: () => ipcRenderer.invoke('system-network-interfaces'),
    getProcessList: () => ipcRenderer.invoke('system-process-list')
  },

  // 文件操作（桌面版专用）
  file: {
    readFile: (path) => ipcRenderer.invoke('file-read', path),
    writeFile: (path, data) => ipcRenderer.invoke('file-write', path, data),
    exists: (path) => ipcRenderer.invoke('file-exists', path),
    mkdir: (path) => ipcRenderer.invoke('file-mkdir', path),
    readdir: (path) => ipcRenderer.invoke('file-readdir', path)
  },

  // 测试引擎（桌面版增强）
  testEngine: {
    // Playwright集成
    runPlaywrightTest: (config) => ipcRenderer.invoke('test-playwright', config),
    
    // K6集成
    runK6Test: (script, config) => ipcRenderer.invoke('test-k6', script, config),
    
    // 本地数据库测试
    runDatabaseTest: (config) => ipcRenderer.invoke('test-database', config),
    
    // 系统级性能测试
    runSystemTest: (config) => ipcRenderer.invoke('test-system', config)
  },

  // 报告生成（桌面版专用）
  report: {
    generatePDF: (data, template) => ipcRenderer.invoke('report-generate-pdf', data, template),
    generateExcel: (data) => ipcRenderer.invoke('report-generate-excel', data),
    generateWord: (data, template) => ipcRenderer.invoke('report-generate-word', data, template),
    openReport: (path) => ipcRenderer.invoke('report-open', path)
  },

  // 配置管理（桌面版专用）
  config: {
    get: (key) => ipcRenderer.invoke('config-get', key),
    set: (key, value) => ipcRenderer.invoke('config-set', key, value),
    getAll: () => ipcRenderer.invoke('config-get-all'),
    reset: () => ipcRenderer.invoke('config-reset'),
    export: (path) => ipcRenderer.invoke('config-export', path),
    import: (path) => ipcRenderer.invoke('config-import', path)
  },

  // 更新检查（桌面版专用）
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater-check'),
    downloadUpdate: () => ipcRenderer.invoke('updater-download'),
    installUpdate: () => ipcRenderer.invoke('updater-install'),
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('update-available', callback);
      return () => ipcRenderer.removeListener('update-available', callback);
    },
    onUpdateDownloaded: (callback) => {
      ipcRenderer.on('update-downloaded', callback);
      return () => ipcRenderer.removeListener('update-downloaded', callback);
    }
  },

  // 通知系统（桌面版专用）
  notification: {
    show: (title, body, options) => ipcRenderer.invoke('notification-show', title, body, options),
    onAction: (callback) => {
      ipcRenderer.on('notification-action', callback);
      return () => ipcRenderer.removeListener('notification-action', callback);
    }
  },

  // 窗口控制
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    setTitle: (title) => ipcRenderer.invoke('window-set-title', title),
    setSize: (width, height) => ipcRenderer.invoke('window-set-size', width, height),
    center: () => ipcRenderer.invoke('window-center')
  }
});

// 环境标识
contextBridge.exposeInMainWorld('environment', {
  isElectron: true,
  isDesktop: true,
  isBrowser: false,
  platform: process.platform,
  arch: process.arch,
  nodeVersion: process.version,
  electronVersion: process.versions.electron
});

// 开发环境特殊处理
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('devTools', {
    openDevTools: () => ipcRenderer.invoke('dev-tools-open'),
    closeDevTools: () => ipcRenderer.invoke('dev-tools-close'),
    toggleDevTools: () => ipcRenderer.invoke('dev-tools-toggle'),
    reload: () => ipcRenderer.invoke('dev-reload'),
    forceReload: () => ipcRenderer.invoke('dev-force-reload')
  });
}
