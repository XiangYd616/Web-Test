import express from 'express';
import { StandardErrorCode } from '../../../shared/types/standardApiResponse';
import CoreTestEngine from '../../engines/core/CoreTestEngine';
import asyncHandler from '../../middleware/asyncHandler';

interface CoreTestRequest {
  url: string;
  testType: string;
  options?: Record<string, unknown>;
  timeout?: number;
}

const router = express.Router();
const engine = new CoreTestEngine();

/**
 * GET /api/misc/core/status
 * 检查引擎可用性
 */
router.get(
  '/status',
  asyncHandler(async (req: express.Request, res: express.Response) => {
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
  })
);

/**
 * POST /api/misc/core/run
 * 运行core测试
 */
router.post(
  '/run',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const testRequest: CoreTestRequest = req.body;

      // 验证请求参数
      if (!testRequest.url || !testRequest.testType) {
        return res.error(StandardErrorCode.INVALID_INPUT, 'URL和测试类型是必需的', undefined, 400);
      }

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
  })
);

/**
 * GET /api/misc/core/test/:testId
 * 获取测试状态
 */
router.get(
  '/test/:testId',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { testId } = req.params;

    try {
      const status = engine.getTestStatus(testId);

      if (!status) {
        return res.error(StandardErrorCode.NOT_FOUND, '测试不存在', undefined, 404);
      }

      return res.success(status);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : String(error),
        undefined,
        500
      );
    }
  })
);

/**
 * DELETE /api/misc/core/test/:testId
 * 取消测试
 */
router.delete(
  '/test/:testId',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { testId } = req.params;

    try {
      const cancelled = engine.cancelTest(testId);

      if (!cancelled) {
        return res.error(StandardErrorCode.NOT_FOUND, '测试不存在或无法取消', undefined, 404);
      }

      return res.success(null, '测试已取消');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : String(error),
        undefined,
        500
      );
    }
  })
);

/**
 * GET /api/misc/core/tests
 * 获取所有测试列表
 */
router.get(
  '/tests',
  asyncHandler(async (req: express.Request, res: express.Response) => {
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
  })
);

/**
 * POST /api/misc/core/benchmark
 * 运行基准测试
 */
router.post(
  '/benchmark',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { url, benchmarkType, options } = req.body;

      if (!url || !benchmarkType) {
        return res.error(
          StandardErrorCode.INVALID_INPUT,
          'URL和基准测试类型是必需的',
          undefined,
          400
        );
      }

      const result = await engine.runBenchmark(url, benchmarkType, options);

      return res.success(result);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : String(error),
        undefined,
        500
      );
    }
  })
);

/**
 * GET /api/misc/core/benchmarks
 * 获取基准测试结果
 */
router.get(
  '/benchmarks',
  asyncHandler(async (req: express.Request, res: express.Response) => {
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
  })
);

/**
 * POST /api/misc/core/validate
 * 验证测试配置
 */
router.post(
  '/validate',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { testConfig } = req.body;

      if (!testConfig) {
        return res.error(StandardErrorCode.INVALID_INPUT, '测试配置是必需的', undefined, 400);
      }

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
  })
);

/**
 * GET /api/misc/core/metrics
 * 获取引擎指标
 */
router.get(
  '/metrics',
  asyncHandler(async (req: express.Request, res: express.Response) => {
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
  })
);

/**
 * POST /api/misc/core/reset
 * 重置引擎状态
 */
router.post(
  '/reset',
  asyncHandler(async (req: express.Request, res: express.Response) => {
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
  })
);

/**
 * GET /api/misc/core/health
 * 健康检查
 */
router.get(
  '/health',
  asyncHandler(async (req: express.Request, res: express.Response) => {
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
  })
);

export default router;
