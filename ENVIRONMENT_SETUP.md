# 🌍 环境配置指南

## 📋 **双数据库架构**

项目采用**两个数据库，统一配置文件**的方案：

| 环境 | 数据库名 | 配置文件 | 自动选择 |
|------|----------|----------|----------|
| **开发环境** | `testweb_dev` | `.env` | `NODE_ENV=development` |
| **生产环境** | `testweb_prod` | `.env.production` | `NODE_ENV=production` |

## 🔧 **自动数据库选择**

代码会根据 `NODE_ENV` 自动选择数据库：

```javascript
// server/config/database.js
const getDefaultDatabase = () => {
  return process.env.NODE_ENV === 'production' ? 'testweb_prod' : 'testweb_dev';
};
```

## 🚀 **使用方法**

### **开发环境** (默认)
```bash
# 使用 .env 配置，自动连接 testweb_dev
npm start
```

### **生产环境**
```bash
# 方法1: 设置环境变量
NODE_ENV=production npm start

# 方法2: 使用生产配置文件
cp .env.production .env
npm start

# 方法3: 通过环境变量覆盖
NODE_ENV=production DB_NAME=testweb_prod npm start
```

## 🗄️ **数据库初始化**

### **创建两个数据库**
```bash
# 方法1: 使用SQL脚本
psql -U postgres -f scripts/setup-databases.sql

# 方法2: 手动创建
psql -U postgres -c "CREATE DATABASE testweb_dev;"
psql -U postgres -c "CREATE DATABASE testweb_prod;"
```

### **初始化数据表**
```bash
# 开发环境
NODE_ENV=development npm run db:init

# 生产环境  
NODE_ENV=production npm run db:init
```

## 📊 **配置优先级**

配置的优先级顺序：
1. **环境变量** (最高优先级)
2. **配置文件** (.env)
3. **代码默认值** (最低优先级)

```bash
# 示例：覆盖数据库名
DB_NAME=custom_db npm start
```

## 🔄 **环境切换**

### **从开发切换到生产**
```bash
# 1. 备份开发数据（可选）
pg_dump testweb_dev > backup_dev.sql

# 2. 确保生产数据库存在
psql -U postgres -c "CREATE DATABASE testweb_prod;"

# 3. 初始化生产数据库
NODE_ENV=production npm run db:init

# 4. 启动生产环境
NODE_ENV=production npm start
```

### **数据迁移**
```bash
# 从开发环境复制数据到生产环境
pg_dump testweb_dev | psql testweb_prod
```

## 🛡️ **安全注意事项**

### **生产环境安全**
1. **修改默认密码**
   ```env
   DB_PASSWORD=secure_production_password
   JWT_SECRET=your-unique-jwt-secret
   ```

2. **限制数据库访问**
   ```sql
   -- 创建专用用户
   CREATE USER testweb_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE testweb_prod TO testweb_user;
   ```

3. **配置文件安全**
   ```bash
   # 不要提交生产配置到版本控制
   echo ".env.production" >> .gitignore
   ```

## 🔍 **故障排除**

### **数据库连接问题**
```bash
# 检查数据库是否存在
psql -U postgres -l | grep testweb

# 测试连接
psql -h localhost -U postgres -d testweb_dev -c "SELECT 1;"
psql -h localhost -U postgres -d testweb_prod -c "SELECT 1;"
```

### **环境变量问题**
```bash
# 检查当前环境
echo $NODE_ENV

# 检查数据库配置
node -e "console.log(require('./server/config/database.js'))"
```

## 📚 **相关命令**

```bash
# 查看当前配置
npm run config:show

# 初始化开发数据库
npm run db:init:dev

# 初始化生产数据库  
npm run db:init:prod

# 重置开发数据库
npm run db:reset:dev

# 备份数据库
npm run db:backup:dev
npm run db:backup:prod
```

## 🎯 **最佳实践**

1. **开发阶段**：始终使用 `testweb_dev`
2. **测试阶段**：可以创建 `testweb_test` 数据库
3. **生产部署**：使用 `testweb_prod` 并确保数据安全
4. **定期备份**：特别是生产环境数据
5. **环境隔离**：不要在生产环境进行开发测试

---

**记住**：两个数据库，一套配置，环境变量自动切换！🎯
