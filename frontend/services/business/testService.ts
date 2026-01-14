/**
 * 测试业务服务
 * 封装测试相关的业务逻辑
 * 
 * 职责:
 * 1. 数据缓存管理(UI性能优化)
 * 2. 调用Repository层获取数据
 * 3. 提供格式验证(仅用于前端即时反馈,不包含业务规则)
 * 
 * 注意:
 * - 所有业务规则验证由后端处理
 * - 前端验证仅用于提升用户体验,提供即时反馈
 */

import { testRepository, TestConfig, TestResult, TestQueryParams } from '../repository/testRepository';
import { validateTestConfigFormat, type ValidationResult } from '../../utils/formValidation';

/**
 * 简单的内存缓存
 */
class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5分钟

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

/**
 * 测试业务服务类
 */
export class TestService {
  private cache = new SimpleCache();

  /**
   * 获取所有测试
   */
  async getAll(params?: TestQueryParams): Promise<TestResult[]> {
    const cacheKey = `tests-${JSON.stringify(params)}`;
    
    // 尝试从缓存获取
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 从API获取
    const tests = await testRepository.getAll(params);
    
    // 缓存结果
    this.cache.set(cacheKey, tests);
    
    return tests;
  }

  /**
   * 获取单个测试(带缓存)
   */
  async getById(id: string, useCache = true): Promise<TestResult> {
    const cacheKey = `test-${id}`;
    
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const test = await testRepository.getById(id);
    this.cache.set(cacheKey, test);
    
    return test;
  }

  /**
  /**
   * 创建并启动测试
   * 注意: 业务验证由后端处理
   */
  async createAndStart(config: TestConfig): Promise<TestResult> {
    // 直接调用新架构API,后端会处理:
    // - 数据验证(格式+业务规则)
    // - 创建测试
    // - 启动测试
    // - 权限检查
    // - 配额检查
    const test = await testRepository.createAndStart(config);
    
    // 清除缓存
    this.cache.clear();
    
    return test;
  }

  /**
   * 创建测试(不自动启动)
   * 注意: 业务验证由后端处理
   */
  async create(config: TestConfig): Promise<TestResult> {
    // 后端会处理所有验证逻辑
    const test = await testRepository.create(config);
    this.cache.clear();
    return test;
  }
  /**
   * 启动测试
   */
  async start(testId: string): Promise<TestResult> {
    const test = await testRepository.start(testId);
    
    // 更新缓存
    this.cache.set(`test-${testId}`, test);
    this.cache.delete(`tests-${JSON.stringify({})}`);
    
    return test;
  }

  /**
   * 停止测试
   */
  async stop(testId: string): Promise<TestResult> {
    const test = await testRepository.stop(testId);
    
    // 更新缓存
    this.cache.set(`test-${testId}`, test);
    
    return test;
  }

  /**
   * 删除测试
   */
  async delete(id: string): Promise<void> {
    await testRepository.delete(id);
    
    // 清除相关缓存
    this.cache.delete(`test-${id}`);
    this.cache.clear(); // 清除列表缓存
  }

  /**
   * 批量删除测试
   */
  async deleteMultiple(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      throw new Error('请选择要删除的测试');
    }

    await testRepository.deleteMultiple(ids);
    
    // 清除所有缓存
    this.cache.clear();
  }

  /**
   * 获取测试结果
   */
  async getResults(testId: string): Promise<any> {
    const cacheKey = `test-results-${testId}`;
    
    // 尝试从缓存获取
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await testRepository.getResults(testId);
    
    // 只缓存已完成的测试结果
    const test = await this.getById(testId, false);
    if (test.status === 'completed') {
      this.cache.set(cacheKey, results);
    }
    
    return results;
  }

  /**
   * 重试测试
   */
  async retry(testId: string): Promise<TestResult> {
    const test = await testRepository.retry(testId);
    
    // 清除相关缓存
    this.cache.delete(`test-${testId}`);
    this.cache.delete(`test-results-${testId}`);
    
    return test;
  }

  /**
   * 获取测试统计
   */
  async getStats(params?: { startDate?: string; endDate?: string }): Promise<any> {
    const cacheKey = `test-stats-${JSON.stringify(params)}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const stats = await testRepository.getStats(params);
    this.cache.set(cacheKey, stats);
    
    return stats;
  }

  /**
   * 导出测试结果
   */
  async export(testIds: string[], format: 'json' | 'csv' | 'excel' = 'json'): Promise<Blob> {
    if (testIds.length === 0) {
      throw new Error('请选择要导出的测试');
    }

    return testRepository.export(testIds, format);
  }

  /**
   * 基础格式验证(仅用于前端即时反馈)
   * 注意: 这只是前端的快速反馈,真正的业务规则验证在后端
   * 
   * @param config 测试配置
   * @returns 验证结果,包含错误信息对象
   */
  validateFormat(config: TestConfig): ValidationResult {
    // 使用统一的格式验证工具
    return validateTestConfigFormat(config);
  }
  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * 导出单例
 */
export const testService = new TestService();

/**
 * 默认导出
 */
export default testService;
