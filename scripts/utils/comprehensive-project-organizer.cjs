#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ComprehensiveProjectOrganizer {
  constructor() {
    this.projectRoot = process.cwd();
    this.actions = [];
    this.errors = [];
    
    // 定义文件应该放置的正确位置
    this.fileRules = {
      // 脚本文件规则
      scripts: {
        maintenance: [
          'fix-', 'repair-', 'clean-', 'enhance-', 'optimize-', 'typescript-', 
          'api-', 'performance-', 'syntax-', 'error-', 'string-', 'import-'
        ],
        testing: [
          'test-', 'spec-', 'e2e-', 'unit-', 'integration-'
        ],
        utils: [
          'check-', 'validate-', 'analyze-', 'consistency-', 'naming-', 
          'dependency-', 'config-', 'project-', 'comprehensive-'
        ],
        build: [
          'build-', 'compile-', 'bundle-', 'webpack-', 'vite-', 'design-system-'
        ],
        deploy: [
          'deploy-', 'docker-', 'server-', 'production-'
        ]
      },
      
      // 文档文件规则
      docs: [
        '.md', 'README', 'CHANGELOG', 'GUIDE', 'DOCUMENTATION', 
        'ANALYSIS', 'REPORT', 'STATUS', 'COMPLETION'
      ],
      
      // 配置文件规则
      config: [
        'config.', '.config.', 'jest.config', 'webpack.config', 
        'vite.config', 'tsconfig', 'eslint', 'prettier'
      ],
      
      // 报告文件规则
      reports: [
        '-report.json', '-report.md', 'report.json', 'report.md'
      ]
    };
  }

  /**
   * 执行全面的项目整理
   */
  async execute() {
    console.log('🔧 开始全面项目整理...\n');

    try {
      // 1. 清理根目录的错位文件
      await this.cleanupRootDirectory();
      
      // 2. 整理脚本文件
      await this.organizeScriptFiles();
      
      // 3. 整理文档文件
      await this.organizeDocumentFiles();
      
      // 4. 整理配置文件
      await this.organizeConfigFiles();
      
      // 5. 清理空目录
      await this.cleanupEmptyDirectories();
      
      // 6. 验证整理结果
      await this.validateOrganization();
      
      // 7. 生成整理报告
      this.generateOrganizationReport();

    } catch (error) {
      console.error('❌ 项目整理过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 清理根目录的错位文件
   */
  async cleanupRootDirectory() {
    console.log('🧹 清理根目录错位文件...');

    const rootFiles = fs.readdirSync(this.projectRoot)
      .filter(item => {
        const fullPath = path.join(this.projectRoot, item);
        return fs.statSync(fullPath).isFile();
      });

    for (const file of rootFiles) {
      const targetLocation = this.determineCorrectLocation(file);
      
      if (targetLocation && targetLocation !== '.') {
        const sourcePath = path.join(this.projectRoot, file);
        const targetDir = path.join(this.projectRoot, targetLocation);
        const targetPath = path.join(targetDir, file);

        // 确保目标目录存在
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        try {
          // 检查目标文件是否已存在
          if (fs.existsSync(targetPath)) {
            // 如果文件相同，删除源文件
            if (this.filesAreIdentical(sourcePath, targetPath)) {
              fs.unlinkSync(sourcePath);
              this.addAction('delete', sourcePath, `删除重复文件，目标已存在: ${targetLocation}/${file}`);
            } else {
              // 如果文件不同，重命名后移动
              const timestamp = Date.now();
              const newName = `${path.parse(file).name}_${timestamp}${path.parse(file).ext}`;
              const newTargetPath = path.join(targetDir, newName);
              fs.renameSync(sourcePath, newTargetPath);
              this.addAction('move', sourcePath, `移动并重命名到: ${targetLocation}/${newName}`);
            }
          } else {
            fs.renameSync(sourcePath, targetPath);
            this.addAction('move', sourcePath, `移动到: ${targetLocation}/${file}`);
          }
        } catch (error) {
          this.addError(sourcePath, `移动失败: ${error.message}`);
        }
      }
    }

    console.log('   ✅ 根目录清理完成\n');
  }

  /**
   * 整理脚本文件
   */
  async organizeScriptFiles() {
    console.log('🔧 整理脚本文件...');

    const scriptsDir = path.join(this.projectRoot, 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      return;
    }

    // 获取scripts目录下的所有.cjs和.js文件
    const scriptFiles = this.getAllFilesInDirectory(scriptsDir)
      .filter(file => file.endsWith('.cjs') || file.endsWith('.js'))
      .filter(file => {
        const relativePath = path.relative(scriptsDir, file);
        // 只处理直接在scripts目录下的文件，不处理已经在子目录中的文件
        return !relativePath.includes(path.sep);
      });

    for (const scriptFile of scriptFiles) {
      const fileName = path.basename(scriptFile);
      const category = this.categorizeScript(fileName);
      const targetDir = path.join(scriptsDir, category);
      const targetPath = path.join(targetDir, fileName);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      try {
        if (!fs.existsSync(targetPath)) {
          fs.renameSync(scriptFile, targetPath);
          this.addAction('move', scriptFile, `移动到: scripts/${category}/${fileName}`);
        }
      } catch (error) {
        this.addError(scriptFile, `移动失败: ${error.message}`);
      }
    }

    console.log('   ✅ 脚本文件整理完成\n');
  }

  /**
   * 整理文档文件
   */
  async organizeDocumentFiles() {
    console.log('📚 整理文档文件...');

    const rootFiles = fs.readdirSync(this.projectRoot)
      .filter(file => {
        const fullPath = path.join(this.projectRoot, file);
        return fs.statSync(fullPath).isFile() && this.isDocumentFile(file);
      });

    const docsDir = path.join(this.projectRoot, 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    for (const file of rootFiles) {
      const sourcePath = path.join(this.projectRoot, file);
      const targetPath = path.join(docsDir, file);

      try {
        if (!fs.existsSync(targetPath)) {
          fs.renameSync(sourcePath, targetPath);
          this.addAction('move', sourcePath, `移动到: docs/${file}`);
        }
      } catch (error) {
        this.addError(sourcePath, `移动失败: ${error.message}`);
      }
    }

    console.log('   ✅ 文档文件整理完成\n');
  }

  /**
   * 整理配置文件
   */
  async organizeConfigFiles() {
    console.log('⚙️ 整理配置文件...');

    const configFiles = [
      { file: 'jest.config.js', target: 'config/testing/' },
      { file: 'playwright.config.ts', target: 'config/testing/' },
      { file: 'webpack.config.js', target: 'config/build/' },
      { file: 'vite.config.js', target: 'config/build/' },
      { file: 'vite.config.ts', target: 'config/build/' }
    ];

    for (const { file, target } of configFiles) {
      const sourcePath = path.join(this.projectRoot, file);
      const targetDir = path.join(this.projectRoot, target);
      const targetPath = path.join(targetDir, file);

      if (fs.existsSync(sourcePath)) {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        try {
          if (!fs.existsSync(targetPath)) {
            fs.renameSync(sourcePath, targetPath);
            this.addAction('move', sourcePath, `移动到: ${target}${file}`);
          }
        } catch (error) {
          this.addError(sourcePath, `移动失败: ${error.message}`);
        }
      }
    }

    console.log('   ✅ 配置文件整理完成\n');
  }

  /**
   * 清理空目录
   */
  async cleanupEmptyDirectories() {
    console.log('🗑️ 清理空目录...');

    const emptyDirs = this.findEmptyDirectories(this.projectRoot);
    
    for (const dir of emptyDirs) {
      try {
        fs.rmdirSync(dir);
        this.addAction('delete', dir, '删除空目录');
      } catch (error) {
        this.addError(dir, `删除目录失败: ${error.message}`);
      }
    }

    console.log('   ✅ 空目录清理完成\n');
  }

  /**
   * 验证整理结果
   */
  async validateOrganization() {
    console.log('✅ 验证整理结果...');

    const issues = [];

    // 检查根目录是否还有不应该存在的文件
    const rootFiles = fs.readdirSync(this.projectRoot)
      .filter(item => {
        const fullPath = path.join(this.projectRoot, item);
        return fs.statSync(fullPath).isFile();
      })
      .filter(file => !this.isAllowedInRoot(file));

    if (rootFiles.length > 0) {
      issues.push(`根目录仍有 ${rootFiles.length} 个文件位置不当: ${rootFiles.join(', ')}`);
    }

    if (issues.length === 0) {
      console.log('   ✅ 项目结构验证通过\n');
    } else {
      console.log('   ⚠️ 发现以下问题:');
      issues.forEach(issue => console.log(`     - ${issue}`));
      console.log();
    }
  }

  /**
   * 工具方法
   */
  determineCorrectLocation(fileName) {
    // 脚本文件
    if (fileName.endsWith('.cjs') || fileName.endsWith('.js')) {
      if (this.isScriptFile(fileName)) {
        const category = this.categorizeScript(fileName);
        return `scripts/${category}`;
      }
    }

    // 文档文件
    if (this.isDocumentFile(fileName)) {
      return 'docs';
    }

    // 报告文件
    if (this.fileRules.reports.some(pattern => fileName.includes(pattern))) {
      return 'reports';
    }

    return null;
  }

  isScriptFile(fileName) {
    return fileName.endsWith('.cjs') || 
           (fileName.endsWith('.js') && !fileName.includes('config'));
  }

  isDocumentFile(fileName) {
    return this.fileRules.docs.some(pattern => 
      fileName.includes(pattern) || fileName.endsWith(pattern)
    );
  }

  categorizeScript(fileName) {
    const lowerName = fileName.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.fileRules.scripts)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }
    
    return 'utils';
  }

  isAllowedInRoot(fileName) {
    const allowedFiles = [
      'package.json', 'package-lock.json', 'yarn.lock',
      'README.md', 'LICENSE', '.gitignore', '.env',
      'docker-compose.yml', 'Dockerfile',
      'start-complete.bat'
    ];
    
    return allowedFiles.includes(fileName) || 
           fileName.startsWith('.') ||
           fileName.endsWith('.config.js') ||
           fileName.endsWith('.config.ts');
  }

  getAllFilesInDirectory(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isFile()) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  findEmptyDirectories(dir) {
    const emptyDirs = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        const subItems = fs.readdirSync(fullPath);
        if (subItems.length === 0) {
          emptyDirs.push(fullPath);
        } else {
          emptyDirs.push(...this.findEmptyDirectories(fullPath));
        }
      }
    }
    
    return emptyDirs;
  }

  filesAreIdentical(file1, file2) {
    try {
      const content1 = fs.readFileSync(file1);
      const content2 = fs.readFileSync(file2);
      return content1.equals(content2);
    } catch (error) {
      return false;
    }
  }

  addAction(type, path, description) {
    this.actions.push({
      type,
      path: path.replace(this.projectRoot, '.'),
      description,
      timestamp: new Date().toISOString()
    });
  }

  addError(path, error) {
    this.errors.push({
      path: path.replace(this.projectRoot, '.'),
      error,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 生成整理报告
   */
  generateOrganizationReport() {
    const reportPath = path.join(this.projectRoot, 'reports', 'comprehensive-organization-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalActions: this.actions.length,
        totalErrors: this.errors.length,
        actionsByType: this.getActionsByType(),
        organizationRules: this.fileRules
      },
      actions: this.actions,
      errors: this.errors
    };

    // 确保reports目录存在
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 全面项目整理报告:');
    console.log(`   执行操作: ${this.actions.length}`);
    console.log(`   发生错误: ${this.errors.length}`);
    console.log(`   报告已保存: reports/comprehensive-organization-report.json\n`);

    const actionStats = this.getActionsByType();
    for (const [type, count] of Object.entries(actionStats)) {
      console.log(`   ${type}: ${count} 个操作`);
    }
  }

  getActionsByType() {
    const stats = {};
    for (const action of this.actions) {
      stats[action.type] = (stats[action.type] || 0) + 1;
    }
    return stats;
  }
}

// 执行脚本
if (require.main === module) {
  const organizer = new ComprehensiveProjectOrganizer();
  organizer.execute().catch(error => {
    console.error('❌ 全面项目整理失败:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveProjectOrganizer;
