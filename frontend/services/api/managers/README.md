# API管理器目录

本目录包含各种API管理器和适配器，负责协调和管理API调用。

## 📁 目录结构

```
frontend/services/api/managers/
├── README.md                           # 本文件
├── backgroundTestManagerAdapter.ts     # 后台测试管理适配器
└── testExecutionManager.ts            # 测试执行管理器（未来扩展）
```

## 🎯 管理器说明

### backgroundTestManagerAdapter.ts

后台测试管理适配器，提供：

- 与现有backgroundTestManager的完全兼容
- 可选的API调用支持
- WebSocket实时更新功能
- 失败时自动回退机制

### 设计原则

1. **兼容性优先**: 保持与现有API的完全兼容
2. **可选增强**: 提供可选的高级功能
3. **故障恢复**: 支持自动回退和错误处理
4. **统一接口**: 提供一致的管理接口

## 🔧 使用方式

```typescript
import { backgroundTestManagerAdapter } from './managers/backgroundTestManagerAdapter';

// 配置适配器
backgroundTestManagerAdapter.configure({
  useTestApiService: true,
  enableWebSocket: true,
  fallbackToOriginal: true,
});

// 使用与原有完全相同的接口
const testId = backgroundTestManagerAdapter.startTest(
  'performance',
  { url: 'https://example.com' },
  onProgress,
  onComplete,
  onError
);
```

## 📋 未来扩展

计划添加的管理器：

- `testExecutionManager.ts` - 统一的测试执行管理
- `testResultManager.ts` - 测试结果管理和缓存
- `testScheduleManager.ts` - 测试调度和队列管理
