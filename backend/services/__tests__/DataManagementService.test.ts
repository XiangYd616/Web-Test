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

  describe('数据导入功能', () => {
    test('应该成功导入CSV文件', async () => {
      const mockFileData =
        'name,email,age\nJohn Doe,john@example.com,30\nJane Smith,jane@example.com,25';
      const mockQuery = require('../../config/database').query;

      // Mock文件读取
      const { readFile } = require('fs').promises;
      readFile.mockResolvedValue(mockFileData);

      // Mock数据库查询
      mockQuery.mockResolvedValue({ insertId: 1 });

      const result = await service.importData(mockUserId, {
        filename: 'test.csv',
        content: mockFileData,
        type: 'csv',
      });

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(2);
      expect(readFile).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalled();
    });

    test('应该处理无效的CSV格式', async () => {
      const invalidCsvData = 'invalid,csv,format';
      const { readFile } = require('fs').promises;
      readFile.mockResolvedValue(invalidCsvData);

      const result = await service.importData(mockUserId, {
        filename: 'invalid.csv',
        content: invalidCsvData,
        type: 'csv',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid CSV format');
    });

    test('应该处理JSON文件导入', async () => {
      const mockJsonData = JSON.stringify([
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' },
      ]);

      const { readFile } = require('fs').promises;
      readFile.mockResolvedValue(mockJsonData);

      const result = await service.importData(mockUserId, {
        filename: 'test.json',
        content: mockJsonData,
        type: 'json',
      });

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(2);
    });

    test('应该处理文件读取错误', async () => {
      const { readFile } = require('fs').promises;
      readFile.mockRejectedValue(new Error('File not found'));

      const result = await service.importData(mockUserId, {
        filename: 'nonexistent.csv',
        content: '',
        type: 'csv',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });
  });

  describe('数据导出功能', () => {
    test('应该成功导出为CSV格式', async () => {
      const mockQuery = require('../../config/database').query;
      const mockData = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' },
      ];

      mockQuery.mockResolvedValue(mockData);

      const result = await service.exportData(mockUserId, {
        format: 'csv',
        table: 'users',
        filters: {},
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain('id,name,email');
      expect(result.data).toContain('John,john@example.com');
      expect(mockQuery).toHaveBeenCalled();
    });

    test('应该成功导出为JSON格式', async () => {
      const mockQuery = require('../../config/database').query;
      const mockData = [{ id: 1, name: 'John', email: 'john@example.com' }];

      mockQuery.mockResolvedValue(mockData);

      const result = await service.exportData(mockUserId, {
        format: 'json',
        table: 'users',
        filters: {},
      });

      expect(result.success).toBe(true);
      expect(JSON.parse(result.data)).toEqual(mockData);
    });

    test('应该处理数据库查询错误', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.exportData(mockUserId, {
        format: 'csv',
        table: 'users',
        filters: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    test('应该应用过滤条件', async () => {
      const mockQuery = require('../../config/database').query;
      const mockData = [{ id: 1, name: 'John' }];
      mockQuery.mockResolvedValue(mockData);

      const result = await service.exportData(mockUserId, {
        format: 'csv',
        table: 'users',
        filters: { name: 'John' },
      });

      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE'), ['John']);
    });
  });

  describe('数据清理功能', () => {
    test('应该成功清理过期数据', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValue({ affectedRows: 5 });

      const result = await service.cleanupData(mockUserId, {
        table: 'temp_data',
        olderThan: 30, // days
      });

      expect(result.success).toBe(true);
      expect(result.recordsDeleted).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM'),
        expect.arrayContaining([30])
      );
    });

    test('应该处理清理错误', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockRejectedValue(new Error('Permission denied'));

      const result = await service.cleanupData(mockUserId, {
        table: 'users',
        olderThan: 365,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    test('应该验证清理权限', async () => {
      const result = await service.cleanupData(mockUserId, {
        table: 'users', // 敏感表
        olderThan: 30,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });
  });

  describe('数据备份功能', () => {
    test('应该成功创建数据备份', async () => {
      const mockQuery = require('../../config/database').query;
      const { writeFile } = require('fs').promises;

      mockQuery.mockResolvedValue([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ]);
      writeFile.mockResolvedValue(undefined);

      const result = await service.createBackup(mockUserId, {
        tables: ['users'],
        format: 'json',
      });

      expect(result.success).toBe(true);
      expect(result.backupPath).toContain('backup_');
      expect(writeFile).toHaveBeenCalled();
    });

    test('应该处理备份写入错误', async () => {
      const mockQuery = require('../../config/database').query;
      const { writeFile } = require('fs').promises;

      mockQuery.mockResolvedValue([{ id: 1, name: 'John' }]);
      writeFile.mockRejectedValue(new Error('Disk full'));

      const result = await service.createBackup(mockUserId, {
        tables: ['users'],
        format: 'json',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Disk full');
    });

    test('应该验证备份表存在', async () => {
      const result = await service.createBackup(mockUserId, {
        tables: ['nonexistent_table'],
        format: 'json',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Table not found');
    });
  });

  describe('数据验证功能', () => {
    test('应该验证数据完整性', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValue({ count: 100 });

      const result = await service.validateData(mockUserId, {
        table: 'users',
        expectedCount: 100,
      });

      expect(result.success).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.actualCount).toBe(100);
    });

    test('应该检测数据不一致', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValue({ count: 95 });

      const result = await service.validateData(mockUserId, {
        table: 'users',
        expectedCount: 100,
      });

      expect(result.success).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.missingCount).toBe(5);
    });

    test('应该验证数据格式', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValue([{ email: 'valid@example.com' }, { email: 'invalid-email' }]);

      const result = await service.validateDataFormat(mockUserId, {
        table: 'users',
        rules: {
          email: 'email',
        },
      });

      expect(result.success).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.invalidRecords).toBe(1);
    });
  });

  describe('数据同步功能', () => {
    test('应该成功同步数据', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValue({ affectedRows: 10 });

      const result = await service.syncData(mockUserId, {
        source: 'api_data',
        target: 'users',
        strategy: 'upsert',
      });

      expect(result.success).toBe(true);
      expect(result.recordsSynced).toBe(10);
      expect(result.strategy).toBe('upsert');
    });

    test('应该处理同步冲突', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockRejectedValue(new Error('Duplicate key error'));

      const result = await service.syncData(mockUserId, {
        source: 'api_data',
        target: 'users',
        strategy: 'insert',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Duplicate key error');
    });

    test('应该支持增量同步', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValue({ affectedRows: 5 });

      const result = await service.syncData(mockUserId, {
        source: 'api_data',
        target: 'users',
        strategy: 'incremental',
        lastSyncTime: '2023-01-01T00:00:00Z',
      });

      expect(result.success).toBe(true);
      expect(result.recordsSynced).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('updated_at >'),
        expect.arrayContaining(['2023-01-01T00:00:00Z'])
      );
    });
  });

  describe('性能监控', () => {
    test('应该监控数据操作性能', async () => {
      const startTime = Date.now();

      const result = await service.monitorPerformance(mockUserId, {
        operation: 'export',
        table: 'users',
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.operation).toBe('export');
      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    test('应该记录性能指标', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValue({ insertId: 1 });

      const result = await service.recordPerformanceMetrics(mockUserId, {
        operation: 'import',
        duration: 500,
        recordsProcessed: 100,
        success: true,
      });

      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO performance_metrics'),
        expect.arrayContaining(['import', 500, 100, true])
      );
    });
  });

  describe('错误处理', () => {
    test('应该处理数据库连接错误', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockRejectedValue(new Error('Connection timeout'));

      const result = await service.exportData(mockUserId, {
        format: 'csv',
        table: 'users',
        filters: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection timeout');
    });

    test('应该处理权限错误', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockRejectedValue(new Error('Access denied for user'));

      const result = await service.cleanupData(mockUserId, {
        table: 'sensitive_data',
        olderThan: 30,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });

    test('应该处理数据格式错误', async () => {
      const { readFile } = require('fs').promises;
      readFile.mockResolvedValue('invalid json data');

      const result = await service.importData(mockUserId, {
        filename: 'invalid.json',
        content: 'invalid json data',
        type: 'json',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON format');
    });
  });

  describe('边界条件测试', () => {
    test('应该处理空数据集', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValue([]);

      const result = await service.exportData(mockUserId, {
        format: 'csv',
        table: 'empty_table',
        filters: {},
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(''); // 空CSV
    });

    test('应该处理大数据量', async () => {
      const mockQuery = require('../../config/database').query;
      const largeDataSet = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
      }));

      mockQuery.mockResolvedValue(largeDataSet);

      const result = await service.exportData(mockUserId, {
        format: 'json',
        table: 'large_table',
        filters: {},
      });

      expect(result.success).toBe(true);
      expect(JSON.parse(result.data)).toHaveLength(10000);
    });

    test('应该处理并发请求', async () => {
      const mockQuery = require('../../config/database').query;
      mockQuery.mockResolvedValue([{ id: 1, name: 'John' }]);

      const promises = Array.from({ length: 10 }, (_, i) =>
        service.exportData(mockUserId, {
          format: 'csv',
          table: 'users',
          filters: { id: i + 1 },
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});
