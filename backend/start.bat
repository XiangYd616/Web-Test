@echo off
chcp 65001 >nul
cls
echo ========================================
echo   Test-Web-backend 启动脚本
echo ========================================
echo.

:: 检查.env文件
if not exist ".env" (
    echo [错误] .env文件不存在
    echo.
    echo 请运行以下命令创建配置:
    echo   npm run setup
    echo.
    echo 或手动复制配置文件:
    echo   copy .env.example .env
    echo.
    pause
    exit /b 1
)

echo [✓] .env 配置文件存在
echo.

:: 检查node_modules
if not exist "node_modules" (
    echo [!] node_modules 不存在，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

echo [✓] 依赖已安装
echo.

:: 检查PostgreSQL服务
echo [检查] PostgreSQL服务状态...
sc query postgresql-x64-17 | find "RUNNING" >nul
if errorlevel 1 (
    echo [警告] PostgreSQL服务未运行
    echo 请启动PostgreSQL服务
    pause
)

echo [✓] PostgreSQL服务正在运行
echo.

:: 启动服务
echo ========================================
echo   正在启动服务器...
echo ========================================
echo.
echo 服务器地址: http://localhost:3001
echo API文档: http://localhost:3001/api-docs
echo.
echo 按 Ctrl+C 停止服务器
echo.
echo ========================================
echo.

node src/app.js

