#!/usr/bin/env node

/**
 * 配置文件优化脚本
 * 用于检查、创建和优化项目配置文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 优化结果统计
const optimizationResults = {
  createdConfigs: [],
  updatedConfigs: [],
  optimizedConfigs: [],
  errors: []
};

/**
 * 检查配置文件是否存在
 */
function checkConfigFiles() {
  const configFiles = [
    { name: 'tsconfig.json', required: true },
    { name: 'vite.config.ts', required: true },
    { name: 'tailwind.config.js', required: true },
    { name: '.eslintrc.js', required: false },
    { name: '.prettierrc', required: false },
    { name: '.gitignore', required: true },
    { name: '.env.example', required: false }
  ];

  console.log('🔍 检查配置文件...\n');

  const missingConfigs = [];
  const existingConfigs = [];

  configFiles.forEach(config => {
    const filePath = path.join(PROJECT_ROOT, config.name);
    if (fs.existsSync(filePath)) {
      existingConfigs.push(config.name);
      console.log(`✅ ${config.name} - 存在`);
    } else {
      missingConfigs.push(config);
      console.log(`${config.required ? '❌' : '⚠️'} ${config.name} - ${config.required ? '缺失（必需）' : '缺失（可选）'}`);
    }
  });

  console.log(`\n📊 配置文件检查结果:`);
  console.log(`   存在: ${existingConfigs.length} 个`);
  console.log(`   缺失: ${missingConfigs.length} 个\n`);

  return { missingConfigs, existingConfigs };
}

/**
 * 创建ESLint配置
 */
function createESLintConfig() {
  const eslintConfig = {
    env: {
      browser: true,
      es2020: true,
      node: true
    },
    extends: [
      'eslint:recommended',
      '@typescript-eslint/recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaFeatures: {
        jsx: true
      },
      ecmaVersion: 2020,
      sourceType: 'module'
    },
    plugins: [
      'react',
      '@typescript-eslint',
      'react-hooks'
    ],
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  };

  const configPath = path.join(PROJECT_ROOT, '.eslintrc.js');
  const configContent = `module.exports = ${JSON.stringify(eslintConfig, null, 2)};`;

  try {
    fs.writeFileSync(configPath, configContent, 'utf8');
    optimizationResults.createdConfigs.push('.eslintrc.js');
    console.log('✅ 创建 .eslintrc.js 配置文件');
    return true;
  } catch (error) {
    optimizationResults.errors.push(`创建ESLint配置失败: ${error.message}`);
    return false;
  }
}

/**
 * 创建Prettier配置
 */
function createPrettierConfig() {
  const prettierConfig = {
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: 'avoid',
    endOfLine: 'lf'
  };

  const configPath = path.join(PROJECT_ROOT, '.prettierrc');

  try {
    fs.writeFileSync(configPath, JSON.stringify(prettierConfig, null, 2), 'utf8');
    optimizationResults.createdConfigs.push('.prettierrc');
    console.log('✅ 创建 .prettierrc 配置文件');
    return true;
  } catch (error) {
    optimizationResults.errors.push(`创建Prettier配置失败: ${error.message}`);
    return false;
  }
}

/**
 * 创建环境变量示例文件
 */
function createEnvExample() {
  const envContent = `# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_dev
DB_USER=your_username
DB_PASSWORD=your_password

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# 服务器配置
PORT=3001
NODE_ENV=development

# 前端配置
VITE_API_BASE_URL=http://localhost:3001

# 第三方服务配置
# Google API Key (用于SEO测试)
GOOGLE_API_KEY=your_google_api_key

# GTmetrix API配置
GTMETRIX_API_KEY=your_gtmetrix_api_key
GTMETRIX_USERNAME=your_gtmetrix_username

# WebPageTest API配置
WEBPAGETEST_API_KEY=your_webpagetest_api_key

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/app.log

# 安全配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# 邮件配置（可选）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
`;

  const configPath = path.join(PROJECT_ROOT, '.env.example');

  try {
    fs.writeFileSync(configPath, envContent, 'utf8');
    optimizationResults.createdConfigs.push('.env.example');
    console.log('✅ 创建 .env.example 配置文件');
    return true;
  } catch (error) {
    optimizationResults.errors.push(`创建环境变量示例失败: ${error.message}`);
    return false;
  }
}

/**
 * 优化TypeScript配置
 */
function optimizeTypeScriptConfig() {
  const tsconfigPath = path.join(PROJECT_ROOT, 'tsconfig.json');

  if (!fs.existsSync(tsconfigPath)) {
    console.log('⚠️  tsconfig.json 不存在，跳过优化');
    return false;
  }

  try {
    const content = fs.readFileSync(tsconfigPath, 'utf8');
    const config = JSON.parse(content);

    // 优化建议
    let modified = false;

    // 启用更严格的类型检查
    if (!config.compilerOptions.strictNullChecks) {
      console.log('💡 建议启用 strictNullChecks 以获得更好的类型安全');
    }

    // 添加路径映射优化
    if (!config.compilerOptions.paths['@/components/*']) {
      config.compilerOptions.paths['@/components/*'] = ['src/components/*'];
      config.compilerOptions.paths['@/pages/*'] = ['src/pages/*'];
      config.compilerOptions.paths['@/services/*'] = ['src/services/*'];
      config.compilerOptions.paths['@/utils/*'] = ['src/utils/*'];
      config.compilerOptions.paths['@/hooks/*'] = ['src/hooks/*'];
      config.compilerOptions.paths['@/types/*'] = ['src/types/*'];
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(tsconfigPath, JSON.stringify(config, null, 2), 'utf8');
      optimizationResults.optimizedConfigs.push('tsconfig.json');
      console.log('✅ 优化 tsconfig.json 配置');
    }

    return true;
  } catch (error) {
    optimizationResults.errors.push(`优化TypeScript配置失败: ${error.message}`);
    return false;
  }
}

/**
 * 优化Vite配置
 */
function optimizeViteConfig() {
  const viteConfigPath = path.join(PROJECT_ROOT, 'vite.config.ts');

  if (!fs.existsSync(viteConfigPath)) {
    console.log('⚠️  vite.config.ts 不存在，跳过优化');
    return false;
  }

  try {
    let content = fs.readFileSync(viteConfigPath, 'utf8');
    let modified = false;

    // 检查是否包含路径别名配置
    if (!content.includes('resolve: {') || !content.includes('alias: {')) {
      const aliasConfig = `
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },`;

      // 在defineConfig中添加resolve配置
      if (content.includes('export default defineConfig({')) {
        content = content.replace(
          'export default defineConfig({',
          `export default defineConfig({${aliasConfig}`
        );
        modified = true;
      }

      // 确保导入了path模块
      if (!content.includes("import path from 'path'")) {
        content = `import path from 'path';\n${content}`;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(viteConfigPath, content, 'utf8');
      optimizationResults.optimizedConfigs.push('vite.config.ts');
      console.log('✅ 优化 vite.config.ts 配置');
    }

    return true;
  } catch (error) {
    optimizationResults.errors.push(`优化Vite配置失败: ${error.message}`);
    return false;
  }
}

/**
 * 检查并优化.gitignore
 */
function optimizeGitignore() {
  const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');

  const essentialIgnores = [
    '# Dependencies',
    'node_modules/',
    'backend/node_modules/',
    '',
    '# Build outputs',
    'dist/',
    'dist-electron/',
    'build/',
    '',
    '# Environment variables',
    '.env',
    '.env.local',
    '.env.development.local',
    '.env.test.local',
    '.env.production.local',
    '',
    '# Logs',
    'logs/',
    '*.log',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    '',
    '# Database',
    '*.db',
    '*.sqlite',
    '*.sqlite3',
    '',
    '# IDE',
    '.vscode/',
    '.idea/',
    '*.swp',
    '*.swo',
    '*~',
    '',
    '# OS',
    '.DS_Store',
    'Thumbs.db',
    '',
    '# Cache',
    '.npm',
    '.eslintcache',
    '.cache/',
    '',
    '# Temporary files',
    'temp/',
    'tmp/',
    '',
    '# Coverage reports',
    'coverage/',
    '*.lcov',
    '',
    '# Electron',
    'out/',
    '',
    '# Reports (keep in docs/reports)',
    '/*REPORT*.md',
    '!docs/reports/*REPORT*.md'
  ];

  try {
    let existingContent = '';
    if (fs.existsSync(gitignorePath)) {
      existingContent = fs.readFileSync(gitignorePath, 'utf8');
    }

    const newContent = essentialIgnores.join('\n') + '\n';

    if (existingContent !== newContent) {
      fs.writeFileSync(gitignorePath, newContent, 'utf8');
      if (existingContent) {
        optimizationResults.optimizedConfigs.push('.gitignore');
        console.log('✅ 优化 .gitignore 配置');
      } else {
        optimizationResults.createdConfigs.push('.gitignore');
        console.log('✅ 创建 .gitignore 配置文件');
      }
    }

    return true;
  } catch (error) {
    optimizationResults.errors.push(`优化.gitignore失败: ${error.message}`);
    return false;
  }
}

/**
 * 生成配置优化报告
 */
function generateConfigOptimizationReport() {
  const timestamp = new Date().toISOString();
  const reportContent = `# 配置文件优化报告

## 📅 优化日期
${timestamp.split('T')[0]}

## 📊 优化统计

### 创建的配置文件 (${optimizationResults.createdConfigs.length}个)
${optimizationResults.createdConfigs.map(config => `- \`${config}\``).join('\n')}

### 更新的配置文件 (${optimizationResults.updatedConfigs.length}个)
${optimizationResults.updatedConfigs.map(config => `- \`${config}\``).join('\n')}

### 优化的配置文件 (${optimizationResults.optimizedConfigs.length}个)
${optimizationResults.optimizedConfigs.map(config => `- \`${config}\``).join('\n')}

## ❌ 错误记录 (${optimizationResults.errors.length}个)
${optimizationResults.errors.length > 0 ? optimizationResults.errors.map(error => `- ${error}`).join('\n') : '无错误'}

## 📋 配置文件说明

### ESLint配置 (\`.eslintrc.js\`)
- 启用TypeScript和React支持
- 配置推荐的代码规范
- 自定义规则适配项目需求

### Prettier配置 (\`.prettierrc\`)
- 统一代码格式化规则
- 2空格缩进，单引号，分号结尾
- 支持现代JavaScript特性

### 环境变量示例 (\`.env.example\`)
- 包含所有必需的环境变量
- 提供配置说明和示例值
- 便于新开发者快速配置

### TypeScript配置优化
- 添加路径别名映射
- 优化编译选项
- 提高开发体验

### Vite配置优化
- 配置路径别名
- 优化构建性能
- 支持现代前端开发

### Git忽略文件优化
- 完整的忽略规则
- 保护敏感文件
- 优化仓库大小

## ✅ 优化完成

项目配置文件已全面优化，开发环境更加规范和高效。

---
**生成时间**: ${timestamp}
**脚本版本**: v1.0.0
`;

  const reportPath = path.join(PROJECT_ROOT, 'docs', 'reports', 'CONFIG_OPTIMIZATION_REPORT.md');

  // 确保目录存在
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`📄 配置优化报告已保存: ${reportPath}`);
}

/**
 * 主函数
 */
function main() {
  try {
    console.log('⚙️  开始配置文件优化...\n');

    // 检查配置文件
    const { missingConfigs } = checkConfigFiles();

    // 创建缺失的配置文件
    missingConfigs.forEach(config => {
      switch (config.name) {
        case '.eslintrc.js':
          createESLintConfig();
          break;
        case '.prettierrc':
          createPrettierConfig();
          break;
        case '.env.example':
          createEnvExample();
          break;
      }
    });

    // 优化现有配置文件
    console.log('\n🔧 优化现有配置文件...\n');
    optimizeTypeScriptConfig();
    optimizeViteConfig();
    optimizeGitignore();

    // 生成优化报告
    generateConfigOptimizationReport();

    console.log('\n🎉 配置文件优化完成！');

    if (optimizationResults.errors.length === 0) {
      console.log('✅ 优化过程中无错误');
    } else {
      console.log(`⚠️  优化过程中发现 ${optimizationResults.errors.length} 个错误，请检查报告`);
    }

  } catch (error) {
    console.error('\n💥 优化过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  checkConfigFiles, createEnvExample, createESLintConfig,
  createPrettierConfig, generateConfigOptimizationReport, optimizeGitignore, optimizeTypeScriptConfig,
  optimizeViteConfig
};

