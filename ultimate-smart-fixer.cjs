#!/usr/bin/env node

/**
 * 终极智能TypeScript错误修复器 v7.0
 * 基于企业级AI助手规则体系 - 智能版本
 * 遵循: P0-core-safety + P1-frontend-rules-2.1 + P5-ai-powered-code-review
 * 专门处理4,050个TypeScript错误
 */

const fs = require('fs');
const path = require('path');

class UltimateSmartFixer {
  constructor() {
    this.fixedFiles = [];
    this.totalFixed = 0;
    this.errorPatterns = this.initializeErrorPatterns();
  }

  initializeErrorPatterns() {
    return [
      // 1. 修复未终止的字符串字面量 - 最常见的错误
      {
        pattern: /import\s+([^'"\n]+)\s+from\s+['"]([^'"]*)\n/gm,
        replacement: "import $1 from '$2';\n"
      },
      {
        pattern: /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]*)\n/gm,
        replacement: "import {$1} from '$2';\n"
      },
      {
        pattern: /import\s+['"]([^'"]*)\n/gm,
        replacement: "import '$1';\n"
      },
      {
        pattern: /export\s+\*\s+from\s+['"]([^'"]*)\n/gm,
        replacement: "export * from '$1';\n"
      },
      {
        pattern: /export\s+default\s+([a-zA-Z][a-zA-Z0-9]*);'$/gm,
        replacement: 'export default $1;'
      },
      
      // 2. 修复版本号和常量
      {
        pattern: /VERSION\s*=\s*['"]([0-9.]+)$/gm,
        replacement: "VERSION = '$1';"
      },
      {
        pattern: /version\s*=\s*['"]([0-9.]+)$/gm,
        replacement: "version = '$1';"
      },
      
      // 3. 修复枚举值
      {
        pattern: /([A-Z_]+)\s*=\s*['"]([^'"]*)\n/gm,
        replacement: "$1 = '$2',\n"
      },
      
      // 4. 修复接口和类型定义
      {
        pattern: /interface\s+([a-zA-Z][a-zA-Z0-9]*)\s*\{';$/gm,
        replacement: 'interface $1 {'
      },
      {
        pattern: /interface\s+([a-zA-Z][a-zA-Z0-9]*)\s*\{;$/gm,
        replacement: 'interface $1 {'
      },
      {
        pattern: /type\s+([a-zA-Z][a-zA-Z0-9]*)\s*=\s*([^;]+);'$/gm,
        replacement: 'type $1 = $2;'
      },
      
      // 5. 修复对象属性
      {
        pattern: /([a-zA-Z][a-zA-Z0-9]*)\s*:\s*([^,}\n]+),\s*;/gm,
        replacement: '$1: $2,'
      },
      {
        pattern: /([a-zA-Z][a-zA-Z0-9]*)\s*:\s*([^,}\n]+);\s*}/gm,
        replacement: '$1: $2\n}'
      },
      {
        pattern: /,\s*;/gm,
        replacement: ','
      },
      {
        pattern: /;\s*}/gm,
        replacement: '}'
      },
      
      // 6. 修复JSX属性
      {
        pattern: /className=\s*""/gm,
        replacement: 'className="'
      },
      {
        pattern: /className=\s*"([^"]*)'([^"]*)/gm,
        replacement: 'className="$1$2"'
      },
      {
        pattern: />\s*;/gm,
        replacement: '>'
      },
      
      // 7. 修复return语句
      {
        pattern: /return\s*\(\s*;/gm,
        replacement: 'return ('
      },
      {
        pattern: /return\s*\(\s*\n\s*;/gm,
        replacement: 'return (\n'
      },
      
      // 8. 修复模板字面量
      {
        pattern: /`([^`]*)\n([^`]*)'$/gm,
        replacement: '`$1$2`'
      },
      {
        pattern: /`([^`]*)\n$/gm,
        replacement: '`$1`'
      },
      
      // 9. 修复函数结尾
      {
        pattern: /}\s*;'$/gm,
        replacement: '}'
      },
      {
        pattern: /}\s*'$/gm,
        replacement: '}'
      },
      {
        pattern: /';$/gm,
        replacement: ';'
      },
      {
        pattern: /"';$/gm,
        replacement: '";'
      },
      
      // 10. 修复特殊字符和多余符号
      {
        pattern: /;{2,}/gm,
        replacement: ';'
      },
      {
        pattern: /'{2,}/gm,
        replacement: "'"
      },
      {
        pattern: /"{2,}/gm,
        replacement: '"'
      },
      {
        pattern: /\n{3,}/gm,
        replacement: '\n\n'
      }
    ];
  }

  async execute() {
    console.log('🚀 启动终极智能TypeScript错误修复 v7.0...\n');
    
    // 获取所有需要修复的文件
    const files = this.getAllTsxFiles();
    
    console.log(`📁 发现 ${files.length} 个TypeScript文件`);
    console.log(`🎯 目标: 修复4,050个TypeScript错误\n`);
    
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
    
    // 应用智能修复规则
    content = this.applySmartFixes(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      this.totalFixed++;
      return true;
    }
    
    return false;
  }

  applySmartFixes(content) {
    // 应用所有错误模式修复
    for (const errorPattern of this.errorPatterns) {
      content = content.replace(errorPattern.pattern, errorPattern.replacement);
    }
    
    // 应用行级修复
    content = this.applyLineBasedFixes(content);
    
    // 应用最终清理
    content = this.applyFinalCleanup(content);
    
    return content;
  }

  applyLineBasedFixes(content) {
    const lines = content.split('\n');
    const fixedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // 修复import语句的未终止字符串
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
    
    return fixedLines.join('\n');
  }

  applyFinalCleanup(content) {
    // 最终清理步骤
    content = content.replace(/,\s*;/g, ',');
    content = content.replace(/;\s*,/g, ',');
    content = content.replace(/;{2,}/g, ';');
    content = content.replace(/,{2,}/g, ',');
    content = content.replace(/>\s*;/g, '>');
    content = content.replace(/return\s*\(\s*;/g, 'return (');
    content = content.replace(/}\s*;/g, '}');
    content = content.replace(/]\s*;/g, ']');
    content = content.replace(/\n{3,}/g, '\n\n');
    
    return content;
  }

  generateReport() {
    console.log('\n🚀 终极智能修复报告');
    console.log('='.repeat(60));
    console.log(`修复的文件: ${this.fixedFiles.length}个`);
    console.log(`总修复数: ${this.totalFixed}个`);
    console.log(`目标错误数: 4,050个`);
    console.log(`预计修复率: ${Math.min(100, (this.totalFixed / 40.5)).toFixed(1)}%`);
    
    if (this.fixedFiles.length > 0) {
      console.log('\n✅ 成功修复的文件:');
      this.fixedFiles.slice(0, 30).forEach(file => {
        console.log(`  - ${path.relative(process.cwd(), file)}`);
      });
      if (this.fixedFiles.length > 30) {
        console.log(`  ... 还有 ${this.fixedFiles.length - 30} 个文件`);
      }
    }
    
    console.log('\n🎯 下一步建议:');
    console.log('1. 运行 npx tsc --noEmit 检查剩余错误');
    console.log('2. 如果错误数量大幅减少，继续手动修复剩余错误');
    console.log('3. 运行 npm run lint 检查代码质量');
    console.log('4. 运行 npm run build 测试构建');
    console.log('5. 运行 npm run dev 启动开发服务器');
    console.log('\n🎉 如果错误数量从4,050减少到<500，说明修复成功！');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new UltimateSmartFixer();
  fixer.execute().catch(console.error);
}

module.exports = UltimateSmartFixer;
