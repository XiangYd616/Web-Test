# 简单的未使用导入清理脚本
Write-Host "开始清理未使用的导入..." -ForegroundColor Green

# 获取所有 TS6133 错误
$output = npm run type-check 2>&1
$errors = $output | Select-String "error TS6133"

Write-Host "找到 $($errors.Count) 个未使用的导入/变量" -ForegroundColor Yellow

# 按文件分组
$fileGroups = $errors | Group-Object { 
    if ($_.Line -match '^(.+?)\(') { 
        $Matches[1] 
    } 
}

Write-Host "涉及 $($fileGroups.Count) 个文件" -ForegroundColor Cyan

$fixedCount = 0

foreach ($group in $fileGroups) {
    $filePath = $group.Name
    if (-not $filePath) { continue }
    
    Write-Host "`n处理: $filePath" -ForegroundColor Blue
    
    try {
        $lines = @(Get-Content $filePath -Encoding UTF8)
        $modified = $false
        
        # 提取所有未使用的标识符
        $unusedNames = @()
        foreach ($error in $group.Group) {
            if ($error -match "'([^']+)' is declared but") {
                $unusedNames += $Matches[1]
            }
        }
        
        # 处理每一行
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]
            
            # 检查是否是单个导入语句且该导入未使用
            foreach ($unusedName in $unusedNames) {
                # 完全匹配单个导入: import X from '...'
                if ($line -match "^\s*import\s+$unusedName\s+from\s+") {
                    $lines[$i] = ""
                    $modified = $true
                    $fixedCount++
                    Write-Host "  - 删除未使用的导入: $unusedName" -ForegroundColor Gray
                    break
                }
                # 完全匹配单个导入: import { X } from '...'
                elseif ($line -match "^\s*import\s+\{\s*$unusedName\s*\}\s+from\s+") {
                    $lines[$i] = ""
                    $modified = $true
                    $fixedCount++
                    Write-Host "  - 删除未使用的导入: $unusedName" -ForegroundColor Gray
                    break
                }
            }
        }
        
        if ($modified) {
            # 删除空行（连续的多个空行合并为一个）
            $cleanedLines = @()
            $previousEmpty = $false
            foreach ($line in $lines) {
                $isEmpty = [string]::IsNullOrWhiteSpace($line)
                if (-not ($isEmpty -and $previousEmpty)) {
                    $cleanedLines += $line
                }
                $previousEmpty = $isEmpty
            }
            
            $cleanedLines | Set-Content $filePath -Encoding UTF8
            Write-Host "  ✓ 已更新文件" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "  ✗ 错误: $_" -ForegroundColor Red
    }
}

Write-Host "`n=== 完成 ===" -ForegroundColor Green
Write-Host "共修复 $fixedCount 个未使用的导入" -ForegroundColor White

