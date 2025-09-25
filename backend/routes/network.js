/**
 * 网络测试路由
 * 处理网络连接、延迟、带宽等测试请求
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const NetworkTestEngine = require('../engines/network/NetworkTestEngine');
const { validateTestRequest } = require('../middleware/validation');

// 创建测试引擎实例
const networkTestEngine = new NetworkTestEngine();

/**
 * @route POST /api/network/test
 * @desc 执行网络测试
 * @access Private
 */
router.post('/test', authenticateToken, validateTestRequest, async (req, res) => {
  try {
    const { url, config } = req.body;
    const userId = req.user.id;
    
    // 记录测试开始
    
    // 执行测试
    const result = await networkTestEngine.runTest({
      targetUrl: url,
      testConfig: config,
      userId
    });
    
    res.json({
      success: true,
      data: result,
      message: '网络测试完成'
    });
  } catch (error) {
    console.error('[Network Test Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '网络测试失败',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /api/network/ping
 * @desc 执行Ping测试
 * @access Private
 */
router.post('/ping', authenticateToken, async (req, res) => {
  try {
    const { host, count = 10 } = req.body;
    
    if (!host) {
      return res.status(400).json({
        success: false,
        error: { message: '缺少目标主机' }
      });
    }
    
    // 执行Ping测试
    const pingResult = await networkTestEngine.pingTest({
      host,
      count
    });
    
    res.json({
      success: true,
      data: pingResult
    });
  } catch (error) {
    console.error('[Ping Test Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Ping测试失败',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /api/network/traceroute
 * @desc 执行路由跟踪测试
 * @access Private
 */
router.post('/traceroute', authenticateToken, async (req, res) => {
  try {
    const { host, maxHops = 30 } = req.body;
    
    if (!host) {
      return res.status(400).json({
        success: false,
        error: { message: '缺少目标主机' }
      });
    }
    
    // 执行路由跟踪
    const traceResult = await networkTestEngine.traceroute({
      host,
      maxHops
    });
    
    res.json({
      success: true,
      data: traceResult,
      message: '路由跟踪完成'
    });
  } catch (error) {
    console.error('[Traceroute Test Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '路由跟踪失败',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /api/network/bandwidth
 * @desc 测试网络带宽
 * @access Private
 */
router.post('/bandwidth', authenticateToken, async (req, res) => {
  try {
    const { testServer, duration = 10 } = req.body;
    
    // 执行带宽测试
    const bandwidthResult = await networkTestEngine.bandwidthTest({
      testServer,
      duration
    });
    
    res.json({
      success: true,
      data: bandwidthResult,
      message: '带宽测试完成'
    });
  } catch (error) {
    console.error('[Bandwidth Test Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '带宽测试失败',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /api/network/dns
 * @desc DNS解析测试
 * @access Private
 */
router.post('/dns', authenticateToken, async (req, res) => {
  try {
    const { domain, dnsServer } = req.body;
    
    if (!domain) {
      return res.status(400).json({
        success: false,
        error: { message: '缺少域名' }
      });
    }
    
    // 执行DNS测试
    const dnsResult = await networkTestEngine.dnsLookup({
      domain,
      dnsServer
    });
    
    res.json({
      success: true,
      data: dnsResult
    });
  } catch (error) {
    console.error('[DNS Test Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'DNS测试失败',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /api/network/port-scan
 * @desc 端口扫描测试
 * @access Private
 */
router.post('/port-scan', authenticateToken, async (req, res) => {
  try {
    const { host, ports, timeout = 2000 } = req.body;
    
    if (!host || !ports || !Array.isArray(ports)) {
      return res.status(400).json({
        success: false,
        error: { message: '参数不完整' }
      });
    }
    
    // 执行端口扫描
    const scanResult = await networkTestEngine.portScan({
      host,
      ports,
      timeout
    });
    
    res.json({
      success: true,
      data: scanResult,
      message: '端口扫描完成'
    });
  } catch (error) {
    console.error('[Port Scan Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '端口扫描失败',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /api/network/latency
 * @desc 网络延迟测试
 * @access Private
 */
router.post('/latency', authenticateToken, async (req, res) => {
  try {
    const { endpoints, iterations = 10 } = req.body;
    
    if (!endpoints || !Array.isArray(endpoints)) {
      return res.status(400).json({
        success: false,
        error: { message: '缺少测试端点' }
      });
    }
    
    // 执行延迟测试
    const latencyResult = await networkTestEngine.latencyTest({
      endpoints,
      iterations
    });
    
    res.json({
      success: true,
      data: latencyResult,
      message: '延迟测试完成'
    });
  } catch (error) {
    console.error('[Latency Test Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '延迟测试失败',
        details: error.message
      }
    });
  }
});

/**
 * @route GET /api/network/test-history
 * @desc 获取网络测试历史
 * @access Private
 */
router.get('/test-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, testType } = req.query;
    
    // 获取测试历史
    const history = await networkTestEngine.getTestHistory({
      userId,
      testType,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('[Get Test History Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取测试历史失败',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /api/network/diagnose
 * @desc 网络诊断
 * @access Private
 */
router.post('/diagnose', authenticateToken, async (req, res) => {
  try {
    const { url, comprehensive = false } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: { message: '缺少目标URL' }
      });
    }
    
    // 执行网络诊断
    const diagnosis = await networkTestEngine.diagnose({
      url,
      comprehensive
    });
    
    res.json({
      success: true,
      data: diagnosis,
      message: '网络诊断完成'
    });
  } catch (error) {
    console.error('[Network Diagnosis Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '网络诊断失败',
        details: error.message
      }
    });
  }
});

module.exports = router;
