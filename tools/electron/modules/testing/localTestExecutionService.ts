import { generateId, getLocalDb, initLocalDb } from '../localDbAdapter';
import {
  insertExecutionLog,
  markCompletedWithLog,
  markFailedWithLog,
  markStartedWithLog,
} from './localTestLogService';
import localTestOperationsRepository from './localTestOperationsRepository';
import localTestRepository from './localTestRepository';

// ── 事件回调：主进程注册后，引擎进度/完成/失败会通过此回调推送到渲染进程 ──
type TestEventListener = (event: string, payload: Record<string, unknown>) => void;
let _eventListener: TestEventListener | null = null;
function emitTestEvent(event: string, payload: Record<string, unknown>): void {
  try {
    _eventListener?.(event, payload);
  } catch {
    /* 不影响引擎执行 */
  }
}

// 确保数据库已初始化（防止 initializeModules 中数据库初始化失败后 IPC 调用报错）
async function ensureDbReady(): Promise<void> {
  const db = getLocalDb() as unknown as { initialized?: boolean };
  if (!db || !db.initialized) {
    await initLocalDb();
  }
}

// 后端引擎类型（仅类型引用，不实际 import backend 代码）
type TestEngineType = string;
type BaseTestConfig = { url?: string; metadata?: Record<string, unknown>; [key: string]: unknown };
type BaseTestResult = { duration: number; engineType: string; [key: string]: unknown };
type TestProgress = { progress?: number; currentStep?: string; messages?: unknown[] };
type ITestEngine = {
  type: string;
  name: string;
  run: (
    config: BaseTestConfig,
    onProgress: (p: TestProgress) => Promise<void>
  ) => Promise<BaseTestResult>;
  cancel: (testId: string) => Promise<void>;
};

// 延迟加载后端引擎（仅在实际执行测试时才加载，避免打包时拉入整个 backend 依赖链）
// 使用 require() + path.join(__dirname, ...) 构造运行时路径，避免 esbuild 静态分析并内联
//
// 路径说明：
// - 打包后：main.ts 被 bundle 为 dist/main.js，__dirname = dist/
//   → dist/modules/engineBundle.js ✓
// - 开发模式（未经 esbuild）：__dirname = tools/electron/modules/testing/
//   → 需回退到 tools/electron/ 再拼接 dist/modules/engineBundle.js
let _createEngineInstance: ((type: string) => ITestEngine) | null = null;
async function getCreateEngineInstance(): Promise<(type: string) => ITestEngine> {
  if (!_createEngineInstance) {
    const pathMod = require('path') as typeof import('path');
    const fsMod = require('fs') as typeof import('fs');

    // 首选路径：打包后 __dirname 即 dist/
    const primaryPath = pathMod.join(__dirname, 'modules', 'engineBundle.js');
    // 备选路径：开发模式从 modules/testing/ 回退到 electron 根目录下的 dist/
    const fallbackPath = pathMod.join(__dirname, '..', '..', 'dist', 'modules', 'engineBundle.js');

    const bundlePath = fsMod.existsSync(primaryPath) ? primaryPath : fallbackPath;

    try {
      const mod = require(bundlePath) as Record<string, unknown>;
      _createEngineInstance = mod.createEngineInstance as unknown as (type: string) => ITestEngine;
      if (typeof _createEngineInstance !== 'function') {
        throw new Error('engineBundle.js 中未找到 createEngineInstance 导出');
      }
    } catch (err) {
      throw new Error(
        `无法加载测试引擎模块 (尝试路径: ${bundlePath}): ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  return _createEngineInstance;
}

type StartLocalTestPayload = {
  testType: TestEngineType;
  url?: string;
  config?: Record<string, unknown>;
  userId?: string;
  testId?: string;
};

type LocalTestResult = {
  testId: string;
  status: string;
  result?: BaseTestResult;
  error?: string;
};

const DEFAULT_USER_ID = 'local-user';

// 保存正在运行的引擎实例，以便取消时调用 engine.cancel()
const runningEngines = new Map<string, ITestEngine>();

const localTestExecutionService = {
  setEventListener(listener: TestEventListener | null): void {
    _eventListener = listener;
  },

  async startTest(payload: StartLocalTestPayload): Promise<LocalTestResult> {
    await ensureDbReady();
    const testId = payload.testId || generateId();
    const userId = payload.userId || DEFAULT_USER_ID;
    const createEngine = await getCreateEngineInstance();
    const engine = createEngine(payload.testType);
    const config: BaseTestConfig = {
      url: payload.url,
      ...(payload.config || {}),
      metadata: {
        ...(payload.config?.metadata as Record<string, unknown> | undefined),
        testId,
      },
    };

    await localTestRepository.create({
      testId,
      userId,
      engineType: engine.type,
      engineName: engine.name,
      testName: `${engine.name}测试`,
      testUrl: payload.url ?? null,
      testConfig: config as Record<string, unknown>,
      status: 'pending',
      createdAt: new Date(),
    });

    await insertExecutionLog(testId, 'info', '测试创建完成', {
      engineType: engine.type,
      url: payload.url,
    });

    // 保存引擎实例以支持取消
    runningEngines.set(testId, engine as unknown as ITestEngine);

    const execute = async () => {
      let lastStep = '';
      let lastMessage = '';

      // 辅助：写数据库日志的同时推送 test-log IPC 事件到前端
      const emitLog = (
        level: 'info' | 'warn' | 'error',
        message: string,
        context?: Record<string, unknown>
      ) => {
        emitTestEvent('test-log', {
          testId,
          level,
          message,
          timestamp: new Date().toISOString(),
          context,
        });
      };

      try {
        await markStartedWithLog(testId, { engineType: engine.type });
        emitLog('info', '测试已启动', { engineType: engine.type });

        await insertExecutionLog(testId, 'info', `开始执行引擎: ${engine.name}`, {
          engineType: engine.type,
        });
        emitLog('info', `开始执行引擎: ${engine.name}`);

        const result = await engine.run(config, async (progress: TestProgress) => {
          const progressValue = Number(progress.progress ?? 0);
          await localTestOperationsRepository.updateProgress(testId, progressValue);

          const step = progress.currentStep || '';
          if (step && step !== lastStep) {
            lastStep = step;
            await insertExecutionLog(testId, 'info', `进度: ${step}`, {
              progress: progressValue,
            });
            emitLog('info', step, { progress: progressValue });
          }

          const messages = Array.isArray(progress.messages) ? progress.messages : [];
          const latestMessage = messages.length ? String(messages[messages.length - 1]) : '';
          if (latestMessage && latestMessage !== lastMessage) {
            lastMessage = latestMessage;
            await insertExecutionLog(testId, 'info', `提示: ${latestMessage}`, {
              progress: progressValue,
            });
            emitLog('info', latestMessage, { progress: progressValue });
          }

          // 实时推送进度到渲染进程
          emitTestEvent('test-progress', {
            testId,
            progress: progressValue,
            currentStep: step || lastStep,
            status: 'running',
          });
        });

        await localTestOperationsRepository.updateResults(
          testId,
          result as unknown as Record<string, unknown>
        );
        const durationSec = Math.round(result.duration / 1000);
        await markCompletedWithLog(testId, durationSec, {
          engineType: result.engineType,
        });
        emitLog('info', `测试完成，耗时 ${durationSec}s`, {
          score: typeof result.score === 'number' ? result.score : undefined,
        });

        // 推送完成事件到渲染进程
        emitTestEvent('test-completed', {
          testId,
          status: 'completed',
          score: typeof result.score === 'number' ? result.score : undefined,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await markFailedWithLog(testId, message, { engineType: engine.type });
        emitLog('error', message);

        // 推送失败事件到渲染进程
        emitTestEvent('test-error', {
          testId,
          status: 'failed',
          errorMessage: message,
        });
      } finally {
        runningEngines.delete(testId);
      }
    };

    void execute();
    return { testId, status: 'running' };
  },

  async cancelTest(testId: string): Promise<boolean> {
    const engine = runningEngines.get(testId);
    if (!engine) return false;
    try {
      await engine.cancel(testId);
    } catch {
      // 引擎取消失败不影响状态更新
    }
    runningEngines.delete(testId);

    // 通知前端测试已取消，避免仅依赖轮询
    emitTestEvent('test-error', {
      testId,
      status: 'cancelled',
      errorMessage: '测试已被用户取消',
    });

    return true;
  },
};

export default localTestExecutionService;
export type { LocalTestResult, StartLocalTestPayload };
