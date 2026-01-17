# 服务迁移指南

**更新时间**: 2026-01-17

本文档说明已删除服务的迁移路径。

---

## 已删除的服务及替代方案

### 1. testHistoryService.ts → testing/testService.ts

**旧代码**:

```typescript
import testHistoryService from '@/services/testHistoryService';

await testHistoryService.deleteTest(testId);
await testHistoryService.batchDeleteTests(ids);
```

**新代码**:

```typescript
import testService from '@/services/testing/testService';

await testService.deleteTest(testId);
await testService.batchDelete(ids);
```

**变更说明**:

- `batchDeleteTests()` → `batchDelete()`

---

### 2. errorService.ts → Logger工具

**旧代码**:

```typescript
import { errorService } from '@/services/errorService';

errorService.handleError(error);
```

**新代码**:

```typescript
import Logger from '@/utils/logger';

Logger.error('错误描述:', error);
```

**变更说明**:

- 使用统一的Logger工具替代
- 错误处理逻辑移至组件或utils

---

### 3. reportGeneratorService.ts → reporting/reportService.ts

**旧代码**:

```typescript
import { reportGeneratorService } from '@/services/reportGeneratorService';

const report = await reportGeneratorService.generateReport(data, config);
```

**新代码**:

```typescript
import { reportService } from '@/services/reporting/reportService';

const report = await reportService.generateReport(data, config);
```

**变更说明**:

- 服务名称简化
- API保持兼容

---

### 4. comparisonService.ts → analytics/analyticsService.ts

**旧代码**:

```typescript
import { comparisonService } from '@/services/comparisonService';

const comparison = await comparisonService.compare(test1, test2);
```

**新代码**:

```typescript
import { analyticsService } from '@/services/analytics/analyticsService';

// 比较功能已集成到分析服务
const comparison = await analyticsService.compareTests(test1, test2);
```

---

### 5. integration/\* → 分散到各服务

**integration/configService.ts** → **settingsService.ts**

```typescript
// 旧代码
import { configService } from '@/services/integration/configService';

// 新代码
import { settingsService } from '@/services/settingsService';
```

**integration/dataService.ts** → **api/client.ts**

```typescript
// 旧代码
import { dataService } from '@/services/integration/dataService';

// 新代码
import { apiClient } from '@/services/api/client';
```

**integration/notificationService.ts** → **组件内部**

```typescript
// 通知功能移至UI组件
import { useNotification } from '@/hooks/useNotification';
```

---

### 6. 其他已删除的服务

**googlePageSpeedService.ts**

- 功能已集成到性能测试引擎
- 无需单独导入

**helpService.ts**

- 帮助内容改为静态数据
- 使用 `@/data/helpContent.ts`

**dataNormalizationPipelineService.ts**

- 过度设计,功能简单
- 数据规范化逻辑移至utils

---

## 快速查找替代

| 已删除服务                       | 替代方案         | 位置                                   |
| -------------------------------- | ---------------- | -------------------------------------- |
| testHistoryService               | testService      | services/testing/testService.ts        |
| errorService                     | Logger           | utils/logger.ts                        |
| reportGeneratorService           | reportService    | services/reporting/reportService.ts    |
| comparisonService                | analyticsService | services/analytics/analyticsService.ts |
| integration/configService        | settingsService  | services/settingsService.ts            |
| integration/dataService          | apiClient        | services/api/client.ts                 |
| integration/notificationService  | useNotification  | hooks/useNotification.ts               |
| googlePageSpeedService           | -                | 已集成                                 |
| helpService                      | -                | 静态数据                               |
| dataNormalizationPipelineService | -                | utils                                  |

---

## 迁移检查清单

- [ ] 搜索所有对已删除服务的导入
- [ ] 更新导入路径
- [ ] 更新方法调用(如有变更)
- [ ] 运行TypeScript编译检查
- [ ] 测试功能是否正常
- [ ] 删除未使用的导入

---

## 常见问题

### Q: 为什么删除这些服务?

A: 消除重复功能,简化项目结构,提高可维护性。

### Q: 旧代码会立即失效吗?

A: 是的,已删除的服务文件不存在,需要立即迁移。

### Q: 如何批量更新导入?

A: 使用IDE的全局搜索替换功能,或参考本文档逐个更新。

### Q: 遇到类型错误怎么办?

A: 检查新服务的类型定义,可能需要调整类型导入。

---

## 相关文档

- **清理报告**: `CLEANUP_REPORT.md`
- **重构总结**: `REFACTORING_SUMMARY.md`
- **架构规范**: `docs/ARCHITECTURE_STANDARDS.md`
