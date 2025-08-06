/**
 * Redis缓存预热模块
 * 提供缓存预热和热点数据管理功能
 */

const cacheService = require('./cache');
const keys = require('./keys');
const { query } = require('../../config/database');
const winston = require('winston');

class CacheWarmup {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/cache-warmup.log' }),
        new winston.transports.Console()
      ]
    });

    // 预热配置
    this.warmupConfig = {
      popularUrls: {
        enabled: true,
        limit: 50,
        ttl: 3600
      },
      recentTests: {
        enabled: true,
        limit: 100,
        ttl: 1800
      },
      userSessions: {
        enabled: true,
        limit: 200,
        ttl: 86400
      },
      systemConfig: {
        enabled: true,
        ttl: 7200
      }
    };
  }

  /**
   * 启动缓存预热
   */
  async startWarmup() {
    if (!cacheService.isAvailable()) {
      this.logger.warn('Redis不可用，跳过缓存预热');
      return false;
    }

    this.logger.info('开始缓存预热...');

    try {
      const results = await Promise.allSettled([
        this.warmupPopularUrls(),
        this.warmupRecentTests(),
        this.warmupSystemConfig(),
        this.warmupUserSessions()
      ]);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      this.logger.info(`缓存预热完成: ${successful} 成功, ${failed} 失败`);

      if (failed > 0) {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            this.logger.error(`预热任务 ${index} 失败:`, result.reason);
          }
        });
      }

      return successful > 0;
    } catch (error) {
      this.logger.error('缓存预热失败:', error);
      return false;
    }
  }

  /**
   * 预热热门URL
   */
  async warmupPopularUrls() {
    if (!this.warmupConfig.popularUrls.enabled) {
      return;
    }

    try {
      this.logger.info('预热热门URL...');

      // 查询最近测试频率最高的URL
      const popularUrlsQuery = `
        SELECT
          url,
          COUNT(*) as test_count,
          MAX(created_at) as last_test
        FROM test_sessions
        WHERE created_at > NOW() - INTERVAL '7 days' AND deleted_at IS NULL
        GROUP BY url
        ORDER BY test_count DESC, last_test DESC
        LIMIT $1
      `;

      const result = await query(popularUrlsQuery, [this.warmupConfig.popularUrls.limit]);

      if (result.rows && result.rows.length > 0) {
        await cacheService.set(
          keys.warmup.popular(),
          result.rows,
          {
            ttl: this.warmupConfig.popularUrls.ttl,
            type: 'warmup'
          }
        );

        this.logger.info(`预热热门URL完成: ${result.rows.length} 个URL`);
      }
    } catch (error) {
      this.logger.error('预热热门URL失败:', error);
      throw error;
    }
  }

  /**
   * 预热最近测试
   */
  async warmupRecentTests() {
    if (!this.warmupConfig.recentTests.enabled) {
      return;
    }

    try {
      this.logger.info('预热最近测试...');

      // 查询最近的测试结果
      const recentTestsQuery = `
        SELECT
          id,
          url,
          test_type,
          status,
          overall_score as score,
          created_at
        FROM test_sessions
        WHERE created_at > NOW() - INTERVAL '24 hours' AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1
      `;

      const result = await query(recentTestsQuery, [this.warmupConfig.recentTests.limit]);

      if (result.rows && result.rows.length > 0) {
        await cacheService.set(
          keys.warmup.recent(),
          result.rows,
          {
            ttl: this.warmupConfig.recentTests.ttl,
            type: 'warmup'
          }
        );

        this.logger.info(`预热最近测试完成: ${result.rows.length} 个测试`);
      }
    } catch (error) {
      this.logger.error('预热最近测试失败:', error);
      throw error;
    }
  }

  /**
   * 预热系统配置
   */
  async warmupSystemConfig() {
    if (!this.warmupConfig.systemConfig.enabled) {
      return;
    }

    try {
      this.logger.info('预热系统配置...');

      // 预热系统设置
      const systemSettings = {
        features: {
          redis_enabled: process.env.REDIS_ENABLED === 'true',
          cache_api_results: process.env.REDIS_CACHE_API_RESULTS === 'true',
          cache_user_sessions: process.env.REDIS_CACHE_USER_SESSIONS === 'true',
          cache_db_queries: process.env.REDIS_CACHE_DB_QUERIES === 'true',
          monitoring_enabled: process.env.REDIS_ENABLE_MONITORING === 'true'
        },
        limits: {
          api_cache_ttl: parseInt(process.env.REDIS_API_CACHE_TTL) || 1800,
          db_cache_ttl: parseInt(process.env.REDIS_DB_CACHE_TTL) || 600,
          session_ttl: parseInt(process.env.REDIS_SESSION_TTL) || 86400,
          default_ttl: parseInt(process.env.REDIS_DEFAULT_TTL) || 3600
        },
        thresholds: {
          response_time: 100,
          memory_usage: 80,
          hit_rate: 70,
          error_rate: 5
        }
      };

      await cacheService.set(
        keys.config.settings(),
        systemSettings,
        {
          ttl: this.warmupConfig.systemConfig.ttl,
          type: 'config'
        }
      );

      this.logger.info('预热系统配置完成');
    } catch (error) {
      this.logger.error('预热系统配置失败:', error);
      throw error;
    }
  }

  /**
   * 预热活跃用户会话
   */
  async warmupUserSessions() {
    if (!this.warmupConfig.userSessions.enabled) {
      return;
    }

    try {
      this.logger.info('预热用户会话...');

      // 查询最近活跃的用户
      const activeUsersQuery = `
        SELECT DISTINCT
          user_id,
          MAX(created_at) as last_activity
        FROM test_sessions
        WHERE user_id IS NOT NULL
          AND created_at > NOW() - INTERVAL '24 hours'
          AND deleted_at IS NULL
        GROUP BY user_id
        ORDER BY last_activity DESC
        LIMIT $1
      `;

      const result = await query(activeUsersQuery, [this.warmupConfig.userSessions.limit]);

      if (result.rows && result.rows.length > 0) {
        // 为每个活跃用户预热基础信息
        const warmupPromises = result.rows.map(async (user) => {
          const userStats = await this.getUserStats(user.user_id);
          if (userStats) {
            await cacheService.set(
              keys.db.user(user.user_id),
              userStats,
              {
                ttl: this.warmupConfig.userSessions.ttl,
                type: 'session'
              }
            );
          }
        });

        await Promise.allSettled(warmupPromises);
        this.logger.info(`预热用户会话完成: ${result.rows.length} 个用户`);
      }
    } catch (error) {
      this.logger.error('预热用户会话失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(userId) {
    try {
      const statsQuery = `
        SELECT
          COUNT(*) as total_tests,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
          AVG(CASE WHEN overall_score IS NOT NULL THEN overall_score END) as avg_score,
          MAX(created_at) as last_test,
          MIN(created_at) as first_test
        FROM test_sessions
        WHERE user_id = $1 AND deleted_at IS NULL
      `;

      const result = await query(statsQuery, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error(`获取用户 ${userId} 统计失败:`, error);
      return null;
    }
  }

  /**
   * 定期预热任务
   */
  startScheduledWarmup(interval = 3600000) { // 1小时
    this.logger.info(`启动定期预热任务，间隔: ${interval}ms`);

    this.warmupInterval = setInterval(async () => {
      try {
        await this.startWarmup();
      } catch (error) {
        this.logger.error('定期预热任务失败:', error);
      }
    }, interval);
  }

  /**
   * 停止定期预热任务
   */
  stopScheduledWarmup() {
    if (this.warmupInterval) {
      clearInterval(this.warmupInterval);
      this.warmupInterval = null;
      this.logger.info('定期预热任务已停止');
    }
  }

  /**
   * 手动触发特定URL的预热
   */
  async warmupUrl(url, testTypes = ['performance', 'security', 'seo']) {
    if (!cacheService.isAvailable()) {
      return false;
    }

    try {
      this.logger.info(`预热URL: ${url}`);

      const warmupPromises = testTypes.map(async (testType) => {
        const cacheKey = keys.api[testType](url, { prewarmed: true });

        // 检查是否已有缓存
        const exists = await cacheService.exists(cacheKey);
        if (!exists) {
          // 设置预热标记，实际测试将在首次请求时执行
          await cacheService.set(
            `${cacheKey}_prewarmed`,
            { url, testType, prewarmed: true, timestamp: Date.now() },
            { ttl: 300, type: 'warmup' }
          );
        }
      });

      await Promise.all(warmupPromises);
      this.logger.info(`URL预热完成: ${url}`);
      return true;
    } catch (error) {
      this.logger.error(`URL预热失败 ${url}:`, error);
      return false;
    }
  }

  /**
   * 获取预热统计
   */
  async getWarmupStats() {
    try {
      const stats = {
        popularUrls: await cacheService.exists(keys.warmup.popular()),
        recentTests: await cacheService.exists(keys.warmup.recent()),
        systemConfig: await cacheService.exists(keys.config.settings()),
        lastWarmup: new Date().toISOString(),
        config: this.warmupConfig
      };

      return stats;
    } catch (error) {
      this.logger.error('获取预热统计失败:', error);
      return null;
    }
  }
}

// 创建单例实例
const cacheWarmup = new CacheWarmup();

module.exports = cacheWarmup;
