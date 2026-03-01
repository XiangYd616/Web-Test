import { app, ipcMain, shell } from 'electron';
import { windowManager } from '../managers/WindowManager';

let autoUpdater: {
  checkForUpdates: () => Promise<unknown>;
  downloadUpdate: () => Promise<unknown>;
  quitAndInstall: () => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
} | null = null;

/** 比较语义化版本号，返回 >0 表示 a > b */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

export async function initAutoUpdater(): Promise<void> {
  try {
    const { autoUpdater: updater } = await import('electron-updater');
    autoUpdater = updater as typeof autoUpdater;
    if (!autoUpdater) return;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info: unknown) => {
      windowManager.send('update-available', info);
    });

    autoUpdater.on('update-downloaded', (info: unknown) => {
      windowManager.send('update-downloaded', info);
    });

    autoUpdater.on('error', (err: unknown) => {
      console.warn('[AutoUpdater] 更新检查失败:', err);
    });
  } catch {
    console.warn('[AutoUpdater] electron-updater 不可用，回退到手动检查模式');
  }
}

/**
 * 自动更新 IPC handlers
 */
export function registerUpdaterIpc(): void {
  ipcMain.handle('updater-check', async () => {
    const currentVersion = app.getVersion();

    // 优先使用 electron-updater
    if (autoUpdater) {
      try {
        const result = await autoUpdater.checkForUpdates();
        const info = (
          result as {
            updateInfo?: { version?: string; releaseDate?: string; releaseNotes?: string };
          }
        )?.updateInfo;
        const latestVersion = info?.version || currentVersion;
        return {
          updateAvailable: compareVersions(latestVersion, currentVersion) > 0,
          currentVersion,
          latestVersion,
          releaseDate: info?.releaseDate || '',
          releaseNotes: info?.releaseNotes || '',
          downloadUrl: '',
        };
      } catch {
        // electron-updater 失败，回退到 HTTP 检查
      }
    }

    // 回退：通过 API 检查版本
    const UPDATE_API_URL =
      process.env.UPDATE_API_URL || 'https://api.xiangweb.space/api/system/version';
    try {
      const https = await import('https');
      const http = await import('http');
      const client = UPDATE_API_URL.startsWith('https') ? https : http;
      const data = await new Promise<string>((resolve, reject) => {
        const req = client.get(UPDATE_API_URL, res => {
          let body = '';
          res.on('data', (chunk: string) => {
            body += chunk;
          });
          res.on('end', () => resolve(body));
        });
        req.on('error', reject);
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      const json = JSON.parse(data);
      const info = json?.data || json;
      const latestVersion = String(info?.latestVersion || currentVersion);
      const updateAvailable =
        latestVersion !== currentVersion && compareVersions(latestVersion, currentVersion) > 0;
      return {
        updateAvailable,
        currentVersion,
        latestVersion,
        releaseDate: info?.releaseDate || '',
        releaseNotes: info?.releaseNotes || '',
        downloadUrl: info?.downloadUrl || '',
      };
    } catch {
      return {
        updateAvailable: false,
        currentVersion,
        latestVersion: currentVersion,
        error: '无法连接到更新服务器',
      };
    }
  });

  ipcMain.handle('updater-download', async () => {
    if (autoUpdater) {
      await autoUpdater.downloadUpdate();
      return;
    }
    const downloadUrl = process.env.APP_DOWNLOAD_URL || 'https://github.com';
    shell.openExternal(downloadUrl);
  });

  ipcMain.handle('updater-install', async () => {
    if (autoUpdater) {
      autoUpdater.quitAndInstall();
      return;
    }
    app.relaunch();
    app.exit(0);
  });
}
