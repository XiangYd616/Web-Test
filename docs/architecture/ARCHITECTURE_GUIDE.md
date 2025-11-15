# 架构统一快速指南

## 🎯 目标

统一项目架构,建立清晰的分层结构,提升代码质量和可维护性。

## 📋 核心问题

当前项目存在的主要架构问题:

1. **API服务重复定义** - api.ts、apiService.ts、baseApiService.ts等多个客户端
2. **业务逻辑分散** - 组件中直接调用API,缺乏业务层封装
3. **路由管理混乱** - 后端路由分散,缺乏统一管理
4. **组件职责不清** - UI渲染和业务逻辑混杂
5. **类型定义重复** - 多处定义相同的类型

## 🚀 快速开始

### 1. 检查当前架构

```bash
npm run arch:check
```

输出示例:
```
📋 检查 API 客户端统一性...
❌ API 客户端统一性
  ⚠️ 发现 3 个 API 客户端文件,应该只有一个统一的客户端
     💡 建议: 统一使用 services/api/client.ts 作为唯一的 API 客户端
```

### 2. 查看详细规范

```bash
# 查看完整架构文档
cat docs/ARCHITECTURE_STANDARDS.md
```

## 📁 标准目录结构

### 前端

```
frontend/
├── src/
│   ├── pages/                  # 📄 页面 - 仅路由和布局
│   ├── components/             # 🎨 组件 - 纯UI
│   │   ├── common/            # 通用组件
│   │   ├── business/          # 业务组件  
│   │   └── layout/            # 布局组件
│   ├── hooks/                 # 🪝 Hooks - 状态逻辑
│   ├── services/              # 🔧 服务层
│   │   ├── api/              # API客户端(唯一)
│   │   ├── business/         # 业务逻辑
│   │   └── repository/       # 数据访问
│   ├── types/                 # 📝 类型定义
│   ├── utils/                 # 🛠️ 工具函数
│   └── config/                # ⚙️ 配置文件
```

### 后端

```
backend/
├── src/
│   ├── api/                   # API层
│   │   ├── controllers/      # 控制器
│   │   ├── routes/           # 路由
│   │   └── middleware/       # 中间件
│   ├── services/             # 业务服务
│   ├── repositories/         # 数据访问
│   ├── models/               # 数据模型
│   └── utils/                # 工具函数
```

## 🔑 核心原则

### 分层架构

```
UI层(Pages/Components)
      ↓
业务层(Hooks/Services)
      ↓
数据层(Repository/API)
      ↓
基础层(Utils/Config)
```

### 单一职责

- **Pages**: 页面结构和路由 ❌ 不包含业务逻辑
- **Components**: UI渲染 ❌ 不直接调用API
- **Hooks**: 状态管理 ✅ 调用Service
- **Services**: 业务逻辑 ✅ 调用Repository
- **Repository**: API调用 ✅ 仅HTTP请求

## 📖 使用示例

### ❌ 错误示例

```typescript
// 组件直接调用API - 不推荐
function TestPage() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/test')
      .then(res => res.json())
      .then(data => setData(data));
  }, []);

  return <div>{/* UI */}</div>;
}
```

### ✅ 正确示例

```typescript
// 1. Repository层 - 数据访问
class TestRepository {
  async getAll() {
    return apiClient.get('/test');
  }
}

// 2. Service层 - 业务逻辑
class TestService {
  async getAllWithCache() {
    const cached = cache.get('tests');
    if (cached) return cached;
    
    const data = await testRepository.getAll();
    cache.set('tests', data);
    return data;
  }
}

// 3. Hook层 - 状态管理
function useTests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTests = async () => {
    setLoading(true);
    const data = await testService.getAllWithCache();
    setTests(data);
    setLoading(false);
  };

  return { tests, loading, loadTests };
}

// 4. 组件 - UI渲染
function TestPage() {
  const { tests, loading, loadTests } = useTests();

  useEffect(() => {
    loadTests();
  }, []);

  if (loading) return <Loading />;
  return <TestList tests={tests} />;
}
```

## 🛠️ 实施步骤

### 阶段1: 建立基础设施(1-2天)

```bash
# 1. 创建统一API客户端
mkdir -p frontend/services/api
touch frontend/services/api/client.ts

# 2. 创建Repository目录
mkdir -p frontend/services/repository

# 3. 创建业务服务目录
mkdir -p frontend/services/business

# 4. 统一类型定义
mkdir -p frontend/types
```

### 阶段2: 重构API层(2-3天)

1. 实现统一的API客户端
2. 创建各资源的Repository
3. 逐步迁移现有API调用

### 阶段3: 重构业务层(3-5天)

1. 提取组件中的业务逻辑到Service
2. 实现数据验证和转换
3. 添加缓存和优化

### 阶段4: 重构组件(2-3天)

1. 创建自定义Hooks
2. 简化组件逻辑
3. 移除直接API调用

### 阶段5: 后端重构(3-5天)

1. 统一路由管理
2. 规范Controller层
3. 实现Service和Repository分层

## 📊 验证清单

### API层
- [ ] 只有一个API客户端实例
- [ ] 所有请求通过统一客户端
- [ ] 统一的错误处理
- [ ] 统一的认证处理

### 业务层
- [ ] Service包含所有业务逻辑
- [ ] Repository仅负责数据访问
- [ ] 组件不直接调用API
- [ ] 充分使用自定义Hooks

### 代码质量
- [ ] TypeScript类型完整
- [ ] 单元测试覆盖>70%
- [ ] ESLint无错误
- [ ] 代码注释清晰

## 🔍 持续监控

### 每次提交前

```bash
# 检查架构规范
npm run arch:check

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 完整验证
npm run arch:validate
```

### 每周审查

- 运行架构检查,记录问题数量
- 评估代码质量趋势
- 更新重构计划

## 📚 相关文档

- [完整架构规范](./docs/ARCHITECTURE_STANDARDS.md) - 详细的架构设计文档
- [版本管理规范](./VERSION_GUIDE.md) - 依赖版本统一管理
- [API设计规范](./docs/API_STANDARDS.md) - RESTful API设计指南(待创建)
- [TypeScript规范](./docs/TYPESCRIPT_STANDARDS.md) - TS编码规范(待创建)

## 💡 最佳实践

### DO ✅

- 使用分层架构,职责分明
- 所有API调用通过统一客户端
- 业务逻辑封装在Service中
- 组件专注于UI渲染
- 使用TypeScript严格模式
- 编写单元测试

### DON'T ❌

- 组件中直接调用API
- 业务逻辑写在组件中
- 多处定义相同的类型
- 忽略错误处理
- 跳过类型定义
- 缺少注释文档

## 🆘 常见问题

### Q: 现有代码太多,如何开始重构?

A: 采用渐进式重构策略:
1. 先建立新的标准结构
2. 新功能按新标准开发
3. 修改旧代码时顺便重构
4. 每周重构1-2个模块

### Q: 是否需要停止功能开发来重构?

A: 不需要。重构可以与功能开发并行:
- 新功能使用新架构
- 修复bug时重构相关代码
- 利用空闲时间重构旧代码

### Q: 如何说服团队采用新架构?

A: 展示收益:
- 代码更易维护
- bug更少
- 新人上手更快
- 测试覆盖率提升

## 📈 预期收益

### 短期(1-2个月)
- 代码结构更清晰
- 新功能开发更快
- Bug减少20-30%

### 中期(3-6个月)
- 测试覆盖率达到70%+
- 代码审查效率提升50%
- 新人培训时间减半

### 长期(6个月+)
- 技术债务显著减少
- 系统稳定性提升
- 团队生产力提升30%

---

**开始行动**: 运行 `npm run arch:check` 检查当前状态 🚀
