# 📦 Test-Web 插件化架构文档

## 🎯 概述

Test-Web 现在拥有一个完整的插件化架构，支持动态加载、配置管理、热重载和插件生命周期管理。这个架构让测试工具可以模块化、可扩展，并支持第三方开发者贡献插件。

## 🏗️ 架构组成

### 1. **插件管理器 (PluginManager)**
- 负责插件的加载、注册和生命周期管理
- 支持依赖解析和拓扑排序
- 提供插件热重载功能
- 管理插件间的通信和事件

### 2. **配置管理器 (PluginConfigManager)**
- 管理插件配置的加载、验证和持久化
- 支持多种配置源（文件、数据库、环境变量）
- 提供配置热重载和动态更新
- 支持配置导入导出

### 3. **插件接口规范 (ITestPlugin)**
- 定义标准的插件接口和生命周期方法
- 提供不同类型插件的专用接口
- 包含配置和结果的Schema验证
- 确保插件的一致性和兼容性

### 4. **插件系统 (PluginSystem)**
- 整合所有组件的统一入口
- 协调插件管理器、配置管理器和引擎管理器
- 提供简化的API接口
- 管理系统级事件和状态

## 📋 插件类型

### **测试引擎插件 (test-engine)**
执行具体的测试任务，如性能测试、安全测试等。

### **分析器插件 (analyzer)**
分析测试结果，提供深度洞察和趋势分析。

### **报告生成器插件 (reporter)**
生成各种格式的测试报告（HTML、PDF、JSON等）。

### **增强器插件 (enhancer)**
增强测试配置或结果，添加额外功能。

### **工具插件 (utility)**
提供辅助功能，如数据转换、日志处理等。

## 🚀 快速开始

### 1. 初始化插件系统

```javascript
const { PluginSystemAPI } = require('./backend/plugins/PluginSystem');

// 初始化插件系统
await PluginSystemAPI.initialize();
```

### 2. 安装插件

```javascript
// 从本地路径安装
await PluginSystemAPI.installPlugin('./plugins/my-plugin');

// 插件将自动加载并启动
```

### 3. 执行测试

```javascript
// 使用插件执行测试
const result = await PluginSystemAPI.executeTest(
  'performance-test-plugin',
  {
    url: 'https://example.com',
    device: 'mobile'
  }
);
```

## 📝 开发插件

### 1. 创建插件结构

```
my-plugin/
├── index.js           # 插件主文件
├── plugin.json        # 插件清单
├── config.json        # 默认配置
├── lib/              # 插件库文件
├── tests/            # 测试文件
└── README.md         # 文档
```

### 2. 编写插件清单 (plugin.json)

```json
{
  "id": "my-test-plugin",
  "name": "My Test Plugin",
  "version": "1.0.0",
  "description": "A custom test plugin",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "type": "test-engine",
  "category": "performance",
  "main": "index.js",
  "capabilities": ["custom-testing"],
  "dependencies": [],
  "config": {
    "enabled": true,
    "timeout": 30000
  }
}
```

### 3. 实现插件类

```javascript
const { ITestEnginePlugin } = require('../interfaces/ITestPlugin');

class MyTestPlugin extends ITestEnginePlugin {
  constructor(manifest) {
    super();
    this.manifest = manifest;
  }

  async initialize(context) {
    // 初始化插件
    console.log('Plugin initialized');
  }

  async executeTest(config, options) {
    // 执行测试逻辑
    return {
      success: true,
      testId: options.testId,
      data: {
        // 测试结果
      }
    };
  }

  // 实现其他必需的方法...
}

module.exports = MyTestPlugin;
```

## 🔧 配置管理

### 配置文件位置
- 默认: `config/plugins/{plugin-id}.json`
- 支持格式: JSON, YAML, JavaScript

### 配置示例

```json
{
  "enabled": true,
  "priority": 80,
  "timeout": 60000,
  "retries": 2,
  "maxConcurrent": 5,
  "logging": {
    "level": "info",
    "enabled": true
  }
}
```

### 动态更新配置

```javascript
await PluginSystemAPI.updateConfig('my-plugin', {
  timeout: 90000,
  retries: 3
});
```

## 🔄 生命周期

### 插件生命周期阶段

1. **Unloaded**: 插件文件已发现但未加载
2. **Loading**: 插件正在加载中
3. **Loaded**: 插件已加载但未启动
4. **Active**: 插件已启动并可用
5. **Error**: 插件出现错误
6. **Disabled**: 插件被禁用

### 生命周期钩子

```javascript
class MyPlugin extends BasePlugin {
  async initialize(context) {
    // 插件初始化时调用
  }

  async start() {
    // 插件启动时调用
  }

  async stop() {
    // 插件停止时调用
  }

  async unload() {
    // 插件卸载时调用
  }
}
```

## 🎮 API 参考

### PluginSystemAPI

#### initialize()
初始化插件系统。

#### installPlugin(pluginPath)
安装新插件。

#### uninstallPlugin(pluginId)
卸载插件。

#### executeTest(pluginId, config, options)
执行测试。

#### getStatus()
获取系统状态。

#### getPlugin(pluginId)
获取插件实例。

#### updateConfig(pluginId, updates)
更新插件配置。

## 🔌 内置插件

### Performance Test Plugin
- ID: `performance-test-plugin`
- 功能: 使用Lighthouse进行性能测试
- 支持: Core Web Vitals, 页面速度分析

## 🛡️ 安全考虑

1. **插件隔离**: 每个插件在独立的上下文中运行
2. **配置验证**: 使用Joi进行严格的配置验证
3. **权限控制**: 插件只能访问授权的资源
4. **错误隔离**: 单个插件的错误不会影响系统

## 📊 监控和调试

### 获取系统状态

```javascript
const status = PluginSystemAPI.getStatus();
console.log(status);
// {
//   initialized: true,
//   plugins: { ... },
//   engines: { ... },
//   statistics: { ... }
// }
```

### 事件监听

```javascript
pluginSystem.on('plugin:started', ({ pluginId }) => {
  console.log(`Plugin started: ${pluginId}`);
});

pluginSystem.on('plugin:error', ({ plugin, error }) => {
  console.error(`Plugin error:`, error);
});
```

## 🚦 最佳实践

1. **版本管理**: 使用语义化版本控制
2. **错误处理**: 始终处理异步错误
3. **资源清理**: 在stop/unload中释放资源
4. **配置验证**: 使用Schema验证所有配置
5. **日志记录**: 提供适当的日志级别
6. **文档编写**: 为插件提供完整文档

## 🎯 未来规划

- [ ] 插件市场和在线安装
- [ ] 插件沙箱和安全隔离
- [ ] 插件版本管理和自动更新
- [ ] 插件性能监控和分析
- [ ] 插件开发CLI工具
- [ ] 插件单元测试框架

## 📚 相关文档

- [插件开发指南](./plugin-development-guide.md)
- [API文档](./api-reference.md)
- [配置参考](./configuration.md)

---

**🎉 插件化架构已完全实现并可用！**
