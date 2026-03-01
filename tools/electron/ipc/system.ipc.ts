import {
  app,
  dialog,
  ipcMain,
  MessageBoxOptions,
  OpenDialogOptions,
  SaveDialogOptions,
} from 'electron';
import * as os from 'os';
import { windowManager } from '../managers/WindowManager';

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

/**
 * 系统信息 & 对话框 IPC handlers
 */
export function registerSystemIpc(): void {
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

  ipcMain.handle('show-save-dialog', async (_event, options: SaveDialogOptions) => {
    const win = windowManager.window;
    if (!win) throw new Error('Main window not available');
    return await dialog.showSaveDialog(win, options);
  });

  ipcMain.handle('show-open-dialog', async (_event, options: OpenDialogOptions) => {
    const win = windowManager.window;
    if (!win) throw new Error('Main window not available');
    return await dialog.showOpenDialog(win, options);
  });

  ipcMain.handle('show-message-box', async (_event, options: MessageBoxOptions) => {
    const win = windowManager.window;
    if (!win) throw new Error('Main window not available');
    return await dialog.showMessageBox(win, options);
  });

  // ── 系统监控 ──
  ipcMain.handle('system-resource-usage', async () => {
    const memUsage = process.memoryUsage();
    return {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        systemTotal: os.totalmem(),
        systemFree: os.freemem(),
      },
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      platform: process.platform,
    };
  });

  ipcMain.handle('system-network-interfaces', async () => {
    return os.networkInterfaces();
  });

  ipcMain.handle('system-process-list', async () => {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const cpuPercent = Math.round((cpuUsage.user + cpuUsage.system) / 1000 / os.cpus().length) / 10;
    return [
      {
        pid: process.pid,
        name: 'electron-main',
        cpu: cpuPercent,
        memory: memUsage.rss,
      },
    ];
  });
}
