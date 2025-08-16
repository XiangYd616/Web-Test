#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ConservativeStringFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixes = [];
    this.errors = [];
  }

  /**
   * 执行保守的字符串修复
   */
  async execute() {
    console.log('🔧 开始保守的字符串修复...\n');

    try {
      // 1. 修复最基本的未终止字符串
      await this.fixBasicUnterminatedStrings();
      
      // 2. 修复导入语句中的引号问题
      await this.fixImportQuotes();
      
      // 3. 修复简单的字符串赋值
      await this.fixSimpleStringAssignments();

      // 4. 生成修复报告
      this.generateFixReport();

    } catch (error) {
      console.error('❌ 保守字符串修复过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 修复最基本的未终止字符串
   */
  async fixBasicUnterminatedStrings() {
    console.log('📝 修复基本的未终止字符串...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 只修复行末明显的未终止字符串
        content = content.replace(/(['"])([^'"]*)\1;'\s*$/gm, "$1$2$1;");
        content = content.replace(/(['"])([^'"]*)\1'\s*$/gm, "$1$2$1");
        
        // 修复明显的双引号问题
        content = content.replace(/(['"])([^'"]*)\1"\s*$/gm, "$1$2$1");

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
   * 修复导入语句中的引号问题
   */
  async fixImportQuotes() {
    console.log('📦 修复导入语句引号...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复导入语句末尾的引号问题
        content = content.replace(/from\s+(['"])([^'"]+)\1;'\s*$/gm, "from $1$2$1;");
        content = content.replace(/from\s+(['"])([^'"]+)\1'\s*$/gm, "from $1$2$1;");

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复导入语句引号');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ 导入语句引号修复完成\n');
  }

  /**
   * 修复简单的字符串赋值
   */
  async fixSimpleStringAssignments() {
    console.log('🔧 修复简单的字符串赋值...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复简单的字符串赋值末尾引号问题
        content = content.replace(/=\s*(['"])([^'"]+)\1;'\s*$/gm, "= $1$2$1;");
        content = content.replace(/=\s*(['"])([^'"]+)\1'\s*$/gm, "= $1$2$1;");
        
        // 修复console.log中的引号问题
        content = content.replace(/console\.log\((['"])([^'"]+)\1;'\s*$/gm, "console.log($1$2$1);");
        content = content.replace(/console\.log\((['"])([^'"]+)\1'\s*$/gm, "console.log($1$2$1);");

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复简单字符串赋值');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ 简单字符串赋值修复完成\n');
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
    const reportPath = path.join(this.projectRoot, 'conservative-string-fix-report.json');
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

    console.log('📊 保守字符串修复报告:');
    console.log(`   修复文件: ${this.fixes.length}`);
    console.log(`   错误文件: ${this.errors.length}`);
    console.log(`   成功率: ${report.summary.successRate.toFixed(1)}%`);
    console.log(`   报告已保存: ${reportPath}\n`);
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new ConservativeStringFixer();
  fixer.execute().catch(error => {
    console.error('❌ 保守字符串修复失败:', error);
    process.exit(1);
  });
}

module.exports = ConservativeStringFixer;
