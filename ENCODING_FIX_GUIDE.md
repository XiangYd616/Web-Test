# 🔧 字符编码乱码修复指南

**问题**: 前端页面显示中文乱码（������）  
**时间**: 2025-10-06  
**状态**: 🔴 需要立即修复

---

## 🎯 快速修复步骤

### 方法 1：清除缓存并重启（推荐）

```bash
# 1. 停止开发服务器
# 按 Ctrl+C

# 2. 清理 Vite 缓存
Remove-Item -Path "frontend\.vite" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue

# 3. 清理浏览器缓存
# 在浏览器中按 Ctrl+Shift+Delete
# 或者使用无痕模式 Ctrl+Shift+N

# 4. 重启开发服务器
npm run frontend
```

### 方法 2：强制刷新浏览器

```bash
# 1. 在浏览器中按
Ctrl + Shift + R  # Windows
Cmd + Shift + R   # Mac

# 2. 或者清除特定网站缓存
# F12 -> Network -> 勾选 "Disable cache"
# 然后刷新页面
```

### 方法 3：修改 Vite 配置

如果上述方法无效，在 `vite.config.ts` 中添加明确的字符集设置：

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',  // 添加这行
      // ... 其他配置
    }
  }
})
```

---

## 🔍 诊断步骤

### 1. 检查浏览器接收到的编码

```bash
# 在浏览器开发工具中
# F12 -> Network -> 选择 HTML 文档 -> Headers
# 查看 Content-Type 是否包含 charset=utf-8
```

**期望看到**:
```
Content-Type: text/html; charset=utf-8
```

### 2. 检查源文件编码

```powershell
# 检查文件编码
powershell -Command "Get-Content 'frontend\pages\SecurityTest.tsx' | Format-Hex | Select-Object -First 10"
```

**期望**: 文件应该以 UTF-8 BOM 或纯 UTF-8 编码

### 3. 检查 Vite 服务器响应头

```bash
# 使用 curl 检查
curl -I http://localhost:5174
```

---

## 🛠️ 完整修复脚本

创建并运行以下 PowerShell 脚本：

```powershell
# fix-encoding.ps1
Write-Host "🔧 开始修复字符编码问题..." -ForegroundColor Cyan

# 1. 停止可能运行的开发服务器
Write-Host "`n1. 检查并停止运行中的进程..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object { $_.ProcessName -like "*node*" -or $_.ProcessName -like "*vite*" }
if ($processes) {
    Write-Host "   发现 $($processes.Count) 个相关进程，正在停止..." -ForegroundColor Yellow
    $processes | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# 2. 清理 Vite 缓存
Write-Host "`n2. 清理 Vite 缓存..." -ForegroundColor Yellow
$cachePaths = @(
    "frontend\.vite",
    "node_modules\.vite",
    "frontend\node_modules\.vite",
    ".vite"
)

foreach ($path in $cachePaths) {
    if (Test-Path $path) {
        Write-Host "   删除: $path" -ForegroundColor Gray
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 3. 清理 dist 目录
Write-Host "`n3. 清理构建目录..." -ForegroundColor Yellow
if (Test-Path "frontend\dist") {
    Remove-Item -Path "frontend\dist" -Recurse -Force -ErrorAction SilentlyContinue
}

# 4. 检查并修复 index.html
Write-Host "`n4. 检查 index.html 编码..." -ForegroundColor Yellow
$indexPath = "frontend\index.html"
if (Test-Path $indexPath) {
    $content = Get-Content $indexPath -Raw -Encoding UTF8
    if ($content -match '<meta charset="UTF-8"') {
        Write-Host "   ✓ index.html 已包含正确的 charset 声明" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ index.html 缺少 charset 声明" -ForegroundColor Red
    }
}

# 5. 更新 Vite 配置
Write-Host "`n5. 检查 Vite 配置..." -ForegroundColor Yellow
$viteConfigPath = "vite.config.ts"
$viteContent = Get-Content $viteConfigPath -Raw -Encoding UTF8

if ($viteContent -notmatch "Content-Type.*charset") {
    Write
