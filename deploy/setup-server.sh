#!/bin/bash
# ===========================================
# Test-Web 后端服务器部署脚本
# 服务器: 8.137.111.126 (api.xiangweb.space)
# ===========================================
set -e

echo "🚀 开始部署 Test-Web API 服务器..."

# 1. 安装 Node.js 20.x (如未安装)
if ! command -v node &> /dev/null; then
    echo "📦 安装 Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. 安装 PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    sudo npm install -g pm2
fi

# 3. 安装 Nginx (如未安装)
if ! command -v nginx &> /dev/null; then
    echo "📦 安装 Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# 4. 安装 Certbot (SSL证书)
if ! command -v certbot &> /dev/null; then
    echo "📦 安装 Certbot..."
    sudo apt-get install -y certbot python3-certbot-nginx
fi

# 5. 创建应用目录
APP_DIR="/opt/testweb"
sudo mkdir -p $APP_DIR/logs
sudo mkdir -p $APP_DIR/data
sudo chown -R $USER:$USER $APP_DIR

echo "📁 应用目录: $APP_DIR"

# 6. 复制 Nginx 配置
echo "🔧 配置 Nginx..."
sudo cp deploy/nginx/api.xiangweb.space.conf /etc/nginx/sites-available/api.xiangweb.space
sudo ln -sf /etc/nginx/sites-available/api.xiangweb.space /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 7. 获取 SSL 证书
echo "🔒 获取 SSL 证书..."
sudo certbot --nginx -d api.xiangweb.space --non-interactive --agree-tos -m admin@xiangweb.space

# 8. 构建后端
echo "🔨 构建后端..."
cd backend
npm ci --production=false
npm run build
cd ..

# 9. 复制到部署目录
echo "📋 部署文件..."
rsync -av --delete \
    backend/dist/ $APP_DIR/dist/
rsync -av \
    backend/package.json \
    backend/package-lock.json \
    backend/ecosystem.config.cjs \
    $APP_DIR/

# 复制生产环境配置
cp backend/.env.production $APP_DIR/.env

# 10. 安装生产依赖
cd $APP_DIR
npm ci --production
cd -

# 11. 启动/重启 PM2
echo "🚀 启动 PM2..."
cd $APP_DIR
pm2 startOrRestart ecosystem.config.cjs --env production
pm2 save
pm2 startup

echo ""
echo "✅ 部署完成！"
echo "   API: https://api.xiangweb.space"
echo "   健康检查: https://api.xiangweb.space/api/health"
echo ""
echo "📝 后续操作:"
echo "   1. 编辑 $APP_DIR/.env 填写 JWT_SECRET 等敏感配置"
echo "   2. pm2 restart testweb-api"
echo "   3. 检查日志: pm2 logs testweb-api"
