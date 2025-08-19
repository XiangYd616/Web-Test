# 构建配置指南 🏗️

## 🎯 当前构建状态

✅ **构建状态**: 正常  
✅ **构建时间**: < 30秒  
✅ **包大小**: 优化完成  
✅ **代码分割**: 已启用

## 🔧 Vite 配置

### 主配置文件 (`frontend/vite.config.ts`)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  
  // 路径解析
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
      '@services': resolve(__dirname, 'src/services'),
    },
  },
  
  // 构建配置
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd'],
          utils: ['lodash', 'dayjs'],
        },
      },
    },
    
    // 性能优化
    chunkSizeWarningLimit: 1000,
  },
  
  // 开发服务器
  server: {
    port: 3000,
    open: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  
  // 预览服务器
  preview: {
    port: 4173,
    open: true,
  },
})
```

## 📦 包管理配置

### package.json 脚本

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,css,md}\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## 🎯 构建优化策略

### 1. 代码分割

```typescript
// 路由级别的代码分割
const LazyHome = lazy(() => import('../pages/Home'));
const LazyDashboard = lazy(() => import('../pages/Dashboard'));
const LazyTestingDashboard = lazy(() => import('../pages/core/testing/TestingDashboard'));

// 组件级别的代码分割
const LazyDataTable = lazy(() => import('../components/data/DataTable'));
const LazyChart = lazy(() => import('../components/ui/Chart'));
```

### 2. 资源优化

```typescript
// 图片优化
import heroImage from '@/assets/hero-bg.webp';

// 字体优化
import '@/styles/fonts.css'; // 包含 font-display: swap

// CSS优化
import '@/styles/critical.css'; // 关键CSS内联
```

### 3. 缓存策略

```typescript
// Service Worker 配置
const CACHE_NAME = 'test-web-v1.0';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json'
];
```

## 🔍 构建分析

### 包大小分析

```bash
# 安装分析工具
npm install --save-dev rollup-plugin-visualizer

# 生成分析报告
npm run build -- --analyze

# 查看包大小
npm run build && npx vite-bundle-analyzer dist
```

### 性能指标

- **首次内容绘制 (FCP)**: < 1.5s
- **最大内容绘制 (LCP)**: < 2.5s
- **首次输入延迟 (FID)**: < 100ms
- **累积布局偏移 (CLS)**: < 0.1

## 🚀 部署配置

### 生产环境构建

```bash
# 生产构建
npm run build

# 构建验证
npm run preview

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

### Docker 构建

```dockerfile
# 多阶段构建
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 环境变量

```bash
# 开发环境
VITE_API_URL=http://localhost:8080
VITE_APP_TITLE=Test-Web Dev

# 生产环境
VITE_API_URL=https://api.test-web.com
VITE_APP_TITLE=Test-Web
```

## 📊 构建监控

### 构建时间优化

- **开发构建**: < 5秒
- **生产构建**: < 30秒
- **增量构建**: < 3秒

### 资源大小控制

- **主包大小**: < 500KB
- **总资源大小**: < 2MB
- **首屏资源**: < 1MB

## 🛠️ 故障排除

### 常见问题

1. **构建内存不足**:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

2. **TypeScript 编译错误**:
   ```bash
   npm run type-check
   ```

3. **依赖冲突**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### 调试工具

```bash
# 详细构建日志
npm run build -- --debug

# 分析构建性能
npm run build -- --profile

# 检查依赖树
npm ls --depth=0
```
