// 增强的报告生成和导出服务
export interface ReportConfig {
  title: string;
  description?: string;
  includeCharts: boolean;
  includeRecommendations: boolean;
  includeRawData: boolean;
  template: 'professional' | 'executive' | 'technical' | 'minimal';
  branding?: {
    logo?: string;
    companyName?: string;
    colors?: {
      primary: string;
      secondary: string;
    };
  };
  sections: ReportSection[];
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'metrics' | 'charts' | 'recommendations' | 'raw-data' | 'custom';
  enabled: boolean;
  order: number;
  config?: any;
}

export interface ReportData {
  testId: string;
  testName: string;
  testType: string;
  url: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  overallScore?: number;
  results: any;
  metrics?: any;
  recommendations?: string[];
  engine?: string;
  config?: any;
  testResults?: any[]; // 兼容旧格式
  analytics?: any; // 兼容旧格式
  timeRange?: {
    start: string;
    end: string;
  };
  metadata?: {
    generatedAt: string;
    generatedBy: string;
    version: string;
  };
}

export type ExportFormat = 'pdf' | 'html' | 'json' | 'csv' | 'xlsx' | 'png' | 'jpeg';

export interface ExportOptions {
  format: ExportFormat;
  quality?: 'low' | 'medium' | 'high';
  compression?: boolean;
  password?: string;
  watermark?: string;
}

export class ReportGeneratorService {
  private templates: Map<string, any> = new Map();
  private cache: Map<string, any> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * 生成报告
   */
  async generateReport(data: ReportData, config: ReportConfig): Promise<string> {
    try {
      const reportId = this.generateReportId();
      const template = this.getTemplate(config.template);

      // 处理数据
      const processedData = this.processReportData(data);

      // 生成报告内容
      const reportContent = await this.buildReportContent(processedData, config, template);

      // 缓存报告
      this.cache.set(reportId, {
        content: reportContent,
        config,
        data: processedData,
        generatedAt: new Date().toISOString()
      });

      return reportId;
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }

  /**
   * 导出报告
   */
  async exportReport(reportId: string, options: ExportOptions): Promise<Blob> {
    try {
      const report = this.cache.get(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      switch (options.format) {
        case 'pdf':
          return this.exportToPDF(report, options);
        case 'html':
          return this.exportToHTML(report, options);
        case 'json':
          return this.exportToJSON(report, options);
        case 'csv':
          return this.exportToCSV(report, options);
        case 'xlsx':
          return this.exportToXLSX(report, options);
        case 'png':
        case 'jpeg':
          return this.exportToImage(report, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
      throw error;
    }
  }

  /**
   * 获取报告预览
   */
  getReportPreview(reportId: string): any | null {
    const report = this.cache.get(reportId);
    return report ? {
      id: reportId,
      title: report.config.title,
      generatedAt: report.generatedAt,
      sections: report.config.sections.filter((s: any) => s.enabled).length,
      template: report.config.template
    } : null;
  }

  /**
   * 删除报告
   */
  deleteReport(reportId: string): boolean {
    return this.cache.delete(reportId);
  }

  /**
   * 获取可用模板
   */
  getAvailableTemplates(): Array<{ id: string; name: string; description: string }> {
    return [
      {
        id: 'professional',
        name: '专业版',
        description: '适合商业演示的专业报告模板'
      },
      {
        id: 'executive',
        name: '高管版',
        description: '简洁的高管摘要报告模板'
      },
      {
        id: 'technical',
        name: '技术版',
        description: '详细的技术分析报告模板'
      },
      {
        id: 'minimal',
        name: '简约版',
        description: '简洁明了的基础报告模板'
      }
    ];
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): ReportConfig {
    return {
      title: '网站测试报告',
      description: '自动生成的网站测试分析报告',
      includeCharts: true,
      includeRecommendations: true,
      includeRawData: false,
      template: 'professional',
      sections: [
        {
          id: 'summary',
          title: '执行摘要',
          type: 'summary',
          enabled: true,
          order: 1
        },
        {
          id: 'metrics',
          title: '关键指标',
          type: 'metrics',
          enabled: true,
          order: 2
        },
        {
          id: 'charts',
          title: '图表分析',
          type: 'charts',
          enabled: true,
          order: 3
        },
        {
          id: 'recommendations',
          title: '优化建议',
          type: 'recommendations',
          enabled: true,
          order: 4
        }
      ]
    };
  }

  // 私有方法
  private initializeTemplates(): void {
    // 初始化报告模板
    this.templates.set('professional', {
      layout: 'multi-column',
      colors: { primary: '#2563eb', secondary: '#64748b' },
      fonts: { heading: 'Inter', body: 'Inter' },
      sections: ['header', 'summary', 'metrics', 'charts', 'recommendations', 'footer']
    });

    this.templates.set('executive', {
      layout: 'single-column',
      colors: { primary: '#1f2937', secondary: '#6b7280' },
      fonts: { heading: 'Inter', body: 'Inter' },
      sections: ['header', 'summary', 'key-metrics', 'footer']
    });

    this.templates.set('technical', {
      layout: 'detailed',
      colors: { primary: '#059669', secondary: '#374151' },
      fonts: { heading: 'Inter', body: 'Fira Code' },
      sections: ['header', 'summary', 'detailed-metrics', 'charts', 'raw-data', 'recommendations', 'footer']
    });

    this.templates.set('minimal', {
      layout: 'simple',
      colors: { primary: '#000000', secondary: '#666666' },
      fonts: { heading: 'Inter', body: 'Inter' },
      sections: ['summary', 'metrics']
    });
  }

  private getTemplate(templateId: string): any {
    return this.templates.get(templateId) || this.templates.get('professional');
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private processReportData(data: ReportData): any {
    // 处理和标准化报告数据
    return {
      ...data,
      processedAt: new Date().toISOString(),
      summary: this.generateSummary(data),
      metrics: this.extractMetrics(data),
      charts: this.prepareChartData(data)
    };
  }

  private async buildReportContent(data: any, config: ReportConfig, template: any): Promise<string> {
    // 构建报告内容
    const sections = config.sections
      .filter(section => section.enabled)
      .sort((a, b) => a.order - b.order);

    let content = '';
    for (const section of sections) {
      content += await this.buildSection(section, data, config, template);
    }

    return content;
  }

  private async buildSection(section: ReportSection, data: any, config: ReportConfig, template: any): Promise<string> {
    // 构建单个报告部分
    switch (section.type) {
      case 'summary':
        return this.buildSummarySection(data, config, template);
      case 'metrics':
        return this.buildMetricsSection(data, config, template);
      case 'charts':
        return this.buildChartsSection(data, config, template);
      case 'recommendations':
        return this.buildRecommendationsSection(data, config, template);
      case 'raw-data':
        return this.buildRawDataSection(data, config, template);
      default:
        return '';
    }
  }

  private buildSummarySection(data: any, config: ReportConfig, template: any): string {
    return `<section class="summary">
      <h2>执行摘要</h2>
      <p>测试URL: ${data.url}</p>
      <p>测试时间: ${data.startTime}</p>
      <p>总体评分: ${data.overallScore || 'N/A'}</p>
    </section>`;
  }

  private buildMetricsSection(data: any, config: ReportConfig, template: any): string {
    return `<section class="metrics">
      <h2>关键指标</h2>
      <div class="metrics-grid">
        ${Object.entries(data.metrics || {}).map(([key, value]) =>
          `<div class="metric"><span class="label">${key}</span><span class="value">${value}</span></div>`
        ).join('')}
      </div>
    </section>`;
  }

  private buildChartsSection(data: any, config: ReportConfig, template: any): string {
    return `<section class="charts">
      <h2>图表分析</h2>
      <div class="charts-container">
        <!-- 图表将在导出时生成 -->
      </div>
    </section>`;
  }

  private buildRecommendationsSection(data: any, config: ReportConfig, template: any): string {
    const recommendations = data.recommendations || [];
    return `<section class="recommendations">
      <h2>优化建议</h2>
      <ul>
        ${recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
      </ul>
    </section>`;
  }

  private buildRawDataSection(data: any, config: ReportConfig, template: any): string {
    return `<section class="raw-data">
      <h2>原始数据</h2>
      <pre>${JSON.stringify(data.results, null, 2)}</pre>
    </section>`;
  }

  private generateSummary(data: ReportData): any {
    return {
      testType: data.testType,
      url: data.url,
      duration: data.duration,
      overallScore: data.overallScore,
      status: data.endTime ? 'completed' : 'running'
    };
  }

  private extractMetrics(data: ReportData): any {
    // 从测试结果中提取关键指标
    return data.metrics || {};
  }

  private prepareChartData(data: ReportData): any {
    // 准备图表数据
    return data.results || {};
  }

  // 导出方法（简化版本）
  private async exportToPDF(report: any, options: ExportOptions): Promise<Blob> {
    // PDF导出逻辑
    const htmlContent = report.content;
    return new Blob([htmlContent], { type: 'application/pdf' });
  }

  private async exportToHTML(report: any, options: ExportOptions): Promise<Blob> {
    const htmlContent = `<!DOCTYPE html>
    <html>
    <head>
      <title>${report.config.title}</title>
      <style>
        body { font-family: Inter, sans-serif; margin: 40px; }
        .summary, .metrics, .charts, .recommendations { margin-bottom: 30px; }
        h2 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .metric { padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .label { font-weight: bold; display: block; }
        .value { font-size: 1.2em; color: #2563eb; }
      </style>
    </head>
    <body>
      ${report.content}
    </body>
    </html>`;

    return new Blob([htmlContent], { type: 'text/html' });
  }

  private async exportToJSON(report: any, options: ExportOptions): Promise<Blob> {
    const jsonData = JSON.stringify(report.data, null, 2);
    return new Blob([jsonData], { type: 'application/json' });
  }

  private async exportToCSV(report: any, options: ExportOptions): Promise<Blob> {
    // CSV导出逻辑
    const csvContent = 'CSV export not implemented yet';
    return new Blob([csvContent], { type: 'text/csv' });
  }

  private async exportToXLSX(report: any, options: ExportOptions): Promise<Blob> {
    // XLSX导出逻辑
    const xlsxContent = 'XLSX export not implemented yet';
    return new Blob([xlsxContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  private async exportToImage(report: any, options: ExportOptions): Promise<Blob> {
    // 图片导出逻辑
    const imageContent = 'Image export not implemented yet';
    return new Blob([imageContent], { type: `image/${options.format}` });
  }
}

// 导出单例实例
export const reportGeneratorService = new ReportGeneratorService();
export const EnhancedReportGenerator = reportGeneratorService; // 兼容性导出

export default reportGeneratorService;
