# Test-Web 生产部署指南

## 部署模式

| 模式         | 环境变量                   | 说明                             | 最低配置  |
| ------------ | -------------------------- | -------------------------------- | --------- |
| **云端精简** | `DEPLOY_MODE=cloud`        | 仅认证/同步/数据管理，无测试引擎 | 1核/512MB |
| **全功能**   | `DEPLOY_MODE=full`（默认） | 含 Puppeteer/测试引擎/定时任务   | 2核/2GB   |

> **推荐**：海外服务器使用 `DEPLOY_MODE=cloud`，测试执行由桌面端本地完成。

## 域名规划

| 用途     | 域名                                    | 部署位置     |
| -------- | --------------------------------------- | ------------ |
| 官网     | `xiangweb.space` / `www.xiangweb.space` | Vercel       |
| Web 应用 | `app.xiangweb.space`                    | Vercel       |
| API 后端 | `api.xiangweb.space`                    | 海外云服务器 |

## DNS 记录配置

| Host  | Type  | Value                  | TTL    |
| ----- | ----- | ---------------------- | ------ |
| `api` | A     | `<服务器IP>`           | 30 min |
| `@`   | CNAME | `cname.vercel-dns.com` | 30 min |
| `www` | CNAME | `cname.vercel-dns.com` | 30 min |
| `app` | CNAME | `cname.vercel-dns.com` | 30 min |

> 注意：Vercel 部署后会提供具体的 CNAME 地址，以实际值为准。 `@`
> 记录如果不能改为 CNAME（某些 DNS 不支持根域 CNAME），保留 A 记录指向 Vercel
> IP。

---

## 一、后端 API 部署（海外云服务器）

### 前置条件

- Ubuntu 22.04+
- Root 或 sudo 权限
- 推荐：日本/新加坡节点（国内延迟低）

### 快速部署

```bash
# 1. SSH 到服务器
ssh root@<服务器IP>

# 2. 克隆代码
git clone https://github.com/XiangYd616/Web-Test.git /opt/testweb-src
cd /opt/testweb-src

# 3. 运行部署脚本
chmod +x deploy/setup-server.sh
bash deploy/setup-server.sh
```

### 手动部署步骤

```bash
# 1. 安装依赖
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx postgresql postgresql-contrib
sudo npm install -g pm2 pnpm

# 2. 配置 PostgreSQL
sudo -u postgres createuser testweb
sudo -u postgres createdb testweb -O testweb
sudo -u postgres psql -c "ALTER USER testweb PASSWORD 'YOUR_DB_PASSWORD';"

# 3. 构建后端
cd /opt/testweb-src/backend
pnpm install
pnpm run build

# 4. 配置环境变量
mkdir -p /opt/testweb/logs /opt/testweb/data
cp backend/.env.production /opt/testweb/.env
# ⚠️ 务必修改以下值：
#   DEPLOY_MODE=cloud
#   PG_PASSWORD=<数据库密码>
#   JWT_SECRET=<生成强随机字符串>
#   SESSION_SECRET=<生成强随机字符串>
nano /opt/testweb/.env

# 5. 复制构建产物
rsync -av --delete backend/dist/ /opt/testweb/dist/
cp backend/package.json backend/ecosystem.config.cjs /opt/testweb/
cd /opt/testweb && pnpm install --prod

# 6. 运行数据库迁移
psql -U testweb -d testweb < /opt/testweb-src/deploy/init-pg.sql
psql -U testweb -d testweb < /opt/testweb-src/backend/modules/migrations/2026-02-27_001_add_sync_fields.sql

# 7. 配置 Nginx
sudo cp /opt/testweb-src/deploy/nginx/api.xiangweb.space.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/api.xiangweb.space /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 8. 获取 SSL 证书
sudo certbot --nginx -d api.xiangweb.space

# 9. 启动服务
cd /opt/testweb
pm2 start ecosystem.config.cjs --env production
pm2 save && pm2 startup

# 10. 验证
curl https://api.xiangweb.space/health
```

### 生成安全密钥

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 云端精简模式说明

设置 `DEPLOY_MODE=cloud` 后，服务器**跳过**以下模块：

- Puppeteer 浏览器池（节省 1GB+ 内存）
- 9 个测试引擎（性能/安全/SEO/无障碍/压力/API/兼容性/UX/网站）
- 性能基准服务
- 存储归档/清理服务
- 定时运行服务

**保留**的功能：认证、同步、用户管理、工作空间/集合/环境、管理后台、WebSocket。

---

## 二、官网部署（Vercel）

### 步骤

1. 登录 [Vercel](https://vercel.com)
2. Import Git Repository → 选择 `Web-Test`
3. 配置：
   - **Framework Preset**: Vite
   - **Root Directory**: `website`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. 环境变量：
   - `VITE_APP_URL` = `https://app.xiangweb.space`
   - `VITE_API_URL` = `https://api.xiangweb.space/api`
5. Deploy
6. 在 Vercel 项目设置 → Domains → 添加 `xiangweb.space` 和 `www.xiangweb.space`

---

## 三、前端 Web 应用部署（Vercel）

### 步骤

1. 在 Vercel 创建新项目（或同一 repo 的另一个部署）
2. 配置：
   - **Root Directory**: `.`（项目根目录，因为 vite.config.ts 在根目录）
   - **Build Command**: `npx vite build`
   - **Output Directory**: `frontend/dist`
3. 环境变量：
   - `VITE_API_URL` = `https://api.xiangweb.space/api`
   - `VITE_WS_URL` = `wss://api.xiangweb.space`
4. Deploy
5. Domains → 添加 `app.xiangweb.space`

---

## 四、桌面端发布

桌面端已内置 `api.xiangweb.space` 作为云端 API 地址，用户无需配置。

### 构建发布包

```bash
npm run electron:build    # 在项目根目录执行，构建 Windows 安装包
```

### 自动更新

- 通过 GitHub Releases 发布新版本
- 桌面端使用 `electron-updater` 自动检测更新
- 回退方案：通过 `api.xiangweb.space/api/system/version` 检查版本

### 发布新版本流程

1. 更新 `tools/electron/package.json` 中的 `version`
2. 构建所有平台安装包
3. 在 GitHub 创建 Release，上传安装包
4. 桌面端会自动检测到更新

---

## 五、验证清单

- [ ] `https://api.xiangweb.space/health` 返回 200
- [ ] `https://xiangweb.space` 官网可访问
- [ ] `https://app.xiangweb.space` Web 应用可登录/注册
- [ ] 桌面端启动后可连接云端、同步正常
- [ ] 桌面端"版本更新"功能正常
