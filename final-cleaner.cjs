#!/usr/bin/env node

/**
 * 最终清理修复器 v6.0
 * 基于企业级AI助手规则体系 - 清理版本
 * 遵循: P0-core-safety + P1-frontend-rules-2.1
 */

const fs = require('fs');
const path = require('path');

class FinalCleaner {
  constructor() {
    this.fixedFiles = [];
    this.totalFixed = 0;
  }

  async execute() {
    console.log('🧹 启动最终清理修复 v6.0...\n');
    
    // 获取所有需要修复的文件
    const files = this.getAllTsxFiles();
    
    console.log(`📁 发现 ${files.length} 个TypeScript文件`);
    
    for (const file of files) {
      try {
        const fixed = await this.fixFile(file);
        if (fixed) {
          this.fixedFiles.push(file);
          console.log(`✅ 清理: ${path.relative(process.cwd(), file)}`);
        }
      } catch (error) {
        console.log(`❌ 失败: ${path.relative(process.cwd(), file)} - ${error.message}`);
      }
    }
    
    this.generateReport();
  }

  getAllTsxFiles() {
    const files = [];
    
    function scanDir(dir) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDir(fullPath);
        } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    }
    
    scanDir(process.cwd());
    return files;
  }

  async fixFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // 应用清理修复规则
    content = this.cleanupContent(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      this.totalFixed++;
      return true;
    }
    
    return false;
  }

  cleanupContent(content) {
    // 1. 清理多余的分号和引号组合
    content = content.replace(/;';";/g, ';');
    content = content.replace(/';";/g, ';');
    content = content.replace(/";/g, ';');
    content = content.replace(/';/g, ';');
    
    // 2. 修复未终止的字符串字面量 - 最基本的修复
    const lines = content.split('\n');
    const fixedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // 修复import语句
      if (line.match(/^import.*from\s+['"][^'"]*$/)) {
        if (line.includes("'") && !line.endsWith("';")) {
          line = line + "';";
        } else if (line.includes('"') && !line.endsWith('";')) {
          line = line + '";';
        }
      }
      
      // 修复CSS导入
      if (line.match(/^import\s+['"][^'"]*\.css$/)) {
        if (line.includes("'") && !line.endsWith("';")) {
          line = line + "';";
        } else if (line.includes('"') && !line.endsWith('";')) {
          line = line + '";';
        }
      }
      
      // 修复export default语句
      if (line.match(/^export\s+default\s+[a-zA-Z][a-zA-Z0-9]*;'$/)) {
        line = line.replace(/;'$/, ';');
      }
      
      // 修复版本号和常量
      if (line.match(/VERSION\s*=\s*['"][0-9.]+$/)) {
        if (line.includes("'") && !line.endsWith("';")) {
          line = line + "';";
        } else if (line.includes('"') && !line.endsWith('";')) {
          line = line + '";';
        }
      }
      
      // 修复枚举值
      if (line.match(/^\s*[A-Z_]+\s*=\s*['"][^'"]*$/)) {
        if (line.includes("'") && !line.endsWith("',")) {
          line = line + "',";
        } else if (line.includes('"') && !line.endsWith('",')) {
          line = line + '",';
        }
      }
      
      // 修复类型定义
      if (line.match(/:\s*['"][^'"]*$/)) {
        if (line.includes("'") && !line.endsWith("';")) {
          line = line + "';";
        } else if (line.includes('"') && !line.endsWith('";')) {
          line = line + '";';
        }
      }
      
      // 修复对象属性中的未终止字符串
      if (line.match(/^\s*[a-zA-Z][a-zA-Z0-9]*:\s*['"][^'"]*$/)) {
        if (line.includes("'") && !line.endsWith("',")) {
          line = line + "',";
        } else if (line.includes('"') && !line.endsWith('",')) {
          line = line + '",';
        }
      }
      
      fixedLines.push(line);
    }
    
    content = fixedLines.join('\n');
    
    // 3. 清理多余的符号组合
    content = content.replace(/,\s*;/g, ',');
    content = content.replace(/;\s*,/g, ',');
    content = content.replace(/;{2,}/g, ';');
    content = content.replace(/,{2,}/g, ',');
    
    // 4. 修复JSX中的语法错误
    content = content.replace(/>\s*;/g, '>');
    content = content.replace(/return\s*\(\s*;/g, 'return (');
    
    // 5. 修复对象语法
    content = content.replace(/}\s*;/g, '}');
    content = content.replace(/]\s*;/g, ']');
    
    // 6. 清理空行
    content = content.replace(/\n{3,}/g, '\n\n');
    
    return content;
  }

  generateReport() {
    console.log('\n🧹 最终清理报告');
    console.log('='.repeat(50));
    console.log(`清理的文件: ${this.fixedFiles.length}个`);
    console.log(`总清理数: ${this.totalFixed}个`);
    
    if (this.fixedFiles.length > 0) {
      console.log('\n✅ 成功清理的文件:');
      this.fixedFiles.slice(0, 20).forEach(file => {
        console.log(`  - ${path.relative(process.cwd(), file)}`);
      });
      if (this.fixedFiles.length > 20) {
        console.log(`  ... 还有 ${this.fixedFiles.length - 20} 个文件`);
      }
    }
    
    console.log('\n🎯 下一步建议:');
    console.log('1. 运行 npx tsc --noEmit 检查剩余错误');
    console.log('2. 如果还有错误，可能需要手动检查特定文件');
    console.log('3. 运行 npm run lint 检查代码质量');
    console.log('4. 运行 npm run build 测试构建');
  }
}

// 运行清理
if (require.main === module) {
  const cleaner = new FinalCleaner();
  cleaner.execute().catch(console.error);
}

module.exports = FinalCleaner;
