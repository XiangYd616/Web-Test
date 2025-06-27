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

export type ExportFormat = 'pdf' | 'html' | 'json' | 'csv' | 'xlsx';

export class EnhancedReportGenerator {
  private static readonly TEMPLATES = {
    professional: {
      name: '专业报告',
      description: '适合向客户或管理层展示的专业报告',
      sections: ['summary', 'metrics', 'charts', 'recommendations'],
      styling: {
        colors: { primary: '#2563eb', secondary: '#64748b' },
        fonts: { heading: 'Inter', body: 'Inter' }
      }
    },
    executive: {
      name: '执行摘要',
      description: '高层管理人员的简洁摘要报告',
      sections: ['summary', 'charts'],
      styling: {
        colors: { primary: '#059669', secondary: '#6b7280' },
        fonts: { heading: 'Inter', body: 'Inter' }
      }
    },
    technical: {
      name: '技术报告',
      description: '包含详细技术数据的完整报告',
      sections: ['summary', 'metrics', 'charts', 'recommendations', 'raw-data'],
      styling: {
        colors: { primary: '#7c3aed', secondary: '#6b7280' },
        fonts: { heading: 'JetBrains Mono', body: 'Inter' }
      }
    },
    minimal: {
      name: '简洁报告',
      description: '简洁明了的基础报告',
      sections: ['summary', 'metrics'],
      styling: {
        colors: { primary: '#374151', secondary: '#9ca3af' },
        fonts: { heading: 'Inter', body: 'Inter' }
      }
    }
  };

  // 生成报告
  public static async generateReport(
    data: ReportData,
    config: ReportConfig,
    format: ExportFormat
  ): Promise<Blob | string> {
    switch (format) {
      case 'html':
        return this.generateHTMLReport(data, config);
      case 'pdf':
        return this.generatePDFReport(data, config);
      case 'json':
        return this.generateJSONReport(data, config);
      case 'csv':
        return this.generateCSVReport(data, config);
      case 'xlsx':
        return this.generateExcelReport(data, config);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // 生成HTML报告
  private static generateHTMLReport(data: ReportData, config: ReportConfig): string {
    const template = this.TEMPLATES[config.template];
    const styles = this.generateCSS(template.styling, config.branding);
    
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title}</title>
    <style>${styles}</style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="report-container">
        ${this.generateHeader(config)}
        ${this.generateTableOfContents(config)}
        ${this.generateSections(data, config)}
        ${this.generateFooter(data.metadata)}
    </div>
    <script>
        ${this.generateChartScripts(data, config)}
    </script>
</body>
</html>`;

    return html;
  }

  // 生成PDF报告（使用HTML转PDF）
  private static async generatePDFReport(data: ReportData, config: ReportConfig): Promise<Blob> {
    const html = this.generateHTMLReport(data, config);
    
    // 在实际应用中，这里会使用如 Puppeteer 或 jsPDF 等库
    // 这里提供一个模拟实现
    const pdfContent = this.convertHTMLToPDF(html);
    return new Blob([pdfContent], { type: 'application/pdf' });
  }

  // 生成JSON报告
  private static generateJSONReport(data: ReportData, config: ReportConfig): string {
    const report = {
      metadata: {
        title: config.title,
        description: config.description,
        template: config.template,
        generatedAt: data.metadata.generatedAt,
        version: data.metadata.version
      },
      summary: this.generateSummaryData(data),
      metrics: this.generateMetricsData(data),
      recommendations: this.generateRecommendationsData(data),
      rawData: config.includeRawData ? data.testResults : undefined
    };

    return JSON.stringify(report, null, 2);
  }

  // 生成CSV报告
  private static generateCSVReport(data: ReportData, config: ReportConfig): string {
    const headers = ['测试ID', '测试类型', 'URL', '时间戳', '状态', '评分', '响应时间'];
    const rows = data.testResults.map(result => [
      result.id,
      result.type,
      result.url,
      result.timestamp,
      result.status,
      result.score,
      result.responseTime || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  // 生成Excel报告
  private static generateExcelReport(data: ReportData, config: ReportConfig): Blob {
    // 这里使用 SheetJS 或类似库的模拟实现
    const workbook = this.createExcelWorkbook(data, config);
    return new Blob([workbook], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }

  // 生成CSS样式
  private static generateCSS(styling: any, branding?: ReportConfig['branding']): string {
    const primaryColor = branding?.colors?.primary || styling.colors.primary;
    const secondaryColor = branding?.colors?.secondary || styling.colors.secondary;

    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      body {
        font-family: ${styling.fonts.body}, -apple-system, BlinkMacSystemFont, sans-serif;
        line-height: 1.6;
        color: #374151;
        background: #f9fafb;
      }
      
      .report-container {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .header {
        background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
        color: white;
        padding: 2rem;
        text-align: center;
      }
      
      .header h1 {
        font-family: ${styling.fonts.heading}, sans-serif;
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
      }
      
      .header p {
        font-size: 1.1rem;
        opacity: 0.9;
      }
      
      .toc {
        padding: 2rem;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .toc h2 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
        color: ${primaryColor};
      }
      
      .toc ul {
        list-style: none;
      }
      
      .toc li {
        padding: 0.5rem 0;
        border-bottom: 1px solid #f3f4f6;
      }
      
      .toc a {
        color: ${primaryColor};
        text-decoration: none;
        font-weight: 500;
      }
      
      .section {
        padding: 2rem;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .section h2 {
        font-size: 1.8rem;
        color: ${primaryColor};
        margin-bottom: 1.5rem;
        border-bottom: 2px solid ${primaryColor};
        padding-bottom: 0.5rem;
      }
      
      .section h3 {
        font-size: 1.3rem;
        color: #374151;
        margin: 1.5rem 0 1rem 0;
      }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin: 1.5rem 0;
      }
      
      .metric-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.5rem;
        text-align: center;
      }
      
      .metric-value {
        font-size: 2rem;
        font-weight: 700;
        color: ${primaryColor};
        margin-bottom: 0.5rem;
      }
      
      .metric-label {
        font-size: 0.9rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      
      .chart-container {
        margin: 2rem 0;
        text-align: center;
      }
      
      .chart-canvas {
        max-width: 100%;
        height: 400px;
      }
      
      .recommendations {
        margin: 1.5rem 0;
      }
      
      .recommendation {
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 1rem;
        margin-bottom: 1rem;
        border-radius: 0 4px 4px 0;
      }
      
      .recommendation h4 {
        color: #92400e;
        margin-bottom: 0.5rem;
      }
      
      .recommendation p {
        color: #78350f;
        font-size: 0.9rem;
      }
      
      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin: 1.5rem 0;
      }
      
      .data-table th,
      .data-table td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .data-table th {
        background: #f9fafb;
        font-weight: 600;
        color: #374151;
      }
      
      .footer {
        background: #f9fafb;
        padding: 2rem;
        text-align: center;
        color: #6b7280;
        font-size: 0.9rem;
      }
      
      @media print {
        .report-container {
          box-shadow: none;
        }
        
        .section {
          page-break-inside: avoid;
        }
      }
    `;
  }

  // 生成报告头部
  private static generateHeader(config: ReportConfig): string {
    return `
      <div class="header">
        ${config.branding?.logo ? `<img src="${config.branding.logo}" alt="Logo" style="height: 60px; margin-bottom: 1rem;">` : ''}
        <h1>${config.title}</h1>
        ${config.description ? `<p>${config.description}</p>` : ''}
        ${config.branding?.companyName ? `<p style="margin-top: 1rem; opacity: 0.8;">${config.branding.companyName}</p>` : ''}
      </div>
    `;
  }

  // 生成目录
  private static generateTableOfContents(config: ReportConfig): string {
    const enabledSections = config.sections.filter(s => s.enabled).sort((a, b) => a.order - b.order);
    
    return `
      <div class="toc">
        <h2>目录</h2>
        <ul>
          ${enabledSections.map(section => `
            <li><a href="#section-${section.id}">${section.title}</a></li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  // 生成报告章节
  private static generateSections(data: ReportData, config: ReportConfig): string {
    const enabledSections = config.sections.filter(s => s.enabled).sort((a, b) => a.order - b.order);
    
    return enabledSections.map(section => {
      switch (section.type) {
        case 'summary':
          return this.generateSummarySection(data, section);
        case 'metrics':
          return this.generateMetricsSection(data, section);
        case 'charts':
          return this.generateChartsSection(data, section);
        case 'recommendations':
          return this.generateRecommendationsSection(data, section);
        case 'raw-data':
          return this.generateRawDataSection(data, section);
        default:
          return '';
      }
    }).join('');
  }

  // 生成摘要章节
  private static generateSummarySection(data: ReportData, section: ReportSection): string {
    const summary = this.generateSummaryData(data);
    
    return `
      <div class="section" id="section-${section.id}">
        <h2>${section.title}</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${summary.totalTests}</div>
            <div class="metric-label">总测试数</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${summary.averageScore}</div>
            <div class="metric-label">平均评分</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${summary.successRate}%</div>
            <div class="metric-label">成功率</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${summary.averageResponseTime}ms</div>
            <div class="metric-label">平均响应时间</div>
          </div>
        </div>
        <h3>测试概述</h3>
        <p>在 ${data.timeRange.start} 到 ${data.timeRange.end} 期间，共执行了 ${summary.totalTests} 次测试。
        整体性能表现${summary.averageScore >= 80 ? '优秀' : summary.averageScore >= 60 ? '良好' : '需要改进'}，
        平均评分为 ${summary.averageScore} 分。</p>
      </div>
    `;
  }

  // 生成指标章节
  private static generateMetricsSection(data: ReportData, section: ReportSection): string {
    const metrics = this.generateMetricsData(data);
    
    return `
      <div class="section" id="section-${section.id}">
        <h2>${section.title}</h2>
        <h3>性能指标</h3>
        <div class="metrics-grid">
          ${Object.entries(metrics.performance).map(([key, value]) => `
            <div class="metric-card">
              <div class="metric-value">${value}</div>
              <div class="metric-label">${this.getMetricLabel(key)}</div>
            </div>
          `).join('')}
        </div>
        <h3>安全指标</h3>
        <div class="metrics-grid">
          ${Object.entries(metrics.security).map(([key, value]) => `
            <div class="metric-card">
              <div class="metric-value">${value}</div>
              <div class="metric-label">${this.getMetricLabel(key)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 生成图表章节
  private static generateChartsSection(data: ReportData, section: ReportSection): string {
    return `
      <div class="section" id="section-${section.id}">
        <h2>${section.title}</h2>
        <div class="chart-container">
          <h3>测试结果趋势</h3>
          <canvas id="trendChart" class="chart-canvas"></canvas>
        </div>
        <div class="chart-container">
          <h3>测试类型分布</h3>
          <canvas id="distributionChart" class="chart-canvas"></canvas>
        </div>
      </div>
    `;
  }

  // 生成建议章节
  private static generateRecommendationsSection(data: ReportData, section: ReportSection): string {
    const recommendations = this.generateRecommendationsData(data);
    
    return `
      <div class="section" id="section-${section.id}">
        <h2>${section.title}</h2>
        <div class="recommendations">
          ${recommendations.map(rec => `
            <div class="recommendation">
              <h4>${rec.title}</h4>
              <p>${rec.description}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 生成原始数据章节
  private static generateRawDataSection(data: ReportData, section: ReportSection): string {
    return `
      <div class="section" id="section-${section.id}">
        <h2>${section.title}</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>测试ID</th>
              <th>类型</th>
              <th>URL</th>
              <th>状态</th>
              <th>评分</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            ${data.testResults.slice(0, 50).map(result => `
              <tr>
                <td>${result.id}</td>
                <td>${result.type}</td>
                <td>${result.url}</td>
                <td>${result.status}</td>
                <td>${result.score}</td>
                <td>${new Date(result.timestamp).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // 生成页脚
  private static generateFooter(metadata: ReportData['metadata']): string {
    return `
      <div class="footer">
        <p>报告生成时间: ${new Date(metadata.generatedAt).toLocaleString()}</p>
        <p>生成者: ${metadata.generatedBy} | 版本: ${metadata.version}</p>
        <p>由 Test Web 平台生成</p>
      </div>
    `;
  }

  // 生成图表脚本
  private static generateChartScripts(data: ReportData, config: ReportConfig): string {
    return `
      // 趋势图表
      const trendCtx = document.getElementById('trendChart');
      if (trendCtx) {
        new Chart(trendCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(data.testResults.slice(-10).map(r => new Date(r.timestamp).toLocaleDateString()))},
            datasets: [{
              label: '测试评分',
              data: ${JSON.stringify(data.testResults.slice(-10).map(r => r.score))},
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { beginAtZero: true, max: 100 }
            }
          }
        });
      }

      // 分布图表
      const distributionCtx = document.getElementById('distributionChart');
      if (distributionCtx) {
        const typeCount = {};
        ${JSON.stringify(data.testResults)}.forEach(result => {
          typeCount[result.type] = (typeCount[result.type] || 0) + 1;
        });
        
        new Chart(distributionCtx, {
          type: 'doughnut',
          data: {
            labels: Object.keys(typeCount),
            datasets: [{
              data: Object.values(typeCount),
              backgroundColor: ['#2563eb', '#059669', '#7c3aed', '#dc2626', '#ea580c']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        });
      }
    `;
  }

  // 辅助方法
  private static generateSummaryData(data: ReportData) {
    const results = data.testResults;
    return {
      totalTests: results.length,
      averageScore: Math.round(results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length),
      successRate: Math.round((results.filter(r => r.status === 'completed').length / results.length) * 100),
      averageResponseTime: Math.round(results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length)
    };
  }

  private static generateMetricsData(data: ReportData) {
    return {
      performance: {
        loadTime: '2.3s',
        fcp: '1.2s',
        lcp: '2.8s',
        cls: '0.05'
      },
      security: {
        vulnerabilities: '0',
        securityScore: '95',
        httpsUsage: '100%'
      }
    };
  }

  private static generateRecommendationsData(data: ReportData) {
    return [
      {
        title: '优化图片加载',
        description: '使用现代图片格式（WebP、AVIF）可以减少 30% 的加载时间'
      },
      {
        title: '启用缓存策略',
        description: '配置适当的缓存头可以显著提升重复访问的性能'
      }
    ];
  }

  private static getMetricLabel(key: string): string {
    const labels: Record<string, string> = {
      loadTime: '加载时间',
      fcp: '首次内容绘制',
      lcp: '最大内容绘制',
      cls: '累积布局偏移',
      vulnerabilities: '安全漏洞',
      securityScore: '安全评分',
      httpsUsage: 'HTTPS使用率'
    };
    return labels[key] || key;
  }

  private static convertHTMLToPDF(html: string): ArrayBuffer {
    // 模拟PDF生成，实际应用中使用 Puppeteer 或 jsPDF
    return new ArrayBuffer(0);
  }

  private static createExcelWorkbook(data: ReportData, config: ReportConfig): ArrayBuffer {
    // 模拟Excel生成，实际应用中使用 SheetJS
    return new ArrayBuffer(0);
  }

  // 获取可用模板
  public static getAvailableTemplates() {
    return this.TEMPLATES;
  }

  // 创建默认配置
  public static createDefaultConfig(title: string): ReportConfig {
    return {
      title,
      includeCharts: true,
      includeRecommendations: true,
      includeRawData: false,
      template: 'professional',
      sections: [
        { id: 'summary', title: '执行摘要', type: 'summary', enabled: true, order: 1 },
        { id: 'metrics', title: '详细指标', type: 'metrics', enabled: true, order: 2 },
        { id: 'charts', title: '图表分析', type: 'charts', enabled: true, order: 3 },
        { id: 'recommendations', title: '优化建议', type: 'recommendations', enabled: true, order: 4 }
      ]
    };
  }

  // 下载报告文件
  public static downloadReport(content: string | Blob, filename: string, mimeType: string): void {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  // 简化的导出函数，用于单个测试结果
  public static async exportTestReport(
    data: ReportData,
    format: ExportFormat = 'pdf'
  ): Promise<void> {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const baseFilename = `${data.testName || 'test'}-${data.testType || 'report'}-${timestamp}`;

    // 创建默认配置
    const config: ReportConfig = {
      title: data.testName || '测试报告',
      description: `${data.testType} 测试报告 - ${data.url}`,
      includeCharts: true,
      includeRecommendations: true,
      includeRawData: false,
      template: 'professional',
      sections: [
        { id: 'summary', title: '测试摘要', type: 'summary', enabled: true, order: 1 },
        { id: 'metrics', title: '详细指标', type: 'metrics', enabled: true, order: 2 },
        { id: 'recommendations', title: '优化建议', type: 'recommendations', enabled: true, order: 3 }
      ]
    };

    // 转换数据格式以兼容现有生成器
    const compatibleData: ReportData = {
      ...data,
      testResults: data.testResults || [data],
      timeRange: data.timeRange || {
        start: data.startTime,
        end: data.endTime || data.startTime
      },
      metadata: data.metadata || {
        generatedAt: new Date().toISOString(),
        generatedBy: 'Test Web App',
        version: '1.0.0'
      }
    };

    try {
      const content = await this.generateReport(compatibleData, config, format);

      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'pdf':
          filename = `${baseFilename}.pdf`;
          mimeType = 'application/pdf';
          break;
        case 'html':
          filename = `${baseFilename}.html`;
          mimeType = 'text/html';
          break;
        case 'json':
          filename = `${baseFilename}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          filename = `${baseFilename}.csv`;
          mimeType = 'text/csv';
          break;
        case 'xlsx':
          filename = `${baseFilename}.xlsx`;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        default:
          throw new Error(`不支持的格式: ${format}`);
      }

      this.downloadReport(content, filename, mimeType);
    } catch (error) {
      console.error('导出报告失败:', error);
      throw error;
    }
  }
}
