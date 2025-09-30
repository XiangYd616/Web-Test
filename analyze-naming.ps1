Write-Host "Analyzing Project File Naming and Structure..." -ForegroundColor Cyan
Write-Host ""

# Check for files with decorative prefixes/suffixes
Write-Host "=== FILES WITH DECORATIVE NAMING ===" -ForegroundColor Yellow
Get-ChildItem -Path "D:\myproject\Test-Web" -Recurse -File -Include *.tsx,*.ts,*.jsx,*.js | Where-Object {
    $_.Name -match "(Modern|Advanced|Enhanced|Real|Unified|Legacy|Simple|Fixed)" -and 
    $_.Directory.Name -notmatch "backup"
} | ForEach-Object { 
    $relativePath = $_.FullName.Replace("D:\myproject\Test-Web\", "")
    Write-Host "  $relativePath" -ForegroundColor White
}

Write-Host ""
Write-Host "=== SERVER FILES ===" -ForegroundColor Yellow
Get-ChildItem -Path "D:\myproject\Test-Web\backend" -File -Filter "server*.js" | ForEach-Object {
    Write-Host "  backend\$($_.Name)" -ForegroundColor White
}

Write-Host ""
Write-Host "=== LAYOUT COMPONENT FILES ===" -ForegroundColor Yellow
Get-ChildItem -Path "D:\myproject\Test-Web\frontend\components" -Recurse -File -Filter "*Layout*.tsx" | ForEach-Object {
    $relativePath = $_.FullName.Replace("D:\myproject\Test-Web\", "")
    Write-Host "  $relativePath" -ForegroundColor White
}

Write-Host ""
Write-Host "=== MODERN PREFIX FILES IN components/modern ===" -ForegroundColor Yellow
Get-ChildItem -Path "D:\myproject\Test-Web\frontend\components\modern" -File -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  frontend\components\modern\$($_.Name)" -ForegroundColor White
}

Write-Host ""
Write-Host "=== SERVICE FILES WITH DECORATORS ===" -ForegroundColor Yellow
Get-ChildItem -Path "D:\myproject\Test-Web\backend\engines\shared\services" -File -Filter "*.js" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  backend\engines\shared\services\$($_.Name)" -ForegroundColor White
}

Write-Host ""
Write-Host "Analysis Complete!" -ForegroundColor Green
