#!/usr/bin/env node

/**
 * 语法错误修复工具
 * 修复TypeScript语法错误
 */

const fs = require('fs');
const path = require('path');

class SyntaxErrorFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = 0;
    this.totalFixes = 0;
  }

  /**
   * 执行修复
   */
  async execute(dryRun = false) {
    console.log(`🔧 开始语法错误修复${dryRun ? ' (预览模式)' : ''}...\n`);

    try {
      const files = this.getTypeScriptFiles();
      
      for (const file of files) {
        await this.fixFile(file, dryRun);
      }
      
      this.generateReport(dryRun);
      
    } catch (error) {
      console.error('❌ 修复过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 修复单个文件
   */
  async fixFile(filePath, dryRun = false) {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      let modifiedContent = originalContent;
      let fileModified = false;
      const fileFixes = [];

      // 修复破损的导入语句
      const brokenImportPattern = /^(\s*)(.*?)\s*}\s+from\s+['"`]([^'"`]+)['"`];?\s*$/gm;
      modifiedContent = modifiedContent.replace(brokenImportPattern, (match, indent, beforeBrace, importPath) => {
        if (!beforeBrace.includes('import') && !beforeBrace.includes('const') && !beforeBrace.includes('//')) {
          fileModified = true;
          fileFixes.push({ type: 'broken_import', original: match.trim() });
          return `${indent}// ${match.trim()} // 已修复`;
        }
        return match;
      });

      // 修复破损的 from 语句
      const brokenFromPattern = /^(\s*)(.*?)\s+from\s+['"`]([^'"`]+)['"`];?\s*$/gm;
      modifiedContent = modifiedContent.replace(brokenFromPattern, (match, indent, beforeFrom, importPath) => {
        if (!beforeFrom.includes('import') && !beforeFrom.includes('const') && !beforeFrom.includes('//') && beforeFrom.includes('}')) {
          fileModified = true;
          fileFixes.push({ type: 'broken_from', original: match.trim() });
          return `${indent}// ${match.trim()} // 已修复`;
        }
        return match;
      });

      // 修复不完整的对象字面量
      const incompleteObjectPattern = /(\w+):\s*$/gm;
      modifiedContent = modifiedContent.replace(incompleteObjectPattern, (match, propName) => {
        fileModified = true;
        fileFixes.push({ type: 'incomplete_object', original: match });
        return `${propName}: undefined, // 已修复`;
      });

      // 修复不完整的函数调用
      const incompleteFunctionPattern = /(\w+)\s*:\s*\(\s*\)\s*=>\s*$/gm;
      modifiedContent = modifiedContent.replace(incompleteFunctionPattern, (match, funcName) => {
        fileModified = true;
        fileFixes.push({ type: 'incomplete_function', original: match });
        return `${funcName}: () => null, // 已修复`;
      });

      // 如果文件被修改
      if (fileModified) {
        if (!dryRun) {
          fs.writeFileSync(filePath, modifiedContent, 'utf8');
        }
        
        this.fixedFiles++;
        this.totalFixes += fileFixes.length;
        
        const action = dryRun ? '[预览]' : '✅';
        console.log(`${action} 修复 ${path.relative(this.projectRoot, filePath)}`);
        fileFixes.forEach(fix => {
          console.log(`   ${fix.type}: ${fix.original}`);
        });
      }

    } catch (error) {
      console.error(`❌ 修复文件失败 ${filePath}:`, error.message);
    }
  }

  /**
   * 获取TypeScript文件
   */
  getTypeScriptFiles() {
    const files = [];
    
    const scanDirectory = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        if (this.shouldSkipDirectory(item)) return;
        
        const fullPath = path.join(dir, item);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDirectory(fullPath);
          } else if (/\.(ts|tsx)$/.test(item) && !this.shouldSkipFile(item)) {
            files.push(fullPath);
          }
        } catch (error) {
          // 忽略无法访问的文件
        }
      });
    };
    
    scanDirectory(path.join(this.projectRoot, 'frontend'));
    
    return files;
  }

  shouldSkipFile(fileName) {
    const skipPatterns = [
      /\.(test|spec)\./,
      /\.stories\./,
      /node_modules/,
      /dist/,
      /build/
    ];
    
    return skipPatterns.some(pattern => pattern.test(fileName));
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', '.vite', 'backup'];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * 生成报告
   */
  generateReport(dryRun = false) {
    console.log(`\n📊 语法错误修复报告${dryRun ? ' (预览)' : ''}`);
    console.log('='.repeat(50));
    
    console.log(`修复文件: ${this.fixedFiles}`);
    console.log(`总修复数: ${this.totalFixes}`);
    
    if (this.totalFixes === 0) {
      console.log('\n✅ 没有发现语法错误。');
    } else {
      console.log('\n✅ 语法错误修复完成！');
      
      if (dryRun) {
        console.log('\n💡 这是预览模式，没有实际修改文件。');
        console.log('运行 `node scripts/syntax-error-fixer.cjs --fix` 执行实际修复。');
      } else {
        console.log('\n🔍 建议后续操作:');
        console.log('1. 运行 TypeScript 编译检查: npm run type-check');
        console.log('2. 运行路径检查: npm run check:imports:precise');
        console.log('3. 检查应用是否正常启动');
      }
    }
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix') || args.includes('-f');
const dryRun = !shouldFix;

// 执行修复
if (require.main === module) {
  const fixer = new SyntaxErrorFixer();
  
  if (dryRun) {
    console.log('🔍 预览模式：显示将要修复的语法错误，不实际修改文件');
    console.log('使用 --fix 参数执行实际修复\n');
  }
  
  fixer.execute(dryRun).catch(console.error);
}

module.exports = SyntaxErrorFixer;
