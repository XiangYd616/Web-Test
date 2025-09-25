# Test-Web 项目健康检查脚本

Write-Host "🔍 开始Test-Web项目健康检查..." -ForegroundColor Green

$errors = @()
$warnings = @()
$passed = 0

# 检查Node.js版本
Write-Host "`n📦 检查Node.js环境..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    if ($nodeVersion -match "v(\d+)\.") {
        $majorVersion = [int]$matches[1]
        if ($majorVersion -ge 18) {
            Write-Host "✅ Node.js版本: $nodeVersion (支持)" -ForegroundColor Green
            $passed++
        } else {
            $errors += "❌ Node.js版本过低: $nodeVersion (需要 >= 18.0.0)"
        }
    }
} catch {
    $errors += "❌ Node.js未安装或不在PATH中"
}

# 检查Yarn
try {
    $yarnVersion = yarn --version
    Write-Host "✅ Yarn版本: v$yarnVersion" -ForegroundColor Green
    $passed++
} catch {
    $warnings += "⚠️ Yarn未安装，建议安装以获得更好的包管理体验"
}

# 检查项目结构
Write-Host "`n📁 检查项目结构..." -ForegroundColor Yellow

$requiredDirs = @(
    "frontend/src",
    "backend/src", 
    "shared",
    "scripts",
    "docs",
    "tests"
)

foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "✅ 目录存在: $dir" -ForegroundColor Green
        $passed++
    } else {
        $warnings += "⚠️ 目录缺失: $dir"
    }
}

# 检查重要配置文件
Write-Host "`n⚙️ 检查配置文件..." -ForegroundColor Yellow

$requiredFiles = @(
    "package.json",
    "tsconfig.json",
    ".eslintrc.cjs",
    "vite.config.ts",
    "frontend/src/main.tsx",
    "backend/package.json"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ 文件存在: $file" -ForegroundColor Green
        $passed++
    } else {
        $errors += "❌ 重要文件缺失: $file"
    }
}

# 检查依赖安装
Write-Host "`n📦 检查依赖安装..." -ForegroundColor Yellow

if (Test-Path "node_modules") {
    Write-Host "✅ 根目录依赖已安装" -ForegroundColor Green
    $passed++
} else {
    $warnings += "⚠️ 根目录依赖未安装，运行 'yarn install' 安装依赖"
}

if (Test-Path "frontend/node_modules") {
    Write-Host "✅ 前端依赖已安装" -ForegroundColor Green
    $passed++
} else {
    $warnings += "⚠️ 前端依赖可能未完全安装"
}

if (Test-Path "backend/node_modules") {
    Write-Host "✅ 后端依赖已安装" -ForegroundColor Green
    $passed++
} else {
    $warnings += "⚠️ 后端依赖可能未完全安装"
}

# 检查Git状态
Write-Host "`n🔄 检查Git状态..." -ForegroundColor Yellow
try {
    $gitStatus = git status --porcelain 2>$null
    if ($gitStatus) {
        $warnings += "⚠️ Git工作目录有未提交的更改"
    } else {
        Write-Host "✅ Git工作目录干净" -ForegroundColor Green
        $passed++
    }
} catch {
    $warnings += "⚠️ Git未初始化或不在PATH中"
}

# 检查端口占用
Write-Host "`n🌐 检查端口占用..." -ForegroundColor Yellow

$ports = @(3000, 3001, 5173, 5174)
foreach ($port in $ports) {
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($connection) {
            $warnings += "⚠️ 端口 $port 已被占用"
        } else {
            Write-Host "✅ 端口 $port 可用" -ForegroundColor Green
            $passed++
        }
    } catch {
        Write-Host "✅ 端口 $port 可用" -ForegroundColor Green
        $passed++
    }
}

# 生成报告
Write-Host "`n📊 健康检查报告" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

Write-Host "`n✅ 通过检查: $passed 项" -ForegroundColor Green

if ($warnings.Count -gt 0) {
    Write-Host "`n⚠️ 警告 ($($warnings.Count) 项):" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  $warning" -ForegroundColor Yellow
    }
}

if ($errors.Count -gt 0) {
    Write-Host "`n❌ 错误 ($($errors.Count) 项):" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  $error" -ForegroundColor Red
    }
    Write-Host "`n🔧 建议运行修复脚本: .\scripts\maintenance\fix-dependencies.ps1" -ForegroundColor Cyan
} else {
    Write-Host "`n🎉 项目健康状况良好！" -ForegroundColor Green
}

# 返回适当的退出码
if ($errors.Count -gt 0) {
    exit 1
} elseif ($warnings.Count -gt 0) {
    exit 2
} else {
    exit 0
}
