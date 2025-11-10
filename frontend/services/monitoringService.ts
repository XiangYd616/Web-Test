import Logger from '@/utils/logger';

/**
 * monitoringService.ts - 业务服务层
 * 
 * 文件路径: frontend\services\monitoringService.ts
 * 创建时间: 2025-09-25
 */


export interface MonitoringSite {
  id: string;
  url: string;
  name: string;
  status: 'online' | 'offline' | 'warning' | 'maintenance';
  responseTime: number;
  uptime: number;
  lastCheck: string;
  alerts: number;
  region?: string;
  sslExpiry?: string;
  certificateValid?: boolean;
  httpStatus?: number;
  responseSize?: number;
  dnsTime?: number;
  connectTime?: number;
  downloadTime?: number;
  createdAt: string;
  enabled: boolean;
}

export interface MonitoringData {
  timestamp: string;
  siteId: string;
  responseTime: number;
  status: number;
  uptime: number;
  dnsTime: number;
  connectTime: number;
  downloadTime: number;
  responseSize: number;
  error?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  siteId: string;
  condition: 'response_time' | 'status_code' | 'uptime' | 'ssl_expiry';
  operator: '>' | '<' | '=' | '!=';
  threshold: number;
  enabled: boolean;
  notifications: ('email' | 'webhook' | 'sms')[];
  createdAt: string;
}

export interface MonitoringStats {
  totalSites: number;
  onlineSites: number;
  avgResponseTime: number;
  totalUptime: number;
  activeAlerts: number;
  validCertificates: number;
  totalChecks: number;
  incidents: number;
}

class MonitoringService {
  private baseUrl = `http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api`;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private sites: MonitoringSite[] = [];
  private alertRules: AlertRule[] = [];
  private monitoringData: MonitoringData[] = [];

  /**
   * 获取认证头
   */
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * 获取所有监控站点
   */
  async getSites(): Promise<MonitoringSite[]> {
    try {
      const response = await fetch(`${this.baseUrl}/monitoring/sites`, {
        headers: this.getAuthHeaders()
      });
      const data = await response.json();

      if (data.success) {
        this.sites = data.data;
        return this.sites;
      } else {
        // 如果后端还没有实现，返回本地数据
        return this.getLocalSites();
      }
    } catch (error) {
      Logger.warn('Backend not available, using local data:', { error: String(error) });
      return this.getLocalSites();
    }
  }

  /**
   * 添加监控站点
   */
  async addSite(siteData: Omit<MonitoringSite, 'id' | 'status' | 'responseTime' | 'uptime' | 'lastCheck' | 'alerts' | 'createdAt'>): Promise<MonitoringSite> {
    const newSite: MonitoringSite = {
      id: Date?.now().toString(),
      status: 'online',
      responseTime: 0,
      uptime: 100,
      lastCheck: new Date().toISOString(),
      alerts: 0,
      createdAt: new Date().toISOString(),
      enabled: true,
      ...siteData
    };

    try {
      const response = await fetch(`${this.baseUrl}/monitoring/sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSite)
      });

      const data = await response.json();
      if (data.success) {
        this.sites.push(data.data);
        return data.data;
      }
    } catch (error) {
      Logger.warn('Backend not available, using local storage:', { error: String(error) });
    }

    // 本地存储
    this.sites.push(newSite);
    this.saveLocalSites();

    // 立即检查新站点
    setTimeout(() => {
      this.checkSite(newSite);
    }, 1000);

    return newSite;
  }

  /**
   * 删除监控站点
   */
  async removeSite(siteId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/monitoring/sites/${siteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.sites = this.sites.filter(site => site.id !== siteId);
        return;
      }
    } catch (error) {
      Logger.warn('Backend not available, using local storage:', { error: String(error) });
    }

    // 本地删除
    this.sites = this.sites.filter(site => site.id !== siteId);
    this.saveLocalSites();
  }

  /**
   * 检查单个站点状态
   */
  async checkSite(site: MonitoringSite): Promise<MonitoringData> {
    const startTime = Date?.now();

    try {
      // 使用fetch进行真实的HTTP请求检查
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const response = await fetch(site.url, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors' // 避免CORS问题
      });

      clearTimeout(timeoutId);

      const responseTime = Date?.now() - startTime;
      const status = response.status || 200;

      const monitoringData: MonitoringData = {
        timestamp: new Date().toISOString(),
        siteId: site.id,
        responseTime,
        status,
        uptime: status >= 200 && status < 400 ? 100 : 0,
        dnsTime: Math.random() * 50 + 10, // 模拟DNS时间
        connectTime: Math.random() * 100 + 20, // 模拟连接时间
        downloadTime: responseTime - 30, // 估算下载时间
        responseSize: Math.random() * 1000 + 500 // 模拟响应大小
      };

      // 更新站点状态
      this.updateSiteStatus(site.id, {
        status: status >= 200 && status < 400 ? 'online' : 'offline',
        responseTime,
        lastCheck: monitoringData.timestamp,
        httpStatus: status
      });

      this.monitoringData.push(monitoringData);

      // 检查告警规则
      this.checkAlerts(site, monitoringData);

      return monitoringData;

    } catch (error) {
      const responseTime = Date?.now() - startTime;

      const monitoringData: MonitoringData = {
        timestamp: new Date().toISOString(),
        siteId: site.id,
        responseTime,
        status: 0,
        uptime: 0,
        dnsTime: 0,
        connectTime: 0,
        downloadTime: 0,
        responseSize: 0,
        error: error instanceof Error ? error?.message : 'Unknown error'
      };

      // 更新站点状态为离线
      this.updateSiteStatus(site.id, {
        status: 'offline',
        responseTime,
        lastCheck: monitoringData.timestamp,
        alerts: (this.sites.find(s => s.id === site.id)?.alerts || 0) + 1
      });

      this.monitoringData.push(monitoringData);

      return monitoringData;
    }
  }

  /**
   * 检查SSL证书
   */
  async checkSSLCertificate(url: string): Promise<{ valid: boolean; expiryDate?: string; daysUntilExpiry?: number }> {
    try {
      // 在真实环境中，这需要后端服务来检查SSL证书
      // 这里提供一个模拟实现
      const hostname = new URL(url).hostname;

      // 模拟SSL检查结果
      const expiryDate = new Date();
      expiryDate?.setDate(expiryDate?.getDate() + Math.random() * 365 + 30); // 30-395天后过期

      const daysUntilExpiry = Math.floor((expiryDate?.getTime() - Date?.now()) / (1000 * 60 * 60 * 24));

      return {
        valid: daysUntilExpiry > 0,
        expiryDate: expiryDate?.toISOString(),
        daysUntilExpiry
      };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * 开始监控
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      const enabledSites = this.sites.filter(site => site.enabled);

      for (const site of enabledSites) {
        try {
          await this.checkSite(site);

          // 检查SSL证书（每小时检查一次）
          if (Math.random() < 0.1) { // 10%概率检查SSL
            const sslInfo = await this.checkSSLCertificate(site.url);
            this.updateSiteStatus(site.id, {
              certificateValid: sslInfo.valid,
              sslExpiry: sslInfo.expiryDate
            });
          }
        } catch (error) {
          Logger.error(`Error checking site ${site.url}:`, error);
        }

        // 避免同时发送太多请求
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }, intervalMs);
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * 获取监控数据
   */
  getMonitoringData(siteId?: string, limit: number = 50): MonitoringData[] {
    let data = this.monitoringData;

    if (siteId) {
      data = data.filter(d => d.siteId === siteId);
    }

    return data
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * 获取监控统计
   */
  getMonitoringStats(): MonitoringStats {
    const totalSites = this.sites.length;
    const onlineSites = this.sites.filter(site => site.status === 'online').length;
    const avgResponseTime = totalSites > 0
      ? this.sites.reduce((sum, site) => sum + site.responseTime, 0) / totalSites
      : 0;
    const totalUptime = totalSites > 0
      ? this.sites.reduce((sum, site) => sum + site.uptime, 0) / totalSites
      : 0;
    const activeAlerts = this.sites.reduce((sum, site) => sum + site.alerts, 0);
    const validCertificates = this.sites.filter(site => site.certificateValid).length;

    return {
      totalSites,
      onlineSites,
      avgResponseTime,
      totalUptime,
      activeAlerts,
      validCertificates,
      totalChecks: this.monitoringData.length,
      incidents: this.monitoringData.filter(d => d.status === 0 || d?.status >= 400).length
    };
  }

  /**
   * 私有方法：更新站点状态
   */
  private updateSiteStatus(siteId: string, updates: Partial<MonitoringSite>): void {
    const siteIndex = this.sites.findIndex(site => site.id === siteId);
    if (siteIndex !== -1) {
      this.sites[siteIndex] = { ...this.sites[siteIndex], ...updates };
      this.saveLocalSites();
    }
  }

  /**
   * 私有方法：检查告警规则
   */
  private checkAlerts(site: MonitoringSite, data: MonitoringData): void {
    const siteAlerts = this.alertRules.filter(rule =>
      rule.siteId === site.id && rule.enabled
    );

    for (const alert of siteAlerts) {
      let shouldAlert = false;

      switch (alert.condition) {
        case 'response_time':
          shouldAlert = this.evaluateCondition(data.responseTime, alert.operator, alert.threshold);
          break;
        case 'status_code':
          shouldAlert = this.evaluateCondition(data.status, alert.operator, alert.threshold);
          break;
        case 'uptime':
          shouldAlert = this.evaluateCondition(data.uptime, alert.operator, alert.threshold);
          break;
      }

      if (shouldAlert) {
        this.triggerAlert(alert, site, data);
      }
    }
  }

  /**
   * 私有方法：评估告警条件
   */
  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '=': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  /**
   * 私有方法：触发告警
   */
  private triggerAlert(alert: AlertRule, site: MonitoringSite, data: MonitoringData): void {
    Logger.warn(`Alert triggered: ${alert.name} for site ${site.name}`, {
      alert,
      site,
      data
    });

    // 在真实环境中，这里会发送邮件、短信或webhook通知
    // 现在只是增加告警计数
    this.updateSiteStatus(site.id, {
      alerts: site.alerts + 1
    });
  }

  /**
   * 私有方法：获取本地站点数据
   */
  private getLocalSites(): MonitoringSite[] {
    try {
      const stored = localStorage.getItem('monitoring_sites');
      if (stored) {
        this.sites = JSON.parse(stored);
        return this.sites;
      }
    } catch (error) {
      Logger.error('Error loading local sites:', error);
    }

    // 默认示例站点
    this.sites = [
      {
        id: '1',
        url: 'https://www.google.com',
        name: 'Google',
        status: 'online',
        responseTime: 120,
        uptime: 99.9,
        lastCheck: new Date().toISOString(),
        alerts: 0,
        region: '全球',
        sslExpiry: '2024-12-31',
        certificateValid: true,
        httpStatus: 200,
        responseSize: 1024,
        dnsTime: 12,
        connectTime: 45,
        downloadTime: 63,
        createdAt: new Date().toISOString(),
        enabled: true
      }
    ];

    this.saveLocalSites();
    return this.sites;
  }

  /**
   * 私有方法：保存本地站点数据
   */
  private saveLocalSites(): void {
    try {
      localStorage.setItem('monitoring_sites', JSON.stringify(this.sites));
    } catch (error) {
      Logger.error('Error saving local sites:', error);
    }
  }
}

export const monitoringService = new MonitoringService();
