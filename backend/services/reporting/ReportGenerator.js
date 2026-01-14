/**
 * 增强的报告生成器
 * 支持多种模板、格式和自定义样式
 */

const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { query: _query } = require('../../config/database');

class ReportGenerator {
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
        style: 'professional'
      },
      technical: {
        name: '技术详细报告',
        description: '包含详细技术指标的完整报告',
        sections: ['summary', 'detailed_metrics', 'performance_analysis', 'security_analysis', 'recommendations', 'appendix'],
        style: 'detailed'
      },
      compliance: {
        name: '合规性报告',
        description: '专注于安全和合规性的报告',
        sections: ['compliance_summary', 'security_analysis', 'vulnerability_assessment', 'remediation_plan'],
        style: 'security'
      },
      performance: {
        name: '性能优化报告',
        description: '专注于性能指标和优化建议',
        sections: ['performance_summary', 'core_web_vitals', 'performance_timeline', 'optimization_opportunities'],
        style: 'performance'
      },
      comparison: {
        name: '对比分析报告',
        description: '多次测试结果的对比分析',
        sections: ['comparison_summary', 'trend_analysis', 'improvement_tracking', 'benchmark_comparison'],
        style: 'analytical'
      }
    };

    // 样式配置
    this.styles = {
      professional: {
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        accentColor: '#10b981',
        errorColor: '#ef4444',
        backgroundColor: '#ffffff',
        textColor: '#1e293b'
      },
      detailed: {
        primaryColor: '#7c3aed',
        secondaryColor: '#6b7280',
        accentColor: '#059669',
        errorColor: '#dc2626',
        backgroundColor: '#fafafa',
        textColor: '#111827'
      },
      security: {
        primaryColor: '#dc2626',
        secondaryColor: '#991b1b',
        accentColor: '#16a34a',
        errorColor: '#b91c1c',
        backgroundColor: '#fef2f2',
        textColor: '#1f2937'
      },
      performance: {
        primaryColor: '#ea580c',
        secondaryColor: '#c2410c',
        accentColor: '#16a34a',
        errorColor: '#dc2626',
        backgroundColor: '#fff7ed',
        textColor: '#1c1917'
      },
      analytical: {
        primaryColor: '#0891b2',
        secondaryColor: '#0e7490',
        accentColor: '#059669',
        errorColor: '#e11d48',
        backgroundColor: '#f0f9ff',
        textColor: '#0c4a6e'
      }
    };
  }

  /**
   * 确保目录存在
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
      await fs.mkdir(this.templatesDir, { recursive: true });
      await fs.mkdir(this.assetsDir, { recursive: true });
    } catch (error) {
      console.error('创建目录失败:', error);
    }
  }

  /**
   * 生成增强报告
   */
  async generateEnhancedReport(testData, options = {}) {
    try {
      const {
        template = 'technical',
        format = 'html',
        title = '测试报告',
        description = '',
        customSections: _customSections = [],
        includeCharts: _includeCharts = true,
        includeRecommendations: _includeRecommendations = true,
        brandingOptions = {}
      } = options;

      // 验证模板
      if (!this.templates[template]) {
        throw new Error(`未知的报告模板: ${template}`);
      }

      const templateConfig = this.templates[template];
      const style = this.styles[templateConfig.style];

      // 分析测试数据
      const analysis = await this.analyzeTestData(testData);
      
      // 构建报告数据
      const reportData = {
        metadata: {
          title,
          description,
          template,
          generatedAt: new Date().toISOString(),
          format,
          version: '2.0'
        },
        style,
        templateConfig,
        analysis,
        testData: Array.isArray(testData) ? testData : [testData],
        brandingOptions: {
          logo: brandingOptions.logo || null,
          companyName: brandingOptions.companyName || 'Test-Web Platform',
          primaryColor: brandingOptions.primaryColor || style.primaryColor,
          ...brandingOptions
        }
      };

      // 根据格式生成报告
      let filePath;
      switch (format.toLowerCase()) {
        case 'html':
          filePath = await this.generateEnhancedHTML(reportData);
          break;
        case 'pdf':
          filePath = await this.generateEnhancedPDF(reportData);
          break;
        case 'excel':
        case 'xlsx':
          filePath = await this.generateEnhancedExcel(reportData);
          break;
        case 'word':
        case 'docx':
          filePath = await this.generateWordDocument(reportData);
          break;
        case 'json':
          filePath = await this.generateEnhancedJSON(reportData);
          break;
        default:
          throw new Error(`不支持的报告格式: ${format}`);
      }

      return {
        filePath,
        metadata: reportData.metadata,
        analysis: reportData.analysis
      };
    } catch (error) {
      console.error('生成增强报告失败:', error);
      throw error;
    }
  }

  /**
   * 分析测试数据
   */
  async analyzeTestData(testData) {
    const tests = Array.isArray(testData) ? testData : [testData];
    
    const analysis = {
      summary: {
        totalTests: tests.length,
        completedTests: 0,
        failedTests: 0,
        averageScore: 0,
        totalDuration: 0,
        testTypes: new Set(),
        dateRange: {
          start: null,
          end: null
        }
      },
      performance: {
        averageLoadTime: 0,
        coreWebVitals: {},
        performanceGrade: 'N/A'
      },
      security: {
        totalVulnerabilities: 0,
        highRiskIssues: 0,
        securityScore: 0,
        complianceLevel: 'Unknown'
      },
      seo: {
        seoScore: 0,
        technicalIssues: 0,
        contentIssues: 0,
        structureIssues: 0
      },
      trends: {
        scoreHistory: [],
        performanceTrend: 'stable',
        improvementAreas: []
      },
      recommendations: {
        critical: [],
        high: [],
        medium: [],
        low: []
      }
    };

    let totalScore = 0;
    let totalLoadTime = 0;
    let loadTimeCount = 0;
    const dates = [];

    tests.forEach(test => {
      // 基础统计
      analysis.summary.testTypes.add(test.type || test.engine_type);
      
      if (test.status === 'completed') {
        analysis.summary.completedTests++;
      } else if (test.status === 'failed') {
        analysis.summary.failedTests++;
      }

      if (test.duration_ms || test.execution_time) {
        analysis.summary.totalDuration += test.duration_ms || test.execution_time || 0;
      }

      // 日期范围
      const testDate = new Date(test.created_at || test.timestamp);
      dates.push(testDate);

      // 分析结果
      if (test.results) {
        const results = typeof test.results === 'string' ? JSON.parse(test.results) : test.results;
        
        // 分数分析
        if (results.score !== undefined) {
          totalScore += results.score;
          analysis.trends.scoreHistory.push({
            date: testDate.toISOString(),
            score: results.score,
            testType: test.type
          });
        }

        // 性能分析
        if (test.type === 'performance' || test.engine_type === 'performance') {
          this.analyzePerformanceResults(results, analysis.performance);
          
          if (results.metrics) {
            const loadTime = results.metrics.loadTime || results.metrics.TTFB || results.metrics.FCP;
            if (loadTime) {
              totalLoadTime += loadTime.value || loadTime;
              loadTimeCount++;
            }
          }
        }

        // 安全分析
        if (test.type === 'security' || test.engine_type === 'security') {
          this.analyzeSecurityResults(results, analysis.security);
        }

        // SEO分析
        if (test.type === 'seo' || test.engine_type === 'seo') {
          this.analyzeSEOResults(results, analysis.seo);
        }

        // 提取建议
        this.extractRecommendations(results, test.type, analysis.recommendations);
      }
    });

    // 计算平均值
    if (analysis.summary.completedTests > 0) {
      analysis.summary.averageScore = Math.round(totalScore / analysis.summary.completedTests);
    }

    if (loadTimeCount > 0) {
      analysis.performance.averageLoadTime = Math.round(totalLoadTime / loadTimeCount);
    }

    // 日期范围
    if (dates.length > 0) {
      dates.sort((a, b) => a - b);
      analysis.summary.dateRange.start = dates[0].toISOString();
      analysis.summary.dateRange.end = dates[dates.length - 1].toISOString();
    }

    // 转换集合为数组
    analysis.summary.testTypes = Array.from(analysis.summary.testTypes);

    // 生成趋势分析
    this.analyzeTrends(analysis);

    return analysis;
  }

  /**
   * 性能结果分析
   */
  analyzePerformanceResults(results, performanceAnalysis) {
    if (results.metrics) {
      // Core Web Vitals
      const cwv = {};
      if (results.metrics.LCP) cwv.LCP = results.metrics.LCP;
      if (results.metrics.FID) cwv.FID = results.metrics.FID;
      if (results.metrics.CLS) cwv.CLS = results.metrics.CLS;
      if (results.metrics.FCP) cwv.FCP = results.metrics.FCP;
      if (results.metrics.TTFB) cwv.TTFB = results.metrics.TTFB;
      
      performanceAnalysis.coreWebVitals = { ...performanceAnalysis.coreWebVitals, ...cwv };
    }

    if (results.grade) {
      performanceAnalysis.performanceGrade = results.grade;
    }
  }

  /**
   * 安全结果分析
   */
  analyzeSecurityResults(results, securityAnalysis) {
    if (results.vulnerabilities) {
      securityAnalysis.totalVulnerabilities += results.vulnerabilities.length;
      securityAnalysis.highRiskIssues += results.vulnerabilities.filter(v => 
        v.severity === 'high' || v.severity === 'critical'
      ).length;
    }

    if (results.score !== undefined) {
      securityAnalysis.securityScore = Math.max(securityAnalysis.securityScore, results.score);
    }

    if (results.compliance) {
      securityAnalysis.complianceLevel = results.compliance.level || 'Unknown';
    }
  }

  /**
   * SEO结果分析
   */
  analyzeSEOResults(results, seoAnalysis) {
    if (results.score !== undefined) {
      seoAnalysis.seoScore = Math.max(seoAnalysis.seoScore, results.score);
    }

    if (results.issues) {
      seoAnalysis.technicalIssues += results.issues.technical?.length || 0;
      seoAnalysis.contentIssues += results.issues.content?.length || 0;
      seoAnalysis.structureIssues += results.issues.structure?.length || 0;
    }
  }

  /**
   * 提取建议
   */
  extractRecommendations(results, testType, recommendations) {
    if (results.recommendations) {
      results.recommendations.forEach(rec => {
        const priority = rec.priority || 'medium';
        if (recommendations[priority]) {
          recommendations[priority].push({
            testType,
            category: rec.category || 'General',
            suggestion: rec.suggestion || rec.message || rec.description,
            impact: rec.impact || 'Unknown'
          });
        }
      });
    }

    if (results.opportunities) {
      results.opportunities.forEach(opp => {
        recommendations.medium.push({
          testType,
          category: 'Optimization',
          suggestion: opp.description || opp.suggestion,
          impact: opp.savings || 'Performance improvement'
        });
      });
    }
  }

  /**
   * 趋势分析
   */
  analyzeTrends(analysis) {
    const scoreHistory = analysis.trends.scoreHistory;
    if (scoreHistory.length > 1) {
      const recent = scoreHistory.slice(-3);
      const avgRecent = recent.reduce((sum, item) => sum + item.score, 0) / recent.length;
      const older = scoreHistory.slice(0, -3);
      
      if (older.length > 0) {
        const avgOlder = older.reduce((sum, item) => sum + item.score, 0) / older.length;
        
        if (avgRecent > avgOlder + 5) {
          analysis.trends.performanceTrend = 'improving';
        } else if (avgRecent < avgOlder - 5) {
          analysis.trends.performanceTrend = 'declining';
        }
      }
    }

    // 识别改进领域
    const { recommendations } = analysis;
    const allRecs = [...recommendations.critical, ...recommendations.high, ...recommendations.medium];
    const categoryCount = {};
    
    allRecs.forEach(rec => {
      categoryCount[rec.category] = (categoryCount[rec.category] || 0) + 1;
    });

    analysis.trends.improvementAreas = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));
  }

  /**
   * 生成增强HTML报告
   */
  async generateEnhancedHTML(reportData) {
    const timestamp = Date.now();
    const fileName = `analysis_report_${timestamp}.html`;
    const filePath = path.join(this.reportsDir, fileName);

    const { metadata, style, analysis, brandingOptions } = reportData;

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata.title}</title>
    <style>
        :root {
            --primary-color: ${style.primaryColor};
            --secondary-color: ${style.secondaryColor};
            --accent-color: ${style.accentColor};
            --error-color: ${style.errorColor};
            --bg-color: ${style.backgroundColor};
            --text-color: ${style.textColor};
            --border-radius: 8px;
            --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            --transition: all 0.3s ease;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background: var(--bg-color);
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        /* 报告头部 */
        .report-header {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            color: white;
            padding: 40px;
            border-radius: var(--border-radius);
            margin-bottom: 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .report-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            pointer-events: none;
        }

        .report-header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }

        .report-meta {
            opacity: 0.9;
            position: relative;
            z-index: 1;
        }

        /* 仪表板卡片 */
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .metric-card {
            background: white;
            padding: 25px;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            border-left: 4px solid var(--primary-color);
            transition: var(--transition);
        }

        .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .metric-card h3 {
            color: var(--primary-color);
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }

        .metric-value {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 5px;
        }

        .metric-label {
            color: var(--secondary-color);
            font-size: 0.85rem;
        }

        .metric-trend {
            display: inline-flex;
            align-items: center;
            font-size: 0.8rem;
            margin-top: 8px;
        }

        .trend-up { color: var(--accent-color); }
        .trend-down { color: var(--error-color); }
        .trend-stable { color: var(--secondary-color); }

        /* 章节样式 */
        .section {
            background: white;
            padding: 30px;
            border-radius: var(--border-radius);
            margin-bottom: 25px;
            box-shadow: var(--shadow);
        }

        .section h2 {
            color: var(--text-color);
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--primary-color);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section h2::before {
            content: '';
            width: 4px;
            height: 20px;
            background: var(--primary-color);
            border-radius: 2px;
        }

        /* 图表容器 */
        .chart-container {
            height: 300px;
            margin: 20px 0;
            background: #f8fafc;
            border-radius: var(--border-radius);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--secondary-color);
        }

        /* 表格样式 */
        .modern-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            border-radius: var(--border-radius);
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .modern-table th {
            background: var(--primary-color);
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
        }

        .modern-table td {
            padding: 15px 12px;
            border-bottom: 1px solid #e2e8f0;
        }

        .modern-table tr:hover {
            background: #f1f5f9;
        }

        .modern-table tr:last-child td {
            border-bottom: none;
        }

        /* 状态徽章 */
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-excellent { background: #dcfce7; color: #166534; }
        .status-good { background: #dbeafe; color: #1d4ed8; }
        .status-fair { background: #fef3c7; color: #92400e; }
        .status-poor { background: #fee2e2; color: #991b1b; }

        /* 建议卡片 */
        .recommendation {
            margin: 15px 0;
            padding: 20px;
            border-radius: var(--border-radius);
            border-left: 4px solid;
            background: white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .recommendation.critical {
            border-color: var(--error-color);
            background: #fef2f2;
        }

        .recommendation.high {
            border-color: #f59e0b;
            background: #fffbeb;
        }

        .recommendation.medium {
            border-color: var(--primary-color);
            background: #eff6ff;
        }

        .recommendation.low {
            border-color: var(--secondary-color);
            background: #f8fafc;
        }

        .recommendation-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }

        .recommendation-priority {
            font-size: 0.75rem;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 600;
            margin-right: 10px;
        }

        .priority-critical {
            background: var(--error-color);
            color: white;
        }

        .priority-high {
            background: #f59e0b;
            color: white;
        }

        .priority-medium {
            background: var(--primary-color);
            color: white;
        }

        .priority-low {
            background: var(--secondary-color);
            color: white;
        }

        /* 进度条 */
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--accent-color), var(--primary-color));
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        /* 页脚 */
        .report-footer {
            text-align: center;
            padding: 40px 20px;
            color: var(--secondary-color);
            border-top: 1px solid #e2e8f0;
            margin-top: 40px;
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .dashboard {
                grid-template-columns: 1fr;
            }
            
            .report-header h1 {
                font-size: 2rem;
            }
            
            .section {
                padding: 20px;
            }
        }

        /* 打印样式 */
        @media print {
            .container {
                max-width: none;
                padding: 0;
            }
            
            .section {
                break-inside: avoid;
                margin-bottom: 20px;
            }
            
            .chart-container {
                background: white;
                border: 1px solid #ddd;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- 报告头部 -->
        <div class="report-header">
            <h1>${metadata.title}</h1>
            <div class="report-meta">
                <p>生成时间: ${new Date(metadata.generatedAt).toLocaleString('zh-CN')}</p>
                ${metadata.description ? `<p>${metadata.description}</p>` : ''}
                <p>报告模板: ${reportData.templateConfig.name}</p>
            </div>
        </div>

        <!-- 核心指标仪表板 -->
        <div class="dashboard">
            <div class="metric-card">
                <h3>测试总数</h3>
                <div class="metric-value">${analysis.summary.totalTests}</div>
                <div class="metric-label">次测试执行</div>
            </div>
            
            <div class="metric-card">
                <h3>平均分数</h3>
                <div class="metric-value">${analysis.summary.averageScore}</div>
                <div class="metric-label">综合评分</div>
                <div class="metric-trend ${analysis.trends.performanceTrend === 'improving' ? 'trend-up' : analysis.trends.performanceTrend === 'declining' ? 'trend-down' : 'trend-stable'}">
                    ${analysis.trends.performanceTrend === 'improving' ? '↗ 持续改善' : analysis.trends.performanceTrend === 'declining' ? '↘ 需要关注' : '→ 稳定'}
                </div>
            </div>
            
            <div class="metric-card">
                <h3>成功率</h3>
                <div class="metric-value">${Math.round((analysis.summary.completedTests / analysis.summary.totalTests) * 100)}%</div>
                <div class="metric-label">测试完成率</div>
            </div>
            
            <div class="metric-card">
                <h3>平均耗时</h3>
                <div class="metric-value">${(analysis.summary.totalDuration / analysis.summary.totalTests / 1000).toFixed(1)}s</div>
                <div class="metric-label">每次测试</div>
            </div>
        </div>

        <!-- 执行摘要 -->
        <div class="section">
            <h2>执行摘要</h2>
            <p>本报告涵盖了 ${analysis.summary.totalTests} 次测试的执行结果，测试类型包括 ${analysis.summary.testTypes.join('、')}。</p>
            <p>整体测试成功率为 ${Math.round((analysis.summary.completedTests / analysis.summary.totalTests) * 100)}%，平均得分 ${analysis.summary.averageScore} 分。</p>
            ${analysis.trends.performanceTrend === 'improving' ? 
                '<p class="trend-up">📈 测试结果显示持续改善的趋势，系统性能和质量在稳步提升。</p>' :
              analysis.trends.performanceTrend === 'declining' ?
                '<p class="trend-down">📉 测试结果显示下降趋势，建议立即采取优化措施。</p>' :
                '<p class="trend-stable">📊 测试结果保持稳定，继续监控关键指标的变化。</p>'
            }
        </div>

        <!-- 性能分析 -->
        ${Object.keys(analysis.performance.coreWebVitals).length > 0 ? `
        <div class="section">
            <h2>性能分析</h2>
            <div class="chart-container">
                📊 Core Web Vitals 性能图表 (需要图表库支持)
            </div>
            <table class="modern-table">
                <thead>
                    <tr>
                        <th>指标</th>
                        <th>数值</th>
                        <th>状态</th>
                        <th>建议</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(analysis.performance.coreWebVitals).map(([metric, data]) => `
                        <tr>
                            <td>${metric}</td>
                            <td>${data.value}${data.unit || 'ms'}</td>
                            <td><span class="status-badge ${data.score >= 90 ? 'status-excellent' : data.score >= 70 ? 'status-good' : data.score >= 50 ? 'status-fair' : 'status-poor'}">${data.grade || 'N/A'}</span></td>
                            <td>${data.recommendation || '继续保持'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <!-- 安全分析 -->
        ${analysis.security.totalVulnerabilities > 0 ? `
        <div class="section">
            <h2>安全分析</h2>
            <div class="dashboard">
                <div class="metric-card">
                    <h3>安全得分</h3>
                    <div class="metric-value">${analysis.security.securityScore}</div>
                    <div class="metric-label">满分100分</div>
                </div>
                <div class="metric-card">
                    <h3>发现漏洞</h3>
                    <div class="metric-value">${analysis.security.totalVulnerabilities}</div>
                    <div class="metric-label">个安全问题</div>
                </div>
                <div class="metric-card">
                    <h3>高风险问题</h3>
                    <div class="metric-value">${analysis.security.highRiskIssues}</div>
                    <div class="metric-label">需要立即修复</div>
                </div>
                <div class="metric-card">
                    <h3>合规水平</h3>
                    <div class="metric-value" style="font-size: 1.5rem;">${analysis.security.complianceLevel}</div>
                    <div class="metric-label">安全合规性</div>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- 建议和改进机会 -->
        ${analysis.recommendations.critical.length > 0 || analysis.recommendations.high.length > 0 || analysis.recommendations.medium.length > 0 ? `
        <div class="section">
            <h2>建议和改进机会</h2>
            
            ${analysis.recommendations.critical.map(rec => `
                <div class="recommendation critical">
                    <div class="recommendation-header">
                        <span class="recommendation-priority priority-critical">紧急</span>
                        <strong>${rec.category}</strong>
                    </div>
                    <p>${rec.suggestion}</p>
                    ${rec.impact ? `<p><small>影响: ${rec.impact}</small></p>` : ''}
                </div>
            `).join('')}

            ${analysis.recommendations.high.map(rec => `
                <div class="recommendation high">
                    <div class="recommendation-header">
                        <span class="recommendation-priority priority-high">重要</span>
                        <strong>${rec.category}</strong>
                    </div>
                    <p>${rec.suggestion}</p>
                    ${rec.impact ? `<p><small>影响: ${rec.impact}</small></p>` : ''}
                </div>
            `).join('')}

            ${analysis.recommendations.medium.map(rec => `
                <div class="recommendation medium">
                    <div class="recommendation-header">
                        <span class="recommendation-priority priority-medium">中等</span>
                        <strong>${rec.category}</strong>
                    </div>
                    <p>${rec.suggestion}</p>
                    ${rec.impact ? `<p><small>影响: ${rec.impact}</small></p>` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- 改进领域分析 -->
        ${analysis.trends.improvementAreas.length > 0 ? `
        <div class="section">
            <h2>重点改进领域</h2>
            <p>基于测试结果分析，以下是需要重点关注的改进领域：</p>
            ${analysis.trends.improvementAreas.map(area => `
                <div style="margin: 15px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <strong>${area.category}</strong>
                        <span>${area.count} 个问题</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(area.count / Math.max(...analysis.trends.improvementAreas.map(a => a.count))) * 100}%"></div>
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- 测试历史详情 -->
        <div class="section">
            <h2>测试历史详情</h2>
            <table class="modern-table">
                <thead>
                    <tr>
                        <th>时间</th>
                        <th>类型</th>
                        <th>URL</th>
                        <th>状态</th>
                        <th>得分</th>
                        <th>耗时</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.testData.slice(0, 10).map(test => `
                        <tr>
                            <td>${new Date(test.created_at || test.timestamp).toLocaleString('zh-CN')}</td>
                            <td><span class="status-badge status-${test.type || test.engine_type}">${(test.type || test.engine_type || 'unknown').toUpperCase()}</span></td>
                            <td title="${test.url || test.test_url || 'N/A'}">${(test.url || test.test_url || 'N/A').substring(0, 50)}${(test.url || test.test_url || '').length > 50 ? '...' : ''}</td>
                            <td><span class="status-badge status-${test.status}">${test.status || 'unknown'}</span></td>
                            <td>${test.results && typeof test.results === 'object' ? (test.results.score || 'N/A') : 'N/A'}</td>
                            <td>${test.duration_ms ? `${(test.duration_ms / 1000).toFixed(1)}s` : test.execution_time ? `${(test.execution_time / 1000).toFixed(1)}s` : 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${reportData.testData.length > 10 ? `<p><em>显示最近 10 次测试，共 ${reportData.testData.length} 次测试</em></p>` : ''}
        </div>

        <!-- 报告页脚 -->
        <div class="report-footer">
            <p><strong>${brandingOptions.companyName}</strong> - 专业的网站测试和分析平台</p>
            <p>报告生成时间: ${new Date().toLocaleString('zh-CN')} | 版本: ${metadata.version}</p>
        </div>
    </div>
</body>
</html>
    `;

    await fs.writeFile(filePath, html, 'utf8');
    return filePath;
  }

  /**
   * 生成增强PDF报告
   */
  async generateEnhancedPDF(reportData) {
    const timestamp = Date.now();
    const fileName = `analysis_report_${timestamp}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = require('fs').createWriteStream(filePath);
      
      doc.pipe(stream);

      const { metadata, style, analysis, brandingOptions: _brandingOptions } = reportData;

      // 添加标题页
      doc.fontSize(28).fillColor(style.primaryColor).text(metadata.title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).fillColor('#666').text(`生成时间: ${new Date(metadata.generatedAt).toLocaleString('zh-CN')}`, { align: 'center' });
      doc.text(`报告模板: ${reportData.templateConfig.name}`, { align: 'center' });
      
      if (metadata.description) {
        doc.moveDown();
        doc.text(metadata.description, { align: 'center' });
      }

      // 添加分页
      doc.addPage();

      // 执行摘要
      doc.fontSize(18).fillColor('#333').text('执行摘要', { underline: true });
      doc.moveDown();
      doc.fontSize(12).fillColor('#333');
      doc.text(`本报告涵盖了 ${analysis.summary.totalTests} 次测试的执行结果。`);
      doc.text(`整体测试成功率为 ${Math.round((analysis.summary.completedTests / analysis.summary.totalTests) * 100)}%。`);
      doc.text(`平均得分 ${analysis.summary.averageScore} 分。`);

      // 核心指标
      doc.moveDown(2);
      doc.fontSize(18).text('核心指标', { underline: true });
      doc.moveDown();

      const metrics = [
        { label: '测试总数', value: `${analysis.summary.totalTests} 次` },
        { label: '平均分数', value: `${analysis.summary.averageScore} 分` },
        { label: '成功率', value: `${Math.round((analysis.summary.completedTests / analysis.summary.totalTests) * 100)}%` },
        { label: '平均耗时', value: `${(analysis.summary.totalDuration / analysis.summary.totalTests / 1000).toFixed(1)}s` }
      ];

      metrics.forEach(metric => {
        doc.fontSize(12).text(`${metric.label}: `, { continued: true }).fillColor(style.primaryColor).text(metric.value);
        doc.fillColor('#333');
      });

      // 建议部分
      if (analysis.recommendations.critical.length > 0 || analysis.recommendations.high.length > 0) {
        doc.addPage();
        doc.fontSize(18).text('重要建议', { underline: true });
        doc.moveDown();

        [...analysis.recommendations.critical, ...analysis.recommendations.high].slice(0, 10).forEach(rec => {
          doc.fontSize(12).fillColor(rec.priority === 'critical' ? style.errorColor : '#f59e0b').text(rec.category, { continued: true });
          doc.fillColor('#333').text(` - ${rec.suggestion}`);
          doc.moveDown(0.5);
        });
      }

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  /**
   * 生成增强Excel报告
   */
  async generateEnhancedExcel(reportData) {
    const timestamp = Date.now();
    const fileName = `analysis_report_${timestamp}.xlsx`;
    const filePath = path.join(this.reportsDir, fileName);

    const workbook = new ExcelJS.Workbook();
    const { metadata, analysis, testData } = reportData;

    // 设置工作簿属性
    workbook.creator = 'Test-Web Platform';
    workbook.lastModifiedBy = 'Test-Web Platform';
    workbook.created = new Date();

    // 概要表
    const summarySheet = workbook.addWorksheet('报告概要', {
      pageSetup: { paperSize: 9, orientation: 'portrait' }
    });

    // 设置列宽
    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 25 },
      { header: '数值', key: 'value', width: 20 },
      { header: '说明', key: 'description', width: 40 }
    ];

    // 添加标题
    summarySheet.mergeCells('A1:C1');
    summarySheet.getCell('A1').value = metadata.title;
    summarySheet.getCell('A1').font = { size: 16, bold: true };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };

    // 添加概要数据
    const summaryData = [
      { metric: '测试总数', value: analysis.summary.totalTests, description: '执行的测试总次数' },
      { metric: '成功率', value: `${Math.round((analysis.summary.completedTests / analysis.summary.totalTests) * 100)}%`, description: '成功完成的测试占比' },
      { metric: '平均分数', value: analysis.summary.averageScore, description: '所有测试的平均得分' },
      { metric: '平均耗时', value: `${(analysis.summary.totalDuration / analysis.summary.totalTests / 1000).toFixed(1)}秒`, description: '每次测试的平均执行时间' },
      { metric: '测试类型', value: analysis.summary.testTypes.join(', '), description: '包含的测试类型' }
    ];

    summarySheet.addRows(summaryData, 'i+');

    // 格式化表格
    summarySheet.getRow(3).font = { bold: true };
    summarySheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
    summarySheet.getRow(3).font = { color: { argb: 'FFFFFF' }, bold: true };

    // 测试详情表
    const detailsSheet = workbook.addWorksheet('测试详情');
    
    detailsSheet.columns = [
      { header: '测试ID', key: 'id', width: 35 },
      { header: '类型', key: 'type', width: 15 },
      { header: 'URL', key: 'url', width: 50 },
      { header: '状态', key: 'status', width: 15 },
      { header: '得分', key: 'score', width: 10 },
      { header: '耗时(秒)', key: 'duration', width: 15 },
      { header: '创建时间', key: 'createdAt', width: 25 }
    ];

    // 添加测试数据
    testData.forEach(test => {
      const results = test.results && typeof test.results === 'object' ? test.results : 
                     test.results && typeof test.results === 'string' ? JSON.parse(test.results) : {};
      
      detailsSheet.addRow({
        id: test.uuid || test.id || 'N/A',
        type: (test.type || test.engine_type || 'unknown').toUpperCase(),
        url: test.url || test.test_url || 'N/A',
        status: test.status || 'unknown',
        score: results.score || 'N/A',
        duration: test.duration_ms ? (test.duration_ms / 1000).toFixed(1) : 
                 test.execution_time ? (test.execution_time / 1000).toFixed(1) : 'N/A',
        createdAt: test.created_at || test.timestamp ? 
                  new Date(test.created_at || test.timestamp).toLocaleString('zh-CN') : 'N/A'
      });
    });

    // 格式化详情表头
    detailsSheet.getRow(1).font = { bold: true };
    detailsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
    detailsSheet.getRow(1).font = { color: { argb: 'FFFFFF' }, bold: true };

    // 建议表
    if (analysis.recommendations.critical.length > 0 || analysis.recommendations.high.length > 0 || analysis.recommendations.medium.length > 0) {
      const recommendationsSheet = workbook.addWorksheet('优化建议');
      
      recommendationsSheet.columns = [
        { header: '优先级', key: 'priority', width: 12 },
        { header: '类别', key: 'category', width: 20 },
        { header: '测试类型', key: 'testType', width: 15 },
        { header: '建议内容', key: 'suggestion', width: 60 },
        { header: '影响', key: 'impact', width: 30 }
      ];

      // 添加建议数据
      const allRecommendations = [
        ...analysis.recommendations.critical.map(r => ({ ...r, priority: '紧急' })),
        ...analysis.recommendations.high.map(r => ({ ...r, priority: '重要' })),
        ...analysis.recommendations.medium.map(r => ({ ...r, priority: '中等' })),
        ...analysis.recommendations.low.map(r => ({ ...r, priority: '低' }))
      ];

      allRecommendations.forEach(rec => {
        recommendationsSheet.addRow({
          priority: rec.priority,
          category: rec.category,
          testType: rec.testType,
          suggestion: rec.suggestion,
          impact: rec.impact || 'N/A'
        });
      });

      // 格式化建议表头
      recommendationsSheet.getRow(1).font = { bold: true };
      recommendationsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
      recommendationsSheet.getRow(1).font = { color: { argb: 'FFFFFF' }, bold: true };

      // 根据优先级设置行颜色
      recommendationsSheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const priority = row.getCell(1).value;
          if (priority === '紧急') {
            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBEE' } };
          } else if (priority === '重要') {
            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E0' } };
          }
        }
      });
    }

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  /**
   * 生成Word文档 (简化版本，需要docx库)
   */
  async generateWordDocument(reportData) {
    const timestamp = Date.now();
    const fileName = `analysis_report_${timestamp}.docx`;
    const filePath = path.join(this.reportsDir, fileName);

    // 这里需要使用docx库来生成Word文档
    // 由于依赖较大，这里提供简化的HTML转换方案
    const _htmlContent = await this.generateEnhancedHTML(reportData);
    const htmlFileName = `temp_${timestamp}.html`;
    const _tempHtmlPath = path.join(this.reportsDir, htmlFileName);
    
    // 生成一个简化的Word兼容的HTML
    const wordCompatibleHtml = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
    <meta charset="UTF-8">
    <title>${reportData.metadata.title}</title>
    <style>
        body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 1in; }
        h1, h2, h3 { color: #333; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .metric { margin: 10px 0; padding: 10px; border-left: 3px solid #007acc; }
    </style>
</head>
<body>
    <h1>${reportData.metadata.title}</h1>
    <p>生成时间: ${new Date(reportData.metadata.generatedAt).toLocaleString('zh-CN')}</p>
    
    <h2>执行摘要</h2>
    <div class="metric">
        <strong>测试总数:</strong> ${reportData.analysis.summary.totalTests}<br>
        <strong>平均分数:</strong> ${reportData.analysis.summary.averageScore}<br>
        <strong>成功率:</strong> ${Math.round((reportData.analysis.summary.completedTests / reportData.analysis.summary.totalTests) * 100)}%
    </div>
    
    <h2>主要建议</h2>
    ${reportData.analysis.recommendations.critical.concat(reportData.analysis.recommendations.high).slice(0, 10).map(rec => `
        <div class="metric">
            <strong>${rec.category}:</strong> ${rec.suggestion}
        </div>
    `).join('')}
</body>
</html>
    `;

    await fs.writeFile(filePath.replace('.docx', '.html'), wordCompatibleHtml, 'utf8');
    
    // 这里应该使用专门的库将HTML转换为DOCX
    // 目前返回HTML路径作为临时解决方案
    return filePath.replace('.docx', '.html');
  }

  /**
   * 生成增强JSON报告
   */
  async generateEnhancedJSON(reportData) {
    const timestamp = Date.now();
    const fileName = `analysis_report_${timestamp}.json`;
    const filePath = path.join(this.reportsDir, fileName);

    const jsonReport = {
      metadata: reportData.metadata,
      template: reportData.templateConfig,
      branding: reportData.brandingOptions,
      analysis: reportData.analysis,
      rawData: reportData.testData,
      exports: {
        html: fileName.replace('.json', '.html'),
        pdf: fileName.replace('.json', '.pdf'),
        excel: fileName.replace('.json', '.xlsx')
      },
      generatedBy: 'Test-Web Report Generator v2.0'
    };

    await fs.writeFile(filePath, JSON.stringify(jsonReport, null, 2), 'utf8');
    return filePath;
  }

  /**
   * 获取可用模板列表
   */
  getAvailableTemplates() {
    return Object.keys(this.templates).map(key => ({
      key,
      ...this.templates[key]
    }));
  }

  /**
   * 获取支持的格式列表
   */
  getSupportedFormats() {
    return [
      { key: 'html', name: 'HTML报告', description: '适合在线查看的交互式报告' },
      { key: 'pdf', name: 'PDF文档', description: '适合打印和分享的标准格式' },
      { key: 'excel', name: 'Excel表格', description: '适合数据分析的电子表格' },
      { key: 'word', name: 'Word文档', description: '适合编辑的文档格式' },
      { key: 'json', name: 'JSON数据', description: '程序化处理的结构化数据' }
    ];
  }
}

ReportGenerator.prototype.generateReport = function (testData, options = {}) {
  return this.generateEnhancedReport(testData, options);
};

ReportGenerator.prototype.generateHTML = function (reportData) {
  return this.generateEnhancedHTML(reportData);
};

ReportGenerator.prototype.generatePDF = function (reportData) {
  return this.generateEnhancedPDF(reportData);
};

ReportGenerator.prototype.generateExcel = function (reportData) {
  return this.generateEnhancedExcel(reportData);
};

ReportGenerator.prototype.generateJSON = function (reportData) {
  return this.generateEnhancedJSON(reportData);
};

module.exports = ReportGenerator;
module.exports.EnhancedReportGenerator = ReportGenerator;
