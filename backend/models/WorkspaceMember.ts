/**
 * 工作空间成员模型
 */

import { DataTypes, Model, ModelCtor, Sequelize } from 'sequelize';

type WorkspaceMemberInstance = Model & {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  status: string;
  invited_by?: string | null;
  created_at?: Date;
  updated_at?: Date;
};

type WorkspaceMemberModel = ModelCtor<WorkspaceMemberInstance>;

const createWorkspaceMember = (sequelize: Sequelize): WorkspaceMemberModel => {
  const WorkspaceMember = sequelize.define(
    'WorkspaceMember',
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
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'member',
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active',
      },
      invited_by: {
        type: DataTypes.UUID,
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
      tableName: 'workspace_members',
      timestamps: true,
      underscored: true,
    }
  ) as WorkspaceMemberModel;

  return WorkspaceMember;
};

export default createWorkspaceMember;
