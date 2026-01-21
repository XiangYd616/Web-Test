/**
 * 报告路由
 */

import crypto from 'crypto';
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
  duration?: number;
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

const hashPassword = (password: string) =>
  crypto.createHash('sha256').update(password).digest('hex');

const buildShareDownloadUrl = (token: string) => `/api/system/reports/share/${token}/download`;

const validateShareAccess = (
  share: Record<string, unknown>,
  ip: string,
  password: string,
  requiredPermission: 'view' | 'download'
) => {
  if (share.is_active === false) {
    return { allowed: false, message: '分享已失效' };
  }

  if (share.expires_at && new Date(String(share.expires_at)) < new Date()) {
    return { allowed: false, message: '分享已过期' };
  }

  const maxAccess = share.max_access_count ? Number(share.max_access_count) : null;
  const currentAccess = share.current_access_count ? Number(share.current_access_count) : 0;
  if (maxAccess !== null && currentAccess >= maxAccess) {
    return { allowed: false, message: '访问次数已达上限' };
  }

  const allowedIps = Array.isArray(share.allowed_ips) ? share.allowed_ips : [];
  if (allowedIps.length > 0 && !allowedIps.includes(ip)) {
    return { allowed: false, message: 'IP 不在允许范围内' };
  }

  if (share.password_hash) {
    if (!password || hashPassword(password) !== String(share.password_hash)) {
      return { allowed: false, message: '访问密码错误' };
    }
  }

  const permissions = Array.isArray(share.permissions) ? share.permissions : [];
  if (!permissions.includes(requiredPermission)) {
    return { allowed: false, message: '无访问权限' };
  }

  return { allowed: true, message: '' };
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
           te.user_id,
           ri.status AS instance_status,
           ri.duration AS instance_duration,
           COALESCE(al.download_count, 0) AS download_count
         FROM test_reports tr
         LEFT JOIN test_executions te ON te.id = tr.execution_id
         LEFT JOIN report_instances ri ON ri.report_id = tr.id
         LEFT JOIN (
           SELECT report_id, COUNT(*)::int AS download_count
           FROM report_access_logs
           WHERE access_type = 'download' AND success = true
           GROUP BY report_id
         ) al ON al.report_id = tr.id
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
 * DELETE /api/system/reports/share-emails/:id
 * 删除分享邮件记录
 */
router.delete(
  '/share-emails/:id',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as AuthRequest).user.id;
    const { id } = req.params;

    try {
      const ownership = await query(
        `SELECT rse.id, rse.status
         FROM report_share_emails rse
         LEFT JOIN test_reports tr ON tr.id = rse.report_id
         WHERE rse.id = $1 AND tr.user_id = $2`,
        [id, userId]
      );
      const ownedRow = ownership.rows?.[0];
      if (!ownedRow) {
        return res.status(404).json({
          success: false,
          message: '分享邮件记录不存在或无权限',
        });
      }

      if (String(ownedRow.status) !== 'sent') {
        return res.status(400).json({
          success: false,
          message: '仅支持删除已发送记录',
        });
      }

      await query('DELETE FROM report_share_emails WHERE id = $1', [id]);

      return res.json({
        success: true,
        message: '分享邮件记录已删除',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '删除分享邮件记录失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/reports/share-emails
 * 获取分享邮件记录
 */
router.get(
  '/share-emails',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as AuthRequest).user.id;
    const { reportId, shareId, status, onlyFailed = 'false', page = 1, limit = 20 } = req.query;
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 20;
    const offset = (pageNumber - 1) * limitNumber;
    const params: Array<string | number> = [userId];
    let filterClause = '';

    if (reportId) {
      params.push(String(reportId));
      filterClause = `${filterClause} AND rse.report_id = $${params.length}`;
    }
    if (shareId) {
      params.push(String(shareId));
      filterClause = `${filterClause} AND rse.share_id = $${params.length}`;
    }
    if (status) {
      params.push(String(status));
      filterClause = `${filterClause} AND rse.status = $${params.length}`;
    }
    if (String(onlyFailed) === 'true') {
      filterClause = `${filterClause} AND rse.status = 'failed'`;
    }

    try {
      const result = await query(
        `SELECT rse.*, rs.share_token, rs.share_type,
           CASE
             WHEN rse.status = 'failed' AND rse.attempts < 3 THEN true
             ELSE false
           END AS can_retry,
           CASE
             WHEN rse.status = 'sent' THEN true
             ELSE false
           END AS can_delete
         FROM report_share_emails rse
         LEFT JOIN report_shares rs ON rs.id = rse.share_id
         LEFT JOIN test_reports tr ON tr.id = rse.report_id
         WHERE tr.user_id = $1 ${filterClause}
         ORDER BY rse.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitNumber, offset]
      );
      const countResult = await query(
        `SELECT COUNT(*)::int AS total
         FROM report_share_emails rse
         LEFT JOIN test_reports tr ON tr.id = rse.report_id
         WHERE tr.user_id = $1 ${filterClause}`,
        params
      );

      return res.json({
        success: true,
        data: result.rows || [],
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: Number(countResult.rows[0]?.total) || 0,
          totalPages: Math.ceil((Number(countResult.rows[0]?.total) || 0) / limitNumber),
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取分享邮件记录失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/reports/share-emails/:id/retry
 * 手动重试分享邮件发送
 */
router.post(
  '/share-emails/:id/retry',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as AuthRequest).user.id;
    const { id } = req.params;
    const { force = 'false' } = req.query;

    try {
      const ownership = await query(
        `SELECT rse.id, rse.status, rse.attempts
         FROM report_share_emails rse
         LEFT JOIN test_reports tr ON tr.id = rse.report_id
         WHERE rse.id = $1 AND tr.user_id = $2`,
        [id, userId]
      );
      const ownedRow = ownership.rows?.[0];
      if (!ownedRow) {
        return res.status(404).json({
          success: false,
          message: '分享邮件记录不存在或无权限',
        });
      }

      if (String(ownedRow.status) !== 'failed' && String(force) !== 'true') {
        return res.status(400).json({
          success: false,
          message: '仅支持重试失败记录',
        });
      }

      if (Number(ownedRow.attempts || 0) >= 3 && String(force) !== 'true') {
        return res.status(400).json({
          success: false,
          message: '已达到最大重试次数',
        });
      }

      await ensureReportingInitialized();
      await automatedReportingService.retryShareEmail(
        String(id),
        String(userId),
        String(force) === 'true'
      );

      return res.json({
        success: true,
        message: '已触发分享邮件重试',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '重试分享邮件失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/reports/instances
 * 获取报告实例列表
 */
router.get(
  '/instances',
  authMiddleware,
  asyncHandler(async (_req: express.Request, res: express.Response) => {
    try {
      await ensureReportingInitialized();
      const instances = await automatedReportingService.getAllReportInstances();
      return res.json({
        success: true,
        data: instances,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取报告实例失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/system/reports/:id/share
 * 创建报告分享
 */
router.post(
  '/:id/share',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const userId = (req as AuthRequest).user.id;
    const {
      shareType = 'link',
      expiresAt,
      password,
      recipients,
      subject,
      message,
      allowedIps,
      maxAccessCount,
      permissions,
    } = req.body as {
      shareType?: 'link' | 'email' | 'download';
      expiresAt?: string;
      password?: string;
      recipients?: string[];
      subject?: string;
      message?: string;
      allowedIps?: string[];
      maxAccessCount?: number;
      permissions?: string[];
    };

    try {
      const reportResult = await query('SELECT user_id FROM test_reports WHERE id = $1', [id]);
      const reportRow = reportResult.rows[0];
      if (!reportRow) {
        return res.status(404).json({ success: false, message: '报告不存在' });
      }
      if (String(reportRow.user_id) !== String(userId)) {
        return res.status(403).json({ success: false, message: '无权分享此报告' });
      }

      const shareToken = crypto.randomBytes(20).toString('hex');
      const shareResult = await query(
        `INSERT INTO report_shares
         (report_id, shared_by, share_token, share_type, password_hash, allowed_ips, max_access_count, permissions, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, share_token`,
        [
          id,
          userId,
          shareToken,
          shareType,
          password ? hashPassword(password) : null,
          JSON.stringify(allowedIps || []),
          maxAccessCount ?? null,
          JSON.stringify(permissions || ['view', 'download']),
          expiresAt ? new Date(expiresAt) : null,
        ]
      );

      const shareRow = shareResult.rows[0];
      await automatedReportingService.recordAccess(String(id), userId, 'share', true, {
        shareId: shareRow.id,
        userAgent: req.get('User-Agent') || undefined,
        ipAddress: req.ip,
      });

      if (shareType === 'email') {
        const emailRecipients = Array.isArray(recipients) ? recipients.filter(Boolean) : [];
        if (emailRecipients.length === 0) {
          return res.status(400).json({
            success: false,
            message: '分享类型为 email 时需提供 recipients',
          });
        }

        await ensureReportingInitialized();
        const shareUrl = buildShareDownloadUrl(shareRow.share_token);
        await automatedReportingService.sendShareEmail({
          reportId: String(id),
          shareId: String(shareRow.id),
          recipients: emailRecipients,
          subject: subject || '报告分享链接',
          html:
            message ||
            `请使用以下链接访问报告：<a href="${shareUrl}">${shareUrl}</a>${
              password ? '<br/>该分享已设置访问密码。' : ''
            }`,
          userId: String(userId),
        });
      }

      return res.json({
        success: true,
        data: {
          shareId: shareRow.id,
          token: shareRow.share_token,
          url: buildShareDownloadUrl(shareRow.share_token),
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '创建分享失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/system/reports/share/:token
 * 获取分享详情
 */
router.get(
  '/share/:token',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { token } = req.params;
    const { password } = req.query as { password?: string };
    const normalizedPassword = typeof password === 'string' ? password : '';

    const shareResult = await query(
      `SELECT
         rs.*, tr.file_path, tr.file_size, tr.format,
         COALESCE(al.download_count, 0) AS download_count
       FROM report_shares rs
       LEFT JOIN test_reports tr ON tr.id = rs.report_id
       LEFT JOIN (
         SELECT share_id, COUNT(*)::int AS download_count
         FROM report_access_logs
         WHERE access_type = 'download' AND success = true
         GROUP BY share_id
       ) al ON al.share_id = rs.id
       WHERE rs.share_token = $1`,
      [token]
    );
    const shareRow = shareResult.rows[0];
    if (!shareRow) {
      return res.status(404).json({ success: false, message: '分享不存在' });
    }

    const validation = validateShareAccess(
      shareRow,
      String(req.ip ?? ''),
      normalizedPassword,
      'view'
    );
    if (!validation.allowed) {
      await automatedReportingService.recordAccess(
        String(shareRow.report_id),
        null,
        'view',
        false,
        {
          shareId: shareRow.id,
          errorMessage: validation.message,
          userAgent: req.get('User-Agent') || undefined,
          ipAddress: req.ip,
        }
      );
      return res.status(403).json({ success: false, message: validation.message });
    }

    return res.json({
      success: true,
      data: {
        id: shareRow.id,
        reportId: shareRow.report_id,
        shareType: shareRow.share_type,
        expiresAt: shareRow.expires_at,
        currentAccessCount: shareRow.current_access_count,
        maxAccessCount: shareRow.max_access_count,
        permissions: shareRow.permissions,
        lastAccessedAt: shareRow.last_accessed_at,
        downloadCount: Number(shareRow.download_count || 0),
      },
    });
  })
);

/**
 * GET /api/system/reports/share/:token/download
 * 分享下载
 */
router.get(
  '/share/:token/download',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { token } = req.params;
    const { password = '' } = req.query as { password?: string };

    const shareResult = await query(
      `SELECT rs.*, tr.file_path, tr.file_size, tr.format
       FROM report_shares rs
       LEFT JOIN test_reports tr ON tr.id = rs.report_id
       WHERE rs.share_token = $1`,
      [token]
    );
    const shareRow = shareResult.rows[0];
    if (!shareRow) {
      return res.status(404).json({ success: false, message: '分享不存在' });
    }

    const validation = validateShareAccess(
      shareRow,
      String(req.ip ?? ''),
      String(password ?? ''),
      'download'
    );
    if (!validation.allowed) {
      await automatedReportingService.recordAccess(
        String(shareRow.report_id),
        null,
        'download',
        false,
        {
          shareId: shareRow.id,
          errorMessage: validation.message,
          userAgent: req.get('User-Agent') || undefined,
          ipAddress: req.ip,
        }
      );
      return res.status(403).json({ success: false, message: validation.message });
    }

    const permissions = Array.isArray(shareRow.permissions) ? shareRow.permissions : [];
    if (!permissions.includes('download')) {
      await automatedReportingService.recordAccess(
        String(shareRow.report_id),
        null,
        'download',
        false,
        {
          shareId: shareRow.id,
          errorMessage: '无下载权限',
          userAgent: req.get('User-Agent') || undefined,
          ipAddress: req.ip,
        }
      );
      return res.status(403).json({ success: false, message: '无下载权限' });
    }

    if (!shareRow.file_path) {
      await automatedReportingService.recordAccess(
        String(shareRow.report_id),
        null,
        'download',
        false,
        {
          shareId: shareRow.id,
          errorMessage: '报告文件不存在',
          userAgent: req.get('User-Agent') || undefined,
          ipAddress: req.ip,
        }
      );
      return res.status(404).json({ success: false, message: '报告文件不存在' });
    }

    try {
      await fs.access(shareRow.file_path);
    } catch {
      await automatedReportingService.recordAccess(
        String(shareRow.report_id),
        null,
        'download',
        false,
        {
          shareId: shareRow.id,
          errorMessage: '报告文件不存在',
          userAgent: req.get('User-Agent') || undefined,
          ipAddress: req.ip,
        }
      );
      return res.status(404).json({ success: false, message: '报告文件不存在' });
    }

    await query(
      'UPDATE report_shares SET current_access_count = current_access_count + 1, last_accessed_at = NOW() WHERE id = $1',
      [shareRow.id]
    );

    await automatedReportingService.recordAccess(
      String(shareRow.report_id),
      null,
      'download',
      true,
      {
        shareId: shareRow.id,
        userAgent: req.get('User-Agent') || undefined,
        ipAddress: req.ip,
      }
    );

    const fileName = path.basename(shareRow.file_path);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    return res.sendFile(shareRow.file_path);
  })
);

/**
 * GET /api/system/reports/access-logs
 * 获取报告访问日志
 */
router.get(
  '/access-logs',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as AuthRequest).user.id;
    const { reportId, shareId, page = 1, limit = 20 } = req.query;
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 20;
    const offset = (pageNumber - 1) * limitNumber;
    const params: Array<string | number> = [userId];
    let filterClause = '';
    if (reportId) {
      params.push(String(reportId));
      filterClause = `AND ral.report_id = $${params.length}`;
    }
    if (shareId) {
      params.push(String(shareId));
      filterClause = `${filterClause} AND ral.share_id = $${params.length}`;
    }

    try {
      const result = await query(
        `SELECT ral.*
         FROM report_access_logs ral
         LEFT JOIN test_reports tr ON tr.id = ral.report_id
         WHERE tr.user_id = $1 ${filterClause}
         ORDER BY ral.accessed_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitNumber, offset]
      );
      const countResult = await query(
        `SELECT COUNT(*)::int AS total
         FROM report_access_logs ral
         LEFT JOIN test_reports tr ON tr.id = ral.report_id
         WHERE tr.user_id = $1 ${filterClause}`,
        params
      );

      return res.json({
        success: true,
        data: result.rows || [],
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: Number(countResult.rows[0]?.total) || 0,
          totalPages: Math.ceil((Number(countResult.rows[0]?.total) || 0) / limitNumber),
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取访问日志失败',
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
           te.user_id,
           ri.status AS instance_status,
           ri.duration AS instance_duration,
           ri.config_id AS instance_config_id,
           ri.template_id AS instance_template_id,
           ri.metadata AS instance_metadata,
           COALESCE(al.download_count, 0) AS download_count
         FROM test_reports tr
         LEFT JOIN test_executions te ON te.id = tr.execution_id
         LEFT JOIN report_instances ri ON ri.report_id = tr.id
         LEFT JOIN (
           SELECT report_id, COUNT(*)::int AS download_count
           FROM report_access_logs
           WHERE access_type = 'download' AND success = true
           GROUP BY report_id
         ) al ON al.report_id = tr.id
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

      const shareResult = await query(
        `SELECT
           rs.id,
           rs.share_token,
           rs.share_type,
           rs.expires_at,
           rs.current_access_count,
           rs.max_access_count,
           rs.permissions,
           rs.last_accessed_at,
           COALESCE(al.download_count, 0) AS download_count
         FROM report_shares rs
         LEFT JOIN (
           SELECT share_id, COUNT(*)::int AS download_count
           FROM report_access_logs
           WHERE access_type = 'download' AND success = true
           GROUP BY share_id
         ) al ON al.share_id = rs.id
         WHERE rs.report_id = $1 AND rs.is_active = true
         ORDER BY rs.created_at DESC`,
        [id]
      );

      const configId = reportRow.instance_config_id ? String(reportRow.instance_config_id) : null;
      const templateId = reportRow.instance_template_id
        ? String(reportRow.instance_template_id)
        : null;

      const configResult = configId
        ? await query(
            `SELECT id, name, description, template_id, schedule, recipients, filters, format, delivery, enabled
             FROM report_configs WHERE id = $1`,
            [configId]
          )
        : { rows: [] };
      const templateResult = templateId
        ? await query(
            `SELECT id, name, description, report_type, default_format, is_public, is_system
             FROM report_templates WHERE id = $1`,
            [templateId]
          )
        : { rows: [] };
      const configRow = configResult.rows?.[0];
      const templateRow = templateResult.rows?.[0];

      return res.json({
        success: true,
        data: {
          ...report,
          instance: reportRow
            ? {
                status: reportRow.instance_status,
                duration: reportRow.instance_duration,
                configId,
                templateId,
                metadata: reportRow.instance_metadata || {},
              }
            : null,
          config: configRow
            ? {
                id: String(configRow.id),
                name: configRow.name,
                description: configRow.description,
                templateId: configRow.template_id,
                schedule: configRow.schedule,
                recipients: configRow.recipients,
                filters: configRow.filters,
                format: configRow.format,
                delivery: configRow.delivery,
                enabled: configRow.enabled,
              }
            : null,
          template: templateRow
            ? {
                id: String(templateRow.id),
                name: templateRow.name,
                description: templateRow.description,
                reportType: templateRow.report_type,
                defaultFormat: templateRow.default_format,
                isPublic: templateRow.is_public,
                isSystem: templateRow.is_system,
              }
            : null,
          shares: (shareResult.rows || []).map((row: Record<string, unknown>) => ({
            id: String(row.id),
            token: String(row.share_token),
            shareType: row.share_type,
            expiresAt: row.expires_at,
            currentAccessCount: row.current_access_count,
            maxAccessCount: row.max_access_count,
            permissions: row.permissions,
            lastAccessedAt: row.last_accessed_at,
            downloadCount: Number(row.download_count || 0),
            url: buildShareDownloadUrl(String(row.share_token)),
          })),
        },
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
        await automatedReportingService.recordAccess(String(id), userId, 'download', false, {
          errorMessage: '无权下载此报告',
          userAgent: req.get('User-Agent') || undefined,
          ipAddress: req.ip,
        });
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
        await automatedReportingService.recordAccess(String(id), userId, 'download', false, {
          errorMessage: '报告文件不存在',
          userAgent: req.get('User-Agent') || undefined,
          ipAddress: req.ip,
        });
        return res.status(404).json({
          success: false,
          message: '报告文件不存在',
        });
      }

      // 检查文件是否存在
      try {
        await fs.access(report.filePath);
      } catch {
        await automatedReportingService.recordAccess(String(id), userId, 'download', false, {
          errorMessage: '报告文件不存在',
          userAgent: req.get('User-Agent') || undefined,
          ipAddress: req.ip,
        });
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

      await automatedReportingService.recordAccess(String(id), userId, 'download', true, {
        userAgent: req.get('User-Agent') || undefined,
        ipAddress: req.ip,
      });

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

      const instanceResult = await query(
        'SELECT config_id, template_id FROM report_instances WHERE report_id = $1',
        [id]
      );
      const configIds = (instanceResult.rows || [])
        .map((row: Record<string, unknown>) => row.config_id)
        .filter(Boolean) as string[];
      const templateIds = (instanceResult.rows || [])
        .map((row: Record<string, unknown>) => row.template_id)
        .filter(Boolean) as string[];

      if (reportRow.file_path) {
        try {
          await fs.unlink(reportRow.file_path);
        } catch (error) {
          Logger.error('删除报告文件失败', { error, filePath: reportRow.file_path });
        }
      }

      await query('DELETE FROM report_access_logs WHERE report_id = $1', [id]);
      await query('DELETE FROM report_shares WHERE report_id = $1', [id]);
      await query('DELETE FROM report_instances WHERE report_id = $1', [id]);
      await query('DELETE FROM test_reports WHERE id = $1', [id]);

      for (const configId of configIds) {
        const remaining = await query(
          'SELECT 1 FROM report_instances WHERE config_id = $1 LIMIT 1',
          [configId]
        );
        if ((remaining.rows || []).length === 0) {
          await query('DELETE FROM report_configs WHERE id = $1', [configId]);
        }
      }

      for (const templateId of templateIds) {
        const remainingInstances = await query(
          'SELECT 1 FROM report_instances WHERE template_id = $1 LIMIT 1',
          [templateId]
        );
        const remainingConfigs = await query(
          'SELECT 1 FROM report_configs WHERE template_id = $1 LIMIT 1',
          [templateId]
        );
        if (
          (remainingInstances.rows || []).length === 0 &&
          (remainingConfigs.rows || []).length === 0
        ) {
          await query(
            'DELETE FROM report_templates WHERE id = $1 AND is_public = false AND is_system = false',
            [templateId]
          );
        }
      }

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
           tr.report_data,
           ri.status AS instance_status,
           ri.duration AS instance_duration,
           COALESCE(al.download_count, 0) AS download_count
         FROM test_reports tr
         LEFT JOIN test_executions te ON te.id = tr.execution_id
         LEFT JOIN report_instances ri ON ri.report_id = tr.id
         LEFT JOIN (
           SELECT report_id, COUNT(*)::int AS download_count
           FROM report_access_logs
           WHERE access_type = 'download' AND success = true
           GROUP BY report_id
         ) al ON al.report_id = tr.id
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

      const durations: number[] = [];
      reportRows.forEach(row => {
        const mapped = mapReportRow(row, userId);
        if (!mapped) return;
        byType[mapped.type] = (byType[mapped.type] || 0) + 1;
        byFormat[mapped.format] = (byFormat[mapped.format] || 0) + 1;
        byStatus[mapped.status] = (byStatus[mapped.status] || 0) + 1;
        totalSize += Number(row.file_size) || 0;
        if (row.instance_duration) {
          durations.push(Number(row.instance_duration));
        }
      });

      const averageGenerationTime =
        durations.length > 0
          ? durations.reduce((sum, value) => sum + value, 0) / durations.length
          : 0;

      const statistics: ReportStatistics = {
        total: reportRows.length,
        byType,
        byFormat,
        byStatus,
        averageGenerationTime,
        totalFileSize: totalSize,
        popularReports: reportRows
          .sort((a, b) => Number(b.download_count || 0) - Number(a.download_count || 0))
          .slice(0, 10)
          .map(row => ({
            id: String(row.id),
            name: `报告_${row.id}`,
            type: mapReportTypeFromRow(row),
            downloadCount: Number(row.download_count || 0),
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

  const status: Report['status'] = row.instance_status
    ? (String(row.instance_status) as Report['status'])
    : 'completed';
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
    progress: status === 'completed' ? 100 : status === 'failed' ? 0 : 50,
    createdAt: row.generated_at ? new Date(row.generated_at as string | number | Date) : new Date(),
    completedAt: row.generated_at
      ? new Date(row.generated_at as string | number | Date)
      : undefined,
    createdBy: String(row.user_id || userId),
    filePath: row.file_path ? String(row.file_path) : undefined,
    fileSize: row.file_size ? Number(row.file_size) : undefined,
    downloadCount: Number(row.download_count || 0),
    duration: row.instance_duration ? Number(row.instance_duration) : undefined,
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
