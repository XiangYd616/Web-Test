# Backend API /api prefix checker
# Check for routes that still have /api prefix

param(
    [switch]$Execute = $false
)

$BackendRoot = "D:\myproject\Test-Web-backend\backend"

Write-Host "`n=== Searching for /api prefix in backend routes ===" -ForegroundColor Cyan
Write-Host ""

# Search patterns
$patterns = @(
    "app\.use\(['\`"]\/api\/",
    "app\.(get|post|put|delete|patch)\(['\`"]\/api\/",
    "router\.(get|post|put|delete|patch)\(['\`"]\/api\/"
)

$foundFiles = @()

foreach ($pattern in $patterns) {
    Write-Host "Checking pattern: $pattern" -ForegroundColor Yellow
    
    $files = Get-ChildItem -Path $BackendRoot -Recurse -Include "*.js","*.ts" -File |
             Where-Object { $_.FullName -notmatch "node_modules|\.git|dist|build" }
    
    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        if ($content -match $pattern) {
            if ($foundFiles -notcontains $file.FullName) {
                $foundFiles += $file.FullName
                Write-Host "  Found in: $($file.FullName)" -ForegroundColor Red
                
                # Show matching lines
                $lines = $content -split "`n"
                for ($i = 0; $i -lt $lines.Count; $i++) {
                    if ($lines[$i] -match $pattern) {
                        Write-Host "    Line $($i+1): $($lines[$i].Trim())" -ForegroundColor Gray
                    }
                }
            }
        }
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Total files with /api prefix: $($foundFiles.Count)" -ForegroundColor $(if ($foundFiles.Count -gt 0) { "Yellow" } else { "Green" })

if ($foundFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "Files needing update:" -ForegroundColor Yellow
    foreach ($file in $foundFiles) {
        Write-Host "  - $file" -ForegroundColor White
    }
    
    if ($Execute) {
        Write-Host ""
        Write-Host "Removing /api prefix..." -ForegroundColor Yellow
        
        foreach ($file in $foundFiles) {
            $content = Get-Content $file -Raw -Encoding UTF8
            $originalContent = $content
            
            # Remove /api prefix
            $content = $content -replace "app\.use\(\s*(['\`"])\/api\/", 'app.use($1/'
            $content = $content -replace "app\.(get|post|put|delete|patch)\(\s*(['\`"])\/api\/", 'app.$1($2/'
            $content = $content -replace "router\.(get|post|put|delete|patch)\(\s*(['\`"])\/api\/", 'router.$1($2/'
            
            if ($content -ne $originalContent) {
                Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
                Write-Host "  Updated: $file" -ForegroundColor Green
            }
        }
        
        Write-Host ""
        Write-Host "Update complete!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "To update these files, run:" -ForegroundColor Yellow
        Write-Host "  .\scripts\check-api-prefix.ps1 -Execute" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "No /api prefix found. Backend routes are clean!" -ForegroundColor Green
}

Write-Host ""

