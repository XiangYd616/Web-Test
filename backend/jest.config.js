/**
 * Jest测试配置
 */

module.exports = {
  // 测试环境
  testEnvironment: 'node',

  // 测试文件匹配模式
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // 覆盖率收集
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    'engines/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],

  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],

  // 模块路径别名
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@middleware/(.*)$': '<rootDir>/middleware/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@engines/(.*)$': '<rootDir>/engines/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1'
  },

  // 测试设置文件
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // 测试超时
  testTimeout: 10000,

  // 详细输出
  verbose: true,

  // 清理模拟
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};

