# 数据库完整配置指南

本指南说明 Test-Web 使用的 PostgreSQL 数据库配置、环境变量命名以及初始化流程。

## 1. 数据库类型

- 运行时数据库：**PostgreSQL**
- 连接驱动：`pg`

## 2. 环境变量（统一 DB_ 前缀）

> 建议在 `backend/.env` 或根目录 `.env` 中配置（以实际部署为准）。

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_dev
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

DB_MAX_CONNECTIONS=20
DB_MIN_CONNECTIONS=5
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000
DB_ACQUIRE_TIMEOUT=60000
DB_STATEMENT_TIMEOUT=30000
DB_QUERY_TIMEOUT=30000
DB_RETRY_ATTEMPTS=5
DB_RETRY_DELAY=1000
DB_HEALTH_CHECK_INTERVAL=30000
DB_LOG_LEVEL=info
DB_APPLICATION_NAME=testweb_dev
```

## 3. 初始化与升级说明

系统首次启动会自动执行 `data/schema.sql` 初始化，并写入初始化标记文件：

```
storage/.db_initialized
```

- **存在标记时**：会跳过 schema 初始化
- **当你更新了 schema**：请删除 `storage/.db_initialized`，或设置 `SKIP_DB_INIT=true` 后自行迁移

## 4. 常见排错

1. **连接失败**：确认 DB_ 环境变量是否生效
2. **初始化未执行**：检查 `storage/.db_initialized` 是否存在
3. **权限问题**：确认数据库用户具备建表权限
