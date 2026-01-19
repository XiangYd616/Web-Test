/**
 * 安全事件日志记录工具
 * 用于记录和监控安全相关事件
 */

import * as path from 'path';
import * as winston from 'winston';

// 安全事件类型枚举
export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  OAUTH_LOGIN = 'oauth_login',
  OAUTH_LOGIN_FAILED = 'oauth_login_failed',
  TOKEN_REFRESH = 'token_refresh',
  TOKEN_REVOKED = 'token_revoked',
  PERMISSION_DENIED = 'permission_denied',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_BREACH = 'data_breach',
  API_ABUSE = 'api_abuse',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_TOKEN = 'invalid_token',
  SESSION_EXPIRED = 'session_expired',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  CSRF_ATTEMPT = 'csrf_attempt',
}

// 安全事件严重级别
export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// 安全事件接口
export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  severity?: SecuritySeverity;
  category?: string;
}

// 安全统计接口
export interface SecurityStatistics {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecuritySeverity, number>;
  eventsByHour: Record<string, number>;
  failedLogins: number;
  suspiciousActivities: number;
  criticalEvents: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

// 安全警报接口
export interface SecurityAlert {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  message: string;
  timestamp: Date;
  count: number;
  threshold: number;
  metadata: Record<string, any>;
}

// 创建安全事件专用的日志记录器
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // 安全事件日志文件
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/security.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true,
    }),
    // 严重安全事件单独记录
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/security-critical.log'),
      level: 'warn',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 20,
      tailable: true,
    }),
    // 开发环境输出到控制台
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/security-exceptions.log'),
    }),
  ],
  // 拒绝处理
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/security-rejections.log'),
    }),
  ],
});

// 安全事件阈值配置
const SECURITY_THRESHOLDS = {
  [SecurityEventType.LOGIN_FAILED]: { threshold: 5, window: 300000 }, // 5次失败，5分钟窗口
  [SecurityEventType.SUSPICIOUS_ACTIVITY]: { threshold: 3, window: 600000 }, // 3次可疑活动，10分钟窗口
  [SecurityEventType.RATE_LIMIT_EXCEEDED]: { threshold: 10, window: 300000 }, // 10次限流，5分钟窗口
  [SecurityEventType.BRUTE_FORCE_ATTEMPT]: { threshold: 1, window: 60000 }, // 1次暴力尝试，1分钟窗口
  [SecurityEventType.SQL_INJECTION_ATTEMPT]: { threshold: 1, window: 60000 }, // 1次SQL注入尝试，1分钟窗口
  [SecurityEventType.XSS_ATTEMPT]: { threshold: 1, window: 60000 }, // 1次XSS尝试，1分钟窗口
};

// 活跃警报存储
const activeAlerts: Map<string, SecurityAlert> = new Map();

/**
 * 记录安全事件
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    // 设置默认严重级别
    if (!event.severity) {
      event.severity = getDefaultSeverity(event.type);
    }

    // 设置默认分类
    if (!event.category) {
      event.category = getCategory(event.type);
    }

    // 记录到日志
    const logLevel = event.success ? 'info' : 'warn';
    securityLogger.log(logLevel, 'Security Event', {
      ...event,
      timestamp: event.timestamp.toISOString(),
    });

    // 检查是否需要触发警报
    await checkAndTriggerAlert(event);
  } catch (error: any) {
    console.error('Failed to log security event:', error);
    // 尝试记录到错误日志
    securityLogger.error('Security logging error', {
      error: error.message,
      stack: error.stack,
      originalEvent: event,
    });
  }
}

/**
 * 获取默认严重级别
 */
function getDefaultSeverity(eventType: SecurityEventType): SecuritySeverity {
  switch (eventType) {
    case SecurityEventType.LOGIN_SUCCESS:
    case SecurityEventType.LOGOUT:
    case SecurityEventType.PASSWORD_CHANGE:
    case SecurityEventType.PASSWORD_RESET:
    case SecurityEventType.ACCOUNT_UNLOCKED:
    case SecurityEventType.OAUTH_LOGIN:
    case SecurityEventType.TOKEN_REFRESH:
      return SecuritySeverity.LOW;

    case SecurityEventType.LOGIN_FAILED:
    case SecurityEventType.ACCOUNT_LOCKED:
    case SecurityEventType.OAUTH_LOGIN_FAILED:
    case SecurityEventType.TOKEN_REVOKED:
    case SecurityEventType.PERMISSION_DENIED:
    case SecurityEventType.INVALID_TOKEN:
    case SecurityEventType.SESSION_EXPIRED:
      return SecuritySeverity.MEDIUM;

    case SecurityEventType.SUSPICIOUS_ACTIVITY:
    case SecurityEventType.API_ABUSE:
    case SecurityEventType.RATE_LIMIT_EXCEEDED:
    case SecurityEventType.BRUTE_FORCE_ATTEMPT:
      return SecuritySeverity.HIGH;

    case SecurityEventType.DATA_BREACH:
    case SecurityEventType.SQL_INJECTION_ATTEMPT:
    case SecurityEventType.XSS_ATTEMPT:
    case SecurityEventType.CSRF_ATTEMPT:
      return SecuritySeverity.CRITICAL;

    default:
      return SecuritySeverity.MEDIUM;
  }
}

/**
 * 获取事件分类
 */
function getCategory(eventType: SecurityEventType): string {
  if (eventType.includes('login') || eventType.includes('logout') || eventType.includes('oauth')) {
    return 'authentication';
  }
  if (eventType.includes('password') || eventType.includes('account')) {
    return 'account';
  }
  if (eventType.includes('token') || eventType.includes('session')) {
    return 'session';
  }
  if (eventType.includes('permission') || eventType.includes('denied')) {
    return 'authorization';
  }
  if (eventType.includes('injection') || eventType.includes('xss') || eventType.includes('csrf')) {
    return 'attack';
  }
  if (
    eventType.includes('suspicious') ||
    eventType.includes('abuse') ||
    eventType.includes('brute')
  ) {
    return 'threat';
  }
  return 'general';
}

/**
 * 检查并触发警报
 */
async function checkAndTriggerAlert(event: SecurityEvent): Promise<void> {
  const threshold = SECURITY_THRESHOLDS[event.type];
  if (!threshold) {
    return;
  }

  const alertKey = `${event.type}_${event.ipAddress || 'unknown'}`;
  const now = Date.now();
  const windowStart = now - threshold.window;

  // 检查现有警报
  const existingAlert = activeAlerts.get(alertKey);
  if (existingAlert) {
    // 如果警报在时间窗口内，增加计数
    if (existingAlert.timestamp.getTime() > windowStart) {
      existingAlert.count++;
      existingAlert.timestamp = new Date();

      // 如果超过阈值，发送警报
      if (existingAlert.count >= threshold.threshold) {
        await sendAlert(existingAlert);
      }
    } else {
      // 警报过期，删除
      activeAlerts.delete(alertKey);
    }
  } else {
    // 创建新警报
    const newAlert: SecurityAlert = {
      id: generateAlertId(),
      type: event.type,
      severity: event.severity!,
      message: generateAlertMessage(event.type, event.ipAddress),
      timestamp: new Date(),
      count: 1,
      threshold: threshold.threshold,
      metadata: {
        ...event.metadata,
        ipAddress: event.ipAddress,
        userId: event.userId,
      },
    };

    activeAlerts.set(alertKey, newAlert);

    // 如果阈值是1，立即发送警报
    if (threshold.threshold === 1) {
      await sendAlert(newAlert);
    }
  }
}

/**
 * 生成警报ID
 */
function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成警报消息
 */
function generateAlertMessage(eventType: SecurityEventType, ipAddress?: string): string {
  const location = ipAddress ? ` from ${ipAddress}` : '';

  switch (eventType) {
    case SecurityEventType.LOGIN_FAILED:
      return `Multiple failed login attempts detected${location}`;
    case SecurityEventType.SUSPICIOUS_ACTIVITY:
      return `Suspicious activity detected${location}`;
    case SecurityEventType.RATE_LIMIT_EXCEEDED:
      return `Rate limit exceeded${location}`;
    case SecurityEventType.BRUTE_FORCE_ATTEMPT:
      return `Brute force attack detected${location}`;
    case SecurityEventType.SQL_INJECTION_ATTEMPT:
      return `SQL injection attempt detected${location}`;
    case SecurityEventType.XSS_ATTEMPT:
      return `XSS attempt detected${location}`;
    case SecurityEventType.CSRF_ATTEMPT:
      return `CSRF attempt detected${location}`;
    default:
      return `Security event: ${eventType}${location}`;
  }
}

/**
 * 发送警报
 */
async function sendAlert(alert: SecurityAlert): Promise<void> {
  try {
    // 记录到严重安全事件日志
    securityLogger.warn('Security Alert', {
      ...alert,
      timestamp: alert.timestamp.toISOString(),
    });

    // 在实际应用中，这里可以添加：
    // - 发送邮件通知
    // - 发送短信通知
    // - 调用Webhook
    // - 推送到监控系统
    // - 写入数据库

    console.warn(`🚨 SECURITY ALERT: ${alert.message}`, {
      id: alert.id,
      severity: alert.severity,
      count: alert.count,
      threshold: alert.threshold,
    });
  } catch (error: any) {
    console.error('Failed to send security alert:', error);
  }
}

/**
 * 获取安全统计信息
 */
export async function getSecurityStatistics(
  startTime?: Date,
  endTime?: Date
): Promise<SecurityStatistics> {
  // 这里应该从数据库或日志文件中读取统计信息
  // 为了简化，返回模拟数据
  const now = new Date();
  const start = startTime || new Date(now.getTime() - 24 * 60 * 60 * 1000); // 默认24小时
  const end = endTime || now;

  return {
    totalEvents: 0,
    eventsByType: {} as Record<SecurityEventType, number>,
    eventsBySeverity: {} as Record<SecuritySeverity, number>,
    eventsByHour: {} as Record<string, number>,
    failedLogins: 0,
    suspiciousActivities: 0,
    criticalEvents: 0,
    timeRange: {
      start,
      end,
    },
  };
}

/**
 * 获取活跃警报
 */
export function getActiveAlerts(): SecurityAlert[] {
  return Array.from(activeAlerts.values());
}

/**
 * 清理过期警报
 */
export function cleanupExpiredAlerts(): void {
  const now = Date.now();

  for (const [key, alert] of activeAlerts.entries()) {
    const threshold = SECURITY_THRESHOLDS[alert.type];
    if (threshold && alert.timestamp.getTime() < now - threshold.window) {
      activeAlerts.delete(key);
    }
  }
}

/**
 * 手动触发安全检查
 */
export async function triggerSecurityCheck(
  checkType: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventType.SUSPICIOUS_ACTIVITY,
    success: false,
    timestamp: new Date(),
    metadata: {
      checkType,
      ...metadata,
    },
    severity: SecuritySeverity.MEDIUM,
  });
}

/**
 * 记录登录成功
 */
export async function logLoginSuccess(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventType.LOGIN_SUCCESS,
    userId,
    ipAddress,
    userAgent,
    success: true,
    timestamp: new Date(),
  });
}

/**
 * 记录登录失败
 */
export async function logLoginFailure(
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  error?: string
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventType.LOGIN_FAILED,
    userId,
    ipAddress,
    userAgent,
    success: false,
    error,
    timestamp: new Date(),
  });
}

/**
 * 记录权限拒绝
 */
export async function logPermissionDenied(
  userId: string,
  resource: string,
  action: string,
  ipAddress?: string
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventType.PERMISSION_DENIED,
    userId,
    ipAddress,
    success: false,
    timestamp: new Date(),
    metadata: {
      resource,
      action,
    },
  });
}

/**
 * 记录可疑活动
 */
export async function logSuspiciousActivity(
  userId?: string,
  activity: string,
  ipAddress?: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventType.SUSPICIOUS_ACTIVITY,
    userId,
    ipAddress,
    success: false,
    timestamp: new Date(),
    metadata: {
      activity,
      ...metadata,
    },
  });
}

/**
 * 记录攻击尝试
 */
export async function logAttackAttempt(
  attackType: SecurityEventType,
  ipAddress?: string,
  userAgent?: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  await logSecurityEvent({
    type: attackType,
    ipAddress,
    userAgent,
    success: false,
    timestamp: new Date(),
    metadata,
    severity: SecuritySeverity.CRITICAL,
  });
}

// 定期清理过期警报
setInterval(cleanupExpiredAlerts, 60000); // 每分钟清理一次

export default securityLogger;
