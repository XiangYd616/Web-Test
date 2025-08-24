# 统一API调用模式使用指南

本指南说明如何使用新的统一API调用层，同时**保持与现有接口的完全兼容性**。

## 🎯 设计原则

- **完全兼容**: 现有代码无需修改即可继续工作
- **可选升级**: 页面可以选择性使用新的API客户端
- **统一模式**: 提供一致的API调用体验
- **增强功能**: 支持WebSocket、重试、缓存等高级功能

## 📦 API层架构

### 1. UnifiedTestApiClient - 统一API客户端

核心的统一API客户端，提供标准化的测试API调用。

```typescript
import { unifiedTestApiClient } from '../services/api/UnifiedTestApiClient';

// 执行测试
const response = await unifiedTestApiClient.executeTest({
  url: 'https://example.com',
  testType: 'performance',
  timeout: 30000,
  device: 'desktop'
});

// 实时测试（支持WebSocket）
const testId = await unifiedTestApiClient.startRealtimeTest(
  {
    url: 'https://example.com',
    testType: 'performance'
  },
  {
    onProgress: (progress, step) => console.log(`${progress}%: ${step}`),
    onComplete: (result) => console.log('测试完成:', result),
    onError: (error) => console.error('测试失败:', error)
  }
);
```

### 2. testApiServiceAdapter - 兼容性适配器

确保与现有testApiService.ts完全兼容的适配器。

```typescript
import { testApiServiceAdapter } from '../services/api/testApiServiceAdapter';

// 与现有代码完全兼容
const response = await testApiServiceAdapter.executePerformanceTest(
  'https://example.com',
  {
    device: 'desktop',
    network_condition: 'fast-3g',
    include_screenshots: true,
    lighthouse_categories: ['performance'],
    custom_metrics: []
  }
);
```

### 3. backgroundTestManagerAdapter - 后台测试管理适配器

提供可选的统一API支持，同时保持与现有backgroundTestManager的完全兼容。

```typescript
import { backgroundTestManagerAdapter } from '../services/backgroundTestManagerAdapter';

// 配置使用统一API（可选）
backgroundTestManagerAdapter.configure({
  useUnifiedApi: true,
  enableWebSocket: true,
  fallbackToOriginal: true
});

// 与现有代码完全兼容
const testId = backgroundTestManagerAdapter.startTest(
  'performance',
  { url: 'https://example.com' },
  (progress, step) => console.log(`${progress}%: ${step}`),
  (result) => console.log('完成:', result),
  (error) => console.error('错误:', error)
);
```

## 🔧 在现有页面中使用

### 选项1: 保持现有实现（推荐用于稳定页面）

```typescript
// 完全不变，继续使用现有的API调用
import { testApiService } from '../services/api/testApiService';
import backgroundTestManager from '../services/backgroundTestManager';

const TestPage = () => {
  const handleStartTest = async () => {
    // 现有代码保持不变
    const response = await testApiService.executePerformanceTest(url, config);
    // ... 现有逻辑
  };

  return (
    <div>
      {/* 现有UI保持不变 */}
    </div>
  );
};
```

### 选项2: 使用兼容性适配器（推荐用于需要增强功能的页面）

```typescript
// 使用适配器，获得新功能但保持接口兼容
import { testApiServiceAdapter } from '../services/api/testApiServiceAdapter';
import { backgroundTestManagerAdapter } from '../services/backgroundTestManagerAdapter';

const TestPage = () => {
  useEffect(() => {
    // 可选配置增强功能
    backgroundTestManagerAdapter.configure({
      useUnifiedApi: true,
      enableWebSocket: true,
      fallbackToOriginal: true
    });
  }, []);

  const handleStartTest = async () => {
    // 接口完全相同，但获得了增强功能
    const response = await testApiServiceAdapter.executePerformanceTest(url, config);
    // ... 现有逻辑保持不变
  };

  return (
    <div>
      {/* 现有UI保持不变 */}
    </div>
  );
};
```

### 选项3: 直接使用统一API客户端（推荐用于新页面）

```typescript
// 直接使用统一API客户端，获得最佳体验
import { unifiedTestApiClient } from '../services/api/UnifiedTestApiClient';

const NewTestPage = () => {
  const handleStartTest = async () => {
    try {
      // 使用实时测试功能
      const testId = await unifiedTestApiClient.startRealtimeTest(
        {
          url,
          testType: 'performance',
          ...config
        },
        {
          onProgress: (progress, step) => {
            setProgress(progress);
            setCurrentStep(step);
          },
          onComplete: (result) => {
            setResult(result);
            setIsRunning(false);
          },
          onError: (error) => {
            setError(error.message);
            setIsRunning(false);
          }
        }
      );
      
      setTestId(testId);
      setIsRunning(true);
      
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div>
      {/* 新的UI组件 */}
    </div>
  );
};
```

## 📋 各页面升级建议

### StressTest.tsx - 保持现状 ⭐⭐⭐⭐⭐
```
✅ 建议: 保持现有实现
✅ 原因: 功能完整，性能优秀，有复杂的本地测试逻辑
❌ 不建议: 使用新API客户端（可能破坏现有功能）
```

### APITest.tsx - 可选升级 ⭐⭐⭐⭐
```
✅ 选项A: 保持现有实现
✅ 选项B: 使用testApiServiceAdapter（推荐）
  - 获得统一错误处理
  - 获得重试和缓存功能
  - 保持所有现有功能
✅ 选项C: 使用统一API客户端
  - 获得WebSocket实时更新
  - 需要适配现有UI逻辑
```

### SEOTest.tsx - 保持现状 ⭐⭐⭐⭐
```
✅ 建议: 保持现有的useUnifiedSEOTest
✅ 原因: 已经有统一的状态管理，功能完整
⚠️ 可选: 使用backgroundTestManagerAdapter增强后台处理
```

### 其他测试页面 - 渐进式升级 ⭐⭐⭐
```
✅ CompatibilityTest.tsx: 使用testApiServiceAdapter
✅ UXTest.tsx: 使用testApiServiceAdapter
✅ NetworkTest.tsx: 使用unifiedTestApiClient（新功能）
✅ DatabaseTest.tsx: 使用unifiedTestApiClient（新功能）
```

## 🚀 新功能特性

### 1. WebSocket实时更新
```typescript
// 自动检测WebSocket支持，回退到轮询
const testId = await unifiedTestApiClient.startRealtimeTest(config, callbacks);
```

### 2. 统一错误处理
```typescript
// 标准化的错误响应格式
{
  success: false,
  error: "具体错误信息",
  timestamp: "2024-01-01T00:00:00Z",
  requestId: "req_123456"
}
```

### 3. 自动重试机制
```typescript
// 配置重试策略
const response = await unifiedTestApiClient.executeTest({
  url: 'https://example.com',
  testType: 'performance',
  retries: 3,
  timeout: 30000
});
```

### 4. 请求缓存
```typescript
// GET请求自动缓存
const cachedResponse = await unifiedTestApiClient.getTestResult(testId, testType);
```

### 5. 进度回调增强
```typescript
// 更详细的进度信息
onProgress: (progress, step, metrics) => {
  console.log(`进度: ${progress}%`);
  console.log(`当前步骤: ${step}`);
  console.log(`性能指标:`, metrics);
}
```

## 🔄 迁移步骤

### 第1步: 选择升级策略
1. **保持现状**: 不做任何改动
2. **使用适配器**: 获得增强功能但保持兼容
3. **完全升级**: 使用统一API客户端

### 第2步: 测试兼容性
```bash
# 1. 创建测试分支
git checkout -b feature/api-upgrade-[page-name]

# 2. 备份现有实现
cp frontend/pages/[PageName].tsx frontend/pages/[PageName].tsx.backup

# 3. 应用升级
# 4. 测试所有现有功能
# 5. 如果有问题，立即回滚
```

### 第3步: 渐进式部署
1. 先在开发环境测试
2. 在测试环境验证功能
3. 小范围生产环境测试
4. 全面部署

## 📊 性能对比

| 特性 | 现有API | 适配器 | 统一客户端 |
|------|---------|--------|------------|
| 兼容性 | ✅ 100% | ✅ 100% | ⚠️ 需适配 |
| WebSocket | ❌ 无 | ✅ 可选 | ✅ 支持 |
| 自动重试 | ❌ 无 | ✅ 支持 | ✅ 支持 |
| 错误处理 | ⚠️ 不统一 | ✅ 统一 | ✅ 统一 |
| 缓存 | ❌ 无 | ✅ 支持 | ✅ 支持 |
| 类型安全 | ⚠️ 部分 | ✅ 完整 | ✅ 完整 |

## 🚨 注意事项

### 1. 兼容性保证
- 所有现有接口保持100%兼容
- 现有代码无需修改即可工作
- 新功能作为可选增强提供

### 2. 回滚策略
- 保持原有API服务可用
- 适配器支持回退到原始实现
- 提供完整的回滚文档

### 3. 性能考虑
- 新API客户端经过性能优化
- 支持请求缓存和连接复用
- WebSocket连接自动管理

### 4. 错误处理
- 统一的错误响应格式
- 自动重试机制
- 详细的错误日志

## 📞 支持

如果在使用过程中遇到问题：

1. 查看API客户端的TypeScript类型定义
2. 参考现有页面的实现方式
3. 使用适配器保持兼容性
4. 在问题解决前保持现有实现

记住：**新的API调用模式是可选的增强，不是强制的替换**！
