/**
 * CacheManager 测试
 */

const CacheManager = require('..\services\cache\CacheManager.js');

// Mock所有依赖服务
jest.mock('../services/CacheService');
jest.mock('../services/QueryCacheService');
jest.mock('../services/CacheMonitoringService');
jest.mock('../services/CacheWarmupService');

const CacheService = require('..\services\cache\CacheService.js');
const QueryCacheService = require('..\services\cache\QueryCacheService.js');
const CacheMonitoringService = require('..\services\cache\CacheMonitoringService.js');
const CacheWarmupService = require('..\services\cache\CacheWarmupService.js');

describe('CacheManager', () => {
    let cacheManager;
    let mockDbPool;

    beforeEach(() => {
        mockDbPool = {
            query: jest.fn()
        };

        cacheManager = new CacheManager(mockDbPool);

        // Mock环境变量
        process.env.REDIS_ENABLED = 'true';
        process.env.REDIS_CACHE_DB_QUERIES = 'true';
        process.env.REDIS_ENABLE_MONITORING = 'true';
        process.env.CACHE_WARMUP_ENABLED = 'true';

        jest.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.REDIS_ENABLED;
        delete process.env.REDIS_CACHE_DB_QUERIES;
        delete process.env.REDIS_ENABLE_MONITORING;
        delete process.env.CACHE_WARMUP_ENABLED;
    });

    describe('初始化', () => {
        test('应该成功初始化所有缓存服务', async () => {
            // Mock CacheService初始化成功
            CacheService.prototype.initialize.mockResolvedValue(true);
            CacheService.prototype.isAvailable.mockReturnValue(true);

            // Mock其他服务
            CacheMonitoringService.prototype.startMonitoring.mockReturnValue(undefined);
            CacheWarmupService.prototype.start.mockResolvedValue(true);

            const result = await cacheManager.initialize();

            expect(result).toBe(true);
            expect(cacheManager.isInitialized).toBe(true);
            expect(CacheService.prototype.initialize).toHaveBeenCalled();
        });

        test('Redis初始化失败时应该启用降级模式', async () => {
            CacheService.prototype.initialize.mockResolvedValue(false);

            const result = await cacheManager.initialize();

            expect(result).toBe(true);
            expect(cacheManager.config.fallback.active).toBe(true);
        });
    });

    describe('基本缓存操作', () => {
        beforeEach(async () => {
            CacheService.prototype.initialize.mockResolvedValue(true);
            CacheService.prototype.isAvailable.mockReturnValue(true);
            await cacheManager.initialize();
        });

        test('应该能够设置缓存', async () => {
            CacheService.prototype.set.mockResolvedValue(true);

            const result = await cacheManager.set('test_results', 'test1', { data: 'test' });

            expect(result).toBe(true);
            expect(CacheService.prototype.set).toHaveBeenCalledWith('test_results', 'test1', { data: 'test' }, null, {});
        });

        test('应该能够获取缓存', async () => {
            const mockData = { data: 'test' };
            CacheService.prototype.get.mockResolvedValue(mockData);

            const result = await cacheManager.get('test_results', 'test1');

            expect(result).toEqual(mockData);
            expect(CacheService.prototype.get).toHaveBeenCalledWith('test_results', 'test1', {});
        });

        test('应该能够删除缓存', async () => {
            CacheService.prototype.delete.mockResolvedValue(true);

            const result = await cacheManager.delete('test_results', 'test1');

            expect(result).toBe(true);
            expect(CacheService.prototype.delete).toHaveBeenCalledWith('test_results', 'test1', {});
        });
    });

    describe('降级模式', () => {
        beforeEach(() => {
            cacheManager.enableFallbackMode();
        });

        test('应该能够在内存中设置缓存', async () => {
            const result = await cacheManager.set('test_results', 'test1', { data: 'test' });
            expect(result).toBe(true);
        });

        test('应该能够从内存中获取缓存', async () => {
            await cacheManager.set('test_results', 'test1', { data: 'test' });
            const result = await cacheManager.get('test_results', 'test1');
            expect(result).toEqual({ data: 'test' });
        });

        test('应该能够从内存中删除缓存', async () => {
            await cacheManager.set('test_results', 'test1', { data: 'test' });
            const result = await cacheManager.delete('test_results', 'test1');
            expect(result).toBe(true);
        });

        test('过期的内存缓存应该被自动清理', async () => {
            // 设置一个很短的TTL
            await cacheManager.set('test_results', 'test1', { data: 'test' }, 0.001);

            // 等待过期
            await new Promise(resolve => setTimeout(resolve, 10));

            const result = await cacheManager.get('test_results', 'test1');
            expect(result).toBeNull();
        });
    });

    describe('查询缓存', () => {
        beforeEach(async () => {
            CacheService.prototype.initialize.mockResolvedValue(true);
            CacheService.prototype.isAvailable.mockReturnValue(true);
            await cacheManager.initialize();
        });

        test('应该能够执行缓存查询', async () => {
            const mockResult = {
                rows: [{ id: 1, name: 'test' }],
                rowCount: 1,
                cached: true
            };

            QueryCacheService.prototype.query.mockResolvedValue(mockResult);

            const result = await cacheManager.query('SELECT * FROM users WHERE id = $1', [1]);

            expect(result).toEqual(mockResult);
            expect(QueryCacheService.prototype.query).toHaveBeenCalled();
        });

        test('查询缓存服务未启用时应该直接查询数据库', async () => {
            // 重新初始化，禁用查询缓存
            process.env.REDIS_CACHE_DB_QUERIES = 'false';
            const newCacheManager = new CacheManager(mockDbPool);

            CacheService.prototype.initialize.mockResolvedValue(true);
            await newCacheManager.initialize();

            const mockResult = { rows: [], rowCount: 0 };
            mockDbPool.query.mockResolvedValue(mockResult);

            const result = await newCacheManager.query('SELECT * FROM users', []);

            expect(result.cached).toBe(false);
            expect(mockDbPool.query).toHaveBeenCalled();
        });
    });

    describe('缓存失效', () => {
        beforeEach(async () => {
            CacheService.prototype.initialize.mockResolvedValue(true);
            CacheService.prototype.isAvailable.mockReturnValue(true);
            await cacheManager.initialize();
        });

        test('应该能够使缓存失效', async () => {
            QueryCacheService.prototype.invalidateCache.mockResolvedValue(5);

            const result = await cacheManager.invalidateCache('user*');

            expect(result).toBe(5);
        });

        test('应该能够根据事件使缓存失效', async () => {
            QueryCacheService.prototype.invalidateByEvent.mockResolvedValue(3);

            const result = await cacheManager.invalidateByEvent('user_update');

            expect(result).toBe(3);
        });
    });

    describe('预热功能', () => {
        beforeEach(async () => {
            CacheService.prototype.initialize.mockResolvedValue(true);
            CacheService.prototype.isAvailable.mockReturnValue(true);
            await cacheManager.initialize();
        });

        test('应该能够执行预热', async () => {
            const mockResult = { total: 10, successful: 8, failed: 2 };
            CacheWarmupService.prototype.performWarmup.mockResolvedValue(mockResult);

            const result = await cacheManager.performWarmup();

            expect(result).toEqual(mockResult);
        });

        test('应该能够预热特定类型', async () => {
            const mockResult = { itemCount: 5, duration: 1000 };
            CacheWarmupService.prototype.warmupType.mockResolvedValue(mockResult);

            const result = await cacheManager.warmupType('systemConfig');

            expect(result).toEqual(mockResult);
        });
    });

    describe('统计信息', () => {
        beforeEach(async () => {
            CacheService.prototype.initialize.mockResolvedValue(true);
            CacheService.prototype.isAvailable.mockReturnValue(true);
            await cacheManager.initialize();
        });

        test('应该能够获取统计信息', async () => {
            const mockCacheStats = { hits: 100, misses: 20 };
            const mockQueryStats = { totalQueries: 50, cacheHits: 30 };
            const mockWarmupStats = { totalTasks: 5, completedTasks: 4 };

            CacheService.prototype.getStats.mockResolvedValue(mockCacheStats);
            QueryCacheService.prototype.getQueryStats.mockReturnValue(mockQueryStats);
            CacheWarmupService.prototype.getStats.mockReturnValue(mockWarmupStats);

            const stats = await cacheManager.getStats();

            expect(stats.cache).toEqual(mockCacheStats);
            expect(stats.queryCache).toEqual(mockQueryStats);
            expect(stats.warmup).toEqual(mockWarmupStats);
            expect(stats).toHaveProperty('initialized');
            expect(stats).toHaveProperty('timestamp');
        });
    });

    describe('健康检查', () => {
        beforeEach(async () => {
            CacheService.prototype.initialize.mockResolvedValue(true);
            CacheService.prototype.isAvailable.mockReturnValue(true);
            await cacheManager.initialize();
        });

        test('应该返回健康状态', async () => {
            const mockCacheHealth = { status: 'healthy' };
            const mockQueryHealth = { status: 'healthy' };
            const mockMonitoringHealth = { status: 'healthy' };
            const mockWarmupHealth = { status: 'healthy' };

            CacheService.prototype.healthCheck.mockResolvedValue(mockCacheHealth);
            QueryCacheService.prototype.healthCheck.mockResolvedValue(mockQueryHealth);
            CacheMonitoringService.prototype.healthCheck.mockResolvedValue(mockMonitoringHealth);
            CacheWarmupService.prototype.healthCheck.mockResolvedValue(mockWarmupHealth);

            const health = await cacheManager.healthCheck();

            expect(health.status).toBe('healthy');
            expect(health.services.cache).toEqual(mockCacheHealth);
            expect(health.services.queryCache).toEqual(mockQueryHealth);
            expect(health.services.monitoring).toEqual(mockMonitoringHealth);
            expect(health.services.warmup).toEqual(mockWarmupHealth);
        });

        test('任一服务不健康时应该返回降级状态', async () => {
            const mockCacheHealth = { status: 'unhealthy' };
            CacheService.prototype.healthCheck.mockResolvedValue(mockCacheHealth);

            const health = await cacheManager.healthCheck();

            expect(health.status).toBe('degraded');
        });
    });

    describe('清理功能', () => {
        beforeEach(async () => {
            CacheService.prototype.initialize.mockResolvedValue(true);
            CacheService.prototype.isAvailable.mockReturnValue(true);
            await cacheManager.initialize();
        });

        test('应该能够清空所有缓存', async () => {
            CacheService.prototype.flush.mockResolvedValue(100);

            const result = await cacheManager.flush();

            expect(result).toBe(100);
            expect(CacheService.prototype.flush).toHaveBeenCalled();
        });

        test('应该能够关闭缓存管理器', async () => {
            CacheService.prototype.close.mockResolvedValue(undefined);
            CacheMonitoringService.prototype.stopMonitoring.mockReturnValue(undefined);
            CacheWarmupService.prototype.stop.mockReturnValue(undefined);

            await cacheManager.close();

            expect(cacheManager.isInitialized).toBe(false);
            expect(CacheService.prototype.close).toHaveBeenCalled();
        });
    });

    describe('可用性检查', () => {
        test('初始化前应该不可用', () => {
            expect(cacheManager.isAvailable()).toBe(false);
        });

        test('初始化后应该可用', async () => {
            CacheService.prototype.initialize.mockResolvedValue(true);
            CacheService.prototype.isAvailable.mockReturnValue(true);

            await cacheManager.initialize();

            expect(cacheManager.isAvailable()).toBe(true);
        });

        test('降级模式下应该可用', async () => {
            CacheService.prototype.initialize.mockResolvedValue(false);

            await cacheManager.initialize();

            expect(cacheManager.isAvailable()).toBe(true);
        });
    });
});