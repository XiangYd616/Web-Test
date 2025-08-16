/**
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
});