/**
 * 测试结果存储服务
 * 负责保存、查询和管理测试结果数据
 */

const fs = require('fs').promises;
const path = require('path');

class TestResultStorage {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.testResultsFile = path.join(this.dataDir, 'test-results.json');
    this.ensureDataDirectory();
  }

  /**
   * 确保数据目录存在
   */
  async ensureDataDirectory() {
    try {
      await fs.access(this.dataDir);
    } catch (error) {
      await fs.mkdir(this.dataDir, { recursive: true });
    }

    try {
      await fs.access(this.testResultsFile);
    } catch (error) {
      await fs.writeFile(this.testResultsFile, JSON.stringify([], null, 2));
    }
  }

  /**
   * 保存测试结果
   */
  async saveTestResult(testResult, userId = null) {
    try {
      console.log('💾 Saving test result:', testResult.testId, 'for user:', userId);

      // 读取现有数据
      const existingData = await this.loadTestResults();

      // 添加时间戳、ID和用户ID
      const enrichedResult = {
        ...testResult,
        id: testResult.testId || this.generateId(),
        userId: userId, // 添加用户ID字段
        savedAt: new Date().toISOString(),
        version: '1.0'
      };

      // 添加到数组开头（最新的在前面）
      existingData.unshift(enrichedResult);

      // 限制最大记录数（保留最近1000条）
      if (existingData.length > 1000) {
        existingData.splice(1000);
      }

      // 保存到文件
      await fs.writeFile(this.testResultsFile, JSON.stringify(existingData, null, 2));

      console.log('✅ Test result saved successfully');
      return { success: true, id: enrichedResult.id };

    } catch (error) {
      console.error('❌ Failed to save test result:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 加载所有测试结果
   */
  async loadTestResults() {
    try {
      const data = await fs.readFile(this.testResultsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load test results:', error);
      return [];
    }
  }

  /**
   * 根据条件查询测试结果
   */
  async queryTestResults(filters = {}, userId = null) {
    try {
      const allResults = await this.loadTestResults();
      let filteredResults = [...allResults];

      // 首先按用户ID过滤（如果提供了用户ID）
      if (userId) {
        filteredResults = filteredResults.filter(result => result.userId === userId);
      }

      // 按测试类型过滤
      if (filters.testType && filters.testType !== 'all') {
        filteredResults = filteredResults.filter(result => 
          result.testType === filters.testType
        );
      }

      // 按状态过滤
      if (filters.status && filters.status !== 'all') {
        filteredResults = filteredResults.filter(result => 
          result.status === filters.status
        );
      }

      // 按时间范围过滤
      if (filters.dateRange && filters.dateRange !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            filterDate.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            filterDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        filteredResults = filteredResults.filter(result => 
          new Date(result.startTime || result.savedAt) >= filterDate
        );
      }

      // 按分数范围过滤
      if (filters.scoreRange) {
        const [minScore, maxScore] = filters.scoreRange;
        filteredResults = filteredResults.filter(result => {
          if (!result.overallScore) return true;
          return result.overallScore >= minScore && result.overallScore <= maxScore;
        });
      }

      // 按搜索查询过滤
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filteredResults = filteredResults.filter(result =>
          (result.url && result.url.toLowerCase().includes(query)) ||
          (result.testType && result.testType.toLowerCase().includes(query)) ||
          (result.id && result.id.toLowerCase().includes(query)) ||
          (result.testId && result.testId.toLowerCase().includes(query))
        );
      }

      // 排序
      if (filters.sortBy) {
        filteredResults.sort((a, b) => {
          let aValue, bValue;
          
          switch (filters.sortBy) {
            case 'date':
              aValue = new Date(a.startTime || a.savedAt).getTime();
              bValue = new Date(b.startTime || b.savedAt).getTime();
              break;
            case 'score':
              aValue = a.overallScore || 0;
              bValue = b.overallScore || 0;
              break;
            case 'type':
              aValue = a.testType || '';
              bValue = b.testType || '';
              break;
            case 'status':
              aValue = a.status || '';
              bValue = b.status || '';
              break;
            default:
              aValue = new Date(a.startTime || a.savedAt).getTime();
              bValue = new Date(b.startTime || b.savedAt).getTime();
          }

          if (filters.sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });
      }

      return {
        success: true,
        data: filteredResults,
        total: allResults.length,
        filtered: filteredResults.length
      };

    } catch (error) {
      console.error('Failed to query test results:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        total: 0,
        filtered: 0
      };
    }
  }

  /**
   * 根据ID获取单个测试结果
   */
  async getTestResultById(id, userId = null) {
    try {
      const allResults = await this.loadTestResults();
      let result = allResults.find(r => r.id === id || r.testId === id);

      // 如果提供了用户ID，检查权限
      if (result && userId && result.userId !== userId) {
        return { success: false, error: 'Access denied: Test result belongs to another user' };
      }

      if (result) {
        return { success: true, data: result };
      } else {
        return { success: false, error: 'Test result not found' };
      }
    } catch (error) {
      console.error('Failed to get test result by ID:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 删除测试结果
   */
  async deleteTestResult(id, userId = null) {
    try {
      const allResults = await this.loadTestResults();

      // 找到要删除的记录
      const targetResult = allResults.find(r => r.id === id || r.testId === id);

      // 检查记录是否存在
      if (!targetResult) {
        return { success: false, error: 'Test result not found' };
      }

      // 如果提供了用户ID，检查权限
      if (userId && targetResult.userId !== userId) {
        return { success: false, error: 'Access denied: Cannot delete test result belonging to another user' };
      }

      // 删除记录
      const filteredResults = allResults.filter(r => r.id !== id && r.testId !== id);

      await fs.writeFile(this.testResultsFile, JSON.stringify(filteredResults, null, 2));
      return { success: true, message: 'Test result deleted successfully' };
    } catch (error) {
      console.error('Failed to delete test result:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取统计信息
   */
  async getStatistics(userId = null) {
    try {
      const allResults = await this.loadTestResults();

      // 如果提供了用户ID，只统计该用户的数据
      const userResults = userId ? allResults.filter(r => r.userId === userId) : allResults;
      
      const stats = {
        total: userResults.length,
        completed: userResults.filter(r => r.status === 'completed').length,
        failed: userResults.filter(r => r.status === 'failed').length,
        running: userResults.filter(r => r.status === 'running').length,
        averageScore: 0,
        testTypes: {},
        recentTests: userResults.slice(0, 10)
      };

      // 计算平均分数
      const scoredResults = userResults.filter(r => r.overallScore);
      if (scoredResults.length > 0) {
        stats.averageScore = scoredResults.reduce((sum, r) => sum + r.overallScore, 0) / scoredResults.length;
      }

      // 统计测试类型
      userResults.forEach(result => {
        const type = result.testType || 'unknown';
        stats.testTypes[type] = (stats.testTypes[type] || 0) + 1;
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理旧数据
   */
  async cleanupOldData(daysToKeep = 90) {
    try {
      const allResults = await this.loadTestResults();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const filteredResults = allResults.filter(result => {
        const resultDate = new Date(result.startTime || result.savedAt);
        return resultDate >= cutoffDate;
      });

      if (filteredResults.length < allResults.length) {
        await fs.writeFile(this.testResultsFile, JSON.stringify(filteredResults, null, 2));
        console.log(`🧹 Cleaned up ${allResults.length - filteredResults.length} old test results`);
      }

      return { success: true, cleaned: allResults.length - filteredResults.length };
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = { TestResultStorage };
