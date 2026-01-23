/**
 * 查询优化中间件
 * 提供查询性能监控、慢查询检测和优化建议
 */

import type { NextFunction, Request, Response } from 'express';

const DatabasePerformanceOptimizer = require('../services/database/performanceOptimizer');

interface QueryOptions {
  timeout?: number;
  cache?: boolean;
  analyze?: boolean;
}

interface QueryRequest {
  sql: string;
  params?: unknown[];
  options?: QueryOptions;
}

interface QueryResult {
  rows: unknown[];
  rowCount: number;
  queryTime: number;
  optimized: boolean;
}

interface DatabasePool {
  connect: () => Promise<DatabaseClient>;
  totalCount?: number;
  idleCount?: number;
  waitingCount?: number;
}

interface DatabaseClient {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult>;
  pool: DatabasePool;
  release?: () => void;
}

type TransactionClient = DatabaseClient & {
  optimizedQuery: (sql: string, params?: unknown[]) => Promise<QueryResult>;
  release: () => void;
};

type QueryPlanAnalysis = {
  analysis?: { issues: unknown[] };
  suggestions?: unknown[];
};

type PerformanceOptimizer = {
  initialize: () => Promise<void>;
  recordSlowQuery: (sql: string, duration: number, params?: unknown[]) => void;
  analyzeQueryPlan: (sql: string, params?: unknown[]) => Promise<QueryPlanAnalysis>;
};

type QueryStats = {
  totalQueries: number;
  totalDuration: number;
  slowQueries: number;
  errorQueries: number;
  queries: Array<{
    sql: string;
    duration: number;
    timestamp: number;
    success: boolean;
  }>;
};

interface OptimizedRequest extends Request {
  db: DatabaseClient;
  optimizedQuery: (sql: string, params?: unknown[], options?: QueryOptions) => Promise<QueryResult>;
  batchQuery: (queries: QueryRequest[]) => Promise<QueryResult[]>;
  transaction: (callback: (client: DatabaseClient) => Promise<unknown>) => Promise<unknown>;
  queryStats?: QueryStats;
}

// 全局性能优化器实例
let performanceOptimizer: PerformanceOptimizer | null = null;

/**
 * 初始化性能优化器
 */
async function initializeOptimizer() {
  if (!performanceOptimizer) {
    performanceOptimizer = new DatabasePerformanceOptimizer() as PerformanceOptimizer;
    await performanceOptimizer.initialize();
  }
  return performanceOptimizer;
}

/**
 * 查询性能监控中间件
 */
function queryPerformanceMiddleware() {
  return async (req: OptimizedRequest, res: Response, next: NextFunction) => {
    // 为请求对象添加优化查询方法
    req.optimizedQuery = async (
      sql: string,
      params: unknown[] = [],
      _options: QueryOptions = {}
    ) => {
      const startTime = Date.now();

      try {
        // 确保优化器已初始化
        const optimizer = await initializeOptimizer();

        // 执行查询
        const result = await req.db.query(sql, params);

        const duration = Date.now() - startTime;

        // 记录查询性能
        optimizer.recordSlowQuery(sql, duration, params);

        // 在开发环境分析查询计划
        if (process.env.NODE_ENV === 'development' && duration > 100) {
          const analysis = await optimizer.analyzeQueryPlan(sql, params);
          if (analysis?.analysis?.issues?.length) {
            console.warn('查询性能问题:', {
              sql: sql.substring(0, 100) + '...',
              duration: `${duration}ms`,
              issues: analysis.analysis.issues,
              suggestions: analysis.suggestions,
            });
          }
        }

        return {
          ...result,
          queryTime: duration,
          optimized: true,
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error('查询执行失败:', {
          sql: sql.substring(0, 100) + '...',
          duration: `${duration}ms`,
          error: (error as Error).message,
        });
        throw error;
      }
    };

    // 为请求对象添加批量查询方法
    req.batchQuery = async (queries: QueryRequest[], _options: QueryOptions = {}) => {
      const results: QueryResult[] = [];

      try {
        for (const query of queries) {
          const result = await req.optimizedQuery(query.sql, query.params, query.options);
          results.push(result);
        }

        return results;
      } catch (error) {
        console.error('批量查询失败:', error);
        throw error;
      }
    };

    // 为请求对象添加事务方法
    req.transaction = async (callback: (client: DatabaseClient) => Promise<unknown>) => {
      const client = await req.db.pool.connect();

      try {
        await client.query('BEGIN');

        // 为事务客户端添加优化查询方法
        const transactionClient = client as TransactionClient;
        transactionClient.optimizedQuery = async (sql: string, params: unknown[] = []) => {
          const startTime = Date.now();
          const result = await client.query(sql, params);
          const duration = Date.now() - startTime;

          // 记录事务中的查询性能
          const optimizer = await initializeOptimizer();
          optimizer.recordSlowQuery(sql, duration, params);

          return { ...result, queryTime: duration };
        };

        const result = await callback(transactionClient);
        await client.query('COMMIT');

        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        if (client.release) {
          client.release();
        }
      }
    };

    next();
  };
}

/**
 * 慢查询检测中间件
 */
function slowQueryDetection(
  options: {
    threshold?: number;
    logLevel?: 'warn' | 'error';
    includeStackTrace?: boolean;
  } = {}
) {
  const { threshold = 1000, logLevel = 'warn', includeStackTrace = false } = options;

  return (req: OptimizedRequest, res: Response, next: NextFunction) => {
    const originalQuery = req.db.query;

    req.db.query = async (sql: string, params?: unknown[]) => {
      const startTime = Date.now();

      try {
        const result = await originalQuery.call(req.db, sql, params);
        const duration = Date.now() - startTime;

        if (duration > threshold) {
          const logData: {
            sql: string;
            params: unknown[] | undefined;
            duration: string;
            threshold: string;
            url: string;
            method: string;
            ip: string | undefined;
            userAgent: string | undefined;
            stack?: string;
          } = {
            sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
            params,
            duration: `${duration}ms`,
            threshold: `${threshold}ms`,
            url: req.url,
            method: req.method,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          };

          if (includeStackTrace) {
            logData.stack = new Error().stack;
          }

          if (logLevel === 'error') {
            console.error('🐌 慢查询检测:', logData);
          } else {
            console.warn('🐌 慢查询检测:', logData);
          }
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error('查询失败:', {
          sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
          params,
          duration: `${duration}ms`,
          error: (error as Error).message,
        });
        throw error;
      }
    };

    next();
  };
}

/**
 * 查询缓存中间件
 */
function queryCache(
  options: {
    ttl?: number;
    maxSize?: number;
    keyGenerator?: (req: Request) => string;
  } = {}
) {
  const { ttl = 300000, maxSize = 1000, keyGenerator } = options; // 默认5分钟

  const cache = new Map<string, { data: unknown; timestamp: number }>();

  return (req: OptimizedRequest, res: Response, next: NextFunction) => {
    const originalQuery = req.db.query;

    req.db.query = async (sql: string, params?: unknown[]) => {
      // 只缓存SELECT查询
      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        return originalQuery.call(req.db, sql, params);
      }

      const cacheKey = keyGenerator ? keyGenerator(req) : `${sql}:${JSON.stringify(params || [])}`;

      // 检查缓存
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.data as QueryResult;
      }

      // 执行查询
      const result = await originalQuery.call(req.db, sql, params);

      // 缓存结果
      if (cache.size >= maxSize) {
        // 清理最旧的缓存项
        const oldestKey = Array.from(cache.keys())[0];
        cache.delete(oldestKey);
      }

      cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    };

    next();
  };
}

/**
 * 查询统计中间件
 */
function queryStatistics() {
  const stats: QueryStats = {
    totalQueries: 0,
    totalDuration: 0,
    slowQueries: 0,
    errorQueries: 0,
    queries: [],
  };

  return (req: OptimizedRequest, res: Response, next: NextFunction) => {
    const originalQuery = req.db.query;

    req.db.query = async (sql: string, params?: unknown[]) => {
      const startTime = Date.now();
      stats.totalQueries++;

      try {
        const result = await originalQuery.call(req.db, sql, params);
        const duration = Date.now() - startTime;

        stats.totalDuration += duration;
        if (duration > 1000) {
          stats.slowQueries++;
        }

        stats.queries.push({
          sql: sql.substring(0, 100),
          duration,
          timestamp: Date.now(),
          success: true,
        });

        // 只保留最近100条记录
        if (stats.queries.length > 100) {
          stats.queries = stats.queries.slice(-100);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        stats.totalDuration += duration;
        stats.errorQueries++;

        stats.queries.push({
          sql: sql.substring(0, 100),
          duration,
          timestamp: Date.now(),
          success: false,
        });

        throw error;
      }
    };

    // 添加统计信息到请求对象
    req.queryStats = stats;

    next();
  };
}

/**
 * 查询优化建议中间件
 */
function queryOptimizationSuggestions() {
  return (req: OptimizedRequest, res: Response, next: NextFunction) => {
    const originalQuery = req.db.query;

    req.db.query = async (sql: string, params?: unknown[]) => {
      const startTime = Date.now();
      const result = await originalQuery.call(req.db, sql, params);
      const duration = Date.now() - startTime;

      // 分析查询并提供建议
      if (process.env.NODE_ENV === 'development') {
        const suggestions = analyzeQuery(sql, duration);
        if (suggestions.length > 0) {
          console.log('💡 查询优化建议:', suggestions);
        }
      }

      return result;
    };

    next();
  };
}

/**
 * 分析查询并提供优化建议
 */
function analyzeQuery(sql: string, duration: number): string[] {
  const suggestions: string[] = [];
  const normalizedSql = sql.toUpperCase().trim();

  // 检查是否缺少WHERE条件
  if (
    normalizedSql.includes('SELECT') &&
    !normalizedSql.includes('WHERE') &&
    !normalizedSql.includes('LIMIT')
  ) {
    suggestions.push('考虑添加WHERE条件或LIMIT子句来限制结果集大小');
  }

  // 检查是否使用了SELECT *
  if (normalizedSql.includes('SELECT *')) {
    suggestions.push('避免使用SELECT *，只查询需要的列');
  }

  // 检查是否有ORDER BY但没有索引提示
  if (normalizedSql.includes('ORDER BY') && !normalizedSql.includes('INDEX')) {
    suggestions.push('ORDER BY子句可能需要索引支持');
  }

  // 检查执行时间
  if (duration > 500) {
    suggestions.push(`查询耗时${duration}ms，考虑优化或添加索引`);
  }

  // 检查子查询
  if (normalizedSql.includes('(SELECT')) {
    suggestions.push('考虑将子查询重写为JOIN');
  }

  return suggestions;
}

/**
 * 连接池监控中间件
 */
function connectionPoolMonitoring() {
  return (req: OptimizedRequest, res: Response, next: NextFunction) => {
    // 添加连接池状态检查
    const originalQuery = req.db.query;

    req.db.query = async (sql: string, params?: unknown[]) => {
      const pool = req.db.pool;

      // 记录连接池状态（如果可用）
      if (pool.totalCount !== undefined) {
        console.log('连接池状态:', {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        });
      }

      return originalQuery.call(req.db, sql, params);
    };

    next();
  };
}

export {
  analyzeQuery,
  connectionPoolMonitoring,
  initializeOptimizer,
  queryCache,
  queryOptimizationSuggestions,
  queryPerformanceMiddleware,
  queryStatistics,
  slowQueryDetection,
};

module.exports = {
  queryPerformanceMiddleware,
  slowQueryDetection,
  queryCache,
  queryStatistics,
  queryOptimizationSuggestions,
  connectionPoolMonitoring,
  initializeOptimizer,
  analyzeQuery,
};
