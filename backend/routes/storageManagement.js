/**
 * 存储管理API
 * 提供存储、归档和清理功能的HTTP接口
 */

const express = require('express');
const router = express.Router();
const { storageService } = require('../services/storage/StorageService');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { query, body, validationResult } = require('express-validator');

/**
 * GET /api/storage/status
 * 获取存储系统状态
 */
router.get('/status', optionalAuth, async (req, res) => {
  try {
    const healthStatus = await storageService.getHealthStatus();
    const statistics = await storageService.getStorageStatistics();

    res.json({
      success: true,
      data: {
        health: healthStatus,
        statistics,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('获取存储状态失败', error);
    res.status(500).json({
      success: false,
      error: '获取存储状态失败',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/storage/statistics
 * 获取存储统计信息
 */
router.get('/statistics', optionalAuth, async (req, res) => {
  try {
    const statistics = await storageService.getStorageStatistics();

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('获取存储统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取存储统计失败',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/storage/archive
 * 手动触发数据归档
 */
router.post('/archive',
  authMiddleware,
  [
    body('engineType').optional().isString().withMessage('引擎类型必须是字符串'),
    body('criteria').optional().isObject().withMessage('归档条件必须是对象')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '请求参数无效',
          details: errors.array()
        });
      }

      const { engineType, criteria = {} } = req.body;

      const result = await storageService.archiveData(engineType, criteria);

      res.json({
        success: true,
        message: `数据归档${engineType ? ` (${engineType})` : ''}已完成`,
        data: result
      });

    } catch (error) {
      console.error('手动归档失败:', error);
      res.status(500).json({
        success: false,
        error: '数据归档失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

/**
 * POST /api/storage/cleanup
 * 手动触发数据清理
 */
router.post('/cleanup',
  authMiddleware,
  [
    body('engineType').optional().isString().withMessage('引擎类型必须是字符串'),
    body('force').optional().isBoolean().withMessage('强制清理标志必须是布尔值')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '请求参数无效',
          details: errors.array()
        });
      }

      const { engineType, force = false } = req.body;

      // 如果是强制清理，需要额外权限验证
      if (force && !req.user.isAdmin) {

        return res.status(403).json({
          success: false,
          error: '强制清理需要管理员权限'
        });
      }

      const result = await storageService.cleanupData(engineType);

      res.json({
        success: true,
        message: `数据清理${engineType ? ` (${engineType})` : ''}已完成`,
        data: result
      });

    } catch (error) {
      console.error('手动清理失败:', error);
      res.status(500).json({
        success: false,
        error: '数据清理失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

/**
 * POST /api/storage/maintenance
 * 执行存储维护
 */
router.post('/maintenance',
  authMiddleware,
  [
    body('operations').optional().isArray().withMessage('操作列表必须是数组'),
    body('archive').optional().isBoolean().withMessage('归档标志必须是布尔值'),
    body('cleanup').optional().isBoolean().withMessage('清理标志必须是布尔值'),
    body('optimize').optional().isBoolean().withMessage('优化标志必须是布尔值')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '请求参数无效',
          details: errors.array()
        });
      }

      // 维护操作需要管理员权限
      if (!req.user.isAdmin) {

        return res.status(403).json({
          success: false,
          error: '存储维护需要管理员权限'
        });
      }

      const options = {
        archive: req.body.archive,
        cleanup: req.body.cleanup,
        optimize: req.body.optimize
      };

      const result = await storageService.performMaintenance(options);

      res.json({
        success: true,
        message: '存储维护已完成',
        data: result
      });

    } catch (error) {
      console.error('存储维护失败:', error);
      res.status(500).json({
        success: false,
        error: '存储维护失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

/**
 * GET /api/storage/configuration
 * 获取存储配置
 */
router.get('/configuration', authMiddleware, async (req, res) => {
  try {
    // 配置查看需要管理员权限
    if (!req.user.isAdmin) {

      return res.status(403).json({
        success: false,
        error: '查看存储配置需要管理员权限'
      });
    }

    const configuration = storageService.getConfiguration();

    res.json({
      success: true,
      data: configuration
    });

  } catch (error) {
    console.error('获取存储配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取存储配置失败',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * PUT /api/storage/configuration
 * 更新存储配置
 */
router.put('/configuration',
  authMiddleware,
  [
    body('storage').optional().isObject().withMessage('存储配置必须是对象'),
    body('archive').optional().isObject().withMessage('归档配置必须是对象'),
    body('cleanup').optional().isObject().withMessage('清理配置必须是对象')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '请求参数无效',
          details: errors.array()
        });
      }

      // 配置更新需要管理员权限
      if (!req.user.isAdmin) {

        return res.status(403).json({
          success: false,
          error: '更新存储配置需要管理员权限'
        });
      }

      const newConfig = {
        storage: req.body.storage,
        archive: req.body.archive,
        cleanup: req.body.cleanup
      };

      storageService.updateConfiguration(newConfig);

      res.json({
        success: true,
        message: '存储配置已更新',
        data: storageService.getConfiguration()
      });

    } catch (error) {
      console.error('更新存储配置失败:', error);
      res.status(500).json({
        success: false,
        error: '更新存储配置失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

/**
 * GET /api/storage/engines/:engineType/policy
 * 获取特定引擎的存储策略
 */
router.get('/engines/:engineType/policy', authMiddleware, async (req, res) => {
  try {
    const { engineType } = req.params;

    // 验证引擎类型
    const validEngineTypes = [
      'api', 'performance', 'security', 'seo', 'stress',
      'infrastructure', 'ux', 'compatibility', 'website'
    ];

    if (!validEngineTypes.includes(engineType)) {
      return res.status(400).json({
        success: false,
        error: '无效的引擎类型',
        validTypes: validEngineTypes
      });
    }

    // 获取引擎策略（这里需要实现具体的策略获取逻辑）
    const policy = {
      engineType,
      storage: {
        compress: true,
        encrypt: engineType === 'security',
        shard: ['performance', 'stress', 'compatibility'].includes(engineType)
      },
      retention: {
        hotData: 7,
        warmData: 30,
        coldData: 90
      },
      archive: {
        enabled: true,
        schedule: 'daily'
      }
    };

    res.json({
      success: true,
      data: policy
    });

  } catch (error) {
    console.error('获取引擎策略失败:', error);
    res.status(500).json({
      success: false,
      error: '获取引擎策略失败',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * PUT /api/storage/engines/:engineType/policy
 * 更新特定引擎的存储策略
 */
router.put('/engines/:engineType/policy',
  authMiddleware,
  [
    body('storage').optional().isObject().withMessage('存储策略必须是对象'),
    body('retention').optional().isObject().withMessage('保留策略必须是对象'),
    body('archive').optional().isObject().withMessage('归档策略必须是对象')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '请求参数无效',
          details: errors.array()
        });
      }

      const { engineType } = req.params;

      // 策略更新需要管理员权限
      if (!req.user.isAdmin) {

        return res.status(403).json({
          success: false,
          error: '更新存储策略需要管理员权限'
        });
      }

      const { storage, retention, archive } = req.body;

      // 更新各种策略
      if (storage) {
        storageService.setStorageStrategy(engineType, storage);
      }

      if (retention) {
        storageService.setCleanupPolicy(engineType, retention);
      }

      if (archive) {
        storageService.setArchivePolicy(engineType, archive);
      }

      res.json({
        success: true,
        message: `${engineType} 引擎存储策略已更新`
      });

    } catch (error) {
      console.error('更新引擎策略失败:', error);
      res.status(500).json({
        success: false,
        error: '更新引擎策略失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

/**
 * GET /api/storage/usage
 * 获取存储使用情况
 */
router.get('/usage', optionalAuth, async (req, res) => {
  try {
    // 这里需要实现存储使用情况的计算
    const usage = {
      total: 10 * 1024 * 1024 * 1024, // 10GB
      used: 3.5 * 1024 * 1024 * 1024, // 3.5GB
      free: 6.5 * 1024 * 1024 * 1024, // 6.5GB
      percentage: 35,
      breakdown: {
        database: 2 * 1024 * 1024 * 1024,
        files: 1.2 * 1024 * 1024 * 1024,
        archives: 0.3 * 1024 * 1024 * 1024
      },
      byEngine: {
        performance: 800 * 1024 * 1024,
        stress: 600 * 1024 * 1024,
        compatibility: 700 * 1024 * 1024,
        security: 400 * 1024 * 1024,
        others: 1000 * 1024 * 1024
      }
    };

    res.json({
      success: true,
      data: usage
    });

  } catch (error) {
    console.error('获取存储使用情况失败:', error);
    res.status(500).json({
      success: false,
      error: '获取存储使用情况失败',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
