/**
 * 安全事件日志记录工具
 * 用于记录和监控安全相关事件
 */

import * as fsSync from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import { query } from '../config/database';
const logsDir = path.join(__dirname, '../../logs');
if (!fsSync.existsSync(logsDir)) {
  fsSync.mkdirSync(logsDir, { recursive: true });
}

const SECURITY_DB_ENABLED = process.env.SECURITY_EVENT_DB_ENABLED === 'true';

// 安全事件类型枚举
export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGIN_REGION_ANOMALY = 'login_region_anomaly',
  LOGIN_BLOCKED_REGION = 'login_blocked_region',
  LOGIN_RISK_MFA_REQUIRED = 'login_risk_mfa_required',
  LOGIN_RISK_MFA_SUCCESS = 'login_risk_mfa_success',
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
  provider?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
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

export interface SecurityEventRecord {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  success: boolean;
  timestamp: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  error?: string;
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
  ipAddress?: string;
  metadata: Record<string, unknown>;
}

// 创建安全事件专用的日志记录器
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  exitOnError: false,
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
const SECURITY_THRESHOLDS: Partial<
  Record<SecurityEventType, { threshold: number; window: number }>
> = {
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

    if (SECURITY_DB_ENABLED) {
      try {
        await query(
          `
          INSERT INTO security_events (
            type, severity, category, success, user_id,
            ip_address, user_agent, metadata, error, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
          [
            event.type,
            event.severity,
            event.category,
            event.success,
            event.userId || null,
            event.ipAddress || null,
            event.userAgent || null,
            event.metadata || null,
            event.error || null,
            event.timestamp,
          ]
        );
      } catch (dbError) {
        securityLogger.error('Security event db insert failed', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
          eventType: event.type,
        });
      }
    }

    // 检查是否需要触发警报
    await checkAndTriggerAlert(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('Failed to log security event:', message);
    // 尝试记录到错误日志
    securityLogger.error('Security logging error', {
      error: message,
      stack,
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
    case SecurityEventType.LOGIN_RISK_MFA_SUCCESS:
      return SecuritySeverity.LOW;

    case SecurityEventType.LOGIN_FAILED:
    case SecurityEventType.LOGIN_RISK_MFA_REQUIRED:
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
    case SecurityEventType.LOGIN_REGION_ANOMALY:
    case SecurityEventType.LOGIN_BLOCKED_REGION:
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
  const threshold = SECURITY_THRESHOLDS[event.type as SecurityEventType];
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
      severity: event.severity ?? getDefaultSeverity(event.type),
      message: generateAlertMessage(event.type, event.ipAddress),
      timestamp: new Date(),
      count: 1,
      threshold: threshold.threshold,
      metadata: {
        ...(event.metadata || {}),
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
    securityLogger.warn('Security Alert', {
      ...alert,
      timestamp: alert.timestamp.toISOString(),
    });

    // 持久化到数据库
    try {
      await query(
        `INSERT INTO security_alerts (id, type, severity, message, count, threshold, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET count = $5, updated_at = $8`,
        [
          alert.id,
          alert.type,
          alert.severity,
          alert.message,
          alert.count,
          alert.threshold,
          JSON.stringify({ ipAddress: alert.ipAddress }),
          alert.timestamp,
        ]
      );
    } catch {
      // 表可能不存在，静默降级到日志
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to send security alert:', message);
  }
}

/**
 * 获取安全统计信息
 */
export async function getSecurityStatistics(
  startTime?: Date,
  endTime?: Date
): Promise<SecurityStatistics> {
  const logPath = path.join(__dirname, '../../logs/security.log');
  const now = new Date();
  const start = startTime || new Date(now.getTime() - 24 * 60 * 60 * 1000); // 默认24小时
  const end = endTime || now;

  const stats: SecurityStatistics = {
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

  try {
    const content = await fs.readFile(logPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    lines.forEach(line => {
      let parsed: {
        timestamp?: string;
        type?: SecurityEventType;
        severity?: SecuritySeverity;
      } | null = null;

      try {
        parsed = JSON.parse(line) as {
          timestamp?: string;
          type?: SecurityEventType;
          severity?: SecuritySeverity;
        };
      } catch {
        parsed = null;
      }

      if (!parsed?.timestamp || !parsed.type) {
        return;
      }

      const eventTime = new Date(parsed.timestamp);
      if (Number.isNaN(eventTime.getTime())) {
        return;
      }

      if (eventTime < start || eventTime > end) {
        return;
      }

      stats.totalEvents += 1;
      stats.eventsByType[parsed.type] = (stats.eventsByType[parsed.type] || 0) + 1;

      const severity = parsed.severity ?? getDefaultSeverity(parsed.type);
      stats.eventsBySeverity[severity] = (stats.eventsBySeverity[severity] || 0) + 1;

      const hourKey = eventTime.toISOString().slice(0, 13);
      stats.eventsByHour[hourKey] = (stats.eventsByHour[hourKey] || 0) + 1;

      if (parsed.type === SecurityEventType.LOGIN_FAILED) {
        stats.failedLogins += 1;
      }
      if (parsed.type === SecurityEventType.SUSPICIOUS_ACTIVITY) {
        stats.suspiciousActivities += 1;
      }
      if (severity === SecuritySeverity.CRITICAL) {
        stats.criticalEvents += 1;
      }
    });
  } catch {
    return stats;
  }

  return stats;
}

export async function getSecurityEvents(options: {
  page: number;
  limit: number;
  search?: string;
  type?: SecurityEventType;
  severity?: SecuritySeverity;
  startTime?: Date;
  endTime?: Date;
}): Promise<{ items: SecurityEventRecord[]; total: number }> {
  if (SECURITY_DB_ENABLED) {
    try {
      const conditions: string[] = [];
      const params: Array<string | number | boolean | Date | null> = [];

      if (options.type) {
        params.push(options.type);
        conditions.push(`type = $${params.length}`);
      }
      if (options.severity) {
        params.push(options.severity);
        conditions.push(`severity = $${params.length}`);
      }
      if (options.startTime) {
        params.push(options.startTime);
        conditions.push(`created_at >= $${params.length}`);
      }
      if (options.endTime) {
        params.push(options.endTime);
        conditions.push(`created_at <= $${params.length}`);
      }
      if (options.search) {
        params.push(`%${options.search}%`);
        conditions.push(
          `(CAST(metadata AS TEXT) ILIKE $${params.length} OR error ILIKE $${params.length})`
        );
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM security_events ${whereClause}`,
        params
      );
      const total = Number(countResult.rows[0]?.total) || 0;

      const limit = Math.max(options.limit, 1);
      const offset = Math.max(options.page - 1, 0) * limit;
      const listResult = await query(
        `
        SELECT id, type, severity, success, user_id, ip_address, user_agent,
               metadata, error, created_at
        FROM security_events
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
        [...params, limit, offset]
      );

      const items = (listResult.rows || []).map(row => ({
        id: String(row.id),
        type: row.type as SecurityEventType,
        severity: row.severity as SecuritySeverity,
        success: Boolean(row.success),
        timestamp: new Date(row.created_at as string).toISOString(),
        userId: row.user_id ? String(row.user_id) : undefined,
        ipAddress: row.ip_address ? String(row.ip_address) : undefined,
        userAgent: row.user_agent ? String(row.user_agent) : undefined,
        metadata: (row.metadata as Record<string, unknown>) || undefined,
        error: row.error ? String(row.error) : undefined,
      }));

      return { items, total };
    } catch (dbError) {
      securityLogger.error('Security event db query failed', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }
  }

  const logPath = path.join(__dirname, '../../logs/security.log');
  const now = new Date();
  const start = options.startTime || new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const end = options.endTime || now;
  const keyword = (options.search || '').toLowerCase();
  const items: SecurityEventRecord[] = [];

  try {
    const content = await fs.readFile(logPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    lines.forEach((line, index) => {
      let parsed: (SecurityEvent & { timestamp?: string }) | null = null;
      try {
        parsed = JSON.parse(line) as SecurityEvent & { timestamp?: string };
      } catch {
        parsed = null;
      }

      if (!parsed?.timestamp || !parsed.type) {
        return;
      }

      const eventTime = new Date(parsed.timestamp);
      if (Number.isNaN(eventTime.getTime())) {
        return;
      }
      if (eventTime < start || eventTime > end) {
        return;
      }
      if (options.type && parsed.type !== options.type) {
        return;
      }

      const severity = parsed.severity ?? getDefaultSeverity(parsed.type);
      if (options.severity && severity !== options.severity) {
        return;
      }

      if (keyword) {
        const blob = JSON.stringify(parsed).toLowerCase();
        if (!blob.includes(keyword)) {
          return;
        }
      }

      items.push({
        id: `${parsed.timestamp}-${index}`,
        type: parsed.type,
        severity,
        success: parsed.success,
        timestamp: parsed.timestamp,
        userId: parsed.userId,
        ipAddress: parsed.ipAddress,
        userAgent: parsed.userAgent,
        metadata: parsed.metadata,
        error: parsed.error,
      });
    });
  } catch {
    return { items: [], total: 0 };
  }

  const total = items.length;
  const startIndex = (options.page - 1) * options.limit;
  const pagedItems = items.slice(startIndex, startIndex + options.limit);

  return { items: pagedItems, total };
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
    const threshold = SECURITY_THRESHOLDS[alert.type as SecurityEventType];
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
  metadata: Record<string, unknown> = {}
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
  activity: string,
  userId?: string,
  ipAddress?: string,
  metadata: Record<string, unknown> = {}
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
  metadata: Record<string, unknown> = {}
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

// 定期清理过期警报（可控启停，避免顶层 setInterval 无法清理）
let _cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function startSecurityCleanup(intervalMs = 60000): void {
  if (_cleanupTimer) return;
  _cleanupTimer = setInterval(cleanupExpiredAlerts, intervalMs);
}

export function stopSecurityCleanup(): void {
  if (_cleanupTimer) {
    clearInterval(_cleanupTimer);
    _cleanupTimer = null;
  }
}

// 默认自动启动（向后兼容）
startSecurityCleanup();

export default securityLogger;
