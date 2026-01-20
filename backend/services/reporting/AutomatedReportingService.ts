/**
 * 自动化报告服务
 * 提供定时报告生成、邮件发送、报告模板等功能
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { query } from '../../config/database';
import ReportGenerator, {
  ReportConfig as GeneratorReportConfig,
  ReportData as GeneratorReportData,
} from './ReportGenerator';
const cron = require('node-cron');
const nodemailer = require('nodemailer');

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
  private templatesFile: string;
  private configsFile: string;

  constructor() {
    super();
    this.reportGenerator = new ReportGenerator();
    this.reportsDir = path.join(__dirname, '../../reports');
    this.templatesFile = path.join(this.reportsDir, 'report_templates.json');
    this.configsFile = path.join(this.reportsDir, 'report_configs.json');
    this.initializeDefaultTemplates();
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

      // 加载配置
      await this.loadConfigs();

      // 设置邮件传输
      await this.setupMailTransporter();

      // 启动调度任务
      this.startScheduledTasks();

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

    try {
      // 收集数据
      const data = options.data || (await this.collectReportData(config));

      const generatorData = this.buildGeneratorData(config, template, data);
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
      throw error;
    }
  }

  /**
   * 获取报告实例
   */
  async getReportInstance(instanceId: string): Promise<ReportInstance | null> {
    return this.instances.get(instanceId) || null;
  }

  /**
   * 获取所有报告实例
   */
  async getAllReportInstances(): Promise<ReportInstance[]> {
    return Array.from(this.instances.values());
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

    return true;
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<ReportStatistics> {
    const instances = Array.from(this.instances.values());

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
  private initializeDefaultTemplates(): void {
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

    defaultTemplates.forEach(template => {
      this.createTemplate(template);
    });
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
    try {
      const raw = await fs.readFile(this.templatesFile, 'utf8');
      const data = JSON.parse(raw) as ReportTemplate[];
      data.forEach(template => this.templates.set(template.id, template));
    } catch {
      // 忽略首次加载失败
    }
  }

  /**
   * 保存模板
   */
  private async saveTemplates(): Promise<void> {
    const data = Array.from(this.templates.values());
    await fs.writeFile(this.templatesFile, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * 加载配置
   */
  private async loadConfigs(): Promise<void> {
    try {
      const raw = await fs.readFile(this.configsFile, 'utf8');
      const data = JSON.parse(raw) as ReportConfig[];
      data.forEach(config => this.configs.set(config.id, config));
    } catch {
      // 忽略首次加载失败
    }
  }

  /**
   * 保存配置
   */
  private async saveConfigs(): Promise<void> {
    const data = Array.from(this.configs.values());
    await fs.writeFile(this.configsFile, JSON.stringify(data, null, 2), 'utf8');
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

  private buildGeneratorData(
    config: ReportConfig,
    template: ReportTemplate,
    data: ReportData
  ): GeneratorReportData {
    const summary = data.summary as {
      overallScore?: number;
      totalTests?: number;
      failedTests?: number;
    };

    const overallScore = Number(summary.overallScore) || 0;
    const failedTests = Number(summary.failedTests) || 0;

    const sections: Record<string, unknown> = {
      summary: data.summary,
      key_metrics: data.metrics,
      recommendations: data.tables.find(table => table.id === 'recommendations')?.rows || [],
      trend_analysis: data.charts,
      detailed_metrics: data.tables.find(table => table.id === 'recent-tests')?.rows || [],
    };

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
      },
    };
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
  ): Promise<number> {
    const result = await query(
      `INSERT INTO test_reports (
         execution_id, report_type, format, report_data, file_path, file_size
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [executionId, template.type, format, JSON.stringify(data), filePath, fileSize]
    );
    return result.rows[0]?.id;
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
