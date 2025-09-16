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
    type: DataTypes.ENUM('api', 'security', 'stress', 'seo', 'compatibility', 'ux', 'website', 'infrastructure'),
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
    type: DataTypes.ENUM('api', 'security', 'stress', 'seo', 'compatibility', 'ux', 'website', 'infrastructure'),
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
