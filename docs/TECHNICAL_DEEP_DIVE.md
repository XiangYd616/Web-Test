# Test-Web 技术深度解析

本文档面向**中高级开发者**，深入讲解项目中的关键技术实现、设计模式、最佳实践和踩坑经验。

---

## 目录

1. [前端技术深度](#一前端技术深度)
2. [后端技术深度](#二后端技术深度)
3. [架构设计模式](#三架构设计模式)
4. [性能优化实战](#四性能优化实战)
5. [安全实践详解](#五安全实践详解)
6. [数据库优化技巧](#六数据库优化技巧)
7. [测试工程实践](#七测试工程实践)
8. [DevOps 最佳实践](#八devops-最佳实践)
9. [常见问题与解决方案](#九常见问题与解决方案)
10. [进阶学习资源](#十进阶学习资源)

---

## 一、前端技术深度

### 1.1 React 18 新特性应用

#### 1.1.1 Concurrent Features（并发特性）

```typescript
// 使用 Suspense 实现优雅的加载状态
import { Suspense, lazy } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

**关键点**：
- `Suspense` 可以在数据加载、代码分割时显示 fallback UI
- React 18 的并发渲染可以中断低优先级更新
- `startTransition` 用于标记非紧急更新

#### 1.1.2 自动批处理（Automatic Batching）

```typescript
// React 18 之前：只在事件处理器中批处理
// React 18：所有更新都自动批处理

function handleClick() {
  setCount(c => c + 1);
  setFlag(f => !f);
  // 即使在 Promise、setTimeout 中也会批处理
}
```

**性能提升**：减少重复渲染，提升 30%+ 性能

---

### 1.2 TypeScript 高级技巧

#### 1.2.1 类型推导与泛型约束

```typescript
// 泛型函数：自动推导返回类型
async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url);
  return response.json();
}

// 使用：自动推导出 User 类型
const user = await fetchData<User>('/api/user');

// 泛型约束：限制类型必须有特定属性
function getProperty<T, K extends keyof T>(obj: T, key: K) {
  return obj[key];
}
```

#### 1.2.2 高级类型工具

```typescript
// Utility Types 应用
type PartialUser = Partial<User>;           // 所有属性可选
type ReadonlyUser = Readonly<User>;         // 所有属性只读
type UserKeys = keyof User;                 // 'id' | 'name' | 'email'
type PickedUser = Pick<User, 'id' | 'name'>; // 挑选部分属性

// 条件类型：根据条件选择类型
type IsString<T> = T extends string ? true : false;

// 映射类型：批量转换属性
type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};
```

---

### 1.3 Vite 构建优化深度

#### 1.3.1 代码分割策略

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 策略1：按库分割
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('chart')) return 'chart-vendor';
            return 'vendor';
          }
          
          // 策略2：按功能模块分割
          if (id.includes('/pages/')) {
            // 提取页面路径
            const match = id.match(/pages\/(\w+)/);
            if (match) return `page-${match[1]}`;
          }
          
          // 策略3：按组件类型分割
          if (id.includes('/components/')) {
            if (id.includes('charts')) return 'chart-components';
            if (id.includes('ui')) return 'ui-components';
          }
        },
        
        // 资源命名策略
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').pop();
          if (/png|jpe?g|svg|gif|webp|ico/i.test(extType || '')) {
            return 'assets/images/[name]-[hash].[ext]';
          }
          if (/woff2?|eot|ttf|otf/i.test(extType || '')) {
            return 'assets/fonts/[name]-[hash].[ext]';
          }
          return 'assets/[ext]/[name]-[hash].[ext]';
        }
      }
    },
    
    // 压缩配置
    minify: 'esbuild',
    target: 'esnext',
    
    // Chunk 大小警告阈值
    chunkSizeWarningLimit: 300 // KB
  }
});
```

#### 1.3.2 依赖预构建优化

```typescript
export default defineConfig({
  optimizeDeps: {
    // 强制预构建的依赖
    include: ['react', 'react-dom', 'axios'],
    
    // 排除预构建（用于链接本地包）
    exclude: ['@local/shared-ui'],
    
    // esbuild 配置
    esbuildOptions: {
      target: 'esnext',
      supported: { bigint: true }
    }
  }
});
```

---

### 1.4 状态管理最佳实践

#### 1.4.1 Context API 性能优化

```typescript
// 问题：Context 值变化导致所有消费者重新渲染
// 解决：拆分 Context，按功能划分

// ❌ 不好的做法
const AppContext = createContext({
  user: null,
  theme: 'dark',
  settings: {}
  // 所有状态放一起
});

// ✅ 好的做法：按功能拆分
const UserContext = createContext(null);
const ThemeContext = createContext('dark');
const SettingsContext = createContext({});

// 进一步优化：使用 useMemo 缓存 Context value
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  
  // 缓存 value，避免每次渲染创建新对象
  const value = useMemo(() => ({ user, setUser }), [user]);
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

#### 1.4.2 自定义 Hook 封装

```typescript
// 通用数据获取 Hook
function useApi<T>(url: string, options?: RequestInit) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    let cancelled = false;
    
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(url, options);
        const json = await response.json();
        
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    
    fetchData();
    
    // 清理函数：防止内存泄漏
    return () => { cancelled = true; };
  }, [url, JSON.stringify(options)]);
  
  return { data, loading, error };
}

// 使用
const { data, loading, error } = useApi<User>('/api/user');
```

---

## 二、后端技术深度

### 2.1 Express 中间件设计

#### 2.1.1 中间件执行顺序与原理

```javascript
// Express 中间件本质是洋葱模型
app.use(async (req, res, next) => {
  console.log('1. 进入中间件 A');
  await next(); // 调用下一个中间件
  console.log('6. 退出中间件 A');
});

app.use(async (req, res, next) => {
  console.log('2. 进入中间件 B');
  await next();
  console.log('5. 退出中间件 B');
});

app.get('/', (req, res) => {
  console.log('3. 路由处理');
  res.send('Hello');
  console.log('4. 响应已发送');
});

// 输出顺序：1 → 2 → 3 → 4 → 5 → 6
```

#### 2.1.2 异步错误处理中间件

```javascript
// 通用异步处理器：捕获 Promise 错误
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 使用
app.get('/users', asyncHandler(async (req, res) => {
  const users = await db.query('SELECT * FROM users');
  res.json(users);
  // 如果 query 抛出异常，会自动被 catch 并传给错误处理中间件
}));

// 统一错误处理中间件（必须放在最后）
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

---

### 2.2 数据库连接池深度优化

#### 2.2.1 连接池参数调优

```javascript
const pool = new Pool({
  // 最大连接数：根据数据库服务器和应用负载调整
  // 经验值：(核心数 × 2) + 有效磁盘数
  max: 20,
  
  // 最小连接数：保持热连接，减少建立连接开销
  min: 5,
  
  // 空闲超时：30秒无活动则释放连接
  idleTimeoutMillis: 30000,
  
  // 连接超时：5秒内无法获取连接则报错
  connectionTimeoutMillis: 5000,
  
  // 请求超时：60秒内必须获取到连接
  acquireTimeoutMillis: 60000,
  
  // 连接存活检查间隔
  reapIntervalMillis: 1000,
  
  // 创建连接失败重试
  createRetryIntervalMillis: 200,
  createTimeoutMillis: 30000
});

// 监听连接池事件
pool.on('connect', (client) => {
  console.log('新连接建立');
  // 设置连接级参数
  client.query("SET timezone = 'UTC'");
});

pool.on('acquire', (client) => {
  console.log('连接被获取');
});

pool.on('release', (client) => {
  console.log('连接被释放');
});

pool.on('error', (err, client) => {
  console.error('连接池错误:', err);
});
```

#### 2.2.2 事务与并发控制

```javascript
// 手动事务控制
async function transferMoney(fromId, toId, amount) {
  const client = await pool.connect();
  
  try {
    // 开始事务
    await client.query('BEGIN');
    
    // 悲观锁：FOR UPDATE 锁定行
    const { rows } = await client.query(
      'SELECT balance FROM accounts WHERE id = $1 FOR UPDATE',
      [fromId]
    );
    
    if (rows[0].balance < amount) {
      throw new Error('余额不足');
    }
    
    // 扣款
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromId]
    );
    
    // 加款
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toId]
    );
    
    // 提交事务
    await client.query('COMMIT');
    
  } catch (err) {
    // 回滚事务
    await client.query('ROLLBACK');
    throw err;
    
  } finally {
    // 释放连接
    client.release();
  }
}
```

---

### 2.3 缓存策略深度解析

#### 2.3.1 多级缓存架构

```typescript
class MultiLevelCache {
  private l1Cache: LRUCache; // 内存缓存（最快）
  private l2Cache: LocalStorageCache; // LocalStorage（持久化）
  private l3Cache: RedisCache; // Redis（分布式）
  
  async get(key: string) {
    // L1: 内存缓存
    let value = this.l1Cache.get(key);
    if (value !== undefined) {
      console.log('L1 缓存命中');
      return value;
    }
    
    // L2: LocalStorage
    value = this.l2Cache.get(key);
    if (value !== undefined) {
      console.log('L2 缓存命中');
      this.l1Cache.set(key, value); // 回填 L1
      return value;
    }
    
    // L3: Redis
    value = await this.l3Cache.get(key);
    if (value !== undefined) {
      console.log('L3 缓存命中');
      this.l1Cache.set(key, value); // 回填 L1
      this.l2Cache.set(key, value); // 回填 L2
      return value;
    }
    
    // 缓存未命中：从源获取
    console.log('缓存未命中，从源获取');
    return null;
  }
  
  async set(key: string, value: any, ttl: number) {
    // 同时写入所有层级
    this.l1Cache.set(key, value);
    this.l2Cache.set(key, value);
    await this.l3Cache.set(key, value, ttl);
  }
}
```

#### 2.3.2 缓存失效策略

```typescript
// 策略1：TTL（Time To Live）- 定时过期
cache.set('user:123', userData, { ttl: 3600 }); // 1小时后过期

// 策略2：LRU（Least Recently Used）- 最近最少使用
class LRUCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  get(key) {
    if (!this.cache.has(key)) return undefined;
    
    // 移到末尾（表示最近使用）
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }
  
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    this.cache.set(key, value);
    
    // 超过容量：删除最久未使用的（Map 第一个元素）
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
}

// 策略3：主动失效 - 数据变更时清除
async function updateUser(userId, data) {
  await db.update('users', userId, data);
  // 清除相关缓存
  await cache.delete(`user:${userId}`);
  await cache.delete(`user:${userId}:profile`);
}
```

---

## 三、架构设计模式

### 3.1 统一服务架构（Service Layer）

```typescript
// 问题：业务逻辑散落在路由处理器中，难以复用和测试

// 解决：服务层模式
// src/services/UserService.ts
class UserService {
  constructor(
    private db: Database,
    private cache: CacheService,
    private logger: Logger
  ) {}
  
  async getUserById(userId: string): Promise<User> {
    // 1. 尝试从缓存获取
    const cached = await this.cache.get(`user:${userId}`);
    if (cached) {
      this.logger.debug('缓存命中');
      return cached;
    }
    
    // 2. 从数据库查询
    const user = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    
    if (!user) {
      throw new NotFoundError('用户不存在');
    }
    
    // 3. 写入缓存
    await this.cache.set(`user:${userId}`, user, { ttl: 3600 });
    
    return user;
  }
  
  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    // 业务验证
    if (data.email && !this.isValidEmail(data.email)) {
      throw new ValidationError('邮箱格式不正确');
    }
    
    // 更新数据库
    const updated = await this.db.update('users', userId, data);
    
    // 清除缓存
    await this.cache.delete(`user:${userId}`);
    
    // 发布事件（解耦）
    this.eventBus.emit('user.updated', { userId, data });
    
    return updated;
  }
  
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

// 在路由中使用（依赖注入）
router.get('/users/:id', async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.json({ success: true, data: user });
});
```

---

### 3.2 策略模式（测试引擎）

```typescript
// 问题：不同类型测试的逻辑混杂在一起

// 解决：策略模式 - 将算法封装成独立的策略类
interface TestEngine {
  name: string;
  version: string;
  executeTest(config: TestConfig): Promise<TestResult>;
  checkAvailability(): { available: boolean };
}

// 策略1：性能测试引擎
class PerformanceTestEngine implements TestEngine {
  name = 'performance';
  version = '1.0.0';
  
  async executeTest(config: PerformanceTestConfig) {
    // 使用 Lighthouse 进行性能审计
    const result = await lighthouse(config.url, {
      onlyCategories: ['performance'],
      emulatedFormFactor: config.device
    });
    
    return this.formatResult(result);
  }
  
  checkAvailability() {
    return { available: true };
  }
}

// 策略2：SEO 测试引擎
class SEOTestEngine implements TestEngine {
  name = 'seo';
  version = '1.0.0';
  
  async executeTest(config: SEOTestConfig) {
    // 使用 Cheerio 解析 HTML
    const html = await this.fetchPage(config.url);
    const $ = cheerio.load(html);
    
    return {
      title: $('title').text(),
      metaDescription: $('meta[name="description"]').attr('content'),
      h1Count: $('h1').length,
      // ... 更多 SEO 指标
    };
  }
  
  checkAvailability() {
    return { available: true };
  }
}

// 测试引擎管理器（Context）
class TestEngineManager {
  private engines = new Map<string, TestEngine>();
  
  registerEngine(engine: TestEngine) {
    this.engines.set(engine.name, engine);
  }
  
  async runTest(type: string, config: TestConfig) {
    const engine = this.engines.get(type);
    
    if (!engine) {
      throw new Error(`未知的测试类型: ${type}`);
    }
    
    if (!engine.checkAvailability().available) {
      throw new Error(`测试引擎 ${type} 不可用`);
    }
    
    return await engine.executeTest(config);
  }
}

// 使用
const manager = new TestEngineManager();
manager.registerEngine(new PerformanceTestEngine());
manager.registerEngine(new SEOTestEngine());

const result = await manager.runTest('performance', { url: 'https://example.com' });
```

---

### 3.3 观察者模式（事件驱动）

```typescript
// 事件总线实现
class EventBus {
  private listeners = new Map<string, Set<Function>>();
  
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    // 返回取消订阅函数
    return () => this.off(event, callback);
  }
  
  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }
  
  emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

// 使用：测试进度通知
class BackgroundTestManager {
  private eventBus = new EventBus();
  
  startTest(type: string, config: any) {
    const testId = generateId();
    
    this.runTest(testId, type, config);
    
    return testId;
  }
  
  private async runTest(testId: string, type: string, config: any) {
    try {
      // 发送进度事件
      this.eventBus.emit('test:progress', {
        testId,
        progress: 0,
        message: '初始化...'
      });
      
      // 执行测试
      const result = await this.engine.run(type, config);
      
      // 发送完成事件
      this.eventBus.emit('test:completed', {
        testId,
        result
      });
      
    } catch (error) {
      // 发送失败事件
      this.eventBus.emit('test:failed', {
        testId,
        error: error.message
      });
    }
  }
  
  // 订阅事件
  onProgress(callback: Function) {
    return this.eventBus.on('test:progress', callback);
  }
  
  onCompleted(callback: Function) {
    return this.eventBus.on('test:completed', callback);
  }
}

// 使用
const manager = new BackgroundTestManager();

// 订阅进度
const unsubscribe = manager.onProgress((data) => {
  console.log(`测试进度: ${data.progress}% - ${data.message}`);
});

// 启动测试
const testId = manager.startTest('performance', { url: 'https://example.com' });

// 取消订阅
unsubscribe();
```

---

## 四、性能优化实战

### 4.1 前端渲染性能

#### 4.1.1 虚拟列表（Virtual Scrolling）

```typescript
// 问题：渲染 10000+ 条数据导致页面卡顿
// 解决：只渲染可见区域的元素

function VirtualList({ items, itemHeight = 50, containerHeight = 600 }) {
  const [scrollTop, setScrollTop] = useState(0);
  
  // 计算可见范围
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
  
  // 只渲染可见项 + 缓冲区
  const visibleItems = items.slice(
    Math.max(0, startIndex - 5),
    Math.min(items.length, endIndex + 5)
  );
  
  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* 占位元素：撑开滚动高度 */}
      <div style={{ height: items.length * itemHeight }}>
        {/* 可见项：绝对定位 */}
        <div style={{ position: 'relative' }}>
          {visibleItems.map((item, index) => (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                top: (startIndex + index) * itemHeight,
                height: itemHeight
              }}
            >
              {item.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### 4.1.2 React.memo 与 useCallback

```typescript
// 问题：父组件更新导致子组件不必要的重新渲染

// 解决1：React.memo（类似 PureComponent）
const ExpensiveComponent = React.memo(({ data, onAction }) => {
  console.log('渲染 ExpensiveComponent');
  return <div>{/* 复杂的渲染逻辑 */}</div>;
}, (prevProps, nextProps) => {
  // 自定义比较函数（可选）
  return prevProps.data.id === nextProps.data.id;
});

// 解决2：useCallback 缓存函数
function ParentComponent() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  
  // ❌ 每次渲染都创建新函数
  const handleClick = () => {
    console.log('clicked');
  };
  
  // ✅ 使用 useCallback 缓存
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []); // 依赖为空，函数永不变化
  
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <ExpensiveComponent data={items} onAction={handleClick} />
    </div>
  );
}
```

---

### 4.2 后端性能优化

#### 4.2.1 数据库查询优化

```sql
-- 问题：N+1 查询
-- 查询所有用户
SELECT * FROM users; -- 1次查询

-- 循环查询每个用户的订单
SELECT * FROM orders WHERE user_id = 1; -- N次查询
SELECT * FROM orders WHERE user_id = 2;
-- ...

-- 解决：使用 JOIN 一次查询
SELECT 
  u.*,
  o.id AS order_id,
  o.total AS order_total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- 优化：添加索引
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- 复合索引（覆盖查询）
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- 查询计划分析
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 123 AND status = 'completed';
```

#### 4.2.2 API 响应优化

```javascript
// 问题：返回大量不必要的数据

// 解决1：字段过滤（Projection）
router.get('/users', async (req, res) => {
  const { fields } = req.query;
  
  // 只查询需要的字段
  const selectedFields = fields ? fields.split(',') : ['id', 'name', 'email'];
  const users = await db.query(
    `SELECT ${selectedFields.join(', ')} FROM users`
  );
  
  res.json(users);
});

// 解决2：分页
router.get('/users', async (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;
  
  const [users, total] = await Promise.all([
    db.query('SELECT * FROM users LIMIT $1 OFFSET $2', [pageSize, offset]),
    db.query('SELECT COUNT(*) FROM users')
  ]);
  
  res.json({
    data: users,
    meta: {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total: total[0].count,
      hasMore: offset + users.length < total[0].count
    }
  });
});

// 解决3：压缩响应
const compression = require('compression');
app.use(compression({ level: 6 })); // Gzip 压缩级别
```

---

## 五、安全实践详解

### 5.1 JWT 认证最佳实践

```typescript
// JWT 双 Token 机制
class AuthService {
  // 生成 Token 对
  generateTokenPair(user: User) {
    // Access Token：短期（15分钟）
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );
    
    // Refresh Token：长期（7天）
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.REFRESH_TOKEN_SECRET!,
      { expiresIn: '7d' }
    );
    
    return { accessToken, refreshToken };
  }
  
  // 刷新 Access Token
  async refreshAccessToken(refreshToken: string) {
    try {
      // 验证 Refresh Token
      const payload = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET!
      ) as any;
      
      if (payload.type !== 'refresh') {
        throw new Error('无效的 Refresh Token');
      }
      
      // 检查 Token 是否在黑名单中（被撤销）
      const isRevoked = await this.isTokenRevoked(refreshToken);
      if (isRevoked) {
        throw new Error('Token 已被撤销');
      }
      
      // 生成新的 Access Token
      const user = await this.getUserById(payload.userId);
      const accessToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );
      
      return { accessToken };
      
    } catch (error) {
      throw new Error('Token 刷新失败');
    }
  }
  
  // Token 撤销（登出）
  async revokeToken(token: string) {
    const payload = jwt.decode(token) as any;
    const expiry = payload.exp;
    
    // 将 Token 加入黑名单（Redis）
    await redis.set(
      `revoked:${token}`,
      '1',
      'EX',
      expiry - Math.floor(Date.now() / 1000)
    );
  }
}
```

---

### 5.2 输入验证与消毒

```javascript
const { body, validationResult } = require('express-validator');

router.post('/users',
  [
    // 邮箱验证
    body('email')
      .isEmail().withMessage('邮箱格式不正确')
      .normalizeEmail() // 消毒：转小写、去空格
      .custom(async (email) => {
        // 自定义验证：邮箱唯一性
        const exists = await db.exists('users', { email });
        if (exists) throw new Error('邮箱已被注册');
      }),
    
    // 密码强度验证
    body('password')
      .isLength({ min: 8 }).withMessage('密码至少8位')
      .matches(/[A-Z]/).withMessage('密码需包含大写字母')
      .matches(/[a-z]/).withMessage('密码需包含小写字母')
      .matches(/[0-9]/).withMessage('密码需包含数字')
      .matches(/[@$!%*?&#]/).withMessage('密码需包含特殊字符'),
    
    // URL 验证
    body('website')
      .optional()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('网址格式不正确'),
    
    // XSS 防护
    body('bio')
      .trim()
      .escape() // 转义 HTML 字符
      .isLength({ max: 500 }).withMessage('个人简介不超过500字')
  ],
  async (req, res) => {
    // 检查验证结果
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // 业务逻辑...
  }
);
```

---

## 六、数据库优化技巧

### 6.1 索引设计原则

```sql
-- 1. 单列索引
CREATE INDEX idx_users_email ON users(email);

-- 2. 复合索引（顺序很重要）
-- 原则：选择性高的列放前面
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC);

-- 查询1（使用索引）
SELECT * FROM orders WHERE user_id = 123 AND created_at > '2024-01-01';

-- 查询2（使用索引）
SELECT * FROM orders WHERE user_id = 123;

-- 查询3（不使用索引，因为跳过了第一列）
SELECT * FROM orders WHERE created_at > '2024-01-01';

-- 3. 覆盖索引（避免回表）
CREATE INDEX idx_orders_covering ON orders(user_id, status, total);

-- 查询只需读取索引，不需访问表数据
SELECT user_id, status, total FROM orders WHERE user_id = 123;

-- 4. 部分索引（减少索引大小）
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- 5. 表达式索引
CREATE INDEX idx_lower_email ON users(LOWER(email));

-- 查询使用索引
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
```

---

### 6.2 查询优化技巧

```sql
-- 技巧1：避免 SELECT *
-- ❌ 不好
SELECT * FROM users;

-- ✅ 好
SELECT id, name, email FROM users;

-- 技巧2：使用 EXISTS 代替 IN（子查询）
-- ❌ 不好
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders);

-- ✅ 好
SELECT * FROM users u WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.user_id = u.id
);

-- 技巧3：分页优化（避免大偏移量）
-- ❌ 不好（OFFSET 10000 很慢）
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 10000;

-- ✅ 好（使用游标）
SELECT * FROM users WHERE id > 10000 ORDER BY id LIMIT 20;

-- 技巧4：避免函数包裹索引列
-- ❌ 不好（无法使用索引）
SELECT * FROM users WHERE YEAR(created_at) = 2024;

-- ✅ 好
SELECT * FROM users 
WHERE created_at >= '2024-01-01' 
  AND created_at < '2025-01-01';

-- 技巧5：使用 UNION ALL 代替 UNION（避免去重）
-- ❌ 慢（需要去重）
SELECT id FROM users WHERE status = 'active'
UNION
SELECT id FROM users WHERE role = 'admin';

-- ✅ 快（不去重）
SELECT id FROM users WHERE status = 'active'
UNION ALL
SELECT id FROM users WHERE role = 'admin';
```

---

## 七、测试工程实践

### 7.1 单元测试最佳实践

```typescript
// 使用 Vitest
import { describe, it, expect, vi } from 'vitest';

describe('UserService', () => {
  // 测试1：正常流程
  it('should return user by id', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue([{ id: 1, name: 'Alice' }])
    };
    
    const service = new UserService(mockDb);
    const user = await service.getUserById('1');
    
    expect(user).toEqual({ id: 1, name: 'Alice' });
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE id = $1',
      ['1']
    );
  });
  
  // 测试2：异常情况
  it('should throw error when user not found', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue([])
    };
    
    const service = new UserService(mockDb);
    
    await expect(service.getUserById('999'))
      .rejects
      .toThrow('用户不存在');
  });
  
  // 测试3：边界条件
  it('should validate email format', () => {
    const service = new UserService(mockDb);
    
    expect(service.isValidEmail('test@example.com')).toBe(true);
    expect(service.isValidEmail('invalid-email')).toBe(false);
  });
});
```

---

### 7.2 E2E 测试（Playwright）

```typescript
import { test, expect } from '@playwright/test';

test.describe('登录流程', () => {
  test('用户登录成功', async ({ page }) => {
    // 1. 访问登录页
    await page.goto('http://localhost:5174/login');
    
    // 2. 填写表单
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    
    // 3. 提交表单
    await page.click('button[type="submit"]');
    
    // 4. 验证跳转到仪表板
    await expect(page).toHaveURL('/dashboard');
    
    // 5. 验证用户名显示
    await expect(page.locator('.user-name')).toContainText('test@example.com');
  });
  
  test('显示登录错误', async ({ page }) => {
    await page.goto('http://localhost:5174/login');
    
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    
    // 验证错误提示
    await expect(page.locator('.error-message'))
      .toContainText('邮箱或密码错误');
  });
});
```

---

## 八、DevOps 最佳实践

### 8.1 Docker 多阶段构建

```dockerfile
# 阶段1：构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖（包括 devDependencies）
RUN npm ci

# 复制源码
COPY . .

# 构建
RUN npm run build

# 阶段2：生产镜像（更小）
FROM node:18-alpine

WORKDIR /app

# 只复制生产依赖
COPY package*.json ./
RUN npm ci --only=production

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 非 root 用户运行
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

---

### 8.2 GitHub Actions 优化

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

# 并发控制：同一分支只运行最新的工作流
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # Job 1: 代码质量检查
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # 缓存依赖
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
      
      - name: Install dependencies
        run: npm ci
      
      # 并行运行检查
      - name: Run checks
        run: |
          npm run lint &
          npm run type-check &
          npm run test &
          wait
  
  # Job 2: 构建 Docker 镜像
  build:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Docker BuildKit 加速
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      # 缓存 Docker 层
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## 九、常见问题与解决方案

### 9.1 内存泄漏排查

```typescript
// 问题：事件监听器未清理
useEffect(() => {
  const handleScroll = () => { /* ... */ };
  
  window.addEventListener('scroll', handleScroll);
  
  // ❌ 忘记清理
  // return () => window.removeEventListener('scroll', handleScroll);
}, []);

// 解决：使用清理函数
useEffect(() => {
  const handleScroll = () => { /* ... */ };
  
  window.addEventListener('scroll', handleScroll);
  
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}, []);

// 问题：定时器未清理
useEffect(() => {
  const timer = setInterval(() => {
    console.log('tick');
  }, 1000);
  
  // ❌ 组件卸载后定时器仍在运行
}, []);

// 解决
useEffect(() => {
  const timer = setInterval(() => {
    console.log('tick');
  }, 1000);
  
  return () => clearInterval(timer);
}, []);
```

---

### 9.2 CORS 问题解决

```javascript
// 后端配置
const cors = require('cors');

// 方案1：允许所有来源（仅开发环境）
app.use(cors());

// 方案2：白名单（生产环境）
const corsOptions = {
  origin: (origin, callback) => {
    const whitelist = [
      'http://localhost:5174',
      'https://yourdomain.com'
    ];
    
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // 允许携带 Cookie
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// 方案3：代理（Vite）
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

---

## 十、进阶学习资源

- **React 官方文档**: https://react.dev
- **TypeScript 手册**: https://www.typescriptlang.org/docs
- **Node.js 最佳实践**: https://github.com/goldbergyoni/nodebestpractices
- **PostgreSQL 性能优化**: https://wiki.postgresql.org/wiki/Performance_Optimization
- **Web.dev（性能与SEO）**: https://web.dev

---

最后更新：2024-10-29

