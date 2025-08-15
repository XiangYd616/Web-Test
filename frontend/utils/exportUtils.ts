// 导出工具类
export class ExportUtils {
  /**
   * 生成文件名
   */
  static generateFilename(prefix: string, format: string, timestamp?: Date): string {
    const date = timestamp || new Date();
    const dateStr = date.toISOString().slice(0, 19).replace(/[:.]/g, '-');
    return `${prefix}-${dateStr}.${format}`;
  }

  /**
   * 格式化持续时间
   */
  static formatDuration(milliseconds: number): string {
    if (!milliseconds) return 'N/A';

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟${seconds % 60}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * 获取性能评级
   */
  static getPerformanceRating(value: number, type: string): string {
    if (!value && value !== 0) return 'N/A';

    switch (type) {
      case 'responseTime':
        if (value < 100) return '优秀';
        if (value < 200) return '良好';
        if (value < 500) return '一般';
        if (value < 1000) return '较差';
        return '很差';

      case 'throughput':
        if (value > 1000) return '优秀';
        if (value > 500) return '良好';
        if (value > 100) return '一般';
        if (value > 50) return '较差';
        return '很差';

      case 'successRate':
        if (value >= 99.9) return '优秀';
        if (value >= 99) return '良好';
        if (value >= 95) return '一般';
        if (value >= 90) return '较差';
        return '很差';

      case 'errorRate':
        if (value <= 0.1) return '优秀';
        if (value <= 1) return '良好';
        if (value <= 5) return '一般';
        if (value <= 10) return '较差';
        return '很差';

      default:
        return 'N/A';
    }
  }

  /**
   * 创建并下载文件
   */
  static downloadFile(content: string | Blob, filename: string, mimeType?: string): void {
    const blob = content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType || 'text/plain' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 压力测试数据导出
   */
  static exportStressTestData(data: any, format: string): void {
    const exportData = {
      type: 'stress-test',
      timestamp: new Date().toISOString(),
      testConfig: data.testConfig,
      results: data.results,
      metrics: data.metrics,
      realTimeData: data.realTimeData,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '2.1.0',
        format
      }
    };

    const filename = this.generateFilename('stress-test', format);

    switch (format) {
      case 'json':
        this.downloadFile(
          JSON.stringify(exportData, null, 2),
          filename,
          'application/json'
        );
        break;

      case 'csv':
        const csvContent = this.convertStressTestToCSV(exportData);
        // 🔧 修复中文乱码：添加UTF-8 BOM头
        const BOM = '/uFEFF';
        const csvWithBOM = BOM + csvContent;
        this.downloadFile(csvWithBOM, filename, 'text/csv;charset=utf-8');
        break;

      case 'html':
        const htmlContent = this.generateStressTestHTML(exportData);
        this.downloadFile(htmlContent, filename, 'text/html');
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * 性能测试数据导出
   */
  static exportPerformanceTestData(data: any, format: string): void {
    const exportData = {
      type: 'performance-test',
      timestamp: new Date().toISOString(),
      url: data.url,
      overallScore: data.overallScore,
      metrics: data.metrics,
      recommendations: data.recommendations,
      engine: data.engine,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '2.1.0',
        format
      }
    };

    const filename = this.generateFilename('performance-test', format);

    switch (format) {
      case 'json':
        this.downloadFile(
          JSON.stringify(exportData, null, 2),
          filename,
          'application/json'
        );
        break;

      case 'csv':
        const csvContent = this.convertPerformanceTestToCSV(exportData);
        // 🔧 修复中文乱码：添加UTF-8 BOM头
        const BOM = '/uFEFF';
        const csvWithBOM = BOM + csvContent;
        this.downloadFile(csvWithBOM, filename, 'text/csv;charset=utf-8');
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * API测试数据导出
   */
  static exportAPITestData(data: any, format: string): void {
    const exportData = {
      type: 'api-test',
      timestamp: new Date().toISOString(),
      endpoint: data.endpoint,
      method: data.method,
      results: data.results,
      metrics: data.metrics,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '2.1.0',
        format
      }
    };

    const filename = this.generateFilename('api-test', format);

    switch (format) {
      case 'json':
        this.downloadFile(
          JSON.stringify(exportData, null, 2),
          filename,
          'application/json'
        );
        break;

      case 'csv':
        const csvContent = this.convertAPITestToCSV(exportData);
        // 🔧 修复中文乱码：添加UTF-8 BOM头
        const BOM = '/uFEFF';
        const csvWithBOM = BOM + csvContent;
        this.downloadFile(csvWithBOM, filename, 'text/csv;charset=utf-8');
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * 转换压力测试数据为CSV（增强版）
   */
  private static convertStressTestToCSV(data: any): string {
    let csvContent = '';

    // 添加测试摘要
    csvContent += '压力测试报告摘要/n';
    csvContent += '项目,数值,单位/n';
    csvContent += `测试开始时间,${new Date(data.startTime || Date.now()).toLocaleString('zh-CN')},/n`;
    csvContent += `测试结束时间,${new Date(data.endTime || Date.now()).toLocaleString('zh-CN')},/n`;
    csvContent += `测试持续时间,${this.formatDuration(data.duration)},/n`;
    csvContent += `目标URL,${data.url || 'N/A'},/n`;
    csvContent += `最大并发数,${data.maxConcurrency || 'N/A'},/n`;
    csvContent += `总请求数,${data.totalRequests || 0},次/n`;
    csvContent += `平均响应时间,${data.averageResponseTime || 0},ms/n`;
    csvContent += `最大响应时间,${data.maxResponseTime || 0},ms/n`;
    csvContent += `平均吞吐量,${data.averageThroughput || 0},req/s/n`;
    csvContent += `整体成功率,${data.successRate || 0},%/n`;
    csvContent += `整体错误率,${data.errorRate || 0},%/n`;
    csvContent += '/n';

    // 添加详细的实时数据
    if (data.realTimeData && data.realTimeData.length > 0) {
      csvContent += '实时性能数据/n';
      const headers = [
        '时间戳',
        '并发用户数',
        '响应时间(ms)',
        '吞吐量(req/s)',
        '错误率(%)',
        '成功请求数',
        '失败请求数',
        'CPU使用率(%)',
        '内存使用率(%)',
        '活跃连接数',
        '队列长度'
      ];
      csvContent += headers.join(',') + '/n';

      const rows = data.realTimeData.map((point: any) => [
        new Date(point.timestamp).toLocaleString('zh-CN'),
        point.activeUsers || 0,
        point.responseTime || 0,
        point.throughput || 0,
        ((point.errors || 0) / (point.requests || 1) * 100).toFixed(2),
        point.successCount || 0,
        point.errorCount || 0,
        point.cpuUsage || 0,
        point.memoryUsage || 0,
        point.activeConnections || 0,
        point.queueLength || 0
      ]);

      csvContent += rows.map((row: any[]) => row.join(',')).join('/n');
    }

    return csvContent;
  }

  /**
   * 转换性能测试数据为CSV（增强版）
   */
  private static convertPerformanceTestToCSV(data: any): string {
    let csvContent = '';

    // 添加测试摘要
    csvContent += '性能测试报告摘要/n';
    csvContent += '项目,数值,单位,评级,基准值/n';
    csvContent += `测试时间,${new Date().toLocaleString('zh-CN')},,/n`;
    csvContent += `测试URL,${data.url || 'N/A'},,/n`;
    csvContent += `总体评分,${data.overallScore || 0},分,${this.getScoreRating(data.overallScore)},> 90分/n`;
    csvContent += '/n';

    // 核心Web指标
    csvContent += '核心Web指标/n';
    csvContent += '指标,数值,单位,评级,基准值,说明/n';
    csvContent += `首次内容绘制(FCP),${data.metrics?.fcp || 'N/A'},ms,${this.getPerformanceRating(data.metrics?.fcp, 'responseTime')},< 1800ms,用户看到第一个内容的时间/n`;
    csvContent += `最大内容绘制(LCP),${data.metrics?.lcp || 'N/A'},ms,${this.getPerformanceRating(data.metrics?.lcp, 'responseTime')},< 2500ms,最大内容元素渲染完成时间/n`;
    csvContent += `首次输入延迟(FID),${data.metrics?.fid || 'N/A'},ms,${this.getPerformanceRating(data.metrics?.fid, 'responseTime')},< 100ms,用户首次交互的响应时间/n`;
    csvContent += `累积布局偏移(CLS),${data.metrics?.cls || 'N/A'},,${this.getCLSRating(data.metrics?.cls)},< 0.1,页面布局稳定性指标/n`;
    csvContent += '/n';

    // 详细性能指标
    csvContent += '详细性能指标/n';
    csvContent += '指标,数值,单位,评级,说明/n';
    csvContent += `页面加载时间,${data.metrics?.loadTime || 'N/A'},ms,${this.getPerformanceRating(data.metrics?.loadTime, 'responseTime')},完整页面加载时间/n`;
    csvContent += `DOM内容加载时间,${data.metrics?.domContentLoaded || 'N/A'},ms,${this.getPerformanceRating(data.metrics?.domContentLoaded, 'responseTime')},DOM解析完成时间/n`;
    csvContent += `首次字节时间(TTFB),${data.metrics?.ttfb || 'N/A'},ms,${this.getPerformanceRating(data.metrics?.ttfb, 'responseTime')},服务器响应时间/n`;
    csvContent += `可交互时间(TTI),${data.metrics?.tti || 'N/A'},ms,${this.getPerformanceRating(data.metrics?.tti, 'responseTime')},页面完全可交互时间/n`;
    csvContent += `速度指数(SI),${data.metrics?.speedIndex || 'N/A'},,${this.getSpeedIndexRating(data.metrics?.speedIndex)},页面内容填充速度/n`;
    csvContent += '\n';

    // 资源分析
    if (data.resources && data.resources.length > 0) {
      csvContent += '资源加载分析/n';
      csvContent += '资源类型,数量,总大小(KB),平均加载时间(ms),最大加载时间(ms)/n';

      const resourceStats = this.analyzeResources(data.resources);
      Object.entries(resourceStats).forEach(([type, stats]: [string, any]) => {
        csvContent += `${type},${stats.count},${(stats.totalSize / 1024).toFixed(2)},${stats.avgLoadTime.toFixed(2)},${stats.maxLoadTime}\n`;
      });
      csvContent += '\n';
    }

    // 性能建议
    if (data.recommendations && data.recommendations.length > 0) {
      csvContent += '性能优化建议/n';
      csvContent += '优先级,建议内容,预期收益/n';
      data.recommendations.forEach((rec: any) => {
        csvContent += `${rec.priority || '中'},${rec.title || rec},${rec.impact || '中等'}/n`;
      });
    }

    return csvContent;
  }

  /**
   * 转换API测试数据为CSV
   */
  private static convertAPITestToCSV(data: any): string {
    const headers = ['端点', '方法', '状态码', '响应时间(ms)', '数据大小(bytes)'];
    const rows = data.results?.map((result: any) => [
      data.endpoint,
      data.method,
      result.statusCode,
      result.responseTime,
      result.dataSize || 0
    ]) || [];

    return [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n');
  }

  /**
   * 生成压力测试HTML报告
   */
  private static generateStressTestHTML(data: any): string {
    const { testConfig, results, metrics } = data;

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>压力测试报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 28px; font-weight: bold; color: #111827; margin-bottom: 8px; }
        .subtitle { color: #6b7280; font-size: 16px; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 20px; font-weight: 600; color: #374151; margin-bottom: 16px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .metric-card { background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
        .metric-label { font-size: 14px; color: #6b7280; margin-bottom: 4px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #111827; }
        .config-table { width: 100%; border-collapse: collapse; }
        .config-table th, .config-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .config-table th { background: #f9fafb; font-weight: 600; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">压力测试报告</div>
        <div class="subtitle">生成时间: ${new Date().toLocaleString('zh-CN')}</div>
    </div>

    <div class="section">
        <div class="section-title">测试配置</div>
        <table class="config-table">
            <tr><th>测试URL</th><td>${testConfig?.url || 'N/A'}</td></tr>
            <tr><th>并发用户数</th><td>${testConfig?.users || 'N/A'}</td></tr>
            <tr><th>测试时长</th><td>${testConfig?.duration || 'N/A'}秒</td></tr>
            <tr><th>测试类型</th><td>${testConfig?.testType || 'N/A'}</td></tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">测试结果</div>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-label">平均响应时间</div>
                <div class="metric-value">${metrics?.averageResponseTime || 0}ms</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">吞吐量</div>
                <div class="metric-value">${metrics?.throughput || 0} req/s</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">错误率</div>
                <div class="metric-value">${metrics?.errorRate || 0}%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">总请求数</div>
                <div class="metric-value">${metrics?.totalRequests || 0}</div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 复制到剪贴板
   */
  static async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 验证导出数据
   */
  static validateExportData(data: any, requiredFields: string[]): boolean {
    return requiredFields.every(field => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], data);
      return value !== undefined && value !== null;
    });
  }

  /**
   * 统一导出处理器 - 根据导出类型调用相应的方法
   */
  static async exportByType(exportType: string, data: any): Promise<void> {
    const { testType = 'stress', testId, testName } = data;

    switch (exportType) {
      case 'raw-data':
        return this.exportRawData(data, testType, testId, testName);
      case 'analysis-report':
        return this.exportAnalysisReport(data, testType, testId, testName);
      case 'data-table':
        return this.exportDataTable(data, testType, testId, testName);
      case 'summary':
        return this.exportSummary(data, testType, testId, testName);
      default:
        throw new Error(`不支持的导出类型: ${exportType}`);
    }
  }

  /**
   * 原始数据导出 - 完整的JSON格式测试记录
   */
  static exportRawData(data: any, testType: string = 'stress', testId?: string, testName?: string): void {
    const exportData = {
      type: 'raw-data',
      timestamp: new Date().toISOString(),
      testId: testId || `${testType}-${Date.now()}`,
      testName: testName || `${testType}测试`,
      testType,
      fullData: {
        testConfig: data.testConfig || {},
        result: data.result || {},
        metrics: data.metrics || {},
        realTimeData: data.realTimeData || [],
        logs: data.logs || [],
        errors: data.errors || [],
        rawResponse: data.rawResponse || null
      },
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '2.1.0',
        format: 'json',
        description: '完整的原始测试数据，包含所有详细信息'
      }
    };

    const filename = this.generateFilename(`raw-data-${testName || testType}`, 'json');
    this.downloadFile(
      JSON.stringify(exportData, null, 2),
      filename,
      'application/json'
    );
  }

  /**
   * 分析报告导出 - HTML格式报告（增强版）
   */
  static exportAnalysisReport(data: any, testType: string = 'stress', testId?: string, testName?: string): void {
    const metrics = data.metrics || {};
    const result = data.result || {};
    const testConfig = data.testConfig || {};
    const realTimeData = data.realTimeData || [];

    // 生成性能评级
    const performanceGrade = this.calculatePerformanceGrade(metrics);

    // 生成建议
    const recommendations = this.generateRecommendations(metrics, testType);

    // 分析瓶颈
    const bottlenecks = this.identifyBottlenecks(metrics);

    // 分析趋势
    const trends = realTimeData.length > 10 ? this.analyzeTrends(realTimeData) : {};

    // 错误分析
    const errorAnalysis = data.errors ? this.analyzeErrors(data.errors) : [];

    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${testName || testType}测试 - 深度分析报告</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; }
        .content { padding: 40px; }
        .section { margin: 40px 0; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; transition: transform 0.2s; }
        .metric-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2.2em; font-weight: bold; color: #495057; margin-bottom: 8px; }
        .metric-label { color: #6c757d; font-size: 0.95em; }
        .metric-rating { font-size: 0.85em; margin-top: 8px; padding: 4px 8px; border-radius: 12px; display: inline-block; }
        .rating-excellent { background: #d4edda; color: #155724; }
        .rating-good { background: #d1ecf1; color: #0c5460; }
        .rating-average { background: #fff3cd; color: #856404; }
        .rating-poor { background: #f8d7da; color: #721c24; }
        .grade-card { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 20px 0; }
        .grade-score { font-size: 3em; font-weight: bold; margin-bottom: 10px; }
        .bottleneck-item { background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 12px 0; border-radius: 4px; }
        .recommendation-item { background: #e7f3ff; border-left: 4px solid #007bff; padding: 16px; margin: 12px 0; border-radius: 4px; }
        .trend-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #e9ecef; }
        .trend-up { color: #dc3545; }
        .trend-down { color: #28a745; }
        .trend-stable { color: #6c757d; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; border-radius: 8px; overflow: hidden; }
        th, td { padding: 16px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background: #f8f9fa; font-weight: 600; color: #495057; }
        .error-critical { background: #f8d7da; }
        .error-warning { background: #fff3cd; }
        .error-info { background: #d1ecf1; }
        .percentile-chart { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .summary-box { background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; padding: 24px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 ${testName || testType}测试深度分析报告</h1>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                <div><strong>测试时间:</strong> ${new Date().toLocaleString('zh-CN')}</div>
                <div><strong>测试目标:</strong> ${testConfig.url || '未指定'}</div>
                <div><strong>测试类型:</strong> ${testType}</div>
                <div><strong>测试ID:</strong> ${testId || 'N/A'}</div>
            </div>
        </div>

        <div class="content">
            <!-- 执行摘要 -->
            <div class="section">
                <h2>📊 执行摘要</h2>
                <div class="summary-box">
                    <h3>关键发现</h3>
                    <p>本次${testType}测试共执行${metrics.totalRequests || 0}个请求，平均响应时间为${metrics.averageResponseTime || 0}ms，
                    成功率达到${metrics.successRate || 0}%。${(performanceGrade as any).description || ''}</p>
                </div>
            </div>

            <!-- 性能概览 -->
            <div class="section">
                <h2>📈 性能概览</h2>
                <div class="metric-grid">
                    <div class="metric-card">
                        <div class="metric-value">${metrics.averageResponseTime || 0}ms</div>
                        <div class="metric-label">平均响应时间</div>
                        <div class="metric-rating ${this.getRatingClass(this.getPerformanceRating(metrics.averageResponseTime, 'responseTime'))}">${this.getPerformanceRating(metrics.averageResponseTime, 'responseTime')}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${metrics.throughput || 0}</div>
                        <div class="metric-label">吞吐量 (req/s)</div>
                        <div class="metric-rating ${this.getRatingClass(this.getPerformanceRating(metrics.throughput, 'throughput'))}">${this.getPerformanceRating(metrics.throughput, 'throughput')}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${metrics.errorRate || 0}%</div>
                        <div class="metric-label">错误率</div>
                        <div class="metric-rating ${this.getRatingClass(this.getPerformanceRating(metrics.errorRate, 'errorRate'))}">${this.getPerformanceRating(metrics.errorRate, 'errorRate')}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${metrics.successRate || 0}%</div>
                        <div class="metric-label">成功率</div>
                        <div class="metric-rating ${this.getRatingClass(this.getPerformanceRating(metrics.successRate, 'successRate'))}">${this.getPerformanceRating(metrics.successRate, 'successRate')}</div>
                    </div>
                </div>
            </div>

            <!-- 性能评级 -->
            <div class="section">
                <h2>🏆 性能评级</h2>
                <div class="grade-card">
                    <div class="grade-score">${performanceGrade.score}</div>
                    <h3>${performanceGrade.grade}级</h3>
                    <p>${(performanceGrade as any).description || ''}</p>
                </div>
            </div>

            <!-- 响应时间分布 -->
            ${metrics.p50ResponseTime ? `
            <div class="section">
                <h2>⏱️ 响应时间分布分析</h2>
                <div class="percentile-chart">
                    <h4>百分位数分析</h4>
                    <table>
                        <tr><th>百分位</th><th>响应时间</th><th>评级</th><th>说明</th></tr>
                        <tr><td>P50 (中位数)</td><td>${metrics.p50ResponseTime}ms</td><td>${this.getPerformanceRating(metrics.p50ResponseTime, 'responseTime')}</td><td>50%的请求响应时间低于此值</td></tr>
                        <tr><td>P90</td><td>${metrics.p90ResponseTime || 'N/A'}ms</td><td>${this.getPerformanceRating(metrics.p90ResponseTime, 'responseTime')}</td><td>90%的请求响应时间低于此值</td></tr>
                        <tr><td>P95</td><td>${metrics.p95ResponseTime || 'N/A'}ms</td><td>${this.getPerformanceRating(metrics.p95ResponseTime, 'responseTime')}</td><td>95%的请求响应时间低于此值</td></tr>
                        <tr><td>P99</td><td>${metrics.p99ResponseTime || 'N/A'}ms</td><td>${this.getPerformanceRating(metrics.p99ResponseTime, 'responseTime')}</td><td>99%的请求响应时间低于此值</td></tr>
                    </table>
                </div>
            </div>
            ` : ''}

            <div class="section">
                <h2>🔍 性能瓶颈分析</h2>
                ${bottlenecks.length > 0 ? bottlenecks.map(bottleneck => `
                    <div class="bottleneck-item">
                        <h4>⚠️ ${(bottleneck as any).type || bottleneck}</h4>
                        <p>${(bottleneck as any).description || bottleneck}</p>
                        <p><strong>影响程度:</strong> ${(bottleneck as any).severity || '中等'}</p>
                        <p><strong>建议措施:</strong> ${(bottleneck as any).suggestion || '需要进一步分析'}</p>
                    </div>
                `).join('') : '<p>✅ 未发现明显的性能瓶颈</p>'}
            </div>

            <!-- 趋势分析 -->
            ${Object.keys(trends).length > 0 ? `
            <div class="section">
                <h2>📈 性能趋势分析</h2>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                    ${Object.entries(trends).map(([metric, trend]: [string, any]) => `
                        <div class="trend-item">
                            <span><strong>${this.getMetricDisplayName(metric)}:</strong></span>
                            <span class="trend-${trend.direction === '上升' ? 'up' : trend.direction === '下降' ? 'down' : 'stable'}">
                                ${trend.direction} (${trend.changeRate}%) - ${trend.stability}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- 错误分析 -->
            ${errorAnalysis.length > 0 ? `
            <div class="section">
                <h2>🚨 错误分析</h2>
                <table>
                    <thead>
                        <tr><th>错误类型</th><th>错误代码</th><th>发生次数</th><th>错误率</th><th>首次出现</th><th>最后出现</th></tr>
                    </thead>
                    <tbody>
                        ${errorAnalysis.map(error => `
                            <tr class="${error.rate > 10 ? 'error-critical' : error.rate > 5 ? 'error-warning' : 'error-info'}">
                                <td>${error.type}</td>
                                <td>${error.code}</td>
                                <td>${error.count}</td>
                                <td>${error.rate}%</td>
                                <td>${error.firstOccurrence}</td>
                                <td>${error.lastOccurrence}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <!-- 优化建议 -->
            <div class="section">
                <h2>🎯 优化建议</h2>
                ${recommendations.map((rec, index) => `
                    <div class="recommendation-item">
                        <h4>${index + 1}. ${(rec as any).title || rec}</h4>
                        <p>${(rec as any).description || rec}</p>
                        ${(rec as any).priority ? `<p><strong>优先级:</strong> ${(rec as any).priority}</p>` : ''}
                        ${(rec as any).impact ? `<p><strong>预期影响:</strong> ${(rec as any).impact}</p>` : ''}
                    </div>
                `).join('')}
            </div>

            <!-- 详细指标 -->
            <div class="section">
                <h2>📊 详细指标</h2>
                <table>
                    <thead>
                        <tr><th>指标</th><th>数值</th><th>评级</th><th>基准值</th><th>状态</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>最小响应时间</td><td>${metrics.minResponseTime || 0}ms</td><td>${this.getPerformanceRating(metrics.minResponseTime, 'responseTime')}</td><td>< 50ms</td><td>✅</td></tr>
                        <tr><td>最大响应时间</td><td>${metrics.maxResponseTime || 0}ms</td><td>${this.getPerformanceRating(metrics.maxResponseTime, 'responseTime')}</td><td>< 1000ms</td><td>${(metrics.maxResponseTime || 0) > 1000 ? '⚠️' : '✅'}</td></tr>
                        <tr><td>总请求数</td><td>${metrics.totalRequests || 0}</td><td>-</td><td>-</td><td>✅</td></tr>
                        <tr><td>成功请求数</td><td>${metrics.successfulRequests || 0}</td><td>-</td><td>-</td><td>✅</td></tr>
                        <tr><td>失败请求数</td><td>${metrics.failedRequests || 0}</td><td>-</td><td>0</td><td>${(metrics.failedRequests || 0) > 0 ? '⚠️' : '✅'}</td></tr>
                        <tr><td>并发连接数</td><td>${testConfig.concurrency || 'N/A'}</td><td>-</td><td>-</td><td>✅</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- 测试配置 -->
            <div class="section">
                <h2>⚙️ 测试配置</h2>
                <table>
                    <tbody>
                        <tr><td><strong>测试URL</strong></td><td>${testConfig.url || '未指定'}</td></tr>
                        <tr><td><strong>并发用户数</strong></td><td>${testConfig.concurrency || '未指定'}</td></tr>
                        <tr><td><strong>测试持续时间</strong></td><td>${testConfig.duration || '未指定'}秒</td></tr>
                        <tr><td><strong>请求方法</strong></td><td>${testConfig.method || 'GET'}</td></tr>
                        <tr><td><strong>超时设置</strong></td><td>${testConfig.timeout || '30'}秒</td></tr>
                        <tr><td><strong>测试环境</strong></td><td>${testConfig.environment || '生产环境'}</td></tr>
                    </tbody>
                </table>
            </div>
                    <tr><td>请求方法</td><td>${testConfig.method || 'GET'}</td></tr>
                </tbody>
            </table>

            <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; text-align: center;">
                <p>报告生成时间: ${new Date().toLocaleString('zh-CN')} | 版本: 2.1.0</p>
            </footer>
        </div>
    </div>
</body>
</html>`;

    const filename = this.generateFilename(`analysis-report-${testName || testType}`, 'html');
    this.downloadFile(htmlContent, filename, 'text/html');
  }

  /**
   * 数据表格导出 - CSV格式（增强版）
   */
  static exportDataTable(data: any, testType: string = 'stress', testId?: string, testName?: string): void {
    const metrics = data.metrics || {};
    const realTimeData = data.realTimeData || [];
    const result = data.result || {};
    const testConfig = data.testConfig || {};

    // 构建CSV内容
    let csvContent = '';

    // 添加基本信息
    csvContent += '测试基本信息/n';
    csvContent += '项目,数值,备注/n';
    csvContent += `测试名称,${testName || testType}测试,\n`;
    csvContent += `测试ID,${testId || 'N/A'},/n`;
    csvContent += `测试时间,${new Date().toLocaleString('zh-CN')},/n`;
    csvContent += `测试类型,${testType},/n`;
    csvContent += `测试URL,${testConfig.url || result.url || 'N/A'},/n`;
    csvContent += `测试持续时间,${testConfig.duration || 'N/A'},秒/n`;
    csvContent += `并发用户数,${testConfig.concurrency || 'N/A'},/n`;
    csvContent += `总测试时长,${this.formatDuration(result.totalDuration)},/n`;
    csvContent += '\n';

    // 添加核心性能指标
    csvContent += '核心性能指标/n';
    csvContent += '指标名称,数值,单位,评级,基准值/n';
    csvContent += `平均响应时间,${metrics.averageResponseTime || 0},ms,${this.getPerformanceRating(metrics.averageResponseTime, 'responseTime')},< 200ms/n`;
    csvContent += `最小响应时间,${metrics.minResponseTime || 0},ms,${this.getPerformanceRating(metrics.minResponseTime, 'responseTime')},/n`;
    csvContent += `最大响应时间,${metrics.maxResponseTime || 0},ms,${this.getPerformanceRating(metrics.maxResponseTime, 'responseTime')},< 1000ms/n`;
    csvContent += `P50响应时间,${metrics.p50ResponseTime || 'N/A'},ms,${this.getPerformanceRating(metrics.p50ResponseTime, 'responseTime')},< 150ms/n`;
    csvContent += `P90响应时间,${metrics.p90ResponseTime || 'N/A'},ms,${this.getPerformanceRating(metrics.p90ResponseTime, 'responseTime')},< 300ms/n`;
    csvContent += `P95响应时间,${metrics.p95ResponseTime || 'N/A'},ms,${this.getPerformanceRating(metrics.p95ResponseTime, 'responseTime')},< 500ms/n`;
    csvContent += `P99响应时间,${metrics.p99ResponseTime || 'N/A'},ms,${this.getPerformanceRating(metrics.p99ResponseTime, 'responseTime')},< 800ms/n`;
    csvContent += `吞吐量,${metrics.throughput || 0},req/s,${this.getPerformanceRating(metrics.throughput, 'throughput')},> 100 req/s/n`;
    csvContent += `总请求数,${metrics.totalRequests || 0},次,,/n`;
    csvContent += `成功请求数,${metrics.successfulRequests || 0},次,,/n`;
    csvContent += `失败请求数,${metrics.failedRequests || 0},次,,/n`;
    csvContent += `成功率,${metrics.successRate || 0},%,${this.getPerformanceRating(metrics.successRate, 'successRate')},> 99%/n`;
    csvContent += `错误率,${metrics.errorRate || 0},%,${this.getPerformanceRating(metrics.errorRate, 'errorRate')},< 1%/n`;
    csvContent += '\n';

    // 添加性能分析
    csvContent += '性能分析/n';
    csvContent += '分析项目,结果,建议/n';
    const performanceGrade = this.calculatePerformanceGrade(metrics);
    csvContent += `整体性能评级,${performanceGrade.grade} (${performanceGrade.score}分),${(performanceGrade as any).description || ''}/n`;

    const bottlenecks = this.identifyBottlenecks(metrics);
    bottlenecks.forEach(bottleneck => {
      csvContent += `性能瓶颈,${(bottleneck as any).type || bottleneck},${(bottleneck as any).description || bottleneck}/n`;
    });

    const recommendations = this.generateRecommendations(metrics, testType);
    recommendations.slice(0, 5).forEach((rec, index) => {
      csvContent += `优化建议${index + 1},${(rec as any).title || rec},${(rec as any).description || rec}/n`;
    });
    csvContent += '\n';

    // 添加错误分析（如果有错误）
    if (data.errors && data.errors.length > 0) {
      csvContent += '错误分析/n';
      csvContent += '错误类型,错误代码,错误次数,错误率,首次出现时间,最后出现时间/n';

      const errorStats = this.analyzeErrors(data.errors);
      errorStats.forEach(error => {
        csvContent += `${error.type},${error.code},${error.count},${error.rate}%,${error.firstOccurrence},${error.lastOccurrence}\n`;
      });
      csvContent += '\n';
    }

    // 添加实时数据（如果有）
    if (realTimeData.length > 0) {
      csvContent += '实时性能数据/n';
      csvContent += '时间戳,响应时间(ms),吞吐量(req/s),错误率(%),CPU使用率(%),内存使用率(%),活跃连接数,队列长度/n';

      realTimeData.slice(0, 1000).forEach((point: any) => { // 限制数据量
        csvContent += `${point.timestamp || ''},${point.responseTime || 0},${point.throughput || 0},${point.errorRate || 0},${point.cpuUsage || 0},${point.memoryUsage || 0},${point.activeConnections || 0},${point.queueLength || 0}/n`;
      });
      csvContent += '\n';
    }

    // 添加趋势分析
    if (realTimeData.length > 10) {
      csvContent += '趋势分析/n';
      csvContent += '指标,趋势,变化率,稳定性评分/n';
      const trends = this.analyzeTrends(realTimeData);
      Object.entries(trends).forEach(([metric, trend]: [string, any]) => {
        csvContent += `${metric},${trend.direction},${trend.changeRate}%,${trend.stability}\n`;
      });
    }

    const filename = this.generateFilename(`enhanced-data-table-${testName || testType}`, 'csv');

    // 🔧 修复中文乱码：添加UTF-8 BOM头
    const BOM = '/uFEFF';
    const csvWithBOM = BOM + csvContent;

    this.downloadFile(csvWithBOM, filename, 'text/csv;charset=utf-8');
  }

  /**
   * 分析错误数据
   */
  static analyzeErrors(errors: any[]): any[] {
    const errorMap = new Map();

    errors.forEach(error => {
      const key = `${error.type || 'Unknown'}-${error.code || 'N/A'}`;
      if (!errorMap.has(key)) {
        errorMap.set(key, {
          type: error.type || 'Unknown',
          code: error.code || 'N/A',
          count: 0,
          firstOccurrence: error.timestamp,
          lastOccurrence: error.timestamp
        });
      }

      const errorStat = errorMap.get(key);
      errorStat.count++;
      if (error.timestamp < errorStat.firstOccurrence) {
        errorStat.firstOccurrence = error.timestamp;
      }
      if (error.timestamp > errorStat.lastOccurrence) {
        errorStat.lastOccurrence = error.timestamp;
      }
    });

    const totalErrors = errors.length;
    return Array.from(errorMap.values()).map(error => ({
      ...error,
      rate: ((error.count / totalErrors) * 100).toFixed(2),
      firstOccurrence: new Date(error.firstOccurrence).toLocaleString('zh-CN'),
      lastOccurrence: new Date(error.lastOccurrence).toLocaleString('zh-CN')
    }));
  }

  /**
   * 分析趋势数据
   */
  static analyzeTrends(data: any[]): any {
    if (data.length < 10) return {};

    const trends: any = {};
    const metrics = ['responseTime', 'throughput', 'errorRate', 'cpuUsage', 'memoryUsage'];

    metrics.forEach(metric => {
      const values = data.map(d => d[metric]).filter(v => v !== undefined && v !== null);
      if (values.length < 5) return;

      // 计算趋势方向
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));

      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const changeRate = ((secondAvg - firstAvg) / firstAvg * 100).toFixed(2);
      const direction = secondAvg > firstAvg ? '上升' : secondAvg < firstAvg ? '下降' : '稳定';

      // 计算稳定性（变异系数）
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const cv = (stdDev / mean) * 100;

      let stability = '很稳定';
      if (cv > 50) stability = '很不稳定';
      else if (cv > 30) stability = '不稳定';
      else if (cv > 15) stability = '较稳定';
      else if (cv > 5) stability = '稳定';

      trends[metric] = {
        direction,
        changeRate,
        stability
      };
    });

    return trends;
  }

  /**
   * 获取评级对应的CSS类名
   */
  static getRatingClass(rating: string): string {
    switch (rating) {
      case '优秀': return 'rating-excellent';
      case '良好': return 'rating-good';
      case '一般': return 'rating-average';
      case '较差':
      case '很差': return 'rating-poor';
      default: return 'rating-average';
    }
  }

  /**
   * 获取指标显示名称
   */
  static getMetricDisplayName(metric: string): string {
    const displayNames: { [key: string]: string } = {
      'responseTime': '响应时间',
      'throughput': '吞吐量',
      'errorRate': '错误率',
      'cpuUsage': 'CPU使用率',
      'memoryUsage': '内存使用率'
    };
    return displayNames[metric] || metric;
  }

  /**
   * 获取评分等级
   */
  static getScoreRating(score: number): string {
    if (!score && score !== 0) return 'N/A';
    if (score >= 90) return '优秀';
    if (score >= 75) return '良好';
    if (score >= 60) return '一般';
    if (score >= 40) return '较差';
    return '很差';
  }

  /**
   * 获取CLS评级
   */
  static getCLSRating(cls: number): string {
    if (!cls && cls !== 0) return 'N/A';
    if (cls <= 0.1) return '优秀';
    if (cls <= 0.25) return '良好';
    return '较差';
  }

  /**
   * 获取速度指数评级
   */
  static getSpeedIndexRating(si: number): string {
    if (!si && si !== 0) return 'N/A';
    if (si <= 3400) return '优秀';
    if (si <= 5800) return '良好';
    return '较差';
  }

  /**
   * 分析资源加载情况
   */
  static analyzeResources(resources: any[]): any {
    const stats: any = {};

    resources.forEach(resource => {
      const type = resource.type || 'other';
      if (!stats[type]) {
        stats[type] = {
          count: 0,
          totalSize: 0,
          loadTimes: []
        };
      }

      stats[type].count++;
      stats[type].totalSize += resource.size || 0;
      stats[type].loadTimes.push(resource.loadTime || 0);
    });

    // 计算平均值和最大值
    Object.keys(stats).forEach(type => {
      const loadTimes = stats[type].loadTimes;
      stats[type].avgLoadTime = loadTimes.reduce((a: number, b: number) => a + b, 0) / loadTimes.length;
      stats[type].maxLoadTime = Math.max(...loadTimes);
    });

    return stats;
  }

  /**
   * 快速摘要导出 - 简化的JSON格式
   */
  static exportSummary(data: any, testType: string = 'stress', testId?: string, testName?: string): void {
    const metrics = data.metrics || {};
    const result = data.result || {};
    const testConfig = data.testConfig || {};

    // 计算性能评级
    const performanceGrade = this.calculatePerformanceGrade(metrics);

    // 识别性能瓶颈
    const bottlenecks = this.identifyBottlenecks(metrics);

    // 生成简化建议
    const recommendations = this.generateRecommendations(metrics, testType).slice(0, 3); // 只取前3条

    const summaryData = {
      type: 'summary',
      timestamp: new Date().toISOString(),
      testId: testId || `${testType}-${Date.now()}`,
      testName: testName || `${testType}测试`,
      testType,
      summary: {
        duration: testConfig.duration || 0,
        totalRequests: metrics.totalRequests || 0,
        averageResponseTime: metrics.averageResponseTime || 0,
        maxResponseTime: metrics.maxResponseTime || 0,
        minResponseTime: metrics.minResponseTime || 0,
        throughput: metrics.throughput || 0,
        errorRate: metrics.errorRate || 0,
        successRate: metrics.successRate || 0
      },
      performance: {
        grade: performanceGrade.grade,
        score: performanceGrade.score,
        bottlenecks,
        recommendations
      },
      testConfig: {
        url: testConfig.url,
        method: testConfig.method || 'GET',
        concurrency: testConfig.concurrency,
        duration: testConfig.duration
      },
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '2.1.0',
        format: 'json',
        description: '关键指标的快速摘要'
      }
    };

    const filename = this.generateFilename(`summary-${testName || testType}`, 'json');
    this.downloadFile(
      JSON.stringify(summaryData, null, 2),
      filename,
      'application/json'
    );
  }

  /**
   * 计算性能评级
   */
  private static calculatePerformanceGrade(metrics: any): { grade: string; score: number } {
    let score = 100;

    // 响应时间评分 (40%)
    const avgResponseTime = metrics.averageResponseTime || 0;
    if (avgResponseTime > 2000) score -= 40;
    else if (avgResponseTime > 1000) score -= 25;
    else if (avgResponseTime > 500) score -= 15;
    else if (avgResponseTime > 200) score -= 5;

    // 错误率评分 (30%)
    const errorRate = metrics.errorRate || 0;
    if (errorRate > 10) score -= 30;
    else if (errorRate > 5) score -= 20;
    else if (errorRate > 2) score -= 10;
    else if (errorRate > 0.5) score -= 5;

    // 吞吐量评分 (20%)
    const throughput = metrics.throughput || 0;
    if (throughput < 10) score -= 20;
    else if (throughput < 50) score -= 10;
    else if (throughput < 100) score -= 5;

    // 稳定性评分 (10%)
    const maxResponseTime = metrics.maxResponseTime || 0;
    const minResponseTime = metrics.minResponseTime || 0;
    const responseTimeVariance = maxResponseTime - minResponseTime;
    if (responseTimeVariance > 5000) score -= 10;
    else if (responseTimeVariance > 2000) score -= 5;

    score = Math.max(0, Math.min(100, score));

    let grade = 'D';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';

    return { grade, score };
  }

  /**
   * 识别性能瓶颈
   */
  private static identifyBottlenecks(metrics: any): string[] {
    const bottlenecks: string[] = [];

    if ((metrics.averageResponseTime || 0) > 1000) {
      bottlenecks.push('响应时间较长');
    }

    if ((metrics.errorRate || 0) > 2) {
      bottlenecks.push('错误率偏高');
    }

    if ((metrics.throughput || 0) < 50) {
      bottlenecks.push('吞吐量较低');
    }

    const maxResponseTime = metrics.maxResponseTime || 0;
    const minResponseTime = metrics.minResponseTime || 0;
    if (maxResponseTime - minResponseTime > 2000) {
      bottlenecks.push('响应时间波动较大');
    }

    return bottlenecks.length > 0 ? bottlenecks : ['无明显瓶颈'];
  }

  /**
   * 生成优化建议
   */
  private static generateRecommendations(metrics: any, testType: string): string[] {
    const recommendations: string[] = [];

    if ((metrics.averageResponseTime || 0) > 1000) {
      recommendations.push('优化数据库查询性能');
      recommendations.push('考虑增加缓存机制');
    }

    if ((metrics.errorRate || 0) > 2) {
      recommendations.push('检查错误日志，修复程序bug');
      recommendations.push('增强错误处理和重试机制');
    }

    if ((metrics.throughput || 0) < 50) {
      recommendations.push('优化服务器配置');
      recommendations.push('考虑水平扩展');
    }

    if (testType === 'stress') {
      recommendations.push('监控系统资源使用情况');
      recommendations.push('设置合理的性能阈值');
    }

    return recommendations.length > 0 ? recommendations : ['系统性能良好，继续保持'];
  }
}

export default ExportUtils;
