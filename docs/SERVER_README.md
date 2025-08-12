# Test Web App - Backend API Server

专业的网站测试平台后端API服务，提供完整的测试引擎集成、用户管理、数据存储等功能。

## 🚀 功能特性

### 核心功能
- **用户认证系统** - JWT令牌认证、用户注册登录、权限管理
- **测试引擎集成** - K6性能测试、Lighthouse UX测试、Playwright兼容性测试
- **实时监控** - 网站监控、告警系统、状态跟踪
- **测试历史** - 完整的测试记录、结果分析、报告生成
- **API管理** - RESTful API、速率限制、文档生成

### 测试类型
- **性能测试** - 使用K6进行负载测试、压力测试、峰值测试
- **UX测试** - 使用Lighthouse进行性能、可访问性、SEO分析
- **兼容性测试** - 使用Playwright进行多浏览器兼容性测试
- **安全测试** - SSL检查、混合内容检测、安全头验证
- **SEO测试** - 元标签分析、结构化数据检查、页面优化建议

## 🛠️ 技术栈

### 后端框架
- **Node.js** - 运行时环境
- **Express.js** - Web应用框架
- **Sequelize** - ORM数据库操作
- **PostgreSQL** - 主数据库
- **Redis** - 缓存和会话存储

### 测试引擎
- **K6** - 性能和负载测试
- **Lighthouse** - 网页质量审计
- **Playwright** - 浏览器自动化测试

### 安全和中间件
- **Helmet** - 安全头设置
- **CORS** - 跨域资源共享
- **Rate Limiting** - API速率限制
- **JWT** - 身份验证令牌
- **bcryptjs** - 密码加密

## 📁 项目结构

```
server/
├── app.js                 # 主应用文件
├── package.json           # 项目依赖配置
├── config/
│   └── database.js        # 数据库配置
├── models/                # 数据模型
│   ├── User.js           # 用户模型
│   ├── TestHistory.js    # 测试历史模型
│   ├── TestSchedule.js   # 测试调度模型
│   ├── MonitoringSite.js # 监控站点模型
│   ├── MonitoringAlert.js # 监控告警模型
│   ├── TestTemplate.js   # 测试模板模型
│   └── ApiKey.js         # API密钥模型
├── routes/               # 路由处理
│   ├── auth.js          # 认证路由
│   ├── users.js         # 用户管理路由
│   ├── tests.js         # 测试执行路由
│   └── testEngines.js   # 测试引擎路由
├── middleware/           # 中间件
│   ├── auth.js          # 认证中间件
│   └── errorHandler.js  # 错误处理中间件
├── services/            # 业务服务
│   └── testEngines.js   # 测试引擎服务
└── docs/               # API文档
```

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- PostgreSQL >= 13
- Redis >= 6
- Docker (可选)

### 安装依赖
```bash
cd server
npm install
```

### 环境配置
复制环境配置文件并填入实际值：
```bash
cp .env.example .env
```

主要配置项：
```env
# 数据库配置 - 自动环境切换
# 开发环境: testweb_dev, 生产环境: testweb_prod
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_dev
DB_USER=postgres
DB_PASSWORD=postgres

# JWT配置
JWT_SECRET=your_super_secret_key

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### 数据库初始化
```bash
# 创建数据库
npm run db:create

# 运行迁移
npm run migrate

# 填充种子数据（可选）
npm run seed
```

### 启动服务

⚠️ **重要**: 请在项目根目录启动，不要在server目录启动！

```bash
# 返回项目根目录
cd ..

# 开发环境启动 (使用 testweb_dev 数据库)
npm start

# 生产环境启动 (使用 testweb_prod 数据库)
NODE_ENV=production npm start
```

详细启动指南请参考: [STARTUP_GUIDE.md](../STARTUP_GUIDE.md)

## 🐳 Docker 部署

### 使用Docker Compose
```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f api
```

### 单独构建API服务
```bash
# 构建镜像
npm run docker:build

# 运行容器
npm run docker:run
```

## 📊 API 文档

### 健康检查
```
GET /health
```

### API信息
```
GET /api/info
```

### 认证相关
```
POST /api/auth/register    # 用户注册
POST /api/auth/login       # 用户登录
POST /api/auth/refresh     # 刷新令牌
POST /api/auth/logout      # 用户登出
```

### 测试相关
```
POST /api/tests/performance    # 性能测试
POST /api/tests/ux            # UX测试
POST /api/tests/compatibility # 兼容性测试
POST /api/tests/security      # 安全测试
POST /api/tests/seo           # SEO测试
```

### 测试引擎
```
GET  /api/test-engines/status           # 引擎状态
POST /api/test-engines/k6/run          # K6测试
POST /api/test-engines/lighthouse/run  # Lighthouse测试
POST /api/test-engines/playwright/run  # Playwright测试
```

## 🔧 开发指南

### 代码规范
- 使用ESLint进行代码检查
- 遵循JavaScript Standard Style
- 编写单元测试和集成测试

### 测试
```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 代码检查
```bash
# 检查代码规范
npm run lint

# 自动修复
npm run lint:fix
```

## 📈 监控和日志

### 日志配置
- 使用Winston进行结构化日志记录
- 支持多种日志级别和输出格式
- 生产环境日志轮转

### 性能监控
- 集成Prometheus指标收集
- 支持自定义业务指标
- 健康检查端点

## 🔒 安全特性

### 认证和授权
- JWT令牌认证
- 角色基础访问控制
- API密钥管理

### 安全防护
- 请求速率限制
- CORS跨域保护
- 安全头设置
- 输入验证和清理

## 🚀 部署和运维

### 生产部署
1. 构建Docker镜像
2. 配置环境变量
3. 运行数据库迁移
4. 启动服务容器
5. 配置负载均衡器

### 监控和告警
- 应用性能监控
- 错误日志收集
- 资源使用监控
- 自动告警通知

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交代码变更
4. 推送到分支
5. 创建Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](../LICENSE) 文件

## 📞 支持

如有问题或建议，请：
- 提交Issue
- 发送邮件至 xyd91964208@gamil.com
- 查看文档 https://docs.testweb.app
