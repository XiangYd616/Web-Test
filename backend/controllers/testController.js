/**
 * 测试控制器
 * 职责: 处理测试相关的HTTP请求
 */

const testService = require('../services/testing/testService');
const { successResponse, createdResponse, errorResponse } = require('../utils/response');

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

      const status = await testService.getStatus(userId, testId);
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

      const result = await testService.getTestResults(testId, userId);
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

      await testService.stopTest(userId, testId);
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

      await testService.deleteTest(testId, userId);
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

      const history = await testService.getHistory(userId, {
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

      const result = await testService.batchDelete(testIds, userId);
      return successResponse(res, result, '批量删除成功');
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
      const runningTests = await testService.getRunningTests(userId);
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

      const result = await testService.rerunTest(testId, userId);
      return createdResponse(res, result, '测试已重新运行');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新测试
   * PUT /api/test/:testId
   */
  async updateTest(req, res, next) {
    try {
      const { testId } = req.params;
      const updates = req.body;
      const userId = req.user.id;

      const result = await testService.updateTest(testId, userId, updates);
      return successResponse(res, result, '测试更新成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 运行网站测试
   * POST /api/test/website
   */
  async runWebsiteTest(req, res, next) {
    try {
      const { url, options = {} } = req.body;
      
      if (!url) {
        return errorResponse(res, 'URL是必填的', 400);
      }

      const config = {
        testType: 'website',
        url,
        ...options
      };

      const user = {
        userId: req.user?.id,
        role: req.user?.role || 'free'
      };

      const result = await testService.createAndStart(config, user);
      return createdResponse(res, result, '网站测试已启动');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 运行性能测试
   * POST /api/test/performance
   */
  async runPerformanceTest(req, res, next) {
    try {
      const { url, device = 'desktop', throttling } = req.body;
      
      if (!url) {
        return errorResponse(res, 'URL是必填的', 400);
      }

      const config = {
        testType: 'performance',
        url,
        device,
        throttling
      };

      const user = {
        userId: req.user?.id,
        role: req.user?.role || 'free'
      };

      const result = await testService.createAndStart(config, user);
      return createdResponse(res, result, '性能测试已启动');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 运行安全测试
   * POST /api/test/security
   */
  async runSecurityTest(req, res, next) {
    try {
      const { url, scanDepth = 'basic' } = req.body;
      
      if (!url) {
        return errorResponse(res, 'URL是必填的', 400);
      }

      const config = {
        testType: 'security',
        url,
        scanDepth
      };

      const user = {
        userId: req.user?.id,
        role: req.user?.role || 'free'
      };

      const result = await testService.createAndStart(config, user);
      return createdResponse(res, result, '安全测试已启动');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 运行SEO测试
   * POST /api/test/seo
   */
  async runSeoTest(req, res, next) {
    try {
      const { url, depth = 1 } = req.body;
      
      if (!url) {
        return errorResponse(res, 'URL是必填的', 400);
      }

      const config = {
        testType: 'seo',
        url,
        depth
      };

      const user = {
        userId: req.user?.id,
        role: req.user?.role || 'free'
      };

      const result = await testService.createAndStart(config, user);
      return createdResponse(res, result, 'SEO测试已启动');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 运行压力测试
   * POST /api/test/stress
   */
  async runStressTest(req, res, next) {
    try {
      const { url, concurrency = 10, duration = 60 } = req.body;
      
      if (!url) {
        return errorResponse(res, 'URL是必填的', 400);
      }

      const config = {
        testType: 'stress',
        url,
        concurrency,
        duration
      };

      const user = {
        userId: req.user?.id,
        role: req.user?.role || 'free'
      };

      const result = await testService.createAndStart(config, user);
      return createdResponse(res, result, '压力测试已启动');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 运行API测试
   * POST /api/test/api
   */
  async runApiTest(req, res, next) {
    try {
      const { baseUrl, endpoints = [] } = req.body;
      
      if (!baseUrl) {
        return errorResponse(res, 'baseUrl是必填的', 400);
      }

      const config = {
        testType: 'api',
        baseUrl,
        endpoints
      };

      const user = {
        userId: req.user?.id,
        role: req.user?.role || 'free'
      };

      const result = await testService.createAndStart(config, user);
      return createdResponse(res, result, 'API测试已启动');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 运行可访问性测试
   * POST /api/test/accessibility
   */
  async runAccessibilityTest(req, res, next) {
    try {
      const { url, level = 'AA' } = req.body;
      
      if (!url) {
        return errorResponse(res, 'URL是必填的', 400);
      }

      const config = {
        testType: 'accessibility',
        url,
        level
      };

      const user = {
        userId: req.user?.id,
        role: req.user?.role || 'free'
      };

      const result = await testService.createAndStart(config, user);
      return createdResponse(res, result, '可访问性测试已启动');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TestController();
