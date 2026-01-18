/**
 * 测试业务服务层 (Service)
 * 职责: 包含业务逻辑,协调Repository和其他服务
 */

const testRepository = require('../../repositories/testRepository');
const testBusinessService = require('./TestBusinessService');
const userTestManager = require('./UserTestManager');

class TestService {
  /**
   * 获取测试结果
   */
  async getTestResults(testId, userId) {
    // 检查权限
    const hasAccess = await testRepository.checkOwnership(testId, userId);
    if (!hasAccess) {
      throw new Error('无权访问此测试');
    }

    const results = await testRepository.findResults(testId, userId);
    if (!results) {
      throw new Error('测试结果不存在');
    }

    return this.formatResults(results);
  }


  /**
   * 更新测试
   */
  async updateTest(testId, userId, updates) {
    // 检查权限
    const hasAccess = await testRepository.checkOwnership(testId, userId);
    if (!hasAccess) {
      throw new Error('无权修改此测试');
    }

    // 检查状态
    const test = await testRepository.findById(testId, userId);
    if (test.status !== 'pending') {
      throw new Error('只能更新pending状态的测试');
    }

    // 验证更新数据
    const validatedUpdates = this.validateUpdates(updates);
    
    return await testRepository.update(testId, userId, validatedUpdates);
  }

  /**
   * 删除测试
   */
  async deleteTest(testId, userId) {
    const hasAccess = await testRepository.checkOwnership(testId, userId);
    if (!hasAccess) {
      throw new Error('无权删除此测试');
    }

    return await testRepository.softDelete(testId, userId);
  }

  /**
   * 批量删除测试
   */
  async batchDelete(testIds, userId) {
    if (!Array.isArray(testIds) || testIds.length === 0) {
      throw new Error('请选择要删除的测试');
    }

    // 验证所有测试的所有权
    for (const testId of testIds) {
      const hasAccess = await testRepository.checkOwnership(testId, userId);
      if (!hasAccess) {
        throw new Error(`无权删除测试: ${testId}`);
      }
    }

    const deleted = await testRepository.batchDelete(testIds, userId);
    return {
      deletedCount: deleted.length,
      deletedIds: deleted.map(r => r.test_id),
    };
  }

  /**
   * 获取运行中的测试
   */
  async getRunningTests(userId) {
    return await testRepository.getRunningTests(userId);
  }


  /**
   * 创建并启动测试 (委托给TestBusinessService)
   */
  async createAndStart(config, user) {
    return await testBusinessService.createAndStartTest(config, user);
  }

  /**
   * 获取测试状态 (委托给UserTestManager)
   */
  async getStatus(userId, testId) {
    return await userTestManager.getTestStatus(userId, testId);
  }

  /**
   * 停止测试 (委托给UserTestManager)
   */
  async stopTest(userId, testId) {
    return await userTestManager.stopTest(userId, testId);
  }

  /**
   * 重新运行测试
   */
  async rerunTest(testId, userId) {
    const originalTest = await testRepository.findById(testId, userId);
    if (!originalTest) {
      throw new Error('测试不存在');
    }

    const config = originalTest.config || {};
    const user = { userId, role: 'free' };

    return await this.createAndStart(config, user);
  }

  // ========== 私有辅助方法 ==========

  /**
   * 格式化测试结果
   */
  formatResults(results) {
    return {
      results: results.results,
      status: results.status,
      score: results.overall_score,
      duration: results.duration,
      formattedDuration: this.formatDuration(results.duration),
    };
  }


  /**
   * 验证更新数据
   */
  validateUpdates(updates) {
    const allowedFields = ['test_name', 'config', 'status'];
    const validated = {};

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        validated[key] = updates[key];
      }
    });

    return validated;
  }

  /**
   * 格式化时长
   */
  formatDuration(milliseconds) {
    if (!milliseconds) return '0s';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

module.exports = new TestService();
