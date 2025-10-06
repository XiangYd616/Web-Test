# ============================================
# 多窗口开发环境自动启动脚本
# Test-Web Project - Multi-Window Development
# ============================================

param(
    [switch]$SkipBranch = $false,  # 跳过分支切换
    [switch]$Window2Only = $false,  # 仅启动窗口2
    [switch]$Window3Only = $false,  # 仅启动窗口3
    [switch]$Window4Only = $false   # 仅启动窗口4
)

$projectRoot = "D:\myproject\Test-Web"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  启动多窗口开发环境" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查项目路径
if (-not (Test-Path $projectRoot)) {
    Write-Host "❌ 错误：项目路径不存在: $projectRoot" -ForegroundColor Red
    exit 1
}

# 窗口1已经在运行（当前窗口）
Write-Host "✅ 窗口1（当前）: 前端UI开发 - feature/frontend-ui-dev" -ForegroundColor Green
Write-Host "   命令: npm run frontend" -ForegroundColor Gray
Write-Host "   端口: 5174" -ForegroundColor Gray
Write-Host ""

# 启动窗口2 - 后端API开发
if (-not $Window3Only -and -not $Window4Only) {
    Write-Host "🚀 启动窗口2: 后端API开发..." -ForegroundColor Yellow
    
    $window2Script = @"
cd '$projectRoot'
Write-Host '========================================' -ForegroundColor Magenta
Write-Host '  窗口2: 后端API开发' -ForegroundColor Magenta
Write-Host '========================================' -ForegroundColor Magenta
Write-Host ''

if (-not `$$($SkipBranch)) {
    Write-Host '切换到后端开发分支...' -ForegroundColor Cyan
    git checkout -b feature/backend-api-dev 2>`$null
    if (`$LASTEXITCODE -ne 0) {
        git checkout feature/backend-api-dev
    }
}

Write-Host '启动后端开发服务器（端口3001）...' -ForegroundColor Green
Write-Host ''
npm run backend:dev
"@
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $window2Script
    Write-Host "   ✅ 窗口2已启动" -ForegroundColor Green
    Write-Host ""
    Start-Sleep -Seconds 1
}

# 启动窗口3 - Electron集成
if (-not $Window2Only -and -not $Window4Only) {
    Write-Host "🚀 启动窗口3: Electron集成..." -ForegroundColor Yellow
    
    $window3Script = @"
cd '$projectRoot'
Write-Host '========================================' -ForegroundColor Blue
Write-Host '  窗口3: Electron集成开发' -ForegroundColor Blue
Write-Host '========================================' -ForegroundColor Blue
Write-Host ''

if (-not `$$($SkipBranch)) {
    Write-Host '切换到Electron开发分支...' -ForegroundColor Cyan
    git checkout -b feature/electron-integration 2>`$null
    if (`$LASTEXITCODE -ne 0) {
        git checkout feature/electron-integration
    }
}

Write-Host '等待前端服务器就绪（5174端口）...' -ForegroundColor Yellow
Write-Host '提示: 如需启动Electron，确保前端服务已运行' -ForegroundColor Gray
Write-Host ''
Write-Host '手动启动命令: npm run electron:dev' -ForegroundColor Cyan
Write-Host '快速开发命令: npm run dev (同时启动前后端)' -ForegroundColor Cyan
Write-Host ''
"@
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $window3Script
    Write-Host "   ✅ 窗口3已启动" -ForegroundColor Green
    Write-Host ""
    Start-Sleep -Seconds 1
}

# 启动窗口4 - 测试/维护
if (-not $Window2Only -and -not $Window3Only) {
    Write-Host "🚀 启动窗口4: 测试与维护..." -ForegroundColor Yellow
    
    $window4Script = @"
cd '$projectRoot'
Write-Host '========================================' -ForegroundColor DarkYellow
Write-Host '  窗口4: 测试与维护' -ForegroundColor DarkYellow
Write-Host '========================================' -ForegroundColor DarkYellow
Write-Host ''

if (-not `$$($SkipBranch)) {
    Write-Host '切换到测试分支...' -ForegroundColor Cyan
    git checkout -b test/integration-testing 2>`$null
    if (`$LASTEXITCODE -ne 0) {
        git checkout test/integration-testing
    }
}

Write-Host '可用命令:' -ForegroundColor Cyan
Write-Host '  npm run test          - 运行单元测试' -ForegroundColor Gray
Write-Host '  npm run test:watch    - 监听模式测试' -ForegroundColor Gray
Write-Host '  npm run test:ui       - UI测试界面' -ForegroundColor Gray
Write-Host '  npm run e2e           - E2E测试' -ForegroundColor Gray
Write-Host '  npm run lint          - 代码检查' -ForegroundColor Gray
Write-Host '  npm run type-check    - TypeScript检查' -ForegroundColor Gray
Write-Host ''
Write-Host '数据库命令:' -ForegroundColor Cyan
Write-Host '  npm run db:status     - 数据库状态' -ForegroundColor Gray
Write-Host '  npm run db:migrate    - 数据库迁移' -ForegroundColor Gray
Write-Host ''
"@
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $window4Script
    Write-Host "   ✅ 窗口4已启动" -ForegroundColor Green
    Write-Host ""
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ 多窗口开发环境启动完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "窗口分配:" -ForegroundColor Yellow
Write-Host "  窗口1（当前）: 前端UI开发        - feature/frontend-ui-dev" -ForegroundColor White
Write-Host "  窗口2        : 后端API开发       - feature/backend-api-dev" -ForegroundColor White
Write-Host "  窗口3        : Electron集成      - feature/electron-integration" -ForegroundColor White
Write-Host "  窗口4        : 测试与维护        - test/integration-testing" -ForegroundColor White
Write-Host ""
Write-Host "快捷命令:" -ForegroundColor Yellow
Write-Host "  .\scripts\start-multi-window-dev.ps1                # 启动全部窗口" -ForegroundColor Gray
Write-Host "  .\scripts\start-multi-window-dev.ps1 -Window2Only  # 仅启动窗口2" -ForegroundColor Gray
Write-Host "  .\scripts\start-multi-window-dev.ps1 -SkipBranch   # 不切换分支" -ForegroundColor Gray
Write-Host ""
Write-Host "提示: 按Ctrl+C可退出当前窗口" -ForegroundColor DarkGray
Write-Host ""

