# 编码问题分析脚本
# 检测文件编码并尝试识别乱码模式

Write-Host "=== 文件编码分析工具 ===" -ForegroundColor Cyan
Write-Host ""

# 需要检查的文件
$targetFiles = @(
    "frontend\components\analytics\ReportManagement.tsx",
    "frontend\components\auth\MFAWizard.tsx",
    "frontend\components\auth\BackupCodes.tsx",
    "frontend\components\auth\LoginPrompt.tsx"
)

$baseDir = "D:\myproject\Test-Web"
$results = @()

foreach ($file in $targetFiles) {
    $fullPath = Join-Path $baseDir $file
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "文件不存在: $file" -ForegroundColor Red
        continue
    }
    
    Write-Host "分析文件: $file" -ForegroundColor Yellow
    
    try {
        # 检测BOM
        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        $hasBOM = $false
        $bomType = "None"
        
        if ($bytes.Length -ge 3) {
            if ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
                $hasBOM = $true
                $bomType = "UTF-8"
            } elseif ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
                $hasBOM = $true
                $bomType = "UTF-16 LE"
            } elseif ($bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) {
                $hasBOM = $true
                $bomType = "UTF-16 BE"
            }
        }
        
        # 读取内容并检查乱码字符
        $content = Get-Content $fullPath -Raw -Encoding UTF8
        
        # 统计特殊字符
        $replacementChar = [char]0xFFFD  # �
        $replacementCount = ($content.ToCharArray() | Where-Object { $_ -eq $replacementChar }).Count
        
        # 检测常见的乱码模式
        $hasGarbledChinese = $content -match '[\u4e00-\u9fa5][^\u4e00-\u9fa5]{0,2}�'
        $hasIncompleteChars = $content -match '�'
        
        # 获取文件大小
        $fileSize = (Get-Item $fullPath).Length
        
        # 尝试不同编码读取
        $encodings = @{
            'UTF8' = [System.Text.Encoding]::UTF8
            'GB2312' = [System.Text.Encoding]::GetEncoding('GB2312')
            'GBK' = [System.Text.Encoding]::GetEncoding('GBK')
            'Big5' = [System.Text.Encoding]::GetEncoding('Big5')
            'Default' = [System.Text.Encoding]::Default
        }
        
        $bestEncoding = "Unknown"
        $minReplacementChars = [int]::MaxValue
        
        foreach ($encName in $encodings.Keys) {
            try {
                $enc = $encodings[$encName]
                $testContent = $enc.GetString($bytes)
                $testReplacementCount = ($testContent.ToCharArray() | Where-Object { $_ -eq $replacementChar }).Count
                
                if ($testReplacementCount -lt $minReplacementChars) {
                    $minReplacementChars = $testReplacementCount
                    $bestEncoding = $encName
                }
            } catch {
                # 某些编码可能不可用
            }
        }
        
        $result = [PSCustomObject]@{
            File = $file
            Size = $fileSize
            HasBOM = $hasBOM
            BOMType = $bomType
            ReplacementChars = $replacementCount
            HasGarbledChinese = $hasGarbledChinese
            BestEncoding = $bestEncoding
            MinReplacementChars = $minReplacementChars
        }
        
        $results += $result
        
        Write-Host "  BOM: $bomType ($hasBOM)" -ForegroundColor Gray
        Write-Host "  乱码字符数: $replacementCount" -ForegroundColor $(if ($replacementCount -gt 0) { "Red" } else { "Green" })
        Write-Host "  推荐编码: $bestEncoding (乱码数: $minReplacementChars)" -ForegroundColor Gray
        Write-Host ""
        
    } catch {
        Write-Host "  错误: $_" -ForegroundColor Red
        Write-Host ""
    }
}

# 生成详细报告
Write-Host "=== 分析摘要 ===" -ForegroundColor Cyan
Write-Host ""

$results | Format-Table File, Size, BOMType, ReplacementChars, BestEncoding -AutoSize

# 保存JSON报告
$jsonPath = "D:\myproject\Test-Web\encoding-analysis-report.json"
$results | ConvertTo-Json -Depth 3 | Out-File $jsonPath -Encoding UTF8
Write-Host "详细报告已保存: $jsonPath" -ForegroundColor Green

Write-Host ""
Write-Host "=== 建议 ===" -ForegroundColor Cyan

$hasProblems = $results | Where-Object { $_.ReplacementChars -gt 0 }
if ($hasProblems) {
    Write-Host "发现 $($hasProblems.Count) 个文件有编码问题" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "可能的解决方案:" -ForegroundColor White
    Write-Host "1. 如果文件在Git中，尝试从历史版本恢复" -ForegroundColor Gray
    Write-Host "2. 使用专业编辑器（如VS Code）检查并修复" -ForegroundColor Gray
    Write-Host "3. 根据上下文手动重写损坏的中文文本" -ForegroundColor Gray
} else {
    Write-Host "所有文件编码正常！" -ForegroundColor Green
}

Write-Host ""

