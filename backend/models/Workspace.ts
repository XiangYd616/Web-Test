/**
 * 工作空间模型
 */

import { DataTypes, Model, ModelCtor, Sequelize } from 'sequelize';

type WorkspaceInstance = Model & {
  id: string;
  name: string;
  description?: string | null;
  visibility: 'private' | 'team' | 'public';
  owner_id: string;
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
};

type WorkspaceModel = ModelCtor<WorkspaceInstance>;

const createWorkspace = (sequelize: Sequelize): WorkspaceModel => {
  const Workspace = sequelize.define(
    'Workspace',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      visibility: {
        type: DataTypes.ENUM('private', 'team', 'public'),
        defaultValue: 'private',
        allowNull: false,
      },
      owner_id: {
        type: DataTypes.UUID,
        allowNull: false,
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
      tableName: 'workspaces',
      timestamps: true,
      underscored: true,
    }
  ) as WorkspaceModel;

  return Workspace;
};

export default createWorkspace;
