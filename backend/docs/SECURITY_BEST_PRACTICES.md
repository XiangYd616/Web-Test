# 安全最佳实践指南

## 📋 目录
- [认证与授权](#认证与授权)
- [输入验证](#输入验证)
- [SQL注入防护](#sql注入防护)
- [XSS防护](#xss防护)
- [CSRF防护](#csrf防护)
- [密码安全](#密码安全)
- [数据加密](#数据加密)
- [会话管理](#会话管理)
- [API安全](#api安全)
- [日志与监控](#日志与监控)
- [依赖管理](#依赖管理)
- [配置安全](#配置安全)

---

## 认证与授权

### ✅ 最佳实践

1. **使用JWT进行无状态认证**
   ```javascript
   const jwt = require('jsonwebtoken');
   
   // 生成Token
   const token = jwt.sign(
     { userId: user.id, email: user.email },
     process.env.JWT_SECRET,
     { expiresIn: '7d' }
   );
   ```

2. **实施角色based访问控制(RBAC)**
   ```javascript
   const requireRole = (roles) => {
     return (req, res, next) => {
       if (!roles.includes(req.user.role)) {
         throw createError('FORBIDDEN', 'Insufficient permissions');
       }
       next();
     };
   };
   
   // 使用
   router.delete('/users/:id', requireRole(['admin']), deleteUser);
   ```

3. **实施MFA(多因素认证)**
   - 使用TOTP (Time-based OTP)
   - 支持备用恢复码
   - 验证码时间窗口控制

### ❌ 禁止做的事

- ❌ 在URL中传递敏感信息
- ❌ 在客户端存储敏感Token
- ❌ 使用过长的Token有效期
- ❌ 忽略Token刷新机制

---

## 输入验证

### ✅ 最佳实践

1. **使用express-validator进行验证**
   ```javascript
   const { body, validationResult } = require('express-validator');
   
   router.post('/users',
     body('email').isEmail().normalizeEmail(),
     body('password').isLength({ min: 8 }),
     (req, res) => {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
         return res.status(400).json({ errors: errors.array() });
       }
       // 处理请求
     }
   );
   ```

2. **验证所有输入源**
   - Query参数
   - Body数据
   - URL参数
   - Headers

3. **白名单验证优于黑名单**
   ```javascript
   // ✅ 好: 白名单
   const allowedFields = ['name', 'email', 'age'];
   const userData = {};
   allowedFields.forEach(field => {
     if (req.body[field]) userData[field] = req.body[field];
   });
   
   // ❌ 坏: 黑名单
   delete req.body.isAdmin;  // 容易遗漏
   ```

4. **数据类型验证**
   ```javascript
   // 使用统一的验证中间件
   const { validateTimeRange, validateUrl } = require('../middleware/validators');
   
   router.get('/test/history', validateTimeRange, getHistory);
   ```

### ❌ 禁止做的事

- ❌ 信任用户输入
- ❌ 仅在前端验证
- ❌ 使用简单的字符串替换清理输入
- ❌ 忽略文件上传验证

---

## SQL注入防护

### ✅ 最佳实践

1. **始终使用参数化查询**
   ```javascript
   // ✅ 正确: 参数化查询
   const [results] = await connection.execute(
     'SELECT * FROM users WHERE email = ?',
     [email]
   );
   
   // ❌ 错误: 字符串拼接
   const query = `SELECT * FROM users WHERE email = '${email}'`;
   ```

2. **使用ORM/查询构建器**
   ```javascript
   // 使用Sequelize
   const users = await User.findAll({
     where: { email: email }
   });
   ```

3. **输入验证和转义**
   ```javascript
   const { validateInteger } = require('../utils/validators');
   
   // 验证ID为整数
   const userId = validateInteger(req.params.userId);
   ```

4. **最小权限原则**
   - 数据库用户只授予必要权限
   - 禁用不必要的存储过程
   - 使用只读账户进行查询

### ✅ 已修复的SQL注入

项目中已修复的12处SQL注入漏洞:
- ✅ 测试统计查询
- ✅ 测试历史查询
- ✅ 测试分析数据
- ✅ 用户测试统计

详见: [URGENT_FIXES.md](./URGENT_FIXES.md)

---

## XSS防护

### ✅ 最佳实践

1. **使用Helmet设置安全头**
   ```javascript
   const helmet = require('helmet');
   
   app.use(helmet({
     contentSecurityPolicy: {
       directives: {
         defaultSrc: ["'self'"],
         scriptSrc: ["'self'", "'unsafe-inline'"],
         styleSrc: ["'self'", "'unsafe-inline'"],
         imgSrc: ["'self'", "data:", "https:"],
       }
     }
   }));
   ```

2. **输出编码**
   ```javascript
   const escape = require('escape-html');
   
   res.send(escape(userInput));
   ```

3. **设置适当的Content-Type**
   ```javascript
   res.setHeader('Content-Type', 'application/json; charset=utf-8');
   res.setHeader('X-Content-Type-Options', 'nosniff');
   ```

### ❌ 禁止做的事

- ❌ 直接在HTML中插入用户输入
- ❌ 使用`innerHTML`而不转义
- ❌ 禁用CSP或设置过于宽松

---

## CSRF防护

### ✅ 最佳实践

1. **使用CSRF Token**
   ```javascript
   const csrf = require('csurf');
   const csrfProtection = csrf({ cookie: true });
   
   app.post('/api/transfer', csrfProtection, transferMoney);
   ```

2. **SameSite Cookie属性**
   ```javascript
   res.cookie('token', token, {
     httpOnly: true,
     secure: true,
     sameSite: 'strict'
   });
   ```

3. **验证Origin/Referer头**
   ```javascript
   const validateOrigin = (req, res, next) => {
     const origin = req.get('origin');
     const allowedOrigins = process.env.CORS_ORIGIN.split(',');
     
     if (!allowedOrigins.includes(origin)) {
       return res.status(403).json({ error: 'Invalid origin' });
     }
     next();
   };
   ```

---

## 密码安全

### ✅ 最佳实践

1. **使用bcrypt哈希密码**
   ```javascript
   const bcrypt = require('bcrypt');
   
   // 注册时
   const hashedPassword = await bcrypt.hash(password, 10);
   
   // 登录验证
   const isValid = await bcrypt.compare(password, user.password);
   ```

2. **密码强度要求**
   ```javascript
   const validatePassword = (password) => {
     const minLength = 8;
     const hasUpper = /[A-Z]/.test(password);
     const hasLower = /[a-z]/.test(password);
     const hasNumber = /[0-9]/.test(password);
     const hasSpecial = /[!@#$%^&*]/.test(password);
     
     return password.length >= minLength && 
            hasUpper && hasLower && hasNumber && hasSpecial;
   };
   ```

3. **防止密码枚举**
   ```javascript
   // 统一错误消息
   if (!user || !await bcrypt.compare(password, user.password)) {
     return res.status(401).json({
       error: 'Invalid credentials'  // 不透露具体是哪个错误
     });
   }
   ```

4. **实施账户锁定**
   ```javascript
   // 5次失败后锁定30分钟
   if (user.failedAttempts >= 5) {
     const lockTime = 30 * 60 * 1000; // 30分钟
     if (Date.now() - user.lastFailedAttempt < lockTime) {
       throw createError('AUTH_ACCOUNT_LOCKED');
     }
   }
   ```

### ❌ 禁止做的事

- ❌ 存储明文密码
- ❌ 使用MD5或SHA1哈希密码
- ❌ 在日志中记录密码
- ❌ 通过邮件发送明文密码

---

## 数据加密

### ✅ 最佳实践

1. **传输加密(TLS/HTTPS)**
   ```javascript
   const https = require('https');
   const fs = require('fs');
   
   const options = {
     key: fs.readFileSync('private-key.pem'),
     cert: fs.readFileSync('certificate.pem')
   };
   
   https.createServer(options, app).listen(443);
   ```

2. **敏感数据加密**
   ```javascript
   const crypto = require('crypto');
   
   const algorithm = 'aes-256-gcm';
   const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
   
   function encrypt(text) {
     const iv = crypto.randomBytes(16);
     const cipher = crypto.createCipheriv(algorithm, key, iv);
     let encrypted = cipher.update(text, 'utf8', 'hex');
     encrypted += cipher.final('hex');
     const tag = cipher.getAuthTag();
     return { encrypted, iv: iv.toString('hex'), tag: tag.toString('hex') };
   }
   ```

3. **密钥管理**
   - 使用环境变量存储密钥
   - 定期轮换密钥
   - 使用密钥管理服务(KMS)

---

## 会话管理

### ✅ 最佳实践

1. **安全的Session配置**
   ```javascript
   app.use(session({
     secret: process.env.SESSION_SECRET,
     resave: false,
     saveUninitialized: false,
     cookie: {
       httpOnly: true,
       secure: true,  // 仅HTTPS
       maxAge: 24 * 60 * 60 * 1000,  // 24小时
       sameSite: 'strict'
     }
   }));
   ```

2. **Session失效**
   ```javascript
   // 登出时清除session
   router.post('/logout', (req, res) => {
     req.session.destroy();
     res.clearCookie('sessionId');
     res.json({ success: true });
   });
   ```

3. **并发Session控制**
   - 限制每个用户的活跃session数量
   - 记录session创建时的IP和User-Agent
   - 可疑活动时强制重新认证

---

## API安全

### ✅ 最佳实践

1. **速率限制**
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,  // 15分钟
     max: 100,  // 限制100次请求
     message: 'Too many requests'
   });
   
   app.use('/api/', limiter);
   ```

2. **API密钥管理**
   ```javascript
   const validateApiKey = (req, res, next) => {
     const apiKey = req.header('X-API-Key');
     
     if (!apiKey || !isValidApiKey(apiKey)) {
       throw createError('UNAUTHORIZED', 'Invalid API key');
     }
     next();
   };
   ```

3. **请求大小限制**
   ```javascript
   app.use(express.json({ limit: '10mb' }));
   app.use(express.urlencoded({ limit: '10mb', extended: true }));
   ```

4. **CORS配置**
   ```javascript
   const cors = require('cors');
   
   app.use(cors({
     origin: process.env.CORS_ORIGIN,
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE'],
     allowedHeaders: ['Content-Type', 'Authorization']
   }));
   ```

---

## 日志与监控

### ✅ 最佳实践

1. **安全日志记录**
   ```javascript
   const logger = require('../utils/logger');
   
   // 记录安全事件
   logger.warn('Failed login attempt', {
     email: req.body.email,
     ip: req.ip,
     userAgent: req.get('user-agent')
   });
   ```

2. **敏感信息过滤**
   ```javascript
   // 不要记录密码、Token等敏感信息
   const sanitizeLogData = (data) => {
     const sensitive = ['password', 'token', 'apiKey', 'secret'];
     const sanitized = { ...data };
     
     sensitive.forEach(key => {
       if (sanitized[key]) sanitized[key] = '[REDACTED]';
     });
     
     return sanitized;
   };
   ```

3. **监控异常活动**
   - 多次失败的登录尝试
   - 异常的API调用模式
   - 大量的404错误
   - 权限提升尝试

---

## 依赖管理

### ✅ 最佳实践

1. **定期更新依赖**
   ```bash
   # 检查过时的包
   npm outdated
   
   # 更新依赖
   npm update
   ```

2. **审计安全漏洞**
   ```bash
   # 运行安全审计
   npm audit
   
   # 自动修复
   npm audit fix
   ```

3. **使用lock文件**
   - 提交`package-lock.json`到版本控制
   - 确保CI/CD使用`npm ci`而非`npm install`

4. **最小化依赖**
   - 定期审查和清理未使用的依赖
   - 避免使用过于庞大的库
   - 优先使用知名且维护良好的包

### ✅ 项目改进

- ✅ 移除未使用的mongodb依赖
- ✅ 将jsonwebtoken移至dependencies
- ✅ 创建依赖文档

详见: [DEPENDENCIES.md](./DEPENDENCIES.md)

---

## 配置安全

### ✅ 最佳实践

1. **环境变量管理**
   ```javascript
   // ❌ 错误
   const dbPassword = 'hardcoded_password';
   
   // ✅ 正确
   const dbPassword = process.env.DB_PASSWORD;
   ```

2. **配置验证**
   ```javascript
   const Joi = require('joi');
   
   const envSchema = Joi.object({
     NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
     DB_PASSWORD: Joi.string().min(8).required(),
     JWT_SECRET: Joi.string().min(32).required()
   }).unknown();
   
   const { error } = envSchema.validate(process.env);
   if (error) {
     throw new Error(`Config validation error: ${error.message}`);
   }
   ```

3. **敏感配置隔离**
   - 使用`.env`文件(不提交到Git)
   - 生产环境使用密钥管理服务
   - 不同环境使用不同的密钥

### ✅ 项目改进

- ✅ 创建环境变量验证模块
- ✅ 使用Joi验证配置
- ✅ 启动时检查必需配置

详见: [config/environment.js](../config/environment.js)

---

## 错误处理

### ✅ 最佳实践

1. **统一错误响应**
   ```javascript
   // 使用统一错误处理
   const { createError } = require('../utils/errorCodes');
   
   throw createError('AUTH_TOKEN_EXPIRED', {
     userId: user.id,
     expiredAt: token.exp
   });
   ```

2. **不泄露敏感信息**
   ```javascript
   // ❌ 错误: 暴露堆栈跟踪
   res.status(500).json({ error: error.stack });
   
   // ✅ 正确: 通用错误消息
   res.status(500).json({ 
     error: 'Internal server error',
     code: 1000
   });
   ```

3. **开发环境vs生产环境**
   ```javascript
   if (process.env.NODE_ENV === 'development') {
     // 开发环境返回详细错误
     return res.status(500).json({
       error: error.message,
       stack: error.stack
     });
   } else {
     // 生产环境返回通用错误
     return res.status(500).json({
       error: 'Internal server error'
     });
   }
   ```

---

## 安全检查清单

### 部署前检查

- [ ] 所有密钥从代码中移除
- [ ] 环境变量正确配置
- [ ] HTTPS已启用
- [ ] 安全头已设置(Helmet)
- [ ] CORS正确配置
- [ ] 速率限制已启用
- [ ] 输入验证已实施
- [ ] SQL注入防护已应用
- [ ] 密码正确哈希
- [ ] 日志不包含敏感信息
- [ ] 依赖已更新到最新安全版本
- [ ] npm audit无严重漏洞
- [ ] 错误消息不泄露敏感信息
- [ ] 备份和恢复流程已测试

---

## 资源链接

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**最后更新**: 2025-10-15

