/**
 * 数据清理管理器
 * 处理测试数据的自动清理和生命周期管理
 */

import * as fs from 'fs/promises';
import cron from 'node-cron';
import * as path from 'path';
import { query } from '../../config/database';

interface CronTask {
  start: () => void;
  stop: () => void;
}

// 保留策略接口
export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataTypes: string[];
  retentionDays: number;
  conditions: CleanupCondition[];
  actions: CleanupAction[];
  priority: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 清理条件接口
export interface CleanupCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
  value: unknown;
  logicalOperator?: 'and' | 'or';
}

// 清理操作接口
export interface CleanupAction {
  type: 'delete' | 'archive' | 'compress' | 'move';
  target: string;
  parameters: Record<string, unknown>;
}

// 清理配置接口
export interface CleanupConfig {
  retentionPolicies: RetentionPolicy[];
  maxStorageSize: number;
  cleanupBatchSize: number;
  safetyMargin: number;
  scheduleEnabled: boolean;
  dryRun: boolean;
  notificationEnabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// 清理任务接口
export interface CleanupJob {
  id: string;
  name: string;
  description: string;
  policyId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  itemsProcessed: number;
  itemsTotal: number;
  sizeProcessed: number;
  sizeFreed: number;
  errors: string[];
  metadata: Record<string, unknown>;
}

// 清理结果接口
export interface CleanupResult {
  jobId: string;
  policyId: string;
  success: boolean;
  itemsProcessed: number;
  itemsTotal: number;
  sizeProcessed: number;
  sizeFreed: number;
  errors: string[];
  duration: number;
  metadata: Record<string, unknown>;
}

// 清理统计接口
export interface CleanupStatistics {
  totalCleanups: number;
  totalItemsProcessed: number;
  totalSizeFreed: number;
  averageCleanupTime: number;
  successRate: number;
  byPolicy: Record<string, number>;
  byDataType: Record<string, number>;
  trends: Array<{
    date: string;
    cleanups: number;
    itemsProcessed: number;
    sizeFreed: number;
    successRate: number;
  }>;
}

// 存储使用情况接口
export interface StorageUsage {
  totalSize: number;
  usedSize: number;
  freeSize: number;
  usagePercentage: number;
  byType: Record<string, number>;
  byAge: Record<string, number>;
}

/**
 * 数据清理管理器
 */
class DataCleanupManager {
  private config: CleanupConfig;
  private isRunning: boolean = false;
  private cleanupJobs: Map<string, CleanupJob> = new Map();
  private statistics: CleanupStatistics;
  private scheduledTasks: Map<string, CronTask> = new Map();
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();
  private dataDir: string;
  private jobsFile: string;
  private policiesFile: string;

  constructor(config: Partial<CleanupConfig> = {}) {
    this.config = {
      retentionPolicies: config.retentionPolicies || this.getDefaultRetentionPolicies(),
      maxStorageSize: config.maxStorageSize || 10 * 1024 * 1024 * 1024, // 10GB
      cleanupBatchSize: config.cleanupBatchSize || 1000,
      safetyMargin: config.safetyMargin || 0.1, // 10% 安全边际
      scheduleEnabled: config.scheduleEnabled !== false,
      dryRun: config.dryRun || false,
      notificationEnabled: config.notificationEnabled || false,
      logLevel: config.logLevel || 'info',
      ...config,
    };

    this.dataDir = path.join(process.cwd(), 'storage', 'cleanup');
    this.jobsFile = path.join(this.dataDir, 'cleanup_jobs.json');
    this.policiesFile = path.join(this.dataDir, 'cleanup_policies.json');

    this.statistics = {
      totalCleanups: 0,
      totalItemsProcessed: 0,
      totalSizeFreed: 0,
      averageCleanupTime: 0,
      successRate: 0,
      byPolicy: {},
      byDataType: {},
      trends: [],
    };

    // 初始化默认策略
    this.config.retentionPolicies.forEach(policy => {
      this.retentionPolicies.set(policy.id, policy);
    });
  }

  /**
   * 启动清理管理器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      await this.ensureDataDir();
      await this.loadPolicies();
      await this.loadJobs();

      // 启动调度任务
      if (this.config.scheduleEnabled) {
        this.startScheduledTasks();
      }

      this.isRunning = true;
      console.log('Data cleanup manager started');
    } catch (error) {
      console.error('Failed to start data cleanup manager:', error);
      throw error;
    }
  }

  /**
   * 停止清理管理器
   */
  async stop(): Promise<void> {
    // 停止所有调度任务
    for (const task of this.scheduledTasks.values()) {
      task.stop();
    }
    this.scheduledTasks.clear();

    // 等待所有活跃任务完成
    const activeJobs = Array.from(this.cleanupJobs.values()).filter(
      job => job.status === 'running'
    );
    for (const job of activeJobs) {
      await this.cancelCleanupJob(job.id);
    }

    this.isRunning = false;
    console.log('Data cleanup manager stopped');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await fs.access(this.dataDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 创建保留策略
   */
  async createRetentionPolicy(
    policyData: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const policyId = this.generatePolicyId();

    const policy: RetentionPolicy = {
      ...policyData,
      id: policyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.retentionPolicies.set(policyId, policy);
    this.config.retentionPolicies.push(policy);

    await this.savePolicies();
    return policyId;
  }

  /**
   * 获取保留策略
   */
  async getRetentionPolicy(policyId: string): Promise<RetentionPolicy | null> {
    return this.retentionPolicies.get(policyId) || null;
  }

  /**
   * 获取所有保留策略
   */
  async getAllRetentionPolicies(): Promise<RetentionPolicy[]> {
    return Array.from(this.retentionPolicies.values());
  }

  /**
   * 更新保留策略
   */
  async updateRetentionPolicy(
    policyId: string,
    updates: Partial<RetentionPolicy>
  ): Promise<RetentionPolicy> {
    const policy = this.retentionPolicies.get(policyId);
    if (!policy) {
      throw new Error('Retention policy not found');
    }

    const updatedPolicy = {
      ...policy,
      ...updates,
      updatedAt: new Date(),
    };

    this.retentionPolicies.set(policyId, updatedPolicy);

    // 更新配置中的策略
    const configIndex = this.config.retentionPolicies.findIndex(p => p.id === policyId);
    if (configIndex !== -1) {
      this.config.retentionPolicies[configIndex] = updatedPolicy;
    }

    await this.savePolicies();
    return updatedPolicy;
  }

  /**
   * 删除保留策略
   */
  async deleteRetentionPolicy(policyId: string): Promise<boolean> {
    const policy = this.retentionPolicies.get(policyId);
    if (!policy) {
      return false;
    }

    this.retentionPolicies.delete(policyId);

    // 从配置中移除
    this.config.retentionPolicies = this.config.retentionPolicies.filter(p => p.id !== policyId);

    await this.savePolicies();
    return true;
  }

  /**
   * 创建清理任务
   */
  async createCleanupJob(
    jobData: Omit<
      CleanupJob,
      | 'id'
      | 'createdAt'
      | 'progress'
      | 'itemsProcessed'
      | 'itemsTotal'
      | 'sizeProcessed'
      | 'sizeFreed'
      | 'errors'
    >
  ): Promise<string> {
    const jobId = this.generateJobId();

    const policy = this.retentionPolicies.get(jobData.policyId);
    if (!policy) {
      throw new Error('Retention policy not found');
    }

    const job: CleanupJob = {
      ...jobData,
      id: jobId,
      createdAt: new Date(),
      progress: 0,
      itemsProcessed: 0,
      itemsTotal: 0,
      sizeProcessed: 0,
      sizeFreed: 0,
      errors: [],
    };

    this.cleanupJobs.set(jobId, job);
    await this.saveJobs();

    // 自动执行任务
    if (jobData.status === 'pending') {
      this.executeCleanupJob(jobId);
    }

    return jobId;
  }

  /**
   * 获取清理任务
   */
  async getCleanupJob(jobId: string): Promise<CleanupJob | null> {
    return this.cleanupJobs.get(jobId) || null;
  }

  /**
   * 获取所有清理任务
   */
  async getAllCleanupJobs(): Promise<CleanupJob[]> {
    return Array.from(this.cleanupJobs.values());
  }

  /**
   * 更新清理任务
   */
  async updateCleanupJob(jobId: string, updates: Partial<CleanupJob>): Promise<CleanupJob> {
    const job = this.cleanupJobs.get(jobId);
    if (!job) {
      throw new Error('Cleanup job not found');
    }

    const updatedJob = {
      ...job,
      ...updates,
    };

    this.cleanupJobs.set(jobId, updatedJob);
    await this.saveJobs();

    return updatedJob;
  }

  /**
   * 删除清理任务
   */
  async deleteCleanupJob(jobId: string): Promise<boolean> {
    const job = this.cleanupJobs.get(jobId);
    if (!job) {
      return false;
    }

    // 如果任务正在运行，先取消
    if (job.status === 'running') {
      await this.cancelCleanupJob(jobId);
    }

    this.cleanupJobs.delete(jobId);
    await this.saveJobs();

    return true;
  }

  /**
   * 执行清理任务
   */
  async executeCleanupJob(jobId: string): Promise<CleanupResult> {
    const job = this.cleanupJobs.get(jobId);
    if (!job) {
      throw new Error('Cleanup job not found');
    }

    if (job.status !== 'pending') {
      throw new Error('Job is not in pending status');
    }

    const startTime = Date.now();

    // 更新任务状态
    job.status = 'running';
    job.startedAt = new Date();
    job.progress = 0;

    try {
      const policy = this.retentionPolicies.get(job.policyId);
      if (!policy) {
        throw new Error('Retention policy not found');
      }

      // 执行清理
      const result = await this.performCleanup(job, policy);

      // 更新任务状态
      job.status = 'completed';
      job.completedAt = new Date();
      job.duration = Date.now() - startTime;
      job.itemsProcessed = result.itemsProcessed;
      job.itemsTotal = result.itemsTotal;
      job.sizeProcessed = result.sizeProcessed;
      job.sizeFreed = result.sizeFreed;
      job.errors = result.errors;
      job.progress = 100;

      // 更新统计
      this.updateStatistics(result);

      await this.saveJobs();
      return result;
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.duration = Date.now() - startTime;
      job.errors.push(error instanceof Error ? error.message : String(error));

      await this.saveJobs();
      throw error;
    }
  }

  /**
   * 取消清理任务
   */
  async cancelCleanupJob(jobId: string): Promise<boolean> {
    const job = this.cleanupJobs.get(jobId);
    if (!job || job.status !== 'running') {
      return false;
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    job.duration = job.startedAt ? Date.now() - job.startedAt.getTime() : 0;

    await this.saveJobs();
    return true;
  }

  /**
   * 获取存储使用情况
   */
  async getStorageUsage(): Promise<StorageUsage> {
    const totalSize = this.config.maxStorageSize;
    const byType: Record<string, number> = {};
    const byAge: Record<string, number> = {
      less_than_7_days: 0,
      '7_to_30_days': 0,
      '30_to_90_days': 0,
      more_than_90_days: 0,
    };

    const typePaths = this.getDataTypePaths();
    const now = Date.now();
    let usedSize = 0;

    for (const [type, dirPath] of Object.entries(typePaths)) {
      const { size, ages } = await this.calculateDirectoryUsage(dirPath, now);
      if (size === 0) {
        continue;
      }
      byType[type] = (byType[type] || 0) + size;
      usedSize += size;
      byAge.less_than_7_days += ages.less_than_7_days;
      byAge['7_to_30_days'] += ages['7_to_30_days'];
      byAge['30_to_90_days'] += ages['30_to_90_days'];
      byAge.more_than_90_days += ages.more_than_90_days;
    }

    const freeSize = Math.max(0, totalSize - usedSize);
    const usagePercentage = totalSize > 0 ? (usedSize / totalSize) * 100 : 0;

    return {
      totalSize,
      usedSize,
      freeSize,
      usagePercentage,
      byType,
      byAge,
    };
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<CleanupStatistics> {
    const jobs = Array.from(this.cleanupJobs.values());

    const totalCleanups = jobs.filter(job => job.status === 'completed').length;
    const totalItemsProcessed = jobs
      .filter(job => job.status === 'completed')
      .reduce((sum, job) => sum + job.itemsProcessed, 0);
    const totalSizeFreed = jobs
      .filter(job => job.status === 'completed')
      .reduce((sum, job) => sum + job.sizeFreed, 0);

    const durations = jobs
      .filter(
        (job): job is CleanupJob & { duration: number } =>
          job.status === 'completed' && typeof job.duration === 'number'
      )
      .map(job => job.duration);
    const averageCleanupTime =
      durations.length > 0
        ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
        : 0;

    const successfulJobs = jobs.filter(job => job.status === 'completed').length;
    const successRate = jobs.length > 0 ? (successfulJobs / jobs.length) * 100 : 0;

    const byPolicy: Record<string, number> = {};
    const byDataType: Record<string, number> = {};

    jobs.forEach(job => {
      byPolicy[job.policyId] = (byPolicy[job.policyId] || 0) + 1;
    });

    const trends = this.calculateCleanupTrends(jobs);

    return {
      totalCleanups,
      totalItemsProcessed,
      totalSizeFreed,
      averageCleanupTime,
      successRate,
      byPolicy,
      byDataType,
      trends,
    };
  }

  /**
   * 执行清理操作
   */
  private async performCleanup(job: CleanupJob, policy: RetentionPolicy): Promise<CleanupResult> {
    const startTime = Date.now();
    let itemsProcessed = 0;
    let sizeFreed = 0;
    const errors: string[] = [];

    try {
      // 扫描符合条件的文件
      const items = await this.scanItems(policy);
      job.itemsTotal = items.length;

      // 批量处理
      for (let i = 0; i < items.length; i += this.config.cleanupBatchSize) {
        const batch = items.slice(i, i + this.config.cleanupBatchSize);

        for (const item of batch) {
          try {
            const result = await this.processItem(item, policy);
            itemsProcessed++;
            sizeFreed += result.sizeFreed;

            // 更新进度
            job.itemsProcessed = itemsProcessed;
            job.sizeFreed = sizeFreed;
            job.progress = Math.floor((itemsProcessed / items.length) * 100);
          } catch (error) {
            errors.push(
              `Failed to process ${item.path}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        // 检查是否被取消
        if (job.status === 'cancelled') {
          break;
        }
      }

      return {
        jobId: job.id,
        policyId: policy.id,
        success: job.status !== 'failed',
        itemsProcessed,
        itemsTotal: items.length,
        sizeProcessed: sizeFreed,
        sizeFreed,
        errors,
        duration: Date.now() - startTime,
        metadata: {
          dryRun: this.config.dryRun,
          batchSize: this.config.cleanupBatchSize,
        },
      };
    } catch (error) {
      errors.push(`Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);

      return {
        jobId: job.id,
        policyId: policy.id,
        success: false,
        itemsProcessed,
        itemsTotal: job.itemsTotal,
        sizeProcessed: sizeFreed,
        sizeFreed,
        errors,
        duration: Date.now() - startTime,
        metadata: {
          dryRun: this.config.dryRun,
          batchSize: this.config.cleanupBatchSize,
        },
      };
    }
  }

  /**
   * 扫描项目
   */
  private async scanItems(policy: RetentionPolicy): Promise<
    Array<{
      path: string;
      size: number;
      createdAt: Date;
      type: string;
    }>
  > {
    const items: Array<{
      path: string;
      size: number;
      createdAt: Date;
      type: string;
    }> = [];

    const typePaths = this.getDataTypePaths();
    const now = Date.now();

    for (const dataType of policy.dataTypes) {
      const dirPath = typePaths[dataType];
      if (!dirPath) continue;

      const files = await this.listFiles(dirPath);
      for (const filePath of files) {
        try {
          const stats = await fs.stat(filePath);
          if (!stats.isFile()) continue;

          const ageDays = (now - stats.mtime.getTime()) / (24 * 60 * 60 * 1000);
          if (ageDays <= policy.retentionDays) continue;

          items.push({
            path: filePath,
            size: stats.size,
            createdAt: stats.mtime,
            type: dataType,
          });
        } catch {
          // 忽略无法访问的文件
        }
      }
    }

    return items;
  }

  /**
   * 处理单个项目
   */
  private async processItem(
    item: {
      path: string;
      size: number;
      createdAt: Date;
      type: string;
    },
    policy: RetentionPolicy
  ): Promise<{
    sizeFreed: number;
  }> {
    if (this.config.dryRun) {
      // 干运行模式，只计算但不实际删除
      return { sizeFreed: item.size };
    }

    // 实际执行清理操作
    for (const action of policy.actions) {
      switch (action.type) {
        case 'delete':
          await this.deleteItem(item.path);
          break;
        case 'archive':
          await this.archiveItem(item.path, action.parameters);
          break;
        case 'compress':
          await this.compressItem(item.path, action.parameters);
          break;
        case 'move': {
          const targetPath = action.parameters.target;
          if (typeof targetPath !== 'string') {
            throw new Error('Move action requires target path');
          }
          await this.moveItem(item.path, targetPath);
          break;
        }
      }
    }

    return { sizeFreed: item.size };
  }

  /**
   * 删除项目
   */
  private async deleteItem(itemPath: string): Promise<void> {
    await fs.rm(itemPath, { recursive: true, force: true });
  }

  /**
   * 归档项目
   */
  private async archiveItem(itemPath: string, parameters: Record<string, unknown>): Promise<void> {
    const archivePath =
      typeof parameters.archivePath === 'string'
        ? parameters.archivePath
        : path.join(process.cwd(), 'archives');
    await fs.mkdir(archivePath, { recursive: true });
    const targetPath = path.join(archivePath, path.basename(itemPath));
    await fs.rename(itemPath, targetPath).catch(async () => {
      await fs.copyFile(itemPath, targetPath);
      await fs.rm(itemPath, { force: true });
    });
  }

  /**
   * 压缩项目
   */
  private async compressItem(itemPath: string, parameters: Record<string, unknown>): Promise<void> {
    const zlib = await import('zlib');
    const compressionLevel =
      typeof parameters.compressionLevel === 'number' ? parameters.compressionLevel : 6;
    const content = await fs.readFile(itemPath);
    const compressed = await new Promise<Buffer>((resolve, reject) => {
      zlib.gzip(content, { level: compressionLevel }, (err: Error | null, result: Buffer) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    const targetPath = `${itemPath}.gz`;
    await fs.writeFile(targetPath, compressed);
    await fs.rm(itemPath, { force: true });
  }

  /**
   * 移动项目
   */
  private async moveItem(itemPath: string, targetPath: string): Promise<void> {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.rename(itemPath, targetPath).catch(async () => {
      await fs.copyFile(itemPath, targetPath);
      await fs.rm(itemPath, { force: true });
    });
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(result: CleanupResult): void {
    this.statistics.totalCleanups++;
    this.statistics.totalItemsProcessed += result.itemsProcessed;
    this.statistics.totalSizeFreed += result.sizeFreed;
  }

  /**
   * 计算清理趋势
   */
  private calculateCleanupTrends(jobs: CleanupJob[]): Array<{
    date: string;
    cleanups: number;
    itemsProcessed: number;
    sizeFreed: number;
    successRate: number;
  }> {
    const dailyStats: Record<
      string,
      {
        cleanups: number;
        itemsProcessed: number;
        sizeFreed: number;
        successes: number;
        total: number;
      }
    > = {};

    jobs
      .filter(
        (job): job is CleanupJob & { completedAt: Date } =>
          job.status === 'completed' && job.completedAt instanceof Date
      )
      .forEach(job => {
        const date = job.completedAt.toISOString().split('T')[0];

        if (!dailyStats[date]) {
          dailyStats[date] = {
            cleanups: 0,
            itemsProcessed: 0,
            sizeFreed: 0,
            successes: 0,
            total: 0,
          };
        }

        dailyStats[date].cleanups++;
        dailyStats[date].itemsProcessed += job.itemsProcessed;
        dailyStats[date].sizeFreed += job.sizeFreed;
        dailyStats[date].successes++;
        dailyStats[date].total++;
      });

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        cleanups: stats.cleanups,
        itemsProcessed: stats.itemsProcessed,
        sizeFreed: stats.sizeFreed,
        successRate: stats.total > 0 ? (stats.successes / stats.total) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 启动调度任务
   */
  private startScheduledTasks(): void {
    const task = cron.schedule('0 2 * * *', async () => {
      try {
        await this.performScheduledCleanup();
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    });

    this.scheduledTasks.set('daily', task);
    task.start();
  }

  /**
   * 执行计划清理
   */
  private async performScheduledCleanup(): Promise<void> {
    for (const policy of this.retentionPolicies.values()) {
      if (policy.enabled) {
        await this.createCleanupJob({
          name: `Scheduled cleanup for ${policy.name}`,
          description: 'Automatically triggered cleanup',
          policyId: policy.id,
          status: 'pending',
          metadata: { scheduled: true },
        });
      }
    }
  }

  /**
   * 获取默认保留策略
   */
  private getDefaultRetentionPolicies(): RetentionPolicy[] {
    return [
      {
        id: 'test_results_policy',
        name: '测试结果保留策略',
        description: '清理超过30天的测试结果',
        dataTypes: ['test_results', 'performance_data'],
        retentionDays: 30,
        conditions: [
          {
            field: 'createdAt',
            operator: 'less_than',
            value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        ],
        actions: [
          {
            type: 'archive',
            target: './archives/test_results',
            parameters: { compressionLevel: 6 },
          },
        ],
        priority: 1,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'logs_policy',
        name: '日志文件保留策略',
        description: '清理超过7天的日志文件',
        dataTypes: ['logs'],
        retentionDays: 7,
        conditions: [
          {
            field: 'createdAt',
            operator: 'less_than',
            value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        ],
        actions: [
          {
            type: 'delete',
            target: '',
            parameters: {},
          },
        ],
        priority: 2,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'temp_files_policy',
        name: '临时文件保留策略',
        description: '清理超过1天的临时文件',
        dataTypes: ['temp'],
        retentionDays: 1,
        conditions: [
          {
            field: 'createdAt',
            operator: 'less_than',
            value: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        ],
        actions: [
          {
            type: 'delete',
            target: '',
            parameters: {},
          },
        ],
        priority: 3,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  /**
   * 加载任务
   */
  private async loadJobs(): Promise<void> {
    try {
      const result = await query(
        `SELECT id, name, description, policy_id, status, progress,
                created_at, started_at, completed_at, duration,
                items_processed, items_total, size_processed, size_freed,
                errors, metadata
         FROM cleanup_jobs
         ORDER BY created_at DESC`
      );
      this.cleanupJobs.clear();
      result.rows.forEach(row => {
        this.cleanupJobs.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          policyId: row.policy_id,
          status: row.status,
          progress: Number(row.progress || 0),
          createdAt: new Date(row.created_at),
          startedAt: row.started_at ? new Date(row.started_at) : undefined,
          completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
          duration: row.duration ?? undefined,
          itemsProcessed: Number(row.items_processed || 0),
          itemsTotal: Number(row.items_total || 0),
          sizeProcessed: Number(row.size_processed || 0),
          sizeFreed: Number(row.size_freed || 0),
          errors: row.errors || [],
          metadata: row.metadata || {},
        });
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '42P01') {
        await this.createCleanupTables();
        await this.loadJobs();
        return;
      }
      throw error;
    }
  }

  /**
   * 保存任务
   */
  private async saveJobs(): Promise<void> {
    try {
      const jobs = Array.from(this.cleanupJobs.values());
      for (const job of jobs) {
        await query(
          `INSERT INTO cleanup_jobs (
             id, name, description, policy_id, status, progress,
             created_at, started_at, completed_at, duration,
             items_processed, items_total, size_processed, size_freed,
             errors, metadata
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             policy_id = EXCLUDED.policy_id,
             status = EXCLUDED.status,
             progress = EXCLUDED.progress,
             started_at = EXCLUDED.started_at,
             completed_at = EXCLUDED.completed_at,
             duration = EXCLUDED.duration,
             items_processed = EXCLUDED.items_processed,
             items_total = EXCLUDED.items_total,
             size_processed = EXCLUDED.size_processed,
             size_freed = EXCLUDED.size_freed,
             errors = EXCLUDED.errors,
             metadata = EXCLUDED.metadata`,
          [
            job.id,
            job.name,
            job.description,
            job.policyId,
            job.status,
            job.progress,
            job.createdAt,
            job.startedAt || null,
            job.completedAt || null,
            job.duration || null,
            job.itemsProcessed,
            job.itemsTotal,
            job.sizeProcessed,
            job.sizeFreed,
            JSON.stringify(job.errors || []),
            JSON.stringify(job.metadata || {}),
          ]
        );
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '42P01') {
        await this.createCleanupTables();
        await this.saveJobs();
        return;
      }
      throw error;
    }
  }

  /**
   * 保存策略
   */
  private async savePolicies(): Promise<void> {
    try {
      const policies = Array.from(this.retentionPolicies.values());
      for (const policy of policies) {
        await query(
          `INSERT INTO cleanup_policies (
             id, name, description, data_types, retention_days,
             conditions, actions, priority, enabled, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             data_types = EXCLUDED.data_types,
             retention_days = EXCLUDED.retention_days,
             conditions = EXCLUDED.conditions,
             actions = EXCLUDED.actions,
             priority = EXCLUDED.priority,
             enabled = EXCLUDED.enabled,
             updated_at = EXCLUDED.updated_at`,
          [
            policy.id,
            policy.name,
            policy.description,
            policy.dataTypes,
            policy.retentionDays,
            JSON.stringify(policy.conditions || []),
            JSON.stringify(policy.actions || []),
            policy.priority,
            policy.enabled,
            policy.createdAt,
            policy.updatedAt,
          ]
        );
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '42P01') {
        await this.createCleanupTables();
        await this.savePolicies();
        return;
      }
      throw error;
    }
  }

  private async loadPolicies(): Promise<void> {
    try {
      const result = await query(
        `SELECT id, name, description, data_types, retention_days,
                conditions, actions, priority, enabled, created_at, updated_at
         FROM cleanup_policies
         ORDER BY priority ASC, created_at ASC`
      );
      this.retentionPolicies.clear();
      if (result.rows.length === 0) {
        const defaults = this.getDefaultRetentionPolicies();
        defaults.forEach(policy => this.retentionPolicies.set(policy.id, policy));
        this.config.retentionPolicies = defaults;
        await this.savePolicies();
        return;
      }
      result.rows.forEach(row => {
        this.retentionPolicies.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          dataTypes: row.data_types || [],
          retentionDays: Number(row.retention_days || 0),
          conditions: row.conditions || [],
          actions: row.actions || [],
          priority: Number(row.priority || 0),
          enabled: row.enabled !== false,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        });
      });
      this.config.retentionPolicies = Array.from(this.retentionPolicies.values());
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '42P01') {
        await this.createCleanupTables();
        await this.loadPolicies();
        return;
      }
      throw error;
    }
  }

  private async createCleanupTables(): Promise<void> {
    await query(
      `CREATE TABLE IF NOT EXISTS cleanup_policies (
         id VARCHAR(80) PRIMARY KEY,
         name VARCHAR(255) NOT NULL,
         description TEXT,
         data_types TEXT[] DEFAULT ARRAY[]::TEXT[],
         retention_days INTEGER NOT NULL,
         conditions JSONB DEFAULT '[]',
         actions JSONB DEFAULT '[]',
         priority INTEGER DEFAULT 0,
         enabled BOOLEAN DEFAULT true,
         created_at TIMESTAMPTZ DEFAULT NOW(),
         updated_at TIMESTAMPTZ DEFAULT NOW()
       );

       CREATE TABLE IF NOT EXISTS cleanup_jobs (
         id VARCHAR(80) PRIMARY KEY,
         name VARCHAR(255) NOT NULL,
         description TEXT,
         policy_id VARCHAR(80) NOT NULL REFERENCES cleanup_policies(id) ON DELETE CASCADE,
         status VARCHAR(20) NOT NULL,
         progress INTEGER DEFAULT 0,
         created_at TIMESTAMPTZ DEFAULT NOW(),
         started_at TIMESTAMPTZ,
         completed_at TIMESTAMPTZ,
         duration INTEGER,
         items_processed INTEGER DEFAULT 0,
         items_total INTEGER DEFAULT 0,
         size_processed BIGINT DEFAULT 0,
         size_freed BIGINT DEFAULT 0,
         errors JSONB DEFAULT '[]',
         metadata JSONB DEFAULT '{}'
       );

       CREATE INDEX IF NOT EXISTS idx_cleanup_jobs_status ON cleanup_jobs(status);
       CREATE INDEX IF NOT EXISTS idx_cleanup_jobs_policy ON cleanup_jobs(policy_id);
       CREATE INDEX IF NOT EXISTS idx_cleanup_jobs_created ON cleanup_jobs(created_at DESC);
       CREATE INDEX IF NOT EXISTS idx_cleanup_policies_priority ON cleanup_policies(priority);`
    );
  }

  private async ensureDataDir(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  private getDataTypePaths(): Record<string, string> {
    const baseStorage = path.join(process.cwd(), 'storage');
    return {
      test_results: path.join(baseStorage, 'test_results'),
      performance_data: path.join(baseStorage, 'performance_data'),
      logs: path.join(process.cwd(), 'logs'),
      temp: path.join(process.cwd(), 'temp'),
      other: baseStorage,
    };
  }

  private async calculateDirectoryUsage(
    dirPath: string,
    now: number
  ): Promise<{ size: number; ages: StorageUsage['byAge'] }> {
    const ages: StorageUsage['byAge'] = {
      less_than_7_days: 0,
      '7_to_30_days': 0,
      '30_to_90_days': 0,
      more_than_90_days: 0,
    };
    let size = 0;

    const files = await this.listFiles(dirPath);
    for (const filePath of files) {
      try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) continue;
        size += stats.size;
        const ageDays = (now - stats.mtime.getTime()) / (24 * 60 * 60 * 1000);
        if (ageDays <= 7) ages.less_than_7_days += stats.size;
        else if (ageDays <= 30) ages['7_to_30_days'] += stats.size;
        else if (ageDays <= 90) ages['30_to_90_days'] += stats.size;
        else ages.more_than_90_days += stats.size;
      } catch {
        // ignore
      }
    }

    return { size, ages };
  }

  private async listFiles(dirPath: string): Promise<string[]> {
    const result: string[] = [];
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      await Promise.all(
        entries.map(async entry => {
          const entryPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            result.push(...(await this.listFiles(entryPath)));
          } else {
            result.push(entryPath);
          }
        })
      );
    } catch {
      return result;
    }
    return result;
  }

  /**
   * 生成任务ID
   */
  private generateJobId(): string {
    return `cleanup_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成策略ID
   */
  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default DataCleanupManager;
