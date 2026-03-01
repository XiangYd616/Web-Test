/**
 * 桌面端引擎工厂 —— 直接构造引擎实例，不依赖服务端 TestEngineRegistry / database / queue
 *
 * 这是 backend/modules/engines/core/registerEngines.ts 中 createEngineInstance 的精简版，
 * 仅保留引擎构造逻辑，去除所有服务端依赖（database、queue、websocket）。
 */

import AccessibilityTestEngine from '../../../../backend/modules/engines/accessibility/AccessibilityTestEngine';
import ApiTestEngine from '../../../../backend/modules/engines/api/apiTestEngine';
import CompatibilityTestEngine from '../../../../backend/modules/engines/compatibility/CompatibilityTestEngine';
// StandardEngineWrapper 已移除：所有桌面端引擎均为直接实例化，无需 wrapper
import PerformanceTestEngine from '../../../../backend/modules/engines/performance/PerformanceTestEngine';
import SecurityTestEngine from '../../../../backend/modules/engines/security/securityTestEngine';
import SeoTestEngine from '../../../../backend/modules/engines/seo/SEOTestEngine';
import StressTestEngine from '../../../../backend/modules/engines/stress/stressTestEngine';
import UXTestEngine from '../../../../backend/modules/engines/ux/UXTestEngine';
import WebsiteTestEngine from '../../../../backend/modules/engines/website/WebsiteTestEngine';
import { ITestEngine, TestEngineType } from '../../../../shared/types/testEngine.types';

// 延迟获取 puppeteerPool 单例：
// esbuild CJS 输出将 ESM import 包装为 __esm 延迟初始化块，
// 顶层 import { puppeteerPool } 打包后变量在 preloadPuppeteer() 被调用时
// 尚未赋值（init_PuppeteerPool 未触发）。
// 解决方案：通过引擎模块间接获取 —— PerformanceTestEngine 内部已 import puppeteerPool，
// 实例化引擎会触发 init_PuppeteerPool()。这里用 lazy getter 确保首次调用时触发初始化。
let _poolRef: ReturnType<typeof _resolvePool> | null = null;
function _resolvePool() {
  // 引用任意一个使用 puppeteerPool 的引擎模块，触发 esbuild __esm init 链
  void PerformanceTestEngine;
  // 此时 init_PuppeteerPool 已执行，puppeteerPool 变量已赋值
  // 通过 require 获取已初始化的模块导出（require 缓存保证同一实例）
  const poolModule =
    require('../../../../backend/modules/engines/shared/services/PuppeteerPool') as {
      puppeteerPool: {
        preload(): Promise<boolean>;
        getStats(): Record<string, unknown>;
        reset(): Promise<void>;
      };
    };
  return poolModule.puppeteerPool;
}
function getPool() {
  if (!_poolRef) _poolRef = _resolvePool();
  return _poolRef;
}

type EngineCtor = new (options?: Record<string, unknown>) => unknown;

const ENGINE_CONSTRUCTORS: Partial<Record<TestEngineType, EngineCtor>> = {
  [TestEngineType.WEBSITE]: WebsiteTestEngine,
  [TestEngineType.API]: ApiTestEngine,
  [TestEngineType.PERFORMANCE]: PerformanceTestEngine,
  [TestEngineType.SECURITY]: SecurityTestEngine,
  [TestEngineType.SEO]: SeoTestEngine,
  [TestEngineType.ACCESSIBILITY]: AccessibilityTestEngine,
  [TestEngineType.STRESS]: StressTestEngine,
  [TestEngineType.COMPATIBILITY]: CompatibilityTestEngine,
  [TestEngineType.UX]: UXTestEngine,
};

export const createEngineInstance = (
  type: TestEngineType | string,
  options?: Record<string, unknown>
): ITestEngine => {
  const Engine = ENGINE_CONSTRUCTORS[type as TestEngineType];
  if (!Engine) {
    throw new Error(`未知测试引擎类型: ${type}`);
  }
  return new Engine(options) as ITestEngine;
};

// ── Puppeteer 浏览器池管理（供 main.ts 通过 engineBundle 调用） ──

export const preloadPuppeteer = (): Promise<boolean> => getPool().preload();

export const getPuppeteerStats = (): Record<string, unknown> =>
  getPool().getStats() as unknown as Record<string, unknown>;

export const resetPuppeteer = (): Promise<void> => getPool().reset();
