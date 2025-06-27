# Test Web App 一键部署脚本
# 支持密码认证和密钥认证

param(
    [string]$ServerIP = "8.137.111.126",
    [string]$Username = "root",
    [string]$Password = "L802357ds",
    [string]$KeyFile = "miyao\performance-monitor-key.ppk",
    [switch]$UsePassword,
    [switch]$UseKey,
    [switch]$Help
)

# 颜色输出函数
function Write-Info($message) { Write-Host "[INFO] $message" -ForegroundColor Blue }
function Write-Success($message) { Write-Host "[SUCCESS] $message" -ForegroundColor Green }
function Write-Warning($message) { Write-Host "[WARNING] $message" -ForegroundColor Yellow }
function Write-Error($message) { Write-Host "[ERROR] $message" -ForegroundColor Red }

function Show-Help {
    Write-Host "🚀 Test Web App 一键部署工具" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "用法:"
    Write-Host "  .\one-click-deploy.ps1 [选项]"
    Write-Host ""
    Write-Host "选项:"
    Write-Host "  -UsePassword    使用密码认证"
    Write-Host "  -UseKey         使用密钥认证"
    Write-Host "  -Help           显示帮助"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\one-click-deploy.ps1 -UsePassword    # 使用密码认证"
    Write-Host "  .\one-click-deploy.ps1 -UseKey         # 使用密钥认证"
    Write-Host ""
}

function Test-PuTTY {
    try {
        $null = Get-Command plink -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Install-PuTTY {
    Write-Info "检测到未安装PuTTY，正在下载安装..."
    
    $puttyUrl = "https://the.earth.li/~sgtatham/putty/latest/w64/putty-64bit-0.78-installer.msi"
    $installerPath = "$env:TEMP\putty-installer.msi"
    
    try {
        Invoke-WebRequest -Uri $puttyUrl -OutFile $installerPath
        Start-Process msiexec.exe -ArgumentList "/i `"$installerPath`" /quiet" -Wait
        
        # 添加PuTTY到PATH
        $puttyPath = "${env:ProgramFiles}\PuTTY"
        if (Test-Path $puttyPath) {
            $env:PATH += ";$puttyPath"
            Write-Success "PuTTY安装完成"
            return $true
        }
    } catch {
        Write-Error "PuTTY安装失败: $_"
        return $false
    }
    
    return $false
}

function Build-Project {
    Write-Info "构建项目..."
    
    if (-not (Test-Path "package.json")) {
        Write-Error "未找到package.json，请在项目根目录运行"
        return $false
    }
    
    # 构建前端
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "构建失败"
        return $false
    }
    
    # 创建部署包
    Write-Info "创建部署包..."
    if (Test-Path "testweb-deploy.zip") {
        Remove-Item "testweb-deploy.zip" -Force
    }
    
    $tempDir = "temp-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    
    Copy-Item "dist" -Destination "$tempDir/dist" -Recurse
    Copy-Item "server" -Destination "$tempDir/server" -Recurse -ErrorAction SilentlyContinue
    Copy-Item "package.json" -Destination "$tempDir/" -ErrorAction SilentlyContinue
    
    Compress-Archive -Path "$tempDir/*" -DestinationPath "testweb-deploy.zip" -Force
    Remove-Item $tempDir -Recurse -Force
    
    $zipSize = (Get-Item "testweb-deploy.zip").Length
    Write-Success "部署包创建完成: testweb-deploy.zip ($([math]::Round($zipSize/1MB, 2)) MB)"
    
    return $true
}

function Upload-WithPassword {
    Write-Info "使用密码认证上传文件..."
    
    # 检查是否有PuTTY
    if (-not (Test-PuTTY)) {
        Write-Warning "未找到PuTTY，尝试安装..."
        if (-not (Install-PuTTY)) {
            Write-Error "无法安装PuTTY，请手动安装后重试"
            return $false
        }
    }
    
    # 使用pscp上传文件
    Write-Info "上传部署包..."
    $uploadCmd = "echo y | pscp -pw `"$Password`" testweb-deploy.zip ${Username}@${ServerIP}:/tmp/"
    Invoke-Expression $uploadCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "上传成功"
        return $true
    } else {
        Write-Error "上传失败"
        return $false
    }
}

function Upload-WithKey {
    Write-Info "使用密钥认证上传文件..."
    
    if (-not (Test-Path $KeyFile)) {
        Write-Error "未找到密钥文件: $KeyFile"
        return $false
    }
    
    # 检查是否有PuTTY
    if (-not (Test-PuTTY)) {
        Write-Warning "未找到PuTTY，尝试安装..."
        if (-not (Install-PuTTY)) {
            Write-Error "无法安装PuTTY，请手动安装后重试"
            return $false
        }
    }
    
    # 使用pscp和密钥文件上传
    Write-Info "上传部署包..."
    $uploadCmd = "pscp -i `"$KeyFile`" testweb-deploy.zip ${Username}@${ServerIP}:/tmp/"
    Invoke-Expression $uploadCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "上传成功"
        return $true
    } else {
        Write-Error "上传失败"
        return $false
    }
}

function Deploy-OnServer {
    param([bool]$usePassword)

    Write-Info "在服务器上执行部署..."

    $deployScript = "cd /tmp && echo 'Starting deployment...' && mkdir -p /opt/test-web-app/backups && if [ -d '/opt/test-web-app/current' ]; then cp -r /opt/test-web-app/current /opt/test-web-app/backups/backup-\$(date +%Y%m%d-%H%M%S); fi && pm2 stop test-web-app 2>/dev/null || echo 'PM2 app not running' && systemctl stop nginx 2>/dev/null || echo 'Nginx not running' && rm -rf /opt/test-web-app/new-version && mkdir -p /opt/test-web-app/new-version && unzip -q testweb-deploy.zip -d /opt/test-web-app/new-version && rm -rf /opt/test-web-app/current && mv /opt/test-web-app/new-version /opt/test-web-app/current && cd /opt/test-web-app/current/server && npm install --production && rm -rf /var/www/html/* && cp -r ../dist/* /var/www/html/ && chmod -R 755 /var/www/html && pm2 start app.js --name test-web-app --update-env && systemctl start nginx && sleep 3 && pm2 status && echo 'Deployment completed! Visit http://$ServerIP'"

    if ($usePassword) {
        $deployCmd = "echo y | plink -pw `"$Password`" ${Username}@${ServerIP} `"$deployScript`""
    } else {
        $deployCmd = "plink -i `"$KeyFile`" ${Username}@${ServerIP} `"$deployScript`""
    }

    Invoke-Expression $deployCmd

    if ($LASTEXITCODE -eq 0) {
        Write-Success "部署完成！"
        Write-Info "访问地址: http://$ServerIP"
        Write-Info "API地址: http://$ServerIP/api"
        return $true
    } else {
        Write-Error "部署失败"
        return $false
    }
}

# 主执行逻辑
function Main {
    Write-Host "🚀 Test Web App 一键部署工具" -ForegroundColor Cyan
    Write-Host "服务器: $Username@$ServerIP" -ForegroundColor Gray
    Write-Host ""
    
    if ($Help) {
        Show-Help
        return
    }
    
    if (-not $UsePassword -and -not $UseKey) {
        Write-Host "请选择认证方式:" -ForegroundColor Yellow
        Write-Host "1. 密码认证 (输入 1)"
        Write-Host "2. 密钥认证 (输入 2)"
        $choice = Read-Host "请选择"
        
        if ($choice -eq "1") {
            $UsePassword = $true
        } elseif ($choice -eq "2") {
            $UseKey = $true
        } else {
            Write-Error "无效选择"
            return
        }
    }
    
    # 构建项目
    if (-not (Build-Project)) {
        return
    }
    
    # 上传文件
    $uploadSuccess = $false
    if ($UsePassword) {
        $uploadSuccess = Upload-WithPassword
    } elseif ($UseKey) {
        $uploadSuccess = Upload-WithKey
    }
    
    if (-not $uploadSuccess) {
        Write-Error "上传失败，请检查网络连接和认证信息"
        return
    }
    
    # 执行部署
    if (Deploy-OnServer -usePassword $UsePassword) {
        Write-Success "🎉 一键部署完成！"
        Write-Info "🌐 现在可以访问: http://$ServerIP"
    } else {
        Write-Error "❌ 部署失败"
    }
}

# 执行主函数
Main
