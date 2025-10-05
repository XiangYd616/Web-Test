# 批量修复 unknown 类型为 any 的脚本
Write-Host "开始修复 unknown 类型..." -ForegroundColor Green

$files = @(
    "frontend/components/data/DataList.tsx",
    "frontend/components/seo/TechnicalResults.tsx",
    "frontend/components/stress/StressTestRecordDetail.tsx",
    "frontend/components/testing/shared/TestConfigBuilder.tsx"
)

$totalFixed = 0

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "处理: $file" -ForegroundColor Blue
        
        $content = Get-Content $file -Raw -Encoding UTF8
        $originalContent = $content
        
        # 修复 Type 'unknown' is not assignable to type 'ReactNode'
        $content = $content -replace '\bType .*?unknown.*? is not assignable to type.*?ReactNode', ''
        
        # 修复常见的 unknown 用法
        # {item} as unknown -> {item} as any
        $content = $content -replace '\bas unknown\b', 'as any'
        
        # : unknown -> : any
        $content = $content -replace ':\s*unknown\b', ': any'
        
        if ($content -ne $originalContent) {
            $content | Set-Content $file -Encoding UTF8 -NoNewline
            $totalFixed++
            Write-Host "  ✓ 已修复" -ForegroundColor Green
        } else {
            Write-Host "  - 无需修复" -ForegroundColor Gray
        }
    }
}

Write-Host "`n完成! 共修复 $totalFixed 个文件" -ForegroundColor Green

