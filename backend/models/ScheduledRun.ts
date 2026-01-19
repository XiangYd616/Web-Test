/**
 * 定时运行模型
 */

import { DataTypes, Model, ModelCtor, Sequelize } from 'sequelize';

type ScheduledRunInstance = Model & {
  id: string;
  workspace_id: string;
  collection_id: string;
  environment_id?: string | null;
  cron_expression: string;
  config?: Record<string, unknown>;
  status: string;
  name?: string | null;
  description?: string | null;
  created_by?: string | null;
  last_run_at?: Date | null;
  next_run_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
};

type ScheduledRunModel = ModelCtor<ScheduledRunInstance>;

const createScheduledRun = (sequelize: Sequelize): ScheduledRunModel => {
  const ScheduledRun = sequelize.define(
    'ScheduledRun',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      workspace_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      collection_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      environment_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      cron_expression: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      config: {
        type: DataTypes.JSONB,
        defaultValue: {},
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      last_run_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      next_run_at: {
        type: DataTypes.DATE,
        allowNull: true,
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
      tableName: 'scheduled_runs',
      timestamps: true,
      underscored: true,
    }
  ) as ScheduledRunModel;

  return ScheduledRun;
};

export default createScheduledRun;
