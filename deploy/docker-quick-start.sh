#!/bin/bash

# Test-Web Backend Docker 快速启动脚本
# 支持开发和生产环境

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印彩色消息
print_message() {
    echo -e "${GREEN}[Test-Web]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[Warning]${NC} $1"
}

print_error() {
    echo -e "${RED}[Error]${NC} $1"
}

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装。请先安装 Docker。"
        print_message "安装指南: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose 未安装或版本过低。"
        print_message "请安装 Docker Compose v2+"
        exit 1
    fi
    
    print_message "✓ Docker 环境检查通过"
}

# 检查环境变量文件
check_env_file() {
    if [ ! -f backend/.env ]; then
        print_warning ".env 文件不存在，正在创建..."
        if [ -f backend/.env.example ]; then
            cp backend/.env.example backend/.env
            print_message "✓ 已从 .env.example 创建 .env 文件"
            print_warning "请编辑 backend/.env 文件配置必要的环境变量"
        else
            print_error "backend/.env.example 不存在，无法创建 .env"
            exit 1
        fi
    else
        print_message "✓ .env 文件存在"
    fi
}

# 启动开发环境
start_dev() {
    print_message "启动开发环境..."
    
    # 停止并删除旧容器
    docker compose -f docker-compose.dev.yml down
    
    # 启动服务
    docker compose -f docker-compose.dev.yml up -d postgres redis
    
    print_message "等待数据库就绪..."
    sleep 5
    
    # 初始化数据库
    print_message "初始化数据库..."
    docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "CREATE DATABASE testweb_dev;" || true
    
    # 启动后端
    docker compose -f docker-compose.dev.yml up -d backend
    
    # 启动管理工具
    docker compose -f docker-compose.dev.yml up -d adminer redis-insight
    
    print_message "====================================="
    print_message "开发环境启动成功! 🚀"
    print_message "====================================="
    print_message "Backend API:    http://localhost:3001"
    print_message "Health Check:   http://localhost:3001/health"
    print_message "Adminer (DB):   http://localhost:8080"
    print_message "RedisInsight:   http://localhost:8001"
    print_message "====================================="
    print_message "查看日志: docker compose -f docker-compose.dev.yml logs -f backend"
}

# 启动生产环境
start_prod() {
    print_message "启动生产环境..."
    
    docker compose up -d postgres redis
    
    print_message "等待数据库就绪..."
    sleep 5
    
    docker compose up -d backend
    
    print_message "====================================="
    print_message "生产环境启动成功! 🚀"
    print_message "====================================="
    print_message "Backend API:    http://localhost:3001"
    print_message "Health Check:   http://localhost:3001/health"
    print_message "====================================="
}

# 停止服务
stop_services() {
    local env=$1
    print_message "停止服务..."
    
    if [ "$env" == "dev" ]; then
        docker compose -f docker-compose.dev.yml down
    else
        docker compose down
    fi
    
    print_message "✓ 服务已停止"
}

# 清理所有数据
cleanup() {
    local env=$1
    print_warning "这将删除所有容器和数据卷！"
    read -p "确定要继续吗? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_message "清理环境..."
        
        if [ "$env" == "dev" ]; then
            docker compose -f docker-compose.dev.yml down -v
        else
            docker compose down -v
        fi
        
        print_message "✓ 清理完成"
    else
        print_message "取消清理操作"
    fi
}

# 查看日志
view_logs() {
    local service=$1
    local env=$2
    
    if [ "$env" == "dev" ]; then
        docker compose -f docker-compose.dev.yml logs -f $service
    else
        docker compose logs -f $service
    fi
}

# 进入容器
enter_container() {
    local service=$1
    local env=$2
    
    if [ "$env" == "dev" ]; then
        docker compose -f docker-compose.dev.yml exec $service sh
    else
        docker compose exec $service sh
    fi
}

# 数据库备份
backup_database() {
    print_message "备份数据库..."
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    docker compose exec postgres pg_dump -U postgres testweb_dev > "$backup_file"
    print_message "✓ 备份完成: $backup_file"
}

# 显示帮助
show_help() {
    cat << EOF
Test-Web Backend Docker 快速启动脚本

用法: $0 [command] [options]

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
  $0 dev                    # 启动开发环境
  $0 logs backend           # 查看后端日志
  $0 shell postgres         # 进入数据库容器
  $0 stop dev               # 停止开发环境
  $0 backup                 # 备份数据库

EOF
}

# 查看状态
show_status() {
    print_message "服务状态:"
    docker compose ps
}

# 主函数
main() {
    check_docker
    
    case "$1" in
        dev)
            check_env_file
            start_dev
            ;;
        prod)
            check_env_file
            start_prod
            ;;
        stop)
            stop_services "${2:-prod}"
            ;;
        restart)
            stop_services "${2:-prod}"
            sleep 2
            if [ "${2}" == "dev" ]; then
                start_dev
            else
                start_prod
            fi
            ;;
        logs)
            view_logs "${2:-backend}" "${3:-prod}"
            ;;
        shell)
            enter_container "${2:-backend}" "${3:-prod}"
            ;;
        clean)
            cleanup "${2:-prod}"
            ;;
        backup)
            backup_database
            ;;
        status)
            show_status
            ;;
        help|--help|-h|"")
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"

