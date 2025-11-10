# 批量修复 Logger 调用中的类型错误
# 将 Logger.xxx(msg, error) 修复为 Logger.xxx(msg, { error: String(error) })

$ErrorActionPreference = 'Continue'

# 获取所有包含 Logger 错误的文件
$files = Get-ChildItem -Path "frontend" -Recurse -Include "*.ts","*.tsx" | Where-Object { 
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    $content -and ($content -match 'Logger\.(warn|error|debug|info)\([^,]+,\s*\w+\)')
}

$fixedCount = 0
$totalFiles = $files.Count

Write-Host "找到 $totalFiles 个可能需要修复的文件" -ForegroundColor Cyan

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        $originalContent = $content
        
        # 修复模式1: Logger.xxx('msg', error) -> Logger.xxx('msg', { error: String(error) })
        $content = $content -replace 'Logger\.(warn|error|debug|info)\(([^,]+),\s*(\w+)\s*\);', 'Logger.$1($2, { error: String($3) });'
        
        # 修复模式2: Logger.xxx(`msg`, error) -> Logger.xxx(`msg`, { error: String(error) })
        $content = $content -replace 'Logger\.(warn|error|debug|info)\(([^,]+),\s*(\w+)\s*\)', 'Logger.$1($2, { error: String($3) })'
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $fixedCount++
            Write-Host "✓ 已修复: $($file.FullName)" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "✗ 处理失败: $($file.FullName) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n修复完成！共修复 $fixedCount 个文件" -ForegroundColor Green
Write-Host "请运行 'npx tsc --noEmit' 检查剩余错误" -ForegroundColor Yellow

