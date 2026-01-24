import bcrypt from 'bcrypt';
import type { NextFunction, Request, Response } from 'express';
import os from 'os';
import { StandardErrorCode } from '../../shared/types/standardApiResponse';
import { query } from '../config/database';
import { toOptionalDate } from '../utils/dateUtils';
const { getStats: getDbStats, healthCheck: dbHealthCheck } = require('../config/database');
const { getApiStatsSnapshot } = require('../middleware/logger');

const formatDate = (value?: Date | string | null) => {
  const parsed = toOptionalDate(value);
  return parsed ? parsed.toISOString() : null;
};

type ApiResponse = Response & {
  success: (data?: unknown, message?: string, statusCode?: number, meta?: unknown) => Response;
  error: (
    code: string,
    message?: string,
    details?: unknown,
    statusCode?: number,
    meta?: unknown
  ) => Response;
  validationError: (errors: Array<{ field: string; message: string }>) => Response;
  notFound: (message?: string) => Response;
};

type AdminRequest = Request & { user?: { id: string } };

type ConfigRow = {
  config_key: string;
  config_value: string | Record<string, unknown>;
  category?: string | null;
};

const parsePagination = (req: Request) => {
  const page = Math.max(parseInt(String(req.query.page), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const parseConfigValue = (value: string | Record<string, unknown>) => {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  try {
    return JSON.parse(String(value)) as Record<string, unknown>;
  } catch {
    return { value } as Record<string, unknown>;
  }
};

const handleControllerError = (res: ApiResponse, error: unknown, message = '请求处理失败') => {
  return res.error(
    StandardErrorCode.INTERNAL_SERVER_ERROR,
    message,
    error instanceof Error ? error.message : String(error),
    500
  );
};

const loadSystemConfigMap = async () => {
  const rows = (await query('SELECT config_key, config_value, category FROM system_configs', []))
    .rows as ConfigRow[];
  const map = new Map<string, Record<string, unknown>>();
  rows.forEach(row => {
    map.set(row.config_key, parseConfigValue(row.config_value));
  });
  return map;
};

const getConfigValue = (
  map: Map<string, Record<string, unknown>>,
  key: string,
  fallback: unknown
) => {
  if (!map.has(key)) {
    return fallback;
  }
  const value = map.get(key);
  if (!value) {
    return fallback;
  }
  if (Object.prototype.hasOwnProperty.call(value, 'value')) {
    return value.value;
  }
  return value;
};

const buildSystemConfig = (map: Map<string, Record<string, unknown>>) => {
  const supportedTypes = getConfigValue(map, 'supported_test_types', []);
  const supportedSet = Array.isArray(supportedTypes)
    ? new Set(supportedTypes.map(item => String(item)))
    : new Set<string>();

  return {
    general: {
      siteName: String(getConfigValue(map, 'app_name', 'Test Web Platform')),
      siteDescription: String(getConfigValue(map, 'site_description', '')),
      adminEmail: String(getConfigValue(map, 'admin_email', '')),
      timezone: String(getConfigValue(map, 'timezone', 'UTC')),
      language: String(getConfigValue(map, 'language', 'zh-CN')),
      maintenanceMode: Boolean(getConfigValue(map, 'maintenance_mode', false)),
      registrationEnabled: Boolean(getConfigValue(map, 'enable_user_registration', true)),
      emailVerificationRequired: Boolean(getConfigValue(map, 'email_verification_required', false)),
    },
    testing: {
      maxConcurrentTests: Number(getConfigValue(map, 'max_concurrent_tests', 10)) || 10,
      maxTestsPerUser: Number(getConfigValue(map, 'max_tests_per_user', 5)) || 5,
      testTimeoutMinutes: Math.round(
        Number(getConfigValue(map, 'default_test_timeout', 300000)) / 60000
      ),
      dataRetentionDays: Number(getConfigValue(map, 'data_retention_days', 30)) || 30,
      enabledTestTypes: {
        coreWebVitals: supportedSet.size ? supportedSet.has('website') : true,
        lighthouseAudit: supportedSet.size ? supportedSet.has('seo') : true,
        securityScan: supportedSet.size ? supportedSet.has('security') : true,
        loadTest: supportedSet.size ? supportedSet.has('stress') : true,
        apiTest: supportedSet.size ? supportedSet.has('api') : true,
        uptimeMonitor: supportedSet.size ? supportedSet.has('infrastructure') : true,
        syntheticMonitor: true,
        realUserMonitor: true,
      },
      defaultLocations: ['global'],
      maxFileUploadSize: Number(getConfigValue(map, 'max_upload_size', 10485760)) || 10485760,
      screenshotQuality: String(getConfigValue(map, 'screenshot_quality', 'medium')) as
        | 'low'
        | 'medium'
        | 'high',
      videoRecording: Boolean(getConfigValue(map, 'video_recording', false)),
      harGeneration: Boolean(getConfigValue(map, 'har_generation', false)),
    },
    monitoring: {
      uptimeCheckInterval: Number(getConfigValue(map, 'uptime_check_interval', 300)) || 300,
      alertThresholds: {
        responseTime: Number(getConfigValue(map, 'alert_response_time', 5000)) || 5000,
        errorRate: Number(getConfigValue(map, 'alert_error_rate', 5)) || 5,
        availability: Number(getConfigValue(map, 'alert_availability', 99.9)) || 99.9,
      },
      retentionPeriods: {
        rawData: Number(getConfigValue(map, 'retention_raw_data', 30)) || 30,
        aggregatedData: Number(getConfigValue(map, 'retention_aggregated_data', 90)) || 90,
        screenshots: Number(getConfigValue(map, 'retention_screenshots', 30)) || 30,
        videos: Number(getConfigValue(map, 'retention_videos', 30)) || 30,
      },
    },
    security: {
      passwordMinLength: Number(getConfigValue(map, 'password_min_length', 8)) || 8,
      passwordRequireSpecialChars: Boolean(getConfigValue(map, 'password_require_special', false)),
      sessionTimeoutMinutes: Number(getConfigValue(map, 'session_timeout_minutes', 60)) || 60,
      maxLoginAttempts: Number(getConfigValue(map, 'max_login_attempts', 5)) || 5,
      lockoutDurationMinutes: Number(getConfigValue(map, 'lockout_duration_minutes', 15)) || 15,
      twoFactorRequired: Boolean(getConfigValue(map, 'two_factor_required', false)),
      ipWhitelist: getConfigValue(map, 'ip_whitelist', []) as string[],
    },
    notifications: {
      emailEnabled: Boolean(getConfigValue(map, 'email_enabled', true)),
      smtpHost: String(getConfigValue(map, 'smtp_host', '')),
      smtpPort: Number(getConfigValue(map, 'smtp_port', 587)) || 587,
      smtpUser: String(getConfigValue(map, 'smtp_user', '')),
      smtpPassword: String(getConfigValue(map, 'smtp_password', '')),
      fromEmail: String(getConfigValue(map, 'from_email', '')),
      fromName: String(getConfigValue(map, 'from_name', '')),
    },
    backup: {
      enabled: Boolean(getConfigValue(map, 'backup_enabled', false)),
      frequency: String(getConfigValue(map, 'backup_frequency', 'daily')) as
        | 'daily'
        | 'weekly'
        | 'monthly',
      retentionDays: Number(getConfigValue(map, 'backup_retention_days', 30)) || 30,
      location: String(getConfigValue(map, 'backup_location', 'local')) as 'local' | 's3' | 'ftp',
      s3Config: getConfigValue(map, 'backup_s3_config', undefined) as
        | {
            bucket: string;
            region: string;
            accessKey: string;
            secretKey: string;
          }
        | undefined,
    },
  };
};

const upsertConfig = async (key: string, value: unknown, category?: string) => {
  await query(
    `INSERT INTO system_configs (config_key, config_value, category, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (config_key)
     DO UPDATE SET config_value = EXCLUDED.config_value, category = EXCLUDED.category, updated_at = NOW()`,
    [key, JSON.stringify({ value }), category || null]
  );
};

class AdminController {
  async getSystemStats(_req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const usersSummary = await query(
        `SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive,
          COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int AS new_today,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::int AS new_week,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::int AS new_month
        FROM users`
      );

      const testSummary = await query(
        `SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int AS today,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::int AS week,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::int AS month,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
          COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
          COALESCE(AVG(execution_time), 0)::float AS avg_duration
        FROM test_executions`
      );

      const typeStats = await query(
        `SELECT engine_type AS type, COUNT(*)::int AS count
         FROM test_executions
         GROUP BY engine_type
         ORDER BY count DESC
         LIMIT 5`
      );

      const users = usersSummary.rows[0] || {};
      const tests = testSummary.rows[0] || {};
      const totalTests = Number(tests.total) || 0;
      const successRate =
        totalTests > 0 ? Math.round((Number(tests.completed) / totalTests) * 100) : 0;

      const popularTypes = (typeStats.rows || []).map((row: Record<string, unknown>) => {
        const count = Number(row.count) || 0;
        return {
          type: String(row.type),
          count,
          percentage: totalTests > 0 ? Math.round((count / totalTests) * 100) : 0,
        };
      });

      const dbStats = await getDbStats();
      const dbSizeBytes = Array.isArray(dbStats?.tableSizes)
        ? dbStats.tableSizes.reduce((sum: number, row: Record<string, unknown>) => {
            return sum + Number(row.size_bytes || 0);
          }, 0)
        : 0;
      const memoryUsagePercent = Math.round((process.memoryUsage().rss / os.totalmem()) * 100);

      return res.success({
        users: {
          total: Number(users.total) || 0,
          active: Number(users.active) || 0,
          inactive: Number(users.inactive) || 0,
          suspended: Number(users.suspended) || 0,
          growthRate: 0,
          newToday: Number(users.new_today) || 0,
          newThisWeek: Number(users.new_week) || 0,
          newThisMonth: Number(users.new_month) || 0,
        },
        tests: {
          total: totalTests,
          today: Number(tests.today) || 0,
          thisWeek: Number(tests.week) || 0,
          thisMonth: Number(tests.month) || 0,
          successRate,
          averageResponseTime: Number(tests.avg_duration) || 0,
          todayCount: Number(tests.today) || 0,
          popularTypes,
        },
        performance: {
          successRate,
          averageResponseTime: Number(tests.avg_duration) || 0,
          errorRate: totalTests > 0 ? Math.round((Number(tests.failed) / totalTests) * 100) : 0,
        },
        system: {
          uptime: Math.round(process.uptime()),
          version: process.env.npm_package_version || '0.0.0',
          environment: process.env.NODE_ENV || 'development',
          lastBackup: '',
          diskUsage: dbSizeBytes,
          memoryUsage: memoryUsagePercent,
          cpuUsage: Math.round((process.cpuUsage().user / 1000000) % 100),
        },
      });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async getSystemMonitor(_req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const cpuCount = os.cpus().length;
      const dbStats = await getDbStats();
      const apiStatsSnapshot = getApiStatsSnapshot();

      const runningTestsResult = await query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'running')::int AS running,
          COUNT(*) FILTER (WHERE status IN ('pending', 'queued', 'preparing'))::int AS queued
         FROM test_executions`
      );
      const runningTests = runningTestsResult.rows[0] || {};

      const activeUsersResult = await query(
        `SELECT COUNT(DISTINCT user_id)::int AS active
         FROM user_sessions
         WHERE last_activity_at >= NOW() - INTERVAL '15 minutes' AND is_active = true`
      );
      const activeUsers = activeUsersResult.rows[0]?.active || 0;

      const dbSizeBytes = Array.isArray(dbStats?.tableSizes)
        ? dbStats.tableSizes.reduce((sum: number, row: Record<string, unknown>) => {
            return sum + Number(row.size_bytes || 0);
          }, 0)
        : 0;
      const dbConnections = dbStats?.connectionStats || {};

      return res.success({
        timestamp: new Date().toISOString(),
        metrics: {
          system: {
            uptime: Math.round(process.uptime()),
            loadAverage: os.loadavg(),
            memoryUsage: {
              total: totalMemory,
              used: totalMemory - freeMemory,
              free: freeMemory,
              percentage: Math.round(((totalMemory - freeMemory) / totalMemory) * 100),
            },
            diskUsage: {
              total: 0,
              used: 0,
              free: 0,
              percentage: 0,
            },
            cpuUsage: {
              percentage: Math.round((process.cpuUsage().user / 1000000) % 100),
              cores: cpuCount,
            },
          },
          cpu: {
            usage: Math.round((process.cpuUsage().user / 1000000) % 100),
            cores: cpuCount,
          },
          memory: {
            usage: Math.round(((totalMemory - freeMemory) / totalMemory) * 100),
            used: totalMemory - freeMemory,
            total: totalMemory,
          },
          disk: {
            usage: 0,
            used: 0,
            total: 0,
          },
          network: {
            connections: apiStatsSnapshot.totalRequests,
            incoming: apiStatsSnapshot.requestsPerMinute,
            outgoing: apiStatsSnapshot.requestsPerMinute,
          },
          application: {
            activeConnections: 0,
            requestsPerMinute: apiStatsSnapshot.requestsPerMinute,
            averageResponseTime: apiStatsSnapshot.averageResponseTime,
            errorRate: apiStatsSnapshot.errorRate,
            cacheHitRate: 0,
            activeUsers,
            runningTests: Number(runningTests.running) || 0,
            queuedTests: Number(runningTests.queued) || 0,
          },
          database: {
            connections: dbConnections.total_connections || dbStats?.pool?.totalCount || 0,
            queryTime: 0,
            slowQueries: 0,
            size: dbSizeBytes,
          },
        },
        alerts: [],
      });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async getTestHistory(_req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const result = await query(
        `SELECT test_id, engine_type, status, created_at, completed_at, execution_time
         FROM test_executions
         ORDER BY created_at DESC
         LIMIT 100`
      );
      return res.success(result.rows || []);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async getUsers(req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { page, limit, offset } = parsePagination(req);
      const { role, status, search, email_verified } = req.query as Record<string, string>;
      const filters: string[] = [];
      const params: Array<string | number | boolean> = [];

      if (role) {
        params.push(role);
        filters.push(`u.role = $${params.length}`);
      }
      if (status) {
        params.push(status);
        filters.push(`u.status = $${params.length}`);
      }
      if (search) {
        params.push(`%${search}%`);
        filters.push(`(u.username ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
      }
      if (email_verified !== undefined) {
        params.push(email_verified === 'true');
        filters.push(`u.email_verified = $${params.length}`);
      }

      const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

      const listSql = `
        SELECT
          u.id,
          u.username,
          u.email,
          u.role,
          u.status,
          u.is_active,
          u.email_verified,
          u.two_factor_enabled,
          u.created_at,
          u.updated_at,
          COALESCE(tests.test_count, 0) AS test_count,
          tests.last_activity,
          sessions.ip_address,
          sessions.user_agent
        FROM users u
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS test_count, MAX(created_at) AS last_activity
          FROM test_executions te
          WHERE te.user_id = u.id
        ) tests ON true
        LEFT JOIN LATERAL (
          SELECT ip_address, user_agent
          FROM user_sessions us
          WHERE us.user_id = u.id
          ORDER BY us.last_activity_at DESC NULLS LAST
          LIMIT 1
        ) sessions ON true
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      const countSql = `SELECT COUNT(*)::int AS total FROM users u ${whereClause}`;
      const countResult = await query(countSql, params);

      const listResult = await query(listSql, [...params, limit, offset]);
      const total = Number(countResult.rows[0]?.total) || 0;

      const users = (listResult.rows || []).map((row: Record<string, unknown>) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        role: row.role,
        status: row.status,
        testCount: Number(row.test_count) || 0,
        lastActivity: formatDate(row.last_activity as string) || '',
        ipAddress: row.ip_address || '',
        userAgent: row.user_agent || '',
        createdAt: formatDate(row.created_at as string),
        emailVerified: Boolean(row.email_verified),
        twoFactorEnabled: Boolean(row.two_factor_enabled),
      }));

      return res.success(users, undefined, 200, {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async createUser(req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { username, email, password, role, fullName } = req.body as {
        username?: string;
        email?: string;
        password?: string;
        role?: string;
        fullName?: string;
      };

      if (!username || !email || !password) {
        return res.validationError([
          { field: 'username', message: 'username 不能为空' },
          { field: 'email', message: 'email 不能为空' },
          { field: 'password', message: 'password 不能为空' },
        ]);
      }

      const existing = await query('SELECT id FROM users WHERE username = $1 OR email = $2', [
        username,
        email,
      ]);
      if (existing.rows.length > 0) {
        return res.error(StandardErrorCode.CONFLICT, '用户名或邮箱已存在', undefined, 409);
      }

      const hashed = await bcrypt.hash(password, 12);
      const metadata = fullName ? { fullName } : {};
      const result = await query(
        `INSERT INTO users (username, email, password_hash, role, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, username, email, role, created_at`,
        [username, email, hashed, role || 'user', JSON.stringify(metadata)]
      );

      return res.success(result.rows[0], '用户创建成功', 201);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async updateUser(req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { userId } = req.params as { userId: string };
      const { username, email, role, status, fullName } = req.body as {
        username?: string;
        email?: string;
        role?: string;
        status?: string;
        fullName?: string;
      };

      const updates: string[] = [];
      const values: Array<string | boolean> = [];

      if (username) {
        values.push(username);
        updates.push(`username = $${values.length}`);
      }
      if (email) {
        values.push(email);
        updates.push(`email = $${values.length}`);
      }
      if (role) {
        values.push(role);
        updates.push(`role = $${values.length}`);
      }
      if (status) {
        values.push(status);
        updates.push(`status = $${values.length}`);
        values.push(status === 'active');
        updates.push(`is_active = $${values.length}`);
      }
      if (fullName) {
        values.push(JSON.stringify({ fullName }));
        updates.push(`metadata = $${values.length}`);
      }

      if (!updates.length) {
        return res.validationError([{ field: 'update', message: '无可更新字段' }]);
      }

      values.push(userId);
      const sql = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $$${values.length}`;
      await query(sql, values);

      const updated = await query(
        'SELECT id, username, email, role, status FROM users WHERE id = $1',
        [userId]
      );

      return res.success(updated.rows[0], '用户更新成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async deleteUser(req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { userId } = req.params as { userId: string };
      await query(
        'UPDATE users SET is_active = false, status = $1, updated_at = NOW() WHERE id = $2',
        ['inactive', userId]
      );
      return res.success(null, '用户删除成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async bulkUserAction(req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { action, userIds, newRole } = req.body as {
        action?: string;
        userIds?: string[];
        newRole?: string;
      };

      if (!action || !Array.isArray(userIds) || userIds.length === 0) {
        return res.validationError([{ field: 'userIds', message: 'userIds 不能为空' }]);
      }

      switch (action) {
        case 'activate':
          await query(
            `UPDATE users SET status = 'active', is_active = true, updated_at = NOW()
             WHERE id = ANY($1::uuid[])`,
            [userIds]
          );
          break;
        case 'deactivate':
          await query(
            `UPDATE users SET status = 'inactive', is_active = false, updated_at = NOW()
             WHERE id = ANY($1::uuid[])`,
            [userIds]
          );
          break;
        case 'suspend':
          await query(
            `UPDATE users SET status = 'suspended', is_active = false, updated_at = NOW()
             WHERE id = ANY($1::uuid[])`,
            [userIds]
          );
          break;
        case 'changeRole':
          if (!newRole) {
            return res.validationError([{ field: 'newRole', message: 'newRole 不能为空' }]);
          }
          await query(
            `UPDATE users SET role = $2, updated_at = NOW()
             WHERE id = ANY($1::uuid[])`,
            [userIds, newRole]
          );
          break;
        case 'delete':
          await query(
            `UPDATE users SET status = 'inactive', is_active = false, updated_at = NOW()
             WHERE id = ANY($1::uuid[])`,
            [userIds]
          );
          break;
        default:
          return res.validationError([{ field: 'action', message: 'action 无效' }]);
      }

      return res.success(null, '批量操作完成');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async getTests(req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { page, limit, offset } = parsePagination(req);
      const { userId, type, status, priority, search } = req.query as Record<string, string>;
      const filters: string[] = [];
      const params: Array<string | number> = [];

      if (userId) {
        params.push(userId);
        filters.push(`te.user_id = $${params.length}`);
      }
      if (type) {
        params.push(type);
        filters.push(`te.engine_type = $${params.length}`);
      }
      if (status) {
        params.push(status);
        filters.push(`te.status = $${params.length}`);
      }
      if (priority) {
        params.push(priority);
        filters.push(`te.priority = $${params.length}`);
      }
      if (search) {
        params.push(`%${search}%`);
        filters.push(
          `(te.test_name ILIKE $${params.length} OR te.test_url ILIKE $${params.length})`
        );
      }

      const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
      const listSql = `
        SELECT
          te.test_id,
          te.engine_type,
          te.test_url,
          te.user_id,
          te.status,
          te.created_at,
          te.completed_at,
          te.execution_time,
          te.error_message,
          u.username
        FROM test_executions te
        LEFT JOIN users u ON u.id = te.user_id
        ${whereClause}
        ORDER BY te.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

      const countSql = `SELECT COUNT(*)::int AS total FROM test_executions te ${whereClause}`;
      const countResult = await query(countSql, params);
      const listResult = await query(listSql, [...params, limit, offset]);
      const total = Number(countResult.rows[0]?.total) || 0;

      const tests = (listResult.rows || []).map((row: Record<string, unknown>) => ({
        id: row.test_id,
        type: row.engine_type,
        url: row.test_url,
        userId: row.user_id,
        username: row.username,
        status: row.status,
        createdAt: formatDate(row.created_at as string),
        completedAt: formatDate(row.completed_at as string) || undefined,
        duration: row.execution_time ?? undefined,
        error: row.error_message ?? undefined,
      }));

      return res.success(tests, undefined, 200, {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async cancelTest(req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { testId } = req.params as { testId: string };
      const execution = await query('SELECT id FROM test_executions WHERE test_id = $1', [testId]);
      if (execution.rows.length === 0) {
        return res.notFound('测试不存在');
      }
      await query(
        `UPDATE test_executions
         SET status = 'cancelled', completed_at = NOW(), updated_at = NOW(), error_message = $2
         WHERE test_id = $1`,
        [testId, 'Cancelled by admin']
      );
      await query(
        `INSERT INTO test_logs (execution_id, level, message, context, created_at)
         VALUES ($1, 'warn', '测试被管理员取消', $2, NOW())`,
        [execution.rows[0].id, JSON.stringify({ source: 'admin' })]
      );
      return res.success({ testId }, '测试已取消');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async getLogs(req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { page, limit, offset } = parsePagination(req);
      const { search, severity } = req.query as Record<string, string>;
      const filters: string[] = [];
      const params: Array<string | number> = [];

      if (severity) {
        params.push(severity);
        filters.push(`level = $${params.length}`);
      }
      if (search) {
        params.push(`%${search}%`);
        filters.push(`message ILIKE $${params.length}`);
      }

      const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
      const listSql = `
        SELECT id, level, message, created_at, context
        FROM test_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

      const countSql = `SELECT COUNT(*)::int AS total FROM test_logs ${whereClause}`;
      const countResult = await query(countSql, params);
      const listResult = await query(listSql, [...params, limit, offset]);
      const total = Number(countResult.rows[0]?.total) || 0;

      const logs = (listResult.rows || []).map((row: Record<string, unknown>) => ({
        id: row.id,
        action: 'test_log',
        resource: 'test',
        details: row.message,
        ipAddress: '',
        userAgent: '',
        timestamp: formatDate(row.created_at as string),
        severity: row.level || 'info',
        success: true,
      }));

      return res.success(logs, undefined, 200, {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async getSystemConfig(_req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const map = await loadSystemConfigMap();
      return res.success(buildSystemConfig(map));
    } catch (error) {
      const err = error as { code?: string };
      if (err?.code === '42P01') {
        return res.success(buildSystemConfig(new Map()));
      }
      return handleControllerError(res, error);
    }
  }

  async updateSystemConfig(req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const config = req.body as Record<string, Record<string, unknown>>;
      if (!config || typeof config !== 'object') {
        return res.validationError([{ field: 'config', message: 'config 必须是对象' }]);
      }

      const general = config.general || {};
      await upsertConfig('app_name', general.siteName, 'general');
      await upsertConfig('site_description', general.siteDescription, 'general');
      await upsertConfig('admin_email', general.adminEmail, 'general');
      await upsertConfig('timezone', general.timezone, 'general');
      await upsertConfig('language', general.language, 'general');
      await upsertConfig('maintenance_mode', general.maintenanceMode, 'system');
      await upsertConfig('enable_user_registration', general.registrationEnabled, 'features');
      await upsertConfig(
        'email_verification_required',
        general.emailVerificationRequired,
        'features'
      );

      const testing = config.testing || {};
      await upsertConfig('max_concurrent_tests', testing.maxConcurrentTests, 'performance');
      await upsertConfig('max_tests_per_user', testing.maxTestsPerUser, 'performance');
      await upsertConfig(
        'default_test_timeout',
        (Number(testing.testTimeoutMinutes) || 5) * 60000,
        'performance'
      );
      await upsertConfig('data_retention_days', testing.dataRetentionDays, 'performance');
      await upsertConfig('max_upload_size', testing.maxFileUploadSize, 'performance');
      await upsertConfig('screenshot_quality', testing.screenshotQuality, 'performance');
      await upsertConfig('video_recording', testing.videoRecording, 'features');
      await upsertConfig('har_generation', testing.harGeneration, 'features');

      const monitoring = config.monitoring as {
        uptimeCheckInterval?: number;
        alertThresholds?: { responseTime?: number; errorRate?: number; availability?: number };
        retentionPeriods?: {
          rawData?: number;
          aggregatedData?: number;
          screenshots?: number;
          videos?: number;
        };
      };
      await upsertConfig('uptime_check_interval', monitoring?.uptimeCheckInterval, 'monitoring');
      await upsertConfig(
        'alert_response_time',
        monitoring?.alertThresholds?.responseTime,
        'monitoring'
      );
      await upsertConfig('alert_error_rate', monitoring?.alertThresholds?.errorRate, 'monitoring');
      await upsertConfig(
        'alert_availability',
        monitoring?.alertThresholds?.availability,
        'monitoring'
      );
      await upsertConfig('retention_raw_data', monitoring?.retentionPeriods?.rawData, 'monitoring');
      await upsertConfig(
        'retention_aggregated_data',
        monitoring?.retentionPeriods?.aggregatedData,
        'monitoring'
      );
      await upsertConfig(
        'retention_screenshots',
        monitoring?.retentionPeriods?.screenshots,
        'monitoring'
      );
      await upsertConfig('retention_videos', monitoring?.retentionPeriods?.videos, 'monitoring');

      const security = config.security || {};
      await upsertConfig('password_min_length', security.passwordMinLength, 'security');
      await upsertConfig(
        'password_require_special',
        security.passwordRequireSpecialChars,
        'security'
      );
      await upsertConfig('session_timeout_minutes', security.sessionTimeoutMinutes, 'security');
      await upsertConfig('max_login_attempts', security.maxLoginAttempts, 'security');
      await upsertConfig('lockout_duration_minutes', security.lockoutDurationMinutes, 'security');
      await upsertConfig('two_factor_required', security.twoFactorRequired, 'security');
      await upsertConfig('ip_whitelist', security.ipWhitelist || [], 'security');

      const notifications = config.notifications || {};
      await upsertConfig('email_enabled', notifications.emailEnabled, 'notifications');
      await upsertConfig('smtp_host', notifications.smtpHost, 'notifications');
      await upsertConfig('smtp_port', notifications.smtpPort, 'notifications');
      await upsertConfig('smtp_user', notifications.smtpUser, 'notifications');
      await upsertConfig('smtp_password', notifications.smtpPassword, 'notifications');
      await upsertConfig('from_email', notifications.fromEmail, 'notifications');
      await upsertConfig('from_name', notifications.fromName, 'notifications');

      const backup = config.backup || {};
      await upsertConfig('backup_enabled', backup.enabled, 'backup');
      await upsertConfig('backup_frequency', backup.frequency, 'backup');
      await upsertConfig('backup_retention_days', backup.retentionDays, 'backup');
      await upsertConfig('backup_location', backup.location, 'backup');
      await upsertConfig('backup_s3_config', backup.s3Config, 'backup');

      return res.success(null, '系统配置更新成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async getBackups(_req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const result = await query(
        `SELECT id, name, data_types, summary, created_at
         FROM data_backups
         ORDER BY created_at DESC
         LIMIT 100`
      );
      return res.success(result.rows || []);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async createBackup(req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { includeDatabase, includeFiles, includeConfigs } = req.body as {
        includeDatabase?: boolean;
        includeFiles?: boolean;
        includeConfigs?: boolean;
      };
      const name = `backup_${Date.now()}`;
      const dataTypes = [
        includeDatabase ? 'database' : null,
        includeFiles ? 'files' : null,
        includeConfigs ? 'configs' : null,
      ].filter(Boolean);
      await query(
        `INSERT INTO data_backups (id, name, data_types, summary, records, created_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, NOW())`,
        [name, dataTypes, JSON.stringify({}), JSON.stringify({})]
      );
      return res.success(null, '备份创建成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async deleteBackup(req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { backupId } = req.params as { backupId: string };
      await query('DELETE FROM data_backups WHERE id = $1', [backupId]);
      return res.success(null, '备份删除成功');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async restoreBackup(req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const { backupId } = req.params as { backupId: string };
      const exists = await query('SELECT id FROM data_backups WHERE id = $1', [backupId]);
      if (!exists.rows.length) {
        return res.notFound('备份不存在');
      }
      return res.success(null, '备份恢复已触发');
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async getPermissionGroups(_req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      return res.success([]);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  async getDatabaseHealth(_req: AdminRequest, res: ApiResponse, _next: NextFunction) {
    try {
      const health = await dbHealthCheck();
      return res.success(health);
    } catch (error) {
      return handleControllerError(res, error);
    }
  }
}

module.exports = new AdminController();
