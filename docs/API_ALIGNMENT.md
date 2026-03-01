# 前后端接口对齐清单

**最后更新**: 2026-02-01  
**文档版本**: v1.0

## 1. 对齐范围与约定

- 对齐范围：前端 `frontend/services/*` 与后端 `backend/modules/**/routes`。
- API Base URL：`/api`。
- 认证方式：请求头 `Authorization: Bearer <token>`，Token 来源于 localStorage（`accessToken`/`token`/`authToken`）。
- `workspaceId`：部分接口通过 query/body 传递，用于权限控制。

## 2. 对齐矩阵（前端已使用）

> 表中的路径为 **相对 `/api`** 的前端调用路径。

### 2.1 认证 / OAuth / MFA

| 前端调用 | 方法 | 后端路由 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| `/auth/login` | POST | `/api/auth/login` | ✅ | 登录 |
| `/auth/me` | GET | `/api/auth/me` | ✅ | 当前用户 |
| `/auth/logout` | POST | `/api/auth/logout` | ✅ | 退出登录 |
| `/oauth/providers` | GET | `/api/oauth/providers` | ✅ | OAuth 提供商 |
| `/oauth/:provider/url` | GET | `/api/oauth/:provider/url` | ✅ | 可携带 `redirectUri` |
| `/oauth/:provider/callback` | POST | `/api/oauth/:provider/callback` | ✅ | OAuth 回调 |
| `/auth/mfa/status` | GET | `/api/auth/mfa/status` | ✅ | MFA 状态 |
| `/auth/mfa/setup` | POST | `/api/auth/mfa/setup` | ✅ | MFA 绑定 |
| `/auth/mfa/verify-setup` | POST | `/api/auth/mfa/verify-setup` | ✅ | MFA 验证 |
| `/auth/mfa/disable` | POST | `/api/auth/mfa/disable` | ✅ | 关闭 MFA |
| `/auth/mfa/regenerate-backup-codes` | POST | `/api/auth/mfa/regenerate-backup-codes` | ✅ | 备份码 |

### 2.2 用户

| 前端调用 | 方法 | 后端路由 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| `/users/profile` | GET | `/api/users/profile` | ✅ | 用户信息 |
| `/users/profile` | PUT | `/api/users/profile` | ✅ | 更新资料 |
| `/users/change-password` | POST | `/api/users/change-password` | ✅ | 修改密码 |
| `/users/avatar` | POST | `/api/users/avatar` | ✅ | 上传头像 |
| `/users/avatar/:fileId` | GET | `/api/users/avatar/:fileId` | ✅ | 获取头像 |
| `/users/account` | DELETE | `/api/users/account` | ✅ | 删除账户 |

### 2.3 工作空间

| 前端调用 | 方法 | 后端路由 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| `/workspaces` | GET | `/api/workspaces` | ✅ | 支持分页 |
| `/workspaces` | POST | `/api/workspaces` | ✅ | 创建工作空间 |
| `/workspaces/:workspaceId` | PUT | `/api/workspaces/:workspaceId` | ✅ | 更新工作空间 |
| `/workspaces/:workspaceId` | DELETE | `/api/workspaces/:workspaceId` | ✅ | 删除工作空间 |

### 2.4 测试与模板

| 前端调用 | 方法 | 后端路由 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| `/test/create-and-start` | POST | `/api/test/create-and-start` | ✅ | 统一入口 |
| `/test/:testId/status` | GET | `/api/test/:testId/status` | ✅ | 可带 `workspaceId` |
| `/test/:testId/progress` | GET | `/api/test/:testId/progress` | ✅ | 可带 `workspaceId` |
| `/test/:testId/result` | GET | `/api/test/:testId/result` | ✅ | 可带 `workspaceId` |
| `/test/:testId/logs` | GET | `/api/test/:testId/logs` | ✅ | 支持分页、level |
| `/test/:testId/cancel` | POST | `/api/test/:testId/cancel` | ✅ | 取消测试 |
| `/test/:testId/stop` | POST | `/api/test/:testId/stop` | ✅ | 停止测试 |
| `/test/:testId/rerun` | POST | `/api/test/:testId/rerun` | ✅ | 重新运行 |
| `/test/:testId` | PUT | `/api/test/:testId` | ✅ | 更新测试 |
| `/test/:testId` | DELETE | `/api/test/:testId` | ✅ | 删除测试 |
| `/test/:testId/export` | GET | `/api/test/:testId/export` | ✅ | 导出结果 |
| `/test/history` | GET | `/api/test/history` | ✅ | 支持关键字/分页 |
| `/test/history/:testId` | GET | `/api/test/history/:testId` | ✅ | 历史详情 |
| `/test/templates` | GET | `/api/test/templates` | ✅ | 模板列表 |
| `/test/templates` | POST | `/api/test/templates` | ✅ | 创建模板 |
| `/test/templates/:templateId` | PUT | `/api/test/templates/:templateId` | ✅ | 更新模板 |
| `/test/templates/:templateId` | DELETE | `/api/test/templates/:templateId` | ✅ | 删除模板 |
| `/test/templates/:templateId/preview` | POST | `/api/test/templates/:templateId/preview` | ✅ | 预览模板 |

### 2.5 测试队列

| 前端调用 | 方法 | 后端路由 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| `/test/queue/stats` | GET | `/api/test/queue/stats` | ✅ | 支持时间范围 |
| `/test/queue/dead` | GET | `/api/test/queue/dead` | ✅ | 管理员可见 |
| `/test/queue/:queueName/jobs/:jobId` | GET | `/api/test/queue/:queueName/jobs/:jobId` | ✅ | 获取任务 |
| `/test/queue/dead/:jobId/replay` | POST | `/api/test/queue/dead/:jobId/replay` | ✅ | 重放任务 |

### 2.6 系统 / 分析 / 管理

| 前端调用 | 方法 | 后端路由 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| `/system/monitoring/health` | GET | `/api/system/monitoring/health` | ✅ | 健康检查 |
| `/system/health` | GET | `/api/system/health` | ✅ | 系统健康 |
| `/system/stats` | GET | `/api/system/stats` | ✅ | 系统统计 |
| `/system/info` | GET | `/api/system/info` | ✅ | 系统信息 |
| `/system/metrics` | GET | `/api/system/metrics` | ✅ | 监控指标 |
| `/system/analytics/dashboard` | POST | `/api/system/analytics/dashboard` | ✅ | 仪表板数据 |
| `/admin/config` | GET | `/api/admin/config` | ✅ | 管理配置 |
| `/admin/config` | PUT | `/api/admin/config` | ✅ | 管理配置更新 |

## 3. 后端额外接口（前端未覆盖）

### 3.1 测试相关

- 测试队列 trace 相关：
  - `GET /api/test/queue/trace/:traceId`
  - `GET /api/test/queue/trace/:traceId/logs`
- 批量测试：
  - `POST /api/test/batch`
  - `GET /api/test/batch/:batchId`
  - `DELETE /api/test/batch/:batchId`
- 控制器内存在测试类型独立入口（`/api/test/website`、`/api/test/performance` 等），但 `routes.ts` 未注册，属于预留/待确认接口。

### 3.2 工作空间成员管理

- `GET /api/workspaces/:workspaceId`
- `POST /api/workspaces/:workspaceId/invitations`
- `PUT /api/workspaces/:workspaceId/members/:memberId`
- `DELETE /api/workspaces/:workspaceId/members/:memberId`

### 3.3 系统监控/分析/管理员

- `system/monitoring` 与 `system/analytics` 子路由中包含更完整的监控、报表与洞察接口。
- `admin` 模块包含用户/测试/日志/备份等管理接口（当前前端仅覆盖配置）。

## 4. 差异与建议

1. **测试类型独立入口**：控制器已实现但未注册路由，建议确认是否需要对外暴露。
2. **队列 trace/批量测试/工作空间成员**：后端已提供路由但前端未覆盖，若有需求可在前端补齐服务层。
3. **监控与管理员接口**：后端功能更丰富，若需要运维或后台能力，建议扩展前端 `systemApi`/`adminApi`。

## 5. 变更记录

- 2026-02-01：首次生成对齐清单。
