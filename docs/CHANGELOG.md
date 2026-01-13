# 更新日志

所有重要的项目变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.2.0] - 2025-11-11

### 🎉 重大更新 - 业务逻辑完善和测试覆盖

#### 新增
- ✅ **前后端职责分离** - 完整实现前后端职责分离架构
  - 前端: 格式验证和用户交互
  - 后端: 业务规则验证和逻辑处理
  - 新增 `formValidation.ts` 前端验证工具
  - 新增 `TestBusinessService.js` 业务服务层

- ✅ **统一错误处理系统** - 13个标准错误类
  - ValidationError, QuotaExceededError, UnauthorizedError
  - NotFoundError, PermissionError, ConflictError
  - BadRequestError, ServiceUnavailableError, RateLimitError
  - TimeoutError, DatabaseError, ExternalServiceError
  - 统一错误处理中间件
  - 自动处理PostgreSQL/JWT/Multer错误

- ✅ **数据库性能优化**
  - 创建16个必要索引(单列+复合)
  - 2个物化视图用于统计查询
  - 性能监控查询工具
  - 数据库维护建议和脚本

- ✅ **完整单元测试覆盖** - 150+测试用例
  - TestBusinessService测试套件(567行,50+用例)
  - formValidation测试套件(527行,100+用例)
  - Mock数据库和外部依赖
  - 覆盖所有核心业务逻辑

- ✅ **完整API端点实现**
  - `GET /api/test/:testId` - 获取测试详情
  - `PUT /api/test/:testId` - 更新测试
  - `POST /api/test/batch-delete` - 批量删除
  - `GET /api/test/:testId/results` - 获取测试结果

- ✅ **数据库Schema文档** - 完整的数据库设计文档
  - 7个核心表定义
  - 20+个索引设计
  - 2个视图定义
  - 查询示例和维护建议

#### 改进
- **TestBusinessService完整实现**
  - `createTest()` - 生成testId并保存到数据库
  - `startTest()` - 异步启动测试引擎
  - `saveTestResults()` - 计算评分并保存结果
  - `validateTestConfig()` - 完整的格式和业务规则验证
  - `getUserQuotaInfo()` - 实时配额查询

- **用户配额管理**
  - Free: 2并发测试, 10/天, 50并发/测试
  - Premium: 10并发测试, 100/天, 500并发/测试
  - Enterprise: 50并发测试, 1000/天, 1000并发/测试
  - Admin: 100并发测试, 无限/天, 1000并发/测试

- **项目文档清理**
  - 清理过时与重复文档
  - 保留核心文档
  - 更新README.md和CHANGELOG.md

#### 技术债务清理
- 删除worktree相关临时分支
- 移除重复和过时的阶段报告
- 整理项目根目录结构

#### 测试框架
- 后端: Jest (CommonJS)
- 前端: Vitest (ESM)
- 测试覆盖率: 核心业务逻辑100%

## [1.0.0] - 2025-08-16

### 🎉 重大更新 - 文件命名规范化完成

#### 新增
- 文件命名规范化自动化脚本
- 重复文件检测和解决工具
- 项目状态监控报告系统
- 文档自动化整理工具

#### 修改
- **文件重命名**: 移除所有不必要修饰词 (Unified, Enhanced, Advanced等)
  - `UnifiedTestConfigPanel.tsx` → `TestConfigPanel.tsx`
  - `UnifiedTestResultsPanel.tsx` → `TestResultsPanel.tsx`
  - `UnifiedTestManager.tsx` → `TestManager.tsx`
  - `RealTimeTestProgress.tsx` → `TestProgress.tsx`
  - `useUnifiedTestFlow.ts` → `useTestFlow.ts`
  - `UnifiedTestPage.tsx` → `TestPage.tsx`
  - `UnifiedStorageService.js` → `StorageService.js`
- **导入引用更新**: 自动修复所有相关的导入路径和变量名
- **项目文档重组**: 整理和归档临时报告文件

#### 删除
- 删除7个重复文件，保留功能更完整的版本
- 清理过时的临时报告文件

#### 修复
- TypeScript错误减少45个 (1,269 → 1,224)
- 命名规范检查100%通过
- 项目结构显著改善

## [0.9.0] - 2025-08-15

### 新增
- 数据库主从表架构设计
- 7种测试类型的专用详情表
- 测试历史查询视图
- 软删除功能支持
- 数据库迁移指南
- 项目代码整理和结构优化
- 响应式设计系统优化
- 废弃文件清理脚本
- 代码质量优化工具
- 依赖关系分析工具

### 修改
- 重构测试历史数据存储架构
- 更新API接口以支持新数据结构
- 优化查询性能和数据完整性
- 更新前端类型定义
- 优化项目文件结构
- 统一代码格式和命名规范
- 更新项目文档

### 移除
- 旧的单表测试历史结构
- 废弃的文件存储服务
- 清理未使用的依赖包
- 移除废弃的代码和文件
- 删除过时的注释

## [1.0.0] - 2025-08-03

### 新增
- 初始版本发布
- SEO测试功能
- 性能测试功能
- 安全测试功能
- 用户认证系统
- 现代化UI界面
- 响应式设计支持

### 技术栈
- 前端: React + TypeScript + Vite
- 后端: Node.js + Express
- 数据库: PostgreSQL
- 样式: Tailwind CSS
- 图标: Lucide React
