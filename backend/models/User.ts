/**
 * 用户模型
 */

import { DataTypes, Model, ModelCtor, Sequelize } from 'sequelize';

type UserInstance = Model & {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  created_at?: Date;
  updated_at?: Date;
};

type UserModel = ModelCtor<UserInstance>;

const createUser = (sequelize: Sequelize): UserModel => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'user',
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active',
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
      tableName: 'users',
      timestamps: true,
      underscored: true,
    }
  ) as UserModel;

  return User;
};

export default createUser;
