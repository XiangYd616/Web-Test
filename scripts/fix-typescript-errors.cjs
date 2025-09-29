#!/usr/bin/env node
/**
 * TypeScript 错误批量修复脚本
 * 自动修复常见的 TypeScript 错误
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TypeScriptErrorFixer {
  constructor() {
    this.rootDir = process.cwd();
    this.fixedFiles = [];
    this.errors = [];
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}[${type.toUpperCase()}] ${message}${colors.reset}`);
  }

  async findTsFiles() {
    const tsFiles = [];
    
    function walkDir(dir) {
      if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('dist')) {
        return;
      }
      
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          walkDir(filePath);
        } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
          tsFiles.push(filePath);
        }
      }
    }
    
    walkDir(path.join(this.rootDir, 'frontend'));
    return tsFiles;
  }

  async fixFileImports(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    // 修复未使用的导入
    const importRegex = /^import\s+(?:type\s+)?{([^}]+)}\s+from\s+['"][^'"]+['"];?\s*$/gm;
    const matches = content.match(importRegex);
    
    if (matches) {
      for (const match of matches) {
        const imports = match.match(/{([^}]+)}/)?.[1];
        if (imports) {
          const importList = imports.split(',').map(item => item.trim());
          const unusedImports = [];
          
          for (const importItem of importList) {
            const importName = importItem.replace(/\s+as\s+\w+/, '').trim();
            
            // 检查是否在代码中使用
            const usageRegex = new RegExp(`\\b${importName}\\b`, 'g');
            const withoutImport = content.replace(match, '');
            
            if (!usageRegex.test(withoutImport)) {
              unusedImports.push(importItem);
            }
          }
          
          if (unusedImports.length > 0) {
            const remainingImports = importList.filter(item => !unusedImports.includes(item));
            
            if (remainingImports.length === 0) {
              // 删除整个导入语句
              content = content.replace(match, '');
            } else {
              // 只删除未使用的导入
              const newImportString = match.replace(
                `{${imports}}`, 
                `{${remainingImports.join(', ')}}`
              );
              content = content.replace(match, newImportString);
            }
            hasChanges = true;
          }
        }
      }
    }

    // 修复简单的 TypeScript 错误
    const fixes = [
      // 移除未使用的变量（添加下划线前缀）
      {
        pattern: /const\s+([a-zA-Z][a-zA-Z0-9]*)\s*=/g,
        fix: (match, varName) => {
          const usageRegex = new RegExp(`\\b${varName}\\b`, 'g');
          const matchCount = (content.match(usageRegex) || []).length;
          
          // 如果变量只在声明时出现一次，说明未被使用
          if (matchCount === 1) {
            return match.replace(varName, `_${varName}`);
          }
          return match;
        }
      },
      
      // 修复 any 类型提示
      {
        pattern: /:\s*any\b/g,
        fix: ': unknown'
      },
      
      // 修复可能为 undefined 的属性访问
      {
        pattern: /(\w+)\.(\w+)/g,
        fix: (match, obj, prop) => {
          // 简单的启发式：如果前面有可选链操作符相关的模式
          if (content.includes(`${obj}?`) || content.includes(`Optional<${obj}>`)) {
            return `${obj}?.${prop}`;
          }
          return match;
        }
      }
    ];

    for (const fixRule of fixes) {
      if (typeof fixRule.fix === 'string') {
        const newContent = content.replace(fixRule.pattern, fixRule.fix);
        if (newContent !== content) {
          content = newContent;
          hasChanges = true;
        }
      } else {
        const newContent = content.replace(fixRule.pattern, fixRule.fix);
        if (newContent !== content) {
          content = newContent;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      this.fixedFiles.push(filePath);
      this.log(`已修复: ${filePath}`, 'success');
    }
  }

  async fixCommonErrors() {
    this.log('开始修复常见的 TypeScript 错误...');
    
    const tsFiles = await this.findTsFiles();
    this.log(`找到 ${tsFiles.length} 个 TypeScript 文件`);
    
    for (const file of tsFiles) {
      try {
        await this.fixFileImports(file);
      } catch (error) {
        this.log(`修复文件 ${file} 时出错: ${error.message}`, 'error');
        this.errors.push({ file, error: error.message });
      }
    }
  }

  async run() {
    this.log('开始 TypeScript 错误修复...', 'info');
    
    try {
      await this.fixCommonErrors();
      
      this.log(`\n修复完成！`);
      this.log(`已修复 ${this.fixedFiles.length} 个文件`, 'success');
      
      if (this.errors.length > 0) {
        this.log(`遇到 ${this.errors.length} 个错误`, 'warning');
        this.errors.forEach(({ file, error }) => {
          this.log(`${file}: ${error}`, 'error');
        });
      }
      
      // 运行类型检查
      this.log('\n运行类型检查验证修复结果...');
      try {
        execSync('npm run type-check', { stdio: 'inherit', cwd: this.rootDir });
        this.log('类型检查通过！', 'success');
      } catch (error) {
        this.log('类型检查仍有错误，需要手动修复', 'warning');
      }
      
    } catch (error) {
      this.log(`修复过程中出现错误: ${error.message}`, 'error');
    }
  }
}

// 运行脚本
if (require.main === module) {
  const fixer = new TypeScriptErrorFixer();
  fixer.run().catch(console.error);
}

module.exports = TypeScriptErrorFixer;
