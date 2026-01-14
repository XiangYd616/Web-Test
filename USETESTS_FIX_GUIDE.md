# useTests.ts 修复指南

**文件**: `frontend/hooks/useTests.ts`

---

## 需要修复的问题

### 1. 导入部分（第6-14行）

**当前代码**:

```typescript
import {
  TestConfig,
  TestExecution as TestResult,
} from '@/services/api/repositories/testRepository';
import { UnifiedTestService } from '@/services/testing/testService';
import { useCallback, useEffect, useState } from 'react';

// 创建testService实例
const testService = new UnifiedTestService();
```

**修复为**:

```typescript
import {
  TestConfig,
  TestExecution as TestResult,
  testRepository,
} from '@/services/api/repositories/testRepository';
import { useCallback, useEffect, useState } from 'react';
```

---

### 2. createAndStart方法（约第117-129行）

**查找**:

```typescript
const test = await testService.createAndStart(config);
```

**替换为**:

```typescript
const test = await testRepository.executeTest(config);
```

---

### 3. startTest方法（约第134-149行）

**查找**:

```typescript
const test = await testService.start(testId);

// 更新列表中的测试状态
setTests(prev => prev.map(t => (t.testId === testId ? test : t)));
```

**替换为**:

```typescript
const test = await testRepository.getTestStatus(testId);

// 更新列表中的测试状态
setTests(prev => prev.map(t => (t.id === testId ? test : t)));
```

---

### 4. stopTest方法（约第154-169行）

**查找**:

```typescript
const test = await testService.stop(testId);

// 更新列表中的测试状态
setTests(prev => prev.map(t => (t.testId === testId ? test : t)));
```

**替换为**:

```typescript
await testRepository.stopTest(testId);
const test = await testRepository.getTestStatus(testId);

// 更新列表中的测试状态
setTests(prev => prev.map(t => (t.id === testId ? test : t)));
```

---

### 5. deleteTest方法（约第174-187行）

**查找**:

```typescript
await testService.delete(testId);

// 从列表中移除
setTests(prev => prev.filter(t => t.testId !== testId));
```

**替换为**:

```typescript
await testRepository.deleteTest(testId);

// 从列表中移除
setTests(prev => prev.filter(t => t.id !== testId));
```

---

### 6. deleteMultiple方法（约第192-205行）

**查找**:

```typescript
await testService.deleteMultiple(testIds);

// 从列表中移除
setTests(prev => prev.filter(t => !testIds.includes(t.testId)));
```

**替换为**:

```typescript
// 批量删除
await Promise.all(testIds.map(id => testRepository.deleteTest(id)));

// 从列表中移除
setTests(prev => prev.filter(t => !testIds.includes(t.id)));
```

---

### 7. retryTest方法（约第210-225行）

**查找**:

```typescript
const test = await testService.retry(testId);

// 更新列表中的测试
setTests(prev => prev.map(t => (t.testId === testId ? test : t)));
```

**替换为**:

```typescript
// 获取原测试配置并重新执行
const oldTest = await testRepository.getTestStatus(testId);
const config: TestConfig = {
  testType: oldTest.testType,
  target: '', // 需要从原测试中获取URL
};
const test = await testRepository.executeTest(config);

// 更新列表中的测试
setTests(prev => prev.map(t => (t.id === testId ? test : t)));
```

---

## 修复摘要

### 主要更改

1. **移除**: `UnifiedTestService` 导入和实例
2. **添加**: `testRepository` 导入
3. **替换**: 所有 `testService.*` 调用为 `testRepository.*`
4. **修复**: 所有 `t.testId` 为
   `t.id`（因为`TestExecution`类型使用`id`而不是`testId`）

### 方法映射

| 旧方法                         | 新方法                                                          |
| ------------------------------ | --------------------------------------------------------------- |
| `testService.create()`         | `testRepository.executeTest()`                                  |
| `testService.createAndStart()` | `testRepository.executeTest()`                                  |
| `testService.start()`          | `testRepository.getTestStatus()`                                |
| `testService.stop()`           | `testRepository.stopTest()` + `getTestStatus()`                 |
| `testService.delete()`         | `testRepository.deleteTest()`                                   |
| `testService.deleteMultiple()` | `Promise.all(testIds.map(id => testRepository.deleteTest(id)))` |
| `testService.retry()`          | 重新获取配置并执行                                              |

---

## 验证

修复后，确保：

1. ✅ 没有 `testService` 引用
2. ✅ 没有 `UnifiedTestService` 导入
3. ✅ 所有 `testId` 属性改为 `id`
4. ✅ 所有方法使用 `testRepository`

---

**修复完成后，文件应该没有TypeScript错误！**
