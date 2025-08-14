/**
 * QueryCacheService 测试
 */

const QueryCacheService = require('..\services\cache\QueryCacheService.js');

// Mock CacheService
const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    deletePattern: jest.fn(),
    healthCheck: jest.fn()
};

// Mock数据库连接池
const mockDbPool = {
    query: jest.fn()
};

describe('QueryCacheService', () => {
    let queryCacheService;

    beforeEach(() => {
        queryCacheService = new QueryCacheService(mockCacheService, mockDbPool);
        jest.clearAllMocks();
    });

    describe('查询缓存键生成', () => {
        test('应该为相同的SQL和参数生成相同的键', () => {
            const sql = 'SELECT * FROM users WHERE id = $1';
            const params = [1];

            const key1 = queryCacheService.generateQueryKey(sql, params);
            const key2 = queryCacheService.generateQueryKey(sql, params);

            expect(key1).toBe(key2);
        });

        test('应该为不同的SQL生成不同的键', () => {
            const sql1 = 'SELECT * FROM users WHERE id = $1';
            const sql2 = 'SELECT * FROM posts WHERE id = $1';
            const params = [1];

            const key1 = queryCacheService.generateQueryKey(sql1, params);
            const key2 = queryCacheService.generateQueryKey(sql2, params);

            expect(key1).not.toBe(key2);
        });
    });

    describe('查询类型检测', () => {
        test('应该正确检测用户查询', () => {
            const sql = 'SELECT * FROM users WHERE id = 1';
            const type = queryCacheService.detectQueryType(sql);
            expect(type).toBe('user');
        });

        test('应该正确检测测试结果查询', () => {
            const sql = 'SELECT * FROM test_results WHERE status = "completed"';
            const type = queryCacheService.detectQueryType(sql);
            expect(type).toBe('test_results');
        });

        test('应该为未知查询返回默认类型', () => {
            const sql = 'SELECT * FROM unknown_table';
            const type = queryCacheService.detectQueryType(sql);
            expect(type).toBe('default');
        });
    });

    describe('缓存查询执行', () => {
        test('缓存命中时应该返回缓存数据', async () => {
            const cachedResult = {
                rows: [{ id: 1, name: 'test' }],
                rowCount: 1,
                timestamp: new Date().toISOString(),
                queryType: 'user'
            };

            mockCacheService.get.mockResolvedValue(cachedResult);

            const result = await queryCacheService.query('SELECT * FROM users WHERE id = $1', [1]);

            expect(result.cached).toBe(true);
            expect(result.rows).toEqual(cachedResult.rows);
            expect(mockDbPool.query).not.toHaveBeenCalled();
        });

        test('缓存未命中时应该执行数据库查询并缓存结果', async () => {
            const dbResult = {
                rows: [{ id: 1, name: 'test' }],
                rowCount: 1
            };

            mockCacheService.get.mockResolvedValue(null);
            mockDbPool.query.mockResolvedValue(dbResult);
            mockCacheService.set.mockResolvedValue(true);

            const result = await queryCacheService.query('SELECT * FROM users WHERE id = $1', [1]);

            expect(result.cached).toBe(false);
            expect(result.rows).toEqual(dbResult.rows);
            expect(mockDbPool.query).toHaveBeenCalled();
            expect(mockCacheService.set).toHaveBeenCalled();
        });

        test('写操作不应该被缓存', async () => {
            const dbResult = {
                rows: [],
                rowCount: 1
            };

            mockDbPool.query.mockResolvedValue(dbResult);

            const result = await queryCacheService.query('INSERT INTO users (name) VALUES ($1)', ['test']);

            expect(result.cached).toBe(false);
            expect(mockCacheService.set).not.toHaveBeenCalled();
        });
    });

    describe('批量查询', () => {
        test('应该能够执行批量查询', async () => {
            const queries = [
                { sql: 'SELECT * FROM users WHERE id = $1', params: [1] },
                { sql: 'SELECT * FROM posts WHERE user_id = $1', params: [1] }
            ];

            mockCacheService.get.mockResolvedValue(null);
            mockDbPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

            const results = await queryCacheService.batchQuery(queries);

            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(true);
        });
    });

    describe('缓存预热', () => {
        test('应该能够预热查询缓存', async () => {
            const queries = [
                { sql: 'SELECT * FROM users LIMIT 10', params: [] },
                { sql: 'SELECT * FROM posts LIMIT 10', params: [] }
            ];

            mockDbPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
            mockCacheService.set.mockResolvedValue(true);

            const result = await queryCacheService.warmupQueries(queries);

            expect(result).toBe(2);
            expect(mockDbPool.query).toHaveBeenCalledTimes(2);
        });
    });

    describe('缓存失效', () => {
        test('应该能够使缓存失效', async () => {
            mockCacheService.deletePattern.mockResolvedValue(5);

            const result = await queryCacheService.invalidateCache('user*');

            expect(result).toBe(5);
            expect(mockCacheService.deletePattern).toHaveBeenCalledWith('db_queries', 'user*');
        });

        test('应该能够根据事件使缓存失效', async () => {
            mockCacheService.deletePattern.mockResolvedValue(3);

            const result = await queryCacheService.invalidateByEvent('user_update');

            expect(result).toBeGreaterThanOrEqual(0);
        });

        test('应该能够根据表名使缓存失效', async () => {
            mockCacheService.deletePattern.mockResolvedValue(2);

            const result = await queryCacheService.invalidateByTable('users');

            expect(result).toBeGreaterThanOrEqual(0);
        });
    });

    describe('写操作检测', () => {
        test('应该正确识别写操作', () => {
            expect(queryCacheService.isWriteQuery('INSERT INTO users VALUES (1)')).toBe(true);
            expect(queryCacheService.isWriteQuery('UPDATE users SET name = "test"')).toBe(true);
            expect(queryCacheService.isWriteQuery('DELETE FROM users WHERE id = 1')).toBe(true);
            expect(queryCacheService.isWriteQuery('CREATE TABLE test (id INT)')).toBe(true);
        });

        test('应该正确识别读操作', () => {
            expect(queryCacheService.isWriteQuery('SELECT * FROM users')).toBe(false);
            expect(queryCacheService.isWriteQuery('SHOW TABLES')).toBe(false);
            expect(queryCacheService.isWriteQuery('DESCRIBE users')).toBe(false);
        });
    });

    describe('统计信息', () => {
        test('应该能够获取查询统计', () => {
            // 模拟一些统计数据
            queryCacheService.queryStats.totalQueries = 100;
            queryCacheService.queryStats.cacheHits = 70;
            queryCacheService.queryStats.cacheMisses = 30;
            queryCacheService.queryStats.cachedQueries = 80;

            const stats = queryCacheService.getQueryStats();

            expect(stats.cacheHitRate).toBe('70.00');
            expect(stats.cacheUsageRate).toBe('80.00');
            expect(stats).toHaveProperty('timestamp');
        });
    });

    describe('健康检查', () => {
        test('应该返回健康状态', async () => {
            mockCacheService.healthCheck.mockResolvedValue({ status: 'healthy' });

            const health = await queryCacheService.healthCheck();

            expect(health.status).toBe('healthy');
            expect(health).toHaveProperty('cache');
            expect(health).toHaveProperty('queries');
        });
    });
});