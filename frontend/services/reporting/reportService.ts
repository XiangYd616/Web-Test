/**
 * reportService.ts - 业务服务层
 *
 * 文件路径: frontend\services\reporting\reportService.ts
 * 创建时间: 2025-09-25
 */

import Logger from '@/utils/logger';
import { format } from 'date-fns';
import { apiClient } from '../api/client';
import { AnalyticsData, dataAnalysisService } from '../dataAnalysisService';
import { monitoringService, MonitoringStats } from '../monitoringService';

export interface Report {
  id: string;
  name: string;
  type: 'pdf' | 'excel' | 'html';
  status: 'generating' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  size: string;
  downloadUrl?: string;
  shareUrl?: string;
  testCount: number;
  dateRange: string;
  template: 'performance' | 'security' | 'comprehensive';
  config: ReportConfig;
}

export interface ReportConfig {
  dateRange: number;
  testTypes: string[];
  includeCharts: boolean;
  includeRecommendations: boolean;
  includeMonitoring: boolean;
  includeRawData: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'performance' | 'security' | 'comprehensive';
  sections: ReportSection[];
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'chart' | 'table' | 'text' | 'recommendations';
  required: boolean;
  config?: Record<string, unknown>;
}

class ReportService {
  private baseUrl = '/reports';
  private reports: Report[] = [];

  /**
   * 获取报告模板
   */
  getReportTemplates(): ReportTemplate[] {
    return [
      {
        id: 'performance',
        name: '性能分析报告',
        description: '包含网站性能指标、Core Web Vitals分析和优化建议',
        type: 'performance',
        sections: [
          { id: 'summary', title: '执行摘要', type: 'summary', required: true },
          { id: 'performance_metrics', title: '性能指标', type: 'chart', required: true },
          { id: 'core_web_vitals', title: 'Core Web Vitals', type: 'chart', required: true },
          { id: 'url_analysis', title: 'URL性能分析', type: 'table', required: true },
          { id: 'recommendations', title: '优化建议', type: 'recommendations', required: true },
          { id: 'raw_data', title: '原始数据', type: 'table', required: false },
        ],
      },
      {
        id: 'security',
        name: '安全评估报告',
        description: '包含安全扫描结果、漏洞分析和修复建议',
        type: 'security',
        sections: [
          { id: 'summary', title: '安全摘要', type: 'summary', required: true },
          { id: 'vulnerability_scan', title: '漏洞扫描', type: 'table', required: true },
          { id: 'ssl_analysis', title: 'SSL/TLS分析', type: 'chart', required: true },
          { id: 'security_headers', title: '安全头检查', type: 'table', required: true },
          { id: 'recommendations', title: '安全建议', type: 'recommendations', required: true },
        ],
      },
      {
        id: 'comprehensive',
        name: '综合测试报告',
        description: '包含所有测试类型的完整分析和总结',
        type: 'comprehensive',
        sections: [
          { id: 'executive_summary', title: '执行摘要', type: 'summary', required: true },
          { id: 'test_overview', title: '测试概览', type: 'chart', required: true },
          { id: 'performance_analysis', title: '性能分析', type: 'chart', required: true },
          { id: 'security_analysis', title: '安全分析', type: 'table', required: true },
          { id: 'monitoring_data', title: '监控数据', type: 'chart', required: false },
          { id: 'detailed_results', title: '详细结果', type: 'table', required: true },
          { id: 'recommendations', title: '综合建议', type: 'recommendations', required: true },
          { id: 'appendix', title: '附录', type: 'table', required: false },
        ],
      },
    ];
  }

  /**
   * 生成报告
   */
  async generateReport(
    name: string,
    template: 'performance' | 'security' | 'comprehensive',
    format: 'pdf' | 'excel' | 'html',
    config: ReportConfig
  ): Promise<Report> {
    const report: Report = {
      id: Date.now().toString(),
      name,
      type: format,
      status: 'generating',
      createdAt: new Date().toISOString(),
      size: '-',
      testCount: 0,
      dateRange: `最近${config?.dateRange}天`,
      template,
      config,
    };

    this.reports.push(report);
    this.saveLocalReports();

    // 异步生成报告
    this.processReport(report);

    return report;
  }

  /**
   * 获取所有报告
   */
  async getReports(): Promise<Report[]> {
    try {
      const response = await apiClient.getInstance().get(this.baseUrl);
      const data = response.data as { success: boolean; data?: Report[] };

      if (data.success && data.data) {
        this.reports = data.data;
        return this.reports;
      }
    } catch (error) {
      Logger.warn('Backend not available, using local data:', { error: String(error) });
    }

    return this.getLocalReports();
  }

  /**
   * 删除报告
   */
  async deleteReport(reportId: string): Promise<void> {
    try {
      const response = await apiClient.getInstance().delete(`${this.baseUrl}/${reportId}`);
      const data = response.data as { success?: boolean };

      if (data?.success !== false) {
        this.reports = this.reports.filter(report => report.id !== reportId);
        return;
      }
    } catch (error) {
      Logger.warn('Backend not available, using local storage:', { error: String(error) });
    }

    this.reports = this.reports.filter(report => report.id !== reportId);
    this.saveLocalReports();
  }

  /**
   * 下载报告
   */
  async downloadReport(reportId: string): Promise<void> {
    const report = this.reports.find(r => r.id === reportId);
    if (!report || report.status !== 'completed') {
      throw new Error('Report not found or not completed');
    }

    try {
      /**
       * if功能函数
       * @param {Object} params - 参数对象
       * @returns {Promise<Object>} 返回结果
       */
      const response = await apiClient
        .getInstance()
        .get(`${this.baseUrl}/${reportId}/download`, { responseType: 'blob' });
      const blob = response.data as Blob;
      this.downloadBlob(blob, `${report.name}.${report.type}`);
      return;
    } catch (error) {
      Logger.warn('Backend not available, generating local download:', { error: String(error) });
    }

    // 本地生成下载
    const content = await this.generateReportContent(report);
    this.downloadContent(content, report);
  }

  /**
   * 私有方法：处理报告生成
   */
  private async processReport(report: Report): Promise<void> {
    try {
      // 模拟报告生成过程
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒延迟

      // 获取数据
      const analyticsData = await dataAnalysisService.getAnalyticsData(report.config.dateRange);

      // 生成报告内容
      const content = await this.generateReportContent(report);

      // 计算文件大小
      const size = this.calculateFileSize(content);

      // 更新报告状态
      const updatedReport = {
        ...report,
        status: 'completed' as const,
        completedAt: new Date().toISOString(),
        size,
        testCount: analyticsData.totalTests,
        downloadUrl: `#download-${report.id}`,
        shareUrl: `#share-${report.id}`,
      };

      const reportIndex = this.reports.findIndex(r => r.id === report.id);
      if (reportIndex !== -1) {
        this.reports[reportIndex] = updatedReport;
        this.saveLocalReports();
      }
    } catch (error) {
      Logger.error('Error generating report:', { error: String(error) });

      // 更新为失败状态
      const reportIndex = this.reports.findIndex(r => r.id === report.id);
      if (reportIndex !== -1) {
        this.reports[reportIndex] = {
          ...this.reports[reportIndex],
          status: 'failed',
          completedAt: new Date().toISOString(),
        };
        this.saveLocalReports();
      }
    }
  }

  /**
   * 私有方法：生成报告内容
   */
  private async generateReportContent(report: Report): Promise<string> {
    const analyticsData = await dataAnalysisService.getAnalyticsData(report.config.dateRange);
    const monitoringStats = monitoringService.getMonitoringStats();
    const template = this.getReportTemplates().find(t => t.id === report.template);

    if (!template) {
      throw new Error('Template not found');
    }

    switch (report.type) {
      case 'html':
        return this.generateHTMLReport(report, analyticsData, monitoringStats, template);
      case 'pdf':
        return this.generatePDFReport(report, analyticsData, monitoringStats, template);
      case 'excel':
        return this.generateExcelReport(report, analyticsData, monitoringStats, template);
      default:
        throw new Error('Unsupported report format');
    }
  }

  /**
   * 私有方法：生成HTML报告
   */
  private generateHTMLReport(
    report: Report,
    analyticsData: AnalyticsData,
    monitoringStats: MonitoringStats,
    _template: ReportTemplate
  ): string {
    const currentDate = format(new Date(), 'yyyy年MM月dd日');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.name}</title>
    <style>
        body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #3B82F6; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 28px; color: #1F2937; margin-bottom: 10px; }
        .subtitle { font-size: 16px; color: #6B7280; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 20px; color: #1F2937; border-left: 4px solid #3B82F6; padding-left: 15px; margin-bottom: 15px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .stat-card { background: #F9FAFB; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #3B82F6; }
        .stat-label { font-size: 14px; color: #6B7280; margin-top: 5px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #E5E7EB; }
        .table th { background: #F9FAFB; font-weight: 600; }
        .recommendations { background: #FEF3C7; padding: 20px; border-radius: 8px; border-left: 4px solid #F59E0B; }
        .recommendation-item { margin-bottom: 15px; }
        .recommendation-title { font-weight: 600; color: #92400E; }
        .recommendation-desc { color: #78350F; margin-top: 5px; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">${report.name}</h1>
            <p class="subtitle">生成时间: ${currentDate} | 数据范围: ${report.dateRange}</p>
        </div>

        <div class="section">
            <h2 class="section-title">执行摘要</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${analyticsData.totalTests}</div>
                    <div class="stat-label">总测试数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${analyticsData.successRate.toFixed(1)}%</div>
                    <div class="stat-label">成功率</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${analyticsData.averageScore.toFixed(1)}</div>
                    <div class="stat-label">平均分数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${monitoringStats.onlineSites}/${monitoringStats.totalSites}</div>
                    <div class="stat-label">在线站点</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">测试类型分布</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>测试类型</th>
                        <th>测试数量</th>
                        <th>占比</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(analyticsData.testsByType)
                      .map(
                        ([type, count]) => `
                        <tr>
                            <td>${type}</td>
                            <td>${count}</td>
                            <td>${(((count as number) / analyticsData.totalTests) * 100).toFixed(1)}%</td>
                        </tr>
                    `
                      )
                      .join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2 class="section-title">热门URL分析</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>URL</th>
                        <th>测试次数</th>
                        <th>平均分数</th>
                    </tr>
                </thead>
                <tbody>
                    ${analyticsData.topUrls
                      .slice(0, 10)
                      .map(
                        (url: { url: string; count: number; avgScore: number }) => `
                        <tr>
                            <td>${url.url}</td>
                            <td>${url.count}</td>
                            <td>${url.avgScore.toFixed(1)}</td>
                        </tr>
                    `
                      )
                      .join('')}
                </tbody>
            </table>
        </div>

        ${
          report.config.includeRecommendations
            ? `
        <div class="section">
            <h2 class="section-title">优化建议</h2>
            <div class="recommendations">
                <div class="recommendation-item">
                    <div class="recommendation-title">性能优化</div>
                    <div class="recommendation-desc">建议优化图片加载和启用压缩，可提升页面加载速度20-30%</div>
                </div>
                <div class="recommendation-item">
                    <div class="recommendation-title">SEO优化</div>
                    <div class="recommendation-desc">完善页面标题和元描述，提升搜索引擎可见性</div>
                </div>
                <div class="recommendation-item">
                    <div class="recommendation-title">安全加固</div>
                    <div class="recommendation-desc">配置安全头和HTTPS重定向，提升网站安全性</div>
                </div>
            </div>
        </div>
        `
            : ''
        }

        <div class="footer">
            <p>本报告由Test Web App自动生成 | 生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 私有方法：生成PDF报告（模拟）
   */
  private generatePDFReport(
    report: Report,
    analyticsData: AnalyticsData,
    monitoringStats: MonitoringStats,
    _template: ReportTemplate
  ): string {
    // 在真实环境中，这里会使用PDF生成库如puppeteer或jsPDF
    // 现在返回HTML内容，实际应用中会转换为PDF
    return this.generateHTMLReport(report, analyticsData, monitoringStats, _template);
  }

  /**
   * 私有方法：生成Excel报告（模拟）
   */
  private generateExcelReport(
    report: Report,
    analyticsData: AnalyticsData,
    monitoringStats: MonitoringStats,
    _template: ReportTemplate
  ): string {
    // 在真实环境中，这里会使用Excel生成库如SheetJS
    // 现在返回CSV格式的数据
    let csv = '报告名称,生成时间,数据范围\n';
    csv += `${report.name},${report.createdAt},${report.dateRange}\n\n`;

    csv += '指标,数值\n';
    csv += `总测试数,${analyticsData.totalTests}\n`;
    csv += `成功率,${analyticsData.successRate.toFixed(1)}%\n`;
    csv += `平均分数,${analyticsData.averageScore.toFixed(1)}\n`;
    csv += `在线站点,${monitoringStats.onlineSites}/${monitoringStats.totalSites}\n\n`;

    csv += 'URL,测试次数,平均分数\n';
    analyticsData.topUrls.forEach((url: { url: string; count: number; avgScore: number }) => {
      csv += `${url.url},${url.count},${url.avgScore.toFixed(1)}\n`;
    });

    return csv;
  }

  /**
   * 私有方法：计算文件大小
   */
  private calculateFileSize(content: string): string {
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * 私有方法：下载内容
   */
  private downloadContent(content: string, report: Report): void {
    const blob = new Blob([content], {
      type:
        report.type === 'html' ? 'text/html' : report.type === 'excel' ? 'text/csv' : 'text/plain',
    });
    this.downloadBlob(blob, `${report.name}.${report.type === 'excel' ? 'csv' : report.type}`);
  }

  /**
   * 私有方法：下载Blob
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 私有方法：获取本地报告
   */
  private getLocalReports(): Report[] {
    try {
      const stored = localStorage.getItem('generated_reports');
      if (stored) {
        this.reports = JSON.parse(stored);
        return this.reports;
      }
    } catch (error) {
      Logger.error('Error loading local reports:', error);
    }
    return [];
  }

  /**
   * 私有方法：保存本地报告
   */
  private saveLocalReports(): void {
    try {
      localStorage.setItem('generated_reports', JSON.stringify(this.reports));
    } catch (error) {
      Logger.error('Error saving local reports:', error);
    }
  }
}

export const reportService = new ReportService();

// 默认导出
export default reportService;
