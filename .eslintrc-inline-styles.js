// ESLint配置 - 防止内联样式
module.exports = {
  extends: ['./.eslintrc.js'],
  rules: {
    // 禁止内联样式
    'react/forbid-dom-props': [
      'error',
      {
        forbid: [
          {
            propName: 'style',
            message: '请使用CSS类而不是内联样式。将样式添加到 src/styles/components.css 或相应的CSS模块中。'
          }
        ]
      }
    ],
    
    // 禁止在JSX中使用style属性
    'react/no-unknown-property': [
      'error',
      {
        ignore: ['css'] // 允许styled-components的css属性
      }
    ],
    
    // 自定义规则：检测内联样式
    'no-restricted-syntax': [
      'error',
      {
        selector: 'JSXAttribute[name.name="style"]',
        message: '禁止使用内联样式。请使用CSS类或CSS模块。'
      },
      {
        selector: 'Property[key.name="style"][value.type="ObjectExpression"]',
        message: '禁止在组件中定义内联样式对象。请使用CSS文件。'
      }
    ]
  },
  
  // 覆盖特定文件的规则
  overrides: [
    {
      // 允许在特定文件中使用内联样式（如动态样式）
      files: [
        '**/charts/**/*.tsx',
        '**/animations/**/*.tsx',
        '**/dynamic/**/*.tsx'
      ],
      rules: {
        'react/forbid-dom-props': 'off',
        'no-restricted-syntax': 'off'
      }
    },
    
    // 测试文件中允许内联样式
    {
      files: ['**/*.test.tsx', '**/*.spec.tsx', '**/__tests__/**/*.tsx'],
      rules: {
        'react/forbid-dom-props': 'off',
        'no-restricted-syntax': 'off'
      }
    }
  ]
};
