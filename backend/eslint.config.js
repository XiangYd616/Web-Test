/**
 * Backend ESLint Configuration (Flat Config)
 * Node.js 后端代码的 ESLint 规则
 * ESLint 9+ 扁平配置格式
 */

const globals = require('globals');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'logs/**',
      '*.min.js',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es2021,
        ...globals.jest,
      },
    },
    rules: {
      // 警告而非错误，提高开发效率
      'no-console': 'off', // 后端允许 console
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true 
      }],
      'no-undef': 'error',
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },
];

