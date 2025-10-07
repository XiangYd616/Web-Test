import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react({
        // Fast Refresh配置
        fastRefresh: true,
        // Babel配置
        babel: {
          plugins: [
            // 可以添加额外的Babel插件
          ],
        },
      }),
    ],

    // 路径别名配置
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
        '@components': path.resolve(__dirname, './components'),
        '@pages': path.resolve(__dirname, './pages'),
        '@services': path.resolve(__dirname, './services'),
        '@hooks': path.resolve(__dirname, './hooks'),
        '@utils': path.resolve(__dirname, './utils'),
        '@types': path.resolve(__dirname, './types'),
        '@contexts': path.resolve(__dirname, './contexts'),
        '@config': path.resolve(__dirname, './config'),
        '@styles': path.resolve(__dirname, './styles'),
      },
    },

    // 开发服务器配置
    server: {
      port: 5173,
      host: true, // 监听所有地址
      open: false, // 不自动打开浏览器
      cors: true, // 启用CORS
      proxy: {
        // API代理配置
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/ws': {
          target: env.VITE_WS_URL || 'ws://localhost:3000',
          ws: true,
        },
      },
    },

    // 构建配置
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development', // 开发模式生成sourcemap
      minify: 'terser', // 使用terser压缩
      terserOptions: {
        compress: {
          // 生产环境删除console和debugger
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      },
      // 代码分割配置
      rollupOptions: {
        output: {
          // 手动分割代码
          manualChunks: {
            // React相关
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // UI框架
            'ui-vendor': ['antd', '@mui/material', 'lucide-react'],
            // 图表库
            'chart-vendor': ['chart.js', 'recharts', 'react-chartjs-2'],
            // 工具库
            'utils-vendor': ['axios', 'date-fns', 'ahooks'],
          },
          // 资源文件命名
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      // 块大小警告限制
      chunkSizeWarningLimit: 1000,
    },

    // CSS配置
    css: {
      // CSS modules配置
      modules: {
        localsConvention: 'camelCase',
      },
      // PostCSS配置
      postcss: {
        plugins: [
          // 可以添加PostCSS插件
        ],
      },
      // 预处理器配置
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          // Ant Design主题定制
          modifyVars: {
            '@primary-color': '#1890ff',
          },
        },
      },
    },

    // 优化配置
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'axios',
        'antd',
        '@mui/material',
        'lucide-react',
      ],
      exclude: ['@testing-library/react'],
    },

    // 环境变量配置
    envPrefix: 'VITE_',

    // 测试配置
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './tests/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'tests/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/mockData',
          '**/types',
        ],
      },
    },

    // 日志级别
    logLevel: 'info',

    // 是否清空输出目录
    clearScreen: false,
  };
});

