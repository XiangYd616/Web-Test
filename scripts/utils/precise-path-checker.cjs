#!/usr/bin/env node

/**
 * 精确路径检查工具
 * 检查真正存在问题的导入路径
 */

const fs = require('fs');
const path = require('path');

class PrecisePathChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.realIssues = [];
    this.checkedFiles = 0;
    this.statistics = {
      totalImports: 0,
      brokenImports: 0,
      missingFiles: 0,
      validImports: 0
    };
  }

  /**
   * 执行检查
   */
  async execute() {
    console.log('🔍 开始精确路径检查...\n');

    try {
      const files = this.getCodeFiles();
      
      for (const file of files) {
        await this.checkFile(file);
      }
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 检查过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 检查单个文件
   */
  async checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.checkedFiles++;
      
      // 提取导入语句
      const imports = this.extractImports(content);
      this.statistics.totalImports += imports.length;
      
      for (const importInfo of imports) {
        const issue = await this.validateImport(filePath, importInfo);
        if (issue) {
          this.realIssues.push(issue);
          this.statistics.brokenImports++;
        } else {
          this.statistics.validImports++;
        }
      }
      
    } catch (error) {
      console.error(`❌ 检查文件失败 ${filePath}:`, error.message);
    }
  }

  /**
   * 提取导入语句
   */
  extractImports(content) {
    const imports = [];
    const patterns = [
      /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"`]([^'"`]+)['"`]/g,
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        // 只检查相对路径
        if (importPath.startsWith('.')) {
          imports.push({
            fullMatch: match[0],
            path: importPath,
            type: this.getImportType(match[0])
          });
        }
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
    const fileDir = path.dirname(filePath);
    
    // 解析绝对路径
    let resolvedPath = path.resolve(fileDir, importPath);
    
    // 检查文件是否存在
    if (this.fileExists(resolvedPath)) {
      return null; // 文件存在，没有问题
    }

    // 尝试添加扩展名
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'];
    for (const ext of extensions) {
      if (this.fileExists(resolvedPath + ext)) {
        return null; // 文件存在，没有问题
      }
    }

    // 检查是否是目录，并查找index文件
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      const indexFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
      for (const indexFile of indexFiles) {
        if (this.fileExists(path.join(resolvedPath, indexFile))) {
          return null; // index文件存在，没有问题
        }
      }
    }

    // 真正的问题：文件不存在
    this.statistics.missingFiles++;
    return {
      file: filePath,
      importStatement: fullMatch,
      importPath,
      resolvedPath,
      type,
      issue: 'file_not_found',
      severity: 'high'
    };
  }

  /**
   * 检查文件是否存在
   */
  fileExists(filePath) {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch (error) {
      return false;
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
  generateReport() {
    console.log('📊 精确路径检查报告');
    console.log('='.repeat(50));
    
    console.log(`检查文件: ${this.checkedFiles}`);
    console.log(`总导入数: ${this.statistics.totalImports}`);
    console.log(`有效导入: ${this.statistics.validImports}`);
    console.log(`问题导入: ${this.statistics.brokenImports}`);
    console.log(`缺失文件: ${this.statistics.missingFiles}`);

    if (this.realIssues.length === 0) {
      console.log('\n✅ 没有发现真正的路径问题！');
      console.log('所有导入路径都是有效的。');
      return;
    }

    console.log('\n📋 真正的路径问题:');
    
    // 按文件分组显示问题
    const issuesByFile = {};
    this.realIssues.forEach(issue => {
      const relativePath = path.relative(this.projectRoot, issue.file);
      if (!issuesByFile[relativePath]) {
        issuesByFile[relativePath] = [];
      }
      issuesByFile[relativePath].push(issue);
    });

    Object.entries(issuesByFile).forEach(([file, issues]) => {
      console.log(`\n❌ ${file}:`);
      issues.forEach(issue => {
        console.log(`   导入: ${issue.importPath}`);
        console.log(`   问题: 文件不存在`);
        console.log(`   路径: ${path.relative(this.projectRoot, issue.resolvedPath)}`);
      });
    });

    console.log('\n💡 修复建议:');
    console.log('1. 检查文件是否被删除或重命名');
    console.log('2. 更新导入路径指向正确的文件');
    console.log('3. 如果文件确实不需要，删除相关导入');
    console.log('4. 检查文件扩展名是否正确');

    console.log('\n🔧 可以使用以下命令修复:');
    console.log('npm run fix:imports  # 自动修复已知问题');
  }
}

// 执行检查
if (require.main === module) {
  const checker = new PrecisePathChecker();
  checker.execute().catch(console.error);
}

module.exports = PrecisePathChecker;
