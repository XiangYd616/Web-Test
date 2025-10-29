/**
 * 安全事件日志记录器
 * 用于记录MFA、OAuth等安全相关事件
 */

const logger = require('./logger');

/**
 * 记录安全事件
 * @param {string} userId - 用户ID
 * @param {string} eventType - 事件类型
 * @param {object} eventData - 事件数据
 */
async function logSecurityEvent(userId, eventType, eventData = {}) {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      eventType,
      ...eventData
    };

    // 记录到日志系统
    logger.info('Security Event', logEntry);

    // TODO: 如果需要,可以将安全事件存储到数据库
    // await SecurityLog.create(logEntry);

    return true;
  } catch (error) {
    logger.error('Failed to log security event:', error);
    return false;
  }
}

module.exports = {
  logSecurityEvent
};

