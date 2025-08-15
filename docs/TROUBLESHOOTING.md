# 故障排除指南

本指南帮助您解决使用 Test Web App 时可能遇到的常见问题。

## 🚀 启动问题

### 应用无法启动

#### 问题：运行 `npm start` 后应用无法启动

**可能原因和解决方案：**

1. **端口被占用**
   ```bash
   # 检查端口占用
   netstat -ano | findstr :5174
   netstat -ano | findstr :3001
   
   # 杀死占用端口的进程
   taskkill /PID <PID> /F
   
   # 或者修改端口配置
   # 在 .env 文件中设置
   VITE_DEV_PORT=5175
   PORT=3002
   ```

2. **依赖安装不完整**
   ```bash
   # 清理并重新安装依赖
   npm run clean:all
   npm install
   
   # 如果仍有问题，尝试
   rm -rf node_modules package-lock.json
   rm -rf backend/node_modules backend/package-lock.json
   npm install
   ```

3. **Node.js 版本不兼容**
   ```bash
   # 检查 Node.js 版本
   node --version
   
   # 需要 >= 18.0.0
   # 使用 nvm 切换版本
   nvm install 18
   nvm use 18
   ```

### 前端启动失败

#### 问题：前端服务无法启动，显示 Vite 错误

**解决方案：**

1. **清理缓存**
   ```bash
   # 清理 Vite 缓存
   rm -rf node_modules/.vite
   rm -rf dist
   
   # 重新启动
   npm run frontend
   ```

2. **检查 TypeScript 配置**
   ```bash
   # 运行类型检查
   npm run type-check
   
   # 如果有类型错误，修复后重新启动
   ```

3. **环境变量问题**
   ```bash
   # 检查 .env 文件是否存在
   ls -la .env
   
   # 如果不存在，复制模板
   cp .env.example .env
   ```

### 后端启动失败

#### 问题：后端服务无法启动

**解决方案：**

1. **数据库连接问题**
   ```bash
   # 检查数据库连接
   npm run db:check
   
   # 如果连接失败，检查配置
   cat backend/.env
   ```

2. **环境变量缺失**
   ```bash
   # 检查后端环境变量
   cd server
   ls -la .env
   
   # 如果不存在，复制模板
   cp .env.example .env
   
   # 编辑配置
   nano .env
   ```

3. **权限问题**
   ```bash
   # 检查文件权限
   ls -la backend/
   
   # 修复权限
   chmod +x backend/app.js
   ```

## 🗄️ 数据库问题

### 数据库连接失败

#### 问题：无法连接到 PostgreSQL 数据库

**解决方案：**

1. **检查 PostgreSQL 服务**
   ```bash
   # Windows
   net start postgresql-x64-12
   
   # macOS
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   ```

2. **验证连接参数**
   ```bash
   # 测试数据库连接
   psql -h localhost -p 5432 -U postgres -d testweb_dev
   
   # 如果连接失败，检查配置
   cat backend/.env | grep DB_
   ```

3. **创建数据库**
   ```sql
   -- 连接到 PostgreSQL
   psql -U postgres
   
   -- 创建数据库
   CREATE DATABASE testweb_dev;
   CREATE DATABASE testweb_prod;
   
   -- 创建用户（如果需要）
   CREATE USER testweb_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE testweb_dev TO testweb_user;
   GRANT ALL PRIVILEGES ON DATABASE testweb_prod TO testweb_user;
   ```

### 数据库迁移失败

#### 问题：运行 `npm run db:setup` 失败

**解决方案：**

1. **检查数据库权限**
   ```sql
   -- 确保用户有创建表的权限
   GRANT CREATE ON SCHEMA public TO testweb_user;
   GRANT USAGE ON SCHEMA public TO testweb_user;
   ```

2. **手动运行迁移**
   ```bash
   cd server
   
   # 检查迁移文件
   ls migrations/
   
   # 手动执行迁移
   psql -U postgres -d testweb_dev -f migrations/001_initial_schema.sql
   ```

3. **重置数据库**
   ```bash
   # 完全重置数据库
   npm run db:reset
   
   # 重新初始化
   npm run db:setup
   ```

## 🔧 功能问题

### 测试无法启动

#### 问题：点击"开始测试"后没有反应

**解决方案：**

1. **检查网络连接**
   ```bash
   # 测试目标URL是否可访问
   curl -I https://example.com
   
   # 检查防火墙设置
   ```

2. **查看浏览器控制台**
   ```javascript
   // 打开浏览器开发者工具
   // 查看 Console 和 Network 标签页
   // 寻找错误信息
   ```

3. **检查后端日志**
   ```bash
   # 查看后端日志
   tail -f backend/logs/app.log
   
   # 或者在启动时查看控制台输出
   npm run backend
   ```

### WebSocket 连接失败

#### 问题：实时数据更新不工作

**解决方案：**

1. **检查 WebSocket 连接**
   ```javascript
   // 在浏览器控制台中检查
   console.log(window.io);
   
   // 查看连接状态
   socket.connected
   ```

2. **防火墙和代理问题**
   ```bash
   # 检查是否有代理阻止 WebSocket
   # 在浏览器中禁用代理
   
   # 或者配置代理支持 WebSocket
   ```

3. **端口问题**
   ```bash
   # 确保 WebSocket 端口可访问
   telnet localhost 3001
   ```

### 文件上传失败

#### 问题：无法上传文件或导出报告

**解决方案：**

1. **检查文件大小限制**
   ```javascript
   // 检查服务器配置
   // backend/app.js 中的文件大小限制
   app.use(express.json({ limit: '50mb' }));
   ```

2. **检查磁盘空间**
   ```bash
   # 检查磁盘空间
   df -h
   
   # 清理临时文件
   npm run clean
   ```

3. **权限问题**
   ```bash
   # 检查上传目录权限
   ls -la backend/uploads/
   
   # 修复权限
   chmod 755 backend/uploads/
   ```

## 🎨 界面问题

### 页面显示异常

#### 问题：页面布局混乱或样式丢失

**解决方案：**

1. **清理浏览器缓存**
   ```bash
   # 硬刷新页面
   Ctrl + F5 (Windows)
   Cmd + Shift + R (Mac)
   
   # 或者清理浏览器缓存
   ```

2. **检查 CSS 加载**
   ```javascript
   // 在开发者工具中检查
   // Network 标签页查看 CSS 文件是否加载成功
   ```

3. **重新构建前端**
   ```bash
   # 清理并重新构建
   npm run clean
   npm run build
   npm run preview
   ```

### 响应式布局问题

#### 问题：移动端显示不正常

**解决方案：**

1. **检查视口设置**
   ```html
   <!-- 确保 index.html 中有正确的 meta 标签 -->
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

2. **测试不同屏幕尺寸**
   ```bash
   # 使用浏览器开发者工具
   # 切换到不同设备模式测试
   ```

## 🔒 认证问题

### 登录失败

#### 问题：无法登录或登录后立即退出

**解决方案：**

1. **检查用户凭据**
   ```sql
   -- 在数据库中检查用户
   SELECT * FROM users WHERE email = 'your-email@example.com';
   
   -- 重置密码（如果需要）
   UPDATE users SET password = '$2b$10$...' WHERE email = 'your-email@example.com';
   ```

2. **JWT 令牌问题**
   ```bash
   # 检查 JWT 密钥配置
   cat backend/.env | grep JWT_SECRET
   
   # 确保密钥足够复杂
   JWT_SECRET=your-very-long-and-complex-secret-key
   ```

3. **清理本地存储**
   ```javascript
   // 在浏览器控制台中清理
   localStorage.clear();
   sessionStorage.clear();
   
   // 然后重新登录
   ```

### 权限问题

#### 问题：提示权限不足

**解决方案：**

1. **检查用户角色**
   ```sql
   -- 查看用户角色
   SELECT username, email, role FROM users WHERE email = 'your-email@example.com';
   
   -- 更新用户角色
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

2. **检查权限配置**
   ```javascript
   // 查看权限中间件配置
   // backend/middleware/auth.js
   ```

## 📊 性能问题

### 应用运行缓慢

#### 问题：页面加载慢或操作响应慢

**解决方案：**

1. **启用 Redis 缓存**
   ```bash
   # 安装并启动 Redis
   # Windows: 下载 Redis for Windows
   # macOS: brew install redis && brew services start redis
   # Linux: sudo apt-get install redis-server
   
   # 在 backend/.env 中配置
   REDIS_URL=redis://localhost:6379
   ```

2. **优化数据库查询**
   ```sql
   -- 检查慢查询
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   
   -- 添加索引
   CREATE INDEX idx_test_results_user_id ON test_results(user_id);
   CREATE INDEX idx_test_results_created_at ON test_results(created_at);
   ```

3. **检查系统资源**
   ```bash
   # 检查 CPU 和内存使用
   top
   htop
   
   # 检查磁盘 I/O
   iotop
   ```

### 内存泄漏

#### 问题：应用运行一段时间后内存占用过高

**解决方案：**

1. **重启应用**
   ```bash
   # 临时解决方案
   npm run clean
   npm start
   ```

2. **检查内存使用**
   ```javascript
   // 在浏览器控制台中检查
   console.log(performance.memory);
   
   // 使用 Chrome DevTools 的 Memory 标签页
   ```

3. **优化代码**
   ```javascript
   // 检查是否有未清理的定时器
   // 检查是否有未取消的事件监听器
   // 检查是否有循环引用
   ```

## 🔍 调试技巧

### 启用调试模式

```bash
# 前端调试
DEBUG=* npm run frontend

# 后端调试
DEBUG=* npm run backend

# 或者设置特定的调试命名空间
DEBUG=app:* npm run backend
```

### 查看详细日志

```bash
# 查看应用日志
tail -f backend/logs/app.log

# 查看错误日志
tail -f backend/logs/error.log

# 查看访问日志
tail -f backend/logs/access.log
```

### 使用开发者工具

1. **浏览器开发者工具**
   - Console: 查看 JavaScript 错误
   - Network: 检查 API 请求
   - Application: 查看本地存储
   - Performance: 分析性能问题

2. **Node.js 调试**
   ```bash
   # 使用 Node.js 调试器
   node --inspect backend/app.js
   
   # 然后在 Chrome 中访问
   chrome://inspect
   ```

## 📞 获取帮助

如果以上解决方案都无法解决您的问题，请：

1. **查看日志文件**
   - 前端: 浏览器开发者工具 Console
   - 后端: `backend/logs/` 目录下的日志文件

2. **收集错误信息**
   - 错误消息的完整文本
   - 重现问题的步骤
   - 系统环境信息（操作系统、Node.js 版本等）

3. **联系支持**
   - 📧 邮箱: support@testweb.app
   - 🐛 GitHub Issues: [提交问题](https://github.com/your-org/test-web-app/issues)
   - 💬 讨论区: [GitHub Discussions](https://github.com/your-org/test-web-app/discussions)

## 📋 常用命令速查

```bash
# 应用启动
npm start                    # 启动完整应用
npm run frontend            # 仅启动前端
npm run backend             # 仅启动后端

# 数据库操作
npm run db:setup            # 初始化数据库
npm run db:check            # 检查数据库连接
npm run db:reset            # 重置数据库

# 测试
npm test                    # 运行测试
npm run test:coverage       # 测试覆盖率
npm run e2e                 # 端到端测试

# 构建和部署
npm run build               # 构建生产版本
npm run preview             # 预览生产版本
npm run electron:build      # 构建桌面应用

# 维护
npm run clean               # 清理构建文件
npm run clean:all           # 清理所有文件
npm run lint                # 代码检查
npm run format              # 代码格式化
```

---

**提示**: 遇到问题时，首先尝试重启应用和清理缓存，这能解决大部分常见问题。