/**
 * 会话管理服务
 * 处理用户会话、并发登录控制、设备管理
 * 版本: v2.0.0
 */

import crypto from 'crypto';
import { getPool } from '../../config/database';
import Logger from '../../utils/logger';

type DbRow = Record<string, unknown>;

type DbQueryResult<T extends DbRow = DbRow> = {
  rows: T[];
};

type DbPool = {
  query: <T extends DbRow = DbRow>(text: string, params?: unknown[]) => Promise<DbQueryResult<T>>;
};

interface DeviceInfo {
  deviceName?: string;
  deviceType?: string;
  userAgent?: string;
  platform?: string;
  fingerprint?: string;
  language?: string;
}

interface SessionLocation {
  country: string;
  region: string;
  city: string;
  timezone: string;
}

interface SessionRow extends DbRow {
  id: string;
  device_id: string;
  device_name?: string;
  device_type?: string;
  ip_address?: string;
  location?: string;
  created_at: Date;
  last_activity_at: Date;
  expires_at: Date;
  is_current?: boolean;
}

interface SessionConfig {
  maxConcurrentSessions: number;
  sessionTimeout: number;
  cleanupInterval: number;
  enableDeviceTracking: boolean;
  enableLocationTracking: boolean;
}

// ==================== 配置 ====================

const SESSION_CONFIG: SessionConfig = {
  maxConcurrentSessions: Number.parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5', 10) || 5,
  sessionTimeout: Number.parseInt(process.env.SESSION_TIMEOUT || '3600', 10) || 3600, // 1小时
  cleanupInterval: Number.parseInt(process.env.SESSION_CLEANUP_INTERVAL || '300', 10) || 300, // 5分钟
  enableDeviceTracking: process.env.ENABLE_DEVICE_TRACKING !== 'false',
  enableLocationTracking: process.env.ENABLE_LOCATION_TRACKING === 'true',
};

/**
 * SessionManager类 - 负责处理相关功能
 */
// ==================== 会话管理器 ====================

class SessionManager {
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * 创建新会话
   */
  async createSession(
    userId: string,
    deviceInfo: DeviceInfo,
    ipAddress: string,
    userAgent: string
  ) {
    const pool = getPool() as DbPool;

    try {
      // 生成会话ID
      const sessionId = this.generateSessionId();

      // 获取设备指纹
      const deviceId = this.generateDeviceId(deviceInfo);

      // 获取位置信息（如果启用）
      let location: SessionLocation | null = null;
      if (SESSION_CONFIG.enableLocationTracking) {
        location = await this.getLocationFromIP(ipAddress);
      }

      // 检查并清理超出限制的会话
      await this.enforceSessionLimit(userId);

      // 创建会话记录
      const result = await pool.query<SessionRow>(
        `
        INSERT INTO user_sessions (
          id, user_id, device_id, device_name, device_type,
          ip_address, user_agent, location, created_at,
          last_activity_at, expires_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(),
                  NOW() + INTERVAL '${SESSION_CONFIG.sessionTimeout} seconds', true)
        RETURNING *
      `,
        [
          sessionId,
          userId,
          deviceId,
          deviceInfo.deviceName || this.parseDeviceName(userAgent),
          deviceInfo.deviceType || this.parseDeviceType(userAgent),
          ipAddress,
          userAgent,
          location ? JSON.stringify(location) : null,
        ]
      );

      const session = result.rows[0];

      Logger.info('Session created', {
        sessionId,
        userId,
        deviceId,
        ipAddress,
      });

      return {
        sessionId,
        deviceId,
        expiresAt: session.expires_at,
        deviceName: session.device_name,
        location: session.location ? (JSON.parse(session.location) as SessionLocation) : null,
      };
    } catch (error) {
      Logger.error('Failed to create session', error as Error, { userId, ipAddress });
      throw error;
    }
  }

  /**
   * 验证会话
   */
  async validateSession(sessionId: string, userId: string) {
    const pool = getPool() as DbPool;

    try {
      const result = await pool.query<SessionRow>(
        `
        SELECT * FROM user_sessions
        WHERE id = $1 AND user_id = $2 AND is_active = true
        AND expires_at > NOW()
      `,
        [sessionId, userId]
      );

      if (result.rows.length === 0) {
        return {
          valid: false,
          reason: 'SESSION_NOT_FOUND' as const,
        };
      }

      const session = result.rows[0];

      // 更新最后活动时间
      await this.updateSessionActivity(sessionId);

      return {
        valid: true,
        session: {
          id: session.id,
          deviceId: session.device_id,
          deviceName: session.device_name,
          ipAddress: session.ip_address,
          lastActivityAt: session.last_activity_at,
          expiresAt: session.expires_at,
        },
      };
    } catch (error) {
      Logger.error('Failed to validate session', error as Error, { sessionId, userId });
      return { valid: false, reason: 'VALIDATION_ERROR' as const };
    }
  }

  /**
   * 更新会话活动时间
   */
  async updateSessionActivity(sessionId: string) {
    const pool = getPool() as DbPool;

    try {
      await pool.query(
        `
        UPDATE user_sessions
        SET last_activity_at = NOW(),
            expires_at = NOW() + INTERVAL '${SESSION_CONFIG.sessionTimeout} seconds'
        WHERE id = $1 AND is_active = true
      `,
        [sessionId]
      );
    } catch (error) {
      Logger.error('Failed to update session activity', error as Error, { sessionId });
    }
  }

  /**
   * 获取用户所有活跃会话
   */
  async getUserSessions(userId: string) {
    const pool = getPool() as DbPool;

    try {
      const result = await pool.query<SessionRow>(
        `
        SELECT
          id, device_id, device_name, device_type, ip_address,
          location, created_at, last_activity_at, expires_at,
          (last_activity_at > NOW() - INTERVAL '5 minutes') as is_current
        FROM user_sessions
        WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
        ORDER BY last_activity_at DESC
      `,
        [userId]
      );

      return result.rows.map(session => ({
        id: session.id,
        deviceId: session.device_id,
        deviceName: session.device_name,
        deviceType: session.device_type,
        ipAddress: session.ip_address,
        location: session.location ? (JSON.parse(session.location) as SessionLocation) : null,
        createdAt: session.created_at,
        lastActivityAt: session.last_activity_at,
        expiresAt: session.expires_at,
        isCurrent: Boolean(session.is_current),
        isActive: true,
      }));
    } catch (error) {
      Logger.error('Failed to get user sessions', error as Error, { userId });
      return [];
    }
  }

  /**
   * 终止指定会话
   */
  async terminateSession(sessionId: string, userId: string) {
    const pool = getPool() as DbPool;

    try {
      const result = await pool.query<DbRow>(
        `
        UPDATE user_sessions
        SET is_active = false, terminated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `,
        [sessionId, userId]
      );

      if (result.rows.length > 0) {
        Logger.info('Session terminated', { sessionId, userId });
        return true;
      }

      return false;
    } catch (error) {
      Logger.error('Failed to terminate session', error as Error, { sessionId, userId });
      return false;
    }
  }

  /**
   * 终止用户的其他所有会话
   */
  async terminateOtherSessions(currentSessionId: string, userId: string) {
    const pool = getPool() as DbPool;

    try {
      const result = await pool.query<DbRow>(
        `
        UPDATE user_sessions
        SET is_active = false, terminated_at = NOW()
        WHERE user_id = $1 AND id != $2 AND is_active = true
        RETURNING id
      `,
        [userId, currentSessionId]
      );

      const terminatedCount = result.rows.length;

      Logger.info('Other sessions terminated', {
        userId,
        currentSessionId,
        terminatedCount,
      });

      return terminatedCount;
    } catch (error) {
      Logger.error('Failed to terminate other sessions', error as Error, {
        currentSessionId,
        userId,
      });
      return 0;
    }
  }

  /**
   * 终止用户所有会话
   */
  async terminateAllUserSessions(userId: string) {
    const pool = getPool() as DbPool;

    try {
      const result = await pool.query<DbRow>(
        `
        UPDATE user_sessions
        SET is_active = false, terminated_at = NOW()
        WHERE user_id = $1 AND is_active = true
        RETURNING id
      `,
        [userId]
      );

      const terminatedCount = result.rows.length;

      Logger.info('All user sessions terminated', { userId, terminatedCount });

      return terminatedCount;
    } catch (error) {
      Logger.error('Failed to terminate all user sessions', error as Error, { userId });
      return 0;
    }
  }

  /**
   * 强制执行会话数量限制
   */
  async enforceSessionLimit(userId: string) {
    const pool = getPool() as DbPool;

    try {
      // 获取当前活跃会话数
      const countResult = await pool.query<{ count: string }>(
        `
        SELECT COUNT(*) as count
        FROM user_sessions
        WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
      `,
        [userId]
      );

      const currentCount = Number.parseInt(countResult.rows[0]?.count || '0', 10);

      if (currentCount >= SESSION_CONFIG.maxConcurrentSessions) {
        // 终止最旧的会话
        const sessionsToTerminate = currentCount - SESSION_CONFIG.maxConcurrentSessions + 1;

        await pool.query(
          `
          UPDATE user_sessions
          SET is_active = false, terminated_at = NOW()
          WHERE id IN (
            SELECT id FROM user_sessions
            WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
            ORDER BY last_activity_at ASC
            LIMIT $2
          )
        `,
          [userId, sessionsToTerminate]
        );

        Logger.info('Sessions terminated due to limit', {
          userId,
          terminatedCount: sessionsToTerminate,
        });
      }
    } catch (error) {
      Logger.error('Failed to enforce session limit', error as Error, { userId });
    }
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions() {
    try {
      const pool = getPool() as DbPool;
      const result = await pool.query<DbRow>(
        `
        UPDATE user_sessions
        SET is_active = false, terminated_at = NOW()
        WHERE is_active = true AND expires_at <= NOW()
        RETURNING id
      `
      );

      const cleanedCount = result.rows.length;

      if (cleanedCount > 0) {
        Logger.info('Expired sessions cleaned up', { cleanedCount });
      }

      return cleanedCount;
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据库连接池未初始化')) {
        return 0;
      }
      Logger.error('Failed to cleanup expired sessions', error as Error);
      return 0;
    }
  }

  /**
   * 获取会话统计信息
   */
  async getSessionStats() {
    const pool = getPool() as DbPool;

    try {
      const result = await pool.query(
        `
        SELECT
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN is_active = true AND expires_at > NOW() THEN 1 END) as active_sessions,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT device_id) as unique_devices,
          AVG(EXTRACT(EPOCH FROM (terminated_at - created_at))) as avg_session_duration
        FROM user_sessions
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `
      );

      return result.rows[0] ?? null;
    } catch (error) {
      Logger.error('Failed to get session stats', error as Error);
      return null;
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 生成会话ID
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 生成设备ID
   */
  generateDeviceId(deviceInfo: DeviceInfo) {
    const components = [
      deviceInfo.userAgent || '',
      deviceInfo.platform || '',
      deviceInfo.fingerprint || '',
      deviceInfo.language || '',
    ].join('|');

    return crypto.createHash('sha256').update(components).digest('hex').substring(0, 32);
  }

  /**
   * 解析设备名称
   */
  parseDeviceName(userAgent: string) {
    if (!userAgent) return 'Unknown Device';

    // 简单的设备名称解析
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Macintosh')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';

    return 'Unknown Device';
  }

  /**
   * 解析设备类型
   */
  parseDeviceType(userAgent: string) {
    if (!userAgent) return 'unknown';

    if (
      userAgent.includes('Mobile') ||
      userAgent.includes('iPhone') ||
      userAgent.includes('Android')
    ) {
      return 'mobile';
    }
    if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      return 'tablet';
    }

    return 'desktop';
  }

  /**
   * 从IP地址获取位置信息
   */
  async getLocationFromIP(ipAddress: string) {
    // 这里应该集成IP地理位置服务
    // 例如：MaxMind GeoIP、ipapi.co等
    try {
      // 模拟位置信息
      if (ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168.')) {
        return {
          country: 'Local',
          region: 'Local',
          city: 'Local',
          timezone: 'Local',
        };
      }

      // 实际项目中应该调用真实的地理位置API
      return {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        timezone: 'Unknown',
      };
    } catch (error) {
      Logger.error('Failed to get location from IP', error as Error, { ipAddress });
      return null;
    }
  }

  /**
   * 启动清理定时器
   */
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpiredSessions();
    }, SESSION_CONFIG.cleanupInterval * 1000);
  }

  /**
   * 停止清理定时器
   */
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 销毁会话管理器
   */
  destroy() {
    this.stopCleanupTimer();
  }
}

/**
 * 创建新的createSessionTable
 * @param {Object} data - 创建数据
 * @returns {Promise<Object>} 创建的对象
 */
// ==================== 数据库表创建 ====================

const createSessionTable = async () => {
  const pool = getPool() as DbPool;

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(64) PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id VARCHAR(64) NOT NULL,
        device_name VARCHAR(255),
        device_type VARCHAR(50),
        ip_address INET,
        user_agent TEXT,
        location JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        terminated_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true
      );

      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_device_id ON user_sessions(device_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_cleanup ON user_sessions(is_active, expires_at) WHERE is_active = true;
    `);

    Logger.info('User sessions table created/verified');
  } catch (error) {
    Logger.error('Failed to create user sessions table', error as Error);
    throw error;
  }
};

// ==================== 导出 ====================

const sessionManager = new SessionManager();

export { createSessionTable, SESSION_CONFIG, SessionManager, sessionManager };

// 兼容 CommonJS require
module.exports = {
  SessionManager,
  sessionManager,
  createSessionTable,
  SESSION_CONFIG,
};
