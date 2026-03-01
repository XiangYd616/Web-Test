# 双向同步架构设计（Postman 模式）

## 1. 总体架构

```
┌─────────────────┐          ┌─────────────────┐
│   Electron 桌面  │  ←────→  │   云端后端 API    │  ←────→  Web 前端
│   (SQLite 本地)  │   Sync   │  (PostgreSQL)    │          (无本地存储)
└─────────────────┘          └─────────────────┘
```

- **Web 端**：纯在线，所有操作直接调云端 API，不参与同步
- **桌面端**：离线优先，本地 SQLite 为主数据源，联网时与云端双向同步
- **云端**：作为真实数据源（Source of Truth），冲突时以云端为准

## 2. 同步策略：基于版本号的增量同步

### 2.1 核心字段

每个可同步表新增以下字段：

```sql
-- 同步元数据字段
sync_id        TEXT UNIQUE,     -- 全局唯一 ID（UUIDv4），跨端一致
sync_version   INTEGER DEFAULT 1,  -- 版本号，每次修改 +1
sync_status    TEXT DEFAULT 'synced',  -- synced | pending | conflict | deleted
sync_updated_at TEXT,            -- 最后同步时间（ISO 8601）
sync_device_id TEXT,             -- 最后修改设备 ID
```

### 2.2 同步流程

```
桌面端启动 / 恢复网络
       │
       ▼
  ① PULL：拉取云端变更
       │  GET /api/sync/pull?since={lastSyncTimestamp}&tables=workspaces,collections,...
       │  返回：{ changes: [{ table, sync_id, version, data, deleted }], serverTime }
       │
       ▼
  ② 合并：对比本地版本
       │  - 本地无该记录 → INSERT
       │  - 本地版本 < 云端版本 且本地无未推送修改 → UPDATE
       │  - 本地版本 < 云端版本 且本地有未推送修改 → CONFLICT（见冲突策略）
       │  - 本地版本 ≥ 云端版本 → 跳过（本地更新）
       │
       ▼
  ③ PUSH：推送本地变更
       │  POST /api/sync/push
       │  Body: { changes: [{ table, sync_id, version, data, deleted }], deviceId }
       │  返回：{ accepted: [...], conflicts: [...], serverTime }
       │
       ▼
  ④ 解决冲突（如有）
       │  冲突记录写入 sync_conflicts 表
       │  用户手动选择保留哪个版本，或自动以云端为准
       │
       ▼
  ⑤ 更新 lastSyncTimestamp
```

### 2.3 同步频率

| 触发条件 | 说明 |
|---------|------|
| 启动时 | 应用启动后立即同步一次 |
| 网络恢复 | 检测到从离线→在线时触发 |
| 定时轮询 | 每 30 秒检查一次（可配置） |
| 手动触发 | 用户点击同步按钮 |
| 数据变更后 | 本地写入后 debounce 3 秒触发推送 |

## 3. 冲突解决策略

### 3.1 自动解决（默认）

采用 **Last-Write-Wins (LWW)** + 字段级合并：

```
场景：用户 A（桌面端）修改了 collection.name
     用户 B（Web 端）修改了 collection.description

结果：两个修改都保留（字段级无冲突）
```

```
场景：用户 A 修改了 collection.name = "API Tests"
     用户 B 修改了 collection.name = "Backend Tests"

结果：以 sync_updated_at 更新的为准（LWW），
     被覆盖的版本存入 sync_conflicts 供回溯
```

### 3.2 冲突存储

```sql
CREATE TABLE sync_conflicts (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_sync_id TEXT NOT NULL,
  local_version INTEGER,
  remote_version INTEGER,
  local_data TEXT,         -- JSON
  remote_data TEXT,        -- JSON
  resolution TEXT,         -- 'local' | 'remote' | 'merged' | 'pending'
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

## 4. 数据表同步分类

### 4.1 双向同步表（用户可在桌面端离线创建/编辑）

| 表 | 优先级 | 说明 |
|---|--------|------|
| `workspaces` | P0 | 工作空间 |
| `collections` | P0 | 测试集合 |
| `environments` | P0 | 环境配置 |
| `environment_variables` | P0 | 环境变量（跟随 environment） |
| `test_templates` | P1 | 测试模板 |
| `test_executions` | P1 | 测试执行记录 |
| `test_results` | P1 | 测试结果 |

### 4.2 云端→本地（只读同步）

| 表 | 说明 |
|---|------|
| `scheduled_runs` | 定时任务（只在云端服务器执行） |
| `workspace_members` | 团队成员（通过云端管理） |
| `workspace_invitations` | 邀请（通过云端管理） |

### 4.3 不同步

| 表 | 说明 |
|---|------|
| `users` / `password_history` | 认证数据仅存云端 |
| `workspace_activities` | 活动日志仅存云端 |
| `workspace_resources` | 文件资源仅存云端 |

## 5. 技术实现计划

### 5.1 后端新增 API

```
GET  /api/sync/pull?since=<ISO timestamp>&tables=<comma list>
POST /api/sync/push
GET  /api/sync/status          -- 获取同步状态摘要
POST /api/sync/resolve-conflict -- 解决冲突
```

### 5.2 后端数据库迁移

为所有可同步表添加 `sync_id`, `sync_version`, `sync_updated_at`, `sync_device_id` 字段。

新增表：
- `sync_log` — 记录每次同步操作
- `sync_conflicts` — 冲突记录

### 5.3 桌面端 SQLite 迁移

SQLite 端同样添加 sync 字段 + `sync_queue` 表：

```sql
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_sync_id TEXT NOT NULL,
  operation TEXT NOT NULL,  -- 'create' | 'update' | 'delete'
  data TEXT,                -- JSON snapshot
  created_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'pending'  -- 'pending' | 'pushed' | 'failed'
);
```

### 5.4 桌面端同步引擎（Electron IPC）

```
tools/electron/sync/
├── SyncEngine.ts          -- 同步调度器（轮询、网络检测、冲突队列）
├── SyncPullHandler.ts     -- 处理 PULL 逻辑
├── SyncPushHandler.ts     -- 处理 PUSH 逻辑
├── SyncConflictResolver.ts-- 冲突解决
├── SyncQueue.ts           -- 本地变更队列（SQLite 触发器写入）
└── SyncStatus.ts          -- 同步状态管理（暴露给 UI）
```

### 5.5 前端 UI

在 StatusBar（桌面端底部栏）显示同步状态：
- 🟢 已同步（X 秒前）
- 🔄 同步中...
- 🟡 X 条待同步
- 🔴 同步冲突（点击查看）
- ⚫ 离线模式

设置页新增同步配置：
- 同步频率（手动/30秒/1分钟/5分钟）
- 冲突策略（自动云端优先/手动选择）
- 同步日志查看

## 6. 实现优先级

| 阶段 | 内容 | 预估 |
|------|------|------|
| **P0** | sync 字段迁移 + pull/push API + 桌面端 SyncEngine 基础 | 核心框架 |
| **P1** | workspaces + collections + environments 双向同步 | 三张核心表 |
| **P2** | 冲突检测 + 自动解决 + UI 状态显示 | 冲突处理 |
| **P3** | test_results + templates 同步 + 同步设置页 | 补全 |
| **P4** | 字段级合并 + 同步日志 + 性能优化 | 增强 |
