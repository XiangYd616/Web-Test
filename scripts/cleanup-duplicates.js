#!/usr/bin/env node

/**
 * 代码重复文件清理脚本
 * 用于清理项目中的重复、备份和占位符文件
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 开始代码清理...\n');

// 项目根目录
const projectRoot = process.cwd();

// 需要清理的文件模式
const cleanupPatterns = {
  // 备份文件
  backupFiles: [
    '**/SecurityAnalyzer.backup.js',
    '**/backup.js',
    '**/*.backup.*',
  ],
  
  // 占位符和空文件
  placeholderFiles: [
    'frontend/services/advancedDataService.ts',
  ],
  
  // 重复的增强版文件（需要手动确认）
  duplicateFiles: [
    'frontend/services/api/enhancedApiService.ts',
    'frontend/services/auth/enhancedAuthManager.ts',
    'frontend/services/auth/enhancedJwtManager.ts',
    'backend/services/testing/enhancedTestExecutionService.js',
  ]
};

// 文件分析结果
const analysis = {
  backup: [],
  placeholder: [],
  duplicate: [],
  total: 0
};

/**
 * 检查文件是否存在
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * 获取文件大小
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * 检查文件是否为占位符
 */
function isPlaceholderFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // 检查是否包含占位符关键词
    const placeholderKeywords = [
      'placeholder',
      '占位符',
      '临时',
      'TODO',
      'FIXME',
      '自动生成的基础类型文件'
    ];
    
    return placeholderKeywords.some(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    ) || lines.length < 10; // 文件内容太少也认为是占位符
  } catch (error) {
    return false;
  }
}

/**
 * 分析备份文件
 */
function analyzeBackupFiles() {
  console.log('🔍 分析备份文件...');
  
  const backupFiles = [
    'backend/engines/security/SecurityAnalyzer.backup.js',
    'backend/routes/backup.js',
    'scripts/backup.sh',
    'scripts/backend/backup-database.js'
  ];
  
  backupFiles.forEach(file => {
    const filePath = path.join(projectRoot, file);
    if (fileExists(filePath)) {
      analysis.backup.push({
        path: file,
        size: getFileSize(filePath),
        type: 'backup'
      });
    }
  });
  
  console.log(`   找到 ${analysis.backup.length} 个备份文件`);
}

/**
 * 分析占位符文件
 */
function analyzePlaceholderFiles() {
  console.log('🔍 分析占位符文件...');
  
  const placeholderCandidates = [
    'frontend/services/advancedDataService.ts',
    'backend/services/dataManagement/backupService.js'
  ];
  
  placeholderCandidates.forEach(file => {
    const filePath = path.join(projectRoot, file);
    if (fileExists(filePath) && isPlaceholderFile(filePath)) {
      analysis.placeholder.push({
        path: file,
        size: getFileSize(filePath),
        type: 'placeholder'
      });
    }
  });
  
  console.log(`   找到 ${analysis.placeholder.length} 个占位符文件`);
}

/**
 * 分析重复文件
 */
function analyzeDuplicateFiles() {
  console.log('🔍 分析重复文件...');
  
  const duplicateCandidates = [
    'frontend/services/api/enhancedApiService.ts',
    'frontend/services/auth/enhancedAuthManager.ts',  
    'frontend/services/auth/enhancedJwtManager.ts',
    'backend/services/testing/enhancedTestExecutionService.js'
  ];
  
  duplicateCandidates.forEach(file => {
    const filePath = path.join(projectRoot, file);
    if (fileExists(filePath)) {
      analysis.duplicate.push({
        path: file,
        size: getFileSize(filePath),
        type: 'duplicate'
      });
    }
  });
  
  console.log(`   找到 ${analysis.duplicate.length} 个重复文件`);
}

/**
 * 显示分析结果
 */
function displayAnalysis() {
  console.log('\n📊 分析结果:');
  console.log('=' .repeat(60));
  
  analysis.total = analysis.backup.length + analysis.placeholder.length + analysis.duplicate.length;
  
  if (analysis.total === 0) {
    console.log('✅ 没有发现需要清理的文件');
    return;
  }
  
  // 备份文件
  if (analysis.backup.length > 0) {
    console.log(`\n🗂️  备份文件 (${analysis.backup.length} 个):`);
    analysis.backup.forEach(file => {
      console.log(`   📄 ${file.path} (${(file.size / 1024).toFixed(1)}KB)`);
    });
  }
  
  // 占位符文件
  if (analysis.placeholder.length > 0) {
    console.log(`\n📝 占位符文件 (${analysis.placeholder.length} 个):`);
    analysis.placeholder.forEach(file => {
      console.log(`   📄 ${file.path} (${(file.size / 1024).toFixed(1)}KB)`);
    });
  }
  
  // 重复文件
  if (analysis.duplicate.length > 0) {
    console.log(`\n🔄 重复文件 (${analysis.duplicate.length} 个):`);
    analysis.duplicate.forEach(file => {
      console.log(`   📄 ${file.path} (${(file.size / 1024).toFixed(1)}KB)`);
    });
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`📈 总计: ${analysis.total} 个文件需要清理`);
}

/**
 * 生成清理建议
 */
function generateRecommendations() {
  console.log('\n💡 清理建议:');
  console.log('=' .repeat(60));
  
  if (analysis.backup.length > 0) {
    console.log('\n🗂️  备份文件建议:');
    console.log('   ✅ 可以安全删除，这些是临时备份文件');
    console.log('   ⚠️  删除前确认没有重要的未提交更改');
  }
  
  if (analysis.placeholder.length > 0) {
    console.log('\n📝 占位符文件建议:');
    console.log('   ✅ 可以删除占位符文件');
    console.log('   ⚠️  检查是否有其他文件依赖这些导出');
  }
  
  if (analysis.duplicate.length > 0) {
    console.log('\n🔄 重复文件建议:');
    console.log('   ⚠️  需要仔细评估，合并有用的功能到主文件');
    console.log('   📋 建议的合并策略:');
    console.log('      • enhancedApiService.ts → apiService.ts (合并功能)');
    console.log('      • enhancedAuthManager.ts → authService.ts (合并功能)');
    console.log('      • enhancedTestExecutionService.js → testService.js (合并功能)');
  }
}

/**
 * 生成清理脚本
 */
function generateCleanupScript() {
  console.log('\n🛠️  生成清理脚本...');
  
  const scriptContent = `#!/bin/bash
# 自动生成的清理脚本
# 执行前请确保已备份重要代码

echo "🧹 开始执行清理..."

# 备份文件清理
${analysis.backup.map(file => `rm -f "${file.path}"`).join('\n')}

# 占位符文件清理  
${analysis.placeholder.map(file => `rm -f "${file.path}"`).join('\n')}

echo "✅ 清理完成!"
echo "⚠️  重复文件需要手动处理，请参考清理计划文档"
`;

  const scriptPath = path.join(projectRoot, 'cleanup-auto.sh');
  fs.writeFileSync(scriptPath, scriptContent);
  
  console.log(`   📄 清理脚本已生成: cleanup-auto.sh`);
  console.log(`   🔧 执行命令: chmod +x cleanup-auto.sh && ./cleanup-auto.sh`);
}

/**
 * 主函数
 */
function main() {
  console.log('📍 项目路径:', projectRoot);
  console.log('');
  
  // 执行分析
  analyzeBackupFiles();
  analyzePlaceholderFiles(); 
  analyzeDuplicateFiles();
  
  // 显示结果
  displayAnalysis();
  generateRecommendations();
  generateCleanupScript();
  
  console.log('\n🎯 下一步:');
  console.log('1. 查看清理计划: docs/CODE_CLEANUP_PLAN.md');
  console.log('2. 执行自动清理: ./cleanup-auto.sh (可选)');
  console.log('3. 手动处理重复文件 (推荐)');
  console.log('4. 运行测试验证: yarn test');
  
  console.log('\n✨ 清理分析完成!');
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  analyzeBackupFiles,
  analyzePlaceholderFiles,
  analyzeDuplicateFiles,
  analysis
};
