#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class NamingStandardizer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixes = [];
    this.renames = [];
    
    // 命名规范定义
    this.namingRules = {
      // 文件命名规范
      files: {
        components: /^[A-Z][a-zA-Z0-9]*\.(tsx|jsx)$/,
        utils: /^[a-z][a-zA-Z0-9]*\.(ts|js)$/,
        services: /^[a-z][a-zA-Z0-9]*\.(ts|js)$/,
        types: /^[a-z][a-zA-Z0-9]*\.(ts|d\.ts)$/,
        hooks: /^use[A-Z][a-zA-Z0-9]*\.(ts|tsx)$/,
        pages: /^[A-Z][a-zA-Z0-9]*\.(tsx|jsx)$/,
        styles: /^[a-z][a-z0-9-]*\.(css|scss|sass|less)$/
      },
      
      // 代码命名规范
      code: {
        classes: /^[A-Z][a-zA-Z0-9]*$/,
        variables: /^[a-z][a-zA-Z0-9]*$/,
        constants: /^[A-Z][A-Z0-9_]*$/,
        functions: /^[a-z][a-zA-Z0-9]*$/,
        interfaces: /^[A-Z][a-zA-Z0-9]*$/,
        types: /^[A-Z][a-zA-Z0-9]*$/
      }
    };

    // 问题模式
    this.problemPatterns = {
      versionPrefixes: /^(Enhanced|Advanced|Optimized|Improved|Unified|Extended|Modern|Smart|Better|New|Updated|Intelligent|Ultra|Master|Final|Latest)/,
      hungarianNotation: /^(str|int|bool|obj|arr|fn|num)[A-Z]/,
      underscoreNaming: /^[a-z]+_[a-z]/,
      consecutiveUppercase: /[A-Z]{3,}/
    };
  }

  /**
   * 执行命名标准化
   */
  async execute() {
    console.log('🏷️ 开始命名规范化...\n');

    try {
      // 1. 检查文件命名问题
      await this.checkFileNaming();

      // 2. 检查代码命名问题
      await this.checkCodeNaming();

      // 3. 修复导入语句格式
      await this.fixImportStatements();

      // 4. 生成修复报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 命名标准化过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 检查文件命名问题
   */
  async checkFileNaming() {
    console.log('📁 检查文件命名规范...');

    const files = this.getProjectFiles();
    let issues = 0;

    for (const file of files) {
      const fileName = path.basename(file);
      const baseName = path.basename(fileName, path.extname(fileName));
      const extension = path.extname(fileName);
      
      // 跳过特殊文件
      if (this.shouldSkipFile(fileName)) {
        continue;
      }

      // 检查版本化前缀
      if (this.problemPatterns.versionPrefixes.test(baseName)) {
        const newName = this.removeVersionPrefixes(baseName) + extension;
        this.addRename(file, fileName, newName, '移除版本化前缀');
        issues++;
      }

      // 检查文件类型特定的命名规范
      const fileType = this.determineFileType(file);
      if (fileType && this.namingRules.files[fileType]) {
        const pattern = this.namingRules.files[fileType];
        if (!pattern.test(fileName)) {
          const newName = this.generateCorrectFileName(baseName, fileType) + extension;
          this.addRename(file, fileName, newName, `修复${fileType}文件命名规范`);
          issues++;
        }
      }
    }

    console.log(`   发现 ${issues} 个文件命名问题\n`);
  }

  /**
   * 检查代码命名问题
   */
  async checkCodeNaming() {
    console.log('💻 检查代码命名规范...');

    const files = this.getCodeFiles();
    let issues = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        let newContent = content;
        let fileModified = false;

        // 修复变量命名
        const variableIssues = this.fixVariableNaming(newContent);
        if (variableIssues.modified) {
          newContent = variableIssues.content;
          fileModified = true;
          issues += variableIssues.count;
        }

        // 修复函数命名
        const functionIssues = this.fixFunctionNaming(newContent);
        if (functionIssues.modified) {
          newContent = functionIssues.content;
          fileModified = true;
          issues += functionIssues.count;
        }

        // 修复类命名
        const classIssues = this.fixClassNaming(newContent);
        if (classIssues.modified) {
          newContent = classIssues.content;
          fileModified = true;
          issues += classIssues.count;
        }

        // 如果有修改，写入文件
        if (fileModified) {
          fs.writeFileSync(file, newContent);
          this.addFix('code_naming', file, `修复了代码命名问题`);
        }

      } catch (error) {
        console.log(`   ⚠️  无法处理文件: ${file}`);
      }
    }

    console.log(`   修复 ${issues} 个代码命名问题\n`);
  }

  /**
   * 修复导入语句格式
   */
  async fixImportStatements() {
    console.log('📦 修复导入语句格式...');

    const files = this.getCodeFiles();
    let fixes = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        let newContent = content;
        let modified = false;

        // 修复导入语句排序
        const importLines = this.extractImportLines(content);
        if (importLines.length > 0) {
          const sortedImports = this.sortImportStatements(importLines);
          const originalImportBlock = importLines.join('\n');
          const sortedImportBlock = sortedImports.join('\n');
          
          if (originalImportBlock !== sortedImportBlock) {
            newContent = newContent.replace(originalImportBlock, sortedImportBlock);
            modified = true;
            fixes++;
          }
        }

        // 修复导入语句格式
        const formattedImports = this.formatImportStatements(newContent);
        if (formattedImports.modified) {
          newContent = formattedImports.content;
          modified = true;
        }

        if (modified) {
          fs.writeFileSync(file, newContent);
          this.addFix('import_formatting', file, '修复导入语句格式');
        }

      } catch (error) {
        console.log(`   ⚠️  无法处理文件: ${file}`);
      }
    }

    console.log(`   修复 ${fixes} 个导入语句格式问题\n`);
  }

  /**
   * 修复变量命名
   */
  fixVariableNaming(content) {
    let newContent = content;
    let count = 0;
    let modified = false;

    // 修复匈牙利命名法
    const hungarianMatches = content.match(/(let|const|var)\s+(str|int|bool|obj|arr|fn|num)[A-Z][a-zA-Z0-9]*/g);
    if (hungarianMatches) {
      hungarianMatches.forEach(match => {
        const parts = match.split(/\s+/);
        const oldName = parts[1];
        const newName = this.removeHungarianPrefix(oldName);
        
        if (oldName !== newName) {
          newContent = newContent.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
          count++;
          modified = true;
        }
      });
    }

    // 修复下划线命名
    const underscoreMatches = content.match(/(let|const|var)\s+[a-z]+_[a-z][a-zA-Z0-9_]*/g);
    if (underscoreMatches) {
      underscoreMatches.forEach(match => {
        const parts = match.split(/\s+/);
        const oldName = parts[1];
        const newName = this.toCamelCase(oldName);
        
        if (oldName !== newName) {
          newContent = newContent.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName);
          count++;
          modified = true;
        }
      });
    }

    return { content: newContent, count, modified };
  }

  /**
   * 修复函数命名
   */
  fixFunctionNaming(content) {
    let newContent = content;
    let count = 0;
    let modified = false;

    // 修复函数声明
    const functionMatches = content.match(/function\s+[A-Z][a-zA-Z0-9]*\s*\(/g);
    if (functionMatches) {
      functionMatches.forEach(match => {
        const funcName = match.replace(/function\s+/, '').replace(/\s*\(/, '');
        const newName = this.toCamelCase(funcName);
        
        if (funcName !== newName) {
          newContent = newContent.replace(new RegExp(`\\bfunction\\s+${funcName}\\b`, 'g'), `function ${newName}`);
          newContent = newContent.replace(new RegExp(`\\b${funcName}\\b`, 'g'), newName);
          count++;
          modified = true;
        }
      });
    }

    return { content: newContent, count, modified };
  }

  /**
   * 修复类命名
   */
  fixClassNaming(content) {
    let newContent = content;
    let count = 0;
    let modified = false;

    // 修复版本化前缀
    const classMatches = content.match(/class\s+(Enhanced|Advanced|Optimized|Improved|Unified|Extended|Modern|Smart|Better|New|Updated)[A-Z][a-zA-Z0-9]*/g);
    if (classMatches) {
      classMatches.forEach(match => {
        const className = match.replace(/class\s+/, '');
        const newName = this.removeVersionPrefixes(className);
        
        if (className !== newName) {
          newContent = newContent.replace(new RegExp(`\\bclass\\s+${className}\\b`, 'g'), `class ${newName}`);
          newContent = newContent.replace(new RegExp(`\\b${className}\\b`, 'g'), newName);
          count++;
          modified = true;
        }
      });
    }

    return { content: newContent, count, modified };
  }

  /**
   * 提取导入语句
   */
  extractImportLines(content) {
    const lines = content.split('\n');
    const importLines = [];
    
    for (const line of lines) {
      if (line.trim().startsWith('import ') && !line.includes('//')) {
        importLines.push(line);
      }
    }
    
    return importLines;
  }

  /**
   * 排序导入语句
   */
  sortImportStatements(importLines) {
    return importLines.sort((a, b) => {
      // 第三方库优先
      const aIsThirdParty = !a.includes('./') && !a.includes('../');
      const bIsThirdParty = !b.includes('./') && !b.includes('../');
      
      if (aIsThirdParty && !bIsThirdParty) return -1;
      if (!aIsThirdParty && bIsThirdParty) return 1;
      
      // 按字母顺序排序
      return a.localeCompare(b);
    });
  }

  /**
   * 格式化导入语句
   */
  formatImportStatements(content) {
    let newContent = content;
    let modified = false;

    // 修复导入语句中的空格
    const importRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/g;
    newContent = newContent.replace(importRegex, (match, imports, from) => {
      const cleanImports = imports.split(',').map(imp => imp.trim()).join(', ');
      const formatted = `import { ${cleanImports} } from '${from}'`;
      
      if (match !== formatted) {
        modified = true;
      }
      
      return formatted;
    });

    return { content: newContent, modified };
  }

  /**
   * 工具方法
   */
  shouldSkipFile(fileName) {
    const skipPatterns = [
      /^\./, // 隐藏文件
      /node_modules/,
      /\.d\.ts$/,
      /\.min\./,
      /package\.json$/,
      /tsconfig\.json$/,
      /vite\.config/,
      /README/i
    ];
    
    return skipPatterns.some(pattern => pattern.test(fileName));
  }

  determineFileType(filePath) {
    const fileName = path.basename(filePath);
    const dir = path.dirname(filePath);
    
    if (dir.includes('components') && /\.(tsx|jsx)$/.test(fileName)) return 'components';
    if (dir.includes('pages') && /\.(tsx|jsx)$/.test(fileName)) return 'pages';
    if (dir.includes('hooks') && /\.(ts|tsx)$/.test(fileName)) return 'hooks';
    if (dir.includes('utils') && /\.(ts|js)$/.test(fileName)) return 'utils';
    if (dir.includes('services') && /\.(ts|js)$/.test(fileName)) return 'services';
    if (dir.includes('types') && /\.(ts|d\.ts)$/.test(fileName)) return 'types';
    if (/\.(css|scss|sass|less)$/.test(fileName)) return 'styles';
    
    return null;
  }

  removeVersionPrefixes(name) {
    return name.replace(this.problemPatterns.versionPrefixes, '');
  }

  removeHungarianPrefix(name) {
    return name.replace(/^(str|int|bool|obj|arr|fn|num)/, '').replace(/^[A-Z]/, match => match.toLowerCase());
  }

  toCamelCase(str) {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  toPascalCase(str) {
    const camelCase = this.toCamelCase(str);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  }

  generateCorrectFileName(baseName, fileType) {
    switch (fileType) {
      case 'components':
      case 'pages':
        return this.toPascalCase(baseName);
      case 'hooks':
        return baseName.startsWith('use') ? this.toCamelCase(baseName) : `use${this.toPascalCase(baseName)}`;
      case 'styles':
        return baseName.toLowerCase().replace(/[A-Z]/g, match => '-' + match.toLowerCase());
      default:
        return this.toCamelCase(baseName);
    }
  }

  getProjectFiles() {
    const files = [];
    this.walkDirectory(path.join(this.projectRoot, 'frontend'), files);
    this.walkDirectory(path.join(this.projectRoot, 'backend'), files);
    return files;
  }

  getCodeFiles() {
    return this.getProjectFiles().filter(file => 
      /\.(ts|tsx|js|jsx)$/.test(file) && !this.shouldSkipFile(path.basename(file))
    );
  }

  walkDirectory(dir, files) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      if (item.startsWith('.') || item === 'node_modules') return;
      
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.walkDirectory(fullPath, files);
      } else {
        files.push(fullPath);
      }
    });
  }

  addRename(filePath, oldName, newName, reason) {
    this.renames.push({
      file: path.relative(this.projectRoot, filePath),
      oldName,
      newName,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  addFix(category, filePath, description) {
    this.fixes.push({
      category,
      file: path.relative(this.projectRoot, filePath),
      description,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'naming-standardization-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFixes: this.fixes.length,
        totalRenames: this.renames.length,
        categories: {
          file_naming: this.renames.length,
          code_naming: this.fixes.filter(f => f.category === 'code_naming').length,
          import_formatting: this.fixes.filter(f => f.category === 'import_formatting').length
        }
      },
      fixes: this.fixes,
      renames: this.renames,
      recommendations: [
        '建议在IDE中配置自动格式化规则',
        '考虑添加ESLint规则来强制命名规范',
        '定期运行命名检查工具',
        '建立代码审查流程确保命名规范'
      ]
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 命名标准化报告:');
    console.log(`   代码修复: ${report.summary.categories.code_naming}`);
    console.log(`   文件重命名: ${report.summary.categories.file_naming}`);
    console.log(`   导入格式化: ${report.summary.categories.import_formatting}`);
    console.log(`   报告已保存: ${reportPath}\n`);

    if (this.renames.length > 0) {
      console.log('📋 建议的文件重命名:');
      this.renames.forEach(({ file, oldName, newName, reason }) => {
        console.log(`   ${file}: ${oldName} -> ${newName} (${reason})`);
      });
      console.log('\n⚠️  文件重命名需要手动执行，请谨慎操作');
    }

    console.log('\n🎯 后续步骤:');
    console.log('   1. 审查建议的文件重命名');
    console.log('   2. 测试应用程序确保功能正常');
    console.log('   3. 更新相关的导入引用');
    console.log('   4. 建立命名规范的维护流程');
  }
}

// 执行脚本
if (require.main === module) {
  const standardizer = new NamingStandardizer();
  standardizer.execute().catch(error => {
    console.error('❌ 命名标准化失败:', error);
    process.exit(1);
  });
}

module.exports = NamingStandardizer;
