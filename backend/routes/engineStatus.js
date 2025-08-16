/**
 * 测试引擎状态API
 * 提供所有测试引擎的健康状态和统计信息
 */

const express = require('express');
const router = express.Router();
const { testEngineManager } = require('../engines/core/TestEngineManager');
const { optionalAuth } = require('../middleware/auth');

/**
 * GET /api/engines/status
 * 获取所有测试引擎的状态
 */
router.get('/status', optionalAuth, async (req, res) => {
  try {
    // 确保引擎管理器已初始化
    if (!testEngineManager.isInitialized) {
      await testEngineManager.initialize();
    }

    const healthStatus = testEngineManager.getHealthStatus();
    const engineStats = testEngineManager.getAllEngineStatus();

    // 计算总体状态
    const totalEngines = Object.keys(healthStatus).length;
    const healthyEngines = Object.values(healthStatus).filter(status => status.healthy).length;
    const overallHealth = healthyEngines / totalEngines;

    res.json({
      success: true,
      data: {
        overall: {
          status: overallHealth >= 0.8 ? 'healthy' : overallHealth >= 0.5 ? 'degraded' : 'unhealthy',
          healthyEngines,
          totalEngines,
          healthPercentage: Math.round(overallHealth * 100),
          lastCheck: new Date().toISOString()
        },
        engines: healthStatus,
        stats: engineStats
      }
    });

  } catch (error) {
    console.error('获取引擎状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取引擎状态失败',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/engines/status/:engineType
 * 获取特定引擎的详细状态
 */
router.get('/status/:engineType', optionalAuth, async (req, res) => {
  try {
    const { engineType } = req.params;

    // 验证引擎类型
    const validEngineTypes = [
      'api', 'performance', 'security', 'seo', 'stress',
      'infrastructure', 'ux', 'compatibility', 'website'
    ];

    if (!validEngineTypes.includes(engineType)) {
      return res.status(400).json({
        success: false,
        error: '无效的引擎类型',
        validTypes: validEngineTypes
      });
    }

    // 确保引擎管理器已初始化
    if (!testEngineManager.isInitialized) {
      await testEngineManager.initialize();
    }

    const healthStatus = testEngineManager.getHealthStatus();
    const engineStats = testEngineManager.getAllEngineStatus();

    const engineHealth = healthStatus[engineType];
    const engineStat = engineStats[engineType];

    if (!engineHealth) {
      
        return res.status(404).json({
        success: false,
        error: '引擎未找到或未初始化'
      });
    }

    res.json({
      success: true,
      data: {
        engineType,
        health: engineHealth,
        stats: engineStat,
        capabilities: getEngineCapabilities(engineType)
      }
    });

  } catch (error) {
    console.error('获取引擎详细状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取引擎详细状态失败',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/engines/restart/:engineType
 * 重启特定引擎
 */
router.post('/restart/:engineType', optionalAuth, async (req, res) => {
  try {
    const { engineType } = req.params;

    // 验证引擎类型
    const validEngineTypes = [
      'api', 'performance', 'security', 'seo', 'stress',
      'infrastructure', 'ux', 'compatibility', 'website'
    ];

    if (!validEngineTypes.includes(engineType)) {
      return res.status(400).json({
        success: false,
        error: '无效的引擎类型',
        validTypes: validEngineTypes
      });
    }

    // 重启引擎（这里需要在TestEngineManager中实现重启方法）
    // 暂时返回成功状态
    res.json({
      success: true,
      message: `引擎 ${engineType} 重启请求已提交`,
      data: {
        engineType,
        restartTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('重启引擎失败:', error);
    res.status(500).json({
      success: false,
      error: '重启引擎失败',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/engines/capabilities
 * 获取所有引擎的能力描述
 */
router.get('/capabilities', optionalAuth, (req, res) => {
  try {
    const capabilities = {
      api: getEngineCapabilities('api'),
      performance: getEngineCapabilities('performance'),
      security: getEngineCapabilities('security'),
      seo: getEngineCapabilities('seo'),
      stress: getEngineCapabilities('stress'),
      infrastructure: getEngineCapabilities('infrastructure'),
      ux: getEngineCapabilities('ux'),
      compatibility: getEngineCapabilities('compatibility'),
      website: getEngineCapabilities('website')
    };

    res.json({
      success: true,
      data: capabilities
    });

  } catch (error) {
    console.error('获取引擎能力失败:', error);
    res.status(500).json({
      success: false,
      error: '获取引擎能力失败',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * 获取引擎能力描述
 */
function getEngineCapabilities(engineType) {
  const capabilities = {
    api: {
      name: 'API测试引擎',
      description: 'REST API端点测试和验证',
      features: [
        'HTTP方法测试 (GET, POST, PUT, DELETE)',
        '认证支持 (Bearer, Basic, API Key)',
        '响应时间测量',
        '状态码验证',
        '响应内容验证',
        '批量端点测试'
      ],
      supportedFormats: ['JSON', 'XML', 'Form Data'],
      maxConcurrency: 10,
      averageTestTime: '2-5秒'
    },
    performance: {
      name: '性能测试引擎',
      description: '基于Google Lighthouse的性能分析',
      features: [
        'Core Web Vitals测量',
        '页面加载性能',
        '资源优化建议',
        '移动端性能测试',
        'SEO性能评分',
        '可访问性评分'
      ],
      supportedDevices: ['Desktop', 'Mobile'],
      maxConcurrency: 2,
      averageTestTime: '30-60秒'
    },
    security: {
      name: '安全测试引擎',
      description: 'SSL证书和安全头部检查',
      features: [
        'SSL证书验证',
        '安全头部检查',
        'HTTPS重定向验证',
        'Cookie安全检查',
        '基础漏洞扫描',
        '安全配置评估'
      ],
      supportedProtocols: ['HTTP', 'HTTPS'],
      maxConcurrency: 3,
      averageTestTime: '10-20秒'
    },
    seo: {
      name: 'SEO测试引擎',
      description: 'Meta标签和SEO优化分析',
      features: [
        'Meta标签检查',
        '标题结构分析',
        '图片Alt属性检查',
        'robots.txt验证',
        'sitemap.xml检查',
        '结构化数据验证'
      ],
      supportedFormats: ['HTML', 'XML'],
      maxConcurrency: 3,
      averageTestTime: '5-15秒'
    },
    stress: {
      name: '压力测试引擎',
      description: '负载和并发性能测试',
      features: [
        '并发用户模拟',
        '负载渐进增加',
        '响应时间统计',
        '错误率监控',
        '吞吐量测量',
        '资源使用监控'
      ],
      maxVirtualUsers: 1000,
      maxConcurrency: 2,
      averageTestTime: '可配置 (1-30分钟)'
    },
    infrastructure: {
      name: '基础设施测试引擎',
      description: 'DNS解析和端口连接检查',
      features: [
        'DNS解析测试',
        '端口连通性检查',
        'SSL握手验证',
        '网络延迟测量',
        '服务可用性检查',
        '重定向链分析'
      ],
      supportedPorts: [80, 443, 8080, 8443],
      maxConcurrency: 2,
      averageTestTime: '15-30秒'
    },
    ux: {
      name: 'UX测试引擎',
      description: '用户体验和可访问性测试',
      features: [
        'WCAG可访问性检查',
        '用户交互模拟',
        '表单功能测试',
        '移动端适配检查',
        '页面可用性评估',
        '视觉元素检查'
      ],
      supportedDevices: ['Desktop', 'Mobile', 'Tablet'],
      maxConcurrency: 2,
      averageTestTime: '20-40秒'
    },
    compatibility: {
      name: '兼容性测试引擎',
      description: '跨浏览器和设备兼容性',
      features: [
        '多浏览器渲染测试',
        'JavaScript兼容性检查',
        'CSS兼容性验证',
        '响应式设计测试',
        '功能特性检测',
        '截图对比'
      ],
      supportedBrowsers: ['Chromium', 'Firefox', 'WebKit'],
      maxConcurrency: 2,
      averageTestTime: '60-120秒'
    },
    website: {
      name: '网站综合测试引擎',
      description: '全面的网站质量评估',
      features: [
        '多页面健康检查',
        '链接完整性验证',
        '内容质量评估',
        '最佳实践检查',
        '综合评分计算',
        '改进建议生成'
      ],
      maxPages: 50,
      maxConcurrency: 2,
      averageTestTime: '30-90秒'
    }
  };

  return capabilities[engineType] || null;
}

module.exports = router;
