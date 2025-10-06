#!/usr/bin/env pwsh
# 完整的 MIME 类型错误修复脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🔧 MIME Type 错误完整修复" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 步骤 1: 停止所有 Node 进程
Write-Host "步骤 1/5: 停止现有进程..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "  发现 $($nodeProcesses.Count) 个 Node 进程" -ForegroundColor Gray
    Write-Host "  请手动在运行 npm run frontend 的终端按 Ctrl+C 停止" -ForegroundColor Yellow
    Write-Host "  然后按任意键继续..." -ForegroundColor Yellow
    pause
} else {
    Write-Host "  ✓ 没有运行中的 Node 进程" -ForegroundColor Green
}

# 步骤 2: 清理所有缓存
Write-Host "`n步骤 2/5: 清理缓存..." -ForegroundColor Yellow
$cachePaths = @(
    "frontend\.vite",
    "node_modules\.vite",
    ".vite",
    "frontend\dist",
    "dist"
)

foreach ($path in $cachePaths) {
    if (Test-Path $path) {
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ 删除: $path" -ForegroundColor Gray
    }
}
Write-Host "  ✓ 缓存清理完成" -ForegroundColor Green

# 步骤 3: 验证文件完整性
Write-Host "`n步骤 3/5: 验证文件..." -ForegroundColor Yellow
$requiredFiles = @{
    "frontend\index.html" = "主 HTML 文件"
    "frontend\main.tsx" = "应用入口"
    "vite.config.ts" = "Vite 配置"
    "package.json" = "项目配置"
}

$allFilesOk = $true
foreach ($file in $requiredFiles.Keys) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ 缺失: $file" -ForegroundColor Red
        $allFilesOk = $false
    }
}

if (-not $allFilesOk) {
    Write-Host "`n❌ 关键文件缺失！请检查项目完整性。" -ForegroundColor Red
    exit 1
}

# 步骤 4: 检查端口占用
Write-Host "`n步骤 4/5: 检查端口 5174..." -ForegroundColor Yellow
$portInUse = netstat -ano | Select-String ":5174.*LISTENING"
if ($portInUse) {
    Write-Host "  ⚠ 端口 5174 正在被使用" -ForegroundColor Yellow
    Write-Host "  请确保旧的服务器已停止" -ForegroundColor Yellow
} else {
    Write-Host "  ✓ 端口 5174 可用" -ForegroundColor Green
}

# 步骤 5: 启动开发服务器
Write-Host "`n步骤 5/5: 启动开发服务器..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🚀 启动 Vite 开发服务器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ 所有准备工作已完成" -ForegroundColor Green
Write-Host ""
Write-Host "服务器地址: http://localhost:5174" -ForegroundColor Green
Write-Host "重要提示: 请访问根路径 http://localhost:5174/ " -ForegroundColor Yellow
Write-Host "         不要直接访问 /security-test 等子路径" -ForegroundColor Yellow
Write-Host ""
Write-Host "按 Ctrl+C 可以停止服务器" -ForegroundColor Gray
Write-Host ""

# 启动服务器
npm run frontend

