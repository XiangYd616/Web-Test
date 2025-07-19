@echo off
chcp 65001 >nul
echo.
echo 🚀 Test-Web 完整项目启动器
echo ================================
echo.

:: 检查Node.js
echo 🔍 检查Node.js环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js未安装，请先安装Node.js
    pause
    exit /b 1
)
echo ✅ Node.js已安装

:: 检查PostgreSQL
echo 🔍 检查PostgreSQL数据库...
psql --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️ PostgreSQL未在PATH中，尝试默认路径...
    set PGPATH=D:\Programs\PostgreSQL\bin
    if exist "%PGPATH%\psql.exe" (
        echo ✅ 找到PostgreSQL: %PGPATH%
        set PATH=%PGPATH%;%PATH%
    ) else (
        echo ❌ PostgreSQL未找到，请检查安装
        pause
        exit /b 1
    )
) else (
    echo ✅ PostgreSQL已安装
)

:: 检查依赖
echo 🔍 检查项目依赖...
if not exist "node_modules" (
    echo 📦 安装项目依赖...
    call npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)
echo ✅ 项目依赖已安装

:: 检查数据库连接
echo 🔍 检查开发数据库连接...
psql -h localhost -p 5432 -U postgres -d testweb_dev -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo ⚠️ 开发数据库连接失败，尝试创建...
    psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE testweb_dev;" >nul 2>&1
    if errorlevel 1 (
        echo ❌ 数据库创建失败，请检查PostgreSQL服务
        echo 💡 请确保PostgreSQL服务正在运行，密码为'postgres'
        pause
        exit /b 1
    )
    echo ✅ 开发数据库已创建
) else (
    echo ✅ 开发数据库连接正常
)

:: 检查生产数据库是否存在（不自动创建）
echo 🔍 检查生产数据库...
psql -h localhost -p 5432 -U postgres -d testweb_prod -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo ⚠️ 生产数据库不存在，如需要请手动创建
    echo 💡 运行: psql -U postgres -c "CREATE DATABASE testweb_prod;"
) else (
    echo ✅ 生产数据库存在
)

:: 启动后端服务器
echo.
echo 🔧 启动后端API服务器...
start "Test-Web Backend" cmd /k "cd /d %~dp0 && npm run backend"
timeout /t 3 /nobreak >nul

:: 等待后端启动
echo 🔍 等待后端服务器启动...
:wait_backend
timeout /t 1 /nobreak >nul
curl -s http://localhost:3001/health >nul 2>&1
if errorlevel 1 (
    echo ⏳ 等待后端服务器...
    goto wait_backend
)
echo ✅ 后端服务器已启动 (http://localhost:3001)

:: 启动前端开发服务器
echo.
echo 🌐 启动前端开发服务器...
start "Test-Web Frontend" cmd /k "cd /d %~dp0 && npm run frontend"
timeout /t 5 /nobreak >nul

:: 等待前端启动
echo 🔍 等待前端服务器启动...
:wait_frontend
timeout /t 1 /nobreak >nul
curl -s http://localhost:5174 >nul 2>&1
if errorlevel 1 (
    echo ⏳ 等待前端服务器...
    goto wait_frontend
)
echo ✅ 前端服务器已启动 (http://localhost:5174)

:: 检查K6
echo.
echo 🔍 检查K6测试引擎...
k6 version >nul 2>&1
if errorlevel 1 (
    echo ⚠️ K6未安装，压力测试功能将不可用
    echo 💡 可选安装: winget install k6
) else (
    echo ✅ K6已安装，压力测试功能可用
)

:: 检查Playwright
echo 🔍 检查Playwright浏览器...
npx playwright --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Playwright未安装，内容测试功能将不可用
    echo 💡 可选安装: npm install -g playwright && npx playwright install
) else (
    echo ✅ Playwright已安装，内容测试功能可用
)

:: 浏览器安全提示
echo.
echo 🔒 浏览器安全提示:
echo    如果遇到 --no-sandbox 警告，请查看 docs/browser-security-guide.md
echo    建议以非管理员身份运行以获得最佳安全性

:: 完成启动
echo.
echo 🎉 项目启动完成！
echo ================================
echo.
echo 📋 服务状态:
echo   🔧 后端API: http://localhost:3001
echo   🌐 前端应用: http://localhost:5174
echo   💾 数据库: PostgreSQL (testweb_dev)
echo.
echo 🚀 可用功能:
echo   ✅ 数据库测试 - 真实PostgreSQL连接
echo   ✅ API测试 - 真实HTTP请求
echo   ✅ 网站测试 - Lighthouse引擎
echo   ✅ 后台处理 - 跨页面状态保持
echo   ✅ 实时通知 - 测试完成提醒
echo   ✅ 数据存储 - 测试历史记录
if errorlevel 1 (
    echo   ⚠️ 压力测试 - 需要安装K6
) else (
    echo   ✅ 压力测试 - K6引擎可用
)
echo.
echo 🌐 立即访问: http://localhost:5174
echo.
echo 按任意键打开浏览器...
pause >nul
start http://localhost:5174
echo.
echo 项目正在运行中...
echo 关闭此窗口将停止所有服务
pause
