import { ipcMain } from 'electron';
import { windowManager } from '../managers/WindowManager';

const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';

/**
 * 开发者工具 IPC handlers（仅开发环境）
 */
export function registerDevToolsIpc(): void {
  ipcMain.handle('dev-tools-open', async () => {
    if (isDev) windowManager.window?.webContents.openDevTools();
  });

  ipcMain.handle('dev-tools-close', async () => {
    if (isDev) windowManager.window?.webContents.closeDevTools();
  });

  ipcMain.handle('dev-tools-toggle', async () => {
    if (isDev) windowManager.window?.webContents.toggleDevTools();
  });

  ipcMain.handle('dev-reload', async () => {
    if (isDev) windowManager.window?.webContents.reload();
  });

  ipcMain.handle('dev-force-reload', async () => {
    if (isDev) windowManager.window?.webContents.reloadIgnoringCache();
  });
}
