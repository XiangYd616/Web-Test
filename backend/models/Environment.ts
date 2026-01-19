/**
 * 环境模型
 */

import { DataTypes, Model, ModelCtor, Sequelize } from 'sequelize';

type EnvironmentInstance = Model & {
  id: string;
  workspace_id?: string | null;
  name: string;
  description?: string | null;
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
};

type EnvironmentModel = ModelCtor<EnvironmentInstance>;

const createEnvironment = (sequelize: Sequelize): EnvironmentModel => {
  const Environment = sequelize.define(
    'Environment',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      workspace_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      config: {
        type: DataTypes.JSONB,
        defaultValue: {},
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
      tableName: 'environments',
      timestamps: true,
      underscored: true,
    }
  ) as EnvironmentModel;

  return Environment;
};

export default createEnvironment;
