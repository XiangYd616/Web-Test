# Phase 2.2: 后端路由标准化 - 简化方案

**更新时间**: 2026-01-14  
**原因**: 内部项目不需要版本化，采用更简单的结构

---

## 🎯 简化的路由结构

### 新的标准结构（无v1层）

```
backend/routes/
├── index.js              # 主路由聚合
│
├── 核心功能路由:
│   ├── auth.js          # 认证和授权
│   ├── users.js         # 用户管理
│   └── admin.js         # 管理员功能
│
├── tests/               # 测试相关路由（分组）
│   ├── index.js         # 测试路由聚合
│   ├── performance.js   # 性能测试
│   ├── security.js      # 安全测试
│   ├── seo.js           # SEO测试
│   ├── accessibility.js # 可访问性测试
│   ├── network.js       # 网络测试
│   ├── database.js      # 数据库测试
│   ├── content.js       # 内容测试
│   └── history.js       # 测试历史
│
├── data/                # 数据管理路由（分组）
│   ├── index.js         # 数据路由聚合
│   ├── export.js        # 数据导出
│   ├── import.js        # 数据导入
│   ├── storage.js       # 存储管理
│   └── cache.js         # 缓存管理
│
├── system/              # 系统管理路由（分组）
│   ├── index.js         # 系统路由聚合
│   ├── monitoring.js    # 系统监控
│   ├── analytics.js     # 分析统计
│   ├── reports.js       # 报告生成
│   ├── alerts.js        # 告警管理
│   ├── errors.js        # 错误管理
│   ├── config.js        # 配置管理
│   └── scheduler.js     # 任务调度
│
├── engines/             # 测试引擎路由（分组）
│   ├── index.js         # 引擎路由聚合
│   ├── k6.js            # K6引擎
│   └── lighthouse.js    # Lighthouse引擎
│
└── misc/                # 其他路由
    ├── batch.js         # 批量操作
    ├── comparison.js    # 对比分析
    ├── environments.js  # 环境管理
    └── integrations.js  # 集成管理
```

---

## 📋 路由合并计划

### 测试路由合并

**Before** (15个分散文件):

```
❌ test.js
❌ testing.js
❌ testHistory.js
❌ performance.js
❌ performanceTestRoutes.js
❌ security.js
❌ seo.js
❌ accessibility.js
❌ automation.js
❌ regression.js
❌ network.js
❌ database.js
❌ content.js
❌ infrastructure.js
❌ services.js
```

**After** (1个目录，9个文件):

```
✅ tests/
    ├── index.js
    ├── performance.js
    ├── security.js
    ├── seo.js
    ├── accessibility.js
    ├── network.js
    ├── database.js
    ├── content.js
    └── history.js
```

### 数据管理路由合并

**Before** (8个分散文件):

```
❌ data.js
❌ dataExport.js
❌ dataImport.js
❌ database.js (重复)
❌ databaseHealth.js
❌ storageManagement.js
❌ cache.js
❌ files.js
```

**After** (1个目录，4个文件):

```
✅ data/
    ├── index.js
    ├── export.js
    ├── import.js
    ├── storage.js
    └── cache.js
```

### 系统管理路由合并

**Before** (10个分散文件):

```
❌ system.js
❌ monitoring.js
❌ analytics.js
❌ reports.js
❌ alerts.js
❌ errors.js
❌ errorManagement.js (重复)
❌ config.js
❌ scheduler.js
❌ scheduledTasks.js (重复)
```

**After** (1个目录，7个文件):

```
✅ system/
    ├── index.js
    ├── monitoring.js
    ├── analytics.js
    ├── reports.js
    ├── alerts.js
    ├── errors.js
    ├── config.js
    └── scheduler.js
```

---

## 🎯 执行步骤

### Step 1: 创建目录结构

```bash
mkdir backend/routes/tests
mkdir backend/routes/data
mkdir backend/routes/system
mkdir backend/routes/misc
```

### Step 2: 合并测试路由

```bash
# 合并test.js和testing.js
git mv backend/routes/test.js backend/routes/tests/index.js

# 移动其他测试路由
git mv backend/routes/performance.js backend/routes/tests/
git mv backend/routes/security.js backend/routes/tests/
git mv backend/routes/seo.js backend/routes/tests/
# ... 等等

# 删除重复文件
git rm backend/routes/testing.js
git rm backend/routes/performanceTestRoutes.js
```

### Step 3: 合并数据路由

```bash
git mv backend/routes/dataExport.js backend/routes/data/export.js
git mv backend/routes/dataImport.js backend/routes/data/import.js
# ... 等等
```

### Step 4: 合并系统路由

```bash
git mv backend/routes/monitoring.js backend/routes/system/
git mv backend/routes/analytics.js backend/routes/system/
# ... 等等

# 删除重复文件
git rm backend/routes/errorManagement.js
git rm backend/routes/scheduledTasks.js
```

### Step 5: 更新主路由

编辑 `backend/routes/index.js`:

```javascript
const express = require('express');
const router = express.Router();

// 核心路由
router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/admin', require('./admin'));

// 分组路由
router.use('/tests', require('./tests'));
router.use('/data', require('./data'));
router.use('/system', require('./system'));
router.use('/engines', require('./engines'));

module.exports = router;
```

---

## 📊 预期收益

### 文件减少

```
Before: 56个文件（分散在根目录）
After: 35个文件（分组在子目录）

减少: 21个文件 (-38%)
```

### 结构改善

```
Before:
- 56个文件平铺在routes/
- 命名不一致
- 功能混乱

After:
- 按功能分组到子目录
- 命名统一
- 结构清晰
```

### URL路径

```
Before:
/api/test
/api/testing (重复)
/api/performance
/api/performanceTestRoutes (重复)

After:
/api/tests
/api/tests/performance
/api/tests/security
/api/tests/seo
```

---

## 🎯 为什么不需要v1？

### 你的项目特点

1. **内部项目**
   - 前后端在同一代码库
   - 没有外部API消费者
   - 可以同时更新

2. **当前状态**
   - 没有多个API版本
   - 没有版本管理需求
   - 重点是整理混乱

3. **简化优先**
   - 减少嵌套层级
   - 降低复杂度
   - 易于理解和维护

### 何时需要版本化？

**需要v1的场景**:

- 有外部API消费者（移动App、第三方集成）
- 需要同时维护多个版本
- API需要长期稳定性保证
- 有明确的版本升级计划

**你的项目**:

- ❌ 没有外部消费者
- ❌ 不需要多版本共存
- ✅ 需要快速整理和重构
- ✅ 内部项目，可以快速迭代

---

## 💡 最佳实践建议

### 当前阶段（重构期）

**优先级**:

1. ✅ 整理混乱的文件结构
2. ✅ 合并重复的路由
3. ✅ 统一命名规范
4. ❌ 不需要版本化（过度设计）

### 未来考虑

**如果需要版本化**:

- 等到真正需要时再添加
- 可以在整理好的基础上轻松添加
- 不要过早优化

---

## 🚀 执行计划

### 本周完成

1. 创建目录结构
2. 合并测试路由
3. 合并数据路由
4. 合并系统路由
5. 更新主路由
6. 测试验证

**预计时间**: 3-4小时

---

**简化的方案更适合你的项目！** 🎯

**核心原则**:

- 保持简单（KISS原则）
- 按需添加复杂度
- 不要过度设计
