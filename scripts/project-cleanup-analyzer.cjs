#!/usr/bin/env node

/**
 * 项目整理清理分析工具
 * 检查重复文件、缺失功能、冗余代码等
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ProjectCleanupAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.duplicateFiles = new Map();
    this.similarFiles = new Map();
    this.emptyFiles = [];
    this.largeFiles = [];
    this.unusedFiles = [];
    this.missingDependencies = [];
    this.redundantCode = [];
    this.statistics = {
      totalFiles: 0,
      duplicateGroups: 0,
      emptyFiles: 0,
      largeFiles: 0,
      unusedFiles: 0,
      totalSize: 0
    };
  }

  /**
   * 执行项目分析
   */
  async execute() {
    console.log('🔍 开始项目整理清理分析...\n');

    try {
      // 1. 扫描所有文件
      await this.scanAllFiles();
      
      // 2. 检查重复文件
      await this.findDuplicateFiles();
      
      // 3. 检查相似文件
      await this.findSimilarFiles();
      
      // 4. 检查空文件
      await this.findEmptyFiles();
      
      // 5. 检查大文件
      await this.findLargeFiles();
      
      // 6. 检查未使用文件
      await this.findUnusedFiles();
      
      // 7. 检查冗余代码
      await this.findRedundantCode();
      
      // 8. 生成报告
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 分析过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 扫描所有文件
   */
  async scanAllFiles() {
    console.log('📂 扫描项目文件...');

    const files = this.getAllFiles();
    this.statistics.totalFiles = files.length;

    for (const file of files) {
      try {
        const stat = fs.statSync(file);
        this.statistics.totalSize += stat.size;
      } catch (error) {
        // 忽略无法访问的文件
      }
    }

    console.log(`   发现 ${this.statistics.totalFiles} 个文件，总大小 ${this.formatSize(this.statistics.totalSize)}\n`);
  }

  /**
   * 查找重复文件
   */
  async findDuplicateFiles() {
    console.log('🔍 检查重复文件...');

    const files = this.getAllFiles();
    const hashMap = new Map();

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const hash = crypto.createHash('md5').update(content).digest('hex');
        
        if (!hashMap.has(hash)) {
          hashMap.set(hash, []);
        }
        hashMap.get(hash).push(file);
      } catch (error) {
        // 忽略无法读取的文件
      }
    }

    // 找出重复的文件组
    for (const [hash, fileList] of hashMap) {
      if (fileList.length > 1) {
        this.duplicateFiles.set(hash, fileList);
        this.statistics.duplicateGroups++;
      }
    }

    console.log(`   发现 ${this.statistics.duplicateGroups} 组重复文件\n`);
  }

  /**
   * 查找相似文件
   */
  async findSimilarFiles() {
    console.log('🔍 检查相似文件...');

    const files = this.getAllFiles().filter(f => /\.(ts|tsx|js|jsx)$/.test(f));
    const similarityThreshold = 0.8;

    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        try {
          const content1 = fs.readFileSync(files[i], 'utf8');
          const content2 = fs.readFileSync(files[j], 'utf8');
          
          const similarity = this.calculateSimilarity(content1, content2);
          if (similarity > similarityThreshold) {
            const key = `${files[i]}|${files[j]}`;
            this.similarFiles.set(key, {
              file1: files[i],
              file2: files[j],
              similarity: similarity
            });
          }
        } catch (error) {
          // 忽略无法读取的文件
        }
      }
    }

    console.log(`   发现 ${this.similarFiles.size} 对相似文件\n`);
  }

  /**
   * 查找空文件
   */
  async findEmptyFiles() {
    console.log('🔍 检查空文件...');

    const files = this.getAllFiles();

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8').trim();
        if (content.length === 0 || content.length < 10) {
          this.emptyFiles.push(file);
          this.statistics.emptyFiles++;
        }
      } catch (error) {
        // 忽略无法读取的文件
      }
    }

    console.log(`   发现 ${this.statistics.emptyFiles} 个空文件\n`);
  }

  /**
   * 查找大文件
   */
  async findLargeFiles() {
    console.log('🔍 检查大文件...');

    const files = this.getAllFiles();
    const sizeThreshold = 100 * 1024; // 100KB

    for (const file of files) {
      try {
        const stat = fs.statSync(file);
        if (stat.size > sizeThreshold) {
          this.largeFiles.push({
            file,
            size: stat.size
          });
          this.statistics.largeFiles++;
        }
      } catch (error) {
        // 忽略无法访问的文件
      }
    }

    // 按大小排序
    this.largeFiles.sort((a, b) => b.size - a.size);

    console.log(`   发现 ${this.statistics.largeFiles} 个大文件\n`);
  }

  /**
   * 查找未使用文件
   */
  async findUnusedFiles() {
    console.log('🔍 检查未使用文件...');

    const allFiles = this.getAllFiles();
    const codeFiles = allFiles.filter(f => /\.(ts|tsx|js|jsx)$/.test(f));
    const usedFiles = new Set();

    // 扫描所有导入语句
    for (const file of codeFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const imports = this.extractImports(content);
        
        for (const importPath of imports) {
          const resolvedPath = this.resolveImportPath(file, importPath);
          if (resolvedPath && fs.existsSync(resolvedPath)) {
            usedFiles.add(resolvedPath);
          }
        }
      } catch (error) {
        // 忽略无法读取的文件
      }
    }

    // 找出未被引用的文件
    for (const file of codeFiles) {
      if (!usedFiles.has(file) && !this.isEntryFile(file)) {
        this.unusedFiles.push(file);
        this.statistics.unusedFiles++;
      }
    }

    console.log(`   发现 ${this.statistics.unusedFiles} 个未使用文件\n`);
  }

  /**
   * 查找冗余代码
   */
  async findRedundantCode() {
    console.log('🔍 检查冗余代码...');

    const files = this.getAllFiles().filter(f => /\.(ts|tsx|js|jsx)$/.test(f));

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查重复的函数定义
        const functions = this.extractFunctions(content);
        const functionNames = functions.map(f => f.name);
        const duplicateFunctions = functionNames.filter((name, index) => 
          functionNames.indexOf(name) !== index
        );

        if (duplicateFunctions.length > 0) {
          this.redundantCode.push({
            file,
            type: 'duplicate_functions',
            items: duplicateFunctions
          });
        }

        // 检查未使用的导入
        const unusedImports = this.findUnusedImports(content);
        if (unusedImports.length > 0) {
          this.redundantCode.push({
            file,
            type: 'unused_imports',
            items: unusedImports
          });
        }

      } catch (error) {
        // 忽略无法读取的文件
      }
    }

    console.log(`   发现 ${this.redundantCode.length} 个冗余代码问题\n`);
  }

  /**
   * 计算文件相似度
   */
  calculateSimilarity(content1, content2) {
    const lines1 = content1.split('\n').filter(line => line.trim().length > 0);
    const lines2 = content2.split('\n').filter(line => line.trim().length > 0);
    
    const commonLines = lines1.filter(line => lines2.includes(line));
    const totalLines = Math.max(lines1.length, lines2.length);
    
    return totalLines > 0 ? commonLines.length / totalLines : 0;
  }

  /**
   * 提取导入语句
   */
  extractImports(content) {
    const imports = [];
    const patterns = [
      /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"`]([^'"`]+)['"`]/g,
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1].startsWith('.')) {
          imports.push(match[1]);
        }
      }
    });

    return imports;
  }

  /**
   * 提取函数定义
   */
  extractFunctions(content) {
    const functions = [];
    const patterns = [
      /function\s+(\w+)\s*\(/g,
      /const\s+(\w+)\s*=\s*(?:async\s+)?\(/g,
      /(\w+)\s*:\s*(?:async\s+)?function/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        functions.push({ name: match[1] });
      }
    });

    return functions;
  }

  /**
   * 查找未使用的导入
   */
  findUnusedImports(content) {
    const unusedImports = [];
    const importPattern = /import\s+\{([^}]+)\}\s+from\s+['"`][^'"`]+['"`]/g;
    
    let match;
    while ((match = importPattern.exec(content)) !== null) {
      const imports = match[1].split(',').map(imp => imp.trim());
      for (const imp of imports) {
        const cleanImport = imp.replace(/\s+as\s+\w+/, '');
        if (!content.includes(cleanImport) || content.indexOf(cleanImport) === content.indexOf(match[0])) {
          unusedImports.push(cleanImport);
        }
      }
    }

    return unusedImports;
  }

  /**
   * 解析导入路径
   */
  resolveImportPath(filePath, importPath) {
    const fileDir = path.dirname(filePath);
    let resolvedPath = path.resolve(fileDir, importPath);
    
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
      if (fs.existsSync(resolvedPath + ext)) {
        return resolvedPath + ext;
      }
    }
    
    for (const ext of extensions) {
      const indexPath = path.join(resolvedPath, 'index' + ext);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
    
    return null;
  }

  /**
   * 判断是否为入口文件
   */
  isEntryFile(filePath) {
    const entryPatterns = [
      /index\.(ts|tsx|js|jsx)$/,
      /main\.(ts|tsx|js|jsx)$/,
      /app\.(ts|tsx|js|jsx)$/,
      /App\.(ts|tsx|js|jsx)$/
    ];
    
    return entryPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * 获取所有文件
   */
  getAllFiles() {
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
          } else if (!this.shouldSkipFile(item)) {
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
      /node_modules/,
      /dist/,
      /build/,
      /\.git/,
      /\.DS_Store/,
      /Thumbs\.db/
    ];
    
    return skipPatterns.some(pattern => pattern.test(fileName));
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', '.vite', 'backup'];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * 格式化文件大小
   */
  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('📊 项目整理清理分析报告');
    console.log('='.repeat(60));
    
    console.log(`总文件数: ${this.statistics.totalFiles}`);
    console.log(`项目大小: ${this.formatSize(this.statistics.totalSize)}`);
    console.log(`重复文件组: ${this.statistics.duplicateGroups}`);
    console.log(`相似文件对: ${this.similarFiles.size}`);
    console.log(`空文件: ${this.statistics.emptyFiles}`);
    console.log(`大文件: ${this.statistics.largeFiles}`);
    console.log(`未使用文件: ${this.statistics.unusedFiles}`);
    console.log(`冗余代码问题: ${this.redundantCode.length}`);

    // 重复文件详情
    if (this.duplicateFiles.size > 0) {
      console.log('\n📋 重复文件详情:');
      let groupIndex = 1;
      for (const [hash, files] of this.duplicateFiles) {
        console.log(`\n重复组 ${groupIndex}:`);
        files.forEach(file => {
          console.log(`   ${path.relative(this.projectRoot, file)}`);
        });
        groupIndex++;
        if (groupIndex > 5) {
          console.log(`   ... 还有 ${this.duplicateFiles.size - 5} 组重复文件`);
          break;
        }
      }
    }

    // 相似文件详情
    if (this.similarFiles.size > 0) {
      console.log('\n📋 相似文件详情:');
      let count = 0;
      for (const [key, info] of this.similarFiles) {
        console.log(`\n相似度 ${(info.similarity * 100).toFixed(1)}%:`);
        console.log(`   ${path.relative(this.projectRoot, info.file1)}`);
        console.log(`   ${path.relative(this.projectRoot, info.file2)}`);
        count++;
        if (count >= 5) {
          console.log(`   ... 还有 ${this.similarFiles.size - 5} 对相似文件`);
          break;
        }
      }
    }

    // 空文件详情
    if (this.emptyFiles.length > 0) {
      console.log('\n📋 空文件详情:');
      this.emptyFiles.slice(0, 10).forEach(file => {
        console.log(`   ${path.relative(this.projectRoot, file)}`);
      });
      if (this.emptyFiles.length > 10) {
        console.log(`   ... 还有 ${this.emptyFiles.length - 10} 个空文件`);
      }
    }

    // 大文件详情
    if (this.largeFiles.length > 0) {
      console.log('\n📋 大文件详情:');
      this.largeFiles.slice(0, 10).forEach(item => {
        console.log(`   ${path.relative(this.projectRoot, item.file)} (${this.formatSize(item.size)})`);
      });
      if (this.largeFiles.length > 10) {
        console.log(`   ... 还有 ${this.largeFiles.length - 10} 个大文件`);
      }
    }

    // 未使用文件详情
    if (this.unusedFiles.length > 0) {
      console.log('\n📋 未使用文件详情:');
      this.unusedFiles.slice(0, 10).forEach(file => {
        console.log(`   ${path.relative(this.projectRoot, file)}`);
      });
      if (this.unusedFiles.length > 10) {
        console.log(`   ... 还有 ${this.unusedFiles.length - 10} 个未使用文件`);
      }
    }

    // 冗余代码详情
    if (this.redundantCode.length > 0) {
      console.log('\n📋 冗余代码详情:');
      this.redundantCode.slice(0, 5).forEach(item => {
        console.log(`   ${path.relative(this.projectRoot, item.file)}: ${item.type}`);
        if (item.items.length > 0) {
          console.log(`      ${item.items.slice(0, 3).join(', ')}`);
        }
      });
      if (this.redundantCode.length > 5) {
        console.log(`   ... 还有 ${this.redundantCode.length - 5} 个冗余代码问题`);
      }
    }

    console.log('\n💡 清理建议:');
    console.log('1. 删除重复文件，保留一个版本');
    console.log('2. 合并相似文件，提取公共代码');
    console.log('3. 删除空文件和未使用文件');
    console.log('4. 优化大文件，考虑拆分');
    console.log('5. 清理冗余代码和未使用导入');
    console.log('6. 建立代码复用机制');
  }
}

// 执行分析
if (require.main === module) {
  const analyzer = new ProjectCleanupAnalyzer();
  analyzer.execute().catch(console.error);
}

module.exports = ProjectCleanupAnalyzer;
