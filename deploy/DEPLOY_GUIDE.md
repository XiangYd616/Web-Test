# Test-Web 生产部署指南

## 域名规划

| 用途 | 域名 | 部署位置 |
|------|------|----------|
| 官网 | `xiangweb.space` / `www.xiangweb.space` | Vercel |
| Web 应用 | `app.xiangweb.space` | Vercel |
| API 后端 | `api.xiangweb.space` | 服务器 8.137.111.126 |

## DNS 记录配置（Spaceship）

在 Spaceship 域名管理中添加以下 DNS 记录：

| Host | Type | Value | TTL |
|------|------|-------|-----|
| `api` | A | `8.137.111.126` | 30 min |
| `@` | CNAME | `cname.vercel-dns.com` | 30 min |
| `www` | CNAME | `cname.vercel-dns.com` | 30 min |
| `app` | CNAME | `cname.vercel-dns.com` | 30 min |

> 注意：Vercel 部署后会提供具体的 CNAME 地址，以实际值为准。
> `@` 记录如果不能改为 CNAME（某些 DNS 不支持根域 CNAME），保留 A 记录指向 Vercel IP。

---

## 一、后端 API 部署（服务器 8.137.111.126）

### 前置条件
- Ubuntu 20.04+ 或 CentOS 7+
- Root 或 sudo 权限

### 快速部署
```bash
# 1. SSH 到服务器
ssh root@8.137.111.126

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
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx
sudo npm install -g pm2

# 2. 构建后端
cd backend
npm ci
npm run build

# 3. 配置环境变量
cp .env.production /opt/testweb/.env
# ⚠️ 务必修改以下值：
#   JWT_SECRET=<生成强随机字符串>
#   SESSION_SECRET=<生成强随机字符串>
nano /opt/testweb/.env

# 4. 配置 Nginx
sudo cp deploy/nginx/api.xiangweb.space.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/api.xiangweb.space /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 5. 获取 SSL 证书
sudo certbot --nginx -d api.xiangweb.space

# 6. 启动服务
cd /opt/testweb
pm2 start ecosystem.config.cjs --env production
pm2 save && pm2 startup

# 7. 验证
curl https://api.xiangweb.space/api/health
```

### 生成安全密钥
```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

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
cd tools/electron
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
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

- [ ] `https://api.xiangweb.space/api/health` 返回 200
- [ ] `https://xiangweb.space` 官网可访问
- [ ] `https://app.xiangweb.space` Web 应用可登录
- [ ] 桌面端启动后可连接云端
- [ ] 桌面端"版本更新"功能正常
