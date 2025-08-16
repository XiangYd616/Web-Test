#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class SimpleQuoteFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixes = [];
  }

  /**
   * 执行简单的引号修复
   */
  async execute() {
    console.log('🔧 开始简单的引号修复...\n');

    try {
      const files = await this.getAllTSFiles();
      
      for (const file of files) {
        await this.fixFileQuotes(file);
      }

      this.generateFixReport();

    } catch (error) {
      console.error('❌ 简单引号修复过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 修复文件中的引号问题
   */
  async fixFileQuotes(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      let fixCount = 0;

      // 修复行末的多余引号 - 最常见的问题
      const patterns = [
        // 修复 ';' 模式
        { pattern: /';'\s*$/gm, replacement: "';", description: "行末多余引号" },
        
        // 修复 ';' 模式  
        { pattern: /'\s*$/gm, replacement: "'", description: "行末多余引号" },
        
        // 修复导入语句
        { pattern: /from\s+(['"])([^'"]+)\1;'\s*$/gm, replacement: "from $1$2$1;", description: "导入语句引号" },
        
        // 修复console.log
        { pattern: /console\.log\((['"])([^'"]*)\1;'\s*$/gm, replacement: "console.log($1$2$1);", description: "console.log引号" },
        
        // 修复简单赋值
        { pattern: /=\s*(['"])([^'"]*)\1;'\s*$/gm, replacement: "= $1$2$1;", description: "赋值语句引号" }
      ];

      for (const { pattern, replacement, description } of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          content = content.replace(pattern, replacement);
          fixCount += matches.length;
        }
      }

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        this.addFix(filePath, `修复了 ${fixCount} 个引号问题`);
      }

    } catch (error) {
      console.error(`修复文件 ${filePath} 时出错:`, error.message);
    }
  }

  /**
   * 获取所有TypeScript文件
   */
  async getAllTSFiles() {
    const files = [];
    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDir(fullPath);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
    };

    scanDir(path.join(this.projectRoot, 'frontend'));
    return files;
  }

  /**
   * 工具方法
   */
  addFix(filePath, description) {
    this.fixes.push({
      file: path.relative(this.projectRoot, filePath),
      description,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 生成修复报告
   */
  generateFixReport() {
    const reportPath = path.join(this.projectRoot, 'simple-quote-fix-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFixes: this.fixes.length
      },
      fixes: this.fixes
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 简单引号修复报告:');
    console.log(`   修复文件: ${this.fixes.length}`);
    console.log(`   报告已保存: ${reportPath}\n`);
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new SimpleQuoteFixer();
  fixer.execute().catch(error => {
    console.error('❌ 简单引号修复失败:', error);
    process.exit(1);
  });
}

module.exports = SimpleQuoteFixer;
