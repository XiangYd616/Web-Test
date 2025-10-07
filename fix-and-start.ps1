# 🔧 Test-Web 一键修复和启动脚本
# 自动完成所有修复步骤并启动后端服务

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  Test-Web 后端服务 - 一键修复和启动" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# 检查Node.js和npm
Write-Host "📌 Step 1/6: 检查环境..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    $npmVersion = npm --version 2>$null
    Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "  ✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ 未找到Node.js或npm，请先安装！" -ForegroundColor Red
    exit 1
}

# 清理旧的node进程（可选）
Write-Host ""
Write-Host "📌 Step 2/6: 检查运行中的Node进程..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "  ⚠️  发现 $($nodeProcesses.Count) 个运行中的node进程" -ForegroundColor Yellow
    Write-Host "  建议：手动检查并清理不需要的进程" -ForegroundColor Yellow
    Write-Host "  命令：Get-Process -Name node | Stop-Process -Force" -ForegroundColor Gray
} else {
    Write-Host "  ✅ 没有运行中的node进程" -ForegroundColor Green
}

# 安装根目录依赖
Write-Host ""
Write-Host "📌 Step 3/6: 安装根目录依赖..." -ForegroundColor Yellow
if (Test-Path ".\node_modules\cross-env") {
    Write-Host "  ✅ 根目录依赖已存在，跳过安装" -ForegroundColor Green
} else {
    Write-Host "  📦 正在安装根目录依赖..." -ForegroundColor Cyan
    npm install --loglevel=error
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ 根目录依赖安装成功" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  根目录依赖安装失败，但继续..." -ForegroundColor Yellow
    }
}

# 安装backend依赖
Write-Host ""
Write-Host "📌 Step 4/6: 安装backend依赖..." -ForegroundColor Yellow
Push-Location .\backend
if (Test-Path ".\node_modules") {
    Write-Host "  ✅ backend依赖已存在，跳过安装" -ForegroundColor Green
} else {
    Write-Host "  📦 正在安装backend依赖..." -ForegroundColor Cyan
    npm install --loglevel=error
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ backend依赖安装成功" -ForegroundColor Green
    } else {
        Write-Host "  ❌ backend依赖安装失败" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}
Pop-Location

# 检查关键文件
Write-Host ""
Write-Host "📌 Step 5/6: 检查关键文件..." -ForegroundColor Yellow

$criticalFiles = @(
    @{Path=".\backend\src\app.js"; Name="主应用入口"},
    @{Path=".\backend\routes\auth.js"; Name="认证路由"},
    @{Path=".\backend\routes\seo.js"; Name="SEO路由"},
    @{Path=".\backend\routes\security.js"; Name="安全路由"},
    @{Path=".\backend\config\database.js"; Name="数据库配置"}
)

$allFilesExist = $true
foreach ($file in $criticalFiles) {
    if (Test-Path $file.Path) {
        Write-Host "  ✅ $($file.Name)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($file.Name) - 文件缺失!" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "  ⚠️  部分关键文件缺失，启动可能失败" -ForegroundColor Yellow
    Write-Host "  是否继续？(Y/N)" -ForegroundColor Yellow
    $continue = Read-Host
    if ($continue -ne "Y" -and $continue -ne "y") {
        exit 1
    }
}

# 显示启动信息
Write-Host ""
Write-Host "📌 Step 6/6: 准备启动后端服务..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  🎯 入口文件: backend/src/app.js" -ForegroundColor Cyan
Write-Host "  🌐 监听端口: 3001 (可在.env中配置)" -ForegroundColor Cyan
Write-Host "  🔧 环境: development" -ForegroundColor Cyan
Write-Host ""

# 提供启动选项
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  选择启动方式:" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  1) 直接启动 (node src/app.js)" -ForegroundColor White
Write-Host "  2) 开发模式 (nodemon - 自动重启)" -ForegroundColor White
Write-Host "  3) 调试模式 (node --inspect)" -ForegroundColor White
Write-Host "  4) 仅显示启动命令，不启动" -ForegroundColor White
Write-Host ""
Write-Host "  请选择 [1-4] (默认: 1): " -ForegroundColor Yellow -NoNewline
$choice = Read-Host

if ([string]::IsNullOrWhiteSpace($choice)) {
    $choice = "1"
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  🚀 启动后端服务..." -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

switch ($choice) {
    "1" {
        Write-Host "  ▶️  执行: node src/app.js" -ForegroundColor Cyan
        Write-Host ""
        Set-Location .\backend
        node src/app.js
    }
    "2" {
        Write-Host "  ▶️  执行: nodemon src/app.js" -ForegroundColor Cyan
        Write-Host ""
        Set-Location .\backend
        nodemon src/app.js
    }
    "3" {
        Write-Host "  ▶️  执行: node --inspect src/app.js" -ForegroundColor Cyan
        Write-Host "  🔍 Chrome调试: chrome://inspect" -ForegroundColor Yellow
        Write-Host ""
        Set-Location .\backend
        node --inspect src/app.js
    }
    "4" {
        Write-Host "  📋 启动命令:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "    cd backend" -ForegroundColor White
        Write-Host "    node src/app.js" -ForegroundColor White
        Write-Host ""
        Write-Host "  或使用npm脚本:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "    npm run start    # 生产模式" -ForegroundColor White
        Write-Host "    npm run dev      # 开发模式(nodemon)" -ForegroundColor White
        Write-Host "    npm run dev:debug # 调试模式" -ForegroundColor White
        Write-Host ""
    }
    default {
        Write-Host "  ❌ 无效选择，退出" -ForegroundColor Red
        exit 1
    }
}

# 脚本结束

