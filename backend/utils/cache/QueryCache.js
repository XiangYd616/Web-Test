/**
 * 数据库查询缓存系统
 * 智能缓存数据库查询结果，提升查询性能
 */

const crypto = require('crypto');

class QueryCache {
  constructor(cacheManager, dbPool) {
    this.cache = cacheManager;
    this.db = dbPool;
    this.defaultTTL = 30 * 60; // 30分钟
    this.queryStats = new Map();
    
    // 缓存策略配置
    this.strategies = {
      // 用户数据 - 中等缓存时间
      users: {
        ttl: 60 * 60, // 1小时
        invalidateOn: ['INSERT', 'UPDATE', 'DELETE'],
        tables: ['users']
      },
      
      // 测试结果 - 长缓存时间
      test_results: {
        ttl: 24 * 60 * 60, // 24小时
        invalidateOn: ['UPDATE'],
        tables: ['test_results', 'seo_test_details', 'performance_test_details']
      },
      
      // 系统配置 - 长缓存时间
      system_config: {
        ttl: 2 * 60 * 60, // 2小时
        invalidateOn: ['INSERT', 'UPDATE', 'DELETE'],
        tables: ['system_config']
      },
      
      // 统计数据 - 短缓存时间
      statistics: {
        ttl: 15 * 60, // 15分钟
        invalidateOn: [],
        tables: []
      },
      
      // 引擎状态 - 短缓存时间
      engine_status: {
        ttl: 5 * 60, // 5分钟
        invalidateOn: ['UPDATE'],
        tables: ['engine_status']
      }
    };
  }

  /**
   * 执行缓存查询
   */
  async query(sql, params = [], options = {}) {
    const startTime = Date.now();
    
    try {
      // 生成查询缓存键
      const cacheKey = this.generateQueryKey(sql, params);
      const strategy = this.detectStrategy(sql);
      const config = this.strategies[strategy] || { ttl: this.defaultTTL };
      
      // 检查是否跳过缓存
      if (options.skipCache || this.shouldSkipCache(sql)) {
        return await this.executeQuery(sql, params, startTime, 'skip');
      }
      
      // 尝试从缓存获取
      const cachedResult = await this.cache.get('api_responses', cacheKey);
      
      if (cachedResult && !options.refreshCache) {
        // 缓存命中
        this.recordQueryStats(sql, Date.now() - startTime, 'hit');
        return {
          rows: cachedResult.rows,
          rowCount: cachedResult.rowCount,
          cached: true,
          cacheKey,
          executionTime: Date.now() - startTime
        };
      }
      
      // 缓存未命中，执行查询
      const result = await this.executeQuery(sql, params, startTime, 'miss');
      
      // 缓存查询结果
      if (this.shouldCacheResult(sql, result)) {
        const cacheData = {
          rows: result.rows,
          rowCount: result.rowCount,
          timestamp: new Date().toISOString(),
          sql: this.sanitizeSQL(sql)
        };
        
        await this.cache.set('api_responses', cacheKey, cacheData, config.ttl);
      }
      
      return {
        ...result,
        cached: false,
        cacheKey
      };
      
    } catch (error) {
      this.recordQueryStats(sql, Date.now() - startTime, 'error');
      throw error;
    }
  }

  /**
   * 执行数据库查询
   */
  async executeQuery(sql, params, startTime, cacheStatus) {
    const result = await this.db.query(sql, params);
    const executionTime = Date.now() - startTime;
    
    this.recordQueryStats(sql, executionTime, cacheStatus);
    
    return {
      rows: result.rows,
      rowCount: result.rowCount,
      executionTime
    };
  }

  /**
   * 生成查询缓存键
   */
  generateQueryKey(sql, params) {
    // 标准化SQL（移除多余空格、统一大小写等）
    const normalizedSQL = this.normalizeSQL(sql);
    
    // 创建参数字符串
    const paramString = params.length > 0 ? JSON.stringify(params) : '';
    
    // 生成哈希
    const content = `${normalizedSQL}|${paramString}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * 标准化SQL语句
   */
  normalizeSQL(sql) {
    return sql
      .replace(/\s+/g, ' ') // 合并多个空格
      .replace(/\s*([(),])\s*/g, '$1') // 移除括号和逗号周围的空格
      .trim()
      .toLowerCase();
  }

  /**
   * 清理SQL语句（用于日志）
   */
  sanitizeSQL(sql) {
    // 移除敏感信息，只保留查询结构
    return sql.replace(/\$\d+/g, '?').substring(0, 200);
  }

  /**
   * 检测查询策略
   */
  detectStrategy(sql) {
    const normalizedSQL = sql.toLowerCase();
    
    // 检查表名匹配
    for (const [strategy, config] of Object.entries(this.strategies)) {
      for (const table of config.tables) {
        if (normalizedSQL.includes(table)) {
          return strategy;
        }
      }
    }
    
    // 根据查询类型检测
    if (normalizedSQL.includes('test_results')) return 'test_results';
    if (normalizedSQL.includes('users')) return 'users';
    if (normalizedSQL.includes('system_config')) return 'system_config';
    if (normalizedSQL.includes('engine_status')) return 'engine_status';
    if (normalizedSQL.includes('count(') || normalizedSQL.includes('sum(') || normalizedSQL.includes('avg(')) {
      return 'statistics';
    }
    
    return 'default';
  }

  /**
   * 检查是否应该跳过缓存
   */
  shouldSkipCache(sql) {
    const normalizedSQL = sql.toLowerCase();
    
    // 跳过写操作
    if (normalizedSQL.startsWith('insert') || 
        normalizedSQL.startsWith('update') || 
        normalizedSQL.startsWith('delete') ||
        normalizedSQL.startsWith('create') ||
        normalizedSQL.startsWith('drop') ||
        normalizedSQL.startsWith('alter')) {
      return true;
    }
    
    // 跳过事务相关语句
    if (normalizedSQL.includes('begin') || 
        normalizedSQL.includes('commit') || 
        normalizedSQL.includes('rollback')) {
      return true;
    }
    
    // 跳过实时性要求高的查询
    if (normalizedSQL.includes('now()') || 
        normalizedSQL.includes('current_timestamp') ||
        normalizedSQL.includes('random()')) {
      return true;
    }
    
    return false;
  }

  /**
   * 检查是否应该缓存结果
   */
  shouldCacheResult(sql, result) {
    // 不缓存空结果
    if (!result.rows || result.rows.length === 0) {
      return false;
    }
    
    // 不缓存过大的结果集
    if (result.rows.length > 1000) {
      return false;
    }
    
    // 不缓存包含敏感信息的查询
    const normalizedSQL = sql.toLowerCase();
    if (normalizedSQL.includes('password') || 
        normalizedSQL.includes('token') ||
        normalizedSQL.includes('secret')) {
      return false;
    }
    
    return true;
  }

  /**
   * 缓存失效
   */
  async invalidateCache(operation, tableName) {
    try {
      // 找到受影响的策略
      const affectedStrategies = [];
      
      for (const [strategy, config] of Object.entries(this.strategies)) {
        if (config.tables.includes(tableName) && 
            config.invalidateOn.includes(operation)) {
          affectedStrategies.push(strategy);
        }
      }
      
      // 失效相关缓存
      for (const strategy of affectedStrategies) {
        await this.cache.deletePattern('api_responses', `*${strategy}*`);
      }
      
      console.log(`🗑️ 缓存失效: ${operation} ${tableName}, 影响策略: ${affectedStrategies.join(', ')}`);
      
    } catch (error) {
      console.error('缓存失效失败:', error);
    }
  }

  /**
   * 批量查询缓存
   */
  async batchQuery(queries, options = {}) {
    const results = [];
    const promises = [];
    
    for (const query of queries) {
      const { sql, params = [] } = query;
      promises.push(this.query(sql, params, options));
    }
    
    const batchResults = await Promise.all(promises);
    
    return batchResults.map((result, index) => ({
      ...result,
      queryIndex: index,
      sql: queries[index].sql
    }));
  }

  /**
   * 预热查询缓存
   */
  async warmupQueries(queries) {
    console.log('🔥 开始查询缓存预热...');
    
    const results = [];
    
    for (const query of queries) {
      try {
        const { sql, params = [], description } = query;
        const result = await this.query(sql, params, { refreshCache: true });
        
        results.push({
          description: description || sql.substring(0, 50),
          success: true,
          cached: result.cached,
          executionTime: result.executionTime
        });
        
      } catch (error) {
        results.push({
          description: query.description || query.sql.substring(0, 50),
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ 查询缓存预热完成: ${successCount}/${results.length}`);
    
    return results;
  }

  /**
   * 记录查询统计
   */
  recordQueryStats(sql, executionTime, status) {
    const queryType = this.getQueryType(sql);
    const key = `${queryType}:${status}`;
    
    if (!this.queryStats.has(key)) {
      this.queryStats.set(key, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0
      });
    }
    
    const stats = this.queryStats.get(key);
    stats.count++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, executionTime);
    stats.maxTime = Math.max(stats.maxTime, executionTime);
  }

  /**
   * 获取查询类型
   */
  getQueryType(sql) {
    const normalizedSQL = sql.toLowerCase().trim();
    
    if (normalizedSQL.startsWith('select')) return 'SELECT';
    if (normalizedSQL.startsWith('insert')) return 'INSERT';
    if (normalizedSQL.startsWith('update')) return 'UPDATE';
    if (normalizedSQL.startsWith('delete')) return 'DELETE';
    
    return 'OTHER';
  }

  /**
   * 获取查询统计信息
   */
  getQueryStats() {
    const stats = {};
    
    for (const [key, value] of this.queryStats.entries()) {
      stats[key] = {
        ...value,
        minTime: value.minTime === Infinity ? 0 : value.minTime
      };
    }
    
    return {
      queries: stats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 清空查询统计
   */
  clearQueryStats() {
    this.queryStats.clear();
  }
}

module.exports = QueryCache;
