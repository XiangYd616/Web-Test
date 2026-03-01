import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

const isDev = process.env.NODE_ENV !== 'production';
const isElectron = process.env.ELECTRON === 'true';

// https://vitejs.dev/config/
export default defineConfig({
  // Electron file:// 协议需要相对路径；Web/Vercel 部署需要绝对路径
  base: isElectron ? './' : '/',
  plugins: [
    react({
      // 优化JSX运行时
      jsxRuntime: 'automatic',
    }),
  ],
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    // 移除console.log在生产环境
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  css: {
    // CSS模块化配置
    modules: {
      localsConvention: 'camelCase',
      generateScopedName:
        process.env.NODE_ENV === 'production'
          ? '[hash:base64:5]'
          : '[name]__[local]__[hash:base64:5]',
    },
    // PostCSS配置 - 使用外部postcss.config.js
    postcss: './postcss.config.js',
    // CSS预处理器配置
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'frontend'),
      '@shared': resolve(__dirname, 'shared'),
      '@shared/types': resolve(__dirname, 'shared/types'),
      '@backend': resolve(__dirname, 'backend'),
      '@tools': resolve(__dirname, 'tools'),
    },
  },
  root: 'frontend',
  envDir: resolve(__dirname),
  server: {
    port: parseInt(process.env.VITE_DEV_PORT || '5174'),
    host: 'localhost',
    open: false,
    cors: true,
    headers: isDev
      ? {
          // 开发环境允许内置预览(iframe)加载
          'X-Content-Type-Options': 'nosniff',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        }
      : {
          // cspell:disable-next-line
          'X-Content-Type-Options': 'nosniff',
          // cspell:disable-next-line
          'X-Frame-Options': 'SAMEORIGIN',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          // 修复CSP指令名称
          'Content-Security-Policy':
            "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' ws: wss:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
        },
    proxy: {
      // 代理API请求到后端服务器 - 只代理真正的API路径
      '/api/': {
        target: `http://localhost:${process.env.PORT || '3001'}`,
        changeOrigin: true,
        secure: false,
      },
      // 代理 Socket.IO 到后端（实时推送测试进度）
      '/socket.io': {
        target: `http://localhost:${process.env.PORT || '3001'}`,
        changeOrigin: true,
        ws: true,
      },
      // 代理所有以 /proxy/ 开头的请求（目标地址从环境变量读取）
      ...(process.env.VITE_PROXY_TARGET
        ? {
            '/proxy': {
              target: process.env.VITE_PROXY_TARGET,
              changeOrigin: true,
              rewrite: (path: string) => path.replace(/^\/proxy/, ''),
            },
          }
        : {}),
    },
    // 添加中间件来处理SPA路由
    middlewareMode: false,
  },
  preview: {
    port: parseInt(process.env.VITE_DEV_PORT || '5174'),
    host: true,
    cors: true,
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
    // Electron file:// 下 manualChunks 易导致加载顺序问题，交由 Rollup 自动处理
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      external: ['electron', 'sqlite3', 'pg-native', 'crypto', 'jsonwebtoken', 'jwa', 'jws'],
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: assetInfo => {
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
          electron: 'electron',
          sqlite3: 'sqlite3',
          'pg-native': 'pg-native',
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['electron', 'sqlite3', 'pg-native', 'crypto', 'jsonwebtoken', 'jwa', 'jws'],
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  // 性能优化配置
  experimental: {
    // Electron file:// 协议需要相对路径
    ...(isElectron
      ? {
          renderBuiltUrl(_filename: string, { hostType: _hostType }: { hostType: string }) {
            return { relative: true };
          },
        }
      : {}),
  },
  // Vitest测试配置
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./frontend/tests/setup/setup.ts'],
    include: [
      'frontend/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,ts}',
    ],
    exclude: [...configDefaults.exclude, 'tests/e2e/tools/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'frontend/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
      },
    },
  },
});
