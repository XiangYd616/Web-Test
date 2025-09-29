/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'frontend'),
      '@components': resolve(__dirname, 'frontend/components'),
      '@pages': resolve(__dirname, 'frontend/pages'),
      '@services': resolve(__dirname, 'frontend/services'),
      '@types': resolve(__dirname, 'frontend/types'),
      '@utils': resolve(__dirname, 'frontend/utils'),
      '@hooks': resolve(__dirname, 'frontend/hooks'),
      '@contexts': resolve(__dirname, 'frontend/contexts'),
      '@config': resolve(__dirname, 'frontend/config'),
      '@styles': resolve(__dirname, 'frontend/styles'),
      '@shared': resolve(__dirname, 'shared'),
      '@shared/types': resolve(__dirname, 'shared/types'),
      '@backend': resolve(__dirname, 'backend'),
      '@tools': resolve(__dirname, 'tools'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./frontend/tests/setup.ts'],
    include: [
      'frontend/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'shared/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/e2e/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'frontend/services/**',
        'frontend/hooks/**',
        'frontend/utils/**',
        'shared/types/**'
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/node_modules/**',
        '**/dist/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    maxConcurrency: 4,
    pool: 'threads',
    reporters: ['verbose']
  }
})
