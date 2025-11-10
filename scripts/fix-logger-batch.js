const fs = require('fs');
const path = require('path');

// 需要修复的文件列表 (从grep结果中提取)
const targetFiles = [
  'frontend/services/auth/sessionManager.ts',
  'frontend/services/backgroundTestManager.ts',
  'frontend/services/cache/cacheService.ts',
  'frontend/services/googlePageSpeedService.ts',
  'frontend/services/monitoringService.ts',
  'frontend/services/performance/performanceTestCore.ts',
  'frontend/services/proxyService.ts',
  'frontend/services/api/baseApiService.ts',
  'frontend/services/api/errorHandler.ts',
];

function fixLoggerCalls(content) {
  let fixed = content;
  let changeCount = 0;

  // 修复模式: Logger.xxx('msg', error) => Logger.xxx('msg', { error: String(error) })
  // 只匹配简单的变量名,避免匹配已经是对象的情况
  const patterns = [
    // Logger.error/warn/info('...', variableName)
    {
      regex: /(Logger\.(error|warn|info|debug))\(([^,]+),\s*(\w+)\s*\)/g,
      replacement: (match, loggerMethod, level, message, errorVar) => {
        // 检查是否已经是对象格式
        if (message.includes('{') || errorVar.includes('{')) {
          return match;
        }
        changeCount++;
        return `${loggerMethod}(${message}, { error: String(${errorVar}) })`;
      }
    }
  ];

  patterns.forEach(({ regex, replacement }) => {
    fixed = fixed.replace(regex, replacement);
  });

  return { fixed, changeCount };
}

function processFile(filePath) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  文件不存在: ${filePath}`);
    return false;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const { fixed, changeCount } = fixLoggerCalls(content);

    if (changeCount > 0) {
      // 备份原文件
      const backupPath = fullPath + '.backup';
      fs.writeFileSync(backupPath, content, 'utf8');
      
      // 写入修复后的内容
      fs.writeFileSync(fullPath, fixed, 'utf8');
      console.log(`✅ ${filePath}: 修复了 ${changeCount} 个Logger调用 (已备份)`);
      return true;
    } else {
      console.log(`⏭️  ${filePath}: 无需修复`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${filePath}: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('开始批量修复Logger调用...\n');
  console.log(`目标文件数: ${targetFiles.length}\n`);
  
  let successCount = 0;
  let totalCount = 0;

  targetFiles.forEach(file => {
    totalCount++;
    if (processFile(file)) {
      successCount++;
    }
  });

  console.log(`\n完成! 成功修复 ${successCount}/${totalCount} 个文件`);
  console.log('\n提示: 所有修改的文件都已备份为 .backup 文件');
  console.log('如果需要回滚,可以运行: node scripts/restore-backup.js');
}

main();

