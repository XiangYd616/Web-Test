# 测试历史表清理和迁移指南

## 📋 概述

本指南将帮你从旧的`test_history`表迁移到新的主从表设计，并清理所有相关的旧代码。

## 🗑️ **第一步：清理旧的数据库结构**

### 1. 执行数据库清理脚本
```bash
# 在开发环境执行（会删除所有test_history相关数据）
psql -d your_database -f server/scripts/cleanup-old-test-history.sql
```

### 2. 验证清理结果
```sql
-- 检查是否还有相关的表
SELECT tablename FROM pg_tables WHERE tablename LIKE '%test_history%';

-- 检查是否还有相关的视图
SELECT viewname FROM pg_views WHERE viewname LIKE '%test_history%';

-- 检查是否还有相关的函数
SELECT proname FROM pg_proc WHERE proname LIKE '%test_history%';
```

## 🏗️ **第二步：创建新的主从表结构**

### 1. 执行主从表创建脚本
```bash
# 创建新的主从表结构
psql -d your_database -f server/scripts/master-detail-test-history-schema.sql
```

### 2. 验证新表结构
```sql
-- 检查主表
\d test_sessions

-- 检查详情表
\d stress_test_details
\d security_test_details
\d api_test_details
-- ... 其他详情表

-- 检查索引
\di *test*

-- 检查视图
\dv *test*
```

## 🔧 **第三步：更新应用代码**

### 1. 已清理的文件
以下文件已被删除，因为它们使用了旧的表结构：
```
❌ server/scripts/layered-test-history-schema.sql
❌ server/scripts/practical-test-history-schema.sql  
❌ server/scripts/optimized-test-history-schema.sql
❌ server/services/dataManagement/testHistoryService.js
❌ server/services/dataManagement/unifiedTestHistoryService.js
❌ docs/frontend-test-history-refactor.md
```

### 2. 已更新的文件
以下文件已更新为使用新的API：
```
✅ server/routes/test.js - 更新为使用新的TestHistoryService
```

### 3. 新增的文件
以下文件是新的主从表设计的核心：
```
✅ server/scripts/master-detail-test-history-schema.sql - 完整的数据库结构
✅ server/services/TestHistoryService.js - 新的业务逻辑服务
✅ server/routes/testHistory.js - 专门的测试历史API路由
✅ docs/test-history-master-detail-design.md - 完整的设计文档
```

## 🚀 **第四步：集成新的API**

### 1. 在主应用中注册新的路由
```javascript
// 在 app.js 或 server.js 中添加
const testHistoryRoutes = require('./routes/testHistory');
app.use('/api/test/history', testHistoryRoutes);
```

### 2. 前端API调用示例
```javascript
// 获取压力测试历史（基础列表）
const getStressTestHistory = async (page = 1) => {
  const response = await fetch(`/api/test/history?testType=stress&page=${page}&limit=20`);
  return await response.json();
};

// 获取压力测试详细历史（包含详细指标）
const getDetailedStressTestHistory = async (page = 1) => {
  const response = await fetch(`/api/test/history/detailed?testType=stress&page=${page}&limit=20`);
  return await response.json();
};

// 获取测试详情
const getTestDetails = async (sessionId) => {
  const response = await fetch(`/api/test/history/${sessionId}`);
  return await response.json();
};

// 创建压力测试记录
const createStressTestRecord = async (testData) => {
  const response = await fetch('/api/test/history/stress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  });
  return await response.json();
};
```

## 📊 **第五步：前端组件集成**

### 1. 使用新的测试页面历史组件
```typescript
import TestPageHistory from '../components/testHistory/TestPageHistory';

// 在压力测试页面的历史标签页中
<TestPageHistory
  testType="stress"
  onTestSelect={(test) => {
    console.log('选择的测试:', test);
    // 处理测试选择逻辑
  }}
  onTestRerun={(test) => {
    console.log('重新运行测试:', test);
    // 预填配置并切换到测试标签页
    setTestConfig(test.config);
    setActiveTab('test');
  }}
/>
```

### 2. 使用TestPageWithHistory包装器
```typescript
import TestPageWithHistory from '../components/testing/TestPageWithHistory';
import TestPageHistory from '../components/testHistory/TestPageHistory';

const StressTestPage: React.FC = () => {
  // 测试内容
  const testContent = (
    <div>
      {/* 压力测试配置和执行界面 */}
    </div>
  );

  // 历史内容
  const historyContent = (
    <TestPageHistory
      testType="stress"
      onTestSelect={handleTestSelect}
      onTestRerun={handleTestRerun}
    />
  );

  return (
    <TestPageWithHistory
      testType="stress"
      testName="压力测试"
      testIcon="⚡"
      testContent={testContent}
      historyContent={historyContent}
    />
  );
};
```

## 🔍 **第六步：测试和验证**

### 1. 数据库连接测试
```javascript
// 测试新的TestHistoryService
const testHistoryService = new TestHistoryService(dbPool);

// 测试基础查询
const result = await testHistoryService.getTestHistory('user-id', 'stress', {
  page: 1,
  limit: 10
});
console.log('测试历史查询结果:', result);
```

### 2. API端点测试
```bash
# 测试基础历史查询
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/test/history?testType=stress&page=1&limit=10"

# 测试详细历史查询
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/test/history/detailed?testType=stress&page=1&limit=10"

# 测试统计查询
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/test/history/statistics?timeRange=30"
```

### 3. 前端功能测试
- [ ] 测试页面历史标签页显示正常
- [ ] 搜索和筛选功能正常
- [ ] 分页功能正常
- [ ] 查看详情功能正常
- [ ] 重新运行功能正常
- [ ] 删除功能正常

## ⚠️ **注意事项**

### 1. 数据迁移
如果你有重要的生产数据需要迁移，请：
1. 先备份现有数据
2. 编写专门的数据迁移脚本
3. 在测试环境验证迁移结果
4. 再在生产环境执行

### 2. API兼容性
- 新的API路径是 `/api/test/history/*`
- 旧的API路径 `/api/test/history` 在 `server/routes/test.js` 中仍然存在，但已更新为使用新的服务
- 建议逐步迁移前端代码到新的API

### 3. 性能监控
迁移后请监控：
- 查询响应时间
- 数据库连接数
- 索引使用情况
- 内存使用情况

## 🎉 **完成检查清单**

- [ ] 执行数据库清理脚本
- [ ] 创建新的主从表结构
- [ ] 验证表结构和索引
- [ ] 注册新的API路由
- [ ] 更新前端组件
- [ ] 测试所有功能
- [ ] 监控性能指标
- [ ] 更新文档

完成以上步骤后，你就成功从旧的`test_history`表迁移到了新的主从表设计！🚀
