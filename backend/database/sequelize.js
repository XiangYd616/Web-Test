const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database');

// 创建Sequelize实例
const sequelize = new Sequelize(
  config.database,
  config.username || config.user,
  config.password,
  {
    host: config.host,
    dialect: 'postgres', // 固定使用PostgreSQL
    port: config.port,
    logging: config.logging || false,
    pool: config.pool || {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    },
    dialectOptions: config.ssl ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {}
  }
);

// 定义模型
const models = {};

// 测试记录模型
models.Test = sequelize.define('tests', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  test_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    index: true
  },
  test_type: {
    type: DataTypes.ENUM('api', 'security', 'stress', 'seo', 'website', 'accessibility'),
    allowNull: false,
    index: true
  },
  test_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  config: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  status: {
    type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'stopped', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
    index: true
  },
  progress: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  results: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Test duration in milliseconds'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    index: true
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  indexes: [
    {
      fields: ['test_type', 'status']
    },
    {
      fields: ['user_id', 'created_at']
    },
    {
      fields: ['created_at']
    }
  ]
});

// 配置模板模型
models.ConfigTemplate = sequelize.define('config_templates', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  test_type: {
    type: DataTypes.ENUM('api', 'security', 'stress', 'seo', 'website', 'accessibility'),
    allowNull: false,
    index: true
  },
  config: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    index: true
  },
  usage_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
});

// 用户模型
models.User = sequelize.define('users', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'user', 'viewer'),
    allowNull: false,
    defaultValue: 'user'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  settings: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  
  // MFA (Multi-Factor Authentication) 相关字段
  mfa_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'mfa_enabled'
  },
  mfa_secret: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'mfa_secret'
  },
  mfa_backup_codes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'mfa_backup_codes'
  },
  mfa_temp_secret: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'mfa_temp_secret'
  },
  
  // 安全相关字段
  failed_login_attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  locked_until: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

// 工作空间模型
models.Workspace = sequelize.define('workspaces', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  visibility: {
    type: DataTypes.ENUM('private', 'team', 'public'),
    allowNull: false,
    defaultValue: 'private'
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    index: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
});

// 工作空间成员模型
models.WorkspaceMember = sequelize.define('workspace_members', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workspace_id: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true
  },
  role: {
    type: DataTypes.ENUM('owner', 'admin', 'member', 'viewer'),
    allowNull: false,
    defaultValue: 'member'
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'inactive'),
    allowNull: false,
    defaultValue: 'active'
  },
  permissions: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  invited_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  invited_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  joined_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

// 集合模型
models.Collection = sequelize.define('collections', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workspace_id: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  version: {
    type: DataTypes.STRING,
    allowNull: true
  },
  auth: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  events: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  variables: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true
  }
});

// 集合项模型（文件夹/请求）
models.CollectionItem = sequelize.define('collection_items', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  collection_id: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true
  },
  parent_id: {
    type: DataTypes.UUID,
    allowNull: true,
    index: true
  },
  type: {
    type: DataTypes.ENUM('folder', 'request'),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  request_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  order_index: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
});

// 环境模型
models.Environment = sequelize.define('environments', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workspace_id: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  config: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true
  }
});

// 环境变量模型
models.EnvironmentVariable = sequelize.define('environment_variables', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  environment_id: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'string'
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  secret: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  encrypted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
});

// 全局变量模型
models.GlobalVariable = sequelize.define('global_variables', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true
  },
  workspace_id: {
    type: DataTypes.UUID,
    allowNull: true,
    index: true
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'string'
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  secret: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  encrypted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
});

// 运行记录模型
models.Run = sequelize.define('runs', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workspace_id: {
    type: DataTypes.UUID,
    allowNull: true,
    index: true
  },
  collection_id: {
    type: DataTypes.UUID,
    allowNull: true,
    index: true
  },
  environment_id: {
    type: DataTypes.UUID,
    allowNull: true,
    index: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  duration_ms: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  summary: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true
  }
});

// 运行结果模型
models.RunResult = sequelize.define('run_results', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  run_id: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true
  },
  item_id: {
    type: DataTypes.UUID,
    allowNull: true,
    index: true
  },
  request_snapshot: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  response: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  assertions: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  duration_ms: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
});

// 定时运行任务模型
models.ScheduledRun = sequelize.define('scheduled_runs', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workspace_id: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true
  },
  collection_id: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true
  },
  environment_id: {
    type: DataTypes.UUID,
    allowNull: true,
    index: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cron: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active'
  },
  config: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  last_run_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true
  }
});

// 测试队列模型
models.TestQueue = sequelize.define('test_queue', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  test_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('queued', 'processing', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'queued',
    index: true
  },
  worker_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  retry_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  max_retries: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

// 系统监控模型
models.SystemMetrics = sequelize.define('system_metrics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  metric_type: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true
  },
  metric_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tags: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    index: true
  }
});

// 定义关联关系
models.User.hasMany(models.Test, { foreignKey: 'user_id', as: 'tests' });
models.Test.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });

models.User.hasMany(models.ConfigTemplate, { foreignKey: 'user_id', as: 'configTemplates' });
models.ConfigTemplate.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });

models.Test.hasOne(models.TestQueue, { foreignKey: 'test_id', sourceKey: 'test_id', as: 'queueItem' });
models.TestQueue.belongsTo(models.Test, { foreignKey: 'test_id', targetKey: 'test_id', as: 'test' });

models.User.hasMany(models.Workspace, { foreignKey: 'created_by', as: 'workspaces' });
models.Workspace.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });

models.Workspace.hasMany(models.WorkspaceMember, { foreignKey: 'workspace_id', as: 'members' });
models.WorkspaceMember.belongsTo(models.Workspace, { foreignKey: 'workspace_id', as: 'workspace' });
models.User.hasMany(models.WorkspaceMember, { foreignKey: 'user_id', as: 'workspaceMemberships' });
models.WorkspaceMember.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });

models.Workspace.hasMany(models.Collection, { foreignKey: 'workspace_id', as: 'collections' });
models.Collection.belongsTo(models.Workspace, { foreignKey: 'workspace_id', as: 'workspace' });
models.Collection.hasMany(models.CollectionItem, { foreignKey: 'collection_id', as: 'items' });
models.CollectionItem.belongsTo(models.Collection, { foreignKey: 'collection_id', as: 'collection' });
models.CollectionItem.hasMany(models.CollectionItem, { foreignKey: 'parent_id', as: 'children' });
models.CollectionItem.belongsTo(models.CollectionItem, { foreignKey: 'parent_id', as: 'parent' });

models.Workspace.hasMany(models.Environment, { foreignKey: 'workspace_id', as: 'environments' });
models.Environment.belongsTo(models.Workspace, { foreignKey: 'workspace_id', as: 'workspace' });
models.Environment.hasMany(models.EnvironmentVariable, { foreignKey: 'environment_id', as: 'variables' });
models.EnvironmentVariable.belongsTo(models.Environment, { foreignKey: 'environment_id', as: 'environment' });

models.User.hasMany(models.GlobalVariable, { foreignKey: 'user_id', as: 'globalVariables' });
models.GlobalVariable.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
models.Workspace.hasMany(models.GlobalVariable, { foreignKey: 'workspace_id', as: 'workspaceVariables' });
models.GlobalVariable.belongsTo(models.Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

models.Workspace.hasMany(models.Run, { foreignKey: 'workspace_id', as: 'runs' });
models.Run.belongsTo(models.Workspace, { foreignKey: 'workspace_id', as: 'workspace' });
models.Collection.hasMany(models.Run, { foreignKey: 'collection_id', as: 'runs' });
models.Run.belongsTo(models.Collection, { foreignKey: 'collection_id', as: 'collection' });
models.Environment.hasMany(models.Run, { foreignKey: 'environment_id', as: 'runs' });
models.Run.belongsTo(models.Environment, { foreignKey: 'environment_id', as: 'environment' });
models.Run.hasMany(models.RunResult, { foreignKey: 'run_id', as: 'results' });
models.RunResult.belongsTo(models.Run, { foreignKey: 'run_id', as: 'run' });
models.CollectionItem.hasMany(models.RunResult, { foreignKey: 'item_id', as: 'runResults' });
models.RunResult.belongsTo(models.CollectionItem, { foreignKey: 'item_id', as: 'item' });

models.Workspace.hasMany(models.ScheduledRun, { foreignKey: 'workspace_id', as: 'scheduledRuns' });
models.ScheduledRun.belongsTo(models.Workspace, { foreignKey: 'workspace_id', as: 'workspace' });
models.Collection.hasMany(models.ScheduledRun, { foreignKey: 'collection_id', as: 'scheduledRuns' });
models.ScheduledRun.belongsTo(models.Collection, { foreignKey: 'collection_id', as: 'collection' });
models.Environment.hasMany(models.ScheduledRun, { foreignKey: 'environment_id', as: 'scheduledRuns' });
models.ScheduledRun.belongsTo(models.Environment, { foreignKey: 'environment_id', as: 'environment' });

// 数据库连接和同步函数
const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    return false;
  }
};

const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force, alter: !force });
    console.log('✅ 数据库同步成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
    return false;
  }
};

// 导出
module.exports = {
  sequelize,
  models,
  connectDatabase,
  syncDatabase,
  Sequelize
};
