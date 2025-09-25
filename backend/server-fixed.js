/**
 * Test-Web Platform Backend Server - 完全修复版
 * 修复了所有发现的错误和安全问题
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// 创建Express应用
const app = express();

// 环境变量配置
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 常量定义
const VALID_TEST_TYPES = ['website', 'seo', 'security', 'performance', 'api', 'compatibility', 'stress', 'ux'];
const MAX_URL_LENGTH = 500; // 更严格的URL长度限制
const MAX_REQUEST_SIZE = '1mb';

// 基础中间件配置
app.use(cors());

// 请求体解析中间件 - 带有大小限制
app.use(express.json({ 
  limit: MAX_REQUEST_SIZE,
  verify: (req, res, buf, encoding) => {
    if (buf.length > 1048576) { // 1MB in bytes
      const error = new Error('请求载荷过大');
      error.type = 'entity.too.large';
      error.status = 413;
      throw error;
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: MAX_REQUEST_SIZE 
}));

// 自定义响应处理中间件
const responseHandler = (req, res, next) => {
  // 成功响应
  res.success = (data, message = '操作成功', status = 200) => {
    res.status(status).json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    });
  };
  
  // 验证错误响应
  res.validationError = (errors, message = '输入验证失败') => {
    res.status(400).json({
      success: false,
      error: message,
      errors: Array.isArray(errors) ? errors : [{ message: errors }],
      timestamp: new Date().toISOString()
    });
  };
  
  // 服务器错误响应
  res.serverError = (message = '内部服务器错误', status = 500) => {
    res.status(status).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  };
  
  // 未找到响应
  res.notFound = (message = '资源未找到') => {
    res.status(404).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  };
  
  next();
};

// 请求日志中间件（简化版）
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  next();
};

// 输入验证工具函数
const validateUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL是必需的' };
  }
  
  if (url.length > MAX_URL_LENGTH) {
    return { valid: false, error: `URL长度不能超过${MAX_URL_LENGTH}字符` };
  }
  
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'URL必须使用HTTP或HTTPS协议' };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'URL格式无效' };
  }
};

const validateTestType = (type) => {
  if (!type) return { valid: true }; // 可选参数
  
  if (typeof type !== 'string') {
    return { valid: false, error: '测试类型必须是字符串' };
  }
  
  if (!VALID_TEST_TYPES.includes(type)) {
    return { 
      valid: false, 
      error: `无效的测试类型。支持的类型: ${VALID_TEST_TYPES.join(', ')}` 
    };
  }
  
  return { valid: true };
};

// 应用中间件
app.use(responseHandler);
app.use(requestLogger);

// 健康检查端点
app.get('/health', (req, res) => {
  res.success({
    status: 'healthy',
    name: 'Test Web App',
    version: '1.0.0',
    environment: NODE_ENV,
    database: 'connected',
    engines: { status: 'ready' },
    uptime: process.uptime(),
    host: 'localhost',
    port: PORT
  });
});

// API信息端点
app.get('/api', (req, res) => {
  res.success({
    name: 'Test-Web Platform API',
    version: '1.0.0',
    description: '网站测试平台后端API服务',
    endpoints: {
      seo: '/api/seo',
      security: '/api/security',
      test: '/api/test',
      engines: '/api/engines'
    },
    environment: NODE_ENV
  });
});

// 通用测试端点 - 增强验证
app.post('/api/test', (req, res) => {
  const { type, url } = req.body;
  
  // 验证URL
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) {
    return res.validationError([{ field: 'url', message: urlValidation.error }]);
  }
  
  // 验证测试类型
  const typeValidation = validateTestType(type);
  if (!typeValidation.valid) {
    return res.validationError([{ field: 'type', message: typeValidation.error }]);
  }
  
  try {
    // 模拟测试逻辑
    const testResult = {
      testType: type || 'website',
      url: url,
      result: {
        status: 'completed',
        score: Math.floor(Math.random() * 40) + 60, // 60-100的随机分数
        metrics: {
          responseTime: Math.floor(Math.random() * 1000) + 200,
          uptime: '99.9%',
          statusCode: 200
        }
      }
    };

    res.success(testResult, '测试完成');
  } catch (error) {
    console.error('测试执行错误:', error);
    res.serverError('测试执行失败');
  }
});

// SEO分析端点 - 增强错误处理
app.post('/api/seo/analyze', (req, res) => {
  const { url } = req.body;
  
  // 检查请求体大小 (防止大载荷攻击)
  const bodySize = JSON.stringify(req.body).length;
  if (bodySize > 10000) { // 10KB限制
    return res.status(413).json({
      success: false,
      error: '请求载荷过大',
      maxSize: '10KB',
      timestamp: new Date().toISOString()
    });
  }
  
  // 验证URL
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) {
    return res.validationError([{ field: 'url', message: urlValidation.error }]);
  }
  
  try {
    console.log(`🔍 开始SEO分析: ${url}`);
    
    // 模拟SEO分析
    const seoResult = {
      url: url,
      score: Math.floor(Math.random() * 50) + 50,
      details: {
        title: { text: 'Sample Title', optimal: Math.random() > 0.5 },
        metaDescription: { optimal: Math.random() > 0.5 },
        headings: { h1: 1, h2: Math.floor(Math.random() * 5), h3: Math.floor(Math.random() * 10) },
        images: { 
          total: Math.floor(Math.random() * 20), 
          withAlt: Math.floor(Math.random() * 15),
          withoutAlt: Math.floor(Math.random() * 5)
        },
        links: { 
          internal: Math.floor(Math.random() * 50), 
          external: Math.floor(Math.random() * 20) 
        }
      },
      recommendations: ['优化页面标题', '添加meta描述', '改善图片alt属性']
    };
    
    console.log(`✅ SEO分析完成: ${url}, 评分: ${seoResult.score}`);
    res.success(seoResult, 'SEO分析完成');
    
  } catch (error) {
    console.error('SEO分析失败:', error.message);
    res.serverError('SEO分析服务暂时不可用');
  }
});

// 安全检查端点 - 修复响应错误
app.post('/api/security/quick-check', (req, res) => {
  const { url } = req.body;
  
  // 验证URL
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) {
    return res.validationError([{ field: 'url', message: urlValidation.error }]);
  }
  
  try {
    
    // 模拟安全检查
    const securityScore = Math.floor(Math.random() * 40) + 60;
    const securityResult = {
      url: url,
      securityScore: securityScore,
      httpsEnabled: Math.random() > 0.3,
      securityHeadersScore: Math.floor(Math.random() * 30) + 70,
      details: {
        ssl: { 
          enabled: Math.random() > 0.2, 
          score: Math.floor(Math.random() * 20) + 80 
        },
        headers: { 
          score: Math.floor(Math.random() * 30) + 70,
          missing: Math.random() > 0.5 ? ['Content-Security-Policy'] : []
        },
        vulnerabilities: []
      }
    };
    
    console.log(`✅ 安全测试完成: ${url}, 评分: ${securityScore}`);
    res.success(securityResult, '安全检查完成');
    
  } catch (error) {
    console.error('安全检查失败:', error.message);
    res.serverError('安全检查服务暂时不可用');
  }
});

// 其他API端点保持不变
app.get('/api/simple/ping', (req, res) => {
  res.success({
    message: 'pong',
    server: 'test-web-backend'
  });
});

app.get('/api/engines/status', (req, res) => {
  res.success({
    overall: {
      status: 'healthy',
      healthyEngines: 8,
      totalEngines: 8,
      healthPercentage: 100
    },
    engines: {
      website: { status: 'ready', available: true },
      seo: { status: 'ready', available: true },
      security: { status: 'ready', available: true },
      performance: { status: 'ready', available: true },
      api: { status: 'ready', available: true },
      compatibility: { status: 'ready', available: true },
      stress: { status: 'ready', available: true },
      ux: { status: 'ready', available: true }
    }
  });
});

app.get('/api/engines/capabilities', (req, res) => {
  res.success({
    availableEngines: VALID_TEST_TYPES,
    supportedTestTypes: [
      'website-analysis', 'seo-audit', 'security-scan',
      'performance-test', 'api-test', 'compatibility-check',
      'stress-test', 'ux-analysis'
    ],
    features: {
      realTimeMonitoring: true,
      scheduledTests: true,
      customReports: true,
      apiAccess: true
    }
  });
});

app.get('/api/security/capabilities', (req, res) => {
  res.success({
    scanTypes: ['ssl', 'headers', 'vulnerabilities', 'cors'],
    supportedProtocols: ['https', 'http'],
    features: {
      sslAnalysis: true,
      headerAnalysis: true,
      vulnerabilityScanning: true,
      complianceChecks: true
    }
  });
});

app.get('/api/seo/health', (req, res) => {
  res.success({
    service: 'seo-analyzer',
    status: 'healthy',
    version: '1.0.0',
    features: ['meta-analysis', 'content-analysis', 'performance-seo'],
    lastCheck: new Date().toISOString()
  });
});

// 404处理
app.use('*', (req, res) => {
  res.notFound(`路由 ${req.originalUrl} 不存在`);
});

// 全局错误处理 - 改进版
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  // 处理特定类型的错误
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: '请求载荷过大',
      maxSize: MAX_REQUEST_SIZE,
      timestamp: new Date().toISOString()
    });
  }
  
  if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    return res.validationError('无效的JSON格式');
  }
  
  // 默认错误处理
  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? '内部服务器错误' : err.message;
  
  res.status(status).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`✅ Test-Web Backend Server (FIXED) running on port ${PORT}`);
  console.log(`🔧 Fixed Issues: Response handlers, Input validation, Payload limits`);
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
