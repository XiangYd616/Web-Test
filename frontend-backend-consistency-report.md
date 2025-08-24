# 前后端一致性检查报告

**生成时间**: 2025-08-24T09:59:49.479Z

## 🔗 API接口一致性分析

### 前端API调用统计
- 发现API调用: 117 个

#### 前端调用的API列表
- `/api/v1/alerts?${params}` (使用 1 次)
- `/api/v1/alerts/stats?timeRange=${filters.timeRange}` (使用 1 次)
- `/api/v1/alerts/rules` (使用 2 次)
- `/api/v1/alerts/${alertId}/acknowledge` (使用 1 次)
- `/api/v1/alerts/${alertId}/resolve` (使用 1 次)
- `/api/v1/alerts/${alertId}` (使用 2 次)
- `/api/v1/alerts/batch` (使用 1 次)
- `/api/v1/alerts/test-notification` (使用 1 次)
- `/api/v1/data-export${endpoint}` (使用 1 次)
- `/api/v1/data-export/task/${task.id}/download` (使用 1 次)
- `/api/test/history?${queryParams.toString()}` (使用 2 次)
- `/api/test/history/${recordId}` (使用 2 次)
- `/api/test/history/batch-delete` (使用 1 次)
- `/api/test/history?${params}` (使用 3 次)
- `/api/test/statistics?timeRange=30` (使用 1 次)
- `/api/data-management/test-history/batch` (使用 1 次)
- `/api/test/history/batch` (使用 1 次)
- `/api/system/resources` (使用 2 次)
- `/api/test/stress/engines` (使用 1 次)
- `/api/test/compatibility/engines` (使用 1 次)
- `/api/test/api/engines` (使用 1 次)
- `/api/test/security/engines` (使用 1 次)
- `/api/test` (使用 1 次)
- `/api/auth/validate` (使用 1 次)
- `/api/auth/login` (使用 3 次)
- `/api/auth/register` (使用 2 次)
- `/api/auth/logout` (使用 1 次)
- `/api/auth/profile` (使用 1 次)
- `/api/auth/change-password` (使用 1 次)
- `/api/monitoring/start` (使用 1 次)
- `/api/monitoring/stop` (使用 1 次)
- `/api/monitoring/targets` (使用 2 次)
- `/api/monitoring/targets/${targetId}` (使用 3 次)
- `/api/monitoring/targets/${targetId}/check` (使用 1 次)
- `/api/monitoring/alerts?${queryParams}` (使用 1 次)
- `/api/monitoring/alerts/${alertId}/resolve` (使用 2 次)
- `/api/monitoring/stats` (使用 2 次)
- `/api/monitoring/targets/batch` (使用 1 次)
- `/api/health` (使用 2 次)
- `/api/user/notifications` (使用 1 次)
- `/api/auth/permissions` (使用 1 次)
- `/api/auth/roles` (使用 1 次)
- `/api/auth/check-permission` (使用 1 次)
- `/api/auth/check-batch-permissions` (使用 1 次)
- `/api/test/start` (使用 1 次)
- `/api/test/${testId}/cancel` (使用 1 次)
- `/api/test/history?${queryParams}` (使用 1 次)
- `/api/test/configurations` (使用 2 次)
- `/api/test/configurations/${configId}` (使用 1 次)
- `/api/test/${testId}` (使用 1 次)
- `/api/test/${testId}/export?format=${format}` (使用 1 次)
- `/api/test/caniuse` (使用 1 次)
- `/api/test/browserstack` (使用 1 次)
- `/api/test/feature-detection` (使用 1 次)
- `/api/test/local` (使用 1 次)
- `/api/test-results` (使用 2 次)
- `/api/test/network` (使用 1 次)
- `/api/data-management/statistics?timeRange=${timeRange}` (使用 1 次)
- `/api/test/stress` (使用 3 次)
- `/api/test/stress/cancel/${testIdToCancel}` (使用 2 次)
- `/api/test/stress/status/${testId}` (使用 1 次)
- `/api/test/stress/status/${savedTestId}` (使用 1 次)
- `/api/test/history` (使用 2 次)
- `/api/test/history/${recordId}/start` (使用 1 次)
- `/api/test/stress/status/${testIdFromResponse}` (使用 2 次)
- `/api/test/history/${testRecordId}/complete` (使用 1 次)
- `/api/test/history/${testRecordId}/fail` (使用 1 次)
- `/api/test/history/${currentRecordId}/progress` (使用 1 次)
- `/api/stress-test/status/${currentTestIdRef.current}` (使用 2 次)
- `/api/test/status` (使用 2 次)
- `/api/stress-test/status/${currentTestId}` (使用 1 次)
- `/api/test/proxy-analyze` (使用 1 次)
- `/api/test/proxy-latency` (使用 1 次)
- `/api/test/history/${testId}` (使用 1 次)
- `/api/test/history/enhanced?testId=${testId}&includeResults=true&includeConfig=true&includeMetadata=true` (使用 1 次)
- `/api/test/ux` (使用 1 次)
- `/api/test/database` (使用 1 次)
- `/api/content-test` (使用 1 次)
- `/api/data-management/stats` (使用 1 次)
- `/api/data-management/backup` (使用 1 次)
- `/api/data-management/cleanup` (使用 1 次)
- `/api/reports/generate` (使用 1 次)
- `/api/reports/tasks` (使用 1 次)
- `/api/reports/tasks/${taskId}/download` (使用 1 次)
- `/api/monitoring/sites` (使用 3 次)
- `/api/monitoring/realtime` (使用 1 次)
- `/api/errors/report` (使用 1 次)
- `/api/monitoring/status` (使用 1 次)
- `/api/monitoring/sites/${siteId}` (使用 1 次)
- `/api/test/${engine}/status` (使用 1 次)
- `/api/test/k6/status` (使用 1 次)
- `/api/test/k6/install` (使用 1 次)
- `/api/test/performance` (使用 1 次)
- `/api/test/lighthouse/status` (使用 1 次)
- `/api/test/lighthouse/install` (使用 1 次)
- `/api/test/lighthouse/run` (使用 1 次)
- `/api/test/playwright/status` (使用 1 次)
- `/api/test/playwright/install` (使用 1 次)
- `/api/test/playwright/run` (使用 1 次)
- `/api/test/security` (使用 1 次)
- `/api/user/profile` (使用 2 次)
- `/api/user/stats` (使用 1 次)
- `/api/user/settings` (使用 2 次)
- `/api/user/bookmarks` (使用 2 次)
- `/api/user/tests?page=${page}&limit=${limit}` (使用 1 次)
- `/api/user/notifications?page=${page}&limit=${limit}` (使用 1 次)
- `/api/user/avatar` (使用 2 次)
- `/api/user/password` (使用 1 次)
- `/api/user/bookmarks/${id}` (使用 2 次)
- `/api/user/notifications/${id}/read` (使用 1 次)
- `/api/user/tests/${id}` (使用 1 次)
- `/api/user/notifications/${id}` (使用 1 次)
- `/api/user/stats/${userId}` (使用 1 次)
- `/api/v1/test` (使用 4 次)
- `/api/v1/nonexistent` (使用 1 次)
- `/api/v1/protected` (使用 1 次)
- `/api/v1/analytics/performance` (使用 1 次)

### 后端API定义统计
- 发现API定义: 259 个

#### 后端定义的API列表
- `POST /api/check`
- `GET /api/wcag/:level`
- `GET /api/recommendations`
- `GET /api/history`
- `GET /api/:testId/export`
- `GET /api/stats`
- `GET /api/keyboard`
- `GET /api/screen-reader`
- `GET /api/contrast`
- `GET /api/users`
- `PUT /api/users/:userId/status`
- `GET /api/logs`
- `GET /api/test-history`
- `GET /api/`
- `PUT /api/:id/acknowledge`
- `PUT /api/:id/resolve`
- `POST /api/batch`
- `GET /api/:id`
- `DELETE /api/:id`
- `POST /api/test-notification`
- `GET /api/rules`
- `PUT /api/rules`
- `GET /api/history/stats`
- `POST /api/trend`
- `POST /api/compare`
- `POST /api/performance`
- `POST /api/insights`
- `POST /api/register`
- `POST /api/login`
- `POST /api/verify`
- `GET /api/me`
- `POST /api/refresh`
- `POST /api/logout`
- `PUT /api/change-password`
- `POST /api/forgot-password`
- `POST /api/reset-password`
- `POST /api/send-verification`
- `POST /api/verify-email`
- `POST /api/create/full`
- `POST /api/create/incremental`
- `GET /api/list`
- `POST /api/restore/:backupId`
- `GET /api/download/:backupId`
- `DELETE /api/:backupId`
- `POST /api/cleanup`
- `POST /api/schedule/start`
- `POST /api/schedule/stop`
- `POST /api/verify/:backupId`
- `POST /api/test`
- `POST /api/export`
- `POST /api/delete`
- `GET /api/status/:operationId`
- `POST /api/cancel/:operationId`
- `GET /api/results/:operationId`
- `GET /api/download/:operationId`
- `GET /api/:key`
- `PUT /api/:key`
- `PUT /api/`
- `GET /api/meta/schema`
- `GET /api/meta/history`
- `POST /api/meta/rollback`
- `POST /api/meta/reset`
- `GET /api/meta/status`
- `POST /api/meta/validate`
- `GET /api/meta/export`
- `POST /api/meta/import`
- `POST /api/:type`
- `GET /api/:type/:id`
- `PUT /api/:type/:id`
- `DELETE /api/:type/:id`
- `GET /api/:type`
- `POST /api/:type/export`
- `POST /api/:type/import`
- `GET /api/:type/statistics`
- `POST /api/backup`
- `GET /api/types`
- `GET /api/export-formats`
- `POST /api/:type/validate`
- `GET /api/health`
- `GET /api/status`
- `GET /api/metrics`
- `POST /api/test-connection`
- `GET /api/slow-queries`
- `GET /api/pool`
- `POST /api/reconnect`
- `POST /api/create`
- `GET /api/task/:taskId/status`
- `GET /api/tasks`
- `POST /api/task/:taskId/cancel`
- `GET /api/task/:taskId/download`
- `DELETE /api/task/:taskId`
- `POST /api/test-history`
- `GET /api/config`
- `POST /api/upload`
- `GET /api/task/:taskId/preview`
- `POST /api/task/:taskId/start`
- `GET /api/mapping-template/:dataType`
- `POST /api/validate`
- `GET /api/exports`
- `GET /api/imports`
- `GET /api/statistics`
- `DELETE /api/test-history/batch`
- `POST /api/query`
- `GET /api/analytics`
- `POST /api/exports`
- `POST /api/imports`
- `GET /api/status/:engineType`
- `POST /api/restart/:engineType`
- `GET /api/capabilities`
- `GET /api/alerts`
- `POST /api/test-alerts`
- `POST /api/send-alert`
- `POST /api/alert-rules`
- `GET /api/export`
- `GET /api/trends`
- `POST /api/report`
- `GET /api/:errorId`
- `GET /api/download/:id`
- `PUT /api/:id/metadata`
- `POST /api/`
- `GET /api/cicd/platforms`
- `POST /api/cicd`
- `POST /api/cicd/:integrationId/trigger`
- `GET /api/cicd`
- `POST /api/webhook/:platform`
- `GET /api/cicd/templates/:platform`
- `GET /api/sites`
- `POST /api/sites`
- `GET /api/sites/:id`
- `PUT /api/sites/:id`
- `DELETE /api/sites/:id`
- `POST /api/sites/:id/check`
- `GET /api/sites/:id/history`
- `PUT /api/alerts/:id/read`
- `POST /api/alerts/batch`
- `POST /api/reports`
- `GET /api/reports`
- `GET /api/reports/:id/download`
- `GET /api/overview`
- `GET /api/database`
- `GET /api/cache`
- `GET /api`
- `GET /api/realtime`
- `DELETE /api/cleanup`
- `POST /api/visualizations`
- `POST /api/generate`
- `GET /api/:id/download`
- `GET /api/scheduled`
- `POST /api/scheduled`
- `POST /api/scheduled/:reportId/execute`
- `GET /api/templates`
- `POST /api/performance/benchmarks`
- `POST /api/performance/benchmarks/:benchmarkId/run`
- `POST /api/performance/baselines`
- `POST /api/performance/report`
- `POST /api/advanced-test`
- `POST /api/quick-check`
- `GET /api/test/:testId`
- `POST /api/export-report`
- `POST /api/fetch-page`
- `POST /api/fetch-robots`
- `POST /api/fetch-sitemap`
- `POST /api/archive`
- `POST /api/maintenance`
- `GET /api/configuration`
- `PUT /api/configuration`
- `GET /api/engines/:engineType/policy`
- `PUT /api/engines/:engineType/policy`
- `GET /api/usage`
- `GET /api/resources`
- `GET /api/k6/status`
- `POST /api/k6/install`
- `GET /api/lighthouse/status`
- `POST /api/lighthouse/install`
- `POST /api/lighthouse/run`
- `GET /api/playwright/status`
- `POST /api/playwright/install`
- `POST /api/playwright/run`
- `GET /api/history/legacy`
- `GET /api/history/enhanced`
- `POST /api/history/batch`
- `POST /api/run`
- `GET /api/queue/status`
- `POST /api/:testId/cancel`
- `GET /api/cache/stats`
- `POST /api/cache/flush`
- `POST /api/cache/invalidate`
- `GET /api/:testId/status`
- `GET /api/:testId/result`
- `POST /api/:testId/stop`
- `GET /api/config/templates`
- `POST /api/config/templates`
- `POST /api/history`
- `PUT /api/history/:recordId`
- `GET /api/history/:recordId`
- `POST /api/history/:recordId/start`
- `POST /api/history/:recordId/progress`
- `POST /api/history/:recordId/complete`
- `POST /api/history/:recordId/fail`
- `POST /api/history/:recordId/cancel`
- `GET /api/history/:recordId/progress`
- `DELETE /api/history/:recordId`
- `GET /api/:testId`
- `POST /api/website`
- `GET /api/stress/status/:testId`
- `POST /api/stress/cancel/:testId`
- `POST /api/stress/stop/:testId`
- `GET /api/stress/running`
- `POST /api/stress/cleanup-all`
- `POST /api/stress`
- `POST /api/security`
- `GET /api/security/history`
- `GET /api/security/statistics`
- `GET /api/security/:testId`
- `DELETE /api/security/:testId`
- `POST /api/performance/page-speed`
- `POST /api/performance/core-web-vitals`
- `POST /api/compatibility`
- `POST /api/caniuse`
- `POST /api/browserstack`
- `POST /api/feature-detection`
- `POST /api/local-compatibility`
- `POST /api/performance/resources`
- `POST /api/performance/save`
- `POST /api/pagespeed`
- `POST /api/gtmetrix`
- `POST /api/webpagetest`
- `POST /api/lighthouse`
- `POST /api/local-performance`
- `POST /api/ux`
- `POST /api/seo`
- `POST /api/accessibility`
- `POST /api-test`
- `DELETE /api/:testId`
- `GET /api/:engine/status`
- `POST /api/proxy-latency`
- `POST /api/proxy-test`
- `GET /api/geo-status`
- `POST /api/geo-update`
- `PUT /api/geo-config`
- `POST /api/proxy-analyze`
- `GET /api/engines`
- `GET /api/engines/:engineType/status`
- `POST /api/test/:testType`
- `GET /api/test/:testId/status`
- `GET /api/test/:testId/result`
- `POST /api/test/:testId/stop`
- `POST /api/comprehensive`
- `POST /api/batch-delete`
- `GET /api/results/:executionId`
- `GET /api/config/:testType`
- `GET /api/profile`
- `PUT /api/profile`
- `GET /api/preferences`
- `PUT /api/preferences`
- `GET /api/activity`
- `DELETE /api/account`
- `GET /api/notifications`
- `GET /api/stats/:userId`

### ⚠️ 发现的问题

#### 后端缺失的API
1. **/api/v1/alerts?${params}**
   前端使用位置:
   - components\business\AlertManager.tsx:129

2. **/api/v1/alerts/stats?timeRange=${filters.timeRange}**
   前端使用位置:
   - components\business\AlertManager.tsx:182

3. **/api/v1/alerts/rules**
   前端使用位置:
   - components\business\AlertManager.tsx:228
   - components\business\AlertManager.tsx:347

4. **/api/v1/alerts/${alertId}/acknowledge**
   前端使用位置:
   - components\business\AlertManager.tsx:255

5. **/api/v1/alerts/${alertId}/resolve**
   前端使用位置:
   - components\business\AlertManager.tsx:276

6. **/api/v1/alerts/${alertId}**
   前端使用位置:
   - components\business\AlertManager.tsx:297
   - components\business\AlertManager.tsx:1031

7. **/api/v1/alerts/batch**
   前端使用位置:
   - components\business\AlertManager.tsx:320

8. **/api/v1/alerts/test-notification**
   前端使用位置:
   - components\business\AlertManager.tsx:370

9. **/api/v1/data-export${endpoint}**
   前端使用位置:
   - components\business\DataExporter.tsx:140

10. **/api/v1/data-export/task/${task.id}/download**
   前端使用位置:
   - components\business\DataExporter.tsx:271

11. **/api/test/history?${queryParams.toString()}**
   前端使用位置:
   - components\common\TestHistory.tsx:205
   - components\stress\StressTestHistory.tsx:157

12. **/api/test/history/${recordId}**
   前端使用位置:
   - components\common\TestHistory.tsx:495
   - components\stress\StressTestHistory.tsx:666

13. **/api/test/history/batch-delete**
   前端使用位置:
   - components\common\TestHistory.tsx:537

14. **/api/test/history?${params}**
   前端使用位置:
   - components\common\TestHistoryDetailed.tsx:87
   - components\common\TestPageHistory.tsx:79
   - components\common\TestTypeHistory.tsx:84

15. **/api/test/statistics?timeRange=30**
   前端使用位置:
   - components\common\TestHistoryDetailed.tsx:117

16. **/api/data-management/test-history/batch**
   前端使用位置:
   - components\common\TestHistoryDetailed.tsx:252

17. **/api/test/history/batch**
   前端使用位置:
   - components\stress\StressTestHistory.tsx:741

18. **/api/system/resources**
   前端使用位置:
   - components\system\SystemResourceMonitor.tsx:50
   - services\systemResourceMonitor.ts:134

19. **/api/test/stress/engines**
   前端使用位置:
   - components\testing\TestEngineStatus.tsx:70

20. **/api/test/compatibility/engines**
   前端使用位置:
   - components\testing\TestEngineStatus.tsx:106

21. **/api/test/api/engines**
   前端使用位置:
   - components\testing\TestEngineStatus.tsx:142

22. **/api/test/security/engines**
   前端使用位置:
   - components\testing\TestEngineStatus.tsx:177

23. **/api/auth/validate**
   前端使用位置:
   - hooks\useAuth.ts:41

24. **/api/auth/login**
   前端使用位置:
   - hooks\useAuth.ts:61
   - services\auth\authService.ts:222
   - services\auth\authService.ts:397

25. **/api/auth/register**
   前端使用位置:
   - hooks\useAuth.ts:110
   - services\auth\authService.ts:574

26. **/api/auth/logout**
   前端使用位置:
   - hooks\useAuth.ts:149

27. **/api/auth/profile**
   前端使用位置:
   - hooks\useAuth.ts:179

28. **/api/auth/change-password**
   前端使用位置:
   - hooks\useAuth.ts:227

29. **/api/monitoring/start**
   前端使用位置:
   - hooks\useMonitoring.ts:60

30. **/api/monitoring/stop**
   前端使用位置:
   - hooks\useMonitoring.ts:86

31. **/api/monitoring/targets**
   前端使用位置:
   - hooks\useMonitoring.ts:112
   - hooks\useMonitoring.ts:232

32. **/api/monitoring/targets/${targetId}**
   前端使用位置:
   - hooks\useMonitoring.ts:146
   - hooks\useMonitoring.ts:173
   - hooks\useMonitoring.ts:377

33. **/api/monitoring/targets/${targetId}/check**
   前端使用位置:
   - hooks\useMonitoring.ts:198

34. **/api/monitoring/alerts?${queryParams}**
   前端使用位置:
   - hooks\useMonitoring.ts:265

35. **/api/monitoring/alerts/${alertId}/resolve**
   前端使用位置:
   - hooks\useMonitoring.ts:287
   - services\realTimeMonitoringService.ts:410

36. **/api/monitoring/stats**
   前端使用位置:
   - hooks\useMonitoring.ts:312
   - services\dataAnalysisService.ts:587

37. **/api/monitoring/targets/batch**
   前端使用位置:
   - hooks\useMonitoring.ts:399

38. **/api/user/notifications**
   前端使用位置:
   - hooks\useNotifications.ts:202

39. **/api/auth/permissions**
   前端使用位置:
   - hooks\usePermissions.ts:138

40. **/api/auth/roles**
   前端使用位置:
   - hooks\usePermissions.ts:143

41. **/api/auth/check-permission**
   前端使用位置:
   - hooks\usePermissions.ts:209

42. **/api/auth/check-batch-permissions**
   前端使用位置:
   - hooks\usePermissions.ts:270

43. **/api/test/start**
   前端使用位置:
   - hooks\useTest.ts:63

44. **/api/test/${testId}/cancel**
   前端使用位置:
   - hooks\useTest.ts:113

45. **/api/test/history?${queryParams}**
   前端使用位置:
   - hooks\useTest.ts:150

46. **/api/test/configurations**
   前端使用位置:
   - hooks\useTest.ts:172
   - hooks\useTest.ts:201

47. **/api/test/configurations/${configId}**
   前端使用位置:
   - hooks\useTest.ts:223

48. **/api/test/${testId}**
   前端使用位置:
   - hooks\useTest.ts:246

49. **/api/test/${testId}/export?format=${format}**
   前端使用位置:
   - hooks\useTest.ts:293

50. **/api/test/caniuse**
   前端使用位置:
   - pages\CompatibilityTest.tsx:406

51. **/api/test/browserstack**
   前端使用位置:
   - pages\CompatibilityTest.tsx:469

52. **/api/test/feature-detection**
   前端使用位置:
   - pages\CompatibilityTest.tsx:535

53. **/api/test/local**
   前端使用位置:
   - pages\CompatibilityTest.tsx:601

54. **/api/test-results**
   前端使用位置:
   - pages\DatabaseTest.tsx:340
   - pages\DatabaseTest.tsx:1286

55. **/api/test/network**
   前端使用位置:
   - pages\NetworkTest.tsx:149

56. **/api/data-management/statistics?timeRange=${timeRange}**
   前端使用位置:
   - pages\Statistics.tsx:46

57. **/api/test/stress**
   前端使用位置:
   - pages\StressTest.tsx:173
   - pages\StressTest.tsx:1037
   - services\stressTestQueueManager.ts:347

58. **/api/test/stress/cancel/${testIdToCancel}**
   前端使用位置:
   - pages\StressTest.tsx:351
   - pages\StressTest.tsx:3338

59. **/api/test/stress/status/${testId}**
   前端使用位置:
   - pages\StressTest.tsx:730

60. **/api/test/stress/status/${savedTestId}**
   前端使用位置:
   - pages\StressTest.tsx:821

61. **/api/test/history**
   前端使用位置:
   - pages\StressTest.tsx:960
   - services\testEngine.ts:409

62. **/api/test/history/${recordId}/start**
   前端使用位置:
   - pages\StressTest.tsx:1016

63. **/api/test/stress/status/${testIdFromResponse}**
   前端使用位置:
   - pages\StressTest.tsx:1118
   - pages\StressTest.tsx:1196

64. **/api/test/history/${testRecordId}/complete**
   前端使用位置:
   - pages\StressTest.tsx:1291

65. **/api/test/history/${testRecordId}/fail**
   前端使用位置:
   - pages\StressTest.tsx:1327

66. **/api/test/history/${currentRecordId}/progress**
   前端使用位置:
   - pages\StressTest.tsx:1741

67. **/api/stress-test/status/${currentTestIdRef.current}**
   前端使用位置:
   - pages\StressTest.tsx:1996
   - pages\StressTest.tsx:2031

68. **/api/test/status**
   前端使用位置:
   - pages\StressTest.tsx:2311
   - services\testEngine.ts:194

69. **/api/stress-test/status/${currentTestId}**
   前端使用位置:
   - pages\StressTest.tsx:2954

70. **/api/test/proxy-analyze**
   前端使用位置:
   - pages\StressTest.tsx:3911

71. **/api/test/proxy-latency**
   前端使用位置:
   - pages\StressTest.tsx:3962

72. **/api/test/history/${testId}**
   前端使用位置:
   - pages\StressTestDetail.tsx:152

73. **/api/test/history/enhanced?testId=${testId}&includeResults=true&includeConfig=true&includeMetadata=true**
   前端使用位置:
   - pages\TestResultDetail.tsx:22

74. **/api/test/ux**
   前端使用位置:
   - pages\UXTest.tsx:150

75. **/api/test/database**
   前端使用位置:
   - services\backgroundTestManager.ts:321

76. **/api/content-test**
   前端使用位置:
   - services\browserTestEngineIntegrator.ts:60

77. **/api/data-management/stats**
   前端使用位置:
   - services\dataAnalysisService.ts:571

78. **/api/data-management/backup**
   前端使用位置:
   - services\dataAnalysisService.ts:607

79. **/api/data-management/cleanup**
   前端使用位置:
   - services\dataAnalysisService.ts:634

80. **/api/reports/generate**
   前端使用位置:
   - services\dataAnalysisService.ts:670

81. **/api/reports/tasks**
   前端使用位置:
   - services\dataAnalysisService.ts:694

82. **/api/reports/tasks/${taskId}/download**
   前端使用位置:
   - services\dataAnalysisService.ts:710

83. **/api/monitoring/sites**
   前端使用位置:
   - services\dataAnalysisService.ts:754
   - services\dataAnalysisService.ts:776
   - services\realTimeMonitoringService.ts:349

84. **/api/monitoring/realtime**
   前端使用位置:
   - services\dataAnalysisService.ts:794

85. **/api/errors/report**
   前端使用位置:
   - services\errorService.ts:313

86. **/api/monitoring/status**
   前端使用位置:
   - services\realTimeMonitoringService.ts:235

87. **/api/monitoring/sites/${siteId}**
   前端使用位置:
   - services\realTimeMonitoringService.ts:379

88. **/api/test/${engine}/status**
   前端使用位置:
   - services\testEngine.ts:233

89. **/api/test/k6/status**
   前端使用位置:
   - services\testEngines.ts:30

90. **/api/test/k6/install**
   前端使用位置:
   - services\testEngines.ts:54

91. **/api/test/performance**
   前端使用位置:
   - services\testEngines.ts:80

92. **/api/test/lighthouse/status**
   前端使用位置:
   - services\testEngines.ts:119

93. **/api/test/lighthouse/install**
   前端使用位置:
   - services\testEngines.ts:142

94. **/api/test/lighthouse/run**
   前端使用位置:
   - services\testEngines.ts:166

95. **/api/test/playwright/status**
   前端使用位置:
   - services\testEngines.ts:204

96. **/api/test/playwright/install**
   前端使用位置:
   - services\testEngines.ts:227

97. **/api/test/playwright/run**
   前端使用位置:
   - services\testEngines.ts:252

98. **/api/test/security**
   前端使用位置:
   - services\unifiedSecurityEngine.ts:711

99. **/api/user/profile**
   前端使用位置:
   - services\user\userService.ts:108
   - services\user\userService.ts:122

100. **/api/user/stats**
   前端使用位置:
   - services\user\userService.ts:136

101. **/api/user/settings**
   前端使用位置:
   - services\user\userService.ts:150
   - services\user\userService.ts:164

102. **/api/user/bookmarks**
   前端使用位置:
   - services\user\userService.ts:226
   - services\user\userService.ts:240

103. **/api/user/tests?page=${page}&limit=${limit}**
   前端使用位置:
   - services\user\userService.ts:281

104. **/api/user/notifications?page=${page}&limit=${limit}**
   前端使用位置:
   - services\user\userService.ts:308

105. **/api/user/avatar**
   前端使用位置:
   - services\user\userService.ts:181
   - services\user\userService.ts:200

106. **/api/user/password**
   前端使用位置:
   - services\user\userService.ts:213

107. **/api/user/bookmarks/${id}**
   前端使用位置:
   - services\user\userService.ts:254
   - services\user\userService.ts:268

108. **/api/user/notifications/${id}/read**
   前端使用位置:
   - services\user\userService.ts:322

109. **/api/user/tests/${id}**
   前端使用位置:
   - services\user\userService.ts:295

110. **/api/user/notifications/${id}**
   前端使用位置:
   - services\user\userService.ts:335

111. **/api/user/stats/${userId}**
   前端使用位置:
   - services\userStatsService.ts:84

112. **/api/v1/test**
   前端使用位置:
   - services\__tests__\apiIntegration.test.ts:46
   - services\__tests__\apiIntegration.test.ts:73
   - services\__tests__\apiIntegration.test.ts:104
   - services\__tests__\apiIntegration.test.ts:341

113. **/api/v1/nonexistent**
   前端使用位置:
   - services\__tests__\apiIntegration.test.ts:90

114. **/api/v1/protected**
   前端使用位置:
   - services\__tests__\apiIntegration.test.ts:369

115. **/api/v1/analytics/performance**
   前端使用位置:
   - utils\performanceOptimization.ts:435

#### 前端未使用的API
1. **POST /api/check**
   后端定义位置:
   - routes\accessibility.js:15

2. **GET /api/wcag/:level**
   后端定义位置:
   - routes\accessibility.js:42

3. **GET /api/recommendations**
   后端定义位置:
   - routes\accessibility.js:94
   - routes\security.js:314

4. **GET /api/history**
   后端定义位置:
   - routes\accessibility.js:139
   - routes\test.js:664
   - routes\testEngine.js:317
   - routes\tests.js:89

5. **GET /api/:testId/export**
   后端定义位置:
   - routes\accessibility.js:185

6. **GET /api/stats**
   后端定义位置:
   - routes\accessibility.js:222
   - routes\admin.js:19
   - routes\alerts.js:89
   - routes\backup.js:258
   - routes\databaseHealth.js:73
   - routes\errorManagement.js:17
   - routes\errors.js:93
   - routes\monitoring.js:372
   - routes\test.js:1495

7. **GET /api/keyboard**
   后端定义位置:
   - routes\accessibility.js:278

8. **GET /api/screen-reader**
   后端定义位置:
   - routes\accessibility.js:319

9. **GET /api/contrast**
   后端定义位置:
   - routes\accessibility.js:361

10. **GET /api/users**
   后端定义位置:
   - routes\admin.js:45

11. **PUT /api/users/:userId/status**
   后端定义位置:
   - routes\admin.js:98

12. **GET /api/logs**
   后端定义位置:
   - routes\admin.js:129
   - routes\errorManagement.js:57

13. **GET /api/**
   后端定义位置:
   - routes\alerts.js:47
   - routes\config.js:16
   - routes\files.js:131
   - routes\integrations.js:59
   - routes\reports.js:73
   - routes\test.js:644
   - routes\testHistory.js:26

14. **PUT /api/:id/acknowledge**
   后端定义位置:
   - routes\alerts.js:113

15. **PUT /api/:id/resolve**
   后端定义位置:
   - routes\alerts.js:148

16. **POST /api/batch**
   后端定义位置:
   - routes\alerts.js:183
   - routes\data.js:181
   - routes\testEngine.js:263

17. **GET /api/:id**
   后端定义位置:
   - routes\alerts.js:230
   - routes\reports.js:184

18. **DELETE /api/:id**
   后端定义位置:
   - routes\alerts.js:265
   - routes\files.js:243
   - routes\reports.js:244

19. **POST /api/test-notification**
   后端定义位置:
   - routes\alerts.js:300

20. **GET /api/rules**
   后端定义位置:
   - routes\alerts.js:327

21. **PUT /api/rules**
   后端定义位置:
   - routes\alerts.js:350

22. **GET /api/history/stats**
   后端定义位置:
   - routes\alerts.js:374

23. **POST /api/trend**
   后端定义位置:
   - routes\analytics.js:17

24. **POST /api/compare**
   后端定义位置:
   - routes\analytics.js:37

25. **POST /api/performance**
   后端定义位置:
   - routes\analytics.js:57
   - routes\test.js:2487

26. **POST /api/insights**
   后端定义位置:
   - routes\analytics.js:73

27. **POST /api/register**
   后端定义位置:
   - routes\auth.js:25

28. **POST /api/login**
   后端定义位置:
   - routes\auth.js:118

29. **POST /api/verify**
   后端定义位置:
   - routes\auth.js:264

30. **GET /api/me**
   后端定义位置:
   - routes\auth.js:328

31. **POST /api/refresh**
   后端定义位置:
   - routes\auth.js:364

32. **POST /api/logout**
   后端定义位置:
   - routes\auth.js:370

33. **PUT /api/change-password**
   后端定义位置:
   - routes\auth.js:384

34. **POST /api/forgot-password**
   后端定义位置:
   - routes\auth.js:455

35. **POST /api/reset-password**
   后端定义位置:
   - routes\auth.js:504

36. **POST /api/send-verification**
   后端定义位置:
   - routes\auth.js:557

37. **POST /api/verify-email**
   后端定义位置:
   - routes\auth.js:592

38. **POST /api/create/full**
   后端定义位置:
   - routes\backup.js:51

39. **POST /api/create/incremental**
   后端定义位置:
   - routes\backup.js:72

40. **GET /api/list**
   后端定义位置:
   - routes\backup.js:93

41. **POST /api/restore/:backupId**
   后端定义位置:
   - routes\backup.js:118

42. **GET /api/download/:backupId**
   后端定义位置:
   - routes\backup.js:163

43. **DELETE /api/:backupId**
   后端定义位置:
   - routes\backup.js:218

44. **POST /api/cleanup**
   后端定义位置:
   - routes\backup.js:239
   - routes\dataExport.js:308
   - routes\errorManagement.js:363
   - routes\storageManagement.js:108

45. **POST /api/schedule/start**
   后端定义位置:
   - routes\backup.js:300

46. **POST /api/schedule/stop**
   后端定义位置:
   - routes\backup.js:318

47. **POST /api/verify/:backupId**
   后端定义位置:
   - routes\backup.js:337

48. **POST /api/export**
   后端定义位置:
   - routes\batch.js:81
   - routes\dataManagement.js:78
   - routes\performanceAccessibility.js:239

49. **POST /api/delete**
   后端定义位置:
   - routes\batch.js:113

50. **GET /api/status/:operationId**
   后端定义位置:
   - routes\batch.js:142

51. **POST /api/cancel/:operationId**
   后端定义位置:
   - routes\batch.js:163

52. **GET /api/results/:operationId**
   后端定义位置:
   - routes\batch.js:192

53. **GET /api/download/:operationId**
   后端定义位置:
   - routes\batch.js:219

54. **GET /api/:key**
   后端定义位置:
   - routes\config.js:35

55. **PUT /api/:key**
   后端定义位置:
   - routes\config.js:62

56. **PUT /api/**
   后端定义位置:
   - routes\config.js:105

57. **GET /api/meta/schema**
   后端定义位置:
   - routes\config.js:161

58. **POST /api/meta/rollback**
   后端定义位置:
   - routes\config.js:222

59. **POST /api/meta/reset**
   后端定义位置:
   - routes\config.js:250

60. **GET /api/meta/export**
   后端定义位置:
   - routes\config.js:380

61. **POST /api/meta/import**
   后端定义位置:
   - routes\config.js:414

62. **POST /api/:type**
   后端定义位置:
   - routes\data.js:35

63. **GET /api/:type/:id**
   后端定义位置:
   - routes\data.js:64

64. **PUT /api/:type/:id**
   后端定义位置:
   - routes\data.js:91

65. **DELETE /api/:type/:id**
   后端定义位置:
   - routes\data.js:121

66. **GET /api/:type**
   后端定义位置:
   - routes\data.js:146

67. **POST /api/:type/export**
   后端定义位置:
   - routes\data.js:211

68. **POST /api/:type/import**
   后端定义位置:
   - routes\data.js:231

69. **GET /api/:type/statistics**
   后端定义位置:
   - routes\data.js:259

70. **POST /api/backup**
   后端定义位置:
   - routes\data.js:285

71. **GET /api/types**
   后端定义位置:
   - routes\data.js:304

72. **GET /api/export-formats**
   后端定义位置:
   - routes\data.js:323

73. **POST /api/:type/validate**
   后端定义位置:
   - routes\data.js:341

74. **GET /api/status**
   后端定义位置:
   - routes\databaseHealth.js:29
   - routes\engineStatus.js:15
   - routes\errorManagement.js:224
   - routes\performanceAccessibility.js:315
   - routes\storageManagement.js:15
   - routes\test.js:560

75. **GET /api/metrics**
   后端定义位置:
   - routes\databaseHealth.js:47

76. **POST /api/test-connection**
   后端定义位置:
   - routes\databaseHealth.js:90

77. **GET /api/slow-queries**
   后端定义位置:
   - routes\databaseHealth.js:108

78. **GET /api/pool**
   后端定义位置:
   - routes\databaseHealth.js:135

79. **POST /api/reconnect**
   后端定义位置:
   - routes\databaseHealth.js:162

80. **POST /api/create**
   后端定义位置:
   - routes\dataExport.js:92

81. **GET /api/task/:taskId/status**
   后端定义位置:
   - routes\dataExport.js:125
   - routes\dataImport.js:139

82. **GET /api/tasks**
   后端定义位置:
   - routes\dataExport.js:150
   - routes\dataImport.js:221

83. **POST /api/task/:taskId/cancel**
   后端定义位置:
   - routes\dataExport.js:175
   - routes\dataImport.js:246

84. **GET /api/task/:taskId/download**
   后端定义位置:
   - routes\dataExport.js:201

85. **DELETE /api/task/:taskId**
   后端定义位置:
   - routes\dataExport.js:261
   - routes\dataImport.js:272

86. **GET /api/config**
   后端定义位置:
   - routes\dataExport.js:361
   - routes\dataImport.js:439

87. **POST /api/upload**
   后端定义位置:
   - routes\dataImport.js:105
   - routes\files.js:71

88. **GET /api/task/:taskId/preview**
   后端定义位置:
   - routes\dataImport.js:164

89. **POST /api/task/:taskId/start**
   后端定义位置:
   - routes\dataImport.js:195

90. **GET /api/mapping-template/:dataType**
   后端定义位置:
   - routes\dataImport.js:320

91. **POST /api/validate**
   后端定义位置:
   - routes\dataImport.js:397

92. **GET /api/exports**
   后端定义位置:
   - routes\dataManagement.js:21

93. **GET /api/imports**
   后端定义位置:
   - routes\dataManagement.js:35

94. **GET /api/statistics**
   后端定义位置:
   - routes\dataManagement.js:63
   - routes\security.js:221
   - routes\storageManagement.js:43
   - routes\test.js:722

95. **POST /api/query**
   后端定义位置:
   - routes\dataManagement.js:107

96. **GET /api/analytics**
   后端定义位置:
   - routes\dataManagement.js:210
   - routes\monitoring.js:427
   - routes\test.js:1430

97. **POST /api/exports**
   后端定义位置:
   - routes\dataManagement.js:266

98. **POST /api/imports**
   后端定义位置:
   - routes\dataManagement.js:292

99. **GET /api/status/:engineType**
   后端定义位置:
   - routes\engineStatus.js:59

100. **POST /api/restart/:engineType**
   后端定义位置:
   - routes\engineStatus.js:120

101. **GET /api/capabilities**
   后端定义位置:
   - routes\engineStatus.js:163

102. **GET /api/alerts**
   后端定义位置:
   - routes\errorManagement.js:115
   - routes\monitoring.js:270

103. **POST /api/test-alerts**
   后端定义位置:
   - routes\errorManagement.js:159

104. **POST /api/send-alert**
   后端定义位置:
   - routes\errorManagement.js:184

105. **POST /api/alert-rules**
   后端定义位置:
   - routes\errorManagement.js:250

106. **GET /api/export**
   后端定义位置:
   - routes\errorManagement.js:285
   - routes\monitoring.js:454
   - routes\testHistory.js:268

107. **GET /api/trends**
   后端定义位置:
   - routes\errorManagement.js:390

108. **POST /api/report**
   后端定义位置:
   - routes\errors.js:18

109. **GET /api/:errorId**
   后端定义位置:
   - routes\errors.js:116

110. **GET /api/download/:id**
   后端定义位置:
   - routes\files.js:192

111. **PUT /api/:id/metadata**
   后端定义位置:
   - routes\files.js:289

112. **POST /api/**
   后端定义位置:
   - routes\integrations.js:91
   - routes\performanceAccessibility.js:111

113. **GET /api/cicd/platforms**
   后端定义位置:
   - routes\integrations.js:196

114. **POST /api/cicd**
   后端定义位置:
   - routes\integrations.js:210

115. **POST /api/cicd/:integrationId/trigger**
   后端定义位置:
   - routes\integrations.js:254

116. **GET /api/cicd**
   后端定义位置:
   - routes\integrations.js:277

117. **POST /api/webhook/:platform**
   后端定义位置:
   - routes\integrations.js:291

118. **GET /api/cicd/templates/:platform**
   后端定义位置:
   - routes\integrations.js:315

119. **GET /api/sites**
   后端定义位置:
   - routes\monitoring.js:52

120. **POST /api/sites**
   后端定义位置:
   - routes\monitoring.js:80

121. **GET /api/sites/:id**
   后端定义位置:
   - routes\monitoring.js:110

122. **PUT /api/sites/:id**
   后端定义位置:
   - routes\monitoring.js:146

123. **DELETE /api/sites/:id**
   后端定义位置:
   - routes\monitoring.js:182

124. **POST /api/sites/:id/check**
   后端定义位置:
   - routes\monitoring.js:217

125. **GET /api/sites/:id/history**
   后端定义位置:
   - routes\monitoring.js:241

126. **PUT /api/alerts/:id/read**
   后端定义位置:
   - routes\monitoring.js:299

127. **POST /api/reports**
   后端定义位置:
   - routes\monitoring.js:492

128. **GET /api/reports**
   后端定义位置:
   - routes\monitoring.js:530

129. **GET /api/reports/:id/download**
   后端定义位置:
   - routes\monitoring.js:557

130. **GET /api/overview**
   后端定义位置:
   - routes\performance.js:16

131. **GET /api/database**
   后端定义位置:
   - routes\performance.js:32

132. **GET /api/cache**
   后端定义位置:
   - routes\performance.js:53

133. **GET /api**
   后端定义位置:
   - routes\performance.js:62

134. **GET /api/realtime**
   后端定义位置:
   - routes\performance.js:71

135. **DELETE /api/cleanup**
   后端定义位置:
   - routes\performance.js:137

136. **POST /api/visualizations**
   后端定义位置:
   - routes\performanceAccessibility.js:380

137. **POST /api/generate**
   后端定义位置:
   - routes\reports.js:121

138. **GET /api/:id/download**
   后端定义位置:
   - routes\reports.js:205

139. **GET /api/scheduled**
   后端定义位置:
   - routes\reports.js:334

140. **POST /api/scheduled**
   后端定义位置:
   - routes\reports.js:348

141. **POST /api/scheduled/:reportId/execute**
   后端定义位置:
   - routes\reports.js:398

142. **GET /api/templates**
   后端定义位置:
   - routes\reports.js:416

143. **POST /api/performance/benchmarks**
   后端定义位置:
   - routes\reports.js:451

144. **POST /api/performance/benchmarks/:benchmarkId/run**
   后端定义位置:
   - routes\reports.js:497

145. **POST /api/performance/baselines**
   后端定义位置:
   - routes\reports.js:519

146. **POST /api/performance/report**
   后端定义位置:
   - routes\reports.js:542

147. **POST /api/advanced-test**
   后端定义位置:
   - routes\security.js:21

148. **POST /api/quick-check**
   后端定义位置:
   - routes\security.js:63

149. **POST /api/export-report**
   后端定义位置:
   - routes\security.js:265

150. **POST /api/fetch-page**
   后端定义位置:
   - routes\seo.js:72

151. **POST /api/fetch-robots**
   后端定义位置:
   - routes\seo.js:171

152. **POST /api/fetch-sitemap**
   后端定义位置:
   - routes\seo.js:221

153. **POST /api/archive**
   后端定义位置:
   - routes\storageManagement.js:66

154. **POST /api/maintenance**
   后端定义位置:
   - routes\storageManagement.js:158

155. **GET /api/configuration**
   后端定义位置:
   - routes\storageManagement.js:215

156. **PUT /api/configuration**
   后端定义位置:
   - routes\storageManagement.js:247

157. **GET /api/engines/:engineType/policy**
   后端定义位置:
   - routes\storageManagement.js:302

158. **PUT /api/engines/:engineType/policy**
   后端定义位置:
   - routes\storageManagement.js:356

159. **GET /api/usage**
   后端定义位置:
   - routes\storageManagement.js:420

160. **GET /api/resources**
   后端定义位置:
   - routes\system.js:34

161. **GET /api/k6/status**
   后端定义位置:
   - routes\test.js:349
   - routes\test.js:3630

162. **POST /api/k6/install**
   后端定义位置:
   - routes\test.js:387

163. **POST /api/lighthouse/run**
   后端定义位置:
   - routes\test.js:449

164. **POST /api/playwright/run**
   后端定义位置:
   - routes\test.js:526

165. **GET /api/history/legacy**
   后端定义位置:
   - routes\test.js:702

166. **GET /api/history/enhanced**
   后端定义位置:
   - routes\test.js:710

167. **POST /api/history/batch**
   后端定义位置:
   - routes\test.js:784

168. **POST /api/run**
   后端定义位置:
   - routes\test.js:895
   - routes\tests.js:8

169. **GET /api/queue/status**
   后端定义位置:
   - routes\test.js:969

170. **POST /api/:testId/cancel**
   后端定义位置:
   - routes\test.js:994

171. **GET /api/cache/stats**
   后端定义位置:
   - routes\test.js:1023

172. **POST /api/cache/flush**
   后端定义位置:
   - routes\test.js:1041

173. **POST /api/cache/invalidate**
   后端定义位置:
   - routes\test.js:1059

174. **GET /api/:testId/result**
   后端定义位置:
   - routes\test.js:1110

175. **POST /api/:testId/stop**
   后端定义位置:
   - routes\test.js:1141

176. **GET /api/config/templates**
   后端定义位置:
   - routes\test.js:1164

177. **POST /api/config/templates**
   后端定义位置:
   - routes\test.js:1186

178. **POST /api/history**
   后端定义位置:
   - routes\test.js:1222

179. **PUT /api/history/:recordId**
   后端定义位置:
   - routes\test.js:1242

180. **GET /api/history/:recordId**
   后端定义位置:
   - routes\test.js:1270

181. **POST /api/history/:recordId/start**
   后端定义位置:
   - routes\test.js:1307

182. **POST /api/history/:recordId/progress**
   后端定义位置:
   - routes\test.js:1323

183. **POST /api/history/:recordId/complete**
   后端定义位置:
   - routes\test.js:1339

184. **POST /api/history/:recordId/fail**
   后端定义位置:
   - routes\test.js:1355

185. **POST /api/history/:recordId/cancel**
   后端定义位置:
   - routes\test.js:1372

186. **GET /api/history/:recordId/progress**
   后端定义位置:
   - routes\test.js:1389

187. **DELETE /api/history/:recordId**
   后端定义位置:
   - routes\test.js:1405

188. **GET /api/:testId**
   后端定义位置:
   - routes\test.js:1556
   - routes\testHistory.js:124

189. **POST /api/website**
   后端定义位置:
   - routes\test.js:1582

190. **GET /api/stress/status/:testId**
   后端定义位置:
   - routes\test.js:1624

191. **POST /api/stress/cancel/:testId**
   后端定义位置:
   - routes\test.js:1712

192. **POST /api/stress/stop/:testId**
   后端定义位置:
   - routes\test.js:1758

193. **GET /api/stress/running**
   后端定义位置:
   - routes\test.js:1786

194. **POST /api/stress/cleanup-all**
   后端定义位置:
   - routes\test.js:1815

195. **POST /api/stress**
   后端定义位置:
   - routes\test.js:1902

196. **POST /api/security**
   后端定义位置:
   - routes\test.js:2268

197. **GET /api/security/history**
   后端定义位置:
   - routes\test.js:2347

198. **GET /api/security/statistics**
   后端定义位置:
   - routes\test.js:2385

199. **GET /api/security/:testId**
   后端定义位置:
   - routes\test.js:2401

200. **DELETE /api/security/:testId**
   后端定义位置:
   - routes\test.js:2422

201. **POST /api/performance/page-speed**
   后端定义位置:
   - routes\test.js:2530

202. **POST /api/performance/core-web-vitals**
   后端定义位置:
   - routes\test.js:2577

203. **POST /api/compatibility**
   后端定义位置:
   - routes\test.js:2618

204. **POST /api/caniuse**
   后端定义位置:
   - routes\test.js:2670

205. **POST /api/browserstack**
   后端定义位置:
   - routes\test.js:2694

206. **POST /api/local-compatibility**
   后端定义位置:
   - routes\test.js:2900

207. **POST /api/performance/resources**
   后端定义位置:
   - routes\test.js:2937

208. **POST /api/performance/save**
   后端定义位置:
   - routes\test.js:2994

209. **POST /api/pagespeed**
   后端定义位置:
   - routes\test.js:3127

210. **POST /api/gtmetrix**
   后端定义位置:
   - routes\test.js:3176

211. **POST /api/webpagetest**
   后端定义位置:
   - routes\test.js:3230

212. **POST /api/lighthouse**
   后端定义位置:
   - routes\test.js:3273

213. **POST /api/local-performance**
   后端定义位置:
   - routes\test.js:3341

214. **POST /api/ux**
   后端定义位置:
   - routes\test.js:3383

215. **POST /api/seo**
   后端定义位置:
   - routes\test.js:3467

216. **POST /api/accessibility**
   后端定义位置:
   - routes\test.js:3503

217. **DELETE /api/:testId**
   后端定义位置:
   - routes\test.js:3602
   - routes\testHistory.js:172

218. **GET /api/:engine/status**
   后端定义位置:
   - routes\test.js:3730

219. **POST /api/proxy-latency**
   后端定义位置:
   - routes\test.js:3874

220. **POST /api/proxy-test**
   后端定义位置:
   - routes\test.js:4062

221. **GET /api/geo-status**
   后端定义位置:
   - routes\test.js:4255

222. **POST /api/geo-update**
   后端定义位置:
   - routes\test.js:4266

223. **PUT /api/geo-config**
   后端定义位置:
   - routes\test.js:4286

224. **POST /api/proxy-analyze**
   后端定义位置:
   - routes\test.js:4311

225. **GET /api/engines**
   后端定义位置:
   - routes\testEngine.js:16

226. **GET /api/engines/:engineType/status**
   后端定义位置:
   - routes\testEngine.js:35

227. **POST /api/test/:testType**
   后端定义位置:
   - routes\testEngine.js:62

228. **GET /api/test/:testId/status**
   后端定义位置:
   - routes\testEngine.js:122

229. **GET /api/test/:testId/result**
   后端定义位置:
   - routes\testEngine.js:143

230. **POST /api/test/:testId/stop**
   后端定义位置:
   - routes\testEngine.js:164

231. **POST /api/comprehensive**
   后端定义位置:
   - routes\testEngine.js:186

232. **POST /api/batch-delete**
   后端定义位置:
   - routes\testHistory.js:215

233. **GET /api/results/:executionId**
   后端定义位置:
   - routes\tests.js:35

234. **GET /api/config/:testType**
   后端定义位置:
   - routes\tests.js:58

235. **GET /api/profile**
   后端定义位置:
   - routes\user.js:17

236. **PUT /api/profile**
   后端定义位置:
   - routes\user.js:59

237. **GET /api/preferences**
   后端定义位置:
   - routes\user.js:141

238. **PUT /api/preferences**
   后端定义位置:
   - routes\user.js:167

239. **GET /api/activity**
   后端定义位置:
   - routes\user.js:220

240. **DELETE /api/account**
   后端定义位置:
   - routes\user.js:263

241. **GET /api/notifications**
   后端定义位置:
   - routes\user.js:308

242. **GET /api/stats/:userId**
   后端定义位置:
   - routes\user.js:360

## 📊 数据模型一致性分析

- 前端类型定义: 900 个
- 后端数据表: 96 个

