#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class UnterminatedStringFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixes = [];
    this.errors = [];
  }

  /**
   * 执行未终止字符串修复
   */
  async execute() {
    console.log('🔧 开始未终止字符串修复...\n');

    try {
      // 1. 修复基本的未终止字符串
      await this.fixBasicUnterminatedStrings();
      
      // 2. 修复JSX中的未终止字符串
      await this.fixJSXUnterminatedStrings();
      
      // 3. 修复模板字符串问题
      await this.fixTemplateStringIssues();
      
      // 4. 修复特定的问题模式
      await this.fixSpecificPatterns();

      // 5. 生成修复报告
      this.generateFixReport();

    } catch (error) {
      console.error('❌ 未终止字符串修复过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 修复基本的未终止字符串
   */
  async fixBasicUnterminatedStrings() {
    console.log('📝 修复基本的未终止字符串...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复行末的未终止字符串
        content = content.replace(/["']([^"'\n]*?)$/gm, "'$1'");
        
        // 修复常见的字符串赋值问题
        content = content.replace(/=\s*["']([^"'\n]*?)$/gm, "= '$1'");
        
        // 修复对象属性中的未终止字符串
        content = content.replace(/:\s*["']([^"'\n]*?)$/gm, ": '$1'");
        
        // 修复数组中的未终止字符串
        content = content.replace(/\[\s*["']([^"'\n]*?)$/gm, "['$1']");
        
        // 修复函数调用中的未终止字符串
        content = content.replace(/\(\s*["']([^"'\n]*?)$/gm, "('$1')");

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复基本未终止字符串');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ 基本未终止字符串修复完成\n');
  }

  /**
   * 修复JSX中的未终止字符串
   */
  async fixJSXUnterminatedStrings() {
    console.log('⚛️ 修复JSX中的未终止字符串...');

    const tsxFiles = await this.getAllTSXFiles();
    
    for (const file of tsxFiles) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复JSX属性中的未终止字符串
        content = content.replace(/(\w+)=["']([^"'\n>]*?)$/gm, '$1="$2"');
        content = content.replace(/className=["']([^"'\n>]*?)$/gm, 'className="$1"');
        content = content.replace(/placeholder=["']([^"'\n>]*?)$/gm, 'placeholder="$1"');
        content = content.replace(/title=["']([^"'\n>]*?)$/gm, 'title="$1"');
        
        // 修复JSX文本内容中的未终止字符串
        content = content.replace(/>\s*["']([^"'\n<]*?)$/gm, '>$1');

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复JSX未终止字符串');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ JSX未终止字符串修复完成\n');
  }

  /**
   * 修复模板字符串问题
   */
  async fixTemplateStringIssues() {
    console.log('🔤 修复模板字符串问题...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复未闭合的模板字符串
        content = content.replace(/`([^`\n]*?)$/gm, '`$1`');
        
        // 修复模板字符串中的表达式
        content = content.replace(/\$\{([^}\n]*?)$/gm, '${$1}');
        
        // 修复模板字符串中的引号问题
        content = content.replace(/`([^`]*?)["']([^`]*?)$/gm, '`$1"$2`');

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复模板字符串问题');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ 模板字符串问题修复完成\n');
  }

  /**
   * 修复特定的问题模式
   */
  async fixSpecificPatterns() {
    console.log('🔧 修复特定的问题模式...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复console.log中的未终止字符串
        content = content.replace(/console\.log\(\s*["']([^"'\n]*?)$/gm, "console.log('$1')");
        
        // 修复return语句中的未终止字符串
        content = content.replace(/return\s+["']([^"'\n]*?)$/gm, "return '$1'");
        
        // 修复throw语句中的未终止字符串
        content = content.replace(/throw\s+new\s+Error\(\s*["']([^"'\n]*?)$/gm, "throw new Error('$1')");
        
        // 修复import语句中的未终止字符串
        content = content.replace(/from\s+["']([^"'\n]*?)$/gm, "from '$1'");
        
        // 修复case语句中的未终止字符串
        content = content.replace(/case\s+["']([^"'\n]*?)$/gm, "case '$1':");

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复特定问题模式');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ 特定问题模式修复完成\n');
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
    const reportPath = path.join(this.projectRoot, 'unterminated-string-fix-report.json');
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

    console.log('📊 未终止字符串修复报告:');
    console.log(`   修复文件: ${this.fixes.length}`);
    console.log(`   错误文件: ${this.errors.length}`);
    console.log(`   成功率: ${report.summary.successRate.toFixed(1)}%`);
    console.log(`   报告已保存: ${reportPath}\n`);
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new UnterminatedStringFixer();
  fixer.execute().catch(error => {
    console.error('❌ 未终止字符串修复失败:', error);
    process.exit(1);
  });
}

module.exports = UnterminatedStringFixer;
