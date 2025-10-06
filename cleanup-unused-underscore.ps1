# 清理未使用的下划线导出函数
# 策略：移除export关键字，使其成为内部函数

Write-Host "Cleaning up unused underscore exports..." -ForegroundColor Cyan

# 定义需要处理的文件和函数
$targets = @(
    @{
        File = "frontend\components\theme\PreventFlashOnWrongTheme.tsx"
        Functions = @("_useThemeInitialization", "_useThemeSync")
    },
    @{
        File = "frontend\components\ui\theme\ThemeSystem.ts"
        Functions = @("_getTheme", "_createThemeVariables", "_themeClasses")
    },
    @{
        File = "frontend\config\testTypes.ts"
        Functions = @("_getTestTypeConfig", "_getAllTestTypes")
    },
    @{
        File = "frontend\hooks\useCSS.ts"
        Functions = @("_useComponentCSS", "_useRouteCSS")
    },
    @{
        File = "frontend\hooks\useDataManagement.ts"
        Functions = @("_useDataManagement")
    },
    @{
        File = "frontend\hooks\useSEOTest.ts"
        Functions = @("_useSEOTest")
    },
    @{
        File = "frontend\utils\browserSupport.ts"
        Functions = @("_generateCompatibilityReport", "_browserSupport")
    },
    @{
        File = "frontend\utils\environment.ts"
        Functions = @("_isFeatureSupported", "_getEnvironmentInfo")
    },
    @{
        File = "frontend\utils\routeUtils.ts"
        Functions = @("_getRouteName", "_isProtectedRoute", "_isAdminRoute", "_getNavigationRoutes", "_getBreadcrumbs")
    },
    @{
        File = "frontend\utils\testTemplates.ts"
        Functions = @("_getTemplateById", "_getTemplatesByCategory", "_getTemplatesByDifficulty", "_searchTemplates", "_getRecommendedTemplates", "_getTemplateCategories")
    }
)

$baseDir = "D:\myproject\Test-Web"
$processedCount = 0
$errors = @()

foreach ($target in $targets) {
    $fullPath = Join-Path $baseDir $target.File
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "File not found: $($target.File)" -ForegroundColor Red
        $errors += "File not found: $($target.File)"
        continue
    }
    
    Write-Host "`nProcessing: $($target.File)" -ForegroundColor Yellow
    
    try {
        $content = Get-Content $fullPath -Raw
        $originalContent = $content
        $modified = $false
        
        foreach ($funcName in $target.Functions) {
            # Pattern to match: export const _functionName
            # Replace with: const functionName (remove underscore and export)
            $pattern = "export\s+const\s+$funcName"
            $newName = $funcName.Substring(1)  # Remove leading underscore
            $replacement = "const $newName"
            
            if ($content -match $pattern) {
                $content = $content -replace $pattern, $replacement
                Write-Host "  - Converted: $funcName -> $newName (internal)" -ForegroundColor Green
                $modified = $true
            }
        }
        
        if ($modified) {
            $content | Set-Content $fullPath -NoNewline
            $processedCount++
            Write-Host "  File updated successfully!" -ForegroundColor Green
        } else {
            Write-Host "  No changes needed" -ForegroundColor Gray
        }
        
    } catch {
        $errorMsg = "Error processing $($target.File): $_"
        Write-Host "  $errorMsg" -ForegroundColor Red
        $errors += $errorMsg
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Cleanup Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Files processed: $processedCount" -ForegroundColor Green

if ($errors.Count -gt 0) {
    Write-Host "`nErrors encountered:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

Write-Host "`nNote: Functions are now internal (not exported)" -ForegroundColor Yellow
Write-Host "Run 'npm run type-check' to verify" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

