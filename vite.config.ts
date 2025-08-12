import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
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
        'electron',
        'sqlite3',
        'pg-native',
        'crypto',
        'jsonwebtoken',
        'jwa',
        'jws'
      ],
      output: {
        // 代码分割策略
        manualChunks: (id) => {
          // React相关库
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }

          // 路由相关
          if (id.includes('react-router')) {
            return 'router-vendor';
          }

          // UI组件库
          if (id.includes('lucide-react') || id.includes('@headlessui')) {
            return 'ui-vendor';
          }

          // 工具库
          if (id.includes('date-fns') || id.includes('lodash') || id.includes('axios')) {
            return 'utils-vendor';
          }

          // 图表库
          if (id.includes('chart.js') || id.includes('recharts')) {
            return 'chart-vendor';
          }

          // 测试引擎相关
          if (id.includes('/pages/') && (
            id.includes('Test.tsx') ||
            id.includes('test') ||
            id.includes('Test')
          )) {
            return 'test-pages';
          }

          // 管理页面
          if (id.includes('/pages/') && (
            id.includes('Admin') ||
            id.includes('Management') ||
            id.includes('Settings')
          )) {
            return 'admin-pages';
          }

          // 其他页面
          if (id.includes('/pages/')) {
            return 'other-pages';
          }

          // 业务组件
          if (id.includes('/components/business/')) {
            return 'business-components';
          }

          // 系统组件
          if (id.includes('/components/system/')) {
            return 'system-components';
          }

          // node_modules中的其他库
          if (id.includes('node_modules')) {
            return 'vendor';
          }
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
          'electron': 'electron',
          'sqlite3': 'sqlite3',
          'pg-native': 'pg-native'
        }
      }
    },
  },
  optimizeDeps: {
    exclude: [
      'electron',
      'sqlite3',
      'pg-native',
      'crypto',
      'jsonwebtoken',
      'jwa',
      'jws'
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
  },
  // Vitest测试配置
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [...configDefaults.exclude, 'e2e/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  }
})
