/**
 * 统一测试历史API路由
 * 提供标准化的测试历史记录接口
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuth } = require('../../middleware/auth');
const { historyRateLimiter } = require('../../middleware/rateLimiter');
const { query } = require('express-validator');
const testHistoryController = require('../../controllers/testHistoryController');

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
  (req, res) => testHistoryController.listHistory(req, res)
);

/**
 * POST /api/test/history
 * 创建测试记录
 */
router.post('/', authMiddleware, (req, res) => testHistoryController.createRecord(req, res));

/**
 * PUT /api/test/history/:testId
 * 更新测试记录
 */
router.put('/:testId', authMiddleware, (req, res) => testHistoryController.updateRecord(req, res));

/**
 * POST /api/test/history/:testId/start
 * 开始测试
 */
router.post('/:testId/start', authMiddleware, (req, res) => testHistoryController.startTest(req, res));

/**
 * POST /api/test/history/:testId/progress
 * 更新测试进度
 */
router.post('/:testId/progress', authMiddleware, (req, res) => testHistoryController.updateProgress(req, res));

/**
 * POST /api/test/history/:testId/complete
 * 完成测试
 */
router.post('/:testId/complete', authMiddleware, (req, res) => testHistoryController.completeTest(req, res));

/**
 * POST /api/test/history/:testId/fail
 * 测试失败
 */
router.post('/:testId/fail', authMiddleware, (req, res) => testHistoryController.failTest(req, res));

/**
 * POST /api/test/history/:testId/cancel
 * 取消测试
 */
router.post('/:testId/cancel', authMiddleware, (req, res) => testHistoryController.cancelTest(req, res));

/**
 * GET /api/test/history/:testId/progress
 * 获取测试进度
 */
router.get('/:testId/progress', authMiddleware, (req, res) => testHistoryController.getProgress(req, res));

/**
 * GET /api/test/history/export
 * 导出测试历史
 */
router.get('/export', authMiddleware, (req, res) => testHistoryController.exportHistory(req, res));

/**
 * GET /api/test/history/:testId
 * 获取单个测试记录详情
 */
router.get('/:testId', optionalAuth, (req, res) => testHistoryController.getRecordDetail(req, res));

/**
 * DELETE /api/test/history/:testId
 * 删除测试记录
 */
router.delete('/:testId', authMiddleware, (req, res) => testHistoryController.deleteRecord(req, res));

module.exports = router;
