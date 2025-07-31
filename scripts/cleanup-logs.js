/**
 * 日志清理脚本
 * 
 * 将项目中的console.log调用替换为统一的Logger调用
 */

const fs = require('fs');
const path = require('path');

// 需要处理的文件模式
const FILE_PATTERNS = [
  'server/**/*.js',
  'src/**/*.ts',
  'src/**/*.tsx'
];

// 排除的文件和目录
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'logs',
  'scripts/cleanup-logs.js'
];

// 日志替换映射
const LOG_REPLACEMENTS = [
  {
    pattern: /console\.error\(['"`]([^'"`]+)['"`],?\s*([^)]*)\)/g,
    replacement: "Logger.error('$1', $2)"
  },
  {
    pattern: /console\.warn\(['"`]([^'"`]+)['"`],?\s*([^)]*)\)/g,
    replacement: "Logger.warn('$1', $2)"
  },
  {
    pattern: /console\.info\(['"`]([^'"`]+)['"`],?\s*([^)]*)\)/g,
    replacement: "Logger.info('$1', $2)"
  },
  {
    pattern: /console\.log\(['"`]([^'"`]+)['"`],?\s*([^)]*)\)/g,
    replacement: "Logger.debug('$1', $2)"
  },
  // 处理模板字符串
  {
    pattern: /console\.error\(`([^`]+)`,?\s*([^)]*)\)/g,
    replacement: "Logger.error(`$1`, $2)"
  },
  {
    pattern: /console\.warn\(`([^`]+)`,?\s*([^)]*)\)/g,
    replacement: "Logger.warn(`$1`, $2)"
  },
  {
    pattern: /console\.info\(`([^`]+)`,?\s*([^)]*)\)/g,
    replacement: "Logger.info(`$1`, $2)"
  },
  {
    pattern: /console\.log\(`([^`]+)`,?\s*([^)]*)\)/g,
    replacement: "Logger.debug(`$1`, $2)"
  }
];

// 需要添加Logger导入的文件
const LOGGER_IMPORT = "const Logger = require('../utils/logger');";
const LOGGER_IMPORT_TS = "import Logger from '../utils/logger';";

/**
 * 递归获取所有匹配的文件
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 检查是否应该排除此目录
      if (!EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern))) {
        getAllFiles(filePath, fileList);
      }
    } else {
      // 检查文件扩展名
      if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx')) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

/**
 * 检查文件是否需要Logger导入
 */
function needsLoggerImport(content) {
  return content.includes('Logger.') && !content.includes('require(') && !content.includes('import Logger');
}

/**
 * 添加Logger导入
 */
function addLoggerImport(content, filePath) {
  const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  const importStatement = isTypeScript ? LOGGER_IMPORT_TS : LOGGER_IMPORT;
  
  // 查找合适的位置插入导入语句
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // 寻找最后一个require/import语句的位置
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('require(') || lines[i].includes('import ')) {
      insertIndex = i + 1;
    }
    // 如果遇到第一个非导入语句，停止搜索
    if (lines[i].trim() && !lines[i].includes('require(') && !lines[i].includes('import ') && !lines[i].startsWith('//') && !lines[i].startsWith('/*')) {
      break;
    }
  }
  
  lines.splice(insertIndex, 0, importStatement);
  return lines.join('\n');
}

/**
 * 处理单个文件
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 应用日志替换
    LOG_REPLACEMENTS.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    // 如果修改了内容且需要Logger导入，添加导入语句
    if (modified && needsLoggerImport(content)) {
      content = addLoggerImport(content, filePath);
    }
    
    // 写回文件
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 已处理: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ 处理文件失败: ${filePath}`, error.message);
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始清理日志调用...');
  
  const projectRoot = path.resolve(__dirname, '..');
  const allFiles = getAllFiles(projectRoot);
  
  let processedCount = 0;
  let modifiedCount = 0;
  
  allFiles.forEach(filePath => {
    processedCount++;
    if (processFile(filePath)) {
      modifiedCount++;
    }
  });
  
  console.log(`\n📊 处理完成:`);
  console.log(`   - 总文件数: ${processedCount}`);
  console.log(`   - 修改文件数: ${modifiedCount}`);
  console.log(`   - 未修改文件数: ${processedCount - modifiedCount}`);
  
  if (modifiedCount > 0) {
    console.log(`\n⚠️  注意: 请确保在修改的文件中正确导入了Logger模块`);
    console.log(`   - JavaScript文件: const Logger = require('../utils/logger');`);
    console.log(`   - TypeScript文件: import Logger from '../utils/logger';`);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  processFile,
  getAllFiles,
  LOG_REPLACEMENTS
};
