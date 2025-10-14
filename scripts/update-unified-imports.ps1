# 服务合并 - 导入语句自动更新脚本
# 用于移除 "unified" 前缀后更新所有导入路径

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  服务导入语句自动更新工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "⚠️  DRY RUN 模式 - 不会实际修改文件" -ForegroundColor Yellow
    Write-Host ""
}

# 定义替换规则
$replacements = @(
    # API 服务相关
    @{
        Pattern = "from ['""]\.\/unifiedApiService['""]"
        Replace = "from './apiService'"
        Description = "API Service - 同目录导入"
    },
    @{
        Pattern = "from ['""]\.\.\/unifiedApiService['""]"
        Replace = "from '../apiService'"
        Description = "API Service - 上级目录导入"
    },
    @{
        Pattern = "from ['""]\.\.\/\.\.\/unifiedApiService['""]"
        Replace = "from '../../apiService'"
        Description = "API Service - 上上级目录导入"
    },
    @{
        Pattern = "from ['""]@\/services\/api\/unifiedApiService['""]"
        Replace = "from '@/services/api/apiService'"
        Description = "API Service - 别名导入"
    },
    
    # 导出管理器
    @{
        Pattern = "\/unifiedExportManager"
        Replace = "/exportManager"
        Description = "Export Manager"
    },
    @{
        Pattern = "['""](\.{1,2}\/)+unifiedExportManager['""]"
        Replace = { $_.Value -replace "unifiedExportManager", "exportManager" }
        Description = "Export Manager - 相对路径"
    },
    
    # 安全引擎
    @{
        Pattern = "\/unifiedSecurityEngine"
        Replace = "/securityEngine"
        Description = "Security Engine"
    },
    @{
        Pattern = "['""](\.{1,2}\/)+unifiedSecurityEngine['""]"
        Replace = { $_.Value -replace "unifiedSecurityEngine", "securityEngine" }
        Description = "Security Engine - 相对路径"
    },
    
    # 测试历史服务
    @{
        Pattern = "\/unifiedTestHistoryService"
        Replace = "/testHistoryService"
        Description = "Test History Service"
    },
    @{
        Pattern = "['""](\.{1,2}\/)+unifiedTestHistoryService['""]"
        Replace = { $_.Value -replace "unifiedTestHistoryService", "testHistoryService" }
        Description = "Test History Service - 相对路径"
    },
    
    # 缓存服务
    @{
        Pattern = "\/cache\/unifiedCacheService"
        Replace = "/cache/cacheService"
        Description = "Cache Service"
    },
    @{
        Pattern = "['""](\.{1,2}\/)+cache\/unifiedCacheService['""]"
        Replace = { $_.Value -replace "unifiedCacheService", "cacheService" }
        Description = "Cache Service - 相对路径"
    }
)

# 获取所有需要处理的文件
Write-Host "🔍 扫描 frontend 目录..." -ForegroundColor Cyan

$files = Get-ChildItem -Path "D:\myproject\Test-Web\frontend" -Include *.ts,*.tsx,*.js,*.jsx -Recurse |
    Where-Object { $_.FullName -notmatch "node_modules|dist|build|\.next|coverage" }

Write-Host "找到 $($files.Count) 个文件" -ForegroundColor Gray
Write-Host ""

$totalUpdated = 0
$totalChanges = 0
$updateLog = @()

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        $fileChanges = 0
        $changesInFile = @()
        
        foreach ($rule in $replacements) {
            if ($content -match $rule.Pattern) {
                if ($rule.Replace -is [scriptblock]) {
                    $content = [regex]::Replace($content, $rule.Pattern, $rule.Replace)
                } else {
                    $content = $content -replace $rule.Pattern, $rule.Replace
                }
                
                if ($content -ne $originalContent) {
                    $fileChanges++
                    $changesInFile += "  - $($rule.Description)"
                    
                    if ($Verbose) {
                        Write-Host "  ✓ $($rule.Description)" -ForegroundColor Gray
                    }
                }
            }
        }
        
        if ($content -ne $originalContent) {
            $relativePath = $file.FullName.Replace("D:\myproject\Test-Web\", "")
            
            Write-Host "✅ " -NoNewline -ForegroundColor Green
            Write-Host "$relativePath" -ForegroundColor White
            
            if ($Verbose) {
                foreach ($change in $changesInFile) {
                    Write-Host $change -ForegroundColor Gray
                }
            }
            
            $updateLog += @{
                File = $relativePath
                Changes = $changesInFile
            }
            
            if (-not $DryRun) {
                Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
            }
            
            $totalUpdated++
            $totalChanges += $fileChanges
        }
    }
    catch {
        Write-Host "❌ 处理文件出错: $($file.Name)" -ForegroundColor Red
        Write-Host "   错误: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 输出总结
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  更新完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 统计信息:" -ForegroundColor Yellow
Write-Host "  - 扫描文件: $($files.Count)" -ForegroundColor White
Write-Host "  - 更新文件: $totalUpdated" -ForegroundColor Green
Write-Host "  - 总更改数: $totalChanges" -ForegroundColor Green
Write-Host ""

if ($DryRun) {
    Write-Host "⚠️  这是 DRY RUN - 文件未被修改" -ForegroundColor Yellow
    Write-Host "运行不带 -DryRun 参数以实际执行更新" -ForegroundColor Yellow
} else {
    Write-Host "✅ 所有文件已更新" -ForegroundColor Green
}

Write-Host ""

# 保存更新日志
if ($totalUpdated -gt 0 -and -not $DryRun) {
    $logFile = "D:\myproject\Test-Web\backup\project-cleanup-$(Get-Date -Format 'yyyyMMdd-HHmmss')\import-update-log.txt"
    $logDir = Split-Path $logFile -Parent
    
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    $logContent = @"
导入语句更新日志
==================
时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
更新文件数: $totalUpdated
总更改数: $totalChanges

更新详情:
"@
    
    foreach ($entry in $updateLog) {
        $logContent += "`n`n文件: $($entry.File)`n"
        $logContent += $entry.Changes -join "`n"
    }
    
    $logContent | Out-File -FilePath $logFile -Encoding UTF8
    Write-Host "📄 更新日志已保存: $logFile" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "下一步建议:" -ForegroundColor Yellow
Write-Host "  1. 运行类型检查: npm run type-check" -ForegroundColor White
Write-Host "  2. 构建项目: npm run build" -ForegroundColor White
Write-Host "  3. 运行测试: npm test" -ForegroundColor White
Write-Host ""
