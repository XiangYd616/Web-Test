# 分析和统一环境变量命名
# 项目使用Vite，应统一使用VITE_前缀

Write-Host "分析环境变量使用情况..." -ForegroundColor Cyan

$frontendPath = "D:\myproject\Test-Web\frontend"
$results = @{
    ProcessEnv = @()
    ViteEnv = @()
    NextPublic = @()
}

$files = Get-ChildItem -Path $frontendPath -Recurse -Include *.ts,*.tsx,*.js,*.jsx | 
    Where-Object { $_.FullName -notmatch "node_modules|dist|build" }

Write-Host "`n正在扫描文件..." -ForegroundColor Yellow

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $lineNumber = 0
    
    foreach ($line in (Get-Content $file.FullName)) {
        $lineNumber++
        
        # 查找 process.env.XXX
        if ($line -match 'process\.env\.([A-Z_]+)') {
            $envVar = $matches[1]
            if ($envVar -ne 'NODE_ENV') {  # NODE_ENV是标准变量，可以保留
                $results.ProcessEnv += [PSCustomObject]@{
                    File = $file.Name
                    Line = $lineNumber
                    Variable = "process.env.$envVar"
                    Suggestion = "import.meta.env.VITE_$envVar"
                    FullPath = $file.FullName
                }
            }
        }
        
        # 查找 import.meta.env.VITE_XXX (正确的用法)
        if ($line -match 'import\.meta\.env\.VITE_([A-Z_]+)') {
            $envVar = $matches[1]
            $results.ViteEnv += [PSCustomObject]@{
                File = $file.Name
                Line = $lineNumber
                Variable = "import.meta.env.VITE_$envVar"
                FullPath = $file.FullName
            }
        }
        
        # 查找 NEXT_PUBLIC_ (错误的前缀)
        if ($line -match 'NEXT_PUBLIC_([A-Z_]+)') {
            $envVar = $matches[1]
            $results.NextPublic += [PSCustomObject]@{
                File = $file.Name
                Line = $lineNumber
                Variable = "NEXT_PUBLIC_$envVar"
                Suggestion = "VITE_$envVar"
                FullPath = $file.FullName
            }
        }
    }
}

# 显示结果
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "环境变量分析结果" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "项目使用 Vite 构建工具" -ForegroundColor Green
Write-Host "推荐的环境变量格式: import.meta.env.VITE_XXX`n" -ForegroundColor Green

# Process.env使用情况
Write-Host "使用 process.env 的情况 ($($results.ProcessEnv.Count)):" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
if ($results.ProcessEnv.Count -gt 0) {
    $results.ProcessEnv | Format-Table File, Line, Variable, Suggestion -AutoSize | Out-String | Write-Host
    Write-Host "问题: 在Vite项目中应使用 import.meta.env 而非 process.env" -ForegroundColor Red
    Write-Host "影响: 可能导致环境变量在生产构建中无法正确读取`n" -ForegroundColor Red
} else {
    Write-Host "无`n" -ForegroundColor Gray
}

# NEXT_PUBLIC使用情况
Write-Host "使用 NEXT_PUBLIC_ 前缀的情况 ($($results.NextPublic.Count)):" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
if ($results.NextPublic.Count -gt 0) {
    $results.NextPublic | Format-Table File, Line, Variable, Suggestion -AutoSize | Out-String | Write-Host
    Write-Host "问题: NEXT_PUBLIC_ 是 Next.js 的约定，不适用于 Vite 项目" -ForegroundColor Red
    Write-Host "影响: 这些环境变量将无法被正确识别和替换`n" -ForegroundColor Red
} else {
    Write-Host "无`n" -ForegroundColor Gray
}

# 正确使用情况
Write-Host "正确使用 VITE_ 前缀的情况 ($($results.ViteEnv.Count)):" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
if ($results.ViteEnv.Count -gt 0) {
    # 只显示前10个示例
    $results.ViteEnv | Select-Object -First 10 | Format-Table File, Line, Variable -AutoSize | Out-String | Write-Host
    if ($results.ViteEnv.Count -gt 10) {
        Write-Host "... 以及其他 $($results.ViteEnv.Count - 10) 个使用" -ForegroundColor Gray
    }
    Write-Host "状态: 这些使用是正确的`n" -ForegroundColor Green
} else {
    Write-Host "无`n" -ForegroundColor Gray
}

# 导出详细报告
$reportPath = "D:\myproject\Test-Web\env-variables-report.json"
$results | ConvertTo-Json -Depth 3 | Out-File $reportPath -Encoding UTF8
Write-Host "详细报告已保存到: $reportPath" -ForegroundColor Green

# 统计需要修复的文件
$filesToFix = @()
$filesToFix += $results.ProcessEnv | Select-Object -ExpandProperty FullPath -Unique
$filesToFix += $results.NextPublic | Select-Object -ExpandProperty FullPath -Unique
$filesToFix = $filesToFix | Select-Object -Unique

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "修复建议" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "需要修复的文件数: $($filesToFix.Count)" -ForegroundColor Yellow

Write-Host "`n修复步骤:" -ForegroundColor White
Write-Host ""
Write-Host "1. 在代码中替换环境变量访问方式:" -ForegroundColor White
Write-Host "   将 process.env.XXX 改为 import.meta.env.VITE_XXX" -ForegroundColor Gray
Write-Host "   将 NEXT_PUBLIC_XXX 改为 VITE_XXX" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 在 .env 文件中更新环境变量名:" -ForegroundColor White
Write-Host "   REQUEST_TIMEOUT -> VITE_REQUEST_TIMEOUT" -ForegroundColor Gray
Write-Host "   NEXT_PUBLIC_API_URL -> VITE_API_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 特殊情况处理:" -ForegroundColor White
Write-Host "   - NODE_ENV 保持使用 process.env.NODE_ENV (这是标准)" -ForegroundColor Gray
Write-Host "   - 服务器端代码可以继续使用 process.env" -ForegroundColor Gray
Write-Host ""
Write-Host "4. 验证修复:" -ForegroundColor White
Write-Host "   npm run type-check" -ForegroundColor Gray
Write-Host "   npm run build" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan

# 生成示例.env文件
$envExamplePath = "D:\myproject\Test-Web\.env.example"
Write-Host "`n是否生成 .env.example 文件? (Y/N): " -ForegroundColor Yellow -NoNewline
# 自动生成示例
Write-Host "Y (自动生成)" -ForegroundColor Green

$envContent = @"
# Vite 环境变量配置示例
# 复制此文件为 .env.local 并填入实际值

# API 配置
VITE_API_URL=http://localhost:3000/api
VITE_REQUEST_TIMEOUT=30000

# 安全配置
VITE_MAX_LOGIN_ATTEMPTS=5
VITE_LOCKOUT_DURATION=15
VITE_SESSION_TIMEOUT=86400000

# API 限流
VITE_API_RATE_LIMIT=100
VITE_ADMIN_API_RATE_LIMIT=50

# 功能开关
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=true

# 第三方服务
# VITE_GOOGLE_PAGESPEED_API_KEY=your_api_key_here

# 注意：
# - 所有客户端环境变量必须以 VITE_ 开头
# - 不要在此文件中存储敏感信息
# - .env.local 文件会被 git 忽略
"@

$envContent | Out-File $envExamplePath -Encoding UTF8
Write-Host "Generated .env.example file" -ForegroundColor Green
Write-Host ""

