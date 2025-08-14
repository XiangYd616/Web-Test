const express = require('express');
const router = express.Router();
const SEOTestEngine = require('..\engines\seo\SEOTestEngine.js');
const PerformanceTestEngine = require('..\engines\performance\PerformanceTestEngine.js');
const SecurityTestEngine = require('..\engines\security\securityTestEngine.js');
const APITestEngine = require('..\engines\api\apiTestEngine.js');
const Logger = require('../utils/logger');

// 创建测试引擎实例
const seoEngine = new SEOTestEngine();
const performanceEngine = new PerformanceTestEngine();
const securityEngine = new SecurityTestEngine();
const apiEngine = new APITestEngine();

/**
 * 真实SEO测试
 */
router.post('/seo', async (req, res) => {
  try {
    const { url, keywords = [], options = {} } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL是必需的'
      });
    }

    Logger.info('开始SEO测试', { url, options });

    // 执行真实的SEO分析
    const results = await seoEngine.runSEOTest(url, {
      keywords,
      ...options
    });

    res.json({
      success: true,
      data: results,
      message: 'SEO测试完成'
    });

  } catch (error) {
    Logger.error('SEO测试失败', error);
    res.status(500).json({
      success: false,
      message: error.message || 'SEO测试失败',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * 真实性能测试
 */
router.post('/performance', async (req, res) => {
  try {
    const { url, options = {} } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL是必需的'
      });
    }

    Logger.info('开始性能测试', { url, options });

    // 执行真实的性能测试
    const results = await performanceEngine.runTest({
      url,
      ...options
    });

    res.json({
      success: true,
      data: results,
      message: '性能测试完成'
    });

  } catch (error) {
    Logger.error('性能测试失败', error);
    res.status(500).json({
      success: false,
      message: error.message || '性能测试失败',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * 真实安全测试
 */
router.post('/security', async (req, res) => {
  try {
    const { url, options = {} } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL是必需的'
      });
    }

    Logger.info('开始安全测试', { url, options });

    // 执行真实的安全测试
    const results = await securityEngine.runSecurityTest(url, options);

    res.json({
      success: true,
      data: results,
      message: '安全测试完成'
    });

  } catch (error) {
    Logger.error('安全测试失败', error);
    res.status(500).json({
      success: false,
      message: error.message || '安全测试失败',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * 真实API测试
 */
router.post('/api', async (req, res) => {
  try {
    const { baseUrl, endpoints = [], options = {} } = req.body;

    if (!baseUrl) {
      return res.status(400).json({
        success: false,
        message: 'Base URL是必需的'
      });
    }

    if (endpoints.length === 0) {
      return res.status(400).json({
        success: false,
        message: '至少需要一个API端点'
      });
    }

    Logger.info('开始API测试', { baseUrl, endpointCount: endpoints.length });

    // 执行真实的API测试
    const results = await apiEngine.runAPITest({
      baseUrl,
      endpoints,
      ...options
    });

    res.json({
      success: true,
      data: results,
      message: 'API测试完成'
    });

  } catch (error) {
    Logger.error('API测试失败', error);
    res.status(500).json({
      success: false,
      message: error.message || 'API测试失败',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * 综合测试（多种测试类型）
 */
router.post('/comprehensive', async (req, res) => {
  try {
    const { url, testTypes = [], options = {} } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL是必需的'
      });
    }

    if (testTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: '至少需要选择一种测试类型'
      });
    }

    Logger.info('开始综合测试', { url, testTypes });

    const results = {};
    const errors = {};

    // 并行执行多种测试
    const testPromises = testTypes.map(async (testType) => {
      try {
        switch (testType) {
          case 'seo':
            results.seo = await seoEngine.runSEOTest(url, options.seo || {});
            break;
          case 'performance':
            results.performance = await performanceEngine.runTest({ url, ...options.performance });
            break;
          case 'security':
            results.security = await securityEngine.runSecurityTest(url, options.security || {});
            break;
          default:
            throw new Error(`不支持的测试类型: ${testType}`);
        }
      } catch (error) {
        errors[testType] = error.message;
        Logger.error(`${testType}测试失败`, error);
      }
    });

    await Promise.all(testPromises);

    res.json({
      success: Object.keys(results).length > 0,
      data: results,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      message: `综合测试完成，成功: ${Object.keys(results).length}，失败: ${Object.keys(errors).length}`
    });

  } catch (error) {
    Logger.error('综合测试失败', error);
    res.status(500).json({
      success: false,
      message: error.message || '综合测试失败',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * 获取测试引擎状态
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      seo: await seoEngine.checkAvailability?.() || true,
      performance: await performanceEngine.checkAvailability?.() || true,
      security: await securityEngine.checkAvailability?.() || true,
      api: await apiEngine.checkAvailability?.() || true,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: status,
      message: '测试引擎状态获取成功'
    });

  } catch (error) {
    Logger.error('获取测试引擎状态失败', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取状态失败'
    });
  }
});

module.exports = router;
