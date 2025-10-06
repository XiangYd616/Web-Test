#!/usr/bin/env pwsh
# 修复所有源文件的 UTF-8 编码

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🔧 修复所有文件编码为 UTF-8 BOM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$fileTypes = @("*.tsx", "*.ts", "*.jsx", "*.js", "*.html", "*.css")
$frontendPath = "frontend"
$count = 0

Write-Host "正在扫描文件..." -ForegroundColor Yellow
Write-Host ""

foreach ($fileType in $fileTypes) {
    $files = Get-ChildItem -Path $frontendPath -Filter $fileType -Recurse -File |
             Where-Object { 
                 $_.FullName -notmatch "node_modules" -and 
                 $_.FullName -notmatch ".vite" -and
                 $_.FullName -notmatch "dist"
             }
    
    foreach ($file in $files) {
        try {
            # 读取内容
            $content = Get-Content $file.FullName -Raw -Encoding UTF8
            
            # 以 UTF-8 BOM 写回
            $utf8BOM = New-Object System.Text.UTF8Encoding $true
            [System.IO.File]::WriteAllText($file.FullName, $content, $utf8BOM)
            
            $count++
            if ($count % 10 -eq 0) {
                Write-Host "  已处理 $count 个文件..." -ForegroundColor Gray
            }
        } catch {
            Write-Host "  ⚠ 无法处理: $($file.Name)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✓ 完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "已处理 $count 个文件" -ForegroundColor Green
Write-Host "所有文件现在都使用 UTF-8 BOM 编码" -ForegroundColor Green
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "  1. 重启开发服务器 (Ctrl+C 然后 npm run frontend)" -ForegroundColor Gray
Write-Host "  2. 在浏览器中清除缓存 (Ctrl+Shift+Delete)" -ForegroundColor Gray
Write-Host "  3. 硬刷新页面 (Ctrl+Shift+R)" -ForegroundColor Gray
Write-Host ""

