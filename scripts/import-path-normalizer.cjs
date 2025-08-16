#!/usr/bin/env node

/**
 * 导入路径规范化工具
 * 修复因文件名规范化而导致的路径导入错误
 */

const fs = require('fs');
const path = require('path');

class ImportPathNormalizer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = 0;
    this.totalFixes = 0;
    this.fileMap = new Map(); // 存储实际存在的文件映射
  }

  /**
   * 执行修复
   */
  async execute(dryRun = false) {
    console.log(`🔧 开始导入路径规范化修复${dryRun ? ' (预览模式)' : ''}...\n`);

    try {
      // 1. 构建文件映射
      await this.buildFileMap();
      
      // 2. 查找并修复导入问题
      const files = this.getSourceFiles();
      
      for (const file of files) {
        await this.fixImportsInFile(file, dryRun);
      }
      
      this.generateReport(dryRun);
      
    } catch (error) {
      console.error('❌ 修复过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 构建文件映射
   */
  async buildFileMap() {
    console.log('📁 构建文件映射...');
    
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
          } else if (this.isSourceFile(item)) {
            // 记录文件的多种可能路径
            const relativePath = path.relative(this.projectRoot, fullPath);
            const normalizedPath = relativePath.replace(/\\/g, '/');
            const withoutExt = normalizedPath.replace(/\.(ts|tsx|js|jsx)$/, '');
            
            // 存储多种可能的引用方式
            this.fileMap.set(normalizedPath, fullPath);
            this.fileMap.set(withoutExt, fullPath);
            this.fileMap.set(path.basename(withoutExt), fullPath);
            
            // 处理index文件的特殊情况
            if (path.basename(item, path.extname(item)) === 'index') {
              const dirPath = path.dirname(withoutExt);
              this.fileMap.set(dirPath, fullPath);
            }
          }
        } catch (error) {
          // 忽略无法访问的文件
        }
      });
    };
    
    scanDirectory(path.join(this.projectRoot, 'frontend'));
    scanDirectory(path.join(this.projectRoot, 'backend'));
    
    console.log(`📊 发现 ${this.fileMap.size} 个文件映射`);
  }

  /**
   * 修复文件中的导入
   */
  async fixImportsInFile(filePath, dryRun = false) {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      let modifiedContent = originalContent;
      let fileModified = false;
      const fileFixes = [];

      // 匹配各种导入语句
      const importPatterns = [
        // ES6 imports
        /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g,
        // CommonJS requires
        /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
      ];

      for (const pattern of importPatterns) {
        modifiedContent = modifiedContent.replace(pattern, (match, importPath) => {
          const fixedPath = this.findCorrectPath(filePath, importPath);
          if (fixedPath && fixedPath !== importPath) {
            fileModified = true;
            fileFixes.push({
              type: 'path_correction',
              original: importPath,
              fixed: fixedPath
            });
            return match.replace(importPath, fixedPath);
          }
          return match;
        });
      }

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
          console.log(`   ${fix.original} → ${fix.fixed}`);
        });
      }

    } catch (error) {
      console.error(`❌ 修复文件失败 ${filePath}:`, error.message);
    }
  }

  /**
   * 查找正确的路径
   */
  findCorrectPath(fromFile, importPath) {
    // 跳过绝对路径和npm包
    if (importPath.startsWith('/') || !importPath.startsWith('.')) {
      return null;
    }

    const fromDir = path.dirname(fromFile);
    const resolvedPath = path.resolve(fromDir, importPath);
    const relativePath = path.relative(this.projectRoot, resolvedPath);
    const normalizedPath = relativePath.replace(/\\/g, '/');

    // 尝试各种可能的文件扩展名
    const possiblePaths = [
      normalizedPath,
      normalizedPath + '.ts',
      normalizedPath + '.tsx',
      normalizedPath + '.js',
      normalizedPath + '.jsx',
      normalizedPath + '/index.ts',
      normalizedPath + '/index.tsx',
      normalizedPath + '/index.js',
      normalizedPath + '/index.jsx'
    ];

    for (const possiblePath of possiblePaths) {
      if (this.fileMap.has(possiblePath)) {
        // 计算正确的相对路径
        const actualFile = this.fileMap.get(possiblePath);
        const correctRelativePath = path.relative(fromDir, actualFile);
        let normalizedCorrectPath = correctRelativePath.replace(/\\/g, '/');
        
        // 确保相对路径以 ./ 或 ../ 开头
        if (!normalizedCorrectPath.startsWith('.')) {
          normalizedCorrectPath = './' + normalizedCorrectPath;
        }
        
        // 移除文件扩展名（如果原始导入没有扩展名）
        if (!importPath.match(/\.(ts|tsx|js|jsx)$/)) {
          normalizedCorrectPath = normalizedCorrectPath.replace(/\.(ts|tsx|js|jsx)$/, '');
        }
        
        return normalizedCorrectPath;
      }
    }

    return null;
  }

  /**
   * 获取源文件
   */
  getSourceFiles() {
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
          } else if (this.isSourceFile(item) && !this.shouldSkipFile(item)) {
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

  isSourceFile(fileName) {
    return /\.(ts|tsx|js|jsx)$/.test(fileName);
  }

  shouldSkipFile(fileName) {
    const skipPatterns = [
      /\.(test|spec)\./,
      /\.stories\./,
      /\.d\.ts$/
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
    console.log(`\n📊 导入路径规范化修复报告${dryRun ? ' (预览)' : ''}`);
    console.log('='.repeat(50));
    
    console.log(`修复文件: ${this.fixedFiles}`);
    console.log(`总修复数: ${this.totalFixes}`);
    console.log(`文件映射: ${this.fileMap.size} 个`);
    
    if (this.totalFixes === 0) {
      console.log('\n✅ 没有发现需要修复的导入路径。');
    } else {
      console.log('\n✅ 导入路径规范化修复完成！');
      
      if (dryRun) {
        console.log('\n💡 这是预览模式，没有实际修改文件。');
        console.log('运行 `node scripts/import-path-normalizer.cjs --fix` 执行实际修复。');
      } else {
        console.log('\n🔍 建议后续操作:');
        console.log('1. 运行路径检查: npm run check:imports:precise');
        console.log('2. 运行 TypeScript 编译检查: npm run type-check');
        console.log('3. 测试应用启动: npm run dev');
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
  const normalizer = new ImportPathNormalizer();
  
  if (dryRun) {
    console.log('🔍 预览模式：显示将要修复的导入路径，不实际修改文件');
    console.log('使用 --fix 参数执行实际修复\n');
  }
  
  normalizer.execute(dryRun).catch(console.error);
}

module.exports = ImportPathNormalizer;
