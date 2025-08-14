/**
 * 缓存管理路由
 * 提供缓存监控、管理和分析功能
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const cacheService = require('../services/redis/cache');
const cacheMonitoring = require('../services/redis/monitoring');
const cacheWarmup = require('../services/redis/warmup');
const cacheAnalytics = require('../services/redis/analytics');
const fallbackHandler = require('../utils/fallback');

const router = express.Router();

/**
 * 获取缓存统计信息
 * GET /api/cache/stats
 */
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const period = req.query.period || '1h';
    const report = cacheMonitoring.getMonitoringReport(period);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * 获取缓存健康状态
 * GET /api/cache/health
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    const health = {
      redis: {
        available: cacheService.isAvailable(),
        stats: cacheService.getStats()
      },
      fallback: fallbackHandler.getFallbackReport(),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * 清空缓存
 * POST /api/cache/flush
 */
router.post('/flush', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { type = 'all' } = req.body;
    let result = false;
    
    switch (type) {
      case 'redis':
        if (cacheService.isAvailable()) {
          result = await cacheService.flush();
        }
        break;
      case 'memory':
        result = fallbackHandler.clearMemoryCache() > 0;
        break;
      case 'all':
      default:
        const redisResult = cacheService.isAvailable() ? await cacheService.flush() : true;
        const memoryResult = fallbackHandler.clearMemoryCache() > 0;
        result = redisResult || memoryResult;
        break;
    }
    
    res.json({
      success: true,
      message: `${type} 缓存已清空`,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * 缓存预热
 * POST /api/cache/warmup
 */
router.post('/warmup', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { url, testTypes } = req.body;
    
    let result;
    if (url) {
      // 预热特定URL
      result = await cacheWarmup.warmupUrl(url, testTypes);
    } else {
      // 全量预热
      result = await cacheWarmup.startWarmup();
    }
    
    res.json({
      success: true,
      message: url ? `URL ${url} 预热完成` : '缓存预热完成',
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * 获取预热统计
 * GET /api/cache/warmup/stats
 */
router.get('/warmup/stats', asyncHandler(async (req, res) => {
  try {
    const stats = await cacheWarmup.getWarmupStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * 执行缓存分析
 * POST /api/cache/analyze
 */
router.post('/analyze', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const analysis = await cacheAnalytics.performAnalysis();
    
    if (!analysis) {
      return res.status(503).json({
        success: false,
        message: 'Redis不可用，无法执行分析'
      });
    }
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * 获取分析报告
 * GET /api/cache/analyze/report
 */
router.get('/analyze/report', asyncHandler(async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const report = await cacheAnalytics.generateReport(format);
    
    if (!report) {
      return res.status(503).json({
        success: false,
        message: 'Redis不可用，无法生成报告'
      });
    }
    
    if (format === 'text') {
      res.set('Content-Type', 'text/plain');
      res.send(report);
    } else {
      res.json({
        success: true,
        data: report
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * 获取缓存键信息
 * GET /api/cache/keys
 */
router.get('/keys', authMiddleware, asyncHandler(async (req, res) => {
  try {
    if (!cacheService.isAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'Redis不可用'
      });
    }
    
    const { pattern = '*', limit = 100 } = req.query;
    const redis = require('../services/redis/connection').getClient();
    
    const keys = await redis.keys(pattern);
    const limitedKeys = keys.slice(0, parseInt(limit));
    
    // 获取键的详细信息
    const keyDetails = await Promise.all(
      limitedKeys.map(async (key) => {
        const [type, ttl, size] = await Promise.all([
          redis.type(key),
          redis.ttl(key),
          redis.memory('usage', key).catch(() => 0)
        ]);
        
        return {
          key,
          type,
          ttl,
          size
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        total: keys.length,
        returned: keyDetails.length,
        keys: keyDetails
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * 删除指定缓存键
 * DELETE /api/cache/keys/:key
 */
router.delete('/keys/:key', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { key } = req.params;
    const result = await cacheService.delete(key);
    
    res.json({
      success: true,
      message: `缓存键 ${key} 已删除`,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * 获取指定缓存键的值
 * GET /api/cache/keys/:key/value
 */
router.get('/keys/:key/value', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { key } = req.params;
    const value = await cacheService.get(key);
    
    if (value === null) {
      return res.status(404).json({
        success: false,
        message: '缓存键不存在或已过期'
      });
    }
    
    res.json({
      success: true,
      data: {
        key,
        value,
        ttl: await cacheService.getTTL(key)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * 设置缓存键的值
 * PUT /api/cache/keys/:key/value
 */
router.put('/keys/:key/value', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { key } = req.params;
    const { value, ttl = 3600 } = req.body;
    
    const result = await cacheService.set(key, value, { ttl });
    
    res.json({
      success: true,
      message: `缓存键 ${key} 已设置`,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * 重置缓存统计
 * POST /api/cache/stats/reset
 */
router.post('/stats/reset', authMiddleware, asyncHandler(async (req, res) => {
  try {
    cacheService.resetStats();
    
    res.json({
      success: true,
      message: '缓存统计已重置'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * 获取降级状态
 * GET /api/cache/fallback
 */
router.get('/fallback', asyncHandler(async (req, res) => {
  try {
    const fallbackReport = fallbackHandler.getFallbackReport();
    
    res.json({
      success: true,
      data: fallbackReport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

module.exports = router;
