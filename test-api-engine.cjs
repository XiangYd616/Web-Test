/**
 * 测试API测试引擎的真实功能
 */

const ApiTestEngine = require('./backend/engines/api/apiTestEngine.js');

async function testApiEngine() {
  console.log('🔍 测试API测试引擎...\n');
  
  const apiEngine = new ApiTestEngine();
  
  // 测试单个API端点
  console.log('📡 测试单个API端点...');
  try {
    const result = await apiEngine.executeTest({
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      method: 'GET'
    });
    
    console.log('✅ API测试成功:');
    console.log('  - 状态码:', result.results.summary.statusCode);
    console.log('  - 响应时间:', result.results.summary.responseTime);
    console.log('  - 内容类型:', result.results.summary.contentType);
    console.log('  - 建议数量:', result.results.recommendations.length);
    
  } catch (error) {
    console.error('❌ API测试失败:', error.message);
  }
  
  console.log('\n📊 测试多个API端点...');
  try {
    const result = await apiEngine.executeTest({
      endpoints: [
        {
          url: 'https://jsonplaceholder.typicode.com/posts/1',
          method: 'GET'
        },
        {
          url: 'https://jsonplaceholder.typicode.com/users/1',
          method: 'GET'
        }
      ]
    });
    
    console.log('✅ 批量API测试成功:');
    console.log('  - 总端点数:', result.results.totalEndpoints);
    console.log('  - 成功率:', result.results.summary.successRate);
    console.log('  - 平均响应时间:', result.results.summary.averageResponseTime);
    console.log('  - 建议数量:', result.results.recommendations.length);
    
  } catch (error) {
    console.error('❌ 批量API测试失败:', error.message);
  }
  
  console.log('\n🧹 清理引擎资源...');
  await apiEngine.cleanup();
  
  console.log('\n🎉 API引擎测试完成！');
}

if (require.main === module) {
  testApiEngine().catch(console.error);
}

module.exports = testApiEngine;
