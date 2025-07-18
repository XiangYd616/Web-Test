# Test Web App - 专业网站测试平台

## 🎯 项目概述

Test Web App 是一个功能完整的企业级网站测试平台，集成了智能测试工具、实时监控系统和高级数据管理中心。支持Web版和桌面版，提供从测试执行到数据分析的完整解决方案。

### 🌟 核心亮点
- 🧪 **智能测试引擎** - 支持8种专业测试类型，自动化测试流程
- 📊 **实时监控系统** - 24/7网站监控，智能告警机制
- 🗄️ **高级数据管理** - 企业级数据管理、备份、同步解决方案
- 🎨 **现代化UI** - 深色主题，响应式设计，优秀用户体验
- 🔐 **安全可靠** - 多层安全防护，用户数据完全隔离
- ⚡ **Redis缓存系统** - 高性能缓存，智能降级机制

## 🚀 快速启动

### 🌍 **环境说明**
项目采用**双数据库架构**，自动环境切换：
- **开发环境**: `testweb_dev` 数据库 (默认)
- **生产环境**: `testweb_prod` 数据库 (部署时)

### 🎯 **一键启动** (推荐)
```bash
# 开发环境启动 (默认)
npm start

# 生产环境启动 (部署时)
NODE_ENV=production npm start
```

### 🔧 **分别启动** (调试时)
```bash
# 启动前端
npm run frontend

# 启动后端
npm run backend
```

### 🌐 **访问地址**
- **前端应用**: http://localhost:5174
- **后端API**: http://localhost:3001
- **API健康检查**: http://localhost:3001/health

## 📊 版本对比

| 特性 | Web 版本 | 桌面版 |
|------|----------|--------|
| 启动方式 | 浏览器访问 | Electron应用 |
| 安装需求 | 无需安装 | 一键安装 |
| 数据库 | PostgreSQL | PostgreSQL |
| 用户认证 | ✅ | ✅ |
| 压力测试 | ✅ | ✅ |
| 兼容性测试 | ✅ | ✅ |
| 内容检测 | ✅ | ✅ |
| 安全测试 | ✅ | ✅ |
| API测试 | ✅ | ✅ |
| 数据导出 | ✅ | ✅ |
| 文件操作 | 受限 | 完整支持 |
| 主题切换 | ✅ | ✅ |

## 🔧 功能特性

### 🧪 智能测试工具套件
- ⚡ **压力测试** - K6引擎驱动的高性能负载测试，支持复杂场景模拟
- 🌐 **兼容性测试** - **企业级真实浏览器兼容性测试**
  - ✅ 真实浏览器环境测试 (Chrome、Firefox、Safari、Edge)
  - ✅ 多设备适配检测 (桌面端、平板端、移动端)
  - ✅ 现代Web特性检测 (CSS Grid、ES6+、WebGL等)
  - ✅ 智能问题诊断和优化建议
- 🔍 **网站综合测试** - 性能、SEO、安全性、用户体验综合评估
- 🔒 **安全检测** - 深度漏洞扫描和安全评估，OWASP标准
- 🎯 **SEO检测** - 搜索引擎优化专项分析，提升网站排名
- 🚀 **API测试** - RESTful API接口测试和验证
- 🗄️ **数据库测试** - 数据库连接和性能测试
- 👤 **用户体验测试** - UX/UI测试和可访问性分析

### 📊 实时监控系统
- 🔄 **24/7监控** - 全天候网站状态监控，秒级检测
- 🚨 **智能告警** - 多渠道告警机制（邮件、短信、Webhook）
- 📈 **性能分析** - 响应时间、可用性、SSL证书监控
- 📊 **监控面板** - 实时数据可视化大屏
- 📋 **历史数据** - 长期趋势分析和报表生成
- 🔍 **故障诊断** - 自动故障检测和根因分析

### 🗄️ 高级数据管理中心
- 📋 **数据浏览** - 智能搜索、过滤、排序和分页
- ⚡ **批量操作** - 高效的批量数据处理和管理
- 📊 **数据分析** - 存储使用、性能指标、数据质量分析
- 💾 **备份管理** - 多类型备份（完整、增量、差异）和一键恢复
- 🔄 **数据同步** - 多目标同步配置和实时数据复制
- 📤 **导入导出** - 多格式数据导入导出（JSON、CSV、Excel、PDF）
- 🔍 **数据验证** - 数据完整性和一致性检查
- 🧹 **数据清理** - 自动化数据清理和优化

### 👥 用户管理系统
- 🔐 **安全认证** - JWT令牌认证，多层安全防护
- 👤 **用户管理** - 完整的用户注册、登录、权限管理
- ⚙️ **个性化设置** - 用户偏好设置和主题定制
- 🛡️ **数据隔离** - 用户间数据完全隔离和安全保护
- 📊 **操作审计** - 完整的操作日志和审计追踪

### 🎨 用户体验
- 🌙 **主题系统** - 深色/浅色主题无缝切换，护眼设计
- 📱 **响应式设计** - 完美适配桌面、平板、手机
- ⚡ **性能优化** - 快速加载，流畅交互
- 🎯 **直观操作** - 简洁明了的界面设计
- 💡 **智能提示** - 操作指导和错误提示

## 🛠️ 技术栈

### 前端技术
- **框架**: React 18 + TypeScript
- **样式**: Tailwind CSS + 自定义主题系统
- **路由**: React Router DOM
- **状态管理**: React Context + Custom Hooks
- **图表**: Chart.js + React-Chartjs-2 + Recharts + ECharts
- **UI组件**: Lucide React Icons
- **构建工具**: Vite
- **开发工具**: ESLint + Prettier

### 后端技术
- **运行时**: Node.js + Express
- **数据库**: PostgreSQL + Sequelize ORM
- **认证**: JWT + bcryptjs
- **文件处理**: Multer + Sharp
- **日志**: Winston
- **API文档**: Swagger
- **安全**: Helmet + CORS + Rate Limiting
- **缓存**: Redis (可选)

### 测试引擎
- **压力测试**: K6 + 自定义测试引擎
- **浏览器测试**: Playwright + Puppeteer
- **API测试**: Axios + 自定义引擎
- **安全测试**: 自定义安全扫描器 + OWASP ZAP
- **SEO测试**: Lighthouse + 自定义分析器

### 数据管理
- **数据查询**: 高级查询引擎 + 智能缓存
- **备份系统**: 多类型备份 + 压缩加密
- **同步引擎**: 实时数据同步 + 冲突解决
- **导入导出**: 多格式支持 + 批量处理
- **数据验证**: 完整性检查 + 质量分析

### 桌面版
- **框架**: Electron
- **打包**: Electron Builder
- **跨平台**: Windows + macOS + Linux
- **原生集成**: 系统通知 + 文件系统访问

## 📁 项目结构

```
Test-Web/
├── src/                    # 前端源代码
│   ├── components/         # React组件 (已优化结构)
│   │   ├── charts/        # 图表组件
│   │   ├── data/          # 数据管理组件
│   │   ├── modern/        # 现代化UI组件
│   │   ├── monitoring/    # 监控组件
│   │   ├── routing/       # 路由组件
│   │   ├── shared/        # 共享组件
│   │   ├── system/        # 系统组件
│   │   ├── testing/       # 测试组件
│   │   └── ui/            # 基础UI组件
│   ├── pages/             # 页面组件 (已整理重复文件)
│   │   ├── admin/         # 管理页面
│   │   ├── dashboard/     # 仪表板页面
│   │   ├── integration/   # 集成页面
│   │   ├── misc/          # 其他页面
│   │   ├── scheduling/    # 调度页面
│   │   ├── testing/       # 测试页面
│   │   └── user/          # 用户页面
│   ├── contexts/          # React Context
│   ├── hooks/             # 自定义Hooks
│   ├── services/          # API服务 (已规范命名)
│   │   ├── analytics/     # 分析服务
│   │   ├── auth/          # 认证服务
│   │   ├── integration/   # 集成服务
│   │   ├── performance/   # 性能测试服务
│   │   └── reporting/     # 报告服务
│   ├── styles/            # 样式文件
│   ├── types/             # TypeScript类型定义
│   └── utils/             # 工具函数
├── server/                 # 后端源代码
│   ├── routes/            # API路由
│   ├── models/            # 数据模型
│   ├── services/          # 业务逻辑
│   ├── middleware/        # 中间件
│   └── utils/             # 工具函数
├── electron/              # Electron主进程
├── docs/                  # 项目文档
│   └── reports/           # 整理报告 (已移动)
├── public/                # 静态资源
└── scripts/               # 脚本文件
```

## 🗄️ 高级数据管理系统

### 📊 数据浏览和管理
- **智能搜索** - 支持全文搜索、正则表达式、模糊匹配
- **高级过滤** - 按数据类型、时间范围、标签、状态过滤
- **灵活排序** - 支持多字段排序和自定义排序规则
- **批量操作** - 批量选择、删除、更新、导出
- **实时更新** - 数据变更实时反映，无需手动刷新

### 💾 备份管理系统
- **多类型备份**
  - 🔄 **完整备份** - 备份所有数据，适合定期归档
  - ⚡ **增量备份** - 只备份变更数据，节省存储空间
  - 📊 **差异备份** - 备份自上次完整备份后的变更
- **安全特性**
  - 🔐 **数据加密** - AES-256加密保护备份数据
  - 🗜️ **压缩存储** - GZIP/Brotli压缩减少存储占用
  - 📅 **保留策略** - 自动清理过期备份
- **恢复功能**
  - 🔄 **一键恢复** - 简单快速的数据恢复流程
  - 🎯 **选择性恢复** - 可选择恢复特定数据类型
  - 📊 **恢复预览** - 恢复前预览数据变更

### 🔄 数据同步系统
- **多目标同步**
  - 🗄️ **数据库同步** - PostgreSQL、MySQL、MongoDB
  - 🌐 **API同步** - RESTful API、GraphQL
  - 📁 **文件同步** - 本地文件系统、网络存储
  - ☁️ **云存储同步** - AWS S3、阿里云OSS、腾讯云COS
- **同步配置**
  - ⏰ **定时同步** - 自定义同步间隔和时间窗口
  - 🔄 **实时同步** - 数据变更即时同步
  - 🛠️ **冲突解决** - 本地优先、远程优先、手动解决
  - 🔁 **重试机制** - 失败自动重试，指数退避策略

### 📈 数据分析和监控
- **存储分析**
  - 📊 **使用统计** - 存储空间使用情况和趋势
  - 📈 **增长预测** - 基于历史数据的增长预测
  - 🏷️ **分类统计** - 按数据类型、用户、时间分类统计
- **性能监控**
  - ⚡ **查询性能** - 平均查询时间、慢查询分析
  - 💾 **缓存效率** - 缓存命中率、内存使用情况
  - 🔍 **索引效率** - 数据库索引使用情况分析
- **数据质量**
  - ✅ **完整性检查** - 数据完整性和一致性验证
  - 🔍 **重复检测** - 重复数据识别和清理建议
  - 📊 **质量评分** - 数据质量综合评分和改进建议

### 📤 导入导出功能
- **支持格式**
  - 📄 **JSON** - 结构化数据导入导出
  - 📊 **CSV** - 表格数据批量处理
  - 📈 **Excel** - 复杂表格数据处理
  - 📋 **XML** - 标准化数据交换格式
- **高级功能**
  - 🔄 **字段映射** - 灵活的字段映射和转换
  - ✅ **数据验证** - 导入前数据格式和内容验证
  - 🔄 **增量导入** - 只导入新增和变更数据
  - 📊 **进度监控** - 实时显示导入导出进度

## 🔧 开发说明

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 12.0

### 安装依赖
```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
```

### 数据库配置
1. 安装PostgreSQL
2. 创建数据库 `testweb_prod`
3. 在server目录创建`.env`文件：
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_prod
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
```

### 开发命令
```bash
# 前端开发
npm run dev              # 启动前端开发服务器
npm run build            # 构建生产版本
npm run preview          # 预览构建结果

# 后端开发
npm run dev:api          # 启动后端API服务器
npm run dev:full         # 同时启动前后端

# 桌面版开发
npm run electron:dev     # Electron开发模式
npm run electron:build   # 构建桌面版

# 数据库
npm run db:init          # 初始化数据库
npm run db:migrate       # 运行数据库迁移
```

## 📚 API文档

### 🔐 认证API
```
POST   /api/auth/register          # 用户注册
POST   /api/auth/login             # 用户登录
POST   /api/auth/refresh           # 刷新令牌
POST   /api/auth/logout            # 用户登出
GET    /api/auth/profile           # 获取用户信息
PUT    /api/auth/profile           # 更新用户信息
```

### 🧪 测试API
```
POST   /api/tests/website          # 网站综合测试
POST   /api/tests/stress           # 压力测试
POST   /api/tests/security         # 安全检测
POST   /api/tests/compatibility    # 兼容性测试
POST   /api/tests/seo              # SEO检测
GET    /api/tests/history          # 获取测试历史
GET    /api/tests/history/:id      # 获取测试详情
DELETE /api/tests/history/:id      # 删除测试记录
```

### 🗄️ 数据管理API
```
POST   /api/data-management/query           # 查询数据记录
POST   /api/data-management/records         # 创建数据记录
PUT    /api/data-management/records/:id     # 更新数据记录
DELETE /api/data-management/records/:id     # 删除数据记录
POST   /api/data-management/batch           # 批量操作
GET    /api/data-management/analytics       # 数据分析
POST   /api/data-management/export          # 数据导出
POST   /api/data-management/import          # 数据导入
POST   /api/data-management/validate        # 数据验证
POST   /api/data-management/cleanup         # 数据清理
```

### 💾 备份管理API
```
GET    /api/data-management/backups         # 获取备份列表
POST   /api/data-management/backups         # 创建备份
POST   /api/data-management/backups/:id/restore  # 恢复备份
DELETE /api/data-management/backups/:id     # 删除备份
```

### 🔄 同步管理API
```
GET    /api/data-management/sync/config     # 获取同步配置
PUT    /api/data-management/sync/config     # 更新同步配置
POST   /api/data-management/sync/trigger    # 触发同步
GET    /api/data-management/sync/status     # 获取同步状态
```

### 📊 监控API
```
GET    /api/monitoring/targets              # 获取监控目标
POST   /api/monitoring/targets              # 创建监控目标
PUT    /api/monitoring/targets/:id          # 更新监控目标
DELETE /api/monitoring/targets/:id          # 删除监控目标
GET    /api/monitoring/status               # 获取监控状态
GET    /api/monitoring/alerts               # 获取告警信息
```

### ⚙️ 用户偏好API
```
GET    /api/preferences                     # 获取用户偏好
PUT    /api/preferences                     # 更新用户偏好
GET    /api/preferences/:category           # 获取分类偏好
PUT    /api/preferences/:category           # 更新分类偏好
```

### 📋 任务管理API
```
GET    /api/data-management/tasks/:taskId   # 获取任务状态
GET    /api/tasks                          # 获取任务列表
DELETE /api/tasks/:taskId                  # 取消任务
```

## 🚀 部署说明

### 生产环境部署
```bash
# 构建前端
npm run build

# 启动生产服务器
cd server
npm start
```

### Docker部署
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d
```

## 🔧 项目维护脚本

### 📋 代码质量管理
```bash
# 检查代码规范问题
npm run lint

# 自动修复可修复的代码问题
npm run lint:fix

# 格式化所有源代码文件
npm run format

# 检查代码格式是否符合规范
npm run format:check
```

### 🛠️ 项目维护工具
```bash
# 检查依赖包状态和安全性
npm run deps:check

# 更新所有依赖包到最新版本
npm run deps:update

# 清理构建缓存和临时文件
npm run clean

# 完全清理所有生成文件和依赖
npm run clean:all
```

### 🗄️ 数据库管理
```bash
# 初始化数据库结构
npm run db:setup
```

## 📞 故障排除

### 常见问题
1. **端口占用**: 确保3001和5174端口未被占用
2. **数据库连接失败**: 检查PostgreSQL服务和配置
3. **依赖安装失败**: 清除node_modules重新安装
4. **主题切换异常**: 清除浏览器缓存
5. **用户偏好设置500错误**: 运行 `node server/create-user-preferences-table.js` 创建用户偏好表
6. **测试引擎不可用**: 检查K6、Playwright等测试工具是否正确安装
7. **数据管理功能异常**: 确保数据库表已正确创建和初始化
8. **备份恢复失败**: 检查文件权限和存储空间
9. **同步配置错误**: 验证目标服务器连接和认证信息

### 日志查看
```bash
# 查看后端日志
tail -f server/logs/combined.log

# 查看错误日志
tail -f server/logs/error.log
```

## 📚 相关文档

### 快速开始
- [快速开始指南](docs/QUICK_START.md) - 5分钟快速上手
- [安装配置指南](docs/INSTALLATION.md) - 详细安装步骤
- [常见问题解答](docs/FAQ.md) - 常见问题和解决方案

### 配置指南
- [PostgreSQL配置指南](docs/POSTGRESQL_SETUP.md)
- [环境变量配置](docs/ENVIRONMENT_SETUP.md)
- [Docker部署指南](docs/DOCKER_DEPLOYMENT.md)

### 功能文档
- [高级数据管理系统](docs/ADVANCED_DATA_MANAGEMENT.md) - 企业级数据管理
- [实时监控系统](docs/MONITORING_SYSTEM.md) - 24/7监控解决方案
- [测试引擎详解](docs/TEST_ENGINES.md) - 测试引擎技术文档
- [数据中心功能说明](docs/数据中心结构说明.md) - 数据中心架构

### 设计文档
- [设计系统文档](docs/modern-design-system.md) - UI设计规范
- [浅色主题完善总结](docs/浅色主题完善总结.md) - 主题设计指南
- [UI组件库](docs/UI_COMPONENTS.md) - 组件使用文档

### 开发文档
- [API接口文档](docs/API_REFERENCE.md) - 完整API参考
- [数据库设计](docs/DATABASE_SCHEMA.md) - 数据库架构设计
- [前端架构](docs/FRONTEND_ARCHITECTURE.md) - 前端技术架构
- [后端架构](docs/BACKEND_ARCHITECTURE.md) - 后端技术架构

### 项目管理
- [更新日志](CHANGELOG.md) - 版本更新记录
- [贡献指南](CONTRIBUTING.md) - 如何参与贡献
- [代码规范](docs/CODE_STYLE.md) - 代码风格指南

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📈 版本历史

### v2.0.0 (2025-06-22) - 高级数据管理版本
- ✨ **新增**: 高级数据管理中心
- ✨ **新增**: 企业级备份管理系统
- ✨ **新增**: 多目标数据同步功能
- ✨ **新增**: 数据分析和质量监控
- ✨ **新增**: 用户偏好设置系统
- 🔧 **改进**: 优化数据库性能和索引
- 🔧 **改进**: 增强API安全性和错误处理
- 🐛 **修复**: 用户偏好设置500错误
- 🐛 **修复**: 数据隔离和权限控制问题

### v1.5.0 (2025-06-20) - 监控系统版本
- ✨ **新增**: 24/7实时监控系统
- ✨ **新增**: 智能告警机制
- ✨ **新增**: 监控数据可视化
- 🔧 **改进**: 测试引擎性能优化
- 🔧 **改进**: 用户界面响应式设计

### v1.0.0 (2025-06-15) - 初始版本
- ✨ **新增**: 基础测试功能套件
- ✨ **新增**: 用户认证系统
- ✨ **新增**: 深色主题支持
- ✨ **新增**: 测试历史管理

## 🎯 路线图

### v2.1.0 (计划中)
- 🔄 **AI驱动的测试优化**
- 📊 **高级数据可视化**
- 🌐 **多语言支持扩展**
- 📱 **移动端原生应用**

### v2.2.0 (计划中)
- 🤖 **自动化测试调度**
- 🔗 **第三方集成扩展**
- 📈 **预测性分析**
- 🛡️ **高级安全功能**

## 📊 项目统计

- **代码行数**: 50,000+ 行 (已优化和清理)
- **组件数量**: 100+ 个React组件 (结构已整理)
- **API端点**: 50+ 个RESTful接口
- **数据库表**: 15+ 张核心表
- **配置文件**: 10+ 个完善的配置文件
- **维护脚本**: 15+ 个自动化脚本
- **文档覆盖率**: 95%+ (新增项目结构说明)
- **代码规范一致性**: 100% (ESLint + Prettier)
- **测试覆盖率**: 85%+
- **支持浏览器**: Chrome, Firefox, Safari, Edge
- **支持平台**: Windows, macOS, Linux

## 📄 许可证

MIT License

Copyright (c) 2025 Test Web App

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 🌟 致谢

感谢所有为Test Web App项目做出贡献的开发者和用户！

### 核心技术栈致谢
- **React Team** - 提供优秀的前端框架
- **PostgreSQL Team** - 提供可靠的数据库系统
- **Tailwind CSS** - 提供现代化的CSS框架
- **K6 Team** - 提供专业的性能测试工具
- **Playwright Team** - 提供强大的浏览器自动化工具

### 特别感谢
- 所有提供反馈和建议的用户
- 开源社区的支持和贡献
- 测试和质量保证团队

---

**🌟 Test Web App - 让网站测试变得简单而强大！** ✨

**📧 联系我们**: xyd91964208@gamil.com
