#!/bin/bash

# Test Web 健康检查脚本

set -e

# 配置
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/health}"
TIMEOUT="${TIMEOUT:-10}"
MAX_RETRIES="${MAX_RETRIES:-3}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 基础健康检查
basic_health_check() {
    local url="$1"
    local timeout="$2"

    if curl -f -s --max-time "$timeout" "$url" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# 详细健康检查
detailed_health_check() {
    local url="$1"
    local timeout="$2"

    local response
    response=$(curl -f -s --max-time "$timeout" "$url" 2>/dev/null)

    if [ $? -eq 0 ]; then
        echo "$response" | jq . 2>/dev/null || echo "$response"
        return 0
    else
        return 1
    fi
}

# 检查数据库连接
check_database() {
    log_info "Checking database connection..."

    if [ -n "$DB_HOST" ]; then
        if pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USER:-testweb}" > /dev/null 2>&1; then
            log_info "✅ Database connection: OK"
            return 0
        else
            log_error "❌ Database connection: FAILED"
            return 1
        fi
    else
        log_warn "⚠️ Database connection: SKIPPED (no DB_HOST configured)"
        return 0
    fi
}

# 检查Redis连接
check_redis() {
    log_info "Checking Redis connection..."

    if [ -n "$REDIS_HOST" ]; then
        if redis-cli -h "$REDIS_HOST" -p "${REDIS_PORT:-6379}" ping > /dev/null 2>&1; then
            log_info "✅ Redis connection: OK"
            return 0
        else
            log_error "❌ Redis connection: FAILED"
            return 1
        fi
    else
        log_warn "⚠️ Redis connection: SKIPPED (no REDIS_HOST configured)"
        return 0
    fi
}

# 检查磁盘空间
check_disk_space() {
    log_info "Checking disk space..."

    local usage
    usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ "$usage" -lt 80 ]; then
        log_info "✅ Disk space: OK (${usage}% used)"
        return 0
    elif [ "$usage" -lt 90 ]; then
        log_warn "⚠️ Disk space: WARNING (${usage}% used)"
        return 0
    else
        log_error "❌ Disk space: CRITICAL (${usage}% used)"
        return 1
    fi
}

# 检查内存使用
check_memory() {
    log_info "Checking memory usage..."

    local usage
    usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')

    if [ "$usage" -lt 80 ]; then
        log_info "✅ Memory usage: OK (${usage}% used)"
        return 0
    elif [ "$usage" -lt 90 ]; then
        log_warn "⚠️ Memory usage: WARNING (${usage}% used)"
        return 0
    else
        log_error "❌ Memory usage: CRITICAL (${usage}% used)"
        return 1
    fi
}

# 检查应用进程
check_process() {
    log_info "Checking application process..."

    if pgrep -f "node.*server.js" > /dev/null; then
        local pid
        pid=$(pgrep -f "node.*server.js")
        log_info "✅ Application process: OK (PID: $pid)"
        return 0
    else
        log_error "❌ Application process: NOT RUNNING"
        return 1
    fi
}

# 主健康检查函数
main_health_check() {
    local url="$1"
    local timeout="$2"
    local retries="$3"
    local detailed="$4"

    log_info "Starting health check for: $url"

    local attempt=1
    while [ $attempt -le $retries ]; do
        log_info "Attempt $attempt/$retries..."

        if [ "$detailed" = "true" ]; then
            if detailed_health_check "$url" "$timeout"; then
                log_info "✅ Health check: PASSED"
                return 0
            fi
        else
            if basic_health_check "$url" "$timeout"; then
                log_info "✅ Health check: PASSED"
                return 0
            fi
        fi

        if [ $attempt -lt $retries ]; then
            log_warn "Health check failed, retrying in 2 seconds..."
            sleep 2
        fi

        ((attempt++))
    done

    log_error "❌ Health check: FAILED after $retries attempts"
    return 1
}

# 完整系统检查
full_system_check() {
    log_info "🔍 Starting full system health check..."

    local checks_passed=0
    local total_checks=6

    # 应用健康检查
    if main_health_check "$HEALTH_URL" "$TIMEOUT" "$MAX_RETRIES" "true"; then
        ((checks_passed++))
    fi

    # 数据库检查
    if check_database; then
        ((checks_passed++))
    fi

    # Redis检查
    if check_redis; then
        ((checks_passed++))
    fi

    # 磁盘空间检查
    if check_disk_space; then
        ((checks_passed++))
    fi

    # 内存检查
    if check_memory; then
        ((checks_passed++))
    fi

    # 进程检查
    if check_process; then
        ((checks_passed++))
    fi

    log_info "📊 Health check summary: $checks_passed/$total_checks checks passed"

    if [ $checks_passed -eq $total_checks ]; then
        log_info "🎉 All health checks passed!"
        return 0
    else
        log_error "💥 Some health checks failed!"
        return 1
    fi
}

# 显示帮助信息
show_help() {
    cat << EOF
Test Web Health Check Script

Usage: $0 [OPTIONS]

Options:
    -u, --url URL           Health check URL (default: http://localhost:3000/health)
    -t, --timeout SECONDS   Request timeout (default: 10)
    -r, --retries COUNT     Max retry attempts (default: 3)
    -d, --detailed          Show detailed response
    -f, --full              Run full system check
    -h, --help              Show this help message

Examples:
    $0                                    # Basic health check
    $0 --detailed                        # Detailed health check
    $0 --full                            # Full system check
    $0 -u http://example.com/health      # Custom URL
    $0 -t 30 -r 5                       # Custom timeout and retries

EOF
}

# 解析命令行参数
parse_args() {
    local detailed=false
    local full_check=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -u|--url)
                HEALTH_URL="$2"
                shift 2
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            -r|--retries)
                MAX_RETRIES="$2"
                shift 2
                ;;
            -d|--detailed)
                detailed=true
                shift
                ;;
            -f|--full)
                full_check=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    if [ "$full_check" = "true" ]; then
        full_system_check
    else
        main_health_check "$HEALTH_URL" "$TIMEOUT" "$MAX_RETRIES" "$detailed"
    fi
}

# 主函数
main() {
    if [ $# -eq 0 ]; then
        # 默认基础健康检查
        main_health_check "$HEALTH_URL" "$TIMEOUT" "$MAX_RETRIES" "false"
    else
        parse_args "$@"
    fi
}

# 执行主函数
main "$@"
