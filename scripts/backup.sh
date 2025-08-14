#!/bin/bash

# Test Web 备份脚本

set -e

# 配置
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-testweb}"
DB_USER="${DB_USER:-testweb}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 创建备份目录
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log_info "Created backup directory: $BACKUP_DIR"
    fi
}

# 数据库备份
backup_database() {
    log_info "Starting database backup..."

    local backup_file="$BACKUP_DIR/database_$TIMESTAMP.sql"

    if PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-password \
        --format=custom \
        --file="$backup_file"; then

        log_info "✅ Database backup completed: $backup_file"

        # 压缩备份文件
        gzip "$backup_file"
        log_info "✅ Database backup compressed: $backup_file.gz"

        return 0
    else
        log_error "❌ Database backup failed"
        return 1
    fi
}

# 文件备份
backup_files() {
    log_info "Starting file backup..."

    local backup_file="$BACKUP_DIR/files_$TIMESTAMP.tar.gz"
    local files_to_backup=(
        "uploads"
        "logs"
        "config"
        ".env"
    )

    local existing_files=()
    for file in "${files_to_backup[@]}"; do
        if [ -e "$file" ]; then
            existing_files+=("$file")
        fi
    done

    if [ ${#existing_files[@]} -gt 0 ]; then
        if tar -czf "$backup_file" "${existing_files[@]}"; then
            log_info "✅ File backup completed: $backup_file"
            return 0
        else
            log_error "❌ File backup failed"
            return 1
        fi
    else
        log_warn "⚠️ No files to backup"
        return 0
    fi
}

# 清理旧备份
cleanup_old_backups() {
    log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."

    local deleted_count=0

    # 清理数据库备份
    while IFS= read -r -d '' file; do
        rm "$file"
        ((deleted_count++))
        log_info "Deleted old backup: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "database_*.sql.gz" -type f -mtime +$RETENTION_DAYS -print0 2>/dev/null)

    # 清理文件备份
    while IFS= read -r -d '' file; do
        rm "$file"
        ((deleted_count++))
        log_info "Deleted old backup: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "files_*.tar.gz" -type f -mtime +$RETENTION_DAYS -print0 2>/dev/null)

    if [ $deleted_count -gt 0 ]; then
        log_info "✅ Cleaned up $deleted_count old backup files"
    else
        log_info "ℹ️ No old backups to clean up"
    fi
}

# 验证备份
verify_backup() {
    local db_backup="$BACKUP_DIR/database_$TIMESTAMP.sql.gz"
    local file_backup="$BACKUP_DIR/files_$TIMESTAMP.tar.gz"

    log_info "Verifying backups..."

    local verification_passed=true

    # 验证数据库备份
    if [ -f "$db_backup" ]; then
        if gzip -t "$db_backup" 2>/dev/null; then
            local size=$(stat -f%z "$db_backup" 2>/dev/null || stat -c%s "$db_backup" 2>/dev/null)
            log_info "✅ Database backup verified (size: $size bytes)"
        else
            log_error "❌ Database backup verification failed"
            verification_passed=false
        fi
    fi

    # 验证文件备份
    if [ -f "$file_backup" ]; then
        if tar -tzf "$file_backup" >/dev/null 2>&1; then
            local size=$(stat -f%z "$file_backup" 2>/dev/null || stat -c%s "$file_backup" 2>/dev/null)
            log_info "✅ File backup verified (size: $size bytes)"
        else
            log_error "❌ File backup verification failed"
            verification_passed=false
        fi
    fi

    if [ "$verification_passed" = true ]; then
        log_info "🎉 All backups verified successfully"
        return 0
    else
        log_error "💥 Backup verification failed"
        return 1
    fi
}

# 发送通知
send_notification() {
    local status="$1"
    local message="$2"

    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local color="good"
        local emoji="✅"

        if [ "$status" != "success" ]; then
            color="danger"
            emoji="❌"
        fi

        curl -X POST -H 'Content-type: application/json' \
            --data "{
                "text": "$emoji Backup $status",
                "attachments": [
                    {
                        "color": "$color",
                        "fields": [
                            {
                                "title": "Message",
                                "value": "$message",
                                "short": false
                            },
                            {
                                "title": "Timestamp",
                                "value": "$TIMESTAMP",
                                "short": true
                            },
                            {
                                "title": "Server",
                                "value": "$(hostname)",
                                "short": true
                            }
                        ]
                    }
                ]
            }" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1
    fi
}

# 显示帮助
show_help() {
    cat << EOF
Test Web Backup Script

Usage: $0 [OPTIONS]

Options:
    --db-only           Backup database only
    --files-only        Backup files only
    --no-cleanup        Skip cleanup of old backups
    --verify            Verify backups after creation
    -h, --help          Show this help message

Environment Variables:
    BACKUP_DIR          Backup directory (default: ./backups)
    DB_HOST             Database host (default: localhost)
    DB_PORT             Database port (default: 5432)
    DB_NAME             Database name (default: testweb)
    DB_USER             Database user (default: testweb)
    DB_PASSWORD         Database password (required)
    RETENTION_DAYS      Backup retention days (default: 30)
    SLACK_WEBHOOK_URL   Slack webhook for notifications (optional)

Examples:
    $0                          # Full backup
    $0 --db-only               # Database backup only
    $0 --files-only            # Files backup only
    $0 --verify                # Backup with verification

EOF
}

# 主函数
main() {
    local db_only=false
    local files_only=false
    local no_cleanup=false
    local verify=false

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --db-only)
                db_only=true
                shift
                ;;
            --files-only)
                files_only=true
                shift
                ;;
            --no-cleanup)
                no_cleanup=true
                shift
                ;;
            --verify)
                verify=true
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

    # 检查必需的环境变量
    if [ -z "$DB_PASSWORD" ]; then
        log_error "DB_PASSWORD environment variable is required"
        exit 1
    fi

    log_info "🚀 Starting backup process..."
    log_info "Timestamp: $TIMESTAMP"
    log_info "Backup directory: $BACKUP_DIR"

    create_backup_dir

    local backup_success=true

    # 执行备份
    if [ "$files_only" != true ]; then
        if ! backup_database; then
            backup_success=false
        fi
    fi

    if [ "$db_only" != true ]; then
        if ! backup_files; then
            backup_success=false
        fi
    fi

    # 验证备份
    if [ "$verify" = true ] && [ "$backup_success" = true ]; then
        if ! verify_backup; then
            backup_success=false
        fi
    fi

    # 清理旧备份
    if [ "$no_cleanup" != true ]; then
        cleanup_old_backups
    fi

    # 发送通知
    if [ "$backup_success" = true ]; then
        log_info "🎉 Backup completed successfully"
        send_notification "success" "Backup completed successfully at $TIMESTAMP"
        exit 0
    else
        log_error "💥 Backup failed"
        send_notification "failed" "Backup failed at $TIMESTAMP"
        exit 1
    fi
}

# 执行主函数
main "$@"
