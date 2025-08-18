import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    // 忽略TypeScript错误
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  build: {
    // 忽略构建时的TypeScript错误
    rollupOptions: {
      onwarn(warning, warn) {
        // 忽略TypeScript相关警告
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        warn(warning);
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
