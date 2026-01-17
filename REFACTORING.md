# 项目重构文档

## 重构目标

解决前后端职责混乱问题,建立清晰的架构边界。

## 重构原则

1. **前端职责**
   - 只负责UI渲染和用户交互
   - 只负责表单验证(格式验证)
   - 只负责状态管理和路由导航
   - 通过统一API客户端调用后端
   - **不包含**业务逻辑和数据库操作

2. **后端职责**
   - 负责所有业务逻辑验证
   - 负责数据库操作和数据持久化
   - 负责数据分析和处理
   - 负责权限控制和安全验证
   - 提供RESTful API接口

## 已完成的重构

### 1. 分析服务重构 ✅

#### 前端 - `frontend/services/analytics/analyticsService.ts`

- ✅ 移除了所有数据库操作逻辑
- ✅ 只保留API调用和前端数据格式化
- ✅ 使用统一的`apiClient`
- ✅ 删除了重复的`dataAnalysisService.ts`

```typescript
// ✅ 正确的前端服务
class AnalyticsService {
  async getSummary(dateRange: number = 30): Promise<AnalyticsSummary> {
    const response = await apiClient.get('/test/history', {
      params: { limit: 1000, dateRange },
    });
    return this.aggregateData(response.tests, dateRange);
  }
}
```

#### 后端 - `backend/services/analytics/analyticsService.js`

- ✅ 包含所有业务逻辑
- ✅ 直接执行数据库查询
- ✅ 数据分析和计算

```javascript
// ✅ 正确的后端服务
class AnalyticsService {
  async getSummary({ userId, dateRange = 30 }) {
    const sql = `SELECT * FROM test_history WHERE user_id = ?`;
    const tests = await query(sql, [userId]);
    return this.calculateStatistics(tests);
  }
}
```

#### 后端 - `backend/controllers/analyticsController.js`

- ✅ 创建Controller层
- ✅ 只负责请求处理和响应格式化
- ✅ 业务逻辑委托给Service层

```javascript
// ✅ 正确的Controller
class AnalyticsController {
  async getSummary(req, res, next) {
    try {
      const summary = await analyticsService.getSummary({
        userId: req.user?.id,
        dateRange: parseInt(req.query.dateRange),
      });
      return successResponse(res, summary);
    } catch (error) {
      next(error);
    }
  }
}
```

#### 后端 - `backend/routes/analytics.js`

- ✅ 创建路由文件
- ✅ 定义RESTful路由
- ✅ 应用中间件

```javascript
router.get('/summary', authMiddleware, analyticsController.getSummary);
router.get(
  '/performance-trends',
  authMiddleware,
  analyticsController.getPerformanceTrends
);
```

#### 服务器配置 - `backend/server.js`

- ✅ 注册分析路由
- ✅ 添加到API端点列表

```javascript
const analyticsRoutes = require('./routes/analytics');
app.use('/api/analytics', analyticsRoutes);
```

### 2. 工具类创建

#### `backend/utils/response.js`

- ✅ 统一响应格式工具
- ✅ 标准化成功/错误响应

## 架构规范

### 前端分层架构

```
frontend/
├── components/          # UI组件
│   ├── common/         # 通用组件
│   └── business/       # 业务组件
├── services/           # 服务层
│   ├── api/           # API客户端
│   │   └── client.ts  # 统一API客户端
│   └── analytics/     # 分析服务
│       └── analyticsService.ts
├── hooks/             # 自定义Hooks
└── utils/             # 工具函数
```

### 后端分层架构

```
backend/
├── controllers/       # 控制器层(新增)
│   └── analyticsController.js
├── services/         # 业务服务层
│   └── analytics/
│       └── analyticsService.js
├── routes/          # 路由层
│   └── analytics.js
├── middleware/      # 中间件
├── utils/          # 工具函数
│   └── response.js
└── config/         # 配置文件
```

## 命名规范

### 文件命名

- ✅ 使用简洁的名称: `analyticsService.ts`
- ❌ 避免无意义修饰词: `unifiedAnalyticsService.ts`,
  `enhancedAnalyticsService.ts`

## 待完成的重构

### 高优先级

1. [x] 创建测试相关的Controller
2. [x] 创建用户相关的Controller
3. [ ] 重构前端组件移除直接fetch调用
4. [ ] 清理重复的服务文件

### 中优先级

1. [ ] 拆分巨型路由文件(`routes/test.js` 4884行)
2. [ ] 统一前端API调用方式
3. [ ] 移除前端的SQL操作逻辑

### 低优先级

1. [ ] 优化Service层职责划分
2. [ ] 添加单元测试
3. [ ] 完善API文档

## 重构检查清单

### 前端代码检查

- [ ] 没有直接的`fetch()`调用
- [ ] 没有SQL语句
- [ ] 没有数据库字段操作
- [ ] 使用统一的`apiClient`
- [ ] 只包含UI逻辑和数据展示

### 后端代码检查

- [ ] Controller只处理HTTP请求
- [ ] Service包含业务逻辑
- [ ] 路由只定义路由规则
- [ ] 使用统一的响应格式
- [ ] 正确的错误处理

## 参考文档

- 架构规范: `docs/ARCHITECTURE_STANDARDS.md`
- API文档: `docs/API.md`
- 贡献指南: `docs/CONTRIBUTING.md`

## 创建的新文件

### 后端Controller层

- `backend/controllers/analyticsController.js` - 分析控制器
- `backend/controllers/testController.js` - 测试控制器
- `backend/controllers/userController.js` - 用户控制器

### 后端Service层

- `backend/services/analytics/analyticsService.js` - 分析服务

### 后端路由层

- `backend/routes/analytics.js` - 分析路由
- `backend/routes/test-new.js` - 测试路由(新)
- `backend/routes/users-new.js` - 用户路由(新)

### 工具类

- `backend/utils/response.js` - 统一响应工具

### 前端服务层

- `frontend/services/analytics/analyticsService.ts` - 分析服务(重构)

### 已删除的重复文件

- `frontend/services/dataAnalysisService.ts` - 功能已合并到analyticsService

## 更新日志

- 2026-01-17 17:30: 完成分析服务重构
- 2026-01-17 17:30: 创建Controller层
- 2026-01-17 17:30: 创建统一响应工具
- 2026-01-17 17:32: 完成测试Controller和路由
- 2026-01-17 17:32: 完成用户Controller和路由
