#!/usr/bin/env node

/**
 * 导入导出路径检查和修复工具
 * 检查并修复项目中的导入导出路径问题
 */

const fs = require('fs');
const path = require('path');

class ImportExportFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.issues = [];
    this.fixes = [];
    this.statistics = {
      totalFiles: 0,
      checkedFiles: 0,
      brokenImports: 0,
      fixedImports: 0,
      errors: []
    };

    // 已知的路径映射（基于之前的重命名和删除）
    this.pathMappings = {
      // 引擎管理器重命名
      '../engines/UnifiedTestEngineManager': '../engines/core/TestEngineManager',
      './UnifiedTestEngineManager': './core/TestEngineManager',
      
      // 删除的重复文件
      '../services/analytics/index': null, // 已删除
      './analytics/index': null, // 已删除
      '../components/charts/TestCharts': null, // 已删除
      './charts/TestCharts': null, // 已删除
      
      // 路由管理器
      './UnifiedRouteManager': './RouteManager',
      '../src/UnifiedRouteManager': '../src/RouteManager'
    };

    // 导入模式
    this.importPatterns = [
      // ES6 imports
      /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"`]([^'"`]+)['"`]/g,
      // CommonJS requires
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      // Dynamic imports
      /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
    ];
  }

  /**
   * 执行检查和修复
   */
  async execute(dryRun = false) {
    console.log(`🔍 开始检查导入导出路径问题${dryRun ? ' (预览模式)' : ''}...\n`);

    try {
      // 1. 扫描所有代码文件
      const files = this.getCodeFiles();
      this.statistics.totalFiles = files.length;

      // 2. 检查每个文件的导入
      for (const file of files) {
        await this.checkFileImports(file);
      }

      // 3. 修复问题
      if (!dryRun && this.issues.length > 0) {
        await this.fixIssues();
      }

      // 4. 生成报告
      this.generateReport(dryRun);

    } catch (error) {
      console.error('❌ 检查过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 检查文件的导入
   */
  async checkFileImports(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.statistics.checkedFiles++;

      // 提取所有导入语句
      const imports = this.extractImports(content);

      for (const importInfo of imports) {
        const issue = await this.validateImport(filePath, importInfo);
        if (issue) {
          this.issues.push(issue);
          this.statistics.brokenImports++;
        }
      }

    } catch (error) {
      this.statistics.errors.push({
        file: filePath,
        error: error.message
      });
    }
  }

  /**
   * 提取导入语句
   */
  extractImports(content) {
    const imports = [];

    this.importPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        imports.push({
          fullMatch: match[0],
          path: match[1],
          type: this.getImportType(match[0])
        });
      }
    });

    return imports;
  }

  /**
   * 获取导入类型
   */
  getImportType(importStatement) {
    if (importStatement.includes('require(')) return 'require';
    if (importStatement.includes('import(')) return 'dynamic';
    return 'import';
  }

  /**
   * 验证导入
   */
  async validateImport(filePath, importInfo) {
    const { path: importPath, fullMatch, type } = importInfo;

    // 跳过外部模块
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null;
    }

    // 解析绝对路径
    const fileDir = path.dirname(filePath);
    const resolvedPath = this.resolveImportPath(fileDir, importPath);

    // 检查文件是否存在
    const exists = this.checkFileExists(resolvedPath);

    if (!exists) {
      // 检查是否有已知的路径映射
      const mappedPath = this.findPathMapping(importPath);
      
      return {
        file: filePath,
        importStatement: fullMatch,
        importPath,
        resolvedPath,
        type,
        issue: mappedPath === null ? 'deleted_file' : 'path_changed',
        suggestion: mappedPath,
        severity: mappedPath === null ? 'high' : 'medium'
      };
    }

    return null;
  }

  /**
   * 解析导入路径
   */
  resolveImportPath(fileDir, importPath) {
    const resolved = path.resolve(fileDir, importPath);
    
    // 尝试不同的扩展名
    const extensions = ['.js', '.ts', '.tsx', '.jsx', '/index.js', '/index.ts'];
    
    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (fs.existsSync(withExt)) {
        return withExt;
      }
    }

    return resolved;
  }

  /**
   * 检查文件是否存在
   */
  checkFileExists(filePath) {
    if (fs.existsSync(filePath)) {
      return true;
    }

    // 尝试不同的扩展名
    const extensions = ['.js', '.ts', '.tsx', '.jsx'];
    const dir = path.dirname(filePath);
    const basename = path.basename(filePath, path.extname(filePath));

    for (const ext of extensions) {
      if (fs.existsSync(path.join(dir, basename + ext))) {
        return true;
      }
    }

    // 检查index文件
    if (fs.existsSync(path.join(filePath, 'index.js')) ||
        fs.existsSync(path.join(filePath, 'index.ts'))) {
      return true;
    }

    return false;
  }

  /**
   * 查找路径映射
   */
  findPathMapping(importPath) {
    // 直接匹配
    if (this.pathMappings.hasOwnProperty(importPath)) {
      return this.pathMappings[importPath];
    }

    // 模糊匹配
    for (const [oldPath, newPath] of Object.entries(this.pathMappings)) {
      if (importPath.includes(oldPath)) {
        return newPath ? importPath.replace(oldPath, newPath) : null;
      }
    }

    return undefined; // 未找到映射
  }

  /**
   * 修复问题
   */
  async fixIssues() {
    console.log(`🔧 开始修复 ${this.issues.length} 个导入问题...\n`);

    const fileChanges = new Map();

    // 按文件分组问题
    this.issues.forEach(issue => {
      if (!fileChanges.has(issue.file)) {
        fileChanges.set(issue.file, []);
      }
      fileChanges.get(issue.file).push(issue);
    });

    // 修复每个文件
    for (const [filePath, issues] of fileChanges) {
      await this.fixFileIssues(filePath, issues);
    }
  }

  /**
   * 修复单个文件的问题
   */
  async fixFileIssues(filePath, issues) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      for (const issue of issues) {
        if (issue.suggestion && issue.suggestion !== null) {
          // 替换导入路径
          const oldStatement = issue.importStatement;
          const newStatement = oldStatement.replace(issue.importPath, issue.suggestion);
          
          if (content.includes(oldStatement)) {
            content = content.replace(oldStatement, newStatement);
            modified = true;
            this.statistics.fixedImports++;
            
            this.fixes.push({
              file: filePath,
              old: oldStatement,
              new: newStatement,
              type: 'path_update'
            });
          }
        } else if (issue.issue === 'deleted_file') {
          // 注释掉已删除文件的导入
          const oldStatement = issue.importStatement;
          const newStatement = `// ${oldStatement} // 文件已删除`;
          
          if (content.includes(oldStatement)) {
            content = content.replace(oldStatement, newStatement);
            modified = true;
            
            this.fixes.push({
              file: filePath,
              old: oldStatement,
              new: newStatement,
              type: 'comment_out'
            });
          }
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ 修复了 ${path.relative(this.projectRoot, filePath)}`);
      }

    } catch (error) {
      console.error(`❌ 修复文件失败 ${filePath}:`, error.message);
    }
  }

  /**
   * 获取代码文件
   */
  getCodeFiles() {
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
          } else if (/\.(ts|tsx|js|jsx)$/.test(item) && !this.shouldSkipFile(item)) {
            files.push(fullPath);
          }
        } catch (error) {
          // 忽略无法访问的文件
        }
      });
    };
    
    scanDirectory(path.join(this.projectRoot, 'frontend'));
    scanDirectory(path.join(this.projectRoot, 'backend'));
    
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
    console.log(`\n📊 导入导出检查报告${dryRun ? ' (预览)' : ''}`);
    console.log('='.repeat(50));
    
    console.log(`检查文件: ${this.statistics.checkedFiles}/${this.statistics.totalFiles}`);
    console.log(`发现问题: ${this.statistics.brokenImports}`);
    console.log(`修复问题: ${this.statistics.fixedImports}`);
    console.log(`错误文件: ${this.statistics.errors.length}`);

    if (this.issues.length === 0) {
      console.log('\n✅ 没有发现导入导出问题！');
      return;
    }

    // 按问题类型分组
    const issuesByType = {};
    this.issues.forEach(issue => {
      if (!issuesByType[issue.issue]) {
        issuesByType[issue.issue] = [];
      }
      issuesByType[issue.issue].push(issue);
    });

    console.log('\n📋 问题详情:');
    Object.entries(issuesByType).forEach(([type, issues]) => {
      console.log(`\n${this.getIssueTypeDisplayName(type)} (${issues.length}个):`);
      issues.slice(0, 5).forEach(issue => {
        console.log(`   ❌ ${path.relative(this.projectRoot, issue.file)}`);
        console.log(`      导入: ${issue.importStatement}`);
        if (issue.suggestion !== undefined) {
          console.log(`      建议: ${issue.suggestion || '删除此导入'}`);
        }
      });
      
      if (issues.length > 5) {
        console.log(`   ... 还有 ${issues.length - 5} 个类似问题`);
      }
    });

    if (this.fixes.length > 0) {
      console.log('\n🔧 已执行的修复:');
      this.fixes.slice(0, 10).forEach(fix => {
        console.log(`   ✅ ${path.relative(this.projectRoot, fix.file)}`);
        console.log(`      ${fix.old} → ${fix.new}`);
      });
      
      if (this.fixes.length > 10) {
        console.log(`   ... 还有 ${this.fixes.length - 10} 个修复`);
      }
    }

    if (dryRun && this.issues.length > 0) {
      console.log('\n💡 这是预览模式，没有实际修改文件。');
      console.log('运行 `node scripts/import-export-fixer.cjs --fix` 执行实际修复。');
    }
  }

  getIssueTypeDisplayName(type) {
    const typeNames = {
      deleted_file: '引用已删除的文件',
      path_changed: '路径已变更',
      file_not_found: '文件未找到'
    };
    
    return typeNames[type] || type;
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix') || args.includes('-f');
const dryRun = !shouldFix;

// 执行检查
if (require.main === module) {
  const fixer = new ImportExportFixer();
  
  if (dryRun) {
    console.log('🔍 预览模式：显示将要修复的问题，不实际修改文件');
    console.log('使用 --fix 参数执行实际修复\n');
  }
  
  fixer.execute(dryRun).catch(console.error);
}

module.exports = ImportExportFixer;
