# 项目架构统一规范

## 目标

建立统一的代码架构,解决以下问题:
- API服务多处定义,缺乏统一管理
- 业务逻辑分散在组件中
- 路由管理不规范
- 组件功能重复,缺乏复用

## 核心原则

### 1. 分层架构

```
┌──────────────────────────────────────┐
│         Presentation Layer           │  页面和组件
│  (Pages + Components + Hooks)        │
├──────────────────────────────────────┤
│         Business Layer               │  业务逻辑
│  (Services + State Management)       │
├──────────────────────────────────────┤
│         Data Access Layer            │  数据访问
│  (API Client + Repository)           │
├──────────────────────────────────────┤
│         Infrastructure Layer         │  基础设施
│  (Utils + Config + Types)            │
└──────────────────────────────────────┘
```

### 2. 单一职责

- **Pages**: 仅负责页面布局和路由
- **Components**: 仅负责UI渲染和用户交互
- **Hooks**: 封装可复用的状态逻辑
- **Services**: 封装业务逻辑和数据处理
- **API**: 仅负责HTTP请求

## 前端架构规范

### 目录结构

```
frontend/
├── src/
│   ├── pages/                  # 页面组件
│   │   ├── Dashboard/
│   │   │   ├── index.tsx
│   │   │   └── Dashboard.module.css
│   │   └── ...
│   │
│   ├── components/             # UI组件
│   │   ├── common/            # 通用组件
│   │   │   ├── Button/
│   │   │   ├── Table/
│   │   │   └── Modal/
│   │   ├── business/          # 业务组件
│   │   │   ├── TestCard/
│   │   │   └── ResultPanel/
│   │   └── layout/            # 布局组件
│   │       ├── Header/
│   │       └── Sidebar/
│   │
│   ├── hooks/                 # 自定义Hooks
│   │   ├── useTest.ts
│   │   ├── useAuth.ts
│   │   └── useData.ts
│   │
│   ├── services/              # 业务服务层
│   │   ├── api/              # API客户端(统一)
│   │   │   ├── client.ts     # HTTP客户端
│   │   │   ├── config.ts     # API配置
│   │   │   └── interceptors.ts
│   │   │
│   │   ├── business/         # 业务服务
│   │   │   ├── testService.ts
│   │   │   ├── userService.ts
│   │   │   └── reportService.ts
│   │   │
│   │   └── repository/       # 数据仓库
│   │       ├── testRepository.ts
│   │       └── userRepository.ts
│   │
│   ├── store/                # 状态管理
│   │   ├── slices/
│   │   └── index.ts
│   │
│   ├── types/                # TypeScript类型
│   │   ├── api.types.ts
│   │   ├── models.types.ts
│   │   └── common.types.ts
│   │
│   ├── utils/                # 工具函数
│   │   ├── format.ts
│   │   ├── validate.ts
│   │   └── logger.ts
│   │
│   └── config/               # 配置文件
│       ├── constants.ts
│       └── env.ts
```

### API层统一规范

#### 1. 唯一API客户端

**文件: `services/api/client.ts`**

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_CONFIG } from './config';
import { setupInterceptors } from './interceptors';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: API_CONFIG.headers
    });

    setupInterceptors(this.instance);
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

#### 2. Repository模式

**文件: `services/repository/testRepository.ts`**

```typescript
import { apiClient } from '../api/client';
import { Test, TestResult, CreateTestDto } from '@/types/models.types';

export class TestRepository {
  private readonly basePath = '/test';

  async getAll(): Promise<Test[]> {
    return apiClient.get<Test[]>(this.basePath);
  }

  async getById(id: string): Promise<Test> {
    return apiClient.get<Test>(`${this.basePath}/${id}`);
  }

  async create(data: CreateTestDto): Promise<Test> {
    return apiClient.post<Test>(this.basePath, data);
  }

  async update(id: string, data: Partial<Test>): Promise<Test> {
    return apiClient.put<Test>(`${this.basePath}/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }

  async getResults(testId: string): Promise<TestResult> {
    return apiClient.get<TestResult>(`${this.basePath}/${testId}/results`);
  }
}

export const testRepository = new TestRepository();
```

#### 3. 业务服务层

**文件: `services/business/testService.ts`**

```typescript
import { testRepository } from '../repository/testRepository';
import { Test, TestResult, CreateTestDto } from '@/types/models.types';

export class TestService {
  /**
   * 创建并启动测试
   */
  async createAndStartTest(data: CreateTestDto): Promise<Test> {
    // 1. 验证数据
    this.validateTestData(data);

    // 2. 创建测试
    const test = await testRepository.create(data);

    // 3. 启动测试
    await this.startTest(test.id);

    return test;
  }

  /**
   * 获取测试结果(带缓存)
   */
  async getTestResults(testId: string): Promise<TestResult> {
    // 1. 检查缓存
    const cached = this.getCachedResult(testId);
    if (cached) return cached;

    // 2. 从服务器获取
    const result = await testRepository.getResults(testId);

    // 3. 缓存结果
    this.cacheResult(testId, result);

    return result;
  }

  /**
   * 批量删除测试
   */
  async deleteMultiple(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => testRepository.delete(id)));
  }

  private validateTestData(data: CreateTestDto): void {
    if (!data.url) throw new Error('URL is required');
    // 更多验证逻辑...
  }

  private async startTest(testId: string): Promise<void> {
    // 启动测试逻辑
  }

  private getCachedResult(testId: string): TestResult | null {
    // 缓存逻辑
    return null;
  }

  private cacheResult(testId: string, result: TestResult): void {
    // 缓存逻辑
  }
}

export const testService = new TestService();
```

### 组件使用规范

#### ❌ 错误示例 - 组件直接调用API

```typescript
// ❌ 不要这样做
function TestPage() {
  const [tests, setTests] = useState([]);

  useEffect(() => {
    // 直接在组件中调用API
    fetch('/api/test')
      .then(res => res.json())
      .then(data => setTests(data));
  }, []);

  const handleCreate = async (data) => {
    // 业务逻辑写在组件中
    if (!data.url) {
      alert('URL is required');
      return;
    }
    await fetch('/api/test', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  };

  return <div>{/* UI */}</div>;
}
```

#### ✅ 正确示例 - 使用Service和Hook

```typescript
// ✅ 正确做法
// 1. 创建自定义Hook
function useTests() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadTests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await testService.getAll();
      setTests(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTest = useCallback(async (data: CreateTestDto) => {
    try {
      const test = await testService.createAndStartTest(data);
      setTests(prev => [...prev, test]);
      return test;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return { tests, loading, error, loadTests, createTest };
}

// 2. 组件只负责UI
function TestPage() {
  const { tests, loading, error, loadTests, createTest } = useTests();

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  if (loading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      <TestList tests={tests} />
      <CreateTestForm onSubmit={createTest} />
    </div>
  );
}
```

## 后端架构规范

### 目录结构

```
backend/
├── src/
│   ├── api/                   # API层
│   │   ├── controllers/      # 控制器
│   │   │   ├── testController.js
│   │   │   └── userController.js
│   │   │
│   │   ├── routes/           # 路由定义
│   │   │   ├── index.js      # 路由聚合
│   │   │   ├── test.routes.js
│   │   │   └── user.routes.js
│   │   │
│   │   └── middleware/       # 中间件
│   │       ├── auth.js
│   │       ├── validate.js
│   │       └── errorHandler.js
│   │
│   ├── services/             # 业务服务层
│   │   ├── testService.js
│   │   ├── userService.js
│   │   └── reportService.js
│   │
│   ├── repositories/         # 数据访问层
│   │   ├── testRepository.js
│   │   └── userRepository.js
│   │
│   ├── models/               # 数据模型
│   │   ├── Test.js
│   │   └── User.js
│   │
│   ├── utils/                # 工具函数
│   │   ├── logger.js
│   │   └── validator.js
│   │
│   └── config/               # 配置文件
│       ├── database.js
│       └── constants.js
```

### API路由统一规范

#### 1. RESTful API设计

```javascript
// routes/test.routes.js
const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { auth, validate } = require('../middleware');
const { testSchemas } = require('../validators');

// 资源列表
router.get('/', auth, testController.getAll);

// 单个资源
router.get('/:id', auth, testController.getById);

// 创建资源
router.post('/', 
  auth, 
  validate(testSchemas.create), 
  testController.create
);

// 更新资源
router.put('/:id', 
  auth, 
  validate(testSchemas.update), 
  testController.update
);

// 删除资源
router.delete('/:id', auth, testController.delete);

// 子资源
router.get('/:id/results', auth, testController.getResults);
router.post('/:id/start', auth, testController.start);
router.post('/:id/stop', auth, testController.stop);

module.exports = router;
```

#### 2. 控制器层

```javascript
// controllers/testController.js
const testService = require('../services/testService');
const { ApiResponse } = require('../utils/response');

class TestController {
  /**
   * 获取所有测试
   */
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const result = await testService.getAll({
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });
      
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 获取单个测试
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const test = await testService.getById(id);
      
      return ApiResponse.success(res, test);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 创建测试
   */
  async create(req, res, next) {
    try {
      const test = await testService.create(req.body);
      
      return ApiResponse.created(res, test);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TestController();
```

#### 3. 服务层

```javascript
// services/testService.js
const testRepository = require('../repositories/testRepository');
const { ValidationError, NotFoundError } = require('../utils/errors');

class TestService {
  /**
   * 获取所有测试
   */
  async getAll(options) {
    const { page, limit, status } = options;
    
    // 业务逻辑
    const filters = {};
    if (status) filters.status = status;
    
    const tests = await testRepository.findAll(filters, {
      page,
      limit,
      sort: { createdAt: -1 }
    });
    
    return tests;
  }

  /**
   * 创建并启动测试
   */
  async create(data) {
    // 1. 验证
    this.validate(data);
    
    // 2. 创建测试
    const test = await testRepository.create(data);
    
    // 3. 触发异步任务
    await this.startTestAsync(test.id);
    
    return test;
  }

  /**
   * 业务逻辑验证
   */
  validate(data) {
    if (!this.isValidUrl(data.url)) {
      throw new ValidationError('Invalid URL format');
    }
    
    if (data.concurrent && data.concurrent > 1000) {
      throw new ValidationError('Concurrent limit exceeded');
    }
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new TestService();
```

## API命名规范

### RESTful资源命名

```
GET    /api/tests              # 获取测试列表
GET    /api/tests/:id          # 获取单个测试
POST   /api/tests              # 创建测试
PUT    /api/tests/:id          # 更新测试
DELETE /api/tests/:id          # 删除测试

GET    /api/tests/:id/results  # 获取测试结果
POST   /api/tests/:id/start    # 启动测试
POST   /api/tests/:id/stop     # 停止测试

GET    /api/users              # 获取用户列表
GET    /api/users/:id          # 获取单个用户
POST   /api/users              # 创建用户
PUT    /api/users/:id          # 更新用户
DELETE /api/users/:id          # 删除用户
```

### 动作型API命名

```
POST   /api/auth/login         # 登录
POST   /api/auth/logout        # 登出
POST   /api/auth/refresh       # 刷新Token

POST   /api/reports/generate   # 生成报告
POST   /api/reports/export     # 导出报告

POST   /api/batch/tests        # 批量创建测试
DELETE /api/batch/tests        # 批量删除测试
```

## 统一响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Test"
  },
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 分页响应

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "field": "url",
      "reason": "URL format is invalid"
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 迁移指南

### 步骤1: 创建统一API客户端

1. 创建 `services/api/client.ts`
2. 配置拦截器
3. 设置认证和错误处理

### 步骤2: 实现Repository层

1. 为每个资源创建Repository
2. 封装所有API调用
3. 统一错误处理

### 步骤3: 实现Service层

1. 将业务逻辑从组件移到Service
2. 实现数据验证和转换
3. 添加缓存和优化

### 步骤4: 创建自定义Hooks

1. 封装状态管理逻辑
2. 提供统一的接口
3. 处理加载和错误状态

### 步骤5: 重构组件

1. 移除组件中的业务逻辑
2. 使用自定义Hooks
3. 专注于UI渲染

## 检查清单

### API层
- [ ] 只有一个API客户端
- [ ] 所有请求通过客户端
- [ ] 统一的错误处理
- [ ] 统一的认证处理

### 业务层
- [ ] Service包含所有业务逻辑
- [ ] Repository负责数据访问
- [ ] 组件不直接调用API
- [ ] 使用自定义Hooks

### 代码质量
- [ ] TypeScript类型完整
- [ ] 单元测试覆盖
- [ ] 代码注释清晰
- [ ] 遵循命名规范

## 相关文档

- [TypeScript规范](./TYPESCRIPT_STANDARDS.md)
- [测试规范](./TESTING_STANDARDS.md)
- [性能优化指南](./PERFORMANCE_GUIDE.md)
