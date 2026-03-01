import { app, Menu, nativeImage, Tray } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { windowManager } from './WindowManager';

/**
 * 系统托盘管理器
 */
class TrayManager {
  private tray: Tray | null = null;
  private getTaskCount: () => number = () => 0;

  /** 注入定时任务计数函数 */
  setTaskCountProvider(fn: () => number): void {
    this.getTaskCount = fn;
  }

  createTray(): void {
    const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
    const icon = fs.existsSync(iconPath)
      ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
      : nativeImage.createEmpty();
    this.tray = new Tray(icon);
    this.tray.setToolTip('Test Web App');

    this.updateContextMenu();

    this.tray.on('double-click', () => {
      const win = windowManager.window;
      if (win) {
        win.show();
        win.focus();
      }
    });
  }

  updateContextMenu(): void {
    if (!this.tray) return;

    const taskCount = this.getTaskCount();
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          windowManager.createWindow();
        },
      },
      { type: 'separator' },
      {
        label: `定时任务 (${taskCount})`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          windowManager.setForceQuit(true);
          app.quit();
        },
      },
    ]);
    this.tray.setContextMenu(contextMenu);
  }
}

export const trayManager = new TrayManager();
