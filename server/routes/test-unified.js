/**
 * 统一的测试路由 - 重构版本
 * 支持所有测试类型的统一API接口
 */

const express = require('express');
const { query } = require('../config/database');
const {
    authMiddleware,
    optionalAuth,
    requirePermission,
    PERMISSIONS
} = require('../middleware/auth');
const { testRateLimiter, historyRateLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const { ErrorFactory } = require('../utils/ApiError');
const { ErrorCodes } = require('../types/ApiResponse');

// 导入测试引擎服务
const TestEngineManager = require('../services/TestEngineManager');
const TestHistoryService = require('../services/TestHistoryService');
const TestValidationService = require('../services/TestValidationService');

const router = express.Router();

// 创建服务实例
const testEngineManager = new TestEngineManager();
const testHistoryService = new TestHistoryService(require('../config/database'));
const testValidationService = new TestValidationService();

/**
 * 测试类型配置
 */
const TEST_TYPES = {
    SEO: 'seo',
    PERFORMANCE: 'performance',
    SECURITY: 'security',
    ACCESSIBILITY: 'accessibility',
    COMPATIBILITY: 'compatibility',
    API: 'api',
    STRESS: 'stress',
    UX: 'ux'
};

/**
 * 获取API信息
 * GET /api/test
 */
router.get('/', asyncHandler(async (req, res) => {
    const apiInfo = {
        name: 'Test API',
        version: '2.0',
        description: '统一的网站测试API，支持多种测试类型',
        supportedTestTypes: Object.values(TEST_TYPES),
        endpoints: {
            create: 'POST /api/test/create',
            execute: 'POST /api/test/execute',
            status: 'GET /api/test/:testId/status',
            result: 'GET /api/test/:testId/result',
            cancel: 'POST /api/test/:testId/cancel',
            history: 'GET /api/test/history',
            types: 'GET /api/test/types',
            engines: 'GET /api/test/engines'
        },
        authentication: {
            required: true,
            type: 'Bearer Token',
            permissions: {
                create: PERMISSIONS.TEST_CREATE,
                execute: PERMISSIONS.TEST_EXECUTE,
                read: PERMISSIONS.TEST_READ,
                delete: PERMISSIONS.TEST_DELETE
            }
        }
    };

    return res.success(apiInfo, 'Test API信息');
}));

/**
 * 获取支持的测试类型
 * GET /api/test/types
 */
router.get('/types', asyncHandler(async (req, res) => {
    const testTypes = await testEngineManager.getSupportedTestTypes();

    return res.success({
        types: testTypes,
        count: testTypes.length
    }, '获取测试类型成功');
}));

/**
 * 获取测试引擎状态
 * GET /api/test/engines
 */
router.get('/engines', asyncHandler(async (req, res) => {
    const engineStatus = await testEngineManager.getEngineStatus();

    return res.success(engineStatus, '获取引擎状态成功');
}));

/**
 * 创建测试配置
 * POST /api/test/create
 */
router.post('/create',
    authMiddleware,
    requirePermission(PERMISSIONS.TEST_CREATE),
    testRateLimiter,
    asyncHandler(async (req, res) => {
        const { testType, config, name, description } = req.body;

        // 验证测试类型
        if (!testType || !Object.values(TEST_TYPES).includes(testType)) {
            return res.validationError([{
                field: 'testType',
                message: `测试类型必须是以下之一: ${Object.values(TEST_TYPES).join(', ')}`
            }]);
        }

        // 验证测试配置
        const validationResult = await testValidationService.validateTestConfig(testType, config);
        if (!validationResult.isValid) {
            return res.validationError(validationResult.errors);
        }

        try {
            // 创建测试记录
            const testRecord = await testHistoryService.createTestRecord({
                userId: req.user.id,
                testType,
                testName: name || `${testType}测试`,
                description: description || '',
                config: validationResult.normalizedConfig,
                status: 'created'
            });

            return res.success({
                testId: testRecord.testId,
                testType,
                name: testRecord.testName,
                status: testRecord.status,
                config: testRecord.config,
                createdAt: testRecord.createdAt
            }, '测试创建成功', 201);

        } catch (error) {
            console.error('创建测试失败:', error);
            throw ErrorFactory.test('configuration', '测试创建失败', {
                testType,
                error: error.message
            });
        }
    })
);

/**
 * 执行测试
 * POST /api/test/execute
 */
router.post('/execute',
    authMiddleware,
    requirePermission(PERMISSIONS.TEST_EXECUTE),
    testRateLimiter,
    asyncHandler(async (req, res) => {
        const { testId, immediate = false } = req.body;

        if (!testId) {
            return res.validationError([{
                field: 'testId',
                message: '测试ID是必需的'
            }]);
        }

        try {
            // 获取测试记录
            const testRecord = await testHistoryService.getTestRecord(testId, req.user.id);
            if (!testRecord) {
                return res.notFound('测试记录');
            }

            if (testRecord.status === 'running') {
                return res.conflict('测试', '测试正在运行中');
            }

            if (testRecord.status === 'completed') {
                return res.conflict('测试', '测试已完成');
            }

            // 检查测试引擎是否可用
            const engineAvailable = await testEngineManager.isEngineAvailable(testRecord.testType);
            if (!engineAvailable) {
                throw ErrorFactory.test('engineUnavailable', `${testRecord.testType}测试引擎不可用`);
            }

            // 启动测试
            await testHistoryService.startTest(testId, req.user.id);

            if (immediate) {
                // 立即执行测试
                const result = await testEngineManager.executeTest(
                    testRecord.testType,
                    testRecord.config,
                    {
                        testId,
                        userId: req.user.id,
                        onProgress: (progress) => {
                            // 更新测试进度
                            testHistoryService.updateTestProgress(testId, progress).catch(console.error);
                        }
                    }
                );

                // 完成测试
                await testHistoryService.completeTest(testId, result, req.user.id);

                return res.success({
                    testId,
                    status: 'completed',
                    result,
                    executedAt: new Date().toISOString()
                }, '测试执行完成');

            } else {
                // 异步执行测试
                testEngineManager.executeTestAsync(
                    testRecord.testType,
                    testRecord.config,
                    {
                        testId,
                        userId: req.user.id,
                        onProgress: (progress) => {
                            testHistoryService.updateTestProgress(testId, progress).catch(console.error);
                        },
                        onComplete: (result) => {
                            testHistoryService.completeTest(testId, result, req.user.id).catch(console.error);
                        },
                        onError: (error) => {
                            testHistoryService.failTest(testId, error.message, error, req.user.id).catch(console.error);
                        }
                    }
                );

                return res.success({
                    testId,
                    status: 'running',
                    message: '测试已开始执行',
                    startedAt: new Date().toISOString()
                }, '测试启动成功');
            }

        } catch (error) {
            console.error('执行测试失败:', error);

            // 标记测试失败
            if (testId) {
                testHistoryService.failTest(testId, error.message, error, req.user.id).catch(console.error);
            }

            throw ErrorFactory.fromError(error);
        }
    })
);

/**
 * 获取测试状态
 * GET /api/test/:testId/status
 */
router.get('/:testId/status',
    authMiddleware,
    requirePermission(PERMISSIONS.TEST_READ),
    asyncHandler(async (req, res) => {
        const { testId } = req.params;

        try {
            const testRecord = await testHistoryService.getTestRecord(testId, req.user.id);
            if (!testRecord) {
                return res.notFound('测试记录');
            }

            const status = {
                testId,
                status: testRecord.status,
                testType: testRecord.testType,
                progress: testRecord.progress || 0,
                startedAt: testRecord.startTime,
                completedAt: testRecord.endTime,
                duration: testRecord.duration,
                error: testRecord.errorMessage
            };

            return res.success(status, '获取测试状态成功');

        } catch (error) {
            console.error('获取测试状态失败:', error);
            throw ErrorFactory.fromError(error);
        }
    })
);

/**
 * 获取测试结果
 * GET /api/test/:testId/result
 */
router.get('/:testId/result',
    authMiddleware,
    requirePermission(PERMISSIONS.TEST_READ),
    asyncHandler(async (req, res) => {
        const { testId } = req.params;
        const { format = 'json' } = req.query;

        try {
            const testRecord = await testHistoryService.getTestRecord(testId, req.user.id);
            if (!testRecord) {
                return res.notFound('测试记录');
            }

            if (testRecord.status !== 'completed') {
                return res.error(ErrorCodes.INVALID_REQUEST, '测试尚未完成');
            }

            const result = {
                testId,
                testType: testRecord.testType,
                testName: testRecord.testName,
                status: testRecord.status,
                config: testRecord.config,
                results: testRecord.results,
                metrics: testRecord.metrics,
                startedAt: testRecord.startTime,
                completedAt: testRecord.endTime,
                duration: testRecord.duration
            };

            // 根据格式返回结果
            if (format === 'summary') {
                const summary = await testEngineManager.generateTestSummary(testRecord.testType, testRecord.results);
                return res.success({
                    ...result,
                    summary
                }, '获取测试结果摘要成功');
            }

            return res.success(result, '获取测试结果成功');

        } catch (error) {
            console.error('获取测试结果失败:', error);
            throw ErrorFactory.fromError(error);
        }
    })
);

/**
 * 取消测试
 * POST /api/test/:testId/cancel
 */
router.post('/:testId/cancel',
    authMiddleware,
    requirePermission(PERMISSIONS.TEST_UPDATE),
    asyncHandler(async (req, res) => {
        const { testId } = req.params;
        const { reason = '用户取消' } = req.body;

        try {
            const testRecord = await testHistoryService.getTestRecord(testId, req.user.id);
            if (!testRecord) {
                return res.notFound('测试记录');
            }

            if (testRecord.status !== 'running') {
                return res.conflict('测试', '只能取消正在运行的测试');
            }

            // 取消测试引擎中的测试
            await testEngineManager.cancelTest(testRecord.testType, testId);

            // 更新测试状态
            await testHistoryService.cancelTest(testId, reason, req.user.id);

            return res.success({
                testId,
                status: 'cancelled',
                reason,
                cancelledAt: new Date().toISOString()
            }, '测试取消成功');

        } catch (error) {
            console.error('取消测试失败:', error);
            throw ErrorFactory.fromError(error);
        }
    })
);

/**
 * 获取测试历史
 * GET /api/test/history
 */
router.get('/history',
    optionalAuth,
    historyRateLimiter,
    asyncHandler(async (req, res) => {
        const {
            page = 1,
            limit = 10,
            testType,
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // 未登录用户不能查看历史记录
        if (!req.user) {
            return res.unauthorized('请登录以查看测试历史记录');
        }

        try {
            const result = await testHistoryService.getTestHistory(req.user.id, testType, {
                page: parseInt(page),
                limit: parseInt(limit),
                status,
                sortBy,
                sortOrder: sortOrder.toUpperCase()
            });

            if (!result.success) {
                throw ErrorFactory.fromError(new Error(result.message));
            }

            return res.paginated(
                result.data.tests,
                parseInt(page),
                parseInt(limit),
                result.data.pagination.total,
                '获取测试历史成功'
            );

        } catch (error) {
            console.error('获取测试历史失败:', error);
            throw ErrorFactory.fromError(error);
        }
    })
);

/**
 * 批量操作测试记录
 * POST /api/test/batch
 */
router.post('/batch',
    authMiddleware,
    requirePermission(PERMISSIONS.TEST_DELETE),
    asyncHandler(async (req, res) => {
        const { action, testIds, filters } = req.body;

        if (!action) {
            return res.validationError([{
                field: 'action',
                message: '操作类型是必需的'
            }]);
        }

        if (!testIds && !filters) {
            return res.validationError([{
                field: 'testIds',
                message: '必须提供测试ID列表或过滤条件'
            }]);
        }

        try {
            let result;

            switch (action) {
                case 'delete':
                    result = await testHistoryService.batchDeleteTests(testIds || [], filters, req.user.id);
                    break;
                case 'cancel':
                    result = await testHistoryService.batchCancelTests(testIds || [], filters, req.user.id);
                    break;
                default:
                    return res.validationError([{
                        field: 'action',
                        message: '不支持的操作类型'
                    }]);
            }

            return res.success({
                action,
                processedCount: result.processedCount,
                successCount: result.successCount,
                failedCount: result.failedCount,
                errors: result.errors
            }, `批量${action}操作完成`);

        } catch (error) {
            console.error('批量操作失败:', error);
            throw ErrorFactory.fromError(error);
        }
    })
);

/**
 * 获取测试统计信息
 * GET /api/test/statistics
 */
router.get('/statistics',
    optionalAuth,
    asyncHandler(async (req, res) => {
        const { timeRange = 30 } = req.query;
        const days = parseInt(timeRange);

        try {
            let whereClause = 'WHERE created_at >= NOW() - INTERVAL $1 DAY';
            const params = [days];

            // 如果用户已登录，只统计该用户的记录
            if (req.user?.id) {
                whereClause += ' AND user_id = $2';
                params.push(req.user.id);
            } else {
                // 未登录用户返回空统计
                return res.success({
                    totalTests: 0,
                    completedTests: 0,
                    failedTests: 0,
                    runningTests: 0,
                    testsByType: {},
                    averageDuration: 0,
                    successRate: 0,
                    timeRange: days
                }, '请登录以查看详细统计信息');
            }

            // 获取统计数据
            const statsResult = await query(`
        SELECT
          COUNT(*) as total_tests,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
          COUNT(CASE WHEN status = 'running' THEN 1 END) as running_tests,
          AVG(CASE WHEN duration IS NOT NULL THEN duration END) as avg_duration,
          test_type,
          COUNT(*) as type_count
        FROM test_sessions
        ${whereClause}
        GROUP BY test_type
      `, params);

            const testsByType = {};
            let totalTests = 0;
            let completedTests = 0;
            let failedTests = 0;
            let runningTests = 0;
            let totalDuration = 0;
            let durationCount = 0;

            statsResult.rows.forEach(row => {
                const count = parseInt(row.type_count);
                testsByType[row.test_type] = count;
                totalTests += count;
                completedTests += parseInt(row.completed_tests) || 0;
                failedTests += parseInt(row.failed_tests) || 0;
                runningTests += parseInt(row.running_tests) || 0;

                if (row.avg_duration) {
                    totalDuration += parseFloat(row.avg_duration) * count;
                    durationCount += count;
                }
            });

            const averageDuration = durationCount > 0 ? totalDuration / durationCount : 0;
            const successRate = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;

            return res.success({
                totalTests,
                completedTests,
                failedTests,
                runningTests,
                testsByType,
                averageDuration: Math.round(averageDuration),
                successRate: Math.round(successRate * 100) / 100,
                timeRange: days
            }, '获取测试统计信息成功');

        } catch (error) {
            console.error('获取测试统计信息失败:', error);
            throw ErrorFactory.fromError(error);
        }
    })
);

module.exports = router;