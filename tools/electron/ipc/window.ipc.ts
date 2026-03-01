import { ipcMain } from 'electron';
import { windowManager } from '../managers/WindowManager';

/**
 * 窗口控制 IPC handlers
 */
export function registerWindowIpc(): void {
  ipcMain.handle('window-minimize', async () => {
    windowManager.window?.minimize();
  });

  ipcMain.handle('window-maximize', async () => {
    if (windowManager.window?.isMaximized()) {
      windowManager.window.unmaximize();
    } else {
      windowManager.window?.maximize();
    }
  });

  ipcMain.handle('window-close', async () => {
    windowManager.window?.close();
  });

  ipcMain.handle('window-is-maximized', async () => {
    return windowManager.window?.isMaximized() ?? false;
  });

  ipcMain.handle('window-set-title', async (_event, title: string) => {
    windowManager.window?.setTitle(title);
  });

  ipcMain.handle('window-set-size', async (_event, width: number, height: number) => {
    windowManager.window?.setSize(width, height);
  });

  ipcMain.handle('window-center', async () => {
    windowManager.window?.center();
  });
}
