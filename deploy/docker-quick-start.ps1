# Test-Web Backend Docker 快速启动脚本 (Windows PowerShell)
# 支持开发和生产环境

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    
    [Parameter(Position=1)]
    [string]$Service = "backend",
    
    [Parameter(Position=2)]
    [string]$Environment = "prod"
)

# 彩色输出函数
function Write-Info {
    param([string]$Message)
    Write-Host "[Test-Web] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[Warning] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Error {
    param([string]$Message)
    Write-Host "[Error] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

# 检查Docker是否安装
function Test-Docker {
    try {
        $null = docker --version
        $null = docker compose version
        Write-Info "✓ Docker 环境检查通过"
        return $true
    }
    catch {
        Write-Error "Docker 或 Docker Compose 未安装"
        Write-Info "安装指南: https://docs.docker.com/get-docker/"
        return $false
    }
}

# 检查环境变量文件
function Test-EnvFile {
    if (-not (Test-Path "backend\.env")) {
        Write-Warning ".env 文件不存在，正在创建..."
        if (Test-Path "backend\.env.example") {
            Copy-Item "backend\.env.example" "backend\.env"
            Write-Info "✓ 已从 .env.example 创建 .env 文件"
            Write-Warning "请编辑 backend\.env 文件配置必要的环境变量"
        }
        else {
            Write-Error "backend\.env.example 不存在，无法创建 .env"
            return $false
        }
    }
    else {
        Write-Info "✓ .env 文件存在"
    }
    return $true
}

# 启动开发环境
function Start-DevEnvironment {
    Write-Info "启动开发环境..."
    
    # 停止并删除旧容器
    docker compose -f docker-compose.dev.yml down
    
    # 启动服务
    docker compose -f docker-compose.dev.yml up -d postgres redis
    
    Write-Info "等待数据库就绪..."
    Start-Sleep -Seconds 5
    
    # 初始化数据库
    Write-Info "初始化数据库..."
    docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "CREATE DATABASE testweb_dev;" 2>$null
    
    # 启动后端
    docker compose -f docker-compose.dev.yml up -d backend
    
    # 启动管理工具
    docker compose -f docker-compose.dev.yml up -d adminer redis-insight
    
    Write-Info "====================================="
    Write-Info "开发环境启动成功! 🚀"
    Write-Info "====================================="
    Write-Info "Backend API:    http://localhost:3001"
    Write-Info "Health Check:   http://localhost:3001/health"
    Write-Info "Adminer (DB):   http://localhost:8080"
    Write-Info "RedisInsight:   http://localhost:8001"
    Write-Info "====================================="
    Write-Info "查看日志: docker compose -f docker-compose.dev.yml logs -f backend"
}

# 启动生产环境
function Start-ProdEnvironment {
    Write-Info "启动生产环境..."
    
    docker compose up -d postgres redis
    
    Write-Info "等待数据库就绪..."
    Start-Sleep -Seconds 5
    
    docker compose up -d backend
    
    Write-Info "====================================="
    Write-Info "生产环境启动成功! 🚀"
    Write-Info "====================================="
    Write-Info "Backend API:    http://localhost:3001"
    Write-Info "Health Check:   http://localhost:3001/health"
    Write-Info "====================================="
}

# 停止服务
function Stop-Services {
    param([string]$Env = "prod")
    
    Write-Info "停止服务..."
    
    if ($Env -eq "dev") {
        docker compose -f docker-compose.dev.yml down
    }
    else {
        docker compose down
    }
    
    Write-Info "✓ 服务已停止"
}

# 清理所有数据
function Clear-Environment {
    param([string]$Env = "prod")
    
    Write-Warning "这将删除所有容器和数据卷！"
    $response = Read-Host "确定要继续吗? (y/N)"
    
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Info "清理环境..."
        
        if ($Env -eq "dev") {
            docker compose -f docker-compose.dev.yml down -v
        }
        else {
            docker compose down -v
        }
        
        Write-Info "✓ 清理完成"
    }
    else {
        Write-Info "取消清理操作"
    }
}

# 查看日志
function Show-Logs {
    param(
        [string]$ServiceName = "backend",
        [string]$Env = "prod"
    )
    
    if ($Env -eq "dev") {
        docker compose -f docker-compose.dev.yml logs -f $ServiceName
    }
    else {
        docker compose logs -f $ServiceName
    }
}

# 进入容器
function Enter-Container {
    param(
        [string]$ServiceName = "backend",
        [string]$Env = "prod"
    )
    
    if ($Env -eq "dev") {
        docker compose -f docker-compose.dev.yml exec $ServiceName sh
    }
    else {
        docker compose exec $ServiceName sh
    }
}

# 数据库备份
function Backup-Database {
    Write-Info "备份数据库..."
    $backupFile = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    docker compose exec postgres pg_dump -U postgres testweb_dev | Out-File -FilePath $backupFile -Encoding utf8
    Write-Info "✓ 备份完成: $backupFile"
}

# 显示状态
function Show-Status {
    Write-Info "服务状态:"
    docker compose ps
}

# 显示帮助
function Show-Help {
    Write-Host @"

Test-Web Backend Docker 快速启动脚本 (Windows)

用法: .\docker-quick-start.ps1 [command] [options]

命令:
  dev             启动开发环境（包含热重载）
  prod            启动生产环境
  stop [dev]      停止服务
  restart [dev]   重启服务
  logs [service]  查看日志
  shell [service] 进入容器
  clean [dev]     清理所有数据（危险操作！）
  backup          备份数据库
  status          查看服务状态
  help            显示此帮助信息

示例:
  .\docker-quick-start.ps1 dev                    # 启动开发环境
  .\docker-quick-start.ps1 logs backend           # 查看后端日志
  .\docker-quick-start.ps1 shell postgres         # 进入数据库容器
  .\docker-quick-start.ps1 stop dev               # 停止开发环境
  .\docker-quick-start.ps1 backup                 # 备份数据库

"@
}

# 主逻辑
if (-not (Test-Docker)) {
    exit 1
}

switch ($Command) {
    "dev" {
        if (Test-EnvFile) {
            Start-DevEnvironment
        }
    }
    "prod" {
        if (Test-EnvFile) {
            Start-ProdEnvironment
        }
    }
    "stop" {
        Stop-Services -Env $Service
    }
    "restart" {
        Stop-Services -Env $Service
        Start-Sleep -Seconds 2
        if ($Service -eq "dev") {
            Start-DevEnvironment
        }
        else {
            Start-ProdEnvironment
        }
    }
    "logs" {
        Show-Logs -ServiceName $Service -Env $Environment
    }
    "shell" {
        Enter-Container -ServiceName $Service -Env $Environment
    }
    "clean" {
        Clear-Environment -Env $Service
    }
    "backup" {
        Backup-Database
    }
    "status" {
        Show-Status
    }
    default {
        Show-Help
    }
}

