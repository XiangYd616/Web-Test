# 更新日志

所有重要的项目变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
