# 数据库Schema文档

## 概述

本文档定义了Test-Web项目的完整数据库表结构、索引和关系。

**数据库类型**: PostgreSQL  
**字符集**: UTF-8  
**时区**: UTC  

---

## 核心表结构

### 1. test_history - 测试历史记录表

存储所有测试的历史记录和结果。

```sql
CREATE TABLE IF NOT EXISTS test_history (
  -- 主键
  test_id VARCHAR(255) PRIMARY KEY,
  
  -- 基本信息
  user_id VARCHAR(255) NOT NULL,
  test_type VARCHAR(50) NOT NULL DEFAULT 'load',
  test_name VARCHAR(255),
  url TEXT NOT NULL,
  
  -- 状态信息
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed
  
  -- 配置和结果
  config JSONB,
  results JSONB,
  error_message TEXT,
  
  -- 评分和时长
  overall_score DECIMAL(5,2),
  duration INTEGER,  -- 单位:秒
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  -- 外键约束
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_test_history_user_id ON test_history(user_id);
CREATE INDEX IF NOT EXISTS idx_test_history_created_at ON test_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_history_status ON test_history(status);
CREATE INDEX IF NOT EXISTS idx_test_history_test_type ON test_history(test_type);

-- 复合索引(用于常见查询)
CREATE INDEX IF NOT EXISTS idx_test_history_user_created ON test_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_history_user_status ON test_history(user_id, status);
CREATE INDEX IF NOT EXISTS idx_test_history_composite ON test_history(user_id, status, created_at DESC);

-- 添加注释
COMMENT ON TABLE test_history IS '测试历史记录表';
COMMENT ON COLUMN test_history.test_id IS '测试唯一标识符,格式: {testType}_{timestamp}_{random}';
COMMENT ON COLUMN test_history.user_id IS '用户ID';
COMMENT ON COLUMN test_history.test_type IS '测试类型: load, stress, security, seo, api, compatibility等';
COMMENT ON COLUMN test_history.status IS '测试状态: pending(待执行), running(运行中), completed(完成), failed(失败)';
COMMENT ON COLUMN test_history.config IS '测试配置(JSON格式)';
COMMENT ON COLUMN test_history.results IS '测试结果(JSON格式)';
COMMENT ON COLUMN test_history.overall_score IS '总体评分(0-100)';
COMMENT ON COLUMN test_history.duration IS '测试时长(秒)';
```

### 2. users - 用户表

```sql
CREATE TABLE IF NOT EXISTS users (
  -- 主键
  id VARCHAR(255) PRIMARY KEY,
  
  -- 基本信息
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- 用户角色和状态
  role VARCHAR(50) DEFAULT 'free',  -- free, premium, enterprise, admin
  status VARCHAR(50) DEFAULT 'active',  -- active, inactive, suspended
  
  -- 个人信息
  full_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(50),
  
  -- 验证信息
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  last_login_at TIMESTAMP,
  
  -- 其他设置
  settings JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.role IS '用户角色: free(免费), premium(付费), enterprise(企业), admin(管理员)';
COMMENT ON COLUMN users.status IS '用户状态: active(活跃), inactive(非活跃), suspended(暂停)';
```

### 3. test_sessions - 测试会话表

用于实时测试状态跟踪和WebSocket通信。

```sql
CREATE TABLE IF NOT EXISTS test_sessions (
  -- 主键
  session_id VARCHAR(255) PRIMARY KEY,
  test_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  
  -- 会话信息
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  progress INTEGER DEFAULT 0,  -- 0-100
  
  -- WebSocket连接信息
  socket_id VARCHAR(255),
  connection_status VARCHAR(50) DEFAULT 'connected',
  
  -- 实时指标
  current_metrics JSONB DEFAULT '{}'::jsonb,
  
  -- 时间戳
  started_at TIMESTAMP DEFAULT NOW(),
  last_update_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  
  -- 外键约束
  FOREIGN KEY (test_id) REFERENCES test_history(test_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_test_sessions_test_id ON test_sessions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);

COMMENT ON TABLE test_sessions IS '测试会话表,用于实时状态追踪';
COMMENT ON COLUMN test_sessions.progress IS '测试进度(0-100)';
COMMENT ON COLUMN test_sessions.current_metrics IS '当前实时指标';
```

### 4. engine_status - 测试引擎状态表

```sql
CREATE TABLE IF NOT EXISTS engine_status (
  -- 主键
  id SERIAL PRIMARY KEY,
  
  -- 引擎信息
  engine_type VARCHAR(50) UNIQUE NOT NULL,
  engine_name VARCHAR(100) NOT NULL,
  version VARCHAR(50),
  
  -- 状态信息
  status VARCHAR(50) DEFAULT 'unknown',  -- available, unavailable, error
  available BOOLEAN DEFAULT FALSE,
  
  -- 配置和能力
  capabilities JSONB DEFAULT '[]'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  
  -- 统计信息
  total_tests_run INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  
  -- 时间戳
  last_check_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_engine_status_type ON engine_status(engine_type);
CREATE INDEX IF NOT EXISTS idx_engine_status_status ON engine_status(status);

COMMENT ON TABLE engine_status IS '测试引擎状态表';
COMMENT ON COLUMN engine_status.engine_type IS '引擎类型: stress, security, seo, api等';
COMMENT ON COLUMN engine_status.status IS '引擎状态: available(可用), unavailable(不可用), error(错误)';
COMMENT ON COLUMN engine_status.capabilities IS '引擎支持的功能列表';
```

### 5. system_config - 系统配置表

```sql
CREATE TABLE IF NOT EXISTS system_config (
  -- 主键
  config_key VARCHAR(100) PRIMARY KEY,
  
  -- 配置值
  config_value TEXT,
  config_json JSONB,
  
  -- 元数据
  category VARCHAR(50),
  description TEXT,
  data_type VARCHAR(50) DEFAULT 'string',  -- string, number, boolean, json
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

COMMENT ON TABLE system_config IS '系统配置表';
COMMENT ON COLUMN system_config.config_key IS '配置键';
COMMENT ON COLUMN system_config.config_value IS '配置值(字符串类型)';
COMMENT ON COLUMN system_config.config_json IS '配置值(JSON类型)';
COMMENT ON COLUMN system_config.category IS '配置分类: database, cache, email, testing等';
```

---

## 扩展表结构

### 6. test_metrics - 测试指标详情表

存储详细的测试指标数据。

```sql
CREATE TABLE IF NOT EXISTS test_metrics (
  -- 主键
  id SERIAL PRIMARY KEY,
  test_id VARCHAR(255) NOT NULL,
  
  -- 指标类型
  metric_type VARCHAR(50) NOT NULL,  -- response_time, throughput, error_rate等
  metric_name VARCHAR(100) NOT NULL,
  
  -- 指标值
  metric_value DECIMAL(15,2),
  metric_unit VARCHAR(50),
  
  -- 时间序列数据
  timestamp TIMESTAMP DEFAULT NOW(),
  time_offset INTEGER,  -- 相对于测试开始的偏移量(秒)
  
  -- 元数据
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- 外键约束
  FOREIGN KEY (test_id) REFERENCES test_history(test_id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_test_metrics_test_id ON test_metrics(test_id);
CREATE INDEX IF NOT EXISTS idx_test_metrics_type ON test_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_test_metrics_timestamp ON test_metrics(timestamp);

COMMENT ON TABLE test_metrics IS '测试指标详情表';
COMMENT ON COLUMN test_metrics.metric_type IS '指标类型: response_time, throughput, error_rate, cpu, memory等';
COMMENT ON COLUMN test_metrics.time_offset IS '相对于测试开始的时间偏移(秒)';
```

### 7. test_errors - 测试错误记录表

```sql
CREATE TABLE IF NOT EXISTS test_errors (
  -- 主键
  id SERIAL PRIMARY KEY,
  test_id VARCHAR(255) NOT NULL,
  
  -- 错误信息
  error_type VARCHAR(100),
  error_message TEXT NOT NULL,
  error_code VARCHAR(50),
  
  -- 堆栈信息
  stack_trace TEXT,
  
  -- 上下文
  context JSONB DEFAULT '{}'::jsonb,
  
  -- 时间戳
  occurred_at TIMESTAMP DEFAULT NOW(),
  
  -- 外键约束
  FOREIGN KEY (test_id) REFERENCES test_history(test_id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_test_errors_test_id ON test_errors(test_id);
CREATE INDEX IF NOT EXISTS idx_test_errors_type ON test_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_test_errors_occurred_at ON test_errors(occurred_at DESC);

COMMENT ON TABLE test_errors IS '测试错误记录表';
COMMENT ON COLUMN test_errors.context IS '错误发生时的上下文信息';
```

---

## 视图定义

### 用户测试统计视图

```sql
CREATE OR REPLACE VIEW v_user_test_stats AS
SELECT 
  u.id AS user_id,
  u.username,
  u.role,
  COUNT(th.test_id) AS total_tests,
  COUNT(CASE WHEN th.status = 'completed' THEN 1 END) AS completed_tests,
  COUNT(CASE WHEN th.status = 'failed' THEN 1 END) AS failed_tests,
  COUNT(CASE WHEN th.status = 'running' THEN 1 END) AS running_tests,
  AVG(th.overall_score) AS avg_score,
  AVG(th.duration) AS avg_duration,
  MAX(th.created_at) AS last_test_at
FROM users u
LEFT JOIN test_history th ON u.id = th.user_id
GROUP BY u.id, u.username, u.role;

COMMENT ON VIEW v_user_test_stats IS '用户测试统计视图';
```

### 每日测试统计视图

```sql
CREATE OR REPLACE VIEW v_daily_test_stats AS
SELECT 
  DATE(created_at) AS test_date,
  test_type,
  COUNT(*) AS total_tests,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_tests,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed_tests,
  AVG(overall_score) AS avg_score,
  AVG(duration) AS avg_duration
FROM test_history
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), test_type
ORDER BY test_date DESC, test_type;

COMMENT ON VIEW v_daily_test_stats IS '每日测试统计视图(最近30天)';
```

---

## 表关系图

```
users (1) ───────┬─────── (N) test_history
                 │
                 └─────── (N) test_sessions
                 
test_history (1) ┬─────── (N) test_sessions
                 ├─────── (N) test_metrics
                 └─────── (N) test_errors
```

---

## 数据库初始化脚本

### 创建所有表

```sql
-- 1. 创建核心表
-- (users表应该已经存在)

-- 2. test_history表
CREATE TABLE IF NOT EXISTS test_history (
  test_id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  test_type VARCHAR(50) NOT NULL DEFAULT 'load',
  test_name VARCHAR(255),
  url TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  config JSONB,
  results JSONB,
  error_message TEXT,
  overall_score DECIMAL(5,2),
  duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_test_history_user_id ON test_history(user_id);
CREATE INDEX IF NOT EXISTS idx_test_history_created_at ON test_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_history_status ON test_history(status);
CREATE INDEX IF NOT EXISTS idx_test_history_test_type ON test_history(test_type);
CREATE INDEX IF NOT EXISTS idx_test_history_user_created ON test_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_history_user_status ON test_history(user_id, status);
CREATE INDEX IF NOT EXISTS idx_test_history_composite ON test_history(user_id, status, created_at DESC);

-- 3. test_sessions表
CREATE TABLE IF NOT EXISTS test_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  test_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  progress INTEGER DEFAULT 0,
  socket_id VARCHAR(255),
  connection_status VARCHAR(50) DEFAULT 'connected',
  current_metrics JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP DEFAULT NOW(),
  last_update_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_sessions_test_id ON test_sessions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);

-- 4. engine_status表
CREATE TABLE IF NOT EXISTS engine_status (
  id SERIAL PRIMARY KEY,
  engine_type VARCHAR(50) UNIQUE NOT NULL,
  engine_name VARCHAR(100) NOT NULL,
  version VARCHAR(50),
  status VARCHAR(50) DEFAULT 'unknown',
  available BOOLEAN DEFAULT FALSE,
  capabilities JSONB DEFAULT '[]'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  total_tests_run INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  last_check_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engine_status_type ON engine_status(engine_type);
CREATE INDEX IF NOT EXISTS idx_engine_status_status ON engine_status(status);

-- 5. system_config表
CREATE TABLE IF NOT EXISTS system_config (
  config_key VARCHAR(100) PRIMARY KEY,
  config_value TEXT,
  config_json JSONB,
  category VARCHAR(50),
  description TEXT,
  data_type VARCHAR(50) DEFAULT 'string',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

-- 6. test_metrics表
CREATE TABLE IF NOT EXISTS test_metrics (
  id SERIAL PRIMARY KEY,
  test_id VARCHAR(255) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,2),
  metric_unit VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW(),
  time_offset INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_test_metrics_test_id ON test_metrics(test_id);
CREATE INDEX IF NOT EXISTS idx_test_metrics_type ON test_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_test_metrics_timestamp ON test_metrics(timestamp);

-- 7. test_errors表
CREATE TABLE IF NOT EXISTS test_errors (
  id SERIAL PRIMARY KEY,
  test_id VARCHAR(255) NOT NULL,
  error_type VARCHAR(100),
  error_message TEXT NOT NULL,
  error_code VARCHAR(50),
  stack_trace TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_errors_test_id ON test_errors(test_id);
CREATE INDEX IF NOT EXISTS idx_test_errors_type ON test_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_test_errors_occurred_at ON test_errors(occurred_at DESC);

-- 创建视图
CREATE OR REPLACE VIEW v_user_test_stats AS
SELECT 
  u.id AS user_id,
  u.username,
  u.role,
  COUNT(th.test_id) AS total_tests,
  COUNT(CASE WHEN th.status = 'completed' THEN 1 END) AS completed_tests,
  COUNT(CASE WHEN th.status = 'failed' THEN 1 END) AS failed_tests,
  COUNT(CASE WHEN th.status = 'running' THEN 1 END) AS running_tests,
  AVG(th.overall_score) AS avg_score,
  AVG(th.duration) AS avg_duration,
  MAX(th.created_at) AS last_test_at
FROM users u
LEFT JOIN test_history th ON u.id = th.user_id
GROUP BY u.id, u.username, u.role;

CREATE OR REPLACE VIEW v_daily_test_stats AS
SELECT 
  DATE(created_at) AS test_date,
  test_type,
  COUNT(*) AS total_tests,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_tests,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed_tests,
  AVG(overall_score) AS avg_score,
  AVG(duration) AS avg_duration
FROM test_history
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), test_type
ORDER BY test_date DESC, test_type;
```

---

## 常用查询示例

### 1. 获取用户最近的测试

```sql
SELECT 
  test_id,
  test_type,
  url,
  status,
  overall_score,
  duration,
  created_at
FROM test_history
WHERE user_id = 'user_123'
ORDER BY created_at DESC
LIMIT 20;
```

### 2. 获取运行中的测试数量

```sql
SELECT user_id, COUNT(*) as running_count
FROM test_history
WHERE status = 'running'
GROUP BY user_id;
```

### 3. 获取今日测试统计

```sql
SELECT 
  test_type,
  COUNT(*) as total,
  AVG(overall_score) as avg_score,
  AVG(duration) as avg_duration
FROM test_history
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY test_type;
```

### 4. 清理30天前的测试记录

```sql
DELETE FROM test_history
WHERE created_at < NOW() - INTERVAL '30 days'
  AND status IN ('completed', 'failed');
```

---

## 维护建议

### 1. 定期清理

- 每月清理30天前的完成/失败测试记录
- 每周清理孤立的test_sessions记录
- 每周清理test_errors中的旧记录

### 2. 性能优化

- 定期执行VACUUM和ANALYZE
- 监控慢查询并优化
- 定期重建索引

```sql
-- 分析表
ANALYZE test_history;
ANALYZE test_sessions;

-- 清理表
VACUUM test_history;
VACUUM test_sessions;
```

### 3. 备份策略

- 每日全量备份
- 每小时增量备份
- 保留最近7天的备份

---

## 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| 1.0 | 2025-11-11 | 初始版本,定义核心表结构 |

---

**文档维护**: 数据库Schema变更时必须同步更新此文档
