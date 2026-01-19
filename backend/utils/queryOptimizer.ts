/**
 * 数据库查询优化器
 * 提供查询性能分析、优化建议和自动优化功能
 */

import type { Pool, QueryResult } from 'pg';

const { getPool } = require('../config/database');
const Logger = require('./logger');

type OptimizedQueryOptions = {
  enableCache?: boolean;
  cacheTimeout?: number;
  enableProfiling?: boolean;
  operationName?: string;
};

type BatchQueryOptions = {
  enableTransaction?: boolean;
  enableParallel?: boolean;
  maxConcurrency?: number;
};

type BatchQuery = {
  sql: string;
  params?: unknown[];
  options?: OptimizedQueryOptions;
};

type QueryPlanIssue = {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
};

type QueryPlanAnalysis = {
  plan: Record<string, unknown>;
  executionTime: number;
  planningTime: number;
  issues: QueryPlanIssue[];
} | null;

type QueryCacheEntry = {
  data: QueryResult<unknown>;
  timestamp: number;
  timeout: number;
};

type PerformanceStats = {
  count: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  totalRows: number;
};

class QueryOptimizer {
  private queryCache = new Map<string, QueryCacheEntry>();
  private performanceStats = new Map<string, PerformanceStats>();
  private slowQueryThreshold = 1000; // 1秒
  private cacheTimeout = 300000; // 5分钟

  /**
   * 执行优化的查询
   */
  async executeOptimizedQuery(
    sql: string,
    params: unknown[] = [],
    options: OptimizedQueryOptions = {}
  ) {
    const {
      enableCache = true,
      cacheTimeout = this.cacheTimeout,
      enableProfiling = true,
      operationName = 'optimized_query',
    } = options;

    const startTime = Date.now();
    const queryHash = this.generateQueryHash(sql, params);

    try {
      // 检查缓存
      if (enableCache) {
        const cached = this.getFromCache(queryHash);
        if (cached) {
          Logger.debug('Query cache hit', { queryHash, operationName });
          return cached;
        }
      }

      // 分析查询计划
      if (enableProfiling) {
        await this.analyzeQueryPlan(sql, params);
      }

      // 执行查询
      const pool: Pool = getPool();
      const result = await pool.query(sql, params);
      const duration = Date.now() - startTime;

      // 记录性能统计
      this.recordPerformanceStats(queryHash, duration, result.rowCount);

      // 缓存结果
      if (enableCache && result.rowCount > 0) {
        this.setCache(queryHash, result, cacheTimeout);
      }

      // 检查慢查询
      if (duration > this.slowQueryThreshold) {
        await this.handleSlowQuery(sql, params, duration, operationName);
      }

      Logger.db('OPTIMIZED_QUERY', operationName, duration, {
        rowCount: result.rowCount,
        cached: false,
        queryHash,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error(`Optimized query failed: ${operationName}`, error, {
        duration,
        sql: `${sql.substring(0, 100)}...`,
        params,
        queryHash,
      });
      throw error;
    }
  }

  /**
   * 批量查询优化
   */
  async executeBatchQueries(queries: BatchQuery[], options: BatchQueryOptions = {}) {
    const { enableTransaction = true, enableParallel = false, maxConcurrency = 5 } = options;

    if (enableTransaction && !enableParallel) {
      return this.executeBatchInTransaction(queries);
    }
    if (enableParallel) {
      return this.executeBatchInParallel(queries, maxConcurrency);
    }
    return this.executeBatchSequential(queries);
  }

  /**
   * 在事务中执行批量查询
   */
  async executeBatchInTransaction(queries: BatchQuery[]) {
    const pool: Pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const results = [] as Array<QueryResult<unknown>>;

      for (const query of queries) {
        const result = await client.query(query.sql, query.params || []);
        results.push(result);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 并行执行批量查询
   */
  async executeBatchInParallel(queries: BatchQuery[], maxConcurrency: number) {
    const results: Array<QueryResult<unknown>> = [];

    for (let i = 0; i < queries.length; i += maxConcurrency) {
      const batch = queries.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(query =>
        this.executeOptimizedQuery(query.sql, query.params, query.options)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 顺序执行批量查询
   */
  async executeBatchSequential(queries: BatchQuery[]) {
    const results: Array<QueryResult<unknown>> = [];

    for (const query of queries) {
      const result = await this.executeOptimizedQuery(query.sql, query.params, query.options);
      results.push(result);
    }

    return results;
  }

  /**
   * 分析查询计划
   */
  async analyzeQueryPlan(sql: string, params: unknown[]): Promise<QueryPlanAnalysis> {
    try {
      const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
      const pool: Pool = getPool();
      const result = await pool.query(explainSql, params);

      const plan = result.rows[0]['QUERY PLAN'][0];
      const executionTime = plan['Execution Time'];
      const planningTime = plan['Planning Time'];

      // 检查潜在问题
      const issues = this.detectQueryIssues(plan);

      if (issues.length > 0) {
        Logger.warn('Query performance issues detected', {
          sql: `${sql.substring(0, 100)}...`,
          executionTime,
          planningTime,
          issues,
        });
      }

      return { plan, executionTime, planningTime, issues };
    } catch (error) {
      Logger.debug('Query plan analysis failed', { error: (error as Error).message });
      return null;
    }
  }

  /**
   * 检测查询问题
   */
  detectQueryIssues(plan: Record<string, any>) {
    const issues: QueryPlanIssue[] = [];

    // 递归检查查询计划节点
    const checkNode = (node: Record<string, any>) => {
      // 检查顺序扫描
      if (node['Node Type'] === 'Seq Scan' && node['Actual Rows'] > 1000) {
        issues.push({
          type: 'sequential_scan',
          severity: 'medium',
          message: `Sequential scan on ${node['Relation Name']} with ${node['Actual Rows']} rows`,
          suggestion: 'Consider adding an index',
        });
      }

      // 检查嵌套循环连接
      if (node['Node Type'] === 'Nested Loop' && node['Actual Rows'] > 10000) {
        issues.push({
          type: 'nested_loop',
          severity: 'high',
          message: `Nested loop with ${node['Actual Rows']} rows`,
          suggestion: 'Consider using hash join or merge join',
        });
      }

      // 检查排序操作
      if (node['Node Type'] === 'Sort' && node['Sort Method'] === 'external merge') {
        issues.push({
          type: 'external_sort',
          severity: 'medium',
          message: 'External sort detected (using disk)',
          suggestion: 'Increase work_mem or add index for ordering',
        });
      }

      // 递归检查子节点
      if (node['Plans']) {
        node['Plans'].forEach(checkNode);
      }
    };

    checkNode(plan['Plan']);
    return issues;
  }

  /**
   * 处理慢查询
   */
  async handleSlowQuery(sql: string, params: unknown[], duration: number, operationName: string) {
    Logger.warn('Slow query detected', {
      operationName,
      duration,
      sql: `${sql.substring(0, 200)}...`,
      params: params.length > 0 ? '[PARAMS]' : '[]',
    });

    // 生成优化建议
    const suggestions = await this.generateOptimizationSuggestions(sql);

    if (suggestions.length > 0) {
      Logger.info('Query optimization suggestions', {
        operationName,
        suggestions,
      });
    }
  }

  /**
   * 生成优化建议
   */
  async generateOptimizationSuggestions(sql: string) {
    const suggestions: Array<{
      type: string;
      message: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];
    const sqlLower = sql.toLowerCase();

    // 检查是否缺少WHERE子句
    if (sqlLower.includes('select') && !sqlLower.includes('where') && !sqlLower.includes('limit')) {
      suggestions.push({
        type: 'missing_where',
        message: 'Consider adding WHERE clause to limit result set',
        priority: 'high',
      });
    }

    // 检查是否使用了SELECT *
    if (sqlLower.includes('select *')) {
      suggestions.push({
        type: 'select_star',
        message: 'Avoid SELECT *, specify only needed columns',
        priority: 'medium',
      });
    }

    // 检查是否有ORDER BY但没有LIMIT
    if (sqlLower.includes('order by') && !sqlLower.includes('limit')) {
      suggestions.push({
        type: 'order_without_limit',
        message: 'ORDER BY without LIMIT may be inefficient',
        priority: 'medium',
      });
    }

    // 检查子查询
    if (sqlLower.includes('in (select')) {
      suggestions.push({
        type: 'subquery_in',
        message: 'Consider using JOIN instead of IN subquery',
        priority: 'medium',
      });
    }

    return suggestions;
  }

  /**
   * 生成查询哈希
   */
  generateQueryHash(sql: string, params: unknown[]) {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    const paramStr = JSON.stringify(params);
    return require('crypto')
      .createHash('md5')
      .update(normalizedSql + paramStr)
      .digest('hex');
  }

  /**
   * 缓存操作
   */
  getFromCache(queryHash: string) {
    const cached = this.queryCache.get(queryHash);
    if (cached && Date.now() - cached.timestamp < cached.timeout) {
      return cached.data;
    }
    this.queryCache.delete(queryHash);
    return null;
  }

  setCache(queryHash: string, data: QueryResult<unknown>, timeout: number) {
    this.queryCache.set(queryHash, {
      data,
      timestamp: Date.now(),
      timeout,
    });

    // 限制缓存大小
    if (this.queryCache.size > 1000) {
      const oldestKey = this.queryCache.keys().next().value as string;
      this.queryCache.delete(oldestKey);
    }
  }

  /**
   * 记录性能统计
   */
  recordPerformanceStats(queryHash: string, duration: number, rowCount: number) {
    const stats: PerformanceStats = this.performanceStats.get(queryHash) || {
      count: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      totalRows: 0,
    };

    stats.count += 1;
    stats.totalDuration += duration;
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.totalRows += rowCount;

    this.performanceStats.set(queryHash, stats);
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    const stats: Array<{
      queryHash: string;
      count: number;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      avgRows: number;
      totalDuration: number;
    }> = [];

    for (const [queryHash, stat] of this.performanceStats.entries()) {
      stats.push({
        queryHash,
        count: stat.count,
        avgDuration: stat.totalDuration / stat.count,
        minDuration: stat.minDuration,
        maxDuration: stat.maxDuration,
        avgRows: stat.totalRows / stat.count,
        totalDuration: stat.totalDuration,
      });
    }

    return stats.sort((a, b) => b.totalDuration - a.totalDuration);
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.queryCache.clear();
    Logger.info('Query cache cleared');
  }

  /**
   * 清理性能统计
   */
  clearStats() {
    this.performanceStats.clear();
    Logger.info('Performance stats cleared');
  }
}

// 创建全局实例
const queryOptimizer = new QueryOptimizer();

export { QueryOptimizer, queryOptimizer };

module.exports = {
  QueryOptimizer,
  queryOptimizer,

  // 便捷方法
  executeOptimizedQuery: (sql: string, params?: unknown[], options?: OptimizedQueryOptions) =>
    queryOptimizer.executeOptimizedQuery(sql, params, options),

  executeBatchQueries: (queries: BatchQuery[], options?: BatchQueryOptions) =>
    queryOptimizer.executeBatchQueries(queries, options),

  getPerformanceStats: () => queryOptimizer.getPerformanceStats(),

  clearCache: () => queryOptimizer.clearCache(),
};
