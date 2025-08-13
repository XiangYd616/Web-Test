# 数据库设置指南

## 🚀 快速设置

### 1. 安装PostgreSQL

#### Windows
1. 下载PostgreSQL安装包：https://www.postgresql.org/download/windows/
2. 运行安装程序，记住设置的密码
3. 默认用户名是 `postgres`

#### macOS
```bash
# 使用Homebrew安装
brew install postgresql
brew services start postgresql

# 创建数据库用户
createuser -s postgres
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. 配置数据库

#### 方法1: 使用默认postgres用户
```bash
# 切换到postgres用户
sudo -u postgres psql

# 在psql中执行
ALTER USER postgres PASSWORD '123456';
CREATE DATABASE test_platform;
\q
```

#### 方法2: 创建新用户
```bash
# 切换到postgres用户
sudo -u postgres psql

# 创建新用户和数据库
CREATE USER testuser WITH PASSWORD '123456';
CREATE DATABASE test_platform OWNER testuser;
GRANT ALL PRIVILEGES ON DATABASE test_platform TO testuser;
\q
```

### 3. 更新配置文件

编辑 `database/.env` 文件：

```bash
# 如果使用postgres用户
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_platform
DB_USER=postgres
DB_PASSWORD=123456
DB_SSL=false

# 如果使用新创建的用户
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_platform
DB_USER=testuser
DB_PASSWORD=123456
DB_SSL=false
```

### 4. 测试连接

```bash
# 测试数据库连接
node database/test-connection.js

# 如果连接成功，初始化数据库
npm run db:init
```

## 🔧 故障排除

### 问题1: 连接被拒绝 (ECONNREFUSED)

**原因**: PostgreSQL服务未运行

**解决方案**:
```bash
# Windows
# 在服务管理器中启动PostgreSQL服务

# macOS
brew services start postgresql

# Ubuntu/Debian
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### 问题2: 密码认证失败 (28P01)

**原因**: 用户名或密码错误

**解决方案**:
1. 重置postgres用户密码：
```bash
sudo -u postgres psql
ALTER USER postgres PASSWORD 'new_password';
\q
```

2. 更新 `database/.env` 中的密码

### 问题3: 数据库不存在 (3D000)

**原因**: 目标数据库未创建

**解决方案**:
```bash
# 方法1: 使用命令行
createdb -U postgres test_platform

# 方法2: 使用psql
sudo -u postgres psql
CREATE DATABASE test_platform;
\q
```

### 问题4: 权限不足

**原因**: 用户没有足够权限

**解决方案**:
```bash
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE test_platform TO your_user;
\q
```

## 🔐 安全配置

### 生产环境建议

1. **创建专用用户**:
```sql
CREATE USER test_platform_user WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE test_platform TO test_platform_user;
GRANT USAGE ON SCHEMA public TO test_platform_user;
GRANT CREATE ON SCHEMA public TO test_platform_user;
```

2. **限制连接**:
编辑 `postgresql.conf`:
```
listen_addresses = 'localhost'
max_connections = 100
```

3. **配置认证**:
编辑 `pg_hba.conf`:
```
# 本地连接使用密码认证
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
```

## 📋 验证清单

- [ ] PostgreSQL已安装并运行
- [ ] 数据库用户已创建
- [ ] 数据库已创建
- [ ] 用户有适当权限
- [ ] 环境变量已配置
- [ ] 连接测试通过
- [ ] 数据库已初始化

## 🆘 获取帮助

如果仍然遇到问题：

1. 检查PostgreSQL日志：
```bash
# Ubuntu/Debian
sudo tail -f /var/log/postgresql/postgresql-*.log

# macOS
tail -f /usr/local/var/log/postgresql.log
```

2. 检查服务状态：
```bash
# Ubuntu/Debian
sudo systemctl status postgresql

# macOS
brew services list | grep postgresql
```

3. 验证端口：
```bash
netstat -tulpn | grep 5432
```

## 🎯 下一步

数据库设置完成后：

1. 运行初始化：`npm run db:init`
2. 创建管理员：`npm run db:create-admin`
3. 查看状态：`npm run db:status`
4. 启动应用：`npm run dev`
