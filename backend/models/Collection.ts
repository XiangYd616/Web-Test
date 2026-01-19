/**
 * 集合模型
 */

import { DataTypes, Model, ModelCtor, Sequelize } from 'sequelize';

type CollectionInstance = Model & {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  created_by?: string | null;
  definition?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
};

type CollectionModel = ModelCtor<CollectionInstance>;

const createCollection = (sequelize: Sequelize): CollectionModel => {
  const Collection = sequelize.define(
    'Collection',
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
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      definition: {
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
      tableName: 'collections',
      timestamps: true,
      underscored: true,
    }
  ) as CollectionModel;

  return Collection;
};

export default createCollection;
