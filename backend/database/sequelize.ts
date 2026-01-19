import { DataTypes, Sequelize } from 'sequelize';
const config = require('../config/database');

const createWorkspace = require('../models/Workspace').default || require('../models/Workspace');
const createWorkspaceMember =
  require('../models/WorkspaceMember').default || require('../models/WorkspaceMember');
const createUser = require('../models/User').default || require('../models/User');
const createCollection = require('../models/Collection').default || require('../models/Collection');
const createEnvironment =
  require('../models/Environment').default || require('../models/Environment');
const createEnvironmentVariable =
  require('../models/EnvironmentVariable').default || require('../models/EnvironmentVariable');
const createGlobalVariable =
  require('../models/GlobalVariable').default || require('../models/GlobalVariable');
const createRun = require('../models/Run').default || require('../models/Run');
const createRunResult = require('../models/RunResult').default || require('../models/RunResult');
const createScheduledRun =
  require('../models/ScheduledRun').default || require('../models/ScheduledRun');
const createScheduledRunResult =
  require('../models/ScheduledRunResult').default || require('../models/ScheduledRunResult');

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

const models = {
  Workspace: createWorkspace(sequelize),
  WorkspaceMember: createWorkspaceMember(sequelize),
  User: createUser(sequelize),
  Collection: createCollection(sequelize),
  Environment: createEnvironment(sequelize),
  EnvironmentVariable: createEnvironmentVariable(sequelize),
  GlobalVariable: createGlobalVariable(sequelize),
  Run: createRun(sequelize),
  RunResult: createRunResult(sequelize),
  ScheduledRun: createScheduledRun(sequelize),
  ScheduledRunResult: createScheduledRunResult(sequelize),
};

models.WorkspaceMember.belongsTo(models.Workspace, {
  foreignKey: 'workspace_id',
  as: 'workspace',
});
models.Workspace.hasMany(models.WorkspaceMember, {
  foreignKey: 'workspace_id',
  as: 'members',
});
models.Environment.hasMany(models.EnvironmentVariable, {
  foreignKey: 'environment_id',
  as: 'variables',
});
models.EnvironmentVariable.belongsTo(models.Environment, {
  foreignKey: 'environment_id',
});
models.Run.hasMany(models.RunResult, {
  foreignKey: 'run_id',
  as: 'results',
});
models.RunResult.belongsTo(models.Run, {
  foreignKey: 'run_id',
});
models.ScheduledRun.hasMany(models.ScheduledRunResult, {
  foreignKey: 'scheduled_run_id',
  as: 'executions',
});
models.ScheduledRunResult.belongsTo(models.ScheduledRun, {
  foreignKey: 'scheduled_run_id',
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

const connectDatabase = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
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

export {
  closeConnection,
  connectDatabase,
  DataTypes,
  models,
  sequelize,
  syncDatabase,
  testConnection,
};

export default sequelize;

module.exports = {
  sequelize,
  models,
  connectDatabase,
  syncDatabase,
  closeConnection,
  testConnection,
  DataTypes,
};
