# 分析和修复带下划线开头的导出函数
# 这个脚本会找到所有以下划线开头的导出函数，并检查它们的使用情况

Write-Host "分析带下划线的导出函数..." -ForegroundColor Cyan

$frontendPath = "D:\myproject\Test-Web\frontend"
$results = @()

# 查找所有带下划线的导出函数
Write-Host "`n正在搜索带下划线的导出函数..." -ForegroundColor Yellow

$pattern = "export\s+(const|function)\s+_\w+"
$files = Get-ChildItem -Path $frontendPath -Recurse -Include *.ts,*.tsx | 
    Where-Object { $_.FullName -notmatch "node_modules|dist|build" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $matches = [regex]::Matches($content, $pattern)
    
    if ($matches.Count -gt 0) {
        foreach ($match in $matches) {
            # 提取函数名
            $functionMatch = [regex]::Match($match.Value, "_\w+")
            if ($functionMatch.Success) {
                $functionName = $functionMatch.Value
                
                # 检查在其他文件中的使用情况
                $usageCount = 0
                $usageFiles = @()
                
                foreach ($searchFile in $files) {
                    if ($searchFile.FullName -ne $file.FullName) {
                        $searchContent = Get-Content $searchFile.FullName -Raw
                        if ($searchContent -match $functionName) {
                            $usageCount++
                            $usageFiles += $searchFile.Name
                        }
                    }
                }
                
                $results += [PSCustomObject]@{
                    File = $file.Name
                    FunctionName = $functionName
                    UsageCount = $usageCount
                    UsageFiles = ($usageFiles -join ", ")
                    FullPath = $file.FullName
                }
            }
        }
    }
}

# 显示结果
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "分析结果" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "总共找到 $($results.Count) 个带下划线的导出函数`n" -ForegroundColor Green

# 按使用次数分组
$unused = $results | Where-Object { $_.UsageCount -eq 0 }
$used = $results | Where-Object { $_.UsageCount -gt 0 }

Write-Host "未使用的函数 ($($unused.Count)):" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
if ($unused.Count -gt 0) {
    $unused | Format-Table File, FunctionName -AutoSize | Out-String | Write-Host
    Write-Host "建议: 这些函数可以移除'export'关键字或完全删除`n" -ForegroundColor Gray
} else {
    Write-Host "无`n" -ForegroundColor Gray
}

Write-Host "已使用的函数 ($($used.Count)):" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
if ($used.Count -gt 0) {
    $used | Format-Table File, FunctionName, UsageCount, UsageFiles -AutoSize | Out-String | Write-Host
    Write-Host "建议: 这些函数应该去掉下划线前缀，改为正常的导出函数名`n" -ForegroundColor Gray
} else {
    Write-Host "无`n" -ForegroundColor Gray
}

# 导出详细报告到文件
$reportPath = "D:\myproject\Test-Web\underscore-exports-report.json"
$results | ConvertTo-Json -Depth 3 | Out-File $reportPath -Encoding UTF8
Write-Host "详细报告已保存到: $reportPath" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "推荐的修复步骤:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. 对于未使用的函数:" -ForegroundColor White
Write-Host "   - 如果是临时禁用的,添加注释说明" -ForegroundColor Gray
Write-Host "   - 如果确实不需要,直接删除" -ForegroundColor Gray
Write-Host "   - 如果是内部函数,移除export关键字" -ForegroundColor Gray
Write-Host "" 

Write-Host "2. 对于已使用的函数:" -ForegroundColor White
Write-Host "   - 去掉下划线前缀" -ForegroundColor Gray
Write-Host "   - 更新所有引用该函数的地方" -ForegroundColor Gray
Write-Host "   - 确保遵循命名规范" -ForegroundColor Gray
Write-Host ""

Write-Host "3. 运行测试验证:" -ForegroundColor White
Write-Host "   npm run type-check" -ForegroundColor Gray
Write-Host "   npm run lint" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan

