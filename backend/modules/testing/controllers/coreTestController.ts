/**
 * 核心测试引擎控制器
 * 职责: 处理核心测试引擎的运行、状态查询、基准测试等业务逻辑
 * 从 testing/routes/core.ts 中提取
 */

import type { NextFunction } from 'express';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import registry from '../../core/TestEngineRegistry';
import CoreTestEngine from '../../engines/core/CoreTestEngine';
import registerTestEngines from '../../engines/core/registerEngines';
import { puppeteerPool } from '../../engines/shared/services/PuppeteerPool';
import type { ApiResponse, AuthenticatedRequest } from '../../types';

// ==================== 类型定义 ==

interface CoreTestRequest {
  testId: string;
  url: string;
  testType: string;
  options?: Record<string, unknown>;
  timeout?: number;
}

// ==================== 内部工具 ====================

const engine = new CoreTestEngine();

const checkPuppeteerAvailable = () => puppeteerPool.isAvailable();

// ==================== 控制器方法 ====================

const getStatus = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const status = await engine.checkAvailability();
    return res.success(status);
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : String(error),
      undefined,
      500
    );
  }
};

const enginesHealth = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    registerTestEngines();
    if (typeof registry.initialize === 'function') await registry.initialize();
    const puppeteerAvailable = await checkPuppeteerAvailable();
    const availableEngines =
      typeof registry.getAvailableEngines === 'function' ? registry.getAvailableEngines() : [];
    const stats = typeof registry.getStats === 'function' ? registry.getStats() : undefined;
    return res.success({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      engines: availableEngines,
      stats,
      dependencies: { puppeteer: puppeteerAvailable },
    });
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : String(error),
      undefined,
      500
    );
  }
};

const runTest = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const testRequest: CoreTestRequest = req.body;
    if (!testRequest.testId || !testRequest.url || !testRequest.testType)
      return res.error(
        StandardErrorCode.INVALID_INPUT,
        'testId、URL和测试类型是必需的',
        undefined,
        400
      );
    const result = await engine.runCoreTest(testRequest);
    return res.success(result);
  } catch (error) {
    return res.error(
      StandardErrorCode.INVALID_INPUT,
      error instanceof Error ? error.message : String(error),
      undefined,
      400
    );
  }
};

const getTestStatus = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { testId } = req.params;
  try {
    const status = engine.getTestStatus(testId);
    if (!status) return res.error(StandardErrorCode.NOT_FOUND, '测试不存在', undefined, 404);
    return res.success(status);
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : String(error),
      undefined,
      500
    );
  }
};

const cancelTest = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { testId } = req.params;
  try {
    const cancelled = engine.cancelTest(testId);
    if (!cancelled)
      return res.error(StandardErrorCode.NOT_FOUND, '测试不存在或无法取消', undefined, 404);
    return res.success(null, '测试已取消');
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : String(error),
      undefined,
      500
    );
  }
};

const getAllTests = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { status, limit = 50 } = req.query;
  try {
    const tests = engine.getAllTests({
      status: status as string,
      limit: parseInt(limit as string),
    });
    return res.success(tests);
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : String(error),
      undefined,
      500
    );
  }
};

const runBenchmark = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const { testId, url, benchmarkType, options } = req.body as {
      testId?: string;
      url?: string;
      benchmarkType?: string;
      options?: Record<string, unknown>;
    };
    if (!testId || !url || !benchmarkType)
      return res.error(
        StandardErrorCode.INVALID_INPUT,
        'testId、URL和基准测试类型是必需的',
        undefined,
        400
      );
    const result = await engine.runBenchmark({ testId, url, benchmarkType, options });
    return res.success(result);
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : String(error),
      undefined,
      500
    );
  }
};

const getBenchmarks = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const benchmarks = engine.getBenchmarks();
    return res.success(benchmarks);
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : String(error),
      undefined,
      500
    );
  }
};

const validateConfig = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const { testConfig } = req.body;
    if (!testConfig)
      return res.error(StandardErrorCode.INVALID_INPUT, '测试配置是必需的', undefined, 400);
    const validation = await engine.validateTestConfig(testConfig);
    return res.success(validation);
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : String(error),
      undefined,
      500
    );
  }
};

const getMetrics = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const metrics = engine.getEngineMetrics();
    return res.success(metrics);
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : String(error),
      undefined,
      500
    );
  }
};

const resetEngine = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const result = await engine.resetEngine();
    return res.success(result, '引擎重置成功');
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : String(error),
      undefined,
      500
    );
  }
};

const healthCheck = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const health = await engine.healthCheck();
    return res.success(health);
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : String(error),
      undefined,
      500
    );
  }
};

export default {
  getStatus,
  enginesHealth,
  runTest,
  getTestStatus,
  cancelTest,
  getAllTests,
  runBenchmark,
  getBenchmarks,
  validateConfig,
  getMetrics,
  resetEngine,
  healthCheck,
};
