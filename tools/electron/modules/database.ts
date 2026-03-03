import BetterSqlite3 from 'better-sqlite3';
import { app } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';

type QueryResult = Record<string, unknown>[];
type RunResult = { changes: number; lastInsertRowid: number | bigint };
type TransactionClient = {
  query: (sql: string, params?: unknown[]) => QueryResult | RunResult;
};

/**
 * 本地 SQLite 数据库封装
 *
 * ⚠️ 架构注意：better-sqlite3 是同步 API，所有 query() 调用虽然包装为 async，
 * 但实际执行会阻塞 Electron 主进程。当查询大量数据或结果集很大时，
 * 可能导致 UI 短暂卡顿。
 *
 * 后续优化方向：将数据库操作迁移到 worker_threads 中执行，
 * 通过消息传递实现真正的异步查询。
 */
class LocalDatabase {
  private db: BetterSqlite3.Database | null = null;
  private dbPath: string | null = null;
  private isInitialized = false;

  get initialized(): boolean {
    return this.isInitialized;
  }

  async init(): Promise<{ success: boolean; path: string | null }> {
    try {
      // 获取用户数据目录
      const userDataPath = app.getPath('userData');
      const dbDir = path.join(userDataPath, 'database');

      // 确保数据库目录存在
      await fs.ensureDir(dbDir);

      this.dbPath = path.join(dbDir, 'testweb.db');

      // 创建数据库连接
      this.db = new BetterSqlite3(this.dbPath);

      // 设置数据库选项
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 1000000');
      this.db.pragma('temp_store = memory');

      // 创建表结构
      this.createTables();

      // 增量迁移：为已有数据库添加缺失列
      this.runMigrations();

      this.isInitialized = true;

      return { success: true, path: this.dbPath };
    } catch (error) {
      console.error('数据库初始化失败:', error);
      throw error;
    }
  }

  async transaction<T>(callback: (client: TransactionClient) => T): Promise<T> {
    if (!this.isInitialized || !this.db) {
      throw new Error('数据库未初始化');
    }

    const db = this.db;
    const client: TransactionClient = {
      query: (sql: string, params: unknown[] = []) => {
        if (sql.trim().toLowerCase().startsWith('select')) {
          const stmt = db.prepare(sql);
          return stmt.all(...params) as QueryResult;
        }
        const stmt = db.prepare(sql);
        return stmt.run(...params) as RunResult;
      },
    };

    try {
      const transactionRunner = db.transaction(() => callback(client));
      return transactionRunner();
    } catch (error) {
      console.error('数据库事务执行失败:', error);
      throw error;
    }
  }

  private createTables(): void {
    if (!this.db) return;

    const tables = [
      // 用户表
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        preferences TEXT DEFAULT '{}'
      )`,

      // 测试执行记录表
      `CREATE TABLE IF NOT EXISTS test_executions (
        id TEXT PRIMARY KEY,
        test_id TEXT UNIQUE NOT NULL,
        user_id TEXT,
        engine_type TEXT NOT NULL,
        engine_name TEXT NOT NULL,
        test_name TEXT NOT NULL,
        test_url TEXT,
        test_config TEXT,
        status TEXT DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        results TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME,
        execution_time INTEGER,
        score REAL
      )`,

      // 测试操作表（状态流转）
      `CREATE TABLE IF NOT EXISTS test_operations (
        id TEXT PRIMARY KEY,
        test_id TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT,
        context TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // 测试日志表
      `CREATE TABLE IF NOT EXISTS test_logs (
        id TEXT PRIMARY KEY,
        test_id TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        context TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // 测试模板表
      `CREATE TABLE IF NOT EXISTS test_templates (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        workspace_id TEXT,
        engine_type TEXT NOT NULL,
        name TEXT NOT NULL,
        template_name TEXT,
        description TEXT,
        config TEXT NOT NULL,
        is_public BOOLEAN DEFAULT FALSE,
        is_default BOOLEAN DEFAULT FALSE,
        usage_count INTEGER DEFAULT 0,
        tags TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // 活动日志表
      `CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        resource TEXT,
        resource_id TEXT,
        details TEXT DEFAULT '{}',
        ip_address TEXT,
        user_agent TEXT,
        success BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // 系统配置表
      `CREATE TABLE IF NOT EXISTS system_configs (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // 报告表
      `CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        test_ids TEXT NOT NULL,
        config TEXT DEFAULT '{}',
        file_path TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // 工作空间表
      `CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // 工作空间成员表
      `CREATE TABLE IF NOT EXISTS workspace_members (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT DEFAULT 'owner',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // 集合表
      `CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        default_environment_id TEXT,
        metadata TEXT DEFAULT '{}',
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
      )`,

      // 集合文件夹表
      `CREATE TABLE IF NOT EXISTS collection_folders (
        id TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL,
        parent_id TEXT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE
      )`,

      // 集合请求表
      `CREATE TABLE IF NOT EXISTS collection_requests (
        id TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL,
        folder_id TEXT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        method TEXT DEFAULT 'GET',
        url TEXT NOT NULL,
        headers TEXT DEFAULT '{}',
        params TEXT DEFAULT '{}',
        body TEXT DEFAULT '{}',
        auth TEXT,
        tests TEXT DEFAULT '[]',
        timeout INTEGER,
        sort_order INTEGER DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE
      )`,

      // 环境表
      `CREATE TABLE IF NOT EXISTS environments (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        variables TEXT DEFAULT '[]',
        is_active INTEGER DEFAULT 0,
        created_by TEXT,
        updated_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
      )`,

      // 测试计划表
      `CREATE TABLE IF NOT EXISTS test_plans (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        url TEXT DEFAULT '',
        steps TEXT DEFAULT '[]',
        default_environment_id TEXT,
        tags TEXT DEFAULT '[]',
        status TEXT DEFAULT 'active',
        failure_strategy TEXT DEFAULT 'continue',
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
      )`,

      // 测试计划执行记录表
      `CREATE TABLE IF NOT EXISTS test_plan_executions (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        plan_name TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        step_results TEXT DEFAULT '[]',
        overall_score REAL,
        duration INTEGER,
        started_at DATETIME,
        completed_at DATETIME,
        triggered_by TEXT DEFAULT 'manual',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES test_plans (id) ON DELETE CASCADE
      )`,

      // 应用状态表（单行，存储当前登录模式和活跃身份）
      `CREATE TABLE IF NOT EXISTS app_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        auth_mode TEXT NOT NULL DEFAULT 'local',
        active_user_id TEXT NOT NULL,
        active_workspace_id TEXT NOT NULL,
        cloud_server_url TEXT DEFAULT '',
        cloud_token TEXT DEFAULT '',
        cloud_refresh_token TEXT DEFAULT '',
        cloud_user_id TEXT DEFAULT '',
        cloud_username TEXT DEFAULT '',
        cloud_email TEXT DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    const db = this.db;
    const createTransaction = db.transaction(() => {
      for (const sql of tables) {
        db.exec(sql);
      }
    });

    createTransaction();

    // 创建索引
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_test_executions_user_id ON test_executions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_executions_type ON test_executions(engine_type)',
      'CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(status)',
      'CREATE INDEX IF NOT EXISTS idx_test_executions_created_at ON test_executions(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_test_logs_test_id ON test_logs(test_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_logs_level ON test_logs(level)',
      'CREATE INDEX IF NOT EXISTS idx_test_operations_test_id ON test_operations(test_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_operations_status ON test_operations(status)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)',
      'CREATE INDEX IF NOT EXISTS idx_test_templates_user_id ON test_templates(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_templates_type ON test_templates(engine_type)',
      'CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id)',
      'CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_collections_workspace_id ON collections(workspace_id)',
      'CREATE INDEX IF NOT EXISTS idx_collection_folders_collection_id ON collection_folders(collection_id)',
      'CREATE INDEX IF NOT EXISTS idx_collection_requests_collection_id ON collection_requests(collection_id)',
      'CREATE INDEX IF NOT EXISTS idx_environments_workspace_id ON environments(workspace_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_plans_workspace_id ON test_plans(workspace_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_plans_status ON test_plans(status)',
      'CREATE INDEX IF NOT EXISTS idx_test_plan_executions_plan_id ON test_plan_executions(plan_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_plan_executions_status ON test_plan_executions(status)',
    ];

    for (const sql of indexes) {
      db.exec(sql);
    }

    // 预置默认本地用户和工作空间（外键依赖）
    this.seedDefaultUserAndWorkspace();

    // 预置官方模板种子数据
    this.seedOfficialTemplates();
  }

  /**
   * 创建桌面端默认本地用户和默认工作空间
   * 前端所有 INSERT 使用 DEFAULT_USER_ID / DEFAULT_WORKSPACE_ID 作为外键引用，
   * 必须确保这两条记录存在，否则 FOREIGN KEY constraint 会失败。
   */
  private seedDefaultUserAndWorkspace(): void {
    if (!this.db) return;
    const DEFAULT_USER_ID = '00000000-0000-4000-a000-000000000001';
    const DEFAULT_WORKSPACE_ID = '00000000-0000-4000-a000-000000000002';
    const now = new Date().toISOString();

    // 创建默认用户
    this.db
      .prepare(
        `INSERT OR IGNORE INTO users (id, username, email, full_name, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(DEFAULT_USER_ID, 'local', 'local@desktop', '本地用户', '', 'admin', 'active', now, now);

    // 创建默认工作空间
    this.db
      .prepare(
        `INSERT OR IGNORE INTO workspaces (id, name, description, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(DEFAULT_WORKSPACE_ID, '默认工作空间', '本地默认工作空间', DEFAULT_USER_ID, now, now);

    // 创建默认工作空间成员关系
    const memberExists = this.db
      .prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(DEFAULT_WORKSPACE_ID, DEFAULT_USER_ID);
    if (!memberExists) {
      this.db
        .prepare(
          `INSERT INTO workspace_members (id, workspace_id, user_id, role, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          '00000000-0000-4000-a000-000000000003',
          DEFAULT_WORKSPACE_ID,
          DEFAULT_USER_ID,
          'owner',
          'active',
          now,
          now
        );
    }

    // 初始化应用状态（单行记录，追踪当前登录模式）
    this.db
      .prepare(
        `INSERT OR IGNORE INTO app_state (id, auth_mode, active_user_id, active_workspace_id, updated_at)
       VALUES (1, 'local', ?, ?, ?)`
      )
      .run(DEFAULT_USER_ID, DEFAULT_WORKSPACE_ID, now);
  }

  private runMigrations(): void {
    if (!this.db) return;
    const db = this.db;

    // 检查 test_executions 表是否已有 score 列
    const columns = db.pragma('table_info(test_executions)') as Array<{ name: string }>;
    const hasScore = columns.some(c => c.name === 'score');
    if (!hasScore) {
      db.exec('ALTER TABLE test_executions ADD COLUMN score REAL');
      console.log('[DB Migration] 已添加 test_executions.score 列');
    }

    // app_state 表添加 cloud_refresh_token 列
    const appStateCols = db.pragma('table_info(app_state)') as Array<{ name: string }>;
    if (!appStateCols.some(c => c.name === 'cloud_refresh_token')) {
      db.exec("ALTER TABLE app_state ADD COLUMN cloud_refresh_token TEXT DEFAULT ''");
      console.log('[DB Migration] 已添加 app_state.cloud_refresh_token 列');
    }

    // 同步功能所需的表
    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_sync_id TEXT NOT NULL,
        operation TEXT NOT NULL DEFAULT 'update',
        data TEXT DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_sync_id TEXT NOT NULL,
        local_version INTEGER DEFAULT 0,
        remote_version INTEGER DEFAULT 0,
        local_data TEXT DEFAULT '{}',
        remote_data TEXT DEFAULT '{}',
        resolution TEXT NOT NULL DEFAULT 'pending',
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[DB Migration] 同步表已就绪 (sync_meta, sync_queue, sync_conflicts)');

    // ── 为可同步业务表添加 sync 字段 ──
    const SYNCABLE_TABLES = ['workspaces', 'collections', 'environments', 'test_templates'];
    const SYNC_COLUMNS = [
      { name: 'sync_id', sql: "sync_id TEXT DEFAULT ''" },
      { name: 'sync_version', sql: 'sync_version INTEGER DEFAULT 0' },
      { name: 'sync_status', sql: "sync_status TEXT DEFAULT 'pending'" },
      { name: 'sync_updated_at', sql: 'sync_updated_at DATETIME' },
    ];

    for (const table of SYNCABLE_TABLES) {
      const cols = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
      const colNames = new Set(cols.map(c => c.name));
      for (const col of SYNC_COLUMNS) {
        if (!colNames.has(col.name)) {
          db.exec(`ALTER TABLE ${table} ADD COLUMN ${col.sql}`);
          console.log(`[DB Migration] ${table} 添加 ${col.name} 列`);
        }
      }

      // 为已有记录填充 sync_id（使用 id 作为初始 sync_id）
      db.exec(`UPDATE ${table} SET sync_id = id WHERE sync_id IS NULL OR sync_id = ''`);
    }

    // ── 创建 sync_id 索引 ──
    for (const table of SYNCABLE_TABLES) {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_sync_id ON ${table}(sync_id)`);
    }

    // ── 创建 SQLite trigger：自动将变更写入 sync_queue ──
    for (const table of SYNCABLE_TABLES) {
      try {
        // AUTO-FILL trigger: 新记录 sync_id 为空时自动用 id 填充
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS trg_${table}_sync_autofill
          AFTER INSERT ON ${table}
          WHEN NEW.sync_id IS NULL OR NEW.sync_id = ''
          BEGIN
            UPDATE ${table} SET sync_id = NEW.id, sync_version = 1, sync_status = 'pending'
            WHERE id = NEW.id;
          END
        `);

        // INSERT trigger: 新记录入队 sync_queue
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS trg_${table}_sync_insert
          AFTER INSERT ON ${table}
          WHEN NEW.sync_id IS NOT NULL AND NEW.sync_id != '' AND NEW.sync_status != 'synced'
          BEGIN
            INSERT INTO sync_queue (table_name, record_sync_id, operation, data)
            VALUES ('${table}', NEW.sync_id, 'insert', '{}');
          END
        `);

        // UPDATE trigger: 业务字段变更时入队（排除纯 sync 字段更新避免递归）
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS trg_${table}_sync_update
          AFTER UPDATE ON ${table}
          WHEN NEW.sync_id IS NOT NULL AND NEW.sync_id != ''
            AND OLD.updated_at != NEW.updated_at
            AND NEW.sync_status != 'synced'
          BEGIN
            INSERT INTO sync_queue (table_name, record_sync_id, operation, data)
            VALUES ('${table}', NEW.sync_id, 'update', '{}');
          END
        `);

        // DELETE trigger
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS trg_${table}_sync_delete
          AFTER DELETE ON ${table}
          WHEN OLD.sync_id IS NOT NULL AND OLD.sync_id != ''
          BEGIN
            INSERT INTO sync_queue (table_name, record_sync_id, operation, data)
            VALUES ('${table}', OLD.sync_id, 'delete',
              json_object('id', OLD.id, 'sync_id', OLD.sync_id, 'sync_version', OLD.sync_version));
          END
        `);
      } catch (triggerErr) {
        console.warn(`[DB Migration] ${table} trigger 创建失败（不影响核心功能）:`, triggerErr);
      }
    }

    console.log('[DB Migration] 同步字段、索引、触发器已就绪');
  }

  private seedOfficialTemplates(): void {
    if (!this.db) return;
    const count = this.db
      .prepare('SELECT COUNT(*) as cnt FROM test_templates WHERE user_id IS NULL AND is_public = 1')
      .get() as { cnt: number } | undefined;
    if (count && count.cnt >= 6) return;

    const seeds = [
      {
        engine_type: 'api',
        name: 'API 自动化测试 - 标准模板',
        description: '适用于 RESTful API 的自动化测试，支持多端点、断言、变量提取。',
        config: {
          url: '{{baseUrl}}/api/v1/health',
          testType: 'api',
          options: { method: 'GET', timeout: 30000, followRedirects: true, validateSSL: true },
          endpoints: [
            { name: '健康检查', method: 'GET', path: '/api/v1/health', expectedStatus: 200 },
          ],
          assertions: [
            { field: 'status', operator: 'eq', value: 200 },
            { field: 'responseTime', operator: 'lt', value: 3000 },
          ],
          variables: { baseUrl: 'https://example.com', token: '' },
        },
      },
      {
        engine_type: 'performance',
        name: '性能测试 - 标准模板',
        description: '全面的 Web 性能测试模板，包含 Core Web Vitals、HTTP 瀑布图、资源分析。',
        config: {
          url: '{{targetUrl}}',
          testType: 'performance',
          options: {
            iterations: 3,
            throttling: 'none',
            device: 'desktop',
            checkWebVitals: true,
            lighthouse: true,
          },
          thresholds: { lcp: 2500, fcp: 1800, cls: 0.1, inp: 200, ttfb: 800 },
        },
      },
      {
        engine_type: 'stress',
        name: '压力测试 - 标准模板',
        description: '渐进式压力测试模板，从低并发逐步升压至目标并发数。',
        config: {
          url: '{{targetUrl}}',
          testType: 'stress',
          options: { maxConcurrency: 100, rampUpDuration: 30, holdDuration: 60, timeout: 10000 },
          concurrency: 100,
          duration: 120,
        },
      },
      {
        engine_type: 'security',
        name: '安全扫描 - 基础模板',
        description: '基于 OWASP Top 10 的安全基础扫描模板，检测 XSS、SQL 注入、CSRF 等。',
        config: {
          url: '{{targetUrl}}',
          testType: 'security',
          options: {
            checkHeaders: true,
            checkSSL: true,
            checkXSS: true,
            checkSQLInjection: true,
            checkCSRF: true,
            scanDepth: 'standard',
          },
        },
      },
      {
        engine_type: 'seo',
        name: 'SEO 检测 - 标准模板',
        description: '全面的 SEO 健康检查模板，覆盖 Meta 标签、结构化数据、移动端适配等。',
        config: {
          url: '{{targetUrl}}',
          testType: 'seo',
          options: {
            checkSEO: true,
            checkMobile: true,
            checkStructuredData: true,
            checkOpenGraph: true,
            checkSitemap: true,
            checkRobots: true,
          },
        },
      },
      {
        engine_type: 'accessibility',
        name: '无障碍检测 - 标准模板',
        description: '基于 WCAG 2.1 标准的无障碍检测模板。',
        config: {
          url: '{{targetUrl}}',
          testType: 'accessibility',
          options: {
            standard: 'WCAG21AA',
            checkContrast: true,
            checkKeyboard: true,
            checkAria: true,
            checkSemantics: true,
          },
        },
      },
    ];

    const stmt = this.db.prepare(
      `INSERT INTO test_templates (id, user_id, workspace_id, engine_type, name, template_name, description, config, is_public, is_default, usage_count)
       VALUES (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), NULL, NULL, ?, ?, ?, ?, ?, 1, 1, 0)`
    );

    let inserted = 0;
    for (const s of seeds) {
      const existing = this.db
        .prepare(
          'SELECT 1 FROM test_templates WHERE user_id IS NULL AND engine_type = ? AND name = ?'
        )
        .get(s.engine_type, s.name);
      if (!existing) {
        stmt.run(s.engine_type, s.name, s.name, s.description, JSON.stringify(s.config));
        inserted++;
      }
    }
    if (inserted > 0) {
      console.log(`✅ 已插入 ${inserted} 个官方预置模板`);
    }
  }

  async query(sql: string, params: unknown[] = []): Promise<QueryResult | RunResult> {
    if (!this.isInitialized || !this.db) {
      throw new Error('数据库未初始化');
    }

    try {
      if (sql.trim().toLowerCase().startsWith('select')) {
        const stmt = this.db.prepare(sql);
        return stmt.all(...params) as QueryResult;
      } else {
        const stmt = this.db.prepare(sql);
        return stmt.run(...params) as RunResult;
      }
    } catch (error) {
      console.error('数据库查询错误:', error);
      throw error;
    }
  }

  async backup(backupPath: string): Promise<{ success: boolean; path: string }> {
    if (!this.isInitialized || !this.dbPath) {
      throw new Error('数据库未初始化');
    }

    try {
      await fs.copy(this.dbPath, backupPath);
      return { success: true, path: backupPath };
    } catch (error) {
      console.error('数据库备份失败:', error);
      throw error;
    }
  }

  async restore(backupPath: string): Promise<{ success: boolean }> {
    if (!fs.existsSync(backupPath)) {
      throw new Error('备份文件不存在');
    }

    try {
      // 关闭当前连接
      if (this.db) {
        this.db.close();
      }

      // 恢复备份
      if (!this.dbPath) throw new Error('数据库路径未初始化');
      await fs.copy(backupPath, this.dbPath);

      // 重新初始化
      await this.init();

      return { success: true };
    } catch (error) {
      console.error('数据库恢复失败:', error);
      throw error;
    }
  }

  async export(
    format: string,
    exportPath: string
  ): Promise<{ success: boolean; path: string; recordCount: number }> {
    if (!this.isInitialized) {
      throw new Error('数据库未初始化');
    }

    try {
      // 允许导出的表白名单（防止 SQL 注入：仅允许预定义的表名）
      const EXPORTABLE_TABLES = new Set([
        'users',
        'test_executions',
        'test_operations',
        'test_logs',
        'test_templates',
        'activity_logs',
        'reports',
        'workspaces',
        'workspace_members',
        'collections',
        'collection_folders',
        'collection_requests',
        'environments',
      ]);
      const data: Record<string, Record<string, unknown>[]> = {};

      for (const table of EXPORTABLE_TABLES) {
        data[table] = (await this.query(`SELECT * FROM "${table}"`)) as Record<string, unknown>[];
      }

      if (format === 'json') {
        await fs.writeJson(exportPath, data, { spaces: 2 });
      } else if (format === 'sql') {
        let sqlContent = '';
        for (const [table, rows] of Object.entries(data)) {
          if (rows.length > 0) {
            const columns = Object.keys(rows[0]);
            for (const row of rows) {
              const values = columns
                .map(col => {
                  const val = row[col];
                  return val === null ? 'NULL' : `'${String(val).replace(/'/g, "''")}'`;
                })
                .join(', ');
              sqlContent += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values});\n`;
            }
          }
        }
        await fs.writeFile(exportPath, sqlContent);
      }

      return {
        success: true,
        path: exportPath,
        recordCount: Object.values(data).reduce((sum, rows) => sum + rows.length, 0),
      };
    } catch (error) {
      console.error('数据库导出失败:', error);
      throw error;
    }
  }

  async getStats(): Promise<Record<string, unknown>> {
    if (!this.isInitialized || !this.dbPath) {
      throw new Error('数据库未初始化');
    }

    try {
      const usersResult = (await this.query('SELECT COUNT(*) as count FROM users')) as Record<
        string,
        unknown
      >[];
      const testResult = (await this.query(
        'SELECT COUNT(*) as count FROM test_executions'
      )) as Record<string, unknown>[];
      const templatesResult = (await this.query(
        'SELECT COUNT(*) as count FROM test_templates'
      )) as Record<string, unknown>[];
      const reportsResult = (await this.query('SELECT COUNT(*) as count FROM reports')) as Record<
        string,
        unknown
      >[];
      const workspacesResult = (await this.query(
        'SELECT COUNT(*) as count FROM workspaces'
      )) as Record<string, unknown>[];
      const collectionsResult = (await this.query(
        'SELECT COUNT(*) as count FROM collections'
      )) as Record<string, unknown>[];
      const environmentsResult = (await this.query(
        'SELECT COUNT(*) as count FROM environments'
      )) as Record<string, unknown>[];

      return {
        users: usersResult[0].count,
        testResults: testResult[0].count,
        templates: templatesResult[0].count,
        reports: reportsResult[0].count,
        workspaces: workspacesResult[0].count,
        collections: collectionsResult[0].count,
        environments: environmentsResult[0].count,
        dbSize: fs.statSync(this.dbPath).size,
        dbPath: this.dbPath,
      };
    } catch (error) {
      console.error('获取数据库统计失败:', error);
      throw error;
    }
  }

  private autoBackupTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * 启动自动备份（每日一次，保留最近 7 份）
   */
  async startAutoBackup(): Promise<void> {
    if (!this.dbPath) return;

    // 启动时先检查今天是否已备份，未备份则立即执行
    const backupDir = path.join(path.dirname(this.dbPath), 'backups');
    await fs.ensureDir(backupDir);

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const todayBackup = path.join(backupDir, `testweb_${today}.db`);
    if (!fs.existsSync(todayBackup)) {
      try {
        await this.backup(todayBackup);
        console.log(`✅ 自动备份完成: ${todayBackup}`);
        await this.cleanOldBackups(backupDir, 7);
      } catch (err) {
        console.warn('⚠️ 自动备份失败:', err instanceof Error ? err.message : String(err));
      }
    }

    // 每 24 小时检查一次
    this.autoBackupTimer = setInterval(
      async () => {
        const date = new Date().toISOString().slice(0, 10);
        const backupFile = path.join(backupDir, `testweb_${date}.db`);
        if (!fs.existsSync(backupFile)) {
          try {
            await this.backup(backupFile);
            console.log(`✅ 自动备份完成: ${backupFile}`);
            await this.cleanOldBackups(backupDir, 7);
          } catch (err) {
            console.warn('⚠️ 自动备份失败:', err instanceof Error ? err.message : String(err));
          }
        }
      },
      24 * 60 * 60 * 1000
    );
  }

  /**
   * 清理旧备份，保留最近 N 份
   */
  private async cleanOldBackups(backupDir: string, keep: number): Promise<void> {
    try {
      const files = (await fs.readdir(backupDir))
        .filter(f => f.startsWith('testweb_') && f.endsWith('.db'))
        .sort()
        .reverse();
      for (let i = keep; i < files.length; i++) {
        await fs.remove(path.join(backupDir, files[i]));
      }
    } catch {
      // 清理失败不影响主流程
    }
  }

  /**
   * 列出可用备份
   */
  async listBackups(): Promise<Array<{ name: string; path: string; size: number; date: string }>> {
    if (!this.dbPath) return [];
    const backupDir = path.join(path.dirname(this.dbPath), 'backups');
    if (!fs.existsSync(backupDir)) return [];

    const files = (await fs.readdir(backupDir))
      .filter(f => f.startsWith('testweb_') && f.endsWith('.db'))
      .sort()
      .reverse();

    return files.map(f => {
      const filePath = path.join(backupDir, f);
      const stat = fs.statSync(filePath);
      const dateMatch = f.match(/testweb_(\d{4}-\d{2}-\d{2})\.db/);
      return {
        name: f,
        path: filePath,
        size: stat.size,
        date: dateMatch ? dateMatch[1] : '',
      };
    });
  }

  close(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
    }
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

export default LocalDatabase;
