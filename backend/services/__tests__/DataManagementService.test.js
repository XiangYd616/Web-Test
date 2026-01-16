/**
 * 数据管理服务单元测试
 * @description 测试DataManagementService的核心功能
 */

const { DataManagementService } = require('../data/DataManagementService');

// Mock依赖
jest.mock('../../config/database', () => ({
  query: jest.fn(),
  getPool: jest.fn(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  }))
}));

jest.mock('fs').promises = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  access: jest.fn()
};

describe('DataManagementService', () => {
  let service;
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    service = new DataManagementService();
    jest.clearAllMocks();
  });

  describe('数据获取功能', () => {
    test('应该成功获取指定类型的数据', async () => {
      const mockData = [
        { id: 1, name: 'Test 1', created_at: new Date() },
        { id: 2, name: 'Test 2', created_at: new Date() }
      ];

      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({ rows: mockData, rowCount: 2 });

      const result = await service.getData('test-results', {
        page: 1,
        limit: 10,
        userId: mockUserId
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.data).toHaveLength(2);
      expect(query).toHaveBeenCalledTimes(2); // 一次获取数据，一次获取总数
    });

    test('应该正确处理分页参数', async () => {
      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      query.mockResolvedValueOnce({ rows: [{ count: '100' }] });

      const result = await service.getData('users', {
        page: 3,
        limit: 20,
        userId: mockUserId
      });

      expect(result.pagination).toEqual({
        page: 3,
        limit: 20,
        total: 100,
        totalPages: 5
      });
    });

    test('应该处理无效的数据类型', async () => {
      await expect(
        service.getData('invalid-type', { userId: mockUserId })
      ).rejects.toThrow('Unsupported data type');
    });
  });

  describe('数据创建功能', () => {
    test('应该成功创建新数据', async () => {
      const newData = {
        name: 'New Test',
        description: 'Test Description'
      };

      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({
        rows: [{ id: 123, ...newData, created_at: new Date() }]
      });

      const result = await service.createData('test-results', newData, mockUserId);

      expect(result).toHaveProperty('id', 123);
      expect(result).toHaveProperty('name', 'New Test');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.arrayContaining([mockUserId, newData.name, newData.description])
      );
    });

    test('应该验证必填字段', async () => {
      await expect(
        service.createData('test-results', {}, mockUserId)
      ).rejects.toThrow('validation');
    });
  });

  describe('数据更新功能', () => {
    test('应该成功更新现有数据', async () => {
      const updates = {
        name: 'Updated Test',
        status: 'completed'
      };

      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({
        rows: [{ id: 1, ...updates, updated_at: new Date() }],
        rowCount: 1
      });

      const result = await service.updateData('test-results', 1, updates, mockUserId);

      expect(result).toHaveProperty('name', 'Updated Test');
      expect(result).toHaveProperty('status', 'completed');
    });

    test('应该处理不存在的记录', async () => {
      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        service.updateData('test-results', 999, {}, mockUserId)
      ).rejects.toThrow('not found');
    });
  });

  describe('数据删除功能', () => {
    test('应该成功删除数据（软删除）', async () => {
      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.deleteData('test-results', [1, 2], mockUserId);

      expect(result).toHaveProperty('deletedCount', 1);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining([[1, 2]])
      );
    });

    test('应该支持批量删除', async () => {
      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({ rowCount: 5 });

      const result = await service.deleteData(
        'test-results',
        [1, 2, 3, 4, 5],
        mockUserId
      );

      expect(result.deletedCount).toBe(5);
    });
  });

  describe('数据导入导出功能', () => {
    test('应该成功导出JSON格式数据', async () => {
      const mockData = [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' }
      ];

      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({ rows: mockData });

      const result = await service.exportData({
        dataType: 'test-results',
        format: 'json',
        userId: mockUserId
      });

      expect(result).toHaveProperty('format', 'json');
      expect(result).toHaveProperty('data');
      expect(JSON.parse(result.data)).toEqual(mockData);
    });

    test('应该成功导出CSV格式数据', async () => {
      const mockData = [
        { id: 1, name: 'Test 1', score: 85 },
        { id: 2, name: 'Test 2', score: 92 }
      ];

      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({ rows: mockData });

      const result = await service.exportData({
        dataType: 'test-results',
        format: 'csv',
        userId: mockUserId
      });

      expect(result).toHaveProperty('format', 'csv');
      expect(result.data).toContain('id,name,score');
      expect(result.data).toContain('1,Test 1,85');
    });

    test('应该成功导入JSON数据', async () => {
      const importData = [
        { name: 'Imported 1', score: 75 },
        { name: 'Imported 2', score: 88 }
      ];

      const { query } = require('../../config/database');
      query.mockResolvedValue({ rows: importData, rowCount: 2 });

      const result = await service.importData({
        dataType: 'test-results',
        format: 'json',
        data: JSON.stringify(importData),
        userId: mockUserId
      });

      expect(result).toHaveProperty('imported', 2);
      expect(result).toHaveProperty('failed', 0);
    });

    test('应该处理导入错误', async () => {
      const invalidData = 'invalid json data';

      await expect(
        service.importData({
          dataType: 'test-results',
          format: 'json',
          data: invalidData,
          userId: mockUserId
        })
      ).rejects.toThrow();
    });
  });

  describe('批量操作功能', () => {
    test('应该成功执行批量更新', async () => {
      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({ rowCount: 3 });

      const result = await service.bulkUpdate(
        'test-results',
        [1, 2, 3],
        { status: 'completed' },
        mockUserId
      );

      expect(result).toHaveProperty('updated', 3);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining(['completed', [1, 2, 3]])
      );
    });

    test('应该处理并发批量操作', async () => {
      const operations = [
        { type: 'update', ids: [1, 2], data: { status: 'active' } },
        { type: 'delete', ids: [3, 4] },
        { type: 'export', format: 'json' }
      ];

      const results = await service.processBatchOperations(operations, mockUserId);

      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('type', 'update');
    });
  });

  describe('数据统计功能', () => {
    test('应该返回正确的数据统计信息', async () => {
      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({
        rows: [{
          total_count: 100,
          active_count: 75,
          completed_count: 25
        }]
      });

      const stats = await service.getDataStatistics('test-results', mockUserId);

      expect(stats).toHaveProperty('total', 100);
      expect(stats).toHaveProperty('active', 75);
      expect(stats).toHaveProperty('completed', 25);
    });
  });

  describe('事件发射功能', () => {
    test('应该在数据创建时发出事件', async () => {
      const eventHandler = jest.fn();
      service.on('data:created', eventHandler);

      const { query } = require('../../config/database');
      query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'New Item' }]
      });

      await service.createData('test-results', { name: 'New Item' }, mockUserId);

      expect(eventHandler).toHaveBeenCalledWith({
        dataType: 'test-results',
        data: expect.objectContaining({ id: 1 }),
        userId: mockUserId
      });
    });
  });

  describe('错误处理', () => {
    test('应该优雅处理数据库连接错误', async () => {
      const { query } = require('../../config/database');
      query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        service.getData('test-results', { userId: mockUserId })
      ).rejects.toThrow('Database connection failed');
    });

    test('应该处理并发限制', async () => {
      // 模拟并发操作
      const promises = Array(10).fill(null).map(() =>
        service.getData('test-results', { userId: mockUserId })
      );

      // 应该限制并发数量
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });
});
