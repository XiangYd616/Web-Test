# 环境变量配置指南

## 快速开始

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，更新必要的配置

3. 验证配置：
```bash
node scripts/validate-env.js
```

## 必需的环境变量

### 数据库配置
```env
DB_HOST=localhost          # 数据库主机
DB_PORT=5432              # 数据库端口
DB_NAME=testweb_prod      # 数据库名称
DB_USER=postgres          # 数据库用户名
DB_PASSWORD=your_password # 数据库密码（请更改默认值）
```

### 安全配置
```env
JWT_SECRET=your-super-secure-jwt-secret-here-min-32-chars
```

## 推荐的环境变量

### 服务器配置
```env
NODE_ENV=development      # 环境：development/production/test
PORT=3001                # 服务器端口
HOST=localhost           # 服务器主机
```

### CORS配置
```env
CORS_ORIGIN=http://localhost:5174,http://localhost:3000
```

### 速率限制
```env
RATE_LIMIT_WINDOW_MS=900000           # 15分钟
RATE_LIMIT_MAX_REQUESTS=100           # 100请求/15分钟
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=5       # 5次登录尝试/15分钟
REGISTER_RATE_LIMIT_MAX_ATTEMPTS=3    # 3次注册尝试/1小时
```

### 文件上传
```env
MAX_FILE_SIZE=50mb        # 最大文件大小
UPLOAD_DIR=uploads        # 上传目录
TEMP_DIR=temp            # 临时目录
```

### 日志配置
```env
LOG_LEVEL=info           # 日志级别：debug/info/warn/error
LOG_DIR=logs             # 日志目录
```

## 生产环境配置

### 安全性要求

1. **JWT密钥**：至少64个字符的随机字符串
```env
JWT_SECRET=your-production-jwt-secret-min-64-chars-random-string
```

2. **数据库密码**：使用强密码
```env
DB_PASSWORD=your-secure-production-database-password
```

3. **会话密钥**：
```env
SESSION_SECRET=your-production-session-secret-min-64-chars
```

### 生产环境示例
```env
NODE_ENV=production
JWT_SECRET=prod-jwt-secret-64-chars-minimum-random-secure-string-here
SESSION_SECRET=prod-session-secret-64-chars-minimum-random-secure-string
DB_PASSWORD=your-secure-production-password
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
LOG_LEVEL=warn
DEBUG_SQL=false
```

## 可选配置

### 邮件服务（用于通知）
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@testweb.com
```

### Redis缓存
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 测试配置
```env
TEST_TIMEOUT=30000        # 测试超时时间（毫秒）
TEST_MAX_CONCURRENT=5     # 最大并发测试数
TEST_RETRY_ATTEMPTS=3     # 重试次数
K6_BINARY_PATH=k6         # K6二进制文件路径
```

### 监控配置
```env
DEFAULT_MONITOR_INTERVAL=300  # 默认监控间隔（秒）
DEFAULT_MONITOR_TIMEOUT=30    # 默认监控超时（秒）
MAX_MONITOR_SITES=100         # 最大监控站点数
```

## 环境变量验证

运行验证脚本检查配置：
```bash
node scripts/validate-env.js
```

验证脚本会检查：
- ✅ 必需变量是否设置
- ⚠️ 推荐变量是否配置
- 🔒 安全性检查
- 📊 配置总结

## 常见问题

### 1. JWT_SECRET太短
**错误**：JWT_SECRET应该至少32个字符
**解决**：生成更长的随机字符串
```bash
# 生成64字符的随机字符串
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. 数据库连接失败
**检查**：
- 数据库服务是否运行
- 用户名密码是否正确
- 数据库名称是否存在
- 防火墙设置

### 3. CORS错误
**解决**：确保前端URL在CORS_ORIGIN中
```env
CORS_ORIGIN=http://localhost:5174,http://localhost:3000,https://yourdomain.com
```

## 安全建议

1. **永远不要**将 `.env` 文件提交到版本控制
2. **生产环境**使用强密码和长密钥
3. **定期更换**JWT密钥和数据库密码
4. **限制**CORS源只包含必要的域名
5. **监控**日志文件以发现异常活动

## 部署检查清单

- [ ] 复制并配置 `.env` 文件
- [ ] 设置强密码和密钥
- [ ] 配置正确的CORS源
- [ ] 运行环境变量验证
- [ ] 测试数据库连接
- [ ] 检查日志配置
- [ ] 验证文件权限
