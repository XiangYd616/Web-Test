/**
 * 数据库测试引擎单元测试
 * @description 测试数据库连接、查询性能等功能
 */

const DatabaseTestEngine = require('../databaseTestEngine');
const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');

// Mock数据库驱动
jest.mock('pg');
jest.mock('mysql2/promise');
jest.mock('mongodb');

describe('数据库测试引擎', () => {
  let dbEngine;

  beforeEach(() => {
    dbEngine = new DatabaseTestEngine();
    jest.clearAllMocks();
  });

  describe('引擎初始化', () => {
    test('应该正确初始化引擎', () => {
      expect(dbEngine.name).toBe('database');
      expect(dbEngine.version).toBeDefined();
      expect(dbEngine.description).toBeTruthy();
    });

    test('应该支持多种数据库类型', () => {
      const supportedDatabases = dbEngine.getSupportedDatabases();
      
      expect(supportedDatabases).toContain('postgresql');
      expect(supportedDatabases).toContain('mysql');
      expect(supportedDatabases).toContain('mongodb');
    });
  });

  describe('PostgreSQL连接测试', () => {
    let mockPool;

    beforeEach(() => {
      mockPool = {
        query: jest.fn(),
        end: jest.fn(),
        connect: jest.fn()
      };
      Pool.mockImplementation(() => mockPool);
    });

    test('应该成功连接PostgreSQL', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ version: 'PostgreSQL 14.0' }] });

      const result = await dbEngine.testConnection({
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass'
      });

      expect(result.success).toBe(true);
      expect(result.connected).toBe(true);
      expect(Pool).toHaveBeenCalled();
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockPool.end).toHaveBeenCalled();
    });

    test('应该处理PostgreSQL连接失败', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection refused'));

      const result = await dbEngine.testConnection({
        type: 'postgresql',
        host: 'invalid-host',
        port: 5432,
        database: 'testdb'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Connection refused');
    });

    test('应该测量PostgreSQL连接时间', async () => {
      mockPool.query.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ rows: [] }), 50))
      );

      const result = await dbEngine.testConnection({
        type: 'postgresql',
        host: 'localhost',
        database: 'testdb'
      });

      expect(result.connectionTime).toBeDefined();
      expect(result.connectionTime).toBeGreaterThan(0);
    });
  });

  describe('MySQL连接测试', () => {
    let mockConnection;

    beforeEach(() => {
      mockConnection = {
        query: jest.fn(),
        end: jest.fn(),
        execute: jest.fn()
      };
      mysql.createConnection = jest.fn().mockResolvedValue(mockConnection);
    });

    test('应该成功连接MySQL', async () => {
      mockConnection.query.mockResolvedValue([
        [{ version: '8.0.30' }],
        []
      ]);

      const result = await dbEngine.testConnection({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'testdb',
        user: 'root',
        password: 'password'
      });

      expect(result.success).toBe(true);
      expect(result.connected).toBe(true);
      expect(mysql.createConnection).toHaveBeenCalled();
      expect(mockConnection.end).toHaveBeenCalled();
    });

    test('应该处理MySQL认证失败', async () => {
      mysql.createConnection.mockRejectedValue(
        new Error('Access denied for user')
      );

      const result = await dbEngine.testConnection({
        type: 'mysql',
        host: 'localhost',
        user: 'wronguser',
        password: 'wrongpass'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });
  });

  describe('MongoDB连接测试', () => {
    let mockClient;
    let mockDb;

    beforeEach(() => {
      mockDb = {
        admin: jest.fn().mockReturnValue({
          ping: jest.fn().mockResolvedValue({ ok: 1 })
        }),
        stats: jest.fn().mockResolvedValue({ db: 'testdb', collections: 5 })
      };

      mockClient = {
        connect: jest.fn().mockResolvedValue(),
        db: jest.fn().mockReturnValue(mockDb),
        close: jest.fn().mockResolvedValue()
      };

      MongoClient.mockImplementation(() => mockClient);
    });

    test('应该成功连接MongoDB', async () => {
      const result = await dbEngine.testConnection({
        type: 'mongodb',
        host: 'localhost',
        port: 27017,
        database: 'testdb'
      });

      expect(result.success).toBe(true);
      expect(result.connected).toBe(true);
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.close).toHaveBeenCalled();
    });

    test('应该处理MongoDB连接超时', async () => {
      mockClient.connect.mockRejectedValue(new Error('connection timed out'));

      const result = await dbEngine.testConnection({
        type: 'mongodb',
        host: 'unreachable-host',
        port: 27017
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });

  describe('查询性能测试', () => {
    let mockPool;

    beforeEach(() => {
      mockPool = {
        query: jest.fn(),
        end: jest.fn()
      };
      Pool.mockImplementation(() => mockPool);
    });

    test('应该测量查询执行时间', async () => {
      mockPool.query.mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve({ rows: [{ count: 100 }] }), 100)
        )
      );

      const result = await dbEngine.testQueryPerformance({
        type: 'postgresql',
        host: 'localhost',
        database: 'testdb'
      }, 'SELECT COUNT(*) FROM users');

      expect(result.executionTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(50);
    });

    test('应该识别慢查询', async () => {
      mockPool.query.mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve({ rows: [] }), 3000)
        )
      );

      const result = await dbEngine.testQueryPerformance({
        type: 'postgresql',
        host: 'localhost',
        database: 'testdb'
      }, 'SELECT * FROM large_table WHERE unindexed_column = "value"');

      expect(result.isSlow).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations).toContain('考虑添加索引');
    });

    test('应该统计查询返回的行数', async () => {
      const mockRows = Array(1000).fill({ id: 1 });
      mockPool.query.mockResolvedValue({ rows: mockRows });

      const result = await dbEngine.testQueryPerformance({
        type: 'postgresql',
        host: 'localhost',
        database: 'testdb'
      }, 'SELECT * FROM users');

      expect(result.rowCount).toBe(1000);
    });
  });

  describe('索引分析', () => {
    let mockPool;

    beforeEach(() => {
      mockPool = {
        query: jest.fn(),
        end: jest.fn()
      };
      Pool.mockImplementation(() => mockPool);
    });

    test('应该分析表索引', async () => {
      const mockIndexes = {
        rows: [
          { indexname: 'users_pkey', indexdef: 'PRIMARY KEY (id)' },
          { indexname: 'users_email_idx', indexdef: 'INDEX (email)' }
        ]
      };

      mockPool.query.mockResolvedValue(mockIndexes);

      const result = await dbEngine.analyzeIndexes({
        type: 'postgresql',
        host: 'localhost',
        database: 'testdb'
      }, 'users');

      expect(result.indexes).toBeDefined();
      expect(result.indexes.length).toBe(2);
      expect(result.hasPrimaryKey).toBe(true);
    });

    test('应该检测缺少索引的表', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await dbEngine.analyzeIndexes({
        type: 'postgresql',
        host: 'localhost',
        database: 'testdb'
      }, 'unindexed_table');

      expect(result.indexes.length).toBe(0);
      expect(result.warnings).toContain('表没有索引');
    });
  });

  describe('连接池测试', () => {
    let mockPool;

    beforeEach(() => {
      mockPool = {
        query: jest.fn(),
        end: jest.fn(),
        totalCount: 10,
        idleCount: 8,
        waitingCount: 2
      };
      Pool.mockImplementation(() => mockPool);
    });

    test('应该测试连接池状态', async () => {
      const result = await dbEngine.testConnectionPool({
        type: 'postgresql',
        host: 'localhost',
        database: 'testdb',
        max: 10
      });

      expect(result.poolSize).toBe(10);
      expect(result.activeConnections).toBe(2);
      expect(result.idleConnections).toBe(8);
    });

    test('应该建议连接池优化', async () => {
      mockPool.totalCount = 100;
      mockPool.idleCount = 95;

      const result = await dbEngine.testConnectionPool({
        type: 'postgresql',
        host: 'localhost',
        database: 'testdb',
        max: 100
      });

      expect(result.recommendations).toContain('连接池过大');
    });
  });

  describe('数据库统计信息', () => {
    let mockPool;

    beforeEach(() => {
      mockPool = {
        query: jest.fn(),
        end: jest.fn()
      };
      Pool.mockImplementation(() => mockPool);
    });

    test('应该获取数据库大小', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ size: '125 MB' }]
      });

      const result = await dbEngine.getDatabaseStats({
        type: 'postgresql',
        host: 'localhost',
        database: 'testdb'
      });

      expect(result.size).toBe('125 MB');
    });

    test('应该统计表数量', async () => {
      mockPool.query.mockResolvedValue({
        rows: Array(25).fill({ tablename: 'table' })
      });

      const result = await dbEngine.getDatabaseStats({
        type: 'postgresql',
        host: 'localhost',
        database: 'testdb'
      });

      expect(result.tableCount).toBe(25);
    });
  });

  describe('完整测试执行', () => {
    let mockPool;

    beforeEach(() => {
      mockPool = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        end: jest.fn()
      };
      Pool.mockImplementation(() => mockPool);
    });

    test('应该返回标准化的测试结果', async () => {
      const result = await dbEngine.executeTest({
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass'
      });

      expect(result.engine).toBe('database');
      expect(result.version).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.results).toBeDefined();
    });

    test('应该清理资源', async () => {
      await dbEngine.executeTest({
        type: 'postgresql',
        host: 'localhost',
        database: 'testdb'
      });

      expect(mockPool.end).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    test('应该处理不支持的数据库类型', async () => {
      const result = await dbEngine.testConnection({
        type: 'unsupported_db',
        host: 'localhost'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的数据库类型');
    });

    test('应该处理缺少必要参数', async () => {
      const result = await dbEngine.testConnection({
        type: 'postgresql'
        // 缺少host
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('应该处理SQL语法错误', async () => {
      const mockPool = {
        query: jest.fn().mockRejectedValue(new Error('syntax error')),
        end: jest.fn()
      };
      Pool.mockImplementation(() => mockPool);

      const result = await dbEngine.testQueryPerformance({
        type: 'postgresql',
        host: 'localhost',
        database: 'testdb'
      }, 'INVALID SQL QUERY');

      expect(result.success).toBe(false);
      expect(result.error).toContain('syntax error');
    });
  });

  describe('安全性测试', () => {
    test('应该防止SQL注入测试', async () => {
      const maliciousQuery = "SELECT * FROM users WHERE id = '1' OR '1'='1'";
      
      const result = await dbEngine.validateQuery(maliciousQuery);

      expect(result.isSafe).toBe(false);
      expect(result.warnings).toContain('可能的SQL注入');
    });

    test('应该验证连接字符串安全', () => {
      const insecureConfig = {
        type: 'postgresql',
        host: 'localhost',
        ssl: false
      };

      const validation = dbEngine.validateConfig(insecureConfig);

      expect(validation.warnings).toContain('建议启用SSL');
    });
  });

  describe('事务测试', () => {
    let mockPool;
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn()
      };

      mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        end: jest.fn()
      };

      Pool.mockImplementation(() => mockPool);
    });

    test('应该测试事务支持', async () => {
      const result = await dbEngine.testTransaction({
        type: 'postgresql',
        host: 'localhost',
        database: 'testdb'
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result.supportsTransactions).toBe(true);
    });

    test('应该测试事务回滚', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('constraint violation'));

      const result = await dbEngine.testTransaction({
        type: 'postgresql',
        host: 'localhost',
        database: 'testdb'
      });

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});

