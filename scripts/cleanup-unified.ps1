# Unified命名批量清理脚本
# 自动替换所有文件中的unified/Unified命名

$ErrorActionPreference = "Stop"

Write-Host "🧹 开始批量清理Unified命名..." -ForegroundColor Cyan

# 定义替换规则
$replacements = @(
    # 类名和接口名
    @{ Pattern = 'UnifiedTestEngine(?!Hook)'; Replacement = 'TestEngine' }
    @{ Pattern = 'UnifiedEngineWebSocketHandler'; Replacement = 'EngineWebSocketHandler' }
    @{ Pattern = 'UnifiedTestService'; Replacement = 'TestService' }
    @{ Pattern = 'UnifiedPerformanceTest'; Replacement = 'PerformanceTest' }
    @{ Pattern = 'UnifiedBackgroundTestManager'; Replacement = 'BackgroundTestManager' }
    
    # 变量名和函数名
    @{ Pattern = 'unifiedTestEngine'; Replacement = 'testEngine' }
    @{ Pattern = 'unifiedEngineWSHandler'; Replacement = 'engineWSHandler' }
    @{ Pattern = 'unifiedTestService'; Replacement = 'testService' }
    @{ Pattern = 'unifiedAPIDoc'; Replacement = 'apiDoc' }
    @{ Pattern = 'unifiedEngineAPIDoc'; Replacement = 'engineAPIDoc' }
    
    # 函数名
    @{ Pattern = 'createUnifiedEngineWebSocketMiddleware'; Replacement = 'createEngineWebSocketMiddleware' }
    @{ Pattern = 'getUnifiedEngineWSHandler'; Replacement = 'getEngineWSHandler' }
    @{ Pattern = 'useUnifiedTestEngine'; Replacement = 'useTestEngine' }
    
    # API路径
    @{ Pattern = '/api/unified-engine'; Replacement = '/api/engine' }
    @{ Pattern = 'unified-engine'; Replacement = 'engine' }
    
    # 日志和服务名
    @{ Pattern = 'unified-engine-ws'; Replacement = 'engine-ws' }
    
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
Write-Host "  3. 提交更改: git add -A && git commit -m 'refactor: 批量清理unified命名'" -ForegroundColor White
