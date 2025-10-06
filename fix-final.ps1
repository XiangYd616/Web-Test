#!/usr/bin/env pwsh
# 最终修复方案 - MIME Type 错误

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🔧 最终修复方案" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 完全清理
Write-Host "步骤 1: 完全清理..." -ForegroundColor Yellow
Remove-Item -Path "frontend\.vite" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".vite" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "frontend\dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✓ 清理完成" -ForegroundColor Green

# 2. 检查 Node 版本
Write-Host "`n步骤 2: 检查环境..." -ForegroundColor Yellow
$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "  Node: $nodeVersion" -ForegroundColor Gray
Write-Host "  npm: $npmVersion" -ForegroundColor Gray

# 3. 验证文件
Write-Host "`n步骤 3: 验证关键文件..." -ForegroundColor Yellow
$criticalFiles = @(
    "frontend/index.html",
    "frontend/main.tsx",
    "frontend/App.tsx",
    "frontend/components/routing/AppRoutes.tsx",
    "vite.config.ts"
)

$missingFiles = @()
foreach ($file in $criticalFiles) {
    $filePath = $file.Replace("/", "\")
    if (Test-Path $filePath) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ 缺失: $file" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "`n❌ 关键文件缺失！无法继续。" -ForegroundColor Red
    Write-Host "缺失文件:" -ForegroundColor Red
    $missingFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}

# 4. 重新安装依赖（可选）
Write-Host "`n步骤 4: 检查依赖..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "  node_modules 不存在，正在安装依赖..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "  ✓ node_modules 存在" -ForegroundColor Green
    Write-Host "  如果问题持续，建议运行: Remove-Item node_modules -Recurse -Force; npm install" -ForegroundColor Gray
}

# 5. 启动服务器
Write-Host "`n步骤 5: 启动开发服务器..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🚀 启动中..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "访问地址: http://localhost:5174/" -ForegroundColor Green
Write-Host ""
Write-Host "如果仍然出现 MIME 错误:" -ForegroundColor Yellow
Write-Host "  1. 在浏览器中按 Ctrl+Shift+R 硬刷新" -ForegroundColor Gray
Write-Host "  2. 或使用无痕模式 (Ctrl+Shift+N)" -ForegroundColor Gray
Write-Host "  3. 清除浏览器所有缓存" -ForegroundColor Gray
Write-Host ""
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Gray
Write-Host ""

# 使用 package.json 中定义的脚本
npm run frontend

