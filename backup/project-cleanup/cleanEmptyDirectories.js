#!/usr/bin/env node

/**
 * 清理空目录工具
 */

import fs from 'fs';
import path from 'path';

class EmptyDirectoryCleaner {
  constructor() {
    this.projectRoot = process.cwd();
    this.protectedDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      '.nuxt',
      '.vscode',
      '.idea'
    ];
    this.emptyDirs = [];
  }

  /**
   * 查找空目录
   */
  findEmptyDirectories(dir = this.projectRoot) {
    try {
      const items = fs.readdirSync(dir);
      
      if (items.length === 0) {
        // 目录为空
        if (!this.isProtectedDir(dir)) {
          this.emptyDirs.push(dir);
        }
        return true;
      }

      let hasNonEmptySubdir = false;
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        
        if (this.isProtectedDir(fullPath)) {
          hasNonEmptySubdir = true;
          continue;
        }

        try {
          const stats = fs.statSync(fullPath);
          
          if (stats.isDirectory()) {
            const isEmpty = this.findEmptyDirectories(fullPath);
            if (!isEmpty) {
              hasNonEmptySubdir = true;
            }
          } else {
            hasNonEmptySubdir = true;
          }
        } catch (error) {
          // 忽略无法访问的文件/目录
          hasNonEmptySubdir = true;
        }
      }

      // 如果所有子目录都是空的，且没有文件，则当前目录也是空的
      if (!hasNonEmptySubdir && !this.isProtectedDir(dir) && dir !== this.projectRoot) {
        this.emptyDirs.push(dir);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查是否为受保护目录
   */
  isProtectedDir(dirPath) {
    const relativePath = path.relative(this.projectRoot, dirPath);
    return this.protectedDirs.some(protectedDir => 
      relativePath === protectedDir ||
      relativePath.startsWith(protectedDir + path.sep) ||
      relativePath.includes(path.sep + protectedDir + path.sep)
    );
  }

  /**
   * 清理空目录
   */
  cleanEmptyDirectories(dryRun = true) {
    console.log('📁 查找空目录...');
    
    this.emptyDirs = [];
    this.findEmptyDirectories();
    
    // 按深度排序，先删除深层目录
    this.emptyDirs.sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);
    
    console.log(`发现 ${this.emptyDirs.length} 个空目录`);
    
    if (this.emptyDirs.length === 0) {
      console.log('✅ 没有发现空目录');
      return;
    }

    for (const dir of this.emptyDirs) {
      try {
        if (dryRun) {
          console.log(`[预览] 将删除空目录: ${dir}`);
        } else {
          fs.rmdirSync(dir);
          console.log(`✅ 已删除空目录: ${dir}`);
        }
      } catch (error) {
        console.log(`❌ 删除失败: ${dir} - ${error.message}`);
      }
    }
  }

  /**
   * 运行清理
   */
  run(dryRun = true) {
    console.log('🧹 开始清理空目录...');
    console.log(`模式: ${dryRun ? '预览模式' : '实际清理'}`);
    console.log('='.repeat(50));
    
    this.cleanEmptyDirectories(dryRun);
    
    console.log('\n✅ 空目录清理完成！');
  }
}

// 命令行接口
function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
空目录清理工具

用法: node cleanEmptyDirectories.js [选项]

选项:
  --execute    实际执行清理（默认为预览模式）
  --help, -h   显示此帮助信息

示例:
  node cleanEmptyDirectories.js           # 预览模式
  node cleanEmptyDirectories.js --execute # 实际清理
`);
    return;
  }

  const cleaner = new EmptyDirectoryCleaner();
  cleaner.run(dryRun);
}

// 如果直接运行此脚本
if (process.argv[1] && process.argv[1].endsWith('cleanEmptyDirectories.js')) {
  main();
}

export default EmptyDirectoryCleaner;
