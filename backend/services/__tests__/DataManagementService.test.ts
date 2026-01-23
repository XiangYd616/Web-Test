/**
 * 数据管理服务单元测试
 * @description 测试DataManagementService的核心功能
 */

// Mock依赖
jest.mock('../../config/database', () => ({
  query: jest.fn(),
  getPool: jest.fn(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  })),
}));

jest.mock('fs').promises = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  access: jest.fn(),
};

// 导入被测试的模块
const { DataManagementService } = require('../data/DataManagementService');

describe('DataManagementService', () => {
  let service: any;
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    service = new DataManagementService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createData', () => {
    test('应该创建数据记录', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await service.createData(
        'test_results',
        { url: 'https://example.com', testType: 'ui' },
        { userId: mockUserId }
      );

      expect(result.id).toBeTruthy();
      expect(result.record.data).toEqual({ url: 'https://example.com', testType: 'ui' });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO data_records'),
        expect.any(Array)
      );
    });
  });

  describe('readData', () => {
    test('应该读取数据记录', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 'data_1',
            type: 'test_results',
            data: { url: 'https://example.com', testType: 'ui' },
            metadata: { createdAt: new Date().toISOString() },
          },
        ],
      });

      const record = await service.readData('test_results', 'data_1');

      expect(record.id).toBe('data_1');
      expect(record.type).toBe('test_results');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT id, type'), [
        'test_results',
        'data_1',
      ]);
    });
  });

  describe('updateData', () => {
    test('应该更新数据记录', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'data_1',
              type: 'test_results',
              data: { url: 'https://example.com', testType: 'ui', name: 'old' },
              metadata: { createdAt: new Date().toISOString(), updatedAt: 'x', version: 1 },
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      const updated = await service.updateData(
        'test_results',
        'data_1',
        { name: 'new' },
        { userId: mockUserId }
      );

      expect(updated.data.name).toBe('new');
      expect(updated.metadata.updatedBy).toBe(mockUserId);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE data_records'),
        expect.any(Array)
      );
    });

    test('应该硬删除数据记录', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'data_2',
              type: 'test_results',
              data: { url: 'https://example.com', testType: 'ui' },
              metadata: { createdAt: new Date().toISOString(), updatedAt: 'x', version: 1 },
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.deleteData('test_results', 'data_2', { softDelete: false });

      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM data_records'), [
        'test_results',
        'data_2',
      ]);
    });
  });

  describe('deleteData', () => {
    test('应该软删除数据记录', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'data_1',
              type: 'test_results',
              data: { url: 'https://example.com', testType: 'ui' },
              metadata: { createdAt: new Date().toISOString(), updatedAt: 'x', version: 1 },
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.deleteData('test_results', 'data_1', {
        softDelete: true,
        userId: mockUserId,
      });

      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE data_records'),
        expect.any(Array)
      );
    });

    test('应该硬删除数据记录', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'data_2',
              type: 'test_results',
              data: { url: 'https://example.com', testType: 'ui' },
              metadata: { createdAt: new Date().toISOString(), updatedAt: 'x', version: 1 },
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.deleteData('test_results', 'data_2', { softDelete: false });

      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM data_records'), [
        'test_results',
        'data_2',
      ]);
    });
  });

  describe('queryData', () => {
    test('应该返回分页结果', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 2 }] }).mockResolvedValueOnce({
        rows: [
          {
            id: 'data_1',
            type: 'test_results',
            data: { url: 'https://example.com', testType: 'ui' },
            metadata: { createdAt: new Date().toISOString() },
          },
        ],
      });

      const result = await service.queryData('test_results', {}, { page: 1, limit: 10 });

      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(2);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT COUNT(*)'), [
        'test_results',
      ]);
    });

    test('应该支持搜索与排序', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] }).mockResolvedValueOnce({
        rows: [
          {
            id: 'data_3',
            type: 'test_results',
            data: { url: 'https://example.com', testType: 'ui', name: 'Alpha' },
            metadata: { createdAt: new Date().toISOString() },
          },
        ],
      });

      const result = await service.queryData(
        'test_results',
        { search: 'Alpha', sort: { field: 'name', direction: 'asc' } },
        { page: 1, limit: 10 }
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].data.name).toBe('Alpha');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT COUNT(*)'), [
        'test_results',
        '%Alpha%',
      ]);
    });
  });

  describe('batchOperation', () => {
    test('应该批量创建数据', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await service.batchOperation([
        {
          type: 'create',
          dataType: 'test_results',
          data: { url: 'https://example.com', testType: 'ui' },
          options: { userId: mockUserId },
        },
      ]);

      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(1);
    });
  });
});
