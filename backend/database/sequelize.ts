import { DataTypes, Sequelize } from 'sequelize';
const config = require('../config/database');

// 创建Sequelize实例
const sequelize = new Sequelize(config.database, config.username || config.user, config.password, {
  host: config.host,
  dialect: 'postgres', // 固定使用PostgreSQL
  port: config.port,
  logging: config.logging || false,
  pool: config.pool || {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
  dialectOptions: config.ssl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
});

// 测试数据库连接
const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  }
};

// 同步数据库模型
const syncDatabase = async (force = false): Promise<void> => {
  try {
    await sequelize.sync({ force });
    console.log(`数据库同步完成 (force: ${force})`);
  } catch (error) {
    console.error('数据库同步失败:', error);
    throw error;
  }
};

// 关闭数据库连接
const closeConnection = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('数据库连接已关闭');
  } catch (error) {
    console.error('关闭数据库连接失败:', error);
    throw error;
  }
};

export { closeConnection, DataTypes, sequelize, syncDatabase, testConnection };

export default sequelize;
