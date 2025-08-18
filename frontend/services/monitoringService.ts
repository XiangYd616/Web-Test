import { apiClient } from './api

export interface SystemMetrics {
  timestamp: string;
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    usage: number;
    available: number;
  };
  disk: {
    used: number;
    total: number;
    usage: number;
    available: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    errors: number;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
    zombie: number;
  };
}

export interface ApplicationMetrics {
  timestamp: string;
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number;
    averageResponseTime: number;
  };
  database: {
    connections: number;
    queries: number;
    slowQueries: number;
    averageQueryTime: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
  };
  users: {
    active: number;
    concurrent: number;
    sessions: number;
  };
}

export interface Alert {
  id: string;
  type: 'system' | 'application' | 'security' | 'performance
  severity: 'low' | 'medium' | 'high' | 'critical
  title: string;
  message: string;
  source: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  type: 'threshold' | 'anomaly' | 'pattern
  metric: string;
  condition: {
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=
    value: number;
    duration?: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical
  isActive: boolean;
  notifications: {
    email: boolean;
    webhook: boolean;
    sms: boolean;
    recipients: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy
  responseTime: number;
  lastCheck: string;
  uptime: number;
  details?: {
    version?: string;
    dependencies?: Array<{
      name: string;
      status: 'healthy' | 'unhealthy
      responseTime?: number;
    }>;
    metrics?: Record<string, any>;
  };
}

class MonitoringService {
  // 系统监控
  async getSystemMetrics(timeRange?: '1h' | '6h' | '24h' | '7d'): Promise<SystemMetrics[]> {
    try {
      const response = await apiClient.get('/monitoring/system', {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('获取系统指标失败:', error);
      throw new Error('获取系统指标失败');
    }
  }

  async getApplicationMetrics(timeRange?: '1h' | '6h' | '24h' | '7d'): Promise<ApplicationMetrics[]> {
    try {
      const response = await apiClient.get('/monitoring/application', {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('获取应用指标失败:', error);
      throw new Error('获取应用指标失败');
    }
  }

  // 健康检查
  async getHealthStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy
    services: HealthCheck[];
    lastUpdate: string;
  }> {
    try {
      const response = await apiClient.get('/monitoring/health');
      return response.data;
    } catch (error) {
      console.error('获取健康状态失败:', error);
      throw new Error('获取健康状态失败');
    }
  }

  async runHealthCheck(service?: string): Promise<HealthCheck | HealthCheck[]> {
    try {
      const response = await apiClient.post('/monitoring/health/check', { service });
      return response.data;
    } catch (error) {
      console.error('执行健康检查失败:', error);
      throw new Error('执行健康检查失败');
    }
  }

  // 告警管理
  async getAlerts(params?: {
    type?: string;
    severity?: string;
    status?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    alerts: Alert[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await apiClient.get('/monitoring/alerts', { params });
      return response.data;
    } catch (error) {
      console.error('获取告警列表失败:', error);
      throw new Error('获取告警列表失败');
    }
  }

  async acknowledgeAlert(id: string): Promise<Alert> {
    try {
      const response = await apiClient.post(`/monitoring/alerts/${id}/acknowledge`);
      return response.data;
    } catch (error) {
      console.error('确认告警失败:', error);
      throw new Error('确认告警失败');
    }
  }

  async resolveAlert(id: string, resolution?: string): Promise<Alert> {
    try {
      const response = await apiClient.post(`/monitoring/alerts/${id}/resolve`, { resolution });
      return response.data;
    } catch (error) {
      console.error('解决告警失败:', error);
      throw new Error('解决告警失败');
    }
  }

  // 监控规则管理
  async getMonitoringRules(): Promise<MonitoringRule[]> {
    try {
      const response = await apiClient.get('/monitoring/rules');
      return response.data;
    } catch (error) {
      console.error('获取监控规则失败:', error);
      throw new Error('获取监控规则失败');
    }
  }

  async createMonitoringRule(rule: Omit<MonitoringRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<MonitoringRule> {
    try {
      const response = await apiClient.post('/monitoring/rules', rule);
      return response.data;
    } catch (error) {
      console.error('创建监控规则失败:', error);
      throw new Error('创建监控规则失败');
    }
  }

  async updateMonitoringRule(id: string, rule: Partial<MonitoringRule>): Promise<MonitoringRule> {
    try {
      const response = await apiClient.put(`/monitoring/rules/${id}`, rule);
      return response.data;
    } catch (error) {
      console.error('更新监控规则失败:', error);
      throw new Error('更新监控规则失败');
    }
  }

  async deleteMonitoringRule(id: string): Promise<void> {
    try {
      await apiClient.delete(`/monitoring/rules/${id}`);
    } catch (error) {
      console.error('删除监控规则失败:', error);
      throw new Error('删除监控规则失败');
    }
  }

  // 实时监控
  async subscribeToMetrics(callback: (metrics: SystemMetrics | ApplicationMetrics) => void): Promise<() => void> {
    try {
      // 这里应该建立WebSocket连接
      const ws = new WebSocket(`${process.env.REACT_APP_WS_URL}/monitoring/stream`);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        callback(data);
      };

      ws.onerror = (error) => {
        console.error('监控数据流连接错误:', error);
      };

      // 返回取消订阅函数
      return () => {
        ws.close();
      };
    } catch (error) {
      console.error('订阅监控数据失败:', error);
      throw new Error('订阅监控数据失败');
    }
  }

  // 性能分析
  async getPerformanceReport(params: {
    startDate: string;
    endDate: string;
    metrics: string[];
  }): Promise<{
    summary: {
      averageResponseTime: number;
      totalRequests: number;
      errorRate: number;
      uptime: number;
    };
    trends: Array<{
      timestamp: string;
      metrics: Record<string, number>;
    }>;
    insights: string[];
  }> {
    try {
      const response = await apiClient.post('/monitoring/performance-report', params);
      return response.data;
    } catch (error) {
      console.error('获取性能报告失败:', error);
      throw new Error('获取性能报告失败');
    }
  }

  // 容量规划
  async getCapacityForecast(params: {
    metric: string;
    timeRange: '30d' | '90d' | '180d
    forecastDays: number;
  }): Promise<{
    current: number;
    forecast: Array<{
      date: string;
      predicted: number;
      confidence: number;
    }>;
    recommendations: string[];
  }> {
    try {
      const response = await apiClient.post('/monitoring/capacity-forecast', params);
      return response.data;
    } catch (error) {
      console.error('获取容量预测失败:', error);
      throw new Error('获取容量预测失败');
    }
  }
}

export const monitoringService = new MonitoringService();
