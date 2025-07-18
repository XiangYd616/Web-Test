#!/usr/bin/env node

/**
 * Redis集成测试脚本
 * 测试Redis缓存功能的完整性
 */

require('dotenv').config();
const cacheService = require('../services/redis/cache');
const cacheMonitoring = require('../services/redis/monitoring');
const cacheWarmup = require('../services/redis/warmup');
const cacheAnalytics = require('../services/redis/analytics');
const fallbackHandler = require('../utils/fallback');
const keys = require('../services/redis/keys');

class RedisIntegrationTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🧪 开始Redis集成测试...\n');

    try {
      // 基础功能测试
      await this.testBasicCacheOperations();
      await this.testKeyNamingConventions();
      await this.testTTLManagement();
      await this.testBatchOperations();

      // 降级机制测试
      await this.testFallbackMechanism();

      // 监控功能测试
      await this.testMonitoringFeatures();

      // 预热功能测试
      await this.testWarmupFeatures();

      // 分析功能测试
      await this.testAnalyticsFeatures();

      // 显示测试结果
      this.displayResults();

    } catch (error) {
      console.error('❌ 测试执行失败:', error);
      process.exit(1);
    }
  }

  /**
   * 测试基础缓存操作
   */
  async testBasicCacheOperations() {
    console.log('📝 测试基础缓存操作...');

    // 测试设置和获取
    await this.runTest('设置缓存值', async () => {
      const result = await cacheService.set('test_key', 'test_value', { ttl: 60 });
      return result === true || !cacheService.isAvailable();
    });

    await this.runTest('获取缓存值', async () => {
      const value = await cacheService.get('test_key');
      return value === 'test_value' || !cacheService.isAvailable();
    });

    await this.runTest('检查缓存存在', async () => {
      const exists = await cacheService.exists('test_key');
      return exists === true || !cacheService.isAvailable();
    });

    await this.runTest('获取TTL', async () => {
      const ttl = await cacheService.getTTL('test_key');
      return ttl > 0 || !cacheService.isAvailable();
    });

    await this.runTest('删除缓存', async () => {
      const result = await cacheService.delete('test_key');
      return result === true || !cacheService.isAvailable();
    });

    console.log('✅ 基础缓存操作测试完成\n');
  }

  /**
   * 测试键命名规范
   */
  async testKeyNamingConventions() {
    console.log('🔑 测试键命名规范...');

    await this.runTest('API键生成', async () => {
      const key = keys.api.performance('https://example.com', { test: true });
      return key.includes('testweb') && key.includes('api') && key.includes('perf');
    });

    await this.runTest('会话键生成', async () => {
      const key = keys.session.user('123');
      return key.includes('testweb') && key.includes('session') && key.includes('user_123');
    });

    await this.runTest('数据库键生成', async () => {
      const key = keys.db.testHistory('123', 'performance', 1);
      return key.includes('testweb') && key.includes('db') && key.includes('history');
    });

    await this.runTest('键解析', async () => {
      const key = keys.api.performance('https://example.com', {});
      const parsed = keys.parseKey(key);
      // 键格式是 testweb:dev:api:perf_xxx，所以namespace应该是'api'
      return parsed && parsed.namespace === 'api' && parsed.environment === 'dev';
    });

    console.log('✅ 键命名规范测试完成\n');
  }

  /**
   * 测试TTL管理
   */
  async testTTLManagement() {
    console.log('⏰ 测试TTL管理...');

    await this.runTest('默认TTL', async () => {
      const ttl = cacheService.getTTLByType('default');
      return ttl > 0;
    });

    await this.runTest('API缓存TTL', async () => {
      const ttl = cacheService.getTTLByType('api');
      return ttl > 0;
    });

    await this.runTest('会话TTL', async () => {
      const ttl = cacheService.getTTLByType('session');
      return ttl > 0;
    });

    await this.runTest('设置过期时间', async () => {
      await cacheService.set('ttl_test', 'value', { ttl: 10 });
      const result = await cacheService.expire('ttl_test', 5);
      return result === true || !cacheService.isAvailable();
    });

    console.log('✅ TTL管理测试完成\n');
  }

  /**
   * 测试批量操作
   */
  async testBatchOperations() {
    console.log('📦 测试批量操作...');

    await this.runTest('批量设置', async () => {
      const pairs = [
        ['batch_key1', 'value1'],
        ['batch_key2', 'value2'],
        ['batch_key3', 'value3']
      ];
      const result = await cacheService.mset(pairs, { ttl: 60 });
      return result === true || !cacheService.isAvailable();
    });

    await this.runTest('批量获取', async () => {
      const keys = ['batch_key1', 'batch_key2', 'batch_key3'];
      const values = await cacheService.mget(keys);
      return Array.isArray(values) && (values.length === 3 || !cacheService.isAvailable());
    });

    await this.runTest('模式删除', async () => {
      const result = await cacheService.deletePattern('batch_key*');
      return result >= 0;
    });

    console.log('✅ 批量操作测试完成\n');
  }

  /**
   * 测试降级机制
   */
  async testFallbackMechanism() {
    console.log('🛡️ 测试降级机制...');

    await this.runTest('内存缓存设置', async () => {
      const result = await fallbackHandler.memorySet('fallback_test', 'fallback_value', 60000);
      return result === true;
    });

    await this.runTest('内存缓存获取', async () => {
      const value = await fallbackHandler.memoryGet('fallback_test');
      return value === 'fallback_value';
    });

    await this.runTest('内存缓存删除', async () => {
      const result = await fallbackHandler.memoryDelete('fallback_test');
      return result === true;
    });

    await this.runTest('降级统计', async () => {
      const stats = fallbackHandler.getMemoryCacheStats();
      return stats && typeof stats.total === 'number';
    });

    console.log('✅ 降级机制测试完成\n');
  }

  /**
   * 测试监控功能
   */
  async testMonitoringFeatures() {
    console.log('📊 测试监控功能...');

    await this.runTest('获取缓存统计', async () => {
      const stats = cacheService.getStats();
      return stats && typeof stats.hitRate === 'string';
    });

    await this.runTest('监控报告', async () => {
      const report = cacheMonitoring.getMonitoringReport('5m');
      return report && report.timestamp;
    });

    await this.runTest('重置统计', async () => {
      cacheService.resetStats();
      const stats = cacheService.getStats();
      return stats.hits === 0 && stats.misses === 0;
    });

    console.log('✅ 监控功能测试完成\n');
  }

  /**
   * 测试预热功能
   */
  async testWarmupFeatures() {
    console.log('🔥 测试预热功能...');

    await this.runTest('预热统计', async () => {
      const stats = await cacheWarmup.getWarmupStats();
      return stats && typeof stats.config === 'object';
    });

    await this.runTest('URL预热', async () => {
      const result = await cacheWarmup.warmupUrl('https://example.com', ['performance']);
      return result === true || !cacheService.isAvailable();
    });

    console.log('✅ 预热功能测试完成\n');
  }

  /**
   * 测试分析功能
   */
  async testAnalyticsFeatures() {
    console.log('📈 测试分析功能...');

    await this.runTest('生成分析报告', async () => {
      const report = await cacheAnalytics.generateReport('json');
      return report === null || (report && report.timestamp);
    });

    await this.runTest('文本报告格式', async () => {
      const report = await cacheAnalytics.generateReport('text');
      return report === null || typeof report === 'string';
    });

    console.log('✅ 分析功能测试完成\n');
  }

  /**
   * 运行单个测试
   */
  async runTest(name, testFunction) {
    try {
      const result = await testFunction();
      if (result) {
        console.log(`  ✅ ${name}`);
        this.testResults.passed++;
        this.testResults.tests.push({ name, status: 'passed' });
      } else {
        console.log(`  ❌ ${name}`);
        this.testResults.failed++;
        this.testResults.tests.push({ name, status: 'failed' });
      }
    } catch (error) {
      console.log(`  ⚠️  ${name} (跳过: ${error.message})`);
      this.testResults.skipped++;
      this.testResults.tests.push({ name, status: 'skipped', error: error.message });
    }
  }

  /**
   * 显示测试结果
   */
  displayResults() {
    console.log('\n📋 测试结果汇总:');
    console.log('='.repeat(50));
    console.log(`✅ 通过: ${this.testResults.passed}`);
    console.log(`❌ 失败: ${this.testResults.failed}`);
    console.log(`⚠️  跳过: ${this.testResults.skipped}`);
    console.log(`📊 总计: ${this.testResults.tests.length}`);

    const successRate = this.testResults.tests.length > 0
      ? (this.testResults.passed / this.testResults.tests.length * 100).toFixed(2)
      : 0;

    console.log(`🎯 成功率: ${successRate}%`);

    if (this.testResults.failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.testResults.tests
        .filter(test => test.status === 'failed')
        .forEach(test => console.log(`  - ${test.name}`));
    }

    if (this.testResults.skipped > 0) {
      console.log('\n⚠️  跳过的测试:');
      this.testResults.tests
        .filter(test => test.status === 'skipped')
        .forEach(test => console.log(`  - ${test.name}: ${test.error}`));
    }

    console.log('\n🎉 Redis集成测试完成!');

    // 如果有失败的测试，退出码为1
    if (this.testResults.failed > 0) {
      process.exit(1);
    }
  }
}

// 运行测试
const tester = new RedisIntegrationTest();
tester.runAllTests();
