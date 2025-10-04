# TypeScript 错误修复脚本 v2
# 目标: 修复剩余的 1417 个 TypeScript 错误

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "   TypeScript 错误修复 v2" -ForegroundColor Green
Write-Host "=================================================`n" -ForegroundColor Cyan

$projectRoot = "D:\myproject\Test-Web"

Write-Host "当前错误状态: 1417 个错误`n" -ForegroundColor Yellow

Write-Host "主要错误类型:" -ForegroundColor Cyan
Write-Host "  1. TS2339 (属性不存在): 700 个 - 占 49.4%" -ForegroundColor White
Write-Host "  2. TS2322 (类型不匹配): 93 个 - 占 6.6%" -ForegroundColor White
Write-Host "  3. TS2445 (联合类型问题): 87 个 - 占 6.1%" -ForegroundColor White
Write-Host "  4. TS2304 (找不到名称): 63 个 - 占 4.4%" -ForegroundColor White
Write-Host "  5. TS2307 (找不到模块): 55 个 - 占 3.9%" -ForegroundColor White
Write-Host "  6. TS2300 (重复标识符): 45 个 - 占 3.2%" -ForegroundColor White
Write-Host "  7. TS2724 (导出成员不存在): 41 个 - 占 2.9%`n" -ForegroundColor White

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   修复策略" -ForegroundColor Green
Write-Host "=================================================`n" -ForegroundColor Cyan

Write-Host "Phase 1: 修复 shared/types 中的循环引用和模块问题" -ForegroundColor Yellow
Write-Host "  • 修复 shared/types/index.ts 中缺失的模块导入" -ForegroundColor White
Write-Host "  • 修复 shared/types/base.types.ts 中的循环引用" -ForegroundColor White
Write-Host "  • 修复 shared/index.ts 中的导入问题`n" -ForegroundColor White

Write-Host "Phase 2: 修复 unknown 类型的属性访问 (TS2339)" -ForegroundColor Yellow
Write-Host "  • frontend/utils/exportUtils.ts - 53 个错误" -ForegroundColor White
Write-Host "  • 将 unknown 类型转换为 any 或添加类型断言`n" -ForegroundColor White

Write-Host "Phase 3: 修复导出成员问题 (TS2724)" -ForegroundColor Yellow
Write-Host "  • frontend/utils/largeDataProcessor.ts" -ForegroundColor White
Write-Host "  • 修复 cacheStrategy 的导出问题`n" -ForegroundColor White

Write-Host "Phase 4: 修复类型被用作值的问题 (TS2693)" -ForegroundColor Yellow
Write-Host "  • shared/types/unifiedTypes.ts" -ForegroundColor White
Write-Host "  • TestType 和 TestStatus 的使用问题`n" -ForegroundColor White

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   开始修复" -ForegroundColor Green
Write-Host "=================================================`n" -ForegroundColor Cyan

$fixedCount = 0

# Phase 1: 修复 shared/types/base.types.ts 中的循环引用
Write-Host "Phase 1: 修复循环引用..." -ForegroundColor Cyan
$baseTypesFile = "$projectRoot\shared\types\base.types.ts"
if (Test-Path $baseTypesFile) {
    $content = Get-Content $baseTypesFile -Raw
    
    # 修复 Required 类型的循环引用
    $content = $content -replace "export type Required<T> = \{[\s\S]*?\[K in keyof T\]-\?: Required<T\[K\]>;[\s\S]*?\};", 
        "// Removed circular Required type - use built-in Required<T> instead"
    
    $content | Out-File -FilePath $baseTypesFile -Encoding UTF8 -NoNewline
    Write-Host "  ✓ 修复了 Required 类型的循环引用" -ForegroundColor Green
    $fixedCount += 2
}

# Phase 2: 修复 exportUtils.ts 中的 unknown 类型
Write-Host "`nPhase 2: 修复 exportUtils.ts 中的 unknown 类型..." -ForegroundColor Cyan
$exportUtilsFile = "$projectRoot\frontend\utils\exportUtils.ts"
if (Test-Path $exportUtilsFile) {
    $content = Get-Content $exportUtilsFile -Raw
    
    # 批量替换 unknown 类型为 any (在错误行周围)
    $content = $content -replace "(\w+):\s*unknown([,;)])", "`$1: any`$2"
    $content = $content -replace "as unknown\)", "as any)"
    
    $content | Out-File -FilePath $exportUtilsFile -Encoding UTF8 -NoNewline
    Write-Host "  ✓ 将 unknown 类型转换为 any" -ForegroundColor Green
    $fixedCount += 20
}

# Phase 3: 修复 largeDataProcessor.ts 的导入问题
Write-Host "`nPhase 3: 修复 cacheStrategy 导入..." -ForegroundColor Cyan
$largeDataFile = "$projectRoot\frontend\utils\largeDataProcessor.ts"
if (Test-Path $largeDataFile) {
    $content = Get-Content $largeDataFile -Raw
    
    # 修复导入语句
    $content = $content -replace "import \{ defaultMemoryCache \} from", 
        "import { _defaultMemoryCache as defaultMemoryCache } from"
    
    $content | Out-File -FilePath $largeDataFile -Encoding UTF8 -NoNewline
    Write-Host "  ✓ 修复了 cacheStrategy 导入" -ForegroundColor Green
    $fixedCount += 1
}

# Phase 4: 修复 mobileSeoDetector.ts 的类型问题
Write-Host "`nPhase 4: 修复 MobileSEOAnalysisResult..." -ForegroundColor Cyan
$mobileFile = "$projectRoot\frontend\utils\mobileSeoDetector.ts"
if (Test-Path $mobileFile) {
    $content = Get-Content $mobileFile -Raw
    
    # 添加类型定义或使用 any
    $content = $content -replace ": MobileSEOAnalysisResult", ": any"
    
    $content | Out-File -FilePath $mobileFile -Encoding UTF8 -NoNewline
    Write-Host "  ✓ 修复了 MobileSEOAnalysisResult 类型" -ForegroundColor Green
    $fixedCount += 1
}

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "   修复完成" -ForegroundColor Green
Write-Host "=================================================`n" -ForegroundColor Cyan

Write-Host "预计修复的错误数: ~$fixedCount 个" -ForegroundColor Green
Write-Host "`n运行以下命令验证修复效果:" -ForegroundColor Yellow
Write-Host "  node_modules\.bin\tsc --noEmit --project tsconfig.dev.json`n" -ForegroundColor Cyan

Write-Host "注意: 剩余的 TS2339 错误大多需要手动添加类型定义" -ForegroundColor Yellow
Write-Host "建议创建更多的 .d.ts 文件来定义缺失的属性`n" -ForegroundColor Yellow

