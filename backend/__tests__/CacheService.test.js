/**
 * CacheService 测试
 */

const CacheService = require('../services/CacheService');

// Mock Redis
jest.mock('redis', () => ({
    createClient: jest.fn(() => ({
        connect: jest.fn().mockResolvedValue(true),
        ping: jest.fn().mockResolvedValue('PONG'),
        setex: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(null),
        del: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([]),
        exists: jest.fn().mockResolvedValue(1),
        ttl: jest.fn().mockResolvedValue(3600),
        expire: jest.fn().mockResolvedValue(1),
        info: jest.fn().mockResolvedValue('used_memory:1000\nmaxmemory:10000'),
        sadd: jest.fn().mockResolvedValue(1),
        srem: jest.fn().mockResolvedValue(1),
        smembers: jest.fn().mockResolvedValue([]),
        hincrby: jest.fn().mockResolvedValue(1),
        quit: jest.fn().mockResolvedValue('OK'),
        on: jest.fn()
    }))
}));

describe('CacheService', () => {
    let cacheService;

    beforeEach(async () => {
        cacheService = new CacheService();
        await cacheService.initialize();
    });

    afterEach(async () => {
        await cacheService.close();
    });

    describe('初始化', () => {
        test('应该成功初始化Redis连接', async () => {
            expect(cacheService.isAvailable()).toBe(true);
        });
    });

    describe('基本缓存操作', () => {
        test('应该能够设置缓存', async () => {
            const result = await cacheService.set('test_results', 'test1', { data: 'test' });
            expect(result).toBe(true);
        });

        test('应该能够获取缓存', async () => {
            // Mock返回缓存数据
            const mockData = JSON.stringify({ data: 'test' });
            cacheService.redis.get.mockResolvedValueOnce(mockData);

            const result = await cacheService.get('test_results', 'test1');
            expect(result).toEqual({ data: 'test' });
        });

        test('应该能够删除缓存', async () => {
            const result = await cacheService.delete('test_results', 'test1');
            expect(result).toBe(true);
        });

        test('应该能够检查缓存是否存在', async () => {
            const result = await cacheService.exists('test_results', 'test1');
            expect(result).toBe(true);
        });
    });

    describe('批量操作', () => {
        test('应该能够批量删除缓存', async () => {
            cacheService.redis.keys.mockResolvedValueOnce(['key1', 'key2']);
            cacheService.redis.del.mockResolvedValueOnce(2);

            const result = await cacheService.deletePattern('test_results', 'test*');
            expect(result).toBe(2);
        });

        test('应该能够根据标签删除缓存', async () => {
            cacheService.redis.smembers.mockResolvedValueOnce(['key1', 'key2']);
            cacheService.redis.del.mockResolvedValueOnce(2);

            const result = await cacheService.deleteByTag('test');
            expect(result).toBe(2);
        });
    });

    describe('TTL管理', () => {
        test('应该能够获取缓存TTL', async () => {
            const result = await cacheService.getTTL('test_results', 'test1');
            expect(result).toBe(3600);
        });

        test('应该能够延长缓存TTL', async () => {
            const result = await cacheService.extendTTL('test_results', 'test1', 1800);
            expect(result).toBe(true);
        });
    });

    describe('缓存预热', () => {
        test('应该能够执行缓存预热', async () => {
            const dataLoader = jest.fn().mockResolvedValue({
                item1: { data: 'test1' },
                item2: { data: 'test2' }
            });

            const result = await cacheService.warmup('test_results', dataLoader);
            expect(result).toBe(2);
            expect(dataLoader).toHaveBeenCalled();
        });

        test('应该能够批量预热', async () => {
            const warmupTasks = [
                {
                    strategy: 'test_results',
                    dataLoader: jest.fn().mockResolvedValue({ item1: { data: 'test1' } })
                },
                {
                    strategy: 'user_sessions',
                    dataLoader: jest.fn().mockResolvedValue({ item2: { data: 'test2' } })
                }
            ];

            const results = await cacheService.batchWarmup(warmupTasks);
            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(true);
        });
    });

    describe('统计信息', () => {
        test('应该能够获取缓存统计', async () => {
            cacheService.redis.keys.mockResolvedValue(['key1', 'key2']);

            const stats = await cacheService.getStats();
            expect(stats).toHaveProperty('connected');
            expect(stats).toHaveProperty('timestamp');
            expect(stats).toHaveProperty('redis');
        });
    });

    describe('健康检查', () => {
        test('应该返回健康状态', async () => {
            const health = await cacheService.healthCheck();
            expect(health.status).toBe('healthy');
            expect(health).toHaveProperty('responseTime');
            expect(health).toHaveProperty('timestamp');
        });

        test('连接失败时应该返回不健康状态', async () => {
            cacheService.isConnected = false;

            const health = await cacheService.healthCheck();
            expect(health.status).toBe('unhealthy');
        });
    });

    describe('错误处理', () => {
        test('Redis不可用时应该优雅处理', async () => {
            cacheService.isConnected = false;

            const result = await cacheService.set('test_results', 'test1', { data: 'test' });
            expect(result).toBe(false);

            const getData = await cacheService.get('test_results', 'test1');
            expect(getData).toBeNull();
        });

        test('无效策略应该抛出错误', async () => {
            await expect(cacheService.set('invalid_strategy', 'test1', { data: 'test' }))
                .rejects.toThrow('未知的缓存策略: invalid_strategy');
        });
    });
});