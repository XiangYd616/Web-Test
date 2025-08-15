# 测试工具API文档

## 📋 概览

本文档描述了Web测试平台中所有测试工具的API接口、配置参数和使用方法。

### 🎯 支持的测试类型

| 测试类型 | 引擎名称 | 主要功能 | 状态 |
|---------|---------|----------|------|
| **API测试** | `api` | 端点测试、认证、响应验证 | ✅ 完整 |
| **性能测试** | `performance` | Lighthouse审计、Core Web Vitals | ✅ 完整 |
| **安全测试** | `security` | SSL检查、安全头部、漏洞扫描 | ✅ 完整 |
| **SEO测试** | `seo` | Meta分析、结构化数据、优化建议 | ✅ 完整 |
| **压力测试** | `stress` | 负载测试、并发请求、性能指标 | ✅ 完整 |
| **基础设施测试** | `infrastructure` | DNS解析、端口检查、网络连接 | ✅ 完整 |
| **UX测试** | `ux` | 可访问性、可用性、交互测试 | ✅ 完整 |
| **兼容性测试** | `compatibility` | 跨浏览器、跨设备测试 | ✅ 完整 |
| **网站综合测试** | `website` | 整体健康检查、最佳实践 | ✅ 完整 |

## 🚀 快速开始

### 基本使用模式

```javascript
// 1. 导入测试引擎
const ApiTestEngine = require('./engines/api/apiTestEngine.js');

// 2. 创建引擎实例
const apiEngine = new ApiTestEngine();

// 3. 配置测试参数
const config = {
  url: 'https://api.example.com/users',
  method: 'GET',
  timeout: 10000
};

// 4. 执行测试
const results = await apiEngine.runApiTest(config);

// 5. 处理结果
console.log('测试结果:', results);
```

### 通用API接口

所有测试引擎都实现以下标准接口：

```javascript
class TestEngine {
  // 验证配置参数
  validateConfig(config) { /* ... */ }
  
  // 检查引擎可用性
  async checkAvailability() { /* ... */ }
  
  // 执行测试 (具体方法名因引擎而异)
  async runXxxTest(config) { /* ... */ }
  
  // 获取测试状态
  getTestStatus(testId) { /* ... */ }
  
  // 停止测试
  async stopTest(testId) { /* ... */ }
  
  // 更新测试进度
  updateTestProgress(testId, progress, message) { /* ... */ }
}
```

## 🔧 API测试引擎

### 配置参数

```javascript
const config = {
  url: 'https://api.example.com/endpoint',     // 必需: 测试URL
  method: 'GET',                               // HTTP方法 (GET/POST/PUT/DELETE)
  headers: {                                   // 请求头
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  },
  body: '{"key": "value"}',                   // 请求体 (POST/PUT)
  timeout: 30000,                             // 超时时间 (毫秒)
  auth: {                                     // 认证配置
    type: 'bearer',                           // bearer/basic/apikey
    token: 'your-token',                      // Bearer token
    username: 'user',                         // Basic认证用户名
    password: 'pass',                         // Basic认证密码
    apiKey: 'key',                           // API Key
    apiKeyHeader: 'X-API-Key'                // API Key头部名称
  },
  validation: {                               // 响应验证
    statusCode: 200,                          // 期望状态码
    responseTime: 5000,                       // 最大响应时间
    contentType: 'application/json',          // 期望内容类型
    schema: { /* JSON Schema */ }             // 响应结构验证
  }
};
```

### 使用示例

```javascript
const ApiTestEngine = require('./engines/api/apiTestEngine.js');
const engine = new ApiTestEngine();

// 简单GET请求测试
const simpleTest = await engine.runApiTest({
  url: 'https://httpbin.org/get'
});

// 带认证的POST请求测试
const authTest = await engine.runApiTest({
  url: 'https://api.example.com/users',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
  auth: {
    type: 'bearer',
    token: 'your-jwt-token'
  },
  validation: {
    statusCode: 201,
    responseTime: 3000
  }
});
```

### 响应格式

```javascript
{
  testId: 'api_1234567890_abc123',
  url: 'https://api.example.com/endpoint',
  timestamp: '2024-01-01T00:00:00.000Z',
  request: {
    method: 'GET',
    headers: { /* ... */ },
    body: null,
    timestamp: '2024-01-01T00:00:00.000Z'
  },
  response: {
    statusCode: 200,
    headers: { /* ... */ },
    body: '{"result": "success"}',
    responseTime: 1234,
    timestamp: '2024-01-01T00:00:00.123Z'
  },
  validation: {
    statusCode: { expected: 200, actual: 200, passed: true },
    responseTime: { expected: 5000, actual: 1234, passed: true },
    contentType: { expected: 'application/json', actual: 'application/json', passed: true }
  },
  summary: {
    passed: true,
    score: 100,
    issues: []
  },
  totalTime: 1250
}
```

## ⚡ 性能测试引擎

### 配置参数

```javascript
const config = {
  url: 'https://example.com',                 // 必需: 测试URL
  categories: [                               // Lighthouse测试类别
    'performance',                            // 性能
    'accessibility',                          // 可访问性
    'best-practices',                         // 最佳实践
    'seo'                                     // SEO
  ],
  device: 'desktop',                          // 设备类型: desktop/mobile
  throttling: {                               // 网络节流
    rttMs: 40,                               // 往返时间
    throughputKbps: 10240,                   // 吞吐量
    cpuSlowdownMultiplier: 1                 // CPU减速倍数
  },
  timeout: 60000,                            // 超时时间
  locale: 'zh-CN',                           // 语言设置
  emulatedFormFactor: 'desktop'              // 模拟设备
};
```

### 使用示例

```javascript
const PerformanceTestEngine = require('./engines/performance/performanceTestEngine.js');
const engine = new PerformanceTestEngine();

// 桌面性能测试
const desktopTest = await engine.runPerformanceTest({
  url: 'https://example.com',
  categories: ['performance', 'seo'],
  device: 'desktop'
});

// 移动设备性能测试
const mobileTest = await engine.runPerformanceTest({
  url: 'https://example.com',
  categories: ['performance', 'accessibility'],
  device: 'mobile',
  throttling: {
    rttMs: 150,
    throughputKbps: 1600,
    cpuSlowdownMultiplier: 4
  }
});
```

## 🔒 安全测试引擎

### 配置参数

```javascript
const config = {
  url: 'https://example.com',                 // 必需: 测试URL
  checks: [                                   // 安全检查项目
    'ssl',                                    // SSL证书检查
    'headers',                                // 安全头部检查
    'vulnerabilities',                        // 漏洞扫描
    'cookies',                                // Cookie安全检查
    'redirects'                               // 重定向检查
  ],
  timeout: 30000,                            // 超时时间
  maxRedirects: 5,                           // 最大重定向次数
  userAgent: 'SecurityTestEngine/1.0'        // 用户代理
};
```

### 使用示例

```javascript
const SecurityTestEngine = require('./engines/security/securityTestEngine.js');
const engine = new SecurityTestEngine();

// 全面安全检查
const securityTest = await engine.runSecurityTest({
  url: 'https://example.com',
  checks: ['ssl', 'headers', 'vulnerabilities']
});

// SSL证书专项检查
const sslTest = await engine.runSecurityTest({
  url: 'https://example.com',
  checks: ['ssl']
});
```

## 📈 SEO测试引擎

### 配置参数

```javascript
const config = {
  url: 'https://example.com',                 // 必需: 测试URL
  checks: [                                   // SEO检查项目
    'meta',                                   // Meta标签检查
    'headings',                               // 标题结构检查
    'images',                                 // 图片优化检查
    'links',                                  // 链接检查
    'structured-data',                        // 结构化数据
    'robots',                                 // robots.txt检查
    'sitemap'                                 // 站点地图检查
  ],
  timeout: 30000,                            // 超时时间
  userAgent: 'SEOTestEngine/1.0'             // 用户代理
};
```

### 使用示例

```javascript
const SeoTestEngine = require('./engines/seo/seoTestEngine.js');
const engine = new SeoTestEngine();

// 基础SEO检查
const seoTest = await engine.runSeoTest({
  url: 'https://example.com',
  checks: ['meta', 'headings', 'images']
});

// 全面SEO审计
const fullSeoTest = await engine.runSeoTest({
  url: 'https://example.com',
  checks: ['meta', 'headings', 'images', 'links', 'structured-data', 'robots', 'sitemap']
});
```

## 💪 压力测试引擎

### 配置参数

```javascript
const config = {
  url: 'https://example.com',                 // 必需: 测试URL
  concurrency: 10,                           // 并发数 (1-1000)
  requests: 100,                             // 总请求数 (1-10000)
  duration: 60,                              // 测试时长(秒) - 可选，与requests二选一
  timeout: 30000,                            // 单个请求超时
  method: 'GET',                             // HTTP方法
  headers: {},                               // 请求头
  body: null,                                // 请求体
  rampUp: 10,                                // 渐进加压时间(秒)
  keepAlive: true                            // 保持连接
};
```

### 使用示例

```javascript
const StressTestEngine = require('./engines/stress/stressTestEngine.js');
const engine = new StressTestEngine();

// 基于请求数的压力测试
const requestBasedTest = await engine.runStressTest({
  url: 'https://httpbin.org/delay/1',
  concurrency: 5,
  requests: 50,
  timeout: 10000
});

// 基于时间的压力测试
const timeBasedTest = await engine.runStressTest({
  url: 'https://httpbin.org/get',
  concurrency: 10,
  duration: 30,
  rampUp: 5
});
```

## 🏗️ 基础设施测试引擎

### 配置参数

```javascript
const config = {
  url: 'https://example.com',                 // 必需: 测试URL
  checks: [                                   // 基础设施检查项目
    'connectivity',                           // 连接性检查
    'dns',                                    // DNS解析检查
    'ssl',                                    // SSL检查
    'ports',                                  // 端口检查
    'headers',                                // 响应头检查
    'redirects'                               // 重定向检查
  ],
  timeout: 30000,                            // 超时时间
  ports: [80, 443, 8080],                    // 要检查的端口
  dnsServers: ['8.8.8.8', '1.1.1.1'],      // DNS服务器 (可选)
  maxRedirects: 5                            // 最大重定向次数
};
```

### 使用示例

```javascript
const InfrastructureTestEngine = require('./engines/infrastructure/infrastructureTestEngine.js');
const engine = new InfrastructureTestEngine();

// 基础连接检查
const connectivityTest = await engine.runInfrastructureTest({
  url: 'https://example.com',
  checks: ['connectivity', 'dns']
});

// 全面基础设施检查
const fullInfraTest = await engine.runInfrastructureTest({
  url: 'https://example.com',
  checks: ['connectivity', 'dns', 'ssl', 'ports'],
  ports: [80, 443, 8080, 3000]
});
```

## 🎨 UX测试引擎

### 配置参数

```javascript
const config = {
  url: 'https://example.com',                 // 必需: 测试URL
  checks: [                                   // UX检查项目
    'accessibility',                          // 可访问性检查
    'usability',                             // 可用性检查
    'interactions',                          // 交互测试
    'mobile',                                // 移动端适配
    'forms'                                  // 表单可用性
  ],
  timeout: 60000,                            // 超时时间
  device: 'desktop',                         // 设备类型
  viewport: {                                // 视口设置
    width: 1366,
    height: 768
  },
  waitForSelector: '.main-content',          // 等待特定元素
  interactions: [                            // 交互测试配置
    {
      type: 'click',
      selector: '.button',
      value: null
    },
    {
      type: 'type',
      selector: 'input[name="search"]',
      value: 'test query'
    }
  ]
};
```

### 使用示例

```javascript
const UxTestEngine = require('./engines/ux/uxTestEngine.js');
const engine = new UxTestEngine();

// 可访问性检查
const accessibilityTest = await engine.runUxTest({
  url: 'https://example.com',
  checks: ['accessibility'],
  device: 'desktop'
});

// 移动端UX测试
const mobileUxTest = await engine.runUxTest({
  url: 'https://example.com',
  checks: ['accessibility', 'usability', 'mobile'],
  device: 'mobile',
  viewport: { width: 375, height: 667 }
});
```

## 🌐 兼容性测试引擎

### 配置参数

```javascript
const config = {
  url: 'https://example.com',                 // 必需: 测试URL
  browsers: ['chromium', 'firefox', 'webkit'], // 浏览器列表
  devices: ['desktop', 'mobile', 'tablet'],   // 设备类型
  checks: [                                   // 兼容性检查项目
    'rendering',                              // 渲染检查
    'javascript',                             // JavaScript兼容性
    'css',                                    // CSS兼容性
    'responsive',                             // 响应式设计
    'features'                                // 浏览器特性
  ],
  timeout: 60000,                            // 超时时间
  screenshots: false,                        // 是否截图
  waitForSelector: null                      // 等待特定元素
};
```

### 使用示例

```javascript
const CompatibilityTestEngine = require('./engines/compatibility/compatibilityTestEngine.js');
const engine = new CompatibilityTestEngine();

// 跨浏览器兼容性测试
const browserTest = await engine.runCompatibilityTest({
  url: 'https://example.com',
  browsers: ['chromium', 'firefox'],
  devices: ['desktop'],
  checks: ['rendering', 'javascript']
});

// 全面兼容性测试
const fullCompatTest = await engine.runCompatibilityTest({
  url: 'https://example.com',
  browsers: ['chromium', 'firefox', 'webkit'],
  devices: ['desktop', 'mobile', 'tablet'],
  checks: ['rendering', 'javascript', 'css', 'responsive'],
  screenshots: true
});
```

## 🌍 网站综合测试引擎

### 配置参数

```javascript
const config = {
  url: 'https://example.com',                 // 必需: 测试URL
  checks: [                                   // 综合检查项目
    'health',                                 // 健康检查
    'seo',                                    // SEO检查
    'performance',                            // 性能检查
    'security',                               // 安全检查
    'accessibility',                          // 可访问性检查
    'best-practices'                          // 最佳实践
  ],
  timeout: 60000,                            // 超时时间
  depth: 2,                                  // 检查深度 (页面层级)
  maxPages: 10,                              // 最大检查页面数
  followExternalLinks: false,                // 是否跟踪外部链接
  userAgent: 'WebsiteTestEngine/1.0'         // 用户代理
};
```

### 使用示例

```javascript
const WebsiteTestEngine = require('./engines/website/websiteTestEngine.js');
const engine = new WebsiteTestEngine();

// 网站健康检查
const healthCheck = await engine.runWebsiteTest({
  url: 'https://example.com',
  checks: ['health', 'seo'],
  maxPages: 5
});

// 全面网站审计
const fullAudit = await engine.runWebsiteTest({
  url: 'https://example.com',
  checks: ['health', 'seo', 'performance', 'security', 'accessibility'],
  depth: 3,
  maxPages: 20,
  followExternalLinks: false
});
```

## 📊 通用响应格式

所有测试引擎都返回标准化的响应格式：

```javascript
{
  testId: 'engine_timestamp_randomId',       // 测试ID
  url: 'https://example.com',                // 测试URL
  timestamp: '2024-01-01T00:00:00.000Z',    // 测试时间
  checks: {                                  // 各项检查结果
    checkName: {
      status: 'passed|warning|failed',       // 检查状态
      score: 85,                             // 评分 (0-100)
      message: '检查结果描述',                // 结果描述
      details: { /* 详细信息 */ }            // 详细数据
    }
  },
  summary: {                                 // 测试总结
    totalChecks: 5,                          // 总检查项数
    passed: 4,                               // 通过项数
    failed: 0,                               // 失败项数
    warnings: 1,                             // 警告项数
    score: 85,                               // 总评分
    status: 'passed|warning|failed'          // 总体状态
  },
  totalTime: 12345,                          // 总耗时 (毫秒)
  recommendations: [                         // 改进建议 (可选)
    {
      priority: 'high|medium|low',
      category: '分类',
      description: '建议描述',
      suggestion: '具体建议'
    }
  ]
}
```

## 🔧 错误处理

### 错误类型

```javascript
// 配置错误
{
  error: 'ValidationError',
  message: '配置验证失败: url is required',
  details: { /* 验证详情 */ }
}

// 网络错误
{
  error: 'NetworkError',
  message: '网络连接失败: ENOTFOUND',
  details: { code: 'ENOTFOUND', hostname: 'example.com' }
}

// 超时错误
{
  error: 'TimeoutError',
  message: '测试超时',
  details: { timeout: 30000, elapsed: 30001 }
}

// 引擎错误
{
  error: 'EngineError',
  message: '引擎执行失败',
  details: { engine: 'performance', reason: 'Chrome launch failed' }
}
```

### 错误处理示例

```javascript
try {
  const result = await engine.runApiTest(config);
  console.log('测试成功:', result);
} catch (error) {
  switch (error.name) {
    case 'ValidationError':
      console.error('配置错误:', error.message);
      break;
    case 'NetworkError':
      console.error('网络错误:', error.message);
      break;
    case 'TimeoutError':
      console.error('超时错误:', error.message);
      break;
    default:
      console.error('未知错误:', error.message);
  }
}
```

## 📈 最佳实践

### 1. 配置优化

```javascript
// 根据测试类型调整超时时间
const timeouts = {
  api: 10000,        // API测试: 10秒
  performance: 60000, // 性能测试: 60秒
  compatibility: 120000, // 兼容性测试: 120秒
  stress: 300000     // 压力测试: 300秒
};

// 使用合适的并发数
const concurrency = {
  development: 2,    // 开发环境: 低并发
  testing: 5,        // 测试环境: 中等并发
  production: 10     // 生产环境: 高并发
};
```

### 2. 错误重试

```javascript
async function runTestWithRetry(engine, config, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await engine.runTest(config);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`重试 ${i + 1}/${maxRetries}: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 3. 结果缓存

```javascript
const resultCache = new Map();

async function runTestWithCache(engine, config, cacheKey) {
  if (resultCache.has(cacheKey)) {
    return resultCache.get(cacheKey);
  }
  
  const result = await engine.runTest(config);
  resultCache.set(cacheKey, result);
  
  // 设置缓存过期时间
  setTimeout(() => resultCache.delete(cacheKey), 300000); // 5分钟
  
  return result;
}
```

### 4. 批量测试

```javascript
async function runBatchTests(tests) {
  const results = [];
  
  // 控制并发数，避免资源耗尽
  const concurrency = 3;
  for (let i = 0; i < tests.length; i += concurrency) {
    const batch = tests.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(test => test.engine.runTest(test.config))
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

## 🔗 相关文档

- [安装指南](./INSTALLATION.md)
- [配置说明](./CONFIGURATION.md)
- [故障排除](./TROUBLESHOOTING.md)
- [性能优化](./PERFORMANCE.md)
- [开发指南](./DEVELOPMENT.md)

---

*文档版本: 1.0.0 | 最后更新: 2024-01-01*
