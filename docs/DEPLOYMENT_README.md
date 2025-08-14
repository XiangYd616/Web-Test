# Test Web App 生产环境部署指南

⚠️ **注意**: 此文档用于生产环境部署，开发环境请使用 `npm start`

## 🌍 环境说明

- **开发环境**: 使用 `testweb_dev` 数据库，`npm start`
- **生产环境**: 使用 `testweb_prod` 数据库，`NODE_ENV=production npm start`

## 📦 文件清单

需要上传到服务器的文件：

1. **complete-deploy.sh** - 完整部署脚本
2. **backend/app-simple.js** - 简化版服务器应用
3. **client/index.html** - 前端页面
4. **init-database.sql** - 数据库初始化脚本
5. **README-DEPLOY.md** - 本说明文件

## 🚀 部署步骤

### 1. 上传文件到服务器

使用MobaXterm或scp命令将所有文件上传到服务器的 `/opt/test-web-app/` 目录：

```bash
# 在服务器上创建目录
sudo mkdir -p /opt/test-web-app
cd /opt/test-web-app

# 上传文件（在本地执行）
scp complete-deploy.sh root@8.137.111.126:/opt/test-web-app/
scp backend/app-simple.js root@8.137.111.126:/opt/test-web-app/backend/
scp client/index.html root@8.137.111.126:/opt/test-web-app/client/
scp init-database.sql root@8.137.111.126:/opt/test-web-app/
```

### 2. 初始化数据库

```bash
# 连接到服务器后执行
cd /opt/test-web-app

# 初始化数据库
sudo -u postgres psql -d testweb_prod -f init-database.sql

# 验证数据库
sudo -u postgres psql -d testweb_prod -c "\dt"
sudo -u postgres psql -d testweb_prod -c "SELECT username, role FROM users;"
```

### 3. 执行部署脚本

```bash
# 设置执行权限
chmod +x complete-deploy.sh

# 执行部署
./complete-deploy.sh
```

### 4. 验证部署

```bash
# 检查服务状态
pm2 status
sudo systemctl status nginx

# 测试API
curl http://localhost:3001/api/health
curl http://localhost:3001/api/health/db

# 测试前端
curl -I http://localhost/
```

### 5. 访问应用

- **前端地址**: http://8.137.111.126
- **API地址**: http://8.137.111.126:3001/api/health

## 👤 默认账户

部署完成后，可以使用以下默认账户登录：

### 管理员账户
- **用户名**: admin
- **密码**: admin123
- **角色**: 管理员

### 测试账户
- **用户名**: testuser
- **密码**: test123
- **角色**: 测试员

## 🔧 故障排除

### 1. 服务启动失败

```bash
# 查看PM2日志
pm2 logs test-web-app

# 查看详细错误
pm2 logs test-web-app --lines 50
```

### 2. 数据库连接失败

```bash
# 检查数据库服务
sudo systemctl status postgresql

# 检查数据库连接
sudo -u postgres psql -d testweb_prod -c "SELECT NOW();"

# 检查用户权限
sudo -u postgres psql -d testweb_prod -c "SELECT * FROM pg_user WHERE usename = 'testweb_user';"
```

### 3. Nginx配置问题

```bash
# 检查Nginx配置
sudo nginx -t

# 查看Nginx日志
sudo tail -f /var/log/nginx/error.log

# 重启Nginx
sudo systemctl restart nginx
```

### 4. 端口占用问题

```bash
# 检查端口占用
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :80

# 杀死占用进程
sudo kill -9 <PID>
```

## 📝 配置说明

### 环境变量 (.env)

```bash
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_prod
DB_USER=testweb_user
DB_PASSWORD=testweb_password_2025
JWT_SECRET=your-super-secret-jwt-key-change-in-production-2025
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://8.137.111.126
```

### Nginx配置

- 前端文件位置: `/opt/test-web-app/client/public`
- API代理: `localhost:3001/api/`
- 静态文件缓存: 禁用（开发阶段）

## 🔄 更新应用

如需更新应用：

1. 停止服务: `pm2 stop test-web-app`
2. 备份数据: `sudo -u postgres pg_dump testweb_prod > backup.sql`
3. 更新文件
4. 重启服务: `pm2 restart test-web-app`
5. 重启Nginx: `sudo systemctl restart nginx`

## 📊 监控和日志

```bash
# 查看应用状态
pm2 status
pm2 monit

# 查看应用日志
pm2 logs test-web-app

# 查看系统资源
htop
df -h
free -h

# 查看网络连接
sudo netstat -tlnp
```

## 🛡️ 安全建议

1. **修改默认密码**: 登录后立即修改admin和testuser的密码
2. **更新JWT密钥**: 修改.env文件中的JWT_SECRET
3. **配置防火墙**: 只开放必要的端口（80, 22, 3001）
4. **定期备份**: 设置数据库自动备份
5. **监控日志**: 定期检查应用和系统日志

## 📞 技术支持

如遇到问题，请检查：

1. 所有文件是否正确上传
2. 数据库是否正确初始化
3. 服务是否正常启动
4. 网络端口是否开放
5. 防火墙设置是否正确

部署成功后，访问 http://8.137.111.126 即可使用Test Web App！
