# 🔧 MIME Type 错误完整修复指南

**问题**: `Failed to load module script: Expected a JavaScript module but server responded with "text/html"`

**根本原因**: Vite 服务器返回 404 错误页面（HTML）而不是 JavaScript 模块文件

---

## 🚨 立即执行（3步修复）

### 步骤 1：完全停止所有进程

```powershell
# 在管理员模式 PowerShell 中执行
taskkill /F /IM node.exe /T
```

**或者手动停止**:
```powershell
# 在运行 npm run frontend 的终端中按 Ctrl+C
# 确保看到 "进程已终止" 的消息
```

### 步骤 2：清理所有缓存

```powershell
# 清理 Vite 缓存
Remove-Item -Path "frontend\.vite" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".vite" -Recurse -Force -ErrorAction SilentlyContinue

# 清理构建产物
Remove-Item -Path "frontend\dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✓ 缓存已清理" -ForegroundColor Green
```

### 步骤 3：重新启动（干净启动）

```powershell
# 方式 1：直接启动（推荐）
npm run frontend

# 方式 2：如果方式1失败，尝试
cd frontend
npx vite --port 5174 --host

# 方式 3：完全重装依赖（最后手段）
Remove-Item -Path "node_modules" -Recurse -Force
npm install
npm run frontend
```

---

## 🔍 问题诊断

### 检查 1：确认端口未被占用

```powershell
netstat -ano | findstr :5174
```

**期望结果**: 没有输出（或只有你的服务器）

**如果有其他进程**: 
```powershell
# 找到 PID，然后
taskkill /F /PID <PID>
```

### 检查 2：验证文件路径

```powershell
# 检查关键文件是否存在
Test-Path "frontend\index.html"  # 应该返回 True
Test-Path "frontend\main.tsx"    # 应该返回 True
Test-Path "vite.config.ts"       # 应该返回 True
```

### 检查 3：查看 Vite 配置

确认 `vite.config.ts` 中的 `root` 设置：

```typescript
export default defineConfig({
  root: 'frontend',  // ← 这个设置很重要
  // ...
})
```

---

## 🎯 完整一键修复脚本

创建并保存为 `fix-mime-issue.ps1`:

```powershell
Write-Host "🔧 开始修复 MIME Type 问题..." -ForegroundColor Cyan

# 1. 停止所有 Node 进程（需要管理员权限）
Write-Host "`n步骤 1/4: 停止所有 Node 进程..." -ForegroundColor Yellow
try {
    taskkill /F /IM node.exe /T 2>$null
    Start-Sleep -Seconds 2
    Write-Host "✓ Node 进程已停止" -ForegroundColor Green
} catch {
    Write-Host "⚠ 无法停止某些进程（可能需要管理员权限）" -ForegroundColor Red
    Write-Host "请手动按 Ctrl+C 停止开发服务器" -ForegroundColor Yellow
    pause
}

# 2. 清理所有缓存
Write-Host "`n步骤 2/4: 清理缓存目录..." -ForegroundColor Yellow
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
        Write-Host "  ✓ 已删除: $path" -ForegroundColor Gray
    }
}
Write-Host "✓ 缓存已清理" -ForegroundColor Green

# 3. 验证文件完整性
Write-Host "`n步骤 3/4: 验证文件完整性..." -ForegroundColor Yellow
$requiredFiles = @(
    "frontend\index.html",
    "frontend\main.tsx",
    "vite.config.ts",
    "package.json"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ 缺失: $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "`n❌ 关键文件缺失！请检查项目完整性。" -ForegroundColor Red
    pause
    exit 1
}

# 4. 启动开发服务器
Write-Host "`n步骤 4/4: 启动开发服务器..." -ForegroundColor Yellow
Write-Host "正在启动 Vite 开发服务器..." -ForegroundColor Cyan
Write-Host "服务器将在 http://localhost:5174 运行" -ForegroundColor Cyan
Write-Host "`n按 Ctrl+C 可以停止服务器`n" -ForegroundColor Gray

npm run frontend
```

**使用方法**:
```powershell
# 以管理员身份运行 PowerShell，然后执行
.\fix-mime-issue.ps1
```

---

## 💡 常见原因和解决方案

### 原因 1：缓存损坏 ✅ 最常见

**症状**: 文件明明存在但返回 404

**解决**: 清理所有缓存（见上面步骤 2）

### 原因 2：多个服务器实例

**症状**: 端口被占用，连接到错误的服务器

**解决**: 停止所有 Node 进程后重新启动

### 原因 3：路径配置错误

**症状**: Vite 找不到源文件

**解决**: 确认 `vite.config.ts` 中的 `root` 设置为 `'frontend'`

### 原因 4：依赖问题

**症状**: 模块解析失败

**解决**: 
```powershell
Remove-Item -Path "node_modules" -Recurse -Force
npm install
```

---

## 🌐 浏览器端修复

即使服务器正常，浏览器缓存也可能导致问题：

### 方法 1：硬刷新
```
Ctrl + Shift + R  (Windows/Linux)
Cmd + Shift + R   (Mac)
```

### 方法 2：清除缓存
```
F12 -> Application -> Clear storage -> Clear site data
```

### 方法 3：无痕模式测试
```
Ctrl + Shift + N  (Chrome/Edge)
Ctrl + Shift + P  (Firefox)
```

---

## 🧪 验证修复

修复后，检查以下内容：

### 1. 服务器日志正常

期望看到：
```
VITE v4.5.0  ready in XXX ms

➜  Local:   http://localhost:5174/
➜  Network: http://192.168.x.x:5174/
```

### 2. 浏览器控制台无错误

**F12 -> Console** 应该没有 MIME type 错误

### 3. Network 标签显示正确

**F12 -> Network**:
- `main.tsx` 返回 `200 OK`, Type: `javascript`
- `index.css` 返回 `200 OK`, Type: `css`
- `AppRoutes.tsx` 返回 `200 OK`, Type: `javascript`

---

## 🆘 仍然无法解决？

### 最后手段：完全重置

```powershell
# 1. 停止所有进程
taskkill /F /IM node.exe /T

# 2. 删除所有生成文件
Remove-Item -Path "node_modules" -Recurse -Force
Remove-Item -Path "package-lock.json" -Force
Remove-Item -Path "frontend\.vite" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "frontend\dist" -Recurse -Force -ErrorAction SilentlyContinue

# 3. 重新安装
npm install

# 4. 启动
npm run frontend
```

### 检查系统环境

```powershell
# Node 版本（应该 >= 16）
node --version

# npm 版本（应该 >= 8）
npm --version

# 检查 hosts 文件
Get-Content C:\Windows\System32\drivers\etc\hosts | Select-String "localhost"
```

---

## 📚 相关资源

- [Vite 官方文档](https://vitejs.dev/)
- [MIME Types 说明](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types)

---

**最后更新**: 2025-10-06  
**状态**: ⚠️ 需要立即修复  
**优先级**: 🔴 高

