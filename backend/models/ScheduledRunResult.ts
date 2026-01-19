/**
 * 定时运行执行结果模型
 */

import { DataTypes, Model, ModelCtor, Sequelize } from 'sequelize';

type ScheduledRunResultInstance = Model & {
  id: string;
  scheduled_run_id: string;
  status: string;
  started_at?: Date;
  completed_at?: Date;
  duration?: number;
  total_requests?: number;
  passed_requests?: number;
  failed_requests?: number;
  error_count?: number;
  logs?: string[];
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
};

type ScheduledRunResultModel = ModelCtor<ScheduledRunResultInstance>;

const createScheduledRunResult = (sequelize: Sequelize): ScheduledRunResultModel => {
  const ScheduledRunResult = sequelize.define(
    'ScheduledRunResult',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      scheduled_run_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'running',
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      total_requests: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      passed_requests: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      failed_requests: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      error_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      logs: {
        type: DataTypes.JSONB,
        defaultValue: [],
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {},
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'scheduled_run_results',
      timestamps: true,
      underscored: true,
    }
  ) as ScheduledRunResultModel;

  return ScheduledRunResult;
};

export default createScheduledRunResult;
