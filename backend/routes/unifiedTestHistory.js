/**
 * 统一测试历史API路由
 * 提供标准化的测试历史记录接口
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const TestHistoryService = require('../services/testing/TestHistoryService');
const { TestDataTransformer } = require('../utils/testDataTransformer');
const { query, validationResult } = require('express-validator');

// 初始化服务
let testHistoryService;
try {
  const dbModule = require('../config/database.js');
  testHistoryService = new TestHistoryService(dbModule);
} catch (error) {
  console.error('初始化TestHistoryService失败:', error);
}

/**
 * GET /api/test/history
 * 获取测试历史列表
 */
router.get('/', 
  optionalAuth,
  [
    query('type').optional().isString().withMessage('测试类型必须是字符串'),
    query('status').optional().isString().withMessage('状态必须是字符串'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('限制数量必须在1-100之间'),
    query('search').optional().isString().withMessage('搜索词必须是字符串'),
    query('sortBy').optional().isString().withMessage('排序字段必须是字符串'),
    query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('排序方向必须是ASC或DESC')
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
        type: testType,
        status,
        page = 1,
        limit = 20,
        search = '',
        sortBy = 'created_at',
        sortOrder = 'DESC',
        startDate,
        endDate
      } = req.query;

      const userId = req.user?.id;

      // 构建查询参数
      const queryParams = {
        page: parseInt(page),
        limit: parseInt(limit),
        testType,
        status,
        userId,
        search,
        sortBy,
        sortOrder,
        startDate,
        endDate
      };

      // 获取历史记录
      let result;
      if (testHistoryService) {
        // 使用新的历史服务
        result = await testHistoryService.getTestHistory(queryParams);
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
      if (result.success && result.data.tests) {
        result.data.tests = result.data.tests.map(test => 
          TestDataTransformer.transformToHistoryItem(test)
        );
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
      if (result.success && result.data) {
        result.data = TestDataTransformer.transformBackendToFrontend(result.data);
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
        result = await testHistoryService.deleteTestRecord(testId, userId);
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

/**
 * POST /api/test/history/batch-delete
 * 批量删除测试记录
 */
router.post('/batch-delete', 
  authMiddleware,
  async (req, res) => {
    try {
      const { testIds } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(testIds) || testIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: '测试ID列表不能为空'
        });
      }

      // 验证所有UUID格式
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalidIds = testIds.filter(id => !uuidRegex.test(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          error: '包含无效的测试ID格式',
          details: invalidIds
        });
      }

      let result;
      if (testHistoryService) {
        result = await testHistoryService.batchDeleteTestRecords(testIds, userId);
      } else {
        result = {
          success: false,
          error: '历史服务不可用'
        };
      }

      res.json(result);

    } catch (error) {
      console.error('批量删除测试记录失败:', error);
      res.status(500).json({
        success: false,
        error: '批量删除测试记录失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
      const {
        type: testType,
        status,
        format = 'json',
        startDate,
        endDate
      } = req.query;

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
        limit: 1000, // 导出时获取更多数据
        testType,
        status,
        userId,
        startDate,
        endDate
      };

      let result;
      if (testHistoryService) {
        result = await testHistoryService.getTestHistory(queryParams);
      } else {
        return res.status(503).json({
          success: false,
          error: '导出服务不可用'
        });
      }

      if (!result.success) {
        return res.status(500).json(result);
      }

      const data = result.data.tests || [];

      // 根据格式返回数据
      switch (format) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="test-history-${Date.now()}.json"`);
          res.json(data);
          break;

        case 'csv':
          // 简单的CSV导出实现
          const csvHeaders = ['ID', '测试名称', '测试类型', 'URL', '状态', '评分', '创建时间'];
          const csvRows = data.map(item => [
            item.id,
            item.test_name || '',
            item.test_type || '',
            item.url || '',
            item.status || '',
            item.overall_score || '',
            item.created_at || ''
          ]);

          const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="test-history-${Date.now()}.csv"`);
          res.send('\ufeff' + csvContent); // 添加BOM以支持中文
          break;

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

module.exports = router;
