# 紧急问题快速修复脚本
# 生成时间: 2025-10-04
# 用途: 修复项目中的紧急构建和编译问题

param(
    [switch]$DryRun = $false,
    [switch]$SkipBackup = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Test-Web 紧急问题快速修复工具" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 工具函数
function Write-Step {
    param([string]$Message)
    Write-Host "► $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "  $Message" -ForegroundColor Gray
}

# 备份函数
function Backup-File {
    param([string]$FilePath)
    
    if ($SkipBackup) {
        return
    }
    
    if (Test-Path $FilePath) {
        $backupPath = "$FilePath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item $FilePath $backupPath -Force
        Write-Info "已备份: $backupPath"
    }
}

# ======================================
# Phase 1: 检查项目状态
# ======================================

Write-Step "Phase 1: 检查项目状态"
Write-Host ""

Write-Step "1.1 检查 Git 状态"
$gitStatus = git status --short
if ($gitStatus) {
    Write-Info "发现未提交的更改:"
    $gitStatus | ForEach-Object { Write-Info "  $_" }
} else {
    Write-Success "工作目录干净"
}
Write-Host ""

Write-Step "1.2 检查 Node.js 和 npm"
$nodeVersion = node --version
$npmVersion = npm --version
Write-Success "Node.js: $nodeVersion"
Write-Success "npm: $npmVersion"
Write-Host ""

# ======================================
# Phase 2: 修复缺失的 UnifiedTestPage
# ======================================

Write-Step "Phase 2: 修复缺失的 UnifiedTestPage"
Write-Host ""

$unifiedTestPagePath = "frontend\pages\UnifiedTestPage.tsx"

if (!(Test-Path $unifiedTestPagePath)) {
    Write-Step "2.1 检测到 UnifiedTestPage.tsx 缺失"
    
    if (!$DryRun) {
        # 创建目录（如果不存在）
        $pagesDir = Split-Path $unifiedTestPagePath -Parent
        if (!(Test-Path $pagesDir)) {
            New-Item -ItemType Directory -Path $pagesDir -Force | Out-Null
        }
        
        # 创建占位符组件
        $componentContent = @"
/**
 * UnifiedTestPage.tsx - Unified Test Page Component
 * 
 * This is a placeholder component created by the quick-fix script.
 * TODO: Implement the actual UnifiedTestPage functionality
 */

import React from 'react';

const UnifiedTestPage: React.FC = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Unified Test Page</h1>
      <p>This page is under construction.</p>
      <p style={{ color: '#666', marginTop: '1rem' }}>
        TODO: Implement unified test functionality
      </p>
    </div>
  );
};

export default UnifiedTestPage;
"@
        
        Set-Content -Path $unifiedTestPagePath -Value $componentContent -Encoding UTF8
        Write-Success "已创建占位符: $unifiedTestPagePath"
    } else {
        Write-Info "[DRY RUN] 将创建: $unifiedTestPagePath"
    }
} else {
    Write-Success "UnifiedTestPage.tsx 已存在"
}
Write-Host ""

# ======================================
# Phase 3: 修复 TypeScript 编码问题
# ======================================

Write-Step "Phase 3: 检查和修复 TypeScript 编码问题"
Write-Host ""

$problemFiles = @(
    "frontend\components\analytics\ReportManagement.tsx",
    "frontend\components\auth\BackupCodes.tsx",
    "frontend\components\auth\LoginPrompt.tsx"
)

foreach ($file in $problemFiles) {
    Write-Step "3.1 检查文件: $file"
    
    if (!(Test-Path $file)) {
        Write-Error "文件不存在: $file"
        continue
    }
    
    # 检查文件编码
    try {
        $content = Get-Content $file -Raw -Encoding UTF8 -ErrorAction Stop
        
        # 检查是否有问题字符
        if ($content -match "�" -or $content -match "[\x00-\x08\x0B-\x0C\x0E-\x1F]") {
            Write-Error "发现编码问题"
            Write-Info "建议: 使用 VS Code 打开文件并重新保存为 UTF-8 (without BOM)"
            
            if (!$DryRun) {
                Backup-File $file
            }
        } else {
            Write-Success "编码正常"
        }
    } catch {
        Write-Error "无法读取文件: $_"
    }
}
Write-Host ""

# ======================================
# Phase 4: 运行类型检查
# ======================================

Write-Step "Phase 4: 运行 TypeScript 类型检查"
Write-Host ""

if (!$DryRun) {
    Write-Info "运行: npx tsc --noEmit"
    $tscOutput = npx tsc --noEmit 2>&1
    $tscErrors = ($tscOutput | Select-String "error TS").Count
    
    if ($tscErrors -gt 0) {
        Write-Error "发现 $tscErrors 个 TypeScript 错误"
        Write-Info "前 10 个错误:"
        $tscOutput | Select-String "error TS" | Select-Object -First 10 | ForEach-Object {
            Write-Info "  $_"
        }
    } else {
        Write-Success "TypeScript 类型检查通过"
    }
} else {
    Write-Info "[DRY RUN] 将运行 TypeScript 类型检查"
}
Write-Host ""

# ======================================
# Phase 5: 尝试构建
# ======================================

Write-Step "Phase 5: 尝试构建项目"
Write-Host ""

if (!$DryRun) {
    Write-Info "运行: npm run build"
    $buildResult = npm run build 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "构建成功！"
    } else {
        Write-Error "构建失败"
        Write-Info "错误信息:"
        $buildResult | Select-Object -Last 20 | ForEach-Object {
            Write-Info "  $_"
        }
    }
} else {
    Write-Info "[DRY RUN] 将运行项目构建"
}
Write-Host ""

# ======================================
# Phase 6: 修复 ESLint 问题
# ======================================

Write-Step "Phase 6: 自动修复 ESLint 问题"
Write-Host ""

if (!$DryRun) {
    Write-Info "运行: npm run lint:fix"
    $lintResult = npm run lint:fix 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "ESLint 自动修复完成"
    } else {
        Write-Error "部分 ESLint 问题需要手动修复"
    }
} else {
    Write-Info "[DRY RUN] 将运行 ESLint 自动修复"
}
Write-Host ""

# ======================================
# 总结报告
# ======================================

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   修复完成 - 总结报告" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "这是一次空运行 (Dry Run)，未实际修改任何文件。" -ForegroundColor Yellow
    Write-Host "要执行实际修复，请运行: .\quick-fix-urgent-issues.ps1" -ForegroundColor Yellow
} else {
    Write-Host "已完成的操作:" -ForegroundColor Green
    Write-Host "  ✓ 检查项目状态" -ForegroundColor Green
    Write-Host "  ✓ 处理 UnifiedTestPage 缺失问题" -ForegroundColor Green
    Write-Host "  ✓ 检查文件编码" -ForegroundColor Green
    Write-Host "  ✓ 运行类型检查" -ForegroundColor Green
    Write-Host "  ✓ 尝试构建项目" -ForegroundColor Green
    Write-Host "  ✓ 运行 ESLint 修复" -ForegroundColor Green
}

Write-Host ""
Write-Host "下一步建议:" -ForegroundColor Cyan
Write-Host "  1. 查看生成的分析报告: PROJECT_HEALTH_ANALYSIS_REPORT.md" -ForegroundColor White
Write-Host "  2. 手动修复剩余的 TypeScript 编码问题" -ForegroundColor White
Write-Host "  3. 运行测试: npm test" -ForegroundColor White
Write-Host "  4. 提交更改: git add . && git commit -m 'fix: urgent issues'" -ForegroundColor White
Write-Host ""

Write-Host "详细修复指南请参考: PROJECT_HEALTH_ANALYSIS_REPORT.md" -ForegroundColor Yellow
Write-Host ""

