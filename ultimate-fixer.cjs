#!/usr/bin/env node

/**
 * 终极TypeScript错误修复器 v5.0
 * 基于企业级AI助手规则体系 - 终极版本
 * 遵循: P0-core-safety + P1-frontend-rules-2.1 + P5-ai-powered-code-review
 */

const fs = require('fs');
const path = require('path');

class UltimateTypeScriptFixer {
  constructor() {
    this.fixedFiles = [];
    this.totalFixed = 0;
  }

  async execute() {
    console.log('🔥 启动终极TypeScript错误修复 v5.0...\n');
    
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
    
    // 应用终极修复规则
    content = this.applyUltimateFixes(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      this.totalFixed++;
      return true;
    }
    
    return false;
  }

  applyUltimateFixes(content) {
    // 1. 修复所有未终止的import语句 - 最常见的错误
    content = content.replace(/import\s+([^'"\n]+)\s+from\s+'([^']+)$/gm, "import $1 from '$2';");
    content = content.replace(/import\s+([^'"\n]+)\s+from\s+"([^"]+)$/gm, 'import $1 from "$2";');
    content = content.replace(/import\s+\{([^}]+)\}\s+from\s+'([^']+)$/gm, "import {$1} from '$2';");
    content = content.replace(/import\s+\{([^}]+)\}\s+from\s+"([^"]+)$/gm, 'import {$1} from "$2";');
    content = content.replace(/import\s+'([^']+)$/gm, "import '$1';");
    content = content.replace(/import\s+"([^"]+)$/gm, 'import "$1";');
    
    // 2. 修复所有未终止的字符串字面量
    content = content.replace(/:\s*'([^']*)\n/gm, ": '$1';\n");
    content = content.replace(/=\s*'([^']*)\n/gm, "= '$1';\n");
    content = content.replace(/\|\s*'([^']*)\n/gm, "| '$1'\n");
    content = content.replace(/'([^']*)\n/gm, "'$1';\n");
    content = content.replace(/"([^"]*)\n/gm, '"$1";\n');
    
    // 3. 修复枚举值
    content = content.replace(/([A-Z_]+)\s*=\s*'([^']*)\n/gm, "$1 = '$2',\n");
    content = content.replace(/([A-Z_]+)\s*=\s*"([^"]*)\n/gm, '$1 = "$2",\n');
    
    // 4. 修复版本号和常量
    content = content.replace(/VERSION\s*=\s*'([0-9.]+)$/gm, "VERSION = '$1';");
    content = content.replace(/version\s*=\s*'([0-9.]+)$/gm, "version = '$1';");
    
    // 5. 修复CSS和文件路径
    content = content.replace(/import\s+'([^']+)\.css$/gm, "import '$1.css';");
    content = content.replace(/import\s+"([^"]+)\.css$/gm, 'import "$1.css";');
    
    // 6. 修复相对路径
    content = content.replace(/from\s+'\.\/([^']+)$/gm, "from './$1';");
    content = content.replace(/from\s+"\.\/([^"]+)$/gm, 'from "./$1";');
    content = content.replace(/from\s+'\.\.\/([^']+)$/gm, "from '../$1';");
    content = content.replace(/from\s+"\.\.\/([^"]+)$/gm, 'from "../$1";');
    
    // 7. 修复export语句
    content = content.replace(/export\s+default\s+([a-zA-Z][a-zA-Z0-9]*);'$/gm, 'export default $1;');
    content = content.replace(/export\s+\*\s+from\s+'([^']+)$/gm, "export * from '$1';");
    content = content.replace(/export\s+\*\s+from\s+"([^"]+)$/gm, 'export * from "$2";');
    
    // 8. 修复接口和类型定义
    content = content.replace(/interface\s+([a-zA-Z][a-zA-Z0-9]*)\s*\{';$/gm, 'interface $1 {');
    content = content.replace(/interface\s+([a-zA-Z][a-zA-Z0-9]*)\s*\{;$/gm, 'interface $1 {');
    content = content.replace(/type\s+([a-zA-Z][a-zA-Z0-9]*)\s*=\s*([^;]+);'$/gm, 'type $1 = $2;');
    
    // 9. 修复对象属性
    content = content.replace(/([a-zA-Z][a-zA-Z0-9]*)\s*:\s*([^,}\n]+),\s*;/gm, '$1: $2,');
    content = content.replace(/([a-zA-Z][a-zA-Z0-9]*)\s*:\s*([^,}\n]+);\s*}/gm, '$1: $2\n}');
    content = content.replace(/,\s*;/gm, ',');
    content = content.replace(/;\s*}/gm, '}');
    
    // 10. 修复JSX属性
    content = content.replace(/className=\s*""/gm, 'className="');
    content = content.replace(/className=\s*"([^"]*)'([^"]*)/gm, 'className="$1$2"');
    content = content.replace(/>\s*;/gm, '>');
    
    // 11. 修复return语句
    content = content.replace(/return\s*\(\s*;/gm, 'return (');
    content = content.replace(/return\s*\(\s*\n\s*;/gm, 'return (\n');
    
    // 12. 修复模板字面量
    content = content.replace(/`([^`]*)\n([^`]*)'$/gm, '`$1$2`');
    content = content.replace(/`([^`]*)\n$/gm, '`$1`');
    
    // 13. 修复函数结尾
    content = content.replace(/}\s*;'$/gm, '}');
    content = content.replace(/}\s*'$/gm, '}');
    content = content.replace(/';$/gm, ';');
    content = content.replace(/"';$/gm, '";');
    
    // 14. 修复特殊字符和多余符号
    content = content.replace(/;{2,}/gm, ';');
    content = content.replace(/'{2,}/gm, "'");
    content = content.replace(/"{2,}/gm, '"');
    content = content.replace(/\n{3,}/gm, '\n\n');
    
    // 15. 修复特定的antd和React导入
    content = content.replace(/from\s+'antd$/gm, "from 'antd';");
    content = content.replace(/from\s+"antd$/gm, 'from "antd";');
    content = content.replace(/from\s+'react$/gm, "from 'react';");
    content = content.replace(/from\s+"react$/gm, 'from "react";');
    content = content.replace(/from\s+'react-router-dom$/gm, "from 'react-router-dom';");
    content = content.replace(/from\s+"react-router-dom$/gm, 'from "react-router-dom";');
    content = content.replace(/from\s+'@ant-design\/icons$/gm, "from '@ant-design/icons';");
    content = content.replace(/from\s+"@ant-design\/icons$/gm, 'from "@ant-design/icons";');
    
    // 16. 修复vite配置
    content = content.replace(/from\s+'vite$/gm, "from 'vite';");
    content = content.replace(/from\s+'@vitejs\/plugin-react$/gm, "from '@vitejs/plugin-react';");
    
    // 17. 应用最终清理
    content = this.finalCleanup(content);
    
    return content;
  }

  finalCleanup(content) {
    // 最终清理步骤
    const lines = content.split('\n');
    const cleanedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // 修复行尾的未终止字符串
      if (line.match(/import.*from\s+['"][^'"]*$/)) {
        if (line.includes("'")) {
          line = line + "';";
        } else if (line.includes('"')) {
          line = line + '";';
        }
      }
      
      // 修复其他未终止的字符串
      if (line.match(/:\s*['"][^'"]*$/) || line.match(/=\s*['"][^'"]*$/)) {
        if (line.includes("'") && !line.endsWith("';")) {
          line = line + "';";
        } else if (line.includes('"') && !line.endsWith('";')) {
          line = line + '";';
        }
      }
      
      cleanedLines.push(line);
    }
    
    return cleanedLines.join('\n');
  }

  generateReport() {
    console.log('\n🔥 终极修复报告');
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
    console.log('6. 如果还有错误，可能需要手动检查特定文件');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new UltimateTypeScriptFixer();
  fixer.execute().catch(console.error);
}

module.exports = UltimateTypeScriptFixer;
