# Test-Web-backend 测试指南

## 📚 目录结构

```
tests/
├── unit/                    # 单元测试
│   └── middleware/         
│       └── auth.test.js    # 认证中间件测试
├── integration/            # 集成测试
│   └── auth.test.js       # 认证API集成测试
├── setup.js               # Jest全局测试设置
└── AUTH_TEST_REPORT.md    # 认证测试报告
```

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 运行所有测试
```bash
npm test
```

### 运行特定测试文件
```bash
# 运行认证中间件单元测试
npm test tests/unit/middleware/auth.test.js

# 运行认证集成测试
npm test tests/integration/auth.test.js
```

### 运行带覆盖率的测试
```bash
npm run test:coverage
```

### 监听模式（开发时使用）
```bash
npm run test:watch
```

## 📋 测试类型

### 单元测试 (Unit Tests)
位于 `tests/unit/` 目录，测试独立的函数、类和模块。

**特点：**
- 快速执行
- 不依赖外部服务
- 使用Mock对象
- 测试单一职责

**示例：**
- JWT Token生成和验证
- 密码加密和比较
- 输入验证逻辑

### 集成测试 (Integration Tests)
位于 `tests/integration/` 目录，测试多个模块协同工作。

**特点：**
- 测试真实流程
- 可能涉及多个模块
- 模拟API请求
- 验证端到端场景

**示例：**
- 用户注册流程
- 登录和Token获取
- 权限验证流程

## 🛠️ 测试工具

### Jest
主测试框架，提供：
- 测试运行器
- 断言库
- Mock功能
- 覆盖率报告

### Supertest
HTTP测试库，用于：
- 模拟HTTP请求
- 测试API端点
- 验证响应

### Bcryptjs
密码加密库，用于：
- 密码哈希
- 密码验证

### JsonWebToken
JWT处理库，用于：
- Token生成
- Token验证

## 📝 编写测试

### 基本测试结构
```javascript
describe('功能描述', () => {
  beforeEach(() => {
    // 每个测试前的设置
  });

  test('应该执行某个操作', () => {
    // 准备 (Arrange)
    const input = 'test';
    
    // 执行 (Act)
    const result = someFunction(input);
    
    // 断言 (Assert)
    expect(result).toBe('expected');
  });
});
```

### 使用全局测试工具
```javascript
// 创建Mock请求
const req = global.testUtils.mockRequest({
  body: { email: 'test@example.com' }
});

// 创建Mock响应
const res = global.testUtils.mockResponse();

// 创建Mock next函数
const next = global.testUtils.mockNext();
```

### 自定义匹配器
```javascript
// 验证Token格式
expect(token).toBeValidToken();

// 验证Email格式
expect(email).toBeValidEmail();
```

## 🎯 测试最佳实践

### 1. 测试命名
使用描述性的测试名称：
```javascript
// ✅ 好
test('应该在密码错误时返回401状态码', () => {});

// ❌ 不好
test('test1', () => {});
```

### 2. 独立性
每个测试应该独立运行：
```javascript
// ✅ 好 - 每个测试有自己的数据
beforeEach(() => {
  user = { id: 1, name: 'Test' };
});

// ❌ 不好 - 测试之间共享状态
const user = { id: 1, name: 'Test' };
```

### 3. AAA模式
遵循 Arrange-Act-Assert 模式：
```javascript
test('应该计算总价', () => {
  // Arrange - 准备
  const items = [{ price: 10 }, { price: 20 }];
  
  // Act - 执行
  const total = calculateTotal(items);
  
  // Assert - 断言
  expect(total).toBe(30);
});
```

### 4. 边界条件
测试边界和异常情况：
```javascript
test('应该处理空数组', () => {
  expect(calculateTotal([])).toBe(0);
});

test('应该处理null输入', () => {
  expect(calculateTotal(null)).toBe(0);
});
```

## 📊 测试覆盖率

### 查看覆盖率报告
运行测试后，覆盖率报告在：
```
backend/coverage/
├── lcov-report/   # HTML报告
│   └── index.html # 在浏览器中打开
└── lcov.info      # LCOV格式报告
```

### 覆盖率目标
| 指标 | 目标 | 状态 |
|------|------|------|
| 分支覆盖率 | ≥80% | 🎯 |
| 函数覆盖率 | ≥80% | 🎯 |
| 行覆盖率 | ≥80% | 🎯 |
| 语句覆盖率 | ≥80% | 🎯 |

## 🐛 调试测试

### 运行单个测试
```bash
npm test -- --testNamePattern="应该成功登录"
```

### 调试模式
```bash
node --inspect-brk node_modules/.bin/jest --runInBand tests/unit/middleware/auth.test.js
```

### 查看详细输出
```bash
npm test -- --verbose
```

## 📚 常用Jest API

### 断言
```javascript
expect(value).toBe(expected)           // 严格相等
expect(value).toEqual(expected)        // 深度相等
expect(value).toBeTruthy()             // 真值
expect(value).toBeFalsy()              // 假值
expect(value).toBeNull()               // null
expect(value).toBeDefined()            // 已定义
expect(value).toBeUndefined()          // 未定义
expect(value).toBeGreaterThan(n)       // 大于
expect(value).toBeLessThan(n)          // 小于
expect(value).toContain(item)          // 包含
expect(value).toHaveProperty('key')    // 有属性
expect(fn).toThrow()                   // 抛出异常
```

### Mock函数
```javascript
const mockFn = jest.fn()              // 创建Mock函数
mockFn.mockReturnValue('value')        // 设置返回值
mockFn.mockResolvedValue('value')      // 设置Promise返回值
mockFn.mockRejectedValue(error)        // 设置Promise错误
expect(mockFn).toHaveBeenCalled()      // 已被调用
expect(mockFn).toHaveBeenCalledWith(arg) // 用参数调用
expect(mockFn).toHaveBeenCalledTimes(n)  // 调用次数
```

## 🔧 配置

### Jest配置 (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### 环境变量 (`tests/setup.js`)
```javascript
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
```

## 📖 相关文档

- [Jest官方文档](https://jestjs.io/)
- [Supertest文档](https://github.com/visionmedia/supertest)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)

## 🆘 常见问题

### 测试运行缓慢
```bash
# 并行运行测试
npm test -- --maxWorkers=4

# 只运行变更的测试
npm test -- --onlyChanged
```

### 测试失败但本地通过
- 检查环境变量
- 确保数据库状态一致
- 清理测试缓存：`npm test -- --clearCache`

### Mock不生效
```bash
# 清理mock
jest.clearAllMocks()
jest.resetAllMocks()
jest.restoreAllMocks()
```

## 🤝 贡献指南

### 添加新测试
1. 在对应目录创建测试文件
2. 使用描述性的测试名称
3. 添加必要的注释
4. 确保测试通过
5. 更新文档

### 测试审查清单
- [ ] 测试名称清晰描述意图
- [ ] 测试独立且可重复
- [ ] 覆盖正常和异常情况
- [ ] 使用合适的断言
- [ ] 没有硬编码的敏感信息
- [ ] 测试执行时间合理

## 📞 支持

如有问题，请：
1. 查看测试报告 (`AUTH_TEST_REPORT.md`)
2. 阅读相关文档
3. 联系团队成员

---

💡 **提示**: 保持测试简单、清晰、有意义。好的测试是代码质量的保障！

