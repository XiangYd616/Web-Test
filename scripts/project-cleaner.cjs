#!/usr/bin/env node

/**
 * 项目清理工具
 * 自动清理未使用文件、冗余代码等
 */

const fs = require('fs');
const path = require('path');

class ProjectCleaner {
  constructor() {
    this.projectRoot = process.cwd();
    this.cleanedFiles = [];
    this.movedFiles = [];
    this.fixedFiles = [];
    this.statistics = {
      deletedFiles: 0,
      movedFiles: 0,
      fixedRedundancy: 0,
      savedSpace: 0
    };

    // 安全删除的文件模式
    this.safeToDeletePatterns = [
      // 测试文件（如果没有被引用）
      /\.(test|spec)\.(ts|tsx|js|jsx)$/,
      // 故事书文件
      /\.stories\.(ts|tsx|js|jsx)$/,
      // 备份文件
      /_backup\./,
      /_old\./,
      /_deprecated\./,
      // 临时文件
      /\.tmp$/,
      /\.temp$/,
      // 示例文件
      /example\./i,
      /sample\./i,
      // 重复的组件文件
      /_clean\./,
      /_new\./,
      /_refactored\./
    ];

    // 保护的重要文件
    this.protectedFiles = [
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'vite.config.ts',
      'tailwind.config.js',
      'index.html',
      'App.tsx',
      'main.tsx',
      'app.js',
      'server.js'
    ];
  }

  /**
   * 执行清理
   */
  async execute(dryRun = false) {
    console.log(`🧹 开始项目清理${dryRun ? ' (预览模式)' : ''}...\n`);

    try {
      // 1. 清理明显的重复文件
      await this.cleanDuplicateFiles(dryRun);
      
      // 2. 清理未使用的测试和示例文件
      await this.cleanUnusedTestFiles(dryRun);
      
      // 3. 清理冗余的导入
      await this.cleanRedundantImports(dryRun);
      
      // 4. 整理文件结构
      await this.organizeFileStructure(dryRun);
      
      // 5. 生成报告
      this.generateReport(dryRun);
      
    } catch (error) {
      console.error('❌ 清理过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 清理重复文件
   */
  async cleanDuplicateFiles(dryRun = false) {
    console.log('🔍 清理重复文件...');

    const files = this.getAllFiles();
    let cleanedCount = 0;

    for (const file of files) {
      const fileName = path.basename(file);
      
      // 检查是否为明显的重复文件
      if (this.isDuplicateFile(fileName)) {
        if (this.isSafeToDelete(file)) {
          if (!dryRun) {
            try {
              const stat = fs.statSync(file);
              fs.unlinkSync(file);
              this.statistics.savedSpace += stat.size;
            } catch (error) {
              console.warn(`无法删除文件 ${file}:`, error.message);
              continue;
            }
          }
          
          this.cleanedFiles.push(file);
          this.statistics.deletedFiles++;
          cleanedCount++;
          
          const action = dryRun ? '[预览删除]' : '✅ 删除';
          console.log(`   ${action} ${path.relative(this.projectRoot, file)}`);
        }
      }
    }

    console.log(`   清理了 ${cleanedCount} 个重复文件\n`);
  }

  /**
   * 清理未使用的测试和示例文件
   */
  async cleanUnusedTestFiles(dryRun = false) {
    console.log('🔍 清理未使用的测试和示例文件...');

    const files = this.getAllFiles();
    let cleanedCount = 0;

    for (const file of files) {
      if (this.isUnusedTestOrExampleFile(file)) {
        if (!dryRun) {
          try {
            const stat = fs.statSync(file);
            fs.unlinkSync(file);
            this.statistics.savedSpace += stat.size;
          } catch (error) {
            console.warn(`无法删除文件 ${file}:`, error.message);
            continue;
          }
        }
        
        this.cleanedFiles.push(file);
        this.statistics.deletedFiles++;
        cleanedCount++;
        
        const action = dryRun ? '[预览删除]' : '✅ 删除';
        console.log(`   ${action} ${path.relative(this.projectRoot, file)}`);
      }
    }

    console.log(`   清理了 ${cleanedCount} 个未使用文件\n`);
  }

  /**
   * 清理冗余的导入
   */
  async cleanRedundantImports(dryRun = false) {
    console.log('🔍 清理冗余的导入...');

    const files = this.getAllFiles().filter(f => /\.(ts|tsx|js|jsx)$/.test(f));
    let fixedCount = 0;

    for (const file of files) {
      try {
        const originalContent = fs.readFileSync(file, 'utf8');
        let modifiedContent = originalContent;
        let fileModified = false;

        // 移除未使用的导入
        const cleanedContent = this.removeUnusedImports(modifiedContent);
        if (cleanedContent !== modifiedContent) {
          modifiedContent = cleanedContent;
          fileModified = true;
        }

        // 移除重复的导入
        const deduplicatedContent = this.removeDuplicateImports(modifiedContent);
        if (deduplicatedContent !== modifiedContent) {
          modifiedContent = deduplicatedContent;
          fileModified = true;
        }

        if (fileModified) {
          if (!dryRun) {
            fs.writeFileSync(file, modifiedContent, 'utf8');
          }
          
          this.fixedFiles.push(file);
          this.statistics.fixedRedundancy++;
          fixedCount++;
          
          const action = dryRun ? '[预览修复]' : '✅ 修复';
          console.log(`   ${action} ${path.relative(this.projectRoot, file)}`);
        }
      } catch (error) {
        // 忽略无法处理的文件
      }
    }

    console.log(`   修复了 ${fixedCount} 个文件的冗余导入\n`);
  }

  /**
   * 整理文件结构
   */
  async organizeFileStructure(dryRun = false) {
    console.log('🔍 整理文件结构...');

    const files = this.getAllFiles();
    let movedCount = 0;

    for (const file of files) {
      const suggestedPath = this.getSuggestedPath(file);
      if (suggestedPath && suggestedPath !== file) {
        if (!dryRun) {
          try {
            // 确保目标目录存在
            const targetDir = path.dirname(suggestedPath);
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            
            // 移动文件
            fs.renameSync(file, suggestedPath);
          } catch (error) {
            console.warn(`无法移动文件 ${file}:`, error.message);
            continue;
          }
        }
        
        this.movedFiles.push({ from: file, to: suggestedPath });
        this.statistics.movedFiles++;
        movedCount++;
        
        const action = dryRun ? '[预览移动]' : '✅ 移动';
        console.log(`   ${action} ${path.relative(this.projectRoot, file)} → ${path.relative(this.projectRoot, suggestedPath)}`);
      }
    }

    console.log(`   整理了 ${movedCount} 个文件的位置\n`);
  }

  /**
   * 判断是否为重复文件
   */
  isDuplicateFile(fileName) {
    const duplicatePatterns = [
      /_clean\./,
      /_new\./,
      /_refactored\./,
      /_backup\./,
      /_old\./,
      /_copy\./,
      /_duplicate\./,
      /\s\(\d+\)\./,  // 文件名 (1).ext
      /_v\d+\./       // 文件名_v2.ext
    ];
    
    return duplicatePatterns.some(pattern => pattern.test(fileName));
  }

  /**
   * 判断是否为未使用的测试或示例文件
   */
  isUnusedTestOrExampleFile(file) {
    const fileName = path.basename(file);
    
    // 检查是否匹配安全删除模式
    if (!this.safeToDeletePatterns.some(pattern => pattern.test(fileName))) {
      return false;
    }
    
    // 检查是否为保护文件
    if (this.protectedFiles.includes(fileName)) {
      return false;
    }
    
    // 检查是否在重要目录中
    const relativePath = path.relative(this.projectRoot, file);
    const importantDirs = ['src', 'components', 'pages', 'services', 'utils', 'hooks'];
    const isInImportantDir = importantDirs.some(dir => relativePath.includes(dir));
    
    // 如果在重要目录中，需要更严格的检查
    if (isInImportantDir) {
      return this.isDefinitelyUnused(file);
    }
    
    return true;
  }

  /**
   * 判断文件是否确实未使用
   */
  isDefinitelyUnused(file) {
    const fileName = path.basename(file, path.extname(file));
    
    // 检查是否有对应的非测试文件
    const fileDir = path.dirname(file);
    const baseName = fileName.replace(/\.(test|spec)$/, '');
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    for (const ext of extensions) {
      const correspondingFile = path.join(fileDir, baseName + ext);
      if (fs.existsSync(correspondingFile)) {
        return false; // 有对应的实现文件，保留测试文件
      }
    }
    
    return true;
  }

  /**
   * 判断是否安全删除
   */
  isSafeToDelete(file) {
    const fileName = path.basename(file);
    
    // 检查是否为保护文件
    if (this.protectedFiles.includes(fileName)) {
      return false;
    }
    
    // 检查文件大小，避免删除大文件
    try {
      const stat = fs.statSync(file);
      if (stat.size > 50 * 1024) { // 50KB
        return false;
      }
    } catch (error) {
      return false;
    }
    
    return true;
  }

  /**
   * 移除未使用的导入
   */
  removeUnusedImports(content) {
    const lines = content.split('\n');
    const filteredLines = [];
    
    for (const line of lines) {
      // 检查是否为导入语句
      const importMatch = line.match(/import\s+\{([^}]+)\}\s+from\s+['"`]([^'"`]+)['"`]/);
      if (importMatch) {
        const imports = importMatch[1].split(',').map(imp => imp.trim());
        const usedImports = imports.filter(imp => {
          const cleanImport = imp.replace(/\s+as\s+\w+/, '');
          return content.split('\n').some((contentLine, index) => 
            index !== lines.indexOf(line) && contentLine.includes(cleanImport)
          );
        });
        
        if (usedImports.length > 0) {
          const newImportLine = line.replace(importMatch[1], usedImports.join(', '));
          filteredLines.push(newImportLine);
        }
        // 如果没有使用的导入，跳过这一行
      } else {
        filteredLines.push(line);
      }
    }
    
    return filteredLines.join('\n');
  }

  /**
   * 移除重复的导入
   */
  removeDuplicateImports(content) {
    const lines = content.split('\n');
    const seenImports = new Set();
    const filteredLines = [];
    
    for (const line of lines) {
      if (line.trim().startsWith('import ')) {
        if (!seenImports.has(line.trim())) {
          seenImports.add(line.trim());
          filteredLines.push(line);
        }
        // 跳过重复的导入
      } else {
        filteredLines.push(line);
      }
    }
    
    return filteredLines.join('\n');
  }

  /**
   * 获取建议的文件路径
   */
  getSuggestedPath(file) {
    const relativePath = path.relative(this.projectRoot, file);
    
    // 如果文件已经在合适的位置，返回null
    if (this.isInCorrectLocation(relativePath)) {
      return null;
    }
    
    // 根据文件类型建议新位置
    const fileName = path.basename(file);
    const fileExt = path.extname(file);
    
    // 测试文件应该在__tests__目录或与源文件同目录
    if (fileName.includes('.test.') || fileName.includes('.spec.')) {
      const baseName = fileName.replace(/\.(test|spec)/, '');
      const sourceDir = this.findSourceFileDirectory(baseName);
      if (sourceDir) {
        return path.join(sourceDir, fileName);
      }
    }
    
    return null;
  }

  /**
   * 判断文件是否在正确位置
   */
  isInCorrectLocation(relativePath) {
    // 大部分文件已经在合适的位置
    return true;
  }

  /**
   * 查找源文件目录
   */
  findSourceFileDirectory(baseName) {
    // 简化实现，返回null表示不移动
    return null;
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
      /Thumbs\.db/,
      /package-lock\.json/
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
  generateReport(dryRun = false) {
    console.log(`📊 项目清理报告${dryRun ? ' (预览)' : ''}`);
    console.log('='.repeat(50));
    
    console.log(`删除文件: ${this.statistics.deletedFiles}`);
    console.log(`移动文件: ${this.statistics.movedFiles}`);
    console.log(`修复冗余: ${this.statistics.fixedRedundancy}`);
    console.log(`节省空间: ${this.formatSize(this.statistics.savedSpace)}`);
    
    if (this.statistics.deletedFiles === 0 && this.statistics.movedFiles === 0 && this.statistics.fixedRedundancy === 0) {
      console.log('\n✅ 项目已经很整洁，无需清理。');
      return;
    }
    
    if (dryRun) {
      console.log('\n💡 这是预览模式，没有实际修改文件。');
      console.log('运行 `node scripts/project-cleaner.cjs --clean` 执行实际清理。');
    } else {
      console.log('\n✅ 项目清理完成！');
      
      console.log('\n🔍 建议后续操作:');
      console.log('1. 运行测试确保功能正常');
      console.log('2. 检查应用是否正常启动');
      console.log('3. 更新相关的导入语句');
      console.log('4. 提交代码变更');
    }
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const shouldClean = args.includes('--clean') || args.includes('-c');
const dryRun = !shouldClean;

// 执行清理
if (require.main === module) {
  const cleaner = new ProjectCleaner();
  
  if (dryRun) {
    console.log('🔍 预览模式：显示将要清理的内容，不实际修改文件');
    console.log('使用 --clean 参数执行实际清理\n');
  }
  
  cleaner.execute(dryRun).catch(console.error);
}

module.exports = ProjectCleaner;
