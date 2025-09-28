/**
 * 定时任务服务
 * 管理定期自动化测试调度、执行监控和通知
 */

const cron = require('node-cron');
const nodemailer = require('nodemailer');
const axios = require('axios');
const logger = require('../utils/logger');
const EventEmitter = require('events');

class ScheduledTaskService extends EventEmitter {
  constructor() {
    super();
    this.tasks = new Map(); // 存储任务配置
    this.cronJobs = new Map(); // 存储cron任务实例
    this.executions = new Map(); // 存储执行历史
    this.runningExecutions = new Set(); // 正在执行的任务
    
    this.settings = {
      timezone: 'Asia/Shanghai',
      maxConcurrentTasks: 5,
      logRetentionDays: 30,
      emailNotifications: true,
      webhookTimeout: 30000,
      autoCleanupFailedTasks: true,
      defaultRetryCount: 3,
      emailConfig: {
        host: process.env.SMTP_HOST || 'smtp.example.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'notifications@example.com',
          pass: process.env.SMTP_PASS || 'password'
        }
      }
    };

    this.emailTransporter = null;
    this.initializeEmailTransporter();
    
    // 定期清理过期执行记录
    this.setupCleanupJob();
  }

  /**
   * 初始化邮件传输器
   */
  initializeEmailTransporter() {
    try {
      if (this.settings.emailNotifications) {
        this.emailTransporter = nodemailer.createTransporter(this.settings.emailConfig);
      }
    } catch (error) {
      logger.error('初始化邮件服务失败:', error);
    }
  }

  /**
   * 创建定时任务
   */
  async createTask(taskConfig) {
    try {
      const task = {
        id: taskConfig.id || `task_${Date.now()}`,
        name: taskConfig.name,
        description: taskConfig.description || '',
        testType: taskConfig.testType,
        urls: taskConfig.urls,
        schedule: {
          type: taskConfig.schedule.type,
          time: taskConfig.schedule.time,
          date: taskConfig.schedule.date,
          daysOfWeek: taskConfig.schedule.daysOfWeek,
          dayOfMonth: taskConfig.schedule.dayOfMonth,
          cronExpression: taskConfig.schedule.cronExpression
        },
        enabled: taskConfig.enabled !== undefined ? taskConfig.enabled : true,
        notifications: {
          email: taskConfig.notifications?.email || false,
          webhook: taskConfig.notifications?.webhook || false,
          emailAddresses: taskConfig.notifications?.emailAddresses || [],
          webhookUrl: taskConfig.notifications?.webhookUrl
        },
        retryCount: taskConfig.retryCount || this.settings.defaultRetryCount,
        timeout: taskConfig.timeout || 300000, // 5分钟默认超时
        lastRun: null,
        nextRun: null,
        runCount: 0,
        successCount: 0,
        failureCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 计算下次运行时间
      task.nextRun = this.calculateNextRun(task.schedule);

      // 存储任务
      this.tasks.set(task.id, task);

      // 如果任务启用，创建cron job
      if (task.enabled) {
        await this.scheduleCronJob(task);
      }

      logger.info(`定时任务已创建: ${task.name} (${task.id})`);
      this.emit('taskCreated', task);

      return task;
    } catch (error) {
      logger.error('创建定时任务失败:', error);
      throw error;
    }
  }

  /**
   * 更新定时任务
   */
  async updateTask(taskId, updates) {
    try {
      const task = this.tasks.get(taskId);
      if (!task) {
        throw new Error(`任务不存在: ${taskId}`);
      }

      // 停止旧的cron job
      if (this.cronJobs.has(taskId)) {
        this.cronJobs.get(taskId).destroy();
        this.cronJobs.delete(taskId);
      }

      // 更新任务配置
      Object.assign(task, updates, { updatedAt: new Date() });

      // 重新计算下次运行时间
      if (updates.schedule) {
        task.nextRun = this.calculateNextRun(task.schedule);
      }

      // 如果任务启用，重新创建cron job
      if (task.enabled) {
        await this.scheduleCronJob(task);
      }

      logger.info(`定时任务已更新: ${task.name} (${taskId})`);
      this.emit('taskUpdated', task);

      return task;
    } catch (error) {
      logger.error('更新定时任务失败:', error);
      throw error;
    }
  }

  /**
   * 删除定时任务
   */
  async deleteTask(taskId) {
    try {
      const task = this.tasks.get(taskId);
      if (!task) {
        throw new Error(`任务不存在: ${taskId}`);
      }

      // 停止cron job
      if (this.cronJobs.has(taskId)) {
        this.cronJobs.get(taskId).destroy();
        this.cronJobs.delete(taskId);
      }

      // 删除任务
      this.tasks.delete(taskId);

      // 清理相关执行记录
      Array.from(this.executions.keys()).forEach(execId => {
        const execution = this.executions.get(execId);
        if (execution.taskId === taskId) {
          this.executions.delete(execId);
        }
      });

      logger.info(`定时任务已删除: ${task.name} (${taskId})`);
      this.emit('taskDeleted', taskId);

      return true;
    } catch (error) {
      logger.error('删除定时任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有任务
   */
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取任务详情
   */
  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * 启用/禁用任务
   */
  async toggleTask(taskId, enabled) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    task.enabled = enabled;
    task.updatedAt = new Date();

    if (enabled) {
      task.nextRun = this.calculateNextRun(task.schedule);
      await this.scheduleCronJob(task);
    } else {
      if (this.cronJobs.has(taskId)) {
        this.cronJobs.get(taskId).destroy();
        this.cronJobs.delete(taskId);
      }
      task.nextRun = null;
    }

    this.emit('taskToggled', task);
    return task;
  }

  /**
   * 立即执行任务
   */
  async executeTaskNow(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    // 检查并发限制
    if (this.runningExecutions.size >= this.settings.maxConcurrentTasks) {
      throw new Error('已达到最大并发任务数限制');
    }

    return await this.executeTask(task, 'manual');
  }

  /**
   * 创建并调度cron任务
   */
  async scheduleCronJob(task) {
    try {
      const cronExpression = this.taskScheduleToCron(task.schedule);
      
      if (!cron.validate(cronExpression)) {
        throw new Error(`无效的cron表达式: ${cronExpression}`);
      }

      const cronJob = cron.schedule(cronExpression, async () => {
        try {
          await this.executeTask(task, 'scheduled');
        } catch (error) {
          logger.error(`执行定时任务失败: ${task.name}`, error);
        }
      }, {
        scheduled: true,
        timezone: this.settings.timezone
      });

      this.cronJobs.set(task.id, cronJob);
      logger.info(`Cron任务已调度: ${task.name} - ${cronExpression}`);

    } catch (error) {
      logger.error(`调度cron任务失败: ${task.name}`, error);
      throw error;
    }
  }

  /**
   * 执行任务
   */
  async executeTask(task, triggerType = 'scheduled') {
    const executionId = `exec_${task.id}_${Date.now()}`;
    
    const execution = {
      id: executionId,
      taskId: task.id,
      taskName: task.name,
      triggerType,
      startTime: new Date(),
      endTime: null,
      status: 'running',
      results: null,
      error: null,
      duration: null,
      logs: []
    };

    try {
      this.executions.set(executionId, execution);
      this.runningExecutions.add(executionId);

      logger.info(`开始执行任务: ${task.name} (${executionId})`);
      
      // 发送开始通知
      await this.sendNotification(task, execution, 'started');

      // 根据测试类型执行相应的测试
      const results = await this.runTestByType(task);
      
      // 更新执行记录
      execution.endTime = new Date();
      execution.duration = execution.endTime - execution.startTime;
      execution.status = 'completed';
      execution.results = results;

      // 更新任务统计
      task.lastRun = execution.endTime;
      task.runCount += 1;
      task.successCount += 1;
      task.nextRun = this.calculateNextRun(task.schedule);
      task.updatedAt = new Date();

      logger.info(`任务执行成功: ${task.name}, 耗时: ${execution.duration}ms`);

      // 发送成功通知
      await this.sendNotification(task, execution, 'completed');
      this.emit('taskExecuted', { task, execution });

    } catch (error) {
      execution.endTime = new Date();
      execution.duration = execution.endTime - execution.startTime;
      execution.status = 'failed';
      execution.error = error.message;

      task.lastRun = execution.endTime;
      task.runCount += 1;
      task.failureCount += 1;
      task.updatedAt = new Date();

      logger.error(`任务执行失败: ${task.name}`, error);

      // 发送失败通知
      await this.sendNotification(task, execution, 'failed');
      this.emit('taskFailed', { task, execution, error });

      // 如果启用了自动重试
      if (task.retryCount > 0) {
        setTimeout(() => {
          this.retryTask(task, execution, 1);
        }, 60000); // 1分钟后重试
      }
    } finally {
      this.runningExecutions.delete(executionId);
    }

    return execution;
  }

  /**
   * 根据测试类型运行测试
   */
  async runTestByType(task) {
    const results = {
      testType: task.testType,
      urls: task.urls,
      timestamp: new Date(),
      details: []
    };

    for (const url of task.urls) {
      try {
        let testResult;

        switch (task.testType) {
          case 'performance':
            testResult = await this.runPerformanceTest(url);
            break;
          case 'security':
            testResult = await this.runSecurityTest(url);
            break;
          case 'seo':
            testResult = await this.runSEOTest(url);
            break;
          case 'api':
            testResult = await this.runAPITest(url);
            break;
          case 'batch':
            testResult = await this.runBatchTest(url);
            break;
          default:
            throw new Error(`不支持的测试类型: ${task.testType}`);
        }

        results.details.push({
          url,
          success: true,
          ...testResult
        });

      } catch (error) {
        results.details.push({
          url,
          success: false,
          error: error.message
        });
      }
    }

    // 计算整体结果
    results.totalUrls = task.urls.length;
    results.successCount = results.details.filter(d => d.success).length;
    results.failureCount = results.totalUrls - results.successCount;
    results.successRate = (results.successCount / results.totalUrls) * 100;

    return results;
  }

  /**
   * 性能测试
   */
  async runPerformanceTest(url) {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: { 'User-Agent': 'ScheduledTaskBot/1.0' }
      });

      const loadTime = Date.now() - startTime;
      const contentLength = response.headers['content-length'] || 0;

      return {
        loadTime,
        statusCode: response.status,
        contentLength: parseInt(contentLength),
        responseHeaders: Object.keys(response.headers).length,
        score: this.calculatePerformanceScore(loadTime, response.status)
      };
    } catch (error) {
      const loadTime = Date.now() - startTime;
      throw new Error(`性能测试失败: ${error.message} (耗时: ${loadTime}ms)`);
    }
  }

  /**
   * 安全测试
   */
  async runSecurityTest(url) {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: { 'User-Agent': 'ScheduledTaskBot/1.0' }
      });

      const securityHeaders = [
        'strict-transport-security',
        'content-security-policy',
        'x-frame-options',
        'x-content-type-options',
        'referrer-policy'
      ];

      const foundHeaders = securityHeaders.filter(header => 
        response.headers[header]
      );

      const vulnerabilities = [];
      
      // 检查缺失的安全头
      securityHeaders.forEach(header => {
        if (!response.headers[header]) {
          vulnerabilities.push(`缺少安全头: ${header}`);
        }
      });

      // 检查服务器信息泄露
      if (response.headers['server']) {
        vulnerabilities.push('服务器信息泄露');
      }

      return {
        foundSecurityHeaders: foundHeaders.length,
        totalSecurityHeaders: securityHeaders.length,
        vulnerabilities,
        score: Math.max(0, 100 - vulnerabilities.length * 20)
      };
    } catch (error) {
      throw new Error(`安全测试失败: ${error.message}`);
    }
  }

  /**
   * SEO测试
   */
  async runSEOTest(url) {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: { 'User-Agent': 'ScheduledTaskBot/1.0' }
      });

      const html = response.data;
      const issues = [];

      // 检查title标签
      if (!html.includes('<title>') || html.includes('<title></title>')) {
        issues.push('缺少或空的title标签');
      }

      // 检查meta description
      if (!html.includes('name="description"')) {
        issues.push('缺少meta description');
      }

      // 检查h1标签
      if (!html.includes('<h1>')) {
        issues.push('缺少h1标签');
      }

      // 检查图片alt属性
      const imgMatches = html.match(/<img[^>]*>/g) || [];
      const imgsWithoutAlt = imgMatches.filter(img => !img.includes('alt='));
      if (imgsWithoutAlt.length > 0) {
        issues.push(`${imgsWithoutAlt.length}个图片缺少alt属性`);
      }

      return {
        totalImages: imgMatches.length,
        imagesWithoutAlt: imgsWithoutAlt.length,
        issues,
        score: Math.max(0, 100 - issues.length * 25)
      };
    } catch (error) {
      throw new Error(`SEO测试失败: ${error.message}`);
    }
  }

  /**
   * API测试
   */
  async runAPITest(url) {
    try {
      const startTime = Date.now();
      const response = await axios.get(url, {
        timeout: 30000,
        headers: { 
          'User-Agent': 'ScheduledTaskBot/1.0',
          'Accept': 'application/json'
        }
      });

      const responseTime = Date.now() - startTime;

      // 尝试解析JSON
      let isValidJSON = false;
      let jsonData = null;
      
      try {
        jsonData = typeof response.data === 'object' ? response.data : JSON.parse(response.data);
        isValidJSON = true;
      } catch (e) {
        // 不是有效的JSON
      }

      return {
        statusCode: response.status,
        responseTime,
        isValidJSON,
        contentType: response.headers['content-type'] || 'unknown',
        dataSize: JSON.stringify(response.data).length,
        score: response.status === 200 && responseTime < 1000 ? 100 : 
               response.status === 200 ? 80 : 50
      };
    } catch (error) {
      throw new Error(`API测试失败: ${error.message}`);
    }
  }

  /**
   * 批量测试
   */
  async runBatchTest(url) {
    // 这里可以调用批量测试服务
    return await this.runPerformanceTest(url);
  }

  /**
   * 计算性能分数
   */
  calculatePerformanceScore(loadTime, statusCode) {
    if (statusCode !== 200) return 0;
    
    if (loadTime < 1000) return 100;
    if (loadTime < 2000) return 85;
    if (loadTime < 3000) return 70;
    if (loadTime < 5000) return 55;
    return 30;
  }

  /**
   * 重试任务
   */
  async retryTask(task, originalExecution, retryAttempt) {
    if (retryAttempt > task.retryCount) {
      logger.warn(`任务重试次数已用尽: ${task.name}`);
      return;
    }

    logger.info(`重试任务: ${task.name}, 第${retryAttempt}次重试`);

    try {
      await this.executeTask(task, `retry_${retryAttempt}`);
    } catch (error) {
      // 继续重试
      if (retryAttempt < task.retryCount) {
        const retryDelay = Math.min(300000, 60000 * Math.pow(2, retryAttempt)); // 指数退避
        setTimeout(() => {
          this.retryTask(task, originalExecution, retryAttempt + 1);
        }, retryDelay);
      }
    }
  }

  /**
   * 发送通知
   */
  async sendNotification(task, execution, type) {
    try {
      // 邮件通知
      if (task.notifications.email && task.notifications.emailAddresses.length > 0) {
        await this.sendEmailNotification(task, execution, type);
      }

      // Webhook通知
      if (task.notifications.webhook && task.notifications.webhookUrl) {
        await this.sendWebhookNotification(task, execution, type);
      }
    } catch (error) {
      logger.error('发送通知失败:', error);
    }
  }

  /**
   * 发送邮件通知
   */
  async sendEmailNotification(task, execution, type) {
    if (!this.emailTransporter) return;

    const subjects = {
      started: `任务开始执行: ${task.name}`,
      completed: `任务执行成功: ${task.name}`,
      failed: `任务执行失败: ${task.name}`
    };

    const mailOptions = {
      from: this.settings.emailConfig.auth.user,
      to: task.notifications.emailAddresses.join(','),
      subject: subjects[type],
      html: this.generateEmailContent(task, execution, type)
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
      logger.info(`邮件通知已发送: ${task.name}`);
    } catch (error) {
      logger.error('发送邮件失败:', error);
    }
  }

  /**
   * 发送Webhook通知
   */
  async sendWebhookNotification(task, execution, type) {
    try {
      const payload = {
        task: {
          id: task.id,
          name: task.name,
          type: task.testType
        },
        execution: {
          id: execution.id,
          type,
          status: execution.status,
          startTime: execution.startTime,
          endTime: execution.endTime,
          duration: execution.duration,
          results: execution.results,
          error: execution.error
        },
        timestamp: new Date().toISOString()
      };

      await axios.post(task.notifications.webhookUrl, payload, {
        timeout: this.settings.webhookTimeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ScheduledTaskBot/1.0'
        }
      });

      logger.info(`Webhook通知已发送: ${task.name}`);
    } catch (error) {
      logger.error('发送Webhook通知失败:', error);
    }
  }

  /**
   * 生成邮件内容
   */
  generateEmailContent(task, execution, type) {
    const statusColors = {
      started: '#3B82F6',
      completed: '#10B981',
      failed: '#EF4444'
    };

    const statusTexts = {
      started: '开始执行',
      completed: '执行成功',
      failed: '执行失败'
    };

    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: ${statusColors[type]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">定时任务通知</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">状态: ${statusTexts[type]}</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
              <h2 style="color: #2d3748; margin-top: 0;">任务信息</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>任务名称:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${task.name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>测试类型:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${task.testType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>执行时间:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${execution.startTime.toLocaleString('zh-CN')}</td>
                </tr>
                ${execution.duration ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>执行时长:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${Math.round(execution.duration / 1000)}秒</td>
                </tr>
                ` : ''}
                ${execution.results ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>测试结果:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">成功: ${execution.results.successCount}/${execution.results.totalUrls}</td>
                </tr>
                ` : ''}
              </table>
              
              ${execution.error ? `
                <div style="background-color: #fee2e2; border: 1px solid #fecaca; border-radius: 4px; padding: 12px; margin-top: 16px;">
                  <h3 style="color: #dc2626; margin: 0 0 8px 0;">错误信息</h3>
                  <p style="margin: 0; color: #7f1d1d;">${execution.error}</p>
                </div>
              ` : ''}
            </div>
            
            <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
              <p>此邮件由定时任务系统自动发送</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * 任务调度配置转换为cron表达式
   */
  taskScheduleToCron(schedule) {
    switch (schedule.type) {
      case 'once':
        // 一次性任务，使用具体日期时间
        if (schedule.date) {
          const date = new Date(schedule.date + ' ' + schedule.time);
          return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
        }
        throw new Error('一次性任务需要指定日期');

      case 'daily':
        // 每日任务
        const [hours, minutes] = schedule.time.split(':');
        return `${minutes} ${hours} * * *`;

      case 'weekly':
        // 每周任务
        const [wHours, wMinutes] = schedule.time.split(':');
        const daysOfWeek = schedule.daysOfWeek || [0];
        return `${wMinutes} ${wHours} * * ${daysOfWeek.join(',')}`;

      case 'monthly':
        // 每月任务
        const [mHours, mMinutes] = schedule.time.split(':');
        const dayOfMonth = schedule.dayOfMonth || 1;
        return `${mMinutes} ${mHours} ${dayOfMonth} * *`;

      case 'custom':
        // 自定义cron表达式
        if (!schedule.cronExpression) {
          throw new Error('自定义调度需要提供cron表达式');
        }
        return schedule.cronExpression;

      default:
        throw new Error(`不支持的调度类型: ${schedule.type}`);
    }
  }

  /**
   * 计算下次运行时间
   */
  calculateNextRun(schedule) {
    try {
      const cronExpression = this.taskScheduleToCron(schedule);
      // 这里可以使用cron-parser库来计算下次运行时间
      // 为了简化，这里使用基本逻辑
      const now = new Date();
      const next = new Date(now);

      switch (schedule.type) {
        case 'daily':
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setHours(hours, minutes, 0, 0);
          if (next <= now) {
            next.setDate(next.getDate() + 1);
          }
          return next;

        case 'weekly':
          // 简化处理，这里可以更精确实现
          next.setDate(next.getDate() + 7);
          return next;

        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          return next;

        default:
          // 对于其他类型，返回1小时后作为示例
          next.setHours(next.getHours() + 1);
          return next;
      }
    } catch (error) {
      logger.error('计算下次运行时间失败:', error);
      return null;
    }
  }

  /**
   * 获取执行历史
   */
  getExecutions(taskId = null, limit = 100) {
    let executions = Array.from(this.executions.values());
    
    if (taskId) {
      executions = executions.filter(exec => exec.taskId === taskId);
    }

    return executions
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  /**
   * 获取系统统计
   */
  getSystemStats() {
    const tasks = Array.from(this.tasks.values());
    const executions = Array.from(this.executions.values());

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const todayExecutions = executions.filter(exec => exec.startTime >= today);
    const weekExecutions = executions.filter(exec => exec.startTime >= weekAgo);

    return {
      totalTasks: tasks.length,
      enabledTasks: tasks.filter(t => t.enabled).length,
      disabledTasks: tasks.filter(t => !t.enabled).length,
      runningTasks: this.runningExecutions.size,
      todayExecutions: todayExecutions.length,
      weekExecutions: weekExecutions.length,
      totalExecutions: executions.length,
      successRate: executions.length > 0 ? 
        (executions.filter(e => e.status === 'completed').length / executions.length) * 100 : 0,
      avgExecutionTime: executions.filter(e => e.duration).length > 0 ?
        executions.filter(e => e.duration).reduce((sum, e) => sum + e.duration, 0) / 
        executions.filter(e => e.duration).length : 0,
      nextScheduledTask: tasks
        .filter(t => t.enabled && t.nextRun)
        .sort((a, b) => a.nextRun - b.nextRun)[0]
    };
  }

  /**
   * 设置系统配置
   */
  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
    
    // 重新初始化邮件服务
    if (newSettings.emailConfig) {
      this.initializeEmailTransporter();
    }

    logger.info('系统设置已更新');
  }

  /**
   * 获取系统设置
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * 设置清理任务
   */
  setupCleanupJob() {
    // 每天凌晨2点清理过期执行记录
    cron.schedule('0 2 * * *', () => {
      this.cleanupOldExecutions();
    }, {
      timezone: this.settings.timezone
    });
  }

  /**
   * 清理过期执行记录
   */
  cleanupOldExecutions() {
    const cutoffDate = new Date(Date.now() - this.settings.logRetentionDays * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    Array.from(this.executions.keys()).forEach(execId => {
      const execution = this.executions.get(execId);
      if (execution.startTime < cutoffDate) {
        this.executions.delete(execId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      logger.info(`已清理 ${cleanedCount} 条过期执行记录`);
    }
  }

  /**
   * 导出任务配置
   */
  exportTasks() {
    return {
      version: '1.0',
      exportTime: new Date().toISOString(),
      tasks: Array.from(this.tasks.values()),
      settings: this.settings
    };
  }

  /**
   * 导入任务配置
   */
  async importTasks(importData) {
    try {
      if (!importData.version || !Array.isArray(importData.tasks)) {
        throw new Error('无效的导入数据格式');
      }

      let importedCount = 0;
      
      for (const taskData of importData.tasks) {
        try {
          // 生成新的ID避免冲突
          const newTask = { ...taskData, id: `task_${Date.now()}_${importedCount}` };
          await this.createTask(newTask);
          importedCount++;
        } catch (error) {
          logger.warn(`导入任务失败: ${taskData.name}`, error);
        }
      }

      logger.info(`成功导入 ${importedCount} 个任务`);
      return { success: true, importedCount };

    } catch (error) {
      logger.error('导入任务配置失败:', error);
      throw error;
    }
  }

  /**
   * 销毁服务
   */
  destroy() {
    // 停止所有cron任务
    this.cronJobs.forEach(job => job.destroy());
    this.cronJobs.clear();

    // 清空数据
    this.tasks.clear();
    this.executions.clear();
    this.runningExecutions.clear();

    // 关闭邮件传输器
    if (this.emailTransporter) {
      this.emailTransporter.close();
    }

    logger.info('定时任务服务已销毁');
  }
}

module.exports = ScheduledTaskService;
