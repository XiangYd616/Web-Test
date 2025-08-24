# Test-Web 类型系统迁移指南

本指南帮助开发者将现有代码迁移到新的统一类型系统，确保平滑过渡和最佳实践。

## 📋 迁移概述

### 迁移目标

- ✅ **提升类型安全性** - 消除类型相关错误
- ✅ **统一接口规范** - 确保代码一致性
- ✅ **改善开发体验** - 更好的IDE支持和代码提示
- ✅ **降低维护成本** - 减少重复的类型定义

### 迁移原则

1. **渐进式迁移** - 不破坏现有功能
2. **新功能优先** - 新代码必须使用新类型系统
3. **向后兼容** - 保持API兼容性
4. **充分测试** - 每次迁移后进行测试验证

## 🎯 迁移优先级

### P0 - 立即迁移（新功能）
```
✅ 所有新组件必须使用新类型系统
✅ 所有新Hook必须使用新类型系统
✅ 所有新API集成必须使用新类型系统
```

### P1 - 高优先级（核心功能）
```
⚠️ 核心测试组件 (StressTest, APITest, SEOTest)
⚠️ 主要Hook (useAPITestState, useCompatibilityTestState)
⚠️ API服务层 (testApiService, backgroundTestManager)
```

### P2 - 中优先级（辅助功能）
```
📋 工具组件 (UI组件库)
📋 辅助Hook (useLocalStorage, useWebSocket)
📋 工具函数和服务
```

### P3 - 低优先级（遗留代码）
```
📝 旧的示例代码
📝 不常用的工具函数
📝 临时性代码
```

## 🔄 具体迁移步骤

### 步骤1: 组件迁移

#### 1.1 更新导入语句

```typescript
// 迁移前
import React, { useState } from 'react';

interface MyComponentProps {
  size: 'small' | 'medium' | 'large';
  variant: 'primary' | 'secondary';
  onClick: () => void;
}

// 迁移后
import React, { useState } from 'react';
import type { 
  ComponentSize, 
  ComponentVariant, 
  BaseComponentProps 
} from '../types';

interface MyComponentProps extends BaseComponentProps {
  size: ComponentSize;
  variant: ComponentVariant;
  onClick: () => void;
}
```

#### 1.2 更新组件Props

```typescript
// 迁移前
interface TestComponentProps {
  testType: string;
  config: any;
  onProgress: (progress: number) => void;
  onComplete: (result: any) => void;
}

// 迁移后
import type { 
  TestType, 
  UnifiedTestConfig, 
  ProgressCallback, 
  CompletionCallback 
} from '../types';

interface TestComponentProps {
  testType: TestType;
  config: UnifiedTestConfig;
  onProgress: ProgressCallback;
  onComplete: CompletionCallback;
}
```

#### 1.3 更新状态管理

```typescript
// 迁移前
const [testStatus, setTestStatus] = useState('idle');
const [testResult, setTestResult] = useState(null);

// 迁移后
import type { TestStatus, TestExecution } from '../types';

const [testStatus, setTestStatus] = useState<TestStatus>('idle');
const [testResult, setTestResult] = useState<TestExecution | null>(null);
```

### 步骤2: Hook迁移

#### 2.1 迁移Hook返回类型

```typescript
// 迁移前
export const useAPITest = () => {
  const [config, setConfig] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  
  return {
    config,
    setConfig,
    isRunning,
    startTest: () => {},
    stopTest: () => {}
  };
};

// 迁移后
import type { APITestHook, APITestConfig } from '../types';

export const useAPITest = (): APITestHook => {
  const [config, setConfig] = useState<APITestConfig>({
    endpoints: [],
    authentication: { type: 'none' },
    concurrency: 1,
    timeout: 10000,
    retries: 3
  });
  
  const [isRunning, setIsRunning] = useState(false);
  
  return {
    // 实现所有APITestHook要求的属性和方法
    config,
    status: isRunning ? 'running' : 'idle',
    progress: 0,
    currentStep: '准备就绪',
    result: null,
    error: null,
    isRunning,
    isCompleted: false,
    hasError: false,
    currentEndpoint: null,
    completedEndpoints: 0,
    startTest: async (config) => {
      setConfig(config);
      setIsRunning(true);
      // 实现测试逻辑
    },
    stopTest: () => setIsRunning(false),
    reset: () => {
      setIsRunning(false);
      // 重置其他状态
    },
    clearError: () => {},
    updateConfig: (updates) => setConfig(prev => ({ ...prev, ...updates })),
    addEndpoint: (endpoint) => {},
    removeEndpoint: (id) => {},
    updateEndpoint: (id, updates) => {}
  };
};
```

#### 2.2 更新Hook使用方式

```typescript
// 迁移前
const MyComponent = () => {
  const { config, setConfig, startTest } = useAPITest();
  
  return (
    <div>
      <button onClick={() => startTest()}>开始测试</button>
    </div>
  );
};

// 迁移后
const MyComponent = () => {
  const apiTest = useAPITest(); // 获得完整的类型支持
  
  const handleStartTest = async () => {
    await apiTest.startTest({
      endpoints: [
        {
          id: '1',
          name: '测试端点',
          method: 'GET',
          url: '/api/test',
          expectedStatus: 200,
          enabled: true
        }
      ]
    });
  };
  
  return (
    <div>
      <button onClick={handleStartTest} disabled={apiTest.isRunning}>
        {apiTest.isRunning ? '测试中...' : '开始测试'}
      </button>
      
      {apiTest.result && (
        <div>测试完成，成功率: {apiTest.result.successRate}%</div>
      )}
    </div>
  );
};
```

### 步骤3: API服务迁移

#### 3.1 更新API响应类型

```typescript
// 迁移前
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// 迁移后
import type { ApiResponse, TestExecution } from '../types';

// 使用泛型提供类型安全
const executeTest = async (config: any): Promise<ApiResponse<TestExecution>> => {
  try {
    const response = await fetch('/api/test', {
      method: 'POST',
      body: JSON.stringify(config)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      return {
        success: true,
        data: data as TestExecution,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        error: data.message || '请求失败',
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
};
```

#### 3.2 更新服务接口

```typescript
// 迁移前
class TestApiService {
  async executePerformanceTest(url: string, options: any) {
    // 实现
  }
}

// 迁移后
import type { 
  TestApiClient, 
  PerformanceTestConfig, 
  ApiResponse, 
  TestExecution 
} from '../types';

class TestApiService implements TestApiClient {
  async executeTest(config: UnifiedTestConfig): Promise<ApiResponse<TestExecution>> {
    // 类型安全的实现
  }
  
  async getTestStatus(testId: string, testType: TestType): Promise<ApiResponse<TestExecution>> {
    // 类型安全的实现
  }
  
  async cancelTest(testId: string, testType: TestType): Promise<ApiResponse<void>> {
    // 类型安全的实现
  }
  
  // 实现其他接口方法...
}
```

## 📋 迁移检查清单

### 组件迁移检查

- [ ] 更新所有Props接口使用统一类型
- [ ] 更新状态管理使用类型安全的状态
- [ ] 更新事件处理函数使用正确的回调类型
- [ ] 移除本地重复的类型定义
- [ ] 添加适当的泛型约束
- [ ] 更新导入语句使用type关键字

### Hook迁移检查

- [ ] 实现统一的Hook接口
- [ ] 更新返回类型使用标准Hook类型
- [ ] 确保所有状态都有正确的类型
- [ ] 实现所有必需的方法和属性
- [ ] 添加适当的错误处理
- [ ] 更新Hook的使用方式

### API迁移检查

- [ ] 更新所有API方法使用统一的响应类型
- [ ] 实现标准的API客户端接口
- [ ] 添加适当的错误处理
- [ ] 确保所有请求参数都有正确的类型
- [ ] 更新API调用方式使用类型安全的方法

## 🔧 迁移工具和脚本

### 自动化检查脚本

```bash
#!/bin/bash
# check-migration.sh - 检查迁移进度

echo "🔍 检查类型导入..."
grep -r "import.*from.*types" frontend/components/ | wc -l

echo "🔍 检查本地类型定义..."
grep -r "export interface.*Config" frontend/components/ | wc -l

echo "🔍 检查Hook类型使用..."
grep -r ": .*Hook" frontend/hooks/ | wc -l

echo "✅ 迁移检查完成"
```

### TypeScript编译检查

```bash
# 检查类型错误
npm run type-check

# 检查特定文件
npx tsc --noEmit frontend/components/MyComponent.tsx
```

## 🚨 常见迁移问题

### 问题1: 类型不兼容

```typescript
// 问题：旧类型与新类型不兼容
// 错误: Type 'string' is not assignable to type 'TestType'
const testType: TestType = 'custom-test'; // ❌

// 解决：使用正确的类型值
const testType: TestType = 'performance'; // ✅

// 或者扩展类型定义
type ExtendedTestType = TestType | 'custom-test';
```

### 问题2: 缺少必需属性

```typescript
// 问题：实现接口时缺少必需属性
class MyTestHook implements APITestHook {
  // ❌ 缺少很多必需属性
  config = {};
}

// 解决：实现所有必需属性
class MyTestHook implements APITestHook {
  config: APITestConfig = {
    endpoints: [],
    authentication: { type: 'none' },
    // ... 其他必需属性
  };
  
  status: TestStatus = 'idle';
  progress = 0;
  // ... 实现所有属性和方法
}
```

### 问题3: 泛型使用错误

```typescript
// 问题：泛型约束不正确
interface MyResponse<T> {
  data: T;
}

// 解决：添加适当的约束
interface MyResponse<T = unknown> {
  data: T;
  success: boolean;
}

// 或者使用现有的泛型类型
const response: ApiResponse<TestResult> = await api.call();
```

## 📊 迁移进度跟踪

### 迁移状态

| 模块 | 状态 | 进度 | 负责人 | 完成时间 |
|------|------|------|--------|----------|
| 类型系统 | ✅ 完成 | 100% | 系统 | 已完成 |
| Hook迁移 | 🔄 进行中 | 60% | 开发团队 | 本周 |
| 组件迁移 | 📋 计划中 | 20% | 开发团队 | 下周 |
| API迁移 | 📋 计划中 | 10% | 开发团队 | 下下周 |

### 迁移指标

- **类型覆盖率**: 目标 95%，当前 70%
- **编译错误**: 目标 0个，当前 15个
- **类型安全性**: 目标 100%，当前 80%

## 🎯 迁移后验证

### 功能验证

1. **编译检查** - 确保没有TypeScript错误
2. **功能测试** - 验证所有功能正常工作
3. **类型检查** - 确保类型推断正确
4. **性能测试** - 验证性能没有回退

### 代码质量验证

```bash
# 运行类型检查
npm run type-check

# 运行单元测试
npm run test

# 运行集成测试
npm run test:integration

# 检查代码覆盖率
npm run test:coverage
```

## 📞 获取帮助

### 迁移支持

1. **查看示例代码** - 参考已迁移的组件
2. **阅读类型定义** - 查看类型文件中的注释
3. **使用IDE提示** - 利用TypeScript的智能提示
4. **团队讨论** - 在团队中讨论迁移问题

### 常用资源

- [类型系统使用指南](./type-system-guide.md)
- [TypeScript官方文档](https://www.typescriptlang.org/docs/)
- [React TypeScript指南](https://react-typescript-cheatsheet.netlify.app/)

---

**记住：迁移是一个渐进的过程，不要急于一次性完成所有迁移。保持代码的稳定性和功能的完整性是最重要的！**
