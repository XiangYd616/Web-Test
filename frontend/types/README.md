# TypeScript类型定义目录

本目录统一管理Test-Web项目的所有TypeScript类型定义，提供类型安全和代码提示支持。

## 📁 目录结构

```
frontend/types/
├── README.md                    # 本文件
├── api/                        # API相关类型
│   ├── client.types.ts         # API客户端类型
│   ├── response.types.ts       # API响应类型
│   └── test.types.ts           # 测试API类型
├── components/                 # 组件相关类型
│   ├── ui.types.ts            # UI组件类型
│   ├── testing.types.ts       # 测试组件类型
│   └── common.types.ts        # 通用组件类型
├── hooks/                     # Hook相关类型
│   ├── testState.types.ts     # 测试状态Hook类型
│   └── common.types.ts        # 通用Hook类型
├── services/                  # 服务相关类型
│   ├── manager.types.ts       # 管理器类型
│   └── adapter.types.ts       # 适配器类型
└── common/                    # 通用类型
    ├── base.types.ts          # 基础类型
    ├── utility.types.ts       # 工具类型
    └── index.ts               # 统一导出
```

## 🎯 设计原则

### 1. 类型组织原则
- **按功能分类**: 根据功能领域组织类型定义
- **避免循环依赖**: 合理设计类型依赖关系
- **统一命名**: 使用一致的类型命名规范
- **文档完整**: 为复杂类型提供详细注释

### 2. 命名规范
- **接口**: 使用PascalCase，如 `ApiResponse`
- **类型别名**: 使用PascalCase，如 `TestStatus`
- **泛型参数**: 使用单个大写字母，如 `T`, `K`, `V`
- **文件名**: 使用camelCase.types.ts格式

### 3. 导出策略
- **具名导出**: 优先使用具名导出
- **统一入口**: 通过index.ts提供统一导出
- **避免默认导出**: 减少默认导出的使用

## 🔧 使用方式

### 导入类型
```typescript
// 从具体文件导入
import { ApiResponse, TestConfig } from '../types/api/client.types';

// 从统一入口导入
import { ApiResponse, TestConfig, UIComponentProps } from '../types';

// 导入类型别名
import type { TestStatus, ProgressCallback } from '../types/common';
```

### 扩展类型
```typescript
// 扩展基础接口
interface CustomTestConfig extends BaseTestConfig {
  customOption: string;
}

// 使用泛型
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
```

## 📋 类型分类说明

### API类型 (`api/`)
- **client.types.ts**: API客户端配置、请求参数等
- **response.types.ts**: API响应格式、错误类型等
- **test.types.ts**: 测试相关的API类型

### 组件类型 (`components/`)
- **ui.types.ts**: 基础UI组件的Props和State类型
- **testing.types.ts**: 测试相关组件的类型
- **common.types.ts**: 组件间共享的通用类型

### Hook类型 (`hooks/`)
- **testState.types.ts**: 测试状态管理Hook的类型
- **common.types.ts**: Hook间共享的通用类型

### 服务类型 (`services/`)
- **manager.types.ts**: 各种管理器的类型定义
- **adapter.types.ts**: 适配器相关的类型定义

### 通用类型 (`common/`)
- **base.types.ts**: 项目基础类型定义
- **utility.types.ts**: TypeScript工具类型
- **index.ts**: 统一导出入口

## 🚀 最佳实践

### 1. 类型定义
```typescript
// ✅ 好的类型定义
interface TestConfig {
  /** 测试目标URL */
  url: string;
  /** 测试类型 */
  testType: 'performance' | 'security' | 'api';
  /** 超时时间（毫秒） */
  timeout?: number;
}

// ❌ 避免的定义
interface BadConfig {
  url: any; // 类型太宽泛
  type: string; // 应该使用联合类型
}
```

### 2. 泛型使用
```typescript
// ✅ 合理的泛型约束
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T>;
  save(entity: T): Promise<T>;
}

// ✅ 默认泛型参数
interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
}
```

### 3. 工具类型
```typescript
// ✅ 使用TypeScript内置工具类型
type PartialTestConfig = Partial<TestConfig>;
type RequiredTestConfig = Required<TestConfig>;
type TestConfigKeys = keyof TestConfig;

// ✅ 自定义工具类型
type NonNullable<T> = T extends null | undefined ? never : T;
```

## 📞 维护指南

### 添加新类型
1. 确定类型所属的功能领域
2. 选择合适的文件或创建新文件
3. 添加详细的JSDoc注释
4. 更新相关的index.ts导出
5. 更新本README文档

### 修改现有类型
1. 评估修改的影响范围
2. 考虑向后兼容性
3. 更新相关文档和注释
4. 通知使用该类型的开发者

### 删除类型
1. 确认没有地方在使用
2. 使用TypeScript编译器检查
3. 从导出文件中移除
4. 更新相关文档

记住：**类型定义是代码的文档，应该清晰、准确、易于理解**！
