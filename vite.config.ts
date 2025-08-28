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
    postcss: './postcss.config.js',
    // CSS预处理器配置
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'frontend'),
    },
  },
  root: 'frontend',
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
      // 修复CSP指令名称
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' ws: wss:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
    },
    proxy: {
      // 代理API请求到后端服务器 - 只代理真正的API路径
      '/api/': {
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
    // Chunk大小警告限制 - 更严格
    chunkSizeWarningLimit: 300,
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
        // 优化的代码分割策略
        manualChunks: (id) => {
          // React核心库
          if (id.includes('react') && !id.includes('react-router') && !id.includes('react-chartjs')) {
            return 'react-vendor';
          }

          // 路由相关
          if (id.includes('react-router')) {
            return 'router-vendor';
          }

          // 图表库 - 进一步细分
          if (id.includes('chart.js') || id.includes('react-chartjs')) {
            return 'chart-vendor';
          }
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'recharts-vendor';
          }

          // UI组件库
          if (id.includes('lucide-react')) {
            return 'icons-vendor';
          }
          if (id.includes('@headlessui') || id.includes('framer-motion')) {
            return 'ui-vendor';
          }

          // 工具库
          if (id.includes('date-fns') || id.includes('lodash')) {
            return 'utils-vendor';
          }
          if (id.includes('axios') || id.includes('socket.io')) {
            return 'network-vendor';
          }

          // 测试页面 - 按类型细分
          if (id.includes('/pages/') && id.includes('Test')) {
            if (id.includes('Performance')) {
              return 'performance-tests';
            }
            if (id.includes('Stress')) {
              return 'stress-tests';
            }
            if (id.includes('Security')) {
              return 'security-tests';
            }
            if (id.includes('API')) {
              return 'api-tests';
            }
            if (id.includes('SEO')) {
              return 'seo-tests';
            }
            if (id.includes('Compatibility') || id.includes('Chrome')) {
              return 'compatibility-tests';
            }
            if (id.includes('UX')) {
              return 'ux-tests';
            }
            if (id.includes('Website')) {
              return 'website-tests';
            }
            if (id.includes('Network')) {
              return 'network-tests';
            }
            if (id.includes('Database')) {
              return 'database-tests';
            }
            return 'misc-tests';
          }

          // 管理和设置页面
          if (id.includes('/pages/') && (
            id.includes('Admin') || id.includes('Settings') || id.includes('Management')
          )) {
            return 'admin-pages';
          }

          // 用户相关页面
          if (id.includes('/pages/') && (
            id.includes('Login') || id.includes('Register') || id.includes('Profile') || id.includes('User')
          )) {
            return 'auth-pages';
          }

          // 报告和分析页面
          if (id.includes('/pages/') && (
            id.includes('Report') || id.includes('Analytics') || id.includes('Statistics') || id.includes('Dashboard')
          )) {
            return 'analytics-pages';
          }

          // 其他页面
          if (id.includes('/pages/')) {
            return 'misc-pages';
          }

          // 组件分割 - 更细粒度
          if (id.includes('/components/modern/')) {
            return 'modern-components';
          }
          if (id.includes('/components/ui/')) {
            return 'ui-components';
          }
          if (id.includes('/components/charts/')) {
            return 'chart-components';
          }
          if (id.includes('/components/auth/')) {
            return 'auth-components';
          }
          if (id.includes('/components/routing/')) {
            return 'routing-components';
          }
          if (id.includes('/components/common/')) {
            return 'common-components';
          }
          if (id.includes('/components/')) {
            return 'misc-components';
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
    setupFiles: ['./frontend/test/setup.ts'],
    include: ['frontend/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [...configDefaults.exclude, 'e2e/*'],
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
