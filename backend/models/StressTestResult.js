/**
 * 压力测试结果数据模型
 * 
 * 文件路径: backend/models/StressTestResult.js
 * 创建时间: 2025-11-14
 * 
 * 功能:
 * - 存储压力测试结果
 * - 支持历史查询和对比
 * - 性能统计分析
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StressTestResult = sequelize.define('StressTestResult', {
    // 主键
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '测试结果唯一标识'
    },

    // 测试标识
    testId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: '测试会话ID'
    },

    // 用户ID
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: '执行测试的用户ID'
    },

    // 测试名称
    testName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '测试名称'
    },

    // 测试URL
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '被测试的URL'
    },

    // 测试配置
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: '测试配置(JSON格式)',
      defaultValue: {}
    },

    // 测试状态
    status: {
      type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'stopped'),
      allowNull: false,
      defaultValue: 'pending',
      comment: '测试状态'
    },

    // 测试结果
    results: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: '测试结果详细数据(JSON格式)'
    },

    // 性能指标
    totalRequests: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '总请求数'
    },

    successfulRequests: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '成功请求数'
    },

    failedRequests: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '失败请求数'
    },

    successRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: '成功率(%)'
    },

    avgResponseTime: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '平均响应时间(ms)'
    },

    minResponseTime: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '最小响应时间(ms)'
    },

    maxResponseTime: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '最大响应时间(ms)'
    },

    throughput: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '吞吐量(RPS)'
    },

    // 时间相关
    startTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '测试开始时间'
    },

    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '测试结束时间'
    },

    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '测试持续时间(毫秒)'
    },

    // 错误信息
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '错误信息'
    },

    // 标签
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: '标签列表'
    },

    // 环境信息
    environment: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '测试环境(dev/test/prod)'
    },

    // 元数据
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: '额外的元数据'
    }
  }, {
    tableName: 'stress_test_results',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_test_id',
        fields: ['test_id']
      },
      {
        name: 'idx_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_status',
        fields: ['status']
      },
      {
        name: 'idx_created_at',
        fields: ['created_at']
      },
      {
        name: 'idx_url',
        fields: ['url'],
        using: 'hash'
      }
    ],
    comment: '压力测试结果表'
  });

  // 类方法

  /**
   * 根据URL查询测试历史
   */
  StressTestResult.findByUrl = async function(url, options = {}) {
    const { limit = 10, offset = 0, order = [['created_at', 'DESC']] } = options;
    
    return await this.findAll({
      where: { url, status: 'completed' },
      limit,
      offset,
      order
    });
  };

  /**
   * 获取用户的测试历史
   */
  StressTestResult.findByUserId = async function(userId, options = {}) {
    const { limit = 20, offset = 0, order = [['created_at', 'DESC']] } = options;
    
    return await this.findAll({
      where: { userId },
      limit,
      offset,
      order
    });
  };

  /**
   * 获取最近的测试结果
   */
  StressTestResult.getRecent = async function(limit = 10) {
    return await this.findAll({
      where: { status: 'completed' },
      limit,
      order: [['created_at', 'DESC']]
    });
  };

  /**
   * 统计分析
   */
  StressTestResult.getStatistics = async function(options = {}) {
    const { startDate, endDate, userId } = options;
    
    const where = { status: 'completed' };
    if (startDate) where.createdAt = { $gte: startDate };
    if (endDate) where.createdAt = { ...where.createdAt, $lte: endDate };
    if (userId) where.userId = userId;

    const results = await this.findAll({ where });

    if (results.length === 0) {
      return {
        totalTests: 0,
        avgSuccessRate: 0,
        avgResponseTime: 0,
        avgThroughput: 0
      };
    }

    const totalTests = results.length;
    const avgSuccessRate = results.reduce((sum, r) => sum + parseFloat(r.successRate || 0), 0) / totalTests;
    const avgResponseTime = results.reduce((sum, r) => sum + parseFloat(r.avgResponseTime || 0), 0) / totalTests;
    const avgThroughput = results.reduce((sum, r) => sum + parseFloat(r.throughput || 0), 0) / totalTests;

    return {
      totalTests,
      avgSuccessRate: Math.round(avgSuccessRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      avgThroughput: Math.round(avgThroughput * 100) / 100
    };
  };

  // 实例方法

  /**
   * 更新测试状态
   */
  StressTestResult.prototype.updateStatus = async function(status, errorMessage = null) {
    this.status = status;
    if (errorMessage) {
      this.errorMessage = errorMessage;
    }
    if (status === 'completed' || status === 'failed' || status === 'stopped') {
      this.endTime = new Date();
      if (this.startTime) {
        this.duration = this.endTime - this.startTime;
      }
    }
    return await this.save();
  };

  /**
   * 设置测试结果
   */
  StressTestResult.prototype.setResults = async function(results) {
    this.results = results;
    
    // 提取关键指标
    if (results.loadResults) {
      const loadResults = results.loadResults;
      this.totalRequests = loadResults.totalRequests;
      this.successfulRequests = loadResults.successfulRequests;
      this.failedRequests = loadResults.failedRequests;
      this.successRate = loadResults.successRate;
      this.avgResponseTime = loadResults.avgResponseTime;
      this.minResponseTime = loadResults.minResponseTime;
      this.maxResponseTime = loadResults.maxResponseTime;
      this.throughput = loadResults.throughput;
    }

    this.status = 'completed';
    this.endTime = new Date();
    if (this.startTime) {
      this.duration = this.endTime - this.startTime;
    }

    return await this.save();
  };

  /**
   * 对比两个测试结果
   */
  StressTestResult.compare = function(result1, result2) {
    return {
      successRate: {
        current: result1.successRate,
        previous: result2.successRate,
        change: result1.successRate - result2.successRate,
        changePercent: ((result1.successRate - result2.successRate) / result2.successRate * 100).toFixed(2)
      },
      avgResponseTime: {
        current: result1.avgResponseTime,
        previous: result2.avgResponseTime,
        change: result1.avgResponseTime - result2.avgResponseTime,
        changePercent: ((result1.avgResponseTime - result2.avgResponseTime) / result2.avgResponseTime * 100).toFixed(2)
      },
      throughput: {
        current: result1.throughput,
        previous: result2.throughput,
        change: result1.throughput - result2.throughput,
        changePercent: ((result1.throughput - result2.throughput) / result2.throughput * 100).toFixed(2)
      }
    };
  };

  return StressTestResult;
};
