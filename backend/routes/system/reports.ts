/**
 * 报告路由
 */

import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { query } from '../../config/database';
import type { ReportTemplate as ServiceReportTemplate } from '../../services/reporting/AutomatedReportingService';
import Logger from '../../utils/logger';
const { authMiddleware } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const AutomatedReportingService = require('../../services/reporting/AutomatedReportingService');

type AuthRequest = express.Request & {
  user: {
    id: string;
  };
};

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

const automatedReportingService = new AutomatedReportingService();

const ensureReportingInitialized = async () => {
  await automatedReportingService.initialize();
};

/**
 * GET /api/system/reports
 * 获取报告列表
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { type, format, status, page = 1, limit = 20 } = req.query;
    const userId = (req as AuthRequest).user.id;

    try {
      const pageNumber = Number(page) || 1;
      const limitNumber = Number(limit) || 20;
      const offset = (pageNumber - 1) * limitNumber;

      const filters: string[] = ['te.user_id = $1'];
      const params: Array<string | number> = [userId];
      if (type) {
        params.push(type as string);
        filters.push(`tr.report_data -> 'metadata' ->> 'type' = $${params.length}`);
      }
      if (format) {
        params.push(format as string);
        filters.push(`tr.format = $${params.length}`);
      }
      const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

      const listResult = await query(
        `SELECT
           tr.id,
           tr.report_type,
           tr.format,
           tr.generated_at,
           tr.file_path,
           tr.file_size,
           tr.report_data,
           te.test_id,
           te.user_id
         FROM test_reports tr
         LEFT JOIN test_executions te ON te.id = tr.execution_id
         ${whereClause}
         ORDER BY tr.generated_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitNumber, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*)::int AS total
         FROM test_reports tr
         LEFT JOIN test_executions te ON te.id = tr.execution_id
         ${whereClause}`,
        params
      );

      const reportRows = listResult.rows || [];
      const mappedReports = reportRows
        .map(row => mapReportRow(row, userId, status as string | undefined))
        .filter(report => report !== null);

      const summaryByType: Record<ReportType, number> = {
        [ReportType.PERFORMANCE]: 0,
        [ReportType.SECURITY]: 0,
        [ReportType.SEO]: 0,
        [ReportType.COMPREHENSIVE]: 0,
        [ReportType.STRESS_TEST]: 0,
        [ReportType.API_TEST]: 0,
      };
      const summaryByFormat: Record<ReportFormat, number> = {
        [ReportFormat.PDF]: 0,
        [ReportFormat.HTML]: 0,
        [ReportFormat.JSON]: 0,
        [ReportFormat.CSV]: 0,
        [ReportFormat.EXCEL]: 0,
      };
      const summaryByStatus: Record<string, number> = {};

      mappedReports.forEach(report => {
        summaryByType[report.type] = (summaryByType[report.type] || 0) + 1;
        summaryByFormat[report.format] = (summaryByFormat[report.format] || 0) + 1;
        summaryByStatus[report.status] = (summaryByStatus[report.status] || 0) + 1;
      });

      return res.json({
        success: true,
        data: {
          reports: mappedReports,
          pagination: {
            page: pageNumber,
            limit: limitNumber,
            total: Number(countResult.rows[0]?.total) || 0,
            totalPages: Math.ceil((Number(countResult.rows[0]?.total) || 0) / limitNumber),
          },
          summary: {
            total: Number(countResult.rows[0]?.total) || 0,
            byType: summaryByType,
            byFormat: summaryByFormat,
            byStatus: summaryByStatus,
          },
        },
      });
    } catch (error) {
      return res.status(500).json({
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
    const userId = (req as AuthRequest).user.id;

    try {
      const reportResult = await query(
        `SELECT
           tr.id,
           tr.report_type,
           tr.format,
           tr.generated_at,
           tr.file_path,
           tr.file_size,
           tr.report_data,
           te.test_id,
           te.user_id
         FROM test_reports tr
         LEFT JOIN test_executions te ON te.id = tr.execution_id
         WHERE tr.id = $1`,
        [id]
      );

      const reportRow = reportResult.rows[0];
      const report = reportRow ? mapReportRow(reportRow, userId) : null;

      if (!report) {
        return res.status(404).json({
          success: false,
          message: '报告不存在',
        });
      }

      return res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      return res.status(500).json({
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
    const userId = (req as AuthRequest).user.id;
    const reportRequest: ReportRequest = req.body;

    if (!reportRequest.type || !reportRequest.format) {
      return res.status(400).json({
        success: false,
        message: '报告类型和格式是必需的',
      });
    }

    try {
      await ensureReportingInitialized();

      const templates =
        (await automatedReportingService.getAllTemplates()) as ServiceReportTemplate[];
      const matchedTemplate = templates.find(
        template => mapReportCategory(template.category) === reportRequest.type
      );

      if (!matchedTemplate) {
        return res.status(400).json({
          success: false,
          message: '未找到匹配的报告模板',
        });
      }

      const configId = await automatedReportingService.createConfig({
        name: `${reportRequest.type}_${new Date().toISOString().split('T')[0]}报告`,
        description: `${reportRequest.type} 报告`,
        templateId: matchedTemplate.id,
        schedule: {
          type: 'once',
        },
        recipients: (reportRequest.schedule?.recipients || []).map((address, index) => ({
          id: `${userId}_${index}`,
          type: 'email',
          address,
          enabled: true,
        })),
        filters: buildReportFilters(reportRequest.filters || {}),
        format: {
          type: reportRequest.format,
          options: {
            includeCharts: reportRequest.options?.includeCharts as boolean | undefined,
            includeRawData: reportRequest.options?.includeRawData as boolean | undefined,
          },
        },
        delivery: {
          method: reportRequest.schedule?.recipients?.length ? 'email' : 'storage',
          settings: {
            email: reportRequest.schedule?.recipients?.length
              ? {
                  subject: `${reportRequest.type} 报告`,
                  body: '请查收报告附件',
                  attachments: true,
                }
              : undefined,
          },
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const instanceId = await automatedReportingService.generateReport(configId);
      const instance = await automatedReportingService.getReportInstance(instanceId);

      const createdReport: Report = {
        id: instance?.metadata?.reportRecordId
          ? String(instance.metadata.reportRecordId)
          : instanceId,
        name: `${reportRequest.type}_${new Date().toISOString().split('T')[0]}报告`,
        type: reportRequest.type,
        format: reportRequest.format,
        status: instance?.status === 'failed' ? 'failed' : 'completed',
        progress: 100,
        createdAt: instance?.generatedAt || new Date(),
        completedAt: instance?.completedAt,
        createdBy: userId,
        filePath: instance?.path,
        fileSize: instance?.size,
        downloadCount: 0,
        metadata: {
          timeRange: reportRequest.timeRange,
          filters: reportRequest.filters || {},
          options: reportRequest.options || {},
          schedule: reportRequest.schedule,
          instanceId,
          configId,
        },
        error: instance?.error,
      };

      return res.status(201).json({
        success: true,
        message: '报告创建成功',
        data: createdReport,
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
    const userId = (req as AuthRequest).user.id;

    try {
      const reportResult = await query(
        `SELECT
           tr.id,
           tr.file_path,
           tr.format,
           tr.report_data,
           tr.file_size,
           tr.generated_at,
           te.user_id
         FROM test_reports tr
         LEFT JOIN test_executions te ON te.id = tr.execution_id
         WHERE tr.id = $1`,
        [id]
      );

      const reportRow = reportResult.rows[0];
      if (!reportRow) {
        return res.status(404).json({
          success: false,
          message: '报告不存在',
        });
      }

      if (String(reportRow.user_id) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: '无权下载此报告',
        });
      }

      const report = mapReportRow(reportRow, userId);
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

      // 设置下载响应头
      const fileName = path.basename(report.filePath);
      Logger.info('报告下载', { reportId: id, userId, fileName });
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      // 发送文件
      return res.sendFile(report.filePath);
    } catch (error) {
      return res.status(500).json({
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
    const userId = (req as AuthRequest).user.id;

    try {
      const reportResult = await query(
        `SELECT tr.file_path, te.user_id
         FROM test_reports tr
         LEFT JOIN test_executions te ON te.id = tr.execution_id
         WHERE tr.id = $1`,
        [id]
      );

      const reportRow = reportResult.rows[0];
      if (!reportRow) {
        return res.status(404).json({
          success: false,
          message: '报告不存在',
        });
      }

      if (String(reportRow.user_id) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: '无权删除此报告',
        });
      }

      if (reportRow.file_path) {
        try {
          await fs.unlink(reportRow.file_path);
        } catch (error) {
          Logger.error('删除报告文件失败', { error, filePath: reportRow.file_path });
        }
      }

      await query('DELETE FROM test_reports WHERE id = $1', [id]);

      Logger.info('报告删除', { reportId: id, userId });

      return res.json({
        success: true,
        message: '报告删除成功',
      });
    } catch (error) {
      return res.status(500).json({
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
      await ensureReportingInitialized();

      let templates =
        (await automatedReportingService.getAllTemplates()) as ServiceReportTemplate[];
      if (type) {
        templates = templates.filter(
          template => mapReportCategory(template.category) === (type as ReportType)
        );
      }

      const mapped = templates.map(template => ({
        id: template.id,
        name: template.name,
        type: mapReportCategory(template.category),
        description: template.description,
        template: template.template,
        variables: template.variables.map(variable => ({
          name: variable.name,
          type: variable.type,
          description: variable.description,
          required: variable.required,
          defaultValue: variable.defaultValue ? String(variable.defaultValue) : undefined,
        })),
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        createdBy: 'system',
      }));

      return res.json({
        success: true,
        data: mapped,
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
    const userId = (req as AuthRequest).user.id;
    const { name, type, description, template, variables } = req.body;

    if (!name || !type || !template) {
      return res.status(400).json({
        success: false,
        message: '模板名称、类型和模板内容是必需的',
      });
    }

    try {
      await ensureReportingInitialized();

      const templateId = await automatedReportingService.createTemplate({
        name,
        description,
        category: mapReportTypeToCategory(type as ReportType),
        type: 'summary',
        format: 'html',
        template,
        variables: (variables || []).map((variable: ReportTemplate['variables'][number]) => ({
          name: variable.name,
          type: (variable.type || 'string') as
            | 'string'
            | 'number'
            | 'boolean'
            | 'date'
            | 'array'
            | 'object',
          description: variable.description || '',
          required: variable.required ?? false,
          defaultValue: variable.defaultValue,
        })),
        sections: [
          {
            id: 'summary',
            name: '摘要',
            type: 'summary',
            order: 1,
            content: template,
          },
        ],
        styling: {
          theme: 'light',
          colors: {
            primary: '#1d4ed8',
            secondary: '#64748b',
            accent: '#22c55e',
            background: '#ffffff',
            text: '#0f172a',
          },
          fonts: {
            heading: 'Inter',
            body: 'Inter',
            code: 'Fira Code',
          },
          layout: {
            pageSize: 'A4',
            orientation: 'portrait',
            margins: {
              top: 40,
              right: 32,
              bottom: 40,
              left: 32,
            },
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const createdTemplate = await automatedReportingService.getTemplate(templateId);

      return res.status(201).json({
        success: true,
        message: '报告模板创建成功',
        data: createdTemplate
          ? {
              id: createdTemplate.id,
              name: createdTemplate.name,
              type: mapReportCategory(createdTemplate.category),
              description: createdTemplate.description,
              template: createdTemplate.template,
              variables: createdTemplate.variables,
              createdAt: createdTemplate.createdAt,
              updatedAt: createdTemplate.updatedAt,
              createdBy: userId,
            }
          : null,
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
    const userId = (req as AuthRequest).user.id;

    try {
      const statsResult = await query(
        `SELECT
           tr.id,
           tr.report_type,
           tr.format,
           tr.file_size,
           tr.generated_at,
           tr.report_data
         FROM test_reports tr
         LEFT JOIN test_executions te ON te.id = tr.execution_id
         WHERE te.user_id = $1`,
        [userId]
      );

      const reportRows = statsResult.rows || [];
      const byType: Record<ReportType, number> = {
        [ReportType.PERFORMANCE]: 0,
        [ReportType.SECURITY]: 0,
        [ReportType.SEO]: 0,
        [ReportType.COMPREHENSIVE]: 0,
        [ReportType.STRESS_TEST]: 0,
        [ReportType.API_TEST]: 0,
      };
      const byFormat: Record<ReportFormat, number> = {
        [ReportFormat.PDF]: 0,
        [ReportFormat.HTML]: 0,
        [ReportFormat.JSON]: 0,
        [ReportFormat.CSV]: 0,
        [ReportFormat.EXCEL]: 0,
      };
      const byStatus: Record<string, number> = {};
      let totalSize = 0;

      reportRows.forEach(row => {
        const mapped = mapReportRow(row, userId);
        if (!mapped) return;
        byType[mapped.type] = (byType[mapped.type] || 0) + 1;
        byFormat[mapped.format] = (byFormat[mapped.format] || 0) + 1;
        byStatus[mapped.status] = (byStatus[mapped.status] || 0) + 1;
        totalSize += Number(row.file_size) || 0;
      });

      const statistics: ReportStatistics = {
        total: reportRows.length,
        byType,
        byFormat,
        byStatus,
        averageGenerationTime: 0,
        totalFileSize: totalSize,
        popularReports: reportRows.slice(0, 10).map(row => ({
          id: String(row.id),
          name: `报告_${row.id}`,
          type: mapReportTypeFromRow(row),
          downloadCount: 0,
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
    const { enabled, frequency, recipients } = req.body as {
      enabled?: boolean;
      frequency?: 'daily' | 'weekly' | 'monthly';
      recipients?: string[];
    };
    const userId = (req as AuthRequest).user.id;

    try {
      await ensureReportingInitialized();

      const reportResult = await query(
        `SELECT tr.report_data, te.user_id
         FROM test_reports tr
         LEFT JOIN test_executions te ON te.id = tr.execution_id
         WHERE tr.id = $1`,
        [id]
      );

      const reportRow = reportResult.rows[0];
      if (!reportRow) {
        return res.status(404).json({
          success: false,
          message: '报告不存在',
        });
      }

      if (String(reportRow.user_id) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: '无权设置此报告的定时任务',
        });
      }

      const reportData = reportRow.report_data as { metadata?: { templateId?: string } };
      if (!reportData?.metadata?.templateId) {
        return res.status(400).json({
          success: false,
          message: '报告缺少模板信息，无法设置定时任务',
        });
      }

      const configId = await automatedReportingService.createConfig({
        name: `scheduled_${id}`,
        description: '定时报告',
        templateId: reportData.metadata.templateId,
        schedule: {
          type: 'recurring',
          cronExpression: mapFrequencyToCron(frequency ?? 'weekly'),
        },
        recipients: (recipients || []).map((address, index) => ({
          id: `${userId}_${index}`,
          type: 'email',
          address,
          enabled: true,
        })),
        filters: [],
        format: {
          type: 'pdf',
          options: {},
        },
        delivery: {
          method: recipients?.length ? 'email' : 'storage',
          settings: {
            email: recipients?.length
              ? {
                  subject: '定时报表',
                  body: '请查收报告附件',
                  attachments: true,
                }
              : undefined,
          },
        },
        enabled: Boolean(enabled),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (enabled) {
        await automatedReportingService.scheduleReport(configId);
      }

      return res.json({
        success: true,
        message: '定时任务设置成功',
        data: {
          enabled,
          frequency,
          recipients: recipients || [],
          configId,
        },
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
    const { format = 'json' } = req.query as { format?: string };
    const userId = (req as AuthRequest).user.id;

    try {
      const reportResult = await query(
        `SELECT
           tr.id,
           tr.report_type,
           tr.format,
           tr.generated_at,
           tr.file_size,
           te.test_id
         FROM test_reports tr
         LEFT JOIN test_executions te ON te.id = tr.execution_id
         WHERE te.user_id = $1`,
        [userId]
      );

      const rows = reportResult.rows || [];
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="reports.json"');
        return res.send(JSON.stringify(rows, null, 2));
      }

      if (format === 'csv') {
        const headers = ['id', 'report_type', 'format', 'generated_at', 'file_size', 'test_id'];
        const csvRows = [headers.join(',')];
        rows.forEach(row => {
          const values = headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            const valueString = String(value);
            return valueString.includes(',') ? `"${valueString.replace(/"/g, '""')}"` : valueString;
          });
          csvRows.push(values.join(','));
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="reports.csv"');
        return res.send(csvRows.join('\n'));
      }

      return res.status(400).json({
        success: false,
        message: '不支持的导出格式',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '导出报告数据失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

const mapReportCategory = (category: string): ReportType => {
  switch (category) {
    case 'performance':
      return ReportType.PERFORMANCE;
    case 'security':
      return ReportType.SECURITY;
    case 'seo':
      return ReportType.SEO;
    case 'analytics':
      return ReportType.COMPREHENSIVE;
    default:
      return ReportType.COMPREHENSIVE;
  }
};

const mapReportTypeToCategory = (
  type: ReportType
): 'performance' | 'security' | 'seo' | 'analytics' | 'custom' => {
  switch (type) {
    case ReportType.PERFORMANCE:
      return 'performance';
    case ReportType.SECURITY:
      return 'security';
    case ReportType.SEO:
      return 'seo';
    case ReportType.COMPREHENSIVE:
      return 'analytics';
    default:
      return 'custom';
  }
};

const mapReportFormat = (format: string): ReportFormat => {
  switch (format) {
    case 'pdf':
      return ReportFormat.PDF;
    case 'html':
      return ReportFormat.HTML;
    case 'json':
      return ReportFormat.JSON;
    case 'csv':
      return ReportFormat.CSV;
    case 'excel':
      return ReportFormat.EXCEL;
    default:
      return ReportFormat.JSON;
  }
};

const mapReportTypeFromRow = (row: Record<string, unknown>): ReportType => {
  const metadata = row.report_data as { metadata?: { type?: string } } | undefined;
  if (
    metadata?.metadata?.type &&
    Object.values(ReportType).includes(metadata.metadata.type as ReportType)
  ) {
    return metadata.metadata.type as ReportType;
  }
  return ReportType.COMPREHENSIVE;
};

const mapReportRow = (
  row: Record<string, unknown>,
  userId: string,
  statusFilter?: string
): Report | null => {
  if (row.user_id && String(row.user_id) !== String(userId)) {
    return null;
  }

  const status: Report['status'] = 'completed';
  if (statusFilter && statusFilter !== status) {
    return null;
  }

  const reportType = mapReportTypeFromRow(row);
  const metadata = row.report_data || {};

  return {
    id: String(row.id),
    name: `报告_${row.id}`,
    type: reportType,
    format: mapReportFormat(String(row.format || 'json')),
    status,
    progress: 100,
    createdAt: row.generated_at ? new Date(row.generated_at as string | number | Date) : new Date(),
    completedAt: row.generated_at
      ? new Date(row.generated_at as string | number | Date)
      : undefined,
    createdBy: String(row.user_id || userId),
    filePath: row.file_path ? String(row.file_path) : undefined,
    fileSize: row.file_size ? Number(row.file_size) : undefined,
    downloadCount: 0,
    metadata:
      typeof metadata === 'object' && metadata !== null
        ? (metadata as Record<string, unknown>)
        : {},
  };
};

const buildReportFilters = (filters: Record<string, unknown>) =>
  Object.entries(filters).map(([field, value]) => ({
    field,
    operator: 'equals' as const,
    value,
    enabled: true,
  }));

const mapFrequencyToCron = (frequency: string) => {
  switch (frequency) {
    case 'daily':
      return '0 2 * * *';
    case 'monthly':
      return '0 3 1 * *';
    default:
      return '0 3 * * 1';
  }
};

export default router;
