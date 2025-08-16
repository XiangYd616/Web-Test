#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class DuplicateFileResolver {
  constructor() {
    this.projectRoot = process.cwd();
    this.dryRun = process.argv.includes('--dry-run');
    this.actions = [];
    
    // 定义重复文件的处理策略
    this.duplicateResolutions = [
      {
        keep: 'frontend/components/testing/UnifiedTestConfigPanel.tsx',
        remove: 'frontend/components/testing/TestConfigPanel.tsx',
        reason: 'UnifiedTestConfigPanel支持所有9种测试类型，功能更完整',
        newName: 'frontend/components/testing/TestConfigPanel.tsx'
      },
      {
        keep: 'frontend/components/testing/UnifiedTestResultsPanel.tsx',
        remove: 'frontend/components/testing/TestResultsPanel.tsx',
        reason: 'UnifiedTestResultsPanel支持所有测试类型，功能更完整',
        newName: 'frontend/components/testing/TestResultsPanel.tsx'
      },
      {
        keep: 'frontend/components/testing/UnifiedTestManager.tsx',
        remove: null,
        reason: '保留UnifiedTestManager，重命名为TestManager',
        newName: 'frontend/components/testing/TestManager.tsx'
      },
      {
        keep: 'frontend/pages/core/testing/SecurityTest.tsx',
        remove: 'frontend/pages/core/testing/SecurityTestRefactored.tsx',
        reason: '删除Refactored版本，保留原版本'
      },
      {
        keep: 'frontend/pages/core/testing/UnifiedTestPage.tsx',
        remove: 'frontend/pages/core/testing/TestPage.tsx',
        reason: 'UnifiedTestPage功能更完整',
        newName: 'frontend/pages/core/testing/TestPage.tsx'
      },
      {
        keep: 'frontend/hooks/useUnifiedTestFlow.ts',
        remove: null,
        reason: '重命名为useTestFlow',
        newName: 'frontend/hooks/useTestFlow.ts'
      },
      {
        keep: 'frontend/components/testing/RealTimeTestProgress.tsx',
        remove: null,
        reason: '重命名为TestProgress',
        newName: 'frontend/components/testing/TestProgress.tsx'
      }
    ];
  }

  /**
   * 执行重复文件解决方案
   */
  async execute() {
    console.log(`🔧 开始解决重复文件问题${this.dryRun ? ' (预览模式)' : ''}...\n`);

    try {
      // 1. 处理每个重复文件
      for (const resolution of this.duplicateResolutions) {
        await this.processResolution(resolution);
      }

      // 2. 更新导入引用
      if (!this.dryRun) {
        await this.updateImportReferences();
      }

      // 3. 生成报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 处理过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 处理单个重复文件解决方案
   */
  async processResolution(resolution) {
    const { keep, remove, newName, reason } = resolution;
    
    console.log(`📝 处理: ${keep}`);
    console.log(`   原因: ${reason}`);

    // 检查文件是否存在
    const keepPath = path.join(this.projectRoot, keep);
    if (!fs.existsSync(keepPath)) {
      console.log(`   ❌ 保留文件不存在: ${keep}`);
      return;
    }

    // 如果需要删除旧文件
    if (remove) {
      const removePath = path.join(this.projectRoot, remove);
      if (fs.existsSync(removePath)) {
        if (!this.dryRun) {
          fs.unlinkSync(removePath);
        }
        console.log(`   ${this.dryRun ? '[预览]' : '✅'} 删除旧文件: ${remove}`);
        this.actions.push({
          type: 'delete',
          file: remove,
          reason: `删除重复文件: ${reason}`
        });
      }
    }

    // 如果需要重命名
    if (newName && newName !== keep) {
      const newPath = path.join(this.projectRoot, newName);
      if (!this.dryRun) {
        // 确保目标目录存在
        const newDir = path.dirname(newPath);
        if (!fs.existsSync(newDir)) {
          fs.mkdirSync(newDir, { recursive: true });
        }
        
        // 重命名文件
        fs.renameSync(keepPath, newPath);
      }
      console.log(`   ${this.dryRun ? '[预览]' : '✅'} 重命名: ${keep} → ${newName}`);
      this.actions.push({
        type: 'rename',
        from: keep,
        to: newName,
        reason
      });
    }

    console.log('');
  }

  /**
   * 更新导入引用
   */
  async updateImportReferences() {
    console.log('🔄 更新导入引用...\n');

    const files = this.getAllProjectFiles();
    let updatedFiles = 0;

    for (const action of this.actions) {
      if (action.type === 'rename') {
        const oldPath = action.from;
        const newPath = action.to;
        
        // 计算相对路径变化
        const oldBaseName = path.basename(oldPath, path.extname(oldPath));
        const newBaseName = path.basename(newPath, path.extname(newPath));
        
        if (oldBaseName !== newBaseName) {
          for (const file of files) {
            try {
              let content = fs.readFileSync(file, 'utf8');
              let modified = false;

              // 更新导入语句
              const importPatterns = [
                new RegExp(`(import.*from\\s*['"\`][^'"\`]*/)${oldBaseName}(['"\`])`, 'g'),
                new RegExp(`(import\\s*['"\`][^'"\`]*/)${oldBaseName}(['"\`])`, 'g')
              ];

              importPatterns.forEach(pattern => {
                if (pattern.test(content)) {
                  content = content.replace(pattern, `$1${newBaseName}$2`);
                  modified = true;
                }
              });

              if (modified) {
                fs.writeFileSync(file, content);
                updatedFiles++;
                console.log(`   ✅ 更新引用: ${path.relative(this.projectRoot, file)}`);
              }
            } catch (error) {
              console.log(`   ❌ 更新失败: ${file} - ${error.message}`);
            }
          }
        }
      }
    }

    console.log(`\n📊 更新了 ${updatedFiles} 个文件的导入引用\n`);
  }

  /**
   * 获取所有项目文件
   */
  getAllProjectFiles() {
    const files = [];
    
    const walkDir = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          if (this.shouldSkipDirectory(item)) continue;
          
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else if (/\.(ts|tsx|js|jsx)$/.test(item)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    };

    walkDir(path.join(this.projectRoot, 'frontend'));
    return files;
  }

  /**
   * 是否跳过目录
   */
  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '__tests__', '.vscode', '.idea', 'temp', 'tmp', 'backup'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * 生成报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'duplicate-resolution-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: this.dryRun,
      summary: {
        totalActions: this.actions.length,
        deletions: this.actions.filter(a => a.type === 'delete').length,
        renames: this.actions.filter(a => a.type === 'rename').length
      },
      actions: this.actions
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 重复文件解决报告:');
    console.log(`   总操作数: ${report.summary.totalActions}`);
    console.log(`   删除文件: ${report.summary.deletions}`);
    console.log(`   重命名文件: ${report.summary.renames}`);
    console.log(`   报告已保存: ${reportPath}`);
  }
}

// 执行脚本
if (require.main === module) {
  const resolver = new DuplicateFileResolver();
  resolver.execute().catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = DuplicateFileResolver;
