/**
 * 测试报告生成器
 * 负责生成各种格式的测试报告，包括HTML、PDF、JSON等
 */

const fs = require('fs').promises;
const path = require('path');
const { query } = require('../../config/database');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

class ReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, '../../reports');
    this.templatesDir = path.join(__dirname, '../../templates');
    this.ensureDirectories();
  }

  /**
   * 确保目录存在
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
      await fs.mkdir(this.templatesDir, { recursive: true });
    } catch (error) {
      console.error('创建目录失败:', error);
    }
  }

  /**
   * 生成测试报告
   */
  async generateReport(testIds, userId, projectId, options = {}) {
    try {
      const {
        format = 'html',
        name = `测试报告_${new Date().toISOString().split('T')[0]}`,
        description = '',
        includeDetails = true,
        includeCharts = true
      } = options;

      // 创建报告记录
      const reportResult = await query(`
        INSERT INTO test_reports (user_id, project_id, name, description, report_type, format, status, test_ids)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, uuid
      `, [userId, projectId, name, description, 'comprehensive', format, 'generating', JSON.stringify(testIds)]);

      const report = reportResult.rows[0];

      // 获取测试数据
      const testData = await this.getTestData(testIds);
      
      // 分析数据
      const analysis = this.analyzeTestData(testData);

      // 根据格式生成报告
      let filePath;
      switch (format) {
        case 'html':
          filePath = await this.generateHTMLReport(testData, analysis, report, options);
          break;
        case 'pdf':
          filePath = await this.generatePDFReport(testData, analysis, report, options);
          break;
        case 'json':
          filePath = await this.generateJSONReport(testData, analysis, report, options);
          break;
        case 'excel':
          filePath = await this.generateExcelReport(testData, analysis, report, options);
          break;
        default:
          throw new Error(`不支持的报告格式: ${format}`);
      }

      // 更新报告状态
      const fileStats = await fs.stat(filePath);
      await query(`
        UPDATE test_reports 
        SET status = $1, file_path = $2, file_size = $3, data = $4, generated_at = NOW(), updated_at = NOW()
        WHERE id = $5
      `, ['completed', filePath, fileStats.size, JSON.stringify(analysis), report.id]);

      return {
        reportId: report.uuid,
        format,
        filePath,
        fileSize: fileStats.size,
        analysis
      };

    } catch (error) {
      console.error('生成报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取测试数据
   */
  async getTestData(testIds) {
    try {
      const result = await query(`
        SELECT 
          t.uuid,
          t.type,
          t.url,
          t.status,
          t.config,
          t.results,
          t.duration_ms,
          t.error_message,
          t.created_at,
          t.started_at,
          t.completed_at,
          u.username,
          p.name as project_name
        FROM tests t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.uuid = ANY($1)
        ORDER BY t.created_at DESC
      `, [testIds]);

      return result.rows;
    } catch (error) {
      console.error('获取测试数据失败:', error);
      throw error;
    }
  }

  /**
   * 分析测试数据
   */
  analyzeTestData(testData) {
    const analysis = {
      summary: {
        totalTests: testData.length,
        completedTests: 0,
        failedTests: 0,
        cancelledTests: 0,
        averageDuration: 0,
        totalDuration: 0,
        successRate: 0
      },
      byType: {},
      byStatus: {},
      timeline: [],
      topIssues: [],
      recommendations: []
    };

    // 基础统计
    let totalDuration = 0;
    testData.forEach(test => {
      // 状态统计
      if (test.status === 'completed') analysis.summary.completedTests++;
      else if (test.status === 'failed') analysis.summary.failedTests++;
      else if (test.status === 'cancelled') analysis.summary.cancelledTests++;

      // 类型统计
      if (!analysis.byType[test.type]) {
        analysis.byType[test.type] = {
          count: 0,
          completed: 0,
          failed: 0,
          avgDuration: 0,
          avgScore: 0
        };
      }
      analysis.byType[test.type].count++;
      if (test.status === 'completed') analysis.byType[test.type].completed++;
      if (test.status === 'failed') analysis.byType[test.type].failed++;

      // 时长统计
      if (test.duration_ms) {
        totalDuration += test.duration_ms;
        analysis.byType[test.type].avgDuration += test.duration_ms;
      }

      // 时间线
      analysis.timeline.push({
        date: test.created_at,
        type: test.type,
        status: test.status,
        url: test.url
      });

      // 收集问题
      if (test.results) {
        const results = typeof test.results === 'string' ? JSON.parse(test.results) : test.results;
        this.extractIssues(results, test.type, analysis.topIssues);
      }
    });

    // 计算平均值
    analysis.summary.totalDuration = totalDuration;
    analysis.summary.averageDuration = testData.length > 0 ? Math.round(totalDuration / testData.length) : 0;
    analysis.summary.successRate = testData.length > 0 
      ? Math.round((analysis.summary.completedTests / testData.length) * 100) 
      : 0;

    // 计算各类型平均时长
    Object.keys(analysis.byType).forEach(type => {
      const typeData = analysis.byType[type];
      if (typeData.count > 0) {
        typeData.avgDuration = Math.round(typeData.avgDuration / typeData.count);
      }
    });

    // 生成建议
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * 提取问题
   */
  extractIssues(results, testType, topIssues) {
    switch (testType) {
      case 'security':
        if (results.checks?.headers?.details?.missing) {
          results.checks.headers.details.missing.forEach(header => {
            topIssues.push({
              type: 'security',
              severity: 'high',
              issue: `缺少安全头部: ${header}`
            });
          });
        }
        break;
      case 'seo':
        if (results.checks?.meta?.details?.issues) {
          results.checks.meta.details.issues.forEach(issue => {
            topIssues.push({
              type: 'seo',
              severity: 'medium',
              issue
            });
          });
        }
        break;
      case 'performance':
        if (results.metrics) {
          const fcp = results.metrics.FCP?.value;
          if (fcp && fcp > 3000) {
            topIssues.push({
              type: 'performance',
              severity: 'high',
              issue: `首次内容绘制时间过长: ${fcp}ms`
            });
          }
        }
        break;
    }
  }

  /**
   * 生成建议
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // 基于成功率的建议
    if (analysis.summary.successRate < 80) {
      recommendations.push({
        priority: 'high',
        category: '稳定性',
        suggestion: '测试成功率较低，建议检查网站稳定性和测试配置'
      });
    }

    // 基于性能的建议
    if (analysis.summary.averageDuration > 60000) {
      recommendations.push({
        priority: 'medium',
        category: '性能',
        suggestion: '测试执行时间较长，考虑优化网站性能或调整测试超时设置'
      });
    }

    // 基于问题的建议
    const securityIssues = analysis.topIssues.filter(i => i.type === 'security').length;
    if (securityIssues > 0) {
      recommendations.push({
        priority: 'high',
        category: '安全',
        suggestion: `发现${securityIssues}个安全问题，建议立即修复`
      });
    }

    return recommendations;
  }

  /**
   * 生成HTML报告
   */
  async generateHTMLReport(testData, analysis, report, options) {
    const timestamp = Date.now();
    const fileName = `report_${report.uuid}_${timestamp}.html`;
    const filePath = path.join(this.reportsDir, fileName);

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试报告 - ${options.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 10px; margin-bottom: 30px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { opacity: 0.9; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .summary-card h3 { color: #667eea; margin-bottom: 10px; }
        .summary-card .value { font-size: 2em; font-weight: bold; }
        .summary-card .label { color: #666; font-size: 0.9em; }
        .section { background: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .section h2 { color: #333; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }
        .chart { height: 300px; margin: 20px 0; }
        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th { background: #667eea; color: white; padding: 12px; text-align: left; }
        .table td { padding: 12px; border-bottom: 1px solid #ddd; }
        .table tr:hover { background: #f9f9f9; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold; }
        .status-completed { background: #10b981; color: white; }
        .status-failed { background: #ef4444; color: white; }
        .status-cancelled { background: #6b7280; color: white; }
        .recommendation { padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; background: #f9f9f9; }
        .footer { text-align: center; color: #666; margin-top: 40px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${options.name}</h1>
            <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
            ${options.description ? `<p>${options.description}</p>` : ''}
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>总测试数</h3>
                <div class="value">${analysis.summary.totalTests}</div>
                <div class="label">次测试</div>
            </div>
            <div class="summary-card">
                <h3>成功率</h3>
                <div class="value">${analysis.summary.successRate}%</div>
                <div class="label">成功完成</div>
            </div>
            <div class="summary-card">
                <h3>平均耗时</h3>
                <div class="value">${(analysis.summary.averageDuration / 1000).toFixed(1)}s</div>
                <div class="label">每次测试</div>
            </div>
            <div class="summary-card">
                <h3>失败测试</h3>
                <div class="value">${analysis.summary.failedTests}</div>
                <div class="label">次失败</div>
            </div>
        </div>

        <div class="section">
            <h2>测试类型分布</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>测试类型</th>
                        <th>执行次数</th>
                        <th>成功</th>
                        <th>失败</th>
                        <th>平均耗时</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(analysis.byType).map(([type, data]) => `
                        <tr>
                            <td>${type.toUpperCase()}</td>
                            <td>${data.count}</td>
                            <td>${data.completed}</td>
                            <td>${data.failed}</td>
                            <td>${(data.avgDuration / 1000).toFixed(1)}s</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${options.includeDetails ? `
        <div class="section">
            <h2>测试详情</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>时间</th>
                        <th>类型</th>
                        <th>URL</th>
                        <th>状态</th>
                        <th>耗时</th>
                    </tr>
                </thead>
                <tbody>
                    ${testData.slice(0, 20).map(test => `
                        <tr>
                            <td>${new Date(test.created_at).toLocaleString('zh-CN')}</td>
                            <td>${test.type.toUpperCase()}</td>
                            <td>${test.url}</td>
                            <td><span class="status-badge status-${test.status}">${test.status}</span></td>
                            <td>${test.duration_ms ? (test.duration_ms / 1000).toFixed(1) + 's' : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        ${analysis.recommendations.length > 0 ? `
        <div class="section">
            <h2>优化建议</h2>
            ${analysis.recommendations.map(rec => `
                <div class="recommendation">
                    <strong>${rec.category}</strong>: ${rec.suggestion}
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="footer">
            <p>Test Web App © ${new Date().getFullYear()} - 专业的网站测试平台</p>
        </div>
    </div>
</body>
</html>
    `;

    await fs.writeFile(filePath, html, 'utf8');
    return filePath;
  }

  /**
   * 生成JSON报告
   */
  async generateJSONReport(testData, analysis, report, options) {
    const timestamp = Date.now();
    const fileName = `report_${report.uuid}_${timestamp}.json`;
    const filePath = path.join(this.reportsDir, fileName);

    const jsonReport = {
      metadata: {
        reportId: report.uuid,
        name: options.name,
        description: options.description,
        generatedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0'
      },
      analysis,
      tests: testData.map(test => ({
        id: test.uuid,
        type: test.type,
        url: test.url,
        status: test.status,
        duration: test.duration_ms,
        createdAt: test.created_at,
        results: test.results ? JSON.parse(test.results) : null
      }))
    };

    await fs.writeFile(filePath, JSON.stringify(jsonReport, null, 2), 'utf8');
    return filePath;
  }

  /**
   * 生成Excel报告
   */
  async generateExcelReport(testData, analysis, report, options) {
    const timestamp = Date.now();
    const fileName = `report_${report.uuid}_${timestamp}.xlsx`;
    const filePath = path.join(this.reportsDir, fileName);

    const workbook = new ExcelJS.Workbook();
    
    // 概要表
    const summarySheet = workbook.addWorksheet('概要');
    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 20 },
      { header: '值', key: 'value', width: 15 }
    ];

    summarySheet.addRows([
      { metric: '总测试数', value: analysis.summary.totalTests },
      { metric: '成功率', value: `${analysis.summary.successRate}%` },
      { metric: '平均耗时', value: `${(analysis.summary.averageDuration / 1000).toFixed(1)}秒` },
      { metric: '成功测试', value: analysis.summary.completedTests },
      { metric: '失败测试', value: analysis.summary.failedTests }
    ]);

    // 测试详情表
    const detailsSheet = workbook.addWorksheet('测试详情');
    detailsSheet.columns = [
      { header: '测试ID', key: 'id', width: 30 },
      { header: '类型', key: 'type', width: 15 },
      { header: 'URL', key: 'url', width: 40 },
      { header: '状态', key: 'status', width: 15 },
      { header: '耗时(秒)', key: 'duration', width: 15 },
      { header: '创建时间', key: 'createdAt', width: 20 }
    ];

    testData.forEach(test => {
      detailsSheet.addRow({
        id: test.uuid,
        type: test.type,
        url: test.url,
        status: test.status,
        duration: test.duration_ms ? (test.duration_ms / 1000).toFixed(1) : '-',
        createdAt: new Date(test.created_at).toLocaleString('zh-CN')
      });
    });

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  /**
   * 生成PDF报告 (简化版)
   */
  async generatePDFReport(testData, analysis, report, options) {
    const timestamp = Date.now();
    const fileName = `report_${report.uuid}_${timestamp}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = require('fs').createWriteStream(filePath);
      
      doc.pipe(stream);

      // 标题
      doc.fontSize(24).text(options.name, { align: 'center' });
      doc.fontSize(12).text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, { align: 'center' });
      doc.moveDown();

      // 概要
      doc.fontSize(16).text('测试概要', { underline: true });
      doc.fontSize(12);
      doc.text(`总测试数: ${analysis.summary.totalTests}`);
      doc.text(`成功率: ${analysis.summary.successRate}%`);
      doc.text(`平均耗时: ${(analysis.summary.averageDuration / 1000).toFixed(1)}秒`);
      doc.moveDown();

      // 类型分布
      doc.fontSize(16).text('测试类型分布', { underline: true });
      doc.fontSize(12);
      Object.entries(analysis.byType).forEach(([type, data]) => {
        doc.text(`${type.toUpperCase()}: ${data.count}次 (成功${data.completed}, 失败${data.failed})`);
      });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }
}

module.exports = ReportGenerator;
