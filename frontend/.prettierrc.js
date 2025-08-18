/**
 * Prettier 配置文件
 * 统一代码格式化规则
 */

module.exports = {
  // 基础配置
  printWidth: 100, // 每行最大字符数
  tabWidth: 2, // 缩进宽度
  useTabs: false, // 使用空格而不是制表符
  semi: true, // 语句末尾添加分号
  singleQuote: true, // 使用单引号
  quoteProps: 'as-needed', // 对象属性引号策略
  
  // JSX 配置
  jsxSingleQuote: false, // JSX 中使用双引号
  jsxBracketSameLine: false, // JSX 标签的 > 换行
  
  // 尾随逗号
  trailingComma: 'es5', // 在 ES5 中有效的尾随逗号
  
  // 括号间距
  bracketSpacing: true, // 对象字面量的大括号间添加空格
  bracketSameLine: false, // 将 > 多行 HTML 元素放在最后一行的末尾
  
  // 箭头函数参数
  arrowParens: 'avoid', // 单参数箭头函数省略括号
  
  // 换行符
  endOfLine: 'lf', // 使用 LF 换行符
  
  // 嵌入式语言格式化
  embeddedLanguageFormatting: 'auto',
  
  // HTML 空白敏感性
  htmlWhitespaceSensitivity: 'css',
  
  // Vue 文件中的脚本和样式标签缩进
  vueIndentScriptAndStyle: false,
  
  // 插件配置
  plugins: [
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss', // Tailwind CSS 类排序
  ],
  
  // 导入排序配置
  importOrder: [
    '^react$',
    '^react/(.*)$',
    '^next/(.*)$',
    '<THIRD_PARTY_MODULES>',
    '^@/(.*)$',
    '^@components/(.*)$',
    '^@utils/(.*)$',
    '^@services/(.*)$',
    '^@hooks/(.*)$',
    '^@contexts/(.*)$',
    '^@types/(.*)$',
    '^[./]',
    '\\.(css|scss|sass|less)$',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  
  // 文件特定配置
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
        tabWidth: 2,
      },
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.css',
      options: {
        singleQuote: false,
      },
    },
    {
      files: '*.scss',
      options: {
        singleQuote: false,
      },
    },
    {
      files: '*.html',
      options: {
        printWidth: 120,
        tabWidth: 2,
        htmlWhitespaceSensitivity: 'ignore',
      },
    },
    {
      files: '*.svg',
      options: {
        parser: 'html',
        htmlWhitespaceSensitivity: 'ignore',
      },
    },
  ],
};
