/**
 * 统一导出管理器
 * 为所有测试类型提供标准化的导出功能
 */

import { useState } from 'react';
import type { TestType } from '../types';

// 导出格式枚举
export type ExportFormat = 'json' | 'csv' | 'pdf' | 'html' | 'xml';

// 导出选项接口
export interface ExportOptions {
  format: ExportFormat;
  includeConfig?: boolean;
  includeResults?: boolean;
  includeCharts?: boolean;
  includeRecommendations?: boolean;
  includeTimestamp?: boolean;
  customFields?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// 导出任务接口
export interface ExportTask {
  id: string;
  testType: TestType;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  error?: string;
  options: ExportOptions;
  data: unknown;
}

class exportManager {
  private tasks: Map<string, ExportTask> = new Map();
  private maxConcurrentExports = 3;

  /**
   * 创建导出任务
   */
  async createExportTask(
    testType: TestType,
    data: unknown,
    options: ExportOptions
  ): Promise<string> {
    const taskId = this.generateTaskId();

    const task: ExportTask = {
      id: taskId,
      testType,
      format: options.format,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      options,
      data
    };

    this.tasks.set(taskId, task);

    // 异步处理导出
    this.processExportTask(task);

    return taskId;
  }

  /**
   * 处理导出任务
   */
  private async processExportTask(task: ExportTask) {
    try {
      task.status = 'processing';
      task.progress = 10;

      // 根据格式处理导出
      let exportedData: string;

      switch (task.options.format) {
        case 'json':
          exportedData = await this.exportToJSON(task);
          break;
        case 'csv':
          exportedData = await this.exportToCSV(task);
          break;
        case 'pdf':
          exportedData = await this.exportToPDF(task);
          break;
        case 'html':
          exportedData = await this.exportToHTML(task);
          break;
        case 'xml':
          exportedData = await this.exportToXML(task);
          break;
        default:
          throw new Error(`不支持的导出格式: ${task.options.format}`);
      }

      // 创建下载链接
      const blob = new Blob([exportedData], {
        type: this.getMimeType(task.options.format)
      });
      task.downloadUrl = URL.createObjectURL(blob);

      task.status = 'completed';
      task.progress = 100;
      task.completedAt = new Date();

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error?.message : String(error);
    }
  }

  /**
   * 导出为JSON格式
   */
  private async exportToJSON(task: ExportTask): Promise<string> {
    task.progress = 30;

    const exportData: unknown = {
      metadata: {
        testType: task.testType,
        exportedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0'
      }
    };

    if (task.options.includeConfig) {
      exportData.config = task.data.config || {};
    }

    if (task.options.includeResults) {
      exportData.results = task.data.results || task.data;
    }

    if (task.options.includeRecommendations && task.data.recommendations) {
      exportData.recommendations = task.data.recommendations;
    }

    if (task.options.includeTimestamp) {
      exportData.timestamp = task.data.timestamp || new Date().toISOString();
    }

    task.progress = 80;

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 导出为CSV格式
   */
  private async exportToCSV(task: ExportTask): Promise<string> {
    task.progress = 30;

    const data = task.data.results || task.data;
    let csvContent = '';

    // 根据测试类型生成不同的CSV结构
    switch (task.testType) {
      case 'stress':
        csvContent = this.generateStressTestCSV(data);
        break;
      case 'network':
        csvContent = this.generateNetworkTestCSV(data);
        break;
      case 'performance':
        csvContent = this.generatePerformanceTestCSV(data);
        break;
      case 'security':
        csvContent = this.generateSecurityTestCSV(data);
        break;
      case 'api':
        csvContent = this.generateAPITestCSV(data);
        break;
      case 'seo':
        csvContent = this.generateSEOTestCSV(data);
        break;
      case 'ux':
        csvContent = this.generateUXTestCSV(data);
        break;
      case 'compatibility':
        csvContent = this.generateCompatibilityTestCSV(data);
        break;
      default:
        csvContent = this.generateGenericCSV(data);
    }

    task.progress = 80;
    return csvContent;
  }

  /**
   * 导出为PDF格式
   */
  private async exportToPDF(task: ExportTask): Promise<string> {
    task.progress = 30;

    // 生成HTML内容
    const htmlContent = await this.generateReportHTML(task);

    task.progress = 60;

    // 这里应该使用PDF生成库，暂时返回HTML
    // 在实际实现中，可以使用 jsPDF 或 Puppeteer
    return htmlContent;
  }

  /**
   * 导出为HTML格式
   */
  private async exportToHTML(task: ExportTask): Promise<string> {
    task.progress = 30;

    const htmlContent = await this.generateReportHTML(task);

    task.progress = 80;
    return htmlContent;
  }

  /**
   * 导出为XML格式
   */
  private async exportToXML(task: ExportTask): Promise<string> {
    task.progress = 30;

    const data = task.data.results || task.data;
    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';

    /**

     * if功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
    xmlContent += `<testReport type="${task.testType}" exportedAt="${new Date().toISOString()}">\n`;

    if (task.options.includeConfig && task.data.config) {
      xmlContent += '  <config>\n';
      xmlContent += this.objectToXML(task.data.config, '    ');
      xmlContent += '  </config>\n';
    }

    if (task.options.includeResults) {
      xmlContent += '  <results>\n';
      xmlContent += this.objectToXML(data, '    ');
      xmlContent += '  </results>\n';
    }

    xmlContent += '</testReport>';

    task.progress = 80;
    return xmlContent;
  }

  /**
   * 生成压力测试CSV
   */
  private generateStressTestCSV(data: unknown): string {
    let csv = 'Timestamp,Concurrent Users,Response Time (ms),Success Rate (%),Error Count\n';

    if (data.timeline && Array.isArray(data.timeline)) {
      data.timeline.forEach((point: unknown) => {
        csv += `${point.timestamp},${point.concurrentUsers || 0},${point.responseTime || 0},${point.successRate || 0},${point.errorCount || 0}\n`;
      });
    }

    return csv;
  }

  /**
   * 生成网络测试CSV
   */
  private generateNetworkTestCSV(data: unknown): string {
    let csv = 'Metric,Value,Unit\n';

    if (data.latencyResults) {
      csv += `Latency Min,${data.latencyResults.min || 0},ms\n`;
      csv += `Latency Max,${data.latencyResults.max || 0},ms\n`;
      csv += `Latency Avg,${data.latencyResults.avg || 0},ms\n`;
      csv += `Jitter,${data.latencyResults.jitter || 0},ms\n`;
      csv += `Packet Loss,${data.latencyResults.packetLoss || 0},%\n`;
    }

    if (data.bandwidthResults) {
      csv += `Download Speed,${data.bandwidthResults.downloadSpeed || 0},Mbps\n`;
      csv += `Upload Speed,${data.bandwidthResults.uploadSpeed || 0},Mbps\n`;
    }

    return csv;
  }

  /**
   * 生成性能测试CSV
   */
  private generatePerformanceTestCSV(data: unknown): string {
    let csv = 'Metric,Value,Unit\n';

    if (data.performanceMetrics) {
      Object.entries(data.performanceMetrics).forEach(([key, value]) => {
        csv += `${key},${value},ms\n`;
      });
    }

    return csv;
  }

  /**
   * 生成安全测试CSV
   */
  private generateSecurityTestCSV(data: unknown): string {
    let csv = 'Check,Status,Severity,Description\n';

    if (data.securityChecks && Array.isArray(data.securityChecks)) {
      data.securityChecks.forEach((check: unknown) => {
        csv += `${check.name || ''},${check.status || ''},${check.severity || ''},${check.description || ''}\n`;
      });
    }

    return csv;
  }

  /**
   * 生成API测试CSV
   */
  private generateAPITestCSV(data: unknown): string {
    let csv = 'Endpoint,Method,Status Code,Response Time (ms),Success\n';

    if (data.endpoints && Array.isArray(data.endpoints)) {
      data.endpoints.forEach((endpoint: unknown) => {
        csv += `${endpoint.url || ''},${endpoint.method || ''},${endpoint.statusCode || ''},${endpoint.responseTime || 0},${endpoint.success || false}\n`;
      });
    }

    return csv;
  }

  /**
   * 生成SEO测试CSV
   */
  private generateSEOTestCSV(data: unknown): string {
    let csv = 'Category,Score,Issues,Recommendations\n';

    if (data.categories) {
      Object.entries(data.categories).forEach(([category, info]: [string, any]) => {
        csv += `${category},${info.score || 0},${info.issues?.length || 0},${info.recommendations?.length || 0}\n`;
      });
    }

    return csv;
  }

  /**
   * 生成UX测试CSV
   */
  private generateUXTestCSV(data: unknown): string {
    let csv = 'Metric,Value,Unit,Status\n';

    if (data.coreWebVitals) {
      Object.entries(data.coreWebVitals).forEach(([metric, value]) => {
        csv += `${metric},${value},ms,${this.getMetricStatus(metric, value as number)}\n`;
      });
    }

    return csv;
  }

  /**
   * 生成兼容性测试CSV
   */
  private generateCompatibilityTestCSV(data: unknown): string {
    let csv = 'Browser,Version,Compatibility Score,Issues\n';

    if (data.browserCompatibility) {
      Object.entries(data.browserCompatibility).forEach(([browser, info]: [string, any]) => {
        csv += `${browser},${info.version || ''},${info.score || 0},${info.issues?.length || 0}\n`;
      });
    }

    return csv;
  }

  /**
   * 生成通用CSV
   */
  private generateGenericCSV(data: unknown): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return '';

      const headers = Object.keys(data[0]);
      let csv = headers.join(',') + '\n';

      data.forEach(row => {
        const values = headers.map(header => row[header] || '');
        csv += values.join(',') + '\n';
      });

      return csv;
    }

    // 对象转CSV
    let csv = 'Property,Value\n';
    Object.entries(data).forEach(([key, value]) => {
      csv += `${key},${value}\n`;
    });

    return csv;
  }

  /**
   * 生成报告HTML
   */
  private async generateReportHTML(task: ExportTask): Promise<string> {
    const data = task.data.results || task.data;

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.getTestTypeName(task.testType)}测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #eee; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-left: 4px solid #007bff; padding-left: 10px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #f8f9fa; border-radius: 5px; min-width: 150px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { font-size: 12px; color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.getTestTypeName(task.testType)}测试报告</h1>
            <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
            ${task.data.url ? `<p>测试目标: ${task.data.url}</p>` : ''}
        </div>
        
        ${this.generateHTMLContent(task.testType, data)}
        
        <div class="footer">
            <p>此报告由 Test-Web 平台自动生成</p>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * 生成HTML内容
   */
  private generateHTMLContent(testType: TestType, data: unknown): string {
    switch (testType) {
      case 'network':
        return this.generateNetworkHTML(data);
      case 'performance':
        return this.generatePerformanceHTML(data);
      case 'security':
        return this.generateSecurityHTML(data);
      default:
        return this.generateGenericHTML(data);
    }
  }

  /**
   * 生成网络测试HTML
   */
  private generateNetworkHTML(data: unknown): string {
    let html = '<div class="section"><h2>网络性能指标</h2>';

    if (data.latencyResults) {
      html += `
        <div class="metric">
          <div class="metric-value">${data.latencyResults.avg?.toFixed(1) || 0}</div>
          <div class="metric-label">平均延迟 (ms)</div>
        </div>
        <div class="metric">
          <div class="metric-value">${data.latencyResults.jitter?.toFixed(1) || 0}</div>
          <div class="metric-label">抖动 (ms)</div>
        </div>
        <div class="metric">
          <div class="metric-value">${data.latencyResults.packetLoss?.toFixed(1) || 0}%</div>
          <div class="metric-label">丢包率</div>
        </div>
      `;
    }

    if (data.bandwidthResults) {
      html += `
        <div class="metric">
          <div class="metric-value">${data.bandwidthResults.downloadSpeed?.toFixed(1) || 0}</div>
          <div class="metric-label">下载速度 (Mbps)</div>
        </div>
        <div class="metric">
          <div class="metric-value">${data.bandwidthResults.uploadSpeed?.toFixed(1) || 0}</div>
          <div class="metric-label">上传速度 (Mbps)</div>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  /**
   * 生成性能测试HTML
   */
  private generatePerformanceHTML(data: unknown): string {
    let html = '<div class="section"><h2>性能指标</h2>';

    if (data.performanceMetrics) {
      Object.entries(data.performanceMetrics).forEach(([key, value]) => {
        html += `
          <div class="metric">
            <div class="metric-value">${typeof value === 'number' ? value.toFixed(0) : value}</div>
            <div class="metric-label">${key}</div>
          </div>
        `;
      });
    }

    html += '</div>';
    return html;
  }

  /**
   * 生成安全测试HTML
   */
  private generateSecurityHTML(data: unknown): string {
    let html = '<div class="section"><h2>安全检查结果</h2>';

    if (data.securityChecks && Array.isArray(data.securityChecks)) {
      html += '<table><thead><tr><th>检查项</th><th>状态</th><th>严重程度</th><th>描述</th></tr></thead><tbody>';

      data.securityChecks.forEach((check: unknown) => {
        const statusClass = check.status === 'pass' ? 'success' : check.status === 'warning' ? 'warning' : 'error';
        html += `
          <tr>
            <td>${check.name || ''}</td>
            <td class="${statusClass}">${check.status || ''}</td>
            <td>${check.severity || ''}</td>
            <td>${check.description || ''}</td>
          </tr>
        `;
      });

      html += '</tbody></table>';
    }

    html += '</div>';
    return html;
  }

  /**
   * 生成通用HTML
   */
  private generateGenericHTML(data: unknown): string {
    let html = '<div class="section"><h2>测试结果</h2>';
    html += '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
    html += '</div>';
    return html;
  }

  /**
   * 对象转XML
   */
  private objectToXML(obj: unknown, indent: string = ''): string {
    let xml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        xml += `${indent}<${key}>\n`;
        xml += this.objectToXML(value, indent + '  ');
        xml += `${indent}</${key}>\n`;
      } else {
        xml += `${indent}<${key}>${value}</${key}>\n`;
      }
    }

    return xml;
  }

  /**
   * 获取MIME类型
   */
  private getMimeType(format: ExportFormat): string {
    const mimeTypes = {
      json: 'application/json',
      csv: 'text/csv',
      pdf: 'application/pdf',
      html: 'text/html',
      xml: 'application/xml'
    };

    return mimeTypes[format] || 'text/plain';
  }

  /**
   * 获取测试类型名称
   */
  private getTestTypeName(testType: TestType): string {
    const names = {
      stress: '压力测试',
      performance: '性能测试',
      security: '安全测试',
      api: 'API测试',
      network: '网络测试',
      seo: 'SEO测试',
      ux: 'UX测试',
      compatibility: '兼容性测试',
      database: '数据库测试',
      website: '网站测试'
    };

    return names[testType] || testType;
  }

  /**
   * 获取指标状态
   */
  private getMetricStatus(metric: string, value: number): string {
    // 根据不同指标判断状态
    switch (metric) {
      case 'lcp':
        return value <= 2500 ? 'Good' : value <= 4000 ? 'Needs Improvement' : 'Poor';
      case 'fid':
        return value <= 100 ? 'Good' : value <= 300 ? 'Needs Improvement' : 'Poor';
      case 'cls':
        return value <= 0.1 ? 'Good' : value <= 0.25 ? 'Needs Improvement' : 'Poor';
      default:
        return 'Unknown';
    }
  }

  /**
   * 获取任务状态
   */
  getTask(taskId: string): ExportTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 下载导出文件
   */
  downloadExport(taskId: string, filename?: string) {
    const task = this.tasks.get(taskId);
    if (!task || !task.downloadUrl) {
      throw new Error('导出任务不存在或未完成');
    }

    const link = document.createElement('a');
    link.href = task.downloadUrl;
    link.download = filename || `${task.testType}_report_${Date.now()}.${task.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * 清理完成的任务
   */
  cleanupCompletedTasks(olderThanHours: number = 24) {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    for (const [taskId, task] of this.tasks.entries()) {
      if (task.completedAt && task.completedAt < cutoffTime) {
        if (task.downloadUrl) {
          URL.revokeObjectURL(task.downloadUrl);
        }
        this.tasks.delete(taskId);
      }
    }
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 创建单例实例
export const exportManager = new exportManager();

export default exportManager;

// 导出React组件使用的Hook
export const _useExportManager = () => {
  const [error, setError] = useState<string | null>(null);

  return {
    createExport: exportManager.createExportTask.bind(exportManager),
    getTask: exportManager.getTask.bind(exportManager),
    downloadExport: exportManager.downloadExport.bind(exportManager),
    cleanup: exportManager.cleanupCompletedTasks.bind(exportManager)
  };
};
