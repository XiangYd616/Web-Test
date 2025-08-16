#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class BasicTestCreator {
  constructor() {
    this.projectRoot = process.cwd();
    this.createdTests = [];
  }

  /**
   * 执行基础测试创建
   */
  async execute() {
    console.log('🧪 开始创建基础测试...\n');

    try {
      // 1. 创建单元测试
      await this.createUnitTests();
      
      // 2. 创建集成测试
      await this.createIntegrationTests();
      
      // 3. 创建用户流程测试
      await this.createUserFlowTests();
      
      // 4. 创建测试配置
      await this.createTestConfiguration();

      // 5. 生成测试报告
      this.generateTestReport();

    } catch (error) {
      console.error('❌ 基础测试创建过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 创建单元测试
   */
  async createUnitTests() {
    console.log('🔬 创建单元测试...');

    // 创建测试目录
    const testDir = path.join(this.projectRoot, 'tests/unit');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // 创建API服务测试
    const apiTestContent = `/**
 * API服务单元测试
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const EnhancedTestExecutionService = require('../../backend/services/testing/enhancedTestExecutionService');

describe('EnhancedTestExecutionService', () => {
  let testService;

  beforeEach(() => {
    testService = new EnhancedTestExecutionService();
  });

  afterEach(() => {
    // 清理测试数据
    testService.activeTests.clear();
    testService.testResults.clear();
  });

  describe('generateTestId', () => {
    it('应该生成唯一的测试ID', () => {
      const id1 = testService.generateTestId();
      const id2 = testService.generateTestId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^test_\\d+_[a-z0-9]+$/);
    });
  });

  describe('calculatePerformanceScore', () => {
    it('应该根据加载时间计算正确的性能分数', () => {
      expect(testService.calculatePerformanceScore(500, {})).toBe(100);
      expect(testService.calculatePerformanceScore(1500, {})).toBe(90);
      expect(testService.calculatePerformanceScore(2500, {})).toBe(80);
      expect(testService.calculatePerformanceScore(3500, {})).toBe(70);
    });

    it('分数不应该低于0', () => {
      expect(testService.calculatePerformanceScore(10000, {})).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateSEOScore', () => {
    it('应该根据SEO数据计算正确分数', () => {
      const goodSeoData = {
        hasTitle: true,
        hasMetaDescription: true,
        titleLength: 45,
        metaDescriptionLength: 140,
        h1Tags: ['主标题'],
        images: [{ hasAlt: true }, { hasAlt: true }]
      };

      const score = testService.calculateSEOScore(goodSeoData);
      expect(score).toBe(100);
    });

    it('应该对缺失元素扣分', () => {
      const poorSeoData = {
        hasTitle: false,
        hasMetaDescription: false,
        titleLength: 0,
        metaDescriptionLength: 0,
        h1Tags: [],
        images: [{ hasAlt: false }]
      };

      const score = testService.calculateSEOScore(poorSeoData);
      expect(score).toBe(0);
    });
  });

  describe('calculateSecurityScore', () => {
    it('应该根据安全检查计算正确分数', () => {
      const allSecure = {
        hasHTTPS: true,
        hasHSTS: true,
        hasCSP: true,
        hasXFrameOptions: true,
        hasXContentTypeOptions: true,
        hasReferrerPolicy: true
      };

      expect(testService.calculateSecurityScore(allSecure)).toBe(100);
    });

    it('应该对缺失安全头扣分', () => {
      const noSecurity = {
        hasHTTPS: false,
        hasHSTS: false,
        hasCSP: false,
        hasXFrameOptions: false,
        hasXContentTypeOptions: false,
        hasReferrerPolicy: false
      };

      expect(testService.calculateSecurityScore(noSecurity)).toBe(0);
    });
  });

  describe('getTestStatus', () => {
    it('应该返回活跃测试的状态', () => {
      const testId = 'test_123';
      const testData = { type: 'performance', status: 'running' };
      
      testService.activeTests.set(testId, testData);
      
      expect(testService.getTestStatus(testId)).toEqual(testData);
    });

    it('应该返回已完成测试的结果', () => {
      const testId = 'test_456';
      const testResult = { type: 'seo', status: 'completed', score: 85 };
      
      testService.testResults.set(testId, testResult);
      
      expect(testService.getTestStatus(testId)).toEqual(testResult);
    });

    it('对于不存在的测试应该返回null', () => {
      expect(testService.getTestStatus('nonexistent')).toBeNull();
    });
  });

  describe('cancelTest', () => {
    it('应该能够取消活跃的测试', () => {
      const testId = 'test_789';
      testService.activeTests.set(testId, { status: 'running' });
      
      expect(testService.cancelTest(testId)).toBe(true);
      expect(testService.activeTests.has(testId)).toBe(false);
    });

    it('对于不存在的测试应该返回false', () => {
      expect(testService.cancelTest('nonexistent')).toBe(false);
    });
  });
});`;

    const apiTestPath = path.join(testDir, 'testExecutionService.test.js');
    fs.writeFileSync(apiTestPath, apiTestContent);
    this.createdTests.push('tests/unit/testExecutionService.test.js');

    // 创建数据库服务测试
    const dbTestContent = `/**
 * 数据库服务单元测试
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const DatabaseService = require('../../backend/services/database/databaseService');
const fs = require('fs');
const path = require('path');

describe('DatabaseService', () => {
  let dbService;
  const testDbPath = path.join(__dirname, 'test.db');

  beforeEach(async () => {
    // 使用测试数据库
    dbService = new DatabaseService();
    dbService.dbPath = testDbPath;
    await dbService.init();
  });

  afterEach(async () => {
    // 清理测试数据库
    await dbService.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('saveTestResult', () => {
    it('应该能够保存测试结果', async () => {
      const testResult = {
        testId: 'test_123',
        type: 'performance',
        url: 'https://example.com',
        status: 'completed',
        score: 85,
        data: { loadTime: 1200 }
      };

      const result = await dbService.saveTestResult(testResult);
      expect(result.id).toBeDefined();
      expect(result.changes).toBe(1);
    });
  });

  describe('getTestResult', () => {
    it('应该能够获取保存的测试结果', async () => {
      const testResult = {
        testId: 'test_456',
        type: 'seo',
        url: 'https://example.com',
        status: 'completed',
        score: 90
      };

      await dbService.saveTestResult(testResult);
      const retrieved = await dbService.getTestResult('test_456');

      expect(retrieved).toBeDefined();
      expect(retrieved.test_id).toBe('test_456');
      expect(retrieved.type).toBe('seo');
      expect(retrieved.score).toBe(90);
    });

    it('对于不存在的测试应该返回undefined', async () => {
      const result = await dbService.getTestResult('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getTestHistory', () => {
    it('应该能够获取测试历史', async () => {
      // 添加一些测试数据
      await dbService.saveTestResult({
        testId: 'test_1',
        type: 'performance',
        url: 'https://example1.com',
        status: 'completed',
        score: 80
      });

      await dbService.saveTestResult({
        testId: 'test_2',
        type: 'seo',
        url: 'https://example2.com',
        status: 'completed',
        score: 90
      });

      const history = await dbService.getTestHistory(10, 0);
      expect(history).toHaveLength(2);
      expect(history[0].test_id).toBe('test_2'); // 最新的在前
    });
  });

  describe('deleteTestResult', () => {
    it('应该能够删除测试结果', async () => {
      const testResult = {
        testId: 'test_delete',
        type: 'performance',
        url: 'https://example.com',
        status: 'completed',
        score: 75
      };

      await dbService.saveTestResult(testResult);
      const deleteResult = await dbService.deleteTestResult('test_delete');
      
      expect(deleteResult.changes).toBe(1);
      
      const retrieved = await dbService.getTestResult('test_delete');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('recordTestHistory', () => {
    it('应该能够记录测试历史', async () => {
      const result = await dbService.recordTestHistory('test_123', 'started', { url: 'https://example.com' });
      expect(result.id).toBeDefined();
      expect(result.changes).toBe(1);
    });
  });
});`;

    const dbTestPath = path.join(testDir, 'databaseService.test.js');
    fs.writeFileSync(dbTestPath, dbTestContent);
    this.createdTests.push('tests/unit/databaseService.test.js');

    console.log('   ✅ 单元测试创建完成\n');
  }

  /**
   * 创建集成测试
   */
  async createIntegrationTests() {
    console.log('🔗 创建集成测试...');

    const testDir = path.join(this.projectRoot, 'tests/integration');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const integrationTestContent = `/**
 * API集成测试
 */

const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const request = require('supertest');
const app = require('../../backend/app'); // 假设有Express应用

describe('API集成测试', () => {
  let server;

  beforeAll(async () => {
    // 启动测试服务器
    server = app.listen(0);
  });

  afterAll(async () => {
    // 关闭测试服务器
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('POST /api/test/performance', () => {
    it('应该能够启动性能测试', async () => {
      const response = await request(app)
        .post('/api/test/performance')
        .send({
          url: 'https://example.com',
          config: {}
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.testId).toBeDefined();
    });

    it('应该验证URL参数', async () => {
      const response = await request(app)
        .post('/api/test/performance')
        .send({
          url: 'invalid-url'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/test/:testId/status', () => {
    it('应该能够获取测试状态', async () => {
      // 先创建一个测试
      const createResponse = await request(app)
        .post('/api/test/performance')
        .send({
          url: 'https://example.com'
        });

      const testId = createResponse.body.data.testId;

      // 获取测试状态
      const statusResponse = await request(app)
        .get(\`/api/test/\${testId}/status\`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.testId).toBe(testId);
    });

    it('对于不存在的测试应该返回404', async () => {
      await request(app)
        .get('/api/test/nonexistent/status')
        .expect(404);
    });
  });

  describe('POST /api/test/seo', () => {
    it('应该能够启动SEO测试', async () => {
      const response = await request(app)
        .post('/api/test/seo')
        .send({
          url: 'https://example.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.testId).toBeDefined();
    });
  });

  describe('POST /api/test/security', () => {
    it('应该能够启动安全测试', async () => {
      const response = await request(app)
        .post('/api/test/security')
        .send({
          url: 'https://example.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.testId).toBeDefined();
    });
  });

  describe('GET /api/test/history', () => {
    it('应该能够获取测试历史', async () => {
      const response = await request(app)
        .get('/api/test/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该支持分页参数', async () => {
      const response = await request(app)
        .get('/api/test/history?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });
  });
});`;

    const integrationTestPath = path.join(testDir, 'api.test.js');
    fs.writeFileSync(integrationTestPath, integrationTestContent);
    this.createdTests.push('tests/integration/api.test.js');

    console.log('   ✅ 集成测试创建完成\n');
  }

  /**
   * 创建用户流程测试
   */
  async createUserFlowTests() {
    console.log('👤 创建用户流程测试...');

    const testDir = path.join(this.projectRoot, 'tests/e2e');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const e2eTestContent = `/**
 * 端到端用户流程测试
 */

const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const puppeteer = require('puppeteer');

describe('用户流程测试', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('主要用户流程', () => {
    it('用户应该能够访问首页', async () => {
      await page.goto('http://localhost:3000');
      
      const title = await page.title();
      expect(title).toContain('Test-Web');
      
      // 检查主要元素是否存在
      const urlInput = await page.$('input[type="url"]');
      expect(urlInput).toBeTruthy();
      
      const testButton = await page.$('button[type="submit"]');
      expect(testButton).toBeTruthy();
    });

    it('用户应该能够输入URL并启动测试', async () => {
      await page.goto('http://localhost:3000');
      
      // 输入测试URL
      await page.type('input[type="url"]', 'https://example.com');
      
      // 点击测试按钮
      await page.click('button[type="submit"]');
      
      // 等待测试开始
      await page.waitForSelector('.test-progress', { timeout: 5000 });
      
      const progressElement = await page.$('.test-progress');
      expect(progressElement).toBeTruthy();
    });

    it('用户应该能够查看测试结果', async () => {
      await page.goto('http://localhost:3000');
      
      // 输入测试URL
      await page.type('input[type="url"]', 'https://example.com');
      
      // 启动测试
      await page.click('button[type="submit"]');
      
      // 等待测试完成（可能需要较长时间）
      await page.waitForSelector('.test-results', { timeout: 30000 });
      
      const resultsElement = await page.$('.test-results');
      expect(resultsElement).toBeTruthy();
      
      // 检查是否显示了分数
      const scoreElement = await page.$('.test-score');
      expect(scoreElement).toBeTruthy();
    });

    it('用户应该能够查看测试历史', async () => {
      await page.goto('http://localhost:3000/history');
      
      // 等待历史页面加载
      await page.waitForSelector('.test-history', { timeout: 5000 });
      
      const historyElement = await page.$('.test-history');
      expect(historyElement).toBeTruthy();
    });

    it('用户应该能够导出测试结果', async () => {
      await page.goto('http://localhost:3000');
      
      // 假设已经有测试结果
      await page.type('input[type="url"]', 'https://example.com');
      await page.click('button[type="submit"]');
      await page.waitForSelector('.test-results', { timeout: 30000 });
      
      // 点击导出按钮
      const exportButton = await page.$('.export-button');
      if (exportButton) {
        await exportButton.click();
        
        // 验证导出功能（这里可能需要检查下载或其他行为）
        await page.waitForTimeout(1000);
      }
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的URL输入', async () => {
      await page.goto('http://localhost:3000');
      
      // 输入无效URL
      await page.type('input[type="url"]', 'invalid-url');
      await page.click('button[type="submit"]');
      
      // 等待错误消息
      await page.waitForSelector('.error-message', { timeout: 5000 });
      
      const errorElement = await page.$('.error-message');
      expect(errorElement).toBeTruthy();
    });

    it('应该处理网络错误', async () => {
      await page.goto('http://localhost:3000');
      
      // 输入无法访问的URL
      await page.type('input[type="url"]', 'https://nonexistent-domain-12345.com');
      await page.click('button[type="submit"]');
      
      // 等待错误处理
      await page.waitForSelector('.error-message', { timeout: 10000 });
      
      const errorElement = await page.$('.error-message');
      expect(errorElement).toBeTruthy();
    });
  });
});`;

    const e2eTestPath = path.join(testDir, 'userFlow.test.js');
    fs.writeFileSync(e2eTestPath, e2eTestContent);
    this.createdTests.push('tests/e2e/userFlow.test.js');

    console.log('   ✅ 用户流程测试创建完成\n');
  }

  /**
   * 创建测试配置
   */
  async createTestConfiguration() {
    console.log('⚙️ 创建测试配置...');

    // 创建Jest配置
    const jestConfig = {
      testEnvironment: 'node',
      roots: ['<rootDir>/tests'],
      testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
      collectCoverageFrom: [
        'backend/**/*.js',
        'frontend/**/*.{js,jsx,ts,tsx}',
        '!**/node_modules/**',
        '!**/coverage/**'
      ],
      coverageDirectory: 'coverage',
      coverageReporters: ['text', 'lcov', 'html'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testTimeout: 30000
    };

    const jestConfigPath = path.join(this.projectRoot, 'jest.config.js');
    fs.writeFileSync(jestConfigPath, `module.exports = ${JSON.stringify(jestConfig, null, 2)};`);
    this.createdTests.push('jest.config.js');

    // 创建测试设置文件
    const setupContent = `/**
 * Jest测试设置文件
 */

// 设置测试超时
jest.setTimeout(30000);

// 模拟浏览器环境
global.window = {};
global.document = {};
global.navigator = {
  userAgent: 'jest'
};

// 设置环境变量
process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_URL = ':memory:';

// 全局测试工具
global.testUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  mockFetch: (response) => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response))
      })
    );
  },
  
  restoreFetch: () => {
    if (global.fetch && global.fetch.mockRestore) {
      global.fetch.mockRestore();
    }
  }
};

// 测试前后钩子
beforeEach(() => {
  // 清理模拟
  jest.clearAllMocks();
});

afterEach(() => {
  // 恢复模拟
  global.testUtils.restoreFetch();
});`;

    const setupPath = path.join(this.projectRoot, 'tests/setup.js');
    if (!fs.existsSync(path.dirname(setupPath))) {
      fs.mkdirSync(path.dirname(setupPath), { recursive: true });
    }
    fs.writeFileSync(setupPath, setupContent);
    this.createdTests.push('tests/setup.js');

    console.log('   ✅ 测试配置创建完成\n');
  }

  /**
   * 生成测试报告
   */
  generateTestReport() {
    const reportPath = path.join(this.projectRoot, 'basic-test-creation-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.createdTests.length,
        testTypes: {
          unit: this.createdTests.filter(t => t.includes('/unit/')).length,
          integration: this.createdTests.filter(t => t.includes('/integration/')).length,
          e2e: this.createdTests.filter(t => t.includes('/e2e/')).length,
          config: this.createdTests.filter(t => t.includes('config') || t.includes('setup')).length
        }
      },
      createdTests: this.createdTests
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 基础测试创建报告:');
    console.log(`   创建测试: ${this.createdTests.length}`);
    console.log(`   单元测试: ${report.summary.testTypes.unit}`);
    console.log(`   集成测试: ${report.summary.testTypes.integration}`);
    console.log(`   E2E测试: ${report.summary.testTypes.e2e}`);
    console.log(`   配置文件: ${report.summary.testTypes.config}`);
    console.log(`   报告已保存: ${reportPath}\n`);
  }
}

// 执行脚本
if (require.main === module) {
  const creator = new BasicTestCreator();
  creator.execute().catch(error => {
    console.error('❌ 基础测试创建失败:', error);
    process.exit(1);
  });
}

module.exports = BasicTestCreator;
