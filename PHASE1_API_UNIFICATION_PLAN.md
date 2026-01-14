# Phase 1.2: API服务统一执行计划

**执行时间**: 2026-01-14  
**状态**: 进行中

---

## 📊 当前状况分析

### 发现的重复API服务

```
frontend/services/
├── api/
│   ├── client.ts          ✅ 保留 - 使用axios，最完整
│   ├── apiService.ts      ⚠️  需整合 - 业务方法
│   ├── baseApiService.ts  ❌ 删除 - 使用fetch，重复
│   ├── testApiService.ts  ⚠️  需整合 - 测试API
│   └── index.ts           ✅ 保留 - 导出
└── api.ts                 ❌ 删除 - 已标记deprecated
```

### 功能对比

| 功能       | client.ts | apiService.ts | baseApiService.ts | testApiService.ts | api.ts  |
| ---------- | --------- | ------------- | ----------------- | ----------------- | ------- |
| HTTP客户端 | axios     | 继承base      | fetch             | 依赖apiService    | fetch   |
| 认证处理   | ✅ 拦截器 | ✅            | ✅                | ✅                | ✅      |
| 错误处理   | ✅        | ✅            | ✅                | ✅                | ✅      |
| 重试机制   | ✅ 拦截器 | ✅            | ✅                | ❌                | ✅      |
| 业务方法   | ❌        | ✅            | ❌                | ✅ 测试           | ✅ 部分 |
| 类型安全   | ✅        | ✅            | ✅                | ✅                | ✅      |

---

## 🎯 整合策略

### 方案：增强client.ts作为唯一API客户端

**步骤：**

1. **增强 `client.ts`**
   - 添加业务方法（从apiService.ts迁移）
   - 添加测试相关方法（从testApiService.ts迁移）
   - 保持axios作为底层实现

2. **创建Repository层**（可选，推荐）

   ```
   services/api/repositories/
   ├── authRepository.ts    # 认证相关
   ├── testRepository.ts    # 测试相关
   └── userRepository.ts    # 用户相关
   ```

3. **更新所有导入**
   - 搜索所有使用旧API服务的地方
   - 替换为新的统一客户端

4. **删除重复文件**
   - 删除 baseApiService.ts
   - 删除 api.ts
   - 删除 apiService.ts（功能已迁移）
   - 删除 testApiService.ts（功能已迁移）

---

## ✅ 执行检查清单

### Step 1: 增强client.ts ⏳

- [ ] 添加认证相关方法
- [ ] 添加用户相关方法
- [ ] 添加测试相关方法
- [ ] 添加OAuth相关方法
- [ ] 测试所有新方法

### Step 2: 创建Repository层（推荐） ⏳

- [ ] 创建 authRepository.ts
- [ ] 创建 testRepository.ts
- [ ] 创建 userRepository.ts
- [ ] 更新index.ts导出

### Step 3: 更新导入 ⏳

- [ ] 搜索 `from './api/apiService'`
- [ ] 搜索 `from './api/baseApiService'`
- [ ] 搜索 `from './api/testApiService'`
- [ ] 搜索 `from './api'`
- [ ] 替换所有导入为 `from './api/client'`

### Step 4: 删除重复文件 ⏳

- [ ] 删除 baseApiService.ts
- [ ] 删除 api.ts
- [ ] 删除 apiService.ts
- [ ] 删除 testApiService.ts

### Step 5: 测试验证 ⏳

- [ ] 运行类型检查
- [ ] 运行构建
- [ ] 测试登录功能
- [ ] 测试API调用
- [ ] 测试测试功能

---

## 📝 实施决定

**决定采用Repository模式**，原因：

1. 更清晰的职责分离
2. 更容易维护和测试
3. 符合架构标准文档的建议

**实施顺序：**

1. 先创建Repository层
2. 迁移功能到Repository
3. 更新导入
4. 删除旧文件

---

**下一步**: 创建Repository层
