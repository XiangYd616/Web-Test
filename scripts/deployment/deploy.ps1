# Test Web App PowerShell 部署脚本
# 支持多环境部署：development, staging, production

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment,
    
    [switch]$Force,
    [switch]$BuildOnly,
    [switch]$DeployOnly,
    [switch]$Check,
    [switch]$Rollback,
    [switch]$SkipTests,
    [switch]$SkipBackup,
    [switch]$Help
)

# 颜色定义
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Gray = "Gray"
}

# 日志函数
function Write-Info($Message) {
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Write-Success($Message) {
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green
}

function Write-Warning($Message) {
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error($Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

# 显示帮助信息
function Show-Help {
    Write-Host @"
Test Web App PowerShell 部署脚本

用法: .\deploy.ps1 -Environment <环境> [选项]

环境:
    dev         开发环境
    staging     测试环境
    prod        生产环境

选项:
    -Force              强制部署（跳过确认）
    -BuildOnly          仅构建，不部署
    -DeployOnly         仅部署，不构建
    -Check              检查部署状态
    -Rollback           回滚到上一版本
    -SkipTests          跳过测试
    -SkipBackup         跳过备份
    -Help               显示帮助信息

示例:
    .\deploy.ps1 -Environment staging
    .\deploy.ps1 -Environment prod -Force
    .\deploy.ps1 -Environment dev -BuildOnly

"@
}

# 显示帮助并退出
if ($Help) {
    Show-Help
    exit 0
}

# 环境配置
$EnvConfig = @{
    dev = @{
        Name = "开发环境"
        DockerComposeFile = "docker-compose.dev.yml"
        BuildTarget = "development"
        HealthCheckUrl = "http://localhost:5174/health"
    }
    staging = @{
        Name = "测试环境"
        DockerComposeFile = "docker-compose.staging.yml"
        BuildTarget = "production"
        HealthCheckUrl = "https://staging.testweb.app/health"
    }
    prod = @{
        Name = "生产环境"
        DockerComposeFile = "docker-compose.yml"
        BuildTarget = "production"
        HealthCheckUrl = "https://testweb.app/health"
    }
}

$Config = $EnvConfig[$Environment]
Write-Info "部署目标: $($Config.Name)"

# 检查必要工具
function Test-Dependencies {
    Write-Info "检查依赖工具..."
    
    $MissingTools = @()
    
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        $MissingTools += "docker"
    }
    
    if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        $MissingTools += "docker-compose"
    }
    
    if (!(Get-Command node -ErrorAction SilentlyContinue)) {
        $MissingTools += "node"
    }
    
    if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
        $MissingTools += "npm"
    }
    
    if ($MissingTools.Count -gt 0) {
        Write-Error "缺少必要工具: $($MissingTools -join ', ')"
        exit 1
    }
    
    Write-Success "依赖检查通过"
}

# 检查部署状态
function Test-DeploymentStatus {
    Write-Info "检查 $($Config.Name) 部署状态..."
    
    try {
        # 检查容器状态
        $ContainerStatus = docker-compose -f $Config.DockerComposeFile ps 2>$null
        if ($ContainerStatus -match "Up") {
            Write-Success "容器运行正常"
        } else {
            Write-Warning "容器未运行或状态异常"
        }
        
        # 健康检查
        try {
            $Response = Invoke-WebRequest -Uri $Config.HealthCheckUrl -TimeoutSec 10 -UseBasicParsing
            if ($Response.StatusCode -eq 200) {
                Write-Success "应用健康检查通过"
            } else {
                Write-Warning "应用健康检查失败"
            }
        } catch {
            Write-Warning "应用健康检查失败: $($_.Exception.Message)"
        }
        
        # 显示容器状态
        docker-compose -f $Config.DockerComposeFile ps
    } catch {
        Write-Error "检查部署状态失败: $($_.Exception.Message)"
    }
}

# 运行测试
function Invoke-Tests {
    if ($SkipTests) {
        Write-Warning "跳过测试"
        return $true
    }
    
    Write-Info "运行测试套件..."
    
    try {
        # 单元测试
        npm run test:run
        if ($LASTEXITCODE -ne 0) {
            throw "单元测试失败"
        }
        
        # 类型检查
        npm run type-check
        if ($LASTEXITCODE -ne 0) {
            throw "类型检查失败"
        }
        
        # 代码检查
        if (Get-Command "npm run lint" -ErrorAction SilentlyContinue) {
            npm run lint
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "代码检查发现问题"
            } else {
                Write-Success "代码检查通过"
            }
        }
        
        Write-Success "测试完成"
        return $true
    } catch {
        Write-Error "测试失败: $($_.Exception.Message)"
        return $false
    }
}

# 构建应用
function Build-Application {
    Write-Info "构建应用..."
    
    try {
        # 安装依赖
        Write-Info "安装依赖..."
        npm ci
        if ($LASTEXITCODE -ne 0) {
            throw "依赖安装失败"
        }
        
        # 运行测试
        if (!(Invoke-Tests)) {
            throw "测试失败"
        }
        
        # 构建前端
        Write-Info "构建前端..."
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "前端构建失败"
        }
        
        # 构建Docker镜像
        Write-Info "构建Docker镜像..."
        docker build --target $Config.BuildTarget -t "testweb:$Environment" .
        if ($LASTEXITCODE -ne 0) {
            throw "Docker镜像构建失败"
        }
        
        Write-Success "构建完成"
        return $true
    } catch {
        Write-Error "构建失败: $($_.Exception.Message)"
        return $false
    }
}

# 备份当前版本
function Backup-CurrentVersion {
    if ($SkipBackup) {
        Write-Warning "跳过备份"
        return $true
    }
    
    Write-Info "备份当前版本..."
    
    try {
        $BackupDir = "backups\$(Get-Date -Format 'yyyyMMdd_HHmmss')_$Environment"
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        
        # 备份数据库
        if ($Environment -ne "dev") {
            Write-Info "备份数据库..."
            docker-compose -f $Config.DockerComposeFile exec -T postgres pg_dump -U testweb testweb > "$BackupDir\database.sql"
        }
        
        # 备份配置文件
        if (Test-Path "docker") {
            Copy-Item -Path "docker" -Destination $BackupDir -Recurse
        }
        Copy-Item -Path $Config.DockerComposeFile -Destination $BackupDir
        
        Write-Success "备份完成: $BackupDir"
        return $true
    } catch {
        Write-Error "备份失败: $($_.Exception.Message)"
        return $false
    }
}

# 部署应用
function Deploy-Application {
    Write-Info "部署到 $($Config.Name)..."
    
    try {
        # 停止现有服务
        Write-Info "停止现有服务..."
        docker-compose -f $Config.DockerComposeFile down
        
        # 启动新服务
        Write-Info "启动新服务..."
        docker-compose -f $Config.DockerComposeFile up -d
        if ($LASTEXITCODE -ne 0) {
            throw "服务启动失败"
        }
        
        # 等待服务启动
        Write-Info "等待服务启动..."
        Start-Sleep -Seconds 30
        
        # 健康检查
        $MaxAttempts = 30
        $Attempt = 1
        
        while ($Attempt -le $MaxAttempts) {
            try {
                $Response = Invoke-WebRequest -Uri $Config.HealthCheckUrl -TimeoutSec 10 -UseBasicParsing
                if ($Response.StatusCode -eq 200) {
                    Write-Success "部署成功，应用正常运行"
                    return $true
                }
            } catch {
                # 继续重试
            }
            
            Write-Info "健康检查失败，重试 ($Attempt/$MaxAttempts)..."
            Start-Sleep -Seconds 10
            $Attempt++
        }
        
        throw "部署失败，应用未能正常启动"
    } catch {
        Write-Error "部署失败: $($_.Exception.Message)"
        return $false
    }
}

# 回滚到上一版本
function Restore-PreviousVersion {
    Write-Info "回滚 $($Config.Name) 到上一版本..."
    
    try {
        $LatestBackup = Get-ChildItem -Path "backups" -Directory | 
                       Where-Object { $_.Name -like "*_$Environment" } | 
                       Sort-Object CreationTime -Descending | 
                       Select-Object -First 1
        
        if (!$LatestBackup) {
            throw "未找到备份文件"
        }
        
        Write-Info "使用备份: $($LatestBackup.Name)"
        
        # 停止当前服务
        docker-compose -f $Config.DockerComposeFile down
        
        # 恢复配置文件
        if (Test-Path "$($LatestBackup.FullName)\docker") {
            Copy-Item -Path "$($LatestBackup.FullName)\docker" -Destination "." -Recurse -Force
        }
        Copy-Item -Path "$($LatestBackup.FullName)\$($Config.DockerComposeFile)" -Destination "." -Force
        
        # 恢复数据库
        if (($Environment -ne "dev") -and (Test-Path "$($LatestBackup.FullName)\database.sql")) {
            docker-compose -f $Config.DockerComposeFile up -d postgres
            Start-Sleep -Seconds 10
            Get-Content "$($LatestBackup.FullName)\database.sql" | docker-compose -f $Config.DockerComposeFile exec -T postgres psql -U testweb -d testweb
        }
        
        # 启动服务
        docker-compose -f $Config.DockerComposeFile up -d
        
        Write-Success "回滚完成"
        return $true
    } catch {
        Write-Error "回滚失败: $($_.Exception.Message)"
        return $false
    }
}

# 部署确认
function Confirm-Deployment {
    if ($Force) {
        return $true
    }
    
    Write-Host ""
    Write-Warning "即将部署到 $($Config.Name)"
    Write-Host "请确认以下信息："
    Write-Host "  环境: $Environment"
    Write-Host "  配置文件: $($Config.DockerComposeFile)"
    Write-Host "  构建目标: $($Config.BuildTarget)"
    Write-Host "  健康检查: $($Config.HealthCheckUrl)"
    Write-Host ""
    
    $Confirmation = Read-Host "确认部署? (y/N)"
    
    if ($Confirmation -notmatch "^[Yy]$") {
        Write-Info "部署已取消"
        exit 0
    }
    
    return $true
}

# 主函数
function Main {
    Write-Info "开始 Test Web App 部署流程"
    
    try {
        # 检查依赖
        Test-Dependencies
        
        # 检查状态
        if ($Check) {
            Test-DeploymentStatus
            exit 0
        }
        
        # 回滚
        if ($Rollback) {
            Confirm-Deployment
            if (Restore-PreviousVersion) {
                Test-DeploymentStatus
            }
            exit 0
        }
        
        # 仅构建
        if ($BuildOnly) {
            if (Build-Application) {
                Write-Success "构建完成"
            }
            exit 0
        }
        
        # 仅部署
        if ($DeployOnly) {
            Confirm-Deployment
            Backup-CurrentVersion
            if (Deploy-Application) {
                Test-DeploymentStatus
            }
            exit 0
        }
        
        # 完整部署流程
        Confirm-Deployment
        Backup-CurrentVersion
        if (Build-Application) {
            if (Deploy-Application) {
                Test-DeploymentStatus
                Write-Success "部署流程完成"
            }
        }
        
    } catch {
        Write-Error "部署过程中发生错误: $($_.Exception.Message)"
        exit 1
    }
}

# 执行主函数
Main
