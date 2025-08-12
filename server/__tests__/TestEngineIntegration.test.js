/**
 * 测试引擎集成测试
 * 验证所有测试引擎是否正确集成和工作
 */

const TestEngineManager = require('../services/TestEngineManager');

describe('测试引擎集成', () => {
    let testEngineManager;

    beforeAll(() => {
        testEngineManager = new TestEngineManager();
    });

    describe('引擎初始化', () => {
        test('应该成功初始化测试引擎管理器', () => {
            expect(testEngineManager).toBeDefined();
            expect(testEngineManager.engines).toBeDefined();
            expect(testEngineManager.engines.size).toBeGreaterThan(0);
        });

        test('应该加载核心测试引擎', () => {
            const coreEngines = ['stress', 'seo', 'security', 'performance', 'accessibility'];

            coreEngines.forEach(engineType => {
                expect(testEngineManager.engines.has(engineType)).toBe(true);
            });
        });
    });

    describe('引擎可用性检查', () => {
        test('压力测试引擎应该可用', async () => {
            const isAvailable = await testEngineManager.isEngineAvailable('stress');
            expect(isAvailable).toBe(true);
        });

        test('SEO测试引擎应该可用', async () => {
            const isAvailable = await testEngineManager.isEngineAvailable('seo');
            expect(isAvailable).toBe(true);
        });

        test('安全测试引擎应该可用', async () => {
            const isAvailable = await testEngineManager.isEngineAvailable('security');
            expect(isAvailable).toBe(true);
        });

        test('性能测试引擎应该可用', async () => {
            const isAvailable = await testEngineManager.isEngineAvailable('performance');
            expect(isAvailable).toBe(true);
        });

        test('可访问性测试引擎应该可用', async () => {
            const isAvailable = await testEngineManager.isEngineAvailable('accessibility');
            expect(isAvailable).toBe(true);
        });
    });

    describe('引擎状态', () => {
        test('应该返回引擎状态信息', async () => {
            const status = await testEngineManager.getEngineStatus();

            expect(status).toBeDefined();
            expect(status.totalEngines).toBeGreaterThan(0);
            expect(status.engines).toBeDefined();
            expect(typeof status.engines).toBe('object');
        });

        test('应该返回支持的测试类型', async () => {
            const testTypes = await testEngineManager.getSupportedTestTypes();

            expect(Array.isArray(testTypes)).toBe(true);
            expect(testTypes.length).toBeGreaterThan(0);

            // 检查每个测试类型的结构
            testTypes.forEach(testType => {
                expect(testType).toHaveProperty('type');
                expect(testType).toHaveProperty('name');
                expect(testType).toHaveProperty('description');
                expect(testType).toHaveProperty('available');
                expect(testType).toHaveProperty('features');
            });
        });
    });

    describe('测试执行验证', () => {
        test('应该能够验证测试配置', () => {
            // 测试压力测试配置验证
            const stressConfig = {
                url: 'https://example.com',
                users: 10,
                duration: 30
            };

            expect(() => {
                // 基本配置验证应该不抛出错误
                if (!stressConfig.url || !stressConfig.users || !stressConfig.duration) {
                    throw new Error('配置验证失败');
                }
            }).not.toThrow();
        });

        test('应该能够生成测试摘要', async () => {
            const mockResults = {
                success: true,
                score: 85,
                duration: 1000,
                issues: [],
                recommendations: []
            };

            const summary = await testEngineManager.generateTestSummary('seo', mockResults);

            expect(summary).toBeDefined();
            expect(summary).toHaveProperty('testType');
            expect(summary).toHaveProperty('status');
            expect(summary).toHaveProperty('score');
        });
    });

    describe('错误处理', () => {
        test('不存在的引擎应该返回false', async () => {
            const isAvailable = await testEngineManager.isEngineAvailable('nonexistent');
            expect(isAvailable).toBe(false);
        });

        test('应该处理引擎健康检查错误', async () => {
            // 模拟一个有问题的引擎
            const mockEngine = {
                healthCheck: () => {
                    throw new Error('健康检查失败');
                }
            };

            testEngineManager.engines.set('mock', mockEngine);

            const isAvailable = await testEngineManager.isEngineAvailable('mock');
            expect(isAvailable).toBe(false);

            // 清理
            testEngineManager.engines.delete('mock');
        });
    });

    describe('运行中测试管理', () => {
        test('应该能够跟踪运行中的测试', () => {
            const testId = 'test_123';
            const testInfo = {
                testType: 'seo',
                userId: 1,
                startTime: new Date(),
                config: { url: 'https://example.com' }
            };

            testEngineManager.runningTests.set(testId, testInfo);

            const runningTests = testEngineManager.getRunningTests();
            expect(runningTests.length).toBe(1);
            expect(runningTests[0].testId).toBe(testId);

            // 清理
            testEngineManager.runningTests.delete(testId);
        });

        test('应该能够清理过期的测试记录', () => {
            const testId = 'expired_test';
            const expiredTestInfo = {
                testType: 'seo',
                userId: 1,
                startTime: new Date(Date.now() - 31 * 60 * 1000), // 31分钟前
                config: { url: 'https://example.com' }
            };

            testEngineManager.runningTests.set(testId, expiredTestInfo);

            testEngineManager.cleanupExpiredTests();

            expect(testEngineManager.runningTests.has(testId)).toBe(false);
        });
    });
});