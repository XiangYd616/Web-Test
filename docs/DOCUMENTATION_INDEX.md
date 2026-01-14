# 📚 Test-Web 项目文档索引

**最后更新**: 2026-01-14  
**文档版本**: v2.0

---

## 🎯 快速导航

### 新手入门

- [项目README](../README.md) - 项目概述和快速开始
- [快速开始指南](../QUICK_START.md) - 5分钟快速上手
- [开发环境配置](PROJECT_STARTUP_GUIDE.md) - 详细的环境搭建

### 开发者文档

- [架构标准](ARCHITECTURE_STANDARDS.md) - 统一架构规范
- [API文档](API.md) - 完整的API接口说明
- [贡献指南](CONTRIBUTING.md) - 如何参与项目开发

### 运维部署

- [部署指南](DEPLOYMENT.md) - 生产环境部署
- [故障排除](TROUBLESHOOTING.md) - 常见问题解决

### 项目管理

- [重构路线图](../RESTRUCTURE_ROADMAP.md) - 项目重构计划
- [重构评估](../PROJECT_RESTRUCTURE_ASSESSMENT.md) - 项目现状分析
- [重构状态](../REFACTOR_STATUS.md) - 当前重构进度

---

## 📖 文档分类

### 1. 核心文档

#### 项目概述

- **README.md** - 项目主文档
  - 项目介绍
  - 核心功能
  - 技术栈
  - 快速开始

#### 快速开始

- **QUICK_START.md** - 快速开始指南
  - 环境要求
  - 安装步骤
  - 运行项目
  - 常用命令

### 2. 架构文档

#### 架构设计

- **ARCHITECTURE_STANDARDS.md** - 架构统一规范
  - 分层架构
  - 目录结构
  - API层规范
  - 服务层规范
  - 命名规范

#### 统一架构

- **UNIFIED_ARCHITECTURE.md** - 企业级统一架构
  - 统一API服务
  - 统一认证服务
  - 配置驱动
  - 企业级安全

### 3. API文档

#### API接口

- **API.md** - 完整API文档
  - RESTful API
  - 请求/响应格式
  - 认证授权
  - 错误处理

#### Postman使用

- **postman-features-usage.md** - Postman功能使用指南
  - 环境配置
  - 测试集合
  - 自动化测试

### 4. 开发文档

#### 开发指南

- **PROJECT_STARTUP_GUIDE.md** - 项目启动与开发指南
  - 环境配置
  - 开发流程
  - 调试技巧

#### 贡献指南

- **CONTRIBUTING.md** - 贡献指南
  - 代码规范
  - 提交规范
  - 代码审查
  - 分支管理

#### 用户指南

- **USER_GUIDE.md** - 用户使用指南
  - 功能说明
  - 操作流程
  - 最佳实践

### 5. 运维文档

#### 部署

- **DEPLOYMENT.md** - 部署指南
  - 环境准备
  - 部署流程
  - 配置说明
  - 监控告警

#### 故障排除

- **TROUBLESHOOTING.md** - 故障排除指南
  - 常见问题
  - 错误诊断
  - 解决方案

#### 版本管理

- **VERSION_MANAGEMENT.md** - 版本管理
  - 版本策略
  - 发布流程
  - 变更日志

### 6. 项目管理

#### 重构文档

- **RESTRUCTURE_ROADMAP.md** - 重构路线图
  - 重构策略
  - 执行计划
  - 时间表
  - 里程碑

- **PROJECT_RESTRUCTURE_ASSESSMENT.md** - 项目重构评估
  - 问题分析
  - 重构目标
  - 预期收益
  - 风险评估

- **REFACTOR_STATUS.md** - 重构状态
  - 已完成工作
  - 剩余工作
  - 进度跟踪

#### 变更记录

- **CHANGELOG.md** - 变更日志
  - 版本历史
  - 功能变更
  - Bug修复

### 7. 归档文档

#### 重构归档

- **refactor-archive/** - 历史重构报告
  - 各阶段重构报告
  - 完成总结
  - 经验教训

---

## 🔍 按角色查找文档

### 新加入的开发者

1. 阅读 [README.md](../README.md) 了解项目
2. 按照 [QUICK_START.md](../QUICK_START.md) 搭建环境
3. 学习 [ARCHITECTURE_STANDARDS.md](ARCHITECTURE_STANDARDS.md) 了解架构
4. 阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发规范

### 前端开发者

1. [ARCHITECTURE_STANDARDS.md](ARCHITECTURE_STANDARDS.md) - 前端架构规范
2. [API.md](API.md) - API接口文档
3. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 前端常见问题

### 后端开发者

1. [ARCHITECTURE_STANDARDS.md](ARCHITECTURE_STANDARDS.md) - 后端架构规范
2. [API.md](API.md) - API设计规范
3. [DEPLOYMENT.md](DEPLOYMENT.md) - 部署相关

### 运维人员

1. [DEPLOYMENT.md](DEPLOYMENT.md) - 部署指南
2. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 故障排除
3. [VERSION_MANAGEMENT.md](VERSION_MANAGEMENT.md) - 版本管理

### 项目经理

1. [README.md](../README.md) - 项目概述
2. [RESTRUCTURE_ROADMAP.md](../RESTRUCTURE_ROADMAP.md) - 重构计划
3. [REFACTOR_STATUS.md](../REFACTOR_STATUS.md) - 当前进度

---

## 📝 文档维护规范

### 文档更新原则

1. **及时更新** - 代码变更时同步更新文档
2. **版本控制** - 重要文档标注版本和更新日期
3. **清晰简洁** - 使用清晰的语言和结构
4. **示例丰富** - 提供足够的代码示例

### 文档命名规范

```
核心文档: UPPERCASE.md (如 README.md)
功能文档: PascalCase.md (如 ApiDocumentation.md)
归档文档: archive/ 目录下
临时文档: temp/ 目录下 (定期清理)
```

### 文档审查清单

- [ ] 标题清晰准确
- [ ] 内容完整无误
- [ ] 代码示例可运行
- [ ] 链接有效
- [ ] 格式规范统一
- [ ] 版本和日期更新

---

## 🔗 外部资源

### 技术栈文档

- [React 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Node.js 官方文档](https://nodejs.org/)
- [Express 官方文档](https://expressjs.com/)

### 工具文档

- [Vite 官方文档](https://vitejs.dev/)
- [Ant Design 官方文档](https://ant.design/)
- [TailwindCSS 官方文档](https://tailwindcss.com/)

---

## 📞 获取帮助

### 遇到问题？

1. **查看文档** - 先查阅相关文档
2. **搜索Issues** - 在GitHub Issues中搜索
3. **提问讨论** - 在团队群组中提问
4. **创建Issue** - 创建新的Issue报告问题

### 文档反馈

如果发现文档有误或需要改进，请：

- 提交Issue说明问题
- 或直接提交PR修复

---

**文档持续更新中，欢迎反馈和贡献！** 📖
