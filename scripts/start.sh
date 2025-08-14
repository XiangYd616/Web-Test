#!/bin/bash

# Test Web 应用启动脚本

set -e

echo "🚀 Starting Test Web Application..."

# 检查环境变量
check_env_vars() {
    local required_vars=("NODE_ENV" "DB_HOST" "DB_PASSWORD" "JWT_SECRET")
    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo "❌ Missing required environment variables:"
        printf '%s\n' "${missing_vars[@]}"
        exit 1
    fi
}

# 等待数据库连接
wait_for_db() {
    echo "⏳ Waiting for database connection..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USER:-testweb}" > /dev/null 2>&1; then
            echo "✅ Database is ready"
            return 0
        fi

        echo "Attempt $attempt/$max_attempts: Database not ready, waiting..."
        sleep 2
        ((attempt++))
    done

    echo "❌ Database connection timeout"
    exit 1
}

# 等待Redis连接
wait_for_redis() {
    echo "⏳ Waiting for Redis connection..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if redis-cli -h "$REDIS_HOST" -p "${REDIS_PORT:-6379}" ping > /dev/null 2>&1; then
            echo "✅ Redis is ready"
            return 0
        fi

        echo "Attempt $attempt/$max_attempts: Redis not ready, waiting..."
        sleep 2
        ((attempt++))
    done

    echo "❌ Redis connection timeout"
    exit 1
}

# 运行数据库迁移
run_migrations() {
    echo "📊 Running database migrations..."

    cd /app/backend

    if npm run migrate; then
        echo "✅ Database migrations completed"
    else
        echo "❌ Database migrations failed"
        exit 1
    fi

    cd /app
}

# 预热应用
warmup_app() {
    echo "🔥 Warming up application..."

    # 启动应用在后台
    node backend/dist/server.js &
    local app_pid=$!

    # 等待应用启动
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            echo "✅ Application is ready"
            kill $app_pid 2>/dev/null || true
            wait $app_pid 2>/dev/null || true
            return 0
        fi

        echo "Attempt $attempt/$max_attempts: Application not ready, waiting..."
        sleep 2
        ((attempt++))
    done

    echo "❌ Application warmup timeout"
    kill $app_pid 2>/dev/null || true
    exit 1
}

# 设置信号处理
setup_signal_handlers() {
    trap 'echo "🛑 Received SIGTERM, shutting down gracefully..."; kill -TERM $app_pid; wait $app_pid' TERM
    trap 'echo "🛑 Received SIGINT, shutting down gracefully..."; kill -INT $app_pid; wait $app_pid' INT
}

# 主函数
main() {
    echo "🔍 Checking environment..."
    check_env_vars

    echo "🔗 Waiting for dependencies..."
    wait_for_db
    wait_for_redis

    echo "📊 Setting up database..."
    run_migrations

    echo "🔥 Warming up application..."
    warmup_app

    echo "🎯 Setting up signal handlers..."
    setup_signal_handlers

    echo "🚀 Starting application..."
    node backend/dist/server.js &
    app_pid=$!

    echo "✅ Test Web Application started successfully (PID: $app_pid)"
    echo "🌐 Application is running on port 3000"
    echo "📊 Health check: http://localhost:3000/health"

    # 等待应用进程
    wait $app_pid

    echo "👋 Test Web Application stopped"
}

# 执行主函数
main "$@"
