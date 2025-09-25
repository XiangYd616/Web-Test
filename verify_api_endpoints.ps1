# API端点验证脚本
# 测试后端API端点的可用性

$baseUrl = "http://localhost:3001"
$endpoints = @(
    @{ Path = "/health"; Method = "GET"; Name = "健康检查" },
    @{ Path = "/api"; Method = "GET"; Name = "API文档" },
    @{ Path = "/api/auth/login"; Method = "POST"; Name = "用户登录"; Body = @{ email = "test@example.com"; password = "password" } },
    @{ Path = "/api/test"; Method = "POST"; Name = "通用测试"; Body = @{ url = "https://example.com" } },
    @{ Path = "/api/seo/analyze"; Method = "POST"; Name = "SEO分析"; Body = @{ url = "https://example.com" } },
    @{ Path = "/api/security/quick-check"; Method = "POST"; Name = "安全检查"; Body = @{ url = "https://example.com" } },
    @{ Path = "/api/engines/status"; Method = "GET"; Name = "引擎状态" }
)

Write-Host "开始验证API端点..." -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

$successCount = 0
$totalCount = $endpoints.Count

foreach ($endpoint in $endpoints) {
    $url = $baseUrl + $endpoint.Path
    $method = $endpoint.Method
    $name = $endpoint.Name
    
    try {
        Write-Host "测试: $name ($method $($endpoint.Path))" -ForegroundColor Yellow
        
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
            Write-Host "  ✅ 成功 (状态码: $($response.StatusCode))" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  ⚠️  响应异常 (状态码: $($response.StatusCode))" -ForegroundColor Yellow
        }
    }
    catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -like "*无法连接*" -or $errorMsg -like "*连接超时*" -or $errorMsg -like "*Connection refused*") {
            Write-Host "  ❌ 连接失败 - 服务器未启动" -ForegroundColor Red
        } else {
            Write-Host "  ❌ 错误: $errorMsg" -ForegroundColor Red
        }
    }
    
    Write-Host ""
}

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "验证完成!" -ForegroundColor Cyan
Write-Host "成功: $successCount/$totalCount 个端点" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })

$coveragePercentage = [math]::Round(($successCount / $totalCount) * 100, 1)
Write-Host "覆盖率: $coveragePercentage%" -ForegroundColor $(
    if ($coveragePercentage -ge 80) { "Green" }
    elseif ($coveragePercentage -ge 50) { "Yellow" }
    else { "Red" }
)

if ($successCount -lt $totalCount) {
    Write-Host ""
    Write-Host "建议:" -ForegroundColor Cyan
    Write-Host "1. 确保后端服务器正在运行 (npm run server 或 node backend/src/app.js)" -ForegroundColor White
    Write-Host "2. 检查端口3001是否被占用" -ForegroundColor White
    Write-Host "3. 查看后端日志获取详细错误信息" -ForegroundColor White
}
