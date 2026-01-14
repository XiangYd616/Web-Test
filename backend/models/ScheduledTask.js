/**
 * 定时任务数据模型
 * 
 * 文件路径: backend/models/ScheduledTask.js
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

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ScheduledTask = sequelize.define('ScheduledTask', {
    // 主键
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // 任务ID (UUID)
    taskId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
      allowNull: false,
      field: 'task_id'
    },

    // 任务名称
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },

    // 任务类型
    type: {
      type: DataTypes.ENUM('stress', 'api', 'performance', 'security', 'seo', 'compatibility'),
      allowNull: false
    },

    // Cron表达式
    schedule: {
      type: DataTypes.STRING(100),
      allowNull: true, // 允许为空（一次性任务）
      comment: 'Cron表达式，例如：0 */6 * * * (每6小时)'
    },

    // 测试配置
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: '测试引擎配置参数'
    },

    // 是否启用
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },

    // 元数据
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: '自定义元数据'
    },

    // 用户ID（可选）
    userId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'user_id'
    },

    // 最后执行时间
    lastExecutedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_executed_at'
    },

    // 下次执行时间
    nextExecutionAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'next_execution_at'
    },

    // 执行次数
    executionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      field: 'execution_count'
    },

    // 失败次数
    failureCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      field: 'failure_count'
    },

    // 创建时间
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },

    // 更新时间
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'scheduled_tasks',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['task_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['type']
      },
      {
        fields: ['enabled']
      },
      {
        fields: ['next_execution_at']
      }
    ]
  });

  // 类方法：查找启用的任务
  ScheduledTask.findEnabled = function() {
    return this.findAll({
      where: { enabled: true },
      order: [['next_execution_at', 'ASC']]
    });
  };

  // 类方法：按类型查找
  ScheduledTask.findByType = function(type) {
    return this.findAll({
      where: { type },
      order: [['created_at', 'DESC']]
    });
  };

  // 类方法：按用户查找
  ScheduledTask.findByUserId = function(userId) {
    return this.findAll({
      where: { userId },
      order: [['created_at', 'DESC']]
    });
  };

  // 实例方法：启用任务
  ScheduledTask.prototype.enable = async function() {
    this.enabled = true;
    return this.save();
  };

  // 实例方法：禁用任务
  ScheduledTask.prototype.disable = async function() {
    this.enabled = false;
    return this.save();
  };

  // 实例方法：更新执行统计
  ScheduledTask.prototype.updateExecutionStats = async function(success = true) {
    this.executionCount++;
    if (!success) {
      this.failureCount++;
    }
    this.lastExecutedAt = new Date();
    return this.save();
  };

  // 实例方法：更新下次执行时间
  ScheduledTask.prototype.updateNextExecution = async function(nextTime) {
    this.nextExecutionAt = nextTime;
    return this.save();
  };

  // 实例方法：获取成功率
  ScheduledTask.prototype.getSuccessRate = function() {
    if (this.executionCount === 0) return 0;
    const successCount = this.executionCount - this.failureCount;
    return (successCount / this.executionCount * 100).toFixed(2);
  };

  return ScheduledTask;
};
