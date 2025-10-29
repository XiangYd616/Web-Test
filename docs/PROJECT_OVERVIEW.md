# Test-Web 项目全景文档

一个企业级 Web 测试平台：性能测试、安全扫描、SEO 检测、兼容性分析、报告与监控一体化。

- 适用读者：产品/研发/测试/运维/初学者
- 文档目标：让你从0→1全面理解并使用本项目，快速上手、稳定扩展、可持续维护
- 状态：稳定可用（生产可部署），持续演进（Roadmap 见文末）

---

## 目录
- 一、快速开始
- 二、架构总览
- 三、技术栈详解
- 四、代码结构
- 五、核心模块设计
- 六、前端架构与实现
- 七、后端架构与实现
- 八、API 规范与示例
- 九、数据库设计概览
- 十、安全策略
- 十一、性能与容量规划
- 十二、监控与日志
- 十三、测试策略
- 十四、CI/CD 流程
- 十五、部署与运维
- 十六、故障排除
- 十七、研发规范
- 十八、Roadmap（演进计划）
- 十九、术语表
- 二十、附录（常用命令/关键文件/路由清单）

---

## 一、快速开始

1) 安装依赖并启动全栈
```bash
npm install
npm run dev
# 前端: http://localhost:5174
# 后端: http://localhost:3001
```

2) 仅启动前端/后端
```bash
npm run frontend
cd backend && npm run dev
```

3) 质量检查与构建
```bash
npm run type-check
npm run lint
npm run build
```

---

## 二、架构总览

整体采用「前后端分离 + 统一服务架构」：

```
[React + TS + Vite]  ←→  [Express API / WebSocket]  ←→  [PostgreSQL / Redis]
        ↑  懒加载/代码分割                   ↑               ↑
        │  统一API服务/认证服务              │               │
   AntD/Tailwind UI                   安全中间件/速率限制      多级缓存/会话/队列
```

- 前端：React 18、TypeScript 5、Vite、Ant Design、TailwindCSS、Chart.js/Recharts
- 后端：Node.js、Express、Socket.IO、Lighthouse、Puppeteer/Playwright、PostgreSQL、Redis（可选）
- 工程化：ESLint、Prettier、Vitest/Jest、Playwright、Docker、GitHub Actions

---

## 三、技术栈详解

- 前端
  - React 18（Suspense/Lazy、自动批处理）、React Router 6（嵌套路由、守卫）
  - TypeScript 严格模式；统一类型系统（180+类型定义）
  - Vite 高速开发与优化构建（细粒度代码分割、资源内联、外部依赖排除）
  - UI：Ant Design 5 + TailwindCSS 3（原子化样式 + 自定义主题）
  - 可视化：Chart.js + react-chartjs-2、Recharts
- 后端
  - Express 应用框架，分层路由与中间件
  - 安全：helmet、cors、express-rate-limit、输入校验
  - 实时：Socket.IO 推送测试进度与状态
  - 爬取/分析：axios + cheerio、Lighthouse、Puppeteer/Playwright
  - 数据：PostgreSQL（连接池/索引优化），Redis（缓存/会话/计数）
- 工具
  - ESLint/Prettier（统一代码风格）、Vitest/Jest/Playwright（多层次测试）
  - Docker/Docker Compose（容器化）、GitHub Actions（CI/CD）

---

## 四、代码结构（关键目录）

```
Test-Web/
├── frontend/                # React 前端
│   ├── components/          # 可复用组件（auth/ui/charts/testing/...）
│   ├── pages/               # 页面（dashboard/performance/seo/...）
│   ├── contexts/            # 全局状态（Auth/Theme/App）
│   ├── services/            # API/测试管理/后台任务
│   ├── hooks/               # 业务钩子
│   ├── styles/              # 样式/Tailwind
│   ├── vite.config.ts       # 前端构建配置
│   └── tsconfig.json
├── backend/                 # Node/Express 后端
│   ├── src/                 # 源码（app中间件、路由、服务、engines、utils）
│   ├── routes/              # 路由（auth/test/seo/...）
│   ├── config/              # 数据库/缓存/websocket 配置
│   ├── engines/             # 测试引擎（stress/security/compatibility/...）
│   └── package.json
├── docs/                    # 项目文档
├── scripts/                 # 启动/检查/维护/部署脚本
├── vite.config.ts           # 顶层Vite（整库测试/构建）
├── docker-compose.yml       # 多服务编排
├── package.json             # 工作区/根脚本
└── README.md
```

---

## 五、核心模块设计

### 1) 统一认证系统（JWT 双 Token + MFA）
- Access Token（短期）+ Refresh Token（长期）
- 自动刷新：到期前5分钟刷新；失败自动登出
- 多因素认证（TOTP/备用码），设备指纹，会话管理（并发限制/远程登出）

### 2) 测试能力矩阵
- 性能测试：Core Web Vitals（LCP/FID/CLS）、Lighthouse 审计、设备/网络条件模拟
- SEO 测试：元数据、结构化数据、移动友好性、robots.txt、站点可抓取性
- 兼容性：常见特性（flex/grid/CSS变量/ServiceWorker/WebP）与浏览器支持度
- 压力/负载：并发/时长配置、吞吐/延迟、错误率等指标
- 安全扫描（基础）：常见风险项检查、HTTP 安全头校验

### 3) 智能缓存系统（多级）
- 内存（LRU）→ LocalStorage → Redis（可选）
- API 响应缓存（命中率85%+），TTL/容量可配置
- 幂等性、重试（指数退避+抖动）与指标采集

---

## 六、前端架构与实现

### 路由与权限
- React Router 6 + 懒加载，`ProtectedRoute`/`AdminGuard` 控制权限
- 统一布局：`components/layout/Layout.tsx` 包裹子路由

### 全局状态（Context API）
- `AuthContext`：登录/登出、Token 自动刷新、本地持久化
- `ThemeContext`：深/浅色主题切换，CSS 变量与 Tailwind 同步

### 网络层（统一 API 服务）
- Axios 拦截器：自动附带 Token、错误统一处理、性能指标采集
- 缓存：GET 请求按 URL+参数生成 Key；TTL、容量可调

### 性能优化
- Vite 代码分割（react-vendor/router-vendor/chart-vendor 等）
- 路由级懒加载 + 组件级 Suspense
- 生产环境剔除 console/debugger

---

## 七、后端架构与实现

### 中间件顺序（关键）
1. helmet/cors（安全/CORS 允许域）
2. 压缩/缓存控制/ETag/安全头
3. 解析 body（JSON / URL-encoded）
4. 响应格式化/响应时间记录
5. 访问日志（morgan）+ 自定义 requestLogger
6. 速率限制（rateLimiter）
7. 路由（auth/test/seo/...）
8. 404 与统一错误处理

### 路由与功能
- `/api/test/*`：多测试引擎统一入口（性能/压力/兼容性/安全等）
- `/api/seo/*`：代理爬取与页面分析（CORS 解决方案）
- 静态资源：`/exports`、`/uploads`
- WebSocket：测试进度推送/后台任务状态

### 数据访问
- PostgreSQL 连接池（max/min/timeout）
- 参数化查询、索引优化、查询耗时监控

---

## 八、API 规范与示例

### 基础规则
- 认证：`Authorization: Bearer <token>`
- 统一响应
```json
{
  "success": true,
  "data": { "...": "..." },
  "error": null,
  "meta": { "requestId": "...", "duration": 123 }
}
```
- 分页：`page`、`pageSize`；返回 `total/hasMore`
- 速率限制：按路由/功能设定不同阈值

### 示例端点（节选）
- 性能测试启动：`POST /api/test/performance`（参数：url/device/network/...）
- SEO 页面抓取：`POST /api/seo/fetch-page`（参数：url）
- 获取 robots.txt：`POST /api/seo/fetch-robots`（参数：baseUrl）

---

## 九、数据库设计概览（核心表）

- users
  - id, email, password_hash, mfa_enabled, created_at
- test_history
  - id, user_id, test_type, status, created_at, summary
- test_results
  - id, test_id, metrics(jsonb), details(jsonb), created_at

索引建议：
- `idx_test_history_user_id`
- `idx_test_history_created_at DESC`

---

## 十、安全策略

- HTTP 头：Helmet（CSP、X-Frame-Options、XSS-Protection、NoSniff）
- CORS 白名单：env 配置 + 详细日志阻断非法来源
- 速率限制：路由/功能分级、黑白名单策略
- 输入校验：express-validator（邮箱/密码强度/URL 格式）
- SQL 防注入：参数化查询；审核拼接 SQL
- 文件上传白名单与大小限制：multer（扩展名/大小/数量）
- Token：JWT 双 Token、自动刷新、本地加密存储（可选）
- 审计：登录/登出/MFA/高危操作留痕

---

## 十一、性能与容量规划

- 前端
  - 代码分割与懒加载；静态资源按类型分文件夹
  - 图片 WebP/懒加载；Tailwind 原子化减少样式体积
- 后端
  - 数据库：连接池、慢查询分析、必要索引
  - 缓存：多级缓存命中率 85%+；TTL/容量按环境调整
  - 重试：指数退避+抖动，避免惊群
- 压测基线（建议）
  - QPS、P95 延迟、错误率阈值，随版本记录

---

## 十二、监控与日志

- 日志：Winston（error.log/combined.log/控制台），按等级与场景输出
- 指标：prom-client（HTTP 耗时/错误数/缓存命中率/DB 查询）
- 可视化：Prometheus + Grafana（docker-compose 可选）

---

## 十三、测试策略

- 单元：Vitest/Jest（前后端分别）
- 组件/UI：@testing-library/react
- 集成：带容器的 Postgres/Redis 集成测试
- E2E：Playwright（安装浏览器依赖；CI 下使用 headless）
- 性能：k6/Lighthouse（CI 独立 Job）

---

## 十四、CI/CD 流程（GitHub Actions）

Job 分层：
- 代码质量：lint/type-check/unit-test/coverage
- 集成测试：容器化 DB/Redis → migrate → 集成用例
- E2E：前后端构建 → 启动 → wait-on → Playwright 测试
- 安全扫描：Trivy + npm audit
- 镜像构建发布：docker/build-push-action（ghcr.io）
- 部署：留空位（可接入 K8s/Serverless/自建环境）

---

## 十五、部署与运维

- Docker Compose（可选包含 Postgres/Redis/Nginx/Prometheus/Grafana）
- 环境变量（示例）：
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_dev
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_key
NODE_ENV=production
PORT=3001
```
- 生产建议
  - 开启 HTTPS 与强 CSP
  - 分离只读与写库（可选）
  - 业务日志与审计日志分盘
  - 备份/归档/脱敏策略

---

## 十六、故障排除

- 无法访问前端：检查 5174 端口是否被占用；`npm run frontend`
- 后端 3001 连接被拒：确认服务已起；检查 CORS 白名单；查看 `backend/src/runtime/logs`
- 类型错误多：`npm run type-check`，逐个模块修复
- 构建失败：`npm run build:check`（先类型检查）
- SEO 抓取失败：检查目标站是否屏蔽 UA/需要代理；查看 `/api/seo/fetch-page` 返回详情

---

## 十七、研发规范

- 分支：`main`（生产）、`develop`（开发）、`feature/*`、`hotfix/*`
- 提交规范：feat/fix/docs/style/refactor/test/chore（语义化）
- 代码风格：ESLint + Prettier；禁止未使用变量/禁用 eval/new Function
- 目录命名：小写-中划线或小驼峰；类型与实现分离

---

## 十八、Roadmap（演进计划）

- GraphQL 支持
- 微服务/模块化拆分（认证/测试/报告）
- 实时协同（WebSocket 房间/订阅）
- AI 驱动安全与性能分析
- 云原生部署（K8s、服务网格、观测）

---

## 十九、术语表

- Core Web Vitals：衡量页面体验的三大指标（LCP/FID/CLS）
- TTL：缓存存活时间（Time To Live）
- 指数退避：每次重试延迟成倍增加，避免拥塞

---

## 二十、附录

### A. 常用命令速查
```bash
# 开发
npm run dev          # 前后端同时启动
npm run frontend     # 前端
npm run backend:dev  # 后端

# 质量
npm run type-check
npm run lint
npm run test

# 构建
npm run build
npm run preview

# 维护
npm run clean
npm run clean:all
```

### B. 关键文件位置
- 前端入口与路由：`frontend/App.tsx`、`frontend/components/routing/AppRoutes.tsx`
- 前端配置：`frontend/vite.config.ts`、`frontend/.eslintrc.json`
- 后端入口：`backend/src/app.js`
- 后端配置：`backend/config/database.js`、`backend/routes/seo.js`
- 顶层构建与测试：`vite.config.ts`、`tsconfig.json`
- 编排：`docker-compose.yml`

### C. 路由清单（节选）
- 公共页面：`/login`、`/register`、`/website-test`、`/seo-test`、`/performance-test`、`/compatibility-test`
- 受保护页面：`/dashboard`、`/admin`、`/test-history`、`/reports`

---

最后更新：自动生成于首次补全本文件之时（请在发版流程中维护更新时间）

