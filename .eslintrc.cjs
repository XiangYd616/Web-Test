module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking'
  ],
  ignorePatterns: [
    'dist',
    'dist-electron',
    'node_modules',
    '.eslintrc.cjs',
    'server/node_modules',
    'build',
    'coverage',
    'scripts',
    'docs'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // TypeScript规则
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/no-misused-promises': 'off',

    // 基础规则
    'no-debugger': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'no-useless-escape': 'warn',
    'no-case-declarations': 'off',
    'no-useless-catch': 'warn',

    // 代码质量
    'eqeqeq': 'error',
    'no-duplicate-imports': 'error',
    'no-unused-expressions': 'warn',
    'consistent-return': 'off',
    'array-callback-return': 'warn'
  }
}
