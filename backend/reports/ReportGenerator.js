/**
 * 报告生成器
 * 
 * 文件路径: backend/report/ReportGenerator.js
 * 创建时间: 2025-11-14
 * 
 * 功能:
 * - PDF报告生成
 * - HTML报告生成
 * - 测试结果格式化
 * - 图表数据生成
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');

class ReportGenerator {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || path.join(__dirname, '../../reports'),
      ...options
    };

    // 确保输出目录存在
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  /**
   * 生成测试报告
   */
  async generateReport(testData, format = 'pdf') {
    const reportId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `report-${testData.type}-${timestamp}.${format}`;
    const filepath = path.join(this.options.outputDir, filename);

    Logger.info(`生成报告: ${filename}`);

    try {
      if (format === 'pdf') {
        await this._generatePDFReport(testData, filepath);
      } else if (format === 'html') {
        await this._generateHTMLReport(testData, filepath);
      } else {
        throw new Error(`不支持的报告格式: ${format}`);
      }

      return {
        reportId,
        filename,
        filepath,
        format,
        size: fs.statSync(filepath).size,
        createdAt: new Date()
      };

    } catch (error) {
      Logger.error('生成报告失败:', error);
      throw error;
    }
  }

  /**
   * 生成PDF报告
   * @private
   */
  async _generatePDFReport(testData, filepath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // 标题
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text('Test Report', { align: 'center' });

        doc.moveDown();

        // 基本信息
        this._addSectionTitle(doc, 'Basic Information');
        this._addKeyValue(doc, 'Test Type', testData.type || 'N/A');
        this._addKeyValue(doc, 'Test URL', testData.url || 'N/A');
        this._addKeyValue(doc, 'Test ID', testData.testId || 'N/A');
        this._addKeyValue(doc, 'Execution Time', new Date(testData.timestamp || Date.now()).toLocaleString());
        this._addKeyValue(doc, 'Duration', `${testData.duration || 0}ms`);
        this._addKeyValue(doc, 'Status', testData.success ? 'SUCCESS' : 'FAILED', 
                          testData.success ? 'green' : 'red');

        doc.moveDown();

        // 根据测试类型添加详细信息
        if (testData.type === 'stress') {
          this._addStressTestDetails(doc, testData);
        } else if (testData.type === 'api') {
          this._addApiTestDetails(doc, testData);
        } else if (testData.type === 'performance') {
          this._addPerformanceTestDetails(doc, testData);
        } else if (testData.type === 'security') {
          this._addSecurityTestDetails(doc, testData);
        }

        // 页脚
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(10)
             .text(
               `Page ${i + 1} of ${pages.count}`,
               50,
               doc.page.height - 50,
               { align: 'center' }
             );
        }

        doc.end();

        stream.on('finish', resolve);
        stream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 添加压力测试详情
   * @private
   */
  _addStressTestDetails(doc, testData) {
    this._addSectionTitle(doc, 'Stress Test Results');

    const result = testData.result || {};
    this._addKeyValue(doc, 'Total Requests', result.totalRequests || 0);
    this._addKeyValue(doc, 'Successful Requests', result.successfulRequests || 0);
    this._addKeyValue(doc, 'Failed Requests', result.failedRequests || 0);
    this._addKeyValue(doc, 'Success Rate', `${(result.successRate || 0).toFixed(2)}%`);
    this._addKeyValue(doc, 'Avg Response Time', `${(result.avgResponseTime || 0).toFixed(2)}ms`);
    this._addKeyValue(doc, 'Min Response Time', `${result.minResponseTime || 0}ms`);
    this._addKeyValue(doc, 'Max Response Time', `${result.maxResponseTime || 0}ms`);
    this._addKeyValue(doc, 'Throughput', `${(result.throughput || 0).toFixed(2)} req/s`);
  }

  /**
   * 添加API测试详情
   * @private
   */
  _addApiTestDetails(doc, testData) {
    this._addSectionTitle(doc, 'API Test Results');

    const result = testData.result || {};
    this._addKeyValue(doc, 'HTTP Method', testData.method || 'GET');
    this._addKeyValue(doc, 'Status Code', result.statusCode || 'N/A');
    this._addKeyValue(doc, 'Response Time', `${result.responseTime || 0}ms`);

    if (result.assertions) {
      doc.moveDown();
      this._addSectionTitle(doc, 'Assertions');
      this._addKeyValue(doc, 'Total Assertions', result.assertions.total || 0);
      this._addKeyValue(doc, 'Passed', result.assertions.passed || 0, 'green');
      this._addKeyValue(doc, 'Failed', result.assertions.failed || 0, 'red');
      this._addKeyValue(doc, 'Pass Rate', `${result.assertions.passRate || 0}%`);
    }
  }

  /**
   * 添加性能测试详情
   * @private
   */
  _addPerformanceTestDetails(doc, testData) {
    this._addSectionTitle(doc, 'Performance Test Results');

    this._addKeyValue(doc, 'Performance Score', `${testData.performanceScore || 0}/100`);

    if (testData.metrics) {
      doc.moveDown();
      this._addSectionTitle(doc, 'Core Web Vitals');
      const m = testData.metrics;
      this._addKeyValue(doc, 'FCP', `${(m.firstContentfulPaint || 0).toFixed(2)}ms`);
      this._addKeyValue(doc, 'LCP', `${(m.largestContentfulPaint || 0).toFixed(2)}ms`);
      this._addKeyValue(doc, 'CLS', `${(m.cumulativeLayoutShift || 0).toFixed(3)}`);
      this._addKeyValue(doc, 'TBT', `${(m.totalBlockingTime || 0).toFixed(2)}ms`);
      this._addKeyValue(doc, 'Speed Index', `${(m.speedIndex || 0).toFixed(2)}ms`);
      this._addKeyValue(doc, 'TTI', `${(m.timeToInteractive || 0).toFixed(2)}ms`);
    }
  }

  /**
   * 添加安全测试详情
   * @private
   */
  _addSecurityTestDetails(doc, testData) {
    this._addSectionTitle(doc, 'Security Test Results');

    this._addKeyValue(doc, 'Security Score', `${testData.score || 0}/100`);
    this._addKeyValue(doc, 'Checks Passed', testData.passedChecks || 0, 'green');
    this._addKeyValue(doc, 'Total Checks', testData.totalChecks || 0);

    if (testData.checks && testData.checks.length > 0) {
      doc.moveDown();
      this._addSectionTitle(doc, 'Security Checks');

      testData.checks.forEach((check, index) => {
        doc.fontSize(10)
           .fillColor(check.passed ? 'green' : 'red')
           .text(`${index + 1}. ${check.name}: ${check.passed ? '✓ PASS' : '✗ FAIL'}`, { indent: 20 });
        
        if (check.message) {
          doc.fontSize(9)
             .fillColor('gray')
             .text(check.message, { indent: 40 });
        }
        
        doc.moveDown(0.5);
      });
    }
  }

  /**
   * 生成HTML报告
   * @private
   */
  async _generateHTMLReport(testData, filepath) {
    const html = this._buildHTMLReport(testData);
    fs.writeFileSync(filepath, html, 'utf8');
  }

  /**
   * 构建HTML报告
   * @private
   */
  _buildHTMLReport(testData) {
    const style = `
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; border-bottom: 2px solid #eee; padding-bottom: 5px; }
        .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; }
        .info-label { font-weight: bold; width: 200px; color: #666; }
        .info-value { flex: 1; color: #333; }
        .success { color: #28a745; font-weight: bold; }
        .failed { color: #dc3545; font-weight: bold; }
        .check-item { padding: 10px; margin: 5px 0; background: #f8f9fa; border-left: 3px solid #007bff; }
        .check-pass { border-left-color: #28a745; }
        .check-fail { border-left-color: #dc3545; }
      </style>
    `;

    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Test Report - ${testData.type}</title>
        ${style}
      </head>
      <body>
        <div class="container">
          <h1>Test Report</h1>
          
          <h2>Basic Information</h2>
          ${this._htmlKeyValue('Test Type', testData.type || 'N/A')}
          ${this._htmlKeyValue('Test URL', testData.url || 'N/A')}
          ${this._htmlKeyValue('Test ID', testData.testId || 'N/A')}
          ${this._htmlKeyValue('Execution Time', new Date(testData.timestamp || Date.now()).toLocaleString())}
          ${this._htmlKeyValue('Duration', `${testData.duration || 0}ms`)}
          ${this._htmlKeyValue('Status', testData.success ? '<span class="success">SUCCESS</span>' : '<span class="failed">FAILED</span>')}
    `;

    // 根据类型添加详细信息
    if (testData.type === 'stress' && testData.result) {
      content += this._buildStressTestHTML(testData.result);
    } else if (testData.type === 'api' && testData.result) {
      content += this._buildApiTestHTML(testData);
    } else if (testData.type === 'performance') {
      content += this._buildPerformanceTestHTML(testData);
    } else if (testData.type === 'security') {
      content += this._buildSecurityTestHTML(testData);
    }

    content += `
        </div>
      </body>
      </html>
    `;

    return content;
  }

  /**
   * 构建压力测试HTML
   * @private
   */
  _buildStressTestHTML(result) {
    return `
      <h2>Stress Test Results</h2>
      ${this._htmlKeyValue('Total Requests', result.totalRequests || 0)}
      ${this._htmlKeyValue('Successful Requests', result.successfulRequests || 0)}
      ${this._htmlKeyValue('Failed Requests', result.failedRequests || 0)}
      ${this._htmlKeyValue('Success Rate', `${(result.successRate || 0).toFixed(2)}%`)}
      ${this._htmlKeyValue('Avg Response Time', `${(result.avgResponseTime || 0).toFixed(2)}ms`)}
      ${this._htmlKeyValue('Throughput', `${(result.throughput || 0).toFixed(2)} req/s`)}
    `;
  }

  /**
   * 构建API测试HTML
   * @private
   */
  _buildApiTestHTML(testData) {
    let html = `
      <h2>API Test Results</h2>
      ${this._htmlKeyValue('HTTP Method', testData.method || 'GET')}
      ${this._htmlKeyValue('Status Code', testData.result.statusCode || 'N/A')}
      ${this._htmlKeyValue('Response Time', `${testData.result.responseTime || 0}ms`)}
    `;

    if (testData.result.assertions) {
      html += `
        <h2>Assertions</h2>
        ${this._htmlKeyValue('Total', testData.result.assertions.total || 0)}
        ${this._htmlKeyValue('Passed', `<span class="success">${testData.result.assertions.passed || 0}</span>`)}
        ${this._htmlKeyValue('Failed', `<span class="failed">${testData.result.assertions.failed || 0}</span>`)}
        ${this._htmlKeyValue('Pass Rate', `${testData.result.assertions.passRate || 0}%`)}
      `;
    }

    return html;
  }

  /**
   * 构建性能测试HTML
   * @private
   */
  _buildPerformanceTestHTML(testData) {
    let html = `
      <h2>Performance Test Results</h2>
      ${this._htmlKeyValue('Performance Score', `${testData.performanceScore || 0}/100`)}
    `;

    if (testData.metrics) {
      const m = testData.metrics;
      html += `
        <h2>Core Web Vitals</h2>
        ${this._htmlKeyValue('First Contentful Paint', `${(m.firstContentfulPaint || 0).toFixed(2)}ms`)}
        ${this._htmlKeyValue('Largest Contentful Paint', `${(m.largestContentfulPaint || 0).toFixed(2)}ms`)}
        ${this._htmlKeyValue('Cumulative Layout Shift', `${(m.cumulativeLayoutShift || 0).toFixed(3)}`)}
        ${this._htmlKeyValue('Total Blocking Time', `${(m.totalBlockingTime || 0).toFixed(2)}ms`)}
      `;
    }

    return html;
  }

  /**
   * 构建安全测试HTML
   * @private
   */
  _buildSecurityTestHTML(testData) {
    let html = `
      <h2>Security Test Results</h2>
      ${this._htmlKeyValue('Security Score', `${testData.score || 0}/100`)}
      ${this._htmlKeyValue('Checks Passed', `<span class="success">${testData.passedChecks || 0}</span>`)}
      ${this._htmlKeyValue('Total Checks', testData.totalChecks || 0)}
    `;

    if (testData.checks && testData.checks.length > 0) {
      html += '<h2>Security Checks</h2>';
      testData.checks.forEach(check => {
        html += `
          <div class="check-item ${check.passed ? 'check-pass' : 'check-fail'}">
            <strong>${check.name}:</strong> ${check.passed ? '✓ PASS' : '✗ FAIL'}<br>
            <small>${check.message || ''}</small>
          </div>
        `;
      });
    }

    return html;
  }

  /**
   * 添加章节标题
   * @private
   */
  _addSectionTitle(doc, title) {
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('black')
       .text(title);
    doc.moveDown(0.5);
  }

  /**
   * 添加键值对
   * @private
   */
  _addKeyValue(doc, key, value, color = 'black') {
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('black')
       .text(`${key}: `, { continued: true })
       .font('Helvetica')
       .fillColor(color)
       .text(value);
  }

  /**
   * HTML键值对
   * @private
   */
  _htmlKeyValue(label, value) {
    return `
      <div class="info-row">
        <div class="info-label">${label}:</div>
        <div class="info-value">${value}</div>
      </div>
    `;
  }

  /**
   * 生成图表数据
   */
  generateChartData(testData) {
    if (testData.type === 'stress') {
      return this._generateStressChartData(testData);
    } else if (testData.type === 'performance') {
      return this._generatePerformanceChartData(testData);
    }
    return null;
  }

  /**
   * 生成压力测试图表数据
   * @private
   */
  _generateStressChartData(testData) {
    const result = testData.result || {};
    
    return {
      pieChart: {
        labels: ['Successful', 'Failed'],
        data: [result.successfulRequests || 0, result.failedRequests || 0],
        colors: ['#28a745', '#dc3545']
      },
      responseTimeChart: {
        labels: ['Min', 'Avg', 'Max'],
        data: [
          result.minResponseTime || 0,
          result.avgResponseTime || 0,
          result.maxResponseTime || 0
        ]
      }
    };
  }

  /**
   * 生成性能测试图表数据
   * @private
   */
  _generatePerformanceChartData(testData) {
    const m = testData.metrics || {};
    
    return {
      coreWebVitals: {
        labels: ['FCP', 'LCP', 'CLS', 'TBT'],
        data: [
          m.firstContentfulPaint || 0,
          m.largestContentfulPaint || 0,
          (m.cumulativeLayoutShift || 0) * 1000, // 转换为可视化
          m.totalBlockingTime || 0
        ]
      }
    };
  }
}

module.exports = ReportGenerator;
