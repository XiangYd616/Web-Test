/**
 * 快速引擎测试
 * 简单验证引擎基本功能
 */

const path = require('path');

async function testEngine(engineName) {
  console.log(`🔧 测试 ${engineName} 引擎...`);
  
  try {
    // 加载引擎
    const EnginePath = path.join(__dirname, '..', 'backend', 'engines', engineName, `${engineName}TestEngine.js`);
    const EngineClass = require(EnginePath);
    const engine = new EngineClass();
    
    console.log('   ✅ 引擎加载成功');
    
    // 测试实例化
    if (engine.name === engineName) {
      console.log('   ✅ 实例化正确');
    } else {
      console.log('   ❌ 实例化错误');
      return false;
    }
    
    // 测试方法存在性
    const requiredMethods = ['validateConfig', 'checkAvailability'];
    const testMethod = `run${engineName.charAt(0).toUpperCase() + engineName.slice(1)}Test`;
    requiredMethods.push(testMethod);
    
    for (const method of requiredMethods) {
      if (typeof engine[method] === 'function') {
        console.log(`   ✅ 方法 ${method} 存在`);
      } else {
        console.log(`   ❌ 方法 ${method} 缺失`);
        return false;
      }
    }
    
    // 测试配置验证
    try {
      const config = engine.validateConfig({ url: 'https://example.com' });
      console.log('   ✅ 配置验证正常');
    } catch (error) {
      console.log(`   ❌ 配置验证失败: ${error.message}`);
      return false;
    }
    
    // 测试可用性检查
    try {
      const availability = await engine.checkAvailability();
      console.log(`   ✅ 可用性检查: ${availability.available ? '可用' : '不可用'}`);
    } catch (error) {
      console.log(`   ⚠️ 可用性检查异常: ${error.message}`);
    }
    
    console.log(`   🎉 ${engineName} 引擎测试通过\n`);
    return true;
    
  } catch (error) {
    console.log(`   ❌ ${engineName} 引擎测试失败: ${error.message}\n`);
    return false;
  }
}

async function testAllEngines() {
  console.log('🧪 快速测试所有引擎...\n');
  
  const engines = ['api', 'seo', 'security', 'stress', 'infrastructure', 'website'];
  let passed = 0;
  
  for (const engine of engines) {
    const result = await testEngine(engine);
    if (result) passed++;
  }
  
  console.log(`📊 测试结果: ${passed}/${engines.length} 引擎通过`);
  
  if (passed === engines.length) {
    console.log('🎉 所有引擎基本功能正常！');
  } else {
    console.log('⚠️ 部分引擎需要检查');
  }
}

// 执行测试
testAllEngines().catch(console.error);
