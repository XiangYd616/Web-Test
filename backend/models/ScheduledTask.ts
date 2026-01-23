/**
 * 定时任务数据模型
 *
 * 文件路径: backend/models/ScheduledTask.ts
 * 创建时间: 2025-11-14
 *
 * 字段：
 * - taskId (UUID)
 * - name (任务名称)
 * - type (任务类型: stress/api/performance/security)
 * - schedule (cron表达式)
 * - config (测试配置, JSON)
 * - enabled (是否启用)
 * - metadata (元数据, JSON)
 * - lastExecutedAt (最后执行时间)
 * - nextExecutionAt (下次执行时间)
 * - executionCount (执行次数)
 * - failureCount (失败次数)
 */

import { DataTypes, Model, ModelCtor, Sequelize } from 'sequelize';

type ScheduledTaskInstance = Model & {
  enabled?: boolean;
  executionCount?: number;
  failureCount?: number;
  lastExecutedAt?: Date | null;
  nextExecutionAt?: Date | null;
  save: () => Promise<Model>;
};

type ScheduledTaskInstanceMethods = ScheduledTaskInstance & {
  enable: () => Promise<Model>;
  disable: () => Promise<Model>;
  updateExecutionStats: (success?: boolean) => Promise<Model>;
  updateNextExecution: (nextTime: Date) => Promise<Model>;
  getSuccessRate: () => string | number;
};

type ScheduledTaskModel = ModelCtor<Model> & {
  findEnabled: () => Promise<Model[]>;
  findByType: (type: string) => Promise<Model[]>;
  findByUserId: (userId: string) => Promise<Model[]>;
};

const createScheduledTask = (sequelize: Sequelize): ScheduledTaskModel => {
  const ScheduledTask = sequelize.define(
    'ScheduledTask',
    {
      // 主键
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // 任务ID (UUID)
      taskId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
        field: 'task_id',
      },

      // 任务名称
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },

      // 任务类型
      type: {
        type: DataTypes.ENUM(
          'stress',
          'api',
          'performance',
          'security',
          'seo',
          'website',
          'accessibility'
        ),
        allowNull: false,
      },

      // Cron表达式
      schedule: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Cron表达式，例如：0 */6 * * * (每6小时)',
      },

      // 测试配置
      config: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: '测试引擎配置参数',
      },

      // 是否启用
      enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },

      // 元数据
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: '自定义元数据',
      },

      // 用户ID（可选）
      userId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'user_id',
      },

      // 最后执行时间
      lastExecutedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_executed_at',
      },

      // 下次执行时间
      nextExecutionAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'next_execution_at',
      },

      // 执行次数
      executionCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        field: 'execution_count',
      },

      // 失败次数
      failureCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        field: 'failure_count',
      },

      // 创建时间
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },

      // 更新时间
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
      },
    },
    {
      tableName: 'scheduled_tasks',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['task_id'] },
        { fields: ['user_id'] },
        { fields: ['type'] },
        { fields: ['enabled'] },
        { fields: ['next_execution_at'] },
      ],
    }
  ) as ScheduledTaskModel;

  const ScheduledTaskWithInstance = ScheduledTask as unknown as ScheduledTaskModel & {
    prototype: ScheduledTaskInstanceMethods;
  };

  // 类方法：查找启用的任务
  ScheduledTask.findEnabled = function findEnabled() {
    return this.findAll({
      where: { enabled: true },
      order: [['next_execution_at', 'ASC']],
    });
  };

  // 类方法：按类型查找
  ScheduledTask.findByType = function findByType(type: string) {
    return this.findAll({
      where: { type },
      order: [['created_at', 'DESC']],
    });
  };

  // 类方法：按用户查找
  ScheduledTask.findByUserId = function findByUserId(userId: string) {
    return this.findAll({
      where: { userId },
      order: [['created_at', 'DESC']],
    });
  };

  // 实例方法：启用任务
  ScheduledTaskWithInstance.prototype.enable = async function enable(this: ScheduledTaskInstance) {
    this.enabled = true;
    return this.save();
  };

  // 实例方法：禁用任务
  ScheduledTaskWithInstance.prototype.disable = async function disable(
    this: ScheduledTaskInstance
  ) {
    this.enabled = false;
    return this.save();
  };

  // 实例方法：更新执行统计
  ScheduledTaskWithInstance.prototype.updateExecutionStats = async function updateExecutionStats(
    this: ScheduledTaskInstance,
    success = true
  ) {
    this.executionCount = (this.executionCount ?? 0) + 1;
    if (!success) {
      this.failureCount = (this.failureCount ?? 0) + 1;
    }
    this.lastExecutedAt = new Date();
    return this.save();
  };

  // 实例方法：更新下次执行时间
  ScheduledTaskWithInstance.prototype.updateNextExecution = async function updateNextExecution(
    this: ScheduledTaskInstance,
    nextTime: Date
  ) {
    this.nextExecutionAt = nextTime;
    return this.save();
  };

  // 实例方法：获取成功率
  ScheduledTaskWithInstance.prototype.getSuccessRate = function getSuccessRate(
    this: ScheduledTaskInstance
  ) {
    if (!this.executionCount) return 0;
    const successCount = (this.executionCount ?? 0) - (this.failureCount ?? 0);
    return ((successCount / (this.executionCount ?? 1)) * 100).toFixed(2);
  };

  return ScheduledTask;
};

export default createScheduledTask;

// 兼容 CommonJS require
module.exports = createScheduledTask;
