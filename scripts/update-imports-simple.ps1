# 简化版导入更新脚本

Write-Host "========================================"
Write-Host "  更新导入语句"
Write-Host "========================================"
Write-Host ""

$files = Get-ChildItem -Path "D:\myproject\Test-Web\frontend" -Include *.ts,*.tsx,*.js,*.jsx -Recurse |
    Where-Object { $_.FullName -notmatch "node_modules|dist|build" }

Write-Host "扫描到 $($files.Count) 个文件"
Write-Host ""

$updated = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content
    
    # API Service
    $content = $content -replace "from './unifiedApiService'", "from './apiService'"
    $content = $content -replace "from '../unifiedApiService'", "from '../apiService'"
    $content = $content -replace "from '../../unifiedApiService'", "from '../../apiService'"
    $content = $content -replace 'from "./unifiedApiService"', 'from "./apiService"'
    $content = $content -replace 'from "../unifiedApiService"', 'from "../apiService"'
    $content = $content -replace 'from "../../unifiedApiService"', 'from "../../apiService"'
    
    # Export Manager
    $content = $content -replace "unifiedExportManager", "exportManager"
    
    # Security Engine
    $content = $content -replace "unifiedSecurityEngine", "securityEngine"
    
    # Test History Service
    $content = $content -replace "unifiedTestHistoryService", "testHistoryService"
    
    # Cache Service
    $content = $content -replace "cache/unifiedCacheService", "cache/cacheService"
    
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $relativePath = $file.FullName.Replace("D:\myproject\Test-Web\", "")
        Write-Host "✅ $relativePath"
        $updated++
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "更新完成: $updated 个文件"
Write-Host "========================================"
Write-Host ""
