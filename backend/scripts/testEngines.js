/**
 * 测试引擎系统验证脚本
 * 
 * 用于验证测试引擎系统的功能是否正常工作
 * 
 * 运行方式: node backend/scripts/testEngines.js
 */

const { getTestEngineManager } = require('../engines/TestEngineManager');
const Logger = require('../utils/logger');

// 创建简单的控制台日志
console.log('\n🧪 测试引擎系统验证脚本');
console.log('='.repeat(50));

async function testEngines() {
  try {
    console.log('\n1️⃣  初始化测试引擎管理器...');
    const engineManager = getTestEngineManager();
    
    // 获取引擎列表
    console.log('\n2️⃣  获取引擎列表:');
    const engines = engineManager.getEngines();
    console.table(engines.map(e => ({
      名称: e.displayName,
      版本: e.version,
      可用: e.available ? '✅' : '❌',
      执行次数: e.stats.executions,
      成功率: e.stats.successRate + '%'
    })));
    
    // 获取统计信息
    console.log('\n3️⃣  引擎统计信息:');
    const stats = engineManager.getStatistics();
    console.log({
      总引擎数: stats.totalEngines,
      已加载: stats.loadedEngines,
      失败: stats.failedEngines,
      总执行次数: stats.totalExecutions,
      总失败次数: stats.totalFailures,
      成功率: stats.successRate + '%'
    });
    
    // 测试API引擎
    console.log('\n4️⃣  测试API引擎:');
    console.log('发送GET请求到 https://jsonplaceholder.typicode.com/posts/1');
    
    const apiResult = await engineManager.runTest('api', {
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      method: 'GET',
      testId: 'test-api-001',
      assertions: [
        { type: 'status', expected: 200 },
        { type: 'responseTime', max: 3000 },
        { type: 'json', path: '$.userId', expected: 1 }
      ]
    });
    
    console.log('测试结果:', {
      成功: apiResult.success ? '✅' : '❌',
      响应时间: apiResult.result?.responseTime + 'ms',
      状态码: apiResult.result?.summary?.statusCode,
      断言结果: apiResult.result?.validations?.passed ? '✅ 通过' : '❌ 失败'
    });
    
    if (apiResult.result?.validations?.results) {
      console.log('\n断言详情:');
      apiResult.result.validations.results.forEach((assertion, idx) => {
        console.log(`  ${idx + 1}. ${assertion.passed ? '✅' : '❌'} ${assertion.message}`);
      });
    }
    
    // 测试压力测试引擎
    console.log('\n5️⃣  测试压力测试引擎:');
    console.log('对 https://jsonplaceholder.typicode.com/posts 进行压力测试');
    console.log('配置: 3个并发用户, 持续5秒');
    
    const stressResult = await engineManager.runTest('stress', {
      url: 'https://jsonplaceholder.typicode.com/posts',
      duration: 5,
      concurrency: 3,
      testId: 'test-stress-001'
    });
    
    console.log('测试结果:', {
      成功: stressResult.success ? '✅' : '❌',
      总请求数: stressResult.result?.results?.totalRequests || 'N/A',
      成功请求: stressResult.result?.results?.successfulRequests || 'N/A',
      失败请求: stressResult.result?.results?.failedRequests || 'N/A',
      平均响应时间: stressResult.result?.results?.avgResponseTime + 'ms' || 'N/A',
      性能评级: stressResult.result?.analysis?.performance || 'N/A'
    });
    
    if (stressResult.result?.analysis?.recommendations) {
      console.log('\n建议:');
      stressResult.result.analysis.recommendations.forEach((rec, idx) => {
        console.log(`  ${idx + 1}. ${rec}`);
      });
    }
    
    // 最终统计
    console.log('\n6️⃣  最终引擎统计:');
    const finalStats = engineManager.getStatistics();
    console.log({
      总执行次数: finalStats.totalExecutions,
      总失败次数: finalStats.totalFailures,
      成功率: finalStats.successRate + '%'
    });
    
    console.log('\n✅ 测试引擎系统验证完成！');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ 测试过程中出错:', error);
    console.error('错误栈:', error.stack);
    process.exit(1);
  }
}

// 运行测试
testEngines().then(() => {
  console.log('\n🎉 所有测试完成！');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 测试失败:', error);
  process.exit(1);
});
