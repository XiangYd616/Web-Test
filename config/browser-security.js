/**
 * 浏览器安全配置管理
 * 用于统一管理所有浏览器自动化工具的安全设置
 */

class BrowserSecurityConfig {
  constructor() {
    this.isContainerEnv = this.detectContainerEnvironment();
    this.isCIEnv = this.detectCIEnvironment();
    this.isRootUser = this.detectRootUser();
  }

  /**
   * 检测是否在容器环境中运行
   */
  detectContainerEnvironment() {
    return (
      process.env.DOCKER_ENV === 'true' ||
      process.env.CONTAINER === 'true' ||
      require('fs').existsSync('/.dockerenv')
    );
  }

  /**
   * 检测是否在CI环境中运行
   */
  detectCIEnvironment() {
    return (
      process.env.CI === 'true' ||
      process.env.GITHUB_ACTIONS === 'true' ||
      process.env.GITLAB_CI === 'true' ||
      process.env.JENKINS_URL ||
      process.env.TRAVIS === 'true'
    );
  }

  /**
   * 检测是否以root用户运行
   */
  detectRootUser() {
    try {
      return process.getuid && process.getuid() === 0;
    } catch {
      return false; // Windows环境
    }
  }

  /**
   * 获取Puppeteer安全配置
   */
  getPuppeteerConfig() {
    const args = [
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection'
    ];

    // 仅在必要时添加不安全的标志
    if (this.requiresNoSandbox()) {
      console.warn('⚠️ 检测到需要禁用沙盒的环境，启用 --no-sandbox 模式');
      console.warn('🔒 安全提示：这会降低安全性，仅在受信任的环境中使用');
      args.push('--no-sandbox', '--disable-setuid-sandbox');
    }

    return {
      headless: true,
      args,
      ignoreDefaultArgs: ['--disable-extensions']
    };
  }

  /**
   * 获取Chrome Launcher安全配置
   */
  getChromeLauncherConfig() {
    const chromeFlags = [
      '--headless',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI'
    ];

    if (this.requiresNoSandbox()) {
      console.warn('⚠️ 检测到需要禁用沙盒的环境，启用 --no-sandbox 模式');
      chromeFlags.push('--no-sandbox', '--disable-setuid-sandbox');
    }

    return {
      chromeFlags
    };
  }

  /**
   * 获取Lighthouse命令行标志
   */
  getLighthouseFlags() {
    let chromeFlags = '--headless --disable-gpu --disable-dev-shm-usage --disable-extensions';

    if (this.requiresNoSandbox()) {
      console.warn('⚠️ 检测到需要禁用沙盒的环境，启用 --no-sandbox 模式');
      chromeFlags += ' --no-sandbox --disable-setuid-sandbox';
    }

    return chromeFlags;
  }

  /**
   * 获取Playwright安全配置
   */
  getPlaywrightConfig() {
    const args = [
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-background-timer-throttling'
    ];

    if (this.requiresNoSandbox()) {
      console.warn('⚠️ 检测到需要禁用沙盒的环境，启用 --no-sandbox 模式');
      args.push('--no-sandbox');
    }

    return {
      headless: true,
      args
    };
  }

  /**
   * 判断是否需要禁用沙盒
   */
  requiresNoSandbox() {
    return this.isContainerEnv || this.isCIEnv || this.isRootUser;
  }

  /**
   * 获取环境信息
   */
  getEnvironmentInfo() {
    return {
      isContainer: this.isContainerEnv,
      isCI: this.isCIEnv,
      isRoot: this.isRootUser,
      requiresNoSandbox: this.requiresNoSandbox(),
      platform: process.platform,
      nodeVersion: process.version
    };
  }

  /**
   * 打印安全警告
   */
  printSecurityWarning() {
    if (this.requiresNoSandbox()) {
      console.log('⚠️  当前环境需要禁用Chrome沙盒机制');
    }
  }
}

// 兼容 CommonJS 和 ES 模块
const browserSecurityInstance = new BrowserSecurityConfig();

// CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = browserSecurityInstance;
}

// ES 模块导出
if (typeof globalThis !== 'undefined') {
  globalThis.browserSecurity = browserSecurityInstance;
}
