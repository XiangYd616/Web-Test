/**
 * 🧪 测试结果缓存服务
 * 专门用于测试结果和状态的缓存管理
 * 基于统一缓存服务构建
 */

import { unifiedCacheService } from './unifiedCacheService';
import type { TestResult } from '../../types/unifiedEngine.types';

// 测试缓存键前缀
const CACHE_KEYS = {
  TEST_RESULT: 'test_result_',
  TEST_STATUS: 'test_status_',
  TEST_HISTORY: 'test_history_',
  TEST_STATS: 'test_stats_',
  USER_TESTS: 'user_tests_'
} as const;

// 缓存TTL配置 (毫秒)
const CACHE_TTL = {
  TEST_RESULT: 24 * 60 * 60 * 1000, // 24小时
  TEST_STATUS: 5 * 60 * 1000,       // 5分钟
  TEST_HISTORY: 60 * 60 * 1000,     // 1小时
  TEST_STATS: 10 * 60 * 1000,       // 10分钟
  USER_TESTS: 30 * 60 * 1000        // 30分钟
} as const;

/**
 * 测试结果缓存服务
 */
export class TestResultsCache {
  private static instance: TestResultsCache;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): TestResultsCache {
    if (!TestResultsCache.instance) {
      TestResultsCache.instance = new TestResultsCache();
    }
    return TestResultsCache.instance;
  }

  // ==================== 测试结果缓存 ====================

  /**
   * 缓存测试结果
   */
  public cacheTestResult(testId: string, result: TestResult): void {
    const key = CACHE_KEYS.TEST_RESULT + testId;
    unifiedCacheService.set(key, result, CACHE_TTL.TEST_RESULT);
  }

  /**
   * 获取测试结果
   */
  public getTestResult(testId: string): TestResult | null {
    const key = CACHE_KEYS.TEST_RESULT + testId;
    return unifiedCacheService.get<TestResult>(key);
  }

  /**
   * 删除测试结果
   */
  public deleteTestResult(testId: string): boolean {
    const key = CACHE_KEYS.TEST_RESULT + testId;
    return unifiedCacheService.delete(key);
  }

  // ==================== 测试状态缓存 ====================

  /**
   * 缓存测试状态
   */
  public cacheTestStatus(testId: string, status: unknown): void {
    const key = CACHE_KEYS.TEST_STATUS + testId;
    unifiedCacheService.set(key, status, CACHE_TTL.TEST_STATUS);
  }

  /**
   * 获取测试状态
   */
  public getTestStatus(testId: string): unknown {
    const key = CACHE_KEYS.TEST_STATUS + testId;
    return unifiedCacheService.get(key);
  }

  /**
   * 删除测试状态
   */
  public deleteTestStatus(testId: string): boolean {
    const key = CACHE_KEYS.TEST_STATUS + testId;
    return unifiedCacheService.delete(key);
  }

  // ==================== 测试历史缓存 ====================

  /**
   * 缓存测试历史
   */
  public cacheTestHistory(userId: string, history: unknown[]): void {
    const key = CACHE_KEYS.TEST_HISTORY + userId;
    unifiedCacheService.set(key, history, CACHE_TTL.TEST_HISTORY);
  }

  /**
   * 获取测试历史
   */
  public getTestHistory(userId: string): unknown[] | null {
    const key = CACHE_KEYS.TEST_HISTORY + userId;
    return unifiedCacheService.get<any[]>(key);
  }

  /**
   * 添加到测试历史
   */
  public addToTestHistory(userId: string, testResult: TestResult): void {
    const history = this.getTestHistory(userId) || [];
    history.unshift(testResult);
    
    // 限制历史记录数量
    if (history.length > 100) {
      history.splice(100);
    }
    
    this.cacheTestHistory(userId, history);
  }

  // ==================== 测试统计缓存 ====================

  /**
   * 缓存测试统计
   */
  public cacheTestStats(userId: string, stats: unknown): void {
    const key = CACHE_KEYS.TEST_STATS + userId;
    unifiedCacheService.set(key, stats, CACHE_TTL.TEST_STATS);
  }

  /**
   * 获取测试统计
   */
  public getTestStats(userId: string): unknown {
    const key = CACHE_KEYS.TEST_STATS + userId;
    return unifiedCacheService.get(key);
  }

  // ==================== 用户测试缓存 ====================

  /**
   * 缓存用户测试列表
   */
  public cacheUserTests(userId: string, tests: string[]): void {
    const key = CACHE_KEYS.USER_TESTS + userId;
    unifiedCacheService.set(key, tests, CACHE_TTL.USER_TESTS);
  }

  /**
   * 获取用户测试列表
   */
  public getUserTests(userId: string): string[] | null {
    const key = CACHE_KEYS.USER_TESTS + userId;
    return unifiedCacheService.get<string[]>(key);
  }

  /**
   * 添加用户测试
   */
  public addUserTest(userId: string, testId: string): void {
    const tests = this.getUserTests(userId) || [];
    if (!tests.includes(testId)) {
      tests.unshift(testId);
      
      // 限制测试数量
      if (tests.length > 50) {
        tests.splice(50);
      }
      
      this.cacheUserTests(userId, tests);
    }
  }

  // ==================== 批量操作 ====================

  /**
   * 批量缓存测试结果
   */
  public batchCacheResults(results: Map<string, TestResult>): void {
    for (const [testId, result] of results.entries()) {
      this.cacheTestResult(testId, result);
    }
  }

  /**
   * 批量获取测试结果
   */
  public batchGetResults(testIds: string[]): Map<string, TestResult> {
    const results = new Map<string, TestResult>();
    
    for (const testId of testIds) {
      const result = this.getTestResult(testId);
      if (result) {
        results.set(testId, result);
      }
    }
    
    return results;
  }

  // ==================== 清理和维护 ====================

  /**
   * 清理特定类型的缓存
   */
  public clearTestCache(type: 'results' | 'status' | 'history' | 'stats' | 'all'): void {
    const keys = unifiedCacheService.keys();
    
    const prefixMap = {
      results: CACHE_KEYS.TEST_RESULT,
      status: CACHE_KEYS.TEST_STATUS,
      history: CACHE_KEYS.TEST_HISTORY,
      stats: CACHE_KEYS.TEST_STATS,
      all: ''
    };
    
    const prefix = prefixMap[type];
    
    keys.forEach(key => {
      if (type === 'all' || key.startsWith(prefix)) {
        unifiedCacheService.delete(key);
      }
    });
  }

  /**
   * 获取缓存使用情况
   */
  public getCacheUsage(): {
    totalItems: number;
    testResults: number;
    testStatus: number;
    testHistory: number;
    testStats: number;
    userTests: number;
  } {
    const keys = unifiedCacheService.keys();
    
    return {
      totalItems: keys.length,
      testResults: keys.filter(k => k.startsWith(CACHE_KEYS.TEST_RESULT)).length,
      testStatus: keys.filter(k => k.startsWith(CACHE_KEYS.TEST_STATUS)).length,
      testHistory: keys.filter(k => k.startsWith(CACHE_KEYS.TEST_HISTORY)).length,
      testStats: keys.filter(k => k.startsWith(CACHE_KEYS.TEST_STATS)).length,
      userTests: keys.filter(k => k.startsWith(CACHE_KEYS.USER_TESTS)).length
    };
  }
}

// 导出单例实例
export const testResultsCache = TestResultsCache.getInstance();
export default testResultsCache;
