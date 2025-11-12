import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // 生产环境禁用sourcemap
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // 移除console
        drop_debugger: true, // 移除debugger
      },
    },
    // 启用CSS代码分割
    cssCodeSplit: true,
    // 调整chunk大小警告限制
    chunkSizeWarningLimit: 1000,
    // 优化代码分割
    rollupOptions: {
      output: {
        // 分离大型依赖到独立chunk
        manualChunks: {
          // 分离React核心库
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // 分离UI框架
          'ui-vendor': ['antd', '@mui/material', '@mui/icons-material', '@mui/lab'],
          // 分离图表库
          'chart-vendor': ['chart.js', 'recharts', 'react-chartjs-2'],
          // 分离工具库
          'utils-vendor': ['axios', 'date-fns', 'lodash'],
        },
        // 自定义chunk文件名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@': path.resolve(__dirname, './'),
      '@components': path.resolve(__dirname, './components'),
      '@services': path.resolve(__dirname, './services'),
      '@hooks': path.resolve(__dirname, './hooks'),
      '@utils': path.resolve(__dirname, './utils'),
      '@types': path.resolve(__dirname, './types'),
      '@pages': path.resolve(__dirname, './pages'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'antd',
      'axios',
    ],
  },
});

