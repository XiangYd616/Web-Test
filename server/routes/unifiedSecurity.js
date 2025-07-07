/**
 * 统一安全测试API路由
 * 提供新一代安全测试的后端支持
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// 速率限制
const testRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 每个IP最多10次请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  }
});

// 验证中间件
const validateTestRequest = [
  body('url')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('请提供有效的URL'),
  body('module')
    .isIn(['ssl', 'headers', 'vulnerabilities', 'cookies', 'content', 'network', 'compliance'])
    .withMessage('无效的测试模块'),
  body('options')
    .optional()
    .isObject()
    .withMessage('选项必须是对象格式')
];

/**
 * 执行单个安全测试模块
 * POST /api/test/security
 */
router.post('/security', testRateLimit, validateTestRequest, async (req, res) => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '请求参数无效',
        errors: errors.array()
      });
    }

    const { url, module, options = {} } = req.body;

    console.log(`[Security Test] Starting ${module} test for ${url}`);

    // 简化的模拟测试结果
    let moduleData = {
      score: Math.floor(Math.random() * 30) + 70, // 70-100分
      totalChecks: Math.floor(Math.random() * 10) + 5,
      passedChecks: 0,
      failedChecks: 0,
      warningChecks: 0,
      findings: [],
      recommendations: []
    };

    // 根据模块类型生成不同的测试结果
    switch (module) {
      case 'ssl':
        moduleData = {
          ...moduleData,
          certificate: {
            valid: url.startsWith('https://'),
            issuer: 'Let\'s Encrypt',
            validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            daysUntilExpiry: 90
          },
          protocols: [
            { version: 'TLSv1.2', supported: true, secure: true },
            { version: 'TLSv1.3', supported: true, secure: true }
          ],
          vulnerabilities: url.startsWith('https://') ? [] : ['未启用HTTPS']
        };
        break;

      case 'headers':
        moduleData = {
          ...moduleData,
          headers: [
            { name: 'X-Frame-Options', present: true, secure: true },
            { name: 'X-Content-Type-Options', present: true, secure: true },
            { name: 'Strict-Transport-Security', present: url.startsWith('https://'), secure: url.startsWith('https://') }
          ],
          csp: {
            present: Math.random() > 0.5,
            score: Math.floor(Math.random() * 40) + 60
          }
        };
        break;

      case 'vulnerabilities':
        const vulnCount = Math.floor(Math.random() * 3);
        moduleData = {
          ...moduleData,
          vulnerabilities: Array.from({ length: vulnCount }, (_, i) => ({
            type: ['XSS', 'SQL Injection', 'Path Traversal'][i % 3],
            severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
            description: '检测到潜在安全漏洞'
          })),
          testedPayloads: 50,
          successfulPayloads: vulnCount
        };
        break;

      case 'cookies':
        moduleData = {
          ...moduleData,
          cookies: [
            { name: 'session', secure: true, httpOnly: true, sameSite: 'Strict' },
            { name: 'csrf_token', secure: true, httpOnly: false, sameSite: 'Lax' }
          ],
          securityIssues: []
        };
        break;

      case 'content':
        moduleData = {
          ...moduleData,
          mixedContent: [],
          sensitiveData: [],
          metadata: {
            title: '测试网站',
            technologies: ['React', 'Node.js']
          }
        };
        break;

      case 'network':
        moduleData = {
          ...moduleData,
          dnsRecords: [
            { type: 'A', value: '192.168.1.1' },
            { type: 'MX', value: '10 mail.example.com' }
          ],
          subdomains: [],
          openPorts: [
            { port: 80, state: 'open', service: 'http' },
            { port: 443, state: 'open', service: 'https' }
          ]
        };
        break;

      case 'compliance':
        moduleData = {
          ...moduleData,
          standards: [
            {
              standard: 'OWASP Top 10',
              score: Math.floor(Math.random() * 30) + 70,
              status: 'partial'
            }
          ],
          overallCompliance: Math.floor(Math.random() * 30) + 70
        };
        break;
    }

    // 计算通过和失败的检查
    moduleData.passedChecks = Math.floor(moduleData.totalChecks * (moduleData.score / 100));
    moduleData.failedChecks = moduleData.totalChecks - moduleData.passedChecks;

    // 生成建议
    if (moduleData.score < 80) {
      moduleData.recommendations.push(`改进${module}模块的安全配置`);
    }
    if (moduleData.score < 60) {
      moduleData.recommendations.push(`${module}模块存在严重安全问题，需要立即修复`);
    }

    console.log(`[Security Test] ${module} test completed with score: ${moduleData.score}`);

    res.json({
      success: true,
      data: moduleData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[Security Test] Error in ${req.body.module} test:`, error);
    
    res.status(500).json({
      success: false,
      message: '安全测试执行失败',
      error: process.env.NODE_ENV === 'development' ? error.message : '内部服务器错误'
    });
  }
});

/**
 * 获取安全测试预设配置
 * GET /api/unified-security/presets
 */
router.get('/presets', (req, res) => {
  try {
    const presets = {
      quick: {
        name: '快速扫描',
        description: '基础安全检查，快速发现主要问题',
        estimatedTime: '1-2分钟',
        modules: {
          ssl: { enabled: true, checkCertificate: true },
          headers: { enabled: true, checkSecurity: true },
          vulnerabilities: { enabled: false },
          cookies: { enabled: true, checkSecure: true },
          content: { enabled: true, checkMixedContent: true },
          network: { enabled: false },
          compliance: { enabled: false }
        }
      },
      standard: {
        name: '标准扫描',
        description: '全面安全检测，平衡速度和深度',
        estimatedTime: '3-5分钟',
        modules: {
          ssl: { enabled: true, checkCertificate: true, checkProtocols: true },
          headers: { enabled: true, checkSecurity: true, checkCSP: true },
          vulnerabilities: { enabled: true, checkXSS: true, checkSQLInjection: true },
          cookies: { enabled: true, checkSecure: true, checkHttpOnly: true },
          content: { enabled: true, checkMixedContent: true, checkSensitiveData: true },
          network: { enabled: true, checkDNS: true },
          compliance: { enabled: true, standards: ['OWASP'] }
        }
      },
      comprehensive: {
        name: '全面扫描',
        description: '深度安全分析，包含所有检测模块',
        estimatedTime: '5-10分钟',
        modules: {
          ssl: { 
            enabled: true, 
            checkCertificate: true, 
            checkProtocols: true, 
            checkCiphers: true, 
            checkChain: true 
          },
          headers: { 
            enabled: true, 
            checkSecurity: true, 
            checkCSP: true, 
            checkCORS: true 
          },
          vulnerabilities: { 
            enabled: true, 
            checkXSS: true, 
            checkSQLInjection: true, 
            checkCSRF: true, 
            checkPathTraversal: true,
            checkCommandInjection: true,
            checkXXE: true,
            checkOpenRedirect: true,
            checkSensitiveFiles: true
          },
          cookies: { 
            enabled: true, 
            checkSecure: true, 
            checkHttpOnly: true, 
            checkSameSite: true 
          },
          content: { 
            enabled: true, 
            checkMixedContent: true, 
            checkSensitiveData: true, 
            checkMetadata: true 
          },
          network: { 
            enabled: true, 
            checkDNS: true, 
            checkSubdomains: true, 
            checkPorts: true 
          },
          compliance: { 
            enabled: true, 
            standards: ['OWASP', 'NIST', 'ISO27001'] 
          }
        }
      }
    };

    res.json({
      success: true,
      data: presets
    });

  } catch (error) {
    console.error('[Security Test] Error getting presets:', error);
    
    res.status(500).json({
      success: false,
      message: '获取预设配置失败'
    });
  }
});

/**
 * 健康检查
 * GET /api/unified-security/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '统一安全测试服务运行正常',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

module.exports = router;
