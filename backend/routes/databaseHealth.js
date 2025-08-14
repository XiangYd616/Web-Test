/**
 * 数据库健康检查和监控API
 */

const express = require('express');
const router = express.Router();
const { getConnectionManager, healthCheck, getStats } = require('../config/database');

/**
 * 获取数据库健康状态
 */
router.get('/health', async (req, res) => {
    try {
        const healthStatus = await healthCheck();

        res.json({
            success: true,
            data: healthStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * 获取数据库连接管理器状态
 */
router.get('/status', async (req, res) => {
    try {
        const manager = await getConnectionManager();
        const status = manager.getStatus();

        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * 获取数据库性能指标
 */
router.get('/metrics', async (req, res) => {
    try {
        const manager = await getConnectionManager();
        const metrics = manager.getPerformanceMetrics();
        const stats = await getStats();

        res.json({
            success: true,
            data: {
                performance: metrics,
                database: stats
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * 获取数据库统计信息
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await getStats();

        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * 执行数据库连接测试
 */
router.post('/test-connection', async (req, res) => {
    try {
        const manager = await getConnectionManager();
        const testResult = await manager.testConnection();

        res.json({
            success: true,
            message: '数据库连接测试成功',
            data: testResult,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * 获取慢查询信息
 */
router.get('/slow-queries', async (req, res) => {
    try {
        const manager = await getConnectionManager();
        const status = manager.getStatus();

        res.json({
            success: true,
            data: {
                slowQueries: status.stats.slowQueries,
                averageQueryTime: status.stats.averageQueryTime,
                totalQueries: status.stats.totalQueries,
                successRate: status.stats.successRate
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * 获取连接池信息
 */
router.get('/pool', async (req, res) => {
    try {
        const manager = await getConnectionManager();
        const status = manager.getStatus();

        res.json({
            success: true,
            data: {
                pool: status.pool,
                config: status.config,
                isConnected: status.isConnected,
                environment: status.environment
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * 强制重连数据库
 */
router.post('/reconnect', async (req, res) => {
    try {
        const manager = await getConnectionManager();

        // 重置连接状态
        manager.isConnected = false;
        manager.reconnectAttempts = 0;

        // 尝试重连
        await manager.reconnect();

        res.json({
            success: true,
            message: '数据库重连成功',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;