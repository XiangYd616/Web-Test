# Test-Web

企业级网站质量检测平台。纯本地运行，SQLite 存储，9 大测试引擎，Puppeteer 真实浏览器采集，无需任何外部服务。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18.2-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)](https://www.typescriptlang.org/)

## 测试引擎

| 引擎              | 说明                                               | 采集方式                             |
| ----------------- | -------------------------------------------------- | ------------------------------------ |
| **Performance**   | Web Vitals（LCP/FCP/CLS/INP/TBT/TTFB）、资源加载   | Puppeteer 真实浏览器 + HTTP 回退     |
| **SEO**           | 元信息、结构化数据、移动端优化、社交标签           | Puppeteer JS 渲染 + cheerio 静态分析 |
| **Security**      | XSS/SQLi/CSRF、SSL/TLS、安全头、端口扫描、威胁情报 | Puppeteer + HTTP                     |
| **Accessibility** | WCAG 合规、焦点管理、键盘导航、ARIA、色彩对比度    | Puppeteer 动态检测 + HTML 静态分析   |
| **UX**            | 用户体验指标、设备仿真、交互模拟                   | Puppeteer + PerformanceObserver      |
| **Compatibility** | 跨浏览器兼容性（Chromium 渲染引擎）                | Puppeteer 自动检测                   |
| **API**           | RESTful 接口测试、响应验证、认证检查               | HTTP                                 |
| **Stress**        | 并发负载测试、吞吐量分析                           | HTTP 并发                            |
| **Website**       | 综合测试（聚合以上引擎）                           | 按引擎自动选择                       |

## 核心功能

- **9 大测试引擎** - 性能/SEO/安全/无障碍/UX/兼容性/API/压力/综合
- **集合管理** - 组织和管理 API 请求集合
- **环境变量** - 多环境配置切换
- **测试计划** - 多步骤测试编排和执行
- **定时任务** - Cron 定时自动执行测试
- **测试模板** - 按引擎类型保存和复用测试配置
- **对比分析** - 测试结果对比、趋势分析、基准测试
- **监控告警** - 站点可用性监控和告警规则
- **数据管理** - 测试数据导入/导出（JSON/CSV）
- **报告生成** - 可定制报告模板
- **错误追踪** - 前端错误上报和统计
- **账户体系** - 本地注册/登录，JWT 认证，首次启动自动创建默认账户
- **工作空间** - 多空间隔离管理
- **Electron 桌面版** - 支持打包为独立桌面应用
- **API 文档** - Swagger UI 在线文档（`/api/docs`）

## 快速开始

### 完整启动（推荐）

```bash
npm install
npm run dev
```

- 前端: http://localhost:5174
- 后端: http://localhost:3001
- API 文档: http://localhost:3001/api/docs

### 仅前端开发

```bash
npm run frontend
```

### 仅后端开发

```bash
npm run backend:dev
```

## 常用命令

```bash
# 开发
npm run dev              # 启动前后端开发服务器
npm run frontend         # 仅启动前端
npm run backend:dev      # 仅启动后端

# 构建和检查
npm run build            # 生产构建（前端）
npm run type-check       # 前端 TypeScript 类型检查
npm run type-check:backend  # 后端 TypeScript 类型检查
npm run ci:check         # 类型检查 + Lint + 构建

# 测试
npm run test             # Vitest 单元测试
npm run test:ui          # Vitest UI 界面
npm run test:coverage    # 覆盖率报告
npm run e2e              # Playwright E2E 测试
npm run e2e:ui           # Playwright UI 模式

# 代码质量
npm run lint             # ESLint 检查
npm run lint:fix         # 自动修复
npm run format           # Prettier 格式化

# Electron 桌面版
npm run electron:dev     # Electron 开发模式
npm run electron:build   # Electron 打包

# Storybook 组件文档
npx storybook dev        # Storybook 开发服务器
 
# 项目维护
npm run clean            # 清理构建缓存
npm run clean:all        # 深度清理（含 node_modules）
npm run deps:update      # 更新依赖
```

## 技术栈

| 层级     | 技术                                          | 说明                              |
| -------- | --------------------------------------------- | --------------------------------- |
| 前端     | React 18 + TypeScript 5.9 + Vite 6            | SPA，路由基于 react-router-dom v6 |
| UI       | TailwindCSS + shadcn/ui + Recharts            | 组件库 + 数据可视化               |
| 后端     | Node.js + Express 4 + TypeScript              | API 服务，模块化架构              |
| 数据库   | SQLite（better-sqlite3）                      | 纯本地，零配置                    |
| 浏览器   | Puppeteer（Chromium）                         | 真实浏览器 Web Vitals 采集        |
| 实时通信 | Socket.IO                                     | WebSocket 测试进度推送            |
| 认证     | JWT（jsonwebtoken）                           | 本地签发，完整登录注册            |
| 桌面     | Electron                                      | 可选，跨平台桌面应用              |
| 前端测试 | Vitest + Testing Library                      | 单元测试 + 组件测试               |
| E2E 测试 | Playwright                                    | 端到端测试                        |
| 组件文档 | Storybook 8                                   | UI 组件开发和文档                 |
| API 文档 | Swagger（swagger-jsdoc + swagger-ui-express） | 模块化 OpenAPI 3.0 文档           |

## 项目结构

```
Test-Web/
├── frontend/                  # 前端应用
│   ├── pages/                 # 19 个页面组件
│   ├── components/            # UI 组件（含 shadcn/ui）
│   ├── services/              # API 服务层
│   ├── context/               # React Context（TestProvider）
│   ├── hooks/                 # 自定义 Hooks
│   ├── routes/                # 路由配置
│   ├── i18n/                  # 国际化
│   └── utils/                 # 工具函数
├── backend/                   # Node.js 后端服务
│   ├── server.ts              # 服务入口
│   └── modules/
│       ├── engines/           # 9 大测试引擎
│       │   ├── performance/   # 性能测试（Web Vitals）
│       │   ├── seo/           # SEO 分析
│       │   ├── security/      # 安全扫描
│       │   ├── accessibility/ # 无障碍检测
│       │   ├── ux/            # UX 体验测试
│       │   ├── compatibility/ # 兼容性测试
│       │   ├── stress/        # 压力测试
│       │   └── website/       # 综合测试
│       ├── testing/           # 测试执行和队列管理
│       ├── auth/              # 认证（JWT + OAuth）
│       ├── collections/       # 集合管理
│       ├── environments/      # 环境变量
│       ├── workspaces/        # 工作空间
│       ├── schedules/         # 定时任务
│       ├── testplans/         # 测试计划
│       ├── monitoring/        # 站点监控
│       ├── alert/             # 告警管理
│       ├── reporting/         # 报告生成
│       ├── data/              # 数据导入导出
│       ├── system/            # 系统管理和错误追踪
│       ├── config/            # 配置（数据库/Swagger/WebSocket）
│       │   └── swagger/       # 模块化 API 文档
│       ├── ci/                # CI/CD 集成
│       └── middleware/        # 中间件（认证/限流/日志/错误处理）
├── shared/                    # 跨端共享类型和工具
├── tools/electron/            # Electron 桌面版
├── tests/                     # E2E / 集成 / 系统测试
├── docs/                      # 项目文档
├── deploy/                    # Docker 部署配置
└── .storybook/                # Storybook 配置
```

## 页面

| 页面     | 路由              | 说明                                   |
| -------- | ----------------- | -------------------------------------- |
| 仪表板   | `/dashboard`      | 测试概览和快速操作                     |
| 测试历史 | `/history`        | 执行记录和结果详情（含各引擎专属面板） |
| 集合管理 | `/collections`    | API 请求集合组织                       |
| 环境管理 | `/environments`   | 环境变量配置和切换                     |
| 测试模板 | `/templates`      | 按引擎保存测试配置模板                 |
| 测试计划 | `/test-plans`     | 多步骤测试编排和执行                   |
| 定时任务 | `/schedules`      | Cron 定时自动执行                      |
| 站点监控 | `/monitoring`     | 可用性监控和健康检查                   |
| 报告中心 | `/reports`        | 测试报告生成和管理                     |
| 错误追踪 | `/error-tracking` | 前端错误上报和统计                     |
| 工作空间 | `/workspaces`     | 多空间隔离管理                         |
| UAT 反馈 | `/uat`            | 用户验收测试反馈                       |
| 管理后台 | `/admin`          | 用户和系统管理                         |
| 设置     | `/settings`       | 应用配置                               |
| 个人资料 | `/profile`        | 账户信息管理                           |

## 架构说明

- **纯本地模式** — 不需要 PostgreSQL、Redis 或任何云服务
- **首次启动** — 自动调用 `/auth/local-token` 创建默认账户和工作空间
- **测试队列** — 直接异步执行（`queueEnabled=false`），无 Redis 依赖
- **Puppeteer** — 自动检测并使用 Chromium，不可用时降级为 HTTP 估算
- **Swagger 文档** — 模块化拆分（14 个模块文件），访问 `/api/docs`
- **Electron 桌面版** — 通过 IPC 直接操作本地 SQLite，无需 HTTP 后端

详见 [`docs/`](docs/) 目录。

## 故障排除

- **端口占用** — 检查 3001（后端）和 5174（前端）是否被占用
- **类型错误** — 前端 `npm run type-check`，后端 `npm run type-check:backend`
- **Puppeteer 安装失败** — 设置
  `PUPPETEER_DOWNLOAD_HOST=https://npmmirror.com/mirrors`
- **完全重置** — `npm run clean:all && npm install && npm run dev`
- **详细排查** — 参见 [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)

## 许可证

MIT License
