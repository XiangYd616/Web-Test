# 批量清理未使用的导入和变量
# 此脚本分析TypeScript错误并自动删除未使用的导入

Write-Host "开始清理未使用的导入..." -ForegroundColor Green

# 获取所有TS6133错误（未使用的变量/导入）
$errors = npm run type-check 2>&1 | Select-String "error TS6133"

Write-Host "找到 $($errors.Count) 个未使用的导入/变量" -ForegroundColor Yellow

# 提取文件路径和未使用的标识符
$fileChanges = @{}

foreach ($error in $errors) {
    if ($error -match "^(.+?)\((\d+),(\d+)\).*'([^']+)' is declared but") {
        $filePath = $Matches[1]
        $lineNumber = [int]$Matches[2]
        $unusedName = $Matches[4]
        
        if (-not $fileChanges.ContainsKey($filePath)) {
            $fileChanges[$filePath] = @()
        }
        
        $fileChanges[$filePath] += @{
            Line = $lineNumber
            Name = $unusedName
        }
    }
}

Write-Host "涉及 $($fileChanges.Count) 个文件" -ForegroundColor Cyan

# 统计信息
$totalFixed = 0

foreach ($file in $fileChanges.Keys) {
    $changes = $fileChanges[$file]
    Write-Host "处理文件: $file (共 $($changes.Count) 处修改)" -ForegroundColor Blue
    
    try {
        $content = Get-Content $file -Raw -Encoding UTF8
        $lines = Get-Content $file -Encoding UTF8
        
        # 按行号倒序排序，从后往前删除
        $changes = $changes | Sort-Object -Property Line -Descending
        
        foreach ($change in $changes) {
            $lineIndex = $change.Line - 1
            $unusedName = $change.Name
            
            if ($lineIndex -ge 0 -and $lineIndex -lt $lines.Count) {
                $line = $lines[$lineIndex]
                
                # 检查是否是导入语句
                if ($line -match "^\s*import\s+.*$unusedName") {
                    # 如果是单个导入，删除整行
                    if ($line -match "^\s*import\s+\{?\s*$unusedName\s*\}?\s+from") {
                        $lines = $lines[0..($lineIndex-1)] + $lines[($lineIndex+1)..($lines.Count-1)]
                        $totalFixed++
                        Write-Host "  删除未使用的导入: $unusedName (行 $($change.Line))" -ForegroundColor Gray
                    }
                    # 如果是多个导入中的一个，只删除该标识符
                    elseif ($line -match "import\s+\{([^}]+)\}") {
                        $imports = $Matches[1] -split ',' | ForEach-Object { $_.Trim() }
                        $newImports = $imports | Where-Object { $_ -notmatch "^$unusedName$" }
                        
                        if ($newImports.Count -gt 0) {
                            $newLine = $line -replace "\{[^}]+\}", "{ $($newImports -join ', ') }"
                            $lines[$lineIndex] = $newLine
                            $totalFixed++
                            Write-Host "  从导入列表中删除: $unusedName (行 $($change.Line))" -ForegroundColor Gray
                        } else {
                            # 所有导入都没用了，删除整行
                            $lines = $lines[0..($lineIndex-1)] + $lines[($lineIndex+1)..($lines.Count-1)]
                            $totalFixed++
                            Write-Host "  删除空导入行 (行 $($change.Line))" -ForegroundColor Gray
                        }
                    }
                }
                # 对于变量声明，添加下划线前缀表示有意未使用
                elseif ($line -match "^\s*(const|let|var)\s+$unusedName\b" -and $unusedName -notmatch "^_") {
                    $lines[$lineIndex] = $line -replace "\b$unusedName\b", "_$unusedName"
                    $totalFixed++
                    Write-Host "  添加下划线前缀: $unusedName -> _$unusedName (行 $($change.Line))" -ForegroundColor Gray
                }
            }
        }
        
        # 保存修改后的内容
        $lines | Set-Content $file -Encoding UTF8
        
    } catch {
        Write-Host "  错误: $_" -ForegroundColor Red
    }
}

Write-Host "`n完成! 共修复 $totalFixed 处问题" -ForegroundColor Green
Write-Host "重新运行类型检查以验证..." -ForegroundColor Yellow

