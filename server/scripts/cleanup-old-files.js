/**
 * 清理旧文件和代码脚本
 * 删除不再使用的文件和遗留代码
 */

const fs = require('fs').promises;
const path = require('path');

async function cleanupOldFiles() {
  console.log('🧹 开始清理旧文件和代码...');
  console.log('=====================================');

  const filesToRemove = [
    // 旧的测试结果存储服务（已被数据库替代）
    'server/services/testResultStorage.js',
    
    // 旧的测试数据文件（已被数据库替代）
    'server/data/test-results.json',
    
    // 可能的其他遗留文件
    // 'server/scripts/old-test-history-schema.sql', // 如果存在的话
  ];

  const dirsToCheck = [
    // 检查是否有空的目录需要清理
    'server/data', // 如果只剩下GeoLite2文件，可能需要重新组织
  ];

  let removedCount = 0;
  let skippedCount = 0;

  // 删除文件
  for (const filePath of filesToRemove) {
    const fullPath = path.join(__dirname, '../../', filePath);
    
    try {
      await fs.access(fullPath);
      await fs.unlink(fullPath);
      console.log(`✅ 已删除: ${filePath}`);
      removedCount++;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`⏭️  跳过（不存在）: ${filePath}`);
        skippedCount++;
      } else {
        console.error(`❌ 删除失败: ${filePath} - ${error.message}`);
      }
    }
  }

  // 检查目录状态
  console.log('\n📁 检查目录状态...');
  for (const dirPath of dirsToCheck) {
    const fullPath = path.join(__dirname, '../../', dirPath);
    
    try {
      const files = await fs.readdir(fullPath);
      console.log(`📂 ${dirPath}: ${files.length} 个文件`);
      files.forEach(file => {
        console.log(`   - ${file}`);
      });
    } catch (error) {
      console.log(`❌ 无法读取目录: ${dirPath} - ${error.message}`);
    }
  }

  // 检查是否还有对旧表的引用
  console.log('\n🔍 检查剩余的旧表引用...');
  
  const searchPatterns = [
    'test_results',
    'test_history', // 旧的表名，应该都已经更新为test_sessions
  ];

  // 这里可以添加更多的检查逻辑
  console.log('   ℹ️  建议手动检查以下位置是否还有旧表引用：');
  console.log('   - docs/ 目录中的文档文件');
  console.log('   - 注释中的旧表名');
  console.log('   - 配置文件中的引用');

  console.log('\n📊 清理统计:');
  console.log(`   ✅ 已删除文件: ${removedCount} 个`);
  console.log(`   ⏭️  跳过文件: ${skippedCount} 个`);

  console.log('\n🎉 文件清理完成！');
  
  // 提供后续建议
  console.log('\n💡 后续建议:');
  console.log('1. 运行全面测试确保系统正常工作');
  console.log('2. 检查前端是否还有对旧API的调用');
  console.log('3. 更新部署脚本和文档');
  console.log('4. 考虑清理数据库中的旧表（如果存在）');
}

// 安全检查函数
async function safetyCheck() {
  console.log('🔒 执行安全检查...');
  
  // 检查是否在正确的项目目录
  const packageJsonPath = path.join(__dirname, '../../package.json');
  
  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    if (packageJson.name !== 'test-web-app') {
      throw new Error('不在正确的项目目录中');
    }
    console.log('✅ 项目目录验证通过');
  } catch (error) {
    console.error('❌ 安全检查失败:', error.message);
    console.error('请确保在正确的项目根目录中运行此脚本');
    process.exit(1);
  }
}

async function main() {
  try {
    await safetyCheck();
    await cleanupOldFiles();
  } catch (error) {
    console.error('❌ 清理过程中发生错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { cleanupOldFiles, safetyCheck };
