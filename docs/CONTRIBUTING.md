# 贡献指南

## 🤝 欢迎贡献

感谢您对Test Web App项目的关注！我们欢迎各种形式的贡献。

## 📋 贡献方式

### 🐛 报告Bug
- 使用GitHub Issues报告问题
- 提供详细的复现步骤
- 包含错误截图或日志

### 💡 功能建议
- 在Issues中提出新功能建议
- 详细描述功能需求和使用场景
- 讨论实现方案

### 🔧 代码贡献
1. Fork项目到您的GitHub账户
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 创建Pull Request

## 📝 开发规范

### 代码风格
- 使用TypeScript进行类型安全开发
- 遵循ESLint和Prettier配置
- 组件使用PascalCase命名
- 函数使用camelCase命名

### 提交规范
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建过程或辅助工具的变动

## 🧪 测试要求

- 新功能需要包含相应的测试用例
- 确保所有测试通过: `npm test`
- 保持测试覆盖率

## 📚 文档要求

- 新功能需要更新相关文档
- API变更需要更新API文档
- 复杂功能需要添加使用示例

## ✅ Pull Request检查清单

- [ ] 代码遵循项目规范
- [ ] 包含必要的测试
- [ ] 更新了相关文档
- [ ] 通过了所有CI检查
- [ ] 提供了清晰的PR描述

## 🙏 致谢

感谢所有为项目做出贡献的开发者！

## 🛠️ 维护工具

项目提供了完整的维护工具链：

### 项目分析工具
```bash
npm run project:analyze              # 项目结构分析
npm run backend:analyze              # Backend结构分析
npm run project:full-stack-analysis  # 全栈分析
```

### 重构工具
```bash
npm run project:restructure          # 全项目重构
npm run backend:restructure          # Backend重构
npm run naming:fix                   # 命名规范修复
```

### 验证工具
```bash
npm run config:validate              # 配置验证
npm run validate:routes              # 路由验证
npm run project:complete-check       # 完整检查
```

