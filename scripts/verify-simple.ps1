# Test-Web Implementation Verification Script

Write-Host "Test-Web Implementation Verification" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Start backend service
Write-Host "`nStarting backend service..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location "D:\myproject\Test-Web\backend"
    node src/app.js 2>&1
}

Start-Sleep 8

Write-Host "`nTesting API Endpoints" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

# Test key API endpoints
$apis = @(
    @{ Path = "/health"; Method = "GET" },
    @{ Path = "/api"; Method = "GET" },
    @{ Path = "/api/auth/login"; Method = "POST" },
    @{ Path = "/api/test"; Method = "POST" },
    @{ Path = "/api/seo"; Method = "POST" },
    @{ Path = "/api/security"; Method = "POST" },
    @{ Path = "/api/engines"; Method = "GET" }
)

$results = @{
    Available = @()
    Missing = @()
    Errors = @()
}

foreach ($api in $apis) {
    try {
        if ($api.Method -eq "GET") {
            $response = Invoke-RestMethod -Uri "http://localhost:3001$($api.Path)" -TimeoutSec 3
            Write-Host "Available: $($api.Path)" -ForegroundColor Green
            $results.Available += $api.Path
        } else {
            $testData = '{"url":"https://example.com"}'
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:3001$($api.Path)" -Method POST -Body $testData -ContentType "application/json" -TimeoutSec 3
                Write-Host "Available: $($api.Path)" -ForegroundColor Green
                $results.Available += $api.Path
            } catch {
                if ($_.Exception.Response.StatusCode -eq 400 -or $_.Exception.Response.StatusCode -eq 401) {
                    Write-Host "Available: $($api.Path) (requires auth)" -ForegroundColor Yellow
                    $results.Available += $api.Path
                } else {
                    throw
                }
            }
        }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "Missing: $($api.Path)" -ForegroundColor Red
            $results.Missing += $api.Path
        } else {
            Write-Host "Error: $($api.Path) - $($_.Exception.Message)" -ForegroundColor Yellow
            $results.Errors += $api.Path
        }
    }
}

Stop-Job $backendJob -ErrorAction SilentlyContinue
Remove-Job $backendJob -ErrorAction SilentlyContinue

Write-Host "`nChecking Frontend Pages" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan

$pages = @(
    "frontend/src/pages/Login.tsx",
    "frontend/src/pages/Register.tsx",
    "frontend/src/pages/dashboard/ModernDashboard.tsx",
    "frontend/src/pages/WebsiteTest.tsx",
    "frontend/src/pages/SecurityTest.tsx",
    "frontend/src/pages/PerformanceTest.tsx",
    "frontend/src/pages/SEOTest.tsx",
    "frontend/src/pages/Reports.tsx",
    "frontend/src/components/layout/Layout.tsx"
)

$pageResults = @{
    Implemented = @()
    Missing = @()
}

foreach ($page in $pages) {
    $fullPath = "D:\myproject\Test-Web\$page"
    if (Test-Path $fullPath) {
        Write-Host "Implemented: $page" -ForegroundColor Green
        $pageResults.Implemented += $page
    } else {
        Write-Host "Missing: $page" -ForegroundColor Red
        $pageResults.Missing += $page
    }
}

Write-Host "`nVerification Summary" -ForegroundColor Magenta
Write-Host "===================" -ForegroundColor Magenta

$apiTotal = $apis.Count
$apiAvailable = $results.Available.Count
$pageTotal = $pages.Count
$pageImplemented = $pageResults.Implemented.Count

Write-Host "`nAPI Endpoints: $apiAvailable/$apiTotal available" -ForegroundColor $(if($apiAvailable -eq $apiTotal){'Green'}else{'Yellow'})
Write-Host "Frontend Pages: $pageImplemented/$pageTotal implemented" -ForegroundColor $(if($pageImplemented -eq $pageTotal){'Green'}else{'Yellow'})

$overallScore = [math]::Round((($apiAvailable + $pageImplemented) / ($apiTotal + $pageTotal)) * 100, 1)
Write-Host "`nOverall Implementation: $overallScore%" -ForegroundColor $(if($overallScore -ge 90){'Green'}elseif($overallScore -ge 70){'Yellow'}else{'Red'})

if ($results.Missing.Count -gt 0) {
    Write-Host "`nMissing APIs:" -ForegroundColor Red
    foreach ($missing in $results.Missing) {
        Write-Host "  - $missing" -ForegroundColor Red
    }
}

if ($pageResults.Missing.Count -gt 0) {
    Write-Host "`nMissing Pages:" -ForegroundColor Red
    foreach ($missing in $pageResults.Missing) {
        Write-Host "  - $missing" -ForegroundColor Red
    }
}

if ($overallScore -ge 90) {
    Write-Host "`nConclusion: Excellent! Implementation matches flow charts very well." -ForegroundColor Green
} elseif ($overallScore -ge 70) {
    Write-Host "`nConclusion: Good! Most features implemented, minor gaps exist." -ForegroundColor Yellow
} else {
    Write-Host "`nConclusion: Needs improvement. Significant gaps between flow charts and implementation." -ForegroundColor Red
}
