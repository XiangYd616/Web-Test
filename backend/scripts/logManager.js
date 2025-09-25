/**
 * 日志管理脚本
 * 提供日志分析、清理、归档等功能
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// 日志目录
const LOG_DIR = path.join(__dirname, '../logs');
const ARCHIVE_DIR = path.join(LOG_DIR, 'archive');

// 确保目录存在
[LOG_DIR, ARCHIVE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * 日志管理器
 */
class LogManager {
  constructor() {
    this.logFiles = {
      error: path.join(LOG_DIR, 'error.log'),
      combined: path.join(LOG_DIR, 'combined.log'),
      access: path.join(LOG_DIR, 'access.log')
    };
  }

  /**
   * 分析日志文件
   */
  async analyzeLog(logType = 'error', lines = 100) {
    const logFile = this.logFiles[logType];
    
    if (!fs.existsSync(logFile)) {
      console.log(`❌ 日志文件不存在: ${logFile}`);
      return;
    }

    console.log(`📊 分析日志文件: ${logFile}`);

    try {
      // 读取最后N行
      const command = process.platform === 'win32' 
        ? `powershell "Get-Content '${logFile}' -Tail ${lines}"`
        : `tail -n ${lines} "${logFile}"`;
      
      const output = execSync(command, { encoding: 'utf8' });
      
      if (logType === 'error') {
        await this.analyzeErrorLog(output);
      } else {
      }
      
    } catch (error) {
      console.error('❌ 读取日志文件失败:', error.message);
    }
  }

  /**
   * 分析错误日志
   */
  async analyzeErrorLog(logContent) {
    const lines = logContent.split('\n').filter(line => line.trim());
    const errorStats = {
      total: 0,
      byType: {},
      byHour: {},
      topErrors: {}
    };

    for (const line of lines) {
      try {
        const logEntry = JSON.parse(line);
        errorStats.total++;

        // 按错误类型统计
        const errorType = logEntry.type || 'UNKNOWN';
        errorStats.byType[errorType] = (errorStats.byType[errorType] || 0) + 1;

        // 按小时统计
        const hour = new Date(logEntry.timestamp).getHours();
        errorStats.byHour[hour] = (errorStats.byHour[hour] || 0) + 1;

        // 统计最常见的错误
        const errorMessage = logEntry.message || 'Unknown error';
        errorStats.topErrors[errorMessage] = (errorStats.topErrors[errorMessage] || 0) + 1;

      } catch (parseError) {
        // 忽略无法解析的行
      }
    }

    // 显示统计结果
    console.log(`📊 错误统计 (总计: ${errorStats.total})`);
    Object.entries(errorStats.byType)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
      });

    Object.entries(errorStats.byHour)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([hour, count]) => {
        const bar = '█'.repeat(Math.ceil(count / errorStats.total * 20));
      });

    Object.entries(errorStats.topErrors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([message, count], index) => {
      });
  }

  /**
   * 清理旧日志
   */
  async cleanupLogs(daysToKeep = 7) {
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let cleanedFiles = 0;
    let totalSize = 0;

    try {
      const files = fs.readdirSync(LOG_DIR);
      
      for (const file of files) {
        const filePath = path.join(LOG_DIR, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile() && stats.mtime < cutoffDate) {
          totalSize += stats.size;
          fs.unlinkSync(filePath);
          cleanedFiles++;
        }
      }
      
      console.log(`✅ 清理完成: 删除 ${cleanedFiles} 个文件，释放 ${this.formatBytes(totalSize)} 空间`);
      
    } catch (error) {
      console.error('❌ 清理日志失败:', error.message);
    }
  }

  /**
   * 归档日志
   */
  async archiveLogs() {
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    let archivedFiles = 0;
    let totalSize = 0;

    try {
      for (const [logType, logFile] of Object.entries(this.logFiles)) {
        if (fs.existsSync(logFile)) {
          const stats = fs.statSync(logFile);
          const archiveFile = path.join(ARCHIVE_DIR, `${logType}-${timestamp}.log`);
          
          // 复制文件到归档目录
          fs.copyFileSync(logFile, archiveFile);
          
          // 清空原文件
          fs.writeFileSync(logFile, '');
          
          totalSize += stats.size;
          archivedFiles++;
        }
      }
      
      console.log(`✅ 归档完成: ${archivedFiles} 个文件，总计 ${this.formatBytes(totalSize)}`);
      
    } catch (error) {
      console.error('❌ 归档日志失败:', error.message);
    }
  }

  /**
   * 监控日志文件
   */
  async monitorLogs(logType = 'error') {
    const logFile = this.logFiles[logType];
    
    if (!fs.existsSync(logFile)) {
      console.log(`❌ 日志文件不存在: ${logFile}`);
      return;
    }


    // 监控文件变化
    fs.watchFile(logFile, (curr, prev) => {
      if (curr.mtime > prev.mtime) {
        // 读取新增内容
        const stream = fs.createReadStream(logFile, {
          start: prev.size,
          end: curr.size
        });

        const rl = readline.createInterface({
          input: stream,
          crlfDelay: Infinity
        });

        rl.on('line', (line) => {
          if (line.trim()) {
            try {
              const logEntry = JSON.parse(line);
              const timestamp = new Date(logEntry.timestamp).toLocaleString();
              const level = logEntry.level?.toUpperCase() || 'INFO';
              const message = logEntry.message || line;
              
            } catch {
            }
          }
        });
      }
    });

    // 保持进程运行
    process.stdin.resume();
  }

  /**
   * 获取日志统计信息
   */
  getLogStats() {
    console.log('📊 日志文件统计:');

    let totalSize = 0;
    let totalFiles = 0;

    for (const [logType, logFile] of Object.entries(this.logFiles)) {
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        const size = this.formatBytes(stats.size);
        const modified = stats.mtime.toLocaleString();
        
        
        totalSize += stats.size;
        totalFiles++;
      } else {
      }
    }

    // 检查归档目录
    if (fs.existsSync(ARCHIVE_DIR)) {
      const archiveFiles = fs.readdirSync(ARCHIVE_DIR);
      let archiveSize = 0;
      
      archiveFiles.forEach(file => {
        const filePath = path.join(ARCHIVE_DIR, file);
        const stats = fs.statSync(filePath);
        archiveSize += stats.size;
      });

    }

    console.log(`📊 总计: ${totalFiles} 个活跃日志文件，${this.formatBytes(totalSize)}`);
  }

  /**
   * 格式化字节数
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * 命令行接口
 */
async function main() {
  const command = process.argv[2];
  const logManager = new LogManager();
  
  switch (command) {
    case 'analyze':
      const logType = process.argv[3] || 'error';
      const lines = parseInt(process.argv[4]) || 100;
      await logManager.analyzeLog(logType, lines);
      break;
      
    case 'cleanup':
      const days = parseInt(process.argv[3]) || 7;
      await logManager.cleanupLogs(days);
      break;
      
    case 'archive':
      await logManager.archiveLogs();
      break;
      
    case 'monitor':
      const monitorType = process.argv[3] || 'error';
      await logManager.monitorLogs(monitorType);
      break;
      
    case 'stats':
      logManager.getLogStats();
      break;
      
    default:
📋 日志管理工具

使用方法:
  npm run logs:analyze [type] [lines]  - 分析日志 (默认: error 100)
  npm run logs:cleanup [days]          - 清理旧日志 (默认: 7天)
  npm run logs:archive                 - 归档当前日志
  npm run logs:monitor [type]          - 实时监控日志 (默认: error)
  npm run logs:stats                   - 显示日志统计

日志类型:
  - error: 错误日志
  - combined: 综合日志
  - access: 访问日志

示例:
  npm run logs:analyze error 50
  npm run logs:cleanup 30
  npm run logs:monitor combined
      `);
      break;
  }
}

// 运行命令行接口
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { LogManager };
