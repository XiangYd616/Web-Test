# ⚡ Test-Web 立即行动计划

**创建日期**: 2026-01-14  
**执行策略**: 立即开始，渐进式重构  
**第一阶段目标**: 1周内完成基础清理

---

## 🎯 本周任务清单 (Week 1)

### ✅ 已完成

- [x] 项目现状评估
- [x] 创建重构路线图
- [x] 创建文档索引

### 🔥 进行中

#### 任务1: 文档结构整理 (今天完成)

**目标**: 清理混乱的文档，建立统一入口

**执行步骤**:

1. **归档过时README** ✅ 待执行

   ```
   移动: README_NEW.md → docs/archive/
   移动: QUICK_START_RESTRUCTURE.md → docs/archive/
   移动: SESSION_SUMMARY.md → docs/archive/
   移动: FINAL_WORK_SUMMARY.md → docs/archive/
   移动: PROJECT_RESTRUCTURE_ANALYSIS.md → docs/archive/
   ```

2. **清理TypeScript错误文档** ✅ 待执行

   ```
   保留: typescript-errors.txt
   删除: ts-errors-full.txt
   删除: ts-errors-batch1.txt
   删除: ts-current-errors.txt
   ```

3. **更新主README** ✅ 待执行
   - 添加文档导航链接
   - 简化快速开始部分
   - 添加重构状态说明

#### 任务2: 统一API服务 (今天-明天)

**目标**: 前端只保留一个API客户端

**当前问题**:

```
重复的API服务 (5个):
├── services/api/apiService.ts
├── services/api/baseApiService.ts
├── services/api/client.ts ← 选择这个作为标准
├── services/api/testApiService.ts
└── services/api.ts
```

**执行步骤**:

1. **分析现有API服务** ✅ 待执行
   - 读取所有API服务文件
   - 识别每个文件的功能
   - 确定需要保留的功能

2. **增强标准API客户端** ✅ 待执行
   - 合并所有必要功能到 `client.ts`
   - 确保完整的错误处理
   - 添加请求/响应拦截器

3. **更新所有导入** ✅ 待执行
   - 搜索所有API服务的导入
   - 替换为统一的客户端
   - 测试功能正常

4. **删除重复文件** ✅ 待执行
   - 删除4个重复的API服务文件
   - 提交Git记录

#### 任务3: 统一缓存服务 (明天)

**目标**: 合并重复的缓存实现

**当前问题**:

```
重复的缓存服务 (4个):
├── cache/cacheManager.ts ← 保留作为核心
├── cache/cacheService.ts
├── cache/testResultsCache.ts
└── cacheStrategy.ts
```

**执行步骤**:

1. **设计统一缓存架构** ✅ 待执行
2. **合并缓存功能** ✅ 待执行
3. **更新所有引用** ✅ 待执行
4. **删除重复实现** ✅ 待执行

#### 任务4: 修复构建错误 (本周末)

**目标**: 确保项目可以正常构建

**执行步骤**:

1. **运行类型检查** ✅ 待执行

   ```bash
   npm run type-check
   ```

2. **修复关键错误** ✅ 待执行
   - 导入路径错误
   - 类型定义缺失
   - 接口冲突

3. **验证构建** ✅ 待执行
   ```bash
   npm run build:check
   npm run build
   ```

---

## 📋 详细执行计划

### Phase 1: 文档清理 (2小时)

#### 步骤1: 创建归档目录

```bash
mkdir -p docs/archive
```

#### 步骤2: 移动过时文档

```bash
# 移动过时README
mv README_NEW.md docs/archive/
mv QUICK_START_RESTRUCTURE.md docs/archive/
mv SESSION_SUMMARY.md docs/archive/
mv FINAL_WORK_SUMMARY.md docs/archive/
mv PROJECT_RESTRUCTURE_ANALYSIS.md docs/archive/

# 移动TypeScript错误文档
mv ts-errors-full.txt docs/archive/
mv ts-errors-batch1.txt docs/archive/
mv ts-current-errors.txt docs/archive/
```

#### 步骤3: 更新主README

- 添加文档索引链接
- 添加重构状态说明
- 简化内容，突出重点

#### 步骤4: 创建开发者指南

- 新建 `docs/DEVELOPER_GUIDE.md`
- 包含开发环境配置
- 包含常见开发任务
- 包含调试技巧

### Phase 2: API服务统一 (4-6小时)

#### 步骤1: 分析现有API服务

**读取文件**:

- `frontend/services/api/apiService.ts`
- `frontend/services/api/baseApiService.ts`
- `frontend/services/api/client.ts`
- `frontend/services/api/testApiService.ts`
- `frontend/services/api.ts`

**功能对比**:

```
client.ts:
- ✅ 基础HTTP方法 (get, post, put, delete)
- ✅ 拦截器支持
- ✅ 错误处理
- ❌ 测试相关API
- ❌ 特定业务API

apiService.ts:
- ✅ 业务API封装
- ❌ 重复的HTTP客户端

testApiService.ts:
- ✅ 测试相关API
- ❌ 重复的HTTP客户端
```

#### 步骤2: 增强client.ts

**添加功能**:

```typescript
// 1. 添加测试相关API方法
class ApiClient {
  // ... 现有方法

  // 测试API
  async createTest(data: CreateTestDto) {}
  async getTestResults(testId: string) {}
  async startTest(testId: string) {}

  // 其他业务API
  // ...
}
```

**或者使用Repository模式**:

```typescript
// services/api/repositories/testRepository.ts
import { apiClient } from '../client';

export class TestRepository {
  async create(data: CreateTestDto) {
    return apiClient.post('/api/test', data);
  }
  // ...
}
```

#### 步骤3: 更新所有导入

**搜索并替换**:

```bash
# 搜索所有API服务导入
grep -r "from.*api/apiService" frontend/
grep -r "from.*api/testApiService" frontend/
grep -r "from.*services/api'" frontend/

# 替换为统一导入
# import { apiClient } from '@/services/api/client'
```

#### 步骤4: 删除重复文件

**删除列表**:

- `frontend/services/api/apiService.ts`
- `frontend/services/api/baseApiService.ts`
- `frontend/services/api/testApiService.ts`
- `frontend/services/api.ts`

**保留文件**:

- `frontend/services/api/client.ts` (核心)
- `frontend/services/api/interceptors.ts`
- `frontend/services/api/errorHandler.ts`
- `frontend/services/api/index.ts` (导出)

### Phase 3: 缓存服务统一 (3-4小时)

#### 步骤1: 分析缓存服务

**读取文件**:

- `frontend/services/cache/cacheManager.ts`
- `frontend/services/cache/cacheService.ts`
- `frontend/services/cache/testResultsCache.ts`
- `frontend/services/cacheStrategy.ts`

#### 步骤2: 设计统一架构

**目标结构**:

```
services/cache/
├── index.ts              # 统一导出
├── CacheManager.ts       # 核心缓存管理器
├── strategies/           # 缓存策略
│   ├── index.ts
│   ├── LRUStrategy.ts
│   ├── TTLStrategy.ts
│   └── MemoryStrategy.ts
├── types.ts              # 类型定义
└── instances/            # 特定缓存实例
    └── testResultsCache.ts
```

#### 步骤3: 实现统一缓存

**核心接口**:

```typescript
interface CacheManager<T> {
  get(key: string): T | null;
  set(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
}
```

#### 步骤4: 迁移现有缓存

**迁移步骤**:

1. 保留 `CacheManager.ts` 作为核心
2. 提取策略到 `strategies/`
3. 重构 `testResultsCache.ts` 使用 `CacheManager`
4. 删除 `cacheService.ts` (重复)
5. 删除根目录的 `cacheStrategy.ts`

### Phase 4: 构建修复 (2-3小时)

#### 步骤1: 运行类型检查

```bash
cd frontend
npm run type-check > ../typescript-errors.txt
```

#### 步骤2: 分类错误

**错误分类**:

```
类型1: 导入路径错误
类型2: 类型定义缺失
类型3: any类型问题
类型4: 接口冲突
```

#### 步骤3: 批量修复

**优先级**:

1. P0: 阻止构建的错误
2. P1: 导入路径错误
3. P2: 类型定义缺失
4. P3: any类型警告

#### 步骤4: 验证构建

```bash
npm run build:check
npm run build
npm run dev  # 测试运行
```

---

## 🎯 成功标准

### Week 1 结束时

- ✅ 根目录只有1个README.md
- ✅ 文档索引清晰完整
- ✅ 前端只有1个API客户端
- ✅ 缓存服务统一
- ✅ 项目可以正常构建
- ✅ 核心功能正常运行

### 质量指标

```
文档清理:
- 根目录README: 7个 → 1个
- 文档归档: 0% → 100%
- 文档索引: 无 → 完整

代码统一:
- API服务: 5个 → 1个
- 缓存服务: 4个 → 1个
- 代码重复: 30% → 25%

构建状态:
- TypeScript错误: 85个 → <60个
- 构建成功: ❌ → ✅
- 运行正常: ❌ → ✅
```

---

## 📝 执行日志

### 2026-01-14

**已完成**:

- [x] 创建项目评估报告
- [x] 创建重构路线图
- [x] 创建文档索引
- [x] 创建立即行动计划

**进行中**:

- [ ] 文档结构整理
- [ ] API服务统一
- [ ] 缓存服务统一
- [ ] 构建错误修复

**遇到的问题**:

- 无

**下一步**:

- 开始执行文档清理
- 分析API服务结构

---

## 🚀 开始执行

**当前任务**: Phase 1 - 文档清理  
**预计时间**: 2小时  
**开始时间**: 现在

---

**让我们开始重构！** 🎉
