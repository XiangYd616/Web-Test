# Phase 1: 前端服务合并执行脚本（简化版）
# 移除 "unified" 前缀，简化服务命名

Write-Host "========================================"
Write-Host "  Phase 1: 前端服务合并"
Write-Host "========================================"
Write-Host ""

# 检查当前分支
$currentBranch = git branch --show-current
Write-Host "当前分支: $currentBranch"
Write-Host ""

# 创建备份目录
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "D:\myproject\Test-Web\backup\phase1-consolidation-$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "备份目录: $backupDir"
Write-Host ""

# 步骤 1: 备份原始文件
Write-Host "步骤 1: 备份原始文件..."
Copy-Item "D:\myproject\Test-Web\frontend\services\api\unifiedApiService.ts" "$backupDir\unifiedApiService.ts"
Copy-Item "D:\myproject\Test-Web\frontend\services\unifiedExportManager.ts" "$backupDir\unifiedExportManager.ts"
Copy-Item "D:\myproject\Test-Web\frontend\services\unifiedSecurityEngine.ts" "$backupDir\unifiedSecurityEngine.ts"
Copy-Item "D:\myproject\Test-Web\frontend\services\unifiedTestHistoryService.ts" "$backupDir\unifiedTestHistoryService.ts"
Copy-Item "D:\myproject\Test-Web\frontend\services\cache\unifiedCacheService.ts" "$backupDir\unifiedCacheService.ts"
Write-Host "✅ 备份完成"
Write-Host ""

# 步骤 2: 处理 API Service
Write-Host "步骤 2: 处理 API Service..."
git rm "frontend\services\api\apiService.ts"
git mv "frontend\services\api\unifiedApiService.ts" "frontend\services\api\apiService.ts"
Write-Host "✅ API Service 处理完成"
Write-Host ""

# 步骤 3: 重命名其他服务
Write-Host "步骤 3: 重命名其他服务..."
git mv "frontend\services\unifiedExportManager.ts" "frontend\services\exportManager.ts"
git mv "frontend\services\unifiedSecurityEngine.ts" "frontend\services\securityEngine.ts"
git mv "frontend\services\unifiedTestHistoryService.ts" "frontend\services\testHistoryService.ts"
git mv "frontend\services\cache\unifiedCacheService.ts" "frontend\services\cache\cacheService.ts"
Write-Host "✅ 服务重命名完成"
Write-Host ""

# 步骤 4: 更新导入语句
Write-Host "步骤 4: 更新导入语句..."
& "D:\myproject\Test-Web\scripts\update-unified-imports.ps1"
Write-Host ""

# 步骤 5: 显示 Git 状态
Write-Host "步骤 5: Git 状态"
Write-Host "========================================"
git status --short
Write-Host ""

# 完成
Write-Host "========================================"
Write-Host "  Phase 1 执行完成"
Write-Host "========================================"
Write-Host ""
Write-Host "备份位置: $backupDir"
Write-Host ""
Write-Host "下一步:"
Write-Host "  1. 检查状态: git status"
Write-Host "  2. 查看更改: git diff --stat"
Write-Host "  3. 运行测试: npm run type-check"
Write-Host "  4. 提交更改: git add -A"
Write-Host "  5. 提交: git commit -m 'refactor: remove unified prefix from frontend services'"
Write-Host ""
