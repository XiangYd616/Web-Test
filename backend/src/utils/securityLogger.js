/**
 * 安全事件日志记录工具
 * 用于记录和监控安全相关事件
 */

const winston = require('winston');
const path = require('path');

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
      tailable: true
    }),
    // 严重安全事件单独记录
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/security-critical.log'),
      level: 'warn',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 20,
      tailable: true
    })
  ]
});

// 如果不是生产环境，同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
  securityLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * 安全事件类型定义
 */
const SecurityEventTypes = {
  // 登录相关
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGIN_BLOCKED: 'login_blocked',
  
  // MFA相关
  MFA_SETUP_INITIATED: 'mfa_setup_initiated',
  MFA_SETUP_COMPLETED: 'mfa_setup_completed',
  MFA_SETUP_FAILED: 'mfa_setup_failed',
  MFA_SETUP_VERIFICATION_FAILED: 'mfa_setup_verification_failed',
  MFA_ENABLED: 'mfa_enabled',
  MFA_DISABLED: 'mfa_disabled',
  MFA_VERIFICATION_SUCCESS: 'mfa_verification_success',
  MFA_VERIFICATION_FAILED: 'mfa_verification_failed',
  
  // 备用码相关
  BACKUP_CODE_USED: 'backup_code_used',
  BACKUP_CODE_VERIFICATION_FAILED: 'backup_code_verification_failed',
  BACKUP_CODES_REGENERATED: 'backup_codes_regenerated',
  
  // 设备信任
  DEVICE_TRUSTED: 'device_trusted',
  DEVICE_UNTRUSTED: 'device_untrusted',
  
  // 密码相关
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'password_reset_completed',
  PASSWORD_CHANGED: 'password_changed',
  
  // 账户安全
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  
  // 权限相关
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  PERMISSION_DENIED: 'permission_denied',
  
  // 数据访问
  SENSITIVE_DATA_ACCESS: 'sensitive_data_access',
  DATA_EXPORT: 'data_export',
  DATA_DELETION: 'data_deletion'
};

/**
 * 获取客户端信息
 */
function getClientInfo(req) {
  return {
    ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
    userAgent: req.get('User-Agent') || 'Unknown',
    referer: req.get('Referer') || null,
    origin: req.get('Origin') || null,
    acceptLanguage: req.get('Accept-Language') || null,
    xForwardedFor: req.get('X-Forwarded-For') || null,
    xRealIp: req.get('X-Real-IP') || null
  };
}

/**
 * 确定事件严重级别
 */
function getEventSeverity(eventType) {
  const criticalEvents = [
    SecurityEventTypes.ACCOUNT_LOCKED,
    SecurityEventTypes.SUSPICIOUS_ACTIVITY,
    SecurityEventTypes.UNAUTHORIZED_ACCESS,
    SecurityEventTypes.DATA_DELETION
  ];
  
  const warningEvents = [
    SecurityEventTypes.LOGIN_FAILED,
    SecurityEventTypes.MFA_VERIFICATION_FAILED,
    SecurityEventTypes.BACKUP_CODE_VERIFICATION_FAILED,
    SecurityEventTypes.MFA_SETUP_FAILED,
    SecurityEventTypes.PERMISSION_DENIED
  ];
  
  if (criticalEvents.includes(eventType)) {
    return 'critical';
  } else if (warningEvents.includes(eventType)) {
    return 'warning';
  } else {
    return 'info';
  }
}

/**
 * 记录安全事件
 * @param {string} userId - 用户ID
 * @param {string} eventType - 事件类型
 * @param {Object} details - 事件详细信息
 * @param {Object} req - Express请求对象（可选）
 */
async function logSecurityEvent(userId, eventType, details = {}, req = null) {
  try {
    const severity = getEventSeverity(eventType);
    const clientInfo = req ? getClientInfo(req) : {};
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: userId || 'anonymous',
      eventType,
      severity,
      details,
      clientInfo,
      sessionId: req ? req.sessionID : null,
      traceId: req ? req.get('X-Trace-ID') : null
    };
    
    // 根据严重级别选择日志级别
    switch (severity) {
      case 'critical':
        securityLogger.error('Critical security event', logEntry);
        break;
      case 'warning':
        securityLogger.warn('Security warning', logEntry);
        break;
      default:
        securityLogger.info('Security event', logEntry);
    }
    
    // 对于关键事件，可以添加额外的通知机制
    if (severity === 'critical') {
      await handleCriticalEvent(logEntry);
    }
    
  } catch (error) {
    // 确保日志记录失败不会影响主要业务流程
    console.error('Failed to log security event:', error);
  }
}

/**
 * 处理关键安全事件
 * @param {Object} logEntry - 日志条目
 */
async function handleCriticalEvent(logEntry) {
  try {
    // 这里可以添加：
    // 1. 发送邮件通知
    // 2. 发送Slack/钉钉通知
    // 3. 触发安全监控系统
    // 4. 记录到安全事件数据库
    
    console.warn('CRITICAL SECURITY EVENT:', {
      type: logEntry.eventType,
      user: logEntry.userId,
      timestamp: logEntry.timestamp,
      details: logEntry.details
    });
    
    // 示例：发送邮件通知（需要配置邮件服务）
    if (process.env.SECURITY_ALERT_EMAIL) {
      // await sendSecurityAlert(logEntry);
    }
    
  } catch (error) {
    console.error('Failed to handle critical event:', error);
  }
}

/**
 * 查询安全事件日志
 * @param {Object} filters - 过滤条件
 * @param {number} limit - 限制数量
 * @param {number} offset - 偏移量
 */
async function querySecurityEvents(filters = {}, limit = 100, offset = 0) {
  try {
    // 这里应该从数据库或日志文件中查询
    // 简化实现，实际应用中建议使用ELK Stack或类似的日志分析系统
    return {
      events: [],
      total: 0,
      message: 'Security event querying requires additional setup'
    };
  } catch (error) {
    throw new Error('Failed to query security events: ' + error.message);
  }
}

/**
 * 获取用户安全统计信息
 * @param {string} userId - 用户ID
 * @param {number} days - 统计天数
 */
async function getUserSecurityStats(userId, days = 30) {
  try {
    // 实际实现应该从日志或数据库中统计
    return {
      loginAttempts: 0,
      mfaVerifications: 0,
      failedAttempts: 0,
      lastActivity: null,
      suspiciousActivities: 0
    };
  } catch (error) {
    throw new Error('Failed to get security stats: ' + error.message);
  }
}

/**
 * 检测可疑活动模式
 * @param {string} userId - 用户ID
 * @param {string} eventType - 事件类型
 * @param {Object} clientInfo - 客户端信息
 */
async function detectSuspiciousActivity(userId, eventType, clientInfo) {
  try {
    // 检测规则示例：
    // 1. 短时间内多次失败登录
    // 2. 来自异常地理位置的登录
    // 3. 异常时间的活动
    // 4. 设备指纹异常
    
    const suspiciousIndicators = [];
    
    // 示例：检测多次失败的MFA验证
    if (eventType === SecurityEventTypes.MFA_VERIFICATION_FAILED) {
      // 实际应该查询最近的失败记录
      suspiciousIndicators.push('multiple_mfa_failures');
    }
    
    if (suspiciousIndicators.length > 0) {
      await logSecurityEvent(userId, SecurityEventTypes.SUSPICIOUS_ACTIVITY, {
        indicators: suspiciousIndicators,
        triggerEvent: eventType,
        clientInfo
      });
    }
    
    return suspiciousIndicators;
    
  } catch (error) {
    console.error('Failed to detect suspicious activity:', error);
    return [];
  }
}

/**
 * 创建安全会话记录
 * @param {string} userId - 用户ID
 * @param {Object} sessionInfo - 会话信息
 */
async function createSecuritySession(userId, sessionInfo) {
  try {
    const sessionRecord = {
      userId,
      sessionId: sessionInfo.sessionId,
      loginTime: new Date().toISOString(),
      clientInfo: sessionInfo.clientInfo,
      mfaVerified: sessionInfo.mfaVerified || false,
      deviceTrusted: sessionInfo.deviceTrusted || false,
      isActive: true
    };
    
    await logSecurityEvent(userId, SecurityEventTypes.LOGIN_SUCCESS, sessionRecord);
    
    return sessionRecord;
  } catch (error) {
    throw new Error('Failed to create security session: ' + error.message);
  }
}

module.exports = {
  logSecurityEvent,
  querySecurityEvents,
  getUserSecurityStats,
  detectSuspiciousActivity,
  createSecuritySession,
  SecurityEventTypes,
  securityLogger
};
