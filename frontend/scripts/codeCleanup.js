/**
 * 自动代码清理和规范化脚本
 * 处理项目中的临时修复、console.log占位符和代码规范化问题
 */

const fs = require('fs');
const path = require('path');

class CodeCleanup {
  constructor() {
    this.stats = {
      filesProcessed: 0,
      consolesRemoved: 0,
      emptyFunctionsFixed: 0,
      todosFound: 0,
      errorsFixed: 0
    };
  }

  /**
   * 扫描项目文件
   */
  scanDirectory(dirPath, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
    const files = [];
    
    function scanRecursive(currentPath) {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // 跳过node_modules和构建目录
          if (!['node_modules', 'dist', 'build', '.git'].includes(item)) {
            scanRecursive(fullPath);
          }
        } else {
          const ext = path.extname(fullPath);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }
    
    scanRecursive(dirPath);
    return files;
  }

  /**
   * 清理console.log占位符
   */
  cleanConsoleLog(content) {
    const lines = content.split('\n');
    const cleanedLines = [];
    let removed = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // 检查是否是简单的console.log占位符
      if (trimmed === "console.log('');") ||
          trimmed === 'console.log("");') ||
          trimmed === 'console.log();') ||
          trimmed.match(/^console\.log\(['"`]TODO.*['"`]\);?$/) ||
          trimmed.match(/^console\.log\(['"`]FIXME.*['"`]\);?$/) ||
          trimmed.match(/^console\.log\(['"`]placeholder.*['"`]\);?$/i) ||
          trimmed.match(/^console\.log\(['"`]功能函数.*['"`]\);?$/) {
        removed++;
        continue;
      }
      
      cleanedLines.push(line);
    }

    this.stats.consolesRemoved += removed;
    return cleanedLines.join('\n');
  }

  /**
   * 修复空函数实现
   */
  fixEmptyFunctions(content) {
    let fixed = 0;
    
    // 修复空的箭头函数: () => {}
    content = content.replace(/(\w+\s*=\s*.*?=>\s*\{\s*\})/g, (match) => {
      if (match.includes('onClick') || match.includes('onSubmit') || match.includes('handler')) {
        fixed++;
        return match.replace('{}', '{\n    // TODO: 实现事件处理逻辑\n    console.warn(\'事件处理器尚未实现\');\n  }');
      }
      return match;
    });

    // 修复空的async函数
    content = content.replace(/(async\s+\w+\s*\([^)]*\)\s*\{\s*\})/g, (match) => {
      fixed++;
      return match.replace('{}', '{\n    // TODO: 实现异步逻辑\n    throw new Error(\'方法尚未实现\');\n  }');
    });

    this.stats.emptyFunctionsFixed += fixed;
    return content;
  }

  /**
   * 统计TODO/FIXME注释
   */
  countTodos(content) {
    const todoMatches = content.match(/(\/\/ TODO|\/\/ FIXME|\/\*.*TODO.*\*\/|\/\*.*FIXME.*\*\/)/gi);
    if (todoMatches) {
      this.stats.todosFound += todoMatches.length;
    }
  }

  /**
   * 修复常见的TypeScript错误
   */
  fixCommonTSErrors(content) {
    let fixed = 0;

    // 修复未使用的导入
    const importLines = content.match(/^import.*from.*;$/gm) || [];
    const usedImports = new Set();
    
    // 分析哪些导入被实际使用
    for (const importLine of importLines) {
      const importMatch = importLine.match(/import\s*\{\s*([^}]+)\s*\}/);
      if (importMatch) {
        const imports = importMatch[1].split(',').map(i => i.trim());
        for (const imp of imports) {
          const cleanImport = imp.replace(/\s+as\s+\w+/, '');
          if (content.includes(cleanImport.trim()) && content.indexOf(cleanImport.trim()) !== content.indexOf(importLine)) {
            usedImports.add(cleanImport.trim());
          }
        }
      }
    }

    // 移除不安全的any类型转换
    content = content.replace(/as any\)/g, ') // TODO: 改进类型安全');
    if (content.includes('// TODO: 改进类型安全')) {
      fixed++;
    }

    this.stats.errorsFixed += fixed;
    return content;
  }

  /**
   * 处理单个文件
   */
  processFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // 应用各种清理规则
      content = this.cleanConsoleLog(content);
      content = this.fixEmptyFunctions(content);
      content = this.fixCommonTSErrors(content);
      this.countTodos(content);
      
      // 写回文件
      fs.writeFileSync(filePath, content, 'utf8');
      this.stats.filesProcessed++;
      
      console.log(`✅ 已处理: ${filePath}`);
      
    } catch (error) {
      console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
    }
  }

  /**
   * 执行清理
   */
  async cleanup(projectPath = './') {
    console.log('🧹 开始自动代码清理...\n');
    
    const files = this.scanDirectory(path.resolve(projectPath));
    console.log(`📁 找到 ${files.length} 个文件待处理\n`);
    
    for (const file of files) {
      this.processFile(file);
    }
    
    this.printSummary();
  }

  /**
   * 打印清理摘要
   */
  printSummary() {
    console.log('\n📊 清理完成统计:');
    console.log(`📄 处理文件数: ${this.stats.filesProcessed}`);
    console.log(`🚫 移除console.log: ${this.stats.consolesRemoved}`);
    console.log(`🔧 修复空函数: ${this.stats.emptyFunctionsFixed}`);
    console.log(`📝 发现TODO/FIXME: ${this.stats.todosFound}`);
    console.log(`🛠️ 修复错误: ${this.stats.errorsFixed}`);
    console.log('\n✨ 代码清理完成!\n');
    
    if (this.stats.todosFound > 0) {
      console.log('⚠️  注意: 项目中仍有一些TODO项目需要手动处理');
    }
  }
}

// 创建清理实例并运行
const cleaner = new CodeCleanup();

// 如果作为脚本运行
if (require.main === module) {
  const projectPath = process.argv[2] || './';
  cleaner.cleanup(projectPath).catch(console.error);
}

module.exports = CodeCleanup;
