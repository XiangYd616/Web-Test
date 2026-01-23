/**
 * 测试历史控制器
 * 职责: 处理测试历史相关HTTP请求
 */

import type { Request, Response } from 'express';

const TestHistoryService = require('../services/testing/TestHistoryService');
const { TestDataTransformer } = require('../utils/testDataTransformer');
const { validationResult } = require('express-validator');

type TestHistoryServiceType = {
  getTestHistory: (...args: unknown[]) => Promise<unknown>;
  createTestRecord: (...args: unknown[]) => Promise<unknown>;
  getSessionForUser: (...args: unknown[]) => Promise<unknown>;
  updateTestRecord: (...args: unknown[]) => Promise<unknown>;
  startTest: (...args: unknown[]) => Promise<unknown>;
  updateTestProgress: (...args: unknown[]) => Promise<unknown>;
  completeTest: (...args: unknown[]) => Promise<unknown>;
  failTest: (...args: unknown[]) => Promise<unknown>;
  cancelTest: (...args: unknown[]) => Promise<unknown>;
  getTestProgress: (...args: unknown[]) => Promise<unknown>;
  getTestDetails: (...args: unknown[]) => Promise<unknown>;
  deleteTestSession: (...args: unknown[]) => Promise<unknown>;
};

let testHistoryService: TestHistoryServiceType | null = null;
try {
  const dbModule = require('../config/database');
  testHistoryService = new TestHistoryService(dbModule);
} catch (error) {
  console.error('初始化TestHistoryService失败:', error);
}

type ApiResponse = Response & {
  success: (data?: unknown) => Response;
  validationError: (errors: unknown[], message?: string) => Response;
  notFound: (resource?: string, message?: string) => Response;
  serverError: (message?: string) => Response;
};

type AuthRequest = Request & { user: { id: string } };

type TestHistoryQuery = {
  testType?: string;
  type?: string;
  status?: string;
  page?: string | number;
  limit?: string | number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  format?: string;
};

type TestHistoryResult = {
  success: boolean;
  data?: {
    tests?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const ensureHistoryService = (res: ApiResponse) => {
  if (!testHistoryService) {
    res.status(503).json({
      success: false,
      error: '历史服务不可用',
    });
    return false;
  }
  return true;
};

class TestHistoryController {
  async listHistory(req: AuthRequest, res: ApiResponse) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '请求参数无效',
          details: errors.array(),
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
        sortOrder = 'DESC',
      } = req.query as TestHistoryQuery;

      const testType = testTypeParam || legacyType;
      const normalizedSortOrder = typeof sortOrder === 'string' ? sortOrder.toUpperCase() : 'DESC';
      const userId = req.user?.id;

      const queryParams = {
        page: parseInt(String(page), 10),
        limit: parseInt(String(limit), 10),
        status,
        search,
        sortBy,
        sortOrder: normalizedSortOrder,
      };

      let result: TestHistoryResult;
      if (testHistoryService) {
        result = (await testHistoryService.getTestHistory(
          userId,
          testType,
          queryParams
        )) as TestHistoryResult;
      } else {
        result = {
          success: true,
          data: {
            tests: [],
            pagination: {
              page: parseInt(String(page), 10),
              limit: parseInt(String(limit), 10),
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          },
        };
      }

      if (result.success && result.data?.tests) {
        result.data.tests = TestDataTransformer.transformHistoryList(result.data.tests);
      }
      return res.json(result);
    } catch (error) {
      console.error('获取测试历史失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取测试历史失败',
        details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
      });
    }
  }

  async createRecord(req: AuthRequest, res: ApiResponse) {
    try {
      if (!ensureHistoryService(res)) return null;
      const service = testHistoryService;
      if (!service) return null;

      const testData = {
        ...req.body,
        userId: req.user.id,
      };

      const result = await service.createTestRecord(testData);
      return res.json(result);
    } catch (error) {
      console.error('创建测试记录失败:', error);
      return res.status(500).json({
        success: false,
        error: '创建测试记录失败',
      });
    }
  }

  async updateRecord(req: AuthRequest, res: ApiResponse) {
    try {
      if (!ensureHistoryService(res)) return null;
      const service = testHistoryService;
      if (!service) return null;

      const { testId } = req.params;
      const userId = req.user.id;

      const session = await service.getSessionForUser(testId, userId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: '记录不存在或无权限访问',
        });
      }

      const result = await service.updateTestRecord(testId, req.body);
      return res.json(result);
    } catch (error) {
      console.error('更新测试记录失败:', error);
      return res.status(500).json({
        success: false,
        error: '更新测试记录失败',
      });
    }
  }

  async startTest(req: AuthRequest, res: ApiResponse) {
    try {
      if (!ensureHistoryService(res)) return null;
      const service = testHistoryService;
      if (!service) return null;

      const { testId } = req.params;
      const userId = req.user.id;
      const result = await service.startTest(testId, userId);
      return res.json(result);
    } catch (error) {
      console.error('开始测试失败:', error);
      return res.status(500).json({
        success: false,
        error: '开始测试失败',
      });
    }
  }

  async updateProgress(req: AuthRequest, res: ApiResponse) {
    try {
      if (!ensureHistoryService(res)) return null;
      const service = testHistoryService;
      if (!service) return null;

      const { testId } = req.params;
      const userId = req.user.id;
      const result = await service.updateTestProgress(testId, req.body, userId);
      return res.json(result);
    } catch (error) {
      console.error('更新测试进度失败:', error);
      return res.status(500).json({
        success: false,
        error: '更新测试进度失败',
      });
    }
  }

  async completeTest(req: AuthRequest, res: ApiResponse) {
    try {
      if (!ensureHistoryService(res)) return null;
      const service = testHistoryService;
      if (!service) return null;

      const { testId } = req.params;
      const userId = req.user.id;
      const result = await service.completeTest(testId, req.body, userId);
      return res.json(result);
    } catch (error) {
      console.error('完成测试失败:', error);
      return res.status(500).json({
        success: false,
        error: '完成测试失败',
      });
    }
  }

  async failTest(req: AuthRequest, res: ApiResponse) {
    try {
      if (!ensureHistoryService(res)) return null;
      const service = testHistoryService;
      if (!service) return null;

      const { testId } = req.params;
      const userId = req.user.id;
      const { errorMessage, errorDetails } = req.body || {};

      const result = await service.failTest(
        testId,
        { ...req.body, errorMessage, errorDetails },
        userId
      );

      return res.json(result);
    } catch (error) {
      console.error('标记测试失败失败:', error);
      return res.status(500).json({
        success: false,
        error: '标记测试失败失败',
      });
    }
  }

  async cancelTest(req: AuthRequest, res: ApiResponse) {
    try {
      if (!ensureHistoryService(res)) return null;
      const service = testHistoryService;
      if (!service) return null;

      const { testId } = req.params;
      const userId = req.user.id;
      const reason = (req.body as Record<string, unknown>)?.reason || '用户取消';
      const result = await service.cancelTest(
        testId,
        { ...(req.body as Record<string, unknown>), reason },
        userId
      );

      return res.json(result);
    } catch (error) {
      console.error('取消测试失败:', error);
      return res.status(500).json({
        success: false,
        error: '取消测试失败',
      });
    }
  }

  async getProgress(req: AuthRequest, res: ApiResponse) {
    try {
      if (!ensureHistoryService(res)) return null;
      const service = testHistoryService;
      if (!service) return null;

      const { testId } = req.params;
      const userId = req.user.id;
      const result = await service.getTestProgress(testId, userId);
      return res.json(result);
    } catch (error) {
      console.error('获取测试进度失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取测试进度失败',
      });
    }
  }

  async exportHistory(req: AuthRequest, res: ApiResponse) {
    try {
      if (!ensureHistoryService(res)) return null;
      const service = testHistoryService;
      if (!service) return null;

      const {
        testType: testTypeParam,
        type: legacyType,
        status,
        format = 'json',
        sortBy = 'created_at',
        sortOrder = 'DESC',
      } = req.query as TestHistoryQuery;

      const testType = testTypeParam || legacyType;
      const normalizedSortOrder = typeof sortOrder === 'string' ? sortOrder.toUpperCase() : 'DESC';
      const userId = req.user.id;

      if (!['json', 'csv', 'excel'].includes(format)) {
        return res.status(400).json({
          success: false,
          error: '不支持的导出格式',
        });
      }

      const queryParams = {
        page: 1,
        limit: 1000,
        status,
        search: '',
        sortBy,
        sortOrder: normalizedSortOrder,
      };

      let result: TestHistoryResult;
      if (service) {
        result = (await service.getTestHistory(userId, testType, queryParams)) as TestHistoryResult;
      } else {
        return res.status(503).json({
          success: false,
          error: '导出服务不可用',
        });
      }

      if (!result.success) {
        return res.status(500).json(result);
      }

      const data = TestDataTransformer.transformHistoryList(result.data?.tests || []);

      switch (format) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="test-history-${Date.now()}.json"`
          );
          return res.json(data);
        case 'csv': {
          const csvHeaders = ['ID', '测试名称', '测试类型', 'URL', '状态', '评分', '创建时间'];
          const csvRows = data.map((item: Record<string, unknown>) => [
            String(item.id ?? ''),
            String(item.test_name ?? item.testName ?? ''),
            String(item.test_type ?? item.testType ?? ''),
            String(item.url ?? ''),
            String(item.status ?? ''),
            String(item.overall_score ?? item.overallScore ?? ''),
            String(item.created_at ?? item.createdAt ?? ''),
          ]);

          const csvContent = [csvHeaders, ...csvRows]
            .map((row: string[]) => row.map((field: string) => `"${field}"`).join(','))
            .join('\n');

          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="test-history-${Date.now()}.csv"`
          );
          return res.send('\ufeff' + csvContent);
        }
        default:
          return res.status(400).json({
            success: false,
            error: '不支持的导出格式',
          });
      }
    } catch (error) {
      console.error('导出测试历史失败:', error);
      return res.status(500).json({
        success: false,
        error: '导出测试历史失败',
        details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
      });
    }
  }

  async getRecordDetail(req: AuthRequest, res: ApiResponse) {
    try {
      if (!ensureHistoryService(res)) return null;
      const service = testHistoryService;
      if (!service) return null;

      const { testId } = req.params;
      const userId = req.user?.id;

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(testId)) {
        return res.status(400).json({
          success: false,
          error: '无效的测试ID格式',
        });
      }

      let result: TestHistoryResult;
      if (service) {
        result = (await service.getTestDetails(testId, userId)) as TestHistoryResult;
      } else {
        result = {
          success: false,
          error: '获取测试详情失败',
        };
      }

      if (result.success && result.data?.session) {
        result.data = {
          ...result.data,
          session: TestDataTransformer.transformToHistoryItem(result.data.session),
        };
      }

      return res.json(result);
    } catch (error) {
      console.error('获取测试详情失败:', error);
      return res.status(500).json({
        success: false,
        error: '获取测试详情失败',
        details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
      });
    }
  }

  async deleteRecord(req: AuthRequest, res: ApiResponse) {
    try {
      if (!ensureHistoryService(res)) return null;
      const service = testHistoryService;
      if (!service) return null;

      const { testId } = req.params;
      const userId = req.user.id;

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(testId)) {
        return res.status(400).json({
          success: false,
          error: '无效的测试ID格式',
        });
      }

      const result = await service.deleteTestSession(testId, userId);
      return res.json(result);
    } catch (error) {
      console.error('删除测试记录失败:', error);
      return res.status(500).json({
        success: false,
        error: '删除测试记录失败',
        details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
      });
    }
  }
}

module.exports = new TestHistoryController();
