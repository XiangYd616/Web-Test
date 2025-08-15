# 🎛️ 统一配置中心使用指南

## 📋 概述

统一配置中心是一个企业级的配置管理系统，提供配置的统一管理、热更新、验证、历史记录等功能。

## 🚀 快速开始

### 1. 基本使用

```javascript
const { configCenter } = require('./backend/config/ConfigCenter');

// 获取配置值
const port = configCenter.get('server.port');
const dbHost = configCenter.get('database.host');

// 设置配置值（带验证）
configCenter.set('testEngine.maxConcurrentTests', 10);

// 监听配置变更
const unwatch = configCenter.watch('database.maxConnections', (newValue, oldValue) => {
  console.log(`数据库连接数从 ${oldValue} 更新为 ${newValue}`);
});

// 取消监听
unwatch();
```

### 2. 环境变量配置

配置中心支持从环境变量自动加载配置：

```bash
# .env 文件
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-jwt-secret
MAX_CONCURRENT_TESTS=5
```

### 3. 运行时配置文件

支持通过 `runtime-config.json` 文件进行热更新配置：

```json
{
  "testEngine.maxConcurrentTests": 8,
  "monitoring.interval": 30000,
  "security.rateLimitMax": 200
}
```

## 🔧 配置项说明

### 服务器配置
- `server.port` - 服务器端口号（默认：3001）
- `server.host` - 服务器主机地址（默认：0.0.0.0）
- `server.nodeEnv` - 运行环境（development/production/test）

### 数据库配置
- `database.host` - 数据库主机地址
- `database.port` - 数据库端口
- `database.name` - 数据库名称
- `database.user` - 数据库用户名
- `database.password` - 数据库密码（敏感配置）
- `database.maxConnections` - 最大连接数（支持热更新）

### 认证配置
- `auth.jwtSecret` - JWT密钥（敏感配置）
- `auth.jwtExpiration` - JWT过期时间
- `auth.sessionTimeout` - 会话超时时间

### 测试引擎配置
- `testEngine.maxConcurrentTests` - 最大并发测试数
- `testEngine.defaultTimeout` - 默认测试超时时间
- `testEngine.enableHistory` - 是否启用测试历史

### 安全配置
- `security.corsOrigins` - CORS允许的源
- `security.rateLimitWindow` - 速率限制窗口
- `security.rateLimitMax` - 速率限制最大请求数

### 监控配置
- `monitoring.enabled` - 是否启用监控
- `monitoring.interval` - 监控间隔
- `monitoring.retentionDays` - 监控数据保留天数

## 🌐 API接口

### 获取所有配置
```http
GET /api/config
```

### 获取单个配置
```http
GET /api/config/:key
```

### 更新配置
```http
PUT /api/config/:key
Content-Type: application/json

{
  "value": "new_value"
}
```

### 批量更新配置
```http
PUT /api/config
Content-Type: application/json

{
  "configs": {
    "testEngine.maxConcurrentTests": 10,
    "monitoring.interval": 60000
  }
}
```

### 获取配置历史
```http
GET /api/config/meta/history?key=testEngine.maxConcurrentTests&limit=20
```

### 回滚配置
```http
POST /api/config/meta/rollback
Content-Type: application/json

{
  "changeId": "1692123456789_abc123"
}
```

### 重置配置
```http
POST /api/config/meta/reset
Content-Type: application/json

{
  "key": "testEngine.maxConcurrentTests"
}
```

### 导出配置
```http
GET /api/config/meta/export?format=json&includeSensitive=false
```

### 导入配置
```http
POST /api/config/meta/import
Content-Type: application/json

{
  "configs": {
    "testEngine.maxConcurrentTests": 8
  },
  "overwrite": true
}
```

## 🔥 热更新功能

配置中心支持热更新，无需重启应用即可生效的配置：

### 支持热更新的配置
- 数据库最大连接数
- JWT过期时间
- 测试引擎参数
- 监控配置
- 安全策略
- 日志级别

### 不支持热更新的配置
- 服务器端口
- 数据库连接信息
- 服务器主机地址

### 热更新示例

```javascript
// 监听配置变更
configCenter.watch('testEngine.maxConcurrentTests', (newValue) => {
  // 更新测试引擎的最大并发数
  testEngineManager.updateMaxConcurrentTests(newValue);
});

// 通过API更新配置
fetch('/api/config/testEngine.maxConcurrentTests', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ value: 15 })
});
```

## 📊 配置验证

配置中心提供强大的配置验证功能：

### 类型验证
- `string` - 字符串类型
- `number` - 数字类型
- `boolean` - 布尔类型
- `array` - 数组类型
- `object` - 对象类型

### 范围验证
```javascript
{
  type: 'number',
  min: 1,
  max: 100,
  required: true
}
```

### 枚举验证
```javascript
{
  type: 'string',
  enum: ['development', 'production', 'test'],
  required: true
}
```

### 验证示例
```javascript
// 验证单个配置
try {
  configCenter.set('server.port', 8080);
} catch (error) {
  console.error('配置验证失败:', error.message);
}

// 批量验证
const validationResult = await fetch('/api/config/meta/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    configs: {
      'server.port': 8080,
      'testEngine.maxConcurrentTests': 15
    }
  })
});
```

## 📈 配置历史和回滚

### 查看配置历史
```javascript
// 获取所有配置的历史
const allHistory = configCenter.getHistory();

// 获取特定配置的历史
const portHistory = configCenter.getHistory('server.port', 10);
```

### 回滚配置
```javascript
// 回滚到指定的变更
const rollbackInfo = configCenter.rollback('1692123456789_abc123');
console.log(`已回滚 ${rollbackInfo.key} 从 ${rollbackInfo.rollbackFrom} 到 ${rollbackInfo.value}`);
```

## 🔒 安全考虑

### 敏感配置保护
- 敏感配置（如密码、密钥）在API响应中显示为 `***`
- 敏感配置的历史记录也会被保护
- 导出配置时可选择是否包含敏感信息

### 访问控制
建议在生产环境中为配置管理API添加适当的访问控制：

```javascript
// 示例：添加管理员权限检查
router.use('/api/config', (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
});
```

## 🚀 部署配置

### 开发环境
```bash
# 使用默认配置
npm run dev
```

### 生产环境
```bash
# 设置环境变量
export NODE_ENV=production
export PORT=3001
export DB_HOST=prod-db-host
export DB_PASSWORD=secure-password
export JWT_SECRET=secure-jwt-secret

# 启动应用
npm start
```

### Docker部署
```dockerfile
# Dockerfile
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_HOST=db
ENV DB_PASSWORD=secure-password
```

## 🔧 故障排除

### 常见问题

1. **配置验证失败**
   - 检查配置值的类型和范围
   - 查看详细的错误信息

2. **热更新不生效**
   - 确认配置项支持热更新
   - 检查是否有监听器处理配置变更

3. **环境变量未加载**
   - 确认环境变量名称映射正确
   - 检查 `.env` 文件是否存在

4. **配置文件格式错误**
   - 确认 `runtime-config.json` 格式正确
   - 检查JSON语法

### 调试模式
```javascript
// 启用调试日志
configCenter.set('logging.level', 'debug');

// 查看配置状态
console.log(configCenter.getStatus());

// 查看所有配置
console.log(configCenter.getAll());
```

## 📚 最佳实践

1. **配置分层**：环境变量 > 运行时配置文件 > 默认值
2. **敏感信息**：使用环境变量存储敏感配置
3. **热更新**：只对业务逻辑配置使用热更新
4. **验证**：为所有配置定义严格的验证规则
5. **监控**：监听重要配置的变更
6. **备份**：定期备份配置和历史记录
7. **文档**：为每个配置项添加清晰的描述

## 🔄 迁移指南

从硬编码配置迁移到配置中心：

1. **运行迁移脚本**
   ```bash
   node scripts/migrateToConfigCenter.js
   ```

2. **验证迁移结果**
   - 检查备份文件
   - 测试应用功能
   - 验证配置热更新

3. **更新部署脚本**
   - 添加环境变量配置
   - 更新Docker配置
   - 修改CI/CD流程

4. **团队培训**
   - 配置管理API使用
   - 热更新机制
   - 故障排除方法
