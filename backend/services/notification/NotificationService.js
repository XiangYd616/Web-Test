const db = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * 站内通知服务
 * 管理用户站内通知
 */
class NotificationService {
  constructor() {
    this.initialized = false;
  }

  /**
   * 初始化服务
   */
  async initialize() {
    try {
      // 检查数据库连接
      await db.query('SELECT 1');
      this.initialized = true;
      logger.info('NotificationService initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize NotificationService:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * 创建通知
   * @param {Object} notification - 通知对象
   * @returns {Promise<Object>} 创建的通知
   */
  async createNotification(notification) {
    try {
      const {
        userId,
        type,
        title,
        message,
        data,
        priority,
        actionUrl
      } = notification;

      const result = await db.query(
        `INSERT INTO notifications (
          user_id, type, title, message, data, priority, action_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          userId,
          type || 'info',
          title,
          message,
          JSON.stringify(data || {}),
          priority || 'normal',
          actionUrl
        ]
      );

      logger.info('Notification created:', { id: result.rows[0].id, userId, type });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * 批量创建通知
   * @param {Array<Object>} notifications - 通知数组
   * @returns {Promise<Array>} 创建的通知列表
   */
  async createBulkNotifications(notifications) {
    const results = [];
    
    for (const notification of notifications) {
      try {
        const result = await this.createNotification(notification);
        results.push(result);
      } catch (error) {
        logger.error('Error in bulk notification creation:', error);
        results.push({ error: error.message, notification });
      }
    }
    
    return results;
  }

  /**
   * 获取用户通知列表
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 通知列表和分页信息
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        isRead,
        type,
        priority,
        page = 1,
        limit = 20
      } = options;

      const offset = (page - 1) * limit;

      let query = 'SELECT * FROM notifications WHERE user_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (isRead !== undefined) {
        query += ` AND is_read = $${paramIndex}`;
        params.push(isRead);
        paramIndex++;
      }

      if (type) {
        query += ` AND type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      if (priority) {
        query += ` AND priority = $${paramIndex}`;
        params.push(priority);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      // 获取未读数量
      const unreadResult = await db.query(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
        [userId]
      );

      // 获取总数
      const totalResult = await db.query(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
        [userId]
      );

      return {
        notifications: result.rows,
        unreadCount: parseInt(unreadResult.rows[0].count),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(totalResult.rows[0].count)
        }
      };
    } catch (error) {
      logger.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * 获取单个通知
   * @param {string} notificationId - 通知ID
   * @param {string} userId - 用户ID
   * @returns {Promise<Object|null>} 通知对象
   */
  async getNotification(notificationId, userId) {
    try {
      const result = await db.query(
        'SELECT * FROM notifications WHERE id = $1 AND user_id = $2',
        [notificationId, userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching notification:', error);
      throw error;
    }
  }

  /**
   * 标记通知为已读
   * @param {string} notificationId - 通知ID
   * @param {string} userId - 用户ID
   * @returns {Promise<boolean>} 是否成功
   */
  async markAsRead(notificationId, userId) {
    try {
      const result = await db.query(
        `UPDATE notifications 
         SET is_read = true, read_at = NOW()
         WHERE id = $1 AND user_id = $2 AND is_read = false
         RETURNING *`,
        [notificationId, userId]
      );

      if (result.rows.length > 0) {
        logger.info('Notification marked as read:', { id: notificationId, userId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * 批量标记为已读
   * @param {Array<string>} notificationIds - 通知ID数组
   * @param {string} userId - 用户ID
   * @returns {Promise<number>} 更新数量
   */
  async markMultipleAsRead(notificationIds, userId) {
    try {
      const result = await db.query(
        `UPDATE notifications 
         SET is_read = true, read_at = NOW()
         WHERE id = ANY($1) AND user_id = $2 AND is_read = false
         RETURNING *`,
        [notificationIds, userId]
      );

      logger.info(`${result.rows.length} notifications marked as read for user ${userId}`);
      return result.rows.length;
    } catch (error) {
      logger.error('Error marking multiple notifications as read:', error);
      throw error;
    }
  }

  /**
   * 标记所有通知为已读
   * @param {string} userId - 用户ID
   * @returns {Promise<number>} 更新数量
   */
  async markAllAsRead(userId) {
    try {
      const result = await db.query(
        `UPDATE notifications 
         SET is_read = true, read_at = NOW()
         WHERE user_id = $1 AND is_read = false
         RETURNING *`,
        [userId]
      );

      logger.info(`All notifications marked as read for user ${userId}`);
      return result.rows.length;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * 删除通知
   * @param {string} notificationId - 通知ID
   * @param {string} userId - 用户ID
   * @returns {Promise<boolean>} 是否成功
   */
  async deleteNotification(notificationId, userId) {
    try {
      const result = await db.query(
        'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
        [notificationId, userId]
      );

      if (result.rows.length > 0) {
        logger.info('Notification deleted:', { id: notificationId, userId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * 批量删除通知
   * @param {Array<string>} notificationIds - 通知ID数组
   * @param {string} userId - 用户ID
   * @returns {Promise<number>} 删除数量
   */
  async deleteMultiple(notificationIds, userId) {
    try {
      const result = await db.query(
        'DELETE FROM notifications WHERE id = ANY($1) AND user_id = $2 RETURNING *',
        [notificationIds, userId]
      );

      logger.info(`${result.rows.length} notifications deleted for user ${userId}`);
      return result.rows.length;
    } catch (error) {
      logger.error('Error deleting multiple notifications:', error);
      throw error;
    }
  }

  /**
   * 清理已读通知
   * @param {string} userId - 用户ID
   * @param {number} daysOld - 清理多少天前的已读通知
   * @returns {Promise<number>} 删除数量
   */
  async cleanupReadNotifications(userId, daysOld = 30) {
    try {
      const result = await db.query(
        `DELETE FROM notifications 
         WHERE user_id = $1 
           AND is_read = true 
           AND read_at < NOW() - INTERVAL '${daysOld} days'
         RETURNING *`,
        [userId]
      );

      logger.info(`Cleaned up ${result.rows.length} old notifications for user ${userId}`);
      return result.rows.length;
    } catch (error) {
      logger.error('Error cleaning up notifications:', error);
      throw error;
    }
  }

  /**
   * 获取未读通知数量
   * @param {string} userId - 用户ID
   * @returns {Promise<number>} 未读数量
   */
  async getUnreadCount(userId) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
        [userId]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * 获取通知统计
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 统计信息
   */
  async getNotificationStats(userId) {
    try {
      const statsResult = await db.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
          COUNT(CASE WHEN is_read = true THEN 1 END) as read,
          COUNT(CASE WHEN type = 'alert' THEN 1 END) as alerts,
          COUNT(CASE WHEN type = 'info' THEN 1 END) as info,
          COUNT(CASE WHEN type = 'warning' THEN 1 END) as warnings,
          COUNT(CASE WHEN type = 'success' THEN 1 END) as success,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
          COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_priority
         FROM notifications
         WHERE user_id = $1`,
        [userId]
      );

      // 获取最近7天的趋势
      const trendResult = await db.query(
        `SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count
         FROM notifications
         WHERE user_id = $1 
           AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(created_at)
         ORDER BY date DESC`,
        [userId]
      );

      return {
        summary: statsResult.rows[0],
        trend: trendResult.rows
      };
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      throw error;
    }
  }

  /**
   * 创建告警通知
   * @param {string} userId - 用户ID
   * @param {Object} alert - 告警信息
   * @returns {Promise<Object>} 创建的通知
   */
  async createAlertNotification(userId, alert) {
    const severityEmoji = {
      low: '⚠️',
      medium: '⚠️',
      high: '🔴',
      critical: '🚨'
    };

    const priorityMap = {
      low: 'normal',
      medium: 'normal',
      high: 'high',
      critical: 'urgent'
    };

    return this.createNotification({
      userId,
      type: 'alert',
      title: `${severityEmoji[alert.severity]} ${alert.ruleName}`,
      message: alert.message || `Alert triggered: ${alert.metricName} ${alert.condition}`,
      data: {
        alertId: alert.id,
        ruleId: alert.ruleId,
        severity: alert.severity,
        metricName: alert.metricName,
        currentValue: alert.currentValue,
        threshold: alert.threshold
      },
      priority: priorityMap[alert.severity] || 'normal',
      actionUrl: `/alerts/${alert.id}`
    });
  }

  /**
   * 创建测试完成通知
   * @param {string} userId - 用户ID
   * @param {Object} test - 测试信息
   * @returns {Promise<Object>} 创建的通知
   */
  async createTestCompleteNotification(userId, test) {
    const statusEmoji = {
      passed: '✅',
      failed: '❌',
      warning: '⚠️'
    };

    return this.createNotification({
      userId,
      type: test.status === 'passed' ? 'success' : 'warning',
      title: `${statusEmoji[test.status]} Test Complete: ${test.name}`,
      message: `Test ${test.status} with ${test.successRate}% success rate`,
      data: {
        testId: test.id,
        testType: test.type,
        status: test.status,
        duration: test.duration,
        successRate: test.successRate
      },
      priority: test.status === 'failed' ? 'high' : 'normal',
      actionUrl: `/tests/${test.id}/results`
    });
  }

  /**
   * 获取用户通知偏好
   * @param {string} userId - 用户ID
   * @returns {Promise<Object|null>} 通知偏好
   */
  async getUserPreferences(userId) {
    try {
      const result = await db.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  /**
   * 更新用户通知偏好
   * @param {string} userId - 用户ID
   * @param {Object} preferences - 偏好设置
   * @returns {Promise<Object>} 更新后的偏好
   */
  async updateUserPreferences(userId, preferences) {
    try {
      const {
        emailEnabled,
        pushEnabled,
        alertTypes,
        quietHoursStart,
        quietHoursEnd
      } = preferences;

      const result = await db.query(
        `INSERT INTO notification_preferences (
          user_id, email_enabled, push_enabled, alert_types, 
          quiet_hours_start, quiet_hours_end
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) 
        DO UPDATE SET
          email_enabled = EXCLUDED.email_enabled,
          push_enabled = EXCLUDED.push_enabled,
          alert_types = EXCLUDED.alert_types,
          quiet_hours_start = EXCLUDED.quiet_hours_start,
          quiet_hours_end = EXCLUDED.quiet_hours_end,
          updated_at = NOW()
        RETURNING *`,
        [
          userId,
          emailEnabled !== undefined ? emailEnabled : true,
          pushEnabled !== undefined ? pushEnabled : true,
          JSON.stringify(alertTypes || ['all']),
          quietHoursStart,
          quietHoursEnd
        ]
      );

      logger.info('User notification preferences updated:', { userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * 检查是否在静音时段
   * @param {Object} preferences - 用户偏好
   * @returns {boolean} 是否在静音时段
   */
  isInQuietHours(preferences) {
    if (!preferences || !preferences.quiet_hours_start || !preferences.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const startHour = parseInt(preferences.quiet_hours_start.split(':')[0]);
    const endHour = parseInt(preferences.quiet_hours_end.split(':')[0]);

    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      // 跨午夜的情况
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  /**
   * 关闭服务
   */
  async close() {
    this.initialized = false;
    logger.info('NotificationService closed');
  }

  /**
   * 获取服务状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      initialized: this.initialized
    };
  }
}

// 导出单例
let instance = null;

module.exports = {
  NotificationService,
  getInstance: () => {
    if (!instance) {
      instance = new NotificationService();
    }
    return instance;
  },
  resetInstance: () => {
    if (instance) {
      instance.close();
      instance = null;
    }
  }
};

