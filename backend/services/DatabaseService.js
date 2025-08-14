const { sequelize, models } = require('../database/sequelize');
const { Op } = require('sequelize');
const smartCacheService = require('./SmartCacheService');

/**
 * 数据库服务类
 * 提供统一的数据库操作接口，替换内存存储
 */
class DatabaseService {
  constructor() {
    this.models = models;
    this.sequelize = sequelize;
  }

  /**
   * 初始化数据库连接
   */
  async initialize() {
    try {
      await sequelize.authenticate();
      console.log('✅ 数据库连接成功');

      // 同步数据库表结构
      await sequelize.sync({ alter: true });
      console.log('✅ 数据库表同步完成');

      // 初始化智能缓存服务
      try {
        await smartCacheService.initialize();
        console.log('✅ 智能缓存服务初始化成功');
      } catch (cacheError) {
        console.warn('⚠️ 智能缓存服务初始化失败:', cacheError.message);
        // 继续运行，不影响主要功能
      }

      return true;
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建测试记录
   */
  async createTest(testData) {
    try {
      const test = await this.models.Test.create({
        test_id: testData.testId,
        test_type: testData.testType,
        test_name: testData.testName || `${testData.testType.toUpperCase()}测试`,
        url: testData.url,
        config: testData.config || {},
        status: 'pending',
        progress: 0,
        user_id: testData.userId,
        started_at: new Date()
      });

      console.log(`📝 创建测试记录: ${test.test_id}`);
      return test;
    } catch (error) {
      console.error('❌ 创建测试记录失败:', error);
      throw error;
    }
  }

  /**
   * 更新测试状态
   */
  async updateTestStatus(testId, status, progress = null, errorMessage = null) {
    try {
      const updateData = {
        status,
        updated_at: new Date()
      };

      if (progress !== null) {
        updateData.progress = progress;
      }

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      if (status === 'completed' || status === 'failed') {
        updateData.completed_at = new Date();
      }

      const [updatedCount] = await this.models.Test.update(updateData, {
        where: { test_id: testId }
      });

      if (updatedCount === 0) {
        throw new Error(`测试记录不存在: ${testId}`);
      }

      console.log(`📊 更新测试状态: ${testId} -> ${status}`);
      return true;
    } catch (error) {
      console.error('❌ 更新测试状态失败:', error);
      throw error;
    }
  }

  /**
   * 保存测试结果
   */
  async saveTestResult(testId, results, score = null) {
    try {
      const duration = results.duration || null;

      const [updatedCount] = await this.models.Test.update({
        results,
        score,
        duration,
        status: results.success ? 'completed' : 'failed',
        completed_at: new Date(),
        updated_at: new Date()
      }, {
        where: { test_id: testId }
      });

      if (updatedCount === 0) {
        throw new Error(`测试记录不存在: ${testId}`);
      }

      // 使缓存失效
      await smartCacheService.invalidate('test_update', { testId });
      await smartCacheService.delete(`result_${testId}`, 'test_result');

      console.log(`💾 保存测试结果: ${testId}`);
      return true;
    } catch (error) {
      console.error('❌ 保存测试结果失败:', error);
      throw error;
    }
  }

  /**
   * 获取测试状态
   */
  async getTestStatus(testId) {
    try {
      const test = await this.models.Test.findOne({
        where: { test_id: testId },
        attributes: ['test_id', 'status', 'progress', 'error_message', 'started_at', 'completed_at']
      });

      if (!test) {
        return {
          testId,
          status: 'not_found',
          progress: 0,
          message: '测试不存在或已过期'
        };
      }

      return {
        testId: test.test_id,
        status: test.status,
        progress: test.progress,
        message: test.error_message || this.getStatusMessage(test.status),
        startedAt: test.started_at,
        completedAt: test.completed_at
      };
    } catch (error) {
      console.error('❌ 获取测试状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取测试结果
   */
  async getTestResult(testId) {
    try {
      // 尝试从缓存获取
      const cacheKey = `result_${testId}`;
      const cachedResult = await smartCacheService.get(cacheKey, 'test_result');

      if (cachedResult) {
        return cachedResult;
      }

      // 从数据库获取
      const test = await this.models.Test.findOne({
        where: { test_id: testId },
        attributes: ['test_id', 'test_type', 'test_name', 'url', 'config', 'results', 'score', 'duration', 'status', 'created_at', 'completed_at']
      });

      if (!test) {
        return null;
      }

      const result = {
        testId: test.test_id,
        testType: test.test_type,
        testName: test.test_name,
        url: test.url,
        config: test.config,
        results: test.results,
        score: test.score,
        duration: test.duration,
        status: test.status,
        createdAt: test.created_at,
        completedAt: test.completed_at
      };

      // 缓存结果（只缓存已完成的测试）
      if (test.status === 'completed' || test.status === 'failed') {
        await smartCacheService.set(cacheKey, result, 'test_result');
      }

      return result;
    } catch (error) {
      console.error('❌ 获取测试结果失败:', error);
      throw error;
    }
  }

  /**
   * 获取测试历史
   */
  async getTestHistory(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        testType,
        status,
        userId,
        startDate,
        endDate
      } = options;

      const where = {};

      if (testType) {
        where.test_type = testType;
      }

      if (status) {
        where.status = status;
      }

      if (userId) {
        where.user_id = userId;
      }

      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) {
          where.created_at[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.created_at[Op.lte] = new Date(endDate);
        }
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await this.models.Test.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset,
        attributes: [
          'id', 'test_id', 'test_type', 'test_name', 'url', 'status',
          'score', 'duration', 'created_at', 'completed_at'
        ]
      });

      return {
        data: rows.map(test => ({
          id: test.id,
          testId: test.test_id,
          testType: test.test_type,
          testName: test.test_name,
          url: test.url,
          status: test.status,
          score: test.score,
          duration: test.duration,
          createdAt: test.created_at,
          completedAt: test.completed_at
        })),
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('❌ 获取测试历史失败:', error);
      throw error;
    }
  }

  /**
   * 删除测试记录
   */
  async deleteTest(testId) {
    try {
      const deletedCount = await this.models.Test.destroy({
        where: { test_id: testId }
      });

      if (deletedCount === 0) {
        throw new Error(`测试记录不存在: ${testId}`);
      }

      console.log(`🗑️ 删除测试记录: ${testId}`);
      return true;
    } catch (error) {
      console.error('❌ 删除测试记录失败:', error);
      throw error;
    }
  }

  /**
   * 批量删除测试记录
   */
  async deleteTests(testIds) {
    try {
      const deletedCount = await this.models.Test.destroy({
        where: {
          test_id: {
            [Op.in]: testIds
          }
        }
      });

      console.log(`🗑️ 批量删除测试记录: ${deletedCount}条`);
      return deletedCount;
    } catch (error) {
      console.error('❌ 批量删除测试记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取配置模板
   */
  async getConfigTemplates(testType = null) {
    try {
      // 构建缓存键
      const cacheKey = testType ? `templates_${testType}` : 'templates_all';

      // 尝试从缓存获取
      const cachedTemplates = await smartCacheService.get(cacheKey, 'config_template');

      if (cachedTemplates) {
        return cachedTemplates;
      }

      // 从数据库获取
      const where = { is_public: true };

      if (testType) {
        where.test_type = testType;
      }

      const templates = await this.models.ConfigTemplate.findAll({
        where,
        order: [['is_default', 'DESC'], ['usage_count', 'DESC'], ['created_at', 'DESC']],
        attributes: ['id', 'name', 'test_type', 'config', 'description', 'is_default', 'usage_count']
      });

      const result = templates.map(template => ({
        id: template.id,
        name: template.name,
        testType: template.test_type,
        config: template.config,
        description: template.description,
        isDefault: template.is_default,
        usageCount: template.usage_count
      }));

      // 缓存结果
      await smartCacheService.set(cacheKey, result, 'config_template');

      return result;
    } catch (error) {
      console.error('❌ 获取配置模板失败:', error);
      throw error;
    }
  }

  /**
   * 保存配置模板
   */
  async saveConfigTemplate(templateData) {
    try {
      const template = await this.models.ConfigTemplate.create({
        name: templateData.name,
        test_type: templateData.testType,
        config: templateData.config,
        description: templateData.description,
        is_public: templateData.isPublic !== false,
        user_id: templateData.userId
      });

      // 使配置模板缓存失效
      await smartCacheService.invalidate('template_update', { templateId: template.id });
      await smartCacheService.deletePattern('templates_*', 'config_template');

      console.log(`📋 保存配置模板: ${template.name}`);
      return {
        id: template.id,
        name: template.name,
        testType: template.test_type,
        config: template.config,
        description: template.description
      };
    } catch (error) {
      console.error('❌ 保存配置模板失败:', error);
      throw error;
    }
  }

  /**
   * 记录系统指标
   */
  async recordMetric(metricType, metricName, value, unit = null, tags = {}) {
    try {
      await this.models.SystemMetrics.create({
        metric_type: metricType,
        metric_name: metricName,
        value,
        unit,
        tags,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('❌ 记录系统指标失败:', error);
      // 不抛出错误，避免影响主要功能
    }
  }

  /**
   * 获取状态消息
   */
  getStatusMessage(status) {
    const messages = {
      pending: '等待开始',
      running: '测试进行中',
      completed: '测试完成',
      failed: '测试失败',
      stopped: '测试已停止',
      cancelled: '测试已取消'
    };
    return messages[status] || '未知状态';
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // 清理过期的测试记录
      const deletedTests = await this.models.Test.destroy({
        where: {
          created_at: {
            [Op.lt]: cutoffDate
          },
          status: {
            [Op.in]: ['completed', 'failed', 'cancelled']
          }
        }
      });

      // 清理过期的系统指标
      const deletedMetrics = await this.models.SystemMetrics.destroy({
        where: {
          timestamp: {
            [Op.lt]: cutoffDate
          }
        }
      });

      console.log(`🧹 清理过期数据: ${deletedTests}条测试记录, ${deletedMetrics}条系统指标`);
      return { deletedTests, deletedMetrics };
    } catch (error) {
      console.error('❌ 清理过期数据失败:', error);
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    try {
      await sequelize.close();
      console.log('✅ 数据库连接已关闭');
    } catch (error) {
      console.error('❌ 关闭数据库连接失败:', error);
    }
  }
}

// 创建单例实例
const databaseService = new DatabaseService();

module.exports = databaseService;
