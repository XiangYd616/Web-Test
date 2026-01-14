# Services 层架构说明

## 📁 目录结构

```
services/
├── api/                    # API客户端层
│   ├── client.ts          # 统一HTTP客户端 ⭐
│   ├── interceptors.ts    # 请求/响应拦截器
│   └── index.ts           # 统一导出
│
├── repository/            # 数据访问层
│   ├── testRepository.ts  # 测试API封装
│   ├── userRepository.ts  # 用户API封装
│   ├── authRepository.ts  # 认证API封装
│   └── index.ts           # 统一导出
│
├── business/              # 业务逻辑层
│   ├── testService.ts     # 测试业务逻辑
│   └── index.ts           # 统一导出
│
├── data/                  # 数据处理层 (待迁移)
├── infrastructure/        # 基础设施层 (待迁移)
└── integration/           # 第三方集成层 (待迁移)
```

## 🎯 设计原则

### 1. 分层架构

```
Components/Pages (UI层)
        ↓
   Hooks (状态管理)
        ↓
Business Services (业务逻辑)
        ↓
  Repository (数据访问)
        ↓
  API Client (HTTP请求)
```

### 2. 单一职责

- **API Client**: 仅负责HTTP通信
- **Repository**: 仅负责API调用
- **Business Service**: 封装业务逻辑和验证
- **Hooks**: 封装组件状态管理

## 📖 使用示例

### 1. 在组件中使用Hook (推荐)

```tsx
import useTests from '@/hooks/useTests';

function TestPage() {
  const {
    tests,
    loading,
    error,
    createAndStart,
    deleteTest
  } = useTests({ autoLoad: true });

  const handleCreate = async () => {
    try {
      await createAndStart({
        url: 'https://example.com',
        testType: 'performance'
      });
    } catch (error) {
      console.error('创建失败:', error);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <div>
      <Button onClick={handleCreate}>创建测试</Button>
      <TestList tests={tests} onDelete={deleteTest} />
    </div>
  );
}
```

### 2. 直接使用Service

```typescript
import { testService } from '@/services/business';

// 创建并启动测试
const test = await testService.createAndStart({
  url: 'https://example.com',
  testType: 'performance'
});

// 获取测试列表(自动缓存)
const tests = await testService.getAll({ status: 'completed' });

// 删除测试
await testService.delete('test-id');
```

### 3. 直接使用Repository (不推荐)

```typescript
import { testRepository } from '@/services/repository';

// 仅在Service层调用Repository
const test = await testRepository.getById('test-id');
```

### 4. 使用API Client (不推荐)

```typescript
import { apiClient } from '@/services/api';

// 仅在Repository层调用API Client
const response = await apiClient.get('/test/123');
```

## 🔧 API Client 特性

### 基础用法

```typescript
import { apiClient } from '@/services/api';

// GET请求
const data = await apiClient.get<DataType>('/endpoint', { params: { page: 1 } });

// POST请求
const result = await apiClient.post<ResultType>('/endpoint', { data });

// PUT请求
const updated = await apiClient.put<DataType>('/endpoint/123', { data });

// DELETE请求
await apiClient.delete('/endpoint/123');
```

### 自动功能

✅ **认证Token自动添加**
- 从localStorage/sessionStorage自动获取
- 自动添加到Authorization头

✅ **错误统一处理**
- 401: 自动清除Token并触发事件
- 403: 触发权限不足事件
- 500+: 触发服务器错误事件
- 网络错误: 统一提示

✅ **请求追踪**
- 自动添加Request-ID
- 开发环境自动日志

✅ **响应格式化**
- 自动提取data字段
- 统一错误格式

## 📋 Repository 规范

### 创建Repository

```typescript
// services/repository/exampleRepository.ts
import { apiClient } from '../api/client';

export interface Example {
  id: string;
  name: string;
}

export class ExampleRepository {
  private readonly basePath = '/examples';

  async getAll(params?: any): Promise<Example[]> {
    return apiClient.get<Example[]>(this.basePath, { params });
  }

  async getById(id: string): Promise<Example> {
    return apiClient.get<Example>(`${this.basePath}/${id}`);
  }

  async create(data: Partial<Example>): Promise<Example> {
    return apiClient.post<Example>(this.basePath, data);
  }

  async update(id: string, data: Partial<Example>): Promise<Example> {
    return apiClient.put<Example>(`${this.basePath}/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }
}

export const exampleRepository = new ExampleRepository();
export default exampleRepository;
```

## 📋 Business Service 规范

### 创建Service

```typescript
// services/business/exampleService.ts
import { exampleRepository, Example } from '../repository/exampleRepository';

export class ExampleService {
  /**
   * 获取所有(带缓存)
   */
  async getAll(): Promise<Example[]> {
    // 1. 检查缓存
    // 2. 调用Repository
    // 3. 缓存结果
    return exampleRepository.getAll();
  }

  /**
   * 创建(带验证)
   */
  async create(data: Partial<Example>): Promise<Example> {
    // 1. 验证数据
    this.validate(data);
    
    // 2. 调用Repository
    const result = await exampleRepository.create(data);
    
    // 3. 清除缓存
    // 4. 触发事件
    
    return result;
  }

  private validate(data: Partial<Example>): void {
    if (!data.name) {
      throw new Error('Name is required');
    }
  }
}

export const exampleService = new ExampleService();
export default exampleService;
```

## 🚫 不要做的事

❌ **组件中直接调用API**
```typescript
// ❌ 错误
function Component() {
  useEffect(() => {
    fetch('/api/test').then(r => r.json());
  }, []);
}
```

❌ **绕过Service层**
```typescript
// ❌ 错误
import { testRepository } from '@/services/repository';

function Component() {
  const test = await testRepository.getById('123');
}
```

❌ **在Repository中写业务逻辑**
```typescript
// ❌ 错误
class TestRepository {
  async create(data: any) {
    // 不要在这里做验证
    if (!data.url) throw new Error('URL required');
    return apiClient.post('/test', data);
  }
}
```

## ✅ 应该做的事

✅ **使用Hook封装状态**
```typescript
// ✅ 正确
function Component() {
  const { tests, loading, error } = useTests({ autoLoad: true });
}
```

✅ **Service层处理业务逻辑**
```typescript
// ✅ 正确
class TestService {
  async create(data: TestConfig) {
    this.validate(data);  // 验证
    const test = await testRepository.create(data);
    this.clearCache();    // 缓存管理
    return test;
  }
}
```

✅ **Repository仅负责API调用**
```typescript
// ✅ 正确
class TestRepository {
  async create(data: TestConfig) {
    return apiClient.post<Test>('/test', data);
  }
}
```

## 📚 相关文档

- [完整架构规范](../../docs/ARCHITECTURE_STANDARDS.md)
- [快速入门指南](../../ARCHITECTURE_GUIDE.md)
- [实施计划](../../IMPLEMENTATION_PLAN.md)

## 🔗 快速链接

- Repository列表: `./repository/`
- Business Service列表: `./business/`
- API Client配置: `./api/client.ts`
- Hook示例: `../../hooks/useTests.ts`
