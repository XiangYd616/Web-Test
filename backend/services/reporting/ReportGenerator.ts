/**
 * 增强的报告生成器
 * 支持多种模板、格式和自定义样式
 */

import ExcelJS from 'exceljs';
import * as fs from 'fs/promises';
import * as path from 'path';
import PDFDocument from 'pdfkit';

// 报告模板接口
export interface ReportTemplate {
  name: string;
  description: string;
  sections: string[];
  style: 'professional' | 'modern' | 'minimal' | 'colorful';
  format: 'pdf' | 'excel' | 'html' | 'json';
}

// 报告数据接口
export interface ReportData {
  title: string;
  description: string;
  generatedAt: Date;
  generatedBy: string;
  summary: {
    overallScore: number;
    totalIssues: number;
    criticalIssues: number;
    recommendations: number;
  };
  metrics: Record<string, any>;
  sections: Record<string, any>;
  metadata?: Record<string, any>;
}

// 报告配置接口
export interface ReportConfig {
  template: string;
  format: 'pdf' | 'excel' | 'html' | 'json';
  outputDir?: string;
  filename?: string;
  includeCharts?: boolean;
  includeRawData?: boolean;
  customStyles?: Record<string, any>;
}

// 报告生成结果接口
export interface ReportGenerationResult {
  success: boolean;
  filePath?: string;
  filename?: string;
  format: string;
  size?: number;
  duration: number;
  error?: string;
}

// 图表配置接口
export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  title: string;
  data: any[];
  xAxis?: string;
  yAxis?: string;
  width?: number;
  height?: number;
}

class ReportGenerator {
  private reportsDir: string;
  private templatesDir: string;
  private assetsDir: string;
  private templates: Record<string, ReportTemplate>;

  constructor() {
    this.reportsDir = path.join(__dirname, '../../reports');
    this.templatesDir = path.join(__dirname, '../../templates');
    this.assetsDir = path.join(__dirname, '../../assets');
    this.ensureDirectories();

    // 预定义的报告模板
    this.templates = {
      executive: {
        name: '高管摘要报告',
        description: '适合高层管理者的简洁报告',
        sections: ['summary', 'key_metrics', 'recommendations', 'cost_impact'],
        style: 'professional',
        format: 'pdf',
      },
      technical: {
        name: '技术详细报告',
        description: '包含详细技术指标的完整报告',
        sections: [
          'summary',
          'detailed_metrics',
          'performance_analysis',
          'security_analysis',
          'recommendations',
          'appendix',
        ],
        style: 'modern',
        format: 'pdf',
      },
      compliance: {
        name: '合规性报告',
        description: '专注于合规性和安全性的报告',
        sections: [
          'summary',
          'compliance_checklist',
          'security_findings',
          'risk_assessment',
          'remediation_plan',
        ],
        style: 'professional',
        format: 'pdf',
      },
      performance: {
        name: '性能分析报告',
        description: '详细的性能分析和优化建议',
        sections: [
          'summary',
          'performance_metrics',
          'bottlenecks',
          'optimization_recommendations',
          'trend_analysis',
        ],
        style: 'modern',
        format: 'excel',
      },
      custom: {
        name: '自定义报告',
        description: '用户自定义的报告模板',
        sections: [],
        style: 'modern',
        format: 'pdf',
      },
    };
  }

  /**
   * 生成报告
   */
  async generateReport(data: ReportData, config: ReportConfig): Promise<ReportGenerationResult> {
    const startTime = Date.now();

    try {
      // 确保输出目录存在
      const outputDir = config.outputDir || this.reportsDir;
      await fs.mkdir(outputDir, { recursive: true });

      // 获取模板
      const template = this.getTemplate(config.template);

      // 生成文件名
      const filename = config.filename || this.generateFilename(data.title, config.format);
      const filePath = path.join(outputDir, filename);

      // 根据格式生成报告
      let result: ReportGenerationResult;

      switch (config.format) {
        case 'pdf':
          result = await this.generatePDFReport(data, template, config, filePath);
          break;
        case 'excel':
          result = await this.generateExcelReport(data, template, config, filePath);
          break;
        case 'html':
          result = await this.generateHTMLReport(data, template, config, filePath);
          break;
        case 'json':
          result = await this.generateJSONReport(data, template, config, filePath);
          break;
        default:
          throw new Error(`Unsupported format: ${config.format}`);
      }

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        success: false,
        format: config.format,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 生成PDF报告
   */
  private async generatePDFReport(
    data: ReportData,
    template: ReportTemplate,
    config: ReportConfig,
    filePath: string
  ): Promise<ReportGenerationResult> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();

        // 添加标题
        doc.fontSize(20).text(data.title, { align: 'center' });
        doc.moveDown();

        // 添加描述
        doc.fontSize(12).text(data.description, { align: 'center' });
        doc.moveDown();

        // 添加生成信息
        doc.fontSize(10).text(`生成时间: ${data.generatedAt.toLocaleString()}`, { align: 'right' });
        doc.text(`生成者: ${data.generatedBy}`, { align: 'right' });
        doc.moveDown();

        // 添加摘要
        this.addPDFSection(doc, '摘要', this.formatSummary(data.summary), template.style);

        // 添加各部分内容
        template.sections.forEach(section => {
          if (data.sections[section]) {
            this.addPDFSection(
              doc,
              this.getSectionTitle(section),
              data.sections[section],
              template.style
            );
          }
        });

        // 如果包含原始数据，添加附录
        if (config.includeRawData) {
          this.addPDFSection(doc, '原始数据', JSON.stringify(data, null, 2), template.style);
        }

        // 保存文件
        doc.pipe(fs.createWriteStream(filePath));

        doc.on('end', () => {
          fs.stat(filePath)
            .then(stats => {
              resolve({
                success: true,
                filePath,
                filename: path.basename(filePath),
                format: 'pdf',
                size: stats.size,
                duration: 0,
              });
            })
            .catch(reject);
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 生成Excel报告
   */
  private async generateExcelReport(
    data: ReportData,
    template: ReportTemplate,
    config: ReportConfig,
    filePath: string
  ): Promise<ReportGenerationResult> {
    try {
      const workbook = new ExcelJS.Workbook();

      // 创建摘要工作表
      const summarySheet = workbook.addWorksheet('摘要');
      this.addExcelSummary(summarySheet, data, template);

      // 创建各部分工作表
      template.sections.forEach(section => {
        if (data.sections[section]) {
          const sheet = workbook.addWorksheet(this.getSectionTitle(section));
          this.addExcelSection(sheet, data.sections[section], section);
        }
      });

      // 如果包含原始数据，添加数据工作表
      if (config.includeRawData) {
        const rawDataSheet = workbook.addWorksheet('原始数据');
        this.addExcelRawData(rawDataSheet, data);
      }

      // 保存文件
      await workbook.xlsx.writeFile(filePath);
      const stats = await fs.stat(filePath);

      return {
        success: true,
        filePath,
        filename: path.basename(filePath),
        format: 'excel',
        size: stats.size,
        duration: 0,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 生成HTML报告
   */
  private async generateHTMLReport(
    data: ReportData,
    template: ReportTemplate,
    config: ReportConfig,
    filePath: string
  ): Promise<ReportGenerationResult> {
    try {
      let html = this.generateHTMLTemplate(data, template, config);

      await fs.writeFile(filePath, html, 'utf8');
      const stats = await fs.stat(filePath);

      return {
        success: true,
        filePath,
        filename: path.basename(filePath),
        format: 'html',
        size: stats.size,
        duration: 0,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 生成JSON报告
   */
  private async generateJSONReport(
    data: ReportData,
    template: ReportTemplate,
    config: ReportConfig,
    filePath: string
  ): Promise<ReportGenerationResult> {
    try {
      const reportData = {
        template: template.name,
        format: 'json',
        generatedAt: new Date().toISOString(),
        data,
      };

      await fs.writeFile(filePath, JSON.stringify(reportData, null, 2), 'utf8');
      const stats = await fs.stat(filePath);

      return {
        success: true,
        filePath,
        filename: path.basename(filePath),
        format: 'json',
        size: stats.size,
        duration: 0,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 添加PDF部分
   */
  private addPDFSection(doc: PDFKit.PDFDocument, title: string, content: any, style: string): void {
    doc.fontSize(14).font('Helvetica-Bold').text(title, { underline: true });
    doc.moveDown();

    if (typeof content === 'string') {
      doc.fontSize(10).font('Helvetica').text(content, { align: 'justify' });
    } else {
      // 格式化对象内容
      const formattedContent = this.formatContentForPDF(content, style);
      doc.fontSize(10).font('Helvetica').text(formattedContent, { align: 'justify' });
    }

    doc.moveDown(2);
  }

  /**
   * 添加Excel摘要
   */
  private addExcelSummary(
    sheet: ExcelJS.Worksheet,
    data: ReportData,
    template: ReportTemplate
  ): void {
    // 标题行
    sheet.getCell('A1').value = '项目';
    sheet.getCell('B1').value = '值';
    sheet.getRow(1).font = { bold: true };

    // 基本信息
    let row = 2;
    sheet.getCell(`A${row}`).value = '报告标题';
    sheet.getCell(`B${row}`).value = data.title;
    row++;

    sheet.getCell(`A${row}`).value = '描述';
    sheet.getCell(`B${row}`).value = data.description;
    row++;

    sheet.getCell(`A${row}`).value = '生成时间';
    sheet.getCell(`B${row}`).value = data.generatedAt.toLocaleString();
    row++;

    sheet.getCell(`A${row}`).value = '生成者';
    sheet.getCell(`B${row}`).value = data.generatedBy;
    row++;

    // 摘要信息
    row++;
    sheet.getCell(`A${row}`).value = '总体分数';
    sheet.getCell(`B${row}`).value = data.summary.overallScore;
    row++;

    sheet.getCell(`A${row}`).value = '问题总数';
    sheet.getCell(`B${row}`).value = data.summary.totalIssues;
    row++;

    sheet.getCell(`A${row}`).value = '严重问题';
    sheet.getCell(`B${row}`).value = data.summary.criticalIssues;
    row++;

    sheet.getCell(`A${row}`).value = '建议数量';
    sheet.getCell(`B${row}`).value = data.summary.recommendations;

    // 设置列宽
    sheet.getColumn('A').width = 20;
    sheet.getColumn('B').width = 30;
  }

  /**
   * 添加Excel部分
   */
  private addExcelSection(sheet: ExcelJS.Worksheet, content: any, sectionName: string): void {
    if (Array.isArray(content)) {
      // 表格数据
      sheet.getRow(1).values = Object.keys(content[0] || {});
      content.forEach((item, index) => {
        const row = index + 2;
        Object.entries(item).forEach(([key, value], colIndex) => {
          sheet.getCell(row, colIndex + 1).value = value;
        });
      });
    } else if (typeof content === 'object') {
      // 对象数据
      let row = 1;
      Object.entries(content).forEach(([key, value]) => {
        sheet.getCell(`A${row}`).value = key;
        sheet.getCell(`B${row}`).value = value;
        row++;
      });
    } else {
      // 文本内容
      sheet.getCell('A1').value = content;
    }
  }

  /**
   * 添加Excel原始数据
   */
  private addExcelRawData(sheet: ExcelJS.Worksheet, data: ReportData): void {
    const jsonData = JSON.stringify(data, null, 2);
    const lines = jsonData.split('\n');

    lines.forEach((line, index) => {
      sheet.getCell(`A${index + 1}`).value = line;
    });
  }

  /**
   * 生成HTML模板
   */
  private generateHTMLTemplate(
    data: ReportData,
    template: ReportTemplate,
    config: ReportConfig
  ): string {
    const styles = this.getHTMLStyles(template.style);

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title}</title>
    <style>${styles}</style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>${data.title}</h1>
            <p class="description">${data.description}</p>
            <div class="meta">
                <span>生成时间: ${data.generatedAt.toLocaleString()}</span>
                <span>生成者: ${data.generatedBy}</span>
            </div>
        </header>
        
        <main class="content">
            <section class="summary">
                <h2>摘要</h2>
                ${this.formatSummaryHTML(data.summary)}
            </section>
            
            ${template.sections
              .map(section =>
                data.sections[section]
                  ? `<section class="${section}">
                    <h2>${this.getSectionTitle(section)}</h2>
                    ${this.formatContentHTML(data.sections[section])}
                </section>`
                  : ''
              )
              .join('')}
            
            ${
              config.includeRawData
                ? `
                <section class="raw-data">
                    <h2>原始数据</h2>
                    <pre><code>${JSON.stringify(data, null, 2)}</code></pre>
                </section>
            `
                : ''
            }
        </main>
        
        <footer class="footer">
            <p>报告由 ${data.generatedBy} 生成</p>
        </footer>
    </div>
</body>
</html>`;
  }

  /**
   * 获取HTML样式
   */
  private getHTMLStyles(style: string): string {
    const baseStyles = `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        background: #f5f5f5;
      }
      .container {
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      .header {
        border-bottom: 2px solid #e0e0e0;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .header h1 {
        color: #2c3e50;
        margin: 0 0 10px 0;
      }
      .description {
        color: #7f8c8d;
        font-size: 16px;
        margin: 0 0 15px 0;
      }
      .meta {
        display: flex;
        gap: 20px;
        font-size: 14px;
        color: #95a5a6;
      }
      section {
        margin-bottom: 30px;
      }
      h2 {
        color: #2c3e50;
        border-bottom: 1px solid #e0e0e0;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      pre {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 12px;
      }
      .footer {
        border-top: 1px solid #e0e0e0;
        padding-top: 20px;
        text-align: center;
        color: #7f8c8d;
        font-size: 14px;
      }
    `;

    const styleVariations: Record<string, string> = {
      professional: `
        ${baseStyles}
        .header h1 { color: #2c3e50; }
        h2 { color: #34495e; }
        .meta span { color: #7f8c8d; }
      `,
      modern: `
        ${baseStyles}
        .container { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .header h1 { color: white; }
        .description { color: #ecf0f1; }
        h2 { color: #ecf0f1; border-bottom-color: rgba(255,255,255,0.3); }
        .meta span { color: #bdc3c7; }
        .footer { border-top-color: rgba(255,255,255,0.3); color: #ecf0f1; }
      `,
      minimal: `
        ${baseStyles}
        body { background: white; }
        .container { box-shadow: none; border: 1px solid #e0e0e0; }
        .header h1 { color: #000; font-weight: 300; }
        h2 { color: #333; font-weight: 400; }
      `,
      colorful: `
        ${baseStyles}
        .header { background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57); color: white; }
        .header h1 { color: white; }
        .description { color: #f8f9fa; }
        h2 { color: #2c3e50; }
      `,
    };

    return styleVariations[style] || baseStyles;
  }

  /**
   * 格式化摘要为HTML
   */
  private formatSummaryHTML(summary: ReportData['summary']): string {
    return `
      <div class="summary-grid">
        <div class="summary-item">
          <h3>总体分数</h3>
          <div class="score">${summary.overallScore}</div>
        </div>
        <div class="summary-item">
          <h3>问题总数</h3>
          <div class="count">${summary.totalIssues}</div>
        </div>
        <div class="summary-item">
          <h3>严重问题</h3>
          <div class="count critical">${summary.criticalIssues}</div>
        </div>
        <div class="summary-item">
          <h3>建议数量</h3>
          <div class="count">${summary.recommendations}</div>
        </div>
      </div>
      <style>
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .summary-item {
          text-align: center;
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
        }
        .summary-item h3 {
          margin: 0 0 10px 0;
          color: #7f8c8d;
        }
        .score {
          font-size: 2em;
          font-weight: bold;
          color: #27ae60;
        }
        .count {
          font-size: 1.5em;
          font-weight: bold;
        }
        .count.critical {
          color: #e74c3c;
        }
      </style>
    `;
  }

  /**
   * 格式化内容为HTML
   */
  private formatContentHTML(content: any): string {
    if (typeof content === 'string') {
      return `<p>${content}</p>`;
    } else if (Array.isArray(content)) {
      return `
        <table class="data-table">
          <thead>
            <tr>
              ${Object.keys(content[0] || {})
                .map(key => `<th>${key}</th>`)
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${content
              .map(
                item =>
                  `<tr>${Object.values(item)
                    .map(value => `<td>${value}</td>`)
                    .join('')}</tr>`
              )
              .join('')}
          </tbody>
        </table>
        <style>
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .data-table th,
          .data-table td {
            border: 1px solid #e0e0e0;
            padding: 8px 12px;
            text-align: left;
          }
          .data-table th {
            background: #f8f9fa;
            font-weight: bold;
          }
        </style>
      `;
    } else if (typeof content === 'object') {
      return `
        <div class="object-content">
          ${Object.entries(content)
            .map(
              ([key, value]) =>
                `<div class="object-item">
              <strong>${key}:</strong> ${value}
            </div>`
            )
            .join('')}
        </div>
        <style>
          .object-content {
            margin: 20px 0;
          }
          .object-item {
            margin: 10px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
          }
        </style>
      `;
    }
    return '';
  }

  /**
   * 格式化内容为PDF
   */
  private formatContentForPDF(content: any, style: string): string {
    if (typeof content === 'string') {
      return content;
    } else if (Array.isArray(content)) {
      return content.map(item => JSON.stringify(item)).join('\n');
    } else if (typeof content === 'object') {
      return JSON.stringify(content, null, 2);
    }
    return String(content);
  }

  /**
   * 格式化摘要
   */
  private formatSummary(summary: ReportData['summary']): string {
    return `
总体分数: ${summary.overallScore}
问题总数: ${summary.totalIssues}
严重问题: ${summary.criticalIssues}
建议数量: ${summary.recommendations}
    `;
  }

  /**
   * 获取模板
   */
  private getTemplate(templateName: string): ReportTemplate {
    return this.templates[templateName] || this.templates.custom;
  }

  /**
   * 获取部分标题
   */
  private getSectionTitle(section: string): string {
    const titles: Record<string, string> = {
      summary: '摘要',
      key_metrics: '关键指标',
      recommendations: '建议',
      cost_impact: '成本影响',
      detailed_metrics: '详细指标',
      performance_analysis: '性能分析',
      security_analysis: '安全分析',
      appendix: '附录',
      compliance_checklist: '合规检查清单',
      security_findings: '安全发现',
      risk_assessment: '风险评估',
      remediation_plan: '修复计划',
      bottlenecks: '瓶颈分析',
      optimization_recommendations: '优化建议',
      trend_analysis: '趋势分析',
    };

    return titles[section] || section;
  }

  /**
   * 生成文件名
   */
  private generateFilename(title: string, format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_');
    return `${safeTitle}_${timestamp}.${format}`;
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectories(): Promise<void> {
    const dirs = [this.reportsDir, this.templatesDir, this.assetsDir];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // 目录已存在，忽略错误
      }
    }
  }

  /**
   * 获取所有可用模板
   */
  getAvailableTemplates(): Record<string, ReportTemplate> {
    return { ...this.templates };
  }

  /**
   * 添加自定义模板
   */
  addTemplate(name: string, template: ReportTemplate): void {
    this.templates[name] = template;
  }

  /**
   * 删除模板
   */
  removeTemplate(name: string): boolean {
    if (name === 'custom') return false;
    return delete this.templates[name];
  }

  /**
   * 生成图表
   */
  async generateChart(config: ChartConfig): Promise<string> {
    // 这里可以集成图表库，如Chart.js
    // 简化实现，返回图表的HTML代码
    return `
      <div class="chart" style="width: ${config.width || 600}px; height: ${config.height || 400}px;">
        <h3>${config.title}</h3>
        <p>图表类型: ${config.type}</p>
        <p>数据点: ${config.data.length}</p>
      </div>
    `;
  }
}

export default ReportGenerator;
