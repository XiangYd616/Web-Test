#!/usr/bin/env pwsh
# 快速重启开发服务器脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🚀 重启开发服务器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 清理缓存（静默）
Write-Host "清理缓存..." -ForegroundColor Yellow
Remove-Item -Path "frontend\.vite" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✓ 缓存已清理" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  启动 Vite 开发服务器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "服务器地址: http://localhost:5174" -ForegroundColor Green
Write-Host "按 Ctrl+C 可以停止服务器" -ForegroundColor Gray
Write-Host ""

# 启动开发服务器
npm run frontend

