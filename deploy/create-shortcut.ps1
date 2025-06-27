# 创建桌面快捷方式脚本

$projectPath = (Get-Location).Path
$desktopPath = [Environment]::GetFolderPath("Desktop")

# 创建PowerShell快捷方式
$shortcutPath = "$desktopPath\一键部署TestWebApp.lnk"
$WScriptShell = New-Object -ComObject WScript.Shell
$shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$projectPath\deploy\one-click-deploy.ps1`""
$shortcut.WorkingDirectory = $projectPath
$shortcut.IconLocation = "powershell.exe,0"
$shortcut.Description = "Test Web App 一键部署工具"
$shortcut.Save()

# 创建批处理快捷方式
$shortcutPath2 = "$desktopPath\快速部署TestWebApp.lnk"
$shortcut2 = $WScriptShell.CreateShortcut($shortcutPath2)
$shortcut2.TargetPath = "$projectPath\deploy\quick-deploy.bat"
$shortcut2.WorkingDirectory = $projectPath
$shortcut2.IconLocation = "cmd.exe,0"
$shortcut2.Description = "Test Web App 快速部署工具"
$shortcut2.Save()

Write-Host "✅ 桌面快捷方式创建完成！" -ForegroundColor Green
Write-Host ""
Write-Host "已创建以下快捷方式：" -ForegroundColor Cyan
Write-Host "1. 一键部署TestWebApp.lnk - PowerShell版本（功能完整）" -ForegroundColor White
Write-Host "2. 快速部署TestWebApp.lnk - 批处理版本（简单易用）" -ForegroundColor White
Write-Host ""
Write-Host "双击任一快捷方式即可开始部署！" -ForegroundColor Yellow
