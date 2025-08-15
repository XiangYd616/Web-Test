# Web测试平台使用指南

## 🎯 快速开始

### 系统要求

- **Node.js**: 18.0.0 或更高版本
- **内存**: 最少 4GB RAM (推荐 8GB+)
- **磁盘空间**: 最少 2GB 可用空间
- **网络**: 稳定的互联网连接

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/your-org/test-web-platform.git
   cd test-web-platform
   ```

2. **安装依赖**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **启动服务**
   ```bash
   # 启动后端服务
   cd backend && npm run dev
   
   # 启动前端服务 (新终端)
   cd frontend && npm run dev
   ```

4. **访问应用**
   - 前端界面: http://localhost:5174
   - 后端API: http://localhost:3001

## 🧪 测试工具使用

### 1. API测试

**适用场景**: REST API端点测试、接口性能验证、认证测试

**基础用法**:
```javascript
const config = {
  url: 'https://api.example.com/users',
  method: 'GET',
  timeout: 10000
};

const result = await apiEngine.runApiTest(config);
```

**高级用法**:
```javascript
const config = {
  url: 'https://api.example.com/users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com'
  }),
  validation: {
    statusCode: 201,
    responseTime: 3000,
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' }
      }
    }
  }
};
```

**最佳实践**:
- 设置合理的超时时间 (API测试建议10-30秒)
- 使用环境变量管理敏感信息 (API密钥、token)
- 为不同环境配置不同的基础URL
- 实施响应结构验证确保API稳定性

### 2. 性能测试

**适用场景**: 网站性能评估、Core Web Vitals测量、移动端性能优化

**基础用法**:
```javascript
const config = {
  url: 'https://example.com',
  categories: ['performance'],
  device: 'desktop'
};

const result = await performanceEngine.runPerformanceTest(config);
```

**移动端测试**:
```javascript
const config = {
  url: 'https://example.com',
  categories: ['performance', 'accessibility'],
  device: 'mobile',
  throttling: {
    rttMs: 150,        // 3G网络延迟
    throughputKbps: 1600, // 3G网络速度
    cpuSlowdownMultiplier: 4 // CPU减速4倍
  }
};
```

**最佳实践**:
- 在不同网络条件下测试 (WiFi, 3G, 4G)
- 同时测试桌面和移动端性能
- 关注Core Web Vitals指标 (LCP, FID, CLS)
- 定期监控性能趋势

### 3. 安全测试

**适用场景**: SSL证书检查、安全头部验证、基础漏洞扫描

**基础用法**:
```javascript
const config = {
  url: 'https://example.com',
  checks: ['ssl', 'headers']
};

const result = await securityEngine.runSecurityTest(config);
```

**全面安全检查**:
```javascript
const config = {
  url: 'https://example.com',
  checks: ['ssl', 'headers', 'vulnerabilities', 'cookies', 'redirects'],
  maxRedirects: 3
};
```

**最佳实践**:
- 定期检查SSL证书过期时间
- 验证所有安全头部配置
- 监控重定向链安全性
- 检查Cookie安全属性

### 4. SEO测试

**适用场景**: 搜索引擎优化检查、Meta标签验证、结构化数据测试

**基础用法**:
```javascript
const config = {
  url: 'https://example.com',
  checks: ['meta', 'headings', 'images']
};

const result = await seoEngine.runSeoTest(config);
```

**全面SEO审计**:
```javascript
const config = {
  url: 'https://example.com',
  checks: ['meta', 'headings', 'images', 'links', 'structured-data', 'robots', 'sitemap']
};
```

**最佳实践**:
- 确保每个页面都有唯一的title和description
- 使用合理的标题层次结构 (H1-H6)
- 为所有图片添加alt属性
- 实施结构化数据标记

### 5. 压力测试

**适用场景**: 负载测试、并发性能验证、系统容量规划

**基础负载测试**:
```javascript
const config = {
  url: 'https://api.example.com/endpoint',
  concurrency: 10,    // 10个并发用户
  requests: 100,      // 总共100个请求
  timeout: 30000
};

const result = await stressEngine.runStressTest(config);
```

**时间基础测试**:
```javascript
const config = {
  url: 'https://api.example.com/endpoint',
  concurrency: 20,    // 20个并发用户
  duration: 60,       // 持续60秒
  rampUp: 10         // 10秒内逐步增加到最大并发
};
```

**最佳实践**:
- 从小并发数开始，逐步增加
- 监控服务器资源使用情况
- 测试不同类型的请求 (GET, POST, PUT)
- 分析响应时间分布和错误率

### 6. 基础设施测试

**适用场景**: 服务器健康检查、网络连接验证、DNS解析测试

**基础用法**:
```javascript
const config = {
  url: 'https://example.com',
  checks: ['connectivity', 'dns', 'ssl']
};

const result = await infrastructureEngine.runInfrastructureTest(config);
```

**端口扫描**:
```javascript
const config = {
  url: 'https://example.com',
  checks: ['connectivity', 'ports'],
  ports: [80, 443, 8080, 3000]
};
```

**最佳实践**:
- 定期检查关键服务端口状态
- 监控DNS解析性能
- 验证SSL证书配置
- 检查网络连接稳定性

### 7. UX测试

**适用场景**: 可访问性审计、用户体验评估、交互功能测试

**可访问性测试**:
```javascript
const config = {
  url: 'https://example.com',
  checks: ['accessibility'],
  device: 'desktop'
};

const result = await uxEngine.runUxTest(config);
```

**交互测试**:
```javascript
const config = {
  url: 'https://example.com',
  checks: ['accessibility', 'usability', 'interactions'],
  interactions: [
    { type: 'click', selector: '.menu-button' },
    { type: 'type', selector: 'input[name="search"]', value: 'test' },
    { type: 'scroll', selector: '.content' }
  ]
};
```

**最佳实践**:
- 确保键盘导航功能完整
- 验证屏幕阅读器兼容性
- 测试不同设备尺寸的用户体验
- 检查颜色对比度和可读性

### 8. 兼容性测试

**适用场景**: 跨浏览器兼容性验证、响应式设计测试、功能兼容性检查

**多浏览器测试**:
```javascript
const config = {
  url: 'https://example.com',
  browsers: ['chromium', 'firefox', 'webkit'],
  devices: ['desktop', 'mobile'],
  checks: ['rendering', 'javascript']
};

const result = await compatibilityEngine.runCompatibilityTest(config);
```

**响应式测试**:
```javascript
const config = {
  url: 'https://example.com',
  browsers: ['chromium'],
  devices: ['desktop', 'tablet', 'mobile'],
  checks: ['rendering', 'responsive'],
  screenshots: true
};
```

**最佳实践**:
- 测试主流浏览器 (Chrome, Firefox, Safari)
- 验证移动端和桌面端兼容性
- 检查JavaScript功能在不同浏览器中的表现
- 使用截图对比验证视觉一致性

### 9. 网站综合测试

**适用场景**: 整体网站健康检查、多页面分析、综合质量评估

**基础健康检查**:
```javascript
const config = {
  url: 'https://example.com',
  checks: ['health', 'seo'],
  maxPages: 5
};

const result = await websiteEngine.runWebsiteTest(config);
```

**全面网站审计**:
```javascript
const config = {
  url: 'https://example.com',
  checks: ['health', 'seo', 'performance', 'security', 'accessibility'],
  depth: 2,              // 检查2层深度的页面
  maxPages: 20,          // 最多检查20个页面
  followExternalLinks: false
};
```

**最佳实践**:
- 定期进行全站健康检查
- 监控关键页面的质量指标
- 分析页面间的链接关系
- 生成综合质量报告

## 📊 结果分析

### 理解测试结果

每个测试都会返回标准化的结果格式：

```javascript
{
  testId: 'unique-test-identifier',
  url: 'tested-url',
  timestamp: 'test-execution-time',
  summary: {
    score: 85,           // 总评分 (0-100)
    status: 'passed',    // 总体状态
    totalChecks: 5,      // 检查项总数
    passed: 4,           // 通过项数
    failed: 0,           // 失败项数
    warnings: 1          // 警告项数
  },
  checks: {              // 详细检查结果
    // 各项检查的具体结果
  },
  recommendations: [     // 改进建议
    // 具体的优化建议
  ]
}
```

### 评分标准

- **90-100分**: 优秀 🟢
- **70-89分**: 良好 🟡
- **50-69分**: 需要改进 🟠
- **0-49分**: 存在问题 🔴

### 状态说明

- **passed**: 测试通过，无重大问题
- **warning**: 测试通过，但有需要注意的问题
- **failed**: 测试失败，存在需要修复的问题

## 🔧 配置管理

### 环境配置

创建 `.env` 文件管理环境变量：

```bash
# 基础配置
NODE_ENV=development
PORT=3001

# 测试配置
DEFAULT_TIMEOUT=30000
MAX_CONCURRENT_TESTS=5

# 外部服务
LIGHTHOUSE_CHROME_PATH=/usr/bin/google-chrome
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 缓存配置
REDIS_URL=redis://localhost:6379
CACHE_TTL=300
```

### 测试配置模板

创建可重用的配置模板：

```javascript
// config/test-templates.js
module.exports = {
  // API测试模板
  api: {
    development: {
      timeout: 10000,
      retries: 3
    },
    production: {
      timeout: 30000,
      retries: 1
    }
  },
  
  // 性能测试模板
  performance: {
    desktop: {
      device: 'desktop',
      categories: ['performance', 'seo'],
      throttling: { rttMs: 40, throughputKbps: 10240 }
    },
    mobile: {
      device: 'mobile',
      categories: ['performance', 'accessibility'],
      throttling: { rttMs: 150, throughputKbps: 1600 }
    }
  }
};
```

## 🚀 自动化测试

### CI/CD集成

在 `.github/workflows/test.yml` 中配置自动化测试：

```yaml
name: Web Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          cd backend && npm install
      
      - name: Run API tests
        run: cd backend && npm run test:api
      
      - name: Run performance tests
        run: cd backend && npm run test:performance
      
      - name: Generate reports
        run: cd backend && npm run test:report
```

### 定时测试

使用 cron 作业定期执行测试：

```javascript
// scripts/scheduled-tests.js
const cron = require('node-cron');

// 每天凌晨2点执行全面测试
cron.schedule('0 2 * * *', async () => {
  console.log('开始定时测试...');
  
  const tests = [
    { engine: 'performance', config: { url: 'https://example.com' } },
    { engine: 'security', config: { url: 'https://example.com' } },
    { engine: 'seo', config: { url: 'https://example.com' } }
  ];
  
  for (const test of tests) {
    try {
      const result = await runTest(test.engine, test.config);
      await saveResult(result);
    } catch (error) {
      console.error(`测试失败: ${test.engine}`, error);
    }
  }
});
```

## 📈 监控和报告

### 性能监控

```javascript
// 监控测试执行性能
const testMetrics = {
  startTime: Date.now(),
  memoryUsage: process.memoryUsage(),
  cpuUsage: process.cpuUsage()
};

// 测试完成后记录指标
const endMetrics = {
  endTime: Date.now(),
  duration: Date.now() - testMetrics.startTime,
  memoryUsage: process.memoryUsage(),
  cpuUsage: process.cpuUsage(testMetrics.cpuUsage)
};
```

### 报告生成

```javascript
// 生成HTML报告
const generateReport = (results) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>测试报告</title>
      <style>
        .passed { color: green; }
        .warning { color: orange; }
        .failed { color: red; }
      </style>
    </head>
    <body>
      <h1>Web测试报告</h1>
      <div class="summary">
        <h2>测试概览</h2>
        <p>总评分: ${results.summary.score}</p>
        <p>状态: <span class="${results.summary.status}">${results.summary.status}</span></p>
      </div>
      <!-- 详细结果 -->
    </body>
    </html>
  `;
  
  return html;
};
```

## 🔍 故障排除

### 常见问题

1. **Chrome启动失败**
   ```bash
   # 安装Chrome依赖
   sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2
   
   # 设置Chrome路径
   export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
   ```

2. **内存不足**
   ```javascript
   // 限制并发数
   const config = {
     maxConcurrentTests: 2,  // 减少并发数
     timeout: 60000          // 增加超时时间
   };
   ```

3. **网络超时**
   ```javascript
   // 增加超时时间和重试次数
   const config = {
     timeout: 60000,
     retries: 3,
     retryDelay: 5000
   };
   ```

### 调试模式

启用详细日志输出：

```javascript
// 设置环境变量
process.env.DEBUG = 'test-engine:*';

// 或在代码中启用
const debug = require('debug')('test-engine');
debug('测试开始执行...');
```

## 📚 进阶用法

### 自定义测试引擎

```javascript
class CustomTestEngine {
  constructor() {
    this.name = 'custom';
  }
  
  validateConfig(config) {
    // 配置验证逻辑
  }
  
  async checkAvailability() {
    // 可用性检查逻辑
  }
  
  async runCustomTest(config) {
    // 自定义测试逻辑
  }
}
```

### 插件系统

```javascript
// 注册测试插件
const testEngine = new TestEngine();
testEngine.use(new CustomPlugin());
testEngine.use(new ReportingPlugin());
```

### 结果处理管道

```javascript
const pipeline = [
  validateResults,
  transformResults,
  saveResults,
  sendNotifications
];

const processResults = async (results) => {
  for (const processor of pipeline) {
    results = await processor(results);
  }
  return results;
};
```

## 🎯 最佳实践总结

1. **测试策略**
   - 制定全面的测试计划
   - 定期执行自动化测试
   - 监控关键性能指标

2. **配置管理**
   - 使用环境变量管理配置
   - 创建可重用的配置模板
   - 版本控制配置文件

3. **性能优化**
   - 合理设置并发数和超时时间
   - 使用缓存减少重复测试
   - 监控资源使用情况

4. **结果分析**
   - 建立基准线和趋势分析
   - 关注关键质量指标
   - 及时响应测试警告

5. **团队协作**
   - 共享测试配置和结果
   - 建立测试标准和流程
   - 定期回顾和改进测试策略

---

*使用指南版本: 1.0.0 | 最后更新: 2024-01-01*
