# 路由架构重构 - 待办事项清单

**创建日期**: 2025-10-06  
**基于**: 路由架构重构项目完成后的剩余任务  
**项目**: Test-Web-backend  

---

## 🔴 Issue #1: 前端更新API路径 (高优先级)

### 标签
`frontend` `breaking-change` `urgent` `api`

### 优先级
🔴 高 (P0)

### 描述
后端已移除所有 `/api` 前缀，采用RESTful设计。前端需要更新所有API调用路径。

### 背景
- 后端Commit: `6503768`
- 路由架构已完全重构
- 18个主路由已启用
- 破坏性变更，必须更新

### 任务清单
- [ ] 阅读迁移指南 `docs/FRONTEND_API_CHANGES.md`
- [ ] 更新环境变量配置（移除 `/api` 前缀）
- [ ] 全局搜索替换API路径
  - [ ] 认证相关: `/api/auth/*` → `/auth/*`
  - [ ] 测试相关: `/api/tests/*` → `/tests/*`
  - [ ] 引擎相关: `/api/engines/*` → `/engines/*`
  - [ ] 用户相关: `/api/users/*` → `/users/*`
  - [ ] 管理相关: `/api/admin/*` → `/admin/*`
  - [ ] 报告相关: `/api/reports/*` → `/reports/*`
  - [ ] 监控相关: `/api/monitoring/*` → `/monitoring/*`
  - [ ] SEO相关: `/api/seo/*` → `/seo/*`
  - [ ] 安全相关: `/api/security/*` → `/security/*`
  - [ ] 系统相关: `/api/system/*` → `/system/*`
- [ ] 更新API client/service层
- [ ] 更新所有API调用代码
- [ ] 全面测试所有功能
  - [ ] 登录/注册流程
  - [ ] 测试执行流程
  - [ ] 数据查询和展示
  - [ ] 管理后台功能
- [ ] 更新前端API文档
- [ ] 处理可能的404错误

### 新增端点
前端可能需要集成的新端点：
- `/error-management` - 错误日志管理
- `/storage` - 存储空间管理
- `/network` - 网络诊断测试
- `/scheduler` - 任务调度管理
- `/batch` - 批量测试执行

### 预估工时
2-3天

### 依赖
- 后端路由重构已完成 ✅
- 迁移指南已提供 ✅

### 参考文档
- `docs/FRONTEND_API_CHANGES.md` - 详细迁移指南
- `PROJECT-COMPLETION-SUMMARY.md` - 项目总结
- `ROUTE-AUDIT-REPORT.md` - 路由架构说明

### 验收标准
- [ ] 所有API调用路径已更新
- [ ] 所有功能测试通过
- [ ] 没有404错误
- [ ] API响应时间正常
- [ ] 前端文档已更新

---

## 🟡 Issue #2: 集成OAuth和MFA到认证路由 (中优先级)

### 标签
`backend` `refactor` `auth` `tech-debt`

### 优先级
🟡 中 (P1)

### 描述
将独立的OAuth和MFA路由文件集成到主认证路由 `auth.js` 中。

### 背景
- `oauth.js` 和 `mfa.js` 是独立文件
- 功能上属于认证模块
- 应该集成到 `routes/auth.js` 实现统一管理

### 任务清单
- [ ] 审查 `routes/oauth.js` 内容
  - [ ] 提取OAuth路由
  - [ ] 识别依赖和中间件
  - [ ] 评估与现有auth.js的兼容性
- [ ] 审查 `routes/mfa.js` 内容
  - [ ] 提取MFA路由
  - [ ] 识别依赖和中间件
  - [ ] 评估与现有auth.js的兼容性
- [ ] 集成到 `routes/auth.js`
  - [ ] 添加OAuth相关路由
    - `POST /auth/oauth/authorize`
    - `GET /auth/oauth/callback`
    - `POST /auth/oauth/refresh`
  - [ ] 添加MFA相关路由
    - `POST /auth/mfa/setup`
    - `POST /auth/mfa/verify`
    - `POST /auth/mfa/disable`
    - `GET /auth/mfa/status`
- [ ] 更新 `app.js`（如果需要）
- [ ] 测试所有认证流程
- [ ] 备份原文件到 `.cleanup-backup/`
- [ ] 更新API文档

### 预估工时
2小时

### 依赖
无

### 文件位置
- 源文件: `backend/routes/oauth.js`, `backend/routes/mfa.js`
- 目标文件: `backend/routes/auth.js`
- 备份位置: `backend/routes/.cleanup-backup/`

### 验收标准
- [ ] OAuth功能正常工作
- [ ] MFA功能正常工作
- [ ] 原文件已备份
- [ ] 测试通过
- [ ] 文档已更新

---

## 🟡 Issue #3: 集成数据管理路由 (中优先级)

### 标签
`backend` `refactor` `data` `tech-debt`

### 优先级
🟡 中 (P1)

### 描述
将分散的数据管理相关路由文件统一到一个数据管理路由中。

### 背景
- `data.js`, `dataExport.js`, `dataImport.js` 是独立文件
- 功能上都是数据管理相关
- 应该统一管理

### 任务清单
- [ ] 创建统一的数据管理路由文件
  - [ ] `routes/data-management.js` 或
  - [ ] 扩展现有的数据相关路由
- [ ] 集成 `data.js` 内容
  - [ ] 数据查询路由
  - [ ] 数据操作路由
- [ ] 集成 `dataExport.js` 内容
  - [ ] 导出功能
  - [ ] 格式支持（CSV, JSON, Excel）
- [ ] 集成 `dataImport.js` 内容
  - [ ] 导入功能
  - [ ] 验证逻辑
- [ ] 在 `app.js` 中注册路由
  - [ ] `app.use('/data', dataManagementRoutes)`
- [ ] 备份原文件
- [ ] 测试所有数据操作
- [ ] 更新API文档

### 建议路由结构
```javascript
/data
  GET  /           - 获取数据列表
  POST /           - 创建数据
  GET  /:id        - 获取单个数据
  PUT  /:id        - 更新数据
  DELETE /:id      - 删除数据
  POST /export     - 导出数据
  POST /import     - 导入数据
  GET  /export/:id - 下载导出文件
```

### 预估工时
3小时

### 依赖
无

### 验收标准
- [ ] 所有数据功能正常
- [ ] 导入导出功能测试通过
- [ ] 路由已注册
- [ ] 文档已更新

---

## 🟡 Issue #4: 集成系统管理路由 (中优先级)

### 标签
`backend` `refactor` `system` `tech-debt`

### 优先级
🟡 中 (P1)

### 描述
将系统相关的独立路由文件集成到 `system.js` 中。

### 背景
涉及文件：
- `config.js` - 配置管理
- `database.js` - 数据库操作
- `databaseHealth.js` - 数据库健康检查
- `environments.js` - 环境管理
- `infrastructure.js` - 基础设施
- `services.js` - 服务管理

### 任务清单
- [ ] 审查所有目标文件内容
- [ ] 规划集成结构
- [ ] 集成到 `routes/system.js`
  - [ ] 配置管理功能
  - [ ] 数据库管理功能
  - [ ] 环境管理功能
  - [ ] 基础设施监控
  - [ ] 服务状态管理
- [ ] 或者创建子路由结构
  - [ ] `routes/system/config.js`
  - [ ] `routes/system/database.js`
  - [ ] `routes/system/infrastructure.js`
- [ ] 测试所有系统功能
- [ ] 备份原文件
- [ ] 更新文档

### 预估工时
4小时

### 依赖
无

### 建议
考虑是否真的需要所有这些功能，可能有些是历史遗留代码。

### 验收标准
- [ ] 系统管理功能完整
- [ ] 所有功能测试通过
- [ ] 文档已更新

---

## 🟡 Issue #5: 评估待定路由文件的业务价值 (中优先级)

### 标签
`backend` `evaluation` `business` `decision`

### 优先级
🟡 中 (P1)

### 描述
评估13个待定路由文件的业务价值，决定保留、集成还是删除。

### 需要评估的文件
1. `accessibility.js` (4路由) - 可访问性测试
2. `analytics.js` (4路由) - 分析统计
3. `automation.js` (4路由) - 自动化测试
4. `cache.js` (0路由) - 缓存配置？
5. `clients.js` (4路由) - 客户端管理
6. `content.js` (4路由) - 内容管理
7. `core.js` (4路由) - 核心功能
8. `documentation.js` (4路由) - API文档
9. `engines/k6.js` (3路由) - 子路由，已管理
10. `engines/lighthouse.js` (4路由) - 子路由，已管理
11. `regression.js` (4路由) - 回归测试
12. `ux.js` (4路由) - UX测试
13. `website.js` (4路由) - 网站管理

### 任务清单
- [ ] 与产品/业务团队会议
  - [ ] 介绍当前路由架构
  - [ ] 逐个评估文件的业务价值
  - [ ] 确认哪些功能正在使用
  - [ ] 确认哪些功能计划使用
- [ ] 为每个文件创建决策
  - [ ] ✅ 保留并注册
  - [ ] 🔀 集成到现有路由
  - [ ] ❌ 删除（备份）
- [ ] 执行决策
- [ ] 更新路由架构文档

### 预估工时
6.5小时（包括会议和执行）

### 依赖
需要业务团队参与

### 输出
- [ ] 评估决策文档
- [ ] 更新的路由架构
- [ ] 清理后的routes目录

---

## 🟢 Issue #6: test.js 完整拆分 (低优先级)

### 标签
`backend` `refactor` `tech-debt` `large-task`

### 优先级
🟢 低 (P2)

### 描述
将4878行的 `test.js` 拆分成模块化的路由文件。

### 背景
- 当前 `test.js`: 4,878行，91个路由
- 已有基础架构：`tests/shared/` 模块
- 已有分析工具：`analyze-test-routes.js`

### 为什么是低优先级？
- 工作量大（3-4天）
- 当前系统运行正常
- 已有代理机制 `tests/index.js`
- 共享模块已建立，可以渐进式迁移

### 拆分策略
参考 `TEST-JS-REFACTOR-STRATEGY.md` 文档。

#### 建议的文件结构
```
backend/routes/tests/
├── index.js          (主入口)
├── shared/
│   ├── middleware.js (已完成)
│   ├── engines.js    (已完成)
│   └── helpers.js    (已完成)
├── history.js        (14路由) - 测试历史
├── engines.js        (11路由) - 引擎管理
├── stress.js         (6路由)  - 压力测试
├── security.js       (5路由)  - 安全测试
├── cache.js          (3路由)  - 缓存管理
├── config.js         (2路由)  - 配置管理
├── api.js            (1路由)  - API测试
├── seo.js            (1路由)  - SEO测试
├── accessibility.js  (1路由)  - 可访问性测试
├── ux.js             (1路由)  - UX测试
├── queue.js          (1路由)  - 队列管理
└── general.js        (10路由) - 通用测试
```

### 任务清单

#### 阶段1: 准备工作 (4小时)
- [ ] 运行 `analyze-test-routes.js` 确认分类
- [ ] 创建所有目标文件骨架
- [ ] 建立测试环境

#### 阶段2: 高优先级路由迁移 (1天)
- [ ] 迁移测试历史路由 (14个)
- [ ] 迁移引擎管理路由 (11个)
- [ ] 测试验证

#### 阶段3: 中优先级路由迁移 (1天)
- [ ] 迁移通用测试路由 (10个)
- [ ] 迁移压力测试路由 (6个)
- [ ] 迁移安全测试路由 (5个)
- [ ] 测试验证

#### 阶段4: 低优先级路由迁移 (1天)
- [ ] 迁移所有小模块路由
- [ ] 处理未分类路由 (33个)
- [ ] 全面测试

#### 阶段5: 收尾 (4小时)
- [ ] 更新 `tests/index.js`
- [ ] 归档原 `test.js` 到备份
- [ ] 更新文档
- [ ] 完整回归测试

### 预估工时
3-4天

### 依赖
- 共享模块已完成 ✅
- 分析工具已完成 ✅

### 风险
- 工作量大，可能遗漏功能
- 需要全面测试
- 可能影响现有功能

### 建议
作为**独立sprint**执行，不要与其他任务并行。

### 验收标准
- [ ] 所有91个路由已迁移
- [ ] 模块化结构清晰
- [ ] 单个文件 < 500行
- [ ] 所有测试通过
- [ ] 文档完整
- [ ] 原文件已备份

---

## 🟢 Issue #7: 创建路由注册规范文档 (低优先级)

### 标签
`documentation` `standards` `best-practices`

### 优先级
🟢 低 (P2)

### 描述
创建路由注册的规范文档，指导团队如何正确创建和注册新路由。

### 背景
- 当前缺少统一的路由规范
- 新开发可能不清楚最佳实践
- 需要文档化当前的架构决策

### 任务清单
- [ ] 创建 `docs/ROUTE_REGISTRATION_GUIDE.md`
- [ ] 包含内容：
  - [ ] 路由命名规范
  - [ ] 文件组织结构
  - [ ] RESTful API设计原则
  - [ ] 如何在app.js注册路由
  - [ ] 中间件使用指南
  - [ ] 错误处理最佳实践
  - [ ] 共享模块使用方法
  - [ ] 代码示例
  - [ ] 测试要求
- [ ] 审阅和完善
- [ ] 团队培训

### 预估工时
2小时（文档已在进行中）

### 参考
- 当前最佳实践
- `tests/shared/` 模块
- 新注册的路由示例

### 验收标准
- [ ] 文档完整清晰
- [ ] 包含代码示例
- [ ] 团队已阅读

---

## 🟢 Issue #8: 建立定期路由审计流程 (低优先级)

### 标签
`process` `automation` `maintenance`

### 优先级
🟢 低 (P2)

### 描述
建立定期的路由审计流程，防止未来再次出现路由利用率低和代码冗余的问题。

### 背景
- 已有3个分析工具
- 需要定期运行和跟踪
- 防止技术债务积累

### 任务清单
- [ ] 创建审计流程文档
- [ ] 设置定期审计时间（建议每月）
- [ ] 定义审计检查项
  - [ ] 路由利用率 (目标>80%)
  - [ ] 未注册文件数量
  - [ ] 单文件行数 (目标<500行)
  - [ ] 代码重复检查
- [ ] 添加到项目日历
- [ ] 配置自动化提醒
- [ ] 创建审计报告模板
- [ ] 定义改进行动触发条件

### 工具使用
```bash
# 每月运行这些脚本
node analyze-routes.js
node analyze-test-routes.js
node audit-unregistered-routes.js
```

### 预估工时
1小时（设置） + 1小时/月（执行）

### 输出
- [ ] 审计流程文档
- [ ] 审计报告模板
- [ ] 日历提醒

---

## 📊 优先级总结

### 立即行动 (本周)
1. ✅ Issue #1 - 前端更新API路径 (前端团队负责)

### 短期 (下周)
2. Issue #2 - OAuth/MFA集成 (2小时)
3. Issue #3 - 数据管理路由集成 (3小时)
4. Issue #4 - 系统管理路由集成 (4小时)

### 中期 (下月)
5. Issue #5 - 评估待定文件 (6.5小时，需业务参与)
6. Issue #7 - 路由注册规范 (2小时)

### 长期 (季度)
7. Issue #6 - test.js完整拆分 (3-4天)
8. Issue #8 - 定期审计流程 (1小时)

---

## 📝 使用说明

### 如何使用这些Issues

1. **复制到GitHub Issues**
   - 每个Issue都有完整的描述
   - 包含标签、优先级、任务清单
   - 可以直接复制创建

2. **分配责任人**
   - Issue #1: 前端团队
   - Issue #2-4: 后端开发
   - Issue #5: 需要产品经理参与
   - Issue #6: 安排独立sprint
   - Issue #7-8: 技术负责人

3. **跟踪进度**
   - 使用任务清单跟踪完成状态
   - 更新预估时间
   - 记录实际工时

---

## 🔗 相关文档

- `PROJECT-COMPLETION-SUMMARY.md` - 项目完成总结
- `ROUTE-AUDIT-REPORT.md` - 路由审计报告
- `ROUTE-CLEANUP-PLAN.md` - 清理计划
- `TEST-JS-REFACTOR-STRATEGY.md` - test.js重构策略
- `docs/FRONTEND_API_CHANGES.md` - 前端迁移指南

---

**创建者**: AI Assistant  
**日期**: 2025-10-06  
**版本**: 1.0  

**下次更新**: 当Issue状态变化时

