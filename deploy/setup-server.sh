#!/bin/bash
# ===========================================
# Test-Web 后端服务器部署脚本
# 云端精简模式 (DEPLOY_MODE=cloud)
# ===========================================
set -e

echo "🚀 开始部署 Test-Web API 服务器（云端精简模式）..."

# 1. 系统更新 + 安装基础工具
echo "📦 安装基础依赖..."
sudo apt-get update
sudo apt-get install -y curl git

# 2. 安装 Node.js 20.x (如未安装)
if ! command -v node &> /dev/null; then
    echo "📦 安装 Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 3. 安装 PM2 + pnpm
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    sudo npm install -g pm2
fi
if ! command -v pnpm &> /dev/null; then
    echo "📦 安装 pnpm..."
    sudo npm install -g pnpm
fi

# 4. 安装 PostgreSQL (如未安装)
if ! command -v psql &> /dev/null; then
    echo "📦 安装 PostgreSQL..."
    sudo apt-get install -y postgresql postgresql-contrib
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
fi

# 5. 安装 Nginx (如未安装)
if ! command -v nginx &> /dev/null; then
    echo "📦 安装 Nginx..."
    sudo apt-get install -y nginx
fi

# 6. 安装 Certbot (SSL证书)
if ! command -v certbot &> /dev/null; then
    echo "📦 安装 Certbot..."
    sudo apt-get install -y certbot python3-certbot-nginx
fi

# 7. 创建数据库（如不存在）
echo "🗄️ 配置 PostgreSQL..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='testweb'" | grep -q 1 || \
    sudo -u postgres createuser testweb
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='testweb'" | grep -q 1 || \
    sudo -u postgres createdb testweb -O testweb
echo "   请手动设置数据库密码: sudo -u postgres psql -c \"ALTER USER testweb PASSWORD 'YOUR_PASSWORD';\""

# 8. 创建应用目录
APP_DIR="/opt/testweb"
SRC_DIR="/opt/testweb-src"
sudo mkdir -p $APP_DIR/logs
sudo mkdir -p $APP_DIR/data
sudo chown -R $USER:$USER $APP_DIR

echo "📁 应用目录: $APP_DIR"
echo "📁 源码目录: $SRC_DIR"

# 9. 构建后端
echo "🔨 构建后端..."
cd $SRC_DIR/backend
pnpm install
pnpm run build
cd $SRC_DIR

# 10. 复制到部署目录
echo "📋 部署文件..."
rsync -av --delete backend/dist/ $APP_DIR/dist/
cp backend/package.json $APP_DIR/
[ -f backend/ecosystem.config.cjs ] && cp backend/ecosystem.config.cjs $APP_DIR/

# 复制生产环境配置（如不存在）
if [ ! -f $APP_DIR/.env ]; then
    cp backend/.env.production $APP_DIR/.env
    # 自动追加 DEPLOY_MODE=cloud
    echo "" >> $APP_DIR/.env
    echo "# 云端精简模式（跳过 Puppeteer/测试引擎等重模块）" >> $APP_DIR/.env
    echo "DEPLOY_MODE=cloud" >> $APP_DIR/.env
fi

# 11. 安装生产依赖
cd $APP_DIR
pnpm install --prod
cd $SRC_DIR

# 12. 运行数据库迁移
echo "🗄️ 运行数据库迁移..."
[ -f deploy/init-pg.sql ] && sudo -u postgres psql -d testweb < deploy/init-pg.sql 2>/dev/null || true
for migration in backend/modules/migrations/*.sql; do
    echo "   迁移: $(basename $migration)"
    sudo -u postgres psql -d testweb < "$migration" 2>/dev/null || true
done

# 13. 配置 Nginx
echo "🔧 配置 Nginx..."
sudo cp deploy/nginx/api.xiangweb.space.conf /etc/nginx/sites-available/api.xiangweb.space
sudo ln -sf /etc/nginx/sites-available/api.xiangweb.space /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 14. 获取 SSL 证书（需要域名已解析到本机）
echo "🔒 获取 SSL 证书..."
echo "   注意：请确保 api.xiangweb.space DNS A 记录已指向本机 IP"
sudo certbot --nginx -d api.xiangweb.space --non-interactive --agree-tos -m admin@xiangweb.space || \
    echo "   ⚠️ SSL 证书获取失败，请确认 DNS 已生效后手动运行: sudo certbot --nginx -d api.xiangweb.space"

# 15. 启动/重启 PM2
echo "🚀 启动 PM2..."
cd $APP_DIR
if [ -f ecosystem.config.cjs ]; then
    pm2 startOrRestart ecosystem.config.cjs --env production
else
    pm2 start dist/backend/server.js --name testweb-api
fi
pm2 save
pm2 startup

echo ""
echo "============================================"
echo "✅ 部署完成！（云端精简模式）"
echo "============================================"
echo ""
echo "   API: https://api.xiangweb.space"
echo "   健康检查: https://api.xiangweb.space/health"
echo ""
echo "📝 后续操作:"
echo "   1. 设置数据库密码:"
echo "      sudo -u postgres psql -c \"ALTER USER testweb PASSWORD 'YOUR_PASSWORD';\""
echo "   2. 编辑 $APP_DIR/.env 填写:"
echo "      - PG_PASSWORD=<数据库密码>"
echo "      - JWT_SECRET=<运行: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\">"
echo "      - SESSION_SECRET=<运行: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\">"
echo "   3. 重启服务: pm2 restart testweb-api"
echo "   4. 查看日志: pm2 logs testweb-api"
echo ""
