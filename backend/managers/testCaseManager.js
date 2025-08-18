/**
 * 测试用例管理器
 * 负责管理和执行各种测试用例
 */

class TestCaseManager {
  constructor() {
    this.testCases = new Map();
    this.executionHistory = [];
  }

  /**
   * 注册测试用例
   */
  registerTestCase(id, testCase) {
    this.testCases.set(id, testCase);
  }

  /**
   * 获取测试用例
   */
  getTestCase(id) {
    return this.testCases.get(id);
  }

  /**
   * 获取所有测试用例
   */
  getAllTestCases() {
    return Array.from(this.testCases.values());
  }

  /**
   * 执行测试用例
   */
  async executeTestCase(id, params = {}) {
    const testCase = this.getTestCase(id);
    if (!testCase) {
      throw new Error(`测试用例 ${id} 不存在`);
    }

    const startTime = Date.now();
    try {
      const result = await testCase.execute(params);
      const endTime = Date.now();
      
      const execution = {
        id,
        startTime,
        endTime,
        duration: endTime - startTime,
        result,
        status: 'success'
      };
      
      this.executionHistory.push(execution);
      return execution;
    } catch (error) {
      const endTime = Date.now();
      
      const execution = {
        id,
        startTime,
        endTime,
        duration: endTime - startTime,
        error: error.message,
        status: 'failed'
      };
      
      this.executionHistory.push(execution);
      throw error;
    }
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(limit = 100) {
    return this.executionHistory.slice(-limit);
  }

  /**
   * 清理执行历史
   */
  clearExecutionHistory() {
    this.executionHistory = [];
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter(e => e.status === 'success').length;
    const failed = this.executionHistory.filter(e => e.status === 'failed').length;
    
    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageDuration: total > 0 ? 
        this.executionHistory.reduce((sum, e) => sum + e.duration, 0) / total : 0
    };
  }
}

// 创建全局实例
const testCaseManager = new TestCaseManager();

module.exports = {
  TestCaseManager,
  testCaseManager
};
