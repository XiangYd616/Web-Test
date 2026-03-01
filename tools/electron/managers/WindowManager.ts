import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import localTestExecutionService from '../modules/testing/localTestExecutionService';

const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';

/**
 * 窗口管理器 — 负责主窗口创建、显示、生命周期
 */
class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private forceQuit = false;
  private onCloseGuard: (() => boolean) | null = null;

  get window(): BrowserWindow | null {
    return this.mainWindow;
  }

  get isForceQuit(): boolean {
    return this.forceQuit;
  }

  setForceQuit(value: boolean): void {
    this.forceQuit = value;
  }

  /** 注册关闭守卫：返回 true 表示允许关闭，false 阻止 */
  setCloseGuard(guard: (() => boolean) | null): void {
    this.onCloseGuard = guard;
  }

  createWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.show();
      this.mainWindow.focus();
      return;
    }

    const isMac = process.platform === 'darwin';
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: path.join(__dirname, 'preload.js'),
      },
      icon: path.join(__dirname, '..', 'assets', 'icon.png'),
      show: false,
      // 原生融合：macOS 用 hiddenInset，Windows/Linux 完全无边框
      frame: isMac,
      titleBarStyle: isMac ? 'hiddenInset' : 'default',
      ...(isMac ? { trafficLightPosition: { x: 12, y: 18 } } : {}),
    });

    this.loadContent();
    this.setupWindowEvents();
    this.setupTestEngineEvents();
  }

  private loadContent(): void {
    if (!this.mainWindow) return;

    const prodIndexPath = app.isPackaged
      ? path.join(process.resourcesPath, 'frontend', 'dist', 'index.html')
      : path.join(__dirname, '..', '..', '..', 'frontend', 'dist', 'index.html');
    const devServerUrl =
      process.env.ELECTRON_DEV_SERVER_URL || (isDev ? 'http://localhost:5174' : undefined);

    if (isDev && devServerUrl) {
      this.mainWindow.loadURL(devServerUrl);
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(prodIndexPath);
    }
  }

  private setupWindowEvents(): void {
    if (!this.mainWindow) return;

    this.mainWindow.once('ready-to-show', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        if (isDev) {
          this.mainWindow.webContents.focus();
        }
      }
    });

    // 窗口最大化/还原状态变更 → 通知渲染进程（自定义标题栏需要）
    this.mainWindow.on('maximize', () => {
      this.mainWindow?.webContents.send('window-maximized-changed', true);
    });
    this.mainWindow.on('unmaximize', () => {
      this.mainWindow?.webContents.send('window-maximized-changed', false);
    });

    // 关闭按钮 → 有定时任务时最小化到托盘，否则正常关闭
    this.mainWindow.on('close', e => {
      if (!this.forceQuit && this.onCloseGuard && !this.onCloseGuard()) {
        e.preventDefault();
        this.mainWindow?.hide();
        return;
      }
    });

    this.mainWindow.on('closed', () => {
      localTestExecutionService.setEventListener(null);
      this.mainWindow = null;
    });

    // 处理外部链接
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  private setupTestEngineEvents(): void {
    // 注册测试引擎事件监听器 → 通过 IPC 推送到渲染进程
    localTestExecutionService.setEventListener(
      (event: string, payload: Record<string, unknown>) => {
        console.log(`[TestEvent] ${event}`, JSON.stringify(payload).substring(0, 200));
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send(event, payload);
        }
      }
    );
  }

  /** 安全地向渲染进程发送消息 */
  send(channel: string, ...args: unknown[]): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }
}

export const windowManager = new WindowManager();
