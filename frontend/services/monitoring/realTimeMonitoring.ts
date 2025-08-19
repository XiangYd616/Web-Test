// 实时监控和告警系统
export interface MonitoringTarget {
  id: string;
  name: string;
  url: string;
  type: 'website' | 'api' | 'service';
  interval: number; // 监控间隔（秒）
  timeout: number;
  enabled: boolean;
  thresholds: MonitoringThresholds;
  notifications: NotificationConfig[];
  tags: string[];
  createdAt: string;
  lastChecked?: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
}

export interface MonitoringThresholds {
  responseTime: { warning: number; critical: number };
  availability: { warning: number; critical: number };
  errorRate: { warning: number; critical: number };
  customMetrics?: { [key: string]: { warning: number; critical: number } };
}

export interface NotificationConfig {
  id: string;
  type: 'email' | 'webhook' | 'sms' | 'slack' | 'teams';
  enabled: boolean;
  config: {
    email?: { recipients: string[]; subject?: string };
    webhook?: { url: string; method: 'POST' | 'GET'; headers?: Record<string, string> };
    slack?: { webhook: string; channel?: string };
    teams?: { webhook: string };
    sms?: { numbers: string[] };
  };
  triggers: ('down' | 'slow' | 'error' | 'recovery')[];
  cooldown: number; // 冷却时间（分钟）
}

export interface MonitoringResult {
  id: string;
  targetId: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
  responseTime: number;
  statusCode?: number;
  errorMessage?: string;
  metrics: {
    availability: number;
    responseTime: number;
    errorRate: number;
    customMetrics?: Record<string, number>;
  };
  location: string;
  userAgent: string;
}

export interface Alert {
  id: string;
  targetId: string;
  type: 'down' | 'slow' | 'error' | 'recovery';
  severity: 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata: Record<string, any>;
}

export interface MonitoringStats {
  totalTargets: number;
  activeTargets: number;
  healthyTargets: number;
  warningTargets: number;
  criticalTargets: number;
  totalChecks: number;
  avgResponseTime: number;
  overallAvailability: number;
  activeAlerts: number;
  resolvedAlerts: number;
}

export class RealTimeMonitoringService {
  private static instance: RealTimeMonitoringService;
  private targets: Map<string, MonitoringTarget> = new Map();
  private results: Map<string, MonitoringResult[]> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private isRunning = false;

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): RealTimeMonitoringService {
    if (!RealTimeMonitoringService.instance) {
      RealTimeMonitoringService.instance = new RealTimeMonitoringService();
    }
    return RealTimeMonitoringService.instance;
  }

  // 添加监控目标
  public addTarget(target: Omit<MonitoringTarget, 'id' | 'createdAt' | 'status'>): MonitoringTarget {
    const newTarget: MonitoringTarget = {
      ...target,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      status: 'unknown'
    };

    this.targets.set(newTarget.id, newTarget);
    this.saveToStorage();

    if (newTarget.enabled && this.isRunning) {
      this.startMonitoring(newTarget.id);
    }

    this.emit('targetAdded', newTarget);
    return newTarget;
  }

  // 更新监控目标
  public updateTarget(id: string, updates: Partial<MonitoringTarget>): boolean {
    const target = this.targets.get(id);
    if (!target) return false;

    const updatedTarget = { ...target, ...updates };
    this.targets.set(id, updatedTarget);
    this.saveToStorage();

    // 重新启动监控
    if (this.intervals.has(id)) {
      this.stopMonitoring(id);
    }
    if (updatedTarget.enabled && this.isRunning) {
      this.startMonitoring(id);
    }

    this.emit('targetUpdated', updatedTarget);
    return true;
  }

  // 删除监控目标
  public removeTarget(id: string): boolean {
    const target = this.targets.get(id);
    if (!target) return false;

    this.stopMonitoring(id);
    this.targets.delete(id);
    this.results.delete(id);
    this.saveToStorage();

    this.emit('targetRemoved', { id, target });
    return true;
  }

  // 获取所有监控目标
  public getTargets(): MonitoringTarget[] {
    return Array.from(this.targets.values());
  }

  // 获取特定目标
  public getTarget(id: string): MonitoringTarget | undefined {
    return this.targets.get(id);
  }

  // 启动全局监控
  public startGlobalMonitoring(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.targets.forEach((target, id) => {
      if (target.enabled) {
        this.startMonitoring(id);
      }
    });

    this.emit('monitoringStarted');
  }

  // 停止全局监控
  public stopGlobalMonitoring(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.intervals.forEach((interval, id) => {
      this.stopMonitoring(id);
    });

    this.emit('monitoringStopped');
  }

  // 启动单个目标监控
  private startMonitoring(targetId: string): void {
    const target = this.targets.get(targetId);
    if (!target || !target.enabled) return;

    // 立即执行一次检查
    this.performCheck(targetId);

    // 设置定时检查
    const interval = setInterval(() => {
      this.performCheck(targetId);
    }, target.interval * 1000);

    this.intervals.set(targetId, interval);
  }

  // 停止单个目标监控
  private stopMonitoring(targetId: string): void {
    const interval = this.intervals.get(targetId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(targetId);
    }
  }

  // 执行监控检查
  private async performCheck(targetId: string): Promise<void> {
    const target = this.targets.get(targetId);
    if (!target) return;

    const startTime = Date.now();
    let result: MonitoringResult;

    try {
      const response = await this.makeRequest(target);
      const responseTime = Date.now() - startTime;

      result = {
        id: this.generateId(),
        targetId,
        timestamp: new Date().toISOString(),
        status: this.determineStatus(response, responseTime, target.thresholds),
        responseTime,
        statusCode: response.status,
        metrics: {
          availability: response.ok ? 100 : 0,
          responseTime,
          errorRate: response.ok ? 0 : 100
        },
        location: 'local',
        userAgent: 'TestWeb-Monitor/1.0'
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      result = {
        id: this.generateId(),
        targetId,
        timestamp: new Date().toISOString(),
        status: 'error',
        responseTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          availability: 0,
          responseTime,
          errorRate: 100
        },
        location: 'local',
        userAgent: 'TestWeb-Monitor/1.0'
      };
    }

    // 保存结果
    this.saveResult(result);

    // 更新目标状态
    this.updateTargetStatus(targetId, result);

    // 检查告警条件
    this.checkAlertConditions(target, result);

    this.emit('checkCompleted', { target, result });
  }

  // 发起HTTP请求
  private async makeRequest(target: MonitoringTarget): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), target.timeout * 1000);

    try {
      const response = await fetch(target.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'TestWeb-Monitor/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // 确定状态
  private determineStatus(response: Response, responseTime: number, thresholds: MonitoringThresholds): 'success' | 'warning' | 'error' {
    if (!response.ok) return 'error';
    if (responseTime > thresholds.responseTime.critical) return 'error';
    if (responseTime > thresholds.responseTime.warning) return 'warning';
    return 'success';
  }

  // 保存检查结果
  private saveResult(result: MonitoringResult): void {
    if (!this.results.has(result.targetId)) {
      this.results.set(result.targetId, []);
    }

    const results = this.results.get(result.targetId)!;
    results.push(result);

    // 只保留最近1000条记录
    if (results.length > 1000) {
      results.splice(0, results.length - 1000);
    }
  }

  // 更新目标状态
  private updateTargetStatus(targetId: string, result: MonitoringResult): void {
    const target = this.targets.get(targetId);
    if (!target) return;

    let status: MonitoringTarget['status'];
    switch (result.status) {
      case 'success':
        status = 'healthy';
        break;
      case 'warning':
        status = 'warning';
        break;
      case 'error':
        status = 'critical';
        break;
      default:
        status = 'unknown';
    }

    target.status = status;
    target.lastChecked = result.timestamp;
    this.targets.set(targetId, target);
  }

  // 检查告警条件
  private checkAlertConditions(target: MonitoringTarget, result: MonitoringResult): void {
    const recentResults = this.getRecentResults(target.id, 5);

    // 检查是否需要触发告警
    if (result.status === 'error') {
      this.createAlert(target, 'down', 'critical', '服务不可用', `${target.name} 无法访问`);
    } else if (result.status === 'warning') {
      this.createAlert(target, 'slow', 'warning', '响应缓慢', `${target.name} 响应时间过长: ${result.responseTime}ms`);
    } else if (result.status === 'success') {
      // 检查是否需要发送恢复通知
      const hasActiveAlert = Array.from(this.alerts.values()).some(
        alert => alert.targetId === target.id && !alert.resolved
      );
      if (hasActiveAlert) {
        this.createAlert(target, 'recovery', 'warning', '服务恢复', `${target.name} 已恢复正常`);
      }
    }
  }

  // 创建告警
  private createAlert(target: MonitoringTarget, type: Alert['type'], severity: Alert['severity'], title: string, message: string): void {
    const alert: Alert = {
      id: this.generateId(),
      targetId: target.id,
      type,
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolved: type === 'recovery',
      resolvedAt: type === 'recovery' ? new Date().toISOString() : undefined,
      metadata: { targetName: target.name, targetUrl: target.url }
    };

    this.alerts.set(alert.id, alert);

    // 发送通知
    this.sendNotifications(target, alert);

    this.emit('alertCreated', alert);
  }

  // 发送通知
  private async sendNotifications(target: MonitoringTarget, alert: Alert): Promise<void> {
    for (const notification of target.notifications) {
      if (!notification.enabled || !notification.triggers.includes(alert.type)) {
        continue;
      }

      try {
        await this.sendNotification(notification, alert, target);
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }
  }

  // 发送单个通知
  private async sendNotification(config: NotificationConfig, alert: Alert, target: MonitoringTarget): Promise<void> {
    switch (config.type) {
      case 'email':
        await this.sendEmailNotification(config, alert, target);
        break;
      case 'webhook':
        await this.sendWebhookNotification(config, alert, target);
        break;
      case 'slack':
        await this.sendSlackNotification(config, alert, target);
        break;
      // 其他通知类型的实现...
    }
  }

  // 邮件通知（模拟实现）
  private async sendEmailNotification(config: NotificationConfig, alert: Alert, target: MonitoringTarget): Promise<void> {
    console.log('Sending email notification:', {
      to: config.config.email?.recipients,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      body: `目标: ${target.name}\nURL: ${target.url}\n消息: ${alert.message}\n时间: ${alert.timestamp}`
    });
  }

  // Webhook通知
  private async sendWebhookNotification(config: NotificationConfig, alert: Alert, target: MonitoringTarget): Promise<void> {
    if (!config.config.webhook?.url) return;

    const payload = {
      alert,
      target: { id: target.id, name: target.name, url: target.url },
      timestamp: new Date().toISOString()
    };

    await fetch(config.config.webhook.url, {
      method: config.config.webhook.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.config.webhook.headers
      },
      body: JSON.stringify(payload)
    });
  }

  // Slack通知
  private async sendSlackNotification(config: NotificationConfig, alert: Alert, target: MonitoringTarget): Promise<void> {
    if (!config.config.slack?.webhook) return;

    const color = alert.severity === 'critical' ? 'danger' : 'warning';
    const payload = {
      attachments: [{
        color,
        title: alert.title,
        text: alert.message,
        fields: [
          { title: '目标', value: target.name, short: true },
          { title: 'URL', value: target.url, short: true },
          { title: '时间', value: alert.timestamp, short: true }
        ]
      }]
    };

    await fetch(config.config.slack.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  // 获取最近的检查结果
  public getRecentResults(targetId: string, count = 10): MonitoringResult[] {
    const results = this.results.get(targetId) || [];
    return results.slice(-count);
  }

  // 获取统计信息
  public getStats(): MonitoringStats {
    const targets = Array.from(this.targets.values());
    const alerts = Array.from(this.alerts.values());

    return {
      totalTargets: targets.length,
      activeTargets: targets.filter(t => t.enabled).length,
      healthyTargets: targets.filter(t => t.status === 'healthy').length,
      warningTargets: targets.filter(t => t.status === 'warning').length,
      criticalTargets: targets.filter(t => t.status === 'critical').length,
      totalChecks: Array.from(this.results.values()).reduce((sum, results) => sum + results.length, 0),
      avgResponseTime: this.calculateAverageResponseTime(),
      overallAvailability: this.calculateOverallAvailability(),
      activeAlerts: alerts.filter(a => !a.resolved).length,
      resolvedAlerts: alerts.filter(a => a.resolved).length
    };
  }

  // 事件监听
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // 辅助方法
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateAverageResponseTime(): number {
    const allResults = Array.from(this.results.values()).flat();
    if (allResults.length === 0) return 0;

    const sum = allResults.reduce((acc, result) => acc + result.responseTime, 0);
    return Math.round(sum / allResults.length);
  }

  private calculateOverallAvailability(): number {
    const allResults = Array.from(this.results.values()).flat();
    if (allResults.length === 0) return 100;

    const successCount = allResults.filter(result => result.status === 'success').length;
    return Math.round((successCount / allResults.length) * 100 * 100) / 100;
  }

  // 数据持久化
  private saveToStorage(): void {
    try {
      localStorage.setItem('monitoring_targets', JSON.stringify(Array.from(this.targets.entries())));
      localStorage.setItem('monitoring_alerts', JSON.stringify(Array.from(this.alerts.entries())));
    } catch (error) {
      console.error('Failed to save monitoring data:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const targetsData = localStorage.getItem('monitoring_targets');
      if (targetsData) {
        const entries = JSON.parse(targetsData);
        this.targets = new Map(entries);
      }

      const alertsData = localStorage.getItem('monitoring_alerts');
      if (alertsData) {
        const entries = JSON.parse(alertsData);
        this.alerts = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    }
  }
}

// 创建服务实例并导出
export const realTimeMonitoring = RealTimeMonitoringService.getInstance();

// 类型导出
export type RealTimeMonitoring = RealTimeMonitoringService;
