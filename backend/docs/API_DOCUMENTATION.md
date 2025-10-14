# Test-Web-Backend API 文档

**生成时间**: 2025/10/14 17:57:29  
**版本**: 1.0.0

---

## 📋 目录

1. [accessibility](#accessibility)
2. [admin](#admin)
3. [alerts](#alerts)
4. [analytics](#analytics)
5. [auth](#auth)
6. [automation](#automation)
7. [batch](#batch)
8. [clients](#clients)
9. [config](#config)
10. [content](#content)
11. [core](#core)
12. [data](#data)
13. [dataExport](#dataExport)
14. [dataImport](#dataImport)
15. [database](#database)
16. [databaseHealth](#databaseHealth)
17. [documentation](#documentation)
18. [environments](#environments)
19. [errorManagement](#errorManagement)
20. [errors](#errors)
21. [files](#files)
22. [infrastructure](#infrastructure)
23. [integrations](#integrations)
24. [mfa](#mfa)
25. [monitoring](#monitoring)
26. [network](#network)
27. [oauth](#oauth)
28. [performance](#performance)
29. [performanceTestRoutes](#performanceTestRoutes)
30. [regression](#regression)
31. [reports](#reports)
32. [scheduler](#scheduler)
33. [security](#security)
34. [seo](#seo)
35. [services](#services)
36. [storageManagement](#storageManagement)
37. [system](#system)
38. [test](#test)
39. [testHistory](#testHistory)
40. [testing](#testing)
41. [users](#users)
42. [ux](#ux)
43. [website](#website)

---

## accessibility

**路由文件**: `routes/accessibility.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/status` | 暂无描述 |
| POST | `/run` | 暂无描述 |
| GET | `/test/:testId` | 暂无描述 |
| DELETE | `/test/:testId` | 暂无描述 |

## admin

**路由文件**: `routes/admin.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/stats` | 暂无描述 |
| GET | `/users` | 暂无描述 |
| PUT | `/users/:userId/status` | 暂无描述 |
| GET | `/logs` | 暂无描述 |
| GET | `/test-history` | 暂无描述 |

## alerts

**路由文件**: `routes/alerts.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/` | 暂无描述 |
| GET | `/stats` | 暂无描述 |
| PUT | `/:id/acknowledge` | 暂无描述 |
| PUT | `/:id/resolve` | 暂无描述 |
| POST | `/batch` | 暂无描述 |
| GET | `/:id` | 暂无描述 |
| DELETE | `/:id` | 暂无描述 |
| POST | `/test-notification` | 暂无描述 |
| GET | `/rules` | 暂无描述 |
| PUT | `/rules` | 暂无描述 |
| GET | `/history/stats` | 暂无描述 |

## analytics

**路由文件**: `routes/analytics.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/trend` | 暂无描述 |
| POST | `/compare` | 暂无描述 |
| POST | `/performance` | 暂无描述 |
| POST | `/insights` | 暂无描述 |

## auth

**路由文件**: `routes/auth.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/register` | 用户注册 |
| POST | `/login` | 用户登录 |
| POST | `/verify` | 暂无描述 |
| GET | `/me` | 获取当前用户信息 |
| POST | `/refresh` | 刷新Token |
| POST | `/logout` | 用户登出 |
| PUT | `/change-password` | 暂无描述 |
| POST | `/forgot-password` | 忘记密码 |
| GET | `/validate-reset-token` | 暂无描述 |
| POST | `/reset-password` | 重置密码 |
| POST | `/send-verification` | 暂无描述 |
| POST | `/verify-email` | 验证邮箱 |

## automation

**路由文件**: `routes/automation.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/status` | 暂无描述 |
| POST | `/run` | 暂无描述 |
| GET | `/test/:testId` | 暂无描述 |
| DELETE | `/test/:testId` | 暂无描述 |

## batch

**路由文件**: `routes/batch.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/test` | 暂无描述 |
| POST | `/export` | 暂无描述 |
| POST | `/delete` | 暂无描述 |
| GET | `/status/:operationId` | 暂无描述 |
| POST | `/cancel/:operationId` | 暂无描述 |
| GET | `/results/:operationId` | 暂无描述 |
| GET | `/download/:operationId` | 暂无描述 |

## clients

**路由文件**: `routes/clients.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/status` | 暂无描述 |
| POST | `/run` | 暂无描述 |
| GET | `/test/:testId` | 暂无描述 |
| DELETE | `/test/:testId` | 暂无描述 |

## config

**路由文件**: `routes/config.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/` | 暂无描述 |
| GET | `/:key` | 暂无描述 |
| PUT | `/:key` | 暂无描述 |
| PUT | `/` | 暂无描述 |
| GET | `/meta/schema` | 暂无描述 |
| GET | `/meta/history` | 暂无描述 |
| POST | `/meta/rollback` | 暂无描述 |
| POST | `/meta/reset` | 暂无描述 |
| GET | `/meta/status` | 暂无描述 |
| POST | `/meta/validate` | 暂无描述 |
| GET | `/meta/export` | 暂无描述 |
| POST | `/meta/import` | 暂无描述 |

## content

**路由文件**: `routes/content.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/status` | 暂无描述 |
| POST | `/run` | 暂无描述 |
| GET | `/test/:testId` | 暂无描述 |
| DELETE | `/test/:testId` | 暂无描述 |

## core

**路由文件**: `routes/core.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/status` | 暂无描述 |
| POST | `/run` | 暂无描述 |
| GET | `/test/:testId` | 暂无描述 |
| DELETE | `/test/:testId` | 暂无描述 |

## data

**路由文件**: `routes/data.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/:type` | 暂无描述 |
| GET | `/:type/:id` | 暂无描述 |
| PUT | `/:type/:id` | 暂无描述 |
| DELETE | `/:type/:id` | 暂无描述 |
| GET | `/:type` | 暂无描述 |
| POST | `/batch` | 暂无描述 |
| POST | `/:type/export` | 暂无描述 |
| POST | `/:type/import` | 暂无描述 |
| GET | `/:type/statistics` | 暂无描述 |
| POST | `/backup` | 暂无描述 |
| GET | `/types` | 暂无描述 |
| GET | `/export-formats` | 暂无描述 |
| POST | `/:type/validate` | 暂无描述 |
| POST | `/query` | 暂无描述 |
| GET | `/analytics` | 暂无描述 |
| GET | `/test-history` | 暂无描述 |
| DELETE | `/test-history/batch` | 暂无描述 |

## dataExport

**路由文件**: `routes/dataExport.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/create` | 暂无描述 |
| GET | `/task/:taskId/status` | 暂无描述 |
| GET | `/tasks` | 暂无描述 |
| POST | `/task/:taskId/cancel` | 暂无描述 |
| GET | `/task/:taskId/download` | 暂无描述 |
| DELETE | `/task/:taskId` | 暂无描述 |
| POST | `/cleanup` | 暂无描述 |
| POST | `/test-history` | 暂无描述 |
| GET | `/config` | 暂无描述 |

## dataImport

**路由文件**: `routes/dataImport.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/upload` | 暂无描述 |
| GET | `/task/:taskId/status` | 暂无描述 |
| GET | `/task/:taskId/preview` | 暂无描述 |
| POST | `/task/:taskId/start` | 暂无描述 |
| GET | `/tasks` | 暂无描述 |
| POST | `/task/:taskId/cancel` | 暂无描述 |
| DELETE | `/task/:taskId` | 暂无描述 |
| GET | `/mapping-template/:dataType` | 暂无描述 |
| POST | `/validate` | 暂无描述 |
| GET | `/config` | 暂无描述 |

## database

**路由文件**: `routes/database.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/test` | 暂无描述 |
| POST | `/connection-test` | 暂无描述 |
| POST | `/query-performance` | 暂无描述 |
| POST | `/load-test` | 暂无描述 |
| GET | `/test-history` | 暂无描述 |
| POST | `/optimize-suggestions` | 暂无描述 |

## databaseHealth

**路由文件**: `routes/databaseHealth.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/health` | 暂无描述 |
| GET | `/status` | 暂无描述 |
| GET | `/metrics` | 暂无描述 |
| GET | `/stats` | 暂无描述 |
| POST | `/test-connection` | 暂无描述 |
| GET | `/slow-queries` | 暂无描述 |
| GET | `/pool` | 暂无描述 |
| POST | `/reconnect` | 暂无描述 |

## documentation

**路由文件**: `routes/documentation.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/status` | 暂无描述 |
| POST | `/run` | 暂无描述 |
| GET | `/test/:testId` | 暂无描述 |
| DELETE | `/test/:testId` | 暂无描述 |

## environments

**路由文件**: `routes/environments.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/` | 暂无描述 |
| POST | `/` | 暂无描述 |
| GET | `/:environmentId` | 暂无描述 |
| PUT | `/:environmentId` | 暂无描述 |
| DELETE | `/:environmentId` | 暂无描述 |
| POST | `/:environmentId/activate` | 暂无描述 |
| GET | `/active/current` | 暂无描述 |
| GET | `/:environmentId/variables` | 暂无描述 |
| POST | `/:environmentId/variables` | 暂无描述 |
| GET | `/:environmentId/variables/:key` | 暂无描述 |
| POST | `/:environmentId/variables/batch` | 暂无描述 |
| POST | `/:environmentId/variables/resolve` | 暂无描述 |
| GET | `/global/variables` | 暂无描述 |
| POST | `/global/variables` | 暂无描述 |
| POST | `/import` | 暂无描述 |
| GET | `/:environmentId/export` | 暂无描述 |
| GET | `/dynamic/variables` | 暂无描述 |
| GET | `/history/variables` | 暂无描述 |

## errorManagement

**路由文件**: `routes/errorManagement.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/stats` | 暂无描述 |
| GET | `/logs` | 暂无描述 |
| GET | `/alerts` | 暂无描述 |
| POST | `/test-alerts` | 暂无描述 |
| POST | `/send-alert` | 暂无描述 |
| GET | `/status` | 暂无描述 |
| POST | `/alert-rules` | 暂无描述 |
| GET | `/export` | 暂无描述 |
| POST | `/cleanup` | 暂无描述 |
| GET | `/trends` | 暂无描述 |

## errors

**路由文件**: `routes/errors.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/report` | 暂无描述 |
| GET | `/stats` | 暂无描述 |
| GET | `/:errorId` | 暂无描述 |
| GET | `/health` | 暂无描述 |

## files

**路由文件**: `routes/files.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/upload` | 暂无描述 |
| GET | `/` | 暂无描述 |
| GET | `/download/:id` | 暂无描述 |
| DELETE | `/:id` | 暂无描述 |
| PUT | `/:id/metadata` | 暂无描述 |

## infrastructure

**路由文件**: `routes/infrastructure.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/status` | 暂无描述 |
| POST | `/run` | 暂无描述 |
| GET | `/test/:testId` | 暂无描述 |
| DELETE | `/test/:testId` | 暂无描述 |

## integrations

**路由文件**: `routes/integrations.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/` | 暂无描述 |
| POST | `/` | 暂无描述 |
| GET | `/cicd/platforms` | 暂无描述 |
| POST | `/cicd` | 暂无描述 |
| POST | `/cicd/:integrationId/trigger` | 暂无描述 |
| GET | `/cicd` | 暂无描述 |
| POST | `/webhook/:platform` | 暂无描述 |
| GET | `/cicd/templates/:platform` | 暂无描述 |

## mfa

**路由文件**: `routes/mfa.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/setup` | 暂无描述 |
| POST | `/verify-setup` | 暂无描述 |
| POST | `/verify` | 暂无描述 |
| POST | `/verify-backup` | 暂无描述 |
| POST | `/disable` | 暂无描述 |
| GET | `/status` | 暂无描述 |
| POST | `/regenerate-backup-codes` | 暂无描述 |

## monitoring

**路由文件**: `routes/monitoring.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/sites` | 暂无描述 |
| POST | `/sites` | 暂无描述 |
| GET | `/sites/:id` | 暂无描述 |
| PUT | `/sites/:id` | 暂无描述 |
| DELETE | `/sites/:id` | 暂无描述 |
| POST | `/sites/:id/check` | 暂无描述 |
| GET | `/sites/:id/history` | 暂无描述 |
| GET | `/alerts` | 暂无描述 |
| PUT | `/alerts/:id/read` | 暂无描述 |
| POST | `/alerts/batch` | 暂无描述 |
| GET | `/stats` | 暂无描述 |
| GET | `/health` | 暂无描述 |
| GET | `/metrics` | 暂无描述 |
| GET | `/analytics` | 暂无描述 |
| GET | `/export` | 暂无描述 |
| POST | `/reports` | 暂无描述 |
| GET | `/reports` | 暂无描述 |
| GET | `/reports/:id/download` | 暂无描述 |

## network

**路由文件**: `routes/network.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/test` | 暂无描述 |
| POST | `/ping` | 暂无描述 |
| POST | `/traceroute` | 暂无描述 |
| POST | `/bandwidth` | 暂无描述 |
| POST | `/dns` | 暂无描述 |
| POST | `/port-scan` | 暂无描述 |
| POST | `/latency` | 暂无描述 |
| GET | `/test-history` | 暂无描述 |
| POST | `/diagnose` | 暂无描述 |

## oauth

**路由文件**: `routes/oauth.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/providers` | 暂无描述 |
| GET | `/:provider/authorize` | 暂无描述 |
| GET | `/:provider/callback` | 暂无描述 |
| GET | `/accounts` | 暂无描述 |
| POST | `/:provider/link` | 暂无描述 |
| DELETE | `/:provider/unlink` | 暂无描述 |
| GET | `/config/status` | 暂无描述 |

## performance

**路由文件**: `routes/performance.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/overview` | 暂无描述 |
| GET | `/database` | 暂无描述 |
| GET | `/cache` | 暂无描述 |
| GET | `/api` | 暂无描述 |
| GET | `/realtime` | 暂无描述 |
| POST | `/test` | 暂无描述 |
| DELETE | `/cleanup` | 暂无描述 |
| GET | `/health` | 暂无描述 |

## performanceTestRoutes

**路由文件**: `routes/performanceTestRoutes.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/` | 暂无描述 |
| GET | `/metrics` | 暂无描述 |
| GET | `/recommendations` | 暂无描述 |
| POST | `/batch` | 暂无描述 |

## regression

**路由文件**: `routes/regression.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/status` | 暂无描述 |
| POST | `/run` | 暂无描述 |
| GET | `/test/:testId` | 暂无描述 |
| DELETE | `/test/:testId` | 暂无描述 |

## reports

**路由文件**: `routes/reports.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/` | 获取报告列表 |
| POST | `/generate` | 生成报告 |
| GET | `/:id` | 暂无描述 |
| GET | `/:id/download` | 暂无描述 |
| DELETE | `/:id` | 暂无描述 |
| GET | `/scheduled` | 暂无描述 |
| POST | `/scheduled` | 暂无描述 |
| POST | `/scheduled/:reportId/execute` | 暂无描述 |
| GET | `/templates` | 暂无描述 |
| POST | `/performance/benchmarks` | 暂无描述 |
| POST | `/performance/benchmarks/:benchmarkId/run` | 暂无描述 |
| POST | `/performance/baselines` | 暂无描述 |
| POST | `/performance/report` | 暂无描述 |
| POST | `/enhanced/generate` | 暂无描述 |
| GET | `/enhanced/templates` | 暂无描述 |
| GET | `/enhanced/download/:filename` | 暂无描述 |
| POST | `/enhanced/batch` | 暂无描述 |

## scheduler

**路由文件**: `routes/scheduler.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/schedule` | 暂无描述 |
| GET | `/scheduled` | 暂无描述 |
| DELETE | `/scheduled/:testId` | 暂无描述 |
| POST | `/batch` | 暂无描述 |
| GET | `/metrics` | 暂无描述 |
| GET | `/health` | 暂无描述 |
| DELETE | `/cache` | 暂无描述 |
| GET | `/statistics` | 暂无描述 |
| POST | `/process` | 暂无描述 |

## security

**路由文件**: `routes/security.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/advanced-test` | 暂无描述 |
| POST | `/quick-check` | 暂无描述 |
| GET | `/test-history` | 暂无描述 |
| GET | `/test/:testId` | 暂无描述 |
| GET | `/statistics` | 暂无描述 |
| POST | `/export-report` | 暂无描述 |
| GET | `/recommendations` | 暂无描述 |

## seo

**路由文件**: `routes/seo.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/fetch-page` | 暂无描述 |
| POST | `/fetch-robots` | 暂无描述 |
| POST | `/fetch-sitemap` | 暂无描述 |
| POST | `/validate-structured-data` | 暂无描述 |
| POST | `/mobile-analysis` | 暂无描述 |
| POST | `/core-web-vitals` | 暂无描述 |
| POST | `/analyze` | 暂无描述 |
| GET | `/health` | 暂无描述 |

## services

**路由文件**: `routes/services.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/status` | 暂无描述 |
| POST | `/run` | 暂无描述 |
| GET | `/test/:testId` | 暂无描述 |
| DELETE | `/test/:testId` | 暂无描述 |

## storageManagement

**路由文件**: `routes/storageManagement.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/status` | 暂无描述 |
| GET | `/statistics` | 暂无描述 |
| POST | `/archive` | 暂无描述 |
| POST | `/cleanup` | 暂无描述 |
| POST | `/maintenance` | 暂无描述 |
| GET | `/configuration` | 暂无描述 |
| PUT | `/configuration` | 暂无描述 |
| GET | `/engines/:engineType/policy` | 暂无描述 |
| PUT | `/engines/:engineType/policy` | 暂无描述 |
| GET | `/usage` | 暂无描述 |

## system

**路由文件**: `routes/system.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/info` | 暂无描述 |
| GET | `/config` | 暂无描述 |
| PUT | `/config` | 暂无描述 |
| DELETE | `/config/:category/:key` | 暂无描述 |
| GET | `/engines` | 暂无描述 |
| PUT | `/engines/:type` | 暂无描述 |
| POST | `/maintenance` | 暂无描述 |
| GET | `/logs` | 暂无描述 |
| GET | `/stats` | 暂无描述 |

## test

**路由文件**: `routes/test.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/k6/status` | 暂无描述 |
| POST | `/k6/install` | 暂无描述 |
| GET | `/lighthouse/status` | 暂无描述 |
| POST | `/lighthouse/install` | 暂无描述 |
| POST | `/lighthouse/run` | 暂无描述 |
| GET | `/playwright/status` | 暂无描述 |
| POST | `/playwright/install` | 暂无描述 |
| POST | `/playwright/run` | 暂无描述 |
| GET | `/status` | 暂无描述 |
| GET | `/` | 暂无描述 |
| GET | `/history` | 获取测试历史 |
| GET | `/history/legacy` | 暂无描述 |
| GET | `/history/enhanced` | 暂无描述 |
| GET | `/statistics` | 暂无描述 |
| POST | `/history/batch` | 暂无描述 |
| POST | `/run` | 暂无描述 |
| GET | `/queue/status` | 暂无描述 |
| POST | `/:testId/cancel` | 暂无描述 |
| GET | `/cache/stats` | 暂无描述 |
| POST | `/cache/flush` | 暂无描述 |
| POST | `/cache/invalidate` | 暂无描述 |
| GET | `/:testId/status` | 暂无描述 |
| GET | `/:testId/result` | 暂无描述 |
| POST | `/:testId/stop` | 暂无描述 |
| GET | `/config/templates` | 暂无描述 |
| POST | `/config/templates` | 暂无描述 |
| POST | `/history` | 暂无描述 |
| PUT | `/history/:recordId` | 暂无描述 |
| GET | `/history/:recordId` | 暂无描述 |
| POST | `/history/:recordId/start` | 暂无描述 |
| POST | `/history/:recordId/progress` | 暂无描述 |
| POST | `/history/:recordId/complete` | 暂无描述 |
| POST | `/history/:recordId/fail` | 暂无描述 |
| POST | `/history/:recordId/cancel` | 暂无描述 |
| GET | `/history/:recordId/progress` | 暂无描述 |
| DELETE | `/history/:recordId` | 暂无描述 |
| GET | `/analytics` | 暂无描述 |
| GET | `/stats` | 暂无描述 |
| GET | `/:testId` | 获取测试结果 |
| POST | `/website` | 暂无描述 |
| GET | `/stress/status/:testId` | 暂无描述 |
| POST | `/stress/cancel/:testId` | 暂无描述 |
| POST | `/stress/stop/:testId` | 暂无描述 |
| GET | `/stress/running` | 暂无描述 |
| POST | `/stress/cleanup-all` | 暂无描述 |
| POST | `/stress` | 执行压力测试 |
| POST | `/security` | 执行安全测试 |
| GET | `/security/history` | 暂无描述 |
| GET | `/security/statistics` | 暂无描述 |
| GET | `/security/:testId` | 暂无描述 |
| DELETE | `/security/:testId` | 暂无描述 |
| POST | `/performance` | 执行性能测试 |
| POST | `/performance/page-speed` | 暂无描述 |
| POST | `/performance/core-web-vitals` | 暂无描述 |
| POST | `/compatibility` | 执行兼容性测试 |
| POST | `/caniuse` | 暂无描述 |
| POST | `/browserstack` | 暂无描述 |
| POST | `/feature-detection` | 暂无描述 |
| POST | `/feature-detection` | 暂无描述 |
| POST | `/local-compatibility` | 暂无描述 |
| POST | `/performance/resources` | 暂无描述 |
| POST | `/performance/save` | 暂无描述 |
| POST | `/pagespeed` | 暂无描述 |
| POST | `/gtmetrix` | 暂无描述 |
| POST | `/webpagetest` | 暂无描述 |
| POST | `/lighthouse` | 暂无描述 |
| POST | `/local-performance` | 暂无描述 |
| POST | `/ux` | 暂无描述 |
| POST | `/seo` | 执行SEO测试 |
| POST | `/accessibility` | 暂无描述 |
| POST | `/api-test` | 暂无描述 |
| POST | `/content` | 暂无描述 |
| POST | `/network` | 暂无描述 |
| POST | `/infrastructure` | 暂无描述 |
| DELETE | `/:testId` | 删除测试记录 |
| GET | `/k6/status` | 暂无描述 |
| GET | `/lighthouse/status` | 暂无描述 |
| GET | `/playwright/status` | 暂无描述 |
| GET | `/:engine/status` | 暂无描述 |
| POST | `/proxy-latency` | 暂无描述 |
| POST | `/proxy-test` | 暂无描述 |
| GET | `/geo-status` | 暂无描述 |
| POST | `/geo-update` | 暂无描述 |
| PUT | `/geo-config` | 暂无描述 |
| POST | `/proxy-analyze` | 暂无描述 |
| POST | `/batch` | 暂无描述 |
| POST | `/cancel-all` | 暂无描述 |
| POST | `/comprehensive` | 暂无描述 |
| GET | `/health` | 暂无描述 |
| GET | `/ping` | 暂无描述 |
| POST | `/echo` | 暂无描述 |

## testHistory

**路由文件**: `routes/testHistory.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/` | 暂无描述 |
| GET | `/:testId` | 暂无描述 |
| DELETE | `/:testId` | 暂无描述 |
| POST | `/batch-delete` | 暂无描述 |
| GET | `/export` | 暂无描述 |

## testing

**路由文件**: `routes/testing.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/` | 暂无描述 |
| POST | `/` | 暂无描述 |
| GET | `/:id` | 暂无描述 |
| PUT | `/:id` | 暂无描述 |
| DELETE | `/:id` | 暂无描述 |
| POST | `/:id/start` | 暂无描述 |
| POST | `/:id/stop` | 暂无描述 |
| GET | `/:id/results` | 暂无描述 |
| GET | `/stats/overview` | 暂无描述 |
| GET | `/health/check` | 暂无描述 |

## users

**路由文件**: `routes/users.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/profile` | 获取用户资料 |
| PUT | `/profile` | 更新用户资料 |
| GET | `/preferences` | 暂无描述 |
| PUT | `/preferences` | 暂无描述 |
| GET | `/` | 获取用户列表(管理员) |
| GET | `/:userId` | 暂无描述 |
| PUT | `/:userId/status` | 暂无描述 |

## ux

**路由文件**: `routes/ux.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/status` | 暂无描述 |
| POST | `/run` | 暂无描述 |
| GET | `/test/:testId` | 暂无描述 |
| DELETE | `/test/:testId` | 暂无描述 |

## website

**路由文件**: `routes/website.js`

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/status` | 暂无描述 |
| POST | `/run` | 暂无描述 |
| GET | `/test/:testId` | 暂无描述 |
| DELETE | `/test/:testId` | 暂无描述 |


---

## 🔐 认证说明

### JWT认证

大多数API端点需要JWT认证。请在请求头中包含:

```
Authorization: Bearer {your_jwt_token}
```

### 获取Token

通过登录接口获取Token:

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```


---

## 📊 响应格式

### 成功响应

```json
{
  "success": true,
  "data": {...},
  "message": "操作成功",
  "timestamp": "2025-10-14T09:54:56Z"
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {...}
  },
  "timestamp": "2025-10-14T09:54:56Z"
}
```


---

## 🚦 HTTP状态码

| 状态码 | 含义 | 说明 |
|--------|------|------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证或Token无效 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 |
| 429 | Too Many Requests | 请求过于频繁 |
| 500 | Internal Server Error | 服务器错误 |

