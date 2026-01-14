# API服务迁移指南

**版本**: v1.0  
**日期**: 2026-01-14

---

## 📊 迁移范围

### 受影响的文件统计

```
使用 apiService: 22个文件 (226处引用)
使用 baseApiService: 6个文件 (15处引用)
使用 testApiService: 9个文件 (28处引用)

总计: 37个文件需要更新
```

### 主要受影响的文件

**高优先级** (核心页面):

- `pages/APITest.tsx`
- `pages/SecurityTest.tsx`
- `pages/ContentTest.tsx`
- `pages/DocumentationTest.tsx`
- `pages/InfrastructureTest.tsx`

**中优先级** (服务层):

- `services/user/userService.ts`
- `services/api/testProgressService.ts`
- `services/api/managers/backgroundTestManagerAdapter.ts`
- `hooks/useDatabaseTestState.ts`

**低优先级** (测试文件):

- `services/__tests__/*.ts`
- `services/api/__tests__/*.ts`

---

## 🔄 迁移策略

### 方案A: 保留旧服务作为过渡 (推荐)

**优点**:

- 风险最低
- 可以逐步迁移
- 保持系统稳定

**实施**:

1. 保留旧API服务文件，但标记为deprecated
2. 在旧服务内部调用新的Repository
3. 逐步迁移各个模块
4. 最后删除旧服务

### 方案B: 直接替换 (激进)

**优点**:

- 快速完成
- 代码更清晰

**缺点**:

- 风险较高
- 可能引入bug

---

## 📝 迁移步骤 (采用方案A)

### Step 1: 修改旧服务为适配器模式

将旧的API服务改为调用新的Repository，保持接口不变。

**示例**:

```typescript
// apiService.ts (修改后)
import { authRepository, testRepository } from './repositories';

export class ApiService {
  // 保持原有方法签名，内部调用Repository
  async login(credentials) {
    return authRepository.login(credentials);
  }

  async executeTest(config) {
    return testRepository.executeTest(config);
  }
}
```

### Step 2: 逐步迁移各模块

按优先级迁移：

1. 核心页面 → 使用新Repository
2. 服务层 → 使用新Repository
3. 测试文件 → 使用新Repository

### Step 3: 删除旧服务

所有模块迁移完成后，删除旧服务文件。

---

## 🎯 具体迁移示例

### 示例1: 页面组件迁移

**迁移前**:

```typescript
import { testApiService } from '@/services/api/testApiService';

const result = await testApiService.executeTest(config);
```

**迁移后**:

```typescript
import { testRepository } from '@/services/api';

const result = await testRepository.executeTest(config);
```

### 示例2: 服务层迁移

**迁移前**:

```typescript
import { apiService } from '@/services/api/apiService';

const user = await apiService.getCurrentUser();
```

**迁移后**:

```typescript
import { authRepository } from '@/services/api';

const user = await authRepository.getCurrentUser();
```

---

## ⚠️ 注意事项

### 1. 返回值类型变化

新Repository返回的是直接数据，不再包装在ApiResponse中：

```typescript
// 旧方式
const response = await apiService.login(credentials);
if (response.success) {
  const user = response.data;
}

// 新方式
try {
  const user = await authRepository.login(credentials);
  // user 直接是用户对象
} catch (error) {
  // 错误处理
}
```

### 2. 错误处理

新方式使用try-catch，不再检查success字段：

```typescript
// 旧方式
const result = await apiService.executeTest(config);
if (!result.success) {
  console.error(result.error);
}

// 新方式
try {
  const result = await testRepository.executeTest(config);
} catch (error) {
  console.error(error.message);
}
```

---

## 📋 迁移检查清单

### 准备阶段

- [x] 创建Repository层
- [x] 更新API导出
- [ ] 修改旧服务为适配器
- [ ] 编写迁移测试

### 迁移阶段

- [ ] 迁移核心页面 (5个文件)
- [ ] 迁移服务层 (4个文件)
- [ ] 迁移Hook层 (1个文件)
- [ ] 更新测试文件

### 验证阶段

- [ ] 运行类型检查
- [ ] 运行单元测试
- [ ] 手动测试核心功能
- [ ] 性能测试

### 清理阶段

- [ ] 删除旧API服务文件
- [ ] 更新文档
- [ ] 代码审查

---

## 🚀 执行计划

### 今天 (2026-01-14)

1. 修改旧服务为适配器模式
2. 迁移2-3个核心页面
3. 验证功能正常

### 明天

1. 完成剩余页面迁移
2. 迁移服务层
3. 运行完整测试

### 后天

1. 删除旧服务文件
2. 更新文档
3. 代码审查和提交

---

**预计完成时间**: 3天  
**风险等级**: 低 (采用适配器模式)
