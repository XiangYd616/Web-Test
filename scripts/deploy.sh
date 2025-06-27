#!/bin/bash

# Test Web App 部署脚本
# 支持多环境部署：development, staging, production

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
Test Web App 部署脚本

用法: $0 [选项] <环境>

环境:
    dev         开发环境
    staging     测试环境
    prod        生产环境

选项:
    -h, --help              显示帮助信息
    -v, --version           显示版本信息
    -f, --force             强制部署（跳过确认）
    -b, --build-only        仅构建，不部署
    -d, --deploy-only       仅部署，不构建
    -c, --check             检查部署状态
    -r, --rollback          回滚到上一版本
    --skip-tests            跳过测试
    --skip-backup           跳过备份

示例:
    $0 staging              部署到测试环境
    $0 prod --force         强制部署到生产环境
    $0 dev --build-only     仅构建开发版本
    $0 --check staging      检查测试环境状态

EOF
}

# 默认配置
ENVIRONMENT=""
FORCE_DEPLOY=false
BUILD_ONLY=false
DEPLOY_ONLY=false
CHECK_ONLY=false
ROLLBACK=false
SKIP_TESTS=false
SKIP_BACKUP=false

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--version)
            echo "Test Web App Deploy Script v1.0.0"
            exit 0
            ;;
        -f|--force)
            FORCE_DEPLOY=true
            shift
            ;;
        -b|--build-only)
            BUILD_ONLY=true
            shift
            ;;
        -d|--deploy-only)
            DEPLOY_ONLY=true
            shift
            ;;
        -c|--check)
            CHECK_ONLY=true
            shift
            ;;
        -r|--rollback)
            ROLLBACK=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        dev|staging|prod)
            ENVIRONMENT=$1
            shift
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 验证环境参数
if [[ -z "$ENVIRONMENT" ]]; then
    log_error "请指定部署环境: dev, staging, 或 prod"
    show_help
    exit 1
fi

# 环境配置
case $ENVIRONMENT in
    dev)
        ENV_NAME="开发环境"
        DOCKER_COMPOSE_FILE="docker-compose.dev.yml"
        BUILD_TARGET="development"
        HEALTH_CHECK_URL="http://localhost:5174/health"
        ;;
    staging)
        ENV_NAME="测试环境"
        DOCKER_COMPOSE_FILE="docker-compose.staging.yml"
        BUILD_TARGET="production"
        HEALTH_CHECK_URL="https://staging.testweb.app/health"
        ;;
    prod)
        ENV_NAME="生产环境"
        DOCKER_COMPOSE_FILE="docker-compose.yml"
        BUILD_TARGET="production"
        HEALTH_CHECK_URL="https://testweb.app/health"
        ;;
esac

log_info "部署目标: $ENV_NAME"

# 检查必要工具
check_dependencies() {
    log_info "检查依赖工具..."
    
    local missing_tools=()
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        missing_tools+=("docker-compose")
    fi
    
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "缺少必要工具: ${missing_tools[*]}"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 检查部署状态
check_deployment_status() {
    log_info "检查 $ENV_NAME 部署状态..."
    
    # 检查容器状态
    if docker-compose -f $DOCKER_COMPOSE_FILE ps | grep -q "Up"; then
        log_success "容器运行正常"
    else
        log_warning "容器未运行或状态异常"
    fi
    
    # 健康检查
    if curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
        log_success "应用健康检查通过"
    else
        log_warning "应用健康检查失败"
    fi
    
    # 显示容器状态
    docker-compose -f $DOCKER_COMPOSE_FILE ps
}

# 运行测试
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log_warning "跳过测试"
        return 0
    fi
    
    log_info "运行测试套件..."
    
    # 单元测试
    npm run test:run
    
    # 类型检查
    npm run type-check
    
    # 代码检查
    if npm run lint --if-present; then
        log_success "代码检查通过"
    else
        log_warning "代码检查发现问题"
    fi
    
    log_success "测试完成"
}

# 构建应用
build_application() {
    log_info "构建应用..."
    
    # 安装依赖
    npm ci
    
    # 运行测试
    run_tests
    
    # 构建前端
    npm run build
    
    # 构建Docker镜像
    docker build --target $BUILD_TARGET -t testweb:$ENVIRONMENT .
    
    log_success "构建完成"
}

# 备份当前版本
backup_current_version() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        log_warning "跳过备份"
        return 0
    fi
    
    log_info "备份当前版本..."
    
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)_$ENVIRONMENT"
    mkdir -p "$backup_dir"
    
    # 备份数据库
    if [[ "$ENVIRONMENT" != "dev" ]]; then
        docker-compose -f $DOCKER_COMPOSE_FILE exec -T postgres pg_dump -U testweb testweb > "$backup_dir/database.sql"
    fi
    
    # 备份配置文件
    cp -r docker/ "$backup_dir/"
    cp $DOCKER_COMPOSE_FILE "$backup_dir/"
    
    log_success "备份完成: $backup_dir"
}

# 部署应用
deploy_application() {
    log_info "部署到 $ENV_NAME..."
    
    # 停止现有服务
    docker-compose -f $DOCKER_COMPOSE_FILE down
    
    # 启动新服务
    docker-compose -f $DOCKER_COMPOSE_FILE up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    # 健康检查
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
            log_success "部署成功，应用正常运行"
            return 0
        fi
        
        log_info "健康检查失败，重试 ($attempt/$max_attempts)..."
        sleep 10
        ((attempt++))
    done
    
    log_error "部署失败，应用未能正常启动"
    return 1
}

# 回滚到上一版本
rollback_deployment() {
    log_info "回滚 $ENV_NAME 到上一版本..."
    
    local latest_backup=$(ls -t backups/ | grep "$ENVIRONMENT" | head -1)
    
    if [[ -z "$latest_backup" ]]; then
        log_error "未找到备份文件"
        exit 1
    fi
    
    log_info "使用备份: $latest_backup"
    
    # 停止当前服务
    docker-compose -f $DOCKER_COMPOSE_FILE down
    
    # 恢复配置文件
    cp -r "backups/$latest_backup/docker/" ./
    cp "backups/$latest_backup/$DOCKER_COMPOSE_FILE" ./
    
    # 恢复数据库
    if [[ "$ENVIRONMENT" != "dev" ]] && [[ -f "backups/$latest_backup/database.sql" ]]; then
        docker-compose -f $DOCKER_COMPOSE_FILE up -d postgres
        sleep 10
        docker-compose -f $DOCKER_COMPOSE_FILE exec -T postgres psql -U testweb -d testweb < "backups/$latest_backup/database.sql"
    fi
    
    # 启动服务
    docker-compose -f $DOCKER_COMPOSE_FILE up -d
    
    log_success "回滚完成"
}

# 部署确认
confirm_deployment() {
    if [[ "$FORCE_DEPLOY" == true ]]; then
        return 0
    fi
    
    echo
    log_warning "即将部署到 $ENV_NAME"
    echo "请确认以下信息："
    echo "  环境: $ENVIRONMENT"
    echo "  配置文件: $DOCKER_COMPOSE_FILE"
    echo "  构建目标: $BUILD_TARGET"
    echo "  健康检查: $HEALTH_CHECK_URL"
    echo
    
    read -p "确认部署? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "部署已取消"
        exit 0
    fi
}

# 主函数
main() {
    log_info "开始 Test Web App 部署流程"
    
    # 检查依赖
    check_dependencies
    
    # 检查状态
    if [[ "$CHECK_ONLY" == true ]]; then
        check_deployment_status
        exit 0
    fi
    
    # 回滚
    if [[ "$ROLLBACK" == true ]]; then
        confirm_deployment
        rollback_deployment
        check_deployment_status
        exit 0
    fi
    
    # 仅构建
    if [[ "$BUILD_ONLY" == true ]]; then
        build_application
        exit 0
    fi
    
    # 仅部署
    if [[ "$DEPLOY_ONLY" == true ]]; then
        confirm_deployment
        backup_current_version
        deploy_application
        check_deployment_status
        exit 0
    fi
    
    # 完整部署流程
    confirm_deployment
    backup_current_version
    build_application
    deploy_application
    check_deployment_status
    
    log_success "部署流程完成"
}

# 错误处理
trap 'log_error "部署过程中发生错误，退出码: $?"' ERR

# 执行主函数
main "$@"
