# 环境变量配置指南

## 📁 **配置文件分布**

### **根目录 `.env`** - 前端和全局配置
```bash
# 位置：./env
# 用途：前端构建、全局数据库连接、CORS等
# 读取：Vite前端构建、根目录脚本
```

**包含配置：**
- 数据库连接 (`DATABASE_URL`)
- 前端API地址 (`VITE_API_URL`)
- CORS配置 (`CORS_ORIGIN`)
- 全局环境设置

### **server/.env** - 后端专用配置
```bash
# 位置：server/.env
# 用途：后端服务专用配置
# 读取：Express服务器、后端脚本
```

**包含配置：**
- MaxMind许可证 (`MAXMIND_LICENSE_KEY`)
- JWT密钥 (`JWT_SECRET`)
- 邮件配置 (`SMTP_*`)
- 后端专用服务配置

## 🔧 **配置规范**

### **✅ 正确的配置分离**

#### **根目录 `.env`**
```bash
# ===========================================
# 前端和全局配置
# ===========================================

# 数据库配置
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/testweb_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_dev
DB_USER=postgres
DB_PASSWORD=postgres

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
