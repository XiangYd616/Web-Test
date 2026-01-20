/**
 * CoreTestEngine
 * 核心测试引擎 - 提供基础测试功能
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

type CoreTestConfig = Record<string, unknown>;
type CoreTestResult = {
  testId: string;
  timestamp: string;
  summary: {
    overallScore: number;
    coreStability: number;
    performanceIndex: number;
    errorRate: number;
  };
  details: {
    systemHealth: string;
    resourceUsage: {
      memory: string;
      cpu: string;
      disk: string;
    };
    coreServices: Array<{
      name: string;
      status: string;
      uptime: string;
    }>;
  };
  recommendations: string[];
};

type CoreTestRecord = {
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: number;
  endTime?: number;
  config?: CoreTestConfig;
  results?: CoreTestResult;
  error?: string;
};

class CoreTestEngine {
  name: string;
  version: string;
  activeTests: Map<string, CoreTestRecord>;
  engines: Map<string, unknown>;
  isInitialized: boolean;

  constructor() {
    this.name = 'core';
    this.version = '2.0.0';
    this.activeTests = new Map();
    this.engines = new Map();
    this.isInitialized = false;
  }

  /**
   * 检查引擎可用性
   */
  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: ['core-testing', 'system-monitoring', 'health-checks'],
    };
  }

  /**
   * 健康检查
   */
  healthCheck() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = totalMem > 0 ? (totalMem - freeMem) / totalMem : 0;
    return {
      status: memoryUsage < 0.85 ? 'healthy' : 'warning',
      version: this.version,
      activeTests: this.activeTests.size,
      uptime: process.uptime(),
      memoryUsage,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 执行测试
   */
  async executeTest(config: CoreTestConfig): Promise<{
    engine: string;
    version: string;
    success: boolean;
    results?: CoreTestResult;
    error?: string;
    timestamp: string;
  }> {
    const configTestId = (config as { testId?: string }).testId;
    const testId =
      configTestId || `core_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    try {
      console.log(`🔧 开始核心测试: ${testId}`);

      this.activeTests.set(testId, {
        status: 'running',
        startTime: Date.now(),
        config,
      });

      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memoryUsage = totalMem > 0 ? (totalMem - freeMem) / totalMem : 0;
      const cpuUsage = this.calculateCpuUsage();
      const diskUsage = this.calculateDiskUsage();
      const coreServices = this.getCoreServiceStatus();

      const healthScore = Math.max(
        0,
        100 - Math.round(memoryUsage * 60) - Math.round(cpuUsage * 40)
      );
      const performanceIndex = Math.max(0, 100 - Math.round(cpuUsage * 100));
      const errorRate = this.activeTests.size > 0 ? 1 / Math.max(1, this.activeTests.size) : 0;

      const results: CoreTestResult = {
        testId,
        timestamp: new Date().toISOString(),
        summary: {
          overallScore: Math.round((healthScore + performanceIndex) / 2),
          coreStability: healthScore,
          performanceIndex,
          errorRate,
        },
        details: {
          systemHealth: memoryUsage < 0.85 && cpuUsage < 0.8 ? 'good' : 'warning',
          resourceUsage: {
            memory: `${Math.round(memoryUsage * 100)}%`,
            cpu: `${Math.round(cpuUsage * 100)}%`,
            disk: diskUsage ? `${Math.round(diskUsage * 100)}%` : 'unknown',
          },
          coreServices,
        },
        recommendations: this.buildRecommendations(memoryUsage, cpuUsage, diskUsage),
      };

      this.activeTests.set(testId, {
        status: 'completed',
        results,
        endTime: Date.now(),
      });

      console.log(`✅ 核心测试完成: ${testId}, 评分: ${results.summary.overallScore}`);

      return {
        engine: this.name,
        version: this.version,
        success: true,
        results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`❌ 核心测试失败: ${testId}`, error);

      this.activeTests.set(testId, {
        status: 'failed',
        error: (error as Error).message,
        endTime: Date.now(),
      });

      return {
        engine: this.name,
        version: this.version,
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 初始化核心引擎
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      console.log('🔧 初始化核心测试引擎...');

      // 验证核心依赖
      const requiredDependencies = ['joi'];
      for (const dep of requiredDependencies) {
        try {
          require(dep);
        } catch {
          console.error(`❌ 缺少必需依赖: ${dep}`);
          return false;
        }
      }

      this.isInitialized = true;
      console.log('✅ 核心引擎初始化完成');
      return true;
    } catch (error) {
      console.error('❌ 核心引擎初始化失败:', error);
      return false;
    }
  }

  /**
   * 获取引擎统计
   */
  getEngineStats() {
    return {
      name: this.name,
      version: this.version,
      activeTests: this.activeTests.size,
      isInitialized: this.isInitialized,
      registeredEngines: this.engines.size,
    };
  }

  private calculateCpuUsage(): number {
    const cpus = os.cpus();
    if (!cpus.length) return 0;
    const total = cpus.reduce(
      (acc, cpu) => {
        const times = cpu.times;
        return {
          idle: acc.idle + times.idle,
          total: acc.total + times.user + times.nice + times.sys + times.idle + times.irq,
        };
      },
      { idle: 0, total: 0 }
    );
    if (total.total === 0) return 0;
    return 1 - total.idle / total.total;
  }

  private calculateDiskUsage(): number | null {
    const statfs = (fs as typeof fs & { statfsSync?: (path: string) => unknown }).statfsSync;
    if (!statfs) return null;
    try {
      const stats = statfs(path.resolve(process.cwd()));
      const castStats = stats as { bsize: number; blocks: number; bfree: number };
      const total = castStats.bsize * castStats.blocks;
      const free = castStats.bsize * castStats.bfree;
      if (!total) return null;
      return (total - free) / total;
    } catch {
      return null;
    }
  }

  private getCoreServiceStatus(): Array<{ name: string; status: string; uptime: string }> {
    const registry = require('../../core/TestEngineRegistry');
    const available = registry.getAvailableEngines?.() || [];
    return available.length
      ? available.map((engine: { type: string; enabled: boolean }) => ({
          name: `引擎:${engine.type}`,
          status: engine.enabled ? 'active' : 'disabled',
          uptime: `${Math.round(process.uptime() / 60)}min`,
        }))
      : [
          {
            name: '测试引擎管理器',
            status: 'active',
            uptime: `${Math.round(process.uptime() / 60)}min`,
          },
        ];
  }

  private buildRecommendations(memoryUsage: number, cpuUsage: number, diskUsage: number | null) {
    const recommendations: string[] = [];
    if (memoryUsage > 0.85) {
      recommendations.push('内存使用率偏高，建议排查长时间占用的测试任务或增加内存配额');
    }
    if (cpuUsage > 0.8) {
      recommendations.push('CPU负载偏高，建议错峰执行测试或降低并发');
    }
    if (diskUsage !== null && diskUsage > 0.9) {
      recommendations.push('磁盘空间不足，建议清理历史结果或扩容存储');
    }
    if (recommendations.length === 0) {
      recommendations.push('系统状态良好，建议持续观察核心指标');
    }
    return recommendations;
  }

  /**
   * 注册子引擎
   */
  registerEngine(name: string, engine: unknown): void {
    this.engines.set(name, engine);
  }

  /**
   * 获取子引擎
   */
  getEngine(name: string): unknown | undefined {
    return this.engines.get(name);
  }

  /**
   * 取消测试
   */
  cancelTest(testId: string): boolean {
    const test = this.activeTests.get(testId);
    if (!test) {
      return false;
    }

    this.activeTests.set(testId, {
      ...test,
      status: 'cancelled',
      endTime: Date.now(),
    });

    return true;
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId: string): 'running' | 'completed' | 'failed' | 'cancelled' | null {
    const test = this.activeTests.get(testId);
    return test ? test.status : null;
  }

  /**
   * 清理完成的测试
   */
  cleanupCompletedTests(): void {
    for (const [testId, test] of this.activeTests.entries()) {
      if (test.status === 'completed' || test.status === 'failed' || test.status === 'cancelled') {
        this.activeTests.delete(testId);
      }
    }
  }

  /**
   * 获取引擎信息
   */
  getEngineInfo() {
    return {
      name: this.name,
      version: this.version,
      type: 'CoreTestEngine',
      features: this.checkAvailability().features,
      stats: this.getEngineStats(),
    };
  }
}

export default CoreTestEngine;

module.exports = CoreTestEngine;
