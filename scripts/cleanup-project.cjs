const fs = require('fs');
const path = require('path');

/**
 * 项目清理和整理工具
 * 清理重复脚本、优化项目结构、整理npm指令
 */
class ProjectCleaner {
  constructor() {
    this.projectRoot = process.cwd();
    this.scriptsDir = path.join(this.projectRoot, 'scripts');
    this.frontendDir = path.join(this.projectRoot, 'frontend');
    this.cleanedFiles = [];
    this.movedFiles = [];
    this.errors = [];
  }

  /**
   * 执行完整的项目清理
   */
  async execute() {
    console.log('🧹 开始项目清理和整理...\n');

    try {
      // 1. 清理重复和过时的脚本
      await this.cleanupScripts();
      
      // 2. 整理脚本目录结构
      await this.organizeScripts();
      
      // 3. 优化package.json脚本
      await this.optimizePackageScripts();
      
      // 4. 创建清理报告
      await this.generateCleanupReport();

      console.log('\n✅ 项目清理完成！');
      console.log(`📁 清理了 ${this.cleanedFiles.length} 个文件`);
      console.log(`📦 移动了 ${this.movedFiles.length} 个文件`);
      
      if (this.errors.length > 0) {
        console.log(`⚠️ 遇到 ${this.errors.length} 个错误`);
      }

    } catch (error) {
      console.error('❌ 清理失败:', error);
    }
  }

  /**
   * 清理重复和过时的脚本
   */
  async cleanupScripts() {
    console.log('🗑️ 清理重复和过时的脚本...');

    // 定义要删除的过时脚本模式
    const obsoletePatterns = [
      /fix-.*-precise\.cjs$/,
      /fix-.*-syntax\.cjs$/,
      /fix-.*-advanced\.cjs$/,
      /fix-.*-batch\.cjs$/,
      /fix-.*-complete\.cjs$/,
      /emergency-.*\.cjs$/,
      /aggressive-.*\.cjs$/,
      /comprehensive-.*-fixer\.cjs$/,
      /intelligent-.*-fixer\.cjs$/,
      /progressive-.*-fixer\.cjs$/,
      /precision-.*-fixer\.cjs$/,
      /targeted-.*-fixer\.cjs$/,
      /final-.*-cleanup\.cjs$/,
      /isolate-.*\.cjs$/,
      /rebuild-.*\.cjs$/,
      /project-recovery\.cjs$/
    ];

    // 定义要保留的核心脚本
    const keepScripts = [
      'cleanup-project.cjs',
      'batch-fix-jsx.cjs',
      'create-practical-solution.cjs',
      'start-dev.js',
      'health-check.sh',
      'deploy.sh',
      'deploy.ps1',
      'backup.sh'
    ];

    await this.scanAndCleanDirectory(this.scriptsDir, obsoletePatterns, keepScripts);
  }

  /**
   * 扫描并清理目录
   */
  async scanAndCleanDirectory(dir, obsoletePatterns, keepScripts) {
    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // 递归处理子目录
          await this.scanAndCleanDirectory(fullPath, obsoletePatterns, keepScripts);
        } else if (stat.isFile()) {
          const shouldDelete = obsoletePatterns.some(pattern => pattern.test(item)) && 
                              !keepScripts.includes(item);

          if (shouldDelete) {
            try {
              fs.unlinkSync(fullPath);
              this.cleanedFiles.push(path.relative(this.projectRoot, fullPath));
              console.log(`  ✓ 删除: ${item}`);
            } catch (error) {
              this.errors.push(`删除文件失败: ${fullPath} - ${error.message}`);
            }
          }
        }
      }
    } catch (error) {
      this.errors.push(`扫描目录失败: ${dir} - ${error.message}`);
    }
  }

  /**
   * 整理脚本目录结构
   */
  async organizeScripts() {
    console.log('📁 整理脚本目录结构...');

    const targetStructure = {
      'core': ['batch-fix-jsx.cjs', 'create-practical-solution.cjs'],
      'deployment': ['deploy.sh', 'deploy.ps1', 'health-check.sh'],
      'development': ['start-dev.js'],
      'maintenance': [], // 保留现有maintenance目录
      'testing': [], // 保留现有testing目录
      'utils': [] // 保留现有utils目录
    };

    // 创建核心目录结构
    for (const [dirName, files] of Object.entries(targetStructure)) {
      const targetDir = path.join(this.scriptsDir, dirName);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log(`  ✓ 创建目录: ${dirName}`);
      }

      // 移动指定文件到对应目录
      for (const fileName of files) {
        const sourcePath = path.join(this.scriptsDir, fileName);
        const targetPath = path.join(targetDir, fileName);

        if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
          try {
            fs.renameSync(sourcePath, targetPath);
            this.movedFiles.push(`${fileName} -> ${dirName}/`);
            console.log(`  ✓ 移动: ${fileName} -> ${dirName}/`);
          } catch (error) {
            this.errors.push(`移动文件失败: ${fileName} - ${error.message}`);
          }
        }
      }
    }
  }

  /**
   * 优化package.json脚本
   */
  async optimizePackageScripts() {
    console.log('📦 优化package.json脚本...');

    const packagePath = path.join(this.frontendPath, 'package.json');
    
    if (!fs.existsSync(packagePath)) {
      this.errors.push('package.json文件不存在');
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      // 定义优化后的脚本
      const optimizedScripts = {
        // 开发脚本
        "dev": "vite",
        "dev-safe": "node ignore-errors.cjs dev",
        "start": "npm run dev",
        "start-safe": "npm run dev-safe",

        // 构建脚本
        "build": "vite build",
        "build-safe": "node ignore-errors.cjs build",
        "preview": "vite preview",
        "preview-safe": "vite preview --config vite.config.safe.ts",

        // 类型检查脚本
        "type-check": "tsc --noEmit --skipLibCheck",
        "type-check-dev": "tsc --project tsconfig.dev.json",
        "type-check-strict": "tsc --noEmit",
        "type-ignore": "node ignore-errors.cjs type-check",

        // 代码质量脚本
        "lint": "eslint . --ext .ts,.tsx",
        "lint:fix": "eslint . --ext .ts,.tsx --fix",
        "format": "prettier --write \"**/*.{ts,tsx,js,jsx,css,md}\"",
        "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,css,md}\"",

        // 测试脚本
        "test": "vitest",
        "test:ui": "vitest --ui",
        "test:run": "vitest run",
        "test:coverage": "vitest run --coverage",

        // 清理和维护脚本
        "clean": "rimraf dist node_modules/.vite",
        "clean:all": "rimraf dist node_modules package-lock.json && npm install",
        "cleanup": "node ../scripts/core/cleanup-project.cjs",

        // 项目管理脚本
        "deps:check": "npm outdated",
        "deps:update": "npm update",
        "deps:audit": "npm audit",
        "deps:fix": "npm audit fix"
      };

      // 合并现有脚本和优化脚本
      packageJson.scripts = {
        ...packageJson.scripts,
        ...optimizedScripts
      };

      // 移除重复和过时的脚本
      const scriptsToRemove = [
        'type-check-force',
        'build-dev',
        'dev-debug',
        'start-debug'
      ];

      scriptsToRemove.forEach(script => {
        if (packageJson.scripts[script]) {
          delete packageJson.scripts[script];
          console.log(`  ✓ 移除过时脚本: ${script}`);
        }
      });

      // 写回文件
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      console.log('  ✅ package.json脚本已优化');

    } catch (error) {
      this.errors.push(`优化package.json失败: ${error.message}`);
    }
  }

  /**
   * 生成清理报告
   */
  async generateCleanupReport() {
    console.log('📋 生成清理报告...');

    const reportContent = `# 项目清理报告

## 清理时间
${new Date().toLocaleString('zh-CN')}

## 清理统计
- 删除文件: ${this.cleanedFiles.length} 个
- 移动文件: ${this.movedFiles.length} 个
- 错误数量: ${this.errors.length} 个

## 删除的文件
${this.cleanedFiles.map(file => `- ${file}`).join('\n')}

## 移动的文件
${this.movedFiles.map(move => `- ${move}`).join('\n')}

## 错误信息
${this.errors.map(error => `- ${error}`).join('\n')}

## 优化后的npm脚本

### 开发脚本
- \`npm run dev\` - 标准开发模式
- \`npm run dev-safe\` - 安全开发模式（忽略错误）
- \`npm start\` - 启动开发服务器

### 构建脚本
- \`npm run build\` - 标准构建
- \`npm run build-safe\` - 安全构建（忽略错误）
- \`npm run preview\` - 预览构建结果

### 代码质量
- \`npm run lint\` - 代码检查
- \`npm run lint:fix\` - 自动修复代码问题
- \`npm run format\` - 代码格式化
- \`npm run type-check\` - 类型检查

### 测试
- \`npm test\` - 运行测试
- \`npm run test:coverage\` - 测试覆盖率

### 维护
- \`npm run clean\` - 清理构建文件
- \`npm run cleanup\` - 项目清理
- \`npm run deps:check\` - 检查依赖更新

## 建议
1. 使用 \`npm run dev-safe\` 进行日常开发
2. 定期运行 \`npm run cleanup\` 清理项目
3. 使用 \`npm run lint:fix\` 保持代码质量
4. 构建前运行 \`npm run type-check\` 检查类型错误
`;

    const reportPath = path.join(this.projectRoot, 'CLEANUP_REPORT.md');
    fs.writeFileSync(reportPath, reportContent);
    console.log('  ✅ 清理报告已生成: CLEANUP_REPORT.md');
  }

  get frontendPath() {
    return this.frontendDir;
  }
}

if (require.main === module) {
  const cleaner = new ProjectCleaner();
  cleaner.execute().catch(console.error);
}

module.exports = { ProjectCleaner };
