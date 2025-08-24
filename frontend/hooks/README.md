# 测试专用Hook使用指南

这些Hook是为了提供统一的状态管理而创建的**可选**Hook。各个测试页面可以选择性使用，**不强制替换现有实现**。

## 🎯 设计原则

- **可选使用**: 页面可以选择使用或保持现有实现
- **功能完整**: 每个Hook提供完整的测试状态管理功能
- **类型安全**: 完整的TypeScript类型定义
- **向后兼容**: 不破坏现有功能

## 📦 Hook列表

### 1. useAPITestState - API测试状态管理

专为API测试设计的完整状态管理Hook。

```tsx
import { useAPITestState } from '../hooks';

const APITestPage = () => {
  const {
    config,
    updateConfig,
    isRunning,
    progress,
    result,
    startTest,
    stopTest,
    addEndpoint,
    removeEndpoint
  } = useAPITestState();

  return (
    <div>
      {/* 使用Hook提供的状态和方法 */}
    </div>
  );
};
```

**特色功能**:
- 端点管理 (增删改查)
- 批量操作 (导入导出)
- 认证配置
- 断言验证

### 2. useCompatibilityTestState - 兼容性测试状态管理

专为浏览器兼容性测试设计的状态管理Hook。

```tsx
import { useCompatibilityTestState } from '../hooks';

const CompatibilityTestPage = () => {
  const {
    config,
    updateConfig,
    addBrowser,
    removeBrowser,
    loadPreset,
    startTest
  } = useCompatibilityTestState();

  return (
    <div>
      {/* 兼容性测试界面 */}
    </div>
  );
};
```

**特色功能**:
- 多浏览器支持
- 设备类型选择
- 视口管理
- 预设配置

### 3. useUXTestState - 用户体验测试状态管理

专为UX测试设计的状态管理Hook。

```tsx
import { useUXTestState } from '../hooks';

const UXTestPage = () => {
  const {
    config,
    updateConfig,
    addUserScenario,
    removeUserScenario,
    loadPreset,
    startTest
  } = useUXTestState();

  return (
    <div>
      {/* UX测试界面 */}
    </div>
  );
};
```

**特色功能**:
- Core Web Vitals检测
- 可访问性测试
- 用户场景模拟
- 交互性测试

### 4. useNetworkTestState - 网络测试状态管理

专为网络测试设计的状态管理Hook。

```tsx
import { useNetworkTestState } from '../hooks';

const NetworkTestPage = () => {
  const {
    config,
    updateConfig,
    addPort,
    addDnsServer,
    loadPreset,
    startTest
  } = useNetworkTestState();

  return (
    <div>
      {/* 网络测试界面 */}
    </div>
  );
};
```

**特色功能**:
- 连通性测试
- 延迟和带宽测试
- DNS解析测试
- 端口扫描

### 5. useDatabaseTestState - 数据库测试状态管理

专为数据库测试设计的状态管理Hook。

```tsx
import { useDatabaseTestState } from '../hooks';

const DatabaseTestPage = () => {
  const {
    config,
    updateConfig,
    testConnection,
    addCustomQuery,
    loadDatabasePreset,
    startTest
  } = useDatabaseTestState();

  return (
    <div>
      {/* 数据库测试界面 */}
    </div>
  );
};
```

**特色功能**:
- 多数据库支持
- 连接测试
- 性能测试
- 自定义查询

## 🔧 在现有页面中使用

### 选项1: 完全替换（推荐用于新页面或简单页面）

```tsx
// 完全使用新Hook替换现有状态管理
import { useAPITestState } from '../hooks';

const APITestPage = () => {
  // 移除现有的useState和useEffect
  // const [config, setConfig] = useState(...);
  // const [isRunning, setIsRunning] = useState(false);
  
  // 使用新Hook
  const {
    config,
    updateConfig,
    isRunning,
    startTest,
    // ... 其他方法
  } = useAPITestState();

  // 其余代码保持不变
  return (
    <div>
      {/* 现有的UI组件 */}
    </div>
  );
};
```

### 选项2: 渐进式升级（推荐用于复杂页面）

```tsx
// 保持现有实现，逐步使用新Hook的功能
import { useAPITestState } from '../hooks';

const APITestPage = () => {
  // 保持现有的状态管理
  const [config, setConfig] = useState(...);
  const [isRunning, setIsRunning] = useState(false);
  
  // 可选使用新Hook的特定功能
  const { addEndpoint, removeEndpoint, validateConfig } = useAPITestState();
  
  // 现有的处理函数保持不变
  const handleStartTest = () => {
    // 现有逻辑
  };

  return (
    <div>
      {/* 现有的UI组件 */}
      {/* 可选使用新Hook提供的端点管理功能 */}
    </div>
  );
};
```

### 选项3: 混合使用（推荐用于特定需求）

```tsx
// 根据需要混合使用现有实现和新Hook
import { useAPITestState } from '../hooks';

const APITestPage = () => {
  // 使用新Hook管理配置
  const { config, updateConfig, validateConfig } = useAPITestState();
  
  // 保持现有的测试执行逻辑
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  
  const handleStartTest = async () => {
    // 使用新Hook的验证功能
    const validation = validateConfig();
    if (!validation.isValid) {
      alert(validation.errors.join('; '));
      return;
    }
    
    // 保持现有的测试执行逻辑
    setIsRunning(true);
    // ... 现有逻辑
  };

  return (
    <div>
      {/* 混合使用新旧组件 */}
    </div>
  );
};
```

## 📋 迁移检查清单

### 迁移前检查
- [ ] 现有功能是否正常工作？
- [ ] 是否有足够的测试覆盖？
- [ ] 是否有用户正在使用该功能？
- [ ] 是否有备份计划？

### 迁移中检查
- [ ] 新Hook是否提供所有现有功能？
- [ ] 类型定义是否完整？
- [ ] 是否有性能问题？
- [ ] 用户界面是否保持一致？

### 迁移后检查
- [ ] 所有现有功能是否正常？
- [ ] 是否有新的错误或警告？
- [ ] 用户体验是否有改善？
- [ ] 代码是否更易维护？

## 🚨 注意事项

### 1. 保持现有功能
- 不要为了使用新Hook而删除现有功能
- 确保所有现有的用户交互保持不变
- 保持现有的数据格式和API接口

### 2. 渐进式升级
- 一次只升级一个功能模块
- 充分测试后再继续下一个模块
- 保持回滚的可能性

### 3. 类型安全
- 充分利用TypeScript类型检查
- 确保所有接口定义正确
- 处理好类型转换和兼容性

### 4. 性能考虑
- 注意Hook的重新渲染问题
- 合理使用useCallback和useMemo
- 避免不必要的状态更新

## 🎯 最佳实践

### 1. 选择合适的升级策略
- **简单页面**: 完全替换
- **复杂页面**: 渐进式升级
- **关键页面**: 混合使用

### 2. 充分测试
- 单元测试覆盖所有Hook功能
- 集成测试确保页面功能完整
- E2E测试验证用户体验

### 3. 文档更新
- 更新组件文档
- 更新API文档
- 更新用户指南

### 4. 团队协作
- 与团队成员讨论升级计划
- 代码审查确保质量
- 知识分享和培训

## 📞 支持

如果在使用过程中遇到问题：

1. 查看Hook的TypeScript类型定义
2. 参考现有页面的实现方式
3. 查看测试用例了解预期行为
4. 保持现有功能不变的前提下进行调整

记住：这些Hook是**可选的增强**，不是**强制的替换**！
