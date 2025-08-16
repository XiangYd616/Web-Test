#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class AdvancedTypeScriptFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixes = [];
    this.errors = [];
  }

  /**
   * 执行高级TypeScript错误修复
   */
  async execute() {
    console.log('🔧 开始高级TypeScript错误修复...\n');

    try {
      // 1. 修复导入语句问题
      await this.fixImportStatements();
      
      // 2. 修复接口和类型定义
      await this.fixInterfaceAndTypeDefinitions();
      
      // 3. 修复JSX语法问题
      await this.fixJSXSyntaxIssues();
      
      // 4. 修复字符串和模板问题
      await this.fixStringAndTemplateIssues();
      
      // 5. 修复函数和箭头函数问题
      await this.fixFunctionDefinitions();

      // 6. 生成修复报告
      this.generateFixReport();

    } catch (error) {
      console.error('❌ 高级TypeScript错误修复过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 修复导入语句问题
   */
  async fixImportStatements() {
    console.log('📦 修复导入语句问题...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复导入语句中的多余空格
        content = content.replace(/import\s+React,\s*{\s*([^}]+)\s*}\s+from\s+['"]react['"];?\s*/g, 
          'import React, { $1 } from \'react\';');
        
        // 修复其他导入语句
        content = content.replace(/import\s*{\s*([^}]+)\s*}\s+from\s+['"]([^'"]+)['"];?\s*/g, 
          'import { $1 } from \'$2\';');
        
        // 修复默认导入
        content = content.replace(/import\s+([^{][^'"]*)\s+from\s+['"]([^'"]+)['"];?\s*/g, 
          'import $1 from \'$2\';');

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复导入语句');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ 导入语句修复完成\n');
  }

  /**
   * 修复接口和类型定义
   */
  async fixInterfaceAndTypeDefinitions() {
    console.log('🔧 修复接口和类型定义...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复接口定义语法
        content = content.replace(/export\s+interface\s+([^{]+)\s*{/g, 'export interface $1 {');
        content = content.replace(/interface\s+([^{]+)\s*{/g, 'interface $1 {');
        
        // 修复类型定义语法
        content = content.replace(/export\s+type\s+([^=]+)\s*=\s*([^;]+);?\s*/g, 'export type $1 = $2;');
        
        // 修复Record类型语法错误
        content = content.replace(/Record<string;\s*([^>]+)>/g, 'Record<string, $1>');
        
        // 修复箭头函数类型定义
        content = content.replace(/\(\s*([^)]*)\s*\)\s*=\s*>\s*([^;,}]+)/g, '($1) => $2');

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复接口和类型定义');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ 接口和类型定义修复完成\n');
  }

  /**
   * 修复JSX语法问题
   */
  async fixJSXSyntaxIssues() {
    console.log('⚛️ 修复JSX语法问题...');

    const files = await this.getAllTSXFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复JSX属性中的引号问题
        content = content.replace(/className=['"]([^'"]*)['"]/g, 'className="$1"');
        
        // 修复JSX自闭合标签
        content = content.replace(/<([A-Z][^>\s]*)\s+([^>]*)\s*\/>/g, '<$1 $2 />');
        
        // 修复JSX表达式中的引号
        content = content.replace(/placeholder=['"]([^'"]*)['"]/g, 'placeholder="$1"');

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复JSX语法');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ JSX语法修复完成\n');
  }

  /**
   * 修复字符串和模板问题
   */
  async fixStringAndTemplateIssues() {
    console.log('📝 修复字符串和模板问题...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 统一使用单引号
        content = content.replace(/"/g, "'");
        
        // 但是在JSX属性中使用双引号
        content = content.replace(/className='([^']*)'/g, 'className="$1"');
        content = content.replace(/placeholder='([^']*)'/g, 'placeholder="$1"');
        content = content.replace(/type='([^']*)'/g, 'type="$1"');

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复字符串和模板');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ 字符串和模板修复完成\n');
  }

  /**
   * 修复函数定义问题
   */
  async fixFunctionDefinitions() {
    console.log('🔧 修复函数定义问题...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复函数类型定义
        content = content.replace(/export\s+function\s+([^(]+)\s*\(([^)]*)\)\s*:\s*([^{]+)\s*{/g, 
          'export function $1($2): $3 {');

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复函数定义');
        }
      } catch (error) {
        this.addError(file, error.message);
      }
    }

    console.log('   ✅ 函数定义修复完成\n');
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
    const reportPath = path.join(this.projectRoot, 'advanced-typescript-fix-report.json');
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

    console.log('📊 高级TypeScript错误修复报告:');
    console.log(`   修复文件: ${this.fixes.length}`);
    console.log(`   错误文件: ${this.errors.length}`);
    console.log(`   成功率: ${report.summary.successRate.toFixed(1)}%`);
    console.log(`   报告已保存: ${reportPath}\n`);
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new AdvancedTypeScriptFixer();
  fixer.execute().catch(error => {
    console.error('❌ 高级TypeScript错误修复失败:', error);
    process.exit(1);
  });
}

module.exports = AdvancedTypeScriptFixer;
