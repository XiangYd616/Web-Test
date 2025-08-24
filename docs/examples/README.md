# Test-Web 示例文档

本目录包含Test-Web项目的各种使用示例和演示代码。

## 📁 目录结构

```
docs/examples/
├── README.md                    # 本文件
├── api-upgrade-example.tsx      # API升级示例
├── ui-optimization-example.tsx  # UI优化示例
└── component-usage-example.tsx  # 组件使用示例
```

## 🎯 示例说明

### 1. API升级示例 (`api-upgrade-example.tsx`)
展示如何在现有页面中可选地使用新的统一API调用模式：
- 原始实现保持不变
- 兼容性适配器使用
- 统一API客户端使用
- 三种方案的对比演示

### 2. UI优化示例 (`ui-optimization-example.tsx`)
展示如何在不改变核心功能的前提下优化用户体验：
- 4个优化级别对比
- 统一主题变量使用
- 统一组件使用
- 实际效果演示

### 3. 组件使用示例 (`component-usage-example.tsx`)
展示各种统一组件的使用方法：
- 图标系统使用
- 反馈组件使用
- 增强组件使用
- 最佳实践演示

## 🚀 如何使用

### 在开发环境中运行示例

1. **复制示例文件到项目中**：
   ```bash
   # 复制到frontend/playground目录
   cp docs/examples/*.tsx frontend/playground/
   ```

2. **在路由中添加示例页面**：
   ```tsx
   // 在路由配置中添加
   import ApiUpgradeExample from './playground/api-upgrade-example';
   import UIOptimizationExample from './playground/ui-optimization-example';
   
   // 添加路由
   <Route path="/examples/api-upgrade" component={ApiUpgradeExample} />
   <Route path="/examples/ui-optimization" component={UIOptimizationExample} />
   ```

3. **访问示例页面**：
   - API升级示例: `http://localhost:3000/examples/api-upgrade`
   - UI优化示例: `http://localhost:3000/examples/ui-optimization`

### 学习和参考

这些示例文件主要用于：
- **学习新功能**: 了解如何使用新的API和组件
- **对比效果**: 查看优化前后的差异
- **最佳实践**: 学习推荐的使用方式
- **快速原型**: 作为新页面开发的起点

## 📋 注意事项

1. **示例文件不是生产代码**: 这些文件仅用于演示和学习
2. **保持更新**: 随着项目发展，示例会持续更新
3. **实际应用**: 在实际项目中使用时，请根据具体需求调整
4. **测试验证**: 在生产环境使用前，请充分测试

## 🔗 相关文档

- [API升级指南](../services/api/README.md)
- [UI优化指南](../components/ui/ui-optimization-guide.md)
- [组件使用文档](../components/README.md)
- [项目命名规范](../NAMING_CONVENTIONS.md)

## 📞 支持

如果对示例有疑问或建议：
1. 查看相关文档
2. 参考实际项目代码
3. 在开发环境中测试
4. 提出改进建议
