const fs = require('fs');
const path = require('path');

// 需要修复的文件列表
const targetFiles = [
  'frontend/services/cache/cacheManager.ts',
  'frontend/services/auth/authService.ts',
  'frontend/services/auth/core/secureStorage.ts',
  'frontend/services/auth/core/deviceFingerprint.ts',
  'frontend/services/auth/sessionManager.ts',
  'frontend/services/backgroundTestManager.ts',
  'frontend/hooks/useNotifications.ts',
  'frontend/hooks/useSEOTest.ts',
  'frontend/hooks/useDataVisualization.ts',
  'frontend/hooks/useCoreTestEngine.ts',
  'frontend/components/stress/StressTestRecordDetail.tsx',
  'frontend/components/ui/stories/ButtonStories.tsx',
  'frontend/components/ui/stories/InputStories.tsx'
];

// 修复Logger调用的正则模式
const patterns = [
  // Logger.error/warn/info('msg', error) => Logger.error/warn/info('msg', { error: String(error) })
  {
    pattern: /(Logger\.(error|warn|info))\((.*?),\s*(\w+)\s*\)/g,
    replacement: (match, loggerMethod, level, message, errorVar) => {
      // 检查是否已经是对象格式
      if (message.includes('{') || errorVar.includes('{')) {
        return match;
      }
      return `${loggerMethod}(${message}, { error: String(${errorVar}) })`;
    }
  }
];

function fixFile(filePath) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`文件不存在: ${filePath}`);
    return false;
  }

  try {
    // 读取文件内容,保持原始编码
    const content = fs.readFileSync(fullPath, 'utf8');
    let fixed = content;
    let changeCount = 0;

    // 应用修复模式
    patterns.forEach(({ pattern, replacement }) => {
      fixed = fixed.replace(pattern, (...args) => {
        changeCount++;
        return replacement(...args);
      });
    });

    // 如果有变化,写入文件
    if (changeCount > 0) {
      fs.writeFileSync(fullPath, fixed, 'utf8');
      console.log(`✅ ${filePath}: 修复了 ${changeCount} 个Logger调用`);
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

// 主函数
function main() {
  console.log('开始修复Logger调用...\n');
  
  let successCount = 0;
  let totalCount = 0;

  targetFiles.forEach(file => {
    totalCount++;
    if (fixFile(file)) {
      successCount++;
    }
  });

  console.log(`\n完成! 成功修复 ${successCount}/${totalCount} 个文件`);
}

main();

