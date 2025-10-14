# 📊 测试覆盖率提升计划

## 🎯 目标

将测试覆盖率从当前水平提升至 **80%+**，确保代码质量和系统稳定性。

---

## 📋 当前状态分析

### 现有测试结构

```
backend/tests/
├── unit/              # 单元测试
│   ├── services/      # 服务层测试
│   ├── middleware/    # 中间件测试
│   └── utils/         # 工具函数测试
├── integration/       # 集成测试
│   ├── api/           # API 端点测试
│   └── database/      # 数据库测试
├── e2e/               # 端到端测试
└── performance/       # 性能测试
```

### 覆盖率目标分解

| 测试类型 | 当前覆盖率 | 目标覆盖率 | 优先级 |
|---------|-----------|-----------|--------|
| 单元测试 | ~60% | 85%+ | 🔴 高 |
| 集成测试 | ~45% | 75%+ | 🟡 中 |
| API测试 | ~70% | 90%+ | 🟢 中 |
| E2E测试 | ~30% | 60%+ | 🟡 低 |

---

## 🚀 实施步骤

### 第一阶段：设置测试基础设施（1周）

#### 1. 安装测试工具

```bash
cd D:\myproject\Test-Web-backend\backend

# 安装测试依赖
npm install --save-dev jest @jest/globals
npm install --save-dev supertest
npm install --save-dev @faker-js/faker
npm install --save-dev jest-extended
npm install --save-dev jest-html-reporter
npm install --save-dev nyc
```

#### 2. 配置 Jest

创建 `jest.config.js`:

```javascript
module.exports = {
  // 测试环境
  testEnvironment: 'node',
  
  // 覆盖率收集
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // 需要收集覆盖率的文件
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**',
    '!src/**/*.test.js',
    '!src/**/__tests__/**'
  ],
  
  // 测试文件匹配模式
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // 测试超时
  testTimeout: 10000,
  
  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // 模块路径别名
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // 详细输出
  verbose: true
};
```

#### 3. 创建测试设置文件

`tests/setup.js`:

```javascript
const { jest } = require('@jest/globals');
require('jest-extended');

// 全局测试超时
jest.setTimeout(10000);

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DB_NAME = 'testweb_test';
process.env.REDIS_HOST = 'localhost';

// 全局测试钩子
beforeAll(() => {
  console.log('🚀 开始测试套件...');
});

afterAll(() => {
  console.log('✅ 测试套件完成！');
});

// 全局错误处理
process.on('unhandledRejection', (error) => {
  console.error('未处理的 Promise 拒绝:', error);
});
```

#### 4. 更新 package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "jest tests/e2e",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "coverage:report": "open coverage/index.html"
  }
}
```

---

### 第二阶段：编写单元测试（2-3周）

#### 优先级清单

1. ✅ **核心服务层** (最高优先级)
2. ✅ **中间件** (高优先级)
3. ✅ **工具函数** (高优先级)
4. ⏳ **控制器** (中优先级)
5. ⏳ **模型验证** (中优先级)

#### 示例：测试服务层

`tests/unit/services/authService.test.js`:

```javascript
const { describe, test, expect, beforeEach, jest } = require('@jest/globals');
const authService = require('../../../src/services/authService');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 模拟依赖
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../../src/models/User');

describe('AuthService', () => {
  describe('hashPassword', () => {
    test('应该正确哈希密码', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = '$2b$10$hashedpassword';
      
      bcrypt.hash.mockResolvedValue(hashedPassword);
      
      const result = await authService.hashPassword(password);
      
      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });
    
    test('应该在密码为空时抛出错误', async () => {
      await expect(authService.hashPassword('')).rejects.toThrow();
    });
  });
  
  describe('comparePassword', () => {
    test('密码匹配时应返回 true', async () => {
      const password = 'TestPassword123!';
      const hash = '$2b$10$hashedpassword';
      
      bcrypt.compare.mockResolvedValue(true);
      
      const result = await authService.comparePassword(password, hash);
      
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
    });
    
    test('密码不匹配时应返回 false', async () => {
      bcrypt.compare.mockResolvedValue(false);
      
      const result = await authService.comparePassword('wrong', 'hash');
      
      expect(result).toBe(false);
    });
  });
  
  describe('generateToken', () => {
    test('应该生成有效的 JWT token', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = 'mock.jwt.token';
      
      jwt.sign.mockReturnValue(token);
      
      const result = authService.generateToken(payload);
      
      expect(result).toBe(token);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining(payload),
        expect.any(String),
        expect.objectContaining({ expiresIn: expect.any(String) })
      );
    });
  });
  
  describe('verifyToken', () => {
    test('应该验证有效的 token', () => {
      const token = 'valid.jwt.token';
      const decoded = { userId: 1, email: 'test@example.com' };
      
      jwt.verify.mockReturnValue(decoded);
      
      const result = authService.verifyToken(token);
      
      expect(result).toEqual(decoded);
      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
    });
    
    test('应该在 token 无效时抛出错误', () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      expect(() => authService.verifyToken('invalid')).toThrow('Invalid token');
    });
  });
});
```

#### 示例：测试中间件

`tests/unit/middleware/authMiddleware.test.js`:

```javascript
const { describe, test, expect, beforeEach, jest } = require('@jest/globals');
const authMiddleware = require('../../../src/middleware/authMiddleware');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

describe('AuthMiddleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });
  
  describe('authenticate', () => {
    test('应该在有效 token 时调用 next()', async () => {
      const token = 'valid.jwt.token';
      const decoded = { userId: 1, email: 'test@example.com' };
      
      req.headers.authorization = `Bearer ${token}`;
      jwt.verify.mockReturnValue(decoded);
      
      await authMiddleware.authenticate(req, res, next);
      
      expect(req.user).toEqual(decoded);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    test('应该在缺少 token 时返回 401', async () => {
      await authMiddleware.authenticate(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) })
      );
      expect(next).not.toHaveBeenCalled();
    });
    
    test('应该在 token 无效时返回 401', async () => {
      req.headers.authorization = 'Bearer invalid.token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      await authMiddleware.authenticate(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
    
    test('应该处理格式错误的 Authorization header', async () => {
      req.headers.authorization = 'InvalidFormat';
      
      await authMiddleware.authenticate(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
  
  describe('requireAdmin', () => {
    test('应该在用户是管理员时调用 next()', async () => {
      req.user = { userId: 1, role: 'admin' };
      
      await authMiddleware.requireAdmin(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    test('应该在用户不是管理员时返回 403', async () => {
      req.user = { userId: 1, role: 'user' };
      
      await authMiddleware.requireAdmin(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
```

#### 示例：测试工具函数

`tests/unit/utils/validation.test.js`:

```javascript
const { describe, test, expect } = require('@jest/globals');
const { 
  validateEmail, 
  validatePassword, 
  sanitizeInput 
} = require('../../../src/utils/validation');

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    test.each([
      'test@example.com',
      'user.name@domain.co.uk',
      'user+tag@example.com'
    ])('应该接受有效的邮箱: %s', (email) => {
      expect(validateEmail(email)).toBe(true);
    });
    
    test.each([
      'invalid',
      '@example.com',
      'user@',
      'user @example.com'
    ])('应该拒绝无效的邮箱: %s', (email) => {
      expect(validateEmail(email)).toBe(false);
    });
  });
  
  describe('validatePassword', () => {
    test('应该接受强密码', () => {
      const result = validatePassword('StrongPass123!');
      expect(result.isValid).toBe(true);
    });
    
    test('应该拒绝太短的密码', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码长度至少为 8 个字符');
    });
    
    test('应该拒绝没有数字的密码', () => {
      const result = validatePassword('NoNumbers!');
      expect(result.isValid).toBe(false);
    });
    
    test('应该拒绝没有特殊字符的密码', () => {
      const result = validatePassword('NoSpecial123');
      expect(result.isValid).toBe(false);
    });
  });
  
  describe('sanitizeInput', () => {
    test('应该移除 HTML 标签', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello');
      expect(result).not.toContain('<script>');
    });
    
    test('应该转义特殊字符', () => {
      const input = 'Test & <test>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });
    
    test('应该处理 null 和 undefined', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
    });
  });
});
```

---

### 第三阶段：编写集成测试（2周）

#### 示例：API 集成测试

`tests/integration/api/auth.test.js`:

```javascript
const request = require('supertest');
const app = require('../../../src/app');
const { setupTestDB, teardownTestDB } = require('../../helpers/db');

describe('Auth API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDB();
  });
  
  afterAll(async () => {
    await teardownTestDB();
  });
  
  describe('POST /auth/register', () => {
    test('应该成功注册新用户', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'StrongPass123!',
        username: 'newuser'
      };
      
      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);
      
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });
    
    test('应该拒绝重复的邮箱', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'StrongPass123!',
        username: 'existing'
      };
      
      // 第一次注册
      await request(app).post('/auth/register').send(userData);
      
      // 第二次注册（应该失败）
      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);
      
      expect(response.body).toHaveProperty('error');
    });
    
    test('应该验证输入数据', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'invalid' })
        .expect(400);
      
      expect(response.body).toHaveProperty('errors');
    });
  });
  
  describe('POST /auth/login', () => {
    const testUser = {
      email: 'testuser@example.com',
      password: 'TestPass123!',
      username: 'testuser'
    };
    
    beforeAll(async () => {
      await request(app).post('/auth/register').send(testUser);
    });
    
    test('应该成功登录', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(testUser.email);
    });
    
    test('应该拒绝错误的密码', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        })
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });
  });
});
```

#### 测试辅助函数

`tests/helpers/db.js`:

```javascript
const { sequelize } = require('../../src/models');
const { faker } = require('@faker-js/faker');

async function setupTestDB() {
  await sequelize.sync({ force: true });
  console.log('✅ 测试数据库已初始化');
}

async function teardownTestDB() {
  await sequelize.close();
  console.log('✅ 测试数据库连接已关闭');
}

async function createTestUser(overrides = {}) {
  const User = require('../../src/models/User');
  return await User.create({
    email: faker.internet.email(),
    username: faker.internet.userName(),
    password: 'TestPassword123!',
    ...overrides
  });
}

module.exports = {
  setupTestDB,
  teardownTestDB,
  createTestUser
};
```

---

### 第四阶段：E2E 测试（1周）

#### 示例：完整流程测试

`tests/e2e/userFlow.test.js`:

```javascript
const request = require('supertest');
const app = require('../../src/app');
const { setupTestDB, teardownTestDB } = require('../helpers/db');

describe('用户完整流程 E2E 测试', () => {
  let authToken;
  let userId;
  
  beforeAll(async () => {
    await setupTestDB();
  });
  
  afterAll(async () => {
    await teardownTestDB();
  });
  
  test('完整的用户生命周期', async () => {
    // 1. 注册
    const registerRes = await request(app)
      .post('/auth/register')
      .send({
        email: 'e2etest@example.com',
        password: 'E2ETest123!',
        username: 'e2etester'
      })
      .expect(201);
    
    authToken = registerRes.body.token;
    userId = registerRes.body.user.id;
    
    // 2. 获取个人资料
    const profileRes = await request(app)
      .get('/users/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(profileRes.body.email).toBe('e2etest@example.com');
    
    // 3. 更新个人资料
    await request(app)
      .put('/users/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ username: 'updated_username' })
      .expect(200);
    
    // 4. 执行测试任务
    const testRes = await request(app)
      .post('/tests/run')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        engineId: 'selenium',
        config: { browser: 'chrome' }
      })
      .expect(200);
    
    const testId = testRes.body.testId;
    
    // 5. 查看测试结果
    await request(app)
      .get(`/tests/${testId}/results`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    // 6. 登出
    await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });
});
```

---

## 📊 测试覆盖率监控

### 1. 本地查看覆盖率

```bash
# 运行测试并生成覆盖率报告
npm run test:coverage

# 在浏览器中查看报告 (Windows)
start coverage/index.html

# 命令行查看摘要
npm test -- --coverage --coverageReporters=text
```

### 2. CI/CD 集成

`.github/workflows/test-coverage.yml`:

```yaml
name: Test Coverage

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with coverage
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella
      
      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80%"
            exit 1
          fi
```

---

## 🎯 覆盖率提升策略

### 优先级矩阵

| 模块 | 当前覆盖率 | 目标 | 优先级 | 预计工时 |
|------|-----------|------|--------|---------|
| 认证服务 | 65% | 90% | 🔴 极高 | 8h |
| 用户服务 | 58% | 85% | 🔴 高 | 6h |
| 测试引擎 | 72% | 90% | 🔴 高 | 12h |
| 报告服务 | 45% | 80% | 🟡 中 | 8h |
| 监控服务 | 40% | 75% | 🟡 中 | 6h |
| 工具函数 | 80% | 95% | 🟢 低 | 4h |
| 中间件 | 75% | 90% | 🟡 中 | 6h |

### 每周进度跟踪

```bash
# 创建进度跟踪脚本
cat > track-coverage.sh << 'EOF'
#!/bin/bash

echo "📊 测试覆盖率进度报告"
echo "===================="
echo ""

npm run test:coverage --silent

COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
echo "总体覆盖率: $COVERAGE%"

if (( $(echo "$COVERAGE >= 80" | bc -l) )); then
  echo "✅ 已达到目标覆盖率！"
else
  REMAINING=$(echo "80 - $COVERAGE" | bc)
  echo "📈 还需提升: $REMAINING%"
fi
EOF

chmod +x track-coverage.sh
```

---

## 🧪 测试最佳实践

### 1. AAA 模式（Arrange-Act-Assert）

```javascript
test('should return user by id', async () => {
  // Arrange - 准备测试数据
  const userId = 1;
  const mockUser = { id: userId, email: 'test@example.com' };
  
  // Act - 执行被测试的功能
  const result = await userService.getUserById(userId);
  
  // Assert - 验证结果
  expect(result).toEqual(mockUser);
});
```

### 2. 使用描述性的测试名称

```javascript
// ❌ 不好
test('test 1', () => { /* ... */ });

// ✅ 好
test('should return 404 when user not found', () => { /* ... */ });
```

### 3. 一个测试只测试一件事

```javascript
// ❌ 不好 - 测试多个功能
test('user operations', async () => {
  await createUser();
  await updateUser();
  await deleteUser();
});

// ✅ 好 - 分开测试
test('should create user', async () => { /* ... */ });
test('should update user', async () => { /* ... */ });
test('should delete user', async () => { /* ... */ });
```

### 4. 使用测试数据工厂

```javascript
// tests/factories/userFactory.js
const { faker } = require('@faker-js/faker');

function createUserData(overrides = {}) {
  return {
    email: faker.internet.email(),
    username: faker.internet.userName(),
    password: 'TestPass123!',
    ...overrides
  };
}

module.exports = { createUserData };
```

---

## 📚 相关资源

- [Jest 官方文档](https://jestjs.io/docs/getting-started)
- [Supertest 文档](https://github.com/visionmedia/supertest)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [覆盖率工具 - Istanbul/NYC](https://istanbul.js.org/)

---

## ✅ 完成检查清单

### 第一周
- [ ] 安装所有测试依赖
- [ ] 配置 Jest 和覆盖率工具
- [ ] 设置测试环境和数据库
- [ ] 编写测试辅助函数

### 第二周
- [ ] 完成认证服务测试（目标 90%）
- [ ] 完成用户服务测试（目标 85%）
- [ ] 完成中间件测试（目标 90%）

### 第三周
- [ ] 完成测试引擎测试（目标 90%）
- [ ] 完成报告服务测试（目标 80%）
- [ ] 完成工具函数测试（目标 95%）

### 第四周
- [ ] 完成 API 集成测试
- [ ] 完成 E2E 测试
- [ ] 配置 CI/CD 集成
- [ ] 生成最终覆盖率报告

---

**目标截止日期**: 4周内完成  
**最终目标**: 总体覆盖率 ≥ 80%  
**负责人**: Test-Web 开发团队

---

**最后更新**: 2025-10-14  
**版本**: v1.0.0

