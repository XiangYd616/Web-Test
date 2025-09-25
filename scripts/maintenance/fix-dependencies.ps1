# Test-Web 依赖问题修复脚本
# PowerShell版本，适用于Windows环境

Write-Host "🔧 开始修复Test-Web项目依赖问题..." -ForegroundColor Green

# 1. 设置环境变量避免Puppeteer下载问题
Write-Host "📦 设置环境变量..." -ForegroundColor Yellow
$env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "true"
$env:PUPPETEER_CACHE_DIR = "$env:TEMP\.cache\puppeteer"

# 2. 清理现有依赖
Write-Host "🧹 清理现有依赖..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules
    Write-Host "已删除 node_modules" -ForegroundColor Gray
}
if (Test-Path "yarn.lock") {
    Remove-Item -Force yarn.lock
    Write-Host "已删除 yarn.lock" -ForegroundColor Gray
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force package-lock.json
    Write-Host "已删除 package-lock.json" -ForegroundColor Gray
}

# 3. 更新package.json添加resolutions解决版本冲突
Write-Host "📝 更新package.json配置..." -ForegroundColor Yellow

$packageJsonPath = "package.json"
if (Test-Path $packageJsonPath) {
    $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    
    # 添加resolutions字段解决版本冲突
    if (-not $packageJson.resolutions) {
        $packageJson | Add-Member -NotePropertyName "resolutions" -NotePropertyValue @{}
    }
    
    $packageJson.resolutions."glob" = "^10.3.0"
    $packageJson.resolutions."rimraf" = "^5.0.0"
    $packageJson.resolutions."eslint" = "^8.57.0"
    
    # 保存更新的package.json
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath -Encoding UTF8
    Write-Host "已更新 package.json resolutions" -ForegroundColor Gray
}

# 4. 安装依赖（增加网络超时）
Write-Host "⬇️ 重新安装依赖..." -ForegroundColor Yellow
try {
    & yarn install --network-timeout 600000 --registry https://registry.npmmirror.com
    if ($LASTEXITCODE -eq 0) {
        Write-Host "依赖安装成功！" -ForegroundColor Green
    } else {
        Write-Host "依赖安装可能有问题，继续安装peer依赖..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "使用淘宝镜像重试..." -ForegroundColor Yellow
    & yarn install --network-timeout 600000
}

# 5. 安装缺失的peer依赖
Write-Host "🔗 安装缺失的peer依赖..." -ForegroundColor Yellow

$peerDeps = @(
    "@types/node",
    "eslint-plugin-n@^16.0.0",
    "@types/json-schema",
    "openapi-types",
    "socket.io-adapter@^2.5.4"
)

foreach ($dep in $peerDeps) {
    Write-Host "安装 $dep..." -ForegroundColor Gray
    try {
        & yarn add --dev $dep
    } catch {
        Write-Host "警告: $dep 安装失败，跳过..." -ForegroundColor Yellow
    }
}

# 6. 检查关键依赖是否正常安装
Write-Host "🔍 检查关键依赖..." -ForegroundColor Yellow
$criticalDeps = @("react", "typescript", "vite", "@vitejs/plugin-react")
foreach ($dep in $criticalDeps) {
    if (Test-Path "node_modules\$dep") {
        Write-Host "✅ $dep 已安装" -ForegroundColor Green
    } else {
        Write-Host "❌ $dep 未找到，尝试重新安装..." -ForegroundColor Red
        & yarn add $dep
    }
}

# 7. 运行基本的项目检查
Write-Host "🧪 运行基本检查..." -ForegroundColor Yellow
try {
    Write-Host "检查TypeScript配置..." -ForegroundColor Gray
    & yarn tsc --noEmit --skipLibCheck
    
    Write-Host "检查ESLint配置..." -ForegroundColor Gray
    & yarn eslint --version
    
} catch {
    Write-Host "某些检查失败，但依赖修复已完成" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ 依赖修复完成！" -ForegroundColor Green
Write-Host "💡 如果仍有问题，请手动运行以下命令：" -ForegroundColor Cyan
Write-Host "   yarn install --network-timeout 600000" -ForegroundColor White
Write-Host "   yarn add --dev @types/node eslint-plugin-n" -ForegroundColor White
