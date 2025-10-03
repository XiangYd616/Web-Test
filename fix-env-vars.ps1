# 批量修复环境变量使用
Write-Host "Starting environment variable fix..." -ForegroundColor Cyan

$files = @(
    "frontend\components\scheduling\TestScheduler.tsx",
    "frontend\components\security\SecurityTestPanel.tsx",
    "frontend\components\testing\TestEngineStatus.tsx",
    "frontend\hooks\useNetworkTestState.ts",
    "frontend\pages\advanced\TestTemplates.tsx",
    "frontend\pages\CompatibilityTest.tsx",
    "frontend\pages\DatabaseTest.tsx",
    "frontend\pages\NetworkTest.tsx",
    "frontend\services\api\test\testApiClient.ts",
    "frontend\services\testing\unifiedTestService.ts",
    "frontend\services\batchTestingService.tsx",
    "frontend\services\integrationService.ts"
)

$baseDir = "D:\myproject\Test-Web"
$fixedCount = 0

foreach ($file in $files) {
    $fullPath = Join-Path $baseDir $file
    
    if (Test-Path $fullPath) {
        Write-Host "Processing: $file" -ForegroundColor Yellow
        
        try {
            $content = Get-Content $fullPath -Raw
            $originalContent = $content
            
            # Replace REQUEST_TIMEOUT
            $content = $content -replace 'process\.env\.REQUEST_TIMEOUT', 'Number(import.meta.env.VITE_REQUEST_TIMEOUT)'
            
            # Replace NEXT_PUBLIC_API_URL
            $content = $content -replace 'process\.env\.NEXT_PUBLIC_API_URL', 'import.meta.env.VITE_API_URL'
            
            if ($content -ne $originalContent) {
                $content | Set-Content $fullPath -NoNewline
                Write-Host "  Fixed!" -ForegroundColor Green
                $fixedCount++
            } else {
                Write-Host "  No changes needed" -ForegroundColor Gray
            }
        } catch {
            Write-Host "  Error: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`nFixed $fixedCount files" -ForegroundColor Green
Write-Host "Run 'npm run type-check' to verify" -ForegroundColor Cyan

