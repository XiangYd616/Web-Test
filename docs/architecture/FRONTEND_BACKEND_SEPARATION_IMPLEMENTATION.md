# 前后端职责分离实施文档

## 概述

本文档记录了项目中前后端职责分离的实施方案,确保前端只负责格式验证和UI交互,后端负责所有业务逻辑验证。

## 实施日期

2025-11-10

## 问题背景

### 原有问题

1. **前端包含业务逻辑**: testService中存在并发限制、配额检查等业务验证
2. **职责不清晰**: 前后端都在做验证,造成重复代码
3. **难以维护**: 业务规则改变时需要同时修改前后端
4. **安全隐患**: 前端验证可被绕过,后端缺少完整验证

### 解决方案

建立清晰的职责划分:

**前端职责**: 
- 基础格式验证(URL格式、必填项、数据类型)
- 即时用户反馈
- UI状态管理
- 数据展示

**后端职责**:
- 业务规则验证(并发限制、配额检查、权限控制)
- 数据处理和转换
- 业务流程编排
- 数据持久化

## 实施内容

### 1. 前端改造

#### 1.1 创建统一的格式验证工具

**文件**: `frontend/utils/formValidation.ts`

**功能**:
- URL格式验证
- 邮箱格式验证
- 密码格式验证
- 必填项验证
- 长度和范围验证
- 通用表单验证器

**特点**:
- 仅做格式检查,不涉及业务规则
- 提供即时反馈
- 可复用

```typescript
// 示例使用
import { validateTestConfigFormat } from '@/utils/formValidation';

const validation = validateTestConfigFormat({
  url: 'https://example.com',
  concurrent: 10
});

if (!validation.valid) {
  console.log(validation.errors); // { url: ['URL格式不正确'] }
}
```

#### 1.2 简化testService

**文件**: `frontend/services/business/testService.ts`

**改动**:
1. 移除所有业务验证逻辑
2. 使用统一的格式验证工具
3. 简化`createAndStart`方法,直接调用新API

**职责**:
- 数据缓存管理(UI性能优化)
- 调用Repository层获取数据
- 提供格式验证(仅用于前端即时反馈)

```typescript
// 前端验证仅检查格式
validateFormat(config: TestConfig): ValidationResult {
  return validateTestConfigFormat(config);
}

// 直接调用后端API,无业务逻辑
async createAndStart(config: TestConfig): Promise<TestResult> {
  const test = await testRepository.createAndStart(config);
  this.cache.clear();
  return test;
}
```

#### 1.3 更新testRepository

**文件**: `frontend/services/repository/testRepository.ts`

**改动**:
1. 扩展TestConfig接口,包含完整配置字段
2. 添加`createAndStart`方法,调用新API端点

```typescript
// 调用新架构API
async createAndStart(config: TestConfig): Promise<TestResult> {
  return apiClient.post<TestResult>(`${this.basePath}/create-and-start`, config);
}
```

### 2. 后端改造

#### 2.1 创建业务服务层

**文件**: `backend/services/testing/TestBusinessService.js`

**功能**:
- 完整的测试配置验证(格式+业务规则)
- 用户配额管理
- 权限检查
- 测试创建和启动流程编排

**业务规则**:

| 规则 | 限制 |
|------|------|
| 并发数 | 1-1000,推荐≤100 |
| 测试时长 | 1-3600秒(最长1小时) |
| 加压时间 | 0-600秒(最长10分钟) |
| 超时时间 | 1-60秒 |

**用户配额**:

| 角色 | 并发测试数 | 每日测试数 | 单测试最大并发 |
|------|-----------|-----------|--------------|
| 免费 | 2 | 10 | 50 |
| 付费 | 10 | 100 | 500 |
| 企业 | 50 | 1000 | 1000 |
| 管理员 | 100 | 无限制 | 1000 |

**核心方法**:

```javascript
// 完整验证(格式+业务规则)
async validateTestConfig(config, user) {
  // 1. 格式验证
  // 2. 业务规则验证
  // 3. 配额检查
  // 4. 权限验证
  return { isValid, errors, warnings };
}

// 创建并启动测试(完整流程)
async createAndStartTest(config, user) {
  // 1. 验证权限
  // 2. 完整验证
  // 3. 规范化配置
  // 4. 创建测试
  // 5. 启动测试
  return test;
}
```

#### 2.2 集成到路由

**文件**: `backend/routes/test.js`

**新增API端点**:

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/test/create-and-start` | POST | 创建并启动测试(统一入口) |
| `/api/test/business-rules` | GET | 获取业务规则配置 |
| `/api/test/quota` | GET | 获取用户配额信息 |
| `/api/test/validate` | POST | 验证测试配置(不创建) |

**实现示例**:

```javascript
// 创建并启动测试
router.post('/create-and-start', authMiddleware, testRateLimiter, asyncHandler(async (req, res) => {
  const config = req.body;
  const user = { userId: req.user.id, role: req.user.role || 'free' };

  // 调用业务服务处理完整流程
  const result = await testBusinessService.createAndStartTest(config, user);

  res.json({
    success: true,
    data: result,
    message: '测试创建并启动成功'
  });
}));
```

## 架构对比

### 改造前

```
前端 testService
├── validateTestData() ❌ 业务规则验证
├── checkConcurrentLimit() ❌ 并发限制检查
├── checkQuota() ❌ 配额检查
└── createAndStart()
    ├── 调用 create()
    └── 调用 start()

后端 routes/test.js
└── POST /test
    └── 简单创建,缺少验证 ❌
```

### 改造后

```
前端
├── utils/formValidation.ts ✅ 仅格式验证
├── testService.ts
│   ├── validateFormat() ✅ 调用格式验证
│   └── createAndStart() ✅ 直接调用API
└── testRepository.ts
    └── createAndStart() ✅ 调用新API

后端
├── services/testing/TestBusinessService.js ✅
│   ├── validateFormat() ✅ 格式验证
│   ├── validateBusinessRules() ✅ 业务验证
│   ├── checkQuota() ✅ 配额检查
│   ├── checkPermission() ✅ 权限检查
│   └── createAndStartTest() ✅ 完整流程
└── routes/test.js
    └── POST /test/create-and-start ✅ 统一入口
```

## 数据流

### 创建并启动测试流程

```
用户输入
  ↓
前端格式验证(即时反馈)
  ↓
调用 testService.createAndStart()
  ↓
调用 testRepository.createAndStart()
  ↓
HTTP POST /api/test/create-and-start
  ↓
后端路由 test.js
  ↓
testBusinessService.createAndStartTest()
  ├── 1. 验证权限
  ├── 2. 格式验证
  ├── 3. 业务规则验证
  │   ├── 并发限制
  │   ├── 配额检查
  │   ├── 时长限制
  │   └── 当前运行测试数
  ├── 4. 规范化配置
  ├── 5. 创建测试
  └── 6. 启动测试
  ↓
返回结果 + 警告信息
  ↓
前端显示结果
```

## 验证示例

### 前端验证(仅格式)

```typescript
// 前端只检查格式,不验证业务规则
const validation = testService.validateFormat({
  url: 'https://example.com',
  concurrent: 10
});

// 结果: { valid: true, errors: {} }
// 注意: 不会检查并发数是否超过配额
```

### 后端验证(格式+业务规则)

```javascript
// 后端完整验证
const validation = await testBusinessService.validateTestConfig({
  url: 'https://example.com',
  concurrent: 200  // 超过用户配额
}, {
  userId: '123',
  role: 'free'  // 免费用户最多50并发
});

// 结果: 
// {
//   isValid: false,
//   errors: ['您的套餐最多支持50并发'],
//   warnings: ['并发数较高(>100),可能会影响目标服务器']
// }
```

## 错误处理

### 验证错误

```javascript
// 后端返回
{
  success: false,
  error: '测试配置验证失败',
  details: {
    errors: [
      'URL不能为空',
      '并发数不能超过1000',
      '您的套餐最多支持50并发'
    ],
    warnings: [
      '并发数较高,可能会影响目标服务器'
    ]
  }
}
```

### 权限错误

```javascript
// 后端返回
{
  success: false,
  error: '未授权:用户未登录'
}
```

### 配额超限错误

```javascript
// 后端返回
{
  success: false,
  error: '测试配置验证失败',
  details: {
    errors: [
      '您当前有2个正在运行的测试,已达到最大并发数(2)',
      '您今日已创建10个测试,已达到每日限额(10)'
    ]
  }
}
```

## 测试建议

### 前端测试

```typescript
// 测试格式验证
describe('formValidation', () => {
  it('应该验证URL格式', () => {
    const result = validateUrlFormat('invalid-url');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('URL格式不正确');
  });

  it('应该验证测试配置格式', () => {
    const result = validateTestConfigFormat({
      url: 'https://example.com',
      concurrent: -1
    });
    expect(result.valid).toBe(false);
    expect(result.errors.concurrent).toContain('并发数必须大于0');
  });
});
```

### 后端测试

```javascript
// 测试业务验证
describe('TestBusinessService', () => {
  it('应该验证用户配额', async () => {
    const config = { url: 'https://example.com', concurrent: 100 };
    const user = { userId: '123', role: 'free' };

    const result = await testBusinessService.validateTestConfig(config, user);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('您的套餐最多支持50并发');
  });

  it('应该检查当前运行测试数', async () => {
    // Mock userTestManager.getRunningTestCount 返回 2
    const result = await testBusinessService.validateTestConfig(config, user);
    
    expect(result.errors).toContain('您当前有2个正在运行的测试,已达到最大并发数(2)');
  });
});
```

## 迁移指南

### 对于前端开发者

1. **使用新的格式验证工具**:
   ```typescript
   import { validateTestConfigFormat } from '@/utils/formValidation';
   ```

2. **调用新的API**:
   ```typescript
   // 旧代码
   await testService.create(config);
   await testService.start(testId);

   // 新代码
   await testService.createAndStart(config);
   ```

3. **处理验证错误**:
   ```typescript
   try {
     const test = await testService.createAndStart(config);
   } catch (error) {
     if (error.response?.status === 400) {
       // 验证错误
       const { errors, warnings } = error.response.data.details;
       // 显示错误信息
     }
   }
   ```

### 对于后端开发者

1. **使用业务服务层**:
   ```javascript
   const testBusinessService = require('../services/testing/TestBusinessService');
   ```

2. **在路由中调用**:
   ```javascript
   router.post('/create-and-start', authMiddleware, asyncHandler(async (req, res) => {
     const result = await testBusinessService.createAndStartTest(req.body, req.user);
     res.json({ success: true, data: result });
   }));
   ```

3. **添加业务规则**:
   - 修改`BUSINESS_RULES`配置
   - 在`validateBusinessRules`方法中添加验证逻辑

## 最佳实践

### 1. 前端验证

- ✅ **做**: 基础格式检查(必填、类型、格式)
- ✅ **做**: 提供即时用户反馈
- ❌ **不做**: 业务规则验证(配额、权限、限制)
- ❌ **不做**: 复杂的数据处理

### 2. 后端验证

- ✅ **做**: 完整的业务规则验证
- ✅ **做**: 权限和配额检查
- ✅ **做**: 数据规范化和处理
- ✅ **做**: 详细的错误信息

### 3. API设计

- ✅ **做**: 提供统一的入口端点
- ✅ **做**: 返回详细的验证错误
- ✅ **做**: 区分错误和警告
- ❌ **不做**: 信任前端验证结果

## 未来优化

1. **共享类型定义**: 使用TypeScript定义共享的接口,确保前后端一致
2. **动态配额**: 根据用户实际使用情况动态调整配额
3. **验证规则配置化**: 将业务规则存储在配置文件或数据库中
4. **监控和日志**: 记录验证失败的原因,用于分析和优化

## 相关文档

- [架构标准文档](./ARCHITECTURE_STANDARDS.md)
- [前后端分离分析](./FRONTEND_BACKEND_SEPARATION.md)
- [架构实施计划](../IMPLEMENTATION_PLAN.md)

## 总结

通过本次改造:

1. ✅ **职责清晰**: 前端负责格式验证,后端负责业务验证
2. ✅ **代码简化**: 移除了前端的重复业务逻辑
3. ✅ **安全增强**: 所有业务规则在后端验证,无法绕过
4. ✅ **易于维护**: 业务规则集中管理,修改方便
5. ✅ **用户体验**: 前端格式验证提供即时反馈
6. ✅ **可扩展**: 易于添加新的业务规则和配额策略
