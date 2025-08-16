#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ProjectReorganizer {
  constructor() {
    this.projectRoot = process.cwd();
    this.actions = [];
    this.errors = [];
    
    // 定义标准项目结构
    this.standardStructure = {
      'reports': '生成的报告文件',
      'scripts/build': '构建相关脚本',
      'scripts/deploy': '部署相关脚本',
      'scripts/maintenance': '维护和修复脚本',
      'scripts/testing': '测试相关脚本',
      'scripts/utils': '工具脚本',
      'tests/unit': '单元测试',
      'tests/integration': '集成测试',
      'tests/e2e': 'E2E测试',
      'config/environments': '环境配置',
      'backup/archive': '归档备份'
    };
  }

  /**
   * 执行项目重组
   */
  async execute() {
    console.log('🔧 开始项目重组和清理...\n');

    try {
      // 1. 创建标准目录结构
      await this.createStandardDirectories();
      
      // 2. 移动报告文件
      await this.moveReportFiles();
      
      // 3. 重组脚本目录
      await this.reorganizeScripts();
      
      // 4. 合并测试目录
      await this.mergeTestDirectories();
      
      // 5. 清理重复文件
      await this.cleanupDuplicateFiles();
      
      // 6. 整理配置文件
      await this.organizeConfigFiles();
      
      // 7. 生成清理报告
      this.generateCleanupReport();

    } catch (error) {
      console.error('❌ 项目重组过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 创建标准目录结构
   */
  async createStandardDirectories() {
    console.log('📁 创建标准目录结构...');

    for (const [dir, description] of Object.entries(this.standardStructure)) {
      const dirPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        this.addAction('create', dirPath, `创建目录: ${description}`);
      }
    }

    console.log('   ✅ 标准目录结构创建完成\n');
  }

  /**
   * 移动报告文件
   */
  async moveReportFiles() {
    console.log('📊 移动报告文件...');

    const reportFiles = fs.readdirSync(this.projectRoot)
      .filter(file => file.endsWith('-report.json') || file.endsWith('-report.md'))
      .filter(file => fs.statSync(path.join(this.projectRoot, file)).isFile());

    const reportsDir = path.join(this.projectRoot, 'reports');

    for (const file of reportFiles) {
      const sourcePath = path.join(this.projectRoot, file);
      const targetPath = path.join(reportsDir, file);
      
      try {
        fs.renameSync(sourcePath, targetPath);
        this.addAction('move', sourcePath, `移动到 reports/${file}`);
      } catch (error) {
        this.addError(sourcePath, `移动失败: ${error.message}`);
      }
    }

    console.log(`   ✅ 移动了 ${reportFiles.length} 个报告文件\n`);
  }

  /**
   * 重组脚本目录
   */
  async reorganizeScripts() {
    console.log('🔧 重组脚本目录...');

    const scriptsDir = path.join(this.projectRoot, 'scripts');
    const scripts = fs.readdirSync(scriptsDir)
      .filter(file => file.endsWith('.cjs') || file.endsWith('.js'))
      .filter(file => fs.statSync(path.join(scriptsDir, file)).isFile());

    // 脚本分类规则
    const scriptCategories = {
      build: ['build', 'webpack', 'vite', 'compile'],
      deploy: ['deploy', 'docker', 'server'],
      maintenance: ['fix', 'clean', 'repair', 'enhance', 'optimize'],
      testing: ['test', 'spec', 'e2e'],
      utils: ['util', 'helper', 'tool', 'generator']
    };

    for (const script of scripts) {
      const category = this.categorizeScript(script, scriptCategories);
      const sourcePath = path.join(scriptsDir, script);
      const targetDir = path.join(scriptsDir, category);
      const targetPath = path.join(targetDir, script);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      try {
        fs.renameSync(sourcePath, targetPath);
        this.addAction('move', sourcePath, `移动到 scripts/${category}/${script}`);
      } catch (error) {
        this.addError(sourcePath, `移动失败: ${error.message}`);
      }
    }

    console.log(`   ✅ 重组了 ${scripts.length} 个脚本文件\n`);
  }

  /**
   * 合并测试目录
   */
  async mergeTestDirectories() {
    console.log('🧪 合并测试目录...');

    const e2eDir = path.join(this.projectRoot, 'e2e');
    const testsE2eDir = path.join(this.projectRoot, 'tests/e2e');

    // 如果存在独立的 e2e 目录，合并到 tests/e2e
    if (fs.existsSync(e2eDir)) {
      const e2eFiles = fs.readdirSync(e2eDir);
      
      for (const file of e2eFiles) {
        const sourcePath = path.join(e2eDir, file);
        const targetPath = path.join(testsE2eDir, file);
        
        if (fs.statSync(sourcePath).isFile()) {
          try {
            if (!fs.existsSync(targetPath)) {
              fs.renameSync(sourcePath, targetPath);
              this.addAction('move', sourcePath, `合并到 tests/e2e/${file}`);
            }
          } catch (error) {
            this.addError(sourcePath, `合并失败: ${error.message}`);
          }
        }
      }

      // 删除空的 e2e 目录
      try {
        if (fs.readdirSync(e2eDir).length === 0) {
          fs.rmdirSync(e2eDir);
          this.addAction('delete', e2eDir, '删除空的 e2e 目录');
        }
      } catch (error) {
        this.addError(e2eDir, `删除目录失败: ${error.message}`);
      }
    }

    console.log('   ✅ 测试目录合并完成\n');
  }

  /**
   * 清理重复文件
   */
  async cleanupDuplicateFiles() {
    console.log('🗑️ 清理重复文件...');

    // 清理根目录的临时文件
    const tempFiles = [
      'index.html', // 应该在 public/ 或 dist/ 中
    ];

    for (const file of tempFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        // 检查是否在正确位置也存在
        const publicPath = path.join(this.projectRoot, 'public', file);
        const distPath = path.join(this.projectRoot, 'dist', file);
        
        if (fs.existsSync(publicPath) || fs.existsSync(distPath)) {
          try {
            fs.unlinkSync(filePath);
            this.addAction('delete', filePath, '删除重复文件');
          } catch (error) {
            this.addError(filePath, `删除失败: ${error.message}`);
          }
        }
      }
    }

    console.log('   ✅ 重复文件清理完成\n');
  }

  /**
   * 整理配置文件
   */
  async organizeConfigFiles() {
    console.log('⚙️ 整理配置文件...');

    // 移动特定配置文件到 config 目录
    const configFiles = [
      { file: 'playwright.config.ts', target: 'config/testing/' },
      { file: 'jest.config.js', target: 'config/testing/' }
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
          fs.renameSync(sourcePath, targetPath);
          this.addAction('move', sourcePath, `移动到 ${target}${file}`);
        } catch (error) {
          this.addError(sourcePath, `移动失败: ${error.message}`);
        }
      }
    }

    console.log('   ✅ 配置文件整理完成\n');
  }

  /**
   * 脚本分类
   */
  categorizeScript(scriptName, categories) {
    const lowerName = scriptName.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }
    
    return 'utils'; // 默认分类
  }

  /**
   * 工具方法
   */
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
   * 生成清理报告
   */
  generateCleanupReport() {
    const reportPath = path.join(this.projectRoot, 'reports', 'project-reorganization-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalActions: this.actions.length,
        totalErrors: this.errors.length,
        actionsByType: this.getActionsByType(),
        standardStructureCreated: Object.keys(this.standardStructure).length
      },
      actions: this.actions,
      errors: this.errors,
      newStructure: this.standardStructure
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 项目重组报告:');
    console.log(`   执行操作: ${this.actions.length}`);
    console.log(`   发生错误: ${this.errors.length}`);
    console.log(`   创建目录: ${Object.keys(this.standardStructure).length}`);
    console.log(`   报告已保存: reports/project-reorganization-report.json\n`);

    // 显示操作统计
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
  const reorganizer = new ProjectReorganizer();
  reorganizer.execute().catch(error => {
    console.error('❌ 项目重组失败:', error);
    process.exit(1);
  });
}

module.exports = ProjectReorganizer;
