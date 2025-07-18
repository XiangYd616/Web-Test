# Redis缓存集成文档

## 概述

Test-Web项目已完整集成Redis缓存功能，提供高性能的数据缓存、会话管理和API结果缓存。

## 功能特性

### 🚀 核心功能
- **智能缓存**: 自动缓存API测试结果、数据库查询和用户会话
- **降级机制**: Redis不可用时自动降级到内存缓存
- **监控统计**: 实时监控缓存性能和健康状态
- **防护机制**: 缓存穿透、缓存雪崩防护

### 📊 缓存类型
- **API测试结果**: 性能测试、安全测试、SEO测试结果
- **数据库查询**: 频繁查询的数据缓存
- **用户会话**: 登录状态和用户信息
- **系统配置**: 应用配置和设置

## 环境配置

### Redis服务器配置
```bash
# Redis基础配置
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 连接池配置
REDIS_MAX_CONNECTIONS=10
REDIS_MIN_CONNECTIONS=2
REDIS_CONNECTION_TIMEOUT=5000
REDIS_COMMAND_TIMEOUT=3000
REDIS_IDLE_TIMEOUT=30000

# 重试机制
REDIS_RETRY_ATTEMPTS=3
REDIS_RETRY_DELAY=1000
REDIS_MAX_RETRY_DELAY=5000

# 缓存策略
REDIS_DEFAULT_TTL=3600
REDIS_SESSION_TTL=86400
REDIS_API_CACHE_TTL=1800
REDIS_DB_CACHE_TTL=600

# 功能开关
REDIS_CACHE_API_RESULTS=true
REDIS_CACHE_USER_SESSIONS=true
REDIS_CACHE_DB_QUERIES=true
REDIS_ENABLE_MONITORING=true
```

### 集群配置（可选）
```bash
# 集群模式
REDIS_CLUSTER_ENABLED=false
REDIS_CLUSTER_NODES=localhost:7000,localhost:7001,localhost:7002
```

## 使用方法

### API路由缓存
```javascript
// 性能测试缓存（30分钟）
router.post('/performance', 
  cacheMiddleware.apiCache('performance', { ttl: 1800 }),
  asyncHandler(async (req, res) => {
    // 测试逻辑
  })
);

// 安全测试缓存（40分钟）
router.post('/security', 
  cacheMiddleware.apiCache('security', { ttl: 2400 }),
  asyncHandler(async (req, res) => {
    // 测试逻辑
  })
);
```

### 数据库查询缓存
```javascript
// 历史记录缓存（5分钟）
router.get('/history', 
  cacheMiddleware.dbCache({ ttl: 300 }),
  asyncHandler(async (req, res) => {
    // 查询逻辑
  })
);
```

### 手动缓存操作
```javascript
const cacheService = require('./services/redis/cache');

// 设置缓存
await cacheService.set('key', data, { ttl: 3600, type: 'api' });

// 获取缓存
const data = await cacheService.get('key');

// 删除缓存
await cacheService.delete('key');

// 检查存在
const exists = await cacheService.exists('key');
```

## 监控和管理

### 健康检查
```bash
# 检查应用健康状态（包含Redis状态）
curl http://localhost:3001/health

# 获取缓存统计
curl http://localhost:3001/cache/stats
```

### NPM脚本
```bash
# 检查Redis连接
npm run redis:check

# 查看缓存统计
npm run cache:stats

# 清空缓存
npm run cache:flush

# 实时监控
npm run redis:monitor
```

### 监控指标
- **响应时间**: Redis命令执行延迟
- **内存使用**: Redis内存占用情况
- **命中率**: 缓存命中率统计
- **错误率**: 缓存操作错误率
- **连接数**: 当前连接数量
- **键数量**: 缓存键总数

## 缓存策略

### TTL配置
- **API测试结果**: 30-40分钟（根据测试类型）
- **数据库查询**: 5-10分钟
- **用户会话**: 24小时
- **系统配置**: 1小时

### 键命名规范
```
testweb:dev:namespace:key
testweb:prod:namespace:key
```

示例：
- `testweb:dev:api:perf_example.com_hash`
- `testweb:dev:session:user_123`
- `testweb:dev:db:history_user_123_page_1`

### 防护机制

#### 缓存穿透防护
- 空值缓存（短TTL）
- 布隆过滤器（可选）

#### 缓存雪崩防护
- TTL随机抖动
- 熔断机制

#### 缓存击穿防护
- 分布式锁
- 热点数据预热

## 降级机制

当Redis不可用时，系统自动降级：

1. **内存缓存**: 使用Map作为临时缓存
2. **直接查询**: 绕过缓存直接查询数据库
3. **功能降级**: 部分非关键功能暂时禁用

### 降级配置
- 最大内存缓存: 1000项
- 默认TTL: 5分钟
- 自动清理: 每5分钟清理过期项

## 性能优化

### 连接池优化
- 最大连接数: 10
- 最小连接数: 2
- 连接超时: 5秒
- 命令超时: 3秒

### 序列化优化
- JSON序列化/反序列化
- 自动类型检测
- 压缩支持（可选）

### 批量操作
- `mget`: 批量获取
- `mset`: 批量设置
- Pipeline: 管道操作

## 故障排除

### 常见问题

#### Redis连接失败
```bash
# 检查Redis服务状态
redis-cli ping

# 检查配置
npm run redis:check

# 查看日志
tail -f logs/redis.log
```

#### 缓存命中率低
1. 检查TTL设置是否合理
2. 确认缓存键生成逻辑
3. 查看缓存统计报告

#### 内存使用过高
1. 调整TTL减少缓存时间
2. 清理过期键
3. 优化数据结构

### 日志文件
- `logs/redis.log`: Redis连接日志
- `logs/cache.log`: 缓存操作日志
- `logs/cache-middleware.log`: 中间件日志
- `logs/cache-monitoring.log`: 监控日志
- `logs/fallback.log`: 降级处理日志

## 最佳实践

### 缓存设计
1. **合理设置TTL**: 根据数据更新频率设置
2. **键命名规范**: 使用统一的命名规范
3. **数据结构优化**: 选择合适的数据类型
4. **批量操作**: 减少网络往返

### 监控告警
1. **设置阈值**: 响应时间、内存使用、命中率
2. **定期检查**: 健康状态和性能指标
3. **日志监控**: 关注错误和异常

### 安全考虑
1. **访问控制**: 设置Redis密码
2. **网络安全**: 限制访问IP
3. **数据加密**: 敏感数据加密存储

## 扩展功能

### 集群支持
- Redis Cluster模式
- 主从复制
- 哨兵模式

### 高级特性
- Lua脚本支持
- 发布/订阅
- 地理位置功能
- 流处理

## 版本兼容性

- **Redis**: 5.0+
- **Node.js**: 18.0+
- **ioredis**: 5.4+

## 更新日志

### v1.0.0 (2025-01-18)
- ✅ 完整Redis集成
- ✅ 缓存中间件
- ✅ 监控系统
- ✅ 降级机制
- ✅ 管理脚本
- ✅ 文档完善
