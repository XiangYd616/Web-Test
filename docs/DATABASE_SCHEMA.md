# 数据库设计文档

## 🎯 概述

Test Web App 使用 PostgreSQL 作为主数据库，采用关系型数据库设计，支持ACID事务、复杂查询和数据完整性约束。数据库设计遵循第三范式，确保数据的一致性和完整性。

## 🏗️ 数据库架构

### 核心表结构

#### 1. 用户表 (users)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    subscription_status VARCHAR(20) DEFAULT 'none',
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

#### 2. 测试会话主表 (test_sessions)
```sql
CREATE TABLE test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    test_type VARCHAR(100) NOT NULL CHECK (test_type IN ('stress', 'security', 'api', 'performance', 'compatibility', 'seo', 'accessibility')),
    url TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- 秒
    overall_score DECIMAL(5,2),
    grade VARCHAR(5), -- A+, A, B+, B, C+, C, D, F
    total_issues INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    major_issues INTEGER DEFAULT 0,
    minor_issues INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    config JSONB DEFAULT '{}',
    environment VARCHAR(50) DEFAULT 'production',
    tags TEXT[],
    description TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- 索引
CREATE INDEX idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX idx_test_sessions_test_type ON test_sessions(test_type);
CREATE INDEX idx_test_sessions_status ON test_sessions(status);
CREATE INDEX idx_test_sessions_created_at ON test_sessions(created_at);
CREATE INDEX idx_test_sessions_deleted_at ON test_sessions(deleted_at);
CREATE INDEX idx_test_sessions_url ON test_sessions USING gin(to_tsvector('english', url));
CREATE INDEX idx_test_sessions_tags ON test_sessions USING gin(tags);
```

#### 3. 安全测试详情表 (security_test_details)
```sql
CREATE TABLE security_test_details (
    session_id UUID PRIMARY KEY REFERENCES test_sessions(id) ON DELETE CASCADE,
    security_score DECIMAL(5,2),
    ssl_score DECIMAL(5,2),
    header_security_score DECIMAL(5,2),
    authentication_score DECIMAL(5,2),
    vulnerabilities_total INTEGER DEFAULT 0,
    vulnerabilities_critical INTEGER DEFAULT 0,
    vulnerabilities_high INTEGER DEFAULT 0,
    vulnerabilities_medium INTEGER DEFAULT 0,
    vulnerabilities_low INTEGER DEFAULT 0,
    sql_injection_found INTEGER DEFAULT 0,
    xss_vulnerabilities INTEGER DEFAULT 0,
    csrf_vulnerabilities INTEGER DEFAULT 0,
    https_enforced BOOLEAN DEFAULT false,
    hsts_enabled BOOLEAN DEFAULT false,
    csrf_protection BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. 性能测试详情表 (performance_test_details)
```sql
CREATE TABLE performance_test_details (
    session_id UUID PRIMARY KEY REFERENCES test_sessions(id) ON DELETE CASCADE,
    first_contentful_paint INTEGER, -- 毫秒
    largest_contentful_paint INTEGER, -- 毫秒
    first_input_delay INTEGER, -- 毫秒
    cumulative_layout_shift DECIMAL(5,3),
    time_to_interactive INTEGER, -- 毫秒
    speed_index INTEGER,
    total_blocking_time INTEGER, -- 毫秒
    dom_content_loaded INTEGER, -- 毫秒
    load_event_end INTEGER, -- 毫秒
    total_page_size BIGINT, -- 字节
    image_size BIGINT, -- 字节
    css_size BIGINT, -- 字节
    js_size BIGINT, -- 字节
    font_size BIGINT, -- 字节
    dns_lookup_time INTEGER, -- 毫秒
    tcp_connect_time INTEGER, -- 毫秒
    ssl_handshake_time INTEGER, -- 毫秒
    server_response_time INTEGER, -- 毫秒
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. 压力测试详情表 (stress_test_details)
```sql
CREATE TABLE stress_test_details (
    session_id UUID PRIMARY KEY REFERENCES test_sessions(id) ON DELETE CASCADE,
    concurrent_users INTEGER,
    ramp_up_time INTEGER, -- 秒
    test_duration INTEGER, -- 秒
    think_time INTEGER, -- 毫秒
    tps_peak DECIMAL(10,2),
    tps_average DECIMAL(10,2),
    total_requests BIGINT,
    successful_requests BIGINT,
    failed_requests BIGINT,
    response_time_avg INTEGER, -- 毫秒
    response_time_min INTEGER, -- 毫秒
    response_time_max INTEGER, -- 毫秒
    response_time_p50 INTEGER, -- 毫秒
    response_time_p90 INTEGER, -- 毫秒
    response_time_p95 INTEGER, -- 毫秒
    response_time_p99 INTEGER, -- 毫秒
    error_rate DECIMAL(5,2), -- 百分比
    timeout_errors INTEGER,
    connection_errors INTEGER,
    server_errors INTEGER,
    client_errors INTEGER,
    cpu_usage_avg DECIMAL(5,2), -- 百分比
    cpu_usage_max DECIMAL(5,2), -- 百分比
    memory_usage_avg BIGINT, -- 字节
    memory_usage_max BIGINT, -- 字节
    bytes_sent BIGINT,
    bytes_received BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 6. 测试文件资源表 (test_artifacts)
```sql
CREATE TABLE test_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    artifact_type VARCHAR(50) NOT NULL, -- screenshot, report, log, etc.
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_test_artifacts_session_id ON test_artifacts(session_id);
CREATE INDEX idx_test_artifacts_type ON test_artifacts(artifact_type);
```

#### 7. 用户偏好表 (user_preferences)
```sql
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    data_type VARCHAR(20) DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json', 'array')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, category, key)
);

-- 索引
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_category ON user_preferences(category);
CREATE INDEX idx_user_preferences_user_category ON user_preferences(user_id, category);
```

#### 4. 监控站点表 (monitoring_sites)
```sql
CREATE TABLE monitoring_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    monitoring_enabled BOOLEAN DEFAULT true,
    check_interval INTEGER DEFAULT 300, -- 秒
    timeout INTEGER DEFAULT 10000, -- 毫秒
    monitor_types JSON DEFAULT '["http"]',
    status VARCHAR(50) DEFAULT 'unknown',
    last_check TIMESTAMP,
    last_uptime TIMESTAMP,
    last_downtime TIMESTAMP,
    response_time INTEGER DEFAULT 0,
    average_response_time INTEGER DEFAULT 0,
    uptime_percentage DECIMAL(5,2) DEFAULT 0,
    total_checks INTEGER DEFAULT 0,
    successful_checks INTEGER DEFAULT 0,
    failed_checks INTEGER DEFAULT 0,
    ssl_info JSON,
    ssl_expiry_date TIMESTAMP,
    alerts_enabled BOOLEAN DEFAULT true,
    alert_thresholds JSON DEFAULT '{"response_time": 5000, "uptime": 95}',
    notification_channels JSON DEFAULT '["email"]',
    notification_contacts JSON DEFAULT '[]',
    maintenance_mode BOOLEAN DEFAULT false,
    maintenance_start TIMESTAMP,
    maintenance_end TIMESTAMP,
    maintenance_reason TEXT,
    monitoring_locations JSON DEFAULT '["local"]',
    tags JSON DEFAULT '[]',
    metadata JSON DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_monitoring_sites_user_id ON monitoring_sites(user_id);
CREATE INDEX idx_monitoring_sites_monitoring_enabled ON monitoring_sites(monitoring_enabled);
CREATE INDEX idx_monitoring_sites_status ON monitoring_sites(status);
```

#### 5. 监控结果表 (monitoring_results)
```sql
CREATE TABLE monitoring_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES monitoring_sites(id) ON DELETE CASCADE,
    success BOOLEAN NOT NULL,
    status_code INTEGER,
    response_time INTEGER NOT NULL,
    error_message TEXT,
    error_type VARCHAR(100),
    details JSON,
    dns_time INTEGER,
    connect_time INTEGER,
    tls_time INTEGER,
    first_byte_time INTEGER,
    download_time INTEGER,
    content_length INTEGER,
    content_type VARCHAR(255),
    content_match BOOLEAN,
    ssl_info JSON,
    ssl_valid BOOLEAN,
    ssl_expiry_days INTEGER,
    check_location VARCHAR(100),
    checked_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_monitoring_results_site_id ON monitoring_results(site_id);
CREATE INDEX idx_monitoring_results_checked_at ON monitoring_results(checked_at);
CREATE INDEX idx_monitoring_results_success ON monitoring_results(success);
```

#### 6. 监控告警表 (monitoring_alerts)
```sql
CREATE TABLE monitoring_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES monitoring_sites(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    title VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    notification_sent BOOLEAN DEFAULT false,
    notification_channels JSON DEFAULT '[]',
    metadata JSON DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_monitoring_alerts_site_id ON monitoring_alerts(site_id);
CREATE INDEX idx_monitoring_alerts_status ON monitoring_alerts(status);
CREATE INDEX idx_monitoring_alerts_created_at ON monitoring_alerts(created_at);
```

### 扩展表结构

#### 7. API密钥表 (api_keys)
```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    permissions JSON DEFAULT '[]',
    last_used TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
```

#### 8. 系统设置表 (system_settings)
```sql
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    data_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(category, key)
);

-- 索引
CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_system_settings_is_public ON system_settings(is_public);
```

## 🔗 关系设计

### 主要关系
1. **用户 → 测试历史**: 一对多关系，一个用户可以有多个测试记录
2. **用户 → 用户偏好**: 一对多关系，一个用户可以有多个偏好设置
3. **用户 → 监控站点**: 一对多关系，一个用户可以监控多个站点
4. **监控站点 → 监控结果**: 一对多关系，一个站点有多个监控结果
5. **监控站点 → 监控告警**: 一对多关系，一个站点可以有多个告警

### 外键约束
- 所有用户相关表都有 `user_id` 外键，级联删除
- 监控相关表通过 `site_id` 关联，级联删除
- 告警表的确认和解决字段关联用户表

## 📊 数据类型说明

### JSON字段用途
- `config`: 测试配置参数
- `results`: 测试结果详情
- `ssl_info`: SSL证书信息
- `alert_thresholds`: 告警阈值配置
- `metadata`: 扩展元数据

### 枚举类型
- `role`: user, admin, moderator
- `plan`: free, pro, enterprise
- `status`: active, inactive, suspended
- `data_type`: string, number, boolean, json, array

## 🔧 性能优化

### 索引策略
1. **主键索引**: 所有表都有UUID主键
2. **外键索引**: 所有外键字段都有索引
3. **查询索引**: 常用查询字段建立索引
4. **复合索引**: 多字段查询建立复合索引
5. **全文索引**: URL字段使用GIN全文索引

### 分区策略
```sql
-- 按时间分区监控结果表（可选）
CREATE TABLE monitoring_results_y2025m06 PARTITION OF monitoring_results
FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
```

### 查询优化
```sql
-- 使用EXPLAIN分析查询计划
EXPLAIN ANALYZE SELECT * FROM test_sessions
WHERE user_id = $1 AND test_type = $2 AND deleted_at IS NULL
ORDER BY created_at DESC LIMIT 20;

-- 使用部分索引优化特定查询
CREATE INDEX idx_active_monitoring_sites 
ON monitoring_sites(user_id) 
WHERE monitoring_enabled = true;
```

## 🛡️ 安全设计

### 数据隔离
- 所有用户数据通过 `user_id` 隔离
- 行级安全策略（RLS）可选实现
- 敏感数据加密存储

### 权限控制
```sql
-- 创建只读用户
CREATE USER readonly_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE testweb_prod TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
```

## 📋 维护脚本

### 数据清理
```sql
-- 清理过期的测试记录（保留30天）
UPDATE test_sessions
SET deleted_at = NOW()
WHERE created_at < NOW() - INTERVAL '30 days' AND deleted_at IS NULL;

-- 清理过期的监控结果（保留90天）
DELETE FROM monitoring_results 
WHERE checked_at < NOW() - INTERVAL '90 days';
```

### 统计信息更新
```sql
-- 更新表统计信息
ANALYZE test_sessions;
ANALYZE security_test_details;
ANALYZE performance_test_details;
ANALYZE stress_test_details;
ANALYZE test_artifacts;
ANALYZE monitoring_results;
ANALYZE monitoring_sites;
```

### 备份脚本
```bash
#!/bin/bash
# 数据库备份脚本
pg_dump -h localhost -U postgres -d testweb_prod \
  --format=custom --compress=9 \
  --file=backup_$(date +%Y%m%d_%H%M%S).dump
```

## 📈 监控指标

### 性能监控
```sql
-- 查询慢查询
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- 查看表大小
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

**数据库版本**: PostgreSQL 12+  
**字符集**: UTF-8  
**时区**: UTC
