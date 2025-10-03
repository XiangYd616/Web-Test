# 修复文件编码问题的脚本
# 将错误编码的文件转换为正确的 UTF-8 编码

Write-Host "开始修复文件编码..." -ForegroundColor Cyan

# 定义需要修复的文件列表
$filesToFix = @(
    "frontend\components\auth\MFAWizard.tsx",
    "frontend\components\auth\BackupCodes.tsx",
    "frontend\components\auth\LoginPrompt.tsx",
    "frontend\components\analytics\ReportManagement.tsx"
)

$baseDir = "D:\myproject\Test-Web"
$fixedCount = 0
$errorCount = 0

foreach ($file in $filesToFix) {
    $fullPath = Join-Path $baseDir $file
    
    if (Test-Path $fullPath) {
        Write-Host "`n处理文件: $file" -ForegroundColor Yellow
        
        try {
            # 创建备份
            $backupPath = "$fullPath.bak"
            Copy-Item $fullPath $backupPath -Force
            Write-Host "  已创建备份: $backupPath" -ForegroundColor Gray
            
            # 读取文件内容（使用Default编码，通常是系统默认编码）
            $content = Get-Content $fullPath -Raw -Encoding Default
            
            # 检查是否有乱码
            if ($content -match '[\u4e00-\u9fa5]') {
                Write-Host "  检测到中文字符，但可能是乱码" -ForegroundColor Gray
            }
            
            # 尝试从GB2312/GBK读取
            try {
                $encoding = [System.Text.Encoding]::GetEncoding("GB2312")
                $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                $content = $encoding.GetString($bytes)
                
                # 保存为UTF-8（不带BOM）
                $utf8NoBom = New-Object System.Text.UTF8Encoding $False
                [System.IO.File]::WriteAllText($fullPath, $content, $utf8NoBom)
                
                Write-Host "  ✓ 成功修复编码" -ForegroundColor Green
                $fixedCount++
            } catch {
                Write-Host "  ✗ 编码转换失败: $_" -ForegroundColor Red
                # 恢复备份
                Copy-Item $backupPath $fullPath -Force
                Write-Host "  已恢复备份" -ForegroundColor Yellow
                $errorCount++
            }
            
        } catch {
            Write-Host "  ✗ 处理失败: $_" -ForegroundColor Red
            $errorCount++
        }
    } else {
        Write-Host "`n文件不存在: $file" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "编码修复完成！" -ForegroundColor Cyan
Write-Host "成功修复: $fixedCount 个文件" -ForegroundColor Green
Write-Host "失败: $errorCount 个文件" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Gray" })
Write-Host "`n提示：原文件已备份为 .bak 文件" -ForegroundColor Gray
Write-Host "如果修复成功，可以运行 'npm run build' 来验证" -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Cyan

