import { app, dialog, Menu, MessageBoxOptions, SaveDialogOptions, shell } from 'electron';
import { windowManager } from './WindowManager';

const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';

/**
 * 应用菜单管理器
 */
class MenuManager {
  createMenu(): void {
    // TODO: 菜单标签当前硬编码中文，后续应接入 i18n 国际化系统
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: '文件',
        submenu: [
          {
            label: '新建测试',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              windowManager.send('menu-new-test');
            },
          },
          {
            label: '打开测试历史',
            accelerator: 'CmdOrCtrl+H',
            click: () => {
              windowManager.send('menu-open-history');
            },
          },
          { type: 'separator' },
          {
            label: '导出报告',
            accelerator: 'CmdOrCtrl+E',
            click: async () => {
              const win = windowManager.window;
              if (!win) return;

              const result = await dialog.showSaveDialog(win, {
                title: '导出测试报告',
                defaultPath: `test-report-${new Date().toISOString().split('T')[0]}.pdf`,
                filters: [
                  { name: 'PDF文件', extensions: ['pdf'] },
                  { name: '所有文件', extensions: ['*'] },
                ],
              } as SaveDialogOptions);

              if (!result.canceled && result.filePath) {
                windowManager.send('menu-export-report', result.filePath);
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
            click: () => windowManager.send('menu-stress-test'),
          },
          {
            label: '兼容性测试',
            accelerator: 'CmdOrCtrl+2',
            click: () => windowManager.send('menu-compatibility-test'),
          },
          {
            label: '安全测试',
            accelerator: 'CmdOrCtrl+3',
            click: () => windowManager.send('menu-security-test'),
          },
          {
            label: 'API测试',
            accelerator: 'CmdOrCtrl+4',
            click: () => windowManager.send('menu-api-test'),
          },
        ],
      },
      {
        label: '工具',
        submenu: [
          {
            label: '数据库管理',
            click: () => windowManager.send('menu-database-manager'),
          },
          {
            label: '网络诊断',
            click: () => windowManager.send('menu-network-diagnostic'),
          },
          {
            label: '系统信息',
            click: () => windowManager.send('menu-system-info'),
          },
          { type: 'separator' },
          {
            label: '设置',
            accelerator: 'CmdOrCtrl+,',
            click: () => windowManager.send('menu-settings'),
          },
        ],
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '关于',
            click: () => {
              const win = windowManager.window;
              if (!win) return;

              dialog.showMessageBox(win, {
                type: 'info',
                title: '关于 Test Web App',
                message: 'Test Web App',
                detail:
                  '专业的Web应用测试平台\n版本: 1.0.0\n\n功能特性:\n• 压力测试\n• 兼容性测试\n• 安全扫描\n• API测试\n• 本地数据库\n• 离线使用',
              } as MessageBoxOptions);
            },
          },
          {
            label: '检查更新',
            click: () => windowManager.send('menu-check-update'),
          },
          {
            label: '用户手册',
            click: () => {
              shell.openExternal('https://github.com/your-repo/test-web-app/wiki');
            },
          },
          { type: 'separator' },
          ...(isDev
            ? [
                {
                  label: '开发者工具',
                  accelerator: 'F12',
                  click: () => {
                    windowManager.window?.webContents.toggleDevTools();
                  },
                },
              ]
            : []),
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
}

export const menuManager = new MenuManager();
