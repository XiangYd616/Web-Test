/**
 * 数据归档管理器
 * 处理测试数据的生命周期管理和归档
 */

import * as fs from 'fs/promises';
import cron from 'node-cron';
import * as path from 'path';
import * as tar from 'tar';
import * as zlib from 'zlib';

interface CronTask {
  start: () => void;
  stop: () => void;
}

// 归档配置接口
export interface ArchiveConfig {
  archivePath: string;
  tempPath: string;
  compressionLevel: number;
  batchSize: number;
  maxArchiveSize: number;
  scheduleEnabled: boolean;
  retentionDays: number;
  compressionFormat: 'gzip' | 'bzip2' | 'xz';
  encryptionEnabled: boolean;
  encryptionKey?: string;
}

// 归档任务接口
export interface ArchiveJob {
  id: string;
  name: string;
  description: string;
  sourcePath: string;
  targetPath: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  size: number;
  compressedSize?: number;
  compressionRatio?: number;
  filesCount: number;
  archivedFilesCount: number;
  error?: string;
  metadata: Record<string, unknown>;
}

// 归档策略接口
export interface ArchivePolicy {
  id: string;
  name: string;
  description: string;
  rules: ArchiveRule[];
  schedule: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 归档规则接口
export interface ArchiveRule {
  id: string;
  name: string;
  condition: string;
  action: 'archive' | 'delete' | 'compress';
  priority: number;
  enabled: boolean;
  parameters: Record<string, unknown>;
}

// 归档统计接口
export interface ArchiveStatistics {
  totalArchives: number;
  totalArchivedSize: number;
  totalCompressedSize: number;
  averageCompressionRatio: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  trends: Array<{
    date: string;
    archives: number;
    size: number;
    compressionRatio: number;
  }>;
}

// 归档结果接口
export interface ArchiveResult {
  jobId: string;
  success: boolean;
  archivePath: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  filesCount: number;
  duration: number;
  metadata: Record<string, unknown>;
}

/**
 * 数据归档管理器
 */
class DataArchiveManager {
  private config: ArchiveConfig;
  private isRunning: boolean = false;
  private archiveJobs: Map<string, ArchiveJob> = new Map();
  private statistics: ArchiveStatistics;
  private scheduledTasks: Map<string, CronTask> = new Map();
  private policies: Map<string, ArchivePolicy> = new Map();
  private dataDir: string;
  private jobsFile: string;
  private policiesFile: string;

  constructor(config: Partial<ArchiveConfig> = {}) {
    this.config = {
      archivePath: config.archivePath || './archives',
      tempPath: config.tempPath || './temp',
      compressionLevel: config.compressionLevel || 9,
      batchSize: config.batchSize || 1000,
      maxArchiveSize: config.maxArchiveSize || 1024 * 1024 * 1024, // 1GB
      scheduleEnabled: config.scheduleEnabled !== false,
      retentionDays: config.retentionDays || 30,
      compressionFormat: config.compressionFormat || 'gzip',
      encryptionEnabled: config.encryptionEnabled || false,
      encryptionKey: config.encryptionKey,
      ...config,
    };

    this.dataDir = path.join(process.cwd(), 'storage', 'archive');
    this.jobsFile = path.join(this.dataDir, 'archive_jobs.json');
    this.policiesFile = path.join(this.dataDir, 'archive_policies.json');

    this.statistics = {
      totalArchives: 0,
      totalArchivedSize: 0,
      totalCompressedSize: 0,
      averageCompressionRatio: 0,
      activeJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      byStatus: {},
      byType: {},
      trends: [],
    };

    this.initializeDefaultPolicies();
  }

  /**
   * 启动归档管理器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      // 确保目录存在
      await this.ensureDirectories();
      await fs.mkdir(this.dataDir, { recursive: true });

      // 加载现有任务
      await this.loadJobs();

      // 启动调度任务
      if (this.config.scheduleEnabled) {
        this.startScheduledTasks();
      }

      this.isRunning = true;
      console.log('Data archive manager started');
    } catch (error) {
      console.error('Failed to start data archive manager:', error);
      throw error;
    }
  }

  /**
   * 停止归档管理器
   */
  async stop(): Promise<void> {
    // 停止所有调度任务
    for (const task of this.scheduledTasks.values()) {
      task.stop();
    }
    this.scheduledTasks.clear();

    // 等待所有活跃任务完成
    const activeJobs = Array.from(this.archiveJobs.values()).filter(
      job => job.status === 'running'
    );
    for (const job of activeJobs) {
      await this.cancelArchiveJob(job.id);
    }

    this.isRunning = false;
    console.log('Data archive manager stopped');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await fs.access(this.config.archivePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 创建归档任务
   */
  async createArchiveJob(
    jobData: Omit<ArchiveJob, 'id' | 'createdAt' | 'progress' | 'filesCount' | 'archivedFilesCount'>
  ): Promise<string> {
    const jobId = this.generateJobId();

    // 检查源路径
    try {
      await fs.access(jobData.sourcePath);
    } catch {
      throw new Error(`Source path does not exist: ${jobData.sourcePath}`);
    }

    const job: ArchiveJob = {
      ...jobData,
      id: jobId,
      createdAt: new Date(),
      progress: 0,
      filesCount: 0,
      archivedFilesCount: 0,
    };

    this.archiveJobs.set(jobId, job);
    await this.saveJobs();

    // 自动执行任务
    if (jobData.status === 'pending') {
      this.executeArchiveJob(jobId);
    }

    return jobId;
  }

  /**
   * 获取归档任务
   */
  async getArchiveJob(jobId: string): Promise<ArchiveJob | null> {
    return this.archiveJobs.get(jobId) || null;
  }

  /**
   * 获取所有归档任务
   */
  async getAllArchiveJobs(): Promise<ArchiveJob[]> {
    return Array.from(this.archiveJobs.values());
  }

  /**
   * 更新归档任务
   */
  async updateArchiveJob(jobId: string, updates: Partial<ArchiveJob>): Promise<ArchiveJob> {
    const job = this.archiveJobs.get(jobId);
    if (!job) {
      throw new Error('Archive job not found');
    }

    const updatedJob = {
      ...job,
      ...updates,
    };

    this.archiveJobs.set(jobId, updatedJob);
    await this.saveJobs();

    return updatedJob;
  }

  /**
   * 删除归档任务
   */
  async deleteArchiveJob(jobId: string): Promise<boolean> {
    const job = this.archiveJobs.get(jobId);
    if (!job) {
      return false;
    }

    // 如果任务正在运行，先取消
    if (job.status === 'running') {
      await this.cancelArchiveJob(jobId);
    }

    this.archiveJobs.delete(jobId);
    await this.saveJobs();

    return true;
  }

  /**
   * 执行归档任务
   */
  async executeArchiveJob(jobId: string): Promise<ArchiveResult> {
    const job = this.archiveJobs.get(jobId);
    if (!job) {
      throw new Error('Archive job not found');
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
      // 计算文件数量和大小
      const fileInfo = await this.calculateFileInfo(job.sourcePath);
      job.filesCount = fileInfo.count;
      job.size = fileInfo.size;

      // 创建归档
      const result = await this.createArchive(job);

      // 更新任务状态
      job.status = 'completed';
      job.completedAt = new Date();
      job.duration = Date.now() - startTime;
      job.compressedSize = result.compressedSize;
      job.compressionRatio = result.compressionRatio;
      job.archivedFilesCount = result.filesCount;
      job.progress = 100;

      // 更新统计
      this.updateStatistics(result);

      await this.saveJobs();
      return result;
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.duration = Date.now() - startTime;
      job.error = error instanceof Error ? error.message : String(error);

      await this.saveJobs();
      throw error;
    }
  }

  /**
   * 取消归档任务
   */
  async cancelArchiveJob(jobId: string): Promise<boolean> {
    const job = this.archiveJobs.get(jobId);
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
   * 创建归档策略
   */
  async createArchivePolicy(
    policyData: Omit<ArchivePolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const policyId = this.generatePolicyId();

    const policy: ArchivePolicy = {
      ...policyData,
      id: policyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(policyId, policy);
    await this.savePolicies();

    // 如果策略启用，启动调度
    if (policy.enabled) {
      this.schedulePolicy(policyId);
    }

    return policyId;
  }

  /**
   * 获取归档策略
   */
  async getArchivePolicy(policyId: string): Promise<ArchivePolicy | null> {
    return this.policies.get(policyId) || null;
  }

  /**
   * 获取所有归档策略
   */
  async getAllArchivePolicies(): Promise<ArchivePolicy[]> {
    return Array.from(this.policies.values());
  }

  /**
   * 更新归档策略
   */
  async updateArchivePolicy(
    policyId: string,
    updates: Partial<ArchivePolicy>
  ): Promise<ArchivePolicy> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error('Archive policy not found');
    }

    const updatedPolicy = {
      ...policy,
      ...updates,
      updatedAt: new Date(),
    };

    this.policies.set(policyId, updatedPolicy);
    await this.savePolicies();

    // 重新调度
    if (updates.enabled !== undefined || updates.schedule) {
      this.reschedulePolicy(policyId);
    }

    return updatedPolicy;
  }

  /**
   * 删除归档策略
   */
  async deleteArchivePolicy(policyId: string): Promise<boolean> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return false;
    }

    // 停止调度
    this.unschedulePolicy(policyId);

    this.policies.delete(policyId);
    await this.savePolicies();

    return true;
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<ArchiveStatistics> {
    const jobs = Array.from(this.archiveJobs.values());

    const totalArchives = jobs.filter(job => job.status === 'completed').length;
    const totalArchivedSize = jobs
      .filter(job => job.status === 'completed')
      .reduce((sum, job) => sum + job.size, 0);
    const compressedJobs = jobs.filter(
      (job): job is ArchiveJob & { compressedSize: number } =>
        job.status === 'completed' && typeof job.compressedSize === 'number'
    );
    const totalCompressedSize = compressedJobs.reduce((sum, job) => sum + job.compressedSize, 0);

    const compressionRatios = jobs
      .filter(
        (job): job is ArchiveJob & { compressionRatio: number } =>
          job.status === 'completed' && typeof job.compressionRatio === 'number'
      )
      .map(job => job.compressionRatio);
    const averageCompressionRatio =
      compressionRatios.length > 0
        ? compressionRatios.reduce((sum, ratio) => sum + ratio, 0) / compressionRatios.length
        : 0;

    const activeJobs = jobs.filter(job => job.status === 'running').length;
    const completedJobs = jobs.filter(job => job.status === 'completed').length;
    const failedJobs = jobs.filter(job => job.status === 'failed').length;

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};

    jobs.forEach(job => {
      byStatus[job.status] = (byStatus[job.status] || 0) + 1;
      byType[job.name] = (byType[job.name] || 0) + 1;
    });

    const trends = this.calculateArchiveTrends(jobs);

    return {
      totalArchives,
      totalArchivedSize,
      totalCompressedSize,
      averageCompressionRatio,
      activeJobs,
      completedJobs,
      failedJobs,
      byStatus,
      byType,
      trends,
    };
  }

  /**
   * 创建归档
   */
  private async createArchive(job: ArchiveJob): Promise<ArchiveResult> {
    const tempDir = path.join(this.config.tempPath, job.id);
    const archivePath = path.join(this.config.archivePath, `${job.name}_${Date.now()}.tar.gz`);

    try {
      // 创建临时目录
      await fs.mkdir(tempDir, { recursive: true });

      // 获取文件列表
      const files = await this.getFileList(job.sourcePath);

      if (this.config.compressionFormat !== 'gzip') {
        throw new Error('当前仅支持 gzip 归档格式');
      }
      await tar.c(
        {
          gzip: true,
          cwd: job.sourcePath,
          file: archivePath,
        },
        files
      );

      // 获取归档文件大小
      const archiveStats = await fs.stat(archivePath);
      const compressedSize = archiveStats.size;

      // 计算压缩比
      const compressionRatio = job.size > 0 ? (1 - compressedSize / job.size) * 100 : 0;

      return {
        jobId: job.id,
        success: true,
        archivePath,
        originalSize: job.size,
        compressedSize,
        compressionRatio,
        filesCount: job.filesCount,
        duration: job.duration || 0,
        metadata: {
          compressionFormat: this.config.compressionFormat,
          compressionLevel: this.config.compressionLevel,
        },
      };
    } finally {
      // 清理临时目录
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('Failed to clean up temp directory:', error);
      }
    }
  }

  /**
   * 计算文件信息
   */
  private async calculateFileInfo(sourcePath: string): Promise<{
    count: number;
    size: number;
  }> {
    let count = 0;
    let size = 0;

    const files = await this.getFileList(sourcePath);

    for (const file of files) {
      const filePath = path.join(sourcePath, file);
      try {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          count++;
          size += stats.size;
        }
      } catch {
        // 忽略无法访问的文件
      }
    }

    return { count, size };
  }

  /**
   * 获取文件列表
   */
  private async getFileList(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    async function traverse(currentPath: string, relativePath: string = ''): Promise<void> {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const entryPath = path.join(currentPath, entry.name);
          const entryRelativePath = path.join(relativePath, entry.name);

          if (entry.isDirectory()) {
            await traverse(entryPath, entryRelativePath);
          } else {
            files.push(entryRelativePath);
          }
        }
      } catch {
        // 忽略无法访问的目录
      }
    }

    await traverse(dirPath);
    return files;
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(result: ArchiveResult): void {
    this.statistics.totalArchives++;
    this.statistics.totalArchivedSize += result.originalSize;
    this.statistics.totalCompressedSize += result.compressedSize;
    this.statistics.completedJobs++;
  }

  /**
   * 计算归档趋势
   */
  private calculateArchiveTrends(jobs: ArchiveJob[]): Array<{
    date: string;
    archives: number;
    size: number;
    compressionRatio: number;
  }> {
    const dailyStats: Record<
      string,
      {
        archives: number;
        size: number;
        compressionRatios: number[];
      }
    > = {};

    jobs
      .filter(
        (job): job is ArchiveJob & { completedAt: Date } =>
          job.status === 'completed' && job.completedAt instanceof Date
      )
      .forEach(job => {
        const date = job.completedAt.toISOString().split('T')[0];

        if (!dailyStats[date]) {
          dailyStats[date] = { archives: 0, size: 0, compressionRatios: [] };
        }

        dailyStats[date].archives++;
        dailyStats[date].size += job.size;
        if (job.compressionRatio) {
          dailyStats[date].compressionRatios.push(job.compressionRatio);
        }
      });

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        archives: stats.archives,
        size: stats.size,
        compressionRatio:
          stats.compressionRatios.length > 0
            ? stats.compressionRatios.reduce((sum, ratio) => sum + ratio, 0) /
              stats.compressionRatios.length
            : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 调度策略
   */
  private schedulePolicy(policyId: string): void {
    const policy = this.policies.get(policyId);
    if (!policy || !policy.enabled) {
      return;
    }

    if (!cron.validate(policy.schedule)) {
      throw new Error(`Invalid cron expression: ${policy.schedule}`);
    }

    const task = cron.schedule(policy.schedule, async () => {
      try {
        await this.executePolicy(policyId);
      } catch (error) {
        console.error(`Policy execution failed for ${policy.name}:`, error);
      }
    });

    this.scheduledTasks.set(policyId, task);
    task.start();
  }

  /**
   * 重新调度策略
   */
  private reschedulePolicy(policyId: string): void {
    this.unschedulePolicy(policyId);

    const policy = this.policies.get(policyId);
    if (policy && policy.enabled) {
      this.schedulePolicy(policyId);
    }
  }

  /**
   * 取消调度策略
   */
  private unschedulePolicy(policyId: string): void {
    const task = this.scheduledTasks.get(policyId);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(policyId);
    }
  }

  /**
   * 执行策略
   */
  private async executePolicy(policyId: string): Promise<void> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return;
    }

    for (const rule of policy.rules) {
      if (rule.enabled) {
        await this.executeRule(rule);
      }
    }
  }

  /**
   * 执行规则
   */
  private async executeRule(rule: ArchiveRule): Promise<void> {
    const retentionDays =
      typeof rule.parameters.retentionDays === 'number' ? rule.parameters.retentionDays : 0;
    const sourcePath =
      typeof rule.parameters.sourcePath === 'string'
        ? rule.parameters.sourcePath
        : path.join(process.cwd(), 'storage');
    const archivePath =
      typeof rule.parameters.archivePath === 'string'
        ? rule.parameters.archivePath
        : this.config.archivePath;
    const files = await this.getFileList(sourcePath);
    const now = Date.now();
    const staleFiles = await this.filterFilesByAge(files, sourcePath, retentionDays, now);

    if (staleFiles.length === 0) {
      return;
    }

    if (rule.action === 'delete') {
      await Promise.all(
        staleFiles.map(filePath => fs.rm(path.join(sourcePath, filePath), { force: true }))
      );
      return;
    }

    if (rule.action === 'compress') {
      await Promise.all(
        staleFiles.map(async filePath => {
          const absolutePath = path.join(sourcePath, filePath);
          const content = await fs.readFile(absolutePath);
          const compressed = await new Promise<Buffer>((resolve, reject) => {
            zlib.gzip(content, { level: this.config.compressionLevel }, (err, result) => {
              if (err) reject(err);
              else resolve(result);
            });
          });
          await fs.writeFile(`${absolutePath}.gz`, compressed);
          await fs.rm(absolutePath, { force: true });
        })
      );
      return;
    }

    if (rule.action === 'archive') {
      await fs.mkdir(archivePath, { recursive: true });
      const archiveFile = path.join(archivePath, `archive_${Date.now()}.tar.gz`);
      await tar.c({ gzip: true, cwd: sourcePath, file: archiveFile }, staleFiles);
      await Promise.all(
        staleFiles.map(filePath => fs.rm(path.join(sourcePath, filePath), { force: true }))
      );
    }
  }

  /**
   * 启动调度任务
   */
  private startScheduledTasks(): void {
    for (const [policyId, policy] of this.policies.entries()) {
      if (policy.enabled) {
        this.schedulePolicy(policyId);
      }
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.config.archivePath, { recursive: true });
    await fs.mkdir(this.config.tempPath, { recursive: true });
  }

  /**
   * 初始化默认策略
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: Omit<ArchivePolicy, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: '每日数据归档',
        description: '每天自动归档测试数据',
        rules: [
          {
            id: 'rule1',
            name: '归档30天前的数据',
            condition: 'age > 30 days',
            action: 'archive',
            priority: 1,
            enabled: true,
            parameters: {
              retentionDays: 30,
            },
          },
        ],
        schedule: '0 2 * * *', // 每天凌晨2点
        enabled: false,
      },
      {
        name: '周度数据清理',
        description: '每周清理过期数据',
        rules: [
          {
            id: 'rule2',
            name: '删除90天前的数据',
            condition: 'age > 90 days',
            action: 'delete',
            priority: 1,
            enabled: true,
            parameters: {
              retentionDays: 90,
            },
          },
        ],
        schedule: '0 3 * * 0', // 每周日凌晨3点
        enabled: false,
      },
    ];

    defaultPolicies.forEach(policy => {
      this.createArchivePolicy(policy);
    });
  }

  /**
   * 加载任务
   */
  private async loadJobs(): Promise<void> {
    try {
      const raw = await fs.readFile(this.jobsFile, 'utf-8');
      const data = JSON.parse(raw) as ArchiveJob[];
      data.forEach(job => {
        this.archiveJobs.set(job.id, {
          ...job,
          createdAt: new Date(job.createdAt),
          startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
          completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
        });
      });
    } catch {
      // ignore
    }
  }

  /**
   * 保存任务
   */
  private async saveJobs(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    const data = Array.from(this.archiveJobs.values()).map(job => ({
      ...job,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt ? job.startedAt.toISOString() : undefined,
      completedAt: job.completedAt ? job.completedAt.toISOString() : undefined,
    }));
    await fs.writeFile(this.jobsFile, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * 加载策略
   */
  private async loadPolicies(): Promise<void> {
    try {
      const raw = await fs.readFile(this.policiesFile, 'utf-8');
      const data = JSON.parse(raw) as ArchivePolicy[];
      data.forEach(policy => {
        this.policies.set(policy.id, {
          ...policy,
          createdAt: new Date(policy.createdAt),
          updatedAt: new Date(policy.updatedAt),
        });
      });
    } catch {
      // ignore
    }
  }

  /**
   * 保存策略
   */
  private async savePolicies(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    const data = Array.from(this.policies.values()).map(policy => ({
      ...policy,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    }));
    await fs.writeFile(this.policiesFile, JSON.stringify(data, null, 2), 'utf-8');
  }

  private async filterFilesByAge(
    files: string[],
    basePath: string,
    retentionDays: number,
    now: number
  ): Promise<string[]> {
    if (retentionDays <= 0) {
      return files;
    }
    const result: string[] = [];
    await Promise.all(
      files.map(async filePath => {
        try {
          const stats = await fs.stat(path.join(basePath, filePath));
          const ageDays = (now - stats.mtime.getTime()) / (24 * 60 * 60 * 1000);
          if (ageDays > retentionDays) {
            result.push(filePath);
          }
        } catch {
          // ignore
        }
      })
    );
    return result;
  }

  /**
   * 生成任务ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成策略ID
   */
  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default DataArchiveManager;
