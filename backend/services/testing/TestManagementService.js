/**
 * 测试管理服务
 * 统一管理所有测试引擎的执行、历史记录和报告生成
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const DatabaseService = require('../core/DatabaseService');
const ReportGenerator = require('../reporting/ReportGenerator');

// 引入各个测试引擎
const PerformanceTestEngine = require('../../engines/performance/PerformanceTestEngine');
const SecurityTestEngine = require('../../engines/security/SecurityTestEngine');
const SEOTestEngine = require('../../engines/seo/SEOTestEngine');
const APITestEngine = require('../../engines/api/apiTestEngine');
const StressTestEngine = require('../../engines/stress/stressTestEngine');
const DatabaseTestEngine = require('../../engines/database/DatabaseTestEngine');


/**


 * TestManagementService类 - 负责处理相关功能


 */
const NetworkTestEngine = require('../../engines/network/NetworkTestEngine');


  /**

   * 处理constructor事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
class TestManagementService extends EventEmitter {
  constructor() {
    super();
    this.engines = new Map();
    this.testQueue = new Map();
    this.activeTests = new Map();
    this.wsManager = null;
    this.reportGenerator = new ReportGenerator();
    this.db = null;
    
    this.initializeEngines();
  }

  /**
   * 初始化所有测试引擎
   */
  initializeEngines() {
    const engineConfigs = [
      { id: 'performance', name: '性能测试引擎', class: PerformanceTestEngine },
      { id: 'security', name: '安全测试引擎', class: SecurityTestEngine },
      { id: 'seo', name: 'SEO测试引擎', class: SEOTestEngine },
      { id: 'api', name: 'API测试引擎', class: APITestEngine },
      { id: 'stress', name: '压力测试引擎', class: StressTestEngine },
      { id: 'database', name: '数据库测试引擎', class: DatabaseTestEngine },
      { id: 'network', name: '网络测试引擎', class: NetworkTestEngine }
    ];

    engineConfigs.forEach(config => {
      try {
        const engine = new config.class();
        engine.on('progress', (data) => this.handleEngineProgress(config.id, data));
        engine.on('complete', (data) => this.handleEngineComplete(config.id, data));
        engine.on('error', (data) => this.handleEngineError(config.id, data));
        
        this.engines.set(config.id, {
          ...config,
          instance: engine,
          status: 'idle',
          metrics: {
            totalTests: 0,
            successRate: 100,
            avgExecutionTime: 0,
            activeTests: 0
          }
        });
      } catch (error) {
        console.error(`Failed to initialize engine ${config.id}:`, error);
      }
    });
  }

  /**
   * 初始化服务
   */
  async initialize(dbConfig, wsManager) {
    this.db = new DatabaseService(dbConfig);
    await this.db.initialize();
    this.wsManager = wsManager;
    
    // 恢复未完成的测试
    await this.recoverPendingTests();
    
  }

  /**
   * 创建新的测试任务
   */
  async createTest(userId, engineType, config) {
    const providedTestId = config?.testId;
    const testId = providedTestId || `test_${Date.now()}_${uuidv4().substring(0, 8)}`;
    
    // 验证引擎是否存在
    if (!this.engines.has(engineType)) {
      throw new Error(`Unknown engine type: ${engineType}`);
    }

    const engine = this.engines.get(engineType);
    const safeConfig = config || {};
    const testConfig = {
      ...safeConfig,
      testId
    };
    
    // 创建测试记录
    const testRecord = {
      test_id: testId,
      user_id: userId,
      engine_type: engineType,
      engine_name: engine.name,
      test_name: safeConfig.name || `${engine.name} - ${new Date().toLocaleString()}`,
      test_url: safeConfig.url,
      test_config: testConfig,
      status: 'pending',
      progress: 0,
      priority: safeConfig.priority || 'medium',
      created_at: new Date()
    };

    // 保存到数据库
    const result = await this.db.query(
      `INSERT INTO test_history 
       (test_id, user_id, engine_type, engine_name, test_name, test_url, test_config, status, progress, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [testRecord.test_id, testRecord.user_id, testRecord.engine_type, 
       testRecord.engine_name, testRecord.test_name, testRecord.test_url, 
       JSON.stringify(testRecord.test_config), testRecord.status, 
       testRecord.progress, testRecord.priority]
    );

    const test = result.rows[0];
    
    // 添加到队列
    this.testQueue.set(testId, test);
    
    // 触发测试执行
    this.processTestQueue();
    
    return test;
  }

  /**
   * 执行测试
   */
  async executeTest(testId) {
    const test = this.testQueue.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found in queue`);
    }


    /**

     * if功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
    const engine = this.engines.get(test.engine_type);
    if (!engine || !engine.instance) {
      throw new Error(`Engine ${test.engine_type} not available`);
    }

    // 更新测试状态
    await this.updateTestStatus(testId, 'running', 0);
    this.activeTests.set(testId, test);
    this.testQueue.delete(testId);

    // 更新引擎状态
    engine.status = 'running';
    engine.metrics.activeTests++;

    // 广播状态更新
    this.broadcastTestUpdate(testId, {
      status: 'running',
      progress: 0,
      message: '测试开始执行'
    });

    try {
      const startTime = Date.now();
      
      // 执行测试
      const result = await engine.instance.execute(test.test_config);
      
      const executionTime = Math.round((Date.now() - startTime) / 1000);
      
      // 保存测试结果
      await this.saveTestResult(testId, result, executionTime);
      
      // 生成报告
      const report = await this.reportGenerator.generateReport(test, result);
      await this.saveTestReport(testId, report);
      
      // 更新引擎指标
      this.updateEngineMetrics(test.engine_type, true, executionTime);
      
      return { success: true, result, report };
      
    } catch (error) {
      console.error(`Test ${testId} failed:`, error);
      
      // 保存错误信息
      await this.saveTestError(testId, error);
      
      // 更新引擎指标
      this.updateEngineMetrics(test.engine_type, false);
      
      throw error;
      
    } finally {
      // 清理
      this.activeTests.delete(testId);
      engine.metrics.activeTests--;
      if (engine.metrics.activeTests === 0) {
        engine.status = 'idle';
      }
    }
  }

  /**
   * 处理测试队列
   */
  async processTestQueue() {
    // 获取可用的引擎
    for (const [engineType, engine] of this.engines) {
      if (engine.status === 'idle' && engine.metrics.activeTests < 5) {
        // 查找该引擎类型的待处理测试
        const pendingTest = Array.from(this.testQueue.values())
          .find(test => test.engine_type === engineType && test.status === 'pending');
        
        if (pendingTest) {
          try {
            await this.executeTest(pendingTest.test_id);
          } catch (error) {
            console.error(`Failed to execute test ${pendingTest.test_id}:`, error);
          }
        }
      }
    }
  }

  /**
   * 获取测试历史
   */
  async getTestHistory(userId, filters = {}) {
    let query = `
      SELECT 
        th.*,
        COUNT(*) OVER() as total_count
      FROM test_history th
      WHERE th.user_id = $1
    `;
    
    const params = [userId];
    let paramIndex = 2;

    // 添加过滤条件
    if (filters.engineType) {
      query += ` AND th.engine_type = $${paramIndex}`;
      params.push(filters.engineType);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND th.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.startDate) {
      query += ` AND th.created_at >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND th.created_at <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    // 排序和分页
    query += ` ORDER BY th.created_at DESC`;
    
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    const result = await this.db.query(query, params);
    
    return {
      tests: result.rows,
      total: result.rows[0]?.total_count || 0
    };
  }

  /**
   * 获取测试详情
   */
  async getTestDetails(testId, userId) {
    const query = `
      SELECT 
        th.*,
        tr.report_data,
        tr.format as report_format,
        tr.file_path as report_path,
        array_agg(
          json_build_object(
            'name', trd.metric_name,
            'value', trd.metric_value,
            'unit', trd.metric_unit,
            'passed', trd.passed,
            'severity', trd.severity
          )
        ) as metrics
      FROM test_history th
      LEFT JOIN test_reports tr ON th.id = tr.test_history_id
      LEFT JOIN test_result_details trd ON th.id = trd.test_history_id
      WHERE th.test_id = $1 AND th.user_id = $2
      GROUP BY th.id, tr.id
    `;


    
    /**

    
     * if功能函数

    
     * @param {Object} params - 参数对象

    
     * @returns {Promise<Object>} 返回结果

    
     */
    const result = await this.db.query(query, [testId, userId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * 获取测试统计
   */
  async getTestStatistics(userId, period = '7d') {
    const periodMap = {
      '1d': '1 day',
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days'
    };

    const interval = periodMap[period] || '7 days';

    const query = `
      SELECT 
        engine_type,
        COUNT(*) as total_tests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
        AVG(CASE WHEN score IS NOT NULL THEN score END) as avg_score,
        AVG(execution_time) as avg_execution_time,
        MAX(created_at) as last_test_date
      FROM test_history
      WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY engine_type
    `;

    const result = await this.db.query(query, [userId]);
    
    return result.rows;
  }

  /**
   * 更新测试状态
   */
  async updateTestStatus(testId, status, progress = null) {
    let query = `UPDATE test_history SET status = $2`;
    const params = [testId, status];
    let paramIndex = 3;

    if (progress !== null) {
      query += `, progress = $${paramIndex}`;
      params.push(progress);
      paramIndex++;
    }

    if (status === 'running') {
      query += `, started_at = NOW()`;
    } else if (status === 'completed' || status === 'failed') {
      query += `, completed_at = NOW()`;
    }

    query += ` WHERE test_id = $1 RETURNING *`;
    
    const result = await this.db.query(query, params);
    
    // 广播状态更新
    this.broadcastTestUpdate(testId, {
      status,
      progress,
      test: result.rows[0]
    });

    return result.rows[0];
  }

  /**
   * 保存测试结果
   */
  async saveTestResult(testId, result, executionTime) {
    // 计算分数和等级
    const { score, grade } = this.calculateScoreAndGrade(result);
    
    // 更新主表
    await this.db.query(
      `UPDATE test_history 
       SET status = 'completed',
           progress = 100,
           result = $2,
           score = $3,
           grade = $4,
           passed = $5,
           execution_time = $6,
           completed_at = NOW()
       WHERE test_id = $1`,
      [testId, JSON.stringify(result), score, grade, score >= 60, executionTime]
    );

    // 保存详细指标
    if (result.metrics) {
      for (const [metricName, metricData] of Object.entries(result.metrics)) {
        await this.db.query(
          `INSERT INTO test_result_details 
           (test_history_id, metric_name, metric_value, metric_unit, 
            metric_type, passed, severity, recommendation)
           SELECT id, $2, $3, $4, $5, $6, $7, $8
           FROM test_history WHERE test_id = $1`,
          [testId, metricName, JSON.stringify(metricData.value), 
           metricData.unit, result.engineType, metricData.passed, 
           metricData.severity, metricData.recommendation]
        );
      }
    }
  }

  /**
   * 保存测试错误
   */
  async saveTestError(testId, error) {
    await this.db.query(
      `UPDATE test_history 
       SET status = 'failed',
           errors = $2,
           completed_at = NOW()
       WHERE test_id = $1`,
      [testId, JSON.stringify([{
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
      }])]
    );
  }

  /**
   * 保存测试报告
   */
  async saveTestReport(testId, report) {
    await this.db.query(
      `INSERT INTO test_reports 
       (test_history_id, report_type, format, report_data, file_path)
       SELECT id, $2, $3, $4, $5
       FROM test_history WHERE test_id = $1`,
      [testId, report.type, report.format, JSON.stringify(report.data), report.filePath]
    );
  }

  /**
   * 计算分数和等级
   */
  calculateScoreAndGrade(result) {
    let score = 0;
    let grade = 'F';

    if (result.score !== undefined) {
      score = result.score;
    } else if (result.metrics) {
      // 基于通过的指标计算分数
      const metrics = Object.values(result.metrics);
      const passed = metrics.filter(m => m.passed).length;
      score = Math.round((passed / metrics.length) * 100);
    }

    // 计算等级
    if (score >= 90) grade = 'A+';
    else if (score >= 80) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 50) grade = 'D';
    else grade = 'F';

    return { score, grade };
  }

  /**
   * 更新引擎指标
   */
  updateEngineMetrics(engineType, success, executionTime = 0) {
    const engine = this.engines.get(engineType);
    if (!engine) return;

    engine.metrics.totalTests++;
    
    if (success) {
      const successCount = Math.round(engine.metrics.totalTests * engine.metrics.successRate / 100);
      engine.metrics.successRate = Math.round(((successCount + 1) / engine.metrics.totalTests) * 100);
    } else {
      const successCount = Math.round(engine.metrics.totalTests * engine.metrics.successRate / 100);
      engine.metrics.successRate = Math.round((successCount / engine.metrics.totalTests) * 100);
    }

    if (executionTime > 0) {
      const totalTime = engine.metrics.avgExecutionTime * (engine.metrics.totalTests - 1);
      engine.metrics.avgExecutionTime = Math.round((totalTime + executionTime) / engine.metrics.totalTests);
    }
  }

  /**
   * 广播测试更新
   */
  broadcastTestUpdate(testId, data) {
    // 使用全局Socket.IO实例广播
    if (global.io) {
      // 广播到特定测试房间
      global.io.to(`test-${testId}`).emit('test-update', {
        testId,
        ...data,
        timestamp: new Date()
      });
      
      // 也广播到通用测试更新房间
      global.io.to('test-updates').emit('test-update', {
        testId,
        ...data,
        timestamp: new Date()
      });
    }
    
    // 使用传入的WebSocket管理器
    if (this.wsManager && this.wsManager.emit) {
      this.wsManager.emit('test-update', {
        testId,
        ...data,
        timestamp: new Date()
      });
    }

    this.emit('test-update', { testId, ...data });
  }

  /**
   * 处理引擎进度更新
   */
  handleEngineProgress(engineType, data) {
    const testId = data.testId;
    if (testId) {
      this.updateTestStatus(testId, 'running', data.progress);
      this.broadcastTestUpdate(testId, {
        status: 'running',
        progress: data.progress,
        message: data.message
      });
    }
  }

  /**
   * 处理引擎完成
   */
  handleEngineComplete(engineType, data) {
    const testId = data.testId;
    if (testId) {
      this.broadcastTestUpdate(testId, {
        status: 'completed',
        progress: 100,
        message: '测试完成'
      });
    }
  }

  /**
   * 处理引擎错误
   */
  handleEngineError(engineType, data) {
    const testId = data.testId;
    if (testId) {
      this.broadcastTestUpdate(testId, {
        status: 'failed',
        error: data.error,
        message: '测试失败'
      });
    }
  }

  /**
   * 恢复未完成的测试
   */
  async recoverPendingTests() {
    const result = await this.db.query(
      `UPDATE test_history 
       SET status = 'failed', 
           errors = jsonb_build_array(jsonb_build_object(
             'message', 'Test interrupted due to system restart',
             'timestamp', NOW()
           ))
       WHERE status IN ('running', 'pending')
       RETURNING *`
    );

    if (result.rows.length > 0) {
      console.warn(`Recovered ${result.rows.length} pending tests after restart.`);
    }
  }

  /**
   * 获取引擎状态
   */
  getEngineStatus() {
    const status = {};
    for (const [id, engine] of this.engines) {
      status[id] = {
        id,
        name: engine.name,
        status: engine.status,
        metrics: engine.metrics
      };
    }
    return status;
  }

  /**
   * 取消测试
   */
  async cancelTest(testId, userId) {
    // 验证权限
    const test = await this.getTestDetails(testId, userId);
    if (!test) {
      throw new Error('Test not found or access denied');
    }

    if (test.status === 'completed' || test.status === 'failed') {
      throw new Error('Cannot cancel completed test');
    }

    // 如果测试正在运行，尝试停止
    if (this.activeTests.has(testId)) {
      const engine = this.engines.get(test.engine_type);
      if (engine && engine.instance.cancel) {
        await engine.instance.cancel(testId);
      }
      this.activeTests.delete(testId);
    }

    // 从队列中移除
    this.testQueue.delete(testId);

    // 更新状态
    await this.updateTestStatus(testId, 'cancelled');

    return { success: true, message: 'Test cancelled successfully' };
  }

  /**
   * 重新运行测试
   */
  async rerunTest(testId, userId) {
    // 获取原测试配置
    const originalTest = await this.getTestDetails(testId, userId);
    if (!originalTest) {
      throw new Error('Test not found or access denied');
    }

    // 创建新测试
    return await this.createTest(userId, originalTest.engine_type, originalTest.test_config);
  }

  /**
   * 清理资源
   */
  async cleanup() {
    // 取消所有活动测试
    for (const testId of this.activeTests.keys()) {
      try {
        await this.cancelTest(testId);
      } catch (error) {
        console.error(`Failed to cancel test ${testId}:`, error);
      }
    }

    // 关闭数据库连接
    if (this.db) {
      await this.db.close();
    }

    // 清理引擎
    for (const engine of this.engines.values()) {
      if (engine.instance && engine.instance.cleanup) {
        await engine.instance.cleanup();
      }
    }
  }
}

module.exports = TestManagementService;
