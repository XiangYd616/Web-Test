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
    // Chunk大小警告限制 - 务实的阈值，允许核心库稍大
    chunkSizeWarningLimit: 320,
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
        // 优化的代码分割策略 - 更细粒度分割
        manualChunks: (id) => {
          // React核心库
          if (id.includes('react') && !id.includes('react-router') && !id.includes('react-chartjs')) {
            return 'react-vendor';
          }

          // 路由相关
          if (id.includes('react-router')) {
            return 'router-vendor';
          }

          // 图表库 - 进一步细分以减少单个文件大小
          if (id.includes('chart.js') || id.includes('react-chartjs')) {
            return 'chart-vendor';
          }
          // 将 recharts 进一步分割 - 更激进的分割策略
          if (id.includes('recharts')) {
            // 按功能模块分割 recharts
            if (id.includes('recharts/es6/cartesian') || id.includes('recharts/lib/cartesian')) {
              return 'recharts-cartesian';
            }
            if (id.includes('recharts/es6/polar') || id.includes('recharts/lib/polar')) {
              return 'recharts-polar';
            }
            if (id.includes('recharts/es6/component') || id.includes('recharts/lib/component')) {
              return 'recharts-components';
            }
            if (id.includes('recharts/es6/util') || id.includes('recharts/lib/util')) {
              return 'recharts-utils';
            }
            if (id.includes('recharts/es6/shape') || id.includes('recharts/lib/shape')) {
              return 'recharts-shapes';
            }
            // 其他 recharts 核心
            return 'recharts-core';
          }
          // D3 相关库按功能分块
          if (id.includes('d3-')) {
            if (id.includes('d3-scale') || id.includes('d3-axis') || id.includes('d3-array')) {
              return 'd3-core';
            }
            if (id.includes('d3-shape') || id.includes('d3-path')) {
              return 'd3-shapes';
            }
            if (id.includes('d3-time') || id.includes('d3-format')) {
              return 'd3-utils';
            }
            return 'd3-vendor';
          }

          // UI组件库 - 更细分
          if (id.includes('lucide-react')) {
            return 'icons-vendor';
          }
          if (id.includes('@headlessui')) {
            return 'headlessui-vendor';
          }
          if (id.includes('framer-motion')) {
            return 'animation-vendor';
          }

          // 工具库 - 更细分
          if (id.includes('date-fns')) {
            return 'date-vendor';
          }
          if (id.includes('lodash')) {
            return 'lodash-vendor';
          }
          if (id.includes('axios')) {
            return 'http-vendor';
          }
          if (id.includes('socket.io')) {
            return 'websocket-vendor';
          }

          // 测试页面 - 更细粒度分割以减少 misc-tests 大小
          if (id.includes('/pages/') && id.includes('Test')) {
            if (id.includes('Infrastructure')) {
              return 'infrastructure-tests';
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
            // Network和Database测试已合并到Infrastructure测试
            // 进一步细分其他测试页面
            if (id.includes('Accessibility')) {
              return 'accessibility-tests';
            }
            if (id.includes('Mobile')) {
              return 'mobile-tests';
            }
            if (id.includes('Integration')) {
              return 'integration-tests';
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

          // 组件分割 - 更激进的细粒度分割以减少 misc-components 大小
          if (id.includes('/components/modern/')) {
            return 'modern-components';
          }
          if (id.includes('/components/ui/')) {
            // 进一步细分 UI 组件
            if (id.includes('/components/ui/forms/') || id.includes('/components/ui/Input') || id.includes('/components/ui/Button')) {
              return 'ui-forms';
            }
            if (id.includes('/components/ui/layout/') || id.includes('/components/ui/Modal') || id.includes('/components/ui/Card')) {
              return 'ui-layout';
            }
            if (id.includes('/components/ui/feedback/') || id.includes('/components/ui/Loading') || id.includes('/components/ui/Notification')) {
              return 'ui-feedback';
            }
            if (id.includes('/components/ui/theme/') || id.includes('/components/ui/Theme')) {
              return 'ui-theme';
            }
            if (id.includes('/components/ui/ErrorBoundary') || id.includes('/components/ui/Enhanced')) {
              return 'ui-error-handling';
            }
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
          if (id.includes('/components/business/')) {
            return 'business-components';
          }
          if (id.includes('/components/system/')) {
            return 'system-components';
          }
          // 进一步细分其他组件
          if (id.includes('/components/seo/')) {
            return 'seo-components';
          }
          if (id.includes('/components/testing/')) {
            return 'testing-components';
          }
          if (id.includes('/components/data/')) {
            return 'data-components';
          }
          if (id.includes('/components/')) {
            // 按文件大小或复杂度进一步分割
            if (id.includes('Complex') || id.includes('Advanced') || id.includes('Enhanced')) {
              return 'complex-components';
            }
            return 'misc-components';
          }

          // node_modules中的其他库 - 按大小和功能分割
          if (id.includes('node_modules')) {
            // 大型库单独分块
            if (id.includes('node_modules/@babel') || id.includes('node_modules/core-js')) {
              return 'polyfills-vendor';
            }
            if (id.includes('node_modules/tslib') || id.includes('node_modules/regenerator-runtime')) {
              return 'runtime-vendor';
            }
            // 工具类库
            if (id.includes('node_modules/classnames') || id.includes('node_modules/clsx')) {
              return 'utils-vendor';
            }
            // 其他小型库
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
