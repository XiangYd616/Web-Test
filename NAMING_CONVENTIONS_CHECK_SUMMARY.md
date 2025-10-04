# 命名规范检查总结报告

生成时间: 2025-10-04  
项目: Test-Web  
检查工具: check-naming-conventions.cjs

---

## 📊 总体统计

- **总文件数**: 914
- **符合规范**: 857 (93.8%)
- **不符合规范**: 57 (6.2%)
- **规范符合率**: 93.8%

### 评分
- **当前得分**: **93.8/100**
- **目标得分**: 95+/100

---

## 🔍 问题分类

### 1. React 组件命名 (3个违规)

**规则**: React 组件文件应使用 PascalCase

| 当前文件名 | 问题 | 建议修复 |
|-----------|------|---------|
| `frontend/components/auth/withAuthCheck.tsx` | 小写开头 | `WithAuthCheck.tsx` |
| `frontend/components/shared/index.tsx` | 特殊文件，保持原样 | - |
| `frontend/pages/index.tsx` | 特殊文件，保持原样 | - |

**优先级**: 中等  
**说明**: index.tsx 是特殊入口文件，可以例外

---

### 2. 服务类文件命名 (6个违规)

**规则**: 服务类文件应使用 camelCase.ts 格式

| 当前文件名 | 问题 | 建议修复 |
|-----------|------|---------|
| `frontend/services/orchestration/TestOrchestrator.ts` | PascalCase | `testOrchestrator.ts` |
| `frontend/services/performance/PerformanceTestAdapter.ts` | PascalCase | `performanceTestAdapter.ts` |
| `frontend/services/performance/PerformanceTestCore.ts` | PascalCase | `performanceTestCore.ts` |
| `frontend/services/state/StateManager.ts` | PascalCase | `stateManager.ts` |
| `frontend/services/__tests__/TestStateManager.test.ts` | PascalCase | `testStateManager.test.ts` |
| `frontend/services/__tests__/api.test.ts` | 测试文件，可例外 | - |

**优先级**: 高  
**影响范围**: 需要同步更新导入路径

---

### 3. 类型定义文件命名 (18个违规)

**规则**: 类型定义文件应使用 `camelCase.types.ts` 格式

| 当前文件名 | 建议修复 |
|-----------|---------|
| `frontend/types/api.ts` | `api.types.ts` |
| `frontend/types/apiResponse.ts` | `apiResponse.types.ts` |
| `frontend/types/auth.ts` | `auth.types.ts` |
| `frontend/types/axios.d.ts` | 保持 `.d.ts` 格式 |
| `frontend/types/browser.d.ts` | 保持 `.d.ts` 格式 |
| `frontend/types/common.ts` | `common.types.ts` |
| `frontend/types/enums.ts` | `enums.types.ts` |
| `frontend/types/errors.ts` | `errors.types.ts` |
| `frontend/types/project.ts` | `project.types.ts` |
| `frontend/types/system.ts` | `system.types.ts` |
| `frontend/types/test.ts` | `test.types.ts` |
| `frontend/types/testHistory.ts` | `testHistory.types.ts` |
| `frontend/types/user.ts` | `user.types.ts` |
| `frontend/types/version.ts` | `version.types.ts` |
| `frontend/types/unified/apiResponse.ts` | `apiResponse.types.ts` |
| `frontend/types/unified/baseTypes.ts` | `baseTypes.types.ts` |
| `frontend/types/unified/models.ts` | `models.types.ts` |
| `frontend/types/unified/testTypes.ts` | `testTypes.types.ts` |

**优先级**: 中等  
**影响范围**: 大量文件需要更新导入

---

### 4. 工具函数文件命名 (1个违规)

**规则**: 工具函数文件应使用 camelCase.ts 或 camelCase.utils.ts

| 当前文件名 | 问题 | 建议修复 |
|-----------|------|---------|
| `frontend/utils/CoreWebVitalsAnalyzer.ts` | PascalCase | `coreWebVitalsAnalyzer.ts` |

**优先级**: 低

---

### 5. 文档文件命名 (29个违规)

**规则**: 文档文件应使用 kebab-case.md 或 UPPER_CASE.md

#### API 文档 (2个)
- `docs/api/services/BaseService.md` → `base-service.md`
- `docs/api/services/HTMLParsingService.md` → `html-parsing-service.md`

#### 指南文档 (9个)
- `docs/backend-rules-2.1-使用指南.md` → 建议英文命名
- `docs/frontend-rules-2.1-使用指南.md` → 建议英文命名
- `docs/guides/README-unified-engine.md` → `readme-unified-engine.md`
- MCP 系列文档 (5个) → 已使用 UPPER_CASE，需统一为 kebab-case

#### 报告文档 (7个)
- 中文命名的报告文件建议改为英文 kebab-case

#### 根目录文档 (3个)
- `ENCODING-FIX-CHANGELOG.md` → 符合 UPPER_CASE 规则
- `FILE-NAMING-ANALYSIS.md` → 符合 UPPER_CASE 规则  
- `SERVICE-DUPLICATION-ANALYSIS.md` → 符合 UPPER_CASE 规则

#### Node modules (8个)
- `tools/electron/node_modules/date-fns/docs/*` → 第三方库，不建议修改

**优先级**: 低  
**说明**: 
- 根目录大写命名文档可保留（README.md 风格）
- 第三方库文档不应修改
- 中文命名建议改为英文

---

## 🎯 修复优先级

### 🔴 高优先级 (必须修复)

1. **服务类文件命名** (6个文件)
   - 影响: 需要更新大量导入语句
   - 风险: 中等，但必须系统性修复
   - 估计工时: 2小时

```bash
# 修复命令示例
git mv frontend/services/orchestration/TestOrchestrator.ts frontend/services/orchestration/testOrchestrator.ts
git mv frontend/services/performance/PerformanceTestAdapter.ts frontend/services/performance/performanceTestAdapter.ts
git mv frontend/services/performance/PerformanceTestCore.ts frontend/services/performance/performanceTestCore.ts
git mv frontend/services/state/StateManager.ts frontend/services/state/stateManager.ts
```

### 🟡 中等优先级 (建议修复)

2. **类型定义文件统一后缀** (18个文件)
   - 影响: 大量导入需要更新
   - 风险: 高，影响范围广
   - 估计工时: 4-6小时
   - **建议**: 分批次修复，每次修复后立即测试

3. **React 组件命名** (1个实际需要修复)
   - `withAuthCheck.tsx` → `WithAuthCheck.tsx`
   - 影响: 少量导入
   - 估计工时: 30分钟

### 🟢 低优先级 (可选修复)

4. **工具函数文件** (1个)
   - `CoreWebVitalsAnalyzer.ts` → `coreWebVitalsAnalyzer.ts`
   - 影响: 少量导入
   - 估计工时: 15分钟

5. **文档文件** (除第三方库外约20个)
   - 影响: 仅文档链接
   - 风险: 低
   - 估计工时: 1小时

---

## 📋 修复执行计划

### Phase 1: 服务类文件 (Day 1)
- [ ] 重命名 6 个服务类文件
- [ ] 全局搜索更新导入语句
- [ ] 运行类型检查: `npm run type-check`
- [ ] 运行测试: `npm test`
- [ ] 提交: `refactor: rename service files to camelCase`

### Phase 2: 单个高频文件 (Day 2)
- [ ] 修复 `withAuthCheck.tsx`
- [ ] 修复 `CoreWebVitalsAnalyzer.ts`
- [ ] 更新相关导入
- [ ] 测试验证
- [ ] 提交: `refactor: fix component and util naming`

### Phase 3: 类型文件 (Day 3-4)
- [ ] 第一批: 修复 unified 目录下的类型文件 (4个)
- [ ] 第二批: 修复常用类型文件 (7个): auth, api, user, test, system, errors, common
- [ ] 第三批: 修复其他类型文件 (7个)
- [ ] 每批修复后立即测试和提交

### Phase 4: 文档文件 (Day 5)
- [ ] 重命名 API 文档
- [ ] 重命名指南文档
- [ ] 更新文档内的交叉引用
- [ ] 提交: `docs: standardize documentation naming`

---

## 🚀 快速修复脚本

### 修复服务类文件
```powershell
# PowerShell 版本
git mv frontend/services/orchestration/TestOrchestrator.ts frontend/services/orchestration/testOrchestrator.ts
git mv frontend/services/performance/PerformanceTestAdapter.ts frontend/services/performance/performanceTestAdapter.ts
git mv frontend/services/performance/PerformanceTestCore.ts frontend/services/performance/performanceTestCore.ts
git mv frontend/services/state/StateManager.ts frontend/services/state/stateManager.ts

# 更新导入语句（需要手动或使用 VS Code 重构工具）
# 1. 在 VS Code 中打开项目
# 2. 对每个重命名的文件，使用 F2 重命名功能
# 3. VS Code 会自动更新所有导入
```

### 批量搜索需要更新的文件
```powershell
# 查找所有导入 TestOrchestrator 的文件
rg "TestOrchestrator" --type ts --type tsx

# 查找所有导入 PerformanceTestAdapter 的文件
rg "PerformanceTestAdapter" --type ts --type tsx

# 查找所有导入 StateManager 的文件  
rg "StateManager" --type ts --type tsx
```

---

## 📌 注意事项

### 1. Git 历史
- 使用 `git mv` 而不是直接重命名，以保留文件历史
- 每个 Phase 独立提交，方便回滚

### 2. 导入更新
- 优先使用 IDE 的重构功能自动更新导入
- 手动更新后务必进行全局搜索验证

### 3. 测试验证
- 每批修复后运行完整测试套件
- 特别注意动态导入的情况

### 4. 文档同步
- 更新 `docs/NAMING_CONVENTIONS.md` 
- 在 README 中添加命名规范说明

### 5. 团队协作
- 在修复前通知团队成员
- 建议在独立分支进行修复
- 合并前进行 Code Review

---

## 🎓 命名规范总结

### 文件命名规则

| 文件类型 | 规则 | 示例 |
|---------|------|------|
| React 组件 | PascalCase.tsx | `UserProfile.tsx` |
| React Hooks | camelCase.ts | `useAuth.ts`, `useDataState.ts` |
| 服务类 | camelCase.ts | `authService.ts`, `apiClient.ts` |
| 工具函数 | camelCase.ts | `formatDate.ts`, `validator.ts` |
| 类型定义 | camelCase.types.ts | `user.types.ts`, `api.types.ts` |
| 类型声明 | camelCase.d.ts | `global.d.ts`, `custom.d.ts` |
| 常量 | camelCase.constants.ts | `api.constants.ts` |
| 配置 | kebab-case.config.ts | `vite.config.ts` |
| 测试 | camelCase.test.ts | `authService.test.ts` |
| 文档 | kebab-case.md | `user-guide.md` |
| 文档 (根目录) | UPPER_CASE.md | `README.md`, `CHANGELOG.md` |

### 特殊情况

1. **index 文件**: 保持 `index.ts` 或 `index.tsx`
2. **特殊组件**: HOC 如 `withAuth.tsx` 建议改为 `WithAuth.tsx`
3. **TypeScript 声明文件**: `.d.ts` 文件可以不加 `.types` 后缀
4. **第三方库**: 不修改 node_modules 中的文件

---

## 📊 预期收益

修复完成后:
- ✅ 命名规范符合率: 93.8% → **99%+**
- ✅ 提高代码可维护性
- ✅ 统一团队编码风格
- ✅ 减少新人上手难度
- ✅ 改善 IDE 自动补全体验

---

## 🔗 相关资源

- [项目命名规范指南](./docs/NAMING_CONVENTIONS_GUIDE.md)
- [命名清理历史报告](./NAMING_CLEANUP_FINAL_REPORT.md)
- [TypeScript 风格指南](./docs/TYPESCRIPT_STYLE_GUIDE.md)

---

**报告生成者**: AI Assistant  
**审核状态**: ⏳ 待人工审核  
**下一步**: 执行 Phase 1 修复计划

