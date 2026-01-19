/**
 * 全局变量模型
 */

import { DataTypes, Model, ModelCtor, Sequelize } from 'sequelize';

type GlobalVariableInstance = Model & {
  id: string;
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

type GlobalVariableModel = ModelCtor<GlobalVariableInstance>;

const createGlobalVariable = (sequelize: Sequelize): GlobalVariableModel => {
  const GlobalVariable = sequelize.define(
    'GlobalVariable',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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
      tableName: 'global_variables',
      timestamps: true,
      underscored: true,
    }
  ) as GlobalVariableModel;

  return GlobalVariable;
};

export default createGlobalVariable;
