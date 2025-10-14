# Test-Web 项目启动脚本

param(
    [string]$Mode = "dev",  # dev, prod, full
    [switch]$SkipCheck,     # 跳过健康检查
    [switch]$Verbose       # 详细输出
)

Write-Host "🚀 启动Test-Web项目..." -ForegroundColor Green
Write-Host "模式: $Mode" -ForegroundColor Cyan

# 设置环境变量
$env:NODE_ENV = if ($Mode -eq "prod") { "production" } else { "development" }
$env:PUPPETEER_SKIP_DOWNLOAD = "true"

# 运行健康检查
if (-not $SkipCheck) {
    Write-Host "`n🔍 运行健康检查..." -ForegroundColor Yellow
    
    $healthCheckScript = ".\scripts\maintenance\health-check.ps1"
    if (Test-Path $healthCheckScript) {
        & $healthCheckScript
        $healthResult = $LASTEXITCODE
        
        if ($healthResult -eq 1) {
            Write-Host "❌ 健康检查发现严重错误，无法继续启动" -ForegroundColor Red
            exit 1
        } elseif ($healthResult -eq 2) {
            Write-Host "⚠️ 健康检查发现警告，继续启动..." -ForegroundColor Yellow
        }
    }
}

# 检查依赖安装
if (-not (Test-Path "node_modules")) {
    Write-Host "`n📦 安装项目依赖..." -ForegroundColor Yellow
    try {
        yarn install --network-timeout 300000
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ 依赖安装失败" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ 无法安装依赖，请检查网络连接" -ForegroundColor Red
        exit 1
    }
}

# 根据模式启动不同服务
switch ($Mode) {
    "dev" {
        Write-Host "`n🔧 启动开发模式 (仅前端)..." -ForegroundColor Cyan
        Write-Host "前端地址: http://localhost:5174" -ForegroundColor Green
        
        if ($Verbose) {
            yarn frontend
        } else {
            yarn frontend 2>&1 | Where-Object { $_ -notmatch "webpack-dev-server|sockjs-node" }
        }
    }
    
    "full" {
        Write-Host "`n🔧 启动完整模式 (前端+后端)..." -ForegroundColor Cyan
        Write-Host "前端地址: http://localhost:5174" -ForegroundColor Green
        Write-Host "后端地址: http://localhost:3001" -ForegroundColor Green
        
        # 使用并发启动
        Start-Process powershell -ArgumentList "-Command", "cd '$PWD'; yarn backend:dev"
        Start-Sleep 3
        yarn frontend
    }
    
    "prod" {
        Write-Host "`n🏭 启动生产模式..." -ForegroundColor Cyan
        
        # 构建前端
        Write-Host "📦 构建前端..." -ForegroundColor Yellow
        yarn build
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ 前端构建失败" -ForegroundColor Red
            exit 1
        }
        
        # 启动生产服务器
        Write-Host "🚀 启动生产服务器..." -ForegroundColor Yellow
        yarn preview
    }
    
    default {
        Write-Host "❌ 未知的启动模式: $Mode" -ForegroundColor Red
        Write-Host "可用模式: dev, full, prod" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "`n✅ 项目启动完成！" -ForegroundColor Green
