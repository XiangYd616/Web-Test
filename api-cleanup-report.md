# API清理分析报告

**生成时间**: 2025-08-24T10:31:47.274Z

## 📊 清理统计概览

- 前端API调用: 104 个
- 后端API定义: 296 个
- 未使用API: 229 个
- 可能未使用API: 3 个
- 需要清理的文件: 0 个

## 🗑️ 确认未使用的API

以下API在后端定义但前端未使用，建议删除：

### 1. POST /api/check

**定义位置**:
- routes\accessibility.js:15

### 2. GET /api/wcag/:param

**定义位置**:
- routes\accessibility.js:42

### 3. GET /api/recommendations

**定义位置**:
- routes\accessibility.js:94
- routes\security.js:314

### 4. GET /api/history

**定义位置**:
- routes\accessibility.js:139
- routes\test.js:664
- routes\testEngine.js:317
- routes\tests.js:89

### 5. GET /api/:param/export

**定义位置**:
- routes\accessibility.js:185

### 6. GET /api/stats

**定义位置**:
- routes\accessibility.js:222
- routes\admin.js:19
- routes\alerts.js:89
- routes\backup.js:258
- routes\databaseHealth.js:73
- routes\errorManagement.js:17
- routes\errors.js:93
- routes\monitoring.js:372
- routes\test.js:1495

### 7. GET /api/keyboard

**定义位置**:
- routes\accessibility.js:278

### 8. GET /api/screen-reader

**定义位置**:
- routes\accessibility.js:319

### 9. GET /api/contrast

**定义位置**:
- routes\accessibility.js:361

### 10. GET /api/users

**定义位置**:
- routes\admin.js:45

### 11. PUT /api/users/:param/status

**定义位置**:
- routes\admin.js:98

### 12. GET /api/logs

**定义位置**:
- routes\admin.js:129
- routes\errorManagement.js:57

### 13. GET /api/test-history

**定义位置**:
- routes\admin.js:182
- routes\dataManagement.js:49
- routes\security.js:103

### 14. GET /api

**定义位置**:
- routes\alerts.js:47
- routes\config.js:16
- routes\files.js:131
- routes\integrations.js:59
- routes\performance.js:62
- routes\reports.js:73
- routes\test.js:644
- routes\testHistory.js:26

### 15. PUT /api/:param/acknowledge

**定义位置**:
- routes\alerts.js:113

### 16. PUT /api/:param/resolve

**定义位置**:
- routes\alerts.js:148

### 17. POST /api/batch

**定义位置**:
- routes\alerts.js:183
- routes\data.js:181
- routes\testEngine.js:263

### 18. POST /api/test-notification

**定义位置**:
- routes\alerts.js:300

### 19. GET /api/rules

**定义位置**:
- routes\alerts.js:327

### 20. PUT /api/rules

**定义位置**:
- routes\alerts.js:350

### 21. GET /api/history/stats

**定义位置**:
- routes\alerts.js:374

### 22. POST /api/trend

**定义位置**:
- routes\analytics.js:17

### 23. POST /api/compare

**定义位置**:
- routes\analytics.js:37

### 24. POST /api/performance

**定义位置**:
- routes\analytics.js:57
- routes\test.js:2487

### 25. POST /api/insights

**定义位置**:
- routes\analytics.js:73

### 26. POST /api/register

**定义位置**:
- routes\auth.js:25

### 27. POST /api/login

**定义位置**:
- routes\auth.js:118

### 28. POST /api/verify

**定义位置**:
- routes\auth.js:264

### 29. GET /api/me

**定义位置**:
- routes\auth.js:328

### 30. POST /api/refresh

**定义位置**:
- routes\auth.js:364

### 31. POST /api/logout

**定义位置**:
- routes\auth.js:370

### 32. PUT /api/change-password

**定义位置**:
- routes\auth.js:384

### 33. POST /api/forgot-password

**定义位置**:
- routes\auth.js:455

### 34. POST /api/reset-password

**定义位置**:
- routes\auth.js:504

### 35. POST /api/send-verification

**定义位置**:
- routes\auth.js:557

### 36. POST /api/verify-email

**定义位置**:
- routes\auth.js:592

### 37. POST /api/create/full

**定义位置**:
- routes\backup.js:51

### 38. POST /api/create/incremental

**定义位置**:
- routes\backup.js:72

### 39. GET /api/list

**定义位置**:
- routes\backup.js:93

### 40. POST /api/restore/:param

**定义位置**:
- routes\backup.js:118

### 41. GET /api/download/:param

**定义位置**:
- routes\backup.js:163
- routes\batch.js:219
- routes\files.js:192

### 42. POST /api/cleanup

**定义位置**:
- routes\backup.js:239
- routes\dataExport.js:308
- routes\errorManagement.js:363
- routes\storageManagement.js:108

### 43. POST /api/schedule/start

**定义位置**:
- routes\backup.js:300

### 44. POST /api/schedule/stop

**定义位置**:
- routes\backup.js:318

### 45. POST /api/verify/:param

**定义位置**:
- routes\backup.js:337

### 46. POST /api/export

**定义位置**:
- routes\batch.js:81
- routes\dataManagement.js:78
- routes\performanceAccessibility.js:239

### 47. POST /api/delete

**定义位置**:
- routes\batch.js:113

### 48. POST /api/cancel/:param

**定义位置**:
- routes\batch.js:163

### 49. GET /api/results/:param

**定义位置**:
- routes\batch.js:192
- routes\tests.js:35

### 50. PUT /api

**定义位置**:
- routes\config.js:105

### 51. GET /api/meta/schema

**定义位置**:
- routes\config.js:161

### 52. GET /api/meta/history

**定义位置**:
- routes\config.js:188

### 53. POST /api/meta/rollback

**定义位置**:
- routes\config.js:222

### 54. POST /api/meta/reset

**定义位置**:
- routes\config.js:250

### 55. GET /api/meta/status

**定义位置**:
- routes\config.js:311

### 56. POST /api/meta/validate

**定义位置**:
- routes\config.js:331

### 57. GET /api/meta/export

**定义位置**:
- routes\config.js:380

### 58. POST /api/meta/import

**定义位置**:
- routes\config.js:414

### 59. POST /api/:param/export

**定义位置**:
- routes\data.js:211

### 60. POST /api/:param/import

**定义位置**:
- routes\data.js:231

### 61. POST /api/backup

**定义位置**:
- routes\data.js:285

### 62. GET /api/types

**定义位置**:
- routes\data.js:304

### 63. GET /api/export-formats

**定义位置**:
- routes\data.js:323

### 64. POST /api/test-connection

**定义位置**:
- routes\databaseHealth.js:90

### 65. GET /api/slow-queries

**定义位置**:
- routes\databaseHealth.js:108

### 66. GET /api/pool

**定义位置**:
- routes\databaseHealth.js:135

### 67. POST /api/reconnect

**定义位置**:
- routes\databaseHealth.js:162

### 68. POST /api/create

**定义位置**:
- routes\dataExport.js:92

### 69. GET /api/task/:param/status

**定义位置**:
- routes\dataExport.js:125
- routes\dataImport.js:139

### 70. GET /api/tasks

**定义位置**:
- routes\dataExport.js:150
- routes\dataImport.js:221

### 71. POST /api/task/:param/cancel

**定义位置**:
- routes\dataExport.js:175
- routes\dataImport.js:246

### 72. GET /api/task/:param/download

**定义位置**:
- routes\dataExport.js:201

### 73. DELETE /api/task/:param

**定义位置**:
- routes\dataExport.js:261
- routes\dataImport.js:272

### 74. POST /api/test-history

**定义位置**:
- routes\dataExport.js:333

### 75. GET /api/config

**定义位置**:
- routes\dataExport.js:361
- routes\dataImport.js:439

### 76. POST /api/upload

**定义位置**:
- routes\dataImport.js:105
- routes\files.js:71

### 77. GET /api/task/:param/preview

**定义位置**:
- routes\dataImport.js:164

### 78. POST /api/task/:param/start

**定义位置**:
- routes\dataImport.js:195

### 79. GET /api/mapping-template/:param

**定义位置**:
- routes\dataImport.js:320

### 80. POST /api/validate

**定义位置**:
- routes\dataImport.js:397

### 81. GET /api/exports

**定义位置**:
- routes\dataManagement.js:21

### 82. GET /api/imports

**定义位置**:
- routes\dataManagement.js:35

### 83. GET /api/statistics

**定义位置**:
- routes\dataManagement.js:63
- routes\security.js:221
- routes\storageManagement.js:43
- routes\test.js:722

### 84. DELETE /api/test-history/batch

**定义位置**:
- routes\dataManagement.js:92

### 85. POST /api/query

**定义位置**:
- routes\dataManagement.js:107

### 86. GET /api/analytics

**定义位置**:
- routes\dataManagement.js:210
- routes\monitoring.js:427
- routes\test.js:1430

### 87. POST /api/exports

**定义位置**:
- routes\dataManagement.js:266

### 88. POST /api/imports

**定义位置**:
- routes\dataManagement.js:292

### 89. POST /api/restart/:param

**定义位置**:
- routes\engineStatus.js:120

### 90. GET /api/capabilities

**定义位置**:
- routes\engineStatus.js:163

### 91. GET /api/alerts

**定义位置**:
- routes\errorManagement.js:115
- routes\monitoring.js:270

### 92. POST /api/test-alerts

**定义位置**:
- routes\errorManagement.js:159

### 93. POST /api/send-alert

**定义位置**:
- routes\errorManagement.js:184

### 94. POST /api/alert-rules

**定义位置**:
- routes\errorManagement.js:250

### 95. GET /api/export

**定义位置**:
- routes\errorManagement.js:285
- routes\monitoring.js:454
- routes\testHistory.js:268

### 96. GET /api/trends

**定义位置**:
- routes\errorManagement.js:390

### 97. POST /api/report

**定义位置**:
- routes\errors.js:18

### 98. PUT /api/:param/metadata

**定义位置**:
- routes\files.js:289

### 99. POST /api

**定义位置**:
- routes\integrations.js:91
- routes\performanceAccessibility.js:111

### 100. GET /api/cicd/platforms

**定义位置**:
- routes\integrations.js:196

### 101. POST /api/cicd

**定义位置**:
- routes\integrations.js:210

### 102. POST /api/cicd/:param/trigger

**定义位置**:
- routes\integrations.js:254

### 103. GET /api/cicd

**定义位置**:
- routes\integrations.js:277

### 104. POST /api/webhook/:param

**定义位置**:
- routes\integrations.js:291

### 105. GET /api/cicd/templates/:param

**定义位置**:
- routes\integrations.js:315

### 106. POST /api/v1/data-export/:param

**定义位置**:
- routes\missing-apis.js:504

### 107. GET /api/sites

**定义位置**:
- routes\monitoring.js:52

### 108. POST /api/sites

**定义位置**:
- routes\monitoring.js:80

### 109. GET /api/sites/:param

**定义位置**:
- routes\monitoring.js:110

### 110. PUT /api/sites/:param

**定义位置**:
- routes\monitoring.js:146

### 111. DELETE /api/sites/:param

**定义位置**:
- routes\monitoring.js:182

### 112. POST /api/sites/:param/check

**定义位置**:
- routes\monitoring.js:217

### 113. GET /api/sites/:param/history

**定义位置**:
- routes\monitoring.js:241

### 114. PUT /api/alerts/:param/read

**定义位置**:
- routes\monitoring.js:299

### 115. POST /api/alerts/batch

**定义位置**:
- routes\monitoring.js:334

### 116. POST /api/reports

**定义位置**:
- routes\monitoring.js:492

### 117. GET /api/reports

**定义位置**:
- routes\monitoring.js:530

### 118. GET /api/reports/:param/download

**定义位置**:
- routes\monitoring.js:557

### 119. GET /api/overview

**定义位置**:
- routes\performance.js:16

### 120. GET /api/database

**定义位置**:
- routes\performance.js:32

### 121. GET /api/cache

**定义位置**:
- routes\performance.js:53

### 122. GET /api/realtime

**定义位置**:
- routes\performance.js:71

### 123. DELETE /api/cleanup

**定义位置**:
- routes\performance.js:137

### 124. POST /api/visualizations

**定义位置**:
- routes\performanceAccessibility.js:380

### 125. POST /api/generate

**定义位置**:
- routes\reports.js:121

### 126. GET /api/:param/download

**定义位置**:
- routes\reports.js:205

### 127. GET /api/scheduled

**定义位置**:
- routes\reports.js:334

### 128. POST /api/scheduled

**定义位置**:
- routes\reports.js:348

### 129. POST /api/scheduled/:param/execute

**定义位置**:
- routes\reports.js:398

### 130. GET /api/templates

**定义位置**:
- routes\reports.js:416

### 131. POST /api/performance/benchmarks

**定义位置**:
- routes\reports.js:451

### 132. POST /api/performance/benchmarks/:param/run

**定义位置**:
- routes\reports.js:497

### 133. POST /api/performance/baselines

**定义位置**:
- routes\reports.js:519

### 134. POST /api/performance/report

**定义位置**:
- routes\reports.js:542

### 135. POST /api/advanced-test

**定义位置**:
- routes\security.js:21

### 136. POST /api/quick-check

**定义位置**:
- routes\security.js:63

### 137. POST /api/export-report

**定义位置**:
- routes\security.js:265

### 138. POST /api/fetch-page

**定义位置**:
- routes\seo.js:72

### 139. POST /api/fetch-robots

**定义位置**:
- routes\seo.js:171

### 140. POST /api/fetch-sitemap

**定义位置**:
- routes\seo.js:221

### 141. POST /api/archive

**定义位置**:
- routes\storageManagement.js:66

### 142. POST /api/maintenance

**定义位置**:
- routes\storageManagement.js:158

### 143. GET /api/configuration

**定义位置**:
- routes\storageManagement.js:215

### 144. PUT /api/configuration

**定义位置**:
- routes\storageManagement.js:247

### 145. GET /api/engines/:param/policy

**定义位置**:
- routes\storageManagement.js:302

### 146. PUT /api/engines/:param/policy

**定义位置**:
- routes\storageManagement.js:356

### 147. GET /api/usage

**定义位置**:
- routes\storageManagement.js:420

### 148. GET /api/resources

**定义位置**:
- routes\system.js:34

### 149. GET /api/k6/status

**定义位置**:
- routes\test.js:349
- routes\test.js:3630

### 150. POST /api/k6/install

**定义位置**:
- routes\test.js:387

### 151. GET /api/lighthouse/status

**定义位置**:
- routes\test.js:403
- routes\test.js:3668

### 152. POST /api/lighthouse/install

**定义位置**:
- routes\test.js:434

### 153. POST /api/lighthouse/run

**定义位置**:
- routes\test.js:449

### 154. GET /api/playwright/status

**定义位置**:
- routes\test.js:480
- routes\test.js:3699

### 155. POST /api/playwright/install

**定义位置**:
- routes\test.js:511

### 156. POST /api/playwright/run

**定义位置**:
- routes\test.js:526

### 157. GET /api/history/legacy

**定义位置**:
- routes\test.js:702

### 158. GET /api/history/enhanced

**定义位置**:
- routes\test.js:710

### 159. POST /api/history/batch

**定义位置**:
- routes\test.js:784

### 160. POST /api/run

**定义位置**:
- routes\test.js:895
- routes\tests.js:8

### 161. GET /api/queue/status

**定义位置**:
- routes\test.js:969

### 162. POST /api/:param/cancel

**定义位置**:
- routes\test.js:994

### 163. GET /api/cache/stats

**定义位置**:
- routes\test.js:1023

### 164. POST /api/cache/flush

**定义位置**:
- routes\test.js:1041

### 165. POST /api/cache/invalidate

**定义位置**:
- routes\test.js:1059

### 166. GET /api/:param/result

**定义位置**:
- routes\test.js:1110

### 167. GET /api/config/templates

**定义位置**:
- routes\test.js:1164

### 168. POST /api/config/templates

**定义位置**:
- routes\test.js:1186

### 169. POST /api/history

**定义位置**:
- routes\test.js:1222

### 170. PUT /api/history/:param

**定义位置**:
- routes\test.js:1242

### 171. GET /api/history/:param

**定义位置**:
- routes\test.js:1270

### 172. POST /api/history/:param/start

**定义位置**:
- routes\test.js:1307

### 173. POST /api/history/:param/progress

**定义位置**:
- routes\test.js:1323

### 174. POST /api/history/:param/complete

**定义位置**:
- routes\test.js:1339

### 175. POST /api/history/:param/fail

**定义位置**:
- routes\test.js:1355

### 176. POST /api/history/:param/cancel

**定义位置**:
- routes\test.js:1372

### 177. GET /api/history/:param/progress

**定义位置**:
- routes\test.js:1389

### 178. DELETE /api/history/:param

**定义位置**:
- routes\test.js:1405

### 179. POST /api/website

**定义位置**:
- routes\test.js:1582

### 180. GET /api/stress/status/:param

**定义位置**:
- routes\test.js:1624

### 181. POST /api/stress/cancel/:param

**定义位置**:
- routes\test.js:1712

### 182. POST /api/stress/stop/:param

**定义位置**:
- routes\test.js:1758

### 183. GET /api/stress/running

**定义位置**:
- routes\test.js:1786

### 184. POST /api/stress/cleanup-all

**定义位置**:
- routes\test.js:1815

### 185. POST /api/stress

**定义位置**:
- routes\test.js:1902

### 186. POST /api/security

**定义位置**:
- routes\test.js:2268

### 187. GET /api/security/history

**定义位置**:
- routes\test.js:2347

### 188. GET /api/security/statistics

**定义位置**:
- routes\test.js:2385

### 189. GET /api/security/:param

**定义位置**:
- routes\test.js:2401

### 190. DELETE /api/security/:param

**定义位置**:
- routes\test.js:2422

### 191. POST /api/performance/page-speed

**定义位置**:
- routes\test.js:2530

### 192. POST /api/performance/core-web-vitals

**定义位置**:
- routes\test.js:2577

### 193. POST /api/compatibility

**定义位置**:
- routes\test.js:2618

### 194. POST /api/caniuse

**定义位置**:
- routes\test.js:2670

### 195. POST /api/browserstack

**定义位置**:
- routes\test.js:2694

### 196. POST /api/feature-detection

**定义位置**:
- routes\test.js:2732
- routes\test.js:2863

### 197. POST /api/local-compatibility

**定义位置**:
- routes\test.js:2900

### 198. POST /api/performance/resources

**定义位置**:
- routes\test.js:2937

### 199. POST /api/performance/save

**定义位置**:
- routes\test.js:2994

### 200. POST /api/pagespeed

**定义位置**:
- routes\test.js:3127

### 201. POST /api/gtmetrix

**定义位置**:
- routes\test.js:3176

### 202. POST /api/webpagetest

**定义位置**:
- routes\test.js:3230

### 203. POST /api/lighthouse

**定义位置**:
- routes\test.js:3273

### 204. POST /api/local-performance

**定义位置**:
- routes\test.js:3341

### 205. POST /api/ux

**定义位置**:
- routes\test.js:3383

### 206. POST /api/seo

**定义位置**:
- routes\test.js:3467

### 207. POST /api/accessibility

**定义位置**:
- routes\test.js:3503

### 208. POST /api-test

**定义位置**:
- routes\test.js:3537

### 209. POST /api/proxy-latency

**定义位置**:
- routes\test.js:3874

### 210. POST /api/proxy-test

**定义位置**:
- routes\test.js:4062

### 211. GET /api/geo-status

**定义位置**:
- routes\test.js:4255

### 212. POST /api/geo-update

**定义位置**:
- routes\test.js:4266

### 213. PUT /api/geo-config

**定义位置**:
- routes\test.js:4286

### 214. POST /api/proxy-analyze

**定义位置**:
- routes\test.js:4311

### 215. GET /api/engines

**定义位置**:
- routes\testEngine.js:16

### 216. GET /api/engines/:param/status

**定义位置**:
- routes\testEngine.js:35

### 217. GET /api/test/:param/result

**定义位置**:
- routes\testEngine.js:143

### 218. POST /api/test/:param/stop

**定义位置**:
- routes\testEngine.js:164

### 219. POST /api/comprehensive

**定义位置**:
- routes\testEngine.js:186

### 220. POST /api/batch-delete

**定义位置**:
- routes\testHistory.js:215

### 221. GET /api/config/:param

**定义位置**:
- routes\tests.js:58

### 222. GET /api/profile

**定义位置**:
- routes\user.js:17

### 223. PUT /api/profile

**定义位置**:
- routes\user.js:59

### 224. GET /api/preferences

**定义位置**:
- routes\user.js:141

### 225. PUT /api/preferences

**定义位置**:
- routes\user.js:167

### 226. GET /api/activity

**定义位置**:
- routes\user.js:220

### 227. DELETE /api/account

**定义位置**:
- routes\user.js:263

### 228. GET /api/notifications

**定义位置**:
- routes\user.js:308

### 229. GET /api/stats/:param

**定义位置**:
- routes\user.js:360

## ⚠️ 可能未使用的API

以下API可能未被使用，需要进一步确认：

### 1. GET /api/status/:param

**原因**: 系统内部API，可能被其他服务使用

**定义位置**:
- routes\batch.js:142
- routes\engineStatus.js:59

### 2. GET /api/status

**原因**: 系统内部API，可能被其他服务使用

**定义位置**:
- routes\databaseHealth.js:29
- routes\engineStatus.js:15
- routes\errorManagement.js:224
- routes\performanceAccessibility.js:315
- routes\storageManagement.js:15
- routes\test.js:560

### 3. GET /api/metrics

**原因**: 系统内部API，可能被其他服务使用

**定义位置**:
- routes\databaseHealth.js:47

## 📱 前端使用的API

- /api/auth/change-password
- /api/auth/check-batch-permissions
- /api/auth/check-permission
- /api/auth/login
- /api/auth/logout
- /api/auth/permissions
- /api/auth/profile
- /api/auth/register
- /api/auth/roles
- /api/auth/validate
- /api/content-test
- /api/data-management/backup
- /api/data-management/cleanup
- /api/data-management/statistics
- /api/data-management/stats
- /api/data-management/test-history/batch
- /api/errors/report
- /api/health
- /api/monitoring/alerts
- /api/monitoring/alerts/:param/resolve
- /api/monitoring/realtime
- /api/monitoring/sites
- /api/monitoring/sites/:param
- /api/monitoring/start
- /api/monitoring/stats
- /api/monitoring/status
- /api/monitoring/stop
- /api/monitoring/targets
- /api/monitoring/targets/:param
- /api/monitoring/targets/:param/check
- /api/monitoring/targets/batch
- /api/reports/generate
- /api/reports/tasks
- /api/reports/tasks/:param/download
- /api/stress-test/status/:param
- /api/system/resources
- /api/test
- /api/test-results
- /api/test/:param
- /api/test/:param/cancel
- /api/test/:param/export
- /api/test/:param/status
- /api/test/api/engines
- /api/test/browserstack
- /api/test/caniuse
- /api/test/compatibility/engines
- /api/test/configurations
- /api/test/configurations/:param
- /api/test/database
- /api/test/feature-detection
- /api/test/history
- /api/test/history/:param
- /api/test/history/:param/complete
- /api/test/history/:param/fail
- /api/test/history/:param/progress
- /api/test/history/:param/start
- /api/test/history/batch
- /api/test/history/batch-delete
- /api/test/history/enhanced
- /api/test/k6/install
- /api/test/k6/status
- /api/test/lighthouse/install
- /api/test/lighthouse/run
- /api/test/lighthouse/status
- /api/test/local
- /api/test/network
- /api/test/performance
- /api/test/playwright/install
- /api/test/playwright/run
- /api/test/playwright/status
- /api/test/proxy-analyze
- /api/test/proxy-latency
- /api/test/security
- /api/test/security/engines
- /api/test/start
- /api/test/statistics
- /api/test/status
- /api/test/stress
- /api/test/stress/cancel/:param
- /api/test/stress/engines
- /api/test/stress/status/:param
- /api/test/ux
- /api/user/bookmarks/:param
- /api/user/notifications
- /api/user/notifications/:param
- /api/user/notifications/:param/read
- /api/user/stats/:param
- /api/user/tests
- /api/user/tests/:param
- /api/v1/alerts
- /api/v1/alerts/:param
- /api/v1/alerts/:param/acknowledge
- /api/v1/alerts/:param/resolve
- /api/v1/alerts/batch
- /api/v1/alerts/rules
- /api/v1/alerts/stats
- /api/v1/alerts/test-notification
- /api/v1/analytics/performance
- /api/v1/data-export/task/:param/download
- /api/v1/data-export:param
- delete
- get
- post
- put

