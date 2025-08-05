import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // 启用React Fast Refresh
      fastRefresh: true,
      // 优化JSX运行时
      jsxRuntime: 'automatic'
    })
  ],
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    // 移除console.log在生产环境
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  },
  css: {
    // CSS模块化配置
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: process.env.NODE_ENV === 'production'
        ? '[hash:base64:5]'
        : '[name]__[local]__[hash:base64:5]'
    },
    // PostCSS配置 - 使用外部postcss.config.js
    // postcss: './postcss.config.js',
    // CSS预处理器配置
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: parseInt(process.env.VITE_DEV_PORT || '5174'),
    host: true,
    open: false,
    cors: true,
    headers: {
      // cspell:disable-next-line
      'X-Content-Type-Options': 'nosniff',
      // cspell:disable-next-line
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    proxy: {
      // 代理API请求到后端服务器
      '/api': {
        target: `http://localhost:${process.env.PORT || '3001'}`,
        changeOrigin: true,
        secure: false,
      },
      // 代理所有以 /proxy/ 开头的请求
      '/proxy': {
        target: 'http://1.95.9.20:8067',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy/, ''),
      }
    },
    // 添加中间件来处理SPA路由
    middlewareMode: false
  },
  preview: {
    port: parseInt(process.env.VITE_DEV_PORT || '5174'),
    host: true,
    cors: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // 启用源码映射用于生产环境调试
    sourcemap: process.env.NODE_ENV === 'development',
    // 优化构建性能
    target: 'esnext',
    minify: 'esbuild',
    // CSS代码分割
    cssCodeSplit: true,
    // 资源内联阈值
    assetsInlineLimit: 4096,
    rollupOptions: {
      external: [
        'fs',
        'path',
        'electron',
        'sqlite3',
        'better-sqlite3',
        'playwright',
        'playwright-core',
        'chromium-bidi',
        'cheerio',
        'pg',
        'pg-native',
        'pg-pool',
        'pg-cursor',
        'jsonwebtoken',
        'jws',
        'bcryptjs',
        'util'
      ],
      output: {
        // 代码分割策略
        manualChunks: {
          // 将React相关库分离到单独的chunk
          'react-vendor': ['react', 'react-dom'],
          // 将UI组件库分离
          'ui-vendor': ['lucide-react'],
          // 将工具库分离
          'utils-vendor': ['date-fns']
        },
        // 资源文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const extType = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name || '')) {
            return 'assets/css/[name]-[hash].[ext]';
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name || '')) {
            return 'assets/images/[name]-[hash].[ext]';
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name || '')) {
            return 'assets/fonts/[name]-[hash].[ext]';
          }
          return 'assets/[ext]/[name]-[hash].[ext]';
        },
        globals: {
          'fs': 'fs',
          'path': 'path',
          'electron': 'electron',
          'sqlite3': 'sqlite3',
          'better-sqlite3': 'Database',
          'playwright': 'playwright',
          'playwright-core': 'playwright',
          'chromium-bidi': 'chromium-bidi',
          'cheerio': 'cheerio',
          'pg': 'pg',
          'pg-native': 'pg-native',
          'pg-pool': 'pg-pool',
          'pg-cursor': 'pg-cursor',
          'jsonwebtoken': 'jsonwebtoken',
          'jws': 'jws',
          'bcryptjs': 'bcryptjs',
          'util': 'util'
        }
      }
    },
  },
  optimizeDeps: {
    exclude: [
      'fs',
      'path',
      'electron',
      'sqlite3',
      'better-sqlite3',
      'playwright',
      'playwright-core',
      'chromium-bidi',
      'cheerio',
      'pg',
      'pg-native',
      'pg-pool',
      'pg-cursor',
      'jsonwebtoken',
      'jws',
      'bcryptjs',
      'util'
    ],
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  // 性能优化配置
  experimental: {
    // 启用渲染优化
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { js: `/${filename}` };
      } else {
        return { relative: true };
      }
    }
  }
})
