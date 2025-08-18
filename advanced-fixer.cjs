#!/usr/bin/env node

/**
 * 高级TypeScript错误修复器 v3.0
 * 基于企业级AI助手规则体系 - 深度修复版本
 * 遵循: P1-frontend-rules-2.1 + P5-ai-powered-code-review
 */

const fs = require('fs');
const path = require('path');

class AdvancedTypeScriptFixer {
  constructor() {
    this.fixedFiles = [];
    this.totalFixed = 0;
    this.patterns = this.initializePatterns();
  }

  initializePatterns() {
    return [
      // 修复未终止的字符串字面量
      {
        name: 'unterminated_strings',
        pattern: /^(.*)(['"]).*((?!\2).)*$/gm,
        fix: (content) => {
          // 修复import语句
          content = content.replace(/import\s+([^'"\n]+)\s+from\s+'([^']+)$/gm, "import $1 from '$2';");
          content = content.replace(/import\s+([^'"\n]+)\s+from\s+"([^"]+)$/gm, 'import $1 from "$2";');
          
          // 修复export语句
          content = content.replace(/export\s+default\s+([a-zA-Z][a-zA-Z0-9]*);'$/gm, 'export default $1;');
          content = content.replace(/export\s+\*\s+from\s+'([^']+)$/gm, "export * from '$1';");
          
          // 修复类型定义
          content = content.replace(/:\s*'([^']*)\n/gm, ": '$1';\n");
          content = content.replace(/=\s*'([^']*)\n/gm, "= '$1';\n");
          
          // 修复枚举值
          content = content.replace(/=\s*'([^']*)\n/gm, "= '$1';\n");
          
          return content;
        }
      },
      
      // 修复JSX语法错误
      {
        name: 'jsx_syntax',
        pattern: /return\s*\(\s*;|>\s*;|className=\s*""/g,
        fix: (content) => {
          content = content.replace(/return\s*\(\s*;/gm, 'return (');
          content = content.replace(/>\s*;/gm, '>');
          content = content.replace(/className=\s*""/gm, 'className="');
          content = content.replace(/className=\s*"([^"]*)'([^"]*)/gm, 'className="$1$2"');
          return content;
        }
      },
      
      // 修复对象语法错误
      {
        name: 'object_syntax',
        pattern: /([a-zA-Z][a-zA-Z0-9]*)\s*:\s*([^,}\n]+),\s*;|,\s*;/g,
        fix: (content) => {
          content = content.replace(/([a-zA-Z][a-zA-Z0-9]*)\s*:\s*([^,}\n]+),\s*;/gm, '$1: $2,');
          content = content.replace(/([a-zA-Z][a-zA-Z0-9]*)\s*:\s*([^,}\n]+);\s*}/gm, '$1: $2\n}');
          content = content.replace(/,\s*;/gm, ',');
          content = content.replace(/;\s*}/gm, '\n}');
          return content;
        }
      },
      
      // 修复模板字面量
      {
        name: 'template_literals',
        pattern: /`([^`]*)\n([^`]*)'$|`([^`]*)\n$/gm,
        fix: (content) => {
          content = content.replace(/`([^`]*)\n([^`]*)'$/gm, '`$1$2`');
          content = content.replace(/`([^`]*)\n$/gm, '`$1`');
          return content;
        }
      },
      
      // 修复函数和方法定义
      {
        name: 'function_definitions',
        pattern: /}\s*;'$|}\s*'$/gm,
        fix: (content) => {
          content = content.replace(/}\s*;'$/gm, '}');
          content = content.replace(/}\s*'$/gm, '}');
          return content;
        }
      }
    ];
  }

  async execute() {
    console.log('🧠 启动高级TypeScript错误修复 v3.0...\n');
    
    // 获取所有需要修复的文件
    const files = this.getAllTsxFiles();
    
    console.log(`📁 发现 ${files.length} 个TypeScript文件`);
    
    for (const file of files) {
      try {
        const fixed = await this.fixFile(file);
        if (fixed) {
          this.fixedFiles.push(file);
          console.log(`✅ 修复: ${path.relative(process.cwd(), file)}`);
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
    
    // 应用所有修复模式
    for (const pattern of this.patterns) {
      content = pattern.fix(content);
    }
    
    // 应用特定的修复规则
    content = this.applySpecificFixes(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      this.totalFixed++;
      return true;
    }
    
    return false;
  }

  applySpecificFixes(content) {
    // 修复常见的语法错误
    const fixes = [
      // 修复import语句
      [/import React from 'react$/gm, "import React from 'react';"],
      [/import\s+([^'"\n]+)\s+from\s+'([^']+)$/gm, "import $1 from '$2';"],
      
      // 修复export语句
      [/export default ([a-zA-Z][a-zA-Z0-9]*);'$/gm, 'export default $1;'],
      [/export\s+\*\s+from\s+'([^']+)$/gm, "export * from '$1';"],
      
      // 修复JSX
      [/return\s*\(\s*;/gm, 'return ('],
      [/>\s*;/gm, '>'],
      [/className=\s*""/gm, 'className="'],
      
      // 修复对象属性
      [/([a-zA-Z][a-zA-Z0-9]*)\s*:\s*([^,}\n]+),\s*;/gm, '$1: $2,'],
      [/,\s*;/gm, ','],
      [/;\s*}/gm, '}'],
      
      // 修复字符串字面量
      [/:\s*'([^']*)\n/gm, ": '$1';\n"],
      [/=\s*'([^']*)\n/gm, "= '$1';\n"],
      [/\|\s*'([^']*)\n/gm, "| '$1'\n"],
      
      // 修复模板字面量
      [/`([^`]*)\n([^`]*)'$/gm, '`$1$2`'],
      [/`([^`]*)\n$/gm, '`$1`'],
      
      // 修复函数结尾
      [/}\s*;'$/gm, '}'],
      [/}\s*'$/gm, '}'],
      [/';$/gm, ';'],
      
      // 修复枚举
      [/enum\s+([a-zA-Z][a-zA-Z0-9]*)\s*\{';$/gm, 'enum $1 {'],
      
      // 修复接口
      [/interface\s+([a-zA-Z][a-zA-Z0-9]*)\s*\{';$/gm, 'interface $1 {'],
      
      // 修复类型别名
      [/type\s+([a-zA-Z][a-zA-Z0-9]*)\s*=\s*([^;]+);'$/gm, 'type $1 = $2;'],
      
      // 修复函数参数
      [/\(\s*([^)]*)\s*;\s*from:\s*string\)/gm, '($1, from: string)'],
      
      // 修复数组类型
      [/:\s*([a-zA-Z][a-zA-Z0-9]*)\[\]\s*;,/gm, ': $1[],'],
      
      // 修复可选属性
      [/\?\s*:\s*([^,}\n]+)\s*;,/gm, '?: $1,'],
      
      // 修复注释后的分号
      [/;\s*\/\//gm, '; //'],
      
      // 修复多余的分号
      [/;{2,}/gm, ';'],
      
      // 修复空行
      [/\n{3,}/gm, '\n\n']
    ];
    
    for (const [pattern, replacement] of fixes) {
      content = content.replace(pattern, replacement);
    }
    
    return content;
  }

  generateReport() {
    console.log('\n📊 高级修复报告');
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
    console.log('4. 运行 npm run build 测试构建');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new AdvancedTypeScriptFixer();
  fixer.execute().catch(console.error);
}

module.exports = AdvancedTypeScriptFixer;
