/**
 * 权限审计日志服务
 * 提供权限操作记录、安全事件监控、审计日志管理
 * 版本: v1.0.0
 */

import { useCallback, useState    } from 'react';// ==================== 类型定义 ==================== ''
export type AuditEventType   = | 'login' | 'logout' | 'login_failed' | 'password_change' | 'password_reset';
  | 'mfa_setup' | 'mfa_verify' | 'mfa_failed';
  | 'permission_granted' | 'permission_denied' | 'permission_check';
  | 'role_assigned' | 'role_removed' | 'role_created' | 'role_updated' | 'role_deleted';
  | 'user_created' | 'user_updated' | 'user_deleted' | 'user_locked' | 'user_unlocked';
  | 'session_created' | 'session_terminated' | 'session_expired';
  | 'security_alert' | 'suspicious_activity' | 'data_access' | 'data_modification';
  | 'system_config' | 'admin_action' | 'api_access' | 'file_access';export type AuditSeverity   = 'low' | 'medium' | 'high' | 'critical';export type AuditStatus   = 'success' | 'failure' | 'warning' | 'info';export interface AuditLogEntry     {'
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  status: AuditStatus;
  userId?: string;
  username?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  resource?: string;
  action?: string;
  target?: string; // 操作目标（如被操作的用户ID、角色ID等）
  details: Record<string, any>;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: [number, number];
  };
  deviceInfo?: {
    deviceId: string;
    platform: string;
    browser: string;
    os: string;
  };
  riskScore?: number; // 0-100，风险评分
  tags: string[];
  correlationId?: string; // 关联ID，用于关联相关事件
  parentEventId?: string; // 父事件ID，用于事件链追踪
}

export interface AuditQuery     {
  startTime?: string;
  endTime?: string;
  eventTypes?: AuditEventType[];
  severities?: AuditSeverity[];
  statuses?: AuditStatus[];
  userIds?: string[];
  ipAddresses?: string[];
  resources?: string[];
  actions?: string[];
  tags?: string[];
  searchTerm?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'riskScore';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditStatistics     {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsByStatus: Record<AuditStatus, number>;
  topUsers: Array<{ userId: string; username: string; count: number }>;
  topIpAddresses: Array<{ ipAddress: string; count: number }>;
  riskTrends: Array<{ date: string; averageRisk: number; eventCount: number }>;
  timeRange: { start: string; end: string };
}

export interface SecurityAlert     {
  id: string;
  timestamp: string;
  type: 'brute_force' | 'unusual_location' | 'privilege_escalation' | 'data_exfiltration' | 'suspicious_pattern';
  severity: AuditSeverity;
  title: string;
  description: string;
  userId?: string;
  username?: string;
  ipAddress: string;
  relatedEvents: string[]; // 相关审计日志ID
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
  metadata: Record<string, any>;
}

export interface AuditConfig     {
  enableRealTimeMonitoring: boolean;
  retentionDays: number;
  maxLogSize: number; // 最大日志条数
  enableGeoLocation: boolean;
  enableRiskScoring: boolean;
  alertThresholds: {
    failedLoginAttempts: number;
    suspiciousActivityScore: number;
    privilegeEscalationDetection: boolean;
  };
  exportFormats: ('json' | 'csv' | 'pdf')[];'
  complianceMode: 'gdpr' | 'hipaa' | 'sox' | 'custom';
}

// ==================== 风险评分器 ====================

class RiskScorer {
  /**
   * 计算事件风险分数
   */
  static calculateRiskScore(entry: Partial<AuditLogEntry>): number {
    let score = 0;

    // 基础事件类型风险
    const eventRisks: Record<AuditEventType, number>  = {
      'login_failed': 20,'
      'mfa_failed': 25,'
      'permission_denied': 15,'
      'suspicious_activity': 80,'
      'privilege_escalation': 90,'
      'data_exfiltration': 95,'
      'user_locked': 30,'
      'session_terminated': 10,'
      'password_change': 5,'
      'login': 0,'
      'logout': 0,'
      'password_reset': 10,'
      'mfa_setup': 5,'
      'mfa_verify': 0,'
      'permission_granted': 0,'
      'permission_check': 0,'
      'role_assigned': 15,'
      'role_removed': 20,'
      'role_created': 25,'
      'role_updated': 20,'
      'role_deleted': 30,'
      'user_created': 10,'
      'user_updated': 5,'
      'user_deleted': 40,'
      'user_unlocked': 5,'
      'session_created': 0,'
      'session_expired': 5,'
      'security_alert': 60,'
      'data_access': 5,'
      'data_modification': 15,'
      'system_config': 30,'
      'admin_action': 25,'
      'api_access': 5,'
      'file_access': 10'
    };
    if (entry.eventType) {
      score += eventRisks[entry.eventType] || 0;
    }

    // 状态风险
    if (entry.status === 'failure') score += 20;'
    if (entry.status === 'warning') score += 10;'
    // 严重程度风险
    const severityRisks: Record<AuditSeverity, number>  = {
      'low': 0,'
      'medium': 10,'
      'high': 25,'
      'critical': 40'
    };
    if (entry.severity) {
      score += severityRisks[entry.severity];
    }

    // 时间相关风险（非工作时间）
    if (entry.timestamp) {
      const hour = new Date(entry.timestamp).getHours();
      if (hour < 6 || hour > 22) {
        score += 10; // 非工作时间增加风险
      }
    }

    // 地理位置风险（如果启用）
    if (entry.location && this.isUnusualLocation(entry.location)) {
      score += 15;
    }

    // 设备风险
    if (entry.deviceInfo && this.isNewDevice(entry.deviceInfo)) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 检查是否为异常位置
   */
  private static isUnusualLocation(location: any): boolean {
    // 这里应该实现基于历史位置的异常检测
    // 目前简化实现
    return false;
  }

  /**
   * 检查是否为新设备
   */
  private static isNewDevice(deviceInfo: any): boolean {
    // 这里应该实现设备指纹识别
    // 目前简化实现
    return false;
  }
}

// ==================== 安全事件检测器 ====================

class SecurityEventDetector {
  private static recentEvents = new Map<string, AuditLogEntry[]>();

  /**
   * 检测安全事件
   */
  static detectSecurityEvents(entry: AuditLogEntry): SecurityAlert[] {
    const alerts: SecurityAlert[]  = [];
    // 暴力破解检测
    if (entry.eventType === 'login_failed') {'
      const bruteForceAlert = this.detectBruteForce(entry);
      if (bruteForceAlert) alerts.push(bruteForceAlert);
    }

    // 异常位置检测
    if (entry.location && this.isUnusualLocation(entry)) {
      alerts.push(this.createLocationAlert(entry));
    }

    // 权限提升检测
    if (entry.eventType === 'role_assigned' || entry.eventType === 'permission_granted') {'
      const escalationAlert = this.detectPrivilegeEscalation(entry);
      if (escalationAlert) alerts.push(escalationAlert);
    }

    // 可疑模式检测
    const patternAlert = this.detectSuspiciousPattern(entry);
    if (patternAlert) alerts.push(patternAlert);

    return alerts;
  }

  /**
   * 检测暴力破解
   */
  private static detectBruteForce(entry: AuditLogEntry): SecurityAlert | null {
    const key = `${entry.ipAddress}_${entry.userId || "unknown'}`;'`
    const recentFailures = this.getRecentEvents(key, "login_failed', 15 * 60 * 1000); // 15分钟内'`

    if (recentFailures.length >= 5) {
      
        return {
        id: this.generateAlertId(),
        timestamp: new Date().toISOString(),
        type: 'brute_force','
        severity: 'high','
        title: '检测到暴力破解攻击','
        description: `IP地址 ${entry.ipAddress`}
      } 在15分钟内尝试登录失败${recentFailures.length}次`,`
        userId: entry.userId,
        username: entry.username,
        ipAddress: entry.ipAddress,
        relatedEvents: recentFailures.map(e => e.id),
        isResolved: false,
        metadata: {
          failureCount: recentFailures.length,
          timeWindow: "15分钟','`
          targetUser: entry.userId
        }
      };
    }

    return null;
  }

  /**
   * 检测异常位置
   */
  private static isUnusualLocation(entry: AuditLogEntry): boolean {
    // 简化实现，实际应该基于用户历史位置
    return false;
  }

  /**
   * 创建位置警报
   */
  private static createLocationAlert(entry: AuditLogEntry): SecurityAlert {
    return {
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      type: 'unusual_location','
      severity: 'medium','
      title: '检测到异常位置登录','
      description: `用户从异常位置登录: ${entry.location?.city || '未知'}, ${entry.location?.country || '未知'}`,'`
      userId: entry.userId,
      username: entry.username,
      ipAddress: entry.ipAddress,
      relatedEvents: [entry.id],
      isResolved: false,
      metadata: {
        location: entry.location,
        previousLocations: [] // 应该从历史记录获取
      }
    };
  }

  /**
   * 检测权限提升
   */
  private static detectPrivilegeEscalation(entry: AuditLogEntry): SecurityAlert | null {
    // 简化实现，实际应该分析权限变化模式
    if (entry.details?.newRole === "admin' || entry.details?.permission?.includes('admin')) {'`
      return {
        id: this.generateAlertId(),
        timestamp: new Date().toISOString(),
        type: 'privilege_escalation','
        severity: 'critical','
        title: '检测到权限提升','
        description: `用户权限被提升到管理员级别`,`
        userId: entry.userId,
        username: entry.username,
        ipAddress: entry.ipAddress,
        relatedEvents: [entry.id],
        isResolved: false,
        metadata: {
          oldPermissions: entry.details?.oldPermissions,
          newPermissions: entry.details?.newPermissions,
          grantedBy: entry.details?.grantedBy
        }
      };
    }

    return null;
  }

  /**
   * 检测可疑模式
   */
  private static detectSuspiciousPattern(entry: AuditLogEntry): SecurityAlert | null {
    // 检查高风险分数
    if (entry.riskScore && entry.riskScore > 70) {
      
        return {
        id: this.generateAlertId(),
        timestamp: new Date().toISOString(),
        type: "suspicious_pattern','`
        severity: entry.riskScore > 90 ? 'critical' : 'high','
        title: '检测到可疑活动模式','
        description: `检测到高风险活动，风险分数: ${entry.riskScore`}
      }`,`
        userId: entry.userId,
        username: entry.username,
        ipAddress: entry.ipAddress,
        relatedEvents: [entry.id],
        isResolved: false,
        metadata: {
          riskScore: entry.riskScore,
          riskFactors: this.analyzeRiskFactors(entry)
        }
      };
    }

    return null;
  }

  /**
   * 分析风险因素
   */
  private static analyzeRiskFactors(entry: AuditLogEntry): string[] {
    const factors: string[]  = [];
    if (entry.status === "failure') factors.push('操作失败');'`
    if (entry.severity === 'critical' || entry.severity === 'high') factors.push('高严重程度');'
    const hour = new Date(entry.timestamp).getHours();
    if (hour < 6 || hour > 22) factors.push('非工作时间');'
    return factors;
  }

  /**
   * 获取最近事件
   */
  private static getRecentEvents(key: string, eventType: AuditEventType, timeWindow: number): AuditLogEntry[] {
    const events = this.recentEvents.get(key) || [];
    const cutoff = Date.now() - timeWindow;

    return events.filter(event =>
      event.eventType === eventType &&
      new Date(event.timestamp).getTime() > cutoff
    );
  }

  /**
   * 添加事件到缓存
   */
  static addEventToCache(entry: AuditLogEntry): void {
    const key = `${entry.ipAddress}_${entry.userId || 'unknown'}`;'`
    const events = this.recentEvents.get(key) || [];

    events.unshift(entry);

    // 保持最近100个事件
    if (events.length > 100) {
      events.splice(100);
    }

    this.recentEvents.set(key, events);
  }

  private static generateAlertId(): string {
    return "alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);'`
  }
}

// ==================== 审计日志服务主类 ====================

export class AuditLogService {
  private config: AuditConfig;
  private logs: AuditLogEntry[] = [];
  private alerts: SecurityAlert[] = [];
  private eventListeners = new Map<string, ((entry: AuditLogEntry) => void)[]>();

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = {
      enableRealTimeMonitoring: true,
      retentionDays: 90,
      maxLogSize: 100000,
      enableGeoLocation: true,
      enableRiskScoring: true,
      alertThresholds: {
        failedLoginAttempts: 5,
        suspiciousActivityScore: 70,
        privilegeEscalationDetection: true
      },
      exportFormats: ['json', 'csv'],'
      complianceMode: 'custom','
      ...config
    };

    this.startCleanupTimer();
  }

  // ==================== 日志记录 ====================

  /**
   * 记录审计事件
   */
  async logEvent(
    eventType: AuditEventType,
    details: Record<string, any>,
    options: {
      userId?: string;
      username?: string;
      sessionId?: string;
      ipAddress: string;
      userAgent: string;
      resource?: string;
      action?: string;
      target?: string;
      severity?: AuditSeverity;
      status?: AuditStatus;
      tags?: string[];
      correlationId?: string;
      parentEventId?: string;
    }
  ): Promise<AuditLogEntry> {
    const entry: AuditLogEntry  = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      eventType,
      severity: options.severity || this.getDefaultSeverity(eventType),
      status: options.status || 'success','
      userId: options.userId,
      username: options.username,
      sessionId: options.sessionId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      resource: options.resource,
      action: options.action,
      target: options.target,
      details,
      tags: options.tags || [],
      correlationId: options.correlationId,
      parentEventId: options.parentEventId
    };
    // 获取地理位置信息
    if (this.config.enableGeoLocation) {
      entry.location = await this.getLocationInfo(options.ipAddress);
    }

    // 获取设备信息
    entry.deviceInfo = this.parseDeviceInfo(options.userAgent);

    // 计算风险分数
    if (this.config.enableRiskScoring) {
      entry.riskScore = RiskScorer.calculateRiskScore(entry);
    }

    // 存储日志
    this.logs.unshift(entry);

    // 限制日志大小
    if (this.logs.length > this.config.maxLogSize) {
      this.logs = this.logs.slice(0, this.config.maxLogSize);
    }

    // 缓存日志
    await this.cacheLogEntry(entry);

    // 安全事件检测
    if (this.config.enableRealTimeMonitoring) {
      const securityAlerts = SecurityEventDetector.detectSecurityEvents(entry);
      this.alerts.push(...securityAlerts);

      // 缓存安全事件
      SecurityEventDetector.addEventToCache(entry);
    }

    // 触发事件监听器
    this.notifyEventListeners(entry);

    return entry;
  }

  /**
   * 批量记录事件
   */
  async logEvents(events: Array<{
    eventType: AuditEventType;
    details: Record<string, any>;
    options: any;
  }>): Promise<AuditLogEntry[]> {
    const entries: AuditLogEntry[]  = [];
    for (const event of events) {
      const entry = await this.logEvent(event.eventType, event.details, event.options);
      entries.push(entry);
    }

    return entries;
  }

  // ==================== 日志查询 ====================

  /**
   * 查询审计日志
   */
  async queryLogs(query: AuditQuery = {}): Promise<{
    logs: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    let filteredLogs = [...this.logs];

    // 时间范围过滤
    if (query.startTime) {
      const startTime = new Date(query.startTime).getTime();
      filteredLogs = filteredLogs.filter(log =>
        new Date(log.timestamp).getTime() >= startTime
      );
    }

    if (query.endTime) {
      const endTime = new Date(query.endTime).getTime();
      filteredLogs = filteredLogs.filter(log =>
        new Date(log.timestamp).getTime() <= endTime
      );
    }

    // 事件类型过滤
    if (query.eventTypes && query.eventTypes.length > 0) {
      filteredLogs = filteredLogs.filter(log =>
        query.eventTypes!.includes(log.eventType)
      );
    }

    // 严重程度过滤
    if (query.severities && query.severities.length > 0) {
      filteredLogs = filteredLogs.filter(log =>
        query.severities!.includes(log.severity)
      );
    }

    // 状态过滤
    if (query.statuses && query.statuses.length > 0) {
      filteredLogs = filteredLogs.filter(log =>
        query.statuses!.includes(log.status)
      );
    }

    // 用户过滤
    if (query.userIds && query.userIds.length > 0) {
      filteredLogs = filteredLogs.filter(log =>
        log.userId && query.userIds!.includes(log.userId)
      );
    }

    // IP地址过滤
    if (query.ipAddresses && query.ipAddresses.length > 0) {
      filteredLogs = filteredLogs.filter(log =>
        query.ipAddresses!.includes(log.ipAddress)
      );
    }

    // 资源过滤
    if (query.resources && query.resources.length > 0) {
      filteredLogs = filteredLogs.filter(log =>
        log.resource && query.resources!.includes(log.resource)
      );
    }

    // 操作过滤
    if (query.actions && query.actions.length > 0) {
      filteredLogs = filteredLogs.filter(log =>
        log.action && query.actions!.includes(log.action)
      );
    }

    // 标签过滤
    if (query.tags && query.tags.length > 0) {
      filteredLogs = filteredLogs.filter(log =>
        query.tags!.some(tag => log.tags.includes(tag))
      );
    }

    // 搜索词过滤
    if (query.searchTerm) {
      const searchTerm = query.searchTerm.toLowerCase();
      filteredLogs = filteredLogs.filter(log =>
        log.username?.toLowerCase().includes(searchTerm) ||
        log.ipAddress.includes(searchTerm) ||
        log.resource?.toLowerCase().includes(searchTerm) ||
        log.action?.toLowerCase().includes(searchTerm) ||
        JSON.stringify(log.details).toLowerCase().includes(searchTerm)
      );
    }

    // 排序
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';
    filteredLogs.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'timestamp': ''
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'severity': ''
          const severityOrder = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };'
          aValue = severityOrder[a.severity];
          bValue = severityOrder[b.severity];
          break;
        case 'riskScore': ''
          aValue = a.riskScore || 0;
          bValue = b.riskScore || 0;
          break;
        default:
          aValue = a.timestamp;
          bValue = b.timestamp;
      }

      if (sortOrder === 'asc') {'
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // 分页
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const total = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      logs: paginatedLogs,
      total,
      hasMore
    };
  }

  /**
   * 获取审计统计
   */
  async getStatistics(query: AuditQuery = {}): Promise<AuditStatistics> {
    const { logs } = await this.queryLogs(query);

    const eventsByType = logs.reduce((acc, log) => {
      acc[log.eventType] = (acc[log.eventType] || 0) + 1;
      return acc;
    }, {} as Record<AuditEventType, number>);

    const eventsBySeverity = logs.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {} as Record<AuditSeverity, number>);

    const eventsByStatus = logs.reduce((acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {} as Record<AuditStatus, number>);

    // 用户统计
    const userCounts = logs.reduce((acc, log) => {
      if (log.userId) {
        const key = log.userId;
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topUsers = Object.entries(userCounts)
      .map(([userId, count]) => {
        const log = logs.find(l => l.userId === userId);
        return {
          userId,
          username: log?.username || 'Unknown','
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // IP地址统计
    const ipCounts = logs.reduce((acc, log) => {
      acc[log.ipAddress] = (acc[log.ipAddress] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topIpAddresses = Object.entries(ipCounts)
      .map(([ipAddress, count]) => ({ ipAddress, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 风险趋势（按天）
    const riskTrends = this.calculateRiskTrends(logs);

    const timeRange = {
      start: logs.length > 0 ? logs[logs.length - 1].timestamp : new Date().toISOString(),
      end: logs.length > 0 ? logs[0].timestamp : new Date().toISOString()
    };

    return {
      totalEvents: logs.length,
      eventsByType,
      eventsBySeverity,
      eventsByStatus,
      topUsers,
      topIpAddresses,
      riskTrends,
      timeRange
    };
  }

  // ==================== 安全警报管理 ====================

  /**
   * 获取安全警报
   */
  getSecurityAlerts(resolved?: boolean): SecurityAlert[] {
    if (resolved !== undefined) {
      
        return this.alerts.filter(alert => alert.isResolved === resolved);
      }
    return [...this.alerts];
  }

  /**
   * 解决安全警报
   */
  async resolveAlert(alertId: string, resolvedBy: string, resolution: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.isResolved = true;
    alert.resolvedBy = resolvedBy;
    alert.resolvedAt = new Date().toISOString();
    alert.resolution = resolution;

    // 记录解决事件
    await this.logEvent('security_alert', {'
      alertId,
      alertType: alert.type,
      resolution
    }, {
      userId: resolvedBy,
      ipAddress: '127.0.0.1', // 应该从请求中获取'
      userAgent: 'System','
      severity: 'low','
      status: 'success','
      tags: ['alert_resolution']'
    });

    return true;
  }

  // ==================== 事件监听 ====================

  /**
   * 添加事件监听器
   */
  addEventListener(eventType: AuditEventType, listener: (entry: AuditLogEntry) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(eventType: AuditEventType, listener: (entry: AuditLogEntry) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 通知事件监听器
   */
  private notifyEventListeners(entry: AuditLogEntry): void {
    const listeners = this.eventListeners.get(entry.eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(entry);
        } catch (error) {
          console.error('事件监听器执行失败:', error);'
        }
      });
    }
  }

  // ==================== 工具方法 ====================

  private generateLogId(): string {
    return 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);'
  }

  private getDefaultSeverity(eventType: AuditEventType): AuditSeverity {
    const severityMap: Record<AuditEventType, AuditSeverity>  = {
      'login_failed': 'medium','
      'mfa_failed': 'medium','
      'permission_denied': 'medium','
      'suspicious_activity': 'high','
      'security_alert': 'high','
      'user_deleted': 'high','
      'role_deleted': 'high','
      'system_config': 'medium','
      'admin_action': 'medium','
      'session_terminated': 'low','
      'login': 'low','
      'logout': 'low','
      'password_change': 'low','
      'password_reset': 'medium','
      'mfa_setup': 'low','
      'mfa_verify': 'low','
      'permission_granted': 'low','
      'permission_check': 'low','
      'role_assigned': 'medium','
      'role_removed': 'medium','
      'role_created': 'medium','
      'role_updated': 'low','
      'user_created': 'low','
      'user_updated': 'low','
      'user_locked': 'medium','
      'user_unlocked': 'low','
      'session_created': 'low','
      'session_expired': 'low','
      'data_access': 'low','
      'data_modification': 'medium','
      'api_access': 'low','
      'file_access': 'low';
    };
    return severityMap[eventType] || 'low';
  }

  private async getLocationInfo(ipAddress: string): Promise<any> {
    // 这里应该集成地理位置服务
    // 目前返回模拟数据
    return {
      country: 'China','
      region: 'Beijing','
      city: 'Beijing';
    };
  }

  private parseDeviceInfo(userAgent: string): any {
    // 简化的用户代理解析
    return {
      deviceId: 'unknown','
      platform: 'web','
      browser: 'unknown','
      os: 'unknown';
    };
  }

  private calculateRiskTrends(logs: AuditLogEntry[]): Array<{ date: string; averageRisk: number; eventCount: number }> {
    const dailyData = logs.reduce((acc, log) => {
      const date = log.timestamp.split('T')[0];'
      if (!acc[date]) {
        acc[date] = { totalRisk: 0, count: 0 };
      }
      acc[date].totalRisk += log.riskScore || 0;
      acc[date].count += 1;
      return acc;
    }, {} as Record<string, { totalRisk: number; count: number }>);

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        averageRisk: data.count > 0 ? data.totalRisk / data.count : 0,
        eventCount: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async cacheLogEntry(entry: AuditLogEntry): Promise<void> {
    await defaultMemoryCache.set(`audit_log_${entry.id}`, entry, undefined, 24 * 60 * 60 * 1000);`
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000); // 每天清理一次
  }

  private cleanupOldLogs(): void {
    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    this.logs = this.logs.filter(log =>
      new Date(log.timestamp).getTime() > cutoffTime
    );
  }
}

// ==================== React Hook集成 ====================

export function useAuditLog() {
  const [auditService] = useState(() => new AuditLogService());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logEvent = useCallback(async (
    eventType: AuditEventType,
    details: Record<string, any>,
    options: any
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await auditService.logEvent(eventType, details, options);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "记录审计日志失败';'`
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [auditService]);

  const queryLogs = useCallback(async (query: AuditQuery = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await auditService.queryLogs(query);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '查询审计日志失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [auditService]);

  const getStatistics = useCallback(async (query: AuditQuery = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await auditService.getStatistics(query);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取审计统计失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [auditService]);

  return {
    auditService,
    isLoading,
    error,
    logEvent,
    queryLogs,
    getStatistics,
    clearError: () => setError(null)
  };
}

// ==================== 默认实例 ====================

export const defaultAuditLogService = new AuditLogService();

export default defaultAuditLogService;
