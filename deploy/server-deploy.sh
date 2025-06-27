#!/bin/bash

# Test Web App 服务器端部署脚本
# 在服务器上运行此脚本来部署应用

set -e

echo "🚀 开始部署 Test Web App..."

# 配置变量
APP_DIR="/opt/test-web-app"
BACKUP_DIR="$APP_DIR/backups"
DEPLOY_FILE="/tmp/testweb-deploy.zip"
NEW_VERSION_DIR="$APP_DIR/new-version"
CURRENT_DIR="$APP_DIR/current"
WEB_ROOT="/var/www/html"

# 检查部署文件是否存在
if [ ! -f "$DEPLOY_FILE" ]; then
    echo "❌ 错误: 未找到部署文件 $DEPLOY_FILE"
    echo "请先上传 testweb-deploy.zip 到 /tmp/ 目录"
    exit 1
fi

echo "✅ 找到部署文件: $DEPLOY_FILE"

# 创建必要的目录
mkdir -p "$APP_DIR" "$BACKUP_DIR" "$NEW_VERSION_DIR"

# 备份当前版本
if [ -d "$CURRENT_DIR" ]; then
    echo "📦 备份当前版本..."
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    cp -r "$CURRENT_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    echo "✅ 备份完成: $BACKUP_DIR/$BACKUP_NAME"
    
    # 保留最近10个备份
    cd "$BACKUP_DIR"
    ls -t | tail -n +11 | xargs -r rm -rf
fi

# 停止服务
echo "🛑 停止服务..."
pm2 stop test-web-app 2>/dev/null || echo "PM2应用未运行"
systemctl stop nginx 2>/dev/null || echo "Nginx未运行"

# 解压新版本
echo "📦 解压新版本..."
rm -rf "$NEW_VERSION_DIR"
mkdir -p "$NEW_VERSION_DIR"
cd "$NEW_VERSION_DIR"
unzip -q "$DEPLOY_FILE"

# 检查解压结果
if [ ! -d "dist" ] || [ ! -d "server" ]; then
    echo "❌ 错误: 部署包格式不正确"
    echo "应包含 dist/ 和 server/ 目录"
    exit 1
fi

echo "✅ 解压完成"

# 更新应用文件
echo "🔄 更新应用文件..."
rm -rf "$CURRENT_DIR"
mv "$NEW_VERSION_DIR" "$CURRENT_DIR"

# 安装服务器依赖
echo "📦 安装服务器依赖..."
cd "$CURRENT_DIR/server"
npm install --production --silent

# 更新前端文件
echo "🌐 更新前端文件..."
rm -rf "$WEB_ROOT"/*
cp -r "$CURRENT_DIR/dist"/* "$WEB_ROOT/"

# 设置权限
chown -R www-data:www-data "$WEB_ROOT"
chmod -R 755 "$WEB_ROOT"

# 启动服务
echo "🚀 启动服务..."

# 启动后端服务
cd "$CURRENT_DIR/server"
pm2 start app.js --name test-web-app --update-env

# 启动Nginx
systemctl start nginx

# 等待服务启动
sleep 3

# 检查服务状态
echo "🔍 检查服务状态..."

# 检查PM2状态
if pm2 list | grep -q "test-web-app.*online"; then
    echo "✅ 后端服务运行正常"
else
    echo "❌ 后端服务启动失败"
    pm2 logs test-web-app --lines 10
    exit 1
fi

# 检查Nginx状态
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx运行正常"
else
    echo "❌ Nginx启动失败"
    systemctl status nginx
    exit 1
fi

# 健康检查
echo "🏥 执行健康检查..."
if curl -s http://localhost/api/health > /dev/null; then
    echo "✅ API健康检查通过"
else
    echo "⚠️  API健康检查失败，但服务可能仍在启动中"
fi

# 清理部署文件
rm -f "$DEPLOY_FILE"

echo ""
echo "🎉 部署完成！"
echo ""
echo "📍 访问地址:"
echo "   前端: http://8.137.111.126"
echo "   API:  http://8.137.111.126/api"
echo "   健康检查: http://8.137.111.126/api/health"
echo ""
echo "📊 服务状态:"
pm2 status
echo ""
echo "📝 如需查看日志:"
echo "   pm2 logs test-web-app"
echo "   tail -f /var/log/nginx/error.log"
echo ""
echo "🔄 如需回滚:"
echo "   cd $BACKUP_DIR"
echo "   ls -la  # 查看可用备份"
echo "   # 然后手动恢复备份版本"
