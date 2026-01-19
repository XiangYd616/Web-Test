/**
 * 环境变量模型
 */

import { DataTypes, Model, ModelCtor, Sequelize } from 'sequelize';

type EnvironmentVariableInstance = Model & {
  id: string;
  environmentId: string;
  key: string;
  value: string;
  type?: string;
  description?: string | null;
  enabled?: boolean;
  secret?: boolean;
  encrypted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

type EnvironmentVariableModel = ModelCtor<EnvironmentVariableInstance>;

const createEnvironmentVariable = (sequelize: Sequelize): EnvironmentVariableModel => {
  const EnvironmentVariable = sequelize.define(
    'EnvironmentVariable',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      environmentId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'environment_id',
      },
      key: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      secret: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      encrypted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
      },
    },
    {
      tableName: 'environment_variables',
      timestamps: true,
      underscored: true,
    }
  ) as EnvironmentVariableModel;

  return EnvironmentVariable;
};

export default createEnvironmentVariable;
