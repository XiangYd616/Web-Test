/** @type {import('jest').Config} */
module.exports = {
  // 测试环境
  testEnvironment: 'jsdom',

  // 根目录
  rootDir: '.',

  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/frontend/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '<rootDir>/frontend/**/*.(test|spec).(js|jsx|ts|tsx)',
    '<rootDir>/backend/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '<rootDir>/backend/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],

  // 模块文件扩展名
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],

  // 模块名映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/frontend/$1',
    '^@backend/(.*)$': '<rootDir>/backend/$1',
    '^@components/(.*)$': '<rootDir>/frontend/components/$1',
    '^@services/(.*)$': '<rootDir>/frontend/services/$1',
    '^@utils/(.*)$': '<rootDir>/frontend/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/frontend/hooks/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },

  // 转换配置
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ]
    }]
  },

  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/frontend/__tests__/setup.ts'],

  // 覆盖率配置
  collectCoverage: true,
  collectCoverageFrom: [
    'frontend/**/*.{js,jsx,ts,tsx}',
    'backend/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/coverage/**',
    '!frontend/pages/_app.tsx',
    '!frontend/pages/_document.tsx'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // 忽略的路径
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],

  // 模块路径忽略
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],

  // 清理模拟
  clearMocks: true,
  restoreMocks: true,

  // 测试超时
  testTimeout: 10000,

  // 详细输出
  verbose: true,

  // 错误时停止
  bail: false,

  // 最大工作进程
  maxWorkers: '50%'
};
