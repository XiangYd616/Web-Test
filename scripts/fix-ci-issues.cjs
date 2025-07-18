#!/usr/bin/env node

/**
 * CI问题修复脚本
 * 自动检测和修复常见的CI/CD问题
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CIFixer {
  constructor() {
    this.issues = [];
    this.fixes = [];
  }

  /**
   * 运行所有检查和修复
   */
  async runAllFixes() {
    console.log('🔧 开始CI问题检查和修复...\n');
    
    try {
      this.checkPackageScripts();
      this.checkESLintConfig();
      this.checkTypeScriptConfig();
      this.checkGitIgnore();
      this.fixCommonIssues();
      
      this.displayResults();
      
    } catch (error) {
      console.error('❌ 修复过程中出现错误:', error.message);
      process.exit(1);
    }
  }

  /**
   * 检查package.json脚本
   */
  checkPackageScripts() {
    console.log('📦 检查package.json脚本...');
    
    const packagePath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packagePath)) {
      this.issues.push('package.json文件不存在');
      return;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const scripts = packageJson.scripts || {};
    
    const requiredScripts = [
      'type-check',
      'lint',
      'format:check',
      'build',
      'test:run'
    ];
    
    const missingScripts = requiredScripts.filter(script => !scripts[script]);
    
    if (missingScripts.length > 0) {
      this.issues.push(`缺少必要的npm脚本: ${missingScripts.join(', ')}`);
      
      // 添加缺少的脚本
      const scriptsToAdd = {
        'type-check': 'tsc --noEmit',
        'lint': 'eslint src --ext .ts,.tsx --report-unused-disable-directives --max-warnings 0',
        'format:check': 'prettier --check "src/**/*.{ts,tsx,js,jsx,css,md}"',
        'build': 'tsc --noEmit && vite build',
        'test:run': 'vitest run'
      };
      
      missingScripts.forEach(script => {
        if (scriptsToAdd[script]) {
          scripts[script] = scriptsToAdd[script];
          this.fixes.push(`添加npm脚本: ${script}`);
        }
      });
      
      packageJson.scripts = scripts;
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    }
    
    console.log('✅ package.json脚本检查完成\n');
  }

  /**
   * 检查ESLint配置
   */
  checkESLintConfig() {
    console.log('🔍 检查ESLint配置...');
    
    const eslintConfigs = [
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.json',
      'eslint.config.js'
    ];
    
    const hasConfig = eslintConfigs.some(config => 
      fs.existsSync(path.join(process.cwd(), config))
    );
    
    if (!hasConfig) {
      this.issues.push('缺少ESLint配置文件');
      this.createESLintConfig();
    }
    
    console.log('✅ ESLint配置检查完成\n');
  }

  /**
   * 检查TypeScript配置
   */
  checkTypeScriptConfig() {
    console.log('📝 检查TypeScript配置...');
    
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      this.issues.push('缺少tsconfig.json文件');
      this.createTypeScriptConfig();
    }
    
    console.log('✅ TypeScript配置检查完成\n');
  }

  /**
   * 检查.gitignore
   */
  checkGitIgnore() {
    console.log('📁 检查.gitignore...');
    
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      this.issues.push('缺少.gitignore文件');
      this.createGitIgnore();
    } else {
      // 检查是否包含必要的忽略项
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      const requiredIgnores = [
        'node_modules',
        'dist',
        'dist-electron',
        '.env.local',
        'coverage'
      ];
      
      const missingIgnores = requiredIgnores.filter(ignore => 
        !gitignoreContent.includes(ignore)
      );
      
      if (missingIgnores.length > 0) {
        this.issues.push(`gitignore缺少项目: ${missingIgnores.join(', ')}`);
        fs.appendFileSync(gitignorePath, '\n' + missingIgnores.join('\n') + '\n');
        this.fixes.push('更新.gitignore文件');
      }
    }
    
    console.log('✅ .gitignore检查完成\n');
  }

  /**
   * 修复常见问题
   */
  fixCommonIssues() {
    console.log('🛠️ 修复常见问题...');
    
    // 清理node_modules缓存
    try {
      console.log('  清理npm缓存...');
      execSync('npm cache clean --force', { stdio: 'pipe' });
      this.fixes.push('清理npm缓存');
    } catch (error) {
      console.log('  ⚠️ npm缓存清理失败，跳过');
    }
    
    // 检查依赖
    try {
      console.log('  检查依赖完整性...');
      execSync('npm ci', { stdio: 'pipe' });
      this.fixes.push('重新安装依赖');
    } catch (error) {
      this.issues.push('依赖安装失败: ' + error.message);
    }
    
    console.log('✅ 常见问题修复完成\n');
  }

  /**
   * 创建ESLint配置
   */
  createESLintConfig() {
    const eslintConfig = `module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  ignorePatterns: [
    'dist',
    'dist-electron',
    'node_modules',
    '.eslintrc.cjs',
    'server/node_modules',
    'build',
    'coverage'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  }
};
`;
    
    fs.writeFileSync('.eslintrc.cjs', eslintConfig);
    this.fixes.push('创建ESLint配置文件');
  }

  /**
   * 创建TypeScript配置
   */
  createTypeScriptConfig() {
    const tsconfigContent = {
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noFallthroughCasesInSwitch: true
      },
      include: ["src"],
      references: [{ path: "./tsconfig.node.json" }]
    };
    
    fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfigContent, null, 2));
    this.fixes.push('创建TypeScript配置文件');
  }

  /**
   * 创建.gitignore
   */
  createGitIgnore() {
    const gitignoreContent = `# Dependencies
node_modules/
server/node_modules/

# Build outputs
dist/
dist-electron/
build/

# Environment files
.env
.env.local
.env.production

# Logs
logs/
*.log
npm-debug.log*

# Coverage
coverage/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp
`;
    
    fs.writeFileSync('.gitignore', gitignoreContent);
    this.fixes.push('创建.gitignore文件');
  }

  /**
   * 显示结果
   */
  displayResults() {
    console.log('📋 CI修复结果汇总:');
    console.log('='.repeat(50));
    
    if (this.issues.length > 0) {
      console.log('❌ 发现的问题:');
      this.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
      console.log();
    }
    
    if (this.fixes.length > 0) {
      console.log('✅ 应用的修复:');
      this.fixes.forEach((fix, index) => {
        console.log(`  ${index + 1}. ${fix}`);
      });
      console.log();
    }
    
    if (this.issues.length === 0 && this.fixes.length === 0) {
      console.log('🎉 没有发现问题，CI配置良好！');
    } else {
      console.log('🔧 修复完成！请重新运行CI检查。');
    }
  }
}

// 运行修复
const fixer = new CIFixer();
fixer.runAllFixes();
