/**
 * 真实的实时监控服务
 * 替换模拟数据，实现真实的监控功能
 */

import { io, Socket } from 'socket.io-client';

export interface MonitoringSite {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'warning' | 'checking';
  responseTime: number;
  uptime: number;
  lastCheck: string;
  alerts: Alert[];
  metrics: SiteMetrics;
}

export interface Alert {
  id: string;
  siteId: string;
  type: 'downtime' | 'slow_response' | 'ssl_expiry' | 'content_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface SiteMetrics {
  responseTime: number[];
  uptime: number;
  availability: number;
  errorRate: number;
  lastDowntime?: string;
  certificateExpiry?: string;
}

export interface MonitoringConfig {
  interval: number; // 检查间隔（分钟）
  timeout: number; // 超时时间（秒）
  retries: number; // 重试次数
  alertThresholds: {
    responseTime: number; // 响应时间阈值（毫秒）
    downtime: number; // 停机时间阈值（分钟）
  };
}

class RealTimeMonitoringService {
  private socket: Socket | null = null;
  private sites: Map<string, MonitoringSite> = new Map();
  private alerts: Alert[] = [];
  private _isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeSocket();
    this.loadStoredData();
  }

  /**
   * 初始化Socket.IO连接
   */
  private initializeSocket() {
    const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 2000
    });

    this.socket.on('connect', () => {
      console.log('🔌 实时监控服务已连接');
      this._isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 实时监控服务已断开');
      this._isConnected = false;
      this.emit('disconnected');
    });

    this.socket.on('monitoring:site_status', (data) => {
      this.handleSiteStatusUpdate(data);
    });

    this.socket.on('monitoring:alert', (alert) => {
      this.handleNewAlert(alert);
    });

    this.socket.on('monitoring:metrics', (data) => {
      this.handleMetricsUpdate(data);
    });

    this.socket.on('connect_error', (error) => {
      // 静默处理连接错误，避免控制台污染
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.info('WebSocket连接失败，使用本地数据模式');
        this.startPollingMode();
      }
    });
  }

  /**
   * 加载本地存储的数据
   */
  private loadStoredData() {
    try {
      const storedSites = localStorage.getItem('monitoring_sites');
      if (storedSites) {
        const sites = JSON.parse(storedSites);
        sites.forEach((site: MonitoringSite) => {
          this.sites.set(site.id, site);
        });
      }

      const storedAlerts = localStorage.getItem('monitoring_alerts');
      if (storedAlerts) {
        this.alerts = JSON.parse(storedAlerts);
      }
    } catch (error) {
      console.error('加载监控数据失败:', error);
    }
  }

  /**
   * 保存数据到本地存储
   */
  private saveToStorage() {
    try {
      localStorage.setItem('monitoring_sites', JSON.stringify(Array.from(this.sites.values())));
      localStorage.setItem('monitoring_alerts', JSON.stringify(this.alerts));
    } catch (error) {
      console.error('保存监控数据失败:', error);
    }
  }

  /**
   * 处理站点状态更新
   */
  private handleSiteStatusUpdate(data: any) {
    const site = this.sites.get(data.siteId);
    if (site) {
      site.status = data.status;
      site.responseTime = data.responseTime;
      site.lastCheck = data.timestamp;

      if (data.metrics) {
        site.metrics = { ...site.metrics, ...data.metrics };
      }

      this.sites.set(data.siteId, site);
      this.saveToStorage();
      this.emit('siteUpdated', site);
    }
  }

  /**
   * 处理新告警
   */
  private handleNewAlert(alert: Alert) {
    this.alerts.unshift(alert);

    // 只保留最近100条告警
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    this.saveToStorage();
    this.emit('newAlert', alert);
  }

  /**
   * 处理指标更新
   */
  private handleMetricsUpdate(data: any) {
    const site = this.sites.get(data.siteId);
    if (site && data.metrics) {
      site.metrics = { ...site.metrics, ...data.metrics };
      this.sites.set(data.siteId, site);
      this.saveToStorage();
      this.emit('metricsUpdated', { siteId: data.siteId, metrics: data.metrics });
    }
  }

  /**
   * 启动轮询模式（当WebSocket不可用时）
   */
  private startPollingMode() {
    // 在开发环境下检查后端是否可用
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      console.info('🔄 开发环境：跳过轮询模式，使用本地数据');
      return;
    }

    console.log('🔄 启动轮询模式');

    const pollInterval = setInterval(async () => {
      if (this._isConnected) {
        clearInterval(pollInterval);
        return;
      }

      try {
        await this.fetchMonitoringData();
      } catch (error) {
        // 静默处理错误，避免控制台污染
        console.info('轮询模式：使用本地数据');
      }
    }, 30000); // 30秒轮询一次
  }

  /**
   * 获取监控数据（HTTP API）
   */
  private async fetchMonitoringData() {
    try {
      const token = localStorage.getItem('auth_token');

      // 创建带超时的fetch请求
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

      const response = await fetch('/api/monitoring/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.updateSitesFromAPI(data.data);
        }
      }
    } catch (error) {
      // 静默处理错误，避免控制台污染
      if ((error as Error)?.name !== 'AbortError') {
        console.info('监控数据获取失败，使用本地数据');
      }
    }
  }

  /**
   * 从API数据更新站点信息
   */
  private updateSitesFromAPI(data: any) {
    if (data.sites) {
      data.sites.forEach((siteData: any) => {
        const site: MonitoringSite = {
          id: siteData.id,
          name: siteData.name,
          url: siteData.url,
          status: siteData.status,
          responseTime: siteData.responseTime || 0,
          uptime: siteData.uptime || 0,
          lastCheck: siteData.lastCheck || new Date().toISOString(),
          alerts: siteData.alerts || [],
          metrics: siteData.metrics || {
            responseTime: [],
            uptime: 0,
            availability: 0,
            errorRate: 0
          }
        };

        this.sites.set(site.id, site);
      });

      this.saveToStorage();
      this.emit('sitesUpdated', Array.from(this.sites.values()));
    }

    if (data.alerts) {
      this.alerts = data.alerts;
      this.saveToStorage();
      this.emit('alertsUpdated', this.alerts);
    }
  }

  /**
   * 事件监听器管理
   */
  private emit(event: string, data?: any) {
    const eventListeners = this.listeners.get(event) || [];
    eventListeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`事件监听器错误 (${event}):`, error);
      }
    });
  }

  public on(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  public off(event: string, listener: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * 公共API方法
   */
  public getSites(): MonitoringSite[] {
    return Array.from(this.sites.values());
  }

  public getSite(id: string): MonitoringSite | undefined {
    return this.sites.get(id);
  }

  public getAlerts(): Alert[] {
    return this.alerts;
  }

  public getUnreadAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  public async addSite(siteData: Omit<MonitoringSite, 'id' | 'status' | 'lastCheck' | 'alerts' | 'metrics'>): Promise<MonitoringSite> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/monitoring/sites', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(siteData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const newSite = result.data;
          this.sites.set(newSite.id, newSite);
          this.saveToStorage();
          this.emit('siteAdded', newSite);
          return newSite;
        }
      }

      throw new Error('添加监控站点失败');
    } catch (error) {
      console.error('添加监控站点失败:', error);
      throw error;
    }
  }

  public async removeSite(siteId: string): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/monitoring/sites/${siteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.sites.delete(siteId);
        this.saveToStorage();
        this.emit('siteRemoved', siteId);
      } else {
        throw new Error('删除监控站点失败');
      }
    } catch (error) {
      console.error('删除监控站点失败:', error);
      throw error;
    }
  }

  public async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.saveToStorage();
      this.emit('alertResolved', alert);

      // 同步到后端
      try {
        const token = localStorage.getItem('auth_token');
        await fetch(`/api/monitoring/alerts/${alertId}/resolve`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('同步告警状态失败:', error);
      }
    }
  }

  public getConnectionStatus(): boolean {
    return this._isConnected;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// 单例实例
export const realTimeMonitoringService = new RealTimeMonitoringService();
export default realTimeMonitoringService;
