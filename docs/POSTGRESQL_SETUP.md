# 🐘 PostgreSQL 数据库安装和配置指南

## 🎯 **概述**

本指南将帮助您安装和配置 PostgreSQL 数据库，为 Test Web App 项目提供统一的用户账户存储。

---

## 📋 **安装 PostgreSQL**

### **Windows 系统**

#### **方法 1: 官方安装程序（推荐）**

1. **下载 PostgreSQL**
   - 访问 [PostgreSQL 官网](https://www.postgresql.org/download/windows/)
   - 下载最新版本的 Windows 安装程序
   - 推荐版本：PostgreSQL 15 或 16

2. **运行安装程序**
   ```
   双击下载的 .exe 文件
   按照安装向导进行安装
   ```

3. **安装配置**
   - **安装目录**: 默认 `C:\Program Files\PostgreSQL\16`
   - **数据目录**: 默认 `C:\Program Files\PostgreSQL\16\data`
   - **端口**: 默认 `5432`
   - **超级用户**: `postgres`
   - **密码**: 设置一个强密码（记住这个密码！）

4. **组件选择**
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4 (图形化管理工具)
   - ✅ Stack Builder (可选)
   - ✅ Command Line Tools

#### **方法 2: 使用 Chocolatey**

```powershell
# 安装 Chocolatey (如果还没有)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装 PostgreSQL
choco install postgresql
```

#### **方法 3: 使用 Docker**

```powershell
# 拉取 PostgreSQL 镜像
docker pull postgres:16

# 运行 PostgreSQL 容器
docker run --name testweb-postgres `
  -e POSTGRES_PASSWORD=testweb_password `
  -e POSTGRES_USER=testweb_user `
  -e POSTGRES_DB=testweb_db `
  -p 5432:5432 `
  -d postgres:16
```

### **macOS 系统**

#### **方法 1: 使用 Homebrew（推荐）**

```bash
# 安装 Homebrew (如果还没有)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 PostgreSQL
brew install postgresql@16

# 启动 PostgreSQL 服务
brew services start postgresql@16
```

#### **方法 2: 官方安装程序**

1. 访问 [PostgreSQL 官网](https://www.postgresql.org/download/macosx/)
2. 下载 macOS 安装程序
3. 按照安装向导进行安装

### **Linux 系统**

#### **Ubuntu/Debian**

```bash
# 更新包列表
sudo apt update

# 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib

# 启动 PostgreSQL 服务
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### **CentOS/RHEL/Fedora**

```bash
# 安装 PostgreSQL
sudo dnf install postgresql postgresql-server postgresql-contrib

# 初始化数据库
sudo postgresql-setup --initdb

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## ⚙️ **配置 PostgreSQL**

### **1. 创建数据库用户**

```sql
-- 连接到 PostgreSQL (使用 postgres 超级用户)
psql -U postgres

-- 创建项目用户
CREATE USER testweb_user WITH PASSWORD 'testweb_password';

-- 创建项目数据库
CREATE DATABASE testweb_db OWNER testweb_user;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE testweb_db TO testweb_user;

-- 退出
\q
```

### **2. 配置连接权限**

编辑 PostgreSQL 配置文件：

#### **Windows**
```
文件位置: C:\Program Files\PostgreSQL\16\data\pg_hba.conf
```

#### **macOS (Homebrew)**
```
文件位置: /opt/homebrew/var/postgresql@16/pg_hba.conf
```

#### **Linux**
```
文件位置: /etc/postgresql/16/main/pg_hba.conf
```

在文件中添加或修改以下行：

```conf
# 允许本地连接
local   all             testweb_user                            md5
host    all             testweb_user    127.0.0.1/32           md5
host    all             testweb_user    ::1/128                md5
```

### **3. 重启 PostgreSQL 服务**

#### **Windows**
```powershell
# 使用服务管理器或命令行
net stop postgresql-x64-16
net start postgresql-x64-16
```

#### **macOS (Homebrew)**
```bash
brew services restart postgresql@16
```

#### **Linux**
```bash
sudo systemctl restart postgresql
```

---

## 🔧 **项目配置**

### **1. 环境变量配置**

编辑项目根目录的 `.env` 文件：

```env
# 数据库配置
DATABASE_URL=postgresql://testweb_user:testweb_password@localhost:5432/testweb_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_db
DB_USER=testweb_user
DB_PASSWORD=testweb_password

# JWT 配置
JWT_SECRET=testweb-super-secret-jwt-key-for-development-only
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# 应用配置
NODE_ENV=development
APP_PORT=3001
APP_HOST=localhost
```

### **2. 初始化数据库**

```bash
# 安装依赖
npm install

# 初始化数据库和运行迁移
npm run db:init

# 检查迁移状态
npm run db:status
```

### **3. 验证连接**

```bash
# 测试数据库连接
psql -U testweb_user -d testweb_db -h localhost -p 5432

# 如果连接成功，您应该看到：
# testweb_db=>
```

---

## 🧪 **测试数据库功能**

### **1. 检查表结构**

```sql
-- 连接到数据库
psql -U testweb_user -d testweb_db

-- 查看所有表
\dt

-- 查看用户表结构
\d users

-- 查看系统用户
SELECT username, email, role, status FROM users;
```

### **2. 测试用户注册和登录**

```bash
# 启动开发服务器
npm run dev

# 在浏览器中访问 http://localhost:5174
# 尝试注册新用户和登录
```

---

## 🔍 **故障排除**

### **常见问题**

#### **1. 连接被拒绝**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解决方案:**
- 检查 PostgreSQL 服务是否运行
- 检查端口 5432 是否被占用
- 检查防火墙设置

#### **2. 认证失败**
```
Error: password authentication failed for user "testweb_user"
```

**解决方案:**
- 检查用户名和密码是否正确
- 检查 `pg_hba.conf` 配置
- 重启 PostgreSQL 服务

#### **3. 数据库不存在**
```
Error: database "testweb_db" does not exist
```

**解决方案:**
- 运行 `npm run db:init` 创建数据库
- 手动创建数据库：`CREATE DATABASE testweb_db;`

#### **4. 权限不足**
```
Error: permission denied for table users
```

**解决方案:**
- 检查用户权限：`GRANT ALL PRIVILEGES ON DATABASE testweb_db TO testweb_user;`
- 检查表权限：`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO testweb_user;`

### **调试命令**

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS
Get-Service postgresql*  # Windows PowerShell

# 查看 PostgreSQL 日志
sudo tail -f /var/log/postgresql/postgresql-16-main.log  # Linux
tail -f /opt/homebrew/var/log/postgresql@16.log  # macOS

# 测试连接
pg_isready -h localhost -p 5432 -U testweb_user

# 查看活动连接
psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

---

## 🚀 **生产环境配置**

### **安全建议**

1. **更改默认密码**
   ```sql
   ALTER USER postgres PASSWORD 'strong_password_here';
   ALTER USER testweb_user PASSWORD 'strong_password_here';
   ```

2. **限制连接**
   ```conf
   # 只允许特定 IP 连接
   host    testweb_db      testweb_user    192.168.1.0/24        md5
   ```

3. **启用 SSL**
   ```conf
   ssl = on
   ssl_cert_file = 'server.crt'
   ssl_key_file = 'server.key'
   ```

4. **配置防火墙**
   ```bash
   # Ubuntu/Debian
   sudo ufw allow from 192.168.1.0/24 to any port 5432
   
   # CentOS/RHEL
   sudo firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='192.168.1.0/24' port protocol='tcp' port='5432' accept"
   ```

### **备份策略**

```bash
# 创建备份
pg_dump -U testweb_user -h localhost testweb_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复备份
psql -U testweb_user -h localhost testweb_db < backup_20251215_120000.sql

# 自动备份脚本
echo "0 2 * * * pg_dump -U testweb_user testweb_db > /backups/testweb_\$(date +\%Y\%m\%d).sql" | crontab -
```

---

## ✅ **验证清单**

- [ ] PostgreSQL 已安装并运行
- [ ] 数据库用户 `testweb_user` 已创建
- [ ] 数据库 `testweb_db` 已创建
- [ ] 连接权限已配置
- [ ] 环境变量已设置
- [ ] 数据库迁移已运行
- [ ] 用户表已创建
- [ ] 系统用户已插入
- [ ] 应用可以连接数据库
- [ ] 用户注册和登录功能正常

---

**🎉 PostgreSQL 配置完成！现在您可以享受统一的用户账户管理系统了！**
