# Test-Web 开发者快速上手指南

欢迎加入Test-Web项目！本指南将帮助你快速了解项目结构、开发规范和最佳实践。

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **TypeScript**: >= 5.0.0
- **IDE**: 推荐使用VSCode

### 安装和启动

```bash
# 克隆项目
git clone <repository-url>
cd Test-Web

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 在浏览器中打开 http://localhost:3000
```

## 📁 项目结构

```
Test-Web/
├── frontend/                    # 前端代码
│   ├── components/             # React组件
│   │   ├── ui/                # 基础UI组件
│   │   ├── testing/           # 测试相关组件
│   │   └── layout/            # 布局组件
│   ├── hooks/                 # 自定义Hook
│   ├── services/              # 服务层
│   │   ├── api/               # API服务
│   │   │   └── managers/      # API管理器
│   │   └── utils/             # 工具函数
│   ├── types/                 # 类型定义 ⭐ 新增
│   │   ├── api/               # API相关类型
│   │   ├── components/        # 组件相关类型
│   │   ├── hooks/             # Hook相关类型
│   │   ├── common/            # 通用类型
│   │   └── index.ts           # 统一导出
│   ├── pages/                 # 页面组件
│   └── styles/                # 样式文件
├── docs/                      # 项目文档
│   ├── development/           # 开发文档
│   └── examples/              # 示例代码
└── README.md                  # 项目说明
```

## 🎯 核心概念

### 1. 统一类型系统 ⭐

Test-Web使用统一的TypeScript类型系统，提供完整的类型安全：

```typescript
// 导入统一类型
import type { 
  TestType, 
  TestStatus, 
  UnifiedTestConfig,
  ApiResponse,
  ComponentProps 
} from '../types';

// 类型安全的组件
const MyComponent: React.FC<ComponentProps> = ({ size, color }) => {
  // TypeScript提供完整的类型提示
};

// 类型安全的API调用
const response: ApiResponse<TestResult> = await api.executeTest(config);
```

### 2. 测试类型

项目支持9种测试类型：

- `performance` - 性能测试
- `security` - 安全测试
- `api` - API测试
- `compatibility` - 兼容性测试
- `ux` - 用户体验测试
- `seo` - SEO测试
- `network` - 网络测试
- `database` - 数据库测试
- `website` - 网站综合测试

### 3. 组件架构

```typescript
// 基础组件Props
interface MyComponentProps extends BaseComponentProps {
  variant: ComponentVariant;
  size: ComponentSize;
  onAction: () => void;
}

// 测试组件Props
interface TestComponentProps {
  testType: TestType;
  config: UnifiedTestConfig;
  onProgress: ProgressCallback;
  onComplete: CompletionCallback;
}
```

## 🛠️ 开发规范

### 1. 文件命名

```
组件文件: PascalCase.tsx     (如: StressTest.tsx)
Hook文件: camelCase.ts       (如: useAPITestState.ts)
类型文件: camelCase.types.ts (如: api.types.ts)
工具文件: camelCase.ts       (如: apiClient.ts)
文档文件: kebab-case.md      (如: quick-start.md)
```

### 2. 导入规范

```typescript
// ✅ 推荐：使用type关键字导入类型
import type { ApiResponse, TestConfig } from '../types';
import { someFunction } from '../utils';

// ✅ 推荐：从统一入口导入类型
import type { TestType, ComponentProps } from '../types';

// ❌ 避免：混合导入类型和值
import { ApiResponse, TestConfig, someFunction } from '../mixed';
```

### 3. 组件开发

```typescript
import React from 'react';
import type { BaseComponentProps, ComponentSize } from '../types';

interface MyComponentProps extends BaseComponentProps {
  title: string;
  size?: ComponentSize;
  onAction?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  title,
  size = 'md',
  onAction,
  className = '',
  'data-testid': testId = 'my-component',
  ...props
}) => {
  return (
    <div 
      className={`my-component ${className}`}
      data-testid={testId}
      {...props}
    >
      <h2>{title}</h2>
      {onAction && (
        <button onClick={onAction}>执行操作</button>
      )}
    </div>
  );
};

export default MyComponent;
```

### 4. Hook开发

```typescript
import { useState, useCallback } from 'react';
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

  const startTest = useCallback(async (testConfig: APITestConfig) => {
    setConfig(testConfig);
    setIsRunning(true);
    // 实现测试逻辑
  }, []);

  return {
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
    startTest,
    stopTest: () => setIsRunning(false),
    reset: () => setIsRunning(false),
    clearError: () => {},
    updateConfig: (updates) => setConfig(prev => ({ ...prev, ...updates })),
    addEndpoint: () => {},
    removeEndpoint: () => {},
    updateEndpoint: () => {}
  };
};
```

## 📚 常用模式

### 1. API调用模式

```typescript
import type { ApiResponse, TestExecution } from '../types';

const executeTest = async (config: UnifiedTestConfig): Promise<TestExecution | null> => {
  try {
    const response: ApiResponse<TestExecution> = await api.executeTest(config);
    
    if (response.success) {
      return response.data;
    } else {
      console.error('测试失败:', response.error);
      return null;
    }
  } catch (error) {
    console.error('网络错误:', error);
    return null;
  }
};
```

### 2. 状态管理模式

```typescript
import type { TestStatus, TestExecution } from '../types';

const [testState, setTestState] = useState<{
  status: TestStatus;
  progress: number;
  result: TestExecution | null;
  error: string | null;
}>({
  status: 'idle',
  progress: 0,
  result: null,
  error: null
});

// 类型安全的状态更新
const updateTestStatus = (status: TestStatus) => {
  setTestState(prev => ({ ...prev, status }));
};
```

### 3. 事件处理模式

```typescript
import type { ProgressCallback, CompletionCallback } from '../types';

const handleProgress: ProgressCallback = (progress, step, metrics) => {
  console.log(`进度: ${progress}% - ${step}`);
  if (metrics) {
    console.log('指标:', metrics);
  }
};

const handleComplete: CompletionCallback = (result) => {
  console.log('测试完成:', result);
  // 处理结果
};
```

## 🔧 开发工具

### VSCode配置

创建 `.vscode/settings.json`:

```json
{
  "typescript.preferences.strictFunctionTypes": true,
  "typescript.preferences.strictNullChecks": true,
  "typescript.suggest.autoImports": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "editor.formatOnSave": true
}
```

### 推荐扩展

- **TypeScript Importer** - 自动导入类型
- **Auto Rename Tag** - 自动重命名标签
- **Bracket Pair Colorizer** - 括号配对着色
- **ES7+ React/Redux/React-Native snippets** - React代码片段

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行特定测试
npm run test -- MyComponent.test.tsx

# 运行测试并生成覆盖率报告
npm run test:coverage

# 类型检查
npm run type-check
```

### 测试示例

```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('应该正确渲染', () => {
    render(<MyComponent title="测试标题" />);
    
    expect(screen.getByText('测试标题')).toBeInTheDocument();
    expect(screen.getByTestId('my-component')).toBeInTheDocument();
  });

  it('应该处理点击事件', () => {
    const handleAction = jest.fn();
    render(<MyComponent title="测试" onAction={handleAction} />);
    
    screen.getByRole('button').click();
    expect(handleAction).toHaveBeenCalled();
  });
});
```

## 📋 开发检查清单

### 新功能开发

- [ ] 使用统一的类型系统
- [ ] 遵循文件命名规范
- [ ] 添加适当的TypeScript类型
- [ ] 编写单元测试
- [ ] 添加必要的文档
- [ ] 运行类型检查和测试

### 代码提交前

- [ ] 运行 `npm run type-check`
- [ ] 运行 `npm run test`
- [ ] 运行 `npm run lint`
- [ ] 检查代码格式化
- [ ] 确保没有console.log等调试代码

## 📞 获取帮助

### 文档资源

- [类型系统使用指南](./type-system-guide.md)
- [迁移指南](./migration-guide.md)
- [API文档](../api/README.md)
- [组件文档](../components/README.md)

### 常见问题

**Q: 如何添加新的测试类型？**
A: 在 `types/api/client.types.ts` 中扩展 `TestType` 类型，并添加相应的配置接口。

**Q: 如何创建新的UI组件？**
A: 继承 `BaseComponentProps`，使用统一的 `ComponentSize` 和 `ComponentColor` 类型。

**Q: 如何处理API错误？**
A: 使用 `ApiResponse<T>` 类型，通过 `success` 字段判断请求结果。

### 团队协作

- 遵循代码审查流程
- 使用统一的提交信息格式
- 及时更新文档
- 分享最佳实践

---

**欢迎加入Test-Web开发团队！如有任何问题，请随时在团队中提出讨论。**
