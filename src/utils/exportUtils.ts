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
        this.downloadFile(csvContent, filename, 'text/csv');
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
        this.downloadFile(csvContent, filename, 'text/csv');
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
        this.downloadFile(csvContent, filename, 'text/csv');
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * 转换压力测试数据为CSV
   */
  private static convertStressTestToCSV(data: any): string {
    const headers = [
      '时间戳',
      '并发用户数',
      '响应时间(ms)',
      '吞吐量(req/s)',
      '错误率(%)',
      '成功请求数',
      '失败请求数'
    ];

    const rows = data.realTimeData?.map((point: any) => [
      new Date(point.timestamp).toLocaleString('zh-CN'),
      point.activeUsers || 0,
      point.responseTime || 0,
      point.throughput || 0,
      ((point.errors || 0) / (point.requests || 1) * 100).toFixed(2),
      point.successCount || 0,
      point.errorCount || 0
    ]) || [];

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * 转换性能测试数据为CSV
   */
  private static convertPerformanceTestToCSV(data: any): string {
    const headers = ['指标', '数值', '单位'];
    const rows = [
      ['总分', data.overallScore, '分'],
      ['加载时间', data.metrics?.loadTime, 'ms'],
      ['首次内容绘制', data.metrics?.fcp, 'ms'],
      ['最大内容绘制', data.metrics?.lcp, 'ms'],
      ['累积布局偏移', data.metrics?.cls, ''],
      ['首次输入延迟', data.metrics?.fid, 'ms']
    ];

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
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

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
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
}

export default ExportUtils;
