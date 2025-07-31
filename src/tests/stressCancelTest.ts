/**
 * 压力测试取消功能完整性测试
 * 验证取消功能在各种场景下的正确性
 */

import { stressTestRecordService } from '../services/stressTestRecordService';

// 模拟测试记录数据
const mockTestRecord = {
  testName: '取消功能测试',
  testType: 'stress' as const,
  url: 'https://httpbin.org/delay/1',
  status: 'running' as const,
  userId: 'test-user-123',
  config: {
    users: 10,
    duration: 60,
    rampUpTime: 5,
    testType: 'gradual',
    method: 'GET',
    timeout: 10,
    thinkTime: 1
  },
  results: {
    status: 'running',
    startTime: new Date().toISOString(),
    metrics: {
      totalRequests: 50,
      successfulRequests: 48,
      failedRequests: 2,
      averageResponseTime: 250,
      minResponseTime: 180,
      maxResponseTime: 450,
      throughput: 5.2,
      errorRate: 0.04,
      activeUsers: 8
    },
    realTimeData: [
      { timestamp: Date.now() - 5000, responseTime: 220, activeUsers: 5, throughput: 8, errorRate: 0.02, success: true },
      { timestamp: Date.now() - 4000, responseTime: 240, activeUsers: 7, throughput: 10, errorRate: 0.03, success: true },
      { timestamp: Date.now() - 3000, responseTime: 260, activeUsers: 8, throughput: 12, errorRate: 0.05, success: true }
    ]
  },
  tags: ['cancel-test'],
  environment: 'test'
};

/**
 * 测试取消功能的API调用
 */
export async function testCancelAPI() {
  console.log('🧪 开始测试取消API...');

  try {
    // 模拟API调用
    const testId = 'test_cancel_' + Date.now();
    const cancelResponse = await fetch(`/api/test/stress/cancel/${testId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token`
      },
      body: JSON.stringify({ reason: '测试取消功能' })
    });

    if (cancelResponse.ok) {
      const result = await cancelResponse.json();
      console.log('✅ 取消API调用成功:', result);
      return true;
    } else {
      console.log('⚠️ 取消API返回错误状态:', cancelResponse.status);
      return false;
    }
  } catch (error) {
    console.error('❌ 取消API调用失败:', error);
    return false;
  }
}

/**
 * 测试取消记录的数据完整性
 */
export async function testCancelRecordIntegrity() {
  console.log('🧪 开始测试取消记录完整性...');

  try {
    // 1. 创建测试记录
    console.log('📝 创建测试记录...');
    const createdRecord = await stressTestRecordService.createTestRecord(mockTestRecord);
    console.log('✅ 测试记录创建成功:', createdRecord.id);

    // 2. 模拟测试运行一段时间
    console.log('⏳ 模拟测试运行...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 更新一些实时数据
    const updatedRecord = await stressTestRecordService.updateTestRecord(createdRecord.id, {
      status: 'running',
      progress: 50,
      currentPhase: 'steady',
      results: {
        ...mockTestRecord.results,
        realTimeData: [
          ...mockTestRecord.results.realTimeData,
          { timestamp: Date.now(), responseTime: 280, activeUsers: 10, throughput: 14, errorRate: 0.07, success: true }
        ]
      }
    });

    console.log('✅ 测试记录更新成功');

    // 3. 取消测试
    console.log('🛑 取消测试...');
    const cancelledRecord = await stressTestRecordService.updateTestRecord(createdRecord.id, {
      status: 'cancelled',
      endTime: new Date().toISOString(),
      cancelReason: '用户手动取消测试',
      results: {
        ...updatedRecord.results,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelReason: '用户手动取消测试',
        partialData: true
      }
    });

    console.log('✅ 测试取消成功');

    // 4. 验证取消记录的完整性
    console.log('🔍 验证取消记录完整性...');
    const finalRecord = await stressTestRecordService.getTestRecord(createdRecord.id);

    const validations = [
      { name: '状态为cancelled', check: finalRecord.status === 'cancelled' },
      { name: '有结束时间', check: !!finalRecord.endTime },
      { name: '有取消原因', check: !!finalRecord.cancelReason },
      { name: '保留了部分数据', check: finalRecord.results?.partialData === true },
      { name: '保留了实时数据', check: Array.isArray(finalRecord.results?.realTimeData) && finalRecord.results.realTimeData.length > 0 },
      { name: '保留了指标数据', check: !!finalRecord.results?.metrics }
    ];

    let allValid = true;
    validations.forEach(validation => {
      if (validation.check) {
        console.log(`✅ ${validation.name}`);
      } else {
        console.log(`❌ ${validation.name}`);
        allValid = false;
      }
    });

    // 5. 清理测试数据
    console.log('🧹 清理测试数据...');
    await stressTestRecordService.deleteTestRecord(createdRecord.id);
    console.log('✅ 测试数据清理完成');

    return allValid;

  } catch (error) {
    console.error('❌ 取消记录完整性测试失败:', error);
    return false;
  }
}

/**
 * 测试状态转换的有效性
 */
export async function testStatusTransitions() {
  console.log('🧪 开始测试状态转换...');

  try {
    const validTransitions = [
      { from: 'pending', to: 'running', valid: true },
      { from: 'running', to: 'cancelled', valid: true },
      { from: 'running', to: 'completed', valid: true },
      { from: 'running', to: 'failed', valid: true },
      { from: 'cancelled', to: 'running', valid: false },
      { from: 'completed', to: 'cancelled', valid: false },
      { from: 'failed', to: 'cancelled', valid: false }
    ];

    let allValid = true;
    validTransitions.forEach(transition => {
      const isValid = stressTestRecordService.isValidStatusTransition(transition.from, transition.to);
      if (isValid === transition.valid) {
        console.log(`✅ ${transition.from} -> ${transition.to}: ${isValid ? '有效' : '无效'}`);
      } else {
        console.log(`❌ ${transition.from} -> ${transition.to}: 期望${transition.valid ? '有效' : '无效'}，实际${isValid ? '有效' : '无效'}`);
        allValid = false;
      }
    });

    return allValid;

  } catch (error) {
    console.error('❌ 状态转换测试失败:', error);
    return false;
  }
}

/**
 * 运行所有取消功能测试
 */
export async function runAllCancelTests() {
  console.log('🚀 开始运行所有取消功能测试...\n');

  const tests = [
    { name: '取消API测试', test: testCancelAPI },
    { name: '取消记录完整性测试', test: testCancelRecordIntegrity },
    { name: '状态转换测试', test: testStatusTransitions }
  ];

  const results = [];
  for (const testCase of tests) {
    console.log(`\n📋 运行 ${testCase.name}...`);
    try {
      const result = await testCase.test();
      results.push({ name: testCase.name, success: result });
      console.log(`${result ? '✅' : '❌'} ${testCase.name} ${result ? '通过' : '失败'}`);
    } catch (error) {
      console.error(`❌ ${testCase.name} 执行异常:`, error);
      results.push({ name: testCase.name, success: false, error: error.message });
    }
  }

  // 输出总结
  console.log('\n📊 测试结果总结:');
  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.name}`);
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });

  console.log(`\n🎯 总体结果: ${passedTests}/${totalTests} 测试通过`);
  
  return passedTests === totalTests;
}

// 如果直接运行此文件，执行所有测试
if (require.main === module) {
  runAllCancelTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}
