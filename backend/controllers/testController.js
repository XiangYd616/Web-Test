/**
 * 测试控制器
 * 职责: 处理测试相关的HTTP请求
 */

const testBusinessService = require('../services/testing/TestBusinessService');
const userTestManager = require('../services/testing/UserTestManager');
const TestHistoryService = require('../services/testing/TestHistoryService');
const { successResponse, createdResponse, errorResponse } = require('../utils/response');

const testHistoryService = new TestHistoryService(require('../config/database'));

class TestController {
  /**
   * 创建并启动测试
   * POST /api/test/create-and-start
   */
  async createAndStart(req, res, next) {
    try {
      const config = req.body;
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testBusinessService.createAndStartTest(config, user);
      return createdResponse(res, result, '测试创建成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取测试状态
   * GET /api/test/:testId/status
   */
  async getStatus(req, res, next) {
    try {
      const { testId } = req.params;
      const userId = req.user.id;

      const status = await userTestManager.getTestStatus(userId, testId);
      return successResponse(res, status);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取测试结果
   * GET /api/test/:testId/result
   */
  async getResult(req, res, next) {
    try {
      const { testId } = req.params;
      const userId = req.user.id;

      const result = await userTestManager.getTestResult(userId, testId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 停止测试
   * POST /api/test/:testId/stop
   */
  async stopTest(req, res, next) {
    try {
      const { testId } = req.params;
      const userId = req.user.id;

      await userTestManager.stopTest(userId, testId);
      return successResponse(res, { testId }, '测试已停止');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除测试
   * DELETE /api/test/:testId
   */
  async deleteTest(req, res, next) {
    try {
      const { testId } = req.params;
      const userId = req.user.id;

      await testHistoryService.deleteTest(testId, userId);
      return successResponse(res, { testId }, '测试已删除');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取测试历史
   * GET /api/test/history
   */
  async getHistory(req, res, next) {
    try {
      const { page = 1, limit = 20, testType, status } = req.query;
      const userId = req.user.id;

      const history = await testHistoryService.getTestHistory({
        userId,
        page: parseInt(page),
        limit: parseInt(limit),
        testType,
        status,
      });

      return successResponse(res, history);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量删除测试
   * POST /api/test/batch-delete
   */
  async batchDelete(req, res, next) {
    try {
      const { testIds } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(testIds) || testIds.length === 0) {
        return errorResponse(res, '请提供要删除的测试ID列表', 400);
      }

      await testHistoryService.batchDelete(testIds, userId);
      return successResponse(res, { deletedCount: testIds.length }, '批量删除成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取用户的运行中测试
   * GET /api/test/running
   */
  async getRunningTests(req, res, next) {
    try {
      const userId = req.user.id;
      const runningTests = await userTestManager.getRunningTests(userId);
      return successResponse(res, { tests: runningTests });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 重新运行测试
   * POST /api/test/:testId/rerun
   */
  async rerunTest(req, res, next) {
    try {
      const { testId } = req.params;
      const userId = req.user.id;

      const originalTest = await testHistoryService.getTestById(testId, userId);
      if (!originalTest) {
        return errorResponse(res, '测试不存在', 404);
      }

      const config = originalTest.config || {};
      const user = {
        userId,
        role: req.user.role || 'free',
      };

      const result = await testBusinessService.createAndStartTest(config, user);
      return createdResponse(res, result, '测试已重新运行');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TestController();
