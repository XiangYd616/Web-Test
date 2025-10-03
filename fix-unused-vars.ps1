# 批量修复未使用变量的脚本
# 该脚本将未使用的变量名前添加下划线前缀

$ErrorActionPreference = 'Continue'

# 定义需要修复的文件和变量列表
$fixes = @{
    'frontend\components\auth\BackupCodes.tsx' = @(
        @{line=42; old='downloadReady'; new='_downloadReady'}
    )
    'frontend\components\auth\LoginPrompt.tsx' = @(
        @{line=23; old='feature'; new='_feature'}
    )
    'frontend\components\auth\MFAWizard.tsx' = @(
        @{line=58; old='setupComplete'; new='_setupComplete'}
    )
    'frontend\components\analytics\ReportManagement.tsx' = @(
        @{line=109; old='downloadReport'; new='_downloadReport'}
    )
    'frontend\components\admin\SystemSettings.tsx' = @(
        @{line=90; pattern='catch \(error\)'; new='catch (_error)'}
        @{line=103; pattern='catch \(error\)'; new='catch (_error)'}
    )
    'frontend\components\analytics\AdvancedAnalytics.tsx' = @(
        @{line=346; pattern='catch \(error\)'; new='catch (_error)'}
    )
}

Write-Host "开始批量修复未使用变量..." -ForegroundColor Green

foreach ($file in $fixes.Keys) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $fullPath) {
        Write-Host "`n处理文件: $file" -ForegroundColor Cyan
        
        $content = Get-Content $fullPath -Raw
        $modified = $false
        
        foreach ($fix in $fixes[$file]) {
            if ($fix.old) {
                # 简单替换
                $oldPattern = "const \[$($fix.old)"
                $newPattern = "const \[$($fix.new)"
                if ($content -match [regex]::Escape($oldPattern)) {
                    $content = $content -replace [regex]::Escape($oldPattern), $newPattern
                    $modified = $true
                    Write-Host "  ✓ 修复: $($fix.old) -> $($fix.new)" -ForegroundColor Green
                }
            }
            elseif ($fix.pattern) {
                # 模式替换
                if ($content -match [regex]::Escape($fix.pattern)) {
                    $content = $content -replace [regex]::Escape($fix.pattern), $fix.new
                    $modified = $true
                    Write-Host "  ✓ 修复: $($fix.pattern) -> $($fix.new)" -ForegroundColor Green
                }
            }
        }
        
        if ($modified) {
            Set-Content -Path $fullPath -Value $content -NoNewline
            Write-Host "  文件已更新" -ForegroundColor Green
        } else {
            Write-Host "  无需修改" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠ 文件不存在: $file" -ForegroundColor Red
    }
}

Write-Host "`n修复完成!" -ForegroundColor Green
Write-Host "请运行 'npm run lint' 验证修复效果" -ForegroundColor Cyan

