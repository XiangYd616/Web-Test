/**
 * 取消测试记录验证测试
 * 确保取消操作后有正确的记录保存
 */

import { stressTestRecordService, CancelReason } from '../services/stressTestRecordService';

// 模拟测试数据
const mockTestRecord = {
  id: 'test-cancel-001',
  testName: '取消测试验证',
  url: 'https://example.com',
  status: 'running' as const,
  startTime: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  config: {
    users: 10,
    duration: 60,
    rampUp: 5
  },
  results: {
    metrics: {
      totalRequests: 150,
      successfulRequests: 140,
      failedRequests: 10,
      averageResponseTime: 250
    },
    realTimeData: [
      { timestamp: Date.now() - 30000, responseTime: 200, activeUsers: 5, throughput: 10, errorRate: 0.05, success: true },
      { timestamp: Date.now() - 20000, responseTime: 300, activeUsers: 8, throughput: 15, errorRate: 0.08, success: true },
      { timestamp: Date.now() - 10000, responseTime: 250, activeUsers: 10, throughput: 12, errorRate: 0.06, success: true }
    ]
  }
};

/**
 * 测试取消记录的完整性
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
    console.log('📊 实时数据更新成功');

    // 3. 取消测试
    console.log('🛑 取消测试...');
    const cancelledRecord = await stressTestRecordService.cancelTestRecord(
      createdRecord.id,
      '用户手动取消测试',
      CancelReason.USER_CANCELLED,
      true // 保留数据
    );

    // 4. 验证取消记录的完整性
    console.log('🔍 验证取消记录...');
    
    // 检查状态
    if (cancelledRecord.status !== 'cancelled') {
      throw new Error(`状态错误: 期望 'cancelled', 实际 '${cancelledRecord.status}'`);
    }
    console.log('✅ 状态验证通过: cancelled');

    // 检查取消原因
    if (cancelledRecord.cancelReason !== CancelReason.USER_CANCELLED) {
      throw new Error(`取消原因错误: 期望 '${CancelReason.USER_CANCELLED}', 实际 '${cancelledRecord.cancelReason}'`);
    }
    console.log('✅ 取消原因验证通过:', cancelledRecord.cancelReason);

    // 检查时间字段
    if (!cancelledRecord.endTime) {
      throw new Error('缺少结束时间');
    }
    console.log('✅ 结束时间验证通过:', cancelledRecord.endTime);

    // 检查数据保留
    if (!cancelledRecord.results) {
      throw new Error('测试结果数据丢失');
    }
    console.log('✅ 测试结果数据保留验证通过');

    if (!cancelledRecord.results.realTimeData || cancelledRecord.results.realTimeData.length === 0) {
      throw new Error('实时数据丢失');
    }
    console.log('✅ 实时数据保留验证通过，数据点数量:', cancelledRecord.results.realTimeData.length);

    // 检查部分指标保留
    if (!cancelledRecord.results.metrics) {
      throw new Error('性能指标数据丢失');
    }
    console.log('✅ 性能指标保留验证通过');

    // 检查持续时间计算
    if (!cancelledRecord.actualDuration || cancelledRecord.actualDuration <= 0) {
      console.warn('⚠️ 实际持续时间可能未正确计算:', cancelledRecord.actualDuration);
    } else {
      console.log('✅ 实际持续时间计算正确:', cancelledRecord.actualDuration, '秒');
    }

    // 5. 验证记录可以正常查询
    console.log('🔍 验证记录查询...');
    const retrievedRecord = await stressTestRecordService.getTestRecord(createdRecord.id);
    
    if (retrievedRecord.status !== 'cancelled') {
      throw new Error('查询到的记录状态不正确');
    }
    console.log('✅ 记录查询验证通过');

    // 6. 清理测试数据
    console.log('🧹 清理测试数据...');
    await stressTestRecordService.deleteTestRecord(createdRecord.id);
    console.log('✅ 测试数据清理完成');

    console.log('🎉 取消记录完整性测试全部通过！');
    return true;

  } catch (error) {
    console.error('❌ 取消记录完整性测试失败:', error);
    return false;
  }
}

/**
 * 测试不同取消原因的记录
 */
export async function testDifferentCancelReasons() {
  console.log('🧪 开始测试不同取消原因的记录...');

  const cancelReasons = [
    { reason: CancelReason.USER_CANCELLED, description: '用户取消' },
    { reason: CancelReason.TIMEOUT, description: '超时取消' },
    { reason: CancelReason.SYSTEM_ERROR, description: '系统错误' },
    { reason: CancelReason.RESOURCE_LIMIT, description: '资源限制' },
    { reason: CancelReason.NETWORK_ERROR, description: '网络错误' }
  ];

  const results = [];

  for (const { reason, description } of cancelReasons) {
    try {
      console.log(`📝 测试取消原因: ${description}`);

      // 创建测试记录
      const testRecord = {
        ...mockTestRecord,
        id: `test-cancel-${reason}-${Date.now()}`,
        testName: `取消测试 - ${description}`
      };

      const createdRecord = await stressTestRecordService.createTestRecord(testRecord);

      // 取消测试
      const cancelledRecord = await stressTestRecordService.cancelTestRecord(
        createdRecord.id,
        `测试${description}`,
        reason,
        true
      );

      // 验证取消原因记录
      if (cancelledRecord.cancelReason !== reason) {
        throw new Error(`取消原因记录错误: 期望 '${reason}', 实际 '${cancelledRecord.cancelReason}'`);
      }

      console.log(`✅ ${description} 记录验证通过`);
      results.push({ reason, success: true });

      // 清理
      await stressTestRecordService.deleteTestRecord(createdRecord.id);

    } catch (error) {
      console.error(`❌ ${description} 记录测试失败:`, error);
      results.push({ reason, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`🎯 取消原因测试完成: ${successCount}/${results.length} 通过`);

  return results;
}

/**
 * 测试批量取消记录
 */
export async function testBatchCancelRecords() {
  console.log('🧪 开始测试批量取消记录...');

  try {
    // 创建多个测试记录
    const recordIds = [];
    for (let i = 0; i < 3; i++) {
      const testRecord = {
        ...mockTestRecord,
        id: `test-batch-cancel-${i}-${Date.now()}`,
        testName: `批量取消测试 ${i + 1}`
      };

      const createdRecord = await stressTestRecordService.createTestRecord(testRecord);
      recordIds.push(createdRecord.id);
    }

    console.log(`📝 创建了 ${recordIds.length} 个测试记录`);

    // 批量取消
    const batchResult = await stressTestRecordService.batchCancelTestRecords(
      recordIds,
      '批量取消测试',
      CancelReason.USER_CANCELLED
    );

    console.log('📊 批量取消结果:', batchResult);

    // 验证结果
    if (batchResult.success.length !== recordIds.length) {
      throw new Error(`批量取消失败: 期望成功 ${recordIds.length} 个, 实际成功 ${batchResult.success.length} 个`);
    }

    if (batchResult.failed.length > 0) {
      throw new Error(`批量取消有失败项: ${batchResult.failed.join(', ')}`);
    }

    console.log('✅ 批量取消验证通过');

    // 验证每个记录的状态
    for (const recordId of recordIds) {
      const record = await stressTestRecordService.getTestRecord(recordId);
      if (record.status !== 'cancelled') {
        throw new Error(`记录 ${recordId} 状态不正确: ${record.status}`);
      }
    }

    console.log('✅ 所有记录状态验证通过');

    // 清理
    for (const recordId of recordIds) {
      await stressTestRecordService.deleteTestRecord(recordId);
    }

    console.log('🎉 批量取消记录测试通过！');
    return true;

  } catch (error) {
    console.error('❌ 批量取消记录测试失败:', error);
    return false;
  }
}

/**
 * 运行所有取消记录测试
 */
export async function runAllCancelRecordTests() {
  console.log('🚀 开始运行所有取消记录测试...');

  const results = {
    integrity: false,
    cancelReasons: [],
    batchCancel: false
  };

  try {
    // 测试1: 取消记录完整性
    results.integrity = await testCancelRecordIntegrity();

    // 测试2: 不同取消原因
    results.cancelReasons = await testDifferentCancelReasons();

    // 测试3: 批量取消
    results.batchCancel = await testBatchCancelRecords();

    // 汇总结果
    const integrityPassed = results.integrity;
    const cancelReasonsPassed = results.cancelReasons.every(r => r.success);
    const batchCancelPassed = results.batchCancel;

    const allPassed = integrityPassed && cancelReasonsPassed && batchCancelPassed;

    console.log('\n📋 测试结果汇总:');
    console.log(`  取消记录完整性: ${integrityPassed ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  取消原因记录: ${cancelReasonsPassed ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  批量取消: ${batchCancelPassed ? '✅ 通过' : '❌ 失败'}`);
    console.log(`\n🎯 总体结果: ${allPassed ? '✅ 全部通过' : '❌ 存在失败'}`);

    return results;

  } catch (error) {
    console.error('❌ 测试运行失败:', error);
    return results;
  }
}

// 如果直接运行此文件，执行所有测试
if (require.main === module) {
  runAllCancelRecordTests().then(results => {
    process.exit(results.integrity && results.cancelReasons.every(r => r.success) && results.batchCancel ? 0 : 1);
  });
}
