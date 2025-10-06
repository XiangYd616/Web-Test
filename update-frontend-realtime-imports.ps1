# 更新前端 Real 前缀导入引用
# Phase 3: 文件重命名后的导入路径更新

$replacements = @(
    # 组件重命名
    @{
        Old = "RealTimeMonitoringDashboard"
        New = "MonitoringDashboard"
        Files = @("*.ts", "*.tsx", "*.js", "*.jsx")
    },
    @{
        Old = "RealTimeStressChart"
        New = "StressChart"
        Files = @("*.ts", "*.tsx", "*.js", "*.jsx")
    },
    
    # Hooks重命名
    @{
        Old = "useRealSEOTest"
        New = "useSEOTest"
        Files = @("*.ts", "*.tsx", "*.js", "*.jsx")
    },
    @{
        Old = "useRealTimeData"
        New = "useStreamingData"
        Files = @("*.ts", "*.tsx", "*.js", "*.jsx")
    },
    
    # 服务文件重命名
    @{
        Old = "realTimeMonitoring"
        New = "streamingMonitoring"
        Files = @("*.ts", "*.tsx", "*.js", "*.jsx")
    },
    
    # 导入路径更新
    @{
        Old = "components/monitoring/RealTimeMonitoringDashboard"
        New = "components/monitoring/MonitoringDashboard"
        Files = @("*.ts", "*.tsx", "*.js", "*.jsx")
    },
    @{
        Old = "components/stress/RealTimeStressChart"
        New = "components/stress/StressChart"
        Files = @("*.ts", "*.tsx", "*.js", "*.jsx")
    },
    @{
        Old = "hooks/useRealSEOTest"
        New = "hooks/useSEOTest"
        Files = @("*.ts", "*.tsx", "*.js", "*.jsx")
    },
    @{
        Old = "hooks/useRealTimeData"
        New = "hooks/useStreamingData"
        Files = @("*.ts", "*.tsx", "*.js", "*.jsx")
    },
    @{
        Old = "services/monitoring/realTimeMonitoring"
        New = "services/monitoring/streamingMonitoring"
        Files = @("*.ts", "*.tsx", "*.js", "*.jsx")
    },
    @{
        Old = "monitoring/realTimeMonitoring"
        New = "monitoring/streamingMonitoring"
        Files = @("*.ts", "*.tsx", "*.js", "*.jsx")
    }
)

$baseDir = "D:\myproject\Test-Web\frontend"
$updatedFiles = @()
$totalReplacements = 0

Write-Host "🔄 开始更新前端 Real 前缀导入引用..." -ForegroundColor Cyan
Write-Host ""

foreach ($replacement in $replacements) {
    $oldPattern = $replacement.Old
    $newPattern = $replacement.New
    
    Write-Host "📝 替换: $oldPattern -> $newPattern" -ForegroundColor Yellow
    
    # 查找所有匹配的文件
    $files = Get-ChildItem -Path $baseDir -Include $replacement.Files -Recurse -File | 
             Where-Object { $_.FullName -notmatch '\\node_modules\\|\\dist\\|\\build\\' }
    
    foreach ($file in $files) {
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        
        # 执行替换
        $content = $content -replace [regex]::Escape($oldPattern), $newPattern
        
        # 如果内容有变化，保存文件
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
            
            if ($updatedFiles -notcontains $file.FullName) {
                $updatedFiles += $file.FullName
            }
            
            $totalReplacements++
            Write-Host "  ✅ 更新: $($file.FullName.Replace($baseDir, '.'))" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ 导入更新完成!" -ForegroundColor Green
Write-Host "📊 统计信息:" -ForegroundColor Cyan
Write-Host "  - 执行替换次数: $totalReplacements" -ForegroundColor White
Write-Host "  - 更新文件数量: $($updatedFiles.Count)" -ForegroundColor White
Write-Host ""

if ($updatedFiles.Count -gt 0) {
    Write-Host "📁 更新的文件列表:" -ForegroundColor Cyan
    foreach ($file in $updatedFiles) {
        Write-Host "  - $($file.Replace($baseDir, '.'))" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "✅ 所有导入引用更新完成!" -ForegroundColor Green
