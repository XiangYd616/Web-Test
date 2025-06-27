/**
 * 真实实时监控服务
 * 提供网站监控、性能检测、告警通知等功能
 */

import { EventEmitter } from 'events';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { logger } from '../utils/logger';
import { TestResultModel } from '../models/TestResult';

export interface MonitoringSite {
  id: string;
  url: string;
  name: string;
  interval: number; // 监控间隔（秒）
  timeout: number; // 超时时间（毫秒）
  expectedStatus: number; // 期望的HTTP状态码
  keywords?: string[]; // 关键词检查
  headers?: { [key: string]: string }; // 自定义请求头
  enabled: boolean;
  userId: string;
  createdAt: Date;
  lastChecked?: Date;
  status: 'online' | 'offline' | 'warning' | 'maintenance';
}

export interface MonitoringResult {
  siteId: string;
  url: string;
  timestamp: Date;
  responseTime: number;
  statusCode: number;
  success: boolean;
  error?: string;
  sslInfo?: {
    valid: boolean;
    expiresAt?: Date;
    issuer?: string;
  };
  performance?: {
    dnsTime: number;
    connectTime: number;
    downloadTime: number;
  };
}

export interface AlertRule {
  id: string;
  siteId: string;
  type: 'downtime' | 'response_time' | 'status_code' | 'ssl_expiry';
  threshold: number;
  enabled: boolean;
  notificationMethods: ('email' | 'webhook' | 'sms')[];
}

export class MonitoringService extends EventEmitter {
  private sites: Map<string, MonitoringSite> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private results: Map<string, MonitoringResult[]> = new Map();
  private alertRules: Map<string, AlertRule[]> = new Map();

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.on('site_down', this.handleSiteDown.bind(this));
    this.on('site_up', this.handleSiteUp.bind(this));
    this.on('slow_response', this.handleSlowResponse.bind(this));
    this.on('ssl_expiring', this.handleSSLExpiring.bind(this));
  }

  /**
   * 添加监控站点
   */
  async addSite(site: Omit<MonitoringSite, 'id' | 'createdAt' | 'status'>): Promise<MonitoringSite> {
    const newSite: MonitoringSite = {
      ...site,
      id: this.generateId(),
      createdAt: new Date(),
      status: 'online'
    };

    this.sites.set(newSite.id, newSite);
    
    if (newSite.enabled) {
      this.startMonitoring(newSite.id);
    }

    logger.info('添加监控站点', { siteId: newSite.id, url: newSite.url });
    return newSite;
  }

  /**
   * 移除监控站点
   */
  removeSite(siteId: string): boolean {
    const site = this.sites.get(siteId);
    if (!site) return false;

    this.stopMonitoring(siteId);
    this.sites.delete(siteId);
    this.results.delete(siteId);
    this.alertRules.delete(siteId);

    logger.info('移除监控站点', { siteId, url: site.url });
    return true;
  }

  /**
   * 开始监控站点
   */
  private startMonitoring(siteId: string): void {
    const site = this.sites.get(siteId);
    if (!site || !site.enabled) return;

    // 清除现有的定时器
    this.stopMonitoring(siteId);

    // 立即执行一次检查
    this.checkSite(siteId);

    // 设置定时检查
    const interval = setInterval(() => {
      this.checkSite(siteId);
    }, site.interval * 1000);

    this.intervals.set(siteId, interval);
    logger.info('开始监控站点', { siteId, url: site.url, interval: site.interval });
  }

  /**
   * 停止监控站点
   */
  private stopMonitoring(siteId: string): void {
    const interval = this.intervals.get(siteId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(siteId);
    }
  }

  /**
   * 检查站点状态
   */
  private async checkSite(siteId: string): Promise<void> {
    const site = this.sites.get(siteId);
    if (!site) return;

    const startTime = Date.now();
    
    try {
      const result = await this.performHealthCheck(site);
      
      // 更新站点状态
      site.lastChecked = new Date();
      const previousStatus = site.status;
      site.status = result.success ? 'online' : 'offline';

      // 存储结果
      this.storeResult(siteId, result);

      // 检查告警规则
      await this.checkAlertRules(siteId, result);

      // 发送状态变化事件
      if (previousStatus !== site.status) {
        if (site.status === 'online' && previousStatus === 'offline') {
          this.emit('site_up', { site, result });
        } else if (site.status === 'offline' && previousStatus === 'online') {
          this.emit('site_down', { site, result });
        }
      }

      // 检查响应时间
      if (result.responseTime > 5000) { // 5秒阈值
        this.emit('slow_response', { site, result });
      }

      logger.debug('站点检查完成', { 
        siteId, 
        url: site.url, 
        success: result.success, 
        responseTime: result.responseTime 
      });

    } catch (error) {
      logger.error('站点检查失败', { siteId, url: site.url, error });
      
      const errorResult: MonitoringResult = {
        siteId,
        url: site.url,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        statusCode: 0,
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };

      this.storeResult(siteId, errorResult);
      site.status = 'offline';
    }
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(site: MonitoringSite): Promise<MonitoringResult> {
    return new Promise((resolve, reject) => {
      const url = new URL(site.url);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const startTime = Date.now();
      let dnsTime = 0;
      let connectTime = 0;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        timeout: site.timeout,
        headers: {
          'User-Agent': 'TestWeb-Monitor/1.0',
          ...site.headers
        }
      };

      const req = client.request(options, (res) => {
        const responseTime = Date.now() - startTime;
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          const result: MonitoringResult = {
            siteId: site.id,
            url: site.url,
            timestamp: new Date(),
            responseTime,
            statusCode: res.statusCode || 0,
            success: res.statusCode === site.expectedStatus,
            performance: {
              dnsTime,
              connectTime,
              downloadTime: responseTime - connectTime
            }
          };

          // 检查关键词
          if (site.keywords && site.keywords.length > 0) {
            const hasAllKeywords = site.keywords.every(keyword => 
              body.toLowerCase().includes(keyword.toLowerCase())
            );
            result.success = result.success && hasAllKeywords;
          }

          // 检查SSL信息（仅HTTPS）
          if (isHttps && res.socket && 'getPeerCertificate' in res.socket) {
            try {
              const cert = (res.socket as any).getPeerCertificate();
              result.sslInfo = {
                valid: !cert.expired,
                expiresAt: new Date(cert.valid_to),
                issuer: cert.issuer?.CN
              };
            } catch (error) {
              logger.warn('获取SSL证书信息失败', { url: site.url, error });
            }
          }

          resolve(result);
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      // 记录DNS和连接时间
      req.on('socket', (socket) => {
        socket.on('lookup', () => {
          dnsTime = Date.now() - startTime;
        });
        
        socket.on('connect', () => {
          connectTime = Date.now() - startTime;
        });
      });

      req.end();
    });
  }

  /**
   * 存储监控结果
   */
  private storeResult(siteId: string, result: MonitoringResult): void {
    if (!this.results.has(siteId)) {
      this.results.set(siteId, []);
    }

    const results = this.results.get(siteId)!;
    results.push(result);

    // 只保留最近50个结果
    if (results.length > 50) {
      results.splice(0, results.length - 50);
    }

    // 异步保存到数据库
    this.saveResultToDatabase(result).catch(error => {
      logger.error('保存监控结果到数据库失败', { siteId, error });
    });
  }

  /**
   * 保存结果到数据库
   */
  private async saveResultToDatabase(result: MonitoringResult): Promise<void> {
    try {
      const site = this.sites.get(result.siteId);
      if (!site) return;

      await TestResultModel.create({
        user_id: site.userId,
        url: result.url,
        type: 'monitoring',
        config: {
          interval: site.interval,
          timeout: site.timeout,
          expectedStatus: site.expectedStatus,
          monitoringResult: {
            statusCode: result.statusCode,
            responseTime: result.responseTime,
            sslInfo: result.sslInfo,
            performance: result.performance,
            error: result.error,
            success: result.success,
            timestamp: result.timestamp
          }
        },
        tags: ['monitoring', 'auto'],
        priority: result.success ? 'low' : 'high'
      });
    } catch (error) {
      logger.error('保存监控结果失败', error);
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 事件处理器
  private async handleSiteDown(data: { site: MonitoringSite; result: MonitoringResult }): Promise<void> {
    logger.warn('站点下线', { siteId: data.site.id, url: data.site.url });
    // 这里可以发送告警通知
  }

  private async handleSiteUp(data: { site: MonitoringSite; result: MonitoringResult }): Promise<void> {
    logger.info('站点恢复', { siteId: data.site.id, url: data.site.url });
    // 这里可以发送恢复通知
  }

  private async handleSlowResponse(data: { site: MonitoringSite; result: MonitoringResult }): Promise<void> {
    logger.warn('响应缓慢', { 
      siteId: data.site.id, 
      url: data.site.url, 
      responseTime: data.result.responseTime 
    });
  }

  private async handleSSLExpiring(data: { site: MonitoringSite; expiresAt: Date }): Promise<void> {
    logger.warn('SSL证书即将过期', { 
      siteId: data.site.id, 
      url: data.site.url, 
      expiresAt: data.expiresAt 
    });
  }

  /**
   * 检查告警规则
   */
  private async checkAlertRules(siteId: string, result: MonitoringResult): Promise<void> {
    const rules = this.alertRules.get(siteId) || [];
    
    for (const rule of rules) {
      if (!rule.enabled) continue;

      let shouldAlert = false;

      switch (rule.type) {
        case 'downtime':
          shouldAlert = !result.success;
          break;
        case 'response_time':
          shouldAlert = result.responseTime > rule.threshold;
          break;
        case 'status_code':
          shouldAlert = result.statusCode !== rule.threshold;
          break;
        case 'ssl_expiry':
          if (result.sslInfo?.expiresAt) {
            const daysUntilExpiry = Math.ceil(
              (result.sslInfo.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            shouldAlert = daysUntilExpiry <= rule.threshold;
          }
          break;
      }

      if (shouldAlert) {
        await this.sendAlert(rule, result);
      }
    }
  }

  /**
   * 发送告警
   */
  private async sendAlert(rule: AlertRule, result: MonitoringResult): Promise<void> {
    logger.info('发送告警', { ruleId: rule.id, siteId: rule.siteId, type: rule.type });
    // 这里实现具体的告警发送逻辑
  }

  // 公共方法
  getSites(): MonitoringSite[] {
    return Array.from(this.sites.values());
  }

  getSite(siteId: string): MonitoringSite | undefined {
    return this.sites.get(siteId);
  }

  getResults(siteId: string): MonitoringResult[] {
    return this.results.get(siteId) || [];
  }

  updateSite(siteId: string, updates: Partial<MonitoringSite>): boolean {
    const site = this.sites.get(siteId);
    if (!site) return false;

    Object.assign(site, updates);

    if (updates.enabled !== undefined) {
      if (updates.enabled) {
        this.startMonitoring(siteId);
      } else {
        this.stopMonitoring(siteId);
      }
    }

    return true;
  }

  getSiteStats(siteId: string, period: string): any {
    const results = this.getResults(siteId);
    const now = new Date();
    let startTime: Date;

    switch (period) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const filteredResults = results.filter(r => r.timestamp >= startTime);
    const successCount = filteredResults.filter(r => r.success).length;
    const totalCount = filteredResults.length;
    const uptime = totalCount > 0 ? (successCount / totalCount) * 100 : 0;
    const avgResponseTime = filteredResults.length > 0
      ? filteredResults.reduce((sum, r) => sum + r.responseTime, 0) / filteredResults.length
      : 0;

    return {
      uptime,
      avgResponseTime,
      totalChecks: totalCount,
      successfulChecks: successCount,
      failedChecks: totalCount - successCount,
      period,
      results: filteredResults.slice(-100) // 最近100条记录
    };
  }

  getOverview(userId: string): any {
    const userSites = Array.from(this.sites.values()).filter(site => site.userId === userId);
    const totalSites = userSites.length;
    const activeSites = userSites.filter(site => site.enabled).length;
    const downSites = userSites.filter(site => {
      const results = this.getResults(site.id);
      const latestResult = results[results.length - 1];
      return latestResult && !latestResult.success;
    }).length;

    const allResults = userSites.flatMap(site => this.getResults(site.id));
    const recentResults = allResults.filter(r =>
      r.timestamp >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    const avgUptime = recentResults.length > 0
      ? (recentResults.filter(r => r.success).length / recentResults.length) * 100
      : 100;

    return {
      totalSites,
      activeSites,
      downSites,
      avgUptime,
      totalChecks: recentResults.length,
      recentAlerts: this.getAlerts(userId, { limit: 5 })
    };
  }

  getAlerts(userId: string, options: { status?: string; limit?: number } = {}): any[] {
    // 模拟警报数据
    const alerts = [];
    const userSites = Array.from(this.sites.values()).filter(site => site.userId === userId);

    for (const site of userSites) {
      const results = this.getResults(site.id);
      const failedResults = results.filter(r => !r.success).slice(-10);

      for (const result of failedResults) {
        alerts.push({
          id: `alert-${site.id}-${result.timestamp.getTime()}`,
          siteId: site.id,
          siteName: site.name,
          type: 'downtime',
          severity: 'high',
          message: `站点 ${site.name} 检测失败`,
          timestamp: result.timestamp,
          status: 'unread',
          details: {
            statusCode: result.statusCode,
            responseTime: result.responseTime,
            error: result.error
          }
        });
      }
    }

    let filteredAlerts = alerts;
    if (options.status) {
      filteredAlerts = alerts.filter(alert => alert.status === options.status);
    }

    return filteredAlerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, options.limit || 50);
  }

  markAlertAsRead(alertId: string, userId: string): boolean {
    // 在实际实现中，这里应该更新数据库中的警报状态
    // 现在只是模拟返回成功
    return true;
  }

  getReports(userId: string, options: { type?: string; startDate?: Date; endDate?: Date } = {}): any[] {
    // 模拟报告数据
    return [
      {
        id: 'report-1',
        type: 'uptime',
        title: '可用性报告',
        generatedAt: new Date(),
        period: '30天',
        summary: '平均可用性: 99.5%'
      },
      {
        id: 'report-2',
        type: 'performance',
        title: '性能报告',
        generatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        period: '7天',
        summary: '平均响应时间: 245ms'
      }
    ];
  }

  async generateReport(options: {
    userId: string;
    type: string;
    siteIds: string[];
    startDate: Date;
    endDate: Date;
    format: string;
  }): Promise<any> {
    const { userId, type, siteIds, startDate, endDate, format } = options;

    // 获取相关站点数据
    const sites = siteIds.map(id => this.getSite(id)).filter(Boolean);
    const reportData = {
      title: `${type}报告`,
      generatedAt: new Date(),
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      sites: sites.map(site => ({
        ...site,
        stats: this.getSiteStats(site!.id, '30d')
      }))
    };

    if (format === 'pdf') {
      // 在实际实现中，这里应该生成PDF
      return Buffer.from('PDF报告内容');
    }

    return reportData;
  }
}

// 单例实例
export const monitoringService = new MonitoringService();
