/**
 * 报告路由
 */

import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { getPool } from '../../config/database';
import Logger from '../../utils/logger';
const { authMiddleware } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const AutomatedReportingService = require('../../services/reporting/AutomatedReportingService');
const MonitoringService = require('../../services/monitoring/MonitoringService');

enum ReportType {
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  SEO = 'seo',
  COMPREHENSIVE = 'comprehensive',
  STRESS_TEST = 'stress_test',
  API_TEST = 'api_test',
}

enum ReportFormat {
  PDF = 'pdf',
  HTML = 'html',
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel',
}

interface ReportRequest {
  type: ReportType;
  format: ReportFormat;
  timeRange: string;
  filters?: Record<string, unknown>;
  options?: Record<string, unknown>;
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
}

interface Report {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  createdBy: string;
  filePath?: string;
  fileSize?: number;
  downloadCount: number;
  metadata: Record<string, unknown>;
  error?: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  template: string;
  variables: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    defaultValue?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface ReportStatistics {
  total: number;
  byType: Record<ReportType, number>;
  byFormat: Record<ReportFormat, number>;
  byStatus: Record<string, number>;
  averageGenerationTime: number;
  totalFileSize: number;
  popularReports: Array<{
    id: string;
    name: string;
    type: ReportType;
    downloadCount: number;
  }>;
}

const router = express.Router();

const monitoringService = new MonitoringService(getPool());
const automatedReportingService = new AutomatedReportingService();

// 模拟报告数据
const reports: Report[] = [
  {
    id: '1',
    name: '2025年1月性能报告',
    type: ReportType.PERFORMANCE,
    format: ReportFormat.PDF,
    status: 'completed',
    progress: 100,
    createdAt: new Date('2025-01-01'),
    completedAt: new Date('2025-01-01'),
    expiresAt: new Date('2025-02-01'),
    createdBy: 'admin',
    filePath: '/reports/performance_2025_01.pdf',
    fileSize: 2048576,
    downloadCount: 15,
    metadata: {
      timeRange: '2025-01',
      siteCount: 5,
      metrics: ['responseTime', 'throughput', 'errorRate', 'availability'],
    },
  },
  {
    id: '2',
    name: '2025年1月安全报告',
    type: ReportType.SECURITY,
    format: ReportFormat.HTML,
    status: 'completed',
    progress: 100,
    createdAt: new Date('2025-01-01'),
    completedAt: new Date('2025-01-02'),
    expiresAt: new Date('2025-02-02'),
    createdBy: 'admin',
    filePath: '/reports/security_2025_01.html',
    fileSize: 1024000,
    downloadCount: 8,
    metadata: {
      timeRange: '2025-01',
      vulnerabilityCount: 12,
      severity: { high: 3, medium: 7, low: 2 },
      categories: ['injection', 'xss', 'csrf', 'authentication'],
    },
  },
];

// 模拟报告模板
const reportTemplates: ReportTemplate[] = [
  {
    id: '1',
    name: '性能报告模板',
    type: ReportType.PERFORMANCE,
    description: '标准性能分析报告模板',
    template: 'performance_template.html',
    variables: [
      { name: 'siteName', type: 'string', description: '网站名称', required: true },
      { name: 'timeRange', type: 'string', description: '时间范围', required: true },
      { name: 'metrics', type: 'array', description: '性能指标', required: true },
      { name: 'thresholds', type: 'object', description: '阈值设置', required: false },
    ],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin',
  },
  {
    id: '2',
    name: '安全报告模板',
    type: ReportType.SECURITY,
    description: '安全漏洞分析报告模板',
    template: 'security_template.html',
    variables: [
      { name: 'siteName', type: 'string', description: '网站名称', required: true },
      { name: 'scanDate', type: 'string', description: '扫描日期', required: true },
      { name: 'vulnerabilities', type: 'array', description: '漏洞列表', required: true },
      { name: 'riskLevel', type: 'string', description: '风险等级', required: false },
    ],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin',
  },
];

/**
 * GET /api/system/reports
 * 获取报告列表
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { type, format, status, page = 1, limit = 20 } = req.query;
    const userId = (req as any).user.id;

    try {
      let filteredReports = [...reports];

      // 按类型过滤
      if (type) {
        filteredReports = filteredReports.filter(report => report.type === type);
      }

      // 按格式过滤
      if (format) {
        filteredReports = filteredReports.filter(report => report.format === format);
      }

      // 按状态过滤
      if (status) {
        filteredReports = filteredReports.filter(report => report.status === status);
      }

      // 按用户过滤
      filteredReports = filteredReports.filter(report => report.createdBy === userId);

      // 排序
      filteredReports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // 分页
      const pageNumber = Number(page) || 1;
      const limitNumber = Number(limit) || 20;
      const startIndex = (pageNumber - 1) * limitNumber;
      const endIndex = startIndex + limitNumber;
      const paginatedReports = filteredReports.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          reports: paginatedReports,
          pagination: {
            page: pageNumber,
            limit: limitNumber,
            total: filteredReports.length,
            totalPages: Math.ceil(filteredReports.length / limitNumber),
          },
          summary: {
            total: reports.length,
            byType: reports.reduce(
              (acc, report) => {
                acc[report.type] = (acc[report.type] || 0) + 1;
                return acc;
              },
              {} as Record<ReportType, number>
            ),
            byFormat: reports.reduce(
              (acc, report) => {
                acc[report.format] = (acc[report.format] || 0) + 1;
                return acc;
              },
              {} as Record<ReportFormat, number>
            ),
            byStatus: reports.reduce(
              (acc, report) => {
                acc[report.status] = (acc[report.status] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            ),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取报告列表失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/reports/:id
 * 获取单个报告详情
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    try {
      const report = reports.find(r => r.id === id);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: '报告不存在',
        });
      }

      // 检查权限
      if (report.createdBy !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权访问此报告',
        });
      }

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取报告详情失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/reports
 * 创建报告
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const reportRequest: ReportRequest = req.body;

    if (!reportRequest.type || !reportRequest.format) {
      return res.status(400).json({
        success: false,
        message: '报告类型和格式是必需的',
      });
    }

    try {
      const newReport: Report = {
        id: Date.now().toString(),
        name: `${reportRequest.type}_${new Date().toISOString().split('T')[0]}报告`,
        type: reportRequest.type,
        format: reportRequest.format,
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        createdBy: userId,
        downloadCount: 0,
        metadata: {
          timeRange: reportRequest.timeRange,
          filters: reportRequest.filters || {},
          options: reportRequest.options || {},
          schedule: reportRequest.schedule,
        },
      };

      reports.push(newReport);

      // 异步生成报告
      generateReport(newReport.id, reportRequest);

      return res.status(201).json({
        success: true,
        message: '报告创建成功，正在生成中',
        data: newReport,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '创建报告失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/reports/:id/download
 * 下载报告
 */
router.get(
  '/:id/download',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    try {
      const report = reports.find(r => r.id === id);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: '报告不存在',
        });
      }

      if (report.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: '报告尚未生成完成',
        });
      }

      if (report.createdBy !== (req as any).user.id) {
        return res.status(403).json({
          success: false,
          message: '无权下载此报告',
        });
      }

      if (!report.filePath) {
        return res.status(404).json({
          success: false,
          message: '报告文件不存在',
        });
      }

      // 检查文件是否存在
      try {
        await fs.access(report.filePath);
      } catch {
        return res.status(404).json({
          success: false,
          message: '报告文件不存在',
        });
      }

      // 更新下载次数
      report.downloadCount++;

      // 设置下载响应头
      const fileName = path.basename(report.filePath);
      Logger.info('报告下载', { reportId: id, userId, fileName });
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      // 发送文件
      return res.sendFile(report.filePath);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '下载报告失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * DELETE /api/system/reports/:id
 * 删除报告
 */
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    try {
      const reportIndex = reports.findIndex(r => r.id === id);

      if (reportIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '报告不存在',
        });
      }

      const report = reports[reportIndex];

      // 检查权限
      if (report.createdBy !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权删除此报告',
        });
      }

      // 删除文件
      if (report.filePath) {
        try {
          await fs.unlink(report.filePath);
        } catch (error) {
          Logger.error('删除报告文件失败', { error, filePath: report.filePath });
        }
      }

      // 从列表中删除
      reports.splice(reportIndex, 1);

      Logger.info('报告删除', { reportId: id, userId, reportName: report.name });

      res.json({
        success: true,
        message: '报告删除成功',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '删除报告失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/reports/templates
 * 获取报告模板列表
 */
router.get(
  '/templates',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const { type } = req.query;

      let filteredTemplates = [...reportTemplates];

      if (type) {
        filteredTemplates = filteredTemplates.filter(template => template.type === type);
      }

      return res.json({
        success: true,
        data: filteredTemplates,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取报告模板失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/reports/templates
 * 创建报告模板
 */
router.post(
  '/templates',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const { name, type, description, template, variables } = req.body;

    if (!name || !type || !template) {
      return res.status(400).json({
        success: false,
        message: '模板名称、类型和模板内容是必需的',
      });
    }

    try {
      const newTemplate: ReportTemplate = {
        id: Date.now().toString(),
        name,
        type: type as ReportType,
        description,
        template,
        variables: variables || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
      };

      reportTemplates.push(newTemplate);

      return res.status(201).json({
        success: true,
        message: '报告模板创建成功',
        data: newTemplate,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '创建报告模板失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/reports/statistics
 * 获取报告统计
 */
router.get(
  '/statistics',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const _timeRange = req.query.timeRange || '30d';

    try {
      const statistics: ReportStatistics = {
        total: reports.length,
        byType: reports.reduce(
          (acc, report) => {
            acc[report.type] = (acc[report.type] || 0) + 1;
            return acc;
          },
          {} as Record<ReportType, number>
        ),
        byFormat: reports.reduce(
          (acc, report) => {
            acc[report.format] = (acc[report.format] || 0) + 1;
            return acc;
          },
          {} as Record<ReportFormat, number>
        ),
        byStatus: reports.reduce(
          (acc, report) => {
            acc[report.status] = (acc[report.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        averageGenerationTime:
          reports
            .filter(r => r.completedAt)
            .reduce(
              (sum, report) => sum + (report.completedAt!.getTime() - report.createdAt.getTime()),
              0
            ) / reports.filter(r => r.completedAt).length,
        totalFileSize: reports.reduce((sum, report) => sum + (report.fileSize || 0), 0),
        popularReports: reports
          .sort((a, b) => b.downloadCount - a.downloadCount)
          .slice(0, 10)
          .map(report => ({
            id: report.id,
            name: report.name,
            type: report.type,
            downloadCount: report.downloadCount,
          })),
      };

      return res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取报告统计失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/reports/:id/schedule
 * 设置报告定时生成
 */
router.post(
  '/:id/schedule',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { enabled, frequency, recipients } = req.body;
    const userId = (req as any).user.id;

    try {
      const reportIndex = reports.findIndex(r => r.id === id);

      if (reportIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '报告不存在',
        });
      }

      const report = reports[reportIndex];

      // 检查权限
      if (report.createdBy !== userId) {
        return res.status(403).json({
          success: false,
          message: '无权设置此报告的定时任务',
        });
      }

      // 更新定时设置
      const metadata = report.metadata as Record<string, unknown> & {
        schedule?: { enabled: boolean; frequency: string; recipients: string[] };
      };

      if (metadata.schedule) {
        metadata.schedule.enabled = enabled;
        metadata.schedule.frequency = frequency;
        metadata.schedule.recipients = recipients;
      } else {
        metadata.schedule = {
          enabled,
          frequency: frequency || 'weekly',
          recipients: recipients || [],
        };
      }

      // 如果启用了定时任务，设置定时器
      if (enabled && monitoringService) {
        await automatedReportingService.scheduleReport(id, frequency);
      }

      return res.json({
        success: true,
        message: '定时任务设置成功',
        data: metadata.schedule,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '设置定时任务失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/reports/export
 * 导出报告数据
 */
router.get(
  '/export',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { format = 'json', type: _type } = req.query as { format?: string; type?: string };

    try {
      let data: unknown;

      switch (format) {
        case 'json':
          data = reports;
          break;
        case 'csv':
          data = reports.map(report => ({
            id: report.id,
            name: report.name,
            type: report.type,
            format: report.format,
            status: report.status,
            createdAt: report.createdAt,
            createdBy: report.createdBy,
            downloadCount: report.downloadCount,
          }));
          break;
        default:
          return res.status(400).json({
            success: false,
            message: '不支持的导出格式',
          });
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="reports.${format}"`);

      return res.send(JSON.stringify(data, null, 2));
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '导出报告数据失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

// 异步生成报告的函数
async function generateReport(reportId: string, _request: ReportRequest): Promise<void> {
  const report = reports.find(r => r.id === reportId);

  if (!report) return;

  try {
    // 更新状态为生成中
    report.status = 'generating';
    report.progress = 0;

    // 模拟生成过程
    const steps = [
      { progress: 10, message: '收集数据中...' },
      { progress: 30, message: '分析数据中...' },
      { progress: 60, message: '生成报告中...' },
      { progress: 90, message: '保存报告中...' },
      { progress: 100, message: '完成' },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      report.progress = step.progress;
      report.status = step.progress === 100 ? 'completed' : 'generating';
    }

    // 生成文件路径
    const fileName = `${report.type}_${report.id}.${report.format}`;
    const filePath = path.join(process.cwd(), 'reports', fileName);

    // 确保目录存在
    const reportsDir = path.dirname(filePath);
    try {
      await fs.mkdir(reportsDir, { recursive: true });
    } catch {
      // 目录可能已存在
    }

    // 模拟生成文件
    await fs.writeFile(filePath, `报告内容 - ${report.name}`);

    // 更新报告信息
    report.status = 'completed';
    report.completedAt = new Date();
    report.filePath = filePath;
    report.fileSize = 1024; // 模拟文件大小

    Logger.info('报告生成完成', { reportId, fileName });
  } catch (error) {
    report.status = 'failed';
    report.error = error instanceof Error ? error.message : String(error);
    Logger.error('报告生成失败', { reportId, error });
  }
}

export default router;
