/**
 * 自动化报告服务
 * 提供定时报告生成、邮件发送、报告模板等功能
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { query } from '../../config/database';
import Logger from '../../utils/logger';
import ReportGenerator, {
  ReportConfig as GeneratorReportConfig,
  ReportData as GeneratorReportData,
} from './ReportGenerator';
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const websocketConfig = require('../../config/websocket');

// 报告模板接口
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'security' | 'seo' | 'analytics' | 'custom';
  type: 'summary' | 'detailed' | 'comparison' | 'trend';
  format: 'html' | 'pdf' | 'excel' | 'json';
  template: string;
  variables: ReportVariable[];
  sections: ReportSection[];
  styling: ReportStyling;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  isSystem?: boolean;
  isPublic?: boolean;
}

// 报告变量接口
export interface ReportVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: unknown;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// 报告部分接口
export interface ReportSection {
  id: string;
  name: string;
  type: 'header' | 'summary' | 'chart' | 'table' | 'text' | 'footer';
  order: number;
  content: string;
  condition?: string;
  styling?: {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: string;
    fontWeight?: string;
  };
}

// 报告样式接口
export interface ReportStyling {
  theme: 'light' | 'dark' | 'corporate' | 'custom';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
    code: string;
  };
  layout: {
    pageSize: 'A4' | 'A3' | 'letter' | 'custom';
    orientation: 'portrait' | 'landscape';
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
}

// 报告配置接口
export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  templateId: string;
  schedule: ReportSchedule;
  recipients: ReportRecipient[];
  filters: ReportFilter[];
  format: ReportFormat;
  delivery: ReportDelivery;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// 报告调度接口
export interface ReportSchedule {
  type: 'once' | 'recurring';
  cronExpression?: string;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
  nextRun?: Date;
}

// 报告接收者接口
export interface ReportRecipient {
  id: string;
  type: 'email' | 'webhook' | 'slack' | 'teams';
  address: string;
  name?: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

// 报告过滤器接口
export interface ReportFilter {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'greater_than'
    | 'less_than'
    | 'between';
  value: unknown;
  enabled: boolean;
}

// 报告格式接口
export interface ReportFormat {
  type: 'html' | 'pdf' | 'excel' | 'json' | 'csv';
  options: {
    includeCharts?: boolean;
    includeRawData?: boolean;
    compression?: boolean;
    encryption?: boolean;
    watermark?: string;
  };
}

// 报告交付接口
export interface ReportDelivery {
  method: 'email' | 'ftp' | 'api' | 'storage';
  settings: {
    email?: {
      subject: string;
      body: string;
      attachments: boolean;
    };
    ftp?: {
      host: string;
      port: number;
      username: string;
      password: string;
      path: string;
    };
    api?: {
      url: string;
      method: 'POST' | 'PUT';
      headers: Record<string, string>;
    };
    storage?: {
      provider: 's3' | 'azure' | 'local';
      bucket?: string;
      path?: string;
    };
  };
}

// 报告实例接口
export interface ReportInstance {
  id: string;
  configId: string;
  templateId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'cancelled';
  generatedAt: Date;
  completedAt?: Date;
  duration?: number;
  format: string;
  size?: number;
  path?: string;
  url?: string;
  error?: string;
  metadata: Record<string, unknown>;
}

// 报告数据接口
export interface ReportData {
  timestamp: Date;
  metrics: Record<string, unknown>;
  summary: Record<string, unknown>;
  charts: ChartData[];
  tables: TableData[];
  metadata: Record<string, unknown>;
}

// 图表数据接口
export interface ChartData {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  options: {
    width?: number;
    height?: number;
    showLegend?: boolean;
    showGrid?: boolean;
  };
}

// 表格数据接口
export interface TableData {
  id: string;
  title: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
  options: {
    sortable?: boolean;
    filterable?: boolean;
    pagination?: boolean;
  };
}

// 报告统计接口
export interface ReportStatistics {
  totalReports: number;
  successfulReports: number;
  failedReports: number;
  averageGenerationTime: number;
  byTemplate: Record<string, number>;
  byFormat: Record<string, number>;
  byRecipient: Record<string, number>;
  trends: Array<{
    date: string;
    count: number;
    successRate: number;
  }>;
}

type CronTask = ReturnType<typeof cron.schedule>;

type MailOptions = {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
};

/**
 * 自动化报告服务
 */
class AutomatedReportingService extends EventEmitter {
  private templates: Map<string, ReportTemplate> = new Map();
  private configs: Map<string, ReportConfig> = new Map();
  private instances: Map<string, ReportInstance> = new Map();
  private scheduledTasks: Map<string, CronTask> = new Map();
  private mailTransporter?: ReturnType<typeof nodemailer.createTransport>;
  private mailFrom?: string;
  private isInitialized: boolean = false;
  private reportGenerator: ReportGenerator;
  private reportsDir: string;
  private shareEmailRetryTask?: CronTask;

  constructor() {
    super();
    this.reportGenerator = new ReportGenerator();
    this.reportsDir = path.join(__dirname, '../../reports');
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 加载模板
      await this.loadTemplates();

      // 初始化默认模板
      await this.initializeDefaultTemplates();

      // 加载配置
      await this.loadConfigs();

      // 设置邮件传输
      await this.setupMailTransporter();

      // 启动调度任务
      this.startScheduledTasks();
      this.startShareEmailRetryTask();

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 创建报告模板
   */
  async createTemplate(
    templateData: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const templateId = this.generateId();

    const template: ReportTemplate = {
      ...templateData,
      id: templateId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(templateId, template);
    await this.saveTemplates();
    this.emit('template_created', template);

    return templateId;
  }

  /**
   * 获取报告模板
   */
  async getTemplate(templateId: string): Promise<ReportTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  /**
   * 获取所有模板
   */
  async getAllTemplates(): Promise<ReportTemplate[]> {
    return Array.from(this.templates.values());
  }

  /**
   * 更新报告模板
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<ReportTemplate>
  ): Promise<ReportTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    };

    this.templates.set(templateId, updatedTemplate);
    await this.saveTemplates();
    this.emit('template_updated', updatedTemplate);

    return updatedTemplate;
  }

  /**
   * 删除报告模板
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    const template = this.templates.get(templateId);
    if (!template) {
      return false;
    }

    this.templates.delete(templateId);
    await this.saveTemplates();
    this.emit('template_deleted', { templateId });

    return true;
  }

  /**
   * 记录报告访问
   */
  async recordAccess(
    reportId: string,
    userId: string | null,
    accessType: 'view' | 'download' | 'share' | 'generate',
    success: boolean,
    meta: { errorMessage?: string; userAgent?: string; ipAddress?: string; shareId?: string } = {}
  ) {
    await this.logReportAccess(
      reportId,
      userId,
      meta.shareId || null,
      accessType,
      success,
      meta.errorMessage,
      meta.userAgent,
      meta.ipAddress
    );
  }

  /**
   * 发送分享邮件
   */
  async sendShareEmail(options: {
    reportId: string;
    shareId: string;
    recipients: string[];
    subject: string;
    html: string;
    userId?: string;
  }): Promise<void> {
    if (!this.mailTransporter) {
      throw new Error('邮件服务未配置');
    }

    const logResult = await query(
      `INSERT INTO report_share_emails
       (report_id, share_id, recipients, subject, body, status, attempts)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [
        options.reportId,
        options.shareId,
        JSON.stringify(options.recipients),
        options.subject,
        options.html,
        'pending',
        0,
      ]
    );
    const emailId = String(logResult.rows[0]?.id);

    await this.sendShareEmailAttempt({
      emailId,
      reportId: options.reportId,
      shareId: options.shareId,
      recipients: options.recipients,
      subject: options.subject,
      html: options.html,
      userId: options.userId,
      attempt: 1,
    });
  }

  async retryShareEmail(emailId: string, userId?: string, force = false): Promise<void> {
    const result = await query(
      `SELECT rse.id, rse.report_id, rse.share_id, rse.recipients, rse.subject, rse.body, rse.attempts,
              rse.status, rs.shared_by
       FROM report_share_emails rse
       LEFT JOIN report_shares rs ON rs.id = rse.share_id
       WHERE rse.id = $1`,
      [emailId]
    );
    const row = result.rows?.[0];
    if (!row) {
      throw new Error('Share email not found');
    }

    const attempts = Number(row.attempts || 0);
    if (String(row.status) !== 'failed' && !force) {
      throw new Error('仅支持重试失败记录');
    }
    if (attempts >= 3 && !force) {
      throw new Error('已达到最大重试次数');
    }

    const recipients = Array.isArray(row.recipients) ? row.recipients : [];
    await this.sendShareEmailAttempt({
      emailId: String(row.id),
      reportId: String(row.report_id),
      shareId: String(row.share_id),
      recipients,
      subject: String(row.subject),
      html: String(row.body),
      userId: userId || (row.shared_by ? String(row.shared_by) : undefined),
      attempt: attempts + 1,
    });
  }

  private async sendShareEmailAttempt(params: {
    emailId: string;
    reportId: string;
    shareId: string;
    recipients: string[];
    subject: string;
    html: string;
    userId?: string;
    attempt: number;
  }): Promise<void> {
    const mailOptions: MailOptions = {
      from: this.mailFrom || 'reports@example.com',
      to: params.recipients,
      subject: params.subject,
      html: params.html,
    };

    const maxAttempts = 3;
    try {
      await this.mailTransporter?.sendMail(mailOptions);
      await query(
        `UPDATE report_share_emails
         SET status = 'sent', attempts = $2, sent_at = NOW(), last_error = NULL, next_retry_at = NULL
         WHERE id = $1`,
        [params.emailId, params.attempt]
      );
      Logger.info('分享邮件发送成功', { recipients: params.recipients, attempt: params.attempt });
      this.emit('share_email_sent', {
        reportId: params.reportId,
        shareId: params.shareId,
        emailId: params.emailId,
      });
      await this.notifyShareEmailStatus(params.userId, 'success', params);
    } catch (error) {
      const nextRetryAt =
        params.attempt < maxAttempts ? new Date(Date.now() + 5 * 60 * 1000 * params.attempt) : null;
      await query(
        `UPDATE report_share_emails
         SET status = $2,
             attempts = $3,
             last_error = $4,
             next_retry_at = $5
         WHERE id = $1`,
        [
          params.emailId,
          params.attempt < maxAttempts ? 'failed' : 'failed',
          params.attempt,
          error instanceof Error ? error.message : String(error),
          nextRetryAt,
        ]
      );
      Logger.error('分享邮件发送失败', error, {
        recipients: params.recipients,
        attempt: params.attempt,
      });
      await this.recordAccess(params.reportId, params.userId || null, 'share', false, {
        shareId: params.shareId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      this.emit('share_email_failed', {
        reportId: params.reportId,
        shareId: params.shareId,
        emailId: params.emailId,
        error,
      });
      await this.notifyShareEmailStatus(params.userId, 'error', params, error);
      if (params.attempt < maxAttempts) {
        throw error;
      }
    }
  }

  private async delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  private startShareEmailRetryTask(): void {
    const task = cron.schedule('*/5 * * * *', async () => {
      try {
        await this.retryFailedShareEmails();
      } catch (error) {
        Logger.error('分享邮件重试任务失败', error);
      }
    });

    this.shareEmailRetryTask = task;
    task.start();
  }

  private async retryFailedShareEmails(): Promise<void> {
    const result = await query(
      `SELECT rse.id, rse.report_id, rse.share_id, rse.recipients, rse.subject, rse.body, rse.attempts,
              rs.shared_by
       FROM report_share_emails rse
       LEFT JOIN report_shares rs ON rs.id = rse.share_id
       WHERE rse.status = 'failed'
         AND (rse.next_retry_at IS NULL OR rse.next_retry_at <= NOW())
       ORDER BY rse.updated_at ASC
       LIMIT 20`
    );

    for (const row of result.rows || []) {
      const recipients = Array.isArray(row.recipients) ? row.recipients : [];
      await this.sendShareEmailAttempt({
        emailId: String(row.id),
        reportId: String(row.report_id),
        shareId: String(row.share_id),
        recipients,
        subject: String(row.subject),
        html: String(row.body),
        userId: row.shared_by ? String(row.shared_by) : undefined,
        attempt: Number(row.attempts || 0) + 1,
      });
    }
  }

  private async notifyShareEmailStatus(
    userId: string | undefined,
    level: 'success' | 'error',
    params: {
      reportId: string;
      shareId: string;
      emailId: string;
      recipients: string[];
      subject: string;
    },
    error?: unknown
  ) {
    if (!userId) return;
    const services = websocketConfig.getServices?.();
    const realtimeService = services?.realtimeService;
    if (!realtimeService?.sendNotification) return;

    const message =
      level === 'success'
        ? `报告分享邮件已发送 (${params.recipients.join(', ')})`
        : `报告分享邮件发送失败 (${params.recipients.join(', ')})`;

    realtimeService.sendNotification({
      type: level === 'success' ? 'success' : 'error',
      title: '报告分享邮件',
      message,
      data: {
        reportId: params.reportId,
        shareId: params.shareId,
        emailId: params.emailId,
        subject: params.subject,
        error: error instanceof Error ? error.message : error ? String(error) : undefined,
      },
      userId,
    });
  }

  /**
   * 创建报告配置
   */
  async createConfig(
    configData: Omit<ReportConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const configId = this.generateId();

    const config: ReportConfig = {
      ...configData,
      id: configId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.configs.set(configId, config);
    await this.saveConfigs();

    // 如果配置启用，启动调度
    if (config.enabled && config.schedule.type === 'recurring') {
      this.scheduleReport(configId);
    }

    this.emit('config_created', config);
    return configId;
  }

  /**
   * 获取报告配置
   */
  async getConfig(configId: string): Promise<ReportConfig | null> {
    return this.configs.get(configId) || null;
  }

  /**
   * 获取所有配置
   */
  async getAllConfigs(): Promise<ReportConfig[]> {
    return Array.from(this.configs.values());
  }

  /**
   * 更新报告配置
   */
  async updateConfig(configId: string, updates: Partial<ReportConfig>): Promise<ReportConfig> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Config not found');
    }

    const updatedConfig = {
      ...config,
      ...updates,
      updatedAt: new Date(),
    };

    this.configs.set(configId, updatedConfig);
    await this.saveConfigs();

    // 重新调度
    if (updates.enabled !== undefined || updates.schedule) {
      this.rescheduleReport(configId);
    }

    this.emit('config_updated', updatedConfig);
    return updatedConfig;
  }

  /**
   * 删除报告配置
   */
  async deleteConfig(configId: string): Promise<boolean> {
    const config = this.configs.get(configId);
    if (!config) {
      return false;
    }

    // 停止调度
    this.unscheduleReport(configId);

    this.configs.delete(configId);
    await this.saveConfigs();
    this.emit('config_deleted', { configId });

    return true;
  }

  /**
   * 手动生成报告
   */
  async generateReport(
    configId: string,
    options: {
      data?: ReportData;
      variables?: Record<string, unknown>;
    } = {}
  ): Promise<string> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Config not found');
    }

    const template = this.templates.get(config.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const instanceId = this.generateId();
    const startTime = Date.now();

    const instance: ReportInstance = {
      id: instanceId,
      configId,
      templateId: config.templateId,
      status: 'generating',
      generatedAt: new Date(),
      format: config.format.type,
      metadata: {},
    };

    this.instances.set(instanceId, instance);
    this.emit('report_generation_started', instance);
    await this.saveReportInstance(instanceId, null, instance);

    try {
      const resolvedVariables = this.resolveTemplateVariables(template, options.variables || {});

      // 收集数据
      const data = options.data || (await this.collectReportData(config));

      const generatorData = this.buildGeneratorData(config, template, data, resolvedVariables);
      const reportPath = await this.generateReportFile(generatorData, template, config, instanceId);
      const executionId = await this.resolveExecutionId(config.filters || []);
      const reportRecordId = await this.saveReportRecord(
        executionId,
        template,
        config.format.type,
        generatorData,
        reportPath.path,
        reportPath.size
      );

      // 更新实例
      instance.status = 'completed';
      instance.completedAt = new Date();
      instance.duration = Date.now() - startTime;
      instance.path = reportPath.path;
      instance.url = reportPath.url;
      instance.size = reportPath.size;
      instance.metadata = {
        ...instance.metadata,
        reportRecordId,
      };

      this.instances.set(instanceId, instance);
      this.emit('report_generation_completed', instance);

      await this.saveReportInstance(instanceId, reportRecordId, instance);

      await this.logReportAccess(
        String(reportRecordId),
        config.createdBy || null,
        null,
        'generate',
        true
      );

      // 发送报告
      if (config.delivery.method === 'email') {
        await this.sendReport(instance, config);
      }

      return instanceId;
    } catch (error) {
      instance.status = 'failed';
      instance.completedAt = new Date();
      instance.duration = Date.now() - startTime;
      instance.error = error instanceof Error ? error.message : String(error);

      this.instances.set(instanceId, instance);
      this.emit('report_generation_failed', instance);

      await this.saveReportInstance(instanceId, null, instance);
      throw error;
    }
  }

  /**
   * 获取报告实例
   */
  async getReportInstance(instanceId: string): Promise<ReportInstance | null> {
    const cached = this.instances.get(instanceId) || null;
    if (cached) {
      return cached;
    }

    const rows = await this.loadReportInstancesFromDb(instanceId);
    return rows[0] || null;
  }

  /**
   * 获取所有报告实例
   */
  async getAllReportInstances(): Promise<ReportInstance[]> {
    const stored = await this.loadReportInstancesFromDb();
    const merged = new Map<string, ReportInstance>();

    stored.forEach(instance => merged.set(instance.id, instance));
    this.instances.forEach((instance, id) => merged.set(id, instance));

    return Array.from(merged.values());
  }

  /**
   * 取消报告生成
   */
  async cancelReport(instanceId: string): Promise<boolean> {
    const instance = this.instances.get(instanceId);
    if (!instance || instance.status !== 'generating') {
      return false;
    }

    instance.status = 'cancelled';
    instance.completedAt = new Date();
    instance.duration = Date.now() - instance.generatedAt.getTime();

    this.instances.set(instanceId, instance);
    this.emit('report_generation_cancelled', instance);

    await this.saveReportInstance(instanceId, null, instance);

    return true;
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<ReportStatistics> {
    const instances = await this.getAllReportInstances();

    const totalReports = instances.length;
    const successfulReports = instances.filter(i => i.status === 'completed').length;
    const failedReports = instances.filter(i => i.status === 'failed').length;

    const durations = instances
      .filter(
        (instance): instance is ReportInstance & { duration: number } =>
          typeof instance.duration === 'number'
      )
      .map(instance => instance.duration);
    const averageGenerationTime =
      durations.length > 0
        ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
        : 0;

    const byTemplate: Record<string, number> = {};
    const byFormat: Record<string, number> = {};
    const byRecipient: Record<string, number> = {};

    instances.forEach(instance => {
      byTemplate[instance.templateId] = (byTemplate[instance.templateId] || 0) + 1;
      byFormat[instance.format] = (byFormat[instance.format] || 0) + 1;
    });

    // 计算趋势
    const trends = this.calculateReportTrends(instances);

    return {
      totalReports,
      successfulReports,
      failedReports,
      averageGenerationTime,
      byTemplate,
      byFormat,
      byRecipient,
      trends,
    };
  }

  /**
   * 收集报告数据
   */
  private async collectReportData(config: ReportConfig): Promise<ReportData> {
    const { clause, params } = this.buildFilterClause(config.filters || []);
    const whereClause = clause ? `WHERE ${clause}` : '';

    const summaryResult = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE te.status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE te.status = 'failed')::int AS failed,
         COALESCE(AVG(tr.score), 0)::float AS average_score,
         COALESCE(AVG(te.execution_time), 0)::float AS average_duration
       FROM test_executions te
       LEFT JOIN test_results tr ON tr.execution_id = te.id
       ${whereClause}`,
      params
    );

    const testIdFilter = (config.filters || []).find(
      filter =>
        filter.enabled !== false && filter.field === 'test_id' && filter.operator === 'equals'
    );
    const detailMetrics = await this.collectDetailMetrics(
      typeof testIdFilter?.value === 'string' ? testIdFilter.value : undefined
    );
    const detailMetricsRows = Object.entries(detailMetrics).map(([name, value]) => ({
      指标: name,
      详情: value,
    }));

    const baseSummary = summaryResult.rows[0] || {
      total: 0,
      completed: 0,
      failed: 0,
      average_score: 0,
      average_duration: 0,
    };

    const typeStats = await query(
      `SELECT te.engine_type AS type, COUNT(*)::int AS count
       FROM test_executions te
       ${whereClause}
       GROUP BY te.engine_type`,
      params
    );

    const statusStats = await query(
      `SELECT te.status AS status, COUNT(*)::int AS count
       FROM test_executions te
       ${whereClause}
       GROUP BY te.status`,
      params
    );

    const dailyStats = await query(
      `SELECT
         DATE(te.created_at) AS date,
         COUNT(*)::int AS count,
         AVG(CASE WHEN te.status = 'completed' THEN 1.0 ELSE 0 END) * 100 AS success_rate,
         COALESCE(AVG(tr.score), 0)::float AS average_score
       FROM test_executions te
       LEFT JOIN test_results tr ON tr.execution_id = te.id
       ${whereClause}
       GROUP BY DATE(te.created_at)
       ORDER BY date ASC
       LIMIT 30`,
      params
    );

    const recommendations = await query(
      `SELECT tm.recommendation AS recommendation, COUNT(*)::int AS count
       FROM test_metrics tm
       INNER JOIN test_results tr ON tr.id = tm.result_id
       INNER JOIN test_executions te ON te.id = tr.execution_id
       ${whereClause ? `${whereClause} AND tm.recommendation IS NOT NULL` : 'WHERE tm.recommendation IS NOT NULL'}
       GROUP BY tm.recommendation
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    const recentExecutions = await query(
      `SELECT
         te.test_id,
         te.engine_type,
         te.status,
         te.created_at,
         te.completed_at,
         te.execution_time,
         tr.score
       FROM test_executions te
       LEFT JOIN test_results tr ON tr.execution_id = te.id
       ${whereClause}
       ORDER BY te.created_at DESC
       LIMIT 10`,
      params
    );

    const successRate =
      baseSummary.total > 0 ? (baseSummary.completed / baseSummary.total) * 100 : 0;

    return {
      timestamp: new Date(),
      metrics: {
        totalTests: baseSummary.total,
        completedTests: baseSummary.completed,
        failedTests: baseSummary.failed,
        averageScore: baseSummary.average_score,
        averageDuration: baseSummary.average_duration,
        byType: this.mapKeyValue(typeStats.rows, 'type', 'count'),
        byStatus: this.mapKeyValue(statusStats.rows, 'status', 'count'),
        ...(Object.keys(detailMetrics).length > 0 ? { detailMetrics } : {}),
      },
      summary: {
        overallScore: baseSummary.average_score,
        successRate,
        totalTests: baseSummary.total,
        completedTests: baseSummary.completed,
        failedTests: baseSummary.failed,
      },
      charts: [
        {
          id: 'test-trend',
          type: 'line',
          title: '测试趋势',
          data: (dailyStats.rows || []).map((row: Record<string, unknown>) => ({
            label: String(row.date),
            value: Number(row.count) || 0,
          })),
          options: {
            width: 680,
            height: 320,
            showLegend: true,
            showGrid: true,
          },
        },
      ],
      tables: [
        {
          id: 'recent-tests',
          title: '最近测试',
          headers: ['测试ID', '类型', '状态', '分数', '开始时间', '完成时间', '耗时(s)'],
          rows: (recentExecutions.rows || []).map((row: Record<string, unknown>) => ({
            测试ID: row.test_id,
            类型: row.engine_type,
            状态: row.status,
            分数: row.score ?? '- ',
            开始时间: row.created_at,
            完成时间: row.completed_at ?? '- ',
            耗时: row.execution_time ?? '- ',
          })),
          options: {
            sortable: true,
            filterable: false,
            pagination: false,
          },
        },
        ...(detailMetricsRows.length > 0
          ? [
              {
                id: 'test-metrics',
                title: '测试指标明细',
                headers: ['指标', '详情'],
                rows: detailMetricsRows,
                options: {
                  sortable: false,
                  filterable: false,
                  pagination: false,
                },
              },
            ]
          : []),
        {
          id: 'recommendations',
          title: '高频建议',
          headers: ['建议', '次数'],
          rows: (recommendations.rows || []).map((row: Record<string, unknown>) => ({
            建议: row.recommendation,
            次数: row.count,
          })),
          options: {
            sortable: true,
            filterable: false,
            pagination: false,
          },
        },
      ],
      metadata: {
        generatedBy: 'AutomatedReportingService',
        filters: config.filters || [],
      },
    };
  }

  /**
   * 渲染报告
   */
  private async generateReportFile(
    data: GeneratorReportData,
    template: ReportTemplate,
    config: ReportConfig,
    instanceId: string
  ): Promise<{ path: string; url: string; size: number }> {
    await fs.mkdir(this.reportsDir, { recursive: true });

    const format = this.normalizeFormat(config.format.type);
    if (format === 'csv') {
      const fileName = `report_${instanceId}.csv`;
      const filePath = path.join(this.reportsDir, fileName);
      const csvContent = this.convertReportToCSV(data);
      await fs.writeFile(filePath, csvContent, 'utf8');
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        url: `/reports/${fileName}`,
        size: stats.size,
      };
    }

    const generatorConfig: GeneratorReportConfig = {
      template: this.mapGeneratorTemplate(template),
      format,
      outputDir: this.reportsDir,
      filename: `report_${instanceId}.${format}`,
      includeCharts: config.format.options.includeCharts,
      includeRawData: config.format.options.includeRawData,
    };

    const result = await this.reportGenerator.generateReport(data, generatorConfig);
    if (!result.success || !result.filePath) {
      throw new Error(result.error || '报告生成失败');
    }

    return {
      path: result.filePath,
      url: `/reports/${result.filename || path.basename(result.filePath)}`,
      size: result.size || 0,
    };
  }

  /**
   * 发送报告
   */
  private async sendReport(instance: ReportInstance, config: ReportConfig): Promise<void> {
    if (!this.mailTransporter || config.delivery.method !== 'email') {
      return;
    }

    const recipients = config.recipients
      .filter(r => r.enabled && r.type === 'email')
      .map(r => r.address);

    if (recipients.length === 0) {
      return;
    }

    const attachmentContent = instance.path
      ? await fs.readFile(instance.path).catch(() => Buffer.from(''))
      : Buffer.from('');

    const mailOptions: MailOptions = {
      from: this.mailFrom || 'reports@example.com',
      to: recipients,
      subject: config.delivery.settings.email?.subject || `报告: ${config.name}`,
      html: config.delivery.settings.email?.body || '请查收附件中的报告',
      attachments: instance.path
        ? [
            {
              filename: `report_${instance.id}.${instance.format}`,
              content: attachmentContent,
            },
          ]
        : undefined,
    };

    try {
      await this.mailTransporter.sendMail(mailOptions);
      this.emit('report_sent', { instanceId: instance.id, recipients });
    } catch (error) {
      this.emit('report_send_failed', { instanceId: instance.id, error });
      throw error;
    }
  }

  /**
   * 调度报告
   */
  private scheduleReport(configId: string): void {
    const config = this.configs.get(configId);
    if (!config || config.schedule.type !== 'recurring' || !config.schedule.cronExpression) {
      return;
    }

    if (!cron.validate(config.schedule.cronExpression)) {
      throw new Error('Invalid cron expression');
    }

    const task = cron.schedule(config.schedule.cronExpression, async () => {
      try {
        await this.generateReport(configId);
      } catch (error) {
        this.emit('scheduled_report_failed', { configId, error });
      }
    });

    this.scheduledTasks.set(configId, task);
    task.start();
  }

  /**
   * 重新调度报告
   */
  private rescheduleReport(configId: string): void {
    this.unscheduleReport(configId);

    const config = this.configs.get(configId);
    if (config && config.enabled && config.schedule.type === 'recurring') {
      this.scheduleReport(configId);
    }
  }

  /**
   * 取消调度报告
   */
  private unscheduleReport(configId: string): void {
    const task = this.scheduledTasks.get(configId);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(configId);
    }
  }

  /**
   * 计算报告趋势
   */
  private calculateReportTrends(instances: ReportInstance[]): Array<{
    date: string;
    count: number;
    successRate: number;
  }> {
    const dailyStats: Record<
      string,
      {
        count: number;
        successes: number;
      }
    > = {};

    instances.forEach(instance => {
      const date = instance.generatedAt.toISOString().split('T')[0];

      if (!dailyStats[date]) {
        dailyStats[date] = { count: 0, successes: 0 };
      }

      dailyStats[date].count++;
      if (instance.status === 'completed') {
        dailyStats[date].successes++;
      }
    });

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        successRate: stats.count > 0 ? (stats.successes / stats.count) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 初始化默认模板
   */
  private async initializeDefaultTemplates(): Promise<void> {
    const hasSystemTemplate = Array.from(this.templates.values()).some(
      template => template.isSystem
    );
    if (hasSystemTemplate) {
      return;
    }
    const defaultTemplates: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: '性能报告模板',
        description: '系统性能监控报告模板',
        category: 'performance',
        type: 'summary',
        format: 'html',
        template: `
          <html>
            <head><title>性能报告</title></head>
            <body>
              <h1>{{reportName}} - {{reportDate}}</h1>
              <h2>总体概览</h2>
              <p>总用户数: {{totalUsers}}</p>
              <p>活跃用户数: {{activeUsers}}</p>
              <h2>详细指标</h2>
              <!-- 更多内容 -->
            </body>
          </html>
        `,
        variables: [
          {
            name: 'reportName',
            type: 'string',
            description: '报告名称',
            required: true,
          },
          {
            name: 'reportDate',
            type: 'date',
            description: '报告日期',
            required: true,
          },
        ],
        sections: [
          {
            id: 'header',
            name: '报告头部',
            type: 'header',
            order: 1,
            content: '{{reportName}} - {{reportDate}}',
          },
          {
            id: 'summary',
            name: '概要信息',
            type: 'summary',
            order: 2,
            content: '系统性能概要信息',
          },
        ],
        styling: {
          theme: 'corporate',
          colors: {
            primary: '#007bff',
            secondary: '#6c757d',
            accent: '#28a745',
            background: '#ffffff',
            text: '#333333',
          },
          fonts: {
            heading: 'Arial, sans-serif',
            body: 'Arial, sans-serif',
            code: 'Courier New, monospace',
          },
          layout: {
            pageSize: 'A4',
            orientation: 'portrait',
            margins: {
              top: 20,
              right: 20,
              bottom: 20,
              left: 20,
            },
          },
        },
      },
      {
        name: '安全报告模板',
        description: '系统安全监控报告模板',
        category: 'security',
        type: 'detailed',
        format: 'pdf',
        template: `
          <html>
            <head><title>安全报告</title></head>
            <body>
              <h1>安全监控报告</h1>
              <h2>安全事件</h2>
              <!-- 安全事件内容 -->
            </body>
          </html>
        `,
        variables: [
          {
            name: 'reportPeriod',
            type: 'string',
            description: '报告周期',
            required: true,
          },
        ],
        sections: [
          {
            id: 'security_events',
            name: '安全事件',
            type: 'table',
            order: 1,
            content: '安全事件列表',
          },
        ],
        styling: {
          theme: 'corporate',
          colors: {
            primary: '#dc3545',
            secondary: '#6c757d',
            accent: '#ffc107',
            background: '#ffffff',
            text: '#333333',
          },
          fonts: {
            heading: 'Arial, sans-serif',
            body: 'Arial, sans-serif',
            code: 'Courier New, monospace',
          },
          layout: {
            pageSize: 'A4',
            orientation: 'portrait',
            margins: {
              top: 20,
              right: 20,
              bottom: 20,
              left: 20,
            },
          },
        },
      },
    ];

    for (const template of defaultTemplates) {
      await this.createTemplate({
        ...template,
        isSystem: true,
        isPublic: true,
      });
    }
  }

  /**
   * 启动调度任务
   */
  private startScheduledTasks(): void {
    // 启动所有启用的配置的调度任务
    for (const [configId, config] of this.configs.entries()) {
      if (config.enabled && config.schedule.type === 'recurring') {
        try {
          this.scheduleReport(configId);
        } catch (error) {
          this.emit('scheduling_failed', { configId, error });
        }
      }
    }
  }

  /**
   * 设置邮件传输
   */
  private async setupMailTransporter(): Promise<void> {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.mailFrom = process.env.SMTP_FROM || user || 'reports@example.com';

    if (!host || !user || !pass) {
      this.mailTransporter = undefined;
      return;
    }

    this.mailTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
    await this.mailTransporter.verify();
  }

  /**
   * 加载模板
   */
  private async loadTemplates(): Promise<void> {
    const result = await query(
      `SELECT id, name, description, report_type, template_config, default_format,
              is_public, is_system, created_at, updated_at, user_id
       FROM report_templates`
    );

    (result.rows || []).forEach((row: Record<string, unknown>) => {
      const config = (row.template_config || {}) as Record<string, unknown>;
      const template: ReportTemplate = {
        id: String(row.id),
        name: String(row.name),
        description: String(row.description || ''),
        category: (row.report_type as ReportTemplate['category']) || 'custom',
        type: (config.type as ReportTemplate['type']) || 'summary',
        format: (row.default_format as ReportTemplate['format']) || 'html',
        template: String(config.template || ''),
        variables: (config.variables as ReportVariable[]) || [],
        sections: (config.sections as ReportSection[]) || [],
        styling: (config.styling as ReportStyling) || {
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
            margins: { top: 40, right: 32, bottom: 40, left: 32 },
          },
        },
        createdAt: new Date(String(row.created_at)),
        updatedAt: new Date(String(row.updated_at)),
        createdBy: row.user_id ? String(row.user_id) : undefined,
        isSystem: Boolean(row.is_system),
        isPublic: Boolean(row.is_public),
      };

      this.templates.set(template.id, template);
    });
  }

  /**
   * 保存模板
   */
  private async saveTemplates(): Promise<void> {
    const templates = Array.from(this.templates.values());
    for (const template of templates) {
      await query(
        `INSERT INTO report_templates (
           id, name, description, report_type, template_config, default_format,
           is_public, is_system, created_at, updated_at, user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           report_type = EXCLUDED.report_type,
           template_config = EXCLUDED.template_config,
           default_format = EXCLUDED.default_format,
           is_public = EXCLUDED.is_public,
           is_system = EXCLUDED.is_system,
           updated_at = EXCLUDED.updated_at,
           user_id = EXCLUDED.user_id`,
        [
          template.id,
          template.name,
          template.description,
          template.category,
          JSON.stringify({
            type: template.type,
            template: template.template,
            variables: template.variables,
            sections: template.sections,
            styling: template.styling,
          }),
          template.format,
          template.isPublic ?? false,
          template.isSystem ?? false,
          template.createdAt,
          template.updatedAt,
          template.createdBy ?? null,
        ]
      );
    }
  }

  /**
   * 加载配置
   */
  private async loadConfigs(): Promise<void> {
    const result = await query(
      `SELECT id, name, description, template_id, schedule, recipients, filters,
              format, delivery, enabled, created_at, updated_at, user_id
       FROM report_configs`
    );

    (result.rows || []).forEach((row: Record<string, unknown>) => {
      const config: ReportConfig = {
        id: String(row.id),
        name: String(row.name),
        description: String(row.description || ''),
        templateId: String(row.template_id),
        schedule: (row.schedule as ReportSchedule) || { type: 'once' },
        recipients: (row.recipients as ReportRecipient[]) || [],
        filters: (row.filters as ReportFilter[]) || [],
        format: (row.format as ReportFormat) || { type: 'html', options: {} },
        delivery: (row.delivery as ReportDelivery) || { method: 'storage', settings: {} },
        enabled: Boolean(row.enabled),
        createdAt: new Date(String(row.created_at)),
        updatedAt: new Date(String(row.updated_at)),
        createdBy: row.user_id ? String(row.user_id) : undefined,
      };

      this.configs.set(config.id, config);
    });
  }

  /**
   * 保存配置
   */
  private async saveConfigs(): Promise<void> {
    const configs = Array.from(this.configs.values());
    for (const config of configs) {
      await query(
        `INSERT INTO report_configs (
           id, name, description, template_id, schedule, recipients, filters,
           format, delivery, enabled, created_at, updated_at, user_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           template_id = EXCLUDED.template_id,
           schedule = EXCLUDED.schedule,
           recipients = EXCLUDED.recipients,
           filters = EXCLUDED.filters,
           format = EXCLUDED.format,
           delivery = EXCLUDED.delivery,
           enabled = EXCLUDED.enabled,
           updated_at = EXCLUDED.updated_at,
           user_id = EXCLUDED.user_id`,
        [
          config.id,
          config.name,
          config.description,
          config.templateId,
          JSON.stringify(config.schedule || {}),
          JSON.stringify(config.recipients || []),
          JSON.stringify(config.filters || []),
          JSON.stringify(config.format || { type: 'html', options: {} }),
          JSON.stringify(config.delivery || { method: 'storage', settings: {} }),
          config.enabled,
          config.createdAt,
          config.updatedAt,
          config.createdBy ?? null,
        ]
      );
    }
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapKeyValue(rows: Array<Record<string, unknown>>, keyField: string, valueField: string) {
    const result: Record<string, number> = {};
    rows.forEach(row => {
      const key = String(row[keyField]);
      const value = Number(row[valueField]);
      result[key] = Number.isFinite(value) ? value : 0;
    });
    return result;
  }

  private async collectDetailMetrics(testId?: string): Promise<Record<string, unknown>> {
    if (!testId) {
      return {};
    }

    const result = await query(
      `SELECT tm.metric_name, tm.metric_value, tm.metric_unit, tm.metric_type,
              tm.passed, tm.severity, tm.recommendation
       FROM test_metrics tm
       INNER JOIN test_results tr ON tr.id = tm.result_id
       INNER JOIN test_executions te ON te.id = tr.execution_id
       WHERE te.test_id = $1
       ORDER BY tm.created_at DESC`,
      [testId]
    );

    const metrics: Record<string, unknown> = {};
    (result.rows || []).forEach((row: Record<string, unknown>) => {
      const name = String(row.metric_name || 'metric');
      metrics[name] = {
        value: row.metric_value,
        unit: row.metric_unit ?? null,
        type: row.metric_type ?? null,
        passed: row.passed ?? null,
        severity: row.severity ?? null,
        recommendation: row.recommendation ?? null,
      };
    });

    return metrics;
  }

  private buildGeneratorData(
    config: ReportConfig,
    template: ReportTemplate,
    data: ReportData,
    variables: Record<string, unknown>
  ): GeneratorReportData {
    const summary = data.summary as {
      overallScore?: number;
      totalTests?: number;
      failedTests?: number;
    };

    const overallScore = Number(summary.overallScore) || 0;
    const failedTests = Number(summary.failedTests) || 0;

    const sections = this.buildTemplateSections(template, data);

    return {
      title: config.name,
      description: config.description,
      generatedAt: new Date(),
      generatedBy: 'AutomatedReportingService',
      summary: {
        overallScore,
        totalIssues: failedTests,
        criticalIssues: failedTests,
        recommendations: Array.isArray(sections.recommendations)
          ? (sections.recommendations as Array<unknown>).length
          : 0,
      },
      metrics: data.metrics,
      sections,
      metadata: {
        templateId: template.id,
        format: config.format.type,
        configId: config.id,
        variables,
      },
    };
  }

  private resolveTemplateVariables(
    template: ReportTemplate,
    variables: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    template.variables.forEach(variable => {
      const rawValue = variables[variable.name];
      const hasValue = rawValue !== undefined && rawValue !== null;
      const value = hasValue ? rawValue : variable.defaultValue;

      if ((value === undefined || value === null) && variable.required) {
        throw new Error(`报告变量缺失: ${variable.name}`);
      }

      if (value === undefined || value === null) {
        return;
      }

      const normalized = this.normalizeVariableValue(variable.name, value, variable.type);
      this.validateVariableRules(variable.name, normalized, variable.validation);
      resolved[variable.name] = normalized;
    });

    return resolved;
  }

  private normalizeVariableValue(name: string, value: unknown, type: ReportVariable['type']) {
    switch (type) {
      case 'string':
        return String(value);
      case 'number': {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
          throw new Error(`报告变量 ${name} 必须为数字`);
        }
        return numeric;
      }
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        throw new Error(`报告变量 ${name} 必须为布尔值`);
      case 'date': {
        const parsed = value instanceof Date ? value : new Date(String(value));
        if (Number.isNaN(parsed.getTime())) {
          throw new Error(`报告变量 ${name} 必须为有效日期`);
        }
        return parsed.toISOString();
      }
      case 'array':
        if (!Array.isArray(value)) {
          throw new Error(`报告变量 ${name} 必须为数组`);
        }
        return value;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new Error(`报告变量 ${name} 必须为对象`);
        }
        return value as Record<string, unknown>;
      default:
        return value;
    }
  }

  private validateVariableRules(
    name: string,
    value: unknown,
    validation?: ReportVariable['validation']
  ): void {
    if (!validation) return;

    const { min, max, pattern } = validation;
    let numericValue: number | null = null;

    if (typeof value === 'number') {
      numericValue = value;
    } else if (typeof value === 'string') {
      numericValue = value.length;
    } else if (Array.isArray(value)) {
      numericValue = value.length;
    }

    if (min !== undefined && numericValue !== null && numericValue < min) {
      throw new Error(`报告变量 ${name} 不满足最小值要求`);
    }

    if (max !== undefined && numericValue !== null && numericValue > max) {
      throw new Error(`报告变量 ${name} 超过最大值限制`);
    }

    if (pattern && typeof value === 'string') {
      const regex = new RegExp(pattern);
      if (!regex.test(value)) {
        throw new Error(`报告变量 ${name} 不匹配校验规则`);
      }
    }
  }

  private buildTemplateSections(
    template: ReportTemplate,
    data: ReportData
  ): Record<string, unknown> {
    const detailMetricsSource = (data.metrics as { detailMetrics?: Record<string, unknown> })
      .detailMetrics;
    const detailMetricsList = detailMetricsSource
      ? Object.entries(detailMetricsSource).map(([name, value]) => ({
          name,
          ...(value as Record<string, unknown>),
        }))
      : [];
    const recommendations = data.tables.find(table => table.id === 'recommendations')?.rows || [];
    const recentTests = data.tables.find(table => table.id === 'recent-tests')?.rows || [];

    const filterByType = (type: string) =>
      detailMetricsList.filter(metric => String((metric as { type?: string }).type || '') === type);
    const filterBottlenecks = () =>
      detailMetricsList.filter(metric => {
        const severity = String((metric as { severity?: string }).severity || '').toLowerCase();
        const passed = (metric as { passed?: boolean }).passed;
        return passed === false || severity === 'high' || severity === 'critical';
      });

    const sectionMap: Record<string, unknown> = {
      summary: data.summary,
      key_metrics: data.metrics,
      recommendations,
      trend_analysis: data.charts,
      detailed_metrics: recentTests,
      performance_analysis: filterByType('performance'),
      security_analysis: filterByType('security'),
      compliance_checklist: filterByType('compliance'),
      security_findings: filterByType('security'),
      risk_assessment: filterByType('risk'),
      remediation_plan: recommendations,
      performance_metrics: filterByType('performance'),
      bottlenecks: filterBottlenecks(),
      optimization_recommendations: recommendations,
      appendix: {
        metrics: detailMetricsList,
        tables: data.tables,
      },
      cost_impact: data.metrics,
    };

    const sections: Record<string, unknown> = {};
    template.sections.forEach(section => {
      const key = section.id;
      sections[key] = sectionMap[key] ?? {};
    });

    return sections;
  }

  private mapGeneratorTemplate(template: ReportTemplate): string {
    switch (template.category) {
      case 'performance':
        return 'performance';
      case 'security':
        return 'compliance';
      case 'seo':
        return 'technical';
      case 'analytics':
        return 'executive';
      default:
        return 'custom';
    }
  }

  private normalizeFormat(format: ReportFormat['type']): GeneratorReportConfig['format'] | 'csv' {
    if (format === 'excel' || format === 'pdf' || format === 'html' || format === 'json') {
      return format;
    }
    return 'csv';
  }

  private convertReportToCSV(data: GeneratorReportData): string {
    const rows: string[] = [];
    rows.push('section,key,value');
    const appendEntries = (section: string, record: Record<string, unknown>) => {
      Object.entries(record).forEach(([key, value]) => {
        const safeValue = String(value ?? '').replace(/"/g, '""');
        rows.push(`${section},${key},"${safeValue}"`);
      });
    };

    appendEntries('summary', data.summary as Record<string, unknown>);
    appendEntries('metrics', data.metrics);
    return rows.join('\n');
  }

  private async resolveExecutionId(filters: ReportFilter[]): Promise<number | null> {
    const testIdFilter = filters.find(
      filter => filter.field === 'test_id' && filter.operator === 'equals'
    );
    if (!testIdFilter) {
      return null;
    }

    const result = await query('SELECT id FROM test_executions WHERE test_id = $1', [
      testIdFilter.value,
    ]);
    return result.rows[0]?.id ?? null;
  }

  private async saveReportRecord(
    executionId: number | null,
    template: ReportTemplate,
    format: string,
    data: GeneratorReportData,
    filePath: string,
    fileSize: number
  ): Promise<string> {
    const result = await query(
      `INSERT INTO test_reports (
         execution_id, report_type, format, report_data, file_path, file_size
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [executionId, template.type, format, JSON.stringify(data), filePath, fileSize]
    );
    return String(result.rows[0]?.id);
  }

  private async saveReportInstance(
    instanceId: string,
    reportId: string | null,
    instance: ReportInstance
  ) {
    await query(
      `INSERT INTO report_instances (
         id, report_id, config_id, template_id, status, format, generated_at, completed_at,
         duration, path, url, size, error, metadata
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         report_id = EXCLUDED.report_id,
         config_id = EXCLUDED.config_id,
         template_id = EXCLUDED.template_id,
         status = EXCLUDED.status,
         format = EXCLUDED.format,
         generated_at = EXCLUDED.generated_at,
         completed_at = EXCLUDED.completed_at,
         duration = EXCLUDED.duration,
         path = EXCLUDED.path,
         url = EXCLUDED.url,
         size = EXCLUDED.size,
         error = EXCLUDED.error,
         metadata = EXCLUDED.metadata`,
      [
        instanceId,
        reportId,
        instance.configId || null,
        instance.templateId || null,
        instance.status,
        instance.format,
        instance.generatedAt,
        instance.completedAt || null,
        instance.duration || null,
        instance.path || null,
        instance.url || null,
        instance.size || null,
        instance.error || null,
        JSON.stringify(instance.metadata || {}),
      ]
    );
  }

  private async loadReportInstancesFromDb(instanceId?: string): Promise<ReportInstance[]> {
    const params: unknown[] = [];
    const whereClause = instanceId ? 'WHERE ri.id = $1' : '';
    if (instanceId) {
      params.push(instanceId);
    }

    const result = await query(
      `SELECT
         ri.id,
         ri.report_id,
         ri.config_id,
         ri.template_id,
         ri.status,
         ri.format,
         ri.generated_at,
         ri.completed_at,
         ri.duration,
         ri.path,
         ri.url,
         ri.size,
         ri.error,
         ri.metadata
       FROM report_instances ri
       ${whereClause}
       ORDER BY ri.generated_at DESC`,
      params
    );

    return (result.rows || []).map(
      (row: Record<string, unknown>) =>
        ({
          id: String(row.id),
          configId: row.config_id ? String(row.config_id) : '',
          templateId: row.template_id ? String(row.template_id) : '',
          status: (row.status as ReportInstance['status']) || 'completed',
          generatedAt: row.generated_at
            ? new Date(row.generated_at as string | number | Date)
            : new Date(),
          completedAt: row.completed_at
            ? new Date(row.completed_at as string | number | Date)
            : undefined,
          duration: row.duration ? Number(row.duration) : undefined,
          format: String(row.format || 'json'),
          size: row.size ? Number(row.size) : undefined,
          path: row.path ? String(row.path) : undefined,
          url: row.url ? String(row.url) : undefined,
          error: row.error ? String(row.error) : undefined,
          metadata: (row.metadata as Record<string, unknown>) || {},
        }) as ReportInstance
    );
  }

  private async logReportAccess(
    reportId: string,
    userId: string | null,
    shareId: string | null,
    accessType: 'view' | 'download' | 'share' | 'generate',
    success: boolean,
    errorMessage?: string,
    userAgent?: string,
    ipAddress?: string
  ) {
    await query(
      `INSERT INTO report_access_logs
       (report_id, user_id, share_id, access_type, ip_address, user_agent, success, error_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        reportId,
        userId,
        shareId,
        accessType,
        ipAddress || null,
        userAgent || null,
        success,
        errorMessage || null,
      ]
    );
  }

  private buildFilterClause(filters: ReportFilter[]): { clause: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];

    const fieldMap: Record<string, string> = {
      engine_type: 'te.engine_type',
      status: 'te.status',
      user_id: 'te.user_id',
      test_id: 'te.test_id',
      created_at: 'te.created_at',
      started_at: 'te.started_at',
      completed_at: 'te.completed_at',
      score: 'tr.score',
      test_url: 'te.test_url',
    };

    filters
      .filter(filter => filter.enabled !== false)
      .forEach(filter => {
        const column = fieldMap[filter.field];
        if (!column) return;
        const paramIndex = params.length + 1;

        switch (filter.operator) {
          case 'equals':
            clauses.push(`${column} = $${paramIndex}`);
            params.push(filter.value);
            break;
          case 'not_equals':
            clauses.push(`${column} != $${paramIndex}`);
            params.push(filter.value);
            break;
          case 'contains':
            clauses.push(`${column} ILIKE $${paramIndex}`);
            params.push(`%${filter.value}%`);
            break;
          case 'not_contains':
            clauses.push(`${column} NOT ILIKE $${paramIndex}`);
            params.push(`%${filter.value}%`);
            break;
          case 'greater_than':
            clauses.push(`${column} > $${paramIndex}`);
            params.push(filter.value);
            break;
          case 'less_than':
            clauses.push(`${column} < $${paramIndex}`);
            params.push(filter.value);
            break;
          case 'between': {
            if (Array.isArray(filter.value) && filter.value.length === 2) {
              const startIndex = params.length + 1;
              const endIndex = params.length + 2;
              clauses.push(`${column} BETWEEN $${startIndex} AND $${endIndex}`);
              params.push(filter.value[0], filter.value[1]);
            }
            break;
          }
          default:
            break;
        }
      });

    return { clause: clauses.join(' AND '), params };
  }
}

export default AutomatedReportingService;
