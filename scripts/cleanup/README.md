# 项目清理工具

本目录包含用于清理和重构项目的自动化脚本。

---

## 📋 脚本列表

### 1. analyze-structure.ps1

**用途**: 分析项目结构，生成统计报告

**使用方法**:

```powershell
# 基础分析
.\scripts\cleanup\analyze-structure.ps1

# 详细分析（包含文件列表）
.\scripts\cleanup\analyze-structure.ps1 -Detailed

# 自定义输出文件
.\scripts\cleanup\analyze-structure.ps1 -Output "my-report.json"
```

**输出**:

- 控制台: 统计摘要
- JSON 文件: 详细分析数据

**示例输出**:

```
总文件数: 1523
总大小: 45.2 MB

按目录统计:
  Frontend: 456 个文件 (12.3 MB)
  Backend: 789 个文件 (28.1 MB)
  Shared: 123 个文件 (2.4 MB)

重复文件检测:
  发现 5 组 JS/TS 重复文件
```

---

### 2. cleanup-duplicates.ps1

**用途**: 删除 shared 模块中的重复 JS 文件

**使用方法**:

```powershell
# 预演模式（不实际删除）
.\scripts\cleanup\cleanup-duplicates.ps1 -DryRun

# 详细输出
.\scripts\cleanup\cleanup-duplicates.ps1 -DryRun -Verbose

# 执行删除
.\scripts\cleanup\cleanup-duplicates.ps1
```

**删除的文件**:

- `shared/index.js`
- `shared/types/index.js`
- `shared/constants/index.js`
- `shared/utils/index.js`
- `shared/utils/apiResponseBuilder.js`

**安全检查**:

- ✅ 验证对应的 TS 文件存在
- ✅ 检查文件引用
- ✅ 跳过有引用的文件

---

### 3. update-imports.ps1

**用途**: 更新导入路径，将 .js 导入改为 .ts

**使用方法**:

```powershell
# 预演模式
.\scripts\cleanup\update-imports.ps1 -DryRun

# 更新整个项目
.\scripts\cleanup\update-imports.ps1

# 只更新特定目录
.\scripts\cleanup\update-imports.ps1 -Path "backend"
```

**更新模式**:

- `@shared/index.js` → `@shared/index`
- `@shared/types/index.js` → `@shared/types`
- `../shared/index.js` → `../shared/index`
- `require('@shared/index.js')` → `require('@shared/index')`

---

## 🚀 推荐使用流程

### 完整清理流程

```powershell
# 步骤 1: 创建备份
git checkout -b backup/$(Get-Date -Format 'yyyyMMdd')
git push origin backup/$(Get-Date -Format 'yyyyMMdd')
git checkout -b refactor/cleanup

# 步骤 2: 分析当前状态
.\scripts\cleanup\analyze-structure.ps1 -Detailed

# 步骤 3: 预演清理（查看将要删除什么）
.\scripts\cleanup\cleanup-duplicates.ps1 -DryRun -Verbose

# 步骤 4: 执行清理
.\scripts\cleanup\cleanup-duplicates.ps1

# 步骤 5: 更新导入（预演）
.\scripts\cleanup\update-imports.ps1 -DryRun

# 步骤 6: 执行更新
.\scripts\cleanup\update-imports.ps1

# 步骤 7: 验证
npm run type-check
npm run lint
npm test

# 步骤 8: 提交更改
git add .
git commit -m "refactor: clean up duplicate files and update imports"
git push origin refactor/cleanup
```

---

## ⚠️ 注意事项

### 使用前

1. **创建备份**: 始终先创建备份分支
2. **运行预演**: 使用 `-DryRun` 参数先查看效果
3. **检查输出**: 仔细查看将要删除/修改的文件

### 使用后

1. **类型检查**: `npm run type-check`
2. **运行测试**: `npm test`
3. **启动服务**: `npm run dev`
4. **检查功能**: 手动测试关键功能

### 如果出错

```powershell
# 回滚到备份分支
git checkout backup/$(Get-Date -Format 'yyyyMMdd')

# 或重置特定文件
git checkout HEAD -- <file-path>
```

---

## 📊 预期效果

### 清理前

- ❌ 5+ 组重复文件
- ❌ JS/TS 混用
- ❌ 导入路径不一致
- ❌ 文件数量: ~1500

### 清理后

- ✅ 无重复文件
- ✅ 统一使用 TypeScript
- ✅ 标准化导入路径
- ✅ 文件数量: ~1050 (-30%)

---

## 🔧 故障排查

### 问题 1: 脚本执行权限不足

```powershell
# 设置执行策略
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 问题 2: 找不到文件

```powershell
# 确保在项目根目录执行
cd d:\myproject\Test-Web
.\scripts\cleanup\<script-name>.ps1
```

### 问题 3: 删除后导入错误

```powershell
# 运行导入更新脚本
.\scripts\cleanup\update-imports.ps1

# 清理缓存
npm run clean
npm install
```

---

## 📝 脚本开发

### 添加新脚本

1. 在 `scripts/cleanup/` 创建新的 `.ps1` 文件
2. 添加参数和帮助信息
3. 实现 `-DryRun` 模式
4. 更新本 README

### 脚本模板

```powershell
# 脚本描述
param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)

Write-Host "脚本开始..." -ForegroundColor Green

# 主要逻辑
if ($DryRun) {
    Write-Host "[DRY RUN] 将执行..." -ForegroundColor Cyan
} else {
    # 实际执行
}

Write-Host "脚本完成!" -ForegroundColor Green
```

---

## 🔗 相关文档

- [快速开始](../../QUICK_START_RESTRUCTURE.md)
- [迁移指南](../../MIGRATION_GUIDE.md)
- [重构计划](../../RESTRUCTURE_PLAN.md)
- [问题分析](../../PROJECT_RESTRUCTURE_ANALYSIS.md)

---

**维护者**: Test Web App Team  
**最后更新**: 2026-01-13
