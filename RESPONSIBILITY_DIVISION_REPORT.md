# 前后端职责划分诊断报告

**诊断时间**: 2026-01-17 18:02  
**目标**: 解决功能职责划分规范,前后端区分规划,解决功能混乱问题

---

## 📊 诊断结果总览

### 发现的职责混乱问题

| 问题类型                 | 严重程度 | 数量  | 影响               |
| ------------------------ | -------- | ----- | ------------------ |
| **后端路由直接写SQL**    | 🔴 严重  | 300+  | 违反MVC架构        |
| **前端localStorage滥用** | 🟡 中等  | 159处 | 数据持久化职责混乱 |
| **前端组件直接fetch**    | 🟡 中等  | 7处   | 绕过服务层         |
| **前端Service类过多**    | 🟢 轻微  | 30个  | 架构复杂           |

---

## 🔴 严重问题: 后端路由直接写SQL

### 问题描述

**test.js路由文件直接包含大量SQL查询**,违反MVC架构原则。

### 发现的SQL操作 (300+处)

#### 示例1: 获取测试结果

```javascript
// ❌ 错误: 路由层直接写SQL
router.get('/:testId/results', authMiddleware, async (req, res) => {
  const result = await query(
    'SELECT results, status, overall_score FROM test_history WHERE test_id = $1',
    [testId, userId]
  );
  // ...
});
```

#### 示例2: 统计查询

```javascript
// ❌ 错误: 路由层包含复杂SQL
router.get('/stats', authMiddleware, async (req, res) => {
  const statsResult = await query(
    `
    SELECT COUNT(*) as total_tests,
           COUNT(*) FILTER (WHERE status = 'completed') as successful_tests,
           AVG(overall_score) as avg_score
    FROM test_history WHERE user_id = $1
  `,
    [req.user.id]
  );
});
```

### 影响

1. **违反单一职责原则**: 路由层承担了数据访问职责
2. **难以测试**: SQL逻辑与HTTP逻辑耦合
3. **难以复用**: 相同查询在多处重复
4. **难以维护**: 业务逻辑分散在路由中

### 应该的架构

```javascript
// ✅ 正确: 路由 → Controller → Service → Repository

// routes/test.js
router.get('/:testId/results', authMiddleware, testController.getResults);

// controllers/testController.js
async getResults(req, res, next) {
  const results = await testService.getTestResults(req.params.testId, req.user.id);
  return successResponse(res, results);
}

// services/testService.js
async getTestResults(testId, userId) {
  return await testRepository.findResultsByTestId(testId, userId);
}

// repositories/testRepository.js
async findResultsByTestId(testId, userId) {
  return await query('SELECT * FROM test_history WHERE test_id = $1 AND user_id = $2', [testId, userId]);
}
```

---

## 🟡 中等问题: 前端localStorage滥用

### 问题描述

**前端大量使用localStorage进行数据持久化**,应该通过后端API。

### 发现的localStorage使用 (159处)

**主要文件**:

- `authService.ts` (38处) - 存储token、用户信息
- `stressTestRecordService.ts` (22处) - 存储测试记录
- `userStatsService.ts` (9处) - 存储统计数据
- `secureStorage.ts` (7处) - 加密存储
- 其他26个文件 (83处)

### 示例

```typescript
// ❌ 错误: 前端直接存储业务数据
class StressTestRecordService {
  saveRecord(record) {
    const records = JSON.parse(localStorage.getItem('testRecords') || '[]');
    records.push(record);
    localStorage.setItem('testRecords', JSON.stringify(records));
  }
}
```

### 问题

1. **数据不同步**: 多设备/浏览器数据不一致
2. **安全风险**: 敏感数据暴露在客户端
3. **容量限制**: localStorage只有5-10MB
4. **职责混乱**: 前端承担了数据持久化职责

### 应该的做法

```typescript
// ✅ 正确: 通过API存储到后端
class StressTestRecordService {
  async saveRecord(record) {
    return await apiClient.post('/api/test/records', record);
  }

  async getRecords() {
    return await apiClient.get('/api/test/records');
  }
}
```

**例外**: 只有以下数据可以用localStorage:

- UI偏好设置 (主题、语言等)
- 临时缓存 (带过期时间)
- 会话状态 (非敏感)

---

## 🟡 中等问题: 前端组件直接fetch

### 问题描述

**7个组件绕过服务层直接调用fetch/axios**。

### 发现的直接调用

1. `DataExporter.tsx` (2处)
2. `useDeleteActions.ts` (2处)
3. `BusinessAnalyticsDashboard.tsx` (1处)
4. `useTestRecords.ts` (1处)
5. `OptionalEnhancements.tsx` (1处)

### 示例

```typescript
// ❌ 错误: 组件直接fetch
const DataExporter = () => {
  const handleExport = async () => {
    const response = await fetch('/api/test/export', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };
};
```

### 应该的做法

```typescript
// ✅ 正确: 通过服务层
const DataExporter = () => {
  const handleExport = async () => {
    const result = await testService.exportData(data);
  };
};
```

---

## 🟢 轻微问题: 前端Service类过多

### 问题描述

**前端有30个Service类**,部分职责重叠。

### Service类列表

**认证相关** (5个):

- authService.ts
- auditLogService.ts
- mfaService.ts
- passwordPolicyService.ts
- rbacService.ts

**测试相关** (6个):

- testService.ts
- testApiService.ts
- testProgressService.ts
- batchTestingService.ts
- stressTestRecordService.ts
- testTemplates.ts

**其他** (19个):

- analyticsService.ts
- reportService.ts
- monitoringService.ts
- settingsService.ts
- userService.ts
- ... (14个更多)

### 建议

**合并相似服务**:

- `testService` + `testApiService` → 统一测试服务
- `monitoringService` + `streamingMonitoring` → 统一监控服务
- `userService` + `userStatsService` + `userFeedbackService` → 统一用户服务

---

## 📋 职责划分规范

### 前端职责 ✅

**应该做**:

1. UI渲染和交互
2. 表单验证(格式)
3. 本地状态管理
4. 调用API服务
5. 数据展示格式化
6. 路由导航

**不应该做**:

1. ❌ 业务逻辑计算
2. ❌ 数据持久化(除UI偏好)
3. ❌ 直接数据库操作
4. ❌ 复杂数据处理
5. ❌ 权限判断(只能隐藏UI)

### 后端职责 ✅

**应该做**:

1. 业务逻辑验证
2. 数据持久化
3. 权限控制
4. 数据处理和计算
5. 第三方服务集成
6. 数据安全

**不应该做**:

1. ❌ UI逻辑
2. ❌ 前端状态管理
3. ❌ 路由层写SQL
4. ❌ 路由层写业务逻辑

### 分层架构 ✅

**前端**:

```
Components (UI)
    ↓
Hooks (状态)
    ↓
Services (API调用)
    ↓
API Client (HTTP)
```

**后端**:

```
Routes (路由定义)
    ↓
Controllers (请求处理)
    ↓
Services (业务逻辑)
    ↓
Repositories (数据访问)
    ↓
Database
```

---

## 🎯 修复优先级

### P0 - 必须立即修复

1. **重构test.js路由层**
   - 移除所有SQL查询
   - 创建TestService和TestRepository
   - 通过Controller调用
   - 预计工作量: 8-10小时

### P1 - 高优先级

2. **规范localStorage使用**
   - 审查159处使用
   - 业务数据改为API调用
   - 只保留UI偏好
   - 预计工作量: 4-6小时

3. **修复组件直接fetch**
   - 7个组件改为使用服务层
   - 预计工作量: 1-2小时

### P2 - 中优先级

4. **合并重复Service**
   - 30个 → 20个左右
   - 预计工作量: 3-4小时

---

## 🔧 具体修复方案

### 方案1: 重构test.js (P0)

#### 步骤1: 创建Repository层

```javascript
// repositories/testRepository.js
class TestRepository {
  async findById(testId, userId) {
    return await query(
      'SELECT * FROM test_history WHERE test_id = $1 AND user_id = $2',
      [testId, userId]
    );
  }

  async findResults(testId, userId) {
    return await query(
      'SELECT results, status, overall_score FROM test_history WHERE test_id = $1 AND user_id = $2',
      [testId, userId]
    );
  }

  async getStats(userId) {
    return await query(
      `
      SELECT COUNT(*) as total_tests,
             COUNT(*) FILTER (WHERE status = 'completed') as successful_tests
      FROM test_history WHERE user_id = $1
    `,
      [userId]
    );
  }
}
```

#### 步骤2: 创建Service层

```javascript
// services/testService.js
class TestService {
  constructor(testRepository) {
    this.testRepository = testRepository;
  }

  async getTestResults(testId, userId) {
    const test = await this.testRepository.findById(testId, userId);
    if (!test) throw new Error('Test not found');

    const results = await this.testRepository.findResults(testId, userId);
    return this.formatResults(results);
  }

  async getUserStats(userId) {
    const stats = await this.testRepository.getStats(userId);
    return this.calculateMetrics(stats);
  }

  formatResults(results) {
    // 业务逻辑
  }

  calculateMetrics(stats) {
    // 业务逻辑
  }
}
```

#### 步骤3: 更新Controller

```javascript
// controllers/testController.js
class TestController {
  async getResults(req, res, next) {
    try {
      const results = await testService.getTestResults(
        req.params.testId,
        req.user.id
      );
      return successResponse(res, results);
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const stats = await testService.getUserStats(req.user.id);
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }
}
```

#### 步骤4: 简化Routes

```javascript
// routes/test.js
router.get('/:testId/results', authMiddleware, testController.getResults);
router.get('/stats', authMiddleware, testController.getStats);
```

### 方案2: 规范localStorage (P1)

#### 审查清单

```typescript
// ✅ 允许使用localStorage
const ALLOWED_KEYS = [
  'theme', // UI主题
  'language', // 语言偏好
  'sidebarCollapsed', // UI状态
  'recentSearches', // 临时缓存(带过期)
];

// ❌ 禁止使用localStorage
const FORBIDDEN_KEYS = [
  'testRecords', // → API
  'userStats', // → API
  'authToken', // → httpOnly cookie
  'userData', // → API
];
```

#### 迁移示例

```typescript
// 之前: localStorage
class UserStatsService {
  getStats() {
    return JSON.parse(localStorage.getItem('userStats') || '{}');
  }
}

// 之后: API
class UserStatsService {
  async getStats() {
    return await apiClient.get('/api/users/stats');
  }
}
```

---

## 📊 修复后的架构

### 前端架构 ✅

```
src/
├── components/        # UI组件 (只负责渲染)
├── hooks/            # 状态管理
├── services/         # API调用 (20个精简服务)
│   ├── api/
│   │   └── client.ts # 统一HTTP客户端
│   ├── auth/
│   ├── test/
│   └── user/
└── utils/            # 工具函数
```

### 后端架构 ✅

```
backend/
├── routes/           # 路由定义 (只定义路由)
├── controllers/      # 请求处理 (只处理HTTP)
├── services/         # 业务逻辑 (核心逻辑)
├── repositories/     # 数据访问 (只写SQL)
└── utils/            # 工具函数
```

---

## ✅ 验收标准

### 前端

- [ ] 无直接SQL操作
- [ ] 无业务逻辑计算
- [ ] localStorage只用于UI偏好
- [ ] 所有API调用通过服务层
- [ ] 组件不直接fetch

### 后端

- [ ] 路由层无SQL查询
- [ ] 路由层无业务逻辑
- [ ] Controller只处理HTTP
- [ ] Service包含业务逻辑
- [ ] Repository负责数据访问

---

## 🎯 总结

### 当前状态

**职责划分完成度**: 40%

- ✅ 前端无SQL操作
- ✅ Controller层已创建
- ❌ 后端路由层仍有300+处SQL
- ⚠️ 前端localStorage滥用(159处)
- ⚠️ 前端组件直接fetch(7处)

### 需要的工作

**总预计工作量**: 15-20小时

1. P0: 重构test.js (8-10小时)
2. P1: 规范localStorage (4-6小时)
3. P1: 修复直接fetch (1-2小时)
4. P2: 合并Service (3-4小时)

### 建议

**立即开始P0任务**: 创建TestRepository和TestService,将test.js的SQL操作迁移到Repository层。这是解决职责混乱的关键。

---

**报告人**: Cascade AI  
**报告时间**: 2026-01-17 18:02  
**下一步**: 执行P0修复方案
