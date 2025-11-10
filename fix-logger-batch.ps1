# Batch fix for remaining Logger call type errors
# This script wraps error arguments with { error: String(error) }

$ErrorActionPreference = "Stop"

$files = @(
    "frontend/services/state/stateManager.ts",
    "frontend/services/stressTestQueueManager.ts",
    "frontend/services/stressTestRecordService.ts",
    "frontend/services/systemResourceMonitor.ts",
    "frontend/services/userFeedbackService.ts",
    "frontend/services/userStatsService.ts",
    "frontend/utils/browserSupport.ts",
    "frontend/utils/coreWebVitalsAnalyzer.ts",
    "frontend/utils/cssLoader.ts",
    "frontend/utils/MobileSEODetector.ts",
    "frontend/utils/performanceOptimization.ts"
)

Write-Host "Fixing Logger calls in $($files.Count) files..." -ForegroundColor Green

$totalFixed = 0

foreach ($file in $files) {
    $filePath = Join-Path $PSScriptRoot $file
    
    if (-not (Test-Path $filePath)) {
        Write-Host "Skipping $file (not found)" -ForegroundColor Yellow
        continue
    }
    
    $content = Get-Content $filePath -Raw -Encoding UTF8
    $originalContent = $content
    
    # Pattern 1: Logger.xxx('message', error)
    $content = $content -replace "Logger\.(error|warn)\(([^,]+),\s*error\)", 'Logger.$1($2, { error: String(error) })'
    
    # Pattern 2: Logger.xxx('message', stepError)
    $content = $content -replace "Logger\.(error|warn)\(([^,]+),\s*stepError\)", 'Logger.$1($2, { error: String(stepError) })'
    
    # Pattern 3: Logger.xxx('message', err)
    $content = $content -replace "Logger\.(error|warn)\(([^,]+),\s*err\)", 'Logger.$1($2, { error: String(err) })'
    
    # Pattern 4: Logger.xxx('message', e)
    $content = $content -replace "Logger\.(error|warn)\(([^,]+),\s*e\)", 'Logger.$1($2, { error: String(e) })'
    
    if ($content -ne $originalContent) {
        Set-Content $filePath $content -Encoding UTF8 -NoNewline
        Write-Host "✓ Fixed $file" -ForegroundColor Green
        $totalFixed++
    } else {
        Write-Host "- No changes needed in $file" -ForegroundColor Gray
    }
}

Write-Host "`nFixed $totalFixed files" -ForegroundColor Cyan
Write-Host "Running type-check..." -ForegroundColor Cyan

npm run type-check 2>&1 | Select-String "TS\d{4}:" | Measure-Object -Line

