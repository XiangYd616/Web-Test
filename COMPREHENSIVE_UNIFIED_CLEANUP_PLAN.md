# 全面"Unified"命名清理计划

**发现时间**: 2026-01-14  
**问题规模**: 383个匹配项，89个文件  
**优先级**: P1（高）

---

## 🔍 问题分析

### 搜索结果统计

```
总匹配数: 383个
影响文件: 89个
主要分布:
- Frontend: 约70个文件
- Backend: 约15个文件
- Shared: 约4个文件
```

### 高频文件（Top 15）

| 文件                                                           | 匹配数 | 类型 |
| -------------------------------------------------------------- | ------ | ---- |
| frontend/tests/engine.test.tsx                                 | 38     | 测试 |
| frontend/services/backgroundTestManager.ts                     | 24     | 服务 |
| frontend/tests/integration/engineIntegration.test.tsx          | 23     | 测试 |
| frontend/components/ui/Icons.tsx                               | 21     | 组件 |
| frontend/hooks/useCoreTestEngine.ts                            | 20     | Hook |
| backend/websocket/testEngineHandler.js                         | 16     | 后端 |
| frontend/services/performance/performanceTestCore.ts           | 16     | 服务 |
| backend/src/app.js                                             | 11     | 后端 |
| frontend/components/testing/TestExecutor.tsx                   | 11     | 组件 |
| backend/docs/testEngineAPI.js                                  | 9      | 文档 |
| frontend/components/ui/OptionalEnhancements.tsx                | 8      | 组件 |
| frontend/pages/SEOTest.tsx                                     | 8      | 页面 |
| frontend/services/performance/performanceTestAdapter.ts        | 8      | 服务 |
| frontend/services/api/managers/backgroundTestManagerAdapter.ts | 7      | 服务 |
| frontend/hooks/useTestState.ts                                 | 6      | Hook |

---

## 🎯 清理策略

### 策略1: 分类清理（推荐）

按文件类型和影响范围分批清理：

#### 批次1: 后端API和文档（高优先级）

- `backend/docs/testEngineAPI.js` - API文档
- `backend/websocket/testEngineHandler.js` - WebSocket处理
- `backend/src/app.js` - 应用入口
- `backend/middleware/rateLimiter.js` - 中间件

**预计时间**: 1小时  
**影响**: API路径、文档、WebSocket事件名

#### 批次2: 前端服务层（高优先级）

- `services/backgroundTestManager.ts`
- `services/performance/performanceTestCore.ts`
- `services/performance/performanceTestAdapter.ts`
- `services/api/testApiService.ts`
- `services/testing/testService.ts`
- `services/testing/testEngine.ts`

**预计时间**: 1.5小时  
**影响**: 服务类名、方法名、API调用

#### 批次3: 前端Hooks（中优先级）

- `hooks/useCoreTestEngine.ts`
- `hooks/useTestState.ts`
- `hooks/useLegacyCompatibility.ts`

**预计时间**: 45分钟  
**影响**: Hook名称、接口定义

#### 批次4: 前端组件（中优先级）

- `components/ui/Icons.tsx`
- `components/testing/TestExecutor.tsx`
- `components/ui/OptionalEnhancements.tsx`
- `components/analysis/PerformanceAnalysis.tsx`

**预计时间**: 1小时  
**影响**: 组件名称、属性名

#### 批次5: 类型定义（中优先级）

- `types/engine.types.ts`
- `types/unified/apiResponse.ts`
- `types/performance.types.ts`
- `types/common.types.ts`

**预计时间**: 45分钟  
**影响**: 接口名、类型名

#### 批次6: 测试文件（低优先级）

- `tests/engine.test.tsx`
- `tests/integration/engineIntegration.test.tsx`
- `services/auth/__tests__/authService.test.ts`

**预计时间**: 1小时  
**影响**: 测试用例、Mock

#### 批次7: 页面和路由（低优先级）

- `pages/TestPage.tsx`
- `pages/SEOTest.tsx`
- `pages/StressTest.tsx`
- `components/routing/AppRoutes.tsx`

**预计时间**: 45分钟  
**影响**: 页面组件、路由配置

---

## 📋 具体清理规则

### 文件名清理

```
❌ unifiedTestService.ts
✅ testService.ts

❌ UnifiedTestEngine.js
✅ TestEngine.js

❌ test-engine (旧API路径)
✅ test-engine
```

### 变量/函数名清理

```javascript
// Before
const unifiedTestEngine = new UnifiedTestEngine();
const unifiedAPIDoc = { ... };
function handleUnifiedTest() { ... }

// After
const testEngine = new TestEngine();
const apiDoc = { ... };
function handleTest() { ... }
```

### 类型/接口名清理

```typescript
// Before
interface UnifiedTestEngineHook { ... }
type UnifiedAPIResponse = { ... };

// After
interface TestEngineHook { ... }
type APIResponse = { ... };
```

### API路径清理

```javascript
// Before
url: '/api/test-engine/test';
url: '/api/test-engine/status';

// After
url: '/api/engine/test';
url: '/api/test-engine/status';
```

### WebSocket事件名清理

```javascript
// Before
socket.emit('unified:test:start', data);
socket.on('unified:test:progress', handler);

// After
socket.emit('test:start', data);
socket.on('test:progress', handler);
```

---

## ⚠️ 需要特别注意的文件

### 1. API文档 (backend/docs/testEngineAPI.js)

```javascript
// 需要更新
- API标题: "统一测试引擎API" → "测试引擎API"
- URL路径: /test-engine → /engine
- 所有描述中的"统一"字样
```

### 2. WebSocket处理器 (backend/websocket/testEngineHandler.js)

```javascript
// 需要更新
- 事件名称前缀: unified: → test:
- 处理器函数名
- 命名空间
```

### 3. 类型定义目录 (frontend/types/unified/)

```
整个目录可能需要重命名或合并到其他类型文件中
```

---

## 🚨 风险评估

### 高风险项

1. **API路径变更** - 影响前后端通信
2. **WebSocket事件名** - 影响实时通信
3. **类型定义变更** - 影响整个类型系统

### 缓解措施

1. **保持向后兼容**
   - 添加路径别名
   - 保留旧事件名监听
   - 使用类型别名过渡

2. **分阶段部署**
   - 先添加新命名
   - 同时支持新旧命名
   - 逐步废弃旧命名

3. **充分测试**
   - 单元测试
   - 集成测试
   - 端到端测试

---

## ✅ 执行计划

### Phase 1: 准备阶段（30分钟）

- [x] 创建清理计划文档
- [ ] 备份当前代码
- [ ] 创建feature分支
- [ ] 设置测试环境

### Phase 2: 后端清理（2小时）

- [ ] 批次1: API和文档
- [ ] 验证后端构建
- [ ] 更新API测试

### Phase 3: 前端服务层（2小时）

- [ ] 批次2: 服务层
- [ ] 批次3: Hooks
- [ ] 验证前端构建

### Phase 4: 前端UI层（1.5小时）

- [ ] 批次4: 组件
- [ ] 批次5: 类型定义
- [ ] 验证UI功能

### Phase 5: 测试和文档（1.5小时）

- [ ] 批次6: 测试文件
- [ ] 批次7: 页面和路由
- [ ] 更新文档

### Phase 6: 验证和部署（1小时）

- [ ] 完整测试
- [ ] 代码审查
- [ ] 合并到主分支

**总预计时间**: 8-10小时

---

## 📊 验收标准

### 最低标准

- [ ] 所有API路径已更新
- [ ] 后端构建成功
- [ ] 前端构建成功
- [ ] 核心功能正常

### 理想标准

- [ ] grep搜索"unified"结果 < 50个
- [ ] 所有服务层已清理
- [ ] 所有类型定义已清理
- [ ] 文档已更新

### 完美标准

- [ ] grep搜索"unified"结果 = 0
- [ ] 所有测试通过
- [ ] 代码质量A+
- [ ] 文档完整

---

## 🤔 建议

### 立即执行（推荐）

从批次1开始，逐步清理，每个批次完成后提交。

### 分阶段执行

- 本周: 批次1-3（后端+服务层）
- 下周: 批次4-7（UI层+测试）

### 暂缓执行

如果时间紧张，可以：

1. 只清理高优先级文件（批次1-2）
2. 其他文件添加TODO注释
3. 建立ESLint规则防止新增

---

**这是一个大规模的重构任务，建议分批次、有计划地执行。** ⚠️
