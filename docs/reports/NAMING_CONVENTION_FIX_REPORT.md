# 文件命名规范修复报告

**修复时间**: 2025-08-14T06:18:51.708Z
**修复模式**: 实际执行
**修复数量**: 12个

## 📊 修复摘要

共修复 12 个命名问题

## 🔧 修复详情


### 1. 目录重命名
- **原文件**: `frontend\components\ui\__tests__`
- **新文件**: `frontend\components\ui\tests`
- **修复原因**: __tests__ → tests (规范化测试目录名)


### 2. 目录重命名
- **原文件**: `frontend\hooks\__tests__`
- **新文件**: `frontend\hooks\tests`
- **修复原因**: __tests__ → tests (规范化测试目录名)


### 3. 目录重命名
- **原文件**: `frontend\services\__tests__`
- **新文件**: `frontend\services\tests`
- **修复原因**: __tests__ → tests (规范化测试目录名)


### 4. 目录重命名
- **原文件**: `frontend\utils\__tests__`
- **新文件**: `frontend\utils\tests`
- **修复原因**: __tests__ → tests (规范化测试目录名)


### 5. 目录重命名
- **原文件**: `frontend\__tests__`
- **新文件**: `frontend\tests`
- **修复原因**: __tests__ → tests (规范化测试目录名)


### 6. 样式文件重命名
- **原文件**: `frontend\components\testing\StatusLabel.css`
- **新文件**: `frontend\components\testing\status-label.css`
- **修复原因**: PascalCase.css → kebab-case.css


### 7. 样式文件重命名
- **原文件**: `frontend\components\testing\StressTestDetailModal.css`
- **新文件**: `frontend\components\testing\stress-test-detail-modal.css`
- **修复原因**: PascalCase.css → kebab-case.css


### 8. 样式文件重命名
- **原文件**: `frontend\components\testing\StressTestHistory.css`
- **新文件**: `frontend\components\testing\stress-test-history.css`
- **修复原因**: PascalCase.css → kebab-case.css


### 9. TypeScript文件重命名
- **原文件**: `frontend\services\DataNormalizationPipeline.ts`
- **新文件**: `frontend\services\dataNormalizationPipeline.ts`
- **修复原因**: PascalCase.ts → camelCase.ts (服务文件)


### 10. TypeScript文件重命名
- **原文件**: `frontend\services\TestStateManager.ts`
- **新文件**: `frontend\services\testStateManager.ts`
- **修复原因**: PascalCase.ts → camelCase.ts (服务文件)


### 11. TypeScript文件重命名
- **原文件**: `frontend\utils\DataVisualizationOptimizer.ts`
- **新文件**: `frontend\utils\dataVisualizationOptimizer.ts`
- **修复原因**: PascalCase.ts → camelCase.ts (服务文件)


### 12. 文档文件重命名
- **原文件**: `frontend\styles\browser-compatibility-fixes.md`
- **新文件**: `frontend\styles\browserCompatibilityFixes.md`
- **修复原因**: 规范化文档文件命名


## 📋 修复规则

### 1. 测试目录命名
- **规则**: `__tests__` → `tests`
- **原因**: 统一测试目录命名规范

### 2. 样式文件命名
- **规则**: `PascalCase.css` → `kebab-case.css`
- **原因**: 样式文件使用kebab-case命名

### 3. TypeScript服务文件命名
- **规则**: `PascalCase.ts` → `camelCase.ts`
- **原因**: 服务文件使用camelCase命名
- **适用目录**: services/, utils/

### 4. 文档文件命名
- **规则**: 规范化文档文件命名
- **原因**: 统一文档命名格式

## 🎯 修复效果

### 修复前问题
- 测试目录使用 `__tests__` 命名
- 样式文件使用 PascalCase 命名
- 服务文件使用 PascalCase 命名
- 文档文件命名不一致

### 修复后状态
- ✅ 测试目录统一使用 `tests` 命名
- ✅ 样式文件统一使用 kebab-case 命名
- ✅ 服务文件统一使用 camelCase 命名
- ✅ 文档文件命名规范化

## 📋 后续建议

1. **建立命名规范文档** - 为团队制定详细的命名规范
2. **配置ESLint规则** - 自动检查文件命名规范
3. **定期检查** - 使用分析工具定期检查命名规范
4. **团队培训** - 确保团队成员了解命名规范

---
*此报告由文件命名规范修复工具自动生成*
