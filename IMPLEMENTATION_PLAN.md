# 架构统一实施计划

## 📊 当前状态

根据架构检查结果 (`npm run arch:check`):

- **错误**: 2个
- **警告**: 40个

### 主要问题

1. ❌ **API客户端重复** - 发现3个API客户端文件
2. ❌ **缺少Repository层** - 未建立数据访问层
3. ⚠️ **组件直接调用API** - 多处组件中直接调用API
4. ⚠️ **服务文件分散** - 21个服务文件未分类
5. ⚠️ **类型定义混乱** - unified和零散类型文件并存

## 🎯 总体目标

**周期**: 4-6周
**目标**: 建立清晰的分层架构,错误数降为0,警告数<5

## 📅 实施计划

### 第1周: 基础设施建设

#### Day 1-2: 创建标准目录结构

```bash
# 前端
mkdir -p frontend/services/api
mkdir -p frontend/services/business
mkdir -p frontend/services/repository
mkdir -p frontend/types/unified

# 后端
mkdir -p backend/src/api/controllers
mkdir -p backend/src/repositories
```

**验收标准**:
- [ ] 目录结构符合规范
- [ ] README文档更新

#### Day 3-4: 实现统一API客户端

**任务**:
1. 创建 `services/api/client.ts`
2. 实现HTTP方法封装
3. 配置拦截器(认证、错误、日志)
4. 添加重试机制

**文件**:
- `frontend/services/api/client.ts`
- `frontend/services/api/interceptors.ts`
- `frontend/services/api/config.ts`

**验收标准**:
- [ ] API客户端功能完整
- [ ] 拦截器配置正确
- [ ] 单元测试通过

#### Day 5: 类型定义统一

**任务**:
1. 合并重复的类型定义
2. 统一到 `types/unified/`
3. 导出索引文件

**验收标准**:
- [ ] 类型定义集中管理
- [ ] 无重复定义
- [ ] 类型检查通过

---

### 第2周: Repository层实现

#### Day 1-3: 创建核心Repository

**优先级1 - 高频API**:
- [ ] `testRepository.ts` - 测试相关API
- [ ] `userRepository.ts` - 用户相关API
- [ ] `authRepository.ts` - 认证相关API

**优先级2 - 业务API**:
- [ ] `reportRepository.ts` - 报告相关API
- [ ] `historyRepository.ts` - 历史记录API
- [ ] `monitorRepository.ts` - 监控相关API

**模板**:
```typescript
// services/repository/testRepository.ts
import { apiClient } from '../api/client';
import { Test, TestResult } from '@/types/unified';

export class TestRepository {
  private readonly basePath = '/test';

  async getAll(params?: any) {
    return apiClient.get<Test[]>(this.basePath, { params });
  }

  async getById(id: string) {
    return apiClient.get<Test>(`${this.basePath}/${id}`);
  }

  async create(data: Partial<Test>) {
    return apiClient.post<Test>(this.basePath, data);
  }

  async update(id: string, data: Partial<Test>) {
    return apiClient.put<Test>(`${this.basePath}/${id}`, data);
  }

  async delete(id: string) {
    return apiClient.delete(`${this.basePath}/${id}`);
  }
}

export const testRepository = new TestRepository();
```

#### Day 4-5: 迁移现有API调用

**策略**:
1. 识别所有直接API调用
2. 替换为Repository调用
3. 删除废弃代码

**验收标准**:
- [ ] 核心Repository创建完成
- [ ] 测试覆盖率>80%
- [ ] 文档完整

---

### 第3周: Service层重构

#### Day 1-2: 创建业务服务

**文件结构**:
```
services/business/
├── testService.ts
├── userService.ts
├── authService.ts
├── reportService.ts
└── index.ts
```

**模板**:
```typescript
// services/business/testService.ts
import { testRepository } from '../repository/testRepository';
import { Test } from '@/types/unified';
import { validateUrl } from '@/utils/validators';

export class TestService {
  /**
   * 创建并启动测试
   */
  async createAndStart(data: Partial<Test>) {
    // 1. 验证
    this.validateTestData(data);
    
    // 2. 创建
    const test = await testRepository.create(data);
    
    // 3. 启动
    await this.startTest(test.id);
    
    return test;
  }

  /**
   * 获取测试(带缓存)
   */
  async getById(id: string, useCache = true) {
    if (useCache) {
      const cached = this.getFromCache(id);
      if (cached) return cached;
    }
    
    const test = await testRepository.getById(id);
    this.saveToCache(id, test);
    return test;
  }

  private validateTestData(data: any) {
    if (!data.url) throw new Error('URL is required');
    if (!validateUrl(data.url)) throw new Error('Invalid URL');
  }

  private async startTest(id: string) {
    // 启动逻辑
  }

  private getFromCache(id: string) {
    // 缓存逻辑
  }

  private saveToCache(id: string, data: any) {
    // 缓存逻辑
  }
}

export const testService = new TestService();
```

#### Day 3-4: 整理零散服务

**当前问题**: 21个服务文件散落在 `services/` 目录

**分类方案**:
```
services/
├── api/           # API客户端
├── business/      # 业务逻辑
│   ├── testService.ts
│   ├── userService.ts
│   └── reportService.ts
├── repository/    # 数据访问
├── data/          # 数据处理
│   ├── processorService.ts
│   ├── normalizationService.ts
│   └── exportService.ts
├── infrastructure/ # 基础设施
│   ├── cacheService.ts
│   ├── queueService.ts
│   └── monitorService.ts
└── integration/   # 第三方集成
    ├── googleService.ts
    └── oauthService.ts
```

**迁移清单**:
- [ ] adminService → business/adminService
- [ ] testHistoryService → business/historyService
- [ ] dataProcessor → data/processorService
- [ ] cacheStrategy → infrastructure/cacheService
- [ ] googlePageSpeedService → integration/googleService

#### Day 5: 清理废弃代码

**删除/归档**:
- [ ] `services/api.ts` (已废弃,使用api/client.ts)
- [ ] `services/api/baseApiService.ts` (功能合并到client.ts)
- [ ] 重复的类型定义文件
- [ ] 未使用的工具函数

**验收标准**:
- [ ] 服务文件分类清晰
- [ ] 无废弃代码
- [ ] arch:check警告<20

---

### 第4周: 组件层重构

#### Day 1-2: 创建自定义Hooks

**核心Hooks**:
```typescript
// hooks/useTests.ts
function useTests() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadTests = useCallback(async (params?: any) => {
    setLoading(true);
    setError(null);
    try {
      const data = await testService.getAll(params);
      setTests(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTest = useCallback(async (data: Partial<Test>) => {
    const test = await testService.createAndStart(data);
    setTests(prev => [...prev, test]);
    return test;
  }, []);

  return {
    tests,
    loading,
    error,
    loadTests,
    createTest
  };
}
```

**创建清单**:
- [ ] `hooks/useTests.ts`
- [ ] `hooks/useAuth.ts`
- [ ] `hooks/useReports.ts`
- [ ] `hooks/useHistory.ts`

#### Day 3-5: 重构高频组件

**优先级**:
1. 测试相关组件(TestPage, TestCard, TestList)
2. 用户管理组件(UserList, UserForm)
3. 报告组件(ReportViewer, ReportList)

**重构示例**:
```typescript
// BEFORE
function TestPage() {
  const [tests, setTests] = useState([]);
  
  useEffect(() => {
    fetch('/api/test').then(r => r.json()).then(setTests);
  }, []);

  return <TestList tests={tests} />;
}

// AFTER
function TestPage() {
  const { tests, loading, error, loadTests } = useTests();

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  if (loading) return <Loading />;
  if (error) return <ErrorDisplay error={error} />;
  
  return <TestList tests={tests} />;
}
```

**验收标准**:
- [ ] 组件不直接调用API
- [ ] 使用自定义Hooks
- [ ] 组件代码<100行

---

### 第5周: 后端重构

#### Day 1-2: 统一路由管理

**创建路由索引**:
```javascript
// backend/routes/index.js
const express = require('express');
const router = express.Router();

// 导入所有路由
const authRoutes = require('./auth');
const testRoutes = require('./test');
const userRoutes = require('./user');
const reportRoutes = require('./report');

// 注册路由
router.use('/auth', authRoutes);
router.use('/test', testRoutes);
router.use('/user', userRoutes);
router.use('/report', reportRoutes);

// 健康检查
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

module.exports = router;
```

#### Day 3-4: 规范Controller层

**模板**:
```javascript
// backend/src/api/controllers/testController.js
const testService = require('../../services/testService');

class TestController {
  async getAll(req, res, next) {
    try {
      const { page, limit, status } = req.query;
      const result = await testService.getAll({ page, limit, status });
      res.success(result);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const test = await testService.create(req.body);
      res.created(test);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TestController();
```

#### Day 5: 实现Repository层

**验收标准**:
- [ ] 路由统一管理
- [ ] Controller规范
- [ ] Service和Repository分离

---

### 第6周: 测试和优化

#### Day 1-3: 补充单元测试

**目标覆盖率**: 70%+

**重点测试**:
- [ ] API客户端
- [ ] Repository层
- [ ] Service层
- [ ] 核心Hooks

#### Day 4: 性能优化

**优化点**:
- [ ] API请求缓存
- [ ] 组件懒加载
- [ ] 减少不必要的渲染

#### Day 5: 文档完善

**文档清单**:
- [ ] API文档更新
- [ ] 组件使用文档
- [ ] 架构决策记录(ADR)

---

## 📊 进度跟踪

### 每日检查
```bash
npm run arch:check
npm run type-check
npm run lint
```

### 每周报告

| 周数 | 错误数 | 警告数 | 测试覆盖率 | 备注 |
|------|--------|--------|-----------|------|
| Week 0 | 2 | 40 | - | 初始状态 |
| Week 1 | - | - | - | - |
| Week 2 | - | - | - | - |
| Week 3 | - | - | - | - |
| Week 4 | - | - | - | - |
| Week 5 | - | - | - | - |
| Week 6 | 0 | <5 | >70% | 目标 |

## 🎯 成功标准

### 必须达成
- [x] ~~错误数为0~~ (现在:2个)
- [ ] 警告数<5 (现在:40个)
- [ ] 测试覆盖率>70%
- [ ] 类型检查通过
- [ ] ESLint无错误

### 可选目标
- [ ] 性能提升20%
- [ ] 代码量减少10%
- [ ] 构建时间减少15%

## 🚨 风险控制

### 潜在风险

1. **时间不足**
   - 缓解: 采用渐进式重构,优先核心模块

2. **破坏现有功能**
   - 缓解: 充分的单元测试,小步提交

3. **团队抵触**
   - 缓解: 展示收益,提供培训

### 回滚计划

- 每个阶段独立提交
- 保留旧代码分支
- 问题严重时立即回滚

## 📞 支持资源

- **技术文档**: `docs/ARCHITECTURE_STANDARDS.md`
- **快速指南**: `ARCHITECTURE_GUIDE.md`
- **检查工具**: `npm run arch:check`
- **团队支持**: 每日站会,问题及时讨论

---

**开始日期**: _填写实际开始日期_
**预计完成**: _填写预计完成日期_
**负责人**: _填写负责人_
