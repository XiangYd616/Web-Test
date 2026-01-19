/**
 * 运行结果模型
 */

import { DataTypes, Model, ModelCtor, Sequelize } from 'sequelize';

type RunResultInstance = Model & {
  id: string;
  run_id: string;
  request_id: string;
  status: string;
  response?: Record<string, unknown>;
  assertions?: Array<Record<string, unknown>>;
  duration?: number;
  created_at?: Date;
  updated_at?: Date;
};

type RunResultModel = ModelCtor<RunResultInstance>;

const createRunResult = (sequelize: Sequelize): RunResultModel => {
  const RunResult = sequelize.define(
    'RunResult',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      run_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      request_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      response: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      assertions: {
        type: DataTypes.JSONB,
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
      tableName: 'run_results',
      timestamps: true,
      underscored: true,
    }
  ) as RunResultModel;

  return RunResult;
};

export default createRunResult;
