/**
 * Test Web App — Electron 主进程入口
 *
 * 架构：main.ts 仅负责应用生命周期引导，所有业务逻辑已拆分到：
 * - managers/  — WindowManager, TrayManager, MenuManager, SchedulerService
 * - ipc/      — 按业务域拆分的 IPC handlers
 */
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { registerAllIpc } from './ipc';
import { handleAuthDeepLink } from './ipc/auth.ipc';
import { setStressTestEngine } from './ipc/stressTest.ipc';
import { initAutoUpdater } from './ipc/updater.ipc';
import { menuManager } from './managers/MenuManager';
import { schedulerService } from './managers/SchedulerService';
import { trayManager } from './managers/TrayManager';
import { windowManager } from './managers/WindowManager';
import { getLocalDb, initLocalDb } from './modules/localDbAdapter';

// ── Puppeteer 子进程检测 ──
// 当 Puppeteer 使用 electron.exe 作为 Chromium 启动时，会传入 --headless / --remote-debugging-port 等参数。
// 此时不应执行应用逻辑（createWindow / DB / Tray 等），直接让 Electron 作为纯 Chromium 运行。
const isPuppeteerChild = process.argv.some(
  arg => arg.startsWith('--headless') || arg.startsWith('--remote-debugging-port')
);
if (isPuppeteerChild) {
  app.on('window-all-closed', () => app.quit());
}

// ── 自定义协议注册（testweb://）──
// 必须在 app.whenReady 之前调用，用于接收 Web 端登录后的 auth callback
if (!isPuppeteerChild) {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('testweb', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('testweb');
  }
}

// ── 单实例锁（Puppeteer 子进程不参与锁竞争） ──
const gotTheLock = isPuppeteerChild ? true : app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else if (!isPuppeteerChild) {
  app.on('second-instance', (_event, argv) => {
    const win = windowManager.window;
    if (win) {
      if (win.isDestroyed()) return;
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
    // Windows/Linux: deep link URL 在 argv 中
    const deepLinkUrl = argv.find(arg => arg.startsWith('testweb://'));
    if (deepLinkUrl) {
      handleAuthDeepLink(deepLinkUrl, windowManager.window);
    }
  });
}

// macOS: deep link 通过 open-url 事件传递
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (url.startsWith('testweb://')) {
    handleAuthDeepLink(url, windowManager.window);
  }
});

// 当所有窗口都关闭时 —— 最小化到托盘而非退出（有定时任务时）
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return;
  if (schedulerService.hasActiveTasks() && !windowManager.isForceQuit) return;
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createWindow();
  }
});

// ── 应用启动 ──
app.whenReady().then(async () => {
  if (isPuppeteerChild || !gotTheLock) return;

  // ① 注册所有 IPC handlers（同步，必须在窗口创建前完成）
  registerAllIpc();

  // ② 创建窗口 & UI（让用户立即看到界面）
  windowManager.setCloseGuard(() => !schedulerService.hasActiveTasks());
  windowManager.createWindow();
  menuManager.createMenu();

  // ③ 系统托盘
  trayManager.setTaskCountProvider(() => schedulerService.taskCount);
  trayManager.createTray();

  // ④ 同步初始化数据库
  try {
    await initLocalDb();
    const localDB = getLocalDb() as unknown as { startAutoBackup?: () => Promise<void> };
    console.log('✅ 本地数据库初始化成功');
    if (typeof localDB?.startAutoBackup === 'function') {
      void localDB.startAutoBackup();
    }
    // 恢复持久化的定时任务
    void schedulerService.loadPersistedTasks();
  } catch (dbError) {
    console.error('❌ 数据库初始化失败:', dbError);
  }

  // ⑤ 同步引擎（需在数据库之后、窗口渲染前注册 IPC handlers）
  try {
    const { syncEngine } = await import('./modules/sync/SyncEngine');
    await syncEngine.init();
    console.log('✅ 同步引擎初始化成功');
  } catch (syncError) {
    console.warn('⚠️ 同步引擎初始化失败（不影响离线功能）:', syncError);
  }

  // ⑥ 后台延迟加载：非阻塞，不影响窗口显示
  setTimeout(() => {
    void initDeferredModules();
  }, 1000);
});

async function initDeferredModules(): Promise<void> {
  // 压力测试模块
  try {
    const stressModule = await import('./modules/localStressTest');
    const LocalStressTestEngine = stressModule.default || stressModule;
    const engine = new (LocalStressTestEngine as { new (): unknown })();
    setStressTestEngine(engine as Parameters<typeof setStressTestEngine>[0]);
    console.log('✅ 压力测试模块加载成功');
  } catch (stressError) {
    console.warn('⚠️ 压力测试模块加载失败（不影响其他功能）:', stressError);
  }

  // Puppeteer 浏览器引擎预热
  try {
    const bundlePath = path.join(__dirname, 'modules', 'engineBundle.js');
    const engineMod = require(bundlePath) as Record<string, unknown>;
    const preloadPuppeteer = engineMod.preloadPuppeteer as (() => Promise<boolean>) | undefined;
    if (typeof preloadPuppeteer === 'function') {
      const ok = await preloadPuppeteer();
      console.log(
        ok ? '✅ Puppeteer 浏览器引擎预热成功' : '⚠️ Puppeteer 预热失败，部分测试将使用降级模式'
      );
    }
  } catch (puppeteerError) {
    console.warn('⚠️ Puppeteer 预热异常（不影响其他功能）:', puppeteerError);
  }

  // 自动更新
  try {
    await initAutoUpdater();
  } catch (e) {
    console.warn('⚠️ 自动更新初始化失败:', e);
  }
}

// 应用退出前清理
app.on('before-quit', () => {
  windowManager.setForceQuit(true);
  schedulerService.stopAll();

  // 停止同步引擎
  try {
    const { syncEngine } = require('./modules/sync/SyncEngine') as {
      syncEngine: { stop: () => void };
    };
    syncEngine.stop();
  } catch {
    /* sync module may not be loaded */
  }

  // 关闭本地数据库
  try {
    const db = getLocalDb() as unknown as { close?: () => void };
    if (typeof db?.close === 'function') {
      db.close();
      console.log('✅ 数据库已安全关闭');
    }
  } catch {
    /* db may not be initialized */
  }
});
