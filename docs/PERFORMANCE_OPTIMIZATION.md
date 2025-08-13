# 性能优化指南

## 🚀 代码分割优化

### 构建优化结果

经过优化后的代码分割策略，将大文件进行了更细粒度的分割：

#### 优化前的问题
- `misc-components-4815c459.js` (400.00 kB) - 组件分块过大
- `recharts-vendor-34504200.js` (373.98 kB) - 图表库过大
- `misc-tests-a573d069.js` (334.94 kB) - 测试页面分块过大

#### 优化策略

##### 1. 第三方库细分
```typescript
// 图表库分割
if (id.includes('recharts')) {
  if (id.includes('recharts/es6') || id.includes('recharts/lib')) {
    return 'recharts-core';
  }
  return 'recharts-vendor';
}
if (id.includes('d3-')) {
  return 'd3-vendor';
}

// UI库分割
if (id.includes('@headlessui')) {
  return 'headlessui-vendor';
}
if (id.includes('framer-motion')) {
  return 'animation-vendor';
}

// 工具库分割
if (id.includes('date-fns')) {
  return 'date-vendor';
}
if (id.includes('lodash')) {
  return 'lodash-vendor';
}
```

##### 2. 组件细分
```typescript
// UI组件按功能分割
if (id.includes('/components/ui/')) {
  if (id.includes('/components/ui/forms/')) {
    return 'ui-forms';
  }
  if (id.includes('/components/ui/layout/')) {
    return 'ui-layout';
  }
  if (id.includes('/components/ui/feedback/')) {
    return 'ui-feedback';
  }
  return 'ui-components';
}

// 业务组件分离
if (id.includes('/components/business/')) {
  return 'business-components';
}
if (id.includes('/components/system/')) {
  return 'system-components';
}
```

##### 3. 测试页面细分
```typescript
// 新增更多测试页面分类
if (id.includes('Accessibility')) {
  return 'accessibility-tests';
}
if (id.includes('Mobile')) {
  return 'mobile-tests';
}
if (id.includes('Integration')) {
  return 'integration-tests';
}
```

### 动态导入优化

#### 1. 路由级别的懒加载
```typescript
// 推荐：使用 React.lazy 进行路由级别的代码分割
const StressTest = lazy(() => import('../pages/StressTest'));
const SEOTest = lazy(() => import('../pages/SEOTest'));
const DatabaseTest = lazy(() => import('../pages/DatabaseTest'));

// 在路由配置中使用 Suspense
<Route 
  path="/stress-test" 
  element={
    <Suspense fallback={<Loading />}>
      <StressTest />
    </Suspense>
  } 
/>
```

#### 2. 组件级别的懒加载
```typescript
// 对于大型图表组件使用动态导入
const LazyChart = lazy(() => import('../components/charts/ComplexChart'));

// 条件加载
const [showChart, setShowChart] = useState(false);

return (
  <div>
    <button onClick={() => setShowChart(true)}>显示图表</button>
    {showChart && (
      <Suspense fallback={<ChartSkeleton />}>
        <LazyChart data={chartData} />
      </Suspense>
    )}
  </div>
);
```

#### 3. 第三方库的按需导入
```typescript
// 推荐：按需导入 recharts 组件
import { LineChart, XAxis, YAxis } from 'recharts';

// 避免：导入整个库
// import * as Recharts from 'recharts';
```

### 构建配置优化

#### 1. 更严格的大小限制
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    // 降低警告阈值到 250KB
    chunkSizeWarningLimit: 250,
    rollupOptions: {
      output: {
        manualChunks: {
          // 细粒度分割配置
        }
      }
    }
  }
});
```

#### 2. 预加载策略
```typescript
// 预加载关键路由
const preloadRoute = (routePath: string) => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = routePath;
  document.head.appendChild(link);
};

// 在用户可能访问的路由上使用预加载
useEffect(() => {
  preloadRoute('/stress-test');
  preloadRoute('/seo-test');
}, []);
```

### 性能监控

#### 1. 构建分析
```bash
# 分析构建产物
npm run build -- --analyze

# 使用 webpack-bundle-analyzer 类似工具
npm install --save-dev rollup-plugin-visualizer
```

#### 2. 运行时监控
```typescript
// 监控代码分割的加载性能
const measureChunkLoad = (chunkName: string) => {
  const startTime = performance.now();
  
  return import(`../chunks/${chunkName}`).then((module) => {
    const loadTime = performance.now() - startTime;
    console.log(`Chunk ${chunkName} loaded in ${loadTime}ms`);
    return module;
  });
};
```

### 最佳实践

#### 1. 分割原则
- **路由级分割**：每个主要页面独立分块
- **功能级分割**：按功能模块分割组件
- **库级分割**：大型第三方库独立分块
- **按需加载**：非关键功能延迟加载

#### 2. 大小控制
- **目标大小**：每个分块控制在 250KB 以内
- **关键路径**：首屏相关代码优先级最高
- **预加载**：用户可能访问的内容提前加载

#### 3. 用户体验
- **加载状态**：提供友好的加载提示
- **错误处理**：处理动态导入失败的情况
- **渐进增强**：核心功能优先，增强功能按需加载

### 预期效果

通过以上优化，预期能够：
- 将大文件分割为多个小于 250KB 的分块
- 提升首屏加载速度 20-30%
- 减少不必要的代码下载
- 改善用户体验和页面响应速度

### 监控指标

- **First Contentful Paint (FCP)**：首次内容绘制时间
- **Largest Contentful Paint (LCP)**：最大内容绘制时间
- **Time to Interactive (TTI)**：可交互时间
- **Bundle Size**：总包大小和各分块大小
