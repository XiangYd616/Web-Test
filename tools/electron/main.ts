import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  MessageBoxOptions,
  OpenDialogOptions,
  SaveDialogOptions,
  shell,
} from 'electron';
import * as os from 'os';
import * as path from 'path';

// 类型定义
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
  userInfo: os.UserInfo<string>;
}

interface StressTestConfig {
  [key: string]: unknown;
}

interface StressTestResult {
  success: boolean;
  testId?: string;
  error?: string;
}

interface DatabaseInterface {
  init(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<unknown>;
  backup(path: string): Promise<unknown>;
  restore(path: string): Promise<unknown>;
  export(format: string, path: string): Promise<unknown>;
  getStats(): Promise<unknown>;
}

interface StressTestEngineInterface {
  startTest(config: StressTestConfig): Promise<StressTestResult>;
  stopTest(): Promise<StressTestResult>;
  getResults(): unknown;
  getSystemUsage(): unknown;
  on(event: string, callback: (data: unknown) => void): void;
  testId?: string;
}

// 动态导入模块（因为它们可能还没有TypeScript类型）
let LocalDatabase: unknown;
let LocalStressTestEngine: unknown;
let localDB: DatabaseInterface;
let stressTestEngine: StressTestEngineInterface;

// 保持对窗口对象的全局引用
let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow(): void {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false, // 先不显示，等加载完成后再显示
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // 加载应用
  if (isDev) {
    // 开发环境：加载本地开发服务器
    mainWindow.loadURL('http://localhost:5174');
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../client/index.html'));
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();

      // 如果是开发环境，聚焦到窗口
      if (isDev) {
        mainWindow.webContents.focus();
      }
    }
  });

  // 当窗口被关闭时
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 创建菜单
  createMenu();
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建测试',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-new-test');
            }
          },
        },
        {
          label: '打开测试历史',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-open-history');
            }
          },
        },
        { type: 'separator' },
        {
          label: '导出报告',
          accelerator: 'CmdOrCtrl+E',
          click: async () => {
            if (!mainWindow) return;

            const result = await dialog.showSaveDialog(mainWindow, {
              title: '导出测试报告',
              defaultPath: `test-report-${new Date().toISOString().split('T')[0]}.pdf`,
              filters: [
                { name: 'PDF文件', extensions: ['pdf'] },
                { name: '所有文件', extensions: ['*'] },
              ],
            } as SaveDialogOptions);

            if (!result.canceled && result.filePath) {
              mainWindow.webContents.send('menu-export-report', result.filePath);
            }
          },
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: '测试',
      submenu: [
        {
          label: '压力测试',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-stress-test');
            }
          },
        },
        {
          label: '兼容性测试',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-compatibility-test');
            }
          },
        },
        {
          label: '安全测试',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-security-test');
            }
          },
        },
        {
          label: 'API测试',
          accelerator: 'CmdOrCtrl+4',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-api-test');
            }
          },
        },
      ],
    },
    {
      label: '工具',
      submenu: [
        {
          label: '数据库管理',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-database-manager');
            }
          },
        },
        {
          label: '网络诊断',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-network-diagnostic');
            }
          },
        },
        {
          label: '系统信息',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-system-info');
            }
          },
        },
        { type: 'separator' },
        {
          label: '设置',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-settings');
            }
          },
        },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            if (!mainWindow) return;

            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于 Test Web App',
              message: 'Test Web App',
              detail:
                '专业的Web应用测试平台\n版本: 1.0.0\n\n功能特性:\n• 压力测试\n• 兼容性测试\n• 安全扫描\n• API测试\n• 本地数据库\n• 离线使用',
            } as MessageBoxOptions);
          },
        },
        {
          label: '用户手册',
          click: () => {
            shell.openExternal('https://github.com/your-repo/test-web-app/wiki');
          },
        },
        { type: 'separator' },
        {
          label: '开发者工具',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          },
        },
      ],
    },
  ];

  // macOS特殊处理
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  // 在macOS上，应用和菜单栏通常会保持活跃状态
  // 直到用户明确地用Cmd + Q退出
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // 在macOS上，当点击dock图标并且没有其他窗口打开时
  // 通常会重新创建一个窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 初始化桌面版专用模块
async function initializeModules(): Promise<void> {
  try {
    // 动态导入模块
    const dbModule = await import('./modules/database');
    const stressModule = await import('./modules/localStressTest');

    LocalDatabase = dbModule.default || dbModule;
    LocalStressTestEngine = stressModule.default || stressModule;

    localDB = new (LocalDatabase as any)();
    stressTestEngine = new (LocalStressTestEngine as any)();

    // 应用启动时初始化数据库
    await localDB.init();
  } catch (error) {
    console.error('模块初始化失败:', error);
  }
}

// 应用启动
app.whenReady().then(async () => {
  await initializeModules();
  createWindow();
});

// IPC处理程序
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-system-info', (): SystemInfo => {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpus: os.cpus().length,
    hostname: os.hostname(),
    userInfo: os.userInfo(),
  };
});

ipcMain.handle('show-save-dialog', async (event, options: SaveDialogOptions) => {
  if (!mainWindow) throw new Error('Main window not available');
  return await dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('show-open-dialog', async (event, options: OpenDialogOptions) => {
  if (!mainWindow) throw new Error('Main window not available');
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('show-message-box', async (event, options: MessageBoxOptions) => {
  if (!mainWindow) throw new Error('Main window not available');
  return await dialog.showMessageBox(mainWindow, options);
});

// 数据库相关IPC处理
ipcMain.handle('db-init', async () => {
  if (!localDB) throw new Error('Database not initialized');
  return await localDB.init();
});

ipcMain.handle('db-query', async (event, sql: string, params?: any[]) => {
  if (!localDB) throw new Error('Database not initialized');
  return await localDB.query(sql, params);
});

ipcMain.handle('db-backup', async (event, backupPath: string) => {
  if (!localDB) throw new Error('Database not initialized');
  return await localDB.backup(backupPath);
});

ipcMain.handle('db-restore', async (event, backupPath: string) => {
  if (!localDB) throw new Error('Database not initialized');
  return await localDB.restore(backupPath);
});

ipcMain.handle('db-export', async (event, format: string, exportPath: string) => {
  if (!localDB) throw new Error('Database not initialized');
  return await localDB.export(format, exportPath);
});

ipcMain.handle('db-stats', async () => {
  if (!localDB) throw new Error('Database not initialized');
  return await localDB.getStats();
});

// 本地压力测试相关IPC处理
ipcMain.handle(
  'stress-test-start',
  async (event, config: StressTestConfig): Promise<StressTestResult> => {
    if (!stressTestEngine) throw new Error('Stress test engine not initialized');

    try {
      await stressTestEngine.startTest(config);
      return { success: true, testId: stressTestEngine.testId };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
);

ipcMain.handle('stress-test-stop', async (): Promise<StressTestResult> => {
  if (!stressTestEngine) throw new Error('Stress test engine not initialized');

  try {
    await stressTestEngine.stopTest();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('stress-test-status', async () => {
  if (!stressTestEngine) throw new Error('Stress test engine not initialized');
  return stressTestEngine.getResults();
});

ipcMain.handle('stress-test-system-usage', async () => {
  if (!stressTestEngine) throw new Error('Stress test engine not initialized');
  return stressTestEngine.getSystemUsage();
});

// 转发压力测试事件到渲染进程
function setupStressTestEvents(): void {
  if (!stressTestEngine) return;

  stressTestEngine.on('testStarted', (data: any) => {
    if (mainWindow) {
      mainWindow.webContents.send('stress-test-started', data);
    }
  });

  stressTestEngine.on('testUpdate', (data: any) => {
    if (mainWindow) {
      mainWindow.webContents.send('stress-test-update', data);
    }
  });

  stressTestEngine.on('testCompleted', (data: any) => {
    if (mainWindow) {
      mainWindow.webContents.send('stress-test-completed', data);
    }
  });

  stressTestEngine.on('testError', (data: any) => {
    if (mainWindow) {
      mainWindow.webContents.send('stress-test-error', data);
    }
  });
}

// 设置事件监听器
setTimeout(() => {
  setupStressTestEvents();
}, 1000);

// 防止多个实例
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 当运行第二个实例时，将焦点放在主窗口上
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
