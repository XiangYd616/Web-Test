const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// 保持对窗口对象的全局引用
let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false, // 先不显示，等加载完成后再显示
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
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
    mainWindow.show();
    
    // 如果是开发环境，聚焦到窗口
    if (isDev) {
      mainWindow.webContents.focus();
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

function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建测试',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-test');
          }
        },
        {
          label: '打开测试历史',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            mainWindow.webContents.send('menu-open-history');
          }
        },
        { type: 'separator' },
        {
          label: '导出报告',
          accelerator: 'CmdOrCtrl+E',
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow, {
              title: '导出测试报告',
              defaultPath: `test-report-${new Date().toISOString().split('T')[0]}.pdf`,
              filters: [
                { name: 'PDF文件', extensions: ['pdf'] },
                { name: '所有文件', extensions: ['*'] }
              ]
            });
            
            if (!result.canceled) {
              mainWindow.webContents.send('menu-export-report', result.filePath);
            }
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '测试',
      submenu: [
        {
          label: '压力测试',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            mainWindow.webContents.send('menu-stress-test');
          }
        },
        {
          label: '兼容性测试',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            mainWindow.webContents.send('menu-compatibility-test');
          }
        },
        {
          label: '安全测试',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            mainWindow.webContents.send('menu-security-test');
          }
        },
        {
          label: 'API测试',
          accelerator: 'CmdOrCtrl+4',
          click: () => {
            mainWindow.webContents.send('menu-api-test');
          }
        }
      ]
    },
    {
      label: '工具',
      submenu: [
        {
          label: '数据库管理',
          click: () => {
            mainWindow.webContents.send('menu-database-manager');
          }
        },
        {
          label: '网络诊断',
          click: () => {
            mainWindow.webContents.send('menu-network-diagnostic');
          }
        },
        {
          label: '系统信息',
          click: () => {
            mainWindow.webContents.send('menu-system-info');
          }
        },
        { type: 'separator' },
        {
          label: '设置',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('menu-settings');
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于 Test Web App',
              message: 'Test Web App',
              detail: '专业的Web应用测试平台\n版本: 1.0.0\n\n功能特性:\n• 压力测试\n• 兼容性测试\n• 安全扫描\n• API测试\n• 本地数据库\n• 离线使用'
            });
          }
        },
        {
          label: '用户手册',
          click: () => {
            shell.openExternal('https://github.com/your-repo/test-web-app/wiki');
          }
        },
        { type: 'separator' },
        {
          label: '开发者工具',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    }
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
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 注释掉重复的app.whenReady()调用，因为上面已经有了

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

// 导入桌面版专用模块
const LocalDatabase = require('./modules/database');
const localDB = new LocalDatabase();

// 应用启动时初始化数据库
app.whenReady().then(async () => {
  try {
    await localDB.init();
    console.log('本地数据库初始化成功');
  } catch (error) {
    console.error('本地数据库初始化失败:', error);
  }
  createWindow();
});

// IPC处理程序
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-system-info', () => {
  const os = require('os');
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
    userInfo: os.userInfo()
  };
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// 数据库相关IPC处理
ipcMain.handle('db-init', async () => {
  return await localDB.init();
});

ipcMain.handle('db-query', async (event, sql, params) => {
  return await localDB.query(sql, params);
});

ipcMain.handle('db-backup', async (event, backupPath) => {
  return await localDB.backup(backupPath);
});

ipcMain.handle('db-restore', async (event, backupPath) => {
  return await localDB.restore(backupPath);
});

ipcMain.handle('db-export', async (event, format, exportPath) => {
  return await localDB.export(format, exportPath);
});

ipcMain.handle('db-stats', async () => {
  return await localDB.getStats();
});

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
