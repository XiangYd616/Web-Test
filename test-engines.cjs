/**
 * 测试引擎验证脚本
 * 验证所有引擎是否能正确加载和运行
 */

const path = require('path');
const fs = require('fs');

async function testEngines() {
  console.log('🧪 开始测试所有引擎...\n');
  
  const enginesDir = path.join(__dirname, 'backend', 'engines');
  const engineDirs = fs.readdirSync(enginesDir).filter(dir => 
    fs.statSync(path.join(enginesDir, dir)).isDirectory()
  );
  
  let totalEngines = 0;
  let successfulEngines = 0;
  let failedEngines = [];
  
  for (const engineDir of engineDirs) {
    const indexPath = path.join(enginesDir, engineDir, 'index.js');
    
    if (!fs.existsSync(indexPath)) {
      console.log(`⚠️  ${engineDir}: 缺少 index.js 文件`);
      continue;
    }
    
    totalEngines++;
    
    try {
      console.log(`📦 测试引擎: ${engineDir}`);
      
      // 尝试加载引擎
      const EngineClass = require(indexPath);
      
      if (!EngineClass) {
        throw new Error('引擎类未正确导出');
      }
      
      // 创建实例
      const engine = new EngineClass();
      
      // 验证必要的方法
      const requiredMethods = ['checkAvailability'];
      const missingMethods = [];
      
      for (const method of requiredMethods) {
        if (typeof engine[method] !== 'function') {
          missingMethods.push(method);
        }
      }
      
      if (missingMethods.length > 0) {
        throw new Error(`缺少方法: ${missingMethods.join(', ')}`);
      }
      
      // 测试 checkAvailability
      const availability = await engine.checkAvailability();
      
      if (!availability || typeof availability.available !== 'boolean') {
        throw new Error('checkAvailability 返回格式不正确');
      }
      
      console.log(`   ✅ ${engine.name} v${engine.version} - 可用性: ${availability.available}`);
      successfulEngines++;
      
    } catch (error) {
      console.log(`   ❌ ${engineDir}: ${error.message}`);
      failedEngines.push({ engine: engineDir, error: error.message });
    }
  }
  
  console.log('\n📊 测试结果:');
  console.log(`   总计: ${totalEngines} 个引擎`);
  console.log(`   成功: ${successfulEngines} 个引擎`);
  console.log(`   失败: ${failedEngines.length} 个引擎`);
  
  if (failedEngines.length > 0) {
    console.log('\n❌ 失败的引擎:');
    failedEngines.forEach(({ engine, error }) => {
      console.log(`   - ${engine}: ${error}`);
    });
  }
  
  console.log('\n🎉 引擎测试完成！');
  
  return {
    total: totalEngines,
    successful: successfulEngines,
    failed: failedEngines.length,
    failedEngines
  };
}

// 运行测试
if (require.main === module) {
  testEngines().catch(console.error);
}

module.exports = testEngines;
