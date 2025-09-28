#!/usr/bin/env node

/**
 * 前端独立开发服务器启动脚本
 * 跳过有问题的依赖，只使用前端必需的包
 */

import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startDevServer() {
  try {
    console.log('🚀 启动前端开发服务器...');
    
    // Vite服务器配置
    const server = await createServer({
      configFile: false,
      root: __dirname,
      plugins: [
        react({
          jsxRuntime: 'automatic'
        })
      ],
      resolve: {
        alias: {
          '@': resolve(__dirname),
          '@components': resolve(__dirname, 'components'),
          '@pages': resolve(__dirname, 'pages'),
          '@services': resolve(__dirname, 'services'),
          '@types': resolve(__dirname, 'types'),
          '@utils': resolve(__dirname, 'utils'),
          '@hooks': resolve(__dirname, 'hooks'),
          '@contexts': resolve(__dirname, 'contexts'),
          '@config': resolve(__dirname, 'config'),
          '@styles': resolve(__dirname, 'styles'),
        },
      },
      server: {
        port: 5174,
        host: true,
        open: true,
        cors: true,
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            secure: false
          }
        }
      },
      define: {
        'process.env.VITE_API_BASE_URL': '"http://localhost:3001"',
        'process.env.NODE_ENV': '"development"'
      },
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'react-router-dom',
          'axios',
          'chart.js',
          'react-chartjs-2',
          'lucide-react',
          'date-fns',
          'jwt-decode'
        ],
        exclude: [
          'electron',
          'sqlite3',
          'better-sqlite3',
          'pg',
          'bcrypt',
          'puppeteer'
        ]
      }
    });

    await server.listen();
    server.printUrls();

    console.log('\n✅ 前端开发服务器已启动！');
    console.log('📱 在浏览器中打开: http://localhost:5174');
    
  } catch (error) {
    console.error('❌ 启动开发服务器失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startDevServer();
