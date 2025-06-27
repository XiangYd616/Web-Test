import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: parseInt(process.env.FRONTEND_PORT || process.env.VITE_DEV_PORT || '5174'),
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
        target: `http://localhost:${process.env.API_PORT || process.env.PORT || '3001'}`,
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
    port: parseInt(process.env.FRONTEND_PORT || process.env.VITE_DEV_PORT || '5174'),
    host: true,
    cors: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
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

})
