#!/usr/bin/env node

/**
 * 智能TypeScript错误修复器 v2.0
 * 基于企业级AI助手规则体系 - 精确修复版本
 */

const fs = require('fs');
const path = require('path');

class SmartTypeScriptFixer {
  constructor() {
    this.fixedFiles = [];
    this.totalFixed = 0;
  }

  async execute() {
    console.log('🧠 启动智能TypeScript错误修复 v2.0...\n');
    
    // 获取所有需要修复的文件
    const files = this.getAllTsxFiles();
    
    console.log(`📁 发现 ${files.length} 个TypeScript文件`);
    
    for (const file of files) {
      try {
        const fixed = await this.fixFile(file);
        if (fixed) {
          this.fixedFiles.push(file);
          console.log(`✅ 修复: ${file}`);
        }
      } catch (error) {
        console.log(`❌ 失败: ${file} - ${error.message}`);
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
    
    // 应用所有修复规则
    content = this.fixImportStatements(content);
    content = this.fixReturnStatements(content);
    content = this.fixJSXSyntax(content);
    content = this.fixStringLiterals(content);
    content = this.fixObjectSyntax(content);
    content = this.fixTemplateLiterals(content);
    content = this.fixExportStatements(content);
    content = this.fixTypeDefinitions(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      this.totalFixed++;
      return true;
    }
    
    return false;
  }

  fixImportStatements(content) {
    // 修复未终止的import语句
    content = content.replace(/import\s+([^'"\n]+)\s+from\s+'([^']+)$/gm, "import $1 from '$2';");
    content = content.replace(/import\s+([^'"\n]+)\s+from\s+"([^"]+)$/gm, 'import $1 from "$2";');
    
    // 修复React import
    content = content.replace(/import React from 'react$/gm, "import React from 'react';");
    content = content.replace(/import React from "react$/gm, 'import React from "react";');
    
    return content;
  }

  fixReturnStatements(content) {
    // 修复return语句中的语法错误
    content = content.replace(/return\s*\(\s*;/gm, 'return (');
    content = content.replace(/return\s*\(\s*\n\s*;/gm, 'return (\n');
    
    return content;
  }

  fixJSXSyntax(content) {
    // 修复JSX中的语法错误
    content = content.replace(/>\s*;/gm, '>');
    content = content.replace(/className=\s*'/gm, 'className="');
    content = content.replace(/className=\s*"([^"]*)'([^"]*)/gm, 'className="$1$2"');
    
    // 修复JSX标签
    content = content.replace(/<([a-zA-Z][a-zA-Z0-9]*)\s*;/gm, '<$1');
    content = content.replace(/>\s*;/gm, '>');
    
    return content;
  }

  fixStringLiterals(content) {
    // 修复未终止的字符串字面量
    content = content.replace(/export default ([a-zA-Z][a-zA-Z0-9]*);'/gm, 'export default $1;');
    content = content.replace(/([a-zA-Z][a-zA-Z0-9]*);'$/gm, '$1;');
    
    // 修复类型定义中的字符串
    content = content.replace(/:\s*'([^']*)\n/gm, ": '$1';\n");
    content = content.replace(/:\s*"([^"]*)\n/gm, ': "$1";\n');
    
    // 修复枚举和联合类型
    content = content.replace(/\|\s*'([^']*)\n/gm, "| '$1'\n");
    content = content.replace(/=\s*'([^']*)\n/gm, "= '$1';\n");
    
    return content;
  }

  fixObjectSyntax(content) {
    // 修复对象语法错误
    content = content.replace(/([a-zA-Z][a-zA-Z0-9]*)\s*:\s*([^,}\n]+),\s*;/gm, '$1: $2,');
    content = content.replace(/([a-zA-Z][a-zA-Z0-9]*)\s*:\s*([^,}\n]+);\s*}/gm, '$1: $2\n}');
    content = content.replace(/,\s*;/gm, ',');
    
    return content;
  }

  fixTemplateLiterals(content) {
    // 修复未终止的模板字面量
    content = content.replace(/`([^`]*)\n([^`]*)'$/gm, '`$1$2`');
    content = content.replace(/`([^`]*)\n$/gm, '`$1`');
    
    return content;
  }

  fixExportStatements(content) {
    // 修复export语句
    content = content.replace(/export\s+\*\s+from\s+'([^']+)\n/gm, "export * from '$1';\n");
    content = content.replace(/export\s+\*\s+from\s+"([^"]+)\n/gm, 'export * from "$1";\n');
    
    return content;
  }

  fixTypeDefinitions(content) {
    // 修复类型定义
    content = content.replace(/export\s+type\s+\{([^}]*)\n\}\s+from/gm, 'export type {\n$1\n} from');
    content = content.replace(/\}\s+from\s+'([^']+)'\s*;\s*\/\//gm, "} from '$1'; //");
    
    // 修复函数参数类型
    content = content.replace(/\(\s*([^)]*)\s*;\s*from:\s*string\)/gm, '($1, from: string)');
    
    return content;
  }

  generateReport() {
    console.log('\n📊 智能修复报告');
    console.log('='.repeat(50));
    console.log(`修复的文件: ${this.fixedFiles.length}个`);
    console.log(`总修复数: ${this.totalFixed}个`);
    
    if (this.fixedFiles.length > 0) {
      console.log('\n✅ 成功修复的文件:');
      this.fixedFiles.slice(0, 20).forEach(file => {
        console.log(`  - ${path.relative(process.cwd(), file)}`);
      });
      if (this.fixedFiles.length > 20) {
        console.log(`  ... 还有 ${this.fixedFiles.length - 20} 个文件`);
      }
    }
    
    console.log('\n🎯 下一步建议:');
    console.log('1. 运行 npx tsc --noEmit 检查剩余错误');
    console.log('2. 手动修复复杂的语法错误');
    console.log('3. 运行 npm run lint 检查代码质量');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new SmartTypeScriptFixer();
  fixer.execute().catch(console.error);
}

module.exports = SmartTypeScriptFixer;
