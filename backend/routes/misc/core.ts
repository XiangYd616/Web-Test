import express from 'express';
import CoreTestEngine from '../../engines/core/CoreTestEngine';
import { asyncHandler } from '../../middleware/errorHandler';

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

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
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
        res.status(400).json({
          success: false,
          message: 'URL和测试类型是必需的',
        });
        return;
      }

      const result = await engine.runCoreTest(testRequest);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
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
        res.status(404).json({
          success: false,
          message: '测试不存在',
        });
        return;
      }

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
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
        res.status(404).json({
          success: false,
          message: '测试不存在或无法取消',
        });
        return;
      }

      res.json({
        success: true,
        message: '测试已取消',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
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

      res.json({
        success: true,
        data: tests,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
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
        res.status(400).json({
          success: false,
          message: 'URL和基准测试类型是必需的',
        });
        return;
      }

      const result = await engine.runBenchmark(url, benchmarkType, options);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
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

      res.json({
        success: true,
        data: benchmarks,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
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
        res.status(400).json({
          success: false,
          message: '测试配置是必需的',
        });
        return;
      }

      const validation = await engine.validateTestConfig(testConfig);

      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
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

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
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

      res.json({
        success: true,
        message: '引擎重置成功',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
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

      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
  })
);

export default router;
