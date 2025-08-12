# 环境变量配置指南 (更新版)

## 🎯 配置文件结构优化

经过清理整理，现在项目使用**清晰分离**的环境配置结构：

## 📁 **新的配置文件分布**

### **根目录 `.env`** - 前端专用配置
```bash
# 位置：./.env
# 用途：前端开发配置，Vite构建变量
# 读取：Vite前端构建系统
# 特点：所有变量以VITE_开头，会被打包到前端代码中
```

**包含配置：**
- 前端开发服务器 (`VITE_DEV_PORT`, `VITE_API_URL`)
- 应用基本信息 (`VITE_APP_NAME`, `VITE_APP_VERSION`)
- 前端功能开关 (`VITE_ENABLE_*`)
- 前端安全配置 (`VITE_MAX_LOGIN_ATTEMPTS`)
- 第三方API密钥 (仅前端使用的)
- 全局环境设置

### **server/.env** - 后端专用配置
```bash
# 位置：server/.env
# 用途：后端服务器、数据库连接、敏感配置
# 读取：Node.js后端服务器
# 特点：包含所有敏感信息，不会暴露给前端
```

**包含配置：**
- 服务器配置 (`PORT`, `HOST`, `NODE_ENV`)
- 数据库连接 (`DATABASE_URL`, `DB_*`) - PostgreSQL
- Redis缓存 (`REDIS_*`)
- 认证安全 (`JWT_SECRET`, `SESSION_SECRET`, `BCRYPT_ROUNDS`)
- 第三方服务 (`MAXMIND_LICENSE_KEY`, `GOOGLE_*`)
- 测试引擎 (`K6_*`, `LIGHTHOUSE_*`, `PLAYWRIGHT_*`)
- 邮件服务 (`SMTP_*`)
- 监控配置 (`MONITORING_*`)
- 文件上传 (`MAX_FILE_SIZE`, `UPLOAD_*`)
- 日志配置 (`LOG_*`)
- CORS和限流 (`CORS_*`, `RATE_LIMIT_*`)

## 📋 **模板文件**

### **`.env.example`** - 前端配置模板
```bash
# 位置：./.env.example
# 用途：前端环境配置模板
# 使用：复制为 .env 并修改配置值
```

### **`server/.env.example`** - 后端配置模板
```bash
# 位置：server/.env.example
# 用途：后端环境配置模板
# 使用：复制为 server/.env 并修改配置值
```

## 🔧 **配置规范**

### **✅ 正确的配置分离**

#### **根目录 `.env`** - 前端专用
```bash
# ===========================================
# 前端开发配置
# ===========================================

# 前端开发服务器
VITE_DEV_PORT=5174
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001

# 应用信息
VITE_APP_NAME=Test Web App
VITE_APP_VERSION=1.0.0

# 功能开关
VITE_ENABLE_MOCK_DATA=false
VITE_ENABLE_DEBUG=true

# 缓存配置
REDIS_HOST=localhost
REDIS_PORT=6379

# 前端配置
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=Test Web App

# 全局配置
NODE_ENV=development
CORS_ORIGIN=http://localhost:5174
PORT=3001
```

#### **server/.env****
```bash
# ===========================================
# 后端专用配置
# ===========================================

# MaxMind GeoLite2 配置
MAXMIND_LICENSE_KEY=your_license_key_here

# 地理位置自动更新配置
GEO_AUTO_UPDATE=true
GEO_UPDATE_SCHEDULE="0 2 * * 3"
GEO_CHECK_STARTUP=true
TZ=Asia/Shanghai

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Redis配置
REDIS_URL=redis://localhost:6379

# 其他后端配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🚫 **避免的错误配置**

### **❌ 错误：配置重复**
```bash
# 不要在两个文件中都配置相同的变量
# 根目录 .env
DATABASE_URL=...

# server/.env  
DATABASE_URL=...  # ❌ 重复配置
```

### **❌ 错误：配置混用**
```bash
# 不要在前端配置中放后端专用配置
# 根目录 .env
MAXMIND_LICENSE_KEY=...  # ❌ 应该在 server/.env
JWT_SECRET=...           # ❌ 应该在 server/.env
```

### **❌ 错误：路径混乱**
```javascript
// 不要在后端服务中读取根目录配置
require('dotenv').config({ path: '../.env' }); // ❌ 错误路径
```

## 📋 **配置检查清单**

### **✅ 配置验证**

1. **检查文件存在**：
   ```bash
   ls -la .env          # 根目录配置
   ls -la server/.env   # 后端配置
   ```

2. **检查配置加载**：
   ```bash
   # 在后端服务中
   console.log('MAXMIND_LICENSE_KEY:', !!process.env.MAXMIND_LICENSE_KEY);
   ```

3. **检查配置分离**：
   - 前端相关 → 根目录 `.env`
   - 后端专用 → `server/.env`
   - 无重复配置

### **🔧 修复步骤**

如果发现配置混乱：

1. **备份现有配置**：
   ```bash
   cp .env .env.backup
   cp server/.env server/.env.backup
   ```

2. **清理重复配置**：
   - 移除重复的环境变量
   - 确保每个变量只在一个文件中

3. **验证服务启动**：
   ```bash
   npm start  # 检查是否正常启动
   ```

## 🎯 **最佳实践**

### **1. 配置命名规范**
- 前端变量：`VITE_*`
- 数据库变量：`DB_*` 或 `DATABASE_*`
- 服务专用：按服务分组

### **2. 安全考虑**
- 敏感信息只放在 `server/.env`
- 确保 `.env` 文件在 `.gitignore` 中
- 提供 `.env.example` 模板

### **3. 文档维护**
- 更新配置时同步更新文档
- 提供清晰的配置说明
- 标明必需和可选配置

## 🚀 **当前项目状态**

✅ **已修复：**
- 后端服务明确读取 `server/.env`
- 地理位置服务正确加载配置
- 配置路径规范化

⚠️ **需要注意：**
- 避免在两个文件中重复配置
- 新增配置时选择正确的文件
- 定期检查配置一致性

现在配置应该清晰分离，避免混用问题！
