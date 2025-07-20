/**
 * 调试错误率计算脚本
 * 用于验证压力测试中错误率的计算和传递
 */

// 模拟压力测试数据
const mockMetrics = {
  totalRequests: 1000,
  successfulRequests: 722,
  failedRequests: 278,
  averageResponseTime: 343,
  throughput: 2.8,
  errors: []
};

console.log('🧪 调试错误率计算\n');

// 测试后端计算逻辑
function testBackendCalculation() {
  console.log('1️⃣ 后端计算逻辑测试:');
  console.log(`   总请求数: ${mockMetrics.totalRequests}`);
  console.log(`   失败请求数: ${mockMetrics.failedRequests}`);
  
  // 模拟后端计算（修复后的版本）
  let errorRate;
  if (mockMetrics.totalRequests > 0) {
    errorRate = parseFloat(((mockMetrics.failedRequests / mockMetrics.totalRequests) * 100).toFixed(2));
  } else {
    errorRate = 0;
  }
  
  console.log(`   计算的错误率: ${errorRate}%`);
  console.log(`   数据类型: ${typeof errorRate}`);
  console.log(`   预期结果: 27.8%\n`);
  
  return errorRate;
}

// 测试前端处理逻辑
function testFrontendProcessing(backendErrorRate) {
  console.log('2️⃣ 前端处理逻辑测试:');
  
  // 模拟前端接收到的数据
  const receivedData = {
    metrics: {
      ...mockMetrics,
      errorRate: backendErrorRate
    }
  };
  
  console.log(`   接收到的错误率: ${receivedData.metrics.errorRate}`);
  console.log(`   数据类型: ${typeof receivedData.metrics.errorRate}`);
  
  // 模拟前端处理逻辑（修复后的版本）
  const processedMetrics = {
    ...receivedData.metrics,
    errorRate: receivedData.metrics?.errorRate || 
      (receivedData.metrics?.totalRequests > 0 ? 
        parseFloat(((receivedData.metrics.failedRequests / receivedData.metrics.totalRequests) * 100).toFixed(2)) : 0)
  };
  
  console.log(`   处理后的错误率: ${processedMetrics.errorRate}`);
  console.log(`   数据类型: ${typeof processedMetrics.errorRate}`);
  console.log(`   显示格式: ${processedMetrics.errorRate.toFixed(1)}%\n`);
  
  return processedMetrics;
}

// 测试显示逻辑
function testDisplayLogic(processedMetrics) {
  console.log('3️⃣ 显示逻辑测试:');
  
  // 模拟显示组件的逻辑
  const errorRate = processedMetrics?.errorRate || 0;
  const displayValue = typeof errorRate === 'string' ? errorRate : errorRate.toFixed(1);
  
  console.log(`   错误率值: ${errorRate}`);
  console.log(`   显示值: ${displayValue}%`);
  console.log(`   是否为0: ${errorRate === 0}`);
  console.log(`   是否正确: ${errorRate === 27.8}\n`);
  
  return displayValue;
}

// 运行所有测试
function runAllTests() {
  console.log('🚀 开始错误率调试测试\n');
  console.log('='.repeat(50));
  
  const backendErrorRate = testBackendCalculation();
  const processedMetrics = testFrontendProcessing(backendErrorRate);
  const displayValue = testDisplayLogic(processedMetrics);
  
  console.log('='.repeat(50));
  console.log('📋 测试总结:');
  console.log(`✅ 后端计算: ${backendErrorRate}% (${typeof backendErrorRate})`);
  console.log(`✅ 前端处理: ${processedMetrics.errorRate}% (${typeof processedMetrics.errorRate})`);
  console.log(`✅ 最终显示: ${displayValue}%`);
  
  // 验证结果
  const isCorrect = backendErrorRate === 27.8 && processedMetrics.errorRate === 27.8;
  console.log(`\n🎯 结果验证: ${isCorrect ? '✅ 正确' : '❌ 错误'}`);
  
  if (!isCorrect) {
    console.log('❌ 可能的问题:');
    if (backendErrorRate !== 27.8) {
      console.log('   - 后端计算错误');
    }
    if (processedMetrics.errorRate !== 27.8) {
      console.log('   - 前端处理错误');
    }
  }
  
  console.log('\n💡 修复要点:');
  console.log('1. 后端使用 parseFloat() 确保返回数字类型');
  console.log('2. 前端添加备用计算逻辑');
  console.log('3. 显示时使用 toFixed(1) 格式化');
  console.log('4. 确保数据在整个链路中正确传递');
}

// 如果直接运行此脚本
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testBackendCalculation,
  testFrontendProcessing,
  testDisplayLogic,
  runAllTests
};
