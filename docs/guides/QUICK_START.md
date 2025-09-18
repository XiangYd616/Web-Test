# 🚀 Test-Web 快速启动指南

一个功能完整的网站测试平台，支持SEO、性能、安全、兼容性等多种测试。

## ✨ 核心功能

### 🔧 **可用的测试工具**
- ✅ **网站测试** - 综合评估网站各项指标
- ✅ **SEO测试** - 搜索引擎优化分析  
- ✅ **性能测试** - 页面加载速度和性能指标
- ✅ **安全测试** - 安全漏洞扫描
- ✅ **API测试** - 接口功能和性能测试
- ✅ **兼容性测试** - 浏览器兼容性检查
- ✅ **压力测试** - 网站负载能力测试
- ✅ **用户体验测试** - UX可访问性评估

### 🔐 **用户系统**
- ✅ 用户注册/登录
- ✅ MFA双因素认证 (TOTP)
- ✅ OAuth2第三方登录 (Google, GitHub, Microsoft, Discord)
- ✅ 测试历史记录
- ✅ 个人统计面板

## 📋 系统状态

通过了**完整的核心业务功能测试**：
- ✅ 项目结构完整
- ✅ 后端API路由正常 (6/6)
- ✅ 数据库完整性 (40张表，包括核心业务表)
- ✅ 前端组件可用 (6/6)
- ✅ 用户功能流程完整 (5/5)

**通过率: 100%** 🎉

## ⚡ 快速启动

### 1. 环境要求
```bash
Node.js >= 16.0.0
PostgreSQL >= 12.0
Yarn或npm
```

### 2. 后端启动
```bash
# 进入后端目录
cd backend

# 安装依赖
yarn install

# 启动数据库 (确保PostgreSQL运行)
# 配置环境变量 .env

# 运行数据库迁移
node scripts/run-migrations.js migrate

# 启动后端服务
yarn start
# 或
node src/app.js
```

**后端地址**: http://localhost:3001

### 3. 前端启动
```bash
# 进入前端目录  
cd frontend

# 安装依赖
yarn install

# 启动前端服务
yarn dev
```

**前端地址**: http://localhost:5174

## 🎯 立即开始测试

### 访问测试工具
1. 打开浏览器访问: http://localhost:5174
2. 选择测试工具:
   - **网站测试**: http://localhost:5174/website-test
   - **SEO测试**: http://localhost:5174/seo-test
   - **性能测试**: http://localhost:5174/performance-test
   - **安全测试**: http://localhost:5174/security-test

### 示例测试
```
测试URL: https://example.com
测试类型: 综合测试 (性能+SEO+安全)
预计时间: 2-5分钟
```

### 无需注册即可测试
- 🔓 **游客模式**: 可以直接使用基础测试功能
- 🔐 **注册用户**: 获得完整功能 + 历史记录 + 高级分析

## 📊 API接口

### 核心API端点
```
POST /api/tests/website     # 启动网站综合测试
GET  /api/tests/:id/status  # 获取测试进度
GET  /api/tests/:id/results # 获取测试结果

POST /api/seo/fetch-page    # SEO页面分析
POST /api/security/scan     # 安全漏洞扫描  
POST /api/performance/test  # 性能测试

POST /api/auth/register     # 用户注册
POST /api/auth/login        # 用户登录
GET  /api/auth/oauth/providers # OAuth登录选项
```

### API文档
- Swagger文档: http://localhost:3001/api-docs
- 健康检查: http://localhost:3001/health

## 🔧 配置选项

### 数据库配置 (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_dev
DB_USER=postgres
DB_PASSWORD=your_password
```

### OAuth2配置 (.env.oauth)
```env
# 复制 .env.oauth.example 并配置
GOOGLE_CLIENT_ID=your_google_client_id
GITHUB_CLIENT_ID=your_github_client_id
MICROSOFT_CLIENT_ID=your_microsoft_client_id
DISCORD_CLIENT_ID=your_discord_client_id
```

## 📈 功能特色

### 🎨 现代化界面
- 响应式设计
- 深色/浅色主题切换
- 实时进度显示
- 图表可视化

### ⚡ 高性能
- 异步测试执行
- 智能缓存系统
- 后台任务队列
- 实时通信 (WebSocket)

### 🔒 企业级安全
- JWT身份验证
- 双因素认证 (MFA)
- OAuth2集成
- 安全日志审计
- 请求频率限制

### 📊 完整报告
- 详细测试报告
- 性能指标图表
- SEO优化建议
- 安全漏洞分析
- 兼容性矩阵

## 🛠️ 故障排除

### 常见问题

**数据库连接失败**
```bash
# 检查PostgreSQL是否运行
sudo systemctl status postgresql

# 检查连接配置
node scripts/test-business-features.js
```

**端口被占用**
```bash
# 检查端口占用
lsof -i :3001  # 后端端口
lsof -i :5174  # 前端端口

# 修改端口配置
PORT=3002 yarn start
```

**依赖安装失败**
```bash
# 清除缓存重新安装
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## 📞 支持与文档

- **项目文档**: `/backend/docs/`
- **API文档**: http://localhost:3001/api-docs
- **OAuth设置**: `/backend/docs/OAUTH_SETUP.md`
- **功能测试**: `node backend/scripts/test-business-features.js`

## 🚀 下一步

1. **基础使用**: 尝试各种测试工具
2. **用户注册**: 获得完整功能体验
3. **配置OAuth**: 启用第三方登录
4. **API集成**: 使用REST API集成到您的工作流
5. **自动化**: 设置定期测试任务

---

## 🎉 立即开始

**现在就可以开始测试！**

所有核心功能已就绪，系统通过了完整的业务功能验证。

**启动命令**:
```bash
# 后端
cd backend && yarn start

# 前端  
cd frontend && yarn dev

# 访问: http://localhost:5174
```

开始你的网站测试之旅吧！🚀
