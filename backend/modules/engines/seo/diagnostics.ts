/**
 * SEO 测试引擎诊断工具
 * 用于排查桌面端 Puppeteer 不可用的问题
 */

import { puppeteerPool } from '../shared/services/PuppeteerPool';

export async function diagnoseSEOEngine(): Promise<{
  available: boolean;
  issues: string[];
  suggestions: string[];
  details: Record<string, unknown>;
}> {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const details: Record<string, unknown> = {};

  // 检查 DEPLOY_MODE
  const deployMode = process.env.DEPLOY_MODE || 'full';
  details.deployMode = deployMode;
  if (deployMode === 'cloud') {
    issues.push('DEPLOY_MODE=cloud 模式禁用了 Puppeteer');
    suggestions.push('设置环境变量 DEPLOY_MODE=full 以启用完整功能');
  }

  // 检查 Puppeteer 可用性
  const available = await puppeteerPool.isAvailable();
  details.puppeteerAvailable = available;

  if (!available) {
    issues.push('Puppeteer 浏览器引擎不可用');
    suggestions.push('检查 Chromium 是否已安装');
    suggestions.push('在 Electron 桌面端，确保应用正确初始化');
  }

  // 获取详细状态
  try {
    const stats = await puppeteerPool.getStats();
    details.stats = stats;

    if (!stats.chromiumPath) {
      issues.push('未找到 Chromium 可执行文件');
      suggestions.push('安装 Google Chrome 或设置 PUPPETEER_EXECUTABLE_PATH 环境变量');
    }
  } catch (err) {
    details.statsError = err instanceof Error ? err.message : String(err);
  }

  return {
    available,
    issues,
    suggestions,
    details,
  };
}
