/**
 * 报告路由
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;
const { automatedReportingService } = require('../services/reporting/AutomatedReportingService');
const { performanceBenchmarkService } = require('../services/performance/PerformanceBenchmarkService');
const ReportGenerator = require('../services/reporting/ReportGenerator');
const { query } = require('../config/database');

const router = express.Router();

// 报告类型
const REPORT_TYPES = {
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  SEO: 'seo',
  COMPREHENSIVE: 'comprehensive',
  STRESS_TEST: 'stress_test',
  API_TEST: 'api_test'
};

// 报告格式
const REPORT_FORMATS = {
  PDF: 'pdf',
  HTML: 'html',
  JSON: 'json',
  CSV: 'csv'
};

// 模拟数据库存储
const reports = [
  {
    id: '1',
    name: '网站性能报告 - 2025年1月',
    type: REPORT_TYPES.PERFORMANCE,
    format: REPORT_FORMATS.PDF,
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1天前
    completedAt: new Date(Date.now() - 86400000 + 300000).toISOString(), // 5分钟后完成
    fileSize: 2048576, // 2MB
    downloadCount: 5,
    config: {
      dateRange: '2025-01-01 to 2025-01-31',
      includeCharts: true,
      includeRecommendations: true
    }
  },
  {
    id: '2',
    name: '安全扫描报告',
    type: REPORT_TYPES.SECURITY,
    format: REPORT_FORMATS.HTML,
    status: 'generating',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1小时前
    completedAt: null,
    fileSize: null,
    downloadCount: 0,
    config: {
      includeVulnerabilities: true,
      includeFixes: true
    }
  }
];

/**
 * 获取报告列表
 * GET /api/reports
 */
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { type, status, format, page = 1, limit = 10 } = req.query;

    let filteredReports = [...reports];

    // 按类型过滤
    if (type) {
      filteredReports = filteredReports.filter(report => report.type === type);
    }

    // 按状态过滤
    if (status) {
      filteredReports = filteredReports.filter(report => report.status === status);
    }

    // 按格式过滤
    if (format) {
      filteredReports = filteredReports.filter(report => report.format === format);
    }

    // 分页
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedReports = filteredReports.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedReports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredReports.length,
        pages: Math.ceil(filteredReports.length / parseInt(limit))
      },
      supportedTypes: Object.values(REPORT_TYPES),
      supportedFormats: Object.values(REPORT_FORMATS)
    });
  } catch (error) {
    Logger.error('获取报告列表失败', error);
    res.serverError('获取报告列表失败');
  }
}));

/**
 * 生成报告
 * POST /api/reports/generate
 */
router.post('/generate', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { name, type, format = REPORT_FORMATS.PDF, config = {} } = req.body;

    // 验证必填字段
    if (!name || !type) {

      return res.validationError([], '报告名称和类型是必填的');
    }

    // 验证报告类型
    if (!Object.values(REPORT_TYPES).includes(type)) {
      return res.validationError([], '不支持的报告类型');
    }

    // 验证报告格式
    if (!Object.values(REPORT_FORMATS).includes(format)) {
      return res.validationError([], '不支持的报告格式');
    }

    // 创建新报告
    const newReport = {
      id: Date.now().toString(),
      name,
      type,
      format,
      status: 'generating',
      createdAt: new Date().toISOString(),
      completedAt: null,
      fileSize: null,
      downloadCount: 0,
      config
    };

    reports.push(newReport);

    // 模拟异步生成过程
    setTimeout(() => {
      const reportIndex = reports.findIndex(r => r.id === newReport.id);
      if (reportIndex !== -1) {
        reports[reportIndex].status = 'completed';
        reports[reportIndex].completedAt = new Date().toISOString();
        reports[reportIndex].fileSize = Math.floor(Math.random() * 5000000) + 1000000; // 1-5MB
      }
    }, 30000); // 30秒后完成

    Logger.info('开始生成报告', { reportId: newReport.id, type, format, name });

    res.status(201).json({
      success: true,
      data: newReport,
      message: '报告生成已开始，请稍后查看进度'
    });
  } catch (error) {
    Logger.error('生成报告失败', error);
    res.serverError('生成报告失败');
  }
}));

/**
 * 获取报告详情
 * GET /api/reports/:id
 */
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const report = reports.find(r => r.id === id);

    if (!report) {

      return res.notFound('资源', '报告不存在');
    }

    res.success(report);
  } catch (error) {
    Logger.error('获取报告详情失败', error);
    res.serverError('获取报告详情失败');
  }
}));

/**
 * 下载报告
 * GET /api/reports/:id/download
 */
router.get('/:id/download', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const report = reports.find(r => r.id === id);

    if (!report) {

      return res.notFound('资源', '报告不存在');
    }

    if (report.status !== 'completed') {

      return res.validationError([], '报告尚未生成完成');
    }

    // 增加下载次数
    report.downloadCount++;

    // 模拟文件下载
    const fileName = `${report.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.${report.format}`;

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Type', getContentType(report.format));

    // 返回模拟文件内容
    const content = generateMockReportContent(report);
    res.send(content);

    Logger.info('报告下载', { reportId: id, fileName });
  } catch (error) {
    Logger.error('下载报告失败', error);
    res.serverError('下载报告失败');
  }
}));

/**
 * 删除报告
 * DELETE /api/reports/:id
 */
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const reportIndex = reports.findIndex(r => r.id === id);

    if (reportIndex === -1) {

      return res.notFound('资源', '报告不存在');
    }

    const deletedReport = reports.splice(reportIndex, 1)[0];

    Logger.info('删除报告', { reportId: id, name: deletedReport.name });

    res.success('报告删除成功');
  } catch (error) {
    Logger.error('删除报告失败', error);
    res.serverError('删除报告失败');
  }
}));

/**
 * 获取内容类型
 */
function getContentType(format) {
  switch (format) {
    case REPORT_FORMATS.PDF:
      return 'application/pdf';
    case REPORT_FORMATS.HTML:
      return 'text/html';
    case REPORT_FORMATS.JSON:
      return 'application/json';
    case REPORT_FORMATS.CSV:
      return 'text/csv';
    default:
      return 'application/octet-stream';
  }
}

/**
 * 生成模拟报告内容
 */
function generateMockReportContent(report) {
  switch (report.format) {
    case REPORT_FORMATS.JSON:
      return JSON.stringify({
        reportId: report.id,
        name: report.name,
        type: report.type,
        generatedAt: report.completedAt,
        data: {
          summary: '这是一个模拟报告',
          metrics: {
            score: 85,
            issues: 3,
            recommendations: 5
          }
        }
      }, null, 2);

    case REPORT_FORMATS.CSV:
      return 'Metric,Value,Status/nPerformance Score,85,Good/nSecurity Score,92,Excellent/nSEO Score,78,Good';

    case REPORT_FORMATS.HTML:
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${report.name}</title>
          <style>body { font-family: Arial, sans-serif; margin: 40px; }</style>
        </head>
        <body>
          <h1>${report.name}</h1>
          <p>报告类型: ${report.type}</p>
          <p>生成时间: ${report.completedAt}</p>
          <p>这是一个模拟报告内容。</p>
        </body>
        </html>
      `;

    default:
      return `Mock ${report.format.toUpperCase()} report content for ${report.name}`;
  }
}

// ==================== 自动化报告功能 ====================

/**
 * 获取定时报告列表
 */
router.get('/scheduled', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const reports = automatedReportingService.getScheduledReports();

    res.success(reports);
  } catch (error) {
    Logger.error('获取定时报告列表失败', error);
    res.serverError('获取定时报告列表失败');
  }
}));

/**
 * 创建定时报告
 */
router.post('/scheduled', authMiddleware, asyncHandler(async (req, res) => {
  const {
    name,
    description,
    schedule,
    reportType,
    dataSource,
    filters = {},
    template = 'standard',
    recipients = [],
    format = 'pdf',
    enabled = true
  } = req.body;

  if (!name || !schedule || !reportType) {

    return res.validationError([], '缺少必要参数: name, schedule, reportType');
  }

  try {
    const reportId = await automatedReportingService.createScheduledReport({
      name,
      description,
      schedule,
      reportType,
      dataSource,
      filters,
      template,
      recipients,
      format,
      enabled,
      createdBy: req.user.id
    });

    Logger.info(`创建定时报告成功: ${name}`, { reportId, userId: req.user.id });

    res.json({
      success: true,
      data: { reportId },
      message: '定时报告创建成功'
    });
  } catch (error) {
    Logger.error('创建定时报告失败', error, { userId: req.user.id });
    res.serverError('创建定时报告失败');
  }
}));

/**
 * 立即执行报告
 */
router.post('/scheduled/:reportId/execute', authMiddleware, asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  try {
    await automatedReportingService.executeReportNow(reportId);

    Logger.info(`立即执行报告: ${reportId}`, { userId: req.user.id });

    res.success('报告执行已启动');
  } catch (error) {
    Logger.error('执行报告失败', error, { reportId, userId: req.user.id });
    res.serverError('执行报告失败');
  }
}));

/**
 * 获取报告模板列表
 */
router.get('/templates', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const templates = [
      {
        id: 'standard',
        name: '标准报告模板',
        description: '包含基本的测试结果和统计信息',
        features: ['测试摘要', '结果统计', '趋势图表', '基础建议']
      },
      {
        id: 'simple',
        name: '简洁报告模板',
        description: '简化的报告格式，突出关键指标',
        features: ['核心指标', '简要摘要']
      },
      {
        id: 'detailed',
        name: '详细报告模板',
        description: '全面的报告内容，包含详细分析',
        features: ['完整测试结果', '详细分析', '高级图表', '深度建议', '对比分析']
      }
    ];

    res.success(templates);
  } catch (error) {
    Logger.error('获取报告模板失败', error);
    res.serverError('获取报告模板失败');
  }
}));

// ==================== 性能基准测试功能 ====================

/**
 * 创建性能基准测试
 */
router.post('/performance/benchmarks', authMiddleware, asyncHandler(async (req, res) => {
  const {
    name,
    description,
    type,
    target,
    metrics,
    iterations = 5,
    warmupRuns = 2,
    options = {}
  } = req.body;

  if (!name || !type || !metrics) {

    return res.validationError([], '缺少必要参数: name, type, metrics');
  }

  try {
    const benchmarkId = await performanceBenchmarkService.createBenchmark({
      name,
      description,
      type,
      target,
      metrics,
      iterations,
      warmupRuns,
      options,
      createdBy: req.user.id
    });

    Logger.info(`创建性能基准测试成功: ${name}`, { benchmarkId, userId: req.user.id });

    res.json({
      success: true,
      data: { benchmarkId },
      message: '性能基准测试创建成功'
    });
  } catch (error) {
    Logger.error('创建性能基准测试失败', error, { userId: req.user.id });
    res.serverError('创建性能基准测试失败');
  }
}));

/**
 * 执行性能基准测试
 */
router.post('/performance/benchmarks/:benchmarkId/run', authMiddleware, asyncHandler(async (req, res) => {
  const { benchmarkId } = req.params;
  const options = req.body;

  try {
    const testResult = await performanceBenchmarkService.runBenchmark(benchmarkId, {
      ...options,
      executedBy: req.user.id
    });

    Logger.info(`执行性能基准测试: ${benchmarkId}`, { testId: testResult.id, userId: req.user.id });

    res.success(testResult);
  } catch (error) {
    Logger.error('执行性能基准测试失败', error, { benchmarkId, userId: req.user.id });
    res.serverError('执行性能基准测试失败');
  }
}));

/**
 * 设置性能基线
 */
router.post('/performance/baselines', authMiddleware, asyncHandler(async (req, res) => {
  const { benchmarkId, testResultId } = req.body;

  if (!benchmarkId || !testResultId) {

    return res.validationError([], '缺少必要参数: benchmarkId, testResultId');
  }

  try {
    const baseline = await performanceBenchmarkService.setBaseline(benchmarkId, testResultId);

    Logger.info(`设置性能基线: ${benchmarkId}`, { testResultId, userId: req.user.id });

    res.success(baseline);
  } catch (error) {
    Logger.error('设置性能基线失败', error, { benchmarkId, testResultId, userId: req.user.id });
    res.serverError('设置性能基线失败');
  }
}));

/**
 * 生成性能报告
 */
router.post('/performance/report', authMiddleware, asyncHandler(async (req, res) => {
  const {
    benchmarkIds,
    timeRange = '30d',
    includeBaselines = true,
    includeRecommendations = true
  } = req.body;

  try {
    const report = await performanceBenchmarkService.generatePerformanceReport({
      benchmarkIds,
      timeRange,
      includeBaselines,
      includeRecommendations
    });

    Logger.info('生成性能报告', { timeRange, userId: req.user.id });

    res.success(report);
  } catch (error) {
    Logger.error('生成性能报告失败', error, { userId: req.user.id });
    res.serverError('生成性能报告失败');
  }
}));

// ==================== 增强报告生成功能 ====================

/**
 * 生成增强报告
 * POST /api/reports/enhanced/generate
 */
router.post('/enhanced/generate', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const {
      template = 'technical',
      format = 'html',
      title = '测试分析报告',
      description = '',
      testIds = [],
      includeCharts = true,
      includeRecommendations = true,
      brandingOptions = {}
    } = req.body;

    // 验证必填字段
    if (!title.trim()) {
      return res.validationError([], '报告标题是必填的');
    }

    if (!testIds || testIds.length === 0) {
      return res.validationError([], '至少需要选择一个测试结果');
    }

    // 获取测试数据
    const testDataQuery = `
      SELECT 
        uuid,
        type,
        url,
        status,
        config,
        results,
        duration_ms,
        error_message,
        created_at,
        started_at,
        completed_at
      FROM tests 
      WHERE uuid = ANY($1) AND user_id = $2
      ORDER BY created_at DESC
    `;

    const testResult = await query(testDataQuery, [testIds, req.user.id]);
    const testData = testResult.rows;

    if (testData.length === 0) {
      return res.validationError([], '未找到指定的测试数据');
    }

    // 创建报告生成器实例
    const reportGenerator = new ReportGenerator();

    // 生成报告
    const reportResult = await reportGenerator.generateEnhancedReport(testData, {
      template,
      format,
      title,
      description,
      includeCharts,
      includeRecommendations,
      brandingOptions: {
        companyName: brandingOptions.companyName || 'Test-Web Platform',
        primaryColor: brandingOptions.primaryColor || '#2563eb',
        secondaryColor: brandingOptions.secondaryColor || '#64748b',
        includeWatermark: brandingOptions.includeWatermark || false,
        ...brandingOptions
      }
    });

    // 记录报告生成
    Logger.info('增强报告生成成功', {
      userId: req.user.id,
      template,
      format,
      testCount: testData.length,
      filePath: reportResult.filePath
    });

    // 返回报告信息
    res.success({
      reportId: `enhanced_${Date.now()}`,
      filePath: reportResult.filePath,
      metadata: reportResult.metadata,
      analysis: reportResult.analysis,
      downloadUrl: `/api/reports/enhanced/download/${path.basename(reportResult.filePath)}`,
      generatedAt: new Date().toISOString()
    }, '增强报告生成成功');

  } catch (error) {
    Logger.error('生成增强报告失败', error, { userId: req.user?.id });
    res.serverError('生成增强报告失败，请稍后重试');
  }
}));

/**
 * 获取增强报告生成器的可用模板
 * GET /api/reports/enhanced/templates
 */
router.get('/enhanced/templates', asyncHandler(async (req, res) => {
  try {
    const reportGenerator = new ReportGenerator();
    const templates = reportGenerator.getAvailableTemplates();
    const formats = reportGenerator.getSupportedFormats();

    res.success({
      templates,
      formats
    }, '获取模板列表成功');

  } catch (error) {
    Logger.error('获取增强报告模板失败', error);
    res.serverError('获取模板列表失败');
  }
}));

/**
 * 下载增强报告文件
 * GET /api/reports/enhanced/download/:filename
 */
router.get('/enhanced/download/:filename', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { filename } = req.params;
    const reportGenerator = new ReportGenerator();
    const filePath = path.join(reportGenerator.reportsDir, filename);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.notFound('资源', '报告文件不存在或已过期');
    }

    // 获取文件信息
    const stats = await fs.stat(filePath);
    const fileExt = path.extname(filename).toLowerCase();
    
    // 设置响应头
    let contentType = 'application/octet-stream';
    switch (fileExt) {
      case '.html':
        contentType = 'text/html';
        break;
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.xlsx':
      case '.xls':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.json':
        contentType = 'application/json';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // 流式传输文件
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);

    // 记录下载
    Logger.info('增强报告下载', {
      filename,
      fileSize: stats.size,
      userId: req.user.id
    });

  } catch (error) {
    Logger.error('下载增强报告失败', error, { userId: req.user?.id });
    res.serverError('下载报告失败');
  }
}));

/**
 * 批量生成报告
 * POST /api/reports/enhanced/batch
 */
router.post('/enhanced/batch', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { 
      reports, // 报告配置数组
      globalOptions = {} // 全局选项
    } = req.body;

    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      return res.validationError([], '请提供报告配置数组');
    }

    if (reports.length > 10) {
      return res.validationError([], '单次批量生成报告数量不能超过10个');
    }

    const reportGenerator = new ReportGenerator();
    const batchResults = [];
    const errors = [];

    // 逐个生成报告
    for (let i = 0; i < reports.length; i++) {
      const reportConfig = reports[i];
      try {
        // 获取测试数据
        const testDataQuery = `
          SELECT * FROM tests 
          WHERE uuid = ANY($1) AND user_id = $2
          ORDER BY created_at DESC
        `;

        const testResult = await query(testDataQuery, [reportConfig.testIds, req.user.id]);
        const testData = testResult.rows;

        if (testData.length > 0) {
          const result = await reportGenerator.generateEnhancedReport(testData, {
            ...globalOptions,
            ...reportConfig
          });

          batchResults.push({
            index: i,
            success: true,
            reportId: `enhanced_batch_${Date.now()}_${i}`,
            filePath: result.filePath,
            metadata: result.metadata
          });
        } else {
          errors.push({
            index: i,
            error: '未找到指定的测试数据',
            reportConfig
          });
        }
      } catch (error) {
        errors.push({
          index: i,
          error: error.message,
          reportConfig
        });
      }
    }

    Logger.info('批量生成增强报告完成', {
      userId: req.user.id,
      totalReports: reports.length,
      successCount: batchResults.length,
      errorCount: errors.length
    });

    res.success({
      summary: {
        total: reports.length,
        success: batchResults.length,
        failed: errors.length
      },
      results: batchResults,
      errors: errors.length > 0 ? errors : undefined
    }, `批量生成完成，成功 ${batchResults.length} 个，失败 ${errors.length} 个`);

  } catch (error) {
    Logger.error('批量生成增强报告失败', error, { userId: req.user?.id });
    res.serverError('批量生成报告失败');
  }
}));

module.exports = router;
