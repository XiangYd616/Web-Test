import { ipcMain } from 'electron';
import * as path from 'path';

/**
 * Puppeteer 浏览器引擎状态 IPC handlers
 */
export function registerPuppeteerIpc(): void {
  ipcMain.handle('puppeteer-status', async () => {
    try {
      const bundlePath = path.join(__dirname, 'modules', 'engineBundle.js');
      const engineMod = require(bundlePath) as Record<string, unknown>;
      const getPuppeteerStats = engineMod.getPuppeteerStats as
        | (() => Record<string, unknown>)
        | undefined;
      if (typeof getPuppeteerStats === 'function') {
        return getPuppeteerStats();
      }
      return { available: false, error: 'getPuppeteerStats 未导出' };
    } catch (err) {
      return { available: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('puppeteer-reset', async () => {
    try {
      const bundlePath = path.join(__dirname, 'modules', 'engineBundle.js');
      const engineMod = require(bundlePath) as Record<string, unknown>;
      const resetPuppeteer = engineMod.resetPuppeteer as (() => Promise<void>) | undefined;
      if (typeof resetPuppeteer === 'function') {
        await resetPuppeteer();
        // 重置后重新预热
        const preloadPuppeteer = engineMod.preloadPuppeteer as (() => Promise<boolean>) | undefined;
        if (typeof preloadPuppeteer === 'function') {
          await preloadPuppeteer();
        }
        return { success: true };
      }
      return { success: false, error: 'resetPuppeteer 未导出' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}
