# Test-Web API 文档

> 权威文档：运行后访问 `http://localhost:3001/api/docs`（Swagger UI）。
>
> 说明：Swagger 目前仅覆盖部分模块（测试/对比/系统/数据导入导出等）。本文件保留全量端点清单，以实际路由为准。

## 概述

- **Base URL**: `http://localhost:3001/api`
- **认证**: Bearer Token（多数接口需登录）
- **响应**: 使用 `res.success / res.created / res.error`

## 认证与用户

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/verify-email`
- `POST /auth/resend-verification`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

#### POST /auth/verify-email

邮箱验证。

**限流**

- 默认：15 分钟内最多 10 次
- 环境变量：`EMAIL_VERIFICATION_WINDOW_MS`、`EMAIL_VERIFICATION_MAX_ATTEMPTS`

**请求参数**

```json
{
  "token": "string (required)"
}
```

**成功响应**

```json
{
  "success": true,
  "data": {
    "verified": true
  },
  "message": "邮箱验证成功"
}
```

**失败示例**

```json
{
  "success": false,
  "message": "验证令牌已过期"
}
```

#### POST /auth/resend-verification

重发邮箱验证邮件。

**限流**

- 默认：1 小时内最多 5 次
- 环境变量：`RESEND_VERIFICATION_WINDOW_MS`、`RESEND_VERIFICATION_MAX_ATTEMPTS`

**请求参数**

```json
{
  "email": "string (required)"
}
```

**成功响应**

```json
{
  "success": true,
  "data": {
    "sent": true
  },
  "message": "验证邮件已发送"
}
```

**失败示例**

```json
{
  "success": false,
  "message": "邮箱已验证，无需重复发送"
}
```

### MFA

- `POST /auth/mfa/setup`
- `POST /auth/mfa/verify-setup`
- `GET /auth/mfa/status`
- `POST /auth/mfa/disable`
- `POST /auth/mfa/regenerate-backup-codes`
- `POST /auth/mfa/verify`
- `POST /auth/mfa/verify-backup`

### OAuth

- `GET /oauth/providers`
- `GET /oauth/:provider/url`
- `POST /oauth/:provider/callback`

### Users

- `GET /users/profile`
- `PUT /users/profile`
- `POST /users/change-password`
- `GET /users/stats`

## 工作空间与资源

### Workspaces

- `GET /workspaces`
- `POST /workspaces`
- `GET /workspaces/:workspaceId`
- `PUT /workspaces/:workspaceId`
- `DELETE /workspaces/:workspaceId`
- `POST /workspaces/:workspaceId/invitations`
- `PUT /workspaces/:workspaceId/members/:memberId`
- `DELETE /workspaces/:workspaceId/members/:memberId`

### Collections

- `GET /collections`
- `POST /collections`
- `POST /collections/import`
- `GET /collections/:collectionId`
- `DELETE /collections/:collectionId`
- `POST /collections/:collectionId/folders`
- `POST /collections/:collectionId/requests`
- `POST /collections/:collectionId/default-environment`
- `GET /collections/:collectionId/export`

### Environments

- `GET /environments/global/variables`
- `GET /environments`
- `POST /environments`
- `GET /environments/:environmentId`
- `DELETE /environments/:environmentId`
- `POST /environments/import`
- `GET /environments/:environmentId/export`
- `POST /environments/:environmentId/activate`
- `POST /environments/:environmentId/variables`

## 测试与运行

### Tests

- `POST /test/create-and-start`
- `GET /test/:testId/status`
- `GET /test/:testId/result`
- `GET /test/:testId/logs`
- `GET /test/:testId/progress`
- `GET /test/queue/stats`
- `GET /test/queue/dead`
- `GET /test/queue/trace/:traceId`
- `GET /test/queue/trace/:traceId/logs`
- `GET /test/queue/:queueName/jobs/:jobId`
- `POST /test/queue/dead/:jobId/replay`
- `POST /test/:testId/stop`
- `DELETE /test/:testId`
- `POST /test/:testId/cancel`
- `PUT /test/:testId`
- `GET /test`
- `POST /test/:testId/rerun`
- `POST /test/batch`
- `GET /test/batch/:batchId`
- `DELETE /test/batch/:batchId`
- `GET /test/:testId/export`
- `GET /test/history`
- `GET /test/history/:testId`
- `GET /test/templates`
- `POST /test/templates`
- `PUT /test/templates/:templateId`
- `POST /test/templates/:templateId/preview`
- `DELETE /test/templates/:templateId`

### Runs

- `GET /runs/workspaces/:workspaceId`
- `POST /runs/collections/:collectionId`
- `GET /runs/:runId`
- `GET /runs/:runId/results`
- `GET /runs/:runId/export`
- `GET /runs/:runId/report`
- `POST /runs/:runId/cancel`
- `POST /runs/:runId/rerun`

### Schedules

- `GET /schedules`
- `GET /schedules/tasks`
- `GET /schedules/executions/history`
- `GET /schedules/statistics/summary`
- `POST /schedules/validate-cron`
- `GET /schedules/:scheduleId`
- `POST /schedules`
- `PUT /schedules/:scheduleId`
- `DELETE /schedules/:scheduleId`
- `POST /schedules/:scheduleId/start`
- `POST /schedules/:scheduleId/pause`
- `POST /schedules/:scheduleId/execute`
- `POST /schedules/executions/:executionId/cancel`

## 对比与分析

### Comparison

- `POST /comparison/compare`
- `GET /comparison/history/benchmark`
- `GET /comparison/history`
- `POST /comparison/trend`
- `GET /comparison/history/:testId`
- `POST /comparison/benchmark`
- `GET /comparison/benchmarks`
- `POST /comparison/summary`
- `GET /comparison/metrics`
- `POST /comparison/export`

### Analytics

- `GET /analytics/summary`
- `GET /analytics/performance-trends`
- `GET /analytics/recommendations`
- `GET /analytics/recommendations/:testId`
- `POST /analytics/export`
- `GET /analytics/realtime`

## 数据管理

### Data

- `GET /data/overview`
- `GET /data/export/templates`
- `POST /data/export/templates`
- `PUT /data/export/templates/:templateId`
- `DELETE /data/export/templates/:templateId`
- `POST /data/export/templates/:templateId/apply`
- `GET /data/export/:jobId/progress` (SSE)
- `GET /data/export/status/:jobId`
- `GET /data/export/download/:jobId`
- `DELETE /data/export/:jobId`
- `GET /data/export/history`
- `GET /data/export/formats`
- `DELETE /data/export/cleanup`
- `GET /data/statistics`
- `POST /data`
- `GET /data`
- `GET /data/:id`
- `PUT /data/:id`
- `DELETE /data/:id`
- `POST /data/batch`
- `POST /data/search`
- `POST /data/export`
- `POST /data/import`
- `GET /data/import/:jobId/status`
- `DELETE /data/import/:jobId`
- `GET /data/import/history`
- `GET /data/import/template/:type`
- `POST /data/import/validate`
- `GET /data/import/formats`
- `GET /data/import/types`
- `GET /data/import/stats`
- `POST /data/import/:jobId/retry`
- `POST /data/backup`
- `POST /data/restore`
- `GET /data/:id/versions`
- `POST /data/validate`

#### 导入/导出任务返回结构

- 创建导入/导出任务返回：
  - `{ jobId, status, createdAt }`
- 获取任务状态返回：
  - `{ jobId, userId, status, createdAt, startedAt, completedAt, error, progress, result }`
- 历史记录返回：
  - `{ items: [], pagination: { page, limit, total, totalPages } }`

> 注：`/data/cache` 与 `/data/health`
> 相关路由当前未挂载到主路由，需手动挂载后再对外开放。

## 存储

> 使用规范：
>
> - `/storage/*`
>   用于**系统级存储管理**（上传、归档、配额、清理等运维/数据管理场景）。
> - `/files/*` 用于**业务文件访问**（按文件 ID 查询、下载、删除、统计）。
> - 业务侧需要“上传 + 关联业务对象”时，优先走 `/storage/upload`
>   并在上传参数中携带关联信息，随后通过 `/files/:fileId` 获取元信息。
> - 上传可选参数：`ownerType`（业务类型）、`ownerId`（业务对象ID）、`expiresAt`（过期时间，ISO 字符串）。
> - 上传配置：`UPLOAD_MAX_SIZE`（最大字节数）、`UPLOAD_ALLOWED_TYPES`（允许扩展名或 MIME，逗号分隔）。

### Storage

- `GET /storage/status`
- `GET /storage/files`
- `GET /storage/files/:fileId`
- `POST /storage/upload`
- `GET /storage/download/:fileId`
- `DELETE /storage/files/:fileId`
- `POST /storage/archive`
- `GET /storage/archives`
- `POST /storage/archives/:archiveId/restore`
- `DELETE /storage/archives/:archiveId`
- `POST /storage/cleanup`
- `GET /storage/quotas`
- `POST /storage/move`
- `POST /storage/copy`

### Files

已统一为 Storage 接口（/storage），请使用上方 Storage 相关端点。

## 系统与运维

### System Core

- `GET /system/health`
- `GET /system/stats`
- `GET /system/info`
- `POST /system/restart`
- `GET /system/logs`
- `POST /system/config`
- `GET /system/config`
- `GET /system/metrics`
- `POST /system/maintenance`
- `POST /system/backup`
- `GET /system/backup/list`
- `DELETE /system/backup/:id`

### System Alerts

- `GET /system/alerts`
- `GET /system/alerts/:id`
- `POST /system/alerts/:id/acknowledge`
- `POST /system/alerts/:id/resolve`
- `POST /system/alerts/batch`
- `GET /system/alerts/rules`
- `POST /system/alerts/rules`
- `PUT /system/alerts/rules/:id`
- `DELETE /system/alerts/rules/:id`
- `GET /system/alerts/statistics`

### System Analytics

- `POST /system/analytics/trend`
- `POST /system/analytics/compare`
- `POST /system/analytics/performance`
- `GET /system/analytics/metrics`
- `POST /system/analytics/forecast`
- `POST /system/analytics/anomaly`
- `GET /system/analytics/reports`
- `POST /system/analytics/reports`
- `GET /system/analytics/reports/:id`
- `POST /system/analytics/reports/:id/export`
- `GET /system/analytics/insights`
- `POST /system/analytics/dashboard`
- `GET /system/analytics/health`

### System Monitoring

- `GET /system/monitoring/sites`
- `POST /system/monitoring/sites`
- `GET /system/monitoring/sites/:id`
- `PUT /system/monitoring/sites/:id`
- `DELETE /system/monitoring/sites/:id`
- `POST /system/monitoring/sites/:id/check`
- `POST /system/monitoring/sites/:id/pause`
- `POST /system/monitoring/sites/:id/resume`
- `GET /system/monitoring/alerts`
- `GET /system/monitoring/statistics`
- `GET /system/monitoring/health`

### System Reports

- `GET /system/reports`
- `PUT /system/reports/templates/:templateId`
- `GET /system/reports/templates/:templateId/versions`
- `POST /system/reports/templates/:templateId/preview`
- `DELETE /system/reports/share-emails/:id`
- `GET /system/reports/share-emails`
- `POST /system/reports/share-emails/:id/retry`
- `GET /system/reports/instances`
- `POST /system/reports/:id/share`
- `GET /system/reports/share/:token`
- `GET /system/reports/share/:token/download`
- `GET /system/reports/access-logs`
- `GET /system/reports/:id`
- `POST /system/reports`
- `GET /system/reports/:id/download`
- `DELETE /system/reports/:id`
- `GET /system/reports/templates`
- `POST /system/reports/templates`
- `GET /system/reports/statistics`
- `POST /system/reports/:id/schedule`
- `GET /system/reports/export`

### System Config

- `GET /system/config`
- `GET /system/config/:key`
- `PUT /system/config/:key`
- `PUT /system/config`
- `GET /system/config/meta/schema`
- `GET /system/config/meta/history`
- `POST /system/config/meta/rollback`
- `POST /system/config/meta/reset`
- `GET /system/config/meta/status`
- `POST /system/config/meta/validate`
- `GET /system/config/meta/export`
- `POST /system/config/meta/import`

## 管理后台

### Admin

- `GET /admin/stats`
- `GET /admin/monitor`
- `GET /admin/test-history`
- `GET /admin/users`
- `POST /admin/users`
- `PUT /admin/users/:userId`
- `DELETE /admin/users/:userId`
- `POST /admin/users/bulk`
- `GET /admin/tests`
- `POST /admin/tests/:testId/cancel`
- `GET /admin/logs`
- `GET /admin/config`
- `PUT /admin/config`
- `GET /admin/backups`
- `POST /admin/backups`
- `DELETE /admin/backups/:backupId`
- `POST /admin/backups/:backupId/restore`
- `GET /admin/permissions/groups`
- `GET /admin/health`

## Misc

### Batch

- `POST /batch/test`
- `POST /batch/export`
- `POST /batch/delete`
- `GET /batch/:operationId/status`
- `DELETE /batch/:operationId`
- `GET /batch`
- `DELETE /batch/cleanup`
- `GET /batch/statistics`

### Core Engine

- `GET /core/status`
- `POST /core/run`
- `GET /core/test/:testId`
- `DELETE /core/test/:testId`
- `GET /core/tests`
- `POST /core/benchmark`
- `GET /core/benchmarks`
- `POST /core/validate`
- `GET /core/metrics`
- `POST /core/reset`
- `GET /core/health`

### Integrations

- `GET /integrations`
- `POST /integrations`
- `PUT /integrations/:id`
- `DELETE /integrations/:id`
- `POST /integrations/:id/test`
- `POST /integrations/:id/trigger`
- `GET /integrations/:id/logs`
- `GET /integrations/types`
- `GET /integrations/:id`
- `POST /integrations/:id/enable`
- `POST /integrations/:id/disable`
