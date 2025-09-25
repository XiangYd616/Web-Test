/**
 * 压力测试API路由
 * 提供压力测试的启动、停止、监控等接口
 */

const express = require('express');
const router = express.Router();
const StressTestEngine = require('../engines/stress/StressTestEngine');
const { authMiddleware } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, param } = require('express-validator');
const WebSocket = require('ws');

// 存储活跃的测试会话
const activeTests = new Map();
const testResults = new Map();

/**
 * 启动压力测试
 * POST /api/test/stress/start
 */
router.post('/start',
  authMiddleware,
  [
    body('config.url').isURL().withMessage('无效的URL'),
    body('config.duration').isInt({ min: 10, max: 3600 }).withMessage('测试时长必须在10-3600秒之间'),
    body('config.concurrentUsers').isInt({ min: 1, max: 10000 }).withMessage('并发用户数必须在1-10000之间'),
    body('config.requestsPerSecond').isInt({ min: 1, max: 100000 }).withMessage('RPS必须在1-100000之间'),
    body('config.method').isIn(['GET', 'POST', 'PUT', 'DELETE']).withMessage('无效的HTTP方法'),
    body('testId').notEmpty().withMessage('测试ID不能为空')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { config, testId } = req.body;
      const userId = req.user.id;

      // 检查是否已有正在运行的测试
      if (activeTests.has(testId)) {
        return res.status(400).json({
          success: false,
          message: '该测试已在运行中'
        });
      }

      // 创建测试会话
      const testSession = {
        testId,
        userId,
        config,
        status: 'starting',
        startTime: new Date(),
        metrics: [],
        errors: []
      };

      activeTests.set(testId, testSession);

      // 异步启动测试引擎
      startStressTest(testId, config)
        .then((result) => {
          // 测试完成，保存结果
          testResults.set(testId, result);
          activeTests.delete(testId);
          
          // 通知WebSocket客户端
          notifyTestComplete(testId, result);
        })
        .catch((error) => {
          console.error(`压力测试失败 ${testId}:`, error);
          activeTests.delete(testId);
          
          // 通知错误
          notifyTestError(testId, error.message);
        });

      res.json({
        success: true,
        message: '压力测试已启动',
        testId
      });

    } catch (error) {
      console.error('启动压力测试失败:', error);
      res.status(500).json({
        success: false,
        message: '启动测试失败',
        error: error.message
      });
    }
  }
);

/**
 * 停止压力测试
 * POST /api/test/stress/stop
 */
router.post('/stop',
  authMiddleware,
  [
    body('testId').notEmpty().withMessage('测试ID不能为空')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { testId } = req.body;
      const userId = req.user.id;


      
      /**

      
       * if功能函数

      
       * @param {Object} params - 参数对象

      
       * @returns {Promise<Object>} 返回结果

      
       */
      const testSession = activeTests.get(testId);
      
      if (!testSession) {
        return res.status(404).json({
          success: false,
          message: '未找到该测试会话'
        });
      }

      // 验证用户权限
      if (testSession.userId !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '无权停止该测试'
        });
      }

      // 停止测试
      testSession.status = 'stopping';
      
      // 通知测试引擎停止
      if (StressTestEngine.stopTest) {
        await StressTestEngine.stopTest(testId);
      }

      activeTests.delete(testId);

      res.json({
        success: true,
        message: '正在停止测试'
      });

    } catch (error) {
      console.error('停止压力测试失败:', error);
      res.status(500).json({
        success: false,
        message: '停止测试失败',
        error: error.message
      });
    }
  }
);

/**
 * 获取测试状态
 * GET /api/test/stress/status/:testId
 */
router.get('/status/:testId',
  authMiddleware,
  [
    param('testId').notEmpty().withMessage('测试ID不能为空')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { testId } = req.params;
      

      
      /**

      
       * if功能函数

      
       * @param {Object} params - 参数对象

      
       * @returns {Promise<Object>} 返回结果

      
       */
      const testSession = activeTests.get(testId);
      
      if (!testSession) {
        // 检查是否有已完成的结果
        const result = testResults.get(testId);
        if (result) {
          return res.json({
            success: true,
            status: 'completed',
            result: result
          });
        }
        
        return res.status(404).json({
          success: false,
          message: '未找到该测试'
        });
      }

      res.json({
        success: true,
        status: testSession.status,
        startTime: testSession.startTime,
        metrics: testSession.metrics.slice(-10) // 返回最近10条指标
      });

    } catch (error) {
      console.error('获取测试状态失败:', error);
      res.status(500).json({
        success: false,
        message: '获取状态失败',
        error: error.message
      });
    }
  }
);

/**
 * 获取测试结果
 * GET /api/test/stress/result/:testId
 */
router.get('/result/:testId',
  authMiddleware,
  [
    param('testId').notEmpty().withMessage('测试ID不能为空')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { testId } = req.params;
      
      const result = testResults.get(testId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: '未找到测试结果'
        });
      }

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('获取测试结果失败:', error);
      res.status(500).json({
        success: false,
        message: '获取结果失败',
        error: error.message
      });
    }
  }
);

/**
 * 获取用户的测试历史
 * GET /api/test/stress/history
 */
router.get('/history',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;

      // 从数据库获取历史记录
      // 这里简化处理，实际应该从数据库读取
      const history = Array.from(testResults.values())
        .filter(result => result.userId === userId)
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
        .slice(offset, offset + limit);

      res.json({
        success: true,
        data: history,
        total: history.length
      });

    } catch (error) {
      console.error('获取测试历史失败:', error);
      res.status(500).json({
        success: false,
        message: '获取历史失败',
        error: error.message
      });
    }
  }
);

/**
 * 删除测试结果
 * DELETE /api/test/stress/result/:testId
 */
router.delete('/result/:testId',
  authMiddleware,
  [
    param('testId').notEmpty().withMessage('测试ID不能为空')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { testId } = req.params;
      const userId = req.user.id;

      const result = testResults.get(testId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: '未找到测试结果'
        });
      }

      // 验证权限
      if (result.userId !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '无权删除该测试结果'
        });
      }

      testResults.delete(testId);

      res.json({
        success: true,
        message: '测试结果已删除'
      });

    } catch (error) {
      console.error('删除测试结果失败:', error);
      res.status(500).json({
        success: false,
        message: '删除失败',
        error: error.message
      });
    }
  }
);

/**
 * 启动压力测试的核心函数
 */
async function startStressTest(testId, config) {
  const testSession = activeTests.get(testId);
  if (!testSession) {
    throw new Error('测试会话不存在');
  }

  testSession.status = 'running';
  
  // 模拟压力测试过程
  const startTime = Date.now();
  const duration = config.duration * 1000; // 转换为毫秒
  const interval = 1000; // 每秒更新一次指标
  
  let currentUsers = 0;
  const rampUpRate = config.concurrentUsers / (config.rampUpTime || 1);
  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  const responseTimes = [];
  
  return new Promise((resolve, reject) => {
    const metricsInterval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      
      // 检查是否应该停止
      if (elapsed >= duration || testSession.status === 'stopping') {
        clearInterval(metricsInterval);
        
        // 生成最终报告
        const summary = calculateSummary(responseTimes, totalRequests, successfulRequests, failedRequests, elapsed / 1000);
        
        const result = {
          testId,
          status: 'completed',
          startTime: testSession.startTime,
          endTime: new Date(),
          config,
          metrics: testSession.metrics,
          summary,
          errors: testSession.errors
        };
        
        resolve(result);
        return;
      }
      
      // 更新并发用户数（爬升阶段）
      if (currentUsers < config.concurrentUsers) {
        currentUsers = Math.min(currentUsers + rampUpRate, config.concurrentUsers);
      }
      
      // 模拟请求执行
      const requestsThisSecond = Math.min(config.requestsPerSecond, currentUsers * 10);
      const results = await simulateRequests(config.url, config.method, requestsThisSecond, config.timeout);
      
      // 统计结果
      totalRequests += results.length;
      results.forEach(result => {
        if (result.success) {
          successfulRequests++;
          responseTimes.push(result.responseTime);
        } else {
          failedRequests++;
          testSession.errors.push({
            timestamp: new Date(),
            message: result.error,
            statusCode: result.statusCode
          });
        }
      });
      
      // 计算当前指标
      const currentResponseTimes = results.filter(r => r.success).map(r => r.responseTime);
      const metrics = {
        timestamp: Date.now(),
        activeUsers: Math.floor(currentUsers),
        throughput: requestsThisSecond,
        successCount: results.filter(r => r.success).length,
        errorCount: results.filter(r => !r.success).length,
        errorRate: (results.filter(r => !r.success).length / results.length) * 100 || 0,
        avgResponseTime: calculateAverage(currentResponseTimes),
        minResponseTime: Math.min(...currentResponseTimes) || 0,
        maxResponseTime: Math.max(...currentResponseTimes) || 0,
        percentile95: calculatePercentile(currentResponseTimes, 95),
        percentile99: calculatePercentile(currentResponseTimes, 99)
      };
      
      testSession.metrics.push(metrics);
      
      // 通知WebSocket客户端
      notifyMetricsUpdate(testId, metrics);
      
    }, interval);
  });
}

/**
 * 模拟HTTP请求
 */
async function simulateRequests(url, method, count, timeout) {
  const results = [];
  
  // 简化的模拟实现
  for (let i = 0; i < count; i++) {
    const startTime = Date.now();
    const success = Math.random() > 0.05; // 95% 成功率
    const responseTime = Math.random() * 200 + 50; // 50-250ms
    
    results.push({
      success,
      responseTime: success ? responseTime : timeout,
      statusCode: success ? 200 : (Math.random() > 0.5 ? 500 : 503),
      error: success ? null : 'Request failed'
    });
  }
  
  // 实际实现应该使用真实的HTTP请求库如axios或node-fetch
  return results;
}

/**
 * 计算统计摘要
 */
function calculateSummary(responseTimes, totalRequests, successfulRequests, failedRequests, duration) {
  const sortedTimes = responseTimes.sort((a, b) => a - b);
  
  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    avgResponseTime: calculateAverage(responseTimes),
    minResponseTime: sortedTimes[0] || 0,
    maxResponseTime: sortedTimes[sortedTimes.length - 1] || 0,
    percentile95: calculatePercentile(sortedTimes, 95),
    percentile99: calculatePercentile(sortedTimes, 99),
    throughput: totalRequests / duration,
    errorRate: (failedRequests / totalRequests) * 100 || 0,
    duration: Math.round(duration)
  };
}

/**
 * 计算平均值
 */
function calculateAverage(numbers) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

/**
 * 计算百分位数
 */
function calculatePercentile(sortedArray, percentile) {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)] || 0;
}

/**
 * WebSocket通知函数
 */
function notifyMetricsUpdate(testId, metrics) {
  // 这里应该通过WebSocket发送实时数据
  // 简化处理，实际需要维护WebSocket连接池
  if (global.wsClients && global.wsClients[testId]) {
    global.wsClients[testId].forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'metrics',
          testId,
          metrics
        }));
      }
    });
  }
}

function notifyTestComplete(testId, result) {
  if (global.wsClients && global.wsClients[testId]) {
    global.wsClients[testId].forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'status',
          status: {
            type: 'completed',
            testId,
            result
          }
        }));
      }
    });
  }
}

function notifyTestError(testId, error) {
  if (global.wsClients && global.wsClients[testId]) {
    global.wsClients[testId].forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'status',
          status: {
            type: 'error',
            testId,
            message: error
          }
        }));
      }
    });
  }
}

module.exports = router;
