# 命名批量清理脚本
# 自动替换所有文件中的/命名

$ErrorActionPreference = "Stop"

Write-Host "🧹 开始批量清理命名..." -ForegroundColor Cyan

# 定义替换规则
$replacements = @(
    # 类名和接口名
    @{ Pattern = 'TestEngine(?!Hook)'; Replacement = 'TestEngine' }
    @{ Pattern = 'EngineWebSocketHandler'; Replacement = 'EngineWebSocketHandler' }
    @{ Pattern = 'TestService'; Replacement = 'TestService' }
    @{ Pattern = 'PerformanceTest'; Replacement = 'PerformanceTest' }
    @{ Pattern = 'BackgroundTestManager'; Replacement = 'BackgroundTestManager' }
    
    # 变量名和函数名
    @{ Pattern = 'TestEngine'; Replacement = 'testEngine' }
    @{ Pattern = 'EngineWSHandler'; Replacement = 'engineWSHandler' }
    @{ Pattern = 'TestService'; Replacement = 'testService' }
    @{ Pattern = 'APIDoc'; Replacement = 'apiDoc' }
    @{ Pattern = 'EngineAPIDoc'; Replacement = 'engineAPIDoc' }
    
    # 函数名
    @{ Pattern = 'createEngineWebSocketMiddleware'; Replacement = 'createEngineWebSocketMiddleware' }
    @{ Pattern = 'getEngineWSHandler'; Replacement = 'getEngineWSHandler' }
    @{ Pattern = 'useTestEngine'; Replacement = 'useTestEngine' }
    
    # API路径
    @{ Pattern = '/api/-engine'; Replacement = '/api/engine' }
    @{ Pattern = '-engine'; Replacement = 'engine' }
    
    # 日志和服务名
    @{ Pattern = '-engine-ws'; Replacement = 'engine-ws' }
    
    # 中文描述
    @{ Pattern = '统一测试引擎'; Replacement = '测试引擎' }
    @{ Pattern = '统一引擎'; Replacement = '引擎' }
)

# 获取所有需要处理的文件
$files = @(
    Get-ChildItem -Path "frontend\services" -Include "*.ts","*.tsx" -Recurse -File |
    Where-Object { $_.FullName -notmatch 'node_modules' }
    
    Get-ChildItem -Path "backend" -Include "*.js" -Recurse -File |
    Where-Object { $_.FullName -notmatch 'node_modules' }
)

$totalFiles = $files.Count
$processedFiles = 0
$modifiedFiles = 0

Write-Host "📁 找到 $totalFiles 个文件需要检查" -ForegroundColor Yellow

foreach ($file in $files) {
    $processedFiles++
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
    
    Write-Progress -Activity "处理文件" -Status "$processedFiles/$totalFiles - $relativePath" -PercentComplete (($processedFiles / $totalFiles) * 100)
    
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    $fileModified = $false
    
    foreach ($rule in $replacements) {
        if ($content -match $rule.Pattern) {
            $content = $content -replace $rule.Pattern, $rule.Replacement
            $fileModified = $true
        }
    }
    
    if ($fileModified) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $modifiedFiles++
        Write-Host "  ✅ $relativePath" -ForegroundColor Green
    }
}

Write-Progress -Activity "处理文件" -Completed

Write-Host ""
Write-Host "✨ 清理完成！" -ForegroundColor Green
Write-Host "  处理文件: $processedFiles" -ForegroundColor Cyan
Write-Host "  修改文件: $modifiedFiles" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 建议下一步操作:" -ForegroundColor Cyan
Write-Host "  1. 检查修改: git diff" -ForegroundColor White
Write-Host "  2. 运行测试: npm run type-check" -ForegroundColor White
Write-Host "  3. 提交更改: git add -A && git commit -m 'refactor: 批量清理命名'" -ForegroundColor White
