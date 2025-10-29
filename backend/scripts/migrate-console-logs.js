/**
 * Console.log 迁移到 Winston Logger 自动化脚本
 * 
 * 用法:
 *   node scripts/migrate-console-logs.js <file-path> [--dry-run]
 * 
 * 示例:
 *   node scripts/migrate-console-logs.js routes/test.js --dry-run
 *   node scripts/migrate-console-logs.js routes/test.js
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * 日志级别映射规则
 */
const LOG_LEVEL_PATTERNS = {
  error: [
    /error/i,
    /failed/i,
    /fail/i,
    /exception/i,
    /critical/i,
    /fatal/i
  ],
  warn: [
    /warn/i,
    /warning/i,
    /deprecated/i,
    /caution/i
  ],
  info: [
    /info/i,
    /success/i,
    /complete/i,
    /start/i,
    /finish/i,
    /initialized/i
  ],
  debug: [
    /debug/i,
    /trace/i,
    /detail/i
  ]
};

/**
 * 检测日志级别
 */
function detectLogLevel(logContent) {
  const content = logContent.toLowerCase();
  
  // 检查每个级别的模式
  for (const [level, patterns] of Object.entries(LOG_LEVEL_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(content))) {
      return level;
    }
  }
  
  // 默认使用 info
  return 'info';
}

/**
 * 提取console.log的参数
 */
function extractLogArguments(line) {
  // 匹配 console.log(...) 或 console.error(...) 等
  const match = line.match(/console\.(log|error|warn|info|debug)\((.*)\);?/);
  if (!match) return null;
  
  const consoleMethod = match[1];
  const args = match[2];
  
  return { consoleMethod, args };
}

/**
 * 转换console.log到logger调用
 */
function transformToLogger(line, indentation) {
  const extracted = extractLogArguments(line);
  if (!extracted) return line;
  
  const { consoleMethod, args } = extracted;
  
  // 根据console方法映射日志级别
  let logLevel;
  switch (consoleMethod) {
    case 'error':
      logLevel = 'error';
      break;
    case 'warn':
      logLevel = 'warn';
      break;
    case 'debug':
      logLevel = 'debug';
      break;
    case 'info':
    case 'log':
    default:
      // 尝试从内容检测级别
      logLevel = detectLogLevel(args);
      break;
  }
  
  // 生成logger调用
  return `${indentation}logger.${logLevel}(${args});`;
}

/**
 * 检查文件是否已导入logger
 */
function hasLoggerImport(content) {
  return /const\s+logger\s*=\s*require\(['"]\.*\/utils\/logger['"]\)/.test(content) ||
         /import\s+.*logger.*from\s+['"]\.*\/utils\/logger['"]/.test(content);
}

/**
 * 添加logger导入
 */
function addLoggerImport(content) {
  // 查找最后一个require语句的位置
  const requireRegex = /const\s+\w+\s*=\s*require\([^)]+\);/g;
  const matches = [...content.matchAll(requireRegex)];
  
  if (matches.length > 0) {
    // 在最后一个require后添加
    const lastMatch = matches[matches.length - 1];
    const insertPos = lastMatch.index + lastMatch[0].length;
    return content.slice(0, insertPos) + 
           '\nconst logger = require(\'../utils/logger\');' +
           content.slice(insertPos);
  } else {
    // 在文件开头添加
    return 'const logger = require(\'../utils/logger\');\n\n' + content;
  }
}

/**
 * 迁移文件中的console.log
 */
async function migrateFile(filePath, dryRun = false) {
  const absolutePath = path.resolve(filePath);
  
  console.log(`\n📄 Processing: ${filePath}`);
  
  // 读取文件
  let content;
  try {
    content = await fs.readFile(absolutePath, 'utf-8');
  } catch (error) {
    console.error(`❌ Error reading file: ${error.message}`);
    return { success: false, error: error.message };
  }
  
  // 统计信息
  const stats = {
    totalLines: content.split('\n').length,
    consoleCalls: 0,
    migrated: 0
  };
  
  // 查找所有console调用
  const consoleRegex = /console\.(log|error|warn|info|debug)\(/g;
  const consoleMatches = [...content.matchAll(consoleRegex)];
  stats.consoleCalls = consoleMatches.length;
  
  if (stats.consoleCalls === 0) {
    console.log('✅ No console calls found');
    return { success: true, stats, changes: [] };
  }
  
  console.log(`Found ${stats.consoleCalls} console calls`);
  
  // 转换每一行
  const lines = content.split('\n');
  const changes = [];
  const newLines = lines.map((line, index) => {
    if (/console\.(log|error|warn|info|debug)\(/.test(line)) {
      const indentation = line.match(/^(\s*)/)[1];
      const newLine = transformToLogger(line, indentation);
      
      if (newLine !== line) {
        changes.push({
          lineNumber: index + 1,
          original: line.trim(),
          transformed: newLine.trim()
        });
        stats.migrated++;
        return newLine;
      }
    }
    return line;
  });
  
  let newContent = newLines.join('\n');
  
  // 添加logger导入(如果需要)
  if (stats.migrated > 0 && !hasLoggerImport(newContent)) {
    console.log('📦 Adding logger import');
    newContent = addLoggerImport(newContent);
  }
  
  // 显示变更
  console.log(`\n📊 Migration Summary:`);
  console.log(`   Total lines: ${stats.totalLines}`);
  console.log(`   Console calls found: ${stats.consoleCalls}`);
  console.log(`   Successfully migrated: ${stats.migrated}`);
  
  if (changes.length > 0) {
    console.log(`\n🔄 Changes:`);
    changes.forEach(change => {
      console.log(`   Line ${change.lineNumber}:`);
      console.log(`   - ${change.original}`);
      console.log(`   + ${change.transformed}`);
    });
  }
  
  // 写入文件或dry-run
  if (dryRun) {
    console.log('\n🔍 DRY RUN - No files were modified');
  } else {
    try {
      await fs.writeFile(absolutePath, newContent, 'utf-8');
      console.log('\n✅ File successfully updated');
    } catch (error) {
      console.error(`❌ Error writing file: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  return { success: true, stats, changes };
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Console.log Migration Script
=============================

Usage:
  node scripts/migrate-console-logs.js <file-path> [--dry-run]

Examples:
  node scripts/migrate-console-logs.js routes/test.js --dry-run
  node scripts/migrate-console-logs.js routes/test.js

Options:
  --dry-run    Show what would be changed without modifying files
    `);
    process.exit(1);
  }
  
  const filePath = args[0];
  const dryRun = args.includes('--dry-run');
  
  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode\n');
  }
  
  const result = await migrateFile(filePath, dryRun);
  
  if (!result.success) {
    console.error('\n❌ Migration failed');
    process.exit(1);
  }
  
  console.log('\n✅ Migration completed successfully');
}

// 执行脚本
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { migrateFile, detectLogLevel };

