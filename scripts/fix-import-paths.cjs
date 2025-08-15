#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 修复导入路径的脚本
 * 批量修复项目中错误的导入路径
 */
class ImportPathFixer {
  constructor() {
    this.fixes = [
      // 修复 withAuthCheck 路径
      {
        from: /from ['"`](.*)\/auth\/withAuthCheck(\.tsx?)?['"`]/g,
        to: "from '$1/auth/WithAuthCheck.tsx'"
      },
      
      // 修复 backgroundTestManager 路径
      {
        from: /from ['"`](.*)\/services\/backgroundTestManager(\.ts)?['"`]/g,
        to: "from '$1/services/testing/backgroundTestManager.ts'"
      },
      
      // 修复 systemResourceMonitor 路径
      {
        from: /from ['"`](.*)\/services\/systemResourceMonitor(\.ts)?['"`]/g,
        to: "from '$1/services/system/systemResourceMonitor.ts'"
      },
      
      // 修复 testEngines 路径
      {
        from: /from ['"`](.*)\/services\/testEngines(\.ts)?['"`]/g,
        to: "from '$1/services/testing/testEngines.ts'"
      },
      
      // 修复 TestStateManager 路径
      {
        from: /from ['"`](.*)\/services\/TestStateManager['"`]/g,
        to: "from '$1/services/testing/testStateManager'"
      },
      
      // 修复 integrationService 路径
      {
        from: /from ['"`](.*)\/services\/integrationService(\.ts)?['"`]/g,
        to: "from '$1/services/integration/integrationService.ts'"
      },
      
      // 修复 PerformanceTestAdapter 路径
      {
        from: /from ['"`](.*)\/services\/performance\/PerformanceTestAdapter(\.ts)?['"`]/g,
        to: "from '$1/services/performance/performanceTestAdapter.ts'"
      },
      
      // 修复 PerformanceTestCore 路径
      {
        from: /from ['"`](.*)\/services\/performance\/PerformanceTestCore(\.ts)?['"`]/g,
        to: "from '$1/services/performance/performanceTestCore.ts'"
      }
    ];
    
    this.stats = {
      filesProcessed: 0,
      filesModified: 0,
      totalFixes: 0
    };
  }

  /**
   * 修复所有导入路径
   */
  fixAllImportPaths(rootDir = 'frontend') {
    console.log('🔧 开始修复导入路径...\n');
    
    this.walkDirectory(rootDir);
    this.generateReport();
  }

  /**
   * 递归遍历目录
   */
  walkDirectory(dir) {
    if (!fs.existsSync(dir)) {
      console.log(`⚠️ 目录不存在: ${dir}`);
      return;
    }

    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // 跳过特定目录
        if (this.shouldSkipDirectory(file)) {
          return;
        }
        this.walkDirectory(filePath);
      } else if (stat.isFile()) {
        if (this.shouldProcessFile(file)) {
          this.processFile(filePath);
        }
      }
    });
  }

  /**
   * 处理单个文件
   */
  processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let newContent = content;
      let fileModified = false;
      let fixesInFile = 0;

      // 应用所有修复规则
      this.fixes.forEach(fix => {
        const matches = newContent.match(fix.from);
        if (matches) {
          newContent = newContent.replace(fix.from, fix.to);
          if (newContent !== content) {
            fileModified = true;
            fixesInFile += matches.length;
          }
        }
      });

      // 如果文件被修改，写回文件
      if (fileModified) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        const relativePath = path.relative(process.cwd(), filePath);
        console.log(`✅ 修复了 ${fixesInFile} 个导入路径: ${relativePath}`);
        this.stats.filesModified++;
        this.stats.totalFixes += fixesInFile;
      }

      this.stats.filesProcessed++;

    } catch (error) {
      console.error(`❌ 处理文件失败: ${filePath}`, error.message);
    }
  }

  /**
   * 是否跳过目录
   */
  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '__tests__', '.vscode', '.idea', 'temp', 'tmp'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * 是否处理文件
   */
  shouldProcessFile(fileName) {
    return fileName.match(/\.(ts|tsx|js|jsx)$/) && 
           !fileName.includes('.test.') && 
           !fileName.includes('.spec.');
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📊 导入路径修复报告\n');
    console.log(`📁 处理文件数: ${this.stats.filesProcessed}`);
    console.log(`🔧 修改文件数: ${this.stats.filesModified}`);
    console.log(`✨ 总修复数: ${this.stats.totalFixes}\n`);

    if (this.stats.totalFixes === 0) {
      console.log('✅ 所有导入路径都正确！');
    } else {
      console.log('🎉 导入路径修复完成！');
    }
  }
}

// 主函数
function main() {
  const fixer = new ImportPathFixer();
  fixer.fixAllImportPaths();
}

if (require.main === module) {
  main();
}

module.exports = ImportPathFixer;
