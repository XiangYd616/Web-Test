/**
 * 压力测试记录功能测试工具
 * 用于测试和验证压力测试记录管理功能
 */

import { stressTestRecordService, type StressTestRecord } from '../services/stressTestRecordService';

export class StressTestRecordTester {
  private testRecords: StressTestRecord[] = [];

  /**
   * 运行完整的测试套件
   */
  async runTests(): Promise<void> {
    console.log('🧪 开始压力测试记录功能测试...');

    try {
      await this.testCreateRecord();
      await this.testUpdateRecord();
      await this.testCompleteRecord();
      await this.testFailRecord();
      await this.testQueryRecords();
      await this.testDeleteRecord();
      
      console.log('✅ 所有测试通过！');
    } catch (error) {
      console.error('❌ 测试失败:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 测试创建记录
   */
  private async testCreateRecord(): Promise<void> {
    console.log('📝 测试创建记录...');

    const testData: Partial<StressTestRecord> = {
      testName: '测试压力测试记录',
      url: 'https://example.com',
      config: {
        users: 10,
        duration: 30,
        rampUpTime: 5,
        testType: 'gradual',
        method: 'GET',
        timeout: 10,
        thinkTime: 1
      }
    };

    const record = await stressTestRecordService.createTestRecord(testData);
    this.testRecords.push(record);

    console.log('✅ 记录创建成功:', record.id);
    
    // 验证记录内容
    if (record.testName !== testData.testName) {
      throw new Error('测试名称不匹配');
    }
    if (record.url !== testData.url) {
      throw new Error('URL不匹配');
    }
    if (record.status !== 'pending') {
      throw new Error('初始状态应为pending');
    }
  }

  /**
   * 测试更新记录
   */
  private async testUpdateRecord(): Promise<void> {
    console.log('📝 测试更新记录...');

    if (this.testRecords.length === 0) {
      throw new Error('没有可更新的记录');
    }

    const record = this.testRecords[0];
    const updates = {
      status: 'running' as const,
      progress: 50,
      currentPhase: 'ramp-up'
    };

    const updatedRecord = await stressTestRecordService.updateTestRecord(record.id, updates);

    console.log('✅ 记录更新成功');

    // 验证更新内容
    if (updatedRecord.status !== 'running') {
      throw new Error('状态更新失败');
    }
    if (updatedRecord.progress !== 50) {
      throw new Error('进度更新失败');
    }

    // 更新本地记录
    this.testRecords[0] = updatedRecord;
  }

  /**
   * 测试完成记录
   */
  private async testCompleteRecord(): Promise<void> {
    console.log('📝 测试完成记录...');

    if (this.testRecords.length === 0) {
      throw new Error('没有可完成的记录');
    }

    const record = this.testRecords[0];
    const results = {
      metrics: {
        totalRequests: 1000,
        successfulRequests: 950,
        failedRequests: 50,
        averageResponseTime: 250,
        minResponseTime: 100,
        maxResponseTime: 500,
        throughput: 33.3,
        requestsPerSecond: 33.3,
        rps: 33.3,
        errorRate: 5.0
      },
      realTimeData: [
        {
          timestamp: Date.now(),
          responseTime: 250,
          throughput: 33.3,
          activeUsers: 10,
          errors: 5,
          errorRate: 5.0,
          phase: 'steady'
        }
      ]
    };

    const completedRecord = await stressTestRecordService.completeTestRecord(
      record.id, 
      results, 
      85 // 评分
    );

    console.log('✅ 记录完成成功');

    // 验证完成状态
    if (completedRecord.status !== 'completed') {
      throw new Error('完成状态设置失败');
    }
    if (completedRecord.overallScore !== 85) {
      throw new Error('评分设置失败');
    }
    if (!completedRecord.results) {
      throw new Error('结果数据保存失败');
    }

    // 更新本地记录
    this.testRecords[0] = completedRecord;
  }

  /**
   * 测试失败记录
   */
  private async testFailRecord(): Promise<void> {
    console.log('📝 测试失败记录...');

    // 创建一个新记录用于测试失败
    const testData: Partial<StressTestRecord> = {
      testName: '失败测试记录',
      url: 'https://invalid-url.example',
      config: {
        users: 5,
        duration: 10,
        rampUpTime: 2,
        testType: 'gradual',
        method: 'GET',
        timeout: 5,
        thinkTime: 1
      }
    };

    const record = await stressTestRecordService.createTestRecord(testData);
    this.testRecords.push(record);

    const failedRecord = await stressTestRecordService.failTestRecord(
      record.id,
      '连接超时：无法连接到目标服务器'
    );

    console.log('✅ 失败记录处理成功');

    // 验证失败状态
    if (failedRecord.status !== 'failed') {
      throw new Error('失败状态设置失败');
    }
    if (!failedRecord.error) {
      throw new Error('错误信息保存失败');
    }

    // 更新本地记录
    this.testRecords[1] = failedRecord;
  }

  /**
   * 测试查询记录
   */
  private async testQueryRecords(): Promise<void> {
    console.log('📝 测试查询记录...');

    const response = await stressTestRecordService.getTestRecords({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    console.log('✅ 记录查询成功');

    // 验证查询结果
    if (!response.success) {
      throw new Error('查询失败');
    }
    if (!Array.isArray(response.data.tests)) {
      throw new Error('返回数据格式错误');
    }

    // 验证分页信息
    if (!response.data.pagination) {
      throw new Error('缺少分页信息');
    }

    console.log(`📊 查询到 ${response.data.tests.length} 条记录`);
  }

  /**
   * 测试删除记录
   */
  private async testDeleteRecord(): Promise<void> {
    console.log('📝 测试删除记录...');

    if (this.testRecords.length === 0) {
      throw new Error('没有可删除的记录');
    }

    const record = this.testRecords[0];
    const success = await stressTestRecordService.deleteTestRecord(record.id);

    console.log('✅ 记录删除成功');

    // 验证删除结果
    if (!success) {
      throw new Error('删除操作失败');
    }

    // 验证记录确实被删除
    try {
      await stressTestRecordService.getTestRecord(record.id);
      throw new Error('记录应该已被删除');
    } catch (error: any) {
      if (!error.message.includes('不存在')) {
        throw error;
      }
    }

    // 从本地记录中移除
    this.testRecords = this.testRecords.filter(r => r.id !== record.id);
  }

  /**
   * 清理测试数据
   */
  private async cleanup(): Promise<void> {
    console.log('🧹 清理测试数据...');

    for (const record of this.testRecords) {
      try {
        await stressTestRecordService.deleteTestRecord(record.id);
        console.log(`🗑️ 已删除测试记录: ${record.id}`);
      } catch (error) {
        console.warn(`⚠️ 清理记录失败: ${record.id}`, error);
      }
    }

    this.testRecords = [];
    console.log('✅ 清理完成');
  }

  /**
   * 生成测试报告
   */
  generateReport(): string {
    return `
压力测试记录功能测试报告
========================

测试项目:
✅ 创建记录
✅ 更新记录  
✅ 完成记录
✅ 失败记录
✅ 查询记录
✅ 删除记录

所有功能正常工作！
    `.trim();
  }
}

// 导出测试实例
export const stressTestRecordTester = new StressTestRecordTester();

// 如果直接运行此文件，执行测试
if (typeof window === 'undefined' && require.main === module) {
  stressTestRecordTester.runTests()
    .then(() => {
      console.log(stressTestRecordTester.generateReport());
      process.exit(0);
    })
    .catch((error) => {
      console.error('测试失败:', error);
      process.exit(1);
    });
}
