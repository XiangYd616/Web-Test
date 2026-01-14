# 缓存服务统一计划

**创建时间**: 2026-01-14  
**当前状态**: 分析阶段

---

## 📊 现有缓存服务分析

### 发现的缓存服务文件

```
frontend/services/
├── cache/
│   ├── cacheManager.ts        # 573行 - 完整的缓存管理器
│   ├── cacheService.ts        # 373行 - 统一缓存服务
│   ├── cacheStrategies.ts     # 未读取
│   └── testResultsCache.ts    # 未读取
├── cacheStrategy.ts           # 672行 - 缓存策略系统
└── api/core/
    └── apiCache.ts            # 88行 - API专用缓存
```

### 功能对比分析

| 功能             | cacheManager.ts | cacheService.ts | cacheStrategy.ts | apiCache.ts |
| ---------------- | --------------- | --------------- | ---------------- | ----------- |
| **内存缓存**     | ✅              | ✅              | ✅               | ✅          |
| **localStorage** | ✅              | ✅              | ✅               | ❌          |
| **TTL过期**      | ✅              | ✅              | ✅               | ✅          |
| **压缩**         | ✅              | ✅              | ✅               | ❌          |
| **加密**         | ❌              | ❌              | ✅               | ❌          |
| **缓存策略**     | 6种             | 基础            | 5种              | FIFO        |
| **统计监控**     | ✅              | ✅              | ✅               | ❌          |
| **自动清理**     | ✅              | ✅              | ✅               | ✅          |
| **代码行数**     | 573             | 373             | 672              | 88          |

### 重复度分析

```
核心功能重复: 85%
- get/set/delete/clear 方法: 100%重复
- TTL过期机制: 100%重复
- 内存缓存: 100%重复
- localStorage持久化: 75%重复

差异化功能:
- cacheManager.ts: 最完整，支持6种策略
- cacheService.ts: 简化版，适合一般使用
- cacheStrategy.ts: 策略丰富，支持加密
- apiCache.ts: 轻量级，仅用于API
```

---

## 🎯 统一策略

### 方案：保留cacheManager.ts作为统一缓存服务

**选择理由**:

1. ✅ 功能最完整（573行）
2. ✅ 支持6种缓存策略
3. ✅ 有完整的统计和监控
4. ✅ 代码结构清晰
5. ✅ 已经是"统一缓存管理服务"

### 整合计划

**Step 1: 增强cacheManager.ts**

- 添加cacheStrategy.ts的加密功能
- 添加更多缓存策略（LRU、LFU等）
- 优化性能

**Step 2: 创建适配器**

- 为cacheService.ts创建适配器
- 为apiCache.ts创建适配器
- 保持向后兼容

**Step 3: 逐步迁移**

- 更新导入路径
- 测试功能正常
- 删除重复文件

---

## 📝 具体执行步骤

### Phase 1: 增强cacheManager.ts ✅

**添加功能**:

```typescript
// 1. 添加加密支持
interface CacheConfig {
  // ... 现有配置
  enableEncryption?: boolean;
  encryptionKey?: string;
}

// 2. 添加更多策略
enum CacheStrategy {
  // ... 现有策略
  LRU = 'lru',
  LFU = 'lfu',
  ADAPTIVE = 'adaptive',
}

// 3. 添加命名空间支持
class CacheManager {
  createNamespace(name: string): CacheNamespace;
}
```

### Phase 2: 创建统一导出

**创建 `frontend/services/cache/index.ts`**:

```typescript
// 统一缓存服务导出
export { CacheManager } from './cacheManager';
export type {
  CacheConfig,
  CacheItem,
  CacheStrategy,
  CacheStats,
} from './cacheManager';

// 向后兼容导出
export { CacheManager as CacheService } from './cacheManager';
export { CacheManager as UnifiedCache } from './cacheManager';

// 创建默认实例
export const cacheManager = new CacheManager();
export const cacheService = cacheManager; // 别名
```

### Phase 3: 创建适配器

**为apiCache创建适配器**:

```typescript
// frontend/services/api/core/apiCache.ts (重构后)
import { cacheManager } from '@/services/cache';

export class ApiCache {
  private namespace = cacheManager.createNamespace('api');

  set<T>(key: string, data: T, ttl: number): void {
    this.namespace.set(key, data, ttl);
  }

  get<T>(key: string): T | null {
    return this.namespace.get<T>(key);
  }

  // ... 其他方法
}
```

### Phase 4: 更新使用

**搜索并替换**:

```bash
# 搜索所有使用旧缓存的地方
grep -r "from.*cacheService" frontend/
grep -r "from.*cacheStrategy" frontend/
grep -r "from.*apiCache" frontend/

# 替换为统一导入
import { cacheManager } from '@/services/cache';
```

---

## 🔄 迁移检查清单

### 准备阶段

- [x] 分析现有缓存服务
- [x] 确定统一方案
- [ ] 增强cacheManager.ts
- [ ] 创建统一导出
- [ ] 创建适配器

### 迁移阶段

- [ ] 更新30个使用缓存的文件
- [ ] 测试功能正常
- [ ] 验证性能

### 清理阶段

- [ ] 删除cacheService.ts
- [ ] 删除cacheStrategy.ts
- [ ] 删除重复的cacheStrategies.ts
- [ ] 更新文档

---

## 📊 预期收益

### 代码减少

```
删除文件: 3个
- cacheService.ts (373行)
- cacheStrategy.ts (672行)
- cacheStrategies.ts (估计200行)

总计减少: ~1,245行代码
减少比例: 68% (1245/1828)
```

### 维护改善

```
缓存服务: 4个 → 1个
API统一: 清晰明确
代码重复: 85% → 0%
```

---

## ⚠️ 风险评估

### 低风险

- ✅ 功能相似度高
- ✅ 接口基本一致
- ✅ 可以创建适配器

### 需要注意

- ⚠️ 30个文件使用缓存
- ⚠️ 需要仔细测试
- ⚠️ 可能影响性能

### 缓解措施

- ✅ 保持向后兼容
- ✅ 逐步迁移
- ✅ 充分测试

---

## 🚀 执行时间表

### 今天（2小时）

- ✅ 分析现有服务（30分钟）
- ⏳ 增强cacheManager（30分钟）
- ⏳ 创建统一导出（15分钟）
- ⏳ 创建适配器（30分钟）
- ⏳ 测试验证（15分钟）

### 明天（2小时）

- 更新使用的文件（1.5小时）
- 删除重复文件（15分钟）
- 完整测试（15分钟）

---

**下一步**: 增强cacheManager.ts，添加缺失功能
