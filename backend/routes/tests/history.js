/**
 * 统一测试历史API路由
 * 提供标准化的测试历史记录接口
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuth } = require('../../middleware/auth');
const { historyRateLimiter } = require('../../middleware/rateLimiter');
const TestHistoryService = require('../../services/testing/TestHistoryService');
const { TestDataTransformer } = require('../../utils/testDataTransformer');
const { query, validationResult } = require('express-validator');

// 初始化服务
let testHistoryService;
try {
  const dbModule = require('../../config/database.js');
  testHistoryService = new TestHistoryService(dbModule);
} catch (error) {
  console.error('初始化TestHistoryService失败:', error);
}

const ensureHistoryService = (res) => {
  if (!testHistoryService) {
    res.status(503).json({
      success: false,
      error: '历史服务不可用'
    });
    return false;
  }
  return true;
};

/**
 * GET /api/test/history
 * 获取测试历史列表
 */
router.get('/', 
  optionalAuth,
  historyRateLimiter,
  [
    query('testType').optional().isString().withMessage('测试类型必须是字符串'),
    query('type').optional().isString().withMessage('测试类型必须是字符串'),
    query('status').optional().isString().withMessage('状态必须是字符串'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('限制数量必须在1-100之间'),
    query('search').optional().isString().withMessage('搜索词必须是字符串'),
    query('sortBy').optional().isString().withMessage('排序字段必须是字符串'),
    query('sortOrder')
      .optional()
      .isIn(['ASC', 'DESC', 'asc', 'desc'])
      .withMessage('排序方向必须是ASC或DESC')
  ],
  async (req, res) => {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '请求参数无效',
          details: errors.array()
        });
      }

      const {
        testType: testTypeParam,
        type: legacyType,
        status,
        page = 1,
        limit = 20,
        search = '',
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const testType = testTypeParam || legacyType;
      const normalizedSortOrder =
        typeof sortOrder === 'string' ? sortOrder.toUpperCase() : 'DESC';

      const userId = req.user?.id;

      // 构建查询参数
      const queryParams = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        status,
        search,
        sortBy,
        sortOrder: normalizedSortOrder,
      };

      // 获取历史记录
      let result;
      if (testHistoryService) {
        // 使用新的历史服务
        result = await testHistoryService.getTestHistory(userId, testType, queryParams);
      } else {
        // 降级处理：返回空数据
        result = {
          success: true,
          data: {
            tests: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false
            }
          }
        };
      }

      // 转换数据格式
      if (result.success && result.data?.tests) {
        result.data.tests = TestDataTransformer.transformHistoryList(result.data.tests);
      }

      res.json(result);

    } catch (error) {
      console.error('获取测试历史失败:', error);
      res.status(500).json({
        success: false,
        error: '获取测试历史失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

/**
 * POST /api/test/history
 * 创建测试记录
 */
router.post('/', 
  authMiddleware,
  async (req, res) => {
    try {
      if (!ensureHistoryService(res)) return;
      const testData = {
        ...req.body,
        userId: req.user.id
      };

      const result = await testHistoryService.createTestRecord(testData);
      res.json(result);
    } catch (error) {
      console.error('创建测试记录失败:', error);
      res.status(500).json({
        success: false,
        error: '创建测试记录失败'
      });
    }
  }
);

/**
 * PUT /api/test/history/:testId
 * 更新测试记录
 */
router.put('/:testId', 
  authMiddleware,
  async (req, res) => {
    try {
      if (!ensureHistoryService(res)) return;
      const { testId } = req.params;
      const userId = req.user.id;

      const session = await testHistoryService.getSessionForUser(testId, userId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: '记录不存在或无权限访问'
        });
      }

      const result = await testHistoryService.updateTestRecord(testId, req.body);
      res.json(result);
    } catch (error) {
      console.error('更新测试记录失败:', error);
      res.status(500).json({
        success: false,
        error: '更新测试记录失败'
      });
    }
  }
);

/**
 * POST /api/test/history/:testId/start
 * 开始测试
 */
router.post('/:testId/start', 
  authMiddleware,
  async (req, res) => {
    try {
      if (!ensureHistoryService(res)) return;
      const { testId } = req.params;
      const userId = req.user.id;
      const result = await testHistoryService.startTest(testId, userId);
      res.json(result);
    } catch (error) {
      console.error('开始测试失败:', error);
      res.status(500).json({
        success: false,
        error: '开始测试失败'
      });
    }
  }
);

/**
 * POST /api/test/history/:testId/progress
 * 更新测试进度
 */
router.post('/:testId/progress', 
  authMiddleware,
  async (req, res) => {
    try {
      if (!ensureHistoryService(res)) return;
      const { testId } = req.params;
      const userId = req.user.id;
      const result = await testHistoryService.updateTestProgress(testId, req.body, userId);
      res.json(result);
    } catch (error) {
      console.error('更新测试进度失败:', error);
      res.status(500).json({
        success: false,
        error: '更新测试进度失败'
      });
    }
  }
);

/**
 * POST /api/test/history/:testId/complete
 * 完成测试
 */
router.post('/:testId/complete', 
  authMiddleware,
  async (req, res) => {
    try {
      if (!ensureHistoryService(res)) return;
      const { testId } = req.params;
      const userId = req.user.id;
      const result = await testHistoryService.completeTest(testId, req.body, userId);
      res.json(result);
    } catch (error) {
      console.error('完成测试失败:', error);
      res.status(500).json({
        success: false,
        error: '完成测试失败'
      });
    }
  }
);

/**
 * POST /api/test/history/:testId/fail
 * 测试失败
 */
router.post('/:testId/fail', 
  authMiddleware,
  async (req, res) => {
    try {
      if (!ensureHistoryService(res)) return;
      const { testId } = req.params;
      const userId = req.user.id;
      const { errorMessage, errorDetails } = req.body || {};
      const result = await testHistoryService.failTest(
        testId,
        { ...req.body, errorMessage, errorDetails },
        userId
      );
      res.json(result);
    } catch (error) {
      console.error('标记测试失败失败:', error);
      res.status(500).json({
        success: false,
        error: '标记测试失败失败'
      });
    }
  }
);

/**
 * POST /api/test/history/:testId/cancel
 * 取消测试
 */
router.post('/:testId/cancel', 
  authMiddleware,
  async (req, res) => {
    try {
      if (!ensureHistoryService(res)) return;
      const { testId } = req.params;
      const userId = req.user.id;
      const reason = req.body?.reason || '用户取消';
      const result = await testHistoryService.cancelTest(
        testId,
        { ...req.body, reason },
        userId
      );
      res.json(result);
    } catch (error) {
      console.error('取消测试失败:', error);
      res.status(500).json({
        success: false,
        error: '取消测试失败'
      });
    }
  }
);

/**
 * GET /api/test/history/:testId/progress
 * 获取测试进度
 */
router.get('/:testId/progress', 
  authMiddleware,
  async (req, res) => {
    try {
      if (!ensureHistoryService(res)) return;
      const { testId } = req.params;
      const userId = req.user.id;
      const result = await testHistoryService.getTestProgress(testId, userId);
      res.json(result);
    } catch (error) {
      console.error('获取测试进度失败:', error);
      res.status(500).json({
        success: false,
        error: '获取测试进度失败'
      });
    }
  }
);

/**
 * GET /api/test/history/export
 * 导出测试历史
 */
router.get('/export', 
  authMiddleware,
  async (req, res) => {
    try {
      if (!ensureHistoryService(res)) return;
      const {
        testType: testTypeParam,
        type: legacyType,
        status,
        format = 'json',
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const testType = testTypeParam || legacyType;
      const normalizedSortOrder =
        typeof sortOrder === 'string' ? sortOrder.toUpperCase() : 'DESC';

      const userId = req.user.id;

      // 验证导出格式
      if (!['json', 'csv', 'excel'].includes(format)) {
        return res.status(400).json({
          success: false,
          error: '不支持的导出格式'
        });
      }

      // 获取要导出的数据
      const queryParams = {
        page: 1,
        limit: 1000,
        status,
        search: '',
        sortBy,
        sortOrder: normalizedSortOrder,
      };

      let result;
      if (testHistoryService) {
        result = await testHistoryService.getTestHistory(userId, testType, queryParams);
      } else {
        return res.status(503).json({
          success: false,
          error: '导出服务不可用'
        });
      }

      if (!result.success) {
        return res.status(500).json(result);
      }

      const data = TestDataTransformer.transformHistoryList(result.data.tests || []);

      // 根据格式返回数据
      switch (format) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="test-history-${Date.now()}.json"`);
          res.json(data);
          break;

        case 'csv': {
          // 简单的CSV导出实现
          const csvHeaders = ['ID', '测试名称', '测试类型', 'URL', '状态', '评分', '创建时间'];
          const csvRows = data.map(item => [
            item.id,
            item.test_name || item.testName || '',
            item.test_type || item.testType || '',
            item.url || '',
            item.status || '',
            item.overall_score || item.overallScore || '',
            item.created_at || item.createdAt || ''
          ]);

          const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="test-history-${Date.now()}.csv"`);
          res.send('\ufeff' + csvContent); // 添加BOM以支持中文
          break;
        }

        default:
          res.status(400).json({
            success: false,
            error: '不支持的导出格式'
          });
      }

    } catch (error) {
      console.error('导出测试历史失败:', error);
      res.status(500).json({
        success: false,
        error: '导出测试历史失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

/**
 * GET /api/test/history/:testId
 * 获取单个测试记录详情
 */
router.get('/:testId', 
  optionalAuth,
  async (req, res) => {
    try {
      const { testId } = req.params;
      const userId = req.user?.id;

      // 验证UUID格式
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(testId)) {
        return res.status(400).json({
          success: false,
          error: '无效的测试ID格式'
        });
      }

      let result;
      if (testHistoryService) {
        result = await testHistoryService.getTestDetails(testId, userId);
      } else {
        result = {
          success: false,
          error: '历史服务不可用'
        };
      }

      // 转换数据格式
      if (result.success && result.data?.session) {
        result.data = {
          ...result.data,
          session: TestDataTransformer.transformToHistoryItem(result.data.session)
        };
      }

      res.json(result);

    } catch (error) {
      console.error('获取测试详情失败:', error);
      res.status(500).json({
        success: false,
        error: '获取测试详情失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

/**
 * DELETE /api/test/history/:testId
 * 删除测试记录
 */
router.delete('/:testId', 
  authMiddleware,
  async (req, res) => {
    try {
      const { testId } = req.params;
      const userId = req.user.id;

      // 验证UUID格式
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(testId)) {
        return res.status(400).json({
          success: false,
          error: '无效的测试ID格式'
        });
      }

      let result;
      if (testHistoryService) {
        result = await testHistoryService.deleteTestSession(testId, userId);
      } else {
        result = {
          success: false,
          error: '历史服务不可用'
        };
      }

      res.json(result);

    } catch (error) {
      console.error('删除测试记录失败:', error);
      res.status(500).json({
        success: false,
        error: '删除测试记录失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

module.exports = router;
