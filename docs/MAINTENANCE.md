# 项目持续维护指南

## 📋 概述

本项目配备了完整的持续维护机制，包括自动化检查、性能监控、依赖管理和健康度评估。

## 🔧 维护工具

### 1. 持续维护检查器
```bash
npm run maintenance
```
运行完整的项目健康检查，包括：
- 项目结构分析
- 依赖健康度检查
- 构建性能分析
- 代码质量评估
- 性能指标监控

### 2. 定期维护调度器
```bash
# 日常检查
npm run maintenance:daily

# 周检查
npm run maintenance:weekly

# 月检查
npm run maintenance:monthly
```

### 3. 维护仪表板
```bash
# 控制台仪表板
npm run maintenance:dashboard

# 生成HTML报告
npm run maintenance:dashboard:html
```

## 📊 检查项目

### 项目结构检查
- ✅ 重复文件检测
- ✅ 未使用文件识别
- ✅ 大文件警告
- ✅ 目录结构合规性

### 依赖管理检查
- ✅ 过时依赖检测
- ✅ 安全漏洞扫描
- ✅ 重复依赖识别
- ✅ 许可证合规性

### 构建健康度检查
- ✅ 构建时间监控
- ✅ Chunk大小分析
- ✅ Bundle优化建议
- ✅ 构建错误检测

### 代码质量检查
- ✅ 系统集成评分
- ✅ TypeScript类型检查
- ✅ ESLint规则验证
- ✅ 代码格式化检查

### 性能指标检查
- ✅ Bundle大小监控
- ✅ 图片优化检查
- ✅ 加载性能分析
- ✅ 缓存策略验证

## ⚙️ 配置

维护配置文件位于 `.maintenance-config.json`：

```json
{
  "schedule": {
    "daily": true,
    "weekly": true,
    "monthly": true
  },
  "thresholds": {
    "maxChunkSize": 300,
    "maxBuildTime": 60,
    "minIntegrationScore": 95
  },
  "notifications": {
    "console": true,
    "email": false
  }
}
```

### 配置选项说明

#### 检查阈值
- `maxChunkSize`: 最大chunk大小 (KB)
- `maxBuildTime`: 最大构建时间 (秒)
- `minIntegrationScore`: 最低集成评分
- `maxBundleSize`: 最大bundle大小 (字节)
- `maxVulnerabilities`: 最大允许漏洞数
- `maxOutdatedDependencies`: 最大过时依赖数

#### 通知设置
- `console`: 控制台输出
- `email`: 邮件通知 (需配置)
- `slack`: Slack通知 (需配置)

## 📈 报告系统

### 报告类型
1. **实时控制台报告** - 立即显示检查结果
2. **JSON格式报告** - 机器可读的详细数据
3. **HTML仪表板** - 可视化的健康状态展示
4. **Markdown报告** - 人类可读的详细分析

### 报告存储
- 路径: `reports/maintenance/`
- 格式: `maintenance-{type}-{date}.json`
- 保留期: 30天 (可配置)

## 🚨 告警机制

### 告警级别
- 🔴 **HIGH**: 需要立即处理的问题
- 🟡 **MEDIUM**: 需要关注的问题
- 🟢 **LOW**: 建议性改进

### 常见告警
1. **构建失败** - 代码无法正常构建
2. **安全漏洞** - 依赖包存在安全问题
3. **性能下降** - Bundle大小或构建时间超标
4. **集成评分低** - 系统集成健康度下降

## 🔄 自动化流程

### 建议的维护计划
- **每日**: 运行基础健康检查
- **每周**: 检查依赖更新和安全漏洞
- **每月**: 全面的代码质量和性能审查

### CI/CD集成
可以将维护检查集成到CI/CD流程中：

```yaml
# GitHub Actions 示例
- name: Run Maintenance Check
  run: npm run maintenance:daily
```

## 🛠️ 故障排除

### 常见问题

#### 1. 构建时间过长
```bash
# 分析构建性能
npm run build -- --analyze

# 检查大chunk
npm run maintenance:dashboard
```

#### 2. 依赖漏洞
```bash
# 自动修复
npm audit fix

# 手动检查
npm audit
```

#### 3. 集成评分低
```bash
# 运行详细检查
npm run check:integration

# 查看具体问题
npm run maintenance
```

## 📚 最佳实践

### 1. 定期维护
- 每天运行基础检查
- 每周审查依赖更新
- 每月进行全面评估

### 2. 性能优化
- 监控chunk大小变化
- 定期清理未使用代码
- 优化图片和资源

### 3. 安全管理
- 及时修复安全漏洞
- 定期更新依赖包
- 监控许可证合规性

### 4. 代码质量
- 保持高集成评分
- 遵循代码规范
- 定期重构优化

## 🔗 相关工具

- [系统集成检查器](../scripts/system-integration-checker.cjs)
- [包分析器](../scripts/package-json-analyzer.cjs)
- [环境配置检查](../scripts/check-env-config.cjs)

## 📞 支持

如果遇到维护相关问题，请：
1. 查看维护报告中的详细信息
2. 运行相关的诊断命令
3. 检查配置文件设置
4. 查阅项目文档

---

**注意**: 维护工具会自动创建必要的目录和配置文件。首次运行时可能需要一些时间来初始化。
