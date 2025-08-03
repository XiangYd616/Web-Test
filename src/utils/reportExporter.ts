export interface ExportOptions {
  format: 'html' | 'pdf' | 'json' | 'csv';
  includeCharts: boolean;
  includeDetails: boolean;
  includeRecommendations: boolean;
}

export interface TestResult {
  type: string;
  url: string;
  timestamp: number;
  duration: number;
  metrics: Record<string, any>;
  analysis?: Record<string, any>;
  issues?: Array<any>;
  recommendations?: Array<any>;
}

export class ReportExporter {
  private static instance: ReportExporter;

  public static getInstance(): ReportExporter {
    if (!ReportExporter.instance) {
      ReportExporter.instance = new ReportExporter();
    }
    return ReportExporter.instance;
  }

  public async exportReport(result: TestResult, options: ExportOptions): Promise<void> {
    switch (options.format) {
      case 'html':
        await this.exportHTML(result, options);
        break;
      case 'pdf':
        await this.exportPDF(result, options);
        break;
      case 'json':
        await this.exportJSON(result, options);
        break;
      case 'csv':
        await this.exportCSV(result, options);
        break;
      default:
        throw new Error(`不支持的导出格式: ${options.format}`);
    }
  }

  private async exportHTML(result: TestResult, options: ExportOptions): Promise<void> {
    const html = this.generateHTMLReport(result, options);
    const blob = new Blob([html], { type: 'text/html' });
    this.downloadFile(blob, `${result.type}-report-${Date.now()}.html`);
  }

  private async exportPDF(result: TestResult, options: ExportOptions): Promise<void> {
    // 在浏览器环境中，我们生成HTML并提示用户打印为PDF
    const html = this.generateHTMLReport(result, options);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  }

  private async exportJSON(result: TestResult, options: ExportOptions): Promise<void> {
    const data = {
      ...result,
      exportOptions: options,
      exportedAt: new Date().toISOString()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadFile(blob, `${result.type}-report-${Date.now()}.json`);
  }

  private async exportCSV(result: TestResult, options: ExportOptions): Promise<void> {
    const csv = this.generateCSVReport(result);
    const blob = new Blob([csv], { type: 'text/csv' });
    this.downloadFile(blob, `${result.type}-report-${Date.now()}.csv`);
  }

  private generateHTMLReport(result: TestResult, options: ExportOptions): string {
    const date = new Date(result.timestamp).toLocaleString('zh-CN');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${result.type} - 测试报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #1f2937; font-size: 28px; font-weight: bold; margin: 0; }
        .subtitle { color: #6b7280; font-size: 16px; margin: 5px 0 0 0; }
        .section { margin: 30px 0; }
        .section-title { color: #1f2937; font-size: 20px; font-weight: 600; margin-bottom: 15px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .metric-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; }
        .metric-label { color: #6b7280; font-size: 14px; margin-top: 5px; }
        .issue { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin: 10px 0; }
        .recommendation { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px; margin: 10px 0; }
        .meta { color: #6b7280; font-size: 14px; }
        @media print { body { margin: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">${result.type} - 测试报告</h1>
        <p class="subtitle">测试URL: ${result.url}</p>
        <p class="meta">生成时间: ${date} | 测试时长: ${result.duration}秒</p>
    </div>

    <div class="section">
        <h2 class="section-title">测试指标</h2>
        <div class="metrics-grid">
            ${Object.entries(result.metrics).map(([key, value]) => `
                <div class="metric-card">
                    <div class="metric-value">${value}</div>
                    <div class="metric-label">${key}</div>
                </div>
            `).join('')}
        </div>
    </div>

    ${options.includeDetails && result.issues ? `
    <div class="section">
        <h2 class="section-title">发现的问题</h2>
        ${result.issues.map(issue => `
            <div class="issue">
                <strong>${issue.message || issue.description || '未知问题'}</strong>
                ${issue.category ? `<br><small>分类: ${issue.category}</small>` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${options.includeRecommendations && result.recommendations ? `
    <div class="section">
        <h2 class="section-title">优化建议</h2>
        ${result.recommendations.map(rec => `
            <div class="recommendation">
                <strong>${rec.message || rec.description || '优化建议'}</strong>
                ${rec.priority ? `<br><small>优先级: ${rec.priority}</small>` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section">
        <p class="meta">报告由 Test Web App 生成 | ${new Date().toLocaleString('zh-CN')}</p>
    </div>
</body>
</html>`;
  }

  private generateCSVReport(result: TestResult): string {
    const headers = ['指标', '数值'];
    const rows = [
      headers.join(','),
      ['测试类型', result.type].join(','),
      ['测试URL', `"${result.url}"`].join(','),
      ['测试时间', new Date(result.timestamp).toLocaleString('zh-CN')].join(','),
      ['测试时长', `${result.duration}秒`].join(','),
      ...Object.entries(result.metrics).map(([key, value]) => [key, value].join(','))
    ];

    return rows.join('\n');
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public getSupportedFormats(): string[] {
    return ['html', 'pdf', 'json', 'csv'];
  }

  public getDefaultOptions(): ExportOptions {
    return {
      format: 'html',
      includeCharts: true,
      includeDetails: true,
      includeRecommendations: true
    };
  }
}
