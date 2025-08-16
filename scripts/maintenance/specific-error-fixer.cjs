#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class SpecificErrorFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixes = [];
  }

  /**
   * 执行特定错误修复
   */
  async execute() {
    console.log('🔧 开始特定错误修复...\n');

    try {
      // 1. 修复严重的语法错误
      await this.fixCriticalSyntaxErrors();
      
      // 2. 修复JSX中的引号问题
      await this.fixJSXQuoteIssues();
      
      // 3. 修复模板字符串问题
      await this.fixTemplateStringIssues();
      
      // 4. 修复函数类型定义
      await this.fixFunctionTypeDefinitions();

      // 5. 生成修复报告
      this.generateFixReport();

    } catch (error) {
      console.error('❌ 特定错误修复过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 修复严重的语法错误
   */
  async fixCriticalSyntaxErrors() {
    console.log('🚨 修复严重的语法错误...');

    // 修复特定文件的严重错误
    const criticalFiles = [
      'frontend/components/charts/Charts.tsx',
      'frontend/components/charts/RechartsChart.tsx',
      'frontend/components/system/CacheManager.tsx',
      'frontend/components/system/BackupManagement.tsx',
      'frontend/services/seo/seoAnalysisEngine.ts'
    ];

    for (const file of criticalFiles) {
      const fullPath = path.join(this.projectRoot, file);
      if (fs.existsSync(fullPath)) {
        await this.fixSpecificFile(fullPath);
      }
    }

    console.log('   ✅ 严重语法错误修复完成\n');
  }

  /**
   * 修复特定文件
   */
  async fixSpecificFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // 修复箭头函数类型定义中的空格问题
      content = content.replace(/\(\s*([^)]*)\s*\)\s*=\s*>\s*([^;,}]+)/g, '($1) => $2');
      
      // 修复Record类型中的分号问题
      content = content.replace(/Record<string;\s*([^>]+)>/g, 'Record<string, $1>');
      
      // 修复接口定义中的多余空格
      content = content.replace(/interface\s+([^{]+)\s+{/g, 'interface $1 {');
      content = content.replace(/export\s+interface\s+([^{]+)\s+{/g, 'export interface $1 {');
      
      // 修复类型定义中的多余空格
      content = content.replace(/export\s+type\s+([^=]+)\s+=\s*([^;]+);?\s*/g, 'export type $1 = $2;');
      
      // 修复JSX中的引号问题
      content = content.replace(/className='([^']*)'/g, 'className="$1"');
      content = content.replace(/placeholder='([^']*)'/g, 'placeholder="$1"');
      
      // 修复模板字符串中的引号问题
      content = content.replace(/content='([^']*viewport[^']*)'/g, 'content="$1"');
      content = content.replace(/name='([^']*viewport[^']*)'/g, 'name="$1"');

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        this.addFix(filePath, '修复特定文件的语法错误');
      }
    } catch (error) {
      console.error(`修复文件 ${filePath} 时出错:`, error.message);
    }
  }

  /**
   * 修复JSX中的引号问题
   */
  async fixJSXQuoteIssues() {
    console.log('⚛️ 修复JSX中的引号问题...');

    const tsxFiles = await this.getAllTSXFiles();
    
    for (const file of tsxFiles) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复JSX属性中的中文引号问题
        content = content.replace(/'([^']*[一-龯][^']*)'/g, '"$1"');
        
        // 修复JSX中的特殊字符引号
        content = content.replace(/placeholder='([^']*[{}][^']*)'/g, 'placeholder="$1"');
        
        // 修复className中的复杂表达式
        content = content.replace(/className='([^']*\$\{[^}]*\}[^']*)'/g, 'className="$1"');

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复JSX引号问题');
        }
      } catch (error) {
        console.error(`修复JSX文件 ${file} 时出错:`, error.message);
      }
    }

    console.log('   ✅ JSX引号问题修复完成\n');
  }

  /**
   * 修复模板字符串问题
   */
  async fixTemplateStringIssues() {
    console.log('📝 修复模板字符串问题...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复模板字符串中的引号嵌套问题
        content = content.replace(/`([^`]*)'([^']*)'([^`]*)`/g, '`$1"$2"$3`');
        
        // 修复字符串中的HTML属性引号
        content = content.replace(/'<([^>]*name=')([^']*)(')([^>]*)>'/g, '"<$1$2$3$4>"');

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复模板字符串问题');
        }
      } catch (error) {
        console.error(`修复模板字符串文件 ${file} 时出错:`, error.message);
      }
    }

    console.log('   ✅ 模板字符串问题修复完成\n');
  }

  /**
   * 修复函数类型定义
   */
  async fixFunctionTypeDefinitions() {
    console.log('🔧 修复函数类型定义...');

    const files = await this.getAllTSFiles();
    
    for (const file of files) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;

        // 修复箭头函数类型定义中的格式问题
        content = content.replace(/:\s*\(\s*([^)]*)\s*\)\s*=\s*>\s*([^;,}]+)/g, ': ($1) => $2');
        
        // 修复函数参数类型定义
        content = content.replace(/\(\s*([^)]*)\s*\)\s*:\s*([^{]+)\s*=>/g, '($1): $2 =>');

        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          this.addFix(file, '修复函数类型定义');
        }
      } catch (error) {
        console.error(`修复函数类型定义文件 ${file} 时出错:`, error.message);
      }
    }

    console.log('   ✅ 函数类型定义修复完成\n');
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

  /**
   * 生成修复报告
   */
  generateFixReport() {
    const reportPath = path.join(this.projectRoot, 'specific-error-fix-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFixes: this.fixes.length
      },
      fixes: this.fixes
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 特定错误修复报告:');
    console.log(`   修复文件: ${this.fixes.length}`);
    console.log(`   报告已保存: ${reportPath}\n`);
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new SpecificErrorFixer();
  fixer.execute().catch(error => {
    console.error('❌ 特定错误修复失败:', error);
    process.exit(1);
  });
}

module.exports = SpecificErrorFixer;
