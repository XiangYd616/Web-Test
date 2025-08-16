# Test-Web - 现代化网站测试平台

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org/)

> 一个功能强大的现代化网站测试平台，支持性能测试、SEO分析、安全检测等多种测试功能。

## ✨ 特性

- 🚀 **性能测试** - 页面加载时间、性能指标分析
- 🔍 **SEO分析** - 标题、描述、关键词优化建议
- 🔒 **安全检测** - HTTPS、安全头、漏洞扫描
- 📊 **可视化报告** - 直观的测试结果展示
- 🎯 **批量测试** - 支持多URL批量测试
- 📱 **响应式设计** - 完美适配各种设备
- 🐳 **容器化部署** - Docker一键部署
- ⚡ **高性能** - 优化的前后端架构

## 🏗️ 技术架构

### 前端
- **React 18** + **TypeScript** - 现代化前端框架
- **Vite** - 快速构建工具
- **Tailwind CSS** - 原子化CSS框架
- **React Router** - 路由管理
- **Zustand** - 状态管理

### 后端
- **Node.js** + **Express** - 高性能后端服务
- **SQLite** - 轻量级数据库
- **Puppeteer** - 浏览器自动化
- **Jest** - 测试框架

### 部署
- **Docker** + **Docker Compose** - 容器化部署
- **Nginx** - 反向代理和负载均衡
- **PM2** - 进程管理

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- Docker (可选，用于容器化部署)

### 本地开发

```bash
# 克隆项目
git clone https://github.com/your-username/test-web.git
cd test-web

# 安装依赖
npm install

# 启动前端开发服务器
cd frontend
npm run dev

# 启动后端服务器 (新终端)
cd backend
npm run dev
```

### Docker部署

```bash
# 使用Docker Compose一键启动
docker-compose up -d

# 访问应用
# 前端: http://localhost:80
# 后端API: http://localhost:3001
```

### 一键部署到服务器

```bash
# Windows用户
.\deploy\one-click-deploy.ps1 -UsePassword

# Linux用户
./deploy/server-deploy.sh
```

## 📁 项目结构

```
Test-Web/
├── 📱 frontend/          # 前端应用
├── 🖥️ backend/           # 后端服务
├── 🧪 tests/             # 测试文件
├── 📚 docs/              # 项目文档
├── 🔧 scripts/           # 开发脚本
├── 📊 reports/           # 分析报告
├── ⚙️ config/            # 配置文件
├── 🚀 deploy/            # 部署配置
└── 🗄️ data/              # 数据文件
```

## 🔧 开发工具

项目提供了丰富的开发和维护工具：

```bash
# TypeScript错误修复
node scripts/maintenance/typescript-error-fixer.cjs

# API功能增强
node scripts/maintenance/api-implementation-enhancer.cjs

# 创建测试文件
node scripts/testing/basic-test-creator.cjs

# 项目一致性检查
node scripts/utils/consistency-checker.cjs
```

## 📖 文档

- [📚 完整文档](docs/README.md)
- [🚀 部署指南](docs/DEPLOYMENT_README.md)
- [💻 开发指南](docs/DEVELOPMENT_GUIDELINES.md)
- [📋 API文档](docs/API_DOCUMENTATION.md)
- [🔧 维护指南](docs/MAINTENANCE.md)

## 🧪 测试

```bash
# 运行所有测试
npm test

# 单元测试
npm run test:unit

# 集成测试
npm run test:integration

# E2E测试
npm run test:e2e

# 测试覆盖率
npm run test:coverage
```

## 📊 功能模块

### 🎯 测试引擎
- **性能测试** - 页面加载速度、资源优化分析
- **SEO测试** - 搜索引擎优化建议
- **安全测试** - 安全漏洞和配置检查
- **可访问性测试** - 无障碍访问检测

### 📈 数据分析
- **历史记录** - 测试结果历史追踪
- **趋势分析** - 性能变化趋势
- **对比分析** - 多次测试结果对比
- **报告导出** - PDF/Excel格式导出

### 🔧 管理功能
- **用户管理** - 多用户支持
- **项目管理** - 测试项目组织
- **定时任务** - 自动化定期测试
- **API集成** - 第三方系统集成

## 🤝 贡献

欢迎贡献代码！请查看 [贡献指南](docs/CONTRIBUTING.md)。

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [React](https://reactjs.org/) - 前端框架
- [Node.js](https://nodejs.org/) - 后端运行时
- [Puppeteer](https://pptr.dev/) - 浏览器自动化
- [Docker](https://www.docker.com/) - 容器化平台

## 📞 支持

如果您有任何问题或建议：

- 📧 邮箱: support@test-web.com
- 🐛 问题反馈: [GitHub Issues](https://github.com/your-username/test-web/issues)
- 📖 文档: [项目文档](docs/)

---

⭐ 如果这个项目对您有帮助，请给我们一个星标！
