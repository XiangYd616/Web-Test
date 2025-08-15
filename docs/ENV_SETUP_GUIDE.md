# 环境配置设置指南 (清理整理版)

## 🎯 配置文件结构

经过清理整理，项目现在使用**清晰分离**的环境配置结构：

### 📁 配置文件分布

```
Test-Web/
├── .env                    # 前端专用配置
├── .env.example           # 前端配置模板
├── backend/
│   ├── .env              # 后端专用配置
│   └── .env.example      # 后端配置模板
```

## 🔧 配置文件说明

### 1. 根目录 `.env` - 前端专用配置

**用途**: 前端开发配置，Vite构建变量  
**特点**: 所有变量以 `VITE_` 开头，会被打包到前端代码中

**主要配置项**:
```bash
# 前端开发服务器
VITE_DEV_PORT=5174
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001

# 应用基本信息
VITE_APP_NAME=Test Web App
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=企业级网站测试平台

# 前端功能开关
VITE_ENABLE_MOCK_DATA=false
VITE_ENABLE_DEBUG=true
VITE_ENABLE_ANALYTICS=false

# 前端安全配置
VITE_MAX_LOGIN_ATTEMPTS=5
VITE_SESSION_TIMEOUT=86400000

# 文件上传限制 (前端)
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf

# 第三方API (前端使用)
VITE_GOOGLE_PAGESPEED_API_KEY=your_api_key
VITE_GTMETRIX_API_KEY=your_api_key
```

### 2. `backend/.env` - 后端专用配置

**用途**: 后端服务器、数据库连接、敏感配置  
**特点**: 包含所有敏感信息，不会暴露给前端

**主要配置项**:
```bash
# 服务器配置
NODE_ENV=development
PORT=3001
HOST=localhost
TZ=Asia/Shanghai

# 数据库配置 (PostgreSQL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/testweb_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_dev
DB_USER=postgres
DB_PASSWORD=password

# Redis缓存配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_ENABLED=true

# 认证和安全
JWT_SECRET=your-super-secure-jwt-secret-here
SESSION_SECRET=your-super-secure-session-secret-here
BCRYPT_ROUNDS=12

# CORS配置
CORS_ORIGIN=http://localhost:5174,http://localhost:3000

# 限流配置
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=5

# 文件上传配置
MAX_FILE_SIZE=50mb
UPLOAD_DIR=uploads

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/app.log

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 第三方服务 (后端使用)
MAXMIND_LICENSE_KEY=your_license_key
GOOGLE_PAGESPEED_API_KEY=your_api_key
GTMETRIX_API_KEY=your_api_key

# 测试引擎配置
K6_ENABLED=true
LIGHTHOUSE_ENABLED=true
PLAYWRIGHT_ENABLED=true
TEST_TIMEOUT=30000
```

## 🚀 快速设置

### 1. 首次设置
```bash
# 1. 复制配置模板
cp .env.example .env
cp backend/.env.example backend/.env

# 2. 编辑前端配置
nano .env

# 3. 编辑后端配置
nano backend/.env

# 4. 验证配置
node backend/scripts/validate-env.js
```

### 2. 必须修改的配置

#### 前端配置 (`.env`)
```bash
# 根据实际情况修改API地址
VITE_API_URL=http://localhost:3001/api

# 配置第三方API密钥
VITE_GOOGLE_PAGESPEED_API_KEY=your_real_api_key
```

#### 后端配置 (`backend/.env`)
```bash
# 修改数据库连接
DB_PASSWORD=your_secure_password

# 修改JWT密钥 (生产环境必须)
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
SESSION_SECRET=your-super-secure-session-secret-min-32-chars

# 配置邮件服务
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 配置第三方服务
MAXMIND_LICENSE_KEY=your_license_key
```

## 🔒 安全注意事项

### ✅ 安全最佳实践
1. **生产环境必须修改所有默认密钥**
2. **不要将包含真实密钥的 `.env` 文件提交到版本控制**
3. **前端配置不要包含敏感信息** (会暴露给用户)
4. **使用强密码和复杂密钥**
5. **定期更换API密钥和JWT密钥**

### ❌ 已删除的重复文件
- `.env.cloud` - 功能重复
- `.env.production` - 功能重复  
- `.env.frontend.example.bak` - 过时文件
- `backend/.env.local` - 功能重复

### ✅ Git忽略配置
`.gitignore` 已更新，确保以下文件被忽略：
```
.env
.env.local
backend/.env
backend/.env.local
```

## 📚 相关文档

- [项目结构指南](PROJECT_STRUCTURE.md)
- [数据库配置指南](DATABASE_COMPLETE_GUIDE.md)
- [原环境配置指南](ENV_CONFIGURATION_GUIDE.md)

## 🎉 清理效果

- ✅ **配置文件数量**: 8个 → 4个
- ✅ **配置结构**: 混乱 → 清晰分离
- ✅ **重复配置**: 大量重复 → 完全消除
- ✅ **安全性**: 前后端混合 → 敏感信息隔离
- ✅ **维护性**: 难以维护 → 易于管理

---

**版本**: 2.0 - 清理整理版  
**更新时间**: 2023-12-08  
**状态**: ✅ 清理完成  
**维护团队**: Test Web App Development Team
