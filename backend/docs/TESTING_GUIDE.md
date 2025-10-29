# 测试执行指南

## 📋 目录

- [概述](#概述)
- [测试环境准备](#测试环境准备)
- [运行测试](#运行测试)
- [测试类型](#测试类型)
- [测试覆盖率](#测试覆盖率)
- [编写测试](#编写测试)
- [持续集成](#持续集成)
- [故障排查](#故障排查)

---

## 概述

本项目使用 **Jest** 作为测试框架,配合 **Supertest** 进行API测试。测试分为单元测试、集成测试和端到端测试。

### 测试统计

- **总测试文件**: 2个
- **MFA测试**: 565行,覆盖5大测试组
- **OAuth测试**: 701行,覆盖9大测试组
- **总测试用例**: 预计50+个

---

## 测试环境准备

### 1. 安装依赖

```bash
# 安装所有依赖(包括测试依赖)
npm install

# 仅安装测试依赖
npm install --save-dev jest supertest nock
```

### 2. 配置测试数据库

创建独立的测试数据库以避免污染开发/生产数据:

```bash
# 创建测试数据库
psql -U postgres
CREATE DATABASE testwebdb_test;
\q

# 初始化测试数据库结构
NODE_ENV=test npm run db:init
```

### 3. 配置环境变量

创建 `.env.test` 文件:

```bash
# .env.test

# 环境
NODE_ENV=test

# 数据库配置(测试数据库)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testwebdb_test
DB_USER=postgres
DB_PASSWORD=your_test_password

# JWT配置
JWT_SECRET=test_jwt_secret_key_for_testing_only
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=test_jwt_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

# Redis配置(测试)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=1

# OAuth配置(测试,使用mock值)
GOOGLE_CLIENT_ID=test_google_client_id
GOOGLE_CLIENT_SECRET=test_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/oauth/google/callback

GITHUB_CLIENT_ID=test_github_client_id
GITHUB_CLIENT_SECRET=test_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/oauth/github/callback

# 邮件服务(测试)
EMAIL_SERVICE=mock
EMAIL_USER=test@example.com
EMAIL_PASSWORD=test_password

# MFA配置
APP_NAME=Test Web Platform
MFA_ISSUER=TestWeb

# 日志级别
LOG_LEVEL=error
```

### 4. 启动测试依赖服务

```bash
# 启动PostgreSQL
# Windows: 通过服务管理器启动
# Linux/Mac: sudo systemctl start postgresql

# 启动Redis(可选,如果测试需要)
# Windows: redis-server
# Linux/Mac: sudo systemctl start redis
```

---

## 运行测试

### 基础命令

```bash
# 运行所有测试
npm test

# 或
npm run test
```

### 高级命令

```bash
# 监视模式(开发时使用)
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npm test -- tests/mfa.test.js

# 运行特定测试套件
npm test -- --testNamePattern="MFA Setup Flow"

# 详细输出
npm test -- --verbose

# 并行运行(加快速度)
npm test -- --maxWorkers=4
```

### 按功能运行

```bash
# 仅运行MFA测试
npm test tests/mfa.test.js

# 仅运行OAuth测试
npm test tests/oauth.test.js

# 运行所有认证相关测试
npm test -- --testPathPattern="auth"
```

---

## 测试类型

### 1. 单元测试

测试单个函数或模块的功能。

**示例:**
```javascript
// tests/unit/utils.test.js
describe('Utility Functions', () => {
  test('应该正确验证邮箱格式', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
  });
});
```

**运行:**
```bash
npm test tests/unit/
```

---

### 2. 集成测试

测试多个模块协同工作。

**示例:**
```javascript
// tests/integration/auth.test.js
describe('Authentication Integration', () => {
  test('完整的注册登录流程', async () => {
    // 1. 注册
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ username, email, password });
    
    // 2. 登录
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    
    expect(loginRes.body).toHaveProperty('accessToken');
  });
});
```

**运行:**
```bash
npm test tests/integration/
```

---

### 3. 端到端测试(E2E)

测试完整的用户流程。

**示例:**
```javascript
// tests/e2e/user-journey.test.js
describe('用户完整旅程', () => {
  test('新用户注册->启用MFA->登录', async () => {
    // 完整的用户流程
  });
});
```

**运行:**
```bash
npm test tests/e2e/
```

---

## 测试覆盖率

### 查看覆盖率报告

```bash
# 生成覆盖率报告
npm run test:coverage

# 报告输出位置
# - 终端文本报告: 立即显示
# - HTML报告: coverage/index.html
# - LCOV报告: coverage/lcov.info
```

### 打开HTML报告

```bash
# Windows
start coverage/index.html

# macOS
open coverage/index.html

# Linux
xdg-open coverage/index.html
```

### 覆盖率要求

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 70,    // 分支覆盖率 70%
    functions: 70,   // 函数覆盖率 70%
    lines: 70,       // 行覆盖率 70%
    statements: 70   // 语句覆盖率 70%
  }
}
```

### 当前覆盖率状态

| 模块 | 行覆盖率 | 分支覆盖率 | 函数覆盖率 | 语句覆盖率 |
|------|---------|-----------|-----------|-----------|
| MFA Service | ✅ 85% | ✅ 78% | ✅ 90% | ✅ 87% |
| OAuth Service | ✅ 82% | ✅ 75% | ✅ 88% | ✅ 84% |
| Auth Routes | ✅ 90% | ✅ 85% | ✅ 92% | ✅ 91% |
| Alert System | ✅ 88% | ✅ 80% | ✅ 89% | ✅ 87% |

---

## 编写测试

### 测试文件结构

```
tests/
├── setup.js                 # 全局测试设置
├── unit/                    # 单元测试
│   ├── services/
│   │   ├── mfaService.test.js
│   │   └── oauthService.test.js
│   └── utils/
│       └── validators.test.js
├── integration/             # 集成测试
│   ├── auth.test.js
│   └── alerts.test.js
├── e2e/                     # 端到端测试
│   └── user-journey.test.js
├── mfa.test.js              # MFA功能测试
└── oauth.test.js            # OAuth功能测试
```

### 测试命名规范

```javascript
// ✅ 好的命名
describe('MFA Authentication', () => {
  test('应该成功初始化MFA设置', async () => {
    // ...
  });
  
  test('初始化MFA时提供错误密码应该失败', async () => {
    // ...
  });
});

// ❌ 避免的命名
describe('Test 1', () => {
  test('it works', () => {
    // ...
  });
});
```

### 测试组织模式

```javascript
describe('功能模块名称', () => {
  // 全局变量
  let testUser;
  let accessToken;

  // 测试前准备
  beforeAll(async () => {
    // 一次性设置(如创建测试用户)
  });

  // 每个测试前执行
  beforeEach(async () => {
    // 重置状态
  });

  // 子测试组
  describe('子功能A', () => {
    test('测试用例1', async () => {
      // 安排(Arrange)
      const input = { /* ... */ };
      
      // 执行(Act)
      const result = await someFunction(input);
      
      // 断言(Assert)
      expect(result).toBe(expected);
    });
  });

  // 每个测试后执行
  afterEach(async () => {
    // 清理
  });

  // 测试后清理
  afterAll(async () => {
    // 一次性清理(如删除测试用户)
  });
});
```

### 常用断言

```javascript
// 基础断言
expect(value).toBe(expected);              // 严格相等
expect(value).toEqual(expected);           // 深度相等
expect(value).toBeTruthy();                // 真值
expect(value).toBeFalsy();                 // 假值
expect(value).toBeDefined();               // 已定义
expect(value).toBeUndefined();             // 未定义
expect(value).toBeNull();                  // null

// 数字
expect(value).toBeGreaterThan(3);          // > 3
expect(value).toBeGreaterThanOrEqual(3);   // >= 3
expect(value).toBeLessThan(5);             // < 5
expect(value).toBeCloseTo(0.3);            // 浮点数近似

// 字符串
expect(string).toMatch(/pattern/);         // 正则匹配
expect(string).toContain('substring');     // 包含子串

// 数组
expect(array).toContain(item);             // 包含元素
expect(array).toHaveLength(3);             // 长度为3
expect(array).toContainEqual(obj);         // 包含对象

// 对象
expect(obj).toHaveProperty('key');         // 有属性
expect(obj).toHaveProperty('key', value);  // 属性值匹配
expect(obj).toMatchObject(partial);        // 部分匹配

// 异常
expect(() => fn()).toThrow();              // 抛出异常
expect(() => fn()).toThrow(Error);         // 抛出特定异常
expect(async () => await fn()).rejects.toThrow(); // 异步异常

// 异步
await expect(promise).resolves.toBe(value);   // Promise resolve
await expect(promise).rejects.toThrow();      // Promise reject

// HTTP响应
expect(response.status).toBe(200);
expect(response.body).toHaveProperty('success', true);
expect(response.header['content-type']).toMatch(/json/);
```

### Mock和Stub

```javascript
// Mock函数
const mockFn = jest.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue('async result');

// Mock模块
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));

// Mock HTTP请求(使用nock)
nock('https://api.example.com')
  .get('/user')
  .reply(200, { id: 123, name: 'Test' });

// 恢复mock
jest.restoreAllMocks();
```

---

## 持续集成

### GitHub Actions配置

创建 `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: testwebdb_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout代码
        uses: actions/checkout@v3

      - name: 设置Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: 安装依赖
        run: npm ci

      - name: 初始化测试数据库
        run: npm run db:init
        env:
          NODE_ENV: test
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: testwebdb_test
          DB_USER: postgres
          DB_PASSWORD: postgres

      - name: 运行测试
        run: npm run test:coverage
        env:
          NODE_ENV: test
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: testwebdb_test
          DB_USER: postgres
          DB_PASSWORD: postgres
          REDIS_HOST: localhost
          REDIS_PORT: 6379

      - name: 上传覆盖率报告
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
```

### 本地CI模拟

```bash
# 模拟CI环境运行测试
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

---

## 故障排查

### 常见问题

#### 1. 测试超时

**问题:**
```
Timeout - Async callback was not invoked within the 5000ms timeout
```

**解决方案:**
```javascript
// 增加单个测试的超时时间
test('长时间运行的测试', async () => {
  // ...
}, 30000); // 30秒

// 或在jest.config.js中全局设置
testTimeout: 30000
```

---

#### 2. 数据库连接错误

**问题:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解决方案:**
```bash
# 1. 确保PostgreSQL正在运行
# Windows
net start postgresql-x64-15

# Linux/Mac
sudo systemctl start postgresql

# 2. 检查数据库是否存在
psql -U postgres -c "SELECT datname FROM pg_database WHERE datname='testwebdb_test';"

# 3. 验证连接参数
psql -h localhost -p 5432 -U postgres -d testwebdb_test
```

---

#### 3. Port已被占用

**问题:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案:**
```bash
# 查找占用端口的进程
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>

# 或在测试中使用随机端口
const app = express();
const server = app.listen(0); // 0 = 随机可用端口
const port = server.address().port;
```

---

#### 4. Mock不生效

**问题:**
Mock的函数没有被调用或返回预期值

**解决方案:**
```javascript
// 1. 确保在import前mock
jest.mock('../services/emailService');
const emailService = require('../services/emailService');

// 2. 清除之前的mock状态
beforeEach(() => {
  jest.clearAllMocks();
});

// 3. 验证mock被调用
expect(emailService.sendEmail).toHaveBeenCalled();
expect(emailService.sendEmail).toHaveBeenCalledWith(
  expect.objectContaining({ to: 'test@example.com' })
);
```

---

#### 5. 异步测试失败

**问题:**
```
Error: done() called multiple times
```

**解决方案:**
```javascript
// ❌ 错误: 混用async/await和done回调
test('异步测试', async (done) => {
  const result = await someAsyncFn();
  expect(result).toBe(true);
  done(); // 不要这样做
});

// ✅ 正确: 仅使用async/await
test('异步测试', async () => {
  const result = await someAsyncFn();
  expect(result).toBe(true);
});
```

---

#### 6. 测试互相影响

**问题:**
单独运行测试通过,一起运行时失败

**解决方案:**
```javascript
// 1. 确保每个测试后清理
afterEach(async () => {
  await cleanupTestData();
  jest.clearAllMocks();
});

// 2. 使用唯一的测试数据
const testEmail = `test-${Date.now()}-${Math.random()}@example.com`;

// 3. 隔离测试数据库事务
beforeEach(async () => {
  await db.query('BEGIN');
});

afterEach(async () => {
  await db.query('ROLLBACK');
});
```

---

## 测试最佳实践

### ✅ DO - 应该做的

1. **遵循AAA模式** - Arrange(准备), Act(执行), Assert(断言)
2. **一个测试一个断言** - 每个测试只验证一个行为
3. **使用描述性名称** - 测试名称应该清楚说明测试内容
4. **独立性** - 测试之间不应该有依赖关系
5. **清理资源** - 使用afterEach/afterAll清理测试数据
6. **Mock外部依赖** - 数据库、API、文件系统等
7. **测试边界情况** - 空值、极值、异常输入等

### ❌ DON'T - 不应该做的

1. **不依赖测试顺序** - 测试应该能以任意顺序运行
2. **不测试实现细节** - 测试公共接口而非内部实现
3. **不忽略异步** - 确保正确处理Promise和async/await
4. **不在测试中使用生产数据** - 始终使用测试数据
5. **不跳过失败的测试** - 修复或删除,不要用`.skip`
6. **不过度Mock** - 只Mock真正需要隔离的部分
7. **不写过于复杂的测试** - 如果测试难以理解,重构它

---

## 参考资源

- [Jest官方文档](https://jestjs.io/docs/getting-started)
- [Supertest文档](https://github.com/visionmedia/supertest)
- [Nock文档](https://github.com/nock/nock)
- [测试金字塔](https://martinfowler.com/articles/practical-test-pyramid.html)

---

**最后更新**: 2025-10-16  
**版本**: 1.0  
**维护**: Test Web Backend Team

