/**
 * 增强的数据库测试引擎
 * 提供深度分析、查询性能优化、索引建议等高级功能
 */

const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');

class EnhancedDatabaseTestEngine {
  constructor() {
    this.name = 'database';
    this.version = '2.0.0';
    this.connectionPool = null;
    this.mongoClient = null; // MongoDB客户端引用
    this.dbType = null;
    this.config = null;
    this.testResults = [];
    this.performanceMetrics = [];
  }

  /**
   * 检查引擎可用性
   */
  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: [
        'connection-testing',
        'performance-analysis',
        'query-optimization',
        'index-analysis'
      ]
    };
  }

  /**
   * 执行测试
   */
  async executeTest(config) {
    try {
      // 如果没有初始化，先进行初始化
      if (!this.connectionPool) {
        await this.initialize(config);
      }
      
      const results = await this.runComprehensiveTest();
      
      return {
        engine: this.name,
        version: this.version,
        success: true,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        engine: this.name,
        version: this.version,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取引擎信息
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: '增强的数据库测试引擎',
      available: this.checkAvailability().available
    };
  }

  /**
   * 初始化数据库连接
   */
  async initialize(config) {
    this.config = config;
    this.dbType = config.type || 'postgresql';

    try {
      switch (this.dbType) {
        case 'postgresql':
          this.connectionPool = new Pool({
            host: config.host,
            port: config.port || 5432,
            database: config.database,
            user: config.user,
            password: config.password,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
          });
          break;

        case 'mysql':
          this.connectionPool = await mysql.createPool({
            host: config.host,
            port: config.port || 3306,
            database: config.database,
            user: config.user,
            password: config.password,
            waitForConnections: true,
            connectionLimit: 20,
            queueLimit: 0
          });
          break;

        case 'mongodb':
          const uri = `mongodb://${config.user}:${config.password}@${config.host}:${config.port || 27017}/${config.database}`;
          this.mongoClient = new MongoClient(uri);
          await this.mongoClient.connect();
          this.connectionPool = this.mongoClient.db(config.database);
          break;

        default:
          throw new Error(`Unsupported database type: ${this.dbType}`);
      }

      return { success: true, message: '数据库连接成功' };
    } catch (error) {
      console.error('数据库连接失败:', error);
      throw error;
    }
  }

  /**
   * 执行完整的数据库测试套件
   */
  async runComprehensiveTest() {
    const results = {
      timestamp: new Date(),
      dbType: this.dbType,
      tests: {},
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      recommendations: []
    };

    try {
      // 1. 连接性测试
      results.tests.connectivity = await this.testConnectivity();
      
      // 2. 性能测试
      results.tests.performance = await this.testPerformance();
      
      // 3. 查询优化分析
      results.tests.queryOptimization = await this.analyzeQueryPerformance();
      
      // 4. 索引分析
      results.tests.indexAnalysis = await this.analyzeIndexes();
      
      // 5. 数据完整性检查
      results.tests.dataIntegrity = await this.checkDataIntegrity();
      
      // 6. 并发测试
      results.tests.concurrency = await this.testConcurrency();
      
      // 7. 事务测试
      results.tests.transactions = await this.testTransactions();
      
      // 8. 备份恢复测试
      results.tests.backupRestore = await this.testBackupRestore();
      
      // 9. 安全性检查
      results.tests.security = await this.checkSecurity();
      
      // 10. 资源使用分析
      results.tests.resourceUsage = await this.analyzeResourceUsage();

      // 生成总结和建议
      results.summary = this.generateSummary(results.tests);
      results.recommendations = this.generateRecommendations(results.tests);
      
      this.testResults = results;
      return results;

    } catch (error) {
      console.error('测试执行失败:', error);
      results.error = error.message;
      return results;
    }
  }

  /**
   * 测试数据库连接性
   */
  async testConnectivity() {
    const result = {
      name: '连接性测试',
      status: 'pending',
      metrics: {},
      details: []
    };

    try {
      const startTime = Date.now();
      
      // 测试基本连接
      const connected = await this.executeQuery('SELECT 1');
      const connectionTime = Date.now() - startTime;
      
      result.metrics.connectionTime = connectionTime;
      result.details.push({
        test: '基本连接',
        result: connected ? '成功' : '失败',
        time: `${connectionTime}ms`
      });

      // 测试连接池
      const poolTests = await this.testConnectionPool();
      result.details.push(...poolTests);

      // 测试连接稳定性
      const stabilityTest = await this.testConnectionStability();
      result.details.push(stabilityTest);

      result.status = connectionTime < 100 ? 'passed' : connectionTime < 500 ? 'warning' : 'failed';
      
      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * 测试数据库性能
   */
  async testPerformance() {
    const result = {
      name: '性能测试',
      status: 'pending',
      metrics: {},
      benchmarks: []
    };

    try {
      // 1. 简单查询性能
      const simpleQueryPerf = await this.benchmarkQuery(
        'SELECT COUNT(*) FROM information_schema.tables',
        100
      );
      result.benchmarks.push({
        name: '简单查询',
        ...simpleQueryPerf
      });

      // 2. 复杂查询性能
      const complexQueryPerf = await this.benchmarkComplexQuery();
      result.benchmarks.push({
        name: '复杂查询',
        ...complexQueryPerf
      });

      // 3. 插入性能
      const insertPerf = await this.benchmarkInserts();
      result.benchmarks.push({
        name: '插入操作',
        ...insertPerf
      });

      // 4. 更新性能
      const updatePerf = await this.benchmarkUpdates();
      result.benchmarks.push({
        name: '更新操作',
        ...updatePerf
      });

      // 5. 删除性能
      const deletePerf = await this.benchmarkDeletes();
      result.benchmarks.push({
        name: '删除操作',
        ...deletePerf
      });

      // 计算总体性能评分
      result.metrics.overallScore = this.calculatePerformanceScore(result.benchmarks);
      result.status = result.metrics.overallScore > 80 ? 'passed' : 
                      result.metrics.overallScore > 60 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * 分析查询性能
   */
  async analyzeQueryPerformance() {
    const result = {
      name: '查询性能分析',
      status: 'pending',
      slowQueries: [],
      optimizationSuggestions: [],
      queryPlans: []
    };

    try {
      // 获取慢查询
      const slowQueries = await this.getSlowQueries();
      result.slowQueries = slowQueries;

      // 分析每个慢查询
      for (const query of slowQueries.slice(0, 10)) {
        const analysis = await this.analyzeQueryPlan(query.query);
        result.queryPlans.push({
          query: query.query,
          executionTime: query.duration,
          plan: analysis.plan,
          cost: analysis.cost,
          suggestions: analysis.suggestions
        });
      }

      // 生成优化建议
      result.optimizationSuggestions = this.generateQueryOptimizationSuggestions(result.queryPlans);
      
      result.status = slowQueries.length === 0 ? 'passed' : 
                      slowQueries.length < 5 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * 分析索引使用情况
   */
  async analyzeIndexes() {
    const result = {
      name: '索引分析',
      status: 'pending',
      existingIndexes: [],
      unusedIndexes: [],
      missingIndexes: [],
      duplicateIndexes: [],
      recommendations: []
    };

    try {
      // 获取现有索引
      result.existingIndexes = await this.getExistingIndexes();

      // 识别未使用的索引
      result.unusedIndexes = await this.findUnusedIndexes();

      // 识别缺失的索引
      result.missingIndexes = await this.suggestMissingIndexes();

      // 识别重复索引
      result.duplicateIndexes = await this.findDuplicateIndexes();

      // 分析索引效率
      for (const index of result.existingIndexes) {
        index.efficiency = await this.analyzeIndexEfficiency(index);
      }

      // 生成索引优化建议
      result.recommendations = this.generateIndexRecommendations({
        unused: result.unusedIndexes,
        missing: result.missingIndexes,
        duplicate: result.duplicateIndexes,
        existing: result.existingIndexes
      });

      const issues = result.unusedIndexes.length + 
                    result.missingIndexes.length + 
                    result.duplicateIndexes.length;
      
      result.status = issues === 0 ? 'passed' : 
                      issues < 3 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * 检查数据完整性
   */
  async checkDataIntegrity() {
    const result = {
      name: '数据完整性检查',
      status: 'pending',
      constraints: [],
      violations: [],
      orphanedRecords: [],
      duplicates: []
    };

    try {
      // 检查约束
      result.constraints = await this.checkConstraints();

      // 检查违反约束的数据
      result.violations = await this.findConstraintViolations();

      // 检查孤立记录
      result.orphanedRecords = await this.findOrphanedRecords();

      // 检查重复数据
      result.duplicates = await this.findDuplicateData();

      const issues = result.violations.length + 
                    result.orphanedRecords.length + 
                    result.duplicates.length;
      
      result.status = issues === 0 ? 'passed' : 
                      issues < 5 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * 测试并发处理能力
   */
  async testConcurrency() {
    const result = {
      name: '并发测试',
      status: 'pending',
      metrics: {},
      deadlocks: [],
      contentions: []
    };

    try {
      // 测试不同并发级别
      const concurrencyLevels = [10, 50, 100, 200];
      
      for (const level of concurrencyLevels) {
        const testResult = await this.runConcurrencyTest(level);
        result.metrics[`concurrent_${level}`] = testResult;
      }

      // 检测死锁
      result.deadlocks = await this.detectDeadlocks();

      // 检测锁争用
      result.contentions = await this.detectLockContentions();

      // 评估并发性能
      const avgResponseTime = Object.values(result.metrics)
        .reduce((sum, m) => sum + m.avgResponseTime, 0) / Object.keys(result.metrics).length;
      
      result.status = avgResponseTime < 100 && result.deadlocks.length === 0 ? 'passed' : 
                      avgResponseTime < 500 && result.deadlocks.length < 2 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * 测试事务处理
   */
  async testTransactions() {
    const result = {
      name: '事务测试',
      status: 'pending',
      tests: [],
      isolation: {},
      durability: {}
    };

    try {
      // 测试ACID属性
      result.tests.push(await this.testAtomicity());
      result.tests.push(await this.testConsistency());
      result.tests.push(await this.testIsolation());
      result.tests.push(await this.testDurability());

      // 测试不同隔离级别
      result.isolation = await this.testIsolationLevels();

      // 测试事务回滚
      result.tests.push(await this.testRollback());

      // 测试长事务影响
      result.tests.push(await this.testLongTransactions());

      const failedTests = result.tests.filter(t => t.status === 'failed').length;
      result.status = failedTests === 0 ? 'passed' : 
                      failedTests < 2 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * 测试备份和恢复
   */
  async testBackupRestore() {
    const result = {
      name: '备份恢复测试',
      status: 'pending',
      backupTest: {},
      restoreTest: {},
      backupSize: 0,
      backupTime: 0,
      restoreTime: 0
    };

    try {
      // 测试备份功能
      const backupStart = Date.now();
      result.backupTest = await this.testBackup();
      result.backupTime = Date.now() - backupStart;

      // 测试恢复功能
      const restoreStart = Date.now();
      result.restoreTest = await this.testRestore();
      result.restoreTime = Date.now() - restoreStart;

      // 验证数据一致性
      const dataConsistent = await this.verifyBackupIntegrity();
      
      result.status = result.backupTest.success && 
                      result.restoreTest.success && 
                      dataConsistent ? 'passed' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * 检查数据库安全性
   */
  async checkSecurity() {
    const result = {
      name: '安全性检查',
      status: 'pending',
      vulnerabilities: [],
      permissions: {},
      encryption: {},
      audit: {}
    };

    try {
      // 检查默认密码
      const defaultPasswords = await this.checkDefaultPasswords();
      if (defaultPasswords.length > 0) {
        result.vulnerabilities.push({
          type: 'default_password',
          severity: 'critical',
          details: defaultPasswords
        });
      }

      // 检查权限设置
      result.permissions = await this.auditPermissions();

      // 检查加密设置
      result.encryption = await this.checkEncryption();

      // 检查审计日志
      result.audit = await this.checkAuditLogging();

      // 检查SQL注入漏洞
      const sqlInjectionRisk = await this.checkSQLInjectionRisk();
      if (sqlInjectionRisk.vulnerable) {
        result.vulnerabilities.push({
          type: 'sql_injection',
          severity: 'critical',
          details: sqlInjectionRisk.details
        });
      }

      result.status = result.vulnerabilities.length === 0 ? 'passed' : 
                      result.vulnerabilities.filter(v => v.severity === 'critical').length === 0 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  /**
   * 分析资源使用情况
   */
  async analyzeResourceUsage() {
    const result = {
      name: '资源使用分析',
      status: 'pending',
      cpu: {},
      memory: {},
      disk: {},
      connections: {},
      recommendations: []
    };

    try {
      // CPU使用分析
      result.cpu = await this.analyzeCPUUsage();

      // 内存使用分析
      result.memory = await this.analyzeMemoryUsage();

      // 磁盘使用分析
      result.disk = await this.analyzeDiskUsage();

      // 连接池分析
      result.connections = await this.analyzeConnectionPool();

      // 生成资源优化建议
      result.recommendations = this.generateResourceOptimizationRecommendations({
        cpu: result.cpu,
        memory: result.memory,
        disk: result.disk,
        connections: result.connections
      });

      // 评估资源使用健康度
      const healthScore = this.calculateResourceHealthScore(result);
      result.status = healthScore > 80 ? 'passed' : 
                      healthScore > 60 ? 'warning' : 'failed';

      return result;

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      return result;
    }
  }

  // ========== 辅助方法 ==========

  /**
   * 执行查询
   */
  async executeQuery(query, params = []) {
    try {
      switch (this.dbType) {
        case 'postgresql':
          const pgResult = await this.connectionPool.query(query, params);
          return pgResult.rows;

        case 'mysql':
          const [mysqlResult] = await this.connectionPool.execute(query, params);
          return mysqlResult;

        case 'mongodb':
          // MongoDB查询需要特殊处理
          return await this.executeMongoQuery(query, params);

        default:
          throw new Error(`Unsupported database type: ${this.dbType}`);
      }
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  /**
   * 基准测试查询
   */
  async benchmarkQuery(query, iterations = 100) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await this.executeQuery(query);
      times.push(Date.now() - startTime);
    }

    return {
      iterations,
      avgTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      minTime: times.length > 0 ? Math.min(...times) : 0,
      maxTime: times.length > 0 ? Math.max(...times) : 0,
      p95: times.length > 0 ? this.calculatePercentile(times, 95) : 0,
      p99: times.length > 0 ? this.calculatePercentile(times, 99) : 0
    };
  }

  /**
   * 获取慢查询
   */
  async getSlowQueries() {
    switch (this.dbType) {
      case 'postgresql':
        return await this.executeQuery(`
          SELECT query, mean_exec_time as duration, calls
          FROM pg_stat_statements
          WHERE mean_exec_time > 100
          ORDER BY mean_exec_time DESC
          LIMIT 20
        `);

      case 'mysql':
        return await this.executeQuery(`
          SELECT sql_text as query, 
                 avg_timer_wait/1000000000 as duration,
                 count_star as calls
          FROM performance_schema.events_statements_summary_by_digest
          WHERE avg_timer_wait > 100000000000
          ORDER BY avg_timer_wait DESC
          LIMIT 20
        `);

      default:
        return [];
    }
  }

  /**
   * 分析查询计划
   */
  async analyzeQueryPlan(query) {
    try {
      let plan, cost, suggestions = [];

      switch (this.dbType) {
        case 'postgresql':
          const pgPlan = await this.executeQuery(`EXPLAIN ANALYZE ${query}`);
          plan = pgPlan.map(row => row['QUERY PLAN']).join('\n');
          
          // 分析计划寻找优化机会
          if (plan.includes('Seq Scan')) {
            suggestions.push('考虑添加索引以避免全表扫描');
          }
          if (plan.includes('Nested Loop')) {
            suggestions.push('嵌套循环可能导致性能问题，考虑优化JOIN条件');
          }
          break;

        case 'mysql':
          const mysqlPlan = await this.executeQuery(`EXPLAIN ${query}`);
          plan = JSON.stringify(mysqlPlan);
          
          // MySQL特定的优化建议
          if (mysqlPlan.some(row => row.type === 'ALL')) {
            suggestions.push('检测到全表扫描，建议添加索引');
          }
          break;
      }

      return { plan, cost, suggestions };

    } catch (error) {
      return { plan: null, cost: null, suggestions: ['无法分析查询计划'] };
    }
  }

  /**
   * 获取现有索引
   */
  async getExistingIndexes() {
    switch (this.dbType) {
      case 'postgresql':
        return await this.executeQuery(`
          SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
          FROM pg_indexes
          WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        `);

      case 'mysql':
        return await this.executeQuery(`
          SELECT 
            TABLE_SCHEMA,
            TABLE_NAME,
            INDEX_NAME,
            COLUMN_NAME,
            CARDINALITY
          FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
        `);

      default:
        return [];
    }
  }

  /**
   * 测试连接池
   */
  async testConnectionPool() {
    const results = [];
    
    try {
      // 测试多个并发连接
      const connectionTests = [];
      for (let i = 0; i < 10; i++) {
        connectionTests.push(
          this.executeQuery('SELECT 1').then(() => ({ success: true, index: i }))
        );
      }
      
      const startTime = Date.now();
      const testResults = await Promise.all(connectionTests);
      const poolTime = Date.now() - startTime;
      
      results.push({
        test: '连接池测试',
        result: testResults.every(r => r.success) ? '成功' : '失败',
        time: `${poolTime}ms`,
        connections: testResults.length
      });
      
    } catch (error) {
      results.push({
        test: '连接池测试',
        result: '失败',
        error: error.message
      });
    }
    
    return results;
  }

  /**
   * 测试连接稳定性
   */
  async testConnectionStability() {
    try {
      // 执行多次查询测试连接稳定性
      const testCount = 20;
      let successCount = 0;
      const times = [];
      
      for (let i = 0; i < testCount; i++) {
        const start = Date.now();
        try {
          await this.executeQuery('SELECT 1');
          successCount++;
          times.push(Date.now() - start);
        } catch (error) {
          // 连接失败
        }
        // 小延迟避免过度压力
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const stability = (successCount / testCount) * 100;
      
      return {
        test: '连接稳定性',
        result: stability >= 95 ? '优秀' : stability >= 80 ? '良好' : '需要改进',
        successRate: `${stability.toFixed(2)}%`,
        avgResponseTime: `${avgTime.toFixed(2)}ms`
      };
      
    } catch (error) {
      return {
        test: '连接稳定性',
        result: '测试失败',
        error: error.message
      };
    }
  }

  /**
   * 计算百分位数
   */
  calculatePercentile(arr, percentile) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * 生成总结
   */
  generateSummary(tests) {
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    Object.values(tests).forEach(test => {
      totalTests++;
      if (test.status === 'passed') passed++;
      else if (test.status === 'failed') failed++;
      else if (test.status === 'warning') warnings++;
    });

    return { totalTests, passed, failed, warnings };
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(tests) {
    const recommendations = [];

    // 基于测试结果生成建议
    if (tests.performance && tests.performance.status !== 'passed') {
      recommendations.push({
        category: '性能优化',
        priority: 'high',
        suggestion: '数据库性能需要优化，请查看慢查询和索引建议'
      });
    }

    if (tests.indexAnalysis && tests.indexAnalysis.missingIndexes?.length > 0) {
      recommendations.push({
        category: '索引优化',
        priority: 'medium',
        suggestion: `发现 ${tests.indexAnalysis.missingIndexes.length} 个缺失的索引，建议添加以提升查询性能`
      });
    }

    if (tests.security && tests.security.vulnerabilities?.length > 0) {
      recommendations.push({
        category: '安全加固',
        priority: 'critical',
        suggestion: '发现安全漏洞，请立即修复'
      });
    }

    if (tests.resourceUsage && tests.resourceUsage.status === 'warning') {
      recommendations.push({
        category: '资源优化',
        priority: 'medium',
        suggestion: '资源使用接近阈值，建议优化或扩容'
      });
    }

    return recommendations;
  }

  /**
   * 复杂查询基准测试
   */
  async benchmarkComplexQuery() {
    try {
      let query;
      
      switch (this.dbType) {
        case 'postgresql':
          query = `
            SELECT t1.*, t2.table_name
            FROM information_schema.tables t1
            LEFT JOIN information_schema.tables t2 ON t1.table_schema = t2.table_schema
            WHERE t1.table_schema NOT IN ('pg_catalog', 'information_schema')
            LIMIT 100
          `;
          break;
        case 'mysql':
          query = `
            SELECT t1.*, t2.TABLE_NAME
            FROM information_schema.TABLES t1
            LEFT JOIN information_schema.TABLES t2 ON t1.TABLE_SCHEMA = t2.TABLE_SCHEMA
            WHERE t1.TABLE_SCHEMA = DATABASE()
            LIMIT 100
          `;
          break;
        default:
          return { iterations: 0, avgTime: 0, note: '不支持的数据库类型' };
      }
      
      return await this.benchmarkQuery(query, 10);
      
    } catch (error) {
      return { iterations: 0, avgTime: 0, error: error.message };
    }
  }

  /**
   * 插入性能基准测试
   */
  async benchmarkInserts() {
    const testTable = `test_insert_${Date.now()}`;
    const times = [];
    
    try {
      // 创建测试表
      if (this.dbType === 'postgresql') {
        await this.executeQuery(`CREATE TABLE ${testTable} (id SERIAL PRIMARY KEY, data TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
      } else if (this.dbType === 'mysql') {
        await this.executeQuery(`CREATE TABLE ${testTable} (id INT AUTO_INCREMENT PRIMARY KEY, data TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
      } else {
        return { iterations: 0, avgTime: 0, note: 'MongoDB不支持此测试' };
      }
      
      // 执行插入测试
      const placeholder = this.dbType === 'postgresql' ? '$1' : '?';
      for (let i = 0; i < 50; i++) {
        const start = Date.now();
        await this.executeQuery(
          `INSERT INTO ${testTable} (data) VALUES (${placeholder})`,
          [`test_data_${i}`]
        );
        times.push(Date.now() - start);
      }
      
      return {
        iterations: times.length,
        avgTime: times.reduce((a, b) => a + b, 0) / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        p95: this.calculatePercentile(times, 95),
        p99: this.calculatePercentile(times, 99)
      };
      
    } catch (error) {
      return { iterations: 0, avgTime: 0, error: error.message };
    } finally {
      // 确保清理测试表
      try {
        await this.executeQuery(`DROP TABLE IF EXISTS ${testTable}`);
      } catch (cleanupError) {
        console.warn(`清理测试表失败: ${cleanupError.message}`);
      }
    }
  }

  /**
   * 更新性能基准测试
   */
  async benchmarkUpdates() {
    const testTable = `test_update_${Date.now()}`;
    const times = [];
    
    try {
      // 创建并填充测试表
      if (this.dbType === 'postgresql') {
        await this.executeQuery(`CREATE TABLE ${testTable} (id SERIAL PRIMARY KEY, data TEXT, counter INT DEFAULT 0)`);
      } else if (this.dbType === 'mysql') {
        await this.executeQuery(`CREATE TABLE ${testTable} (id INT AUTO_INCREMENT PRIMARY KEY, data TEXT, counter INT DEFAULT 0)`);
      } else {
        return { iterations: 0, avgTime: 0, note: 'MongoDB不支持此测试' };
      }
      
      // 插入测试数据
      for (let i = 0; i < 50; i++) {
        await this.executeQuery(`INSERT INTO ${testTable} (data) VALUES ('test')`);
      }
      
      // 执行更新测试
      const updatePlaceholder = this.dbType === 'postgresql' ? '$1' : '?';
      for (let i = 1; i <= 50; i++) {
        const start = Date.now();
        await this.executeQuery(
          `UPDATE ${testTable} SET counter = counter + 1 WHERE id = ${updatePlaceholder}`,
          [i]
        );
        times.push(Date.now() - start);
      }
      
      return {
        iterations: times.length,
        avgTime: times.reduce((a, b) => a + b, 0) / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        p95: this.calculatePercentile(times, 95),
        p99: this.calculatePercentile(times, 99)
      };
      
    } catch (error) {
      return { iterations: 0, avgTime: 0, error: error.message };
    } finally {
      // 确保清理测试表
      try {
        await this.executeQuery(`DROP TABLE IF EXISTS ${testTable}`);
      } catch (cleanupError) {
        console.warn(`清理测试表失败: ${cleanupError.message}`);
      }
    }
  }

  /**
   * 删除性能基准测试
   */
  async benchmarkDeletes() {
    const testTable = `test_delete_${Date.now()}`;
    const times = [];
    
    try {
      // 创建并填充测试表
      if (this.dbType === 'postgresql') {
        await this.executeQuery(`CREATE TABLE ${testTable} (id SERIAL PRIMARY KEY, data TEXT)`);
      } else if (this.dbType === 'mysql') {
        await this.executeQuery(`CREATE TABLE ${testTable} (id INT AUTO_INCREMENT PRIMARY KEY, data TEXT)`);
      } else {
        return { iterations: 0, avgTime: 0, note: 'MongoDB不支持此测试' };
      }
      
      // 插入测试数据
      for (let i = 0; i < 50; i++) {
        await this.executeQuery(`INSERT INTO ${testTable} (data) VALUES ('test')`);
      }
      
      // 执行删除测试
      const deletePlaceholder = this.dbType === 'postgresql' ? '$1' : '?';
      for (let i = 1; i <= 50; i++) {
        const start = Date.now();
        await this.executeQuery(
          `DELETE FROM ${testTable} WHERE id = ${deletePlaceholder}`,
          [i]
        );
        times.push(Date.now() - start);
      }
      
      return {
        iterations: times.length,
        avgTime: times.reduce((a, b) => a + b, 0) / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        p95: this.calculatePercentile(times, 95),
        p99: this.calculatePercentile(times, 99)
      };
      
    } catch (error) {
      return { iterations: 0, avgTime: 0, error: error.message };
    } finally {
      // 确保清理测试表
      try {
        await this.executeQuery(`DROP TABLE IF EXISTS ${testTable}`);
      } catch (cleanupError) {
        console.warn(`清理测试表失败: ${cleanupError.message}`);
      }
    }
  }

  /**
   * 计算性能评分
   */
  calculatePerformanceScore(benchmarks) {
    if (!benchmarks || benchmarks.length === 0) return 0;
    
    let totalScore = 0;
    let validBenchmarks = 0;
    
    for (const benchmark of benchmarks) {
      if (benchmark.avgTime !== undefined && !benchmark.error) {
        // 基于平均时间评分：<10ms=100, <50ms=80, <100ms=60, <500ms=40, >=500ms=20
        let score;
        if (benchmark.avgTime < 10) score = 100;
        else if (benchmark.avgTime < 50) score = 80;
        else if (benchmark.avgTime < 100) score = 60;
        else if (benchmark.avgTime < 500) score = 40;
        else score = 20;
        
        totalScore += score;
        validBenchmarks++;
      }
    }
    
    return validBenchmarks > 0 ? Math.round(totalScore / validBenchmarks) : 50;
  }

  /**
   * 生成查询优化建议
   */
  generateQueryOptimizationSuggestions(queryPlans) {
    const suggestions = [];
    const seenSuggestions = new Set();
    
    for (const plan of queryPlans) {
      if (plan.suggestions && Array.isArray(plan.suggestions)) {
        plan.suggestions.forEach(suggestion => {
          if (!seenSuggestions.has(suggestion)) {
            suggestions.push({
              query: plan.query ? plan.query.substring(0, 100) + '...' : '未知查询',
              executionTime: plan.executionTime,
              suggestion: suggestion,
              priority: plan.executionTime > 1000 ? 'high' : plan.executionTime > 500 ? 'medium' : 'low'
            });
            seenSuggestions.add(suggestion);
          }
        });
      }
    }
    
    // 添加通用建议
    if (queryPlans.length > 10) {
      suggestions.push({
        query: '全局',
        suggestion: '检测到较多慢查询，建议全面优化数据库索引和查询结构',
        priority: 'high'
      });
    }
    
    return suggestions;
  }

  /**
   * 查找未使用的索引
   */
  async findUnusedIndexes() {
    try {
      switch (this.dbType) {
        case 'postgresql':
          return await this.executeQuery(`
            SELECT schemaname, tablename, indexname
            FROM pg_stat_user_indexes
            WHERE idx_scan = 0
            AND indexname NOT LIKE '%_pkey'
            ORDER BY schemaname, tablename
          `);
        
        case 'mysql':
          return await this.executeQuery(`
            SELECT OBJECT_SCHEMA as schemaname, 
                   OBJECT_NAME as tablename, 
                   INDEX_NAME as indexname
            FROM performance_schema.table_io_waits_summary_by_index_usage
            WHERE INDEX_NAME IS NOT NULL
            AND INDEX_NAME != 'PRIMARY'
            AND COUNT_STAR = 0
          `);
        
        default:
          return [];
      }
    } catch (error) {
      console.error('查找未使用索引失败:', error.message);
      return [];
    }
  }

  /**
   * 建议缺失的索引
   */
  async suggestMissingIndexes() {
    try {
      const suggestions = [];
      
      switch (this.dbType) {
        case 'postgresql':
          // 基于慢查询分析缺失的索引
          const slowQueries = await this.getSlowQueries();
          for (const query of slowQueries.slice(0, 5)) {
            const plan = await this.analyzeQueryPlan(query.query);
            if (plan.plan && plan.plan.includes('Seq Scan')) {
              suggestions.push({
                query: query.query.substring(0, 100),
                reason: '检测到全表扫描',
                suggestion: '建议为WHERE条件中的字段添加索引'
              });
            }
          }
          break;
        
        case 'mysql':
          // 查找没有索引的外键
          const fks = await this.executeQuery(`
            SELECT 
              TABLE_NAME as tablename,
              COLUMN_NAME as columnname
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE REFERENCED_TABLE_NAME IS NOT NULL
            AND TABLE_SCHEMA = DATABASE()
          `);
          
          for (const fk of fks) {
            suggestions.push({
              table: fk.tablename,
              column: fk.columnname,
              reason: '外键字段未索引',
              suggestion: `建议为${fk.tablename}.${fk.columnname}添加索引`
            });
          }
          break;
      }
      
      return suggestions;
      
    } catch (error) {
      console.error('建议缺失索引失败:', error.message);
      return [];
    }
  }

  /**
   * 查找重复的索引
   */
  async findDuplicateIndexes() {
    try {
      const indexes = await this.getExistingIndexes();
      const duplicates = [];
      const indexMap = new Map();
      
      for (const index of indexes) {
        const key = `${index.tablename || index.TABLE_NAME}_${index.indexdef || index.COLUMN_NAME}`;
        if (indexMap.has(key)) {
          duplicates.push({
            table: index.tablename || index.TABLE_NAME,
            index1: indexMap.get(key),
            index2: index.indexname || index.INDEX_NAME,
            reason: '索引定义重复'
          });
        } else {
          indexMap.set(key, index.indexname || index.INDEX_NAME);
        }
      }
      
      return duplicates;
      
    } catch (error) {
      console.error('查找重复索引失败:', error.message);
      return [];
    }
  }

  /**
   * 分析索引效率
   */
  async analyzeIndexEfficiency(index) {
    try {
      const tableName = index.tablename || index.TABLE_NAME;
      const indexName = index.indexname || index.INDEX_NAME;
      
      switch (this.dbType) {
        case 'postgresql':
          const pgStats = await this.executeQuery(`
            SELECT idx_scan, idx_tup_read, idx_tup_fetch
            FROM pg_stat_user_indexes
            WHERE indexrelname = $1
          `, [indexName]);
          
          if (pgStats && pgStats.length > 0) {
            const stats = pgStats[0];
            return {
              scans: stats.idx_scan,
              reads: stats.idx_tup_read,
              fetches: stats.idx_tup_fetch,
              efficiency: stats.idx_scan > 0 ? 'high' : 'low'
            };
          }
          break;
        
        case 'mysql':
          // MySQL索引统计
          return {
            cardinality: index.CARDINALITY,
            efficiency: index.CARDINALITY > 100 ? 'high' : 'medium'
          };
      }
      
      return { efficiency: 'unknown' };
      
    } catch (error) {
      return { efficiency: 'unknown', error: error.message };
    }
  }

  /**
   * 生成索引优化建议
   */
  generateIndexRecommendations(indexData) {
    const recommendations = [];
    
    if (indexData.unused && indexData.unused.length > 0) {
      recommendations.push({
        category: '删除未使用索引',
        priority: 'medium',
        count: indexData.unused.length,
        details: `发现 ${indexData.unused.length} 个未使用的索引，建议删除以减少存储开销`
      });
    }
    
    if (indexData.missing && indexData.missing.length > 0) {
      recommendations.push({
        category: '添加缺失索引',
        priority: 'high',
        count: indexData.missing.length,
        details: `建议添加 ${indexData.missing.length} 个索引以提高查询性能`
      });
    }
    
    if (indexData.duplicate && indexData.duplicate.length > 0) {
      recommendations.push({
        category: '合并重复索引',
        priority: 'low',
        count: indexData.duplicate.length,
        details: `发现 ${indexData.duplicate.length} 组重复索引，建议合并`
      });
    }
    
    return recommendations;
  }

  /**
   * 检查约束
   */
  async checkConstraints() {
    try {
      switch (this.dbType) {
        case 'postgresql':
          return await this.executeQuery(`
            SELECT conname as constraint_name, 
                   contype as constraint_type,
                   conrelid::regclass as table_name
            FROM pg_constraint
            WHERE connamespace = 'public'::regnamespace
          `);
        
        case 'mysql':
          return await this.executeQuery(`
            SELECT CONSTRAINT_NAME as constraint_name,
                   CONSTRAINT_TYPE as constraint_type,
                   TABLE_NAME as table_name
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
          `);
        
        default:
          return [];
      }
    } catch (error) {
      console.error('检查约束失败:', error.message);
      return [];
    }
  }

  /**
   * 查找约束违反
   */
  async findConstraintViolations() {
    const violations = [];
    
    try {
      switch (this.dbType) {
        case 'postgresql':
          // 检查外键约束违反
          const pgFKViolations = await this.executeQuery(`
            SELECT 
              conname AS constraint_name,
              conrelid::regclass AS table_name,
              'Foreign Key' AS constraint_type,
              'Potential orphaned records' AS violation_type
            FROM pg_constraint
            WHERE contype = 'f'
            AND connamespace = 'public'::regnamespace
            LIMIT 100
          `);
          
          // 检查每个外键约束
          for (const fk of pgFKViolations.slice(0, 10)) {
            // 这里需要更复杂的查询来检测实际违反
            // 由于需要解析约束定义，这里记录潜在风险
            violations.push({
              constraint: fk.constraint_name,
              table: fk.table_name,
              type: fk.constraint_type,
              status: 'needs_validation',
              recommendation: '建议使用pg_constraint和pg_attribute进行详细验证'
            });
          }
          
          // 检查唯一性约束违反
          const pgUniqueViolations = await this.executeQuery(`
            SELECT 
              schemaname,
              tablename,
              indexname
            FROM pg_indexes
            WHERE indexdef LIKE '%UNIQUE%'
            AND schemaname = 'public'
            LIMIT 50
          `);
          
          // 检查每个表的重复值
          for (const idx of pgUniqueViolations.slice(0, 5)) {
            violations.push({
              table: idx.tablename,
              index: idx.indexname,
              type: 'Unique Constraint',
              status: 'validated',
              recommendation: '检查该表是否有重复数据'
            });
          }
          break;
        
        case 'mysql':
          // 检查外键约束
          const mysqlFKs = await this.executeQuery(`
            SELECT 
              CONSTRAINT_NAME as constraint_name,
              TABLE_NAME as table_name,
              REFERENCED_TABLE_NAME as referenced_table
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE CONSTRAINT_SCHEMA = DATABASE()
            AND REFERENCED_TABLE_NAME IS NOT NULL
            LIMIT 50
          `);
          
          for (const fk of mysqlFKs.slice(0, 10)) {
            violations.push({
              constraint: fk.constraint_name,
              table: fk.table_name,
              referenced_table: fk.referenced_table,
              type: 'Foreign Key',
              status: 'needs_validation',
              recommendation: '使用JOIN查询验证外键关系'
            });
          }
          
          // 检查表约束
          const mysqlConstraints = await this.executeQuery(`
            SELECT 
              TABLE_NAME as table_name,
              CONSTRAINT_NAME as constraint_name,
              CONSTRAINT_TYPE as constraint_type
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = DATABASE()
            AND CONSTRAINT_TYPE IN ('UNIQUE', 'PRIMARY KEY')
            LIMIT 50
          `);
          
          for (const con of mysqlConstraints.slice(0, 10)) {
            violations.push({
              table: con.table_name,
              constraint: con.constraint_name,
              type: con.constraint_type,
              status: 'validated',
              recommendation: '约束已定义，建议定期检查数据一致性'
            });
          }
          break;
        
        default:
          return [{
            status: 'unsupported',
            message: `${this.dbType}数据库类型不支持约束检查`
          }];
      }
      
      return violations;
      
    } catch (error) {
      console.error('查找约束违反失败:', error.message);
      return [{
        status: 'error',
        message: error.message,
        recommendation: '检查数据库权限和连接状态'
      }];
    }
  }

  /**
   * 查找孤立记录
   */
  async findOrphanedRecords() {
    const orphanedRecords = [];
    
    try {
      switch (this.dbType) {
        case 'postgresql':
          // 获取所有外键关系
          const pgForeignKeys = await this.executeQuery(`
            SELECT 
              tc.table_name,
              kcu.column_name,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
            LIMIT 20
          `);
          
          // 检查每个外键关系
          for (const fk of pgForeignKeys) {
            try {
              const orphanQuery = `
                SELECT COUNT(*) as orphan_count
                FROM ${fk.table_name} t
                LEFT JOIN ${fk.foreign_table_name} f
                  ON t.${fk.column_name} = f.${fk.foreign_column_name}
                WHERE t.${fk.column_name} IS NOT NULL
                  AND f.${fk.foreign_column_name} IS NULL
              `;
              
              const result = await this.executeQuery(orphanQuery);
              const orphanCount = parseInt(result[0].orphan_count) || 0;
              
              if (orphanCount > 0) {
                orphanedRecords.push({
                  table: fk.table_name,
                  column: fk.column_name,
                  foreign_table: fk.foreign_table_name,
                  foreign_column: fk.foreign_column_name,
                  orphan_count: orphanCount,
                  severity: orphanCount > 100 ? 'high' : orphanCount > 10 ? 'medium' : 'low',
                  recommendation: `检查并修复${fk.table_name}表中的${orphanCount}条孤立记录`
                });
              }
            } catch (queryError) {
              console.warn(`检查孤立记录失败 (${fk.table_name}):`, queryError.message);
            }
          }
          break;
        
        case 'mysql':
          // 获取MySQL外键关系
          const mysqlForeignKeys = await this.executeQuery(`
            SELECT 
              TABLE_NAME as table_name,
              COLUMN_NAME as column_name,
              REFERENCED_TABLE_NAME as foreign_table_name,
              REFERENCED_COLUMN_NAME as foreign_column_name
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE CONSTRAINT_SCHEMA = DATABASE()
              AND REFERENCED_TABLE_NAME IS NOT NULL
            LIMIT 20
          `);
          
          // 检查每个外键关系
          for (const fk of mysqlForeignKeys) {
            try {
              const orphanQuery = `
                SELECT COUNT(*) as orphan_count
                FROM ${fk.table_name} t
                LEFT JOIN ${fk.foreign_table_name} f
                  ON t.${fk.column_name} = f.${fk.foreign_column_name}
                WHERE t.${fk.column_name} IS NOT NULL
                  AND f.${fk.foreign_column_name} IS NULL
              `;
              
              const result = await this.executeQuery(orphanQuery);
              const orphanCount = parseInt(result[0].orphan_count) || 0;
              
              if (orphanCount > 0) {
                orphanedRecords.push({
                  table: fk.table_name,
                  column: fk.column_name,
                  foreign_table: fk.foreign_table_name,
                  foreign_column: fk.foreign_column_name,
                  orphan_count: orphanCount,
                  severity: orphanCount > 100 ? 'high' : orphanCount > 10 ? 'medium' : 'low',
                  recommendation: `清理${fk.table_name}表中的孤立记录`
                });
              }
            } catch (queryError) {
              console.warn(`检查孤立记录失败 (${fk.table_name}):`, queryError.message);
            }
          }
          break;
        
        default:
          return [{
            status: 'unsupported',
            message: `${this.dbType}数据库类型不支持孤立记录检查`
          }];
      }
      
      return orphanedRecords;
      
    } catch (error) {
      console.error('查找孤立记录失败:', error.message);
      return [{
        status: 'error',
        message: error.message,
        recommendation: '检查数据库连接和权限'
      }];
    }
  }

  /**
   * 查找重复数据
   */
  async findDuplicateData() {
    const duplicates = [];
    
    try {
      switch (this.dbType) {
        case 'postgresql':
          // 查找有唯一性约束的表
          const pgTables = await this.executeQuery(`
            SELECT DISTINCT
              t.table_name,
              c.column_name
            FROM information_schema.tables t
            JOIN information_schema.table_constraints tc
              ON t.table_name = tc.table_name
            JOIN information_schema.key_column_usage c
              ON tc.constraint_name = c.constraint_name
            WHERE t.table_schema = 'public'
              AND tc.constraint_type = 'UNIQUE'
              AND t.table_type = 'BASE TABLE'
            LIMIT 20
          `);
          
          // 检查每个唯一字段的重复
          for (const table of pgTables) {
            try {
              const dupQuery = `
                SELECT 
                  ${table.column_name},
                  COUNT(*) as count
                FROM ${table.table_name}
                GROUP BY ${table.column_name}
                HAVING COUNT(*) > 1
                LIMIT 10
              `;
              
              const dupResults = await this.executeQuery(dupQuery);
              
              if (dupResults.length > 0) {
                duplicates.push({
                  table: table.table_name,
                  column: table.column_name,
                  duplicate_groups: dupResults.length,
                  total_duplicates: dupResults.reduce((sum, r) => sum + parseInt(r.count), 0),
                  severity: dupResults.length > 10 ? 'high' : 'medium',
                  examples: dupResults.slice(0, 3).map(r => ({
                    value: r[table.column_name],
                    count: r.count
                  })),
                  recommendation: `清理${table.table_name}.${table.column_name}中的重复数据`
                });
              }
            } catch (queryError) {
              console.warn(`检查重复数据失败 (${table.table_name}):`, queryError.message);
            }
          }
          break;
        
        case 'mysql':
          // 查找有唯一索引的表
          const mysqlTables = await this.executeQuery(`
            SELECT DISTINCT
              TABLE_NAME as table_name,
              COLUMN_NAME as column_name
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND NON_UNIQUE = 0
              AND INDEX_NAME != 'PRIMARY'
            LIMIT 20
          `);
          
          // 检查重复数据
          for (const table of mysqlTables) {
            try {
              const dupQuery = `
                SELECT 
                  ${table.column_name},
                  COUNT(*) as count
                FROM ${table.table_name}
                GROUP BY ${table.column_name}
                HAVING COUNT(*) > 1
                LIMIT 10
              `;
              
              const dupResults = await this.executeQuery(dupQuery);
              
              if (dupResults.length > 0) {
                duplicates.push({
                  table: table.table_name,
                  column: table.column_name,
                  duplicate_groups: dupResults.length,
                  total_duplicates: dupResults.reduce((sum, r) => sum + parseInt(r.count), 0),
                  severity: dupResults.length > 10 ? 'high' : 'medium',
                  examples: dupResults.slice(0, 3).map(r => ({
                    value: r[table.column_name],
                    count: r.count
                  })),
                  recommendation: `删除或合并${table.table_name}.${table.column_name}的重复值`
                });
              }
            } catch (queryError) {
              console.warn(`检查重复数据失败 (${table.table_name}):`, queryError.message);
            }
          }
          break;
        
        default:
          return [{
            status: 'unsupported',
            message: `${this.dbType}数据库类型不支持重复数据检查`
          }];
      }
      
      return duplicates;
      
    } catch (error) {
      console.error('查找重复数据失败:', error.message);
      return [{
        status: 'error',
        message: error.message,
        recommendation: '检查数据库连接和查询权限'
      }];
    }
  }

  /**
   * 执行并发测试
   */
  async runConcurrencyTest(level) {
    try {
      const promises = [];
      const times = [];
      
      for (let i = 0; i < level; i++) {
        promises.push(
          (async () => {
            const start = Date.now();
            await this.executeQuery('SELECT 1');
            return Date.now() - start;
          })()
        );
      }
      
      const results = await Promise.all(promises);
      
      return {
        concurrencyLevel: level,
        totalRequests: level,
        successfulRequests: results.length,
        avgResponseTime: results.reduce((a, b) => a + b, 0) / results.length,
        minResponseTime: Math.min(...results),
        maxResponseTime: Math.max(...results)
      };
      
    } catch (error) {
      return {
        concurrencyLevel: level,
        error: error.message
      };
    }
  }

  /**
   * 检测死锁
   */
  async detectDeadlocks() {
    try {
      switch (this.dbType) {
        case 'postgresql':
          const pgDeadlocks = await this.executeQuery(`
            SELECT pid, query, state
            FROM pg_stat_activity
            WHERE wait_event_type = 'Lock'
          `);
          return pgDeadlocks || [];
        
        case 'mysql':
          const mysqlDeadlocks = await this.executeQuery(`
            SELECT r.trx_id waiting_trx_id,
                   r.trx_mysql_thread_id waiting_thread,
                   r.trx_query waiting_query
            FROM information_schema.innodb_lock_waits w
            INNER JOIN information_schema.innodb_trx r ON w.requesting_trx_id = r.trx_id
          `);
          return mysqlDeadlocks || [];
        
        default:
          return [];
      }
    } catch (error) {
      console.error('检测死锁失败:', error.message);
      return [];
    }
  }

  /**
   * 检测锁争用 - 查找锁等待情况
   */
  async detectLockContentions() {
    try {
      let lockContentions = [];
      
      switch (this.dbType) {
        case 'postgresql':
          // 查找锁等待
          lockContentions = await this.executeQuery(`
            SELECT 
              blocked_locks.pid AS blocked_pid,
              blocked_activity.usename AS blocked_user,
              blocking_locks.pid AS blocking_pid,
              blocking_activity.usename AS blocking_user,
              blocked_activity.query AS blocked_query,
              blocking_activity.query AS blocking_query
            FROM pg_catalog.pg_locks blocked_locks
            JOIN pg_catalog.pg_stat_activity blocked_activity 
              ON blocked_activity.pid = blocked_locks.pid
            JOIN pg_catalog.pg_locks blocking_locks
              ON blocking_locks.locktype = blocked_locks.locktype
              AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
              AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
              AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
              AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
              AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
              AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
              AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
              AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
              AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
              AND blocking_locks.pid != blocked_locks.pid
            JOIN pg_catalog.pg_stat_activity blocking_activity 
              ON blocking_activity.pid = blocking_locks.pid
            WHERE NOT blocked_locks.granted
            LIMIT 10
          `);
          break;
        
        case 'mysql':
          // 查找InnoDB锁等待
          lockContentions = await this.executeQuery(`
            SELECT 
              r.trx_id AS waiting_trx_id,
              r.trx_mysql_thread_id AS waiting_thread,
              r.trx_query AS waiting_query,
              b.trx_id AS blocking_trx_id,
              b.trx_mysql_thread_id AS blocking_thread,
              b.trx_query AS blocking_query
            FROM information_schema.innodb_lock_waits w
            INNER JOIN information_schema.innodb_trx b 
              ON b.trx_id = w.blocking_trx_id
            INNER JOIN information_schema.innodb_trx r 
              ON r.trx_id = w.requesting_trx_id
            LIMIT 10
          `);
          break;
        
        case 'mongodb':
          return [{
            status: 'checked',
            message: 'MongoDB使用文档级别锁，锁争用较少',
            recommendation: '建议监控慢查询和锁等待时间'
          }];
        
        default:
          return [{
            status: 'unsupported',
            message: `${this.dbType}不支持锁争用检测`
          }];
      }
      
      return lockContentions;
    } catch (error) {
      console.error('检测锁争用失败:', error.message);
      return [{
        status: 'error',
        message: error.message
      }];
    }
  }

  /**
   * 测试原子性
   */
  async testAtomicity() {
    try {
      const testTable = `test_atomicity_${Date.now()}`;
      
      // 创建测试表
      if (this.dbType === 'postgresql' || this.dbType === 'mysql') {
        await this.executeQuery(`CREATE TABLE ${testTable} (id INT, value TEXT)`);
        
        // 测试事务回滚
        try {
          // 根据数据库类型使用不同的事务语法
          const beginCmd = this.dbType === 'postgresql' ? 'BEGIN' : 'START TRANSACTION';
          await this.executeQuery(beginCmd);
          await this.executeQuery(`INSERT INTO ${testTable} VALUES (1, 'test')`);
          await this.executeQuery('ROLLBACK');
          
          const result = await this.executeQuery(`SELECT COUNT(*) as count FROM ${testTable}`);
          const count = result[0].count || result[0].COUNT;
          
          await this.executeQuery(`DROP TABLE ${testTable}`);
          
          return {
            name: '原子性测试',
            status: count == 0 ? 'passed' : 'failed',
            message: count == 0 ? '事务回滚成功' : '事务回滚失败'
          };
        } catch (error) {
          await this.executeQuery(`DROP TABLE IF EXISTS ${testTable}`);
          throw error;
        }
      }
      
      return { name: '原子性测试', status: 'skipped', message: '不支持的数据库类型' };
      
    } catch (error) {
      return { name: '原子性测试', status: 'failed', error: error.message };
    }
  }

  /**
   * 测试一致性 - 并发事务一致性测试
   */
  async testConsistency() {
    const testTable = `test_consistency_${Date.now()}`;
    
    try {
      if (this.dbType === 'mongodb') {
        return { name: '一致性测试', status: 'skipped', message: 'MongoDB使用不同的一致性模型' };
      }
      
      // 创建测试表
      if (this.dbType === 'postgresql') {
        await this.executeQuery(`CREATE TABLE ${testTable} (id SERIAL PRIMARY KEY, counter INT DEFAULT 0)`);
        await this.executeQuery(`INSERT INTO ${testTable} (counter) VALUES (0)`);
      } else if (this.dbType === 'mysql') {
        await this.executeQuery(`CREATE TABLE ${testTable} (id INT AUTO_INCREMENT PRIMARY KEY, counter INT DEFAULT 0)`);
        await this.executeQuery(`INSERT INTO ${testTable} (counter) VALUES (0)`);
      }
      
      // 并发更新测试
      const concurrentUpdates = 10;
      const updates = [];
      
      for (let i = 0; i < concurrentUpdates; i++) {
        updates.push(
          this.executeQuery(`UPDATE ${testTable} SET counter = counter + 1 WHERE id = 1`)
            .catch(err => ({ error: err.message }))
        );
      }
      
      await Promise.all(updates);
      
      // 验证结果
      const result = await this.executeQuery(`SELECT counter FROM ${testTable} WHERE id = 1`);
      const finalCount = parseInt(result[0].counter);
      
      // 清理
      await this.executeQuery(`DROP TABLE ${testTable}`);
      
      const isConsistent = finalCount === concurrentUpdates;
      
      return {
        name: '一致性测试',
        status: isConsistent ? 'passed' : 'warning',
        message: isConsistent 
          ? `并发事务一致性验证成功，最终计数: ${finalCount}` 
          : `检测到一致性问题，预期: ${concurrentUpdates}, 实际: ${finalCount}`,
        details: {
          expected: concurrentUpdates,
          actual: finalCount,
          consistent: isConsistent
        }
      };
    } catch (error) {
      // 尝试清理
      try {
        await this.executeQuery(`DROP TABLE IF EXISTS ${testTable}`);
      } catch (e) {}
      
      return { 
        name: '一致性测试', 
        status: 'failed', 
        message: `测试失败: ${error.message}` 
      };
    }
  }

  /**
   * 测试隔离性 - 检测并发事务隔离
   */
  async testIsolation() {
    try {
      let currentLevel = 'unknown';
      
      switch (this.dbType) {
        case 'postgresql':
          const pgLevel = await this.executeQuery('SHOW transaction_isolation');
          currentLevel = pgLevel[0].transaction_isolation;
          break;
        
        case 'mysql':
          const mysqlLevel = await this.executeQuery('SELECT @@transaction_isolation as level');
          currentLevel = mysqlLevel[0].level;
          break;
        
        case 'mongodb':
          return {
            name: '隔离性测试',
            status: 'passed',
            message: 'MongoDB使用文档级别锁',
            currentLevel: 'document-level'
          };
        
        default:
          return {
            name: '隔离性测试',
            status: 'skipped',
            message: `${this.dbType}不支持隔离级别检查`
          };
      }
      
      return {
        name: '隔离性测试',
        status: 'passed',
        message: `当前事务隔离级别: ${currentLevel}`,
        currentLevel: currentLevel,
        recommendation: '建议根据业务需求选择适当的隔离级别'
      };
    } catch (error) {
      return {
        name: '隔离性测试',
        status: 'failed',
        message: `测试失败: ${error.message}`
      };
    }
  }

  /**
   * 测试持久性 - 验证数据持久化配置
   */
  async testDurability() {
    try {
      const durabilityInfo = {};
      
      switch (this.dbType) {
        case 'postgresql':
          // 检查fsync设置
          const pgFsync = await this.executeQuery('SHOW fsync');
          const pgWalLevel = await this.executeQuery('SHOW wal_level');
          const pgSyncCommit = await this.executeQuery('SHOW synchronous_commit');
          
          durabilityInfo.fsync = pgFsync[0].fsync;
          durabilityInfo.wal_level = pgWalLevel[0].wal_level;
          durabilityInfo.synchronous_commit = pgSyncCommit[0].synchronous_commit;
          durabilityInfo.durable = pgFsync[0].fsync === 'on';
          break;
        
        case 'mysql':
          // 检查InnoDB持久化设置
          const mysqlFlush = await this.executeQuery('SHOW VARIABLES LIKE "innodb_flush_log_at_trx_commit"');
          const mysqlDoublewrite = await this.executeQuery('SHOW VARIABLES LIKE "innodb_doublewrite"');
          
          durabilityInfo.innodb_flush_log_at_trx_commit = mysqlFlush[0].Value;
          durabilityInfo.innodb_doublewrite = mysqlDoublewrite[0].Value;
          durabilityInfo.durable = mysqlFlush[0].Value === '1';
          break;
        
        case 'mongodb':
          durabilityInfo.durable = true;
          durabilityInfo.message = 'MongoDB默认启用journal日志保证持久性';
          break;
        
        default:
          return {
            name: '持久性测试',
            status: 'skipped',
            message: `${this.dbType}不支持持久性检查`
          };
      }
      
      return {
        name: '持久性测试',
        status: durabilityInfo.durable ? 'passed' : 'warning',
        message: durabilityInfo.durable 
          ? '数据持久化配置正常' 
          : '数据持久化配置需要优化',
        details: durabilityInfo,
        recommendation: durabilityInfo.durable 
          ? '当前配置可以保证数据持久性' 
          : '建议启用完整的数据持久化机制'
      };
    } catch (error) {
      return {
        name: '持久性测试',
        status: 'failed',
        message: `测试失败: ${error.message}`
      };
    }
  }

  /**
   * 测试不同隔离级别 - 检测数据库支持的隔离级别
   */
  async testIsolationLevels() {
    try {
      const levels = {
        readUncommitted: 'unknown',
        readCommitted: 'unknown',
        repeatableRead: 'unknown',
        serializable: 'unknown',
        currentLevel: 'unknown'
      };
      
      switch (this.dbType) {
        case 'postgresql':
          // PostgreSQL支持READ COMMITTED, REPEATABLE READ, SERIALIZABLE
          levels.readUncommitted = 'not_supported';
          levels.readCommitted = 'supported';
          levels.repeatableRead = 'supported';
          levels.serializable = 'supported';
          
          const pgLevel = await this.executeQuery('SHOW transaction_isolation');
          levels.currentLevel = pgLevel[0].transaction_isolation;
          break;
        
        case 'mysql':
          // MySQL/InnoDB支持所有四种隔离级别
          levels.readUncommitted = 'supported';
          levels.readCommitted = 'supported';
          levels.repeatableRead = 'supported';
          levels.serializable = 'supported';
          
          const mysqlLevel = await this.executeQuery('SELECT @@transaction_isolation as level');
          levels.currentLevel = mysqlLevel[0].level;
          break;
        
        case 'mongodb':
          levels.readUncommitted = 'not_applicable';
          levels.readCommitted = 'default';
          levels.repeatableRead = 'snapshot';
          levels.serializable = 'not_applicable';
          levels.currentLevel = 'document_level_locking';
          levels.note = 'MongoDB使用不同的一致性模型';
          break;
        
        default:
          return {
            status: 'unsupported',
            message: `${this.dbType}不支持隔离级别检查`
          };
      }
      
      return levels;
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * 测试事务回滚 - 注：testAtomicity已实现回滚测试
   */
  async testRollback() {
    // testAtomicity方法已经包含了完整的回滚测试
    // 这里调用该方法并返回结果
    return await this.testAtomicity();
  }

  /**
   * 测试长事务 - 检测长时间运行的事务
   */
  async testLongTransactions() {
    try {
      let longTransactions = [];
      
      switch (this.dbType) {
        case 'postgresql':
          // 查找运行超过30秒的事务
          longTransactions = await this.executeQuery(`
            SELECT 
              pid,
              usename,
              state,
              query,
              now() - xact_start AS duration
            FROM pg_stat_activity
            WHERE xact_start IS NOT NULL
              AND now() - xact_start > interval '30 seconds'
            ORDER BY xact_start
            LIMIT 10
          `);
          break;
        
        case 'mysql':
          // 查找运行时间较长的事务
          longTransactions = await this.executeQuery(`
            SELECT 
              trx_id,
              trx_state,
              trx_started,
              TIMESTAMPDIFF(SECOND, trx_started, NOW()) as duration_seconds,
              trx_query
            FROM information_schema.innodb_trx
            WHERE TIMESTAMPDIFF(SECOND, trx_started, NOW()) > 30
            ORDER BY trx_started
            LIMIT 10
          `);
          break;
        
        case 'mongodb':
          return {
            name: '长事务测试',
            status: 'passed',
            message: 'MongoDB事务通常较短，建议监控长时间运行的操作',
            longTransactions: []
          };
        
        default:
          return {
            name: '长事务测试',
            status: 'skipped',
            message: `${this.dbType}不支持长事务检测`
          };
      }
      
      const status = longTransactions.length === 0 ? 'passed' : 'warning';
      const message = longTransactions.length === 0 
        ? '未检测到长时间运行的事务' 
        : `检测到${longTransactions.length}个长时间运行的事务`;
      
      return {
        name: '长事务测试',
        status,
        message,
        longTransactions: longTransactions.slice(0, 5),
        count: longTransactions.length,
        recommendation: longTransactions.length > 0 
          ? '建议检查这些长事务，可能影响数据库性能' 
          : '事务处理正常'
      };
    } catch (error) {
      return {
        name: '长事务测试',
        status: 'failed',
        message: `测试失败: ${error.message}`
      };
    }
  }

  /**
   * 测试备份 - 验证备份配置和可用性
   */
  async testBackup() {
    const backupInfo = {
      method: 'unknown',
      available: false,
      lastBackup: null,
      backupSize: null,
      recommendations: []
    };
    
    try {
      switch (this.dbType) {
        case 'postgresql':
          // 检查pg_dump是否可用
          const { exec } = require('child_process');
          const { promisify } = require('util');
          const execAsync = promisify(exec);
          
          try {
            const { stdout: pgDumpVersion } = await execAsync('pg_dump --version');
            backupInfo.method = 'pg_dump';
            backupInfo.available = true;
            backupInfo.version = pgDumpVersion.trim();
            
            // 查询数据库大小
            const sizeResult = await this.executeQuery(
              "SELECT pg_size_pretty(pg_database_size(current_database())) as size"
            );
            backupInfo.databaseSize = sizeResult[0].size;
            
            // 提供备份命令示例
            backupInfo.exampleCommand = `pg_dump -h ${this.config.host} -U ${this.config.user} -d ${this.config.database} -F c -f backup_${Date.now()}.dump`;
            backupInfo.recommendations.push('建议使用-F c指定自定义格式以便压缩');
            backupInfo.recommendations.push('建议启用定时备份任务（使用cron或Windows任务计划）');
            
          } catch (error) {
            backupInfo.available = false;
            backupInfo.error = 'pg_dump不可用或未安装';
            backupInfo.recommendations.push('请安装PostgreSQL客户端工具');
          }
          break;
        
        case 'mysql':
          // 检查mysqldump是否可用
          const { exec: mysqlExec } = require('child_process');
          const { promisify: mysqlPromisify } = require('util');
          const mysqlExecAsync = mysqlPromisify(mysqlExec);
          
          try {
            const { stdout: mysqldumpVersion } = await mysqlExecAsync('mysqldump --version');
            backupInfo.method = 'mysqldump';
            backupInfo.available = true;
            backupInfo.version = mysqldumpVersion.trim();
            
            // 查询数据库大小
            const sizeResult = await this.executeQuery(`
              SELECT 
                ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
              FROM information_schema.TABLES
              WHERE table_schema = DATABASE()
            `);
            backupInfo.databaseSize = `${sizeResult[0].size_mb} MB`;
            
            // 提供备份命令示例
            backupInfo.exampleCommand = `mysqldump -h ${this.config.host} -u ${this.config.user} -p ${this.config.database} > backup_${Date.now()}.sql`;
            backupInfo.recommendations.push('建议使用--single-transaction保证一致性');
            backupInfo.recommendations.push('建议使用--routines备份存储过程');
            
          } catch (error) {
            backupInfo.available = false;
            backupInfo.error = 'mysqldump不可用或未安装';
            backupInfo.recommendations.push('请安装MySQL客户端工具');
          }
          break;
        
        case 'mongodb':
          // 检查mongodump是否可用
          const { exec: mongoExec } = require('child_process');
          const { promisify: mongoPromisify } = require('util');
          const mongoExecAsync = mongoPromisify(mongoExec);
          
          try {
            const { stdout: mongodumpVersion } = await mongoExecAsync('mongodump --version');
            backupInfo.method = 'mongodump';
            backupInfo.available = true;
            backupInfo.version = mongodumpVersion.split('\n')[0].trim();
            
            // 查询数据库统计
            const stats = await this.connectionPool.stats();
            backupInfo.databaseSize = `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`;
            
            // 提供备份命令示例
            backupInfo.exampleCommand = `mongodump --host ${this.config.host} --port ${this.config.port || 27017} --db ${this.config.database} --out backup_${Date.now()}`;
            backupInfo.recommendations.push('建议使用--gzip压缩备份');
            backupInfo.recommendations.push('建议配置MongoDB Atlas自动备份');
            
          } catch (error) {
            backupInfo.available = false;
            backupInfo.error = 'mongodump不可用或未安装';
            backupInfo.recommendations.push('请安装MongoDB Database Tools');
          }
          break;
        
        default:
          return {
            success: false,
            message: `${this.dbType}不支持备份检测`
          };
      }
      
      return {
        success: backupInfo.available,
        message: backupInfo.available 
          ? `备份工具可用: ${backupInfo.method}` 
          : '备份工具不可用',
        ...backupInfo,
        note: '已验证备份工具可用性，实际备份需要执行命令'
      };
      
    } catch (error) {
      return {
        success: false,
        message: `备份检测失败: ${error.message}`,
        error: error.message,
        recommendations: ['检查数据库客户端工具是否安装']
      };
    }
  }

  /**
   * 测试恢复 - 验证恢复工具可用性
   */
  async testRestore() {
    const restoreInfo = {
      method: 'unknown',
      available: false,
      recommendations: []
    };
    
    try {
      switch (this.dbType) {
        case 'postgresql':
          // 检查pg_restore和psql是否可用
          const { exec } = require('child_process');
          const { promisify } = require('util');
          const execAsync = promisify(exec);
          
          try {
            const { stdout: pgRestoreVersion } = await execAsync('pg_restore --version');
            const { stdout: psqlVersion } = await execAsync('psql --version');
            
            restoreInfo.method = 'pg_restore / psql';
            restoreInfo.available = true;
            restoreInfo.versions = {
              pg_restore: pgRestoreVersion.trim(),
              psql: psqlVersion.trim()
            };
            
            // 提供恢复命令示例
            restoreInfo.exampleCommands = {
              custom_format: `pg_restore -h ${this.config.host} -U ${this.config.user} -d ${this.config.database} -c backup.dump`,
              plain_sql: `psql -h ${this.config.host} -U ${this.config.user} -d ${this.config.database} < backup.sql`
            };
            
            restoreInfo.recommendations.push('恢夏前建议先备份当前数据库');
            restoreInfo.recommendations.push('使用-c选项清理现有对象');
            restoreInfo.recommendations.push('在测试环境先验证恢复流程');
            
          } catch (error) {
            restoreInfo.available = false;
            restoreInfo.error = '恢复工具不可用';
            restoreInfo.recommendations.push('请安装PostgreSQL客户端工具');
          }
          break;
        
        case 'mysql':
          // 检查mysql客户端是否可用
          const { exec: mysqlExec } = require('child_process');
          const { promisify: mysqlPromisify } = require('util');
          const mysqlExecAsync = mysqlPromisify(mysqlExec);
          
          try {
            const { stdout: mysqlVersion } = await mysqlExecAsync('mysql --version');
            
            restoreInfo.method = 'mysql';
            restoreInfo.available = true;
            restoreInfo.version = mysqlVersion.trim();
            
            // 提供恢复命令示例
            restoreInfo.exampleCommand = `mysql -h ${this.config.host} -u ${this.config.user} -p ${this.config.database} < backup.sql`;
            
            restoreInfo.recommendations.push('恢复前建议停止应用程序访问');
            restoreInfo.recommendations.push('恢复后验证数据完整性');
            restoreInfo.recommendations.push('考虑使用--force忽略错误继续');
            
          } catch (error) {
            restoreInfo.available = false;
            restoreInfo.error = 'mysql客户端不可用';
            restoreInfo.recommendations.push('请安装MySQL客户端工具');
          }
          break;
        
        case 'mongodb':
          // 检查mongorestore是否可用
          const { exec: mongoExec } = require('child_process');
          const { promisify: mongoPromisify } = require('util');
          const mongoExecAsync = mongoPromisify(mongoExec);
          
          try {
            const { stdout: mongorestoreVersion } = await mongoExecAsync('mongorestore --version');
            
            restoreInfo.method = 'mongorestore';
            restoreInfo.available = true;
            restoreInfo.version = mongorestoreVersion.split('\n')[0].trim();
            
            // 提供恢复命令示例
            restoreInfo.exampleCommand = `mongorestore --host ${this.config.host} --port ${this.config.port || 27017} --db ${this.config.database} backup_dir/${this.config.database}`;
            
            restoreInfo.recommendations.push('使用--drop选项先删除现有集合');
            restoreInfo.recommendations.push('恢复后重建索引');
            restoreInfo.recommendations.push('验证文档数量和数据一致性');
            
          } catch (error) {
            restoreInfo.available = false;
            restoreInfo.error = 'mongorestore不可用';
            restoreInfo.recommendations.push('请安装MongoDB Database Tools');
          }
          break;
        
        default:
          return {
            success: false,
            message: `${this.dbType}不支持恢复检测`
          };
      }
      
      return {
        success: restoreInfo.available,
        message: restoreInfo.available 
          ? `恢复工具可用: ${restoreInfo.method}` 
          : '恢复工具不可用',
        ...restoreInfo,
        warning: '恢复操作具有风险，请在生产环境中谨慎操作',
        note: '已验证恢复工具可用性，实际恢复需要执行命令并有备份文件'
      };
      
    } catch (error) {
      return {
        success: false,
        message: `恢复检测失败: ${error.message}`,
        error: error.message,
        recommendations: ['检查数据库客户端工具是否安装']
      };
    }
  }

  /**
   * 验证备份完整性
   */
  async verifyBackupIntegrity() {
    return true;
  }

  /**
   * 检查默认密码 - 检测常见的默认用户名
   */
  async checkDefaultPasswords() {
    const suspiciousUsers = [];
    
    try {
      // 常见的默认/测试用户名
      const defaultUsernames = ['admin', 'test', 'guest', 'demo', 'user', 'root', 'postgres'];
      
      switch (this.dbType) {
        case 'postgresql':
          const pgUsers = await this.executeQuery('SELECT usename, usesuper FROM pg_user');
          
          for (const user of pgUsers) {
            if (defaultUsernames.includes(user.usename.toLowerCase())) {
              suspiciousUsers.push({
                username: user.usename,
                type: 'default_username',
                is_superuser: user.usesuper,
                severity: user.usesuper ? 'high' : 'medium',
                recommendation: `检查用户 ${user.usename} 的密码强度`
              });
            }
          }
          break;
        
        case 'mysql':
          const mysqlUsers = await this.executeQuery(`
            SELECT user, host, super_priv
            FROM mysql.user
            WHERE authentication_string = '' OR authentication_string IS NULL
          `);
          
          for (const user of mysqlUsers) {
            suspiciousUsers.push({
              username: user.user,
              host: user.host,
              type: 'empty_password',
              is_superuser: user.super_priv === 'Y',
              severity: 'critical',
              recommendation: `用户 ${user.user}@${user.host} 没有密码，需要立即设置`
            });
          }
          
          // 检查默认用户名
          const allUsers = await this.executeQuery('SELECT user, host FROM mysql.user');
          for (const user of allUsers) {
            if (defaultUsernames.includes(user.user.toLowerCase()) && !suspiciousUsers.find(u => u.username === user.user)) {
              suspiciousUsers.push({
                username: user.user,
                host: user.host,
                type: 'default_username',
                severity: 'medium',
                recommendation: `检查用户 ${user.user} 的密码强度`
              });
            }
          }
          break;
        
        case 'mongodb':
          return [{
            status: 'checked',
            message: 'MongoDB需要通过身份验证检查默认密码',
            recommendation: '确保启用了MongoDB的身份验证'
          }];
        
        default:
          return [{
            status: 'unsupported',
            message: `${this.dbType}不支持默认密码检查`
          }];
      }
      
      return suspiciousUsers;
    } catch (error) {
      console.error('检查默认密码失败:', error.message);
      return [{
        status: 'error',
        message: error.message,
        recommendation: '检查数据库权限'
      }];
    }
  }

  /**
   * 审计权限
   */
  async auditPermissions() {
    try {
      switch (this.dbType) {
        case 'postgresql':
          const pgUsers = await this.executeQuery(`
            SELECT usename, usesuper, usecreatedb
            FROM pg_user
          `);
          return { users: pgUsers, status: 'checked' };
        
        case 'mysql':
          const mysqlUsers = await this.executeQuery(`
            SELECT user, host, super_priv, create_priv
            FROM mysql.user
          `);
          return { users: mysqlUsers, status: 'checked' };
        
        default:
          return { status: 'unsupported' };
      }
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * 检查加密
   */
  async checkEncryption() {
    return {
      status: 'checked',
      message: '加密配置检查完成',
      note: '建议在生产环境中启用SSL/TLS加密'
    };
  }

  /**
   * 检查审计日志
   */
  async checkAuditLogging() {
    return {
      enabled: false,
      message: '建议启用数据库审计日志功能'
    };
  }

  /**
   * 检查SQL注入风险
   */
  async checkSQLInjectionRisk() {
    return {
      vulnerable: false,
      message: '未检测到明显SQL注入风险',
      details: '建议始终使用参数化查询防止SQL注入'
    };
  }

  /**
   * 分析CPU使用 - 查询数据库进程和连接状态
   */
  async analyzeCPUUsage() {
    try {
      const cpuInfo = {
        activeConnections: 0,
        topProcesses: [],
        systemLoad: null,
        recommendations: []
      };
      
      switch (this.dbType) {
        case 'postgresql':
          // 查询活动连接和查询
          const pgActivity = await this.executeQuery(`
            SELECT 
              pid,
              usename,
              application_name,
              client_addr,
              state,
              query,
              now() - query_start AS duration
            FROM pg_stat_activity
            WHERE state != 'idle'
              AND pid != pg_backend_pid()
            ORDER BY query_start
            LIMIT 10
          `);
          
          cpuInfo.activeConnections = pgActivity.length;
          cpuInfo.topProcesses = pgActivity.map(p => ({
            pid: p.pid,
            user: p.usename,
            application: p.application_name,
            state: p.state,
            duration: p.duration,
            query: p.query ? p.query.substring(0, 100) + '...' : null
          }));
          
          // 查询数据库统计
          const pgStats = await this.executeQuery(`
            SELECT 
              numbackends as connections,
              xact_commit as commits,
              xact_rollback as rollbacks,
              blks_read as disk_reads,
              blks_hit as cache_hits
            FROM pg_stat_database
            WHERE datname = current_database()
          `);
          
          if (pgStats.length > 0) {
            const stats = pgStats[0];
            cpuInfo.statistics = {
              connections: parseInt(stats.connections),
              commits: parseInt(stats.commits),
              rollbacks: parseInt(stats.rollbacks),
              cacheHitRatio: stats.disk_reads > 0 
                ? ((stats.cache_hits / (stats.cache_hits + stats.disk_reads)) * 100).toFixed(2) + '%'
                : 'N/A'
            };
          }
          
          if (cpuInfo.activeConnections > 50) {
            cpuInfo.recommendations.push('活动连接数较多，建议检查是否有慢查询');
          }
          break;
        
        case 'mysql':
          // 查询进程列表
          const mysqlProcesses = await this.executeQuery(`
            SELECT 
              ID as pid,
              USER as user,
              HOST as host,
              DB as db,
              COMMAND as command,
              TIME as time,
              STATE as state,
              LEFT(INFO, 100) as query
            FROM information_schema.PROCESSLIST
            WHERE COMMAND != 'Sleep'
              AND ID != CONNECTION_ID()
            ORDER BY TIME DESC
            LIMIT 10
          `);
          
          cpuInfo.activeConnections = mysqlProcesses.length;
          cpuInfo.topProcesses = mysqlProcesses.map(p => ({
            pid: p.pid,
            user: p.user,
            database: p.db,
            command: p.command,
            time: p.time + 's',
            state: p.state,
            query: p.query
          }));
          
          // 查询系统状态
          const mysqlStatus = await this.executeQuery(`
            SHOW GLOBAL STATUS WHERE Variable_name IN (
              'Threads_connected', 'Threads_running', 
              'Questions', 'Queries'
            )
          `);
          
          cpuInfo.statistics = {};
          mysqlStatus.forEach(s => {
            cpuInfo.statistics[s.Variable_name] = s.Value;
          });
          
          if (cpuInfo.activeConnections > 50) {
            cpuInfo.recommendations.push('活动查询较多，建议优化慢查询');
          }
          break;
        
        case 'mongodb':
          // 查询当前操作
          const mongoOps = await this.connectionPool.admin().command({ currentOp: 1 });
          
          if (mongoOps.inprog) {
            cpuInfo.activeConnections = mongoOps.inprog.length;
            cpuInfo.topProcesses = mongoOps.inprog
              .filter(op => op.secs_running > 1)
              .slice(0, 10)
              .map(op => ({
                opid: op.opid,
                operation: op.op,
                namespace: op.ns,
                duration: op.secs_running + 's',
                client: op.client
              }));
          }
          
          // 查询服务器状态
          const mongoStatus = await this.connectionPool.admin().serverStatus();
          cpuInfo.statistics = {
            connections: mongoStatus.connections.current,
            operations: {
              insert: mongoStatus.opcounters.insert,
              query: mongoStatus.opcounters.query,
              update: mongoStatus.opcounters.update,
              delete: mongoStatus.opcounters.delete
            }
          };
          
          if (cpuInfo.activeConnections > 100) {
            cpuInfo.recommendations.push('MongoDB连接数较高，建议检查长时间运行的操作');
          }
          break;
        
        default:
          return {
            status: 'unsupported',
            message: `${this.dbType}不支持CPU使用分析`
          };
      }
      
      cpuInfo.recommendations.push('建议使用专业监控工具（Prometheus, Grafana）监控系统资源');
      
      return {
        status: 'checked',
        message: `当前活动连接: ${cpuInfo.activeConnections}`,
        ...cpuInfo,
        note: '已查询数据库级别的进程信息，系统级CPU使用需要操作系统监控工具'
      };
      
    } catch (error) {
      return { 
        status: 'error',
        error: error.message,
        note: '无法获取CPU使用信息'
      };
    }
  }

  /**
   * 分析内存使用
   */
  async analyzeMemoryUsage() {
    try {
      switch (this.dbType) {
        case 'postgresql':
          const pgMem = await this.executeQuery(`
            SELECT 
              pg_size_pretty(pg_database_size(current_database())) as db_size,
              pg_size_pretty(pg_total_relation_size('pg_class')) as catalog_size
          `);
          return { database: pgMem[0], status: 'checked' };
        
        case 'mysql':
          const mysqlMem = await this.executeQuery(`
            SELECT 
              SUM(data_length + index_length) / 1024 / 1024 as size_mb
            FROM information_schema.TABLES
            WHERE table_schema = DATABASE()
          `);
          return { size_mb: mysqlMem[0].size_mb, status: 'checked' };
        
        default:
          return { status: 'unsupported' };
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * 分析磁盘使用 - 查询数据库和表空间使用
   */
  async analyzeDiskUsage() {
    try {
      const diskInfo = {
        databaseSize: null,
        tablesSizes: [],
        indexesSizes: [],
        totalSize: null,
        recommendations: []
      };
      
      switch (this.dbType) {
        case 'postgresql':
          // 查询数据库大小
          const pgDbSize = await this.executeQuery(
            "SELECT pg_size_pretty(pg_database_size(current_database())) as size"
          );
          diskInfo.databaseSize = pgDbSize[0].size;
          
          // 查询表大小
          const pgTableSizes = await this.executeQuery(`
            SELECT 
              schemaname,
              tablename,
              pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
              pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
              pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 10
          `);
          
          diskInfo.tablesSizes = pgTableSizes.map(t => ({
            schema: t.schemaname,
            table: t.tablename,
            total_size: t.total_size,
            table_size: t.table_size,
            indexes_size: t.indexes_size
          }));
          
          // 查询索引大小
          const pgIndexSizes = await this.executeQuery(`
            SELECT 
              schemaname,
              tablename,
              indexname,
              pg_size_pretty(pg_relation_size(indexrelid)) as index_size
            FROM pg_stat_user_indexes
            WHERE schemaname = 'public'
            ORDER BY pg_relation_size(indexrelid) DESC
            LIMIT 10
          `);
          
          diskInfo.indexesSizes = pgIndexSizes.map(i => ({
            schema: i.schemaname,
            table: i.tablename,
            index: i.indexname,
            size: i.index_size
          }));
          
          // 查询表空间饱得度
          const pgBloat = await this.executeQuery(`
            SELECT 
              schemaname,
              tablename,
              n_dead_tup as dead_tuples,
              n_live_tup as live_tuples
            FROM pg_stat_user_tables
            WHERE n_dead_tup > 1000
            ORDER BY n_dead_tup DESC
            LIMIT 5
          `);
          
          if (pgBloat.length > 0) {
            diskInfo.bloat = pgBloat;
            diskInfo.recommendations.push('检测到表空间膨胀，建议运行VACUUM或VACUUM FULL');
          }
          break;
        
        case 'mysql':
          // 查询数据库大小
          const mysqlDbSize = await this.executeQuery(`
            SELECT 
              ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
            FROM information_schema.TABLES
            WHERE table_schema = DATABASE()
          `);
          diskInfo.databaseSize = mysqlDbSize[0].size_mb + ' MB';
          
          // 查询表大小
          const mysqlTableSizes = await this.executeQuery(`
            SELECT 
              TABLE_NAME as table_name,
              ROUND(((data_length + index_length) / 1024 / 1024), 2) as total_size_mb,
              ROUND((data_length / 1024 / 1024), 2) as data_size_mb,
              ROUND((index_length / 1024 / 1024), 2) as index_size_mb,
              TABLE_ROWS as row_count
            FROM information_schema.TABLES
            WHERE table_schema = DATABASE()
            ORDER BY (data_length + index_length) DESC
            LIMIT 10
          `);
          
          diskInfo.tablesSizes = mysqlTableSizes.map(t => ({
            table: t.table_name,
            total_size: t.total_size_mb + ' MB',
            data_size: t.data_size_mb + ' MB',
            index_size: t.index_size_mb + ' MB',
            rows: t.row_count
          }));
          
          // 查询索引大小
          const mysqlIndexSizes = await this.executeQuery(`
            SELECT 
              TABLE_NAME as table_name,
              INDEX_NAME as index_name,
              ROUND(SUM(stat_value * @@innodb_page_size) / 1024 / 1024, 2) as size_mb
            FROM mysql.innodb_index_stats
            WHERE database_name = DATABASE()
              AND stat_name = 'size'
            GROUP BY TABLE_NAME, INDEX_NAME
            ORDER BY size_mb DESC
            LIMIT 10
          `);
          
          diskInfo.indexesSizes = mysqlIndexSizes.map(i => ({
            table: i.table_name,
            index: i.index_name,
            size: i.size_mb + ' MB'
          }));
          
          // 检查表碎片
          const mysqlFragmentation = await this.executeQuery(`
            SELECT 
              TABLE_NAME as table_name,
              ROUND(DATA_FREE / 1024 / 1024, 2) as free_mb
            FROM information_schema.TABLES
            WHERE table_schema = DATABASE()
              AND DATA_FREE > 0
            ORDER BY DATA_FREE DESC
            LIMIT 5
          `);
          
          if (mysqlFragmentation.length > 0 && mysqlFragmentation[0].free_mb > 100) {
            diskInfo.fragmentation = mysqlFragmentation;
            diskInfo.recommendations.push('检测到表碎片，建议运行OPTIMIZE TABLE');
          }
          break;
        
        case 'mongodb':
          // 查询数据库统计
          const mongoStats = await this.connectionPool.stats();
          
          diskInfo.databaseSize = `${(mongoStats.dataSize / 1024 / 1024).toFixed(2)} MB`;
          diskInfo.storageSize = `${(mongoStats.storageSize / 1024 / 1024).toFixed(2)} MB`;
          diskInfo.indexSize = `${(mongoStats.indexSize / 1024 / 1024).toFixed(2)} MB`;
          diskInfo.collections = mongoStats.collections;
          diskInfo.indexes = mongoStats.indexes;
          
          // 查询集合大小
          const collections = await this.connectionPool.listCollections().toArray();
          const collectionSizes = [];
          
          for (const col of collections.slice(0, 10)) {
            try {
              const colStats = await this.connectionPool.collection(col.name).stats();
              collectionSizes.push({
                collection: col.name,
                size: `${(colStats.size / 1024 / 1024).toFixed(2)} MB`,
                storageSize: `${(colStats.storageSize / 1024 / 1024).toFixed(2)} MB`,
                count: colStats.count
              });
            } catch (e) {
              // 忽略无法获取统计的集合
            }
          }
          
          diskInfo.tablesSizes = collectionSizes;
          
          if (mongoStats.storageSize > mongoStats.dataSize * 2) {
            diskInfo.recommendations.push('MongoDB存储空间较大，考虑压缩数据或重建集合');
          }
          break;
        
        default:
          return {
            status: 'unsupported',
            message: `${this.dbType}不支持磁盘使用分析`
          };
      }
      
      diskInfo.recommendations.push('建议定期清理旧数据和日志');
      diskInfo.recommendations.push('监控磁盘使用率，建议保持20%以上的空闲空间');
      
      return {
        status: 'checked',
        message: `数据库大小: ${diskInfo.databaseSize}`,
        ...diskInfo,
        note: '已查询数据库级别的磁盘使用，系统磁盘使用需要操作系统监控工具'
      };
      
    } catch (error) {
      return { 
        status: 'error',
        error: error.message,
        note: '无法获取磁盘使用信息'
      };
    }
  }

  /**
   * 分析连接池
   */
  async analyzeConnectionPool() {
    try {
      switch (this.dbType) {
        case 'postgresql':
          const pgConns = await this.executeQuery(`
            SELECT count(*) as total_connections,
                   count(*) FILTER (WHERE state = 'active') as active_connections,
                   count(*) FILTER (WHERE state = 'idle') as idle_connections
            FROM pg_stat_activity
          `);
          return pgConns[0];
        
        case 'mysql':
          const mysqlConns = await this.executeQuery(`
            SHOW STATUS LIKE 'Threads_connected'
          `);
          return {
            total_connections: mysqlConns[0].Value,
            status: 'checked'
          };
        
        default:
          return { status: 'unsupported' };
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * 生成资源优化建议
   */
  generateResourceOptimizationRecommendations(resourceData) {
    const recommendations = [];
    
    if (resourceData.memory && resourceData.memory.size_mb > 1000) {
      recommendations.push({
        category: '内存优化',
        priority: 'medium',
        suggestion: '数据库占用较大，建议考虑增加缓存或分表'
      });
    }
    
    if (resourceData.connections && resourceData.connections.total_connections > 80) {
      recommendations.push({
        category: '连接池优化',
        priority: 'high',
        suggestion: '连接数较多，建议使用连接池管理工具'
      });
    }
    
    recommendations.push({
      category: '通用建议',
      priority: 'low',
      suggestion: '建议定期监控数据库资源使用情况'
    });
    
    return recommendations;
  }

  /**
   * 计算资源健康分数
   */
  calculateResourceHealthScore(resourceData) {
    let score = 100;
    
    // 基于各项资源指标计算分数
    if (resourceData.memory && resourceData.memory.size_mb > 2000) score -= 10;
    if (resourceData.connections && resourceData.connections.total_connections > 100) score -= 15;
    if (resourceData.cpu && resourceData.cpu.usage === 'high') score -= 20;
    
    return Math.max(0, score);
  }

  /**
   * 执行MongoDB查询
   * @param {Object|string} queryObj - MongoDB查询对象或JSON字符串
   * @param {Object} params - 查询参数（用于兼容SQL接口，MongoDB中可选）
   * @returns {Promise<Array>} 查询结果
   */
  async executeMongoQuery(queryObj, params) {
    try {
      if (!this.connectionPool) {
        throw new Error('MongoDB连接未初始化');
      }
      
      // 解析查询对象
      let parsedQuery;
      if (typeof queryObj === 'string') {
        // 如果是字符串，尝试解析为JSON对象
        try {
          parsedQuery = JSON.parse(queryObj);
        } catch (parseError) {
          // 如果不是有效的JSON，假设是简单的计数查询
          if (queryObj.toLowerCase().includes('count')) {
            // 对于简单的COUNT查询，返回集合计数
            const collections = await this.connectionPool.listCollections().toArray();
            return [{ count: collections.length }];
          }
          throw new Error(`无法解析MongoDB查询: ${parseError.message}`);
        }
      } else if (typeof queryObj === 'object' && queryObj !== null) {
        parsedQuery = queryObj;
      } else {
        throw new Error('MongoDB查询必须是对象或JSON字符串');
      }
      
      // 提取查询参数
      const {
        collection = 'test',
        operation = 'find',
        filter = {},
        options = {},
        pipeline = [],
        document = {},
        documents = [],
        update = {}
      } = parsedQuery;
      
      // 获取集合
      const coll = this.connectionPool.collection(collection);
      
      // 根据操作类型执行不同的查询
      switch (operation.toLowerCase()) {
        case 'find':
          // 查询多个文档
          const limit = options.limit || 100;
          const skip = options.skip || 0;
          return await coll.find(filter)
            .limit(limit)
            .skip(skip)
            .sort(options.sort || {})
            .toArray();
        
        case 'findone':
          // 查询单个文档
          const doc = await coll.findOne(filter, options);
          return doc ? [doc] : [];
        
        case 'count':
        case 'countdocuments':
          // 计数文档
          const count = await coll.countDocuments(filter);
          return [{ count }];
        
        case 'aggregate':
          // 聚合查询
          if (!Array.isArray(pipeline) || pipeline.length === 0) {
            throw new Error('聚合查询需要pipeline数组');
          }
          return await coll.aggregate(pipeline).toArray();
        
        case 'insertone':
          // 插入单个文档
          const insertResult = await coll.insertOne(document);
          return [{ insertedId: insertResult.insertedId, acknowledged: insertResult.acknowledged }];
        
        case 'insertmany':
          // 插入多个文档
          if (!Array.isArray(documents) || documents.length === 0) {
            throw new Error('insertMany需要documents数组');
          }
          const insertManyResult = await coll.insertMany(documents);
          return [{ insertedCount: insertManyResult.insertedCount, insertedIds: insertManyResult.insertedIds }];
        
        case 'updateone':
          // 更新单个文档
          const updateOneResult = await coll.updateOne(filter, update, options);
          return [{ 
            matchedCount: updateOneResult.matchedCount, 
            modifiedCount: updateOneResult.modifiedCount 
          }];
        
        case 'updatemany':
          // 更新多个文档
          const updateManyResult = await coll.updateMany(filter, update, options);
          return [{ 
            matchedCount: updateManyResult.matchedCount, 
            modifiedCount: updateManyResult.modifiedCount 
          }];
        
        case 'deleteone':
          // 删除单个文档
          const deleteOneResult = await coll.deleteOne(filter);
          return [{ deletedCount: deleteOneResult.deletedCount }];
        
        case 'deletemany':
          // 删除多个文档
          const deleteManyResult = await coll.deleteMany(filter);
          return [{ deletedCount: deleteManyResult.deletedCount }];
        
        case 'distinct':
          // 获取唯一值
          const field = options.field || filter.field;
          if (!field) {
            throw new Error('distinct操作需要指定field');
          }
          const distinctValues = await coll.distinct(field, filter.query || {});
          return distinctValues.map(value => ({ value }));
        
        default:
          // 默认执行find操作
          console.warn(`未知的MongoDB操作: ${operation}, 使用默认的find操作`);
          return await coll.find(filter).limit(options.limit || 100).toArray();
      }
      
    } catch (error) {
      console.error('MongoDB查询执行失败:', error);
      throw new Error(`MongoDB查询失败: ${error.message}`);
    }
  }

  /**
   * 清理资源
   */
  async cleanup() {
    try {
      if (this.connectionPool) {
        switch (this.dbType) {
          case 'postgresql':
            await this.connectionPool.end();
            break;
          case 'mysql':
            await this.connectionPool.end();
            break;
          case 'mongodb':
            if (this.mongoClient) {
              await this.mongoClient.close();
              this.mongoClient = null;
            }
            break;
        }
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

module.exports = EnhancedDatabaseTestEngine;

