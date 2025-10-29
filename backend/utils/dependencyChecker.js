/**
 * 系统依赖检测模块
 * 在系统启动时检测所有依赖项的可用性
 * 提供降级方案和友好的提示信息
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class DependencyChecker {
  constructor() {
    this.dependencies = {
      core: [],      // 核心依赖（必须）
      important: [], // 重要依赖（推荐）
      optional: []   // 可选依赖（增强）
    };
    
    this.results = {
      allPassed: false,
      corePassed: false,
      warnings: [],
      errors: [],
      info: []
    };
  }

  /**
   * 检查所有依赖
   */
  async checkAll() {
    console.log('\n🔍 开始系统依赖检查...\n');
    
    // 核心依赖检查
    await this.checkCoreDependencies();
    
    // 重要依赖检查
    await this.checkImportantDependencies();
    
    // 可选依赖检查
    await this.checkOptionalDependencies();
    
    // 生成报告
    this.generateReport();
    
    return this.results;
  }

  /**
   * 检查核心依赖
   */
  async checkCoreDependencies() {
    console.log('📦 检查核心依赖...');
    
    // 1. Node.js 版本
    const nodeVersion = await this.checkNodeVersion();
    if (nodeVersion.passed) {
      this.logSuccess(`✓ Node.js ${nodeVersion.version}`);
    } else {
      this.logError(`✗ Node.js 版本过低: ${nodeVersion.version} (需要 >= 18.0.0)`);
      this.results.errors.push('Node.js 版本不满足要求');
    }
    
    // 2. PostgreSQL 连接
    const postgres = await this.checkPostgreSQL();
    if (postgres.passed) {
      this.logSuccess(`✓ PostgreSQL ${postgres.version}`);
    } else {
      this.logError(`✗ PostgreSQL 连接失败: ${postgres.error}`);
      this.results.errors.push('数据库连接失败');
    }
    
    // 3. 必要的 npm 包
    const packages = await this.checkRequiredPackages();
    if (packages.passed) {
      this.logSuccess('✓ 核心 npm 包已安装');
    } else {
      this.logError(`✗ 缺少核心包: ${packages.missing.join(', ')}`);
      this.results.errors.push('缺少必要的 npm 包');
    }
    
    this.results.corePassed = this.results.errors.length === 0;
    console.log('');
  }

  /**
   * 检查重要依赖
   */
  async checkImportantDependencies() {
    console.log('🔧 检查重要依赖...');
    
    // 1. Redis 连接
    const redis = await this.checkRedis();
    if (redis.passed) {
      this.logSuccess(`✓ Redis ${redis.version}`);
    } else {
      this.logWarning(`⚠ Redis 不可用，将使用内存队列: ${redis.error}`);
      this.results.warnings.push({
        dependency: 'Redis',
        impact: '队列和缓存降级到内存模式',
        recommendation: '安装 Redis 以获得更好的性能'
      });
    }
    
    // 2. Chromium/Chrome (Puppeteer)
    const chrome = await this.checkChrome();
    if (chrome.passed) {
      this.logSuccess(`✓ Chrome/Chromium ${chrome.version || '已安装'}`);
    } else {
      this.logWarning('⚠ Chrome 不可用，性能测试和截图功能将受限');
      this.results.warnings.push({
        dependency: 'Chrome/Chromium',
        impact: '性能测试、截图对比、Lighthouse 分析不可用',
        recommendation: '安装 Chrome 或让 Puppeteer 自动下载 Chromium'
      });
    }
    
    console.log('');
  }

  /**
   * 检查可选依赖
   */
  async checkOptionalDependencies() {
    console.log('🌟 检查可选依赖...');
    
    // 1. Playwright 浏览器
    const playwright = await this.checkPlaywright();
    if (playwright.passed) {
      this.logInfo(`ℹ Playwright 浏览器: ${playwright.browsers.join(', ')}`);
    } else {
      this.logInfo('ℹ Playwright 浏览器未安装（跨浏览器测试不可用）');
    }
    
    // 2. SMTP 配置
    const smtp = await this.checkSMTP();
    if (smtp.passed) {
      this.logInfo(`ℹ SMTP 已配置: ${smtp.host}`);
    } else {
      this.logInfo('ℹ SMTP 未配置（邮件功能不可用）');
    }
    
    // 3. 其他可选工具
    const tools = await this.checkOptionalTools();
    if (tools.length > 0) {
      this.logInfo(`ℹ 可选工具: ${tools.join(', ')}`);
    }
    
    console.log('');
  }

  /**
   * 检查 Node.js 版本
   */
  async checkNodeVersion() {
    try {
      const version = process.version;
      const major = parseInt(version.split('.')[0].substring(1));
      return {
        passed: major >= 18,
        version
      };
    } catch (error) {
      return { passed: false, version: 'unknown', error: error.message };
    }
  }

  /**
   * 检查 PostgreSQL
   */
  async checkPostgreSQL() {
    try {
      const { query } = require('../config/database');
      const result = await query('SELECT version()');
      const version = result.rows[0].version.split(' ')[1];
      return { passed: true, version };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  /**
   * 检查必要的 npm 包
   */
  async checkRequiredPackages() {
    const required = ['express', 'pg', 'bcrypt', 'jsonwebtoken', 'joi'];
    const missing = [];
    
    for (const pkg of required) {
      try {
        require.resolve(pkg);
      } catch {
        missing.push(pkg);
      }
    }
    
    return {
      passed: missing.length === 0,
      missing
    };
  }

  /**
   * 检查 Redis
   */
  async checkRedis() {
    try {
      const Redis = require('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null
      });
      
      await redis.ping();
      const info = await redis.info('server');
      const version = info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown';
      
      redis.disconnect();
      return { passed: true, version };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  /**
   * 检查 Chrome/Chromium
   */
  async checkChrome() {
    try {
      const puppeteer = require('puppeteer');
      
      // 检查是否可以启动浏览器
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const version = await browser.version();
      await browser.close();
      
      return { passed: true, version };
    } catch (error) {
      // 检查是否只是未安装
      try {
        require.resolve('puppeteer');
        return { passed: false, error: 'Chromium 未下载' };
      } catch {
        return { passed: false, error: 'Puppeteer 未安装' };
      }
    }
  }

  /**
   * 检查 Playwright
   */
  async checkPlaywright() {
    try {
      const { chromium, firefox, webkit } = require('playwright');
      const browsers = [];
      
      // 检查各浏览器是否可用
      const checks = [
        { name: 'Chromium', launcher: chromium },
        { name: 'Firefox', launcher: firefox },
        { name: 'WebKit', launcher: webkit }
      ];
      
      for (const { name, launcher } of checks) {
        try {
          const browser = await launcher.launch({ headless: true });
          await browser.close();
          browsers.push(name);
        } catch {
          // 浏览器不可用
        }
      }
      
      return {
        passed: browsers.length > 0,
        browsers
      };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  /**
   * 检查 SMTP 配置
   */
  async checkSMTP() {
    try {
      const host = process.env.SMTP_HOST;
      const user = process.env.SMTP_USER;
      
      if (!host || !user) {
        return { passed: false };
      }
      
      // 可以添加更详细的 SMTP 连接测试
      return { passed: true, host };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  /**
   * 检查可选工具
   */
  async checkOptionalTools() {
    const tools = [];
    
    // 检查 Docker
    try {
      await execAsync('docker --version');
      tools.push('Docker');
    } catch {}
    
    // 检查 Git
    try {
      await execAsync('git --version');
      tools.push('Git');
    } catch {}
    
    return tools;
  }

  /**
   * 生成检查报告
   */
  generateReport() {
    console.log('━'.repeat(60));
    console.log('📊 依赖检查报告\n');
    
    // 核心依赖状态
    if (this.results.corePassed) {
      this.logSuccess('✅ 核心依赖: 全部通过');
    } else {
      this.logError('❌ 核心依赖: 检查失败');
      console.log('\n🔴 错误:');
      this.results.errors.forEach(err => console.log(`   - ${err}`));
    }
    
    // 警告信息
    if (this.results.warnings.length > 0) {
      console.log('\n🟡 警告:');
      this.results.warnings.forEach(warn => {
        console.log(`   - ${warn.dependency}: ${warn.impact}`);
        console.log(`     💡 建议: ${warn.recommendation}`);
      });
    }
    
    // 系统状态
    console.log('\n📍 系统状态:');
    if (this.results.corePassed && this.results.warnings.length === 0) {
      console.log('   🚀 所有功能完整可用');
      this.results.allPassed = true;
    } else if (this.results.corePassed) {
      console.log('   ⚡ 核心功能可用，部分高级功能降级');
      this.results.allPassed = false;
    } else {
      console.log('   🛑 系统无法启动，请修复核心依赖问题');
      this.results.allPassed = false;
    }
    
    console.log('━'.repeat(60));
    console.log('');
    
    // 如果核心依赖未通过，提供帮助链接
    if (!this.results.corePassed) {
      console.log('📚 获取帮助:');
      console.log('   - 查看依赖文档: DEPENDENCIES.md');
      console.log('   - 快速启动: 使用 Docker Compose');
      console.log('   - 故障排除: https://github.com/XiangYd616/Web-Test/issues');
      console.log('');
    }
  }

  /**
   * 日志工具方法
   */
  logSuccess(message) {
    console.log(`\x1b[32m${message}\x1b[0m`);
  }

  logError(message) {
    console.log(`\x1b[31m${message}\x1b[0m`);
  }

  logWarning(message) {
    console.log(`\x1b[33m${message}\x1b[0m`);
  }

  logInfo(message) {
    console.log(`\x1b[36m${message}\x1b[0m`);
  }
}

// 导出单例
const dependencyChecker = new DependencyChecker();

module.exports = dependencyChecker;

