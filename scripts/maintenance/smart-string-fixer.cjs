#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class SmartStringFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixes = [];
    this.errors = [];
  }

  /**
   * 执行智能字符串修复
   */
  async execute() {
    console.log('🔧 开始智能字符串修复...\n');

    try {
      // 1. 修复导入语句
      await this.fixImportStatements();
      
      // 2. 修复简单字符串引号
      await this.fixSimpleStringQuotes();
      
      // 3. 修复JSX属性引号
      await this.fixJSXAttributeQuotes();
      
      // 4. 修复模板字符串
      await this.fixTemplateStrings();
      
      // 5. 修复特殊情况
      await this.fixSpecialCases();

      // 6. 生成修复报告
      this.generateFixReport();

    } catch (error) {
      console.error('❌ 智能字符串修复过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 修复导入语句
   */
  async fixImportStatements() {
    console.log('📦 修复导入语句...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复导入语句中的引号问题
        content = content.replace(/import\s+([^'"]*)\s+from\s+["']([^"']+)["'];?/g, "import $1 from '$2';");
        content = content.replace(/import\s*{\s*([^}]+)\s*}\s*from\s+["']([^"']+)["'];?/g, "import { $1 } from '$2';");
        content = content.replace(/import\s+([^{][^'"]*),\s*{\s*([^}]+)\s*}\s*from\s+["']([^"']+)["'];?/g, "import $1, { $2 } from '$3';");

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复导入语句引号');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ 导入语句修复完成\n');
  }

  /**
   * 修复简单字符串引号
   */
  async fixSimpleStringQuotes() {
    console.log('📝 修复简单字符串引号...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复未闭合的字符串 - 常见模式
        content = content.replace(/["']([^"']*?)["']\s*;?\s*$/gm, "'$1';");
        
        // 修复字符串中的引号嵌套问题
        content = content.replace(/"([^"]*)'([^"]*?)"/g, "'$1\"$2'");
        content = content.replace(/'([^']*)"([^']*?)'/g, "'$1\"$2'");

        // 修复常见的字符串赋值
        content = content.replace(/=\s*["']([^"']+)["']/g, "= '$1'");

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复简单字符串引号');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ 简单字符串引号修复完成\n');
  }

  /**
   * 修复JSX属性引号
   */
  async fixJSXAttributeQuotes() {
    console.log('⚛️ 修复JSX属性引号...');

    const tsxFiles = await this.getAllTSXFiles();
    
    for (const file of tsxFiles) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复JSX属性引号
        content = content.replace(/(\w+)=['"]([^'"]*)['"]/g, '$1="$2"');
        content = content.replace(/className=['"]([^'"]*)['"]/g, 'className="$1"');
        content = content.replace(/placeholder=['"]([^'"]*)['"]/g, 'placeholder="$1"');
        content = content.replace(/type=['"]([^'"]*)['"]/g, 'type="$1"');
        content = content.replace(/title=['"]([^'"]*)['"]/g, 'title="$1"');
        content = content.replace(/id=['"]([^'"]*)['"]/g, 'id="$1"');

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复JSX属性引号');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ JSX属性引号修复完成\n');
  }

  /**
   * 修复模板字符串
   */
  async fixTemplateStrings() {
    console.log('🔤 修复模板字符串...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复模板字符串中的引号问题
        content = content.replace(/`([^`]*)'([^`]*)`/g, '`$1"$2`');
        content = content.replace(/`([^`]*)"([^`]*)`/g, '`$1"$2`');

        // 修复模板字符串表达式
        content = content.replace(/\$\{([^}]+)\}/g, '${$1}');

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复模板字符串');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ 模板字符串修复完成\n');
  }

  /**
   * 修复特殊情况
   */
  async fixSpecialCases() {
    console.log('🔧 修复特殊情况...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复对象属性中的引号
        content = content.replace(/(\w+):\s*['"]([^'"]+)['"]/g, "$1: '$2'");
        
        // 修复数组中的字符串
        content = content.replace(/\[['"]([^'"]+)['"]\]/g, "['$1']");
        
        // 修复函数参数中的字符串
        content = content.replace(/\((['"])([^'"]+)\1\)/g, "('$2')");

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复特殊情况');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ 特殊情况修复完成\n');
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
   * 获取所有TSX文件
   */
  async getAllTSXFiles() {
    const files = [];
    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDir(fullPath);
        } else if (item.endsWith('.tsx')) {
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

  addError(filePath, error) {
    this.errors.push({
      file: path.relative(this.projectRoot, filePath),
      error,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 生成修复报告
   */
  generateFixReport() {
    const reportPath = path.join(this.projectRoot, 'smart-string-fix-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFixes: this.fixes.length,
        totalErrors: this.errors.length,
        successRate: this.fixes.length / (this.fixes.length + this.errors.length) * 100
      },
      fixes: this.fixes,
      errors: this.errors
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 智能字符串修复报告:');
    console.log(`   修复文件: ${this.fixes.length}`);
    console.log(`   错误文件: ${this.errors.length}`);
    console.log(`   成功率: ${report.summary.successRate.toFixed(1)}%`);
    console.log(`   报告已保存: ${reportPath}\n`);
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new SmartStringFixer();
  fixer.execute().catch(error => {
    console.error('❌ 智能字符串修复失败:', error);
    process.exit(1);
  });
}

module.exports = SmartStringFixer;
