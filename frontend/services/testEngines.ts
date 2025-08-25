// 浏览器兼容的测试引擎接口
// 实际的测试引擎执行将通过API调用后端服务

export interface TestEngine {
  name: string;
  version: string;
  isAvailable: boolean;
  checkAvailability(): Promise<boolean>;
  install(): Promise<boolean>;
  run(config: any): Promise<any>;
}

// K6 性能测试引擎 - 浏览器兼容版本
export class K6Engine implements TestEngine {
  name = 'k6';
  version = '';
  isAvailable = false;
  private lastCheckTime = 0;
  private cacheTimeout = 30000; // 30秒缓存

  async checkAvailability(): Promise<boolean> {
    // 如果缓存还有效，直接返回缓存结果
    const now = Date.now();
    if (now - this.lastCheckTime < this.cacheTimeout) {
      return this.isAvailable;
    }

    try {
      // 通过API检查后端k6引擎状态
      const response = await fetch('/api/test/k6/status');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          this.version = result.data.version || 'unknown';
          this.isAvailable = result.data.available || result.data.isAvailable || false;
          this.lastCheckTime = now;
          return this.isAvailable;
        }
      }
      this.lastCheckTime = now;
      return false;
    } catch (error) {
      // 静默处理，避免控制台噪音
      if (process.env.NODE_ENV === 'development') {
        console.debug('K6 availability check failed (expected in local mode):', error);
      }
      this.isAvailable = false;
      this.lastCheckTime = now;
      return false;
    }
  }

  async install(): Promise<boolean> {
    try {
      console.log('Installing k6...');
      // 通过API请求后端安装k6
      const response = await fetch('/api/test/k6/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        return await this.checkAvailability();
      }
      return false;
    } catch (error) {
      console.error('Failed to install k6:', error);
      return false;
    }
  }

  async run(config: {
    url: string;
    vus: number;
    duration: string;
    testType: string;
  }): Promise<any> {
    try {
      // 通过API调用后端k6测试
      const response = await fetch('/api/test/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `K6 test failed: ${response.status}`);
      }

      const results = await response.json();
      return results.data || results;
    } catch (error) {
      console.error('K6 test failed:', error);
      throw error;
    }
  }
}

// Lighthouse 性能测试引擎 - 浏览器兼容版本
export class LighthouseEngine implements TestEngine {
  name = 'lighthouse';
  version = '';
  isAvailable = false;
  private lastCheckTime = 0;
  private cacheTimeout = 30000; // 30秒缓存

  async checkAvailability(): Promise<boolean> {
    // 如果缓存还有效，直接返回缓存结果
    const now = Date.now();
    if (now - this.lastCheckTime < this.cacheTimeout) {
      return this.isAvailable;
    }

    try {
      const response = await fetch('/api/test/lighthouse/status');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          this.version = result.data.version || 'unknown';
          this.isAvailable = result.data.available || result.data.isAvailable || false;
          this.lastCheckTime = now;
          return this.isAvailable;
        }
      }
      this.lastCheckTime = now;
      return false;
    } catch (error) {
      // 静默处理，避免控制台噪音
      if (process.env.NODE_ENV === 'development') {
        console.debug('Lighthouse availability check failed (expected in local mode):', error);
      }
      this.isAvailable = false;
      this.lastCheckTime = now;
      return false;
    }
  }

  async install(): Promise<boolean> {
    try {
      console.log('Installing Lighthouse...');
      const response = await fetch('/api/test/lighthouse/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        return await this.checkAvailability();
      }
      return false;
    } catch (error) {
      console.error('Failed to install Lighthouse:', error);
      return false;
    }
  }

  async run(config: {
    url: string;
    device: 'desktop' | 'mobile';
    categories: string[];
  }): Promise<any> {
    try {
      const response = await fetch('/api/test/lighthouse/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`Lighthouse test failed: ${response.status}`);
      }

      const results = await response.json();
      return results;
    } catch (error) {
      console.error('Lighthouse test failed:', error);
      throw error;
    }
  }
}

// Playwright 浏览器测试引擎 - 浏览器兼容版本
export class PlaywrightEngine implements TestEngine {
  name = 'playwright';
  version = '';
  isAvailable = false;
  private lastCheckTime = 0;
  private cacheTimeout = 30000; // 30秒缓存

  async checkAvailability(): Promise<boolean> {
    // 如果缓存还有效，直接返回缓存结果
    const now = Date.now();
    if (now - this.lastCheckTime < this.cacheTimeout) {
      return this.isAvailable;
    }

    try {
      const response = await fetch('/api/test/playwright/status');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          this.version = result.data.version || 'unknown';
          this.isAvailable = result.data.available || result.data.isAvailable || false;
          this.lastCheckTime = now;
          return this.isAvailable;
        }
      }
      this.lastCheckTime = now;
      return false;
    } catch (error) {
      // 静默处理，避免控制台噪音
      if (process.env.NODE_ENV === 'development') {
        console.debug('Playwright availability check failed (expected in local mode):', error);
      }
      this.isAvailable = false;
      this.lastCheckTime = now;
      return false;
    }
  }

  async install(): Promise<boolean> {
    try {
      console.log('Installing Playwright...');
      const response = await fetch('/api/test/playwright/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        return await this.checkAvailability();
      }
      return false;
    } catch (error) {
      console.error('Failed to install Playwright:', error);
      return false;
    }
  }

  async run(config: {
    url: string;
    browsers: string[];
    tests: string[];
    viewport?: { width: number; height: number };
  }): Promise<any> {
    try {
      const response = await fetch('/api/test/playwright/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`Playwright test failed: ${response.status}`);
      }

      const results = await response.json();
      return results;
    } catch (error) {
      console.error('Playwright test failed:', error);
      throw error;
    }
  }
}

export class TestEngineManager {
  private engines: Map<string, TestEngine> = new Map();
  private lastCheckAllTime = 0;
  private checkAllCacheTimeout = 30000; // 30秒缓存
  private cachedResults: Record<string, boolean> = {};
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.engines.set('k6', new K6Engine());
    this.engines.set('lighthouse', new LighthouseEngine());
    this.engines.set('playwright', new PlaywrightEngine());
  }

  // 初始化所有引擎
  async initializeEngines(): Promise<void> {
    // 如果已经初始化过，直接返回
    if (this.isInitialized) {
      console.log('🔄 Test engines already initialized');
      return;
    }

    // 如果正在初始化，等待初始化完成
    if (this.initializationPromise) {
      console.log('⏳ Waiting for ongoing initialization...');
      return this.initializationPromise;
    }

    // 开始初始化
    this.initializationPromise = this.doInitialization();
    await this.initializationPromise;
    this.isInitialized = true;
    this.initializationPromise = null;
  }

  private async doInitialization(): Promise<void> {
    console.log('Initializing test engines...');

    for (const [name, engine] of this.engines) {
      try {
        await engine.checkAvailability();
        console.log(`✅ ${name} engine initialized`);
      } catch (error) {
        console.warn(`⚠️ ${name} engine initialization failed:`, error);
      }
    }
  }

  // 获取可用的引擎列表
  getAvailableEngines(): string[] {
    return Array.from(this.engines.keys());
  }

  async checkAllEngines(): Promise<Record<string, boolean>> {
    // 如果缓存还有效，直接返回缓存结果
    const now = Date.now();
    if (now - this.lastCheckAllTime < this.checkAllCacheTimeout && Object.keys(this.cachedResults).length > 0) {
      console.log('🔄 Using cached engine status results');
      return { ...this.cachedResults };
    }

    console.log('🔍 Checking all engines status...');
    const results: Record<string, boolean> = {};

    for (const [name, engine] of this.engines) {
      try {
        results[name] = await engine.checkAvailability();
      } catch (error) {
        console.error(`Failed to check ${name} engine:`, error);
        results[name] = false;
      }
    }

    // 更新缓存
    this.cachedResults = { ...results };
    this.lastCheckAllTime = now;

    return results;
  }

  async installEngine(name: string): Promise<boolean> {
    const engine = this.engines.get(name);
    if (!engine) {
      throw new Error(`Unknown engine: ${name}`);
    }

    try {
      return await engine.install();
    } catch (error) {
      console.error(`Failed to install ${name} engine:`, error);
      return false;
    }
  }

  async runTest(engineName: string, config: any): Promise<any> {
    const engine = this.engines.get(engineName);
    if (!engine) {
      throw new Error(`Unknown engine: ${engineName}`);
    }

    // 检查引擎可用性
    const isAvailable = await engine.checkAvailability();
    if (!isAvailable) {
      throw new Error(`Engine ${engineName} is not available. Please install it first.`);
    }

    return await engine.run(config);
  }

  getEngine(name: string): TestEngine | undefined {
    return this.engines.get(name);
  }

  getAllEngines(): TestEngine[] {
    return Array.from(this.engines.values());
  }

  async getEngineStatus(): Promise<Record<string, { name: string; version: string; isAvailable: boolean }>> {
    const status: Record<string, { name: string; version: string; isAvailable: boolean }> = {};

    for (const [name, engine] of this.engines) {
      try {
        const isAvailable = await engine.checkAvailability();
        status[name] = {
          name: engine.name,
          version: engine.version,
          isAvailable
        };
      } catch (error) {
        status[name] = {
          name: engine.name,
          version: 'unknown',
          isAvailable: false
        };
      }
    }

    return status;
  }

  // 获取推荐的测试引擎
  getRecommendedEngine(testType: string): string {
    switch (testType) {
      case 'performance':
      case 'stress':
        return 'k6';
      case 'seo':
      case 'accessibility':
      case 'ux':
        return 'lighthouse';
      case 'compatibility':
      case 'security':
        return 'playwright';
      default:
        return 'lighthouse';
    }
  }
}

// 导出单例实例
export const testEngineManager = new TestEngineManager();
