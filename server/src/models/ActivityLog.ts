import { db } from '../config/database';
import { logger } from '../utils/logger';

export interface ActivityLog {
  id: string;
  user_id?: string;
  action: string;
  resource: string;
  resource_id?: string;
  details: any;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  created_at: Date;
}

export interface CreateLogData {
  user_id?: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  success?: boolean;
  error_message?: string;
  severity?: ActivityLog['severity'];
}

export interface LogFilter {
  user_id?: string;
  action?: string;
  resource?: string;
  success?: boolean;
  severity?: string;
  start_date?: Date;
  end_date?: Date;
  search?: string;
}

export class ActivityLogModel {
  // 创建活动日志
  static async create(logData: CreateLogData): Promise<ActivityLog> {
    const {
      user_id,
      action,
      resource,
      resource_id,
      details = {},
      ip_address,
      user_agent,
      success = true,
      error_message,
      severity = 'info'
    } = logData;

    try {
      const query = `
        INSERT INTO activity_logs (
          user_id, action, resource, resource_id, details, 
          ip_address, user_agent, success, error_message, severity
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await db.query(query, [
        user_id,
        action,
        resource,
        resource_id,
        JSON.stringify(details),
        ip_address,
        user_agent,
        success,
        error_message,
        severity
      ]);

      const log = result.rows[0];
      
      // 只在非调试模式下记录日志创建信息
      if (process.env.NODE_ENV !== 'development') {
        logger.debug('活动日志创建成功', { logId: log.id, action, resource });
      }
      
      return log;
    } catch (error) {
      logger.error('活动日志创建失败', { action, resource, error });
      throw error;
    }
  }

  // 批量创建日志
  static async createBatch(logs: CreateLogData[]): Promise<void> {
    if (logs.length === 0) return;

    try {
      const values: any[] = [];
      const placeholders: string[] = [];
      
      logs.forEach((log, index) => {
        const baseIndex = index * 10;
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10})`);
        
        values.push(
          log.user_id,
          log.action,
          log.resource,
          log.resource_id,
          JSON.stringify(log.details || {}),
          log.ip_address,
          log.user_agent,
          log.success !== false,
          log.error_message,
          log.severity || 'info'
        );
      });

      const query = `
        INSERT INTO activity_logs (
          user_id, action, resource, resource_id, details, 
          ip_address, user_agent, success, error_message, severity
        )
        VALUES ${placeholders.join(', ')}
      `;

      await db.query(query, values);
      logger.debug('批量活动日志创建成功', { count: logs.length });
    } catch (error) {
      logger.error('批量活动日志创建失败', { count: logs.length, error });
      throw error;
    }
  }

  // 根据ID查找日志
  static async findById(id: string): Promise<ActivityLog | null> {
    try {
      const query = `
        SELECT al.*, u.username, u.full_name
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.id = $1
      `;
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('查找活动日志失败', { id, error });
      throw error;
    }
  }

  // 获取日志列表
  static async findMany(
    filter: LogFilter = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ logs: ActivityLog[]; total: number; totalPages: number }> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // 构建过滤条件
      if (filter.user_id) {
        conditions.push(`al.user_id = $${paramIndex}`);
        values.push(filter.user_id);
        paramIndex++;
      }

      if (filter.action) {
        conditions.push(`al.action = $${paramIndex}`);
        values.push(filter.action);
        paramIndex++;
      }

      if (filter.resource) {
        conditions.push(`al.resource = $${paramIndex}`);
        values.push(filter.resource);
        paramIndex++;
      }

      if (filter.success !== undefined) {
        conditions.push(`al.success = $${paramIndex}`);
        values.push(filter.success);
        paramIndex++;
      }

      if (filter.severity) {
        conditions.push(`al.severity = $${paramIndex}`);
        values.push(filter.severity);
        paramIndex++;
      }

      if (filter.start_date) {
        conditions.push(`al.created_at >= $${paramIndex}`);
        values.push(filter.start_date);
        paramIndex++;
      }

      if (filter.end_date) {
        conditions.push(`al.created_at <= $${paramIndex}`);
        values.push(filter.end_date);
        paramIndex++;
      }

      if (filter.search) {
        conditions.push(`(al.action ILIKE $${paramIndex} OR al.resource ILIKE $${paramIndex} OR al.error_message ILIKE $${paramIndex})`);
        values.push(`%${filter.search}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 获取总数
      const countQuery = `SELECT COUNT(*) FROM activity_logs al ${whereClause}`;
      const countResult = await db.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // 获取分页数据
      const offset = (page - 1) * limit;
      const dataQuery = `
        SELECT al.*, u.username, u.full_name
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      values.push(limit, offset);

      const dataResult = await db.query(dataQuery, values);
      const logs = dataResult.rows;

      return {
        logs,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('获取活动日志列表失败', { filter, page, limit, error });
      throw error;
    }
  }

  // 获取日志统计
  static async getStats(days: number = 30): Promise<any> {
    try {
      const queries = [
        `SELECT COUNT(*) as total FROM activity_logs WHERE created_at >= NOW() - INTERVAL '${days} days'`,
        `SELECT COUNT(*) as success FROM activity_logs WHERE created_at >= NOW() - INTERVAL '${days} days' AND success = true`,
        `SELECT COUNT(*) as failed FROM activity_logs WHERE created_at >= NOW() - INTERVAL '${days} days' AND success = false`,
        `SELECT severity, COUNT(*) as count FROM activity_logs WHERE created_at >= NOW() - INTERVAL '${days} days' GROUP BY severity`,
        `SELECT action, COUNT(*) as count FROM activity_logs WHERE created_at >= NOW() - INTERVAL '${days} days' GROUP BY action ORDER BY count DESC LIMIT 10`,
        `SELECT resource, COUNT(*) as count FROM activity_logs WHERE created_at >= NOW() - INTERVAL '${days} days' GROUP BY resource ORDER BY count DESC LIMIT 10`,
        `SELECT DATE(created_at) as date, COUNT(*) as count 
         FROM activity_logs 
         WHERE created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY DATE(created_at)
         ORDER BY date`,
      ];

      const results = await Promise.all(queries.map(query => db.query(query)));

      return {
        total: parseInt(results[0].rows[0].total),
        success: parseInt(results[1].rows[0].success),
        failed: parseInt(results[2].rows[0].failed),
        bySeverity: results[3].rows.reduce((acc: any, row: any) => {
          acc[row.severity] = parseInt(row.count);
          return acc;
        }, {}),
        topActions: results[4].rows,
        topResources: results[5].rows,
        dailyStats: results[6].rows,
      };
    } catch (error) {
      logger.error('获取活动日志统计失败', { days, error });
      throw error;
    }
  }

  // 清理过期日志
  static async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const query = `
        DELETE FROM activity_logs 
        WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      `;
      
      const result = await db.query(query);
      const deletedCount = result.rowCount;
      
      logger.info('清理过期活动日志', { deletedCount, daysToKeep });
      return deletedCount;
    } catch (error) {
      logger.error('清理过期活动日志失败', { daysToKeep, error });
      throw error;
    }
  }

  // 记录用户登录
  static async logUserLogin(userId: string, success: boolean, ipAddress?: string, userAgent?: string, errorMessage?: string): Promise<void> {
    await this.create({
      user_id: userId,
      action: 'user_login',
      resource: 'authentication',
      details: { loginSuccess: success },
      ip_address: ipAddress,
      user_agent: userAgent,
      success,
      error_message: errorMessage,
      severity: success ? 'info' : 'warning'
    });
  }

  // 记录用户登出
  static async logUserLogout(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.create({
      user_id: userId,
      action: 'user_logout',
      resource: 'authentication',
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
      severity: 'info'
    });
  }

  // 记录测试操作
  static async logTestAction(userId: string, action: string, testId: string, details?: any, success: boolean = true, errorMessage?: string): Promise<void> {
    await this.create({
      user_id: userId,
      action,
      resource: 'test',
      resource_id: testId,
      details,
      success,
      error_message: errorMessage,
      severity: success ? 'info' : 'error'
    });
  }

  // 记录管理员操作
  static async logAdminAction(userId: string, action: string, resource: string, resourceId?: string, details?: any, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.create({
      user_id: userId,
      action,
      resource,
      resource_id: resourceId,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
      severity: 'warning' // 管理员操作标记为警告级别以便追踪
    });
  }

  // 记录系统错误
  static async logSystemError(action: string, resource: string, errorMessage: string, details?: any): Promise<void> {
    await this.create({
      action,
      resource,
      details,
      success: false,
      error_message: errorMessage,
      severity: 'error'
    });
  }

  // 记录安全事件
  static async logSecurityEvent(action: string, details: any, ipAddress?: string, userAgent?: string, severity: 'warning' | 'error' | 'critical' = 'warning'): Promise<void> {
    await this.create({
      action,
      resource: 'security',
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
      success: false,
      severity
    });
  }
}
