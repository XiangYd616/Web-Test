/**
 * 实时性能监控系统
 * 本地化程度：95%
 * 实现持续性能检测、性能趋势分析、预警系统、性能基线对比等功能
 */

const EventEmitter = require('events');
const puppeteer = require('puppeteer');

class RealTimePerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.monitoringTasks = new Map();
    this.performanceBaselines = new Map();
    this.alertThresholds = {
      loadTime: 3000,        // 3秒
      fcp: 1800,            // 1.8秒
      lcp: 2500,            // 2.5秒
      cls: 0.1,             // 0.1
      fid: 100,             // 100ms
      ttfb: 600,            // 600ms
      availabilityRate: 95   // 95%
    };
    this.monitoringInterval = 5 * 60 * 1000; // 5分钟
    this.browser = null;
  }

  /**
   * 启动实时监控
   */
  async startMonitoring(config) {
    console.log('🚀 启动实时性能监控...');

    const {
      url,
      monitorId,
      interval = this.monitoringInterval,
      thresholds = this.alertThresholds,
      enableBaseline = true
    } = config;

    // 初始化浏览器
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    // 创建监控任务
    const task = {
      url,
      interval,
      thresholds,
      enableBaseline,
      isRunning: true,
      lastCheck: null,
      consecutiveFailures: 0,
      performanceHistory: [],
      alerts: []
    };

    this.monitoringTasks.set(monitorId, task);

    // 启动定时监控
    this.scheduleMonitoring(monitorId);

    // 如果启用基线，建立性能基线
    if (enableBaseline) {
      await this.establishBaseline(monitorId);
    }

    console.log(`✅ 监控任务已启动: ${monitorId} - ${url}`);
    return { monitorId, status: 'started', config: task };
  }

  /**
   * 停止监控
   */
  async stopMonitoring(monitorId) {
    const task = this.monitoringTasks.get(monitorId);
    if (!task) {
      throw new Error(`监控任务不存在: ${monitorId}`);
    }

    task.isRunning = false;
    if (task.timer) {
      clearTimeout(task.timer);
    }

    this.monitoringTasks.delete(monitorId);
    console.log(`🛑 监控任务已停止: ${monitorId}`);

    return { monitorId, status: 'stopped' };
  }

  /**
   * 调度监控任务
   */
  scheduleMonitoring(monitorId) {
    const task = this.monitoringTasks.get(monitorId);
    if (!task || !task.isRunning) return;

    task.timer = setTimeout(async () => {
      try {
        await this.performCheck(monitorId);
        this.scheduleMonitoring(monitorId); // 递归调度下次检查
      } catch (error) {
        console.error(`监控检查失败: ${monitorId}`, error);
        task.consecutiveFailures++;

        // 如果连续失败次数过多，发送警报
        if (task.consecutiveFailures >= 3) {
          this.emitAlert(monitorId, 'monitoring_failure', {
            message: `监控连续失败 ${task.consecutiveFailures} 次`,
            error: error.message
          });
        }

        this.scheduleMonitoring(monitorId); // 即使失败也要继续监控
      }
    }, task.interval);
  }

  /**
   * 执行性能检查
   */
  async performCheck(monitorId) {
    const task = this.monitoringTasks.get(monitorId);
    if (!task) return;

    console.log(`🔍 执行性能检查: ${monitorId} - ${task.url}`);

    const page = await this.browser.newPage();

    try {
      // 配置页面
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setCacheEnabled(false);

      // 开始性能监控
      const startTime = Date.now();

      // 导航到页面
      const response = await page.goto(task.url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // 收集性能指标
      const metrics = await this.collectPerformanceMetrics(page, startTime);

      // 检查可用性
      const isAvailable = response && response.status() < 400;

      // 更新任务状态
      task.lastCheck = new Date().toISOString();
      task.consecutiveFailures = isAvailable ? 0 : task.consecutiveFailures + 1;

      // 添加到历史记录
      const checkResult = {
        timestamp: task.lastCheck,
        metrics,
        isAvailable,
        responseStatus: response ? response.status() : null
      };

      task.performanceHistory.push(checkResult);

      // 保持历史记录在合理范围内（最近100次检查）
      if (task.performanceHistory.length > 100) {
        task.performanceHistory = task.performanceHistory.slice(-100);
      }

      // 检查阈值并发送警报
      await this.checkThresholds(monitorId, checkResult);

      // 发送监控事件
      this.emit('performance_check', {
        monitorId,
        result: checkResult,
        task: {
          url: task.url,
          consecutiveFailures: task.consecutiveFailures
        }
      });

      console.log(`✅ 性能检查完成: ${monitorId} - 加载时间: ${metrics.loadTime}ms`);

    } catch (error) {
      console.error(`性能检查失败: ${monitorId}`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * 收集性能指标
   */
  async collectPerformanceMetrics(page, startTime) {
    // 获取导航时间
    const navigationTiming = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return nav ? {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
        loadComplete: nav.loadEventEnd - nav.loadEventStart,
        ttfb: nav.responseStart - nav.requestStart,
        domInteractive: nav.domInteractive - nav.fetchStart,
        domComplete: nav.domComplete - nav.fetchStart
      } : null;
    });

    // 获取Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};

        // FCP (First Contentful Paint)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
          });
        }).observe({ entryTypes: ['paint'] });

        // LCP (Largest Contentful Paint)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // CLS (Cumulative Layout Shift)
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          vitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });

        // 等待一段时间收集指标
        setTimeout(() => {
          resolve(vitals);
        }, 2000);
      });
    });

    // 获取资源加载信息
    const resourceTiming = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      return {
        totalResources: resources.length,
        totalSize: resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0),
        slowestResource: resources.reduce((slowest, resource) => {
          return resource.duration > (slowest.duration || 0) ? resource : slowest;
        }, {})
      };
    });

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    return {
      loadTime,
      ttfb: navigationTiming?.ttfb || 0,
      domContentLoaded: navigationTiming?.domContentLoaded || 0,
      domInteractive: navigationTiming?.domInteractive || 0,
      domComplete: navigationTiming?.domComplete || 0,
      fcp: webVitals.fcp || 0,
      lcp: webVitals.lcp || 0,
      cls: webVitals.cls || 0,
      resourceCount: resourceTiming.totalResources,
      totalSize: resourceTiming.totalSize,
      slowestResourceDuration: resourceTiming.slowestResource.duration || 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 检查性能阈值
   */
  async checkThresholds(monitorId, checkResult) {
    const task = this.monitoringTasks.get(monitorId);
    const { metrics, isAvailable } = checkResult;
    const thresholds = task.thresholds;

    const alerts = [];

    // 检查可用性
    if (!isAvailable) {
      alerts.push({
        type: 'availability',
        severity: 'critical',
        message: '网站不可访问',
        value: false,
        threshold: true
      });
    }

    // 检查加载时间
    if (metrics.loadTime > thresholds.loadTime) {
      alerts.push({
        type: 'load_time',
        severity: 'warning',
        message: `页面加载时间超过阈值`,
        value: metrics.loadTime,
        threshold: thresholds.loadTime,
        unit: 'ms'
      });
    }

    // 检查Core Web Vitals
    if (metrics.fcp > thresholds.fcp) {
      alerts.push({
        type: 'fcp',
        severity: 'warning',
        message: 'First Contentful Paint 超过阈值',
        value: metrics.fcp,
        threshold: thresholds.fcp,
        unit: 'ms'
      });
    }

    if (metrics.lcp > thresholds.lcp) {
      alerts.push({
        type: 'lcp',
        severity: 'warning',
        message: 'Largest Contentful Paint 超过阈值',
        value: metrics.lcp,
        threshold: thresholds.lcp,
        unit: 'ms'
      });
    }

    if (metrics.cls > thresholds.cls) {
      alerts.push({
        type: 'cls',
        severity: 'warning',
        message: 'Cumulative Layout Shift 超过阈值',
        value: metrics.cls,
        threshold: thresholds.cls
      });
    }

    if (metrics.ttfb > thresholds.ttfb) {
      alerts.push({
        type: 'ttfb',
        severity: 'warning',
        message: 'Time to First Byte 超过阈值',
        value: metrics.ttfb,
        threshold: thresholds.ttfb,
        unit: 'ms'
      });
    }

    // 发送警报
    for (const alert of alerts) {
      this.emitAlert(monitorId, alert.type, alert);
      task.alerts.push({
        ...alert,
        timestamp: new Date().toISOString()
      });
    }

    // 保持警报历史在合理范围内
    if (task.alerts.length > 50) {
      task.alerts = task.alerts.slice(-50);
    }
  }

  /**
   * 发送警报
   */
  emitAlert(monitorId, type, alertData) {
    const task = this.monitoringTasks.get(monitorId);

    this.emit('performance_alert', {
      monitorId,
      url: task?.url,
      type,
      ...alertData,
      timestamp: new Date().toISOString()
    });

    console.log(`🚨 性能警报: ${monitorId} - ${type} - ${alertData.message}`);
  }

  /**
   * 建立性能基线
   */
  async establishBaseline(monitorId) {
    console.log(`📊 建立性能基线: ${monitorId}`);

    const task = this.monitoringTasks.get(monitorId);
    if (!task) return;

    const baselineChecks = [];
    const checkCount = 5; // 执行5次检查建立基线

    for (let i = 0; i < checkCount; i++) {
      try {
        const page = await this.browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        const startTime = Date.now();
        await page.goto(task.url, { waitUntil: 'networkidle0' });

        const metrics = await this.collectPerformanceMetrics(page, startTime);
        baselineChecks.push(metrics);

        await page.close();

        // 间隔30秒进行下次检查
        if (i < checkCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      } catch (error) {
        console.error(`基线检查失败 ${i + 1}/${checkCount}:`, error);
      }
    }

    if (baselineChecks.length > 0) {
      const baseline = this.calculateBaseline(baselineChecks);
      this.performanceBaselines.set(monitorId, baseline);

      console.log(`✅ 性能基线已建立: ${monitorId}`, baseline);

      this.emit('baseline_established', {
        monitorId,
        baseline,
        checksCount: baselineChecks.length
      });
    }
  }

  /**
   * 计算性能基线
   */
  calculateBaseline(checks) {
    const metrics = ['loadTime', 'ttfb', 'fcp', 'lcp', 'cls', 'domContentLoaded'];
    const baseline = {};

    metrics.forEach(metric => {
      const values = checks.map(check => check[metric]).filter(v => v != null);
      if (values.length > 0) {
        baseline[metric] = {
          average: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
          min: Math.min(...values),
          max: Math.max(...values),
          p50: this.calculatePercentile(values, 50),
          p90: this.calculatePercentile(values, 90),
          p95: this.calculatePercentile(values, 95)
        };
      }
    });

    baseline.establishedAt = new Date().toISOString();
    baseline.checksCount = checks.length;

    return baseline;
  }

  /**
   * 计算百分位数
   */
  calculatePercentile(values, percentile) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * 获取性能趋势分析
   */
  getPerformanceTrends(monitorId, timeRange = '24h') {
    const task = this.monitoringTasks.get(monitorId);
    if (!task || !task.performanceHistory.length) {
      return null;
    }

    const now = new Date();
    const timeRangeMs = this.parseTimeRange(timeRange);
    const cutoffTime = new Date(now.getTime() - timeRangeMs);

    // 过滤指定时间范围内的数据
    const recentHistory = task.performanceHistory.filter(
      check => new Date(check.timestamp) >= cutoffTime
    );

    if (recentHistory.length < 2) {
      return { error: '数据不足，无法分析趋势' };
    }

    const trends = this.analyzeTrends(recentHistory);
    const baseline = this.performanceBaselines.get(monitorId);

    return {
      monitorId,
      timeRange,
      dataPoints: recentHistory.length,
      trends,
      baseline,
      summary: this.generateTrendSummary(trends, baseline),
      recommendations: this.generateTrendRecommendations(trends, baseline)
    };
  }

  /**
   * 分析性能趋势
   */
  analyzeTrends(history) {
    const metrics = ['loadTime', 'ttfb', 'fcp', 'lcp', 'cls'];
    const trends = {};

    metrics.forEach(metric => {
      const values = history.map(h => h.metrics[metric]).filter(v => v != null);
      if (values.length < 2) return;

      // 计算趋势方向
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));

      const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

      const change = secondAvg - firstAvg;
      const changePercent = (change / firstAvg) * 100;

      trends[metric] = {
        current: Math.round(secondAvg),
        previous: Math.round(firstAvg),
        change: Math.round(change),
        changePercent: Math.round(changePercent * 100) / 100,
        direction: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
        volatility: this.calculateVolatility(values)
      };
    });

    return trends;
  }

  /**
   * 计算波动性
   */
  calculateVolatility(values) {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return Math.round((stdDev / mean) * 100 * 100) / 100; // 变异系数百分比
  }

  /**
   * 生成趋势摘要
   */
  generateTrendSummary(trends, baseline) {
    const summary = {
      overallTrend: 'stable',
      criticalIssues: [],
      improvements: [],
      degradations: []
    };

    Object.entries(trends).forEach(([metric, trend]) => {
      if (Math.abs(trend.changePercent) > 20) {
        if (trend.direction === 'increasing' && ['loadTime', 'ttfb', 'fcp', 'lcp', 'cls'].includes(metric)) {
          summary.degradations.push(`${metric} 增加了 ${trend.changePercent}%`);
        } else if (trend.direction === 'decreasing' && ['loadTime', 'ttfb', 'fcp', 'lcp', 'cls'].includes(metric)) {
          summary.improvements.push(`${metric} 减少了 ${Math.abs(trend.changePercent)}%`);
        }
      }

      if (trend.volatility > 30) {
        summary.criticalIssues.push(`${metric} 波动性过高 (${trend.volatility}%)`);
      }
    });

    // 确定总体趋势
    const degradationCount = summary.degradations.length;
    const improvementCount = summary.improvements.length;

    if (degradationCount > improvementCount) {
      summary.overallTrend = 'degrading';
    } else if (improvementCount > degradationCount) {
      summary.overallTrend = 'improving';
    }

    return summary;
  }

  /**
   * 生成趋势建议
   */
  generateTrendRecommendations(trends, baseline) {
    const recommendations = [];

    Object.entries(trends).forEach(([metric, trend]) => {
      if (trend.direction === 'increasing' && trend.changePercent > 15) {
        switch (metric) {
          case 'loadTime':
            recommendations.push('页面加载时间持续增加，建议检查资源优化和服务器性能');
            break;
          case 'ttfb':
            recommendations.push('服务器响应时间增加，建议检查后端性能和数据库查询');
            break;
          case 'fcp':
            recommendations.push('首次内容绘制时间增加，建议优化关键渲染路径');
            break;
          case 'lcp':
            recommendations.push('最大内容绘制时间增加，建议优化主要内容加载');
            break;
          case 'cls':
            recommendations.push('累积布局偏移增加，建议检查动态内容加载');
            break;
        }
      }

      if (trend.volatility > 25) {
        recommendations.push(`${metric} 波动性过高，建议调查间歇性性能问题`);
      }
    });

    if (baseline) {
      Object.entries(trends).forEach(([metric, trend]) => {
        const baselineValue = baseline[metric]?.average;
        if (baselineValue && trend.current > baselineValue * 1.2) {
          recommendations.push(`${metric} 超过基线 ${Math.round(((trend.current - baselineValue) / baselineValue) * 100)}%，需要关注`);
        }
      });
    }

    return recommendations;
  }

  /**
   * 解析时间范围
   */
  parseTimeRange(timeRange) {
    const units = {
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000
    };

    const match = timeRange.match(/^(/d+)([hdw])$/);
    if (!match) return 24 * 60 * 60 * 1000; // 默认24小时

    const [, amount, unit] = match;
    return parseInt(amount) * units[unit];
  }

  /**
   * 获取监控状态
   */
  getMonitoringStatus(monitorId) {
    const task = this.monitoringTasks.get(monitorId);
    if (!task) {
      return { error: '监控任务不存在' };
    }

    const baseline = this.performanceBaselines.get(monitorId);
    const recentAlerts = task.alerts.slice(-10);

    return {
      monitorId,
      url: task.url,
      isRunning: task.isRunning,
      lastCheck: task.lastCheck,
      consecutiveFailures: task.consecutiveFailures,
      totalChecks: task.performanceHistory.length,
      hasBaseline: !!baseline,
      recentAlerts: recentAlerts.length,
      thresholds: task.thresholds,
      interval: task.interval
    };
  }

  /**
   * 获取所有监控任务
   */
  getAllMonitors() {
    const monitors = [];

    for (const [monitorId, task] of this.monitoringTasks) {
      monitors.push({
        monitorId,
        url: task.url,
        isRunning: task.isRunning,
        lastCheck: task.lastCheck,
        consecutiveFailures: task.consecutiveFailures,
        totalChecks: task.performanceHistory.length,
        recentAlerts: task.alerts.slice(-5).length
      });
    }

    return monitors;
  }

  /**
   * 清理资源
   */
  async cleanup() {
    console.log('🧹 清理实时监控资源...');

    // 停止所有监控任务
    for (const monitorId of this.monitoringTasks.keys()) {
      await this.stopMonitoring(monitorId);
    }

    // 关闭浏览器
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    console.log('✅ 实时监控资源清理完成');
  }
}

module.exports = RealTimePerformanceMonitor;
