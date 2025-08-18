#!/usr/bin/env node

/**
 * 超级TypeScript错误修复器 v4.0
 * 基于企业级AI助手规则体系 - 终极修复版本
 * 遵循: P0-core-safety + P1-frontend-rules-2.1 + P5-ai-powered-code-review
 */

const fs = require('fs');
const path = require('path');

class SuperTypeScriptFixer {
  constructor() {
    this.fixedFiles = [];
    this.totalFixed = 0;
  }

  async execute() {
    console.log('🚀 启动超级TypeScript错误修复 v4.0...\n');
    
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
    
    // 应用超级修复规则
    content = this.applySuperFixes(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      this.totalFixed++;
      return true;
    }
    
    return false;
  }

  applySuperFixes(content) {
    // 1. 修复未终止的import语句
    content = content.replace(/import\s+([^'"\n]+)\s+from\s+'([^']+)$/gm, "import $1 from '$2';");
    content = content.replace(/import\s+([^'"\n]+)\s+from\s+"([^"]+)$/gm, 'import $1 from "$2";');
    content = content.replace(/import\s+\{([^}]+)\}\s+from\s+'([^']+)$/gm, "import {$1} from '$2';");
    content = content.replace(/import\s+\{([^}]+)\}\s+from\s+"([^"]+)$/gm, 'import {$1} from "$2";');
    
    // 2. 修复export语句
    content = content.replace(/export\s+default\s+([a-zA-Z][a-zA-Z0-9]*);'$/gm, 'export default $1;');
    content = content.replace(/export\s+\*\s+from\s+'([^']+)$/gm, "export * from '$1';");
    content = content.replace(/export\s+\*\s+from\s+"([^"]+)$/gm, 'export * from "$2";');
    
    // 3. 修复字符串字面量
    content = content.replace(/:\s*'([^']*)\n/gm, ": '$1';\n");
    content = content.replace(/=\s*'([^']*)\n/gm, "= '$1';\n");
    content = content.replace(/\|\s*'([^']*)\n/gm, "| '$1'\n");
    
    // 4. 修复枚举值
    content = content.replace(/([A-Z_]+)\s*=\s*'([^']*)\n/gm, "$1 = '$2',\n");
    content = content.replace(/([A-Z_]+)\s*=\s*"([^"]*)\n/gm, '$1 = "$2",\n');
    
    // 5. 修复接口和类型定义
    content = content.replace(/interface\s+([a-zA-Z][a-zA-Z0-9]*)\s*\{';$/gm, 'interface $1 {');
    content = content.replace(/type\s+([a-zA-Z][a-zA-Z0-9]*)\s*=\s*([^;]+);'$/gm, 'type $1 = $2;');
    
    // 6. 修复对象属性
    content = content.replace(/([a-zA-Z][a-zA-Z0-9]*)\s*:\s*([^,}\n]+),\s*;/gm, '$1: $2,');
    content = content.replace(/([a-zA-Z][a-zA-Z0-9]*)\s*:\s*([^,}\n]+);\s*}/gm, '$1: $2\n}');
    content = content.replace(/,\s*;/gm, ',');
    content = content.replace(/;\s*}/gm, '}');
    
    // 7. 修复JSX属性
    content = content.replace(/className=\s*""/gm, 'className="');
    content = content.replace(/className=\s*"([^"]*)'([^"]*)/gm, 'className="$1$2"');
    content = content.replace(/>\s*;/gm, '>');
    
    // 8. 修复return语句
    content = content.replace(/return\s*\(\s*;/gm, 'return (');
    content = content.replace(/return\s*\(\s*\n\s*;/gm, 'return (\n');
    
    // 9. 修复模板字面量
    content = content.replace(/`([^`]*)\n([^`]*)'$/gm, '`$1$2`');
    content = content.replace(/`([^`]*)\n$/gm, '`$1`');
    
    // 10. 修复函数结尾
    content = content.replace(/}\s*;'$/gm, '}');
    content = content.replace(/}\s*'$/gm, '}');
    content = content.replace(/';$/gm, ';');
    
    // 11. 修复特殊字符
    content = content.replace(/';$/gm, ';');
    content = content.replace(/"';$/gm, '";');
    content = content.replace(/';$/gm, ';');
    
    // 12. 修复多余的分号和引号
    content = content.replace(/;{2,}/gm, ';');
    content = content.replace(/'{2,}/gm, "'");
    content = content.replace(/"{2,}/gm, '"');
    
    // 13. 修复空行
    content = content.replace(/\n{3,}/gm, '\n\n');
    
    // 14. 修复特定的错误模式
    content = this.fixSpecificPatterns(content);
    
    return content;
  }

  fixSpecificPatterns(content) {
    // 修复常见的特定错误模式
    const specificFixes = [
      // 修复import React
      [/import React from 'react$/gm, "import React from 'react';"],
      [/import React from "react$/gm, 'import React from "react";'],
      
      // 修复antd imports
      [/from 'antd$/gm, "from 'antd';"],
      [/from "antd$/gm, 'from "antd";'],
      
      // 修复react-router-dom imports
      [/from 'react-router-dom$/gm, "from 'react-router-dom';"],
      [/from "react-router-dom$/gm, 'from "react-router-dom";'],
      
      // 修复CSS imports
      [/import '([^']+)\.css$/gm, "import '$1.css';"],
      [/import "([^"]+)\.css$/gm, 'import "$1.css";'],
      
      // 修复相对路径imports
      [/from '\.\/([^']+)$/gm, "from './$1';"],
      [/from "\.\/([^"]+)$/gm, 'from "./$1";'],
      [/from '\.\.\/([^']+)$/gm, "from '../$1';"],
      [/from "\.\.\/([^"]+)$/gm, 'from "../$1";'],
      
      // 修复export default
      [/export default ([a-zA-Z][a-zA-Z0-9]*);$/gm, 'export default $1;'],
      
      // 修复枚举定义
      [/enum\s+([a-zA-Z][a-zA-Z0-9]*)\s*\{';$/gm, 'enum $1 {'],
      [/enum\s+([a-zA-Z][a-zA-Z0-9]*)\s*\{;$/gm, 'enum $1 {'],
      
      // 修复接口定义
      [/interface\s+([a-zA-Z][a-zA-Z0-9]*)\s*\{';$/gm, 'interface $1 {'],
      [/interface\s+([a-zA-Z][a-zA-Z0-9]*)\s*\{;$/gm, 'interface $1 {'],
      
      // 修复类型定义
      [/type\s+([a-zA-Z][a-zA-Z0-9]*)\s*=\s*([^;]+);'$/gm, 'type $1 = $2;'],
      
      // 修复函数参数
      [/\(\s*([^)]*)\s*;\s*from:\s*string\)/gm, '($1, from: string)'],
      
      // 修复数组类型
      [/:\s*([a-zA-Z][a-zA-Z0-9]*)\[\]\s*;,/gm, ': $1[],'],
      
      // 修复可选属性
      [/\?\s*:\s*([^,}\n]+)\s*;,/gm, '?: $1,'],
      
      // 修复注释
      [/;\s*\/\//gm, '; //'],
      
      // 修复版本号
      [/version\s*=\s*'([0-9.]+)$/gm, "version = '$1';"],
      [/VERSION\s*=\s*'([0-9.]+)$/gm, "VERSION = '$1';"],
      
      // 修复配置对象
      [/plugins:\s*\[([^\]]+)\],;$/gm, 'plugins: [$1],'],
      [/build:\s*\{([^}]+)\},;$/gm, 'build: {$1},']
    ];
    
    for (const [pattern, replacement] of specificFixes) {
      content = content.replace(pattern, replacement);
    }
    
    return content;
  }

  generateReport() {
    console.log('\n🚀 超级修复报告');
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
    console.log('5. 运行 npm run dev 启动开发服务器');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new SuperTypeScriptFixer();
  fixer.execute().catch(console.error);
}

module.exports = SuperTypeScriptFixer;
