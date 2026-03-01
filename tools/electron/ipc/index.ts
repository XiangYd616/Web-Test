/**
 * IPC 路由聚合入口
 * 按业务域注册所有 IPC handlers，main.ts 只需调用 registerAllIpc()
 */
import { registerAppStateIpc } from './appState.ipc';
import { registerAuthIpc } from './auth.ipc';
import { registerConfigIpc } from './config.ipc';
import { registerDatabaseIpc } from './database.ipc';
import { registerDevToolsIpc } from './devTools.ipc';
import { registerFileIpc } from './file.ipc';
import { registerNetworkIpc } from './network.ipc';
import { registerNotificationIpc } from './notification.ipc';
import { registerPuppeteerIpc } from './puppeteer.ipc';
import { registerReportIpc } from './report.ipc';
import { registerSchedulerIpc } from './scheduler.ipc';
import { registerStressTestIpc } from './stressTest.ipc';
import { registerSystemIpc } from './system.ipc';
import { registerTestIpc } from './test.ipc';
import { registerUpdaterIpc } from './updater.ipc';
import { registerWindowIpc } from './window.ipc';

// Re-export for individual usage
export { registerAppStateIpc } from './appState.ipc';
export { registerAuthIpc } from './auth.ipc';
export { registerConfigIpc } from './config.ipc';
export { registerDatabaseIpc } from './database.ipc';
export { registerDevToolsIpc } from './devTools.ipc';
export { registerFileIpc } from './file.ipc';
export { registerNetworkIpc } from './network.ipc';
export { registerNotificationIpc } from './notification.ipc';
export { registerPuppeteerIpc } from './puppeteer.ipc';
export { registerReportIpc } from './report.ipc';
export { registerSchedulerIpc } from './scheduler.ipc';
export { registerStressTestIpc } from './stressTest.ipc';
export { registerSystemIpc } from './system.ipc';
export { registerTestIpc } from './test.ipc';
export { registerUpdaterIpc } from './updater.ipc';
export { registerWindowIpc } from './window.ipc';

/**
 * 一次性注册所有 IPC handlers
 */
export function registerAllIpc(): void {
  registerSystemIpc();
  registerWindowIpc();
  registerDatabaseIpc();
  registerAppStateIpc();
  registerAuthIpc();
  registerTestIpc();
  registerStressTestIpc();
  registerPuppeteerIpc();
  registerFileIpc();
  registerNetworkIpc();
  registerConfigIpc();
  registerNotificationIpc();
  registerReportIpc();
  registerUpdaterIpc();
  registerSchedulerIpc();
  registerDevToolsIpc();
}
