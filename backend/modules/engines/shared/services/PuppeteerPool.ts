/**
 * 共享 Puppeteer 浏览器池 —— 项目核心基础设施
 *
 * Puppeteer 是 6 个测试引擎的核心依赖（Performance/SEO/Compatibility/Accessibility/UX/Security），
 * 必须极力确保其可用性。本模块提供以下保障：
 *
 * 可用性保障：
 * 1. Chromium 路径多级发现：Electron exe → puppeteer 内置 → 系统 Chrome → 环境变量
 * 2. 启动验证：preload 时实际启动浏览器并获取版本号，确认 Chromium 真正可用
 * 3. 启动重试：最多 3 次递增延迟重试（1s → 2s → 3s）
 * 4. 模块加载失败可重试：不永久缓存加载失败状态，允许后续重新尝试
 *
 * 稳定性保障：
 * 5. 僵死检测：cleanup 周期中通过 browser.version() 探测浏览器存活
 * 6. acquirePage 崩溃自愈：页面创建失败时自动移除崩溃浏览器并重启
 * 7. acquirePage 超时保护：可配置的全局超时（默认 60s），防止无限等待
 * 8. 断连自动感知：浏览器意外退出时立即从池中移除并记录日志
 *
 * Electron 桌面端优化：
 * 9. 适度资源配置：2 浏览器 / 5 页面 / 8 总页面，5 分钟空闲回收
 * 10. headless=new 模式 + 12 个稳定性增强启动参数
 * 11. 复用 Electron 内置 Chromium，不额外下载（节省 ~170MB）
 *
 * 可观测性：
 * 12. getStats() 暴露完整状态：版本号、路径、启动失败次数、池使用率
 * 13. reset() 允许外部触发完全重置（用于错误恢复）
 *
 * 用法：
 *   import { puppeteerPool } from '../shared/services/PuppeteerPool';
 *
 *   const { page, release } = await puppeteerPool.acquirePage({ ... });
 *   try {
 *     await page.goto(url);
 *   } finally {
 *     await release();
 *   }
 */

import { existsSync } from 'fs';
import { join } from 'path';

type PuppeteerModule = typeof import('puppeteer');
type Browser = import('puppeteer').Browser;
type Page = import('puppeteer').Page;

export interface AcquirePageOptions {
  /** 视口宽度，默认 1920 */
  width?: number;
  /** 视口高度，默认 1080 */
  height?: number;
  /** 设备缩放因子 */
  deviceScaleFactor?: number;
  /** 是否模拟移动端 */
  isMobile?: boolean;
  /** 自定义 User-Agent */
  userAgent?: string;
  /** 额外 HTTP 头 */
  extraHeaders?: Record<string, string>;
  /** 是否禁用缓存 */
  disableCache?: boolean;
  /** 是否禁用 JavaScript */
  disableJavaScript?: boolean;
  /** 获取页面的超时时间（毫秒），默认 60000 */
  timeout?: number;
  /**
   * 预热 URL：返回 page 前先导航到此 URL 再回到 about:blank，
   * 预热 Chromium 内部的 DNS 缓存 / TLS 会话 / HTTP/2 连接池。
   * 预热失败不会阻塞，page 仍然正常返回。
   */
  warmupUrl?: string;
  /**
   * 可视化模式：以 headed（非无头）方式启动一个独立浏览器，
   * 让用户可以实时看到 Puppeteer 正在操作的页面。
   * headed 浏览器不入池，测试完成后自动关闭。
   * 仅在桌面端（Electron）有效。
   */
  headed?: boolean;
  /**
   * 引擎性能模式：eco/balanced/performance
   * 传入后自动调整池配置（仅桌面端有效）
   */
  engineMode?: string;
}

export interface AcquiredPage {
  page: Page;
  /** 调用 release() 归还页面。页面会被关闭，浏览器留在池中。 */
  release: () => Promise<void>;
}

interface PooledBrowser {
  browser: Browser;
  activePages: number;
  createdAt: number;
  lastUsedAt: number;
}

interface PoolConfig {
  /** 池中最大浏览器实例数，默认 3 */
  maxBrowsers: number;
  /** 每个浏览器最大并发页面数，默认 5 */
  maxPagesPerBrowser: number;
  /** 全局最大并发页面数，默认 10 */
  maxTotalPages: number;
  /** 浏览器空闲超时（毫秒），超时后自动关闭，默认 5 分钟 */
  idleTimeoutMs: number;
  /** 浏览器最大存活时间（毫秒），超时后强制回收，默认 30 分钟 */
  maxLifetimeMs: number;
  /** 浏览器启动参数 */
  launchArgs: string[];
}

const DEFAULT_CONFIG: PoolConfig = {
  maxBrowsers: 3,
  maxPagesPerBrowser: 5,
  maxTotalPages: 10,
  idleTimeoutMs: 5 * 60 * 1000,
  maxLifetimeMs: 30 * 60 * 1000,
  launchArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--no-first-run',
    '--metrics-recording-only',
  ],
};

// Electron 桌面端引擎性能模式预设
// 用户可通过前端高级设置中的「引擎性能」选择器切换
const ENGINE_MODE_PRESETS: Record<string, Partial<PoolConfig>> = {
  /** 节能模式：适合低配设备或后台运行 */
  eco: {
    maxBrowsers: 1,
    maxPagesPerBrowser: 3,
    maxTotalPages: 3,
    idleTimeoutMs: 2 * 60 * 1000,
    maxLifetimeMs: 10 * 60 * 1000,
  },
  /** 平衡模式（默认）：兼顾并发与内存 */
  balanced: {
    maxBrowsers: 2,
    maxPagesPerBrowser: 5,
    maxTotalPages: 8,
    idleTimeoutMs: 5 * 60 * 1000,
    maxLifetimeMs: 20 * 60 * 1000,
  },
  /** 高性能模式：适合高配设备，最大化并发 */
  performance: {
    maxBrowsers: 3,
    maxPagesPerBrowser: 8,
    maxTotalPages: 12,
    idleTimeoutMs: 8 * 60 * 1000,
    maxLifetimeMs: 30 * 60 * 1000,
  },
};

// Electron 桌面端默认使用平衡模式
const ELECTRON_CONFIG: Partial<PoolConfig> = ENGINE_MODE_PRESETS.balanced;

// Electron 额外启动参数：优化 headless 稳定性
const ELECTRON_EXTRA_ARGS = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--disable-features=TranslateUI',
  '--disable-ipc-flooding-protection',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--disable-hang-monitor',
  '--disable-prompt-on-repost',
  '--disable-domain-reliability',
  '--disable-component-update',
];

const MAX_LAUNCH_RETRIES = 2;
const LAUNCH_RETRY_DELAY_MS = 1000;
const ACQUIRE_PAGE_TIMEOUT_MS = 60_000;
const HEALTH_CHECK_INTERVAL_MS = 30_000;
/** headed 可视化浏览器最大并发数，防止多引擎同时 headed 导致内存爆炸 */
const MAX_HEADED_BROWSERS = 2;
/** 等待队列中获取浏览器的超时时间（毫秒） */
const ACQUIRE_BROWSER_WAIT_TIMEOUT_MS = 45_000;

/**
 * 检测当前是否运行在 Electron 环境中
 */
function isElectronRuntime(): boolean {
  return !!(
    typeof process !== 'undefined' &&
    process.versions &&
    (process.versions as Record<string, string>).electron
  );
}

/**
 * 多级 Chromium 路径发现
 * 按优先级尝试：
 * 1. 环境变量 PUPPETEER_EXECUTABLE_PATH / CHROME_PATH
 * 2. Electron 内置 Chromium (app.getPath('exe'))
 * 3. 常见系统安装路径
 */
function discoverChromiumPath(): { path: string | undefined; source: string } {
  // 1. 环境变量（用户显式指定，最高优先级）
  const envPaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    process.env.CHROMIUM_PATH,
  ].filter(Boolean) as string[];
  for (const p of envPaths) {
    if (existsSync(p)) {
      return { path: p, source: 'env-variable' };
    }
  }

  // 2. Electron 内置 Chromium（桌面端核心路径，复用 Electron 自带的 Chromium）
  if (isElectronRuntime()) {
    try {
      const { app } = require('electron');
      const exePath = app.getPath('exe');
      if (exePath && existsSync(exePath)) {
        return { path: exePath, source: 'electron-exe' };
      }
    } catch {
      /* not in main process */
    }
  }

  // 3. 常见系统路径 (Windows)
  if (process.platform === 'win32') {
    const candidates = [
      join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];
    for (const p of candidates) {
      if (p && existsSync(p)) {
        return { path: p, source: 'system-chrome' };
      }
    }
  }

  // 4. macOS
  if (process.platform === 'darwin') {
    const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (existsSync(macPath)) {
      return { path: macPath, source: 'system-chrome' };
    }
  }

  // 5. Linux
  if (process.platform === 'linux') {
    const linuxCandidates = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ];
    for (const p of linuxCandidates) {
      if (existsSync(p)) {
        return { path: p, source: 'system-chrome' };
      }
    }
  }

  return { path: undefined, source: 'none' };
}

class PuppeteerPool {
  private config: PoolConfig;
  private puppeteerModule: PuppeteerModule | null = null;
  private moduleLoadAttempted = false;
  private browserLaunchVerified = false;
  private puppeteerAvailable = false;
  private electronMode = false;
  private currentEngineMode = 'balanced';
  private chromiumPath: string | undefined = undefined;
  private chromiumSource = 'none';
  private chromiumVersion: string | null = null;
  private pool: PooledBrowser[] = [];
  private totalActivePages = 0;
  private waitQueue: Array<{
    resolve: (value: PooledBrowser) => void;
    reject: (reason: Error) => void;
  }> = [];
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private shuttingDown = false;

  private launchFailures = 0;
  private lastLaunchError: string | null = null;
  private totalPagesServed = 0;
  private totalLaunchAttempts = 0;
  /** 当前活跃的 headed 浏览器数量 */
  private activeHeadedBrowsers = 0;

  constructor(config?: Partial<PoolConfig>) {
    // Electron 模式自动应用低资源配置
    this.electronMode = isElectronRuntime();
    const electronOverrides = this.electronMode ? ELECTRON_CONFIG : {};
    this.config = { ...DEFAULT_CONFIG, ...electronOverrides, ...config };
    this.startCleanupTimer();
    this.registerShutdownHooks();
  }

  // ── 公共 API ──

  /**
   * 服务启动时调用，预加载 Puppeteer 模块并验证 Chromium 可用性。
   * 不会抛出异常——加载失败只会打印警告日志。
   */
  async preload(): Promise<boolean> {
    console.log('── Puppeteer 浏览器池初始化 ──');
    console.log(`  运行模式: ${this.electronMode ? 'Electron 桌面端' : '云端/服务器'}`);
    console.log(
      `  池配置: ${this.config.maxBrowsers} 浏览器 × ${this.config.maxPagesPerBrowser} 页面/浏览器, 最大 ${this.config.maxTotalPages} 页面`
    );

    // 1. 加载 puppeteer 模块
    try {
      await this.loadPuppeteer();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ Puppeteer 模块加载失败: ${msg}`);
      console.warn(
        '⚠️ 部分测试（Performance/SEO/Compatibility/Accessibility/UX/Security）将使用降级模式'
      );
      return false;
    }

    // 2. 发现 Chromium 路径
    const discovery = discoverChromiumPath();
    this.chromiumPath = discovery.path;
    this.chromiumSource = discovery.source;
    console.log(
      `  Chromium 路径: ${this.chromiumPath || '(将使用 puppeteer 内置)'} [来源: ${this.chromiumSource}]`
    );

    // 3. 验证性启动：实际启动浏览器确认 Chromium 可运行
    if (!this.puppeteerModule) {
      console.error('❌ Puppeteer 模块未正确加载');
      return false;
    }
    try {
      const pup = this.puppeteerModule;
      const pooled = await this.launchBrowser(pup);

      // 获取浏览器版本号验证连接正常
      try {
        this.chromiumVersion = await pooled.browser.version();
        console.log(`  Chromium 版本: ${this.chromiumVersion}`);
      } catch {
        this.chromiumVersion = 'unknown';
      }

      this.browserLaunchVerified = true;
      pooled.lastUsedAt = Date.now();

      // 4. 页面级预热：创建一个页面并导航到 about:blank，预热 V8 JIT / 进程池 / 页面生命周期
      // 所有依赖 Puppeteer 的引擎（Performance/SEO/Security/Compatibility/UX/Accessibility）均受益
      try {
        const warmPage = await pooled.browser.newPage();
        await warmPage.goto('about:blank', { waitUntil: 'load', timeout: 5000 });
        await warmPage.close();
        console.log('  页面预热完成（V8 JIT / 进程池已就绪）');
      } catch {
        console.warn('  页面预热跳过（不影响后续使用）');
      }

      console.log('✅ Puppeteer 浏览器池已就绪（Chromium 启动验证通过）');
      return true;
    } catch (warmErr) {
      const warmMsg = warmErr instanceof Error ? warmErr.message : String(warmErr);
      console.error(`❌ Chromium 启动失败: ${warmMsg}`);
      console.warn('⚠️ Puppeteer 模块已加载但浏览器无法启动，后续测试会再次尝试');

      // 如果 Electron 模式 Chromium 路径无效，尝试不指定路径（让 puppeteer-core 自己找）
      if (this.electronMode && this.chromiumPath) {
        console.log('  尝试不指定 executablePath 回退启动...');
        const originalPath = this.chromiumPath;
        this.chromiumPath = undefined;
        this.chromiumSource = 'fallback-auto';
        try {
          const pup = this.puppeteerModule;
          const pooled = await this.launchBrowser(pup);
          try {
            this.chromiumVersion = await pooled.browser.version();
          } catch {
            this.chromiumVersion = 'unknown';
          }
          this.browserLaunchVerified = true;
          pooled.lastUsedAt = Date.now();
          console.log(`✅ 回退启动成功 (Chromium 版本: ${this.chromiumVersion})`);
          return true;
        } catch {
          // 回退也失败，恢复原始路径以便后续诊断
          this.chromiumPath = originalPath;
          this.chromiumSource = 'electron-exe';
          console.error('  回退启动也失败');
        }
      }

      return false;
    }
  }

  /**
   * 检查 puppeteer 是否可用
   * 综合判断：模块已加载 + 浏览器启动验证通过（或至少模块可用）
   */
  async isAvailable(): Promise<boolean> {
    // 如果已经验证过浏览器可以启动，直接返回 true
    if (this.browserLaunchVerified) return true;

    // 如果还没尝试过加载模块，先加载
    if (!this.moduleLoadAttempted) {
      try {
        await this.loadPuppeteer();
      } catch {
        return false;
      }
    }

    return this.puppeteerAvailable;
  }

  /**
   * 获取一个已配置的页面。使用完毕后必须调用 release()。
   * 内置超时保护（默认 60s）防止无限等待。
   */
  async acquirePage(options?: AcquirePageOptions): Promise<AcquiredPage> {
    if (this.shuttingDown) {
      throw new Error('PuppeteerPool 正在关闭，无法获取新页面');
    }

    const timeoutMs = options?.timeout ?? ACQUIRE_PAGE_TIMEOUT_MS;

    // 超时保护：使用 Promise.race 避免 async executor lint 问题
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `acquirePage 超时（${Math.round(timeoutMs / 1000)}s），可能 Chromium 启动卡住或并发过高`
          )
        );
      }, timeoutMs);
    });

    const result = await Promise.race([this._acquirePageInternal(options), timeoutPromise]);
    this.totalPagesServed++;
    return result;
  }

  /**
   * 获取池状态（可用于前端展示和诊断）
   */
  getStats() {
    return {
      available: this.puppeteerAvailable,
      browserLaunchVerified: this.browserLaunchVerified,
      electronMode: this.electronMode,
      chromiumPath: this.chromiumPath || null,
      chromiumSource: this.chromiumSource,
      chromiumVersion: this.chromiumVersion,
      browsers: this.pool.length,
      totalActivePages: this.totalActivePages,
      waitQueueLength: this.waitQueue.length,
      launchFailures: this.launchFailures,
      totalLaunchAttempts: this.totalLaunchAttempts,
      lastLaunchError: this.lastLaunchError,
      totalPagesServed: this.totalPagesServed,
      activeHeadedBrowsers: this.activeHeadedBrowsers,
      maxHeadedBrowsers: MAX_HEADED_BROWSERS,
      config: {
        maxBrowsers: this.config.maxBrowsers,
        maxPagesPerBrowser: this.config.maxPagesPerBrowser,
        maxTotalPages: this.config.maxTotalPages,
      },
    };
  }

  /**
   * 根据前端传来的引擎性能模式动态调整池配置。
   * 仅在 Electron 模式下有效，不会中断正在运行的测试。
   * 新配置会在下次启动浏览器时生效。
   */
  applyEngineMode(mode: string): void {
    if (!this.electronMode) return;
    const preset = ENGINE_MODE_PRESETS[mode];
    if (!preset) {
      console.warn(`[PuppeteerPool] 未知引擎模式 "${mode}"，保持当前配置`);
      return;
    }
    const oldMode = this.currentEngineMode;
    if (oldMode === mode) return; // 无变化
    this.currentEngineMode = mode;
    this.config = { ...this.config, ...preset };
    console.log(
      `[PuppeteerPool] 引擎模式切换: ${oldMode} → ${mode} ` +
        `(${this.config.maxBrowsers}浏览器 × ${this.config.maxPagesPerBrowser}页面, ` +
        `总上限 ${this.config.maxTotalPages})`
    );
  }

  /**
   * 完全重置池状态，用于错误恢复。
   * 关闭所有浏览器，清除模块加载缓存，下次使用时重新初始化。
   */
  async reset(): Promise<void> {
    console.log('[PuppeteerPool] 执行完全重置...');
    await this.shutdown();

    // 重置所有状态，允许重新加载和验证
    this.puppeteerModule = null;
    this.moduleLoadAttempted = false;
    this.browserLaunchVerified = false;
    this.puppeteerAvailable = false;
    this.chromiumPath = undefined;
    this.chromiumSource = 'none';
    this.chromiumVersion = null;
    this.launchFailures = 0;
    this.lastLaunchError = null;
    this.shuttingDown = false;

    // 重新启动清理定时器
    this.startCleanupTimer();

    console.log('[PuppeteerPool] 重置完成，下次使用时将重新初始化');
  }

  /**
   * 关闭所有浏览器实例并清理资源
   */
  async shutdown(): Promise<void> {
    this.shuttingDown = true;

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // 拒绝所有等待中的请求
    for (const waiter of this.waitQueue) {
      waiter.reject(new Error('PuppeteerPool 正在关闭'));
    }
    this.waitQueue = [];

    // 关闭所有浏览器（带超时保护）
    const closePromises = this.pool.map(async pooled => {
      try {
        await Promise.race([pooled.browser.close(), new Promise(r => setTimeout(r, 5000))]);
      } catch {
        // 忽略关闭错误
      }
    });
    await Promise.allSettled(closePromises);

    this.pool = [];
    this.totalActivePages = 0;
  }

  // ── 内部方法 ──

  private async _acquirePageInternal(options?: AcquirePageOptions): Promise<AcquiredPage> {
    // 自动应用引擎性能模式（仅桌面端有效，首次或模式变更时生效）
    if (options?.engineMode) {
      this.applyEngineMode(options.engineMode);
    }

    const pup = await this.loadPuppeteer();

    // ── headed 可视化模式：启动独立 headed 浏览器（不入池），仅桌面端有效 ──
    if (options?.headed && this.electronMode) {
      const headedPage = await this.launchHeadedBrowser(pup, options);
      return headedPage;
    }

    // 尝试获取页面，浏览器崩溃时自动重试一次（启动新浏览器）
    for (let attempt = 0; attempt < 2; attempt++) {
      const pooled = await this.acquireBrowser(pup);

      // 验证浏览器仍然存活
      if (!(await this.isBrowserAlive(pooled))) {
        this.removeBrowser(pooled);
        console.warn('[PuppeteerPool] 浏览器已失效，启动新浏览器');
        continue;
      }

      let page: Page;
      try {
        page = await pooled.browser.newPage();
      } catch (error) {
        // 浏览器可能已崩溃，移除并重试
        this.removeBrowser(pooled);
        if (attempt === 0) {
          console.warn(
            `[PuppeteerPool] 创建页面失败，尝试启动新浏览器: ${error instanceof Error ? error.message : String(error)}`
          );
          continue;
        }
        throw new Error(
          `创建页面失败（已重试）: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      pooled.activePages++;
      pooled.lastUsedAt = Date.now();
      this.totalActivePages++;

      // 配置页面
      try {
        await this.configurePage(page, options);
      } catch {
        await this.releasePage(pooled, page);
        throw new Error('页面配置失败');
      }

      // 预热目标 URL 的网络栈（DNS/TLS/HTTP2 连接池）
      if (options?.warmupUrl) {
        try {
          await page.goto(options.warmupUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.goto('about:blank', { waitUntil: 'load', timeout: 3000 });
        } catch {
          // 预热失败不阻塞，页面仍可正常使用
          try {
            await page.goto('about:blank', { timeout: 3000 });
          } catch {
            /* ignore */
          }
        }
      }

      const released = { done: false };
      const release = async () => {
        if (released.done) return;
        released.done = true;
        await this.releasePage(pooled, page);
      };

      return { page, release };
    }

    throw new Error('获取浏览器页面失败（所有重试均已耗尽）');
  }

  private async loadPuppeteer(): Promise<PuppeteerModule> {
    if (this.puppeteerModule) return this.puppeteerModule;

    this.moduleLoadAttempted = true;

    try {
      // Electron 模式优先尝试 puppeteer-core（不捆绑 Chromium），回退到 puppeteer
      // 注意：必须使用 require() 而非 import()，因为 engineBundle 是 CJS 格式，
      // 动态 import() 在 Electron asar 打包环境中无法正确解析模块路径
      let mod: Record<string, unknown>;
      if (this.electronMode) {
        try {
          // @ts-ignore - puppeteer-core is only available in Electron environment
          mod = require('puppeteer-core');
        } catch {
          mod = require('puppeteer');
        }
      } else {
        try {
          mod = require('puppeteer');
        } catch {
          mod = await import('puppeteer');
        }
      }
      this.puppeteerModule = (mod.default ?? mod) as unknown as PuppeteerModule;
      this.puppeteerAvailable = true;
      return this.puppeteerModule;
    } catch (err) {
      this.puppeteerAvailable = false;
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Puppeteer 加载失败（可能缺少 Chromium 二进制文件）: ${msg}。请尝试: npx puppeteer browsers install chrome`
      );
    }
  }

  private async acquireBrowser(pup: PuppeteerModule): Promise<PooledBrowser> {
    // 1. 尝试找一个有空闲容量的浏览器
    const available = this.pool.find(p => p.activePages < this.config.maxPagesPerBrowser);
    if (available && this.totalActivePages < this.config.maxTotalPages) {
      return available;
    }

    // 2. 如果池未满且全局页面数未达上限，启动新浏览器
    if (
      this.pool.length < this.config.maxBrowsers &&
      this.totalActivePages < this.config.maxTotalPages
    ) {
      return this.launchBrowser(pup);
    }

    // 3. 全局页面数已满，排队等待
    return new Promise<PooledBrowser>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waitQueue.findIndex(w => w.resolve === resolve);
        if (idx !== -1) this.waitQueue.splice(idx, 1);
        reject(
          new Error(`获取浏览器超时（${ACQUIRE_BROWSER_WAIT_TIMEOUT_MS / 1000}s），并发数已达上限`)
        );
      }, ACQUIRE_BROWSER_WAIT_TIMEOUT_MS);

      this.waitQueue.push({
        resolve: (pooled: PooledBrowser) => {
          clearTimeout(timer);
          resolve(pooled);
        },
        reject: (err: Error) => {
          clearTimeout(timer);
          reject(err);
        },
      });
    });
  }

  /**
   * 启动一个独立的 headed（可视化）浏览器，不入池。
   * 用户可以实时看到 Puppeteer 正在操作的页面。
   * release() 时整个浏览器会被关闭。
   *
   * 安全保障：
   * - 并发上限：超过 MAX_HEADED_BROWSERS 时自动回退 headless
   * - 最大存活超时：10 分钟未 release 自动关闭，防止泄漏
   * - disconnected 监听：浏览器意外退出时自动递减计数器
   * - 启动失败兜底：launch/newPage 失败时确保计数器一致
   */
  private async launchHeadedBrowser(
    pup: PuppeteerModule,
    options?: AcquirePageOptions
  ): Promise<AcquiredPage> {
    // 并发保护：限制同时运行的 headed 浏览器数量，防止多引擎同时 headed 导致内存爆炸
    if (this.activeHeadedBrowsers >= MAX_HEADED_BROWSERS) {
      console.warn(
        `[PuppeteerPool] headed 浏览器已达上限 (${MAX_HEADED_BROWSERS})，回退为 headless 模式`
      );
      return this._acquirePageInternal({ ...options, headed: false });
    }

    this.activeHeadedBrowsers++;
    console.log(
      `[PuppeteerPool] 启动可视化浏览器（headed ${this.activeHeadedBrowsers}/${MAX_HEADED_BROWSERS}）`
    );

    const headedArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--no-first-run',
    ];

    const launchOptions: Record<string, unknown> = {
      headless: false,
      args: headedArgs,
      defaultViewport: null,
      timeout: 20000,
    };

    if (this.chromiumPath) {
      launchOptions.executablePath = this.chromiumPath;
    }

    // ── 启动失败兜底：确保计数器一致 ──
    let browser: Browser;
    try {
      console.log(`[PuppeteerPool] 正在启动可视化浏览器...`);
      console.log(`[PuppeteerPool] Chromium 路径: ${this.chromiumPath || '使用内置'}`);
      browser = await pup.launch(launchOptions);
      console.log(`[PuppeteerPool] ✓ 浏览器启动成功`);
    } catch (launchErr) {
      this.activeHeadedBrowsers = Math.max(0, this.activeHeadedBrowsers - 1);
      const errMsg = launchErr instanceof Error ? launchErr.message : String(launchErr);
      console.error(`[PuppeteerPool] ✗ 浏览器启动失败: ${errMsg}`);
      console.error(`[PuppeteerPool] 诊断信息:`);
      console.error(`  - Chromium 路径: ${this.chromiumPath || '未设置（使用内置）'}`);
      console.error(`  - 启动参数: ${JSON.stringify(headedArgs)}`);
      console.error(
        `  - 建议: 1) 检查 Chromium 是否已安装 2) 尝试设置 PUPPETEER_EXECUTABLE_PATH 环境变量`
      );
      throw new Error(
        `可视化浏览器启动失败: ${errMsg}。请检查 Chromium 安装或查看日志获取详细信息。`
      );
    }

    let page: Page;
    try {
      console.log(`[PuppeteerPool] 正在创建页面...`);
      page = await browser.newPage();
      console.log(`[PuppeteerPool] ✓ 页面创建成功`);
    } catch (pageErr) {
      this.activeHeadedBrowsers = Math.max(0, this.activeHeadedBrowsers - 1);
      const errMsg = pageErr instanceof Error ? pageErr.message : String(pageErr);
      console.error(`[PuppeteerPool] ✗ 页面创建失败: ${errMsg}`);
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
      throw new Error(`创建浏览器页面失败: ${errMsg}`);
    }

    // 配置页面（视口、UA 等）
    await this.configurePage(page, options);

    // warmupUrl 预热
    if (options?.warmupUrl) {
      try {
        await page.goto(options.warmupUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.goto('about:blank', { waitUntil: 'load', timeout: 3000 });
      } catch {
        try {
          await page.goto('about:blank', { timeout: 3000 });
        } catch {
          /* ignore */
        }
      }
    }

    const released = { done: false };
    const doRelease = async () => {
      if (released.done) return;
      released.done = true;
      clearTimeout(maxLifetimeTimer);
      this.activeHeadedBrowsers = Math.max(0, this.activeHeadedBrowsers - 1);
      try {
        await Promise.race([browser.close(), new Promise(r => setTimeout(r, 5000))]);
      } catch {
        /* ignore */
      }
      console.log(
        `[PuppeteerPool] 可视化浏览器已关闭（剩余 ${this.activeHeadedBrowsers}/${MAX_HEADED_BROWSERS}）`
      );
    };

    // ── 安全网 1：最大存活超时（10 分钟），防止引擎异常退出未 release ──
    const HEADED_MAX_LIFETIME_MS = 10 * 60 * 1000;
    const maxLifetimeTimer = setTimeout(() => {
      if (!released.done) {
        console.warn('[PuppeteerPool] headed 浏览器存活超时（10min），自动关闭');
        doRelease().catch(err => {
          console.error('[PuppeteerPool] Failed to release headed browser on timeout:', err);
        });
      }
    }, HEADED_MAX_LIFETIME_MS);
    if (typeof maxLifetimeTimer === 'object' && 'unref' in maxLifetimeTimer) {
      (maxLifetimeTimer as NodeJS.Timeout).unref();
    }

    // ── 安全网 2：浏览器意外退出时自动清理 ──
    browser.on('disconnected', () => {
      if (!released.done) {
        console.warn('[PuppeteerPool] headed 浏览器意外断开，自动清理');
        released.done = true;
        clearTimeout(maxLifetimeTimer);
        this.activeHeadedBrowsers = Math.max(0, this.activeHeadedBrowsers - 1);
      }
    });

    return { page, release: doRelease };
  }

  private async launchBrowser(pup: PuppeteerModule): Promise<PooledBrowser> {
    this.totalLaunchAttempts++;

    const launchOptions: Record<string, unknown> = {
      headless: true,
      args: this.config.launchArgs,
    };

    // Electron 模式或有自定义 Chromium 路径
    if (this.chromiumPath) {
      launchOptions.executablePath = this.chromiumPath;
    }

    if (this.electronMode) {
      launchOptions.headless = 'new';
      const allArgs = new Set([...this.config.launchArgs, ...ELECTRON_EXTRA_ARGS]);
      launchOptions.args = [...allArgs];
      launchOptions.timeout = 20000;
      launchOptions.defaultViewport = null;
    }

    // 带重试的浏览器启动
    let browser: Browser | null = null;
    let lastErr: Error | null = null;
    for (let retry = 0; retry <= MAX_LAUNCH_RETRIES; retry++) {
      try {
        browser = await pup.launch(launchOptions);
        this.launchFailures = Math.max(0, this.launchFailures - 1);
        this.lastLaunchError = null;
        break;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        this.launchFailures++;
        this.lastLaunchError = lastErr.message;
        if (retry < MAX_LAUNCH_RETRIES) {
          console.warn(
            `[PuppeteerPool] 浏览器启动失败 (${retry + 1}/${MAX_LAUNCH_RETRIES + 1})，${LAUNCH_RETRY_DELAY_MS * (retry + 1)}ms 后重试: ${lastErr.message}`
          );
          await new Promise(r => setTimeout(r, LAUNCH_RETRY_DELAY_MS * (retry + 1)));
        }
      }
    }

    if (!browser) {
      throw new Error(
        `浏览器启动失败（${MAX_LAUNCH_RETRIES + 1} 次尝试均失败）: ${lastErr?.message || '未知错误'}`
      );
    }

    // 首次启动成功后标记验证通过
    if (!this.browserLaunchVerified) {
      this.browserLaunchVerified = true;
    }

    // 监听浏览器断开事件
    browser.on('disconnected', () => {
      const idx = this.pool.findIndex(p => p.browser === browser);
      if (idx !== -1) {
        const removed = this.pool.splice(idx, 1)[0];
        this.totalActivePages = Math.max(0, this.totalActivePages - removed.activePages);
        console.warn(
          `[PuppeteerPool] 浏览器实例意外断开 (活跃页面: ${removed.activePages})，已从池中移除`
        );
      }
      // 唤醒等待队列中被阻塞的请求（让他们触发新浏览器启动）
      this.drainWaitQueueOnDisconnect();
    });

    const pooled: PooledBrowser = {
      browser,
      activePages: 0,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    this.pool.push(pooled);
    return pooled;
  }

  /**
   * 检查浏览器是否仍然存活
   */
  private async isBrowserAlive(pooled: PooledBrowser): Promise<boolean> {
    try {
      await pooled.browser.version();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 浏览器断连后，唤醒等待队列让请求有机会启动新浏览器
   */
  private drainWaitQueueOnDisconnect(): void {
    if (this.waitQueue.length === 0) return;
    // 找一个可用的浏览器给队列中的第一个等待者
    const available = this.pool.find(p => p.activePages < this.config.maxPagesPerBrowser);
    if (available) {
      const waiter = this.waitQueue.shift();
      if (waiter) waiter.resolve(available);
    }
    // 如果没有可用浏览器但池未满，等待者会在下次 acquireBrowser 中触发 launchBrowser
  }

  private async releasePage(pooled: PooledBrowser, page: Page): Promise<void> {
    // 关闭页面（带超时保护）
    try {
      if (!page.isClosed()) {
        await Promise.race([page.close(), new Promise(r => setTimeout(r, 5000))]);
      }
    } catch {
      // 忽略关闭错误
    }

    pooled.activePages = Math.max(0, pooled.activePages - 1);
    pooled.lastUsedAt = Date.now();
    this.totalActivePages = Math.max(0, this.totalActivePages - 1);

    // 唤醒等待队列中的第一个请求
    if (this.waitQueue.length > 0) {
      const available = this.pool.find(p => p.activePages < this.config.maxPagesPerBrowser);
      if (available) {
        const waiter = this.waitQueue.shift();
        if (waiter) waiter.resolve(available);
      }
    }
  }

  private removeBrowser(pooled: PooledBrowser): void {
    const idx = this.pool.indexOf(pooled);
    if (idx !== -1) {
      this.pool.splice(idx, 1);
      this.totalActivePages = Math.max(0, this.totalActivePages - pooled.activePages);
    }
    try {
      Promise.race([pooled.browser.close(), new Promise(r => setTimeout(r, 5000))]).catch(err => {
        console.error('[PuppeteerPool] Failed to close browser:', err);
      });
    } catch {
      // ignore
    }
  }

  private async configurePage(page: Page, options?: AcquirePageOptions): Promise<void> {
    const width = options?.width ?? 1920;
    const height = options?.height ?? 1080;

    await page.setViewport({
      width,
      height,
      deviceScaleFactor: options?.deviceScaleFactor ?? 1,
      isMobile: options?.isMobile ?? false,
    });

    if (options?.userAgent) {
      await page.setUserAgent(options.userAgent);
    }

    if (options?.extraHeaders) {
      await page.setExtraHTTPHeaders(options.extraHeaders);
    }

    if (options?.disableCache && typeof page.setCacheEnabled === 'function') {
      await page.setCacheEnabled(false);
    }

    if (options?.disableJavaScript) {
      await page.setJavaScriptEnabled(false);
    }
  }

  /**
   * 定期清理：空闲/过期浏览器回收 + 僵死浏览器检测
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(err => {
        console.error('[PuppeteerPool] Cleanup failed:', err);
      });
    }, HEALTH_CHECK_INTERVAL_MS);

    // 不阻止进程退出
    if (
      this.cleanupTimer &&
      typeof this.cleanupTimer === 'object' &&
      'unref' in this.cleanupTimer
    ) {
      (this.cleanupTimer as NodeJS.Timeout).unref();
    }
  }

  private async cleanup(): Promise<void> {
    if (this.shuttingDown) return;

    const now = Date.now();
    const toRemove: PooledBrowser[] = [];

    for (const pooled of this.pool) {
      // 僵死检测：无活跃页面时 ping 浏览器
      if (pooled.activePages === 0) {
        const alive = await this.isBrowserAlive(pooled);
        if (!alive) {
          console.warn('[PuppeteerPool] 检测到僵死浏览器，将移除');
          toRemove.push(pooled);
          continue;
        }
      }

      // 超过最大存活时间且无活跃页面 → 回收
      if (now - pooled.createdAt > this.config.maxLifetimeMs && pooled.activePages === 0) {
        toRemove.push(pooled);
        continue;
      }
      // 空闲超时且无活跃页面 → 回收
      if (now - pooled.lastUsedAt > this.config.idleTimeoutMs && pooled.activePages === 0) {
        toRemove.push(pooled);
      }
    }

    for (const pooled of toRemove) {
      this.removeBrowser(pooled);
    }
  }

  private registerShutdownHooks(): void {
    const handler = () => {
      this.shutdown().catch(err => {
        console.error('[PuppeteerPool] Shutdown failed:', err);
      });
    };

    process.once('SIGINT', handler);
    process.once('SIGTERM', handler);
    process.once('beforeExit', handler);
  }
}

/** 全局单例 */
export const puppeteerPool = new PuppeteerPool();

export default PuppeteerPool;
