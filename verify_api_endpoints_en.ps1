# API Endpoint Verification Script
# Test backend API endpoint availability

$baseUrl = "http://localhost:3001"
$endpoints = @(
    @{ Path = "/health"; Method = "GET"; Name = "Health Check" },
    @{ Path = "/api"; Method = "GET"; Name = "API Documentation" },
    @{ Path = "/api/auth/login"; Method = "POST"; Name = "User Login"; Body = @{ email = "test@example.com"; password = "password" } },
    @{ Path = "/api/test"; Method = "POST"; Name = "Generic Test"; Body = @{ url = "https://example.com" } },
    @{ Path = "/api/seo/analyze"; Method = "POST"; Name = "SEO Analysis"; Body = @{ url = "https://example.com" } },
    @{ Path = "/api/security/quick-check"; Method = "POST"; Name = "Security Check"; Body = @{ url = "https://example.com" } },
    @{ Path = "/api/engines/status"; Method = "GET"; Name = "Engine Status" },
    @{ Path = "/api/simple/ping"; Method = "GET"; Name = "Simple Ping Test" },
    @{ Path = "/api/engines/capabilities"; Method = "GET"; Name = "Engine Capabilities" },
    @{ Path = "/api/security/capabilities"; Method = "GET"; Name = "Security Capabilities" },
    @{ Path = "/api/seo/health"; Method = "GET"; Name = "SEO Health Check" }
)

Write-Host "Starting API endpoint verification..." -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

$successCount = 0
$totalCount = $endpoints.Count

foreach ($endpoint in $endpoints) {
    $url = $baseUrl + $endpoint.Path
    $method = $endpoint.Method
    $name = $endpoint.Name
    
    try {
        Write-Host "Testing: $name ($method $($endpoint.Path))" -ForegroundColor Yellow
        
        $headers = @{
            'Content-Type' = 'application/json'
            'User-Agent' = 'PowerShell-Verification-Script'
        }
        
        if ($method -eq "GET") {
            $response = Invoke-WebRequest -Uri $url -Method $method -Headers $headers -UseBasicParsing -TimeoutSec 10
        } else {
            $body = $endpoint.Body | ConvertTo-Json
            $response = Invoke-WebRequest -Uri $url -Method $method -Headers $headers -Body $body -UseBasicParsing -TimeoutSec 10
        }
        
        if ($response.StatusCode -eq 200) {
            Write-Host "  Success (Status: $($response.StatusCode))" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  Warning (Status: $($response.StatusCode))" -ForegroundColor Yellow
        }
    }
    catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -like "*ConnectFailure*" -or $errorMsg -like "*Connection refused*") {
            Write-Host "  Failed - Server not running" -ForegroundColor Red
        } else {
            Write-Host "  Error: $errorMsg" -ForegroundColor Red
        }
    }
    
    Write-Host ""
}

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Verification Complete!" -ForegroundColor Cyan
Write-Host "Success: $successCount/$totalCount endpoints" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })

$coveragePercentage = [math]::Round(($successCount / $totalCount) * 100, 1)
Write-Host "Coverage: $coveragePercentage%" -ForegroundColor $(
    if ($coveragePercentage -ge 80) { "Green" }
    elseif ($coveragePercentage -ge 50) { "Yellow" }
    else { "Red" }
)

if ($successCount -lt $totalCount) {
    Write-Host ""
    Write-Host "Suggestions:" -ForegroundColor Cyan
    Write-Host "1. Ensure backend server is running (npm run dev)" -ForegroundColor White
    Write-Host "2. Check if port 3001 is available" -ForegroundColor White
    Write-Host "3. Review backend logs for detailed error information" -ForegroundColor White
}
