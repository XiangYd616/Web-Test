# 架构设计 - Postman 模式本地 API 测试工具

## 一、产品定位

对标 Postman 的 Freemium 模式：

- **免费本地工具**：核心 API 测试功能完全免费，SQLite 本地存储
- **完整账户体系**：用户注册/登录，支持多账户切换
- **首次启动引导**：类似 Postman，首次打开引导创建账户或快速开始
- **未来扩展**：团队协作、云同步、企业级功能作为付费层预留接口

## 二、技术栈

| 组件   | 选型               | 说明                               |
| ------ | ------------------ | ---------------------------------- |
| 数据库 | **SQLite**（唯一） | better-sqlite3，本地文件存储       |
| 认证   | **JWT**            | 标准登录注册，本地签发             |
| 队列   | **无**（直接执行） | 不依赖 Redis，测试任务直接异步执行 |
| 监控   | **本地轻量**       | 不依赖 PG 专属监控                 |

## 三、核心原则

1. **无外部依赖**：不需要 PostgreSQL、Redis、任何云服务即可运行
2. **完整账户体系**：保留注册/登录/JWT，用户数据隔离
3. **首次启动友好**：提供 `/auth/local-token` 快速开始 + 正常注册流程
4. **代码零分支**：不存在 `getDbMode()` 判断，所有代码路径统一

## 四、启动流程

```
connectDB() → SQLite 文件数据库 + schema 自动初始化
注册测试引擎
注册路由（完整功能）
启动 HTTP 服务器
```

不启动：PG 监控、Redis Worker、数据库连接池管理

## 五、认证流程

### 首次启动

1. 前端检查 localStorage 无 token
2. 调用 `GET /api/auth/local-token` → 自动创建默认账户并返回 token
3. 用户进入主界面，可在设置中修改账户信息

### 正常使用

- 用户可注册新账户、登录已有账户
- JWT 标准流程，与 Postman 体验一致

### 未来扩展

- 云端登录（OAuth/SSO）→ 数据同步到云端
- 团队工作区 → 付费功能

## 六、已完成的架构清理

以上所有遗留代码已清理完毕：

- `config/database.ts` → 纯 SQLite，无 PG 连接池
- `server.ts` → 无 PG 监控、Redis Worker、协作服务
- `middleware/auth.ts` → 无 `getDbMode()` 判断
- `auth/controllers/authController.ts` → `localToken` 无模式守卫
- `testing/services/TestQueueService.ts` → `queueEnabled=false`
- `.env` → 无 `DB_MODE`、PG、Redis 配置
- 前端路由 → 移除 Admin/Analytics/Monitoring/System 页面
- 前端 ProfilePage → 移除 MFA 功能
- `ConfigManager.ts` → 仅 SQLite 配置
