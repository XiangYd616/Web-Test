# Test-Web 类型系统使用指南

本指南介绍如何在Test-Web项目中使用新的统一类型系统，提供类型安全的开发体验。

## 📋 目录

- [概述](#概述)
- [类型系统架构](#类型系统架构)
- [基础使用](#基础使用)
- [组件开发](#组件开发)
- [Hook开发](#hook开发)
- [API集成](#api集成)
- [最佳实践](#最佳实践)
- [迁移指南](#迁移指南)

## 🎯 概述

Test-Web项目采用了统一的TypeScript类型系统，提供：

- **180+个类型定义** - 覆盖项目所有领域
- **完整的类型安全** - 编译时错误检查
- **智能代码提示** - 提升开发效率
- **统一的接口规范** - 确保代码一致性

### 类型系统特色

```typescript
// ✅ 统一的API响应类型
const response: ApiResponse<TestResult> = await api.executeTest(config);

// ✅ 类型安全的组件Props
const MyComponent: React.FC<ButtonProps> = ({ variant, size, onClick }) => {
  // TypeScript会自动推断所有属性类型
};

// ✅ 完整的Hook类型支持
const testState: APITestHook = useAPITestState();
```

## 🏗️ 类型系统架构

### 目录结构

```
frontend/types/
├── api/                    # API相关类型
│   └── client.types.ts     # API客户端、请求、响应类型
├── components/             # 组件相关类型
│   └── ui.types.ts        # UI组件Props和状态类型
├── hooks/                 # Hook相关类型
│   └── testState.types.ts # 测试状态管理Hook类型
├── common/                # 通用基础类型
│   └── base.types.ts      # 基础数据类型和工具类型
└── index.ts              # 统一导出入口
```

### 类型分层

```
┌─────────────────┐
│   应用层类型     │  ← 具体业务逻辑类型
├─────────────────┤
│   组件层类型     │  ← UI组件和Hook类型
├─────────────────┤
│   服务层类型     │  ← API和服务类型
├─────────────────┤
│   基础层类型     │  ← 通用工具和基础类型
└─────────────────┘
```

## 🚀 基础使用

### 导入类型

```typescript
// 方式1: 从统一入口导入（推荐）
import type { 
  ApiResponse, 
  TestConfig, 
  ComponentProps 
} from '../types';

// 方式2: 从具体文件导入
import type { APITestHook } from '../types/hooks/testState.types';

// 方式3: 导入类型别名
import type { TestStatus, ProgressCallback } from '../types';
```

### 基础类型使用

```typescript
// API响应处理
const handleApiResponse = (response: ApiResponse<TestResult>) => {
  if (response.success) {
    // TypeScript知道这里有data属性
    console.log('测试结果:', response.data);
  } else {
    // TypeScript知道这里有error属性
    console.error('测试失败:', response.error);
  }
};

// 测试配置
const createTestConfig = (url: string, type: TestType): UnifiedTestConfig => {
  return {
    url,
    testType: type,
    timeout: 30000,
    retries: 3,
    // TypeScript会根据testType提供相应的配置选项
  };
};
```

## 🧩 组件开发

### 使用统一的组件Props

```typescript
import type { 
  BaseComponentProps, 
  ComponentSize, 
  ComponentColor,
  ButtonProps 
} from '../types';

// 扩展基础Props
interface CustomButtonProps extends BaseComponentProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: ComponentSize;
  loading?: boolean;
  onClick: () => void;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  variant,
  size = 'md',
  loading = false,
  onClick,
  className = '',
  children,
  ...props
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      onClick={onClick}
      disabled={loading}
      {...props}
    >
      {loading ? '加载中...' : children}
    </button>
  );
};
```

### 测试组件示例

```typescript
import type { 
  TestType, 
  TestStatus, 
  UnifiedTestConfig,
  ProgressCallback 
} from '../types';

interface TestRunnerProps {
  testType: TestType;
  onProgress?: ProgressCallback;
  onComplete?: (result: any) => void;
}

const TestRunner: React.FC<TestRunnerProps> = ({
  testType,
  onProgress,
  onComplete
}) => {
  const [status, setStatus] = useState<TestStatus>('idle');
  const [config, setConfig] = useState<Partial<UnifiedTestConfig>>({
    testType,
    url: '',
    timeout: 30000
  });

  // TypeScript确保所有回调都是类型安全的
  const handleProgress: ProgressCallback = (progress, step, metrics) => {
    onProgress?.(progress, step, metrics);
  };

  return (
    <div>
      {/* 组件实现 */}
    </div>
  );
};
```

## 🎣 Hook开发

### 使用统一的Hook类型

```typescript
import type { 
  APITestHook, 
  APITestConfig, 
  APITestState, 
  APITestActions 
} from '../types';

// 实现类型安全的Hook
export const useAPITest = (): APITestHook => {
  const [state, setState] = useState<APITestState>({
    config: {
      endpoints: [],
      authentication: { type: 'none' },
      concurrency: 1,
      timeout: 10000,
      retries: 3
    },
    status: 'idle',
    progress: 0,
    currentStep: '准备就绪',
    result: null,
    error: null,
    isRunning: false,
    isCompleted: false,
    hasError: false,
    currentEndpoint: null,
    completedEndpoints: 0
  });

  // 类型安全的操作方法
  const startTest: APITestActions['startTest'] = async (config) => {
    setState(prev => ({ ...prev, status: 'running', isRunning: true }));
    // 实现测试逻辑
  };

  const updateConfig: APITestActions['updateConfig'] = (config) => {
    setState(prev => ({ 
      ...prev, 
      config: { ...prev.config, ...config } 
    }));
  };

  return {
    ...state,
    startTest,
    updateConfig,
    stopTest: () => setState(prev => ({ ...prev, status: 'cancelled' })),
    reset: () => setState(prev => ({ ...prev, status: 'idle' })),
    clearError: () => setState(prev => ({ ...prev, error: null })),
    addEndpoint: (endpoint) => {
      setState(prev => ({
        ...prev,
        config: {
          ...prev.config,
          endpoints: [...prev.config.endpoints, { ...endpoint, id: Date.now().toString() }]
        }
      }));
    },
    removeEndpoint: (endpointId) => {
      setState(prev => ({
        ...prev,
        config: {
          ...prev.config,
          endpoints: prev.config.endpoints.filter(ep => ep.id !== endpointId)
        }
      }));
    },
    updateEndpoint: (endpointId, endpoint) => {
      setState(prev => ({
        ...prev,
        config: {
          ...prev.config,
          endpoints: prev.config.endpoints.map(ep => 
            ep.id === endpointId ? { ...ep, ...endpoint } : ep
          )
        }
      }));
    }
  };
};
```

### Hook使用示例

```typescript
const MyTestComponent: React.FC = () => {
  // 获得完整的类型支持
  const apiTest = useAPITest();

  const handleStartTest = async () => {
    await apiTest.startTest({
      endpoints: [
        {
          id: '1',
          name: '用户API',
          method: 'GET',
          url: '/api/users',
          expectedStatus: 200,
          enabled: true
        }
      ],
      authentication: {
        type: 'bearer',
        bearerToken: 'your-token'
      }
    });
  };

  return (
    <div>
      <button onClick={handleStartTest} disabled={apiTest.isRunning}>
        {apiTest.isRunning ? '测试中...' : '开始测试'}
      </button>
      
      {apiTest.result && (
        <div>
          <h3>测试结果</h3>
          <p>成功率: {apiTest.result.successRate}%</p>
          <p>平均响应时间: {apiTest.result.averageResponseTime}ms</p>
        </div>
      )}
    </div>
  );
};
```

## 🌐 API集成

### 类型安全的API调用

```typescript
import type { 
  ApiResponse, 
  TestExecution, 
  UnifiedTestConfig 
} from '../types';

class TestApiClient {
  async executeTest(config: UnifiedTestConfig): Promise<ApiResponse<TestExecution>> {
    try {
      const response = await fetch('/api/test/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      // 类型安全的响应处理
      if (response.ok) {
        return {
          success: true,
          data: data as TestExecution,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: data.message || '测试执行失败',
          errorCode: data.code,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络错误',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getTestStatus(testId: string): Promise<ApiResponse<TestExecution>> {
    // 实现获取测试状态的逻辑
    // TypeScript确保返回类型正确
  }
}
```

## 📚 最佳实践

### 1. 类型导入规范

```typescript
// ✅ 推荐：使用type关键字导入类型
import type { ApiResponse, TestConfig } from '../types';
import { someFunction } from '../utils';

// ❌ 避免：混合导入类型和值
import { ApiResponse, TestConfig, someFunction } from '../mixed';
```

### 2. 泛型使用

```typescript
// ✅ 推荐：合理使用泛型
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T>;
  save(entity: T): Promise<T>;
}

// ✅ 推荐：提供默认泛型参数
interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
}
```

### 3. 类型扩展

```typescript
// ✅ 推荐：扩展基础类型
interface CustomTestConfig extends BaseTestConfig {
  customOption: string;
}

// ✅ 推荐：使用工具类型
type PartialTestConfig = Partial<TestConfig>;
type RequiredTestConfig = Required<TestConfig>;
```

### 4. 错误处理

```typescript
// ✅ 推荐：类型安全的错误处理
const handleApiCall = async (): Promise<void> => {
  try {
    const response: ApiResponse<TestResult> = await api.executeTest(config);
    
    if (response.success) {
      // TypeScript知道这里有data属性
      processResult(response.data);
    } else {
      // TypeScript知道这里有error属性
      showError(response.error);
    }
  } catch (error) {
    // 类型安全的错误处理
    const message = error instanceof Error ? error.message : '未知错误';
    showError(message);
  }
};
```

## 🔄 迁移指南

### 从旧代码迁移

#### 步骤1: 更新导入

```typescript
// 旧代码
import { TestConfig } from './local-types';

// 新代码
import type { UnifiedTestConfig } from '../types';
```

#### 步骤2: 更新类型定义

```typescript
// 旧代码
interface MyComponentProps {
  size: 'small' | 'medium' | 'large';
  color: string;
}

// 新代码
import type { ComponentSize, ComponentColor } from '../types';

interface MyComponentProps {
  size: ComponentSize;
  color: ComponentColor;
}
```

#### 步骤3: 更新Hook使用

```typescript
// 旧代码
const [testState, setTestState] = useState({
  status: 'idle',
  result: null
});

// 新代码
import type { APITestHook } from '../types';

const testState: APITestHook = useAPITestState();
```

### 渐进式迁移策略

1. **新功能优先** - 所有新功能使用新类型系统
2. **逐步替换** - 在维护现有功能时逐步迁移
3. **保持兼容** - 确保迁移过程不破坏现有功能
4. **测试验证** - 每次迁移后进行充分测试

## 🔧 开发工具配置

### VSCode设置

```json
{
  "typescript.preferences.strictFunctionTypes": true,
  "typescript.preferences.strictNullChecks": true,
  "typescript.suggest.autoImports": true,
  "typescript.suggest.includeCompletionsForModuleExports": true
}
```

### TypeScript配置

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noImplicitThis": true
  }
}
```

## 📞 支持和帮助

### 常见问题

**Q: 如何处理类型错误？**
A: 检查导入路径和类型定义，确保使用正确的类型。

**Q: 如何扩展现有类型？**
A: 使用接口继承或交叉类型来扩展现有类型。

**Q: 如何处理复杂的泛型？**
A: 从简单的泛型开始，逐步增加复杂度，并添加适当的约束。

### 获取帮助

1. 查看类型定义文件中的JSDoc注释
2. 使用IDE的类型提示功能
3. 参考项目中的示例代码
4. 查阅TypeScript官方文档

---

**记住：类型系统是为了提高开发效率和代码质量，而不是增加负担。合理使用类型系统，让TypeScript成为你的开发助手！**
