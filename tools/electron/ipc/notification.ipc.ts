import { ipcMain, Notification as ElectronNotification } from 'electron';

/**
 * 通知系统 IPC handlers
 */
export function registerNotificationIpc(): void {
  ipcMain.handle(
    'notification-show',
    async (_event, title: string, body: string, _options?: unknown) => {
      if (ElectronNotification.isSupported()) {
        new ElectronNotification({ title, body }).show();
      }
    }
  );
}
