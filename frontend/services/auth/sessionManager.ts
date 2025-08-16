/**
 * 会话管理系统
 * 提供并发登录控制、会话监控、安全管理
 * 版本: v1.0.0
 */

import type { User, UserSession  } from '../../types/user';// ==================== 类型定义 ==================== ''
export interface SessionConfig     {
  maxConcurrentSessions: number;
  sessionTimeout: number; // 会话超时时间（毫秒）
  inactivityTimeout: number; // 非活跃超时时间（毫秒）
  enableLocationTracking: boolean;
  enableDeviceTracking: boolean;
  enableSecurityAlerts: boolean;
  heartbeatInterval: number; // 心跳间隔（毫秒）
}

export interface SessionData extends UserSession     {
  // 基础会话信息
  id: string;
  userId: string;
  isActive: boolean;
  lastActivityAt: string;
  expiresAt: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  refreshToken?: string; // 刷新令牌

  // 扩展信息
  deviceInfo: DeviceInfo;
  locationInfo?: LocationInfo;
  securityFlags: SecurityFlags;
  activityLog: ActivityRecord[];
}

export interface DeviceInfo     {
  deviceId: string;
  userAgent: string;
  platform: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  screenResolution: string;
  timezone: string;
  language: string;
  fingerprint?: string;
}

export interface LocationInfo     {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  ipAddress: string;
  isp?: string;
  isVpn?: boolean;
  isTor?: boolean;
}

export interface SecurityFlags     {
  isSuspicious: boolean;
  isNewDevice: boolean;
  isNewLocation: boolean;
  hasSecurityWarnings: boolean;
  riskScore: number; // 0-100
  lastSecurityCheck: string;
}

export interface ActivityRecord     {
  timestamp: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

export interface SessionAlert     {
  id: string;
  sessionId: string;
  userId: string;
  type: 'new_device' | 'new_location' | 'suspicious_activity' | 'concurrent_limit' | 'security_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: string;
  acknowledged: boolean;
}

export interface ConcurrentSessionPolicy     {
  maxSessions: number;
  strategy: 'reject_new' | 'terminate_oldest' | 'terminate_all_others' | 'allow_with_warning';
  notifyUser: boolean;
  requireConfirmation: boolean;
}

// ==================== 设备信息检测器 ====================

class DeviceDetector {
  // 监控和指标收集
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errorsByType: new Map<string, number>()
  };
  
  private logSuccess(info: any): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    
    // 更新平均响应时间
    const responseTime = info.responseTime || 0;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) / 
      this.metrics.successfulRequests;
  }
  
  private logError(error: Error, context: any): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    
    const errorType = error.name || 'UnknownError';
    this.metrics.errorsByType.set(
      errorType, 
      (this.metrics.errorsByType.get(errorType) || 0) + 1
    );
    
    // 发送错误到监控系统
    this.sendErrorToMonitoring(error, context);
  }
  
  private logMetrics(info: any): void {
    // 记录请求指标
    console.debug('API Metrics: ', {'
      url: info.url,
      method: info.method,
      status: info.status,
      responseTime: info.responseTime
    });
  }
  
  getMetrics(): any {
    return {
      ...this.metrics,
      errorsByType: Object.fromEntries(this.metrics.errorsByType),
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0
    };
  }
  private async retryRequest(fn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`请求失败，第${attempt}次重试:`, error.message);`
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
  }
  /**
   * 获取设备信息
   */
  static getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    return {
      deviceId: this.getDeviceId(),
      userAgent,
      platform,
      browser: this.getBrowserInfo().name,
      browserVersion: this.getBrowserInfo().version,
      os: this.getOSInfo().name,
      osVersion: this.getOSInfo().version,
      screenResolution: `${screen.width}x${screen.height}`,`
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    };
  }

  /**
   * 获取设备ID
   */
  private static getDeviceId(): string {
    let deviceId = localStorage.getItem("device_id');'`
    if (!deviceId) {
      deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);'
      localStorage.setItem('device_id', deviceId);'
    }
    return deviceId;
  }

  /**
   * 获取浏览器信息
   */
  private static getBrowserInfo(): { name: string; version: string } {
    const userAgent = navigator.userAgent;

    if (userAgent.includes('Chrome')) {'
      const match = userAgent.match(/Chrome\/(\d+)/);
      return { name: 'Chrome', version: match ? match[1] : 'Unknown' };'
    } else if (userAgent.includes('Firefox')) {'
      const match = userAgent.match(/Firefox\/(\d+)/);
      return { name: 'Firefox', version: match ? match[1] : 'Unknown' };'
    } else if (userAgent.includes('Safari')) {'
      const match = userAgent.match(/Safari\/(\d+)/);
      return { name: 'Safari', version: match ? match[1] : 'Unknown' };'
    } else if (userAgent.includes('Edge')) {'
      const match = userAgent.match(/Edge\/(\d+)/);
      return { name: 'Edge', version: match ? match[1] : 'Unknown' };'
    }

    return { name: 'Unknown', version: 'Unknown' };'
  }

  /**
   * 获取操作系统信息
   */
  private static getOSInfo(): { name: string; version: string } {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    if (platform.includes('Win')) {'
      return { name: 'Windows', version: this.getWindowsVersion(userAgent) };'
    } else if (platform.includes('Mac')) {'
      return { name: 'macOS', version: this.getMacVersion(userAgent) };'
    } else if (platform.includes('Linux')) {'
      return { name: 'Linux', version: 'Unknown' };'
    } else if (userAgent.includes('Android')) {'
      const match = userAgent.match(/Android (\d+\.?\d*)/);
      return { name: 'Android', version: match ? match[1] : 'Unknown' };'
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {'
      const match = userAgent.match(/OS (\d+_?\d*)/);
      return { name: 'iOS', version: match ? match[1].replace('_', '.') : 'Unknown' };'
    }

    return { name: 'Unknown', version: 'Unknown' };'
  }

  private static getWindowsVersion(userAgent: string): string {
    if (userAgent.includes('Windows NT 10.0')) return '10';
    if (userAgent.includes('Windows NT 6.3')) return '8.1';
    if (userAgent.includes('Windows NT 6.2')) return '8';
    if (userAgent.includes('Windows NT 6.1')) return '7';
    return 'Unknown';
  }

  private static getMacVersion(userAgent: string): string {
    const match = userAgent.match(/Mac OS X (\d+_?\d+_?\d*)/);
    return match ? match[1].replace(/_/g, '.') : 'Unknown';
  }
}

// ==================== 位置信息检测器 ====================

class LocationDetector {
  /**
   * 获取位置信息
   */
  static async getLocationInfo(ipAddress: string): Promise<LocationInfo> {
    const locationInfo: LocationInfo  = { ipAddress };
    try {
      // 尝试从IP地址获取地理位置信息
      const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);`
      if (response.ok) {
        const data = await response.json();
        locationInfo.country = data.country_name;
        locationInfo.region = data.region;
        locationInfo.city = data.city;
        locationInfo.latitude = data.latitude;
        locationInfo.longitude = data.longitude;
        locationInfo.isp = data.org;
      }
    } catch (error) {
      console.warn("获取位置信息失败:', error);'`
    }

    // 检测VPN/Tor（简化实现）
    locationInfo.isVpn = await this.detectVPN(ipAddress);
    locationInfo.isTor = await this.detectTor(ipAddress);

    return locationInfo;
  }

  /**
   * 检测VPN
   */
  private static async detectVPN(ipAddress: string): Promise<boolean> {
    // 这里应该集成专业的VPN检测服务
    // 目前返回false作为示例
    return false;
  }

  /**
   * 检测Tor
   */
  private static async detectTor(ipAddress: string): Promise<boolean> {
    // 这里应该检查Tor出口节点列表
    // 目前返回false作为示例
    return false;
  }
}

// ==================== 安全分析器 ====================

class SecurityAnalyzer {
  /**
   * 分析会话安全性
   */
  static analyzeSession(
    sessionData: SessionData,
    userSessions: SessionData[],
    userHistory: ActivityRecord[]
  ): SecurityFlags {
    let riskScore = 0;
    let isSuspicious = false;
    let isNewDevice = false;
    let isNewLocation = false;
    let hasSecurityWarnings = false;

    // 检查新设备
    const knownDevices = userSessions.map(s => s.deviceInfo.deviceId);
    if (!knownDevices.includes(sessionData.deviceInfo.deviceId)) {
      isNewDevice = true;
      riskScore += 20;
    }

    // 检查新位置
    if (sessionData.locationInfo) {
      const knownLocations = userSessions
        .filter(s => s.locationInfo)
        .map(s => `${s.locationInfo!.country}-${s.locationInfo!.region}`);`

      const currentLocation = `${sessionData.locationInfo.country}-${sessionData.locationInfo.region}`;`
      if (!knownLocations.includes(currentLocation)) {
        isNewLocation = true;
        riskScore += 15;
      }

      // VPN/Tor检测
      if (sessionData.locationInfo.isVpn) {
        riskScore += 10;
        hasSecurityWarnings = true;
      }
      if (sessionData.locationInfo.isTor) {
        riskScore += 25;
        hasSecurityWarnings = true;
      }
    }

    // 检查异常活动模式
    const recentActivity = userHistory.filter(
      record => Date.now() - new Date(record.timestamp).getTime() < 24 * 60 * 60 * 1000
    );

    if (recentActivity.length > 100) {
      riskScore += 15;
      isSuspicious = true;
    }

    // 检查时间模式
    const currentHour = new Date().getHours();
    const typicalHours = userHistory
      .map(record => new Date(record.timestamp).getHours())
      .filter((hour, index, arr) => arr.indexOf(hour) === index);

    if (typicalHours.length > 0 && !typicalHours.includes(currentHour)) {
      riskScore += 5;
    }

    // 综合评估
    if (riskScore > 50) {
      isSuspicious = true;
    }

    return {
      isSuspicious,
      isNewDevice,
      isNewLocation,
      hasSecurityWarnings,
      riskScore: Math.min(100, riskScore),
      lastSecurityCheck: new Date().toISOString()
    };
  }
}

// ==================== 会话管理器 ====================

export class SessionManager {
  private config: SessionConfig;
  private activeSessions = new Map<string, SessionData>();
  private sessionAlerts: SessionAlert[] = [];
  private heartbeatTimers = new Map<string, NodeJS.Timeout>();

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      maxConcurrentSessions: 5,
      sessionTimeout: 24 * 60 * 60 * 1000, // 24小时
      inactivityTimeout: 30 * 60 * 1000, // 30分钟
      enableLocationTracking: true,
      enableDeviceTracking: true,
      enableSecurityAlerts: true,
      heartbeatInterval: 60 * 1000, // 1分钟
      ...config
    };

    this.startCleanupTimer();
  }

  // ==================== 会话创建和管理 ====================

  /**
   * 创建新会话
   */
  async createSession(
    user: User,
    ipAddress: string,
    policy: ConcurrentSessionPolicy = {
      maxSessions: this.config.maxConcurrentSessions,
      strategy: "terminate_oldest','`
      notifyUser: true,
      requireConfirmation: false
    }
  ): Promise<{ sessionId: string; warnings?: string[] }> {
    const sessionId = this.generateSessionId();
    const deviceInfo = DeviceDetector.getDeviceInfo();
    const warnings: string[]  = [];
    // 获取位置信息
    let locationInfo: LocationInfo | undefined;
    if (this.config.enableLocationTracking) {
      locationInfo = await LocationDetector.getLocationInfo(ipAddress);
    }

    // 检查并发会话限制
    const userSessions = this.getUserSessions(user.id);
    if (userSessions.length >= policy.maxSessions) {
      await this.handleConcurrentSessionLimit(user.id, policy, warnings);
    }

    // 创建会话数据
    const sessionData: SessionData  = {
      id: sessionId,
      userId: user.id,
      token: '', // 将由JWT管理器设置'
      refreshToken: '','
      expiresAt: new Date(Date.now() + this.config.sessionTimeout).toISOString(),
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      ipAddress,
      userAgent: navigator.userAgent,
      isActive: true,
      deviceInfo,
      locationInfo,
      securityFlags: {
        isSuspicious: false,
        isNewDevice: false,
        isNewLocation: false,
        hasSecurityWarnings: false,
        riskScore: 0,
        lastSecurityCheck: new Date().toISOString()
      },
      activityLog: []
    };
    // 安全分析
    if (this.config.enableSecurityAlerts) {
      sessionData.securityFlags = SecurityAnalyzer.analyzeSession(
        sessionData,
        userSessions,
        this.getUserActivityHistory(user.id)
      );

      // 生成安全警报
      await this.generateSecurityAlerts(sessionData);
    }

    // 存储会话
    this.activeSessions.set(sessionId, sessionData);
    await this.persistSession(sessionData);

    // 启动心跳
    this.startHeartbeat(sessionId);

    // 记录活动
    this.recordActivity(sessionId, 'session_created', 'auth', {'
      deviceInfo: deviceInfo,
      locationInfo: locationInfo
    });

    return { sessionId, warnings: warnings.length > 0 ? warnings : undefined };
  }

  /**
   * 更新会话活动
   */
  async updateSessionActivity(
    sessionId: string,
    action: string,
    resource: string,
    details?: Record<string, any>
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.lastActivityAt = new Date().toISOString();
    this.recordActivity(sessionId, action, resource, details);

    // 更新持久化存储
    await this.persistSession(session);
  }

  /**
   * 终止会话
   */
  async terminateSession(sessionId: string, reason: string = 'user_logout'): Promise<void> {'
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // 停止心跳
    const heartbeatTimer = this.heartbeatTimers.get(sessionId);
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      this.heartbeatTimers.delete(sessionId);
    }

    // 记录活动
    this.recordActivity(sessionId, 'session_terminated', "auth', { reason });'
    // 标记为非活跃
    session.isActive = false;
    await this.persistSession(session);

    // 从内存中移除
    this.activeSessions.delete(sessionId);

    // 清理缓存
    await defaultMemoryCache.delete(`session_${sessionId}`);`
  }

  /**
   * 获取用户的所有会话
   */
  getUserSessions(userId: string): SessionData[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId && session.isActive);
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): SessionData | null {
    return this.activeSessions.get(sessionId) || null;
  }

  // ==================== 安全功能 ====================

  /**
   * 生成安全警报
   */
  private async generateSecurityAlerts(sessionData: SessionData): Promise<void> {
    const alerts: SessionAlert[]  = [];
    if (sessionData.securityFlags.isNewDevice) {
      alerts.push({
        id: this.generateAlertId(),
        sessionId: sessionData.id,
        userId: sessionData.userId,
        type: "new_device','`
        severity: 'medium','
        message: '检测到新设备登录','
        details: { deviceInfo: sessionData.deviceInfo },
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }

    if (sessionData.securityFlags.isNewLocation) {
      alerts.push({
        id: this.generateAlertId(),
        sessionId: sessionData.id,
        userId: sessionData.userId,
        type: 'new_location','
        severity: 'medium','
        message: '检测到新位置登录','
        details: { locationInfo: sessionData.locationInfo },
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }

    if (sessionData.securityFlags.riskScore > 70) {
      alerts.push({
        id: this.generateAlertId(),
        sessionId: sessionData.id,
        userId: sessionData.userId,
        type: 'suspicious_activity','
        severity: 'high','
        message: '检测到可疑活动','
        details: { riskScore: sessionData.securityFlags.riskScore },
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    }

    this.sessionAlerts.push(...alerts);

    // 发送通知（如果启用）
    if (this.config.enableSecurityAlerts && alerts.length > 0) {
      await this.sendSecurityNotifications(alerts);
    }
  }

  /**
   * 处理并发会话限制
   */
  private async handleConcurrentSessionLimit(
    userId: string,
    policy: ConcurrentSessionPolicy,
    warnings: string[]
  ): Promise<void> {
    const userSessions = this.getUserSessions(userId);

    switch (policy.strategy) {
      case 'reject_new': ''
        throw new Error('已达到最大并发会话数限制');'
      case 'terminate_oldest': ''
        const oldestSession = userSessions
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
        if (oldestSession) {
          await this.terminateSession(oldestSession.id, 'concurrent_limit');'
          warnings.push('已终止最旧的会话');'
        }
        break;

      case 'terminate_all_others': ''
        for (const session of userSessions) {
          await this.terminateSession(session.id, 'concurrent_limit');'
        }
        warnings.push('已终止所有其他会话');'
        break;

      case 'allow_with_warning': ''
        warnings.push('已超过建议的并发会话数');'
        break;
    }
  }

  // ==================== 私有方法 ====================

  private generateSessionId(): string {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);'
  }

  private generateAlertId(): string {
    return 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);'
  }

  private recordActivity(
    sessionId: string,
    action: string,
    resource: string,
    details?: Record<string, any>
  ): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const activity: ActivityRecord  = {
      timestamp: new Date().toISOString(),
      action,
      resource,
      details,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent
    };
    session.activityLog.push(activity);

    // 限制活动日志大小
    if (session.activityLog.length > 1000) {
      session.activityLog = session.activityLog.slice(-500);
    }
  }

  private getUserActivityHistory(userId: string): ActivityRecord[] {
    const userSessions = this.getUserSessions(userId);
    const allActivities: ActivityRecord[]  = [];
    userSessions.forEach(session => {
      allActivities.push(...session.activityLog);
    });

    return allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private async persistSession(session: SessionData): Promise<void> {
    // 缓存会话数据
    await defaultMemoryCache.set(`session_${session.id}`, session, undefined, this.config.sessionTimeout);`
  }

  private startHeartbeat(sessionId: string): void {
    const timer = setInterval(async () => {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        
        clearInterval(timer);
        this.heartbeatTimers.delete(sessionId);
        return;
      }

      // 检查非活跃超时
      const lastActivity = new Date(session.lastActivityAt).getTime();
      const now = Date.now();

      if (now - lastActivity > this.config.inactivityTimeout) {
        
        await this.terminateSession(sessionId, "inactivity_timeout');'`
        return;
      }

      // 更新心跳
      session.lastActivityAt = new Date().toISOString();
      await this.persistSession(session);
    }, this.config.heartbeatInterval);

    this.heartbeatTimers.set(sessionId, timer);
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    const expiredSessions: string[]  = [];
    for (const [sessionId, session] of this.activeSessions.entries()) {
      const expiryTime = new Date(session.expiresAt).getTime();
      if (now > expiryTime) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      await this.terminateSession(sessionId, 'session_expired');'
    }
  }

  private async sendSecurityNotifications(alerts: SessionAlert[]): Promise<void> {
    // 这里应该实现实际的通知发送逻辑
    // 例如：邮件、短信、推送通知等
    console.log('安全警报:', alerts);'
  }
}

// ==================== 默认实例 ====================

export const defaultSessionManager = new SessionManager();

export default defaultSessionManager;
