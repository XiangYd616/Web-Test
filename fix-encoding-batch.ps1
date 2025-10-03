# 批量修复编码问题脚本
# 自动替换已知的乱码模式

$ErrorActionPreference = "Stop"

# 定义替换映射
$replacements = @{
    "多因素认�?" = "多因素认证"
    "重要一�?" = "重要一步"
    "的优�?" = "的优势"
    "验证�?" = "验证器"
    "工作正�?" = "工作正常"
    "此功�?" = "此功能"
    "需要登�?" = "需要登录"
    "您可以�?" = "您可以："
    "历史记�?" = "历史记录"
    "偏好配�?" = "偏好配置"
    "管理和分�?" = "管理和分析"
    "备份代�?" = "备份代码"
    "剪贴�?" = "剪贴板"
    "已下�?" = "已下载"
    "使用一�?" = "使用一次"
    "已完�?" = "已完成"
    "生成�?" = "生成中"
    "总大�?" = "总大小"
    "筛�?" = "筛选"
    "状�?" = "状态"
    "帮�?" = "帮助"
    "设�?" = "设置"
    "•••�?•••�?•••�?" = "•••••••••"
    "�?每个" = "注：每个"
}

# 需要修复的文件
$filesToFix = @(
    "src\components\auth\MFAWizard.tsx"
    "src\components\common\LoginPrompt.tsx"
    "src\components\auth\BackupCodes.tsx"
    "src\components\admin\reports\ReportManagement.tsx"
    "src\services\batchTestingService.ts"
)

Write-Host "开始批量修复编码问题..." -ForegroundColor Cyan
Write-Host "工作目录: D:\myproject\Test-Web" -ForegroundColor Gray
Write-Host ""

$fixedCount = 0
$totalReplacements = 0

foreach ($relativePath in $filesToFix) {
    $filePath = Join-Path "D:\myproject\Test-Web" $relativePath
    
    if (-not (Test-Path $filePath)) {
        Write-Host "[跳过] 文件不存在: $relativePath" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "[处理] $relativePath" -ForegroundColor Cyan
    
    try {
        # 读取文件内容 - 尝试使用 UTF-8
        $content = Get-Content -Path $filePath -Raw -Encoding UTF8
        
        if (-not $content) {
            Write-Host "  警告: 文件为空" -ForegroundColor Yellow
            continue
        }
        
        $originalContent = $content
        $fileReplacements = 0
        
        # 应用所有替换
        foreach ($pattern in $replacements.Keys) {
            $replacement = $replacements[$pattern]
            $matches = ([regex]::Matches($content, [regex]::Escape($pattern))).Count
            
            if ($matches -gt 0) {
                $content = $content -replace [regex]::Escape($pattern), $replacement
                $fileReplacements += $matches
                Write-Host "  √ 替换 '$pattern' -> '$replacement' ($matches 处)" -ForegroundColor Green
            }
        }
        
        # 如果有修改，保存文件
        if ($content -ne $originalContent) {
            # 创建备份
            $backupPath = "$filePath.bak"
            Copy-Item -Path $filePath -Destination $backupPath -Force
            Write-Host "  √ 已创建备份: $relativePath.bak" -ForegroundColor Gray
            
            # 保存修复后的内容为 UTF-8 无 BOM
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)
            
            $fixedCount++
            $totalReplacements += $fileReplacements
            Write-Host "  ✓ 完成修复: $fileReplacements 处替换" -ForegroundColor Green
        } else {
            Write-Host "  - 未发现需要修复的内容" -ForegroundColor Gray
        }
        
    } catch {
        Write-Host "  × 错误: $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "修复完成!" -ForegroundColor Green
Write-Host "修复文件数: $fixedCount" -ForegroundColor White
Write-Host "总替换次数: $totalReplacements" -ForegroundColor White
Write-Host ""
Write-Host "备份文件位置: 原文件同目录下的 .bak 文件" -ForegroundColor Yellow
Write-Host ""
Write-Host "建议执行以下步骤验证修复:" -ForegroundColor Cyan
Write-Host "1. npm run lint" -ForegroundColor White
Write-Host "2. npm run type-check" -ForegroundColor White
Write-Host "3. npm run build" -ForegroundColor White
Write-Host ""
Write-Host "如需回滚，请运行以下命令:" -ForegroundColor Yellow

foreach ($relativePath in $filesToFix) {
    $filePath = Join-Path "D:\myproject\Test-Web" $relativePath
    $backupPath = "$filePath.bak"
    if (Test-Path $backupPath) {
        Write-Host "  Move-Item -Path '$backupPath' -Destination '$filePath' -Force" -ForegroundColor Gray
    }
}

