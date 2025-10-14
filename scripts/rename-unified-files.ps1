# 批量重命名 Unified 前缀文件
# 使用 git mv 保留历史记录

$ErrorActionPreference = "Stop"

# Frontend 文件重命名映射
$frontendRenames = @{
    "frontend\components\analysis\UnifiedPerformanceAnalysis.tsx" = "frontend\components\analysis\PerformanceAnalysis.tsx"
    "frontend\components\testing\UnifiedTestExecutor.tsx" = "frontend\components\testing\TestExecutor.tsx"
    "frontend\components\ui\UnifiedFeedback.tsx" = "frontend\components\ui\Feedback.tsx"
    "frontend\components\ui\UnifiedIcons.tsx" = "frontend\components\ui\Icons.tsx"
    "frontend\hooks\useUnifiedSEOTest.ts" = "frontend\hooks\useSEOTest.ts"
    "frontend\hooks\useUnifiedTestEngine.ts" = "frontend\hooks\useTestEngine.ts"
    "frontend\pages\UnifiedTestPage.tsx" = "frontend\pages\TestPage.tsx"
    "frontend\types\unifiedEngine.types.ts" = "frontend\types\engine.types.ts"
}

# Backend 文件重命名映射
$backendRenames = @{
    "backend\docs\unifiedEngineAPI.js" = "backend\docs\testEngineAPI.js"
    "backend\middleware\unifiedEngineValidation.js" = "backend\middleware\testEngineValidation.js"
    "backend\middleware\unifiedErrorHandler.js" = "backend\middleware\errorHandler.js"
    "backend\websocket\unifiedEngineHandler.js" = "backend\websocket\testEngineHandler.js"
}

$baseDir = "D:\myproject\Test-Web"

Write-Host "Starting to rename Unified files..." -ForegroundColor Green
Write-Host ""

# Frontend renames
Write-Host "=== Frontend Files ===" -ForegroundColor Cyan
foreach ($old in $frontendRenames.Keys) {
    $oldPath = Join-Path $baseDir $old
    $newPath = Join-Path $baseDir $frontendRenames[$old]
    
    if (Test-Path $oldPath) {
        Write-Host "Renaming: $old" -ForegroundColor Yellow
        Write-Host "   --> $($frontendRenames[$old])" -ForegroundColor Green
        git mv $oldPath $newPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   [OK] Success" -ForegroundColor Green
        } else {
            Write-Host "   [FAIL] Failed" -ForegroundColor Red
        }
    } else {
        Write-Host "Skipping (not found): $old" -ForegroundColor Gray
    }
    Write-Host ""
}

# Backend renames
Write-Host "=== Backend Files ===" -ForegroundColor Cyan
foreach ($old in $backendRenames.Keys) {
    $oldPath = Join-Path $baseDir $old
    $newPath = Join-Path $baseDir $backendRenames[$old]
    
    if (Test-Path $oldPath) {
        # Check if target already exists
        if ($old -like "*unifiedErrorHandler.js") {
            Write-Host "Warning: errorHandler.js may already exist, needs manual merge" -ForegroundColor Yellow
            Write-Host "Skipping: $old" -ForegroundColor Yellow
        } else {
            Write-Host "Renaming: $old" -ForegroundColor Yellow
            Write-Host "   --> $($backendRenames[$old])" -ForegroundColor Green
            git mv $oldPath $newPath
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   [OK] Success" -ForegroundColor Green
            } else {
                Write-Host "   [FAIL] Failed" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "Skipping (not found): $old" -ForegroundColor Gray
    }
    Write-Host ""
}

Write-Host "Renaming completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: Run 'node scripts\update-imports.js' to update imports" -ForegroundColor Cyan

