# 后端监控与日志说明

## 目标

- 统一日志输出格式，便于定位问题与追踪请求。
- 提供监控指标与监控站点管理接口，支持告警扩展。

## 关键组件

### 1. 请求日志中间件

位置：`backend/middleware/logger.ts`

- 记录请求基本信息（method、url、statusCode、duration 等）。
- 慢请求记录到 `logs/performance.log`（超过 1s）。
- 安全日志记录到 `logs/security.log`。
- 综合日志记录到 `logs/combined.log`。

### 2. 统一 Logger

位置：`backend/utils/logger.ts`

- 提供 `info/warn/error/debug/perf/security/user/api/system` 等标准化接口。
- 所有新模块日志建议统一使用该 Logger。

### 3. 错误监控与告警

位置：`backend/utils/ErrorMonitoringSystem.ts`

- 支持告警规则引擎与多通道通知（邮件/Slack/Webhook/DingTalk）。
- 通过 `errorMonitoringSystem` 记录错误与触发告警。

### 4. 错误日志聚合器

位置：`backend/utils/ErrorLogAggregator.ts`

- 支持控制台/文件/远程日志输出。
- 可配置日志级别与输出方式。

## 监控与系统接口

### 系统指标

- `GET /api/system/metrics`
  - 返回系统运行指标、资源占用等

### 监控站点

- `GET /api/system/monitoring/sites`
- `POST /api/system/monitoring/sites`
- `GET /api/system/monitoring/sites/:siteId`
- `PUT /api/system/monitoring/sites/:siteId`
- `DELETE /api/system/monitoring/sites/:siteId`
- `POST /api/system/monitoring/sites/:siteId/check`

> 具体字段请参考 `backend/routes/system/monitoring.ts`。

## 配置项

配置中心位置：`backend/config/ConfigCenter.ts`

- `monitoring.enabled` 是否启用监控
- `monitoring.interval` 监控间隔（毫秒）
- `monitoring.retentionDays` 监控数据保留天数
- `logging.level` 日志级别（error/warn/info/debug）
- `logging.enableConsole` 是否启用控制台日志
- `logging.enableFile` 是否启用文件日志

环境变量：

- `MONITORING_ENABLED`
- `MONITORING_INTERVAL`
- `MONITORING_RETENTION_DAYS`
- `LOG_LEVEL`
- `LOG_ENABLE_CONSOLE`
- `LOG_ENABLE_FILE`

## 日志目录

默认目录：`backend/logs/`

- `combined.log`：综合请求日志
- `performance.log`：慢请求日志
- `security.log`：安全事件日志

## 使用建议

1. 新增业务逻辑时：使用 `Logger` 输出结构化日志。
2. 线上追踪：优先使用 `requestId` 与 `userId` 关联日志。
3. 定期检查 `performance.log`，定位慢请求接口。
