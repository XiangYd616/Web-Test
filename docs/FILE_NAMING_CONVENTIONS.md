# 文件命名规范

## 📋 总体原则

本项目遵循一致的文件命名约定，以提高代码的可读性和可维护性。

## 🎯 命名规范详细说明

### React组件文件
- **规范**: PascalCase
- **扩展名**: `.tsx`, `.jsx`
- **示例**: 
  - `Button.tsx`
  - `UserProfile.tsx`
  - `DataTable.tsx`
  - `WithAuthCheck.tsx`

### 页面文件
- **规范**: PascalCase
- **扩展名**: `.tsx`, `.jsx`
- **示例**:
  - `Dashboard.tsx`
  - `UserSettings.tsx`
  - `TestResults.tsx`

### Hook文件
- **规范**: camelCase，以 `use` 开头
- **扩展名**: `.ts`, `.tsx`
- **示例**:
  - `useAuth.ts`
  - `useApi.tsx`
  - `useLocalStorage.ts`

### 工具文件
- **规范**: camelCase
- **扩展名**: `.ts`, `.js`
- **示例**:
  - `apiUtils.ts`
  - `dateHelper.js`
  - `formatUtils.ts`

### 服务文件
- **规范**: camelCase
- **扩展名**: `.ts`, `.js`
- **示例**:
  - `authService.ts`
  - `apiClient.js`
  - `dataProcessor.ts`
  - `performanceTestAdapter.ts`
  - `performanceTestCore.ts`

### 类型定义文件
- **规范**: camelCase
- **扩展名**: `.ts`, `.d.ts`
- **示例**:
  - `user.ts`
  - `apiResponse.ts`
  - `common.d.ts`

### 样式文件
- **规范**: kebab-case
- **扩展名**: `.css`, `.scss`, `.sass`, `.less`
- **示例**:
  - `user-profile.css`
  - `data-table.scss`
  - `main-layout.css`

### 常量文件
- **规范**: UPPER_SNAKE_CASE
- **扩展名**: `.ts`, `.js`
- **示例**:
  - `API_CONSTANTS.ts`
  - `CONFIG_DEFAULTS.js`

## 🚫 特殊文件（跳过检查）

以下文件类型不受命名规范检查约束：

- **索引文件**: `index.ts`, `index.tsx`, `index.js`, `index.jsx`
- **类型声明**: `vite-env.d.ts`, `global.d.ts`
- **测试文件**: `*.test.*`, `*.spec.*`
- **Storybook文件**: `*.stories.*`
- **隐藏文件**: 以 `.` 开头的文件

## 🔧 自动化检查

项目包含自动化的文件命名检查工具：

```bash
# 运行文件命名检查
node scripts/file-naming-checker.cjs
```

### 检查器功能
- ✅ 递归扫描整个frontend目录
- ✅ 根据文件路径和类型自动判断应遵循的命名规范
- ✅ 提供具体的修复建议
- ✅ 生成详细的检查报告
- ✅ 支持跳过特殊文件类型

## 📊 当前状态

**最后检查时间**: 2025-01-15  
**检查结果**: ✅ 所有文件命名都符合规范  
**总文件数**: 434  
**检查文件数**: 393  
**发现问题**: 0

## 🔄 已修复的问题

在规范化过程中修复了以下文件：

1. **withAuthCheck.tsx** → **WithAuthCheck.tsx**
   - 类型: React组件
   - 原因: 组件文件应使用PascalCase

2. **PerformanceTestAdapter.ts** → **performanceTestAdapter.ts**
   - 类型: 服务文件
   - 原因: 服务文件应使用camelCase

3. **PerformanceTestCore.ts** → **performanceTestCore.ts**
   - 类型: 服务文件
   - 原因: 服务文件应使用camelCase

## 📝 维护指南

### 新文件创建时
1. 根据文件类型和用途选择正确的命名规范
2. 确保文件名清晰表达其功能
3. 避免使用缩写或不明确的名称

### 定期检查
建议每月运行一次命名检查：
```bash
npm run check:naming  # 如果添加到package.json scripts中
```

### 重构时注意事项
- 重命名文件后，记得更新所有相关的导入语句
- 使用IDE的重构功能可以自动更新引用
- 提交前运行TypeScript类型检查确保无错误

## 🎯 最佳实践

1. **保持一致性**: 同类型文件使用相同的命名规范
2. **语义化命名**: 文件名应清晰表达其功能和用途
3. **避免冗余**: 不要在文件名中重复目录信息
4. **使用英文**: 所有文件名使用英文，保持国际化兼容性
5. **简洁明了**: 避免过长的文件名，但要保证可读性

## 🔗 相关文档

- [代码规范](./CODE_STYLE.md)
- [项目结构](./PROJECT_STRUCTURE.md)
- [代码审查清单](./CODE_REVIEW_CHECKLIST.md)
