import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// Vercel 专用构建配置 — 从 frontend/ 目录执行
// 完整开发配置见根目录 vite.config.ts
export default defineConfig({
  base: '/',
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    react({ jsxRuntime: 'automatic' }) as any,
  ],
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    drop: ['console', 'debugger'],
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[hash:base64:5]',
    },
    postcss: resolve(__dirname, 'postcss.config.js'),
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname),
      '@shared': resolve(__dirname, '..', 'shared'),
      '@shared/types': resolve(__dirname, '..', 'shared', 'types'),
      '@backend': resolve(__dirname, '..', 'backend'),
      '@tools': resolve(__dirname, '..', 'tools'),
    },
  },
  envDir: resolve(__dirname),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 300,
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
});
