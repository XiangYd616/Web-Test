/**
 * 报告系统服务
 * 提供报告生成、管理、导出功能
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

class ReportingService {
  constructor() {
    this.logger = Logger;
    this.reportTypes = [
      'performance', 'security', 'content', 'api', 
      'stress', 'compatibility', 'summary', 'comparison'
    ];
    this.formats = ['html', 'pdf', 'json', 'csv', 'excel'];
    this.templates = new Map();
    this.reports = new Map();
    this.initializeTemplates();
  }

  /**
   * 初始化报告模板
   */
  initializeTemplates() {
    try {
      // 性能测试报告模板
      this.templates.set('performance', {
        title: '性能测试报告',
        sections: [
          'executive_summary',
          'test_overview',
          'performance_metrics',
          'response_time_analysis',
          'throughput_analysis',
          'resource_utilization',
          'recommendations',
          'appendix'
        ],
        charts: ['response_time_trend', 'throughput_chart', 'resource_usage']
      });

      // 安全测试报告模板
      this.templates.set('security', {
        title: '安全测试报告',
        sections: [
          'executive_summary',
          'security_overview',
          'vulnerability_assessment',
          'risk_analysis',
          'security_recommendations',
          'compliance_check',
          'appendix'
        ],
        charts: ['vulnerability_distribution', 'risk_matrix', 'compliance_status']
      });

      // 综合报告模板
      this.templates.set('summary', {
        title: '综合测试报告',
        sections: [
          'executive_summary',
          'test_overview',
          'performance_summary',
          'security_summary',
          'quality_metrics',
          'overall_recommendations',
          'next_steps',
          'appendix'
        ],
        charts: ['overall_score', 'category_comparison', 'trend_analysis']
      });

      this.logger.info('报告模板初始化完成');
    } catch (error) {
      this.logger.error('初始化报告模板失败:', error);
    }
  }

  /**
   * 生成报告
   */
  async generateReport(reportConfig) {
    try {
      this.logger.info('开始生成报告:', reportConfig);

      const {
        type,
        testIds,
        format = 'html',
        template = null,
        options = {}
      } = reportConfig;

      // 验证报告类型
      if (!this.reportTypes.includes(type)) {
        throw new Error(`不支持的报告类型: ${type}`);
      }

      // 验证格式
      if (!this.formats.includes(format)) {
        throw new Error(`不支持的报告格式: ${format}`);
      }

      // 获取测试数据
      const testData = await this.getTestData(testIds);

      // 生成报告ID
      const reportId = this.generateReportId();

      // 选择模板
      const reportTemplate = template || this.getDefaultTemplate(type);

      // 生成报告内容
      const reportContent = await this.buildReportContent(
        type, testData, reportTemplate, options
      );

      // 格式化报告
      const formattedReport = await this.formatReport(
        reportContent, format, options
      );

      // 保存报告
      const report = {
        id: reportId,
        type,
        format,
        title: reportContent.title,
        content: formattedReport,
        testIds,
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: options.userId || 'system',
          version: '1.0.0',
          dataPoints: testData.length
        },
        status: 'completed'
      };

      this.reports.set(reportId, report);

      return {
        success: true,
        data: {
          reportId,
          title: report.title,
          format: report.format,
          downloadUrl: `/api/reports/${reportId}/download`,
          previewUrl: `/api/reports/${reportId}/preview`,
          metadata: report.metadata
        }
      };
    } catch (error) {
      this.logger.error('生成报告失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 构建报告内容
   */
  async buildReportContent(type, testData, template, options) {
    const content = {
      title: template.title || `${type}测试报告`,
      sections: {},
      charts: {},
      summary: {}
    };

    // 生成执行摘要
    content.sections.executive_summary = this.generateExecutiveSummary(testData, type);

    // 生成测试概览
    content.sections.test_overview = this.generateTestOverview(testData);

    // 根据报告类型生成特定内容
    switch (type) {
      case 'performance':
        content.sections.performance_metrics = this.generatePerformanceMetrics(testData);
        content.sections.response_time_analysis = this.generateResponseTimeAnalysis(testData);
        content.sections.throughput_analysis = this.generateThroughputAnalysis(testData);
        content.charts.response_time_trend = this.generateResponseTimeTrend(testData);
        break;

      case 'security':
        content.sections.vulnerability_assessment = this.generateVulnerabilityAssessment(testData);
        content.sections.risk_analysis = this.generateRiskAnalysis(testData);
        content.charts.vulnerability_distribution = this.generateVulnerabilityChart(testData);
        break;

      case 'summary':
        content.sections.performance_summary = this.generatePerformanceSummary(testData);
        content.sections.security_summary = this.generateSecuritySummary(testData);
        content.sections.quality_metrics = this.generateQualityMetrics(testData);
        content.charts.overall_score = this.generateOverallScoreChart(testData);
        break;
    }

    // 生成建议
    content.sections.recommendations = this.generateRecommendations(testData, type);

    // 生成摘要
    content.summary = this.generateReportSummary(testData, type);

    return content;
  }

  /**
   * 生成执行摘要
   */
  generateExecutiveSummary(testData, type) {
    const totalTests = testData.length;
    const successfulTests = testData.filter(test => test.status === 'completed').length;
    const successRate = totalTests > 0 ? (successfulTests / totalTests * 100).toFixed(1) : 0;

    return {
      title: '执行摘要',
      content: `
        本报告基于${totalTests}个测试结果生成，成功率为${successRate}%。
        测试类型：${type}测试
        测试时间范围：${this.getTestTimeRange(testData)}
        主要发现：${this.getKeyFindings(testData, type)}
      `,
      metrics: {
        totalTests,
        successfulTests,
        successRate: parseFloat(successRate)
      }
    };
  }

  /**
   * 生成测试概览
   */
  generateTestOverview(testData) {
    const urlStats = this.getUrlStatistics(testData);
    const timeStats = this.getTimeStatistics(testData);

    return {
      title: '测试概览',
      urlCount: urlStats.uniqueUrls,
      testCount: testData.length,
      timeRange: timeStats.range,
      avgDuration: timeStats.avgDuration,
      testTypes: this.getTestTypes(testData)
    };
  }

  /**
   * 生成性能指标
   */
  generatePerformanceMetrics(testData) {
    const performanceData = testData.filter(test => test.type === 'performance');
    
    if (performanceData.length === 0) {
      return { title: '性能指标', message: '无性能测试数据' };
    }

    const metrics = this.calculatePerformanceMetrics(performanceData);

    return {
      title: '性能指标',
      responseTime: {
        avg: metrics.avgResponseTime,
        min: metrics.minResponseTime,
        max: metrics.maxResponseTime,
        p95: metrics.p95ResponseTime
      },
      throughput: {
        avg: metrics.avgThroughput,
        max: metrics.maxThroughput
      },
      errorRate: {
        avg: metrics.avgErrorRate,
        max: metrics.maxErrorRate
      }
    };
  }

  /**
   * 格式化报告
   */
  async formatReport(content, format, options) {
    switch (format) {
      case 'html':
        return this.formatAsHTML(content, options);
      case 'json':
        return JSON.stringify(content, null, 2);
      case 'csv':
        return this.formatAsCSV(content, options);
      default:
        return content;
    }
  }

  /**
   * 格式化为HTML
   */
  formatAsHTML(content, options) {
    let html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .metric-card { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007acc; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${content.title}</h1>
        <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
    </div>
`;

    // 添加各个部分
    Object.entries(content.sections).forEach(([key, section]) => {
      if (section && section.title) {
        html += `
    <div class="section">
        <h2>${section.title}</h2>
        ${this.formatSectionContent(section)}
    </div>`;
      }
    });

    html += `
</body>
</html>`;

    return html;
  }

  /**
   * 格式化部分内容
   */
  formatSectionContent(section) {
    if (section.content) {
      return `<p>${section.content}</p>`;
    }

    if (section.metrics) {
      return this.formatMetrics(section.metrics);
    }

    return '<p>暂无数据</p>';
  }

  /**
   * 格式化指标
   */
  formatMetrics(metrics) {
    let html = '<div class="metrics">';
    
    Object.entries(metrics).forEach(([key, value]) => {
      html += `
        <div class="metric-card">
            <div class="metric-value">${value}</div>
            <div>${key}</div>
        </div>`;
    });

    html += '</div>';
    return html;
  }

  /**
   * 获取报告
   */
  getReport(reportId) {
    try {
      const report = this.reports.get(reportId);
      
      if (!report) {
        return {
          success: false,
          error: '报告不存在'
        };
      }

      return {
        success: true,
        data: report
      };
    } catch (error) {
      this.logger.error('获取报告失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取报告列表
   */
  getReportList(filters = {}) {
    try {
      let reports = Array.from(this.reports.values());

      // 应用过滤器
      if (filters.type) {
        reports = reports.filter(report => report.type === filters.type);
      }

      if (filters.userId) {
        reports = reports.filter(report => 
          report.metadata.generatedBy === filters.userId
        );
      }

      // 排序
      reports.sort((a, b) => 
        new Date(b.metadata.generatedAt) - new Date(a.metadata.generatedAt)
      );

      return {
        success: true,
        data: reports.map(report => ({
          id: report.id,
          type: report.type,
          title: report.title,
          format: report.format,
          status: report.status,
          metadata: report.metadata
        }))
      };
    } catch (error) {
      this.logger.error('获取报告列表失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 删除报告
   */
  deleteReport(reportId) {
    try {
      if (!this.reports.has(reportId)) {
        return {
          success: false,
          error: '报告不存在'
        };
      }

      this.reports.delete(reportId);
      this.logger.info(`报告已删除: ${reportId}`);

      return {
        success: true,
        message: '报告删除成功'
      };
    } catch (error) {
      this.logger.error('删除报告失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取测试数据
   */
  async getTestData(testIds) {
    // 这里应该从数据库获取实际的测试数据
    // 暂时返回模拟数据
    return testIds.map(id => ({
      id,
      type: 'performance',
      url: 'https://example.com',
      status: 'completed',
      results: {
        responseTime: Math.random() * 1000 + 200,
        throughput: Math.random() * 100 + 50,
        errorRate: Math.random() * 5
      },
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * 生成报告ID
   */
  generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取默认模板
   */
  getDefaultTemplate(type) {
    return this.templates.get(type) || this.templates.get('summary');
  }

  /**
   * 辅助方法
   */
  getTestTimeRange(testData) {
    if (testData.length === 0) return '无数据';
    
    const timestamps = testData.map(test => new Date(test.timestamp));
    const start = new Date(Math.min(...timestamps));
    const end = new Date(Math.max(...timestamps));
    
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }

  getKeyFindings(testData, type) {
    // 根据测试类型返回关键发现
    const findings = {
      performance: '响应时间和吞吐量表现良好',
      security: '发现若干安全风险需要关注',
      summary: '整体测试结果符合预期'
    };
    
    return findings[type] || '测试完成，详见具体分析';
  }

  getUrlStatistics(testData) {
    const urls = [...new Set(testData.map(test => test.url))];
    return { uniqueUrls: urls.length };
  }

  getTimeStatistics(testData) {
    if (testData.length === 0) {
      return { range: '无数据', avgDuration: 0 };
    }

    const durations = testData.map(test => test.duration || 0);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    return {
      range: this.getTestTimeRange(testData),
      avgDuration: Math.round(avgDuration)
    };
  }

  getTestTypes(testData) {
    const types = [...new Set(testData.map(test => test.type))];
    return types;
  }

  calculatePerformanceMetrics(testData) {
    const responseTimes = testData.map(test => test.results?.responseTime || 0);
    const throughputs = testData.map(test => test.results?.throughput || 0);
    const errorRates = testData.map(test => test.results?.errorRate || 0);

    return {
      avgResponseTime: this.average(responseTimes),
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p95ResponseTime: this.percentile(responseTimes, 95),
      avgThroughput: this.average(throughputs),
      maxThroughput: Math.max(...throughputs),
      avgErrorRate: this.average(errorRates),
      maxErrorRate: Math.max(...errorRates)
    };
  }

  average(arr) {
    return arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
  }

  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  generateRecommendations(testData, type) {
    const recommendations = {
      performance: [
        '优化响应时间较慢的接口',
        '考虑增加缓存机制',
        '监控服务器资源使用情况'
      ],
      security: [
        '修复发现的安全漏洞',
        '加强输入验证',
        '定期进行安全审计'
      ],
      summary: [
        '持续监控系统性能',
        '建立自动化测试流程',
        '定期更新测试用例'
      ]
    };

    return {
      title: '建议',
      items: recommendations[type] || recommendations.summary
    };
  }

  generateReportSummary(testData, type) {
    return {
      totalTests: testData.length,
      successRate: testData.filter(test => test.status === 'completed').length / testData.length * 100,
      avgScore: this.average(testData.map(test => test.results?.score || 0)),
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = new ReportingService();
