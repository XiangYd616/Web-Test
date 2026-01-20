/**
 * 测试控制器
 * 职责: 处理测试相关的HTTP请求
 */

import type { NextFunction, Request, Response } from 'express';

const testService = require('../services/testing/testService');
const testTemplateService = require('../services/testing/testTemplateService');
const testScheduleService = require('../services/testing/testScheduleService');
const { successResponse, createdResponse, _errorResponse } = require('../utils/response');

type AuthRequest = Request & { user: { id: string; role?: string } };

type ApiResponse = Response & {
  json: (data: unknown) => Response;
  status: (code: number) => Response;
};

class TestController {
  /**
   * 创建并启动测试
   * POST /api/test/create-and-start
   */
  async createAndStart(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createAndStart(config, user);
      return createdResponse(res, result, '测试创建成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取测试调度列表
   * GET /api/test/schedules
   */
  async getSchedules(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const {
        page = '1',
        limit = '20',
        engineType,
        isActive,
      } = req.query as Record<string, string>;
      const result = await testScheduleService.listSchedules(
        req.user.id,
        parseInt(limit, 10) || 20,
        (parseInt(page, 10) - 1) * (parseInt(limit, 10) || 20),
        engineType,
        isActive !== undefined ? isActive === 'true' : undefined
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取测试调度详情
   * GET /api/test/schedules/:scheduleId
   */
  async getScheduleDetail(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const scheduleId = parseInt(req.params.scheduleId, 10);
      const result = await testScheduleService.getSchedule(req.user.id, scheduleId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建测试调度
   * POST /api/test/schedules
   */
  async createSchedule(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const payload = req.body as Record<string, unknown>;
      if (!payload.scheduleName || !payload.engineType || !payload.scheduleType) {
        return res.status(400).json({
          success: false,
          message: 'scheduleName、engineType、scheduleType 为必填字段',
        });
      }
      const result = await testScheduleService.createSchedule(req.user.id, {
        scheduleName: String(payload.scheduleName),
        engineType: String(payload.engineType),
        testUrl: payload.testUrl ? String(payload.testUrl) : undefined,
        testConfig: (payload.testConfig || {}) as Record<string, unknown>,
        templateId: payload.templateId ? Number(payload.templateId) : undefined,
        scheduleType: payload.scheduleType as 'once' | 'daily' | 'weekly' | 'monthly' | 'cron',
        cronExpression: payload.cronExpression ? String(payload.cronExpression) : undefined,
        timezone: payload.timezone ? String(payload.timezone) : undefined,
        nextRunAt: payload.nextRunAt as string | undefined,
        isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
      });
      return createdResponse(res, result, '调度任务创建成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新测试调度
   * PUT /api/test/schedules/:scheduleId
   */
  async updateSchedule(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const scheduleId = parseInt(req.params.scheduleId, 10);
      const payload = req.body as Record<string, unknown>;
      const result = await testScheduleService.updateSchedule(req.user.id, scheduleId, {
        scheduleName: payload.scheduleName ? String(payload.scheduleName) : undefined,
        engineType: payload.engineType ? String(payload.engineType) : undefined,
        testUrl: payload.testUrl ? String(payload.testUrl) : undefined,
        testConfig: payload.testConfig as Record<string, unknown> | undefined,
        templateId: payload.templateId !== undefined ? Number(payload.templateId) : undefined,
        scheduleType: payload.scheduleType as
          | 'once'
          | 'daily'
          | 'weekly'
          | 'monthly'
          | 'cron'
          | undefined,
        cronExpression: payload.cronExpression ? String(payload.cronExpression) : undefined,
        timezone: payload.timezone ? String(payload.timezone) : undefined,
        nextRunAt: payload.nextRunAt as string | undefined,
        isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : undefined,
      });
      return successResponse(res, result, '调度任务更新成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除测试调度
   * DELETE /api/test/schedules/:scheduleId
   */
  async deleteSchedule(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const scheduleId = parseInt(req.params.scheduleId, 10);
      await testScheduleService.deleteSchedule(req.user.id, scheduleId);
      return successResponse(res, { scheduleId }, '调度任务删除成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 启用/暂停调度
   * POST /api/test/schedules/:scheduleId/toggle
   */
  async toggleSchedule(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const scheduleId = parseInt(req.params.scheduleId, 10);
      const { isActive } = req.body as { isActive?: boolean };
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isActive 必须为布尔值',
        });
      }
      const result = await testScheduleService.toggleSchedule(req.user.id, scheduleId, isActive);
      return successResponse(res, result, '调度状态更新成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 立即执行调度任务
   * POST /api/test/schedules/:scheduleId/execute
   */
  async executeSchedule(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const scheduleId = parseInt(req.params.scheduleId, 10);
      const result = await testScheduleService.executeSchedule(
        req.user.id,
        scheduleId,
        req.user.role || 'free'
      );
      return successResponse(res, result, '调度任务已执行');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取调度执行记录
   * GET /api/test/schedules/:scheduleId/runs
   */
  async getScheduleRuns(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const scheduleId = parseInt(req.params.scheduleId, 10);
      const { page = '1', limit = '20' } = req.query as Record<string, string>;
      const result = await testScheduleService.listScheduleRuns(
        req.user.id,
        scheduleId,
        parseInt(limit, 10) || 20,
        (parseInt(page, 10) - 1) * (parseInt(limit, 10) || 20)
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取测试状态
   * GET /api/test/:testId/status
   */
  async getStatus(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
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
  async getResult(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
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
  async stopTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
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
  async deleteTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const userId = req.user.id;

      await testService.deleteTest(testId, userId);
      return successResponse(res, { testId }, '测试已删除');
    } catch (error) {
      next(error);
    }
  }

  /**
   * API根路径
   * GET /api/test
   */
  async getApiInfo(req: Request, res: ApiResponse) {
    return res.json({
      success: true,
      message: 'Test API',
      version: '2.0.0',
      endpoints: {
        tests: [
          'POST /api/test/create-and-start',
          'POST /api/test/website',
          'POST /api/test/performance',
          'POST /api/test/security',
          'POST /api/test/seo',
          'POST /api/test/stress',
          'POST /api/test/api',
          'POST /api/test/accessibility',
        ],
        management: [
          'GET /api/test/:testId/status',
          'GET /api/test/:testId/result',
          'POST /api/test/:testId/stop',
          'DELETE /api/test/:testId',
          'PUT /api/test/:testId',
          'POST /api/test/:testId/rerun',
        ],
        batch: [
          'POST /api/test/batch',
          'GET /api/test/batch/:batchId',
          'DELETE /api/test/batch/:batchId',
        ],
        templates: [
          'GET /api/test/templates',
          'POST /api/test/templates',
          'PUT /api/test/templates/:templateId',
          'DELETE /api/test/templates/:templateId',
        ],
      },
    });
  }

  /**
   * 创建网站测试
   * POST /api/test/website
   */
  async createWebsiteTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createWebsiteTest(config, user);
      return createdResponse(res, result, '网站测试创建成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 运行网站测试（兼容旧路由）
   * POST /api/test/website
   */
  async runWebsiteTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    return this.createWebsiteTest(req, res, next);
  }

  /**
   * 创建性能测试
   * POST /api/test/performance
   */
  async createPerformanceTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createPerformanceTest(config, user);
      return createdResponse(res, result, '性能测试创建成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 运行性能测试（兼容旧路由）
   * POST /api/test/performance
   */
  async runPerformanceTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    return this.createPerformanceTest(req, res, next);
  }

  /**
   * 创建安全测试
   * POST /api/test/security
   */
  async createSecurityTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createSecurityTest(config, user);
      return createdResponse(res, result, '安全测试创建成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 运行安全测试（兼容旧路由）
   * POST /api/test/security
   */
  async runSecurityTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    return this.createSecurityTest(req, res, next);
  }

  /**
   * 创建SEO测试
   * POST /api/test/seo
   */
  async createSEOTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createSEOTest(config, user);
      return createdResponse(res, result, 'SEO测试创建成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 运行SEO测试（兼容旧路由）
   * POST /api/test/seo
   */
  async runSEOTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    return this.createSEOTest(req, res, next);
  }

  /**
   * 创建压力测试
   * POST /api/test/stress
   */
  async createStressTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createStressTest(config, user);
      return createdResponse(res, result, '压力测试创建成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 运行压力测试（兼容旧路由）
   * POST /api/test/stress
   */
  async runStressTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    return this.createStressTest(req, res, next);
  }

  /**
   * 创建API测试
   * POST /api/test/api
   */
  async createAPITest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createAPITest(config, user);
      return createdResponse(res, result, 'API测试创建成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 运行API测试（兼容旧路由）
   * POST /api/test/api
   */
  async runAPITest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    return this.createAPITest(req, res, next);
  }

  /**
   * 创建可访问性测试
   * POST /api/test/accessibility
   */
  async createAccessibilityTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const config = req.body as Record<string, unknown>;
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      const result = await testService.createAccessibilityTest(config, user);
      return createdResponse(res, result, '可访问性测试创建成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 运行可访问性测试（兼容旧路由）
   * POST /api/test/accessibility
   */
  async runAccessibilityTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    return this.createAccessibilityTest(req, res, next);
  }

  /**
   * 重新运行测试
   * POST /api/test/:testId/rerun
   */
  async rerunTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const userId = req.user.id;

      const result = await testService.rerunTest(testId, userId);
      return successResponse(res, result, '测试重新运行成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新测试
   * PUT /api/test/:testId
   */
  async updateTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const userId = req.user.id;
      const updates = req.body as Record<string, unknown>;

      const result = await testService.updateTest(testId, userId, updates);
      return successResponse(res, result, '测试更新成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 批量创建测试
   * POST /api/test/batch
   */
  async createBatchTests(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { tests } = req.body as { tests?: Record<string, unknown>[] };
      const user = {
        userId: req.user.id,
        role: req.user.role || 'free',
      };

      if (!Array.isArray(tests) || tests.length === 0) {
        return res.status(400).json({
          success: false,
          error: '请提供有效的测试列表',
        });
      }

      const result = await testService.createBatchTests(tests, user);
      return createdResponse(res, result, '批量测试创建成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取批量测试状态
   * GET /api/test/batch/:batchId
   */
  async getBatchTestStatus(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { batchId } = req.params as { batchId: string };
      const userId = req.user.id;

      const result = await testService.getBatchTestStatus(batchId, userId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除批量测试
   * DELETE /api/test/batch/:batchId
   */
  async deleteBatchTests(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { batchId } = req.params as { batchId: string };
      const userId = req.user.id;

      await testService.deleteBatchTests(batchId, userId);
      return successResponse(res, { batchId }, '批量测试删除成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取测试列表
   * GET /api/test
   */
  async getTestList(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { page = '1', limit = '10' } = req.query as Record<string, string>;
      const result = await testService.getTestList(
        req.user.id,
        parseInt(page, 10) || 1,
        parseInt(limit, 10) || 10
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取测试历史
   * GET /api/test/history
   */
  async getTestHistory(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { testType, page = '1', limit = '20' } = req.query as Record<string, string>;
      const result = await testService.getTestHistory(
        req.user.id,
        testType,
        parseInt(page, 10) || 1,
        parseInt(limit, 10) || 20
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取测试进度
   * GET /api/test/:testId/progress
   */
  async getProgress(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const status = await testService.getStatus(req.user.id, testId);
      return successResponse(res, { testId, progress: status.progress, status: status.status });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 导出测试结果
   * GET /api/test/:testId/export
   */
  async exportTestResult(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const { format = 'json' } = req.query as { format?: string };
      const result = await testService.getTestResults(testId, req.user.id);

      if (format === 'csv') {
        const csvRows = [['field', 'value']];
        Object.entries(result.summary || {}).forEach(([key, value]) => {
          csvRows.push([key, JSON.stringify(value)]);
        });
        const csvContent = csvRows.map(row => row.map(item => `"${item}"`).join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="test-${testId}.csv"`);
        return res.send('\ufeff' + csvContent);
      }

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 取消测试
   * POST /api/test/:testId/cancel
   */
  async cancelTest(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      await testService.cancelTest(req.user.id, testId);
      return successResponse(res, { testId }, '测试已取消');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取历史记录详情
   * GET /api/test/history/:testId
   */
  async getHistoryDetail(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const result = await testService.getTestDetail(req.user.id, testId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取测试日志
   * GET /api/test/:testId/logs
   */
  async getTestLogs(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const { limit = '100', offset = '0', level } = req.query as Record<string, string>;
      const result = await testService.getTestLogs(
        req.user.id,
        testId,
        parseInt(limit, 10) || 100,
        parseInt(offset, 10) || 0,
        level
      );
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取测试模板列表
   * GET /api/test/templates
   */
  async getTemplates(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { engineType } = req.query as { engineType?: string };
      const templates = await testTemplateService.listTemplates(req.user.id, engineType);
      return successResponse(res, templates);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建测试模板
   * POST /api/test/templates
   */
  async createTemplate(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const payload = req.body as {
        name?: string;
        description?: string;
        engineType?: string;
        config?: Record<string, unknown>;
        isPublic?: boolean;
        isDefault?: boolean;
      };

      if (!payload.name || !payload.engineType) {
        return res.status(400).json({
          success: false,
          message: '模板名称和测试类型必填',
        });
      }

      const templateId = await testTemplateService.createTemplate(req.user.id, {
        name: payload.name,
        description: payload.description,
        engineType: payload.engineType,
        config: payload.config || {},
        isPublic: payload.isPublic,
        isDefault: payload.isDefault,
      });

      return createdResponse(res, { id: templateId }, '模板创建成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 更新测试模板
   * PUT /api/test/templates/:templateId
   */
  async updateTemplate(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { templateId } = req.params as { templateId: string };
      const updates = req.body as {
        name?: string;
        description?: string;
        engineType?: string;
        config?: Record<string, unknown>;
        isPublic?: boolean;
        isDefault?: boolean;
      };

      await testTemplateService.updateTemplate(req.user.id, templateId, updates);
      return successResponse(res, { templateId }, '模板更新成功');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 删除测试模板
   * DELETE /api/test/templates/:templateId
   */
  async deleteTemplate(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { templateId } = req.params as { templateId: string };
      await testTemplateService.deleteTemplate(req.user.id, templateId);
      return successResponse(res, { templateId }, '模板删除成功');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TestController();
