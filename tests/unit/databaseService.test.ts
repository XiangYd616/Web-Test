/**
 * 数据库服务单元测试
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

// 动态导入DatabaseService
let DatabaseService: any;

describe('DatabaseService', () => {
  let dbService: any;
  const testDbPath = path.join(__dirname, 'test.db');

  beforeAll(async () => {
    try {
      const module = await import('../../backend/services/database/databaseService');
      DatabaseService = module.default || module;
    } catch {
      console.warn('无法导入DatabaseService，创建模拟类');
      // 创建模拟类用于测试
      DatabaseService = class {
        constructor() {
          (this as any).dbPath = null;
          (this as any).db = null;
        }

        async init() {
          // 模拟初始化
          return Promise.resolve();
        }

        async close() {
          // 模拟关闭
          return Promise.resolve();
        }

        async saveTestResult(testResult: any) {
          // 模拟保存测试结果
          return { ...testResult, saved: true };
        }

        async getTestResult(id: string) {
          // 模拟获取测试结果
          return { id, type: 'performance', status: 'completed' };
        }

        async getAllTestResults() {
          // 模拟获取所有测试结果
          return [];
        }

        async deleteTestResult(_id: string) {
          // 模拟删除测试结果
          return true;
        }

        async updateTestResult(id: string, data: any) {
          // 模拟更新测试结果
          return { id, ...data };
        }
      };
    }
  });

  beforeEach(async () => {
    // 使用测试数据库
    dbService = new DatabaseService();
    (dbService as any).dbPath = testDbPath;
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
        id: 'test-1',
        type: 'performance',
        status: 'completed',
        result: { score: 95 },
        timestamp: new Date().toISOString(),
      };

      const savedResult = await dbService.saveTestResult(testResult);

      expect(savedResult).toBeTruthy();
      expect(savedResult.id).toBe(testResult.id);
    });

    it('应该验证必需字段', async () => {
      const invalidResult = {
        type: 'performance',
        // 缺少必需的id字段
      };

      await expect(dbService.saveTestResult(invalidResult as any)).rejects.toThrow();
    });
  });

  describe('getTestResult', () => {
    it('应该能够获取保存的测试结果', async () => {
      const testResult = {
        id: 'test-2',
        type: 'security',
        status: 'completed',
        result: { vulnerabilities: 0 },
        timestamp: new Date().toISOString(),
      };

      await dbService.saveTestResult(testResult);
      const retrievedResult = await dbService.getTestResult('test-2');

      expect(retrievedResult).toBeTruthy();
      expect(retrievedResult?.id).toBe(testResult.id);
      expect(retrievedResult?.type).toBe(testResult.type);
    });

    it('对于不存在的ID应该返回null', async () => {
      const result = await dbService.getTestResult('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getAllTestResults', () => {
    it('应该返回所有测试结果', async () => {
      const testResults = [
        {
          id: 'test-3',
          type: 'api',
          status: 'completed',
          result: { responseTime: 120 },
          timestamp: new Date().toISOString(),
        },
        {
          id: 'test-4',
          type: 'compatibility',
          status: 'failed',
          result: { error: 'Timeout' },
          timestamp: new Date().toISOString(),
        },
      ];

      for (const result of testResults) {
        await dbService.saveTestResult(result);
      }

      const allResults = await dbService.getAllTestResults();

      expect(allResults).toHaveLength(2);
      expect(allResults.map(r => r.id)).toContain('test-3');
      expect(allResults.map(r => r.id)).toContain('test-4');
    });

    it('空数据库应该返回空数组', async () => {
      const results = await dbService.getAllTestResults();
      expect(results).toEqual([]);
    });
  });

  describe('deleteTestResult', () => {
    it('应该能够删除测试结果', async () => {
      const testResult = {
        id: 'test-5',
        type: 'seo',
        status: 'completed',
        result: { score: 88 },
        timestamp: new Date().toISOString(),
      };

      await dbService.saveTestResult(testResult);

      // 确认结果存在
      let retrievedResult = await dbService.getTestResult('test-5');
      expect(retrievedResult).toBeTruthy();

      // 删除结果
      const deleted = await dbService.deleteTestResult('test-5');
      expect(deleted).toBe(true);

      // 确认结果已删除
      retrievedResult = await dbService.getTestResult('test-5');
      expect(retrievedResult).toBeNull();
    });

    it('删除不存在的记录应该返回false', async () => {
      const deleted = await dbService.deleteTestResult('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('updateTestResult', () => {
    it('应该能够更新测试结果', async () => {
      const originalResult = {
        id: 'test-6',
        type: 'performance',
        status: 'running',
        result: { score: 75 },
        timestamp: new Date().toISOString(),
      };

      await dbService.saveTestResult(originalResult);

      const updatedData = {
        status: 'completed' as const,
        result: { score: 92 },
      };

      const updatedResult = await dbService.updateTestResult('test-6', updatedData);

      expect(updatedResult).toBeTruthy();
      expect(updatedResult?.status).toBe('completed');
      expect(updatedResult?.result.score).toBe(92);
      expect(updatedResult?.id).toBe('test-6'); // ID不应该改变
    });

    it('更新不存在的记录应该返回null', async () => {
      const updatedData = {
        status: 'completed' as const,
        result: { score: 100 },
      };

      const result = await dbService.updateTestResult('non-existent', updatedData);
      expect(result).toBeNull();
    });
  });
});
