import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import { join } from 'path';
import { isDev, logger } from './utils';
import { StressTestEngine, ContentTestEngine, CompatibilityTestEngine, TestConfig, TestResult } from './types';

// 简化的数据库服务模拟
const databaseService = {
  async initialize() {
    logger.info('Database service initialized (mock)');
  },
  async disconnect() {
    logger.info('Database service disconnected (mock)');
  },
  async saveTestResult(testResult: TestResult) {
    const id = Date.now().toString();
    logger.info('Test result saved (mock):', { id, testResult });
    return id;
  },
  async updateTestResult(id: string, updates: Partial<TestResult>) {
    logger.info('Test result updated (mock):', { id, updates });
  },
  async getTestResults(filters?: any): Promise<any[]> {
    logger.info('Get test results (mock):', filters);
    return [];
  },
  async getTestResult(id: string): Promise<any | null> {
    logger.info('Get test result (mock):', id);
    return null;
  },
  async deleteTestResult(id: string) {
    logger.info('Delete test result (mock):', id);
  },
  async getSetting(key: string): Promise<any | null> {
    logger.info('Get setting (mock):', key);
    return null;
  },
  async setSetting(key: string, value: any, type?: string) {
    logger.info('Set setting (mock):', { key, value, type });
  },
  async getTestStats() {
    logger.info('Get test stats (mock)');
    return {
      total: 0,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      successRate: 0
    };
  }
};

// 禁用安全警告
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // enableRemoteModule 在新版本中已被移除
      webSecurity: false, // 开发环境下禁用web安全
    },
  });

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    // 开发环境下打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 处理窗口关闭
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// 应用准备就绪时创建窗口
app.whenReady().then(async () => {
  // 初始化数据库
  try {
    await databaseService.initialize();
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
  }

  createWindow();

  // macOS 特定行为
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // 设置应用菜单
  if (process.platform === 'darwin') {
    const template = [
      {
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [{ role: 'minimize' }, { role: 'close' }],
      },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template as any));
  } else {
    Menu.setApplicationMenu(null);
  }
});

// 所有窗口关闭时退出应用 (除了 macOS)
app.on('window-all-closed', async () => {
  // 关闭数据库连接
  try {
    await databaseService.disconnect();
  } catch (error) {
    logger.error('Failed to close database:', error);
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', async () => {
  try {
    await databaseService.disconnect();
  } catch (error) {
    logger.error('Failed to close database:', error);
  }
});

// IPC 处理程序
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

// 测试引擎实例
let currentStressTest: StressTestEngine | null = null;
let currentContentTest: ContentTestEngine | null = null;
let currentCompatibilityTest: CompatibilityTestEngine | null = null;

// 数据库相关的 IPC 处理程序
ipcMain.handle('db-save-test-result', async (_event: any, testResult: TestResult) => {
  try {
    const id = await databaseService.saveTestResult(testResult);
    return { success: true, id };
  } catch (error: any) {
    logger.error('Failed to save test result:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-update-test-result', async (_event: any, id: string, updates: Partial<TestResult>) => {
  try {
    await databaseService.updateTestResult(id, updates);
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to update test result:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-get-test-results', async (_event: any, filters?: any) => {
  try {
    const results = await databaseService.getTestResults(filters);
    return { success: true, data: results };
  } catch (error: any) {
    logger.error('Failed to get test results:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-get-test-result', async (_event: any, id: string) => {
  try {
    const result = await databaseService.getTestResult(id);
    return { success: true, data: result };
  } catch (error: any) {
    logger.error('Failed to get test result:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-delete-test-result', async (_event: any, id: string) => {
  try {
    await databaseService.deleteTestResult(id);
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to delete test result:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-get-setting', async (_event: any, key: string) => {
  try {
    const value = await databaseService.getSetting(key);
    return { success: true, data: value };
  } catch (error: any) {
    logger.error('Failed to get setting:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-set-setting', async (_event: any, key: string, value: any, type?: string) => {
  try {
    await databaseService.setSetting(key, value, type);
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to set setting:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-get-stats', async (_event: any) => {
  try {
    const stats = await databaseService.getTestStats();
    return { success: true, data: stats };
  } catch (error: any) {
    logger.error('Failed to get stats:', error);
    return { success: false, error: error.message };
  }
});

// 压力测试相关的 IPC 处理程序
ipcMain.handle('run-stress-test', async (_event: any, config: TestConfig) => {
  try {
    logger.info('Starting stress test with config:', config);

    // 保存测试记录到数据库
    const testId = await databaseService.saveTestResult({
      url: config.url,
      type: 'stress',
      status: 'running',
      startTime: new Date().toISOString(),
      config,
      results: {},
      summary: '压力测试进行中...',
    });

    // 创建测试引擎实例
    currentStressTest = new StressTestEngine(
      // 进度回调
      (progress: any) => {
        mainWindow?.webContents.send('test-progress', {
          testId,
          type: 'stress',
          progress,
        });
      },
      // 完成回调
      async (result: any) => {
        await databaseService.updateTestResult(testId, {
          status: 'completed',
          endTime: new Date().toISOString(),
          duration: Date.now() - new Date(config.startTime || Date.now()).getTime(),
          results: result,
          summary: `并发用户: ${result.concurrentUsers}, 平均响应: ${result.averageResponseTime}ms, 成功率: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%`,
        });

        mainWindow?.webContents.send('test-complete', {
          testId,
          type: 'stress',
          result,
        });

        currentStressTest = null;
      }
    );

    // 启动测试
    await currentStressTest.runTest(config);

    return { success: true, testId };
  } catch (error: any) {
    logger.error('Failed to run stress test:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-stress-test', async (_event: any) => {
  try {
    if (currentStressTest) {
      currentStressTest.stop();
      currentStressTest = null;
    }
    return { success: true };
  } catch (error: any) {
    logger.error('Failed to stop stress test:', error);
    return { success: false, error: error.message };
  }
});

// 内容测试相关的 IPC 处理程序
ipcMain.handle('run-content-test', async (_event: any, config: TestConfig) => {
  try {
    logger.info('Starting content test with config:', config);

    // 保存测试记录到数据库
    const testId = await databaseService.saveTestResult({
      url: config.url,
      type: 'content',
      status: 'running',
      startTime: new Date().toISOString(),
      config,
      results: {},
      summary: '内容检测进行中...',
    });

    // 创建测试引擎实例
    currentContentTest = new ContentTestEngine();

    // 运行测试
    const result = await currentContentTest.runTest(config);

    // 更新测试结果
    await databaseService.updateTestResult(testId, {
      status: result.seoScore >= 60 ? 'completed' : 'failed',
      endTime: new Date().toISOString(),
      duration: Date.now() - new Date(config.startTime || Date.now()).getTime(),
      results: result,
      summary: `SEO检测: ${result.seoIssues.length}个问题, 评分: ${result.seoScore}分`,
    });

    mainWindow?.webContents.send('test-complete', {
      testId,
      type: 'content',
      result,
    });

    currentContentTest = null;

    return { success: true, testId, result };
  } catch (error: any) {
    logger.error('Failed to run content test:', error);
    return { success: false, error: error.message };
  }
});

// 兼容性测试相关的 IPC 处理程序
ipcMain.handle('run-compatibility-test', async (_event: any, config: TestConfig) => {
  try {
    logger.info('Starting compatibility test with config:', config);

    // 保存测试记录到数据库
    const testId = await databaseService.saveTestResult({
      url: config.url,
      type: 'compatibility',
      status: 'running',
      startTime: new Date().toISOString(),
      config,
      results: {},
      summary: '兼容性测试进行中...',
    });

    // 创建测试引擎实例
    currentCompatibilityTest = new CompatibilityTestEngine();

    // 运行测试
    const result = await currentCompatibilityTest.runTest(config);

    // 更新测试结果
    const status = result.overallCompatibility >= 80 ? 'completed' : 'failed';

    await databaseService.updateTestResult(testId, {
      status,
      endTime: new Date().toISOString(),
      duration: Date.now() - new Date(config.startTime || Date.now()).getTime(),
      results: result,
      summary: `浏览器兼容: ${result.supportedBrowsers}/${result.totalBrowsers}通过, 兼容性: ${result.overallCompatibility.toFixed(1)}%`,
    });

    mainWindow?.webContents.send('test-complete', {
      testId,
      type: 'compatibility',
      result,
    });

    currentCompatibilityTest = null;

    return { success: true, testId, result };
  } catch (error: any) {
    logger.error('Failed to run compatibility test:', error);
    return { success: false, error: error.message };
  }
});
