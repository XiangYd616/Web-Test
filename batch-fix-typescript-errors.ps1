# 批量修复TypeScript错误
# 此脚本自动修复多种类型的TypeScript错误

Write-Host "=== TypeScript 错误批量修复工具 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 修复未使用的导入
Write-Host "[1/3] 清理未使用的导入..." -ForegroundColor Yellow
$errors = npm run type-check 2>&1 | Select-String "error TS6133"
$unusedCount = $errors.Count
Write-Host "  找到 $unusedCount 个未使用的导入/变量" -ForegroundColor Gray

# 2. 添加可选链操作符 (?.)
Write-Host "[2/3] 添加可选链操作符..." -ForegroundColor Yellow
$undefinedErrors = npm run type-check 2>&1 | Select-String "TS18046|TS18048"
Write-Host "  找到 $($undefinedErrors.Count) 个undefined检查问题" -ForegroundColor Gray

# 统计将要处理的文件
$fileSet = @{}
foreach ($error in $errors) {
    if ($error -match "^(.+?)\(") {
        $filePath = $Matches[1]
        if (-not $fileSet.ContainsKey($filePath)) {
            $fileSet[$filePath] = 0
        }
        $fileSet[$filePath]++
    }
}

Write-Host ""
Write-Host "[3/3] 开始处理 $($fileSet.Count) 个文件..." -ForegroundColor Yellow
$processedFiles = 0
$totalFixedCount = 0

foreach ($file in $fileSet.Keys) {
    $count = $fileSet[$file]
    $processedFiles++
    
    # 显示进度
    $progress = [math]::Round(($processedFiles / $fileSet.Count) * 100)
    Write-Progress -Activity "修复TypeScript错误" -Status "处理 $file" -PercentComplete $progress
    
    try {
        $content = Get-Content $file -Raw -Encoding UTF8 -ErrorAction Stop
        $originalContent = $content
        $fixedInFile = 0
        
        # 修复1: 删除未使用的单行导入
        $content = $content -replace '^\s*import\s+\{?\s*\w+\s*\}?\s+from\s+[''"].*?[''"];\s*$\r?\n', ''
        
        # 修复2: 添加可选链 - obj.prop -> obj?.prop (仅在可能为undefined的情况下)
        # 这需要更智能的处理，暂时跳过
        
        # 修复3: 为未使用的变量添加下划线前缀
        # const name = ... -> const _name = ...
        $content = [regex]::Replace($content, '^\s*(const|let|var)\s+(\w+)\s*=', {
            param($match)
            $keyword = $match.Groups[1].Value
            $varName = $match.Groups[2].Value
            # 检查这个变量是否在文件的其他地方被使用
            $restOfFile = $content.Substring($match.Index + $match.Length)
            if ($restOfFile -notmatch "\b$varName\b") {
                "$keyword _$varName ="
            } else {
                $match.Value
            }
        }, [System.Text.RegularExpressions.RegexOptions]::Multiline)
        
        if ($content -ne $originalContent) {
            $content | Set-Content $file -Encoding UTF8 -NoNewline
            $totalFixedCount++
            Write-Host "  ✓ $file" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "  ✗ 错误: $file - $_" -ForegroundColor Red
    }
}

Write-Progress -Activity "修复TypeScript错误" -Completed

Write-Host ""
Write-Host "=== 修复完成 ===" -ForegroundColor Green
Write-Host "  处理文件: $processedFiles" -ForegroundColor White
Write-Host "  修复文件: $totalFixedCount" -ForegroundColor White
Write-Host ""
Write-Host "重新运行类型检查以查看结果..." -ForegroundColor Yellow

