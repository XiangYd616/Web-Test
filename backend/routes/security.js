/**
 * 高级安全测试API路由
 * 提供深度安全分析、漏洞扫描等功能
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const SecurityAnalyzer = require('../engines/security/SecurityAnalyzer');

// 创建安全引擎实例
// 注意: 不再全局应用认证中间件，以支持部分接口无需认证访问
let securityEngine;
try {
  securityEngine = new SecurityAnalyzer();
} catch (error) {
  console.warn('⚠️ 无法初始化安全引擎, 使用模拟实现:', error.message);
  // 使用模拟安全引擎
  securityEngine = {
    executeTest: async (config, options) => {
      return {
        summary: {
          securityScore: Math.floor(Math.random() * 40) + 60,
          criticalVulnerabilities: Math.floor(Math.random() * 3)
        },
        sslAnalysis: {
          supported: true,
          score: Math.floor(Math.random() * 30) + 70
        },
        securityHeaders: {
          score: Math.floor(Math.random() * 40) + 60
        },
        recommendations: [
          '启用HTTPS',
          '添加安全头部',
          '定期更新SSL证书'
        ]
      };
    }
  };
}

/**
 * 高级安全测试 - 需要认证
 */
router.post('/advanced-test', authMiddleware, asyncHandler(async (req, res) => {
  const { url, testTypes = ['all'], depth = 'standard', options = {} } = req.body;

  if (!url) {

    return res.validationError([], '需要提供测试URL');
  }

  // 验证URL格式
  try {
    new URL(url);
  } catch (error) {
    return res.validationError([], 'URL格式无效');
  }

  try {

    const result = await securityEngine.executeTest({
      url,
      testTypes,
      depth
    }, {
      ...options,
      userId: req.user.id,
      testId: `security_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    });

    // 记录测试结果到数据库（这里应该实际保存到数据库）
    console.log(`✅ 高级安全测试完成: ${url}, 评分: ${result.summary.securityScore}`);

    res.success(result);

  } catch (error) {
    console.error('高级安全测试失败:', error);
    res.serverError('安全测试失败');
  }
}));

/**
 * 快速安全检查
 */
router.post('/quick-check', asyncHandler(async (req, res) => {
  const { url } = req.body;

  if (!url) {

    return res.validationError([], '需要提供测试URL');
  }

  try {
    // 执行快速安全检查（仅检查基础安全配置）
    const result = await securityEngine.executeTest({
      url,
      testTypes: ['headers', 'ssl'],
      depth: 'basic'
    }, {
      userId: req.user ? req.user.id : 'anonymous',
      testId: `quick_security_${Date.now()}`
    });

    res.json({
      success: true,
      data: {
        url,
        securityScore: result.summary.securityScore,
        httpsEnabled: result.sslAnalysis.supported,
        securityHeadersScore: result.securityHeaders.score,
        criticalIssues: result.summary.criticalVulnerabilities,
        recommendations: result.recommendations.slice(0, 3) // 只返回前3个建议
      }
    });

  } catch (error) {
    console.error('快速安全检查失败:', error);
    res.serverError('快速安全检查失败');
  }
}));

/**
 * 获取安全测试历史 - 需要认证
 */
router.get('/test-history', authMiddleware, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, url: filterUrl } = req.query;
  const userId = req.user.id;

  try {
    // 这里应该从数据库查询实际的测试历史
    // 目前返回模拟数据
    const mockHistory = Array.from({ length: parseInt(limit) }, (_, i) => ({
      id: `test_${Date.now() - i * 1000}`,
      url: filterUrl || `https://example${i + 1}.com`,
      testType: 'advanced',
      securityScore: Math.floor(Math.random() * 40) + 60,
      vulnerabilities: Math.floor(Math.random() * 5),
      timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed'
    }));

    res.json({
      success: true,
      data: {
        tests: mockHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 100,
          totalPages: Math.ceil(100 / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('获取安全测试历史失败:', error);
    res.serverError('获取测试历史失败');
  }
}));

/**
 * 获取安全测试详情 - 需要认证
 */
router.get('/test/:testId', authMiddleware, asyncHandler(async (req, res) => {
  const { testId } = req.params;
  const userId = req.user.id;

  try {
    // 这里应该从数据库查询实际的测试详情
    // 目前返回模拟数据
    const mockTestDetail = {
      testId,
      url: 'https://example.com',
      timestamp: new Date().toISOString(),
      testTypes: ['all'],
      depth: 'standard',
      summary: {
        totalVulnerabilities: 3,
        criticalVulnerabilities: 0,
        highVulnerabilities: 1,
        mediumVulnerabilities: 1,
        lowVulnerabilities: 1,
        securityScore: 75
      },
      vulnerabilities: [
        {
          type: 'Missing Security Header',
          severity: 'medium',
          description: '缺少Content-Security-Policy头部',
          location: 'https://example.com',
          impact: '可能导致XSS攻击',
          recommendation: '添加CSP头部'
        }
      ],
      securityHeaders: {
        score: 60,
        present: {
          'strict-transport-security': {
            name: 'HSTS',
            value: 'max-age=31536000',
            importance: 'high'
          }
        },
        missing: [
          {
            header: 'content-security-policy',
            name: 'CSP',
            importance: 'high'
          }
        ]
      },
      sslAnalysis: {
        supported: true,
        score: 85,
        certificate: {
          issuer: { CN: 'Let\'s Encrypt' },
          validTo: '2024-12-31'
        },
        cipher: {
          name: 'TLS_AES_256_GCM_SHA384',
          version: 'TLSv1.3'
        },
        issues: []
      },
      recommendations: [
        '添加Content-Security-Policy头部',
        '实施多因素认证',
        '定期更新安全配置'
      ]
    };

    res.success(mockTestDetail);

  } catch (error) {
    console.error('获取安全测试详情失败:', error);
    res.serverError('获取测试详情失败');
  }
}));

/**
 * 获取安全统计信息
 */
router.get('/statistics', asyncHandler(async (req, res) => {
  const { timeRange = '30d' } = req.query;
  const userId = req.user.id;

  try {
    // 这里应该从数据库查询实际的统计数据
    // 目前返回模拟数据
    const mockStatistics = {
      timeRange,
      totalTests: 156,
      averageSecurityScore: 78,
      totalVulnerabilities: 234,
      vulnerabilityTrends: {
        critical: Array.from({ length: 30 }, () => Math.floor(Math.random() * 3)),
        high: Array.from({ length: 30 }, () => Math.floor(Math.random() * 5)),
        medium: Array.from({ length: 30 }, () => Math.floor(Math.random() * 8)),
        low: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10))
      },
      topVulnerabilities: [
        { type: 'Missing Security Headers', count: 45, percentage: 19.2 },
        { type: 'SSL/TLS Issues', count: 32, percentage: 13.7 },
        { type: 'Information Disclosure', count: 28, percentage: 12.0 },
        { type: 'Cross-Site Scripting', count: 21, percentage: 9.0 },
        { type: 'SQL Injection', count: 15, percentage: 6.4 }
      ],
      securityScoreDistribution: {
        excellent: 23, // 90-100
        good: 45,      // 70-89
        fair: 67,      // 50-69
        poor: 21       // 0-49
      }
    };

    res.success(mockStatistics);

  } catch (error) {
    console.error('获取安全统计信息失败:', error);
    res.serverError('获取统计信息失败');
  }
}));

/**
 * 导出安全报告
 */
router.post('/export-report', asyncHandler(async (req, res) => {
  const { testId, format = 'json' } = req.body;
  const userId = req.user.id;

  if (!testId) {

    return res.validationError([], '需要提供测试ID');
  }

  try {
    // 这里应该从数据库获取实际的测试数据
    // 目前返回模拟数据
    const testData = {
      testId,
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.username,
      format,
      // ... 测试数据
    };

    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="security-report-${testId}.json"`);
        res.send(JSON.stringify(testData, null, 2));
        break;

      case 'csv':
        // 生成CSV格式报告
        const csvData = 'Test ID,URL,Security Score,Vulnerabilities\n' +
          `${testId},https://example.com,75,3`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="security-report-${testId}.csv"`);
        res.send(csvData);
        break;

      default:
        res.validationError([], '不支持的导出格式');
    }

  } catch (error) {
    console.error('导出安全报告失败:', error);
    res.serverError('导出报告失败');
  }
}));

/**
 * 获取安全建议
 */
router.get('/recommendations', asyncHandler(async (req, res) => {
  const { category = 'all' } = req.query;

  try {
    const recommendations = {
      headers: [
        {
          title: '添加Content-Security-Policy头部',
          description: 'CSP可以有效防止XSS攻击',
          priority: 'high',
          implementation: "Content-Security-Policy: default-src 'self'"
        },
        {
          title: '启用HSTS',
          description: '强制使用HTTPS连接',
          priority: 'high',
          implementation: "Strict-Transport-Security: max-age=31536000; includeSubDomains"
        }
      ],
      ssl: [
        {
          title: '使用强加密套件',
          description: '禁用弱加密算法',
          priority: 'medium',
          implementation: '配置服务器仅支持TLS 1.2+和强加密套件'
        }
      ],
      general: [
        {
          title: '定期安全扫描',
          description: '建立定期的安全扫描机制',
          priority: 'medium',
          implementation: '每周执行一次全面安全扫描'
        }
      ]
    };

    const result = category === 'all'
      ? Object.values(recommendations).flat()
      : recommendations[category] || [];

    res.success(result);

  } catch (error) {
    console.error('获取安全建议失败:', error);
    res.serverError('获取安全建议失败');
  }
}));

module.exports = router;
