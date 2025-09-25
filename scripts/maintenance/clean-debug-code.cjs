#!/usr/bin/env node

/**
 * 清理调试代码和不必要的Console.log语句
 * 智能识别和清理调试代码，保留必要的日志
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 保留的console.log模式（重要的应用日志）
const KEEP_PATTERNS = [
  /console\.log\(['"`]✅/,           // 成功日志
  /console\.log\(['"`]❌/,           // 错误日志  
  /console\.log\(['"`]⚠️/,           // 警告日志
  /console\.log\(['"`]🔧/,           // 配置日志
  /console\.log\(['"`]🚀/,           // 启动日志
  /console\.log\(['"`]📊/,           // 统计日志
  /console\.log\(['"`]🔍/,           // 搜索日志
  /console\.log\(['"`]Server/,       // 服务器启动日志
  /console\.log\(['"`]Database/,     // 数据库连接日志
  /console\.log\(['"`]API server/,   // API服务器日志
  /console\.log\(['"`]Listening/,    // 监听端口日志
  /console\.error/,                  // 错误日志保留
  /console\.warn/,                   // 警告日志保留
  /console\.info/,                   // 信息日志保留
];

// 需要清理的文件模式
const CLEAN_FILE_PATTERNS = [
  '**/*.js',
  '**/*.ts',
  '**/*.jsx', 
  '**/*.tsx'
];

// 排除的目录
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'docs',
  'DEEP_ERROR_CHECK_SUCCESS_REPORT.md'
];

class DebugCleaner {
  constructor() {
    this.stats = {
      filesScanned: 0,
      filesModified: 0,
      consoleLogsRemoved: 0,
      linesRemoved: 0
    };
    this.projectRoot = path.resolve(__dirname, '../../');
  }

  /**
   * 检查是否应该保留这行console.log
   */
  shouldKeepConsoleLine(line) {
    return KEEP_PATTERNS.some(pattern => pattern.test(line));
  }

  /**
   * 清理单个文件
   */
  cleanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const cleanedLines = [];
      let modified = false;
      let removedInThisFile = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 检查是否是console.log行
        if (line.includes('console.log') && line.trim().startsWith('console.log')) {
          if (this.shouldKeepConsoleLine(line)) {
            cleanedLines.push(line);
          } else {
            // 移除这行调试代码
            modified = true;
            removedInThisFile++;
            this.stats.consoleLogsRemoved++;
            this.stats.linesRemoved++;
            continue;
          }
        } else if (line.includes('console.log') && !this.shouldKeepConsoleLine(line)) {
          // 处理行内的console.log
          const cleanedLine = line.replace(/console\.log\([^)]*\);?\s*/g, '');
          if (cleanedLine.trim() !== line.trim()) {
            modified = true;
            removedInThisFile++;
            this.stats.consoleLogsRemoved++;
          }
          if (cleanedLine.trim()) {
            cleanedLines.push(cleanedLine);
          } else {
            this.stats.linesRemoved++;
          }
        } else {
          cleanedLines.push(line);
        }
      }

      if (modified) {
        const cleanedContent = cleanedLines.join('\n');
        fs.writeFileSync(filePath, cleanedContent, 'utf8');
        this.stats.filesModified++;
        
        console.log(`🧹 清理了 ${path.relative(this.projectRoot, filePath)}: 移除${removedInThisFile}个console.log`);
      }
      
      this.stats.filesScanned++;
      
    } catch (error) {
      console.error(`❌ 清理文件失败 ${filePath}:`, error.message);
    }
  }

  /**
   * 递归扫描目录
   */
  scanDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          if (!EXCLUDE_DIRS.includes(item) && !item.startsWith('.')) {
            this.scanDirectory(itemPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(itemPath);
          if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
            this.cleanFile(itemPath);
          }
        }
      }
    } catch (error) {
      console.error(`❌ 扫描目录失败 ${dir}:`, error.message);
    }
  }

  /**
   * 运行清理
   */
  async run() {
    console.log('🚀 开始清理调试代码...\n');
    
    const startTime = Date.now();
    
    // 扫描项目目录
    this.scanDirectory(this.projectRoot);
    
    const duration = Date.now() - startTime;
    
    // 输出统计结果
    this.printReport(duration);
  }

  /**
   * 打印清理报告
   */
  printReport(duration) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 调试代码清理报告');
    console.log('='.repeat(60));
    console.log(`📁 扫描文件数量: ${this.stats.filesScanned}`);
    console.log(`📝 修改文件数量: ${this.stats.filesModified}`);
    console.log(`🧹 移除console.log: ${this.stats.consoleLogsRemoved}个`);
    console.log(`📄 删除空行数量: ${this.stats.linesRemoved}行`);
    console.log(`⏱️  清理用时: ${(duration/1000).toFixed(2)}秒`);
    
    if (this.stats.filesModified > 0) {
      console.log('\n✅ 调试代码清理完成！');
      console.log('📝 建议运行以下命令检查是否有语法错误:');
      console.log('   npm run test:syntax');
    } else {
      console.log('\n🎉 未发现需要清理的调试代码！');
    }
    
    // 评分
    let score = 100;
    if (this.stats.consoleLogsRemoved > 100) score -= 20;
    else if (this.stats.consoleLogsRemoved > 50) score -= 10;
    else if (this.stats.consoleLogsRemoved > 20) score -= 5;
    
    console.log(`\n🏆 代码整洁度评分: ${score}/100`);
    console.log('='.repeat(60));
  }
}

// 运行清理
if (require.main === module) {
  const cleaner = new DebugCleaner();
  cleaner.run().catch(console.error);
}

module.exports = DebugCleaner;
