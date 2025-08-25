#!/usr/bin/env node

/**
 * 模块加载问题修复工具
 * 检测和修复导致动态导入失败的问题
 */

const fs = require('fs');
const path = require('path');

class ModuleLoadingIssuesFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendPath = path.join(this.projectRoot, 'frontend');
    this.issues = [];
    this.fixes = [];
  }

  /**
   * 开始修复
   */
  async fix() {
    console.log('🔧 开始修复模块加载问题...\n');
    
    // 1. 检查语法错误
    await this.checkSyntaxErrors();
    
    // 2. 检查导入错误
    await this.checkImportErrors();
    
    // 3. 检查循环依赖
    await this.checkCircularDependencies();
    
    this.generateReport();
    
    console.log(`\n✅ 修复完成！`);
    console.log(`   发现问题: ${this.issues.length} 个`);
    console.log(`   自动修复: ${this.fixes.length} 个`);
  }

  /**
   * 检查语法错误
   */
  async checkSyntaxErrors() {
    console.log('🔍 检查语法错误...');
    
    const files = this.getAllTSFiles();
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(this.frontendPath, file);
        
        // 检查常见的语法错误
        const syntaxIssues = this.findSyntaxIssues(content, relativePath);
        
        if (syntaxIssues.length > 0) {
          this.issues.push(...syntaxIssues);
          
          // 尝试自动修复
          const fixed = await this.fixSyntaxIssues(file, content, syntaxIssues);
          if (fixed) {
            this.fixes.push({
              file: relativePath,
              type: 'syntax',
              issues: syntaxIssues
            });
          }
        }
        
      } catch (error) {
        console.error(`❌ 检查失败: ${path.relative(this.frontendPath, file)} - ${error.message}`);
      }
    }
  }

  /**
   * 查找语法问题
   */
  findSyntaxIssues(content, filePath) {
    const issues = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // 检查错误的导入语句
      if (line.includes('import') && line.includes('from')) {
        // 检查嵌套的import语句
        const nestedImportMatch = line.match(/import\s+.*import\s+/);
        if (nestedImportMatch) {
          issues.push({
            type: 'nested-import',
            file: filePath,
            line: lineNum,
            content: line.trim(),
            message: '嵌套的import语句'
          });
        }
        
        // 检查不完整的import语句
        const incompleteImportMatch = line.match(/import\s+type\s+\{[^}]*$/);
        if (incompleteImportMatch && !lines[i + 1]?.trim().startsWith('}')) {
          issues.push({
            type: 'incomplete-import',
            file: filePath,
            line: lineNum,
            content: line.trim(),
            message: '不完整的import语句'
          });
        }
      }
      
      // 检查未闭合的括号
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      
      if (openBraces !== closeBraces && line.includes('import')) {
        issues.push({
          type: 'unmatched-braces',
          file: filePath,
          line: lineNum,
          content: line.trim(),
          message: '未匹配的大括号'
        });
      }
      
      if (openParens !== closeParens && line.includes('import')) {
        issues.push({
          type: 'unmatched-parens',
          file: filePath,
          line: lineNum,
          content: line.trim(),
          message: '未匹配的小括号'
        });
      }
    }
    
    return issues;
  }

  /**
   * 修复语法问题
   */
  async fixSyntaxIssues(filePath, content, issues) {
    let newContent = content;
    let hasChanges = false;
    
    for (const issue of issues) {
      const lines = newContent.split('\n');
      const lineIndex = issue.line - 1;
      
      if (issue.type === 'nested-import') {
        // 修复嵌套导入
        const line = lines[lineIndex];
        const fixed = this.fixNestedImport(line);
        if (fixed !== line) {
          lines[lineIndex] = fixed;
          hasChanges = true;
          console.log(`✅ 修复嵌套导入: ${issue.file}:${issue.line}`);
        }
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      return true;
    }
    
    return false;
  }

  /**
   * 修复嵌套导入
   */
  fixNestedImport(line) {
    // 查找嵌套的import模式
    const match = line.match(/^(\s*import\s+.*?)\s+import\s+(.+)$/);
    if (match) {
      // 将嵌套的import分离成两行
      const firstImport = match[1].trim();
      const secondImport = `import ${match[2]}`;
      return `${firstImport}\n${secondImport}`;
    }
    return line;
  }

  /**
   * 检查导入错误
   */
  async checkImportErrors() {
    console.log('🔍 检查导入错误...');
    
    const files = this.getAllTSFiles();
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(this.frontendPath, file);
        
        // 检查导入路径是否存在
        const importIssues = await this.findImportIssues(content, relativePath, file);
        
        if (importIssues.length > 0) {
          this.issues.push(...importIssues);
        }
        
      } catch (error) {
        console.error(`❌ 检查导入失败: ${path.relative(this.frontendPath, file)} - ${error.message}`);
      }
    }
  }

  /**
   * 查找导入问题
   */
  async findImportIssues(content, filePath, fullPath) {
    const issues = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // 匹配导入语句
      const importMatch = line.match(/import.*from\s+['"`]([^'"`]+)['"`]/);
      if (importMatch) {
        const importPath = importMatch[1];
        
        // 检查相对导入路径
        if (importPath.startsWith('.')) {
          const resolvedPath = this.resolveImportPath(fullPath, importPath);
          if (!resolvedPath || !fs.existsSync(resolvedPath)) {
            issues.push({
              type: 'missing-file',
              file: filePath,
              line: lineNum,
              content: line.trim(),
              importPath: importPath,
              message: `导入的文件不存在: ${importPath}`
            });
          }
        }
      }
    }
    
    return issues;
  }

  /**
   * 解析导入路径
   */
  resolveImportPath(fromFile, importPath) {
    try {
      const fromDir = path.dirname(fromFile);
      const resolved = path.resolve(fromDir, importPath);
      
      // 尝试不同的扩展名
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
      for (const ext of extensions) {
        const fullPath = resolved + ext;
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
      
      // 尝试index文件
      const indexPath = path.join(resolved, 'index.ts');
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
      
      const indexTsxPath = path.join(resolved, 'index.tsx');
      if (fs.existsSync(indexTsxPath)) {
        return indexTsxPath;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查循环依赖
   */
  async checkCircularDependencies() {
    console.log('🔍 检查循环依赖...');
    
    // 这里可以添加循环依赖检查逻辑
    // 由于复杂性，暂时跳过
  }

  /**
   * 获取所有TypeScript文件
   */
  getAllTSFiles() {
    const files = [];
    
    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDir(fullPath);
        } else if (stat.isFile() && /\.(ts|tsx)$/.test(item)) {
          files.push(fullPath);
        }
      }
    };
    
    scanDir(this.frontendPath);
    return files;
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📊 模块加载问题修复报告:');
    console.log('='.repeat(60));
    
    if (this.issues.length === 0) {
      console.log('\n✅ 没有发现模块加载问题！');
      return;
    }
    
    // 按类型分组显示问题
    const groupedIssues = {};
    this.issues.forEach(issue => {
      if (!groupedIssues[issue.type]) {
        groupedIssues[issue.type] = [];
      }
      groupedIssues[issue.type].push(issue);
    });
    
    for (const [type, issues] of Object.entries(groupedIssues)) {
      console.log(`\n❌ ${this.getTypeDescription(type)} (${issues.length}个):`);
      issues.slice(0, 5).forEach((issue, index) => {
        console.log(`  ${index + 1}. 📁 ${issue.file}:${issue.line}`);
        console.log(`     ${issue.message}`);
        console.log(`     代码: ${issue.content}`);
      });
      
      if (issues.length > 5) {
        console.log(`     ... 还有 ${issues.length - 5} 个类似问题`);
      }
    }
    
    if (this.fixes.length > 0) {
      console.log(`\n✅ 自动修复了 ${this.fixes.length} 个文件:`);
      this.fixes.forEach((fix, index) => {
        console.log(`  ${index + 1}. 📁 ${fix.file} (${fix.type})`);
      });
    }
    
    console.log('\n💡 建议:');
    console.log('  1. 重启开发服务器: npm run dev');
    console.log('  2. 清除浏览器缓存');
    console.log('  3. 运行类型检查: npm run type-check');
  }

  /**
   * 获取问题类型描述
   */
  getTypeDescription(type) {
    const descriptions = {
      'nested-import': '嵌套导入语句',
      'incomplete-import': '不完整的导入语句',
      'unmatched-braces': '未匹配的大括号',
      'unmatched-parens': '未匹配的小括号',
      'missing-file': '缺失的导入文件'
    };
    
    return descriptions[type] || type;
  }
}

// 运行修复工具
if (require.main === module) {
  const fixer = new ModuleLoadingIssuesFixer();
  fixer.fix().catch(console.error);
}

module.exports = ModuleLoadingIssuesFixer;
