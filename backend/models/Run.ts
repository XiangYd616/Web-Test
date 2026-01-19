/**
 * 运行记录模型
 */

import { DataTypes, Model, ModelCtor, Sequelize } from 'sequelize';

type RunInstance = Model & {
  id: string;
  collection_id: string;
  environment_id?: string | null;
  workspace_id?: string | null;
  user_id: string;
  status: string;
  options?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  started_at?: Date;
  completed_at?: Date;
  duration?: number;
  created_at?: Date;
  updated_at?: Date;
};

type RunModel = ModelCtor<RunInstance>;

const createRun = (sequelize: Sequelize): RunModel => {
  const Run = sequelize.define(
    'Run',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      collection_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      environment_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      workspace_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'running',
      },
      options: {
        type: DataTypes.JSONB,
        defaultValue: {},
      },
      summary: {
        type: DataTypes.JSONB,
        defaultValue: {},
      },
      started_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      duration: {
        type: DataTypes.INTEGER,
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
      tableName: 'runs',
      timestamps: true,
      underscored: true,
    }
  ) as RunModel;

  return Run;
};

export default createRun;
