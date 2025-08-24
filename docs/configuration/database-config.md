# 🗄️ 数据库配置指南

## 📋 概述

Test-Web项目使用PostgreSQL作为主数据库，本文档详细说明数据库的配置、连接、监控和维护。

**数据库版本**: PostgreSQL 12+  
**ORM框架**: Sequelize  
**连接池**: pg (node-postgres)  
**备份工具**: pg_dump/pg_restore

## ⚙️ 数据库配置

### **基本配置**

项目的数据库配置位于 `backend/config/database.js`：

```javascript
module.exports = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'testweb_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    dialect: 'postgres',
    logging: console.log,
    pool: {
      max: 20,        // 最大连接数
      min: 5,         // 最小连接数
      acquire: 30000, // 获取连接超时时间
      idle: 10000     // 连接空闲时间
    }
  },
  production: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 50,        // 生产环境更大的连接池
      min: 10,
      acquire: 60000,
      idle: 10000
    },
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
};
```

### **环境变量配置**

在 `.env` 文件中设置数据库连接参数：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_dev
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false

# 生产环境额外配置
DB_POOL_MAX=50
DB_POOL_MIN=10
DB_CONNECTION_TIMEOUT=60000
```

## 🏗️ 数据库架构

### **核心数据表**

#### **tests表** - 测试记录
```sql
CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  config JSONB,
  results JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **config_templates表** - 配置模板
```sql
CREATE TABLE config_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **users表** - 用户管理
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **索引优化**

```sql
-- 性能优化索引
CREATE INDEX idx_tests_type ON tests(type);
CREATE INDEX idx_tests_status ON tests(status);
CREATE INDEX idx_tests_created_at ON tests(created_at);
CREATE INDEX idx_config_templates_type ON config_templates(type);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

## 🔧 连接管理

### **连接池配置**

```javascript
// backend/services/database/databaseService.js
const { Pool } = require('pg');

class DatabaseService {
  constructor() {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: 20,                    // 最大连接数
      min: 5,                     // 最小连接数
      idleTimeoutMillis: 30000,   // 空闲超时
      connectionTimeoutMillis: 5000 // 连接超时
    });
  }
}
```

### **连接池监控**

使用 `ConnectionMonitor` 服务监控连接池状态：

```javascript
const ConnectionMonitor = require('./services/database/connectionMonitor');
const monitor = new ConnectionMonitor(databaseService);

// 启动监控
monitor.startMonitoring(30000); // 每30秒检查一次

// 监听事件
monitor.on('warning', (data) => {
  console.warn('连接池警告:', data.warnings);
});
```

## 💾 备份和恢复

### **自动备份配置**

```javascript
const BackupService = require('./services/database/backupService');
const backupService = new BackupService();

// 启动定时备份 (每天凌晨2点)
backupService.startScheduledBackup('0 2 * * *');
```

### **手动备份**

```bash
# 创建备份
node -e "
const BackupService = require('./backend/services/database/backupService');
const service = new BackupService();
service.createBackup('manual_backup_' + Date.now());
"

# 或使用pg_dump直接备份
pg_dump -h localhost -U postgres -d testweb_dev > backup.sql
```

### **数据恢复**

```bash
# 恢复数据库
psql -h localhost -U postgres -d testweb_dev < backup.sql

# 或使用备份服务
node -e "
const BackupService = require('./backend/services/database/backupService');
const service = new BackupService();
service.restoreBackup('./backups/backup_2025-08-24.sql');
"
```

## 📊 性能优化

### **查询优化**

1. **使用索引**
```sql
-- 为常用查询字段创建索引
CREATE INDEX CONCURRENTLY idx_tests_type_status ON tests(type, status);
```

2. **JSONB查询优化**
```sql
-- 为JSONB字段创建GIN索引
CREATE INDEX idx_tests_results_gin ON tests USING GIN (results);
CREATE INDEX idx_tests_config_gin ON tests USING GIN (config);
```

3. **分页查询优化**
```javascript
// 使用LIMIT和OFFSET进行分页
const getTests = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return await sequelize.query(`
    SELECT * FROM tests 
    ORDER BY created_at DESC 
    LIMIT $1 OFFSET $2
  `, {
    bind: [limit, offset],
    type: QueryTypes.SELECT
  });
};
```

### **连接池优化**

```javascript
// 生产环境连接池配置
const productionPool = {
  max: 50,          // 根据服务器性能调整
  min: 10,          // 保持最小连接数
  acquire: 60000,   // 获取连接超时
  idle: 10000,      // 空闲连接超时
  evict: 1000,      // 检查空闲连接间隔
  handleDisconnects: true // 自动处理断开连接
};
```

## 🔍 监控和诊断

### **健康检查**

```javascript
// 数据库健康检查端点
app.get('/health/database', async (req, res) => {
  try {
    const health = await databaseService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});
```

### **性能监控**

```javascript
// 查询性能监控
const monitorQuery = async (sql, params) => {
  const startTime = Date.now();
  try {
    const result = await databaseService.query(sql, params);
    const queryTime = Date.now() - startTime;
    
    // 记录慢查询
    if (queryTime > 1000) {
      console.warn('慢查询检测:', { sql, queryTime, params });
    }
    
    return result;
  } catch (error) {
    console.error('查询错误:', { sql, error: error.message, params });
    throw error;
  }
};
```

## 🚨 故障排除

### **常见问题**

#### **连接超时**
```bash
# 检查PostgreSQL服务状态
sudo systemctl status postgresql

# 检查连接数
SELECT count(*) FROM pg_stat_activity;

# 检查长时间运行的查询
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

#### **连接池耗尽**
```javascript
// 监控连接池状态
const poolStatus = databaseService.getPoolStatus();
console.log('连接池状态:', poolStatus);

// 如果连接池耗尽，检查是否有连接泄漏
if (poolStatus.waitingCount > 10) {
  console.warn('连接池可能存在泄漏');
}
```

#### **性能问题**
```sql
-- 检查表大小
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE tablename = 'tests';

-- 检查索引使用情况
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE tablename = 'tests';
```

## 🔗 相关文档

- [开发指南](../development/database-guide.md) - 数据库开发指南
- [维护文档](../maintenance/backup-recovery.md) - 备份恢复指南
- [API文档](../development/api-reference.md) - 数据库API接口

## 📝 更新记录

- v2.0 (2025-08-24): 完善PostgreSQL配置，添加监控和备份功能
- v1.0 (2024-01-01): 初始版本，基础数据库配置

---

**🗄️ 数据库配置文档持续更新中...**

如有问题请参考故障排除部分或联系开发团队。
