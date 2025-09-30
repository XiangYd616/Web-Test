# 服务合并执行计划

**分支:** `refactor/service-consolidation-phase1`  
**开始时间:** 2025-09-30  
**基于分析:** SERVICE-DUPLICATION-ANALYSIS.md

---

## 📋 执行概览

根据 SERVICE-DUPLICATION-ANALYSIS.md 的分析，我们将分 3 个阶段执行服务合并：

### ✅ 已完成: Git 提交
- 提交了 185 个文件的清理工作
- Commit: `eeed274` - "chore: 项目清理 - 删除重复文件和合并代码"
- 创建新分支: `refactor/service-consolidation-phase1`

---

## 🎯 Phase 1: 前端 "Unified" 服务重命名（低风险）

**目标:** 移除 "unified" 前缀，简化服务命名  
**风险等级:** ⚠️ LOW  
**预计影响:** 30-50 个导入语句

### 1.1 前端 API 服务合并

**当前状态:**
```
frontend/services/api/
  ├── apiService.ts          ← 重导出包装器
  └── unifiedApiService.ts   ← 实际实现
```

**执行步骤:**
```bash
# Step 1: 备份当前文件
cp frontend/services/api/unifiedApiService.ts backup/project-cleanup-*/unifiedApiService.ts.bak

# Step 2: 删除包装器
rm frontend/services/api/apiService.ts

# Step 3: 重命名主实现
git mv frontend/services/api/unifiedApiService.ts frontend/services/api/apiService.ts

# Step 4: 更新导入语句（使用脚本）
# 查找并替换:
#   from './unifiedApiService' → from './apiService'
#   from '../unifiedApiService' → from '../apiService'
```

**预计需要更新的文件:**
- `frontend/components/**/` - 组件中的 API 调用
- `frontend/pages/**/` - 页面中的 API 调用
- `frontend/hooks/**/` - Hooks 中的 API 使用
- `frontend/services/**/` - 其他服务的依赖

### 1.2 导出管理器重命名

**文件:** `frontend/services/unifiedExportManager.ts` → `exportManager.ts`

```bash
git mv frontend/services/unifiedExportManager.ts frontend/services/exportManager.ts
```

**查找替换:**
- `/unifiedExportManager` → `/exportManager`
- `from 'unifiedExportManager'` → `from 'exportManager'`

### 1.3 安全引擎重命名

**文件:** `frontend/services/unifiedSecurityEngine.ts` → `securityEngine.ts`

```bash
git mv frontend/services/unifiedSecurityEngine.ts frontend/services/securityEngine.ts
```

**查找替换:**
- `/unifiedSecurityEngine` → `/securityEngine`

### 1.4 测试历史服务重命名

**文件:** `frontend/services/unifiedTestHistoryService.ts` → `testHistoryService.ts`

```bash
git mv frontend/services/unifiedTestHistoryService.ts frontend/services/testHistoryService.ts
```

**查找替换:**
- `/unifiedTestHistoryService` → `/testHistoryService`

### 1.5 缓存服务重命名

**文件:** `frontend/services/cache/unifiedCacheService.ts` → `cacheService.ts`

```bash
git mv frontend/services/cache/unifiedCacheService.ts frontend/services/cache/cacheService.ts
```

**查找替换:**
- `/cache/unifiedCacheService` → `/cache/cacheService`

---

## 📝 Phase 1 执行清单

### 准备阶段
- [x] 创建备份目录
- [x] 提交当前更改
- [x] 创建新分支
- [ ] 创建导入更新脚本

### 执行阶段
- [ ] 1.1 API 服务合并
  - [ ] 备份文件
  - [ ] 删除包装器
  - [ ] 重命名主实现
  - [ ] 更新导入语句
  - [ ] 验证类型检查

- [ ] 1.2 导出管理器重命名
  - [ ] 重命名文件
  - [ ] 更新导入语句

- [ ] 1.3 安全引擎重命名
  - [ ] 重命名文件
  - [ ] 更新导入语句

- [ ] 1.4 测试历史服务重命名
  - [ ] 重命名文件
  - [ ] 更新导入语句

- [ ] 1.5 缓存服务重命名
  - [ ] 重命名文件
  - [ ] 更新导入语句

### 验证阶段
- [ ] TypeScript 类型检查通过
- [ ] 构建成功（npm run build）
- [ ] 所有导入路径解析正确
- [ ] 手动测试核心功能

---

## 🔧 导入更新脚本

创建 PowerShell 脚本来自动更新所有导入语句：

```powershell
# scripts/update-unified-imports.ps1

$replacements = @{
    # API 服务
    "from './unifiedApiService'" = "from './apiService'"
    "from '../unifiedApiService'" = "from '../apiService'"
    "from '../../unifiedApiService'" = "from '../../apiService'"
    "from '@/services/api/unifiedApiService'" = "from '@/services/api/apiService'"
    
    # 导出管理器
    "/unifiedExportManager" = "/exportManager"
    "import.*unifiedExportManager" = $_ -replace "unifiedExportManager", "exportManager"
    
    # 安全引擎
    "/unifiedSecurityEngine" = "/securityEngine"
    
    # 测试历史
    "/unifiedTestHistoryService" = "/testHistoryService"
    
    # 缓存服务
    "/cache/unifiedCacheService" = "/cache/cacheService"
}

$files = Get-ChildItem -Path "D:\myproject\Test-Web\frontend" -Include *.ts,*.tsx,*.js,*.jsx -Recurse |
    Where-Object { $_.FullName -notmatch "node_modules|dist|build" }

$updatedCount = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    
    foreach ($pattern in $replacements.Keys) {
        if ($content -match $pattern) {
            $content = $content -replace $pattern, $replacements[$pattern]
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "✅ Updated: $($file.Name)" -ForegroundColor Green
        $updatedCount++
    }
}

Write-Host ""
Write-Host "总计更新: $updatedCount 个文件" -ForegroundColor Cyan
```

---

## 🧪 测试策略

### Level 1: 语法检查
```bash
# TypeScript 类型检查
npm run type-check
```

### Level 2: 构建验证
```bash
# 确保构建成功
npm run build
```

### Level 3: 导入验证
```powershell
# 检查是否还有 "unified" 导入
Get-ChildItem -Path frontend -Include *.ts,*.tsx -Recurse | 
    Select-String "from.*unified(Api|Export|Security|TestHistory|Cache)" |
    Select-Object Path, LineNumber, Line
```

### Level 4: 手动功能测试
- [ ] 用户登录（API 服务）
- [ ] 数据导出（导出管理器）
- [ ] 安全检查（安全引擎）
- [ ] 查看测试历史（测试历史服务）
- [ ] 缓存操作（缓存服务）

---

## 📊 进度追踪

### 当前状态
```
Phase 1: 前端服务重命名
├── 准备工作: ✅ 完成
├── API 服务: ⏳ 进行中
├── 导出管理器: ⏳ 待开始
├── 安全引擎: ⏳ 待开始
├── 测试历史: ⏳ 待开始
└── 缓存服务: ⏳ 待开始
```

### 预计完成时间
- Phase 1: 2-3 小时

---

## 🚨 回滚计划

如果遇到问题，可以快速回滚：

```bash
# 方案 1: 回滚到分支起点
git reset --hard eeed274

# 方案 2: 返回主分支
git checkout main
git branch -D refactor/service-consolidation-phase1

# 方案 3: 从备份恢复特定文件
Copy-Item "backup/project-cleanup-*/unifiedApiService.ts.bak" -Destination "frontend/services/api/unifiedApiService.ts"
```

---

## ✅ Phase 1 成功标准

1. ✅ 所有 "unified" 前缀已移除
2. ✅ TypeScript 编译无错误
3. ✅ 构建成功
4. ✅ 所有导入路径正确解析
5. ✅ 核心功能正常工作
6. ✅ 无性能回退

---

## 📚 相关文档

- [SERVICE-DUPLICATION-ANALYSIS.md](./SERVICE-DUPLICATION-ANALYSIS.md) - 原始分析
- [PROJECT_NAMING_AND_STRUCTURE_ANALYSIS.md](./PROJECT_NAMING_AND_STRUCTURE_ANALYSIS.md) - 命名规范
- [CLEANUP_EXECUTION_SUMMARY.md](./CLEANUP_EXECUTION_SUMMARY.md) - 之前的清理总结

---

## 下一步

完成 Phase 1 后，将进行：
- **Phase 2:** 后端测试引擎服务合并（中风险）
- **Phase 3:** "Real" 前缀清理和实时服务优化（中风险）

---

**开始执行时间:** 待定  
**执行者:** AI Assistant + 用户审核  
**最后更新:** 2025-09-30 09:30 UTC
