# Test-Web Postman功能增强使用指南

## 概述
Test-Web 现在已经整合了类似 Postman 的核心功能，从原本的模拟数据测试工具转变为一个功能完整的 API 测试平台。

## 已实现的核心功能

### 1. 真实 HTTP 请求引擎 (RealHTTPEngine)

#### 功能特性
- ✅ 支持所有 HTTP 方法（GET、POST、PUT、DELETE、PATCH、HEAD、OPTIONS）
- ✅ 多种认证方式（Bearer Token、Basic Auth、API Key、OAuth 2.0）
- ✅ 自定义请求头管理
- ✅ 请求体格式支持（JSON、Form Data、URL Encoded、Raw、Binary）
- ✅ 文件上传功能
- ✅ SSL/TLS 配置
- ✅ 代理设置
- ✅ 超时和重试配置
- ✅ 详细的响应信息（状态码、响应头、响应体、耗时）

#### 使用示例

```javascript
const RealHTTPEngine = require('./backend/services/http/RealHTTPEngine');

const engine = new RealHTTPEngine({
  timeout: 30000,
  maxRetries: 3
});

// 发送带认证的 POST 请求
const result = await engine.sendRequest({
  url: 'https://api.example.com/users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  auth: {
    type: 'bearer',
    token: 'your-api-token'
  },
  body: {
    type: 'json',
    data: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  }
});

console.log('响应状态:', result.status);
console.log('响应数据:', result.data);
console.log('响应时间:', result.responseTime, 'ms');
```

### 2. API 集合管理 (CollectionManager)

#### 功能特性
- ✅ 创建和组织 API 集合
- ✅ 文件夹层级结构
- ✅ 请求模板和示例
- ✅ 导入/导出 Postman 集合
- ✅ 批量执行集合请求
- ✅ 集合分享和权限管理
- ✅ 版本控制
- ✅ 集合运行报告

#### 使用示例

```javascript
const CollectionManager = require('./backend/services/collections/CollectionManager');

const manager = new CollectionManager();

// 创建新集合
const collection = await manager.createCollection({
  name: '用户管理 API',
  description: '用户相关的所有 API 接口',
  baseUrl: 'https://api.example.com'
});

// 添加文件夹
const folder = await manager.addFolder(collection.id, {
  name: '认证接口',
  description: '登录、注册、密码重置等'
});

// 添加请求
await manager.addRequest(collection.id, {
  name: '用户登录',
  method: 'POST',
  url: '{{baseUrl}}/auth/login',
  body: {
    type: 'json',
    data: {
      username: '{{username}}',
      password: '{{password}}'
    }
  },
  tests: `
    pm.test("Status code is 200", function () {
      pm.response.to.have.status(200);
    });
    pm.test("Response has token", function () {
      var jsonData = pm.response.json();
      pm.expect(jsonData).to.have.property('token');
    });
  `
}, folder.id);

// 运行整个集合
const results = await manager.runCollection(collection.id, {
  environment: 'production',
  iterations: 1,
  delay: 100
});
```

### 3. 环境变量管理 (EnvironmentManager)

#### 功能特性
- ✅ 多环境支持（开发、测试、生产）
- ✅ 全局变量和环境变量
- ✅ 动态变量生成
- ✅ 变量加密存储
- ✅ 变量作用域管理
- ✅ 导入/导出环境配置
- ✅ 变量历史记录
- ✅ 实时变量解析

#### 动态变量列表
- `$timestamp` - Unix 时间戳
- `$isoTimestamp` - ISO 格式时间戳
- `$randomInt` - 随机整数
- `$randomFloat` - 随机浮点数
- `$randomString` - 随机字符串
- `$guid` - UUID/GUID
- `$randomEmail` - 随机邮箱
- `$randomUserAgent` - 随机 User-Agent
- `$randomIP` - 随机 IP 地址
- `$randomPort` - 随机端口号
- `$randomColor` - 随机颜色值

#### 使用示例

```javascript
const EnvironmentManager = require('./backend/services/environments/EnvironmentManager');

const envManager = new EnvironmentManager();

// 创建环境
const devEnv = await envManager.createEnvironment({
  name: '开发环境',
  description: '本地开发环境配置',
  variables: [
    { key: 'baseUrl', value: 'http://localhost:3000', type: 'text' },
    { key: 'apiKey', value: 'dev-key-123', type: 'text', secret: true },
    { key: 'timeout', value: '5000', type: 'number' }
  ]
});

// 设置活跃环境
await envManager.setActiveEnvironment(devEnv.id);

// 使用变量
const url = envManager.resolveVariables('{{baseUrl}}/api/users');
console.log(url); // 输出: http://localhost:3000/api/users

// 使用动态变量
const requestId = envManager.resolveVariables('request-{{$guid}}');
console.log(requestId); // 输出: request-f47ac10b-58cc-4372-a567-0e02b2c3d479
```

## API 路由端点

### 环境管理 API

```bash
# 获取所有环境
GET /api/environments

# 创建新环境
POST /api/environments
{
  "name": "生产环境",
  "description": "生产服务器配置",
  "variables": [...]
}

# 激活环境
POST /api/environments/:id/activate

# 获取环境变量
GET /api/environments/:id/variables

# 设置变量
POST /api/environments/:id/variables
{
  "key": "apiUrl",
  "value": "https://api.production.com",
  "secret": false
}

# 导出环境
GET /api/environments/:id/export?format=postman

# 导入环境
POST /api/environments/import
```

### 集合管理 API

```bash
# 获取所有集合
GET /api/collections

# 创建集合
POST /api/collections
{
  "name": "API 测试集合",
  "description": "..."
}

# 添加请求
POST /api/collections/:id/requests
{
  "name": "获取用户列表",
  "method": "GET",
  "url": "{{baseUrl}}/users"
}

# 运行集合
POST /api/collections/:id/run
{
  "environment": "production",
  "iterations": 1
}

# 导出集合
GET /api/collections/:id/export?format=postman

# 导入 Postman 集合
POST /api/collections/import
```

## 前端组件使用

### 环境管理组件

```jsx
import EnvironmentManager from './components/EnvironmentManager';

function App() {
  return (
    <div>
      <EnvironmentManager />
    </div>
  );
}
```

组件功能：
- 环境列表管理
- 变量编辑器
- 动态变量帮助
- 导入/导出功能
- 变量历史查看

## 最佳实践

### 1. 环境变量组织
```javascript
// 推荐的变量命名规范
{
  // API 相关
  "API_BASE_URL": "https://api.example.com",
  "API_VERSION": "v1",
  "API_KEY": "secret-key",
  
  // 认证相关
  "AUTH_TOKEN": "bearer-token",
  "AUTH_USERNAME": "admin",
  "AUTH_PASSWORD": "password",
  
  // 配置相关
  "TIMEOUT": "30000",
  "MAX_RETRIES": "3",
  "DEBUG_MODE": "true"
}
```

### 2. 集合组织结构
```
用户管理 API/
├── 认证/
│   ├── 登录
│   ├── 注册
│   └── 刷新令牌
├── 用户操作/
│   ├── 获取用户列表
│   ├── 获取用户详情
│   ├── 更新用户信息
│   └── 删除用户
└── 权限管理/
    ├── 获取权限列表
    └── 分配权限
```

### 3. 测试脚本示例
```javascript
// Pre-request Script
pm.environment.set("timestamp", Date.now());
pm.environment.set("randomUser", "user_" + Math.random());

// Tests
pm.test("响应时间小于500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

pm.test("响应包含必要字段", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
    pm.expect(jsonData).to.have.property('name');
});

pm.test("保存认证令牌", function () {
    const jsonData = pm.response.json();
    pm.environment.set("authToken", jsonData.token);
});
```

## 与 Postman 的兼容性

### 支持的 Postman 功能
- ✅ 集合导入/导出
- ✅ 环境变量导入/导出
- ✅ 请求格式兼容
- ✅ 测试脚本（部分支持）
- ✅ Pre-request Scripts（部分支持）
- ✅ 变量语法 {{variable}}

### 迁移指南

1. **从 Postman 导出**
   - 在 Postman 中选择集合 → Export → Collection v2.1
   - 导出环境变量

2. **导入到 Test-Web**
   ```javascript
   // 导入集合
   await collectionManager.importPostmanCollection(postmanCollection);
   
   // 导入环境
   await environmentManager.importPostmanEnvironment(postmanEnvironment);
   ```

3. **运行测试**
   ```javascript
   const results = await collectionManager.runCollection(collectionId, {
     environment: environmentId
   });
   ```

### 4. 测试脚本引擎 (TestScriptEngine)

#### 功能特性
- ✅ Pre-request Scripts 执行
- ✅ Test Scripts 执行
- ✅ 兼容 Postman 脚本语法
- ✅ 环境变量操作
- ✅ 全局变量管理
- ✅ 控制台输出捕获
- ✅ 异步脚本支持
- ✅ 加密工具集成（MD5、SHA256等）
- ✅ 工作流支持（pm.sendRequest）

#### 使用示例

```javascript
const TestScriptEngine = require('./backend/services/testing/TestScriptEngine');

const engine = new TestScriptEngine();

// Pre-request Script
const preScript = `
  pm.environment.set('timestamp', Date.now());
  const token = CryptoJS.SHA256('secret_' + pm.environment.get('timestamp'));
  pm.environment.set('authToken', token);
`;

// Test Script
const testScript = `
  pm.test("状态码应该是 200", function () {
    pm.expect.response.to.have.status(200);
  });
  
  pm.test("响应时间小于 500ms", function () {
    pm.expect(responseTime).to.be.below(500);
  });
`;

// 执行脚本
const preResult = await engine.executePreRequestScript(preScript, context);
const testResult = await engine.executeTestScript(testScript, context);
```

### 5. 断言库 (AssertionLibrary)

#### 功能特性
- ✅ 响应状态断言
- ✅ 响应头断言
- ✅ 响应体断言
- ✅ JSON 路径断言
- ✅ Schema 验证
- ✅ 响应时间断言
- ✅ 通用断言方法
- ✅ 断言结果统计
- ✅ 详细错误信息

#### 断言方法列表

**响应断言**
- `status.toBe(code)` - 验证状态码
- `status.toBeOk()` - 验证成功响应(2xx)
- `header.toBe(name, value)` - 验证响应头
- `body.toHaveProperty(path, value)` - 验证属性
- `body.toMatchSchema(schema)` - Schema验证
- `time.toBeLessThan(ms)` - 响应时间断言
- `json.path(path).toBe(value)` - JSON路径断言

#### 使用示例

```javascript
const AssertionLibrary = require('./backend/services/testing/AssertionLibrary');

const assertLib = new AssertionLibrary();
const assertions = assertLib.createResponseAssertions(response);

// 各种断言
assertions.status.toBe(200);
assertions.header.toContain('content-type', 'json');
assertions.body.toHaveProperty('data.users');
assertions.json.path('data.users[0].name').toBe('Alice');
assertions.time.toBeLessThan(1000);

// 获取结果摘要
const summary = assertLib.getSummary();
console.log(`通过率: ${summary.passRate}%`);
```

## 完整的测试示例

### 测试套件运行

```javascript
const testSuite = {
  name: 'API 测试套件',
  tests: [
    {
      name: '登录测试',
      preRequestScript: `
        pm.environment.set('username', 'testuser');
        pm.environment.set('password', 'testpass');
      `,
      request: {
        url: '{{baseUrl}}/auth/login',
        method: 'POST',
        body: {
          username: '{{username}}',
          password: '{{password}}'
        }
      },
      testScript: `
        pm.test("登录成功", function () {
          pm.expect.response.to.have.status(200);
          const jsonData = pm.response.json();
          pm.expect(jsonData).to.have.property('token');
          pm.environment.set('authToken', jsonData.token);
        });
      `
    }
  ]
};

const results = await testEngine.runTestSuite(testSuite);
```

### 数据驱动测试

```javascript
const testData = [
  { input: 'valid', expected: 200 },
  { input: 'invalid', expected: 400 },
  { input: '', expected: 422 }
];

for (const data of testData) {
  const result = await runTest(data);
  console.log(`输入 ${data.input}: ${result.passed ? '通过' : '失败'}`);
}
```

## 后续改进计划

### 第四阶段：测试和脚本功能（已完成）
- ✅ 完整的测试脚本支持
- ✅ Pre-request 和 Test Scripts
- ✅ 断言库集成
- ✅ 测试报告生成

### 第五阶段：协作功能
- [ ] 团队工作空间
- [ ] 实时协作
- [ ] 评论和讨论
- [ ] 变更历史追踪

### 第六阶段：高级功能
- [ ] GraphQL 支持
- [ ] WebSocket 测试
- [ ] 性能测试
- [ ] 负载测试
- [ ] API 监控

## 总结

Test-Web 现在已经从一个简单的模拟数据测试工具，转变为一个功能完整的 API 测试平台。通过整合 Postman 的核心功能，现在可以：

1. **发送真实的 HTTP 请求** - 不再依赖模拟数据
2. **管理 API 集合** - 组织和复用测试用例
3. **使用环境变量** - 轻松切换不同环境
4. **导入 Postman 集合** - 平滑迁移现有测试

这些改进使 Test-Web 成为一个更加实用和专业的 API 测试工具。
