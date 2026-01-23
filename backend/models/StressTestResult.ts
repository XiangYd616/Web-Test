/**
 * 压力测试结果数据模型
 *
 * 文件路径: backend/models/StressTestResult.ts
 * 创建时间: 2025-11-14
 *
 * 功能:
 * - 存储压力测试结果
 * - 支持历史查询和对比
 * - 性能统计分析
 */

import { DataTypes, Model, ModelCtor, Op, Sequelize, type Order } from 'sequelize';

type StressTestResultInstance = Model & {
  status?: string;
  errorMessage?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  duration?: number | null;
  results?: Record<string, unknown> | null;
  totalRequests?: number | null;
  successfulRequests?: number | null;
  failedRequests?: number | null;
  successRate?: number | string | null;
  avgResponseTime?: number | string | null;
  minResponseTime?: number | string | null;
  maxResponseTime?: number | string | null;
  throughput?: number | string | null;
  save: () => Promise<Model>;
};

type StressTestResultInstanceMethods = StressTestResultInstance & {
  updateStatus: (status: string, errorMessage?: string | null) => Promise<Model>;
  setResults: (results: Record<string, unknown>) => Promise<Model>;
};

type StressTestResultModel = ModelCtor<Model> & {
  findByUrl: (
    url: string,
    options?: { limit?: number; offset?: number; order?: Order }
  ) => Promise<Model[]>;
  findByUserId: (
    userId: string,
    options?: { limit?: number; offset?: number; order?: Order }
  ) => Promise<Model[]>;
  getRecent: (limit?: number) => Promise<Model[]>;
  getStatistics: (options?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }) => Promise<Record<string, number>>;
  compare: (
    result1: StressTestResultInstance,
    result2: StressTestResultInstance
  ) => Record<string, unknown>;
};

const createStressTestResult = (sequelize: Sequelize): StressTestResultModel => {
  const StressTestResult = sequelize.define(
    'StressTestResult',
    {
      // 主键
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '测试结果唯一标识',
      },

      // 测试标识
      testId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: '测试会话ID',
      },

      // 用户ID
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: '执行测试的用户ID',
      },

      // 测试名称
      testName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '测试名称',
      },

      // 测试URL
      url: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '被测试的URL',
      },

      // 测试配置
      config: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: '测试配置(JSON格式)',
        defaultValue: {},
      },

      // 测试状态
      status: {
        type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'stopped'),
        allowNull: false,
        defaultValue: 'pending',
        comment: '测试状态',
      },

      // 测试结果
      results: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: '测试结果详细数据(JSON格式)',
      },

      // 性能指标
      totalRequests: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '总请求数',
      },

      successfulRequests: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '成功请求数',
      },

      failedRequests: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '失败请求数',
      },

      successRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: '成功率(%)',
      },

      avgResponseTime: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: '平均响应时间(ms)',
      },

      minResponseTime: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: '最小响应时间(ms)',
      },

      maxResponseTime: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: '最大响应时间(ms)',
      },

      throughput: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: '吞吐量(RPS)',
      },

      // 时间相关
      startTime: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '测试开始时间',
      },

      endTime: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '测试结束时间',
      },

      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '测试持续时间(毫秒)',
      },

      // 错误信息
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '错误信息',
      },

      // 标签
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
        comment: '标签列表',
      },

      // 环境信息
      environment: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '测试环境(dev/test/prod)',
      },

      // 元数据
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: '额外的元数据',
      },
    },
    {
      tableName: 'stress_test_results',
      timestamps: true,
      underscored: true,
      indexes: [
        { name: 'idx_test_id', fields: ['test_id'] },
        { name: 'idx_user_id', fields: ['user_id'] },
        { name: 'idx_status', fields: ['status'] },
        { name: 'idx_created_at', fields: ['created_at'] },
        { name: 'idx_url', fields: ['url'], using: 'hash' },
      ],
      comment: '压力测试结果表',
    }
  ) as StressTestResultModel;

  const StressTestResultWithInstance = StressTestResult as unknown as StressTestResultModel & {
    prototype: StressTestResultInstanceMethods;
  };

  // 类方法

  /**
   * 根据URL查询测试历史
   */
  StressTestResult.findByUrl = async function findByUrl(
    url: string,
    options: { limit?: number; offset?: number; order?: Order } = {}
  ) {
    const { limit = 10, offset = 0, order = [['created_at', 'DESC']] } = options;

    return this.findAll({
      where: { url, status: 'completed' },
      limit,
      offset,
      order,
    });
  };

  /**
   * 获取用户的测试历史
   */
  StressTestResult.findByUserId = async function findByUserId(
    userId: string,
    options: { limit?: number; offset?: number; order?: Order } = {}
  ) {
    const { limit = 20, offset = 0, order = [['created_at', 'DESC']] } = options;

    return this.findAll({
      where: { userId },
      limit,
      offset,
      order,
    });
  };

  /**
   * 获取最近的测试结果
   */
  StressTestResult.getRecent = async function getRecent(limit = 10) {
    return this.findAll({
      where: { status: 'completed' },
      limit,
      order: [['created_at', 'DESC']],
    });
  };

  /**
   * 统计分析
   */
  StressTestResult.getStatistics = async function getStatistics(
    options: { startDate?: Date; endDate?: Date; userId?: string } = {}
  ) {
    const { startDate, endDate, userId } = options;

    const where: Record<string, unknown> = { status: 'completed' };
    const createdAt: Record<string | symbol, Date> = {};
    if (startDate) {
      createdAt[Op.gte] = startDate;
    }
    if (endDate) {
      createdAt[Op.lte] = endDate;
    }
    if (Object.keys(createdAt).length > 0) {
      where.createdAt = createdAt;
    }
    if (userId) {
      where.userId = userId;
    }

    const results = (await this.findAll({ where })) as StressTestResultInstance[];

    if (results.length === 0) {
      return {
        totalTests: 0,
        avgSuccessRate: 0,
        avgResponseTime: 0,
        avgThroughput: 0,
      };
    }

    const totalTests = results.length;
    const avgSuccessRate =
      results.reduce((sum, r) => sum + Number.parseFloat(String(r.successRate ?? 0)), 0) /
      totalTests;
    const avgResponseTime =
      results.reduce((sum, r) => sum + Number.parseFloat(String(r.avgResponseTime ?? 0)), 0) /
      totalTests;
    const avgThroughput =
      results.reduce((sum, r) => sum + Number.parseFloat(String(r.throughput ?? 0)), 0) /
      totalTests;

    return {
      totalTests,
      avgSuccessRate: Math.round(avgSuccessRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      avgThroughput: Math.round(avgThroughput * 100) / 100,
    };
  };

  // 实例方法

  /**
   * 更新测试状态
   */
  StressTestResultWithInstance.prototype.updateStatus = async function updateStatus(
    this: StressTestResultInstance,
    status: string,
    errorMessage: string | null = null
  ) {
    this.status = status;
    if (errorMessage) {
      this.errorMessage = errorMessage;
    }
    if (status === 'completed' || status === 'failed' || status === 'stopped') {
      this.endTime = new Date();
      if (this.startTime) {
        this.duration = this.endTime.getTime() - this.startTime.getTime();
      }
    }
    return this.save();
  };

  /**
   * 设置测试结果
   */
  StressTestResultWithInstance.prototype.setResults = async function setResults(
    this: StressTestResultInstance,
    results: Record<string, unknown>
  ) {
    this.results = results;

    if (results && (results as { loadResults?: Record<string, unknown> }).loadResults) {
      const loadResults = (results as { loadResults: Record<string, unknown> }).loadResults;
      this.totalRequests = loadResults.totalRequests as number | undefined;
      this.successfulRequests = loadResults.successfulRequests as number | undefined;
      this.failedRequests = loadResults.failedRequests as number | undefined;
      this.successRate = loadResults.successRate as number | undefined;
      this.avgResponseTime = loadResults.avgResponseTime as number | undefined;
      this.minResponseTime = loadResults.minResponseTime as number | undefined;
      this.maxResponseTime = loadResults.maxResponseTime as number | undefined;
      this.throughput = loadResults.throughput as number | undefined;
    }

    this.status = 'completed';
    this.endTime = new Date();
    if (this.startTime) {
      this.duration = this.endTime.getTime() - this.startTime.getTime();
    }

    return this.save();
  };

  /**
   * 对比两个测试结果
   */
  StressTestResult.compare = function compare(
    result1: StressTestResultInstance,
    result2: StressTestResultInstance
  ) {
    const safeDivide = (numerator: number, denominator: number) => {
      if (!denominator) return 0;
      return Number(((numerator / denominator) * 100).toFixed(2));
    };

    return {
      successRate: {
        current: result1.successRate,
        previous: result2.successRate,
        change: Number(result1.successRate ?? 0) - Number(result2.successRate ?? 0),
        changePercent: safeDivide(
          Number(result1.successRate ?? 0) - Number(result2.successRate ?? 0),
          Number(result2.successRate ?? 0)
        ),
      },
      avgResponseTime: {
        current: result1.avgResponseTime,
        previous: result2.avgResponseTime,
        change: Number(result1.avgResponseTime ?? 0) - Number(result2.avgResponseTime ?? 0),
        changePercent: safeDivide(
          Number(result1.avgResponseTime ?? 0) - Number(result2.avgResponseTime ?? 0),
          Number(result2.avgResponseTime ?? 0)
        ),
      },
      throughput: {
        current: result1.throughput,
        previous: result2.throughput,
        change: Number(result1.throughput ?? 0) - Number(result2.throughput ?? 0),
        changePercent: safeDivide(
          Number(result1.throughput ?? 0) - Number(result2.throughput ?? 0),
          Number(result2.throughput ?? 0)
        ),
      },
    };
  };

  return StressTestResult;
};

export default createStressTestResult;

// 兼容 CommonJS require
module.exports = createStressTestResult;
