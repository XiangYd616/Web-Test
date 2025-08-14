const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class MemoryLeakDetector {
  constructor() {
    this.browser = null;
    this.page = null;
    this.memorySnapshots = [];
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();

    // 启用性能监控
    await this.page.coverage.startJSCoverage();
    await this.page.coverage.startCSSCoverage();
  }

  async runMemoryLeakTest() {
    console.log('开始内存泄漏检测...');

    try {
      await this.initialize();

      // 测试不同页面的内存使用
      const testPages = [
        { url: 'http://localhost:3000/', name: 'Homepage' },
        { url: 'http://localhost:3000/api-test', name: 'API Test' },
        { url: 'http://localhost:3000/security-test', name: 'Security Test' },
        { url: 'http://localhost:3000/stress-test', name: 'Stress Test' }
      ];

      for (const testPage of testPages) {
        await this.testPageMemoryUsage(testPage.url, testPage.name);
      }

      // 长时间运行测试
      await this.longRunningTest();

      // 生成报告
      await this.generateReport();

    } finally {
      await this.cleanup();
    }
  }

  async testPageMemoryUsage(url, pageName) {
    console.log(`测试页面: ${pageName}`);

    // 导航到页面
    await this.page.goto(url, { waitUntil: 'networkidle2' });

    // 等待页面完全加载
    await this.page.waitForTimeout(2000);

    // 获取初始内存快照
    const initialMemory = await this.getMemoryUsage();

    // 模拟用户交互
    await this.simulateUserInteraction();

    // 强制垃圾回收
    await this.page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });

    // 获取交互后内存快照
    const afterInteractionMemory = await this.getMemoryUsage();

    // 记录内存快照
    this.memorySnapshots.push({
      page: pageName,
      url: url,
      initial: initialMemory,
      afterInteraction: afterInteractionMemory,
      memoryIncrease: afterInteractionMemory.usedJSHeapSize - initialMemory.usedJSHeapSize,
      timestamp: new Date().toISOString()
    });
  }

  async simulateUserInteraction() {
    // 模拟各种用户交互
    try {
      // 点击按钮
      const buttons = await this.page.$$('button');
      for (let i = 0; i < Math.min(buttons.length, 5); i++) {
        await buttons[i].click();
        await this.page.waitForTimeout(500);
      }

      // 填写表单
      const inputs = await this.page.$$('input[type="text"], input[type="url"]');
      for (let i = 0; i < Math.min(inputs.length, 3); i++) {
        await inputs[i].type('test data');
        await this.page.waitForTimeout(300);
      }

      // 滚动页面
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.page.waitForTimeout(1000);

      await this.page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await this.page.waitForTimeout(1000);

    } catch (error) {
      console.log(`交互模拟出错: ${error.message}`);
    }
  }

  async longRunningTest() {
    console.log('开始长时间运行测试...');

    await this.page.goto('http://localhost:3000/api-test');

    const longRunSnapshots = [];
    const testDuration = 5 * 60 * 1000; // 5分钟
    const snapshotInterval = 30 * 1000; // 30秒间隔

    const startTime = Date.now();

    while (Date.now() - startTime < testDuration) {
      // 模拟持续的用户活动
      await this.simulateUserInteraction();

      // 获取内存快照
      const memory = await this.getMemoryUsage();
      longRunSnapshots.push({
        timestamp: Date.now() - startTime,
        memory: memory
      });

      await this.page.waitForTimeout(snapshotInterval);
    }

    this.longRunningSnapshots = longRunSnapshots;
  }

  async getMemoryUsage() {
    const metrics = await this.page.metrics();
    const jsHeap = await this.page.evaluate(() => {
      return {
        usedJSHeapSize: performance.memory?.usedJSHeapSize || 0,
        totalJSHeapSize: performance.memory?.totalJSHeapSize || 0,
        jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit || 0
      };
    });

    return {
      ...jsHeap,
      JSEventListeners: metrics.JSEventListeners,
      Nodes: metrics.Nodes,
      LayoutCount: metrics.LayoutCount,
      RecalcStyleCount: metrics.RecalcStyleCount,
      JSHeapUsedSize: metrics.JSHeapUsedSize,
      JSHeapTotalSize: metrics.JSHeapTotalSize
    };
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      test_type: 'memory_leak_detection',
      page_snapshots: this.memorySnapshots,
      long_running_snapshots: this.longRunningSnapshots || [],
      analysis: this.analyzeMemoryLeaks(),
      recommendations: this.generateRecommendations()
    };

    // 保存JSON报告
    fs.writeFileSync(
      path.join(__dirname, 'memory-leak-results.json'),
      JSON.stringify(report, null, 2)
    );

    // 生成HTML报告
    const htmlReport = this.generateHTMLReport(report);
    fs.writeFileSync(
      path.join(__dirname, 'memory-leak-report.html'),
      htmlReport
    );

    console.log('内存泄漏检测报告已生成');
  }

  analyzeMemoryLeaks() {
    const analysis = {
      potential_leaks: [],
      memory_growth_rate: 0,
      peak_memory_usage: 0,
      average_memory_increase: 0
    };

    // 分析页面级内存泄漏
    this.memorySnapshots.forEach(snapshot => {
      const memoryIncreaseMB = snapshot.memoryIncrease / (1024 * 1024);

      if (memoryIncreaseMB > 10) { // 超过10MB增长认为可能有泄漏
        analysis.potential_leaks.push({
          page: snapshot.page,
          memory_increase_mb: memoryIncreaseMB.toFixed(2),
          severity: memoryIncreaseMB > 50 ? 'high' : memoryIncreaseMB > 25 ? 'medium' : 'low'
        });
      }
    });

    // 分析长时间运行的内存增长
    if (this.longRunningSnapshots && this.longRunningSnapshots.length > 1) {
      const firstSnapshot = this.longRunningSnapshots[0];
      const lastSnapshot = this.longRunningSnapshots[this.longRunningSnapshots.length - 1];

      const totalGrowth = lastSnapshot.memory.usedJSHeapSize - firstSnapshot.memory.usedJSHeapSize;
      const timeElapsed = lastSnapshot.timestamp - firstSnapshot.timestamp;

      analysis.memory_growth_rate = (totalGrowth / timeElapsed) * 1000; // bytes per second
      analysis.peak_memory_usage = Math.max(...this.longRunningSnapshots.map(s => s.memory.usedJSHeapSize));
    }

    return analysis;
  }

  generateRecommendations() {
    const recommendations = [];

    const analysis = this.analyzeMemoryLeaks();

    if (analysis.potential_leaks.length > 0) {
      recommendations.push({
        type: 'memory_leak',
        priority: 'high',
        message: '检测到潜在的内存泄漏，建议检查事件监听器的清理和组件卸载逻辑'
      });
    }

    if (analysis.memory_growth_rate > 1000) { // 每秒增长超过1KB
      recommendations.push({
        type: 'memory_growth',
        priority: 'medium',
        message: '内存增长率较高，建议优化数据缓存和对象创建'
      });
    }

    if (analysis.peak_memory_usage > 100 * 1024 * 1024) { // 超过100MB
      recommendations.push({
        type: 'high_memory_usage',
        priority: 'medium',
        message: '峰值内存使用量较高，建议实现懒加载和数据分页'
      });
    }

    return recommendations;
  }

  generateHTMLReport(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>内存泄漏检测报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #e9ecef; border-radius: 3px; }
        .leak-high { background-color: #f8d7da; }
        .leak-medium { background-color: #fff3cd; }
        .leak-low { background-color: #d1ecf1; }
        .chart { width: 100%; height: 300px; border: 1px solid #ddd; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>内存泄漏检测报告</h1>
        <p>生成时间: ${data.timestamp}</p>
    </div>

    <div class="section">
        <h2>页面内存使用分析</h2>
        <table>
            <tr>
                <th>页面</th>
                <th>初始内存 (MB)</th>
                <th>交互后内存 (MB)</th>
                <th>内存增长 (MB)</th>
                <th>状态</th>
            </tr>
            ${data.page_snapshots.map(snapshot => `
            <tr>
                <td>${snapshot.page}</td>
                <td>${(snapshot.initial.usedJSHeapSize / 1024 / 1024).toFixed(2)}</td>
                <td>${(snapshot.afterInteraction.usedJSHeapSize / 1024 / 1024).toFixed(2)}</td>
                <td>${(snapshot.memoryIncrease / 1024 / 1024).toFixed(2)}</td>
                <td>${snapshot.memoryIncrease > 10 * 1024 * 1024 ? '⚠️ 可能泄漏' : '✅ 正常'}</td>
            </tr>
            `).join('')}
        </table>
    </div>

    <div class="section">
        <h2>潜在内存泄漏</h2>
        ${data.analysis.potential_leaks.length === 0 ?
          '<p>✅ 未检测到明显的内存泄漏</p>' :
          data.analysis.potential_leaks.map(leak => `
            <div class="leak-${leak.severity}">
                <strong>${leak.page}</strong>: 内存增长 ${leak.memory_increase_mb}MB (严重程度: ${leak.severity})
            </div>
          `).join('')
        }
    </div>

    <div class="section">
        <h2>建议</h2>
        ${data.recommendations.length === 0 ?
          '<p>✅ 内存使用表现良好，无特殊建议</p>' :
          data.recommendations.map(rec => `
            <div class="recommendation ${rec.priority}">
                <strong>[${rec.priority.toUpperCase()}]</strong> ${rec.message}
            </div>
          `).join('')
        }
    </div>
</body>
</html>
    `;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// 运行内存泄漏检测
if (require.main === module) {
  const detector = new MemoryLeakDetector();
  detector.runMemoryLeakTest().catch(console.error);
}

module.exports = MemoryLeakDetector;
