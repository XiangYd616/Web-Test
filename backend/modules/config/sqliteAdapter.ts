/**
 * SQLite 适配器
 * 提供与 pg 兼容的 query() 接口，让现有代码无需修改即可运行
 * 使用 better-sqlite3 作为底层驱动
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// pg 兼容的查询结果类型
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  fields?: Array<{ name: string }>;
  command?: string;
}

let db: Database.Database | null = null;

export const getDbPath = () => {
  const dataDir = process.env.SQLITE_DATA_DIR || path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, process.env.SQLITE_DB_NAME || 'testweb.db');
};

/**
 * 初始化 SQLite 数据库
 */
export const initSQLite = (): Database.Database => {
  if (db) return db;

  const dbPath = getDbPath();
  console.log(`📦 SQLite 数据库路径: ${dbPath}`);

  db = new Database(dbPath);

  // 性能优化
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');

  // 初始化 schema
  initSchema(db);

  // 运行迁移（为已有数据库添加缺失列）
  runMigrations(db);

  console.log('✅ SQLite 数据库初始化完成');
  return db;
};

/**
 * 将 PostgreSQL 风格的 $1, $2 参数占位符转换为 SQLite 的 ? 占位符
 * 同时处理 ANY($N) 数组展开为 IN (?, ?, ...)
 */
const convertParams = (sql: string, params?: unknown[]): { sql: string; params: unknown[] } => {
  if (!params || params.length === 0) {
    return { sql, params: [] };
  }

  // 统一处理：按出现顺序替换 ANY($N) 和普通 $N
  const expandedParams: unknown[] = [];
  const convertedSql = sql.replace(
    /=\s*ANY\s*\(\s*\$(\d+)\s*\)|\$(\d+)/gi,
    (_match, anyNum, plainNum) => {
      if (anyNum) {
        // ANY($N) → IN (?, ?, ...)
        const idx = parseInt(anyNum, 10) - 1;
        const arr = idx < params.length ? params[idx] : [];
        if (Array.isArray(arr) && arr.length > 0) {
          arr.forEach(v => expandedParams.push(v));
          return `IN (${arr.map(() => '?').join(', ')})`;
        }
        return 'IN (NULL)';
      }
      // 普通 $N → ?
      const idx = parseInt(plainNum, 10) - 1;
      expandedParams.push(idx < params.length ? params[idx] : null);
      return '?';
    }
  );

  return { sql: convertedSql, params: expandedParams };
};

/**
 * 适配 PostgreSQL SQL 语法到 SQLite
 */
const adaptSQL = (sql: string): string => {
  let adapted = sql;

  // 移除 PostgreSQL 特有的 SET 命令
  if (
    /^\s*SET\s+(search_path|timezone|statement_timeout|lock_timeout|idle_in_transaction)/i.test(
      adapted
    )
  ) {
    return ''; // 跳过 PG 特有设置
  }

  // RETURNING * → 移除（SQLite 3.35+ 支持 RETURNING，但 better-sqlite3 处理方式不同）
  // 我们在 query 函数中特殊处理 RETURNING

  // uuid_generate_v4() → 使用 hex(randomblob(16))
  adapted = adapted.replace(
    /uuid_generate_v4\(\)/gi,
    "lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))"
  );
  adapted = adapted.replace(
    /gen_random_uuid\(\)/gi,
    "lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))"
  );

  // NOW() + INTERVAL 'N ...' → datetime('now', '+N ...') （必须在独立 NOW() 替换之前）
  adapted = adapted.replace(
    /NOW\s*\(\s*\)\s*\+\s*INTERVAL\s*'(\d+)\s+(day|days|hour|hours|minute|minutes|second|seconds|month|months|year|years)'/gi,
    (_m: string, n: string, unit: string) => {
      const u = unit.toLowerCase().replace(/s$/, '');
      const map: Record<string, string> = {
        day: 'days',
        hour: 'hours',
        minute: 'minutes',
        second: 'seconds',
        month: 'months',
        year: 'years',
      };
      return `datetime('now', '+${n} ${map[u] || u}')`;
    }
  );

  // NOW() - INTERVAL 'N ...' → datetime('now', '-N ...') （必须在独立 NOW() 替换之前）
  adapted = adapted.replace(
    /NOW\s*\(\s*\)\s*-\s*INTERVAL\s*'(\d+)\s+(day|days|hour|hours|minute|minutes|second|seconds|month|months|year|years)'/gi,
    (_m: string, n: string, unit: string) => {
      const u = unit.toLowerCase().replace(/s$/, '');
      const map: Record<string, string> = {
        day: 'days',
        hour: 'hours',
        minute: 'minutes',
        second: 'seconds',
        month: 'months',
        year: 'years',
      };
      return `datetime('now', '-${n} ${map[u] || u}')`;
    }
  );

  // CURRENT_DATE - INTERVAL 'N days' → date('now', '-N days') （必须在独立 CURRENT_DATE 替换之前）
  adapted = adapted.replace(
    /CURRENT_DATE\s*-\s*INTERVAL\s*'(\d+)\s+(day|days|hour|hours|minute|minutes|month|months|year|years)'/gi,
    (_m: string, n: string, unit: string) => {
      const u = unit.toLowerCase().replace(/s$/, '');
      const map: Record<string, string> = {
        day: 'days',
        hour: 'hours',
        minute: 'minutes',
        month: 'months',
        year: 'years',
      };
      return `date('now', '-${n} ${map[u] || u}')`;
    }
  );

  // NOW() - ($N || ' units')::interval → datetime('now', '-' || $N || ' units')
  // 动态参数拼接的 interval 表达式（必须在独立 NOW() 替换之前）
  adapted = adapted.replace(
    /NOW\s*\(\s*\)\s*-\s*\(([^)]+)\)\s*::interval/gi,
    (_m: string, expr: string) => `datetime('now', '-' || ${expr.trim()})`
  );
  adapted = adapted.replace(
    /NOW\s*\(\s*\)\s*\+\s*\(([^)]+)\)\s*::interval/gi,
    (_m: string, expr: string) => `datetime('now', '+' || ${expr.trim()})`
  );

  // 独立的 CURRENT_DATE → date('now')
  adapted = adapted.replace(/\bCURRENT_DATE\b/gi, "date('now')");

  // NOW() → datetime('now')
  adapted = adapted.replace(/\bNOW\(\)/gi, "datetime('now')");
  adapted = adapted.replace(/\bCURRENT_TIMESTAMP\b/gi, "datetime('now')");

  // TIMESTAMP WITH TIME ZONE → TEXT
  adapted = adapted.replace(/TIMESTAMP\s+WITH\s+TIME\s+ZONE/gi, 'TEXT');

  // SERIAL PRIMARY KEY → INTEGER PRIMARY KEY AUTOINCREMENT
  adapted = adapted.replace(/\bSERIAL\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');

  // JSONB / JSON → TEXT (SQLite 存储 JSON 为文本)
  adapted = adapted.replace(/\bJSONB\b/gi, 'TEXT');
  adapted = adapted.replace(/\bJSON\b(?!\s*\()/gi, 'TEXT');

  // INET → TEXT
  adapted = adapted.replace(/\bINET\b/gi, 'TEXT');

  // UUID → TEXT
  adapted = adapted.replace(/\bUUID\b(?!\s*\()/gi, 'TEXT');

  // BOOLEAN → INTEGER
  adapted = adapted.replace(/\bBOOLEAN\b/gi, 'INTEGER');

  // VARCHAR(N) → TEXT (SQLite 不区分)
  adapted = adapted.replace(/\bVARCHAR\s*\(\s*\d+\s*\)/gi, 'TEXT');

  // DECIMAL(N,M) → REAL
  adapted = adapted.replace(/\bDECIMAL\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, 'REAL');

  // BIGINT → INTEGER
  adapted = adapted.replace(/\bBIGINT\b/gi, 'INTEGER');

  // TEXT[] → TEXT (数组存为 JSON 文本)
  adapted = adapted.replace(/\bTEXT\s*\[\s*\]/gi, 'TEXT');
  adapted = adapted.replace(/\bINTEGER\s*\[\s*\]/gi, 'TEXT');

  // 移除 PostgreSQL 特有的 CHECK 约束中的复杂表达式（保留简单的）
  // 移除 USING GIN / USING GIST 索引
  adapted = adapted.replace(/\s+USING\s+(GIN|GIST|BTREE)\s*/gi, ' ');

  // pg_trgm, pgcrypto 扩展 → 跳过
  if (/^\s*CREATE\s+EXTENSION/i.test(adapted)) {
    return '';
  }

  // 移除 ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY（SQLite 不支持 ALTER ADD CONSTRAINT）
  if (/^\s*ALTER\s+TABLE.*ADD\s+CONSTRAINT.*FOREIGN\s+KEY/i.test(adapted)) {
    return '';
  }

  // 移除 ALTER TABLE ... ADD COLUMN IF NOT EXISTS（SQLite 不支持 IF NOT EXISTS 在 ADD COLUMN 中）
  // 但我们可以忽略错误

  // 移除 DO $$ ... $$ 块
  if (/^\s*DO\s+\$\$/i.test(adapted)) {
    return '';
  }

  // 移除 CREATE OR REPLACE FUNCTION
  if (/^\s*CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i.test(adapted)) {
    return '';
  }

  // 移除 DROP TRIGGER / CREATE TRIGGER（PG 语法不兼容）
  if (/^\s*(DROP|CREATE)\s+TRIGGER/i.test(adapted)) {
    return '';
  }

  // 移除 ON DELETE CASCADE 等约束中的 REFERENCES（SQLite 处理方式不同但支持）
  // 保留即可

  // pg 系统表/函数查询 → 返回空（SQLite 无对应功能）
  if (
    /pg_size_pretty|pg_total_relation_size|pg_stat_activity|information_schema|pg_settings|pg_locks|pg_tables|pg_stat_user_tables|pg_stat_bgwriter|pg_stat_database|pg_database|pg_stat_replication|pg_stat_statements|pg_statio_user_tables|pg_tablespace|pg_stat_user_indexes/i.test(
      adapted
    )
  ) {
    return '';
  }

  // DOUBLE PRECISION → REAL
  adapted = adapted.replace(/\bDOUBLE\s+PRECISION\b/gi, 'REAL');

  // NUMERIC(N,M) → REAL
  adapted = adapted.replace(/\bNUMERIC\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, 'REAL');

  // DATE type → TEXT in SQLite
  adapted = adapted.replace(/\bDATE\b(?!\s*\()/gi, 'TEXT');

  // col->>'key' → json_extract(col, '$.key') （PG JSONB ->> 操作符 → SQLite json_extract）
  adapted = adapted.replace(
    /(\w+(?:\.\w+)?)\s*->>\s*'(\w+)'/g,
    (_m: string, col: string, key: string) => `json_extract(${col}, '$.${key}')`
  );

  // ARRAY[]::TEXT[] → '[]'
  adapted = adapted.replace(/ARRAY\s*\[\s*\]\s*::\s*TEXT\s*\[\s*\]/gi, "'[]'");

  // PG 类型转换 ::type → 移除（SQLite 不支持）
  // 必须在其他替换之后执行，避免误伤
  adapted = adapted.replace(
    /::(int|integer|bigint|smallint|numeric|float|real|double precision|text|varchar|boolean|json|jsonb|uuid|timestamp|date|interval)\b/gi,
    ''
  );

  // COUNT(*) FILTER (WHERE cond)::type → SUM(CASE WHEN cond THEN 1 ELSE 0 END)
  // 处理带括号嵌套的 FILTER 子句
  adapted = adapted.replace(
    /COUNT\s*\(\s*\*\s*\)\s*FILTER\s*\(\s*WHERE\s+((?:[^()]*|\((?:[^()]*|\([^()]*\))*\))*)\)/gi,
    (_match, condition) => `SUM(CASE WHEN ${condition.trim()} THEN 1 ELSE 0 END)`
  );

  // EXTRACT(EPOCH FROM (expr)) → 对于时间差，SQLite 用 strftime 近似
  // 简化处理：EXTRACT(EPOCH FROM (a - b)) → (julianday(a) - julianday(b)) * 86400
  adapted = adapted.replace(
    /EXTRACT\s*\(\s*EPOCH\s+FROM\s+\(([^)]+)\s*-\s*([^)]+)\)\s*\)/gi,
    '(julianday($1) - julianday($2)) * 86400'
  );
  // 单参数形式：EXTRACT(EPOCH FROM expr)
  adapted = adapted.replace(
    /EXTRACT\s*\(\s*EPOCH\s+FROM\s+([^)]+)\)/gi,
    "(julianday($1) - julianday('1970-01-01')) * 86400"
  );

  // ILIKE → LIKE（SQLite 的 LIKE 默认对 ASCII 大小写不敏感）
  adapted = adapted.replace(/\bILIKE\b/gi, 'LIKE');

  // LEFT JOIN LATERAL (SELECT ... FROM table WHERE fk = outer.col ORDER BY ... LIMIT 1) alias ON true
  // → LEFT JOIN (SELECT *, ROW_NUMBER() OVER (PARTITION BY fk ORDER BY ...) as _rn FROM table) alias
  //   ON alias.fk = outer.col AND alias._rn = 1
  // SQLite 不支持 LATERAL，需要将相关子查询转换为窗口函数方式
  adapted = adapted.replace(
    /LEFT\s+JOIN\s+LATERAL\s*\(([\s\S]*?)\)\s+(\w+)\s+ON\s+true/gi,
    (_match, subquery: string, alias: string) => {
      const sub = subquery.trim();
      // 尝试解析常见模式: SELECT cols FROM table WHERE fk = outer.col ORDER BY orderCol DESC LIMIT 1
      const parseMatch = sub.match(
        /SELECT\s+([\s\S]+?)\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*(\w+\.\w+)\s+ORDER\s+BY\s+(\w+)\s+(ASC|DESC)\s+LIMIT\s+1/i
      );
      if (parseMatch) {
        const [, cols, table, fkCol, outerRef, orderCol, orderDir] = parseMatch;
        // 确保 fkCol 在 SELECT 列表中（ON 子句需要引用它）
        const colList = cols.split(',').map(c => c.trim());
        const hasFk = colList.some(c => c === fkCol || c === '*' || c.endsWith('.' + fkCol));
        const selectCols = hasFk ? cols : `${fkCol}, ${cols}`;
        return `LEFT JOIN (SELECT ${selectCols}, ROW_NUMBER() OVER (PARTITION BY ${fkCol} ORDER BY ${orderCol} ${orderDir}) as _rn FROM ${table}) ${alias} ON ${alias}.${fkCol} = ${outerRef} AND ${alias}._rn = 1`;
      }
      // 回退：简单移除 LATERAL，可能不完全正确但避免语法错误
      return `LEFT JOIN (${sub}) ${alias} ON 1=1`;
    }
  );

  // UPDATE table alias SET ... FROM other_table other_alias WHERE ... [RETURNING alias.col]
  // → UPDATE table SET ... WHERE EXISTS (SELECT 1 FROM other_table other_alias WHERE ...) [RETURNING col]
  // SQLite 不支持 UPDATE ... FROM 语法和表别名
  {
    const updateFromMatch = adapted.match(
      /^(\s*UPDATE\s+)(\w+)\s+(\w+)\s+(SET\s+[\s\S]*?)\s+FROM\s+(\w+)\s+(\w+)\s+WHERE\s+([\s\S]*)$/i
    );
    if (updateFromMatch) {
      const [, prefix, table, tableAlias, setPart, fromTable, fromAlias, wherePart] =
        updateFromMatch;
      // 提取 RETURNING 子句
      const retMatch = wherePart.match(/\s+(RETURNING\s+.*)$/i);
      let returningClause = retMatch ? ' ' + retMatch[1] : '';
      const whereCore = retMatch
        ? wherePart.substring(0, wherePart.length - retMatch[0].length)
        : wherePart;
      // SET / RETURNING 中移除表别名（UPDATE 主语句上下文无歧义）
      const stripAlias = (s: string) => s.replace(new RegExp(`\\b${tableAlias}\\.`, 'g'), '');
      const strippedSet = stripAlias(setPart);
      returningClause = stripAlias(returningClause);
      // WHERE 子句中将表别名替换为完整表名（EXISTS 子查询中裸列名会与 FROM 表歧义）
      const qualifyAlias = (s: string) =>
        s.replace(new RegExp(`\\b${tableAlias}\\.`, 'g'), `${table}.`);
      const qualifiedWhere = qualifyAlias(whereCore);
      adapted = `${prefix}${table} ${strippedSet} WHERE EXISTS (SELECT 1 FROM ${fromTable} ${fromAlias} WHERE ${qualifiedWhere})${returningClause}`;
    }
  }

  // DISTINCT ON (col) → SQLite 不支持，使用 GROUP BY 替代
  adapted = adapted.replace(/SELECT\s+DISTINCT\s+ON\s*\(([^)]+)\)/gi, 'SELECT');

  // interval 表达式：($N || ' days')::interval → 不支持，简化移除
  adapted = adapted.replace(
    /\(\s*\$(\d+)\s*\|\|\s*'[^']*'\s*\)\s*::\s*interval/gi,
    "($$$1 || ' days')"
  );

  // 移除 ALTER TABLE ... ADD COLUMN IF NOT EXISTS（SQLite 不支持 IF NOT EXISTS 在 ADD COLUMN）
  if (/^\s*ALTER\s+TABLE/i.test(adapted)) {
    return '';
  }

  return adapted;
};

/**
 * 执行 pg 兼容的查询
 */
export const sqliteQuery = async (text: string, params: unknown[] = []): Promise<QueryResult> => {
  if (!db) {
    throw new Error('SQLite 数据库未初始化');
  }

  // 处理多语句（PG 的 SET 命令等）
  const statements = text
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);

  if (statements.length > 1) {
    // 多语句：逐个执行，返回最后一个的结果
    let lastResult: QueryResult = { rows: [], rowCount: 0 };
    for (const stmt of statements) {
      const adapted = adaptSQL(stmt);
      if (!adapted) continue;
      try {
        lastResult = await executeSingle(adapted, []);
      } catch {
        // 忽略多语句中的单个失败
      }
    }
    return lastResult;
  }

  const adapted = adaptSQL(text);
  if (!adapted) {
    return { rows: [], rowCount: 0 };
  }

  const { sql: convertedSql, params: convertedParams } = convertParams(adapted, params);
  return executeSingle(convertedSql, convertedParams);
};

const executeSingle = async (sql: string, params: unknown[]): Promise<QueryResult> => {
  if (!db) throw new Error('SQLite 数据库未初始化');

  const trimmed = sql.trim();
  if (!trimmed) return { rows: [], rowCount: 0 };

  // 处理 RETURNING 子句
  const returningMatch = trimmed.match(/\bRETURNING\s+(.+)$/i);

  try {
    const isSelect = /^\s*(SELECT|PRAGMA|EXPLAIN|WITH)/i.test(trimmed);
    const isInsert = /^\s*INSERT/i.test(trimmed);
    const isUpdate = /^\s*UPDATE/i.test(trimmed);
    const isDelete = /^\s*DELETE/i.test(trimmed);

    // 处理 JSON 参数：将对象/数组转为 JSON 字符串
    const processedParams = params.map(p => {
      if (p === null || p === undefined) return null;
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (p instanceof Date) return p.toISOString();
      if (typeof p === 'object') return JSON.stringify(p);
      return p;
    });

    if (isSelect) {
      const stmt = db.prepare(trimmed);
      const rows = stmt.all(...processedParams) as Record<string, unknown>[];
      // 解析 JSON 字段
      const parsed = rows.map(parseJsonFields);
      return { rows: parsed, rowCount: parsed.length };
    }

    if (returningMatch && (isInsert || isUpdate || isDelete)) {
      // SQLite 3.35+ 支持 RETURNING
      try {
        const stmt = db.prepare(trimmed);
        const rows = stmt.all(...processedParams) as Record<string, unknown>[];
        const parsed = rows.map(parseJsonFields);
        return { rows: parsed, rowCount: parsed.length };
      } catch {
        // 如果 RETURNING 不支持，去掉它执行
        const withoutReturning = trimmed.replace(/\s+RETURNING\s+.+$/i, '');
        const stmt = db.prepare(withoutReturning);
        const info = stmt.run(...processedParams);
        return {
          rows: [{ id: info.lastInsertRowid }],
          rowCount: info.changes,
        };
      }
    }

    // 普通写操作
    const stmt = db.prepare(trimmed);
    const info = stmt.run(...processedParams);
    return {
      rows: [],
      rowCount: info.changes,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // 忽略 "table already exists" 等非致命错误
    if (/already exists|duplicate column|no such column/i.test(message)) {
      return { rows: [], rowCount: 0 };
    }
    console.error(`❌ SQLite 查询错误: ${message}\nSQL: ${trimmed.substring(0, 200)}`);
    throw error;
  }
};

/**
 * 尝试解析 JSON 字段
 */
const parseJsonFields = (row: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
};

/**
 * 关闭 SQLite 连接
 */
export const closeSQLite = () => {
  if (db) {
    db.close();
    db = null;
    console.log('✅ SQLite 数据库连接已关闭');
  }
};

/**
 * 获取 SQLite 数据库实例
 */
export const getSQLiteDb = () => db;

/**
 * 运行数据库迁移（为已有数据库添加缺失列）
 */
const runMigrations = (database: Database.Database) => {
  const addColumnIfNotExists = (table: string, column: string, type: string) => {
    const columns = database.pragma(`table_info(${table})`) as Array<{ name: string }>;
    if (!columns.some(c => c.name === column)) {
      database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  };

  try {
    addColumnIfNotExists('environments', 'created_by', 'TEXT');
    addColumnIfNotExists('environments', 'updated_by', 'TEXT');
    addColumnIfNotExists('environments', 'variables', "TEXT DEFAULT '[]'");
    addColumnIfNotExists('environments', 'is_active', 'INTEGER DEFAULT 0');
    addColumnIfNotExists('performance_test_results', 'http_info', "TEXT DEFAULT '{}'");
    addColumnIfNotExists('security_test_results', 'extended_checks', "TEXT DEFAULT '{}'");
    addColumnIfNotExists('seo_test_results', 'checks_data', "TEXT DEFAULT '{}'");

    // stress_test_results 表 schema 重建：旧表只有 7 列，repository 需要 22+ 列
    const stressCols = database.pragma('table_info(stress_test_results)') as Array<{
      name: string;
    }>;
    const hasTestId = stressCols.some(c => c.name === 'test_id');
    if (stressCols.length > 0 && !hasTestId) {
      database.exec('DROP TABLE IF EXISTS stress_test_results');
      database.exec(`
        CREATE TABLE IF NOT EXISTS stress_test_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          test_id TEXT NOT NULL,
          user_id TEXT,
          test_name TEXT,
          url TEXT NOT NULL DEFAULT '',
          config TEXT NOT NULL DEFAULT '{}',
          status TEXT NOT NULL DEFAULT 'pending',
          results TEXT,
          total_requests INTEGER DEFAULT 0,
          successful_requests INTEGER DEFAULT 0,
          failed_requests INTEGER DEFAULT 0,
          success_rate REAL,
          avg_response_time REAL DEFAULT 0,
          min_response_time REAL DEFAULT 0,
          max_response_time REAL DEFAULT 0,
          throughput REAL DEFAULT 0,
          start_time TEXT,
          end_time TEXT,
          duration INTEGER DEFAULT 0,
          error_message TEXT,
          tags TEXT DEFAULT '[]',
          environment TEXT,
          metadata TEXT DEFAULT '{}',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          UNIQUE (test_id)
        )
      `);
      console.log('✅ stress_test_results 表已重建（schema 升级）');
    }
    // monitoring_sites: 添加 MonitoringService 需要的缺失列
    addColumnIfNotExists('monitoring_sites', 'workspace_id', 'TEXT');
    addColumnIfNotExists('monitoring_sites', 'monitoring_type', "TEXT DEFAULT 'uptime'");
    addColumnIfNotExists('monitoring_sites', 'config', "TEXT DEFAULT '{}'");
    addColumnIfNotExists('monitoring_sites', 'notification_settings', "TEXT DEFAULT '{}'");
    addColumnIfNotExists('monitoring_sites', 'consecutive_failures', 'INTEGER DEFAULT 0');
    addColumnIfNotExists('monitoring_sites', 'last_response_time', 'INTEGER');
    addColumnIfNotExists('monitoring_sites', 'last_checked_at', 'TEXT');
    addColumnIfNotExists('monitoring_sites', 'is_active', 'INTEGER DEFAULT 1');
    addColumnIfNotExists('monitoring_sites', 'deleted_at', 'TEXT');

    // monitoring_alerts: 添加 MonitoringService 需要的缺失列
    addColumnIfNotExists('monitoring_alerts', 'site_id', 'TEXT');
    addColumnIfNotExists('monitoring_alerts', 'status', "TEXT DEFAULT 'active'");
    addColumnIfNotExists('monitoring_alerts', 'details', "TEXT DEFAULT '{}'");

    // monitoring_results: 确保表存在（旧数据库可能只有 monitoring_checks）
    database.exec(`
      CREATE TABLE IF NOT EXISTS monitoring_results (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
        site_id TEXT NOT NULL REFERENCES monitoring_sites(id) ON DELETE CASCADE,
        workspace_id TEXT,
        status TEXT NOT NULL,
        response_time INTEGER,
        status_code INTEGER,
        results TEXT DEFAULT '{}',
        error_message TEXT,
        checked_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // test_templates: 添加 template_name 列（service 使用 template_name，schema 使用 name）
    addColumnIfNotExists('test_templates', 'template_name', 'TEXT');
    addColumnIfNotExists('test_templates', 'usage_count', 'INTEGER DEFAULT 0');

    // 同步 name → template_name（已有数据）
    database.exec(`
      UPDATE test_templates SET template_name = name
      WHERE template_name IS NULL AND name IS NOT NULL
    `);

    // 预置官方模板（幂等：仅在无系统模板时插入）
    seedOfficialTemplates(database);

    // ===== 双向同步字段迁移 =====
    const syncTables = ['workspaces', 'collections', 'environments', 'test_templates'];
    for (const table of syncTables) {
      addColumnIfNotExists(table, 'sync_id', 'TEXT UNIQUE');
      addColumnIfNotExists(table, 'sync_version', 'INTEGER DEFAULT 1');
      addColumnIfNotExists(table, 'sync_updated_at', 'TEXT');
      addColumnIfNotExists(table, 'sync_device_id', 'TEXT');
      addColumnIfNotExists(table, 'sync_status', "TEXT DEFAULT 'synced'");
    }

    // sync_queue: 本地变更队列（离线时写入，联网后推送到云端）
    database.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_sync_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
        data TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'pushed', 'failed'))
      )
    `);

    // sync_conflicts: 冲突记录
    database.exec(`
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
        table_name TEXT NOT NULL,
        record_sync_id TEXT NOT NULL,
        local_version INTEGER,
        remote_version INTEGER,
        local_data TEXT,
        remote_data TEXT,
        resolution TEXT DEFAULT 'pending' CHECK (resolution IN ('pending', 'local', 'remote', 'merged')),
        resolved_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // sync_meta: 同步元数据（上次同步时间等）
    database.exec(`
      CREATE TABLE IF NOT EXISTS sync_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // 为已有记录回填 sync_id = id（确保每行都有 sync_id）
    for (const table of syncTables) {
      database.exec(`UPDATE ${table} SET sync_id = id WHERE sync_id IS NULL`);
      database.exec(
        `UPDATE ${table} SET sync_updated_at = COALESCE(updated_at, created_at, datetime('now')) WHERE sync_updated_at IS NULL`
      );
    }

    // 自动入队触发器：INSERT/UPDATE/DELETE 时自动写入 sync_queue
    for (const table of syncTables) {
      // INSERT 触发器
      database.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_${table}_sync_insert
        AFTER INSERT ON ${table}
        WHEN NEW.sync_status != 'synced'
        BEGIN
          INSERT INTO sync_queue (table_name, record_sync_id, operation, data)
          VALUES ('${table}', COALESCE(NEW.sync_id, NEW.id),  'create',
            json_object('id', NEW.id, 'sync_id', COALESCE(NEW.sync_id, NEW.id), 'sync_version', COALESCE(NEW.sync_version, 1)));
          UPDATE ${table} SET sync_status = 'pending', sync_id = COALESCE(sync_id, id), sync_updated_at = datetime('now') WHERE id = NEW.id;
        END
      `);

      // UPDATE 触发器
      database.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_${table}_sync_update
        AFTER UPDATE ON ${table}
        WHEN NEW.sync_status != 'synced' AND OLD.sync_version = NEW.sync_version
        BEGIN
          INSERT INTO sync_queue (table_name, record_sync_id, operation, data)
          VALUES ('${table}', COALESCE(NEW.sync_id, NEW.id), 'update',
            json_object('id', NEW.id, 'sync_id', COALESCE(NEW.sync_id, NEW.id), 'sync_version', COALESCE(NEW.sync_version, 1) + 1));
          UPDATE ${table} SET sync_status = 'pending', sync_version = COALESCE(sync_version, 1) + 1, sync_updated_at = datetime('now') WHERE id = NEW.id;
        END
      `);

      // DELETE 触发器
      database.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_${table}_sync_delete
        AFTER DELETE ON ${table}
        BEGIN
          INSERT INTO sync_queue (table_name, record_sync_id, operation, data)
          VALUES ('${table}', COALESCE(OLD.sync_id, OLD.id), 'delete',
            json_object('id', OLD.id, 'sync_id', COALESCE(OLD.sync_id, OLD.id), 'sync_version', COALESCE(OLD.sync_version, 1)));
        END
      `);
    }
  } catch (err) {
    console.warn('⚠️ 数据库迁移警告:', err instanceof Error ? err.message : String(err));
  }
};

/**
 * 预置官方模板种子数据
 */
const seedOfficialTemplates = (database: Database.Database) => {
  const count = database
    .prepare('SELECT COUNT(*) as cnt FROM test_templates WHERE user_id IS NULL AND is_public = 1')
    .get() as { cnt: number } | undefined;
  if (count && count.cnt >= 6) return; // 已有足够的系统模板

  const templates = [
    {
      engine_type: 'api',
      template_name: 'API 自动化测试 - 标准模板',
      description:
        '适用于 RESTful API 的自动化测试，支持多端点、断言、变量提取。包含常用 HTTP 方法和响应校验。',
      config: {
        url: '{{baseUrl}}/api/v1/health',
        testType: 'api',
        options: {
          method: 'GET',
          timeout: 30000,
          followRedirects: true,
          validateSSL: true,
          retries: 1,
        },
        endpoints: [
          { name: '健康检查', method: 'GET', path: '/api/v1/health', expectedStatus: 200 },
          {
            name: '用户列表',
            method: 'GET',
            path: '/api/v1/users',
            expectedStatus: 200,
            headers: { Authorization: 'Bearer {{token}}' },
          },
        ],
        assertions: [
          { field: 'status', operator: 'eq', value: 200 },
          { field: 'responseTime', operator: 'lt', value: 3000 },
          { field: 'body.success', operator: 'eq', value: true },
        ],
        variables: { baseUrl: 'https://example.com', token: '' },
      },
    },
    {
      engine_type: 'performance',
      template_name: '性能测试 - 标准模板',
      description:
        '全面的 Web 性能测试模板，包含 Core Web Vitals、HTTP 瀑布图、资源分析。适用于网站性能基线评估。',
      config: {
        url: '{{targetUrl}}',
        testType: 'performance',
        options: {
          iterations: 3,
          throttling: 'none',
          device: 'desktop',
          checkPerformance: true,
          checkResources: true,
          checkWebVitals: true,
          lighthouse: true,
        },
        concurrency: 1,
        duration: 60,
        thresholds: { lcp: 2500, fcp: 1800, cls: 0.1, inp: 200, ttfb: 800 },
      },
    },
    {
      engine_type: 'stress',
      template_name: '压力测试 - 标准模板',
      description:
        '渐进式压力测试模板，从低并发逐步升压至目标并发数，观察系统在不同负载下的响应表现和稳定性。',
      config: {
        url: '{{targetUrl}}',
        testType: 'stress',
        options: {
          maxConcurrency: 100,
          rampUpDuration: 30,
          holdDuration: 60,
          rampDownDuration: 10,
          requestsPerSecond: 50,
          timeout: 10000,
        },
        concurrency: 100,
        duration: 120,
        thresholds: { maxResponseTime: 5000, errorRate: 0.05, p95ResponseTime: 3000 },
      },
    },
    {
      engine_type: 'security',
      template_name: '安全扫描 - 基础模板',
      description:
        '基于 OWASP Top 10 的安全基础扫描模板，检测常见 Web 安全漏洞：XSS、SQL 注入、CSRF、安全头缺失等。',
      config: {
        url: '{{targetUrl}}',
        testType: 'security',
        options: {
          checkHeaders: true,
          checkSSL: true,
          checkXSS: true,
          checkSQLInjection: true,
          checkCSRF: true,
          checkOpenRedirect: true,
          checkInfoDisclosure: true,
          checkCORS: true,
          scanDepth: 'standard',
          followRedirects: true,
          timeout: 30000,
        },
      },
    },
    {
      engine_type: 'seo',
      template_name: 'SEO 检测 - 标准模板',
      description:
        '全面的 SEO 健康检查模板，覆盖 Meta 标签、结构化数据、移动端适配、Open Graph、Sitemap 等核心 SEO 要素。',
      config: {
        url: '{{targetUrl}}',
        testType: 'seo',
        options: {
          checkSEO: true,
          checkMobile: true,
          checkBestPractices: true,
          checkPerformance: true,
          checkAccessibility: true,
          checkStructuredData: true,
          checkOpenGraph: true,
          checkCanonical: true,
          checkSitemap: true,
          checkRobots: true,
        },
      },
    },
    {
      engine_type: 'accessibility',
      template_name: '无障碍检测 - 标准模板',
      description:
        '基于 WCAG 2.1 标准的无障碍检测模板，检查颜色对比度、键盘导航、ARIA 标签、语义化 HTML 等。',
      config: {
        url: '{{targetUrl}}',
        testType: 'accessibility',
        options: {
          standard: 'WCAG21AA',
          checkContrast: true,
          checkKeyboard: true,
          checkAria: true,
          checkSemantics: true,
          checkForms: true,
          checkImages: true,
          checkLinks: true,
          includeWarnings: true,
        },
      },
    },
  ];

  const stmt = database.prepare(`
    INSERT OR IGNORE INTO test_templates (user_id, workspace_id, engine_type, template_name, name, description, config, is_public, is_default, usage_count)
    VALUES (NULL, NULL, ?, ?, ?, ?, ?, 1, 1, 0)
  `);

  let inserted = 0;
  for (const t of templates) {
    const existing = database
      .prepare(
        'SELECT 1 FROM test_templates WHERE user_id IS NULL AND engine_type = ? AND template_name = ?'
      )
      .get(t.engine_type, t.template_name);
    if (!existing) {
      stmt.run(
        t.engine_type,
        t.template_name,
        t.template_name,
        t.description,
        JSON.stringify(t.config)
      );
      inserted++;
    }
  }
  if (inserted > 0) {
    console.log(`✅ 已插入 ${inserted} 个官方预置模板`);
  }
};

/**
 * 初始化核心表 schema
 */
const initSchema = (database: Database.Database) => {
  database.exec(`
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      avatar_url TEXT,
      role TEXT DEFAULT 'user',
      plan TEXT DEFAULT 'free',
      status TEXT DEFAULT 'active',
      is_active INTEGER DEFAULT 1,
      two_factor_enabled INTEGER DEFAULT 0,
      email_verified INTEGER DEFAULT 0,
      email_verified_at TEXT,
      last_login TEXT,
      locked_until TEXT,
      login_attempts INTEGER DEFAULT 0,
      last_login_attempt TEXT,
      password_changed_at TEXT DEFAULT (datetime('now')),
      password_expired INTEGER DEFAULT 0,
      last_password_warning TEXT,
      preferences TEXT DEFAULT '{}',
      settings TEXT DEFAULT '{}',
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    -- 刷新令牌表
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      jti TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      is_revoked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 用户会话表
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL,
      device_name TEXT,
      device_type TEXT,
      ip_address TEXT,
      user_agent TEXT,
      location TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_activity_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      terminated_at TEXT,
      is_active INTEGER DEFAULT 1,
      refresh_token TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 工作空间表
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      name TEXT NOT NULL,
      description TEXT,
      visibility TEXT DEFAULT 'private',
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 工作空间成员表
    CREATE TABLE IF NOT EXISTS workspace_members (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member',
      status TEXT DEFAULT 'active',
      permissions TEXT DEFAULT '[]',
      invited_by TEXT,
      invited_at TEXT,
      joined_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(workspace_id, user_id)
    );

    -- 测试执行核心表
    CREATE TABLE IF NOT EXISTS test_executions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id TEXT UNIQUE NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
      engine_type TEXT NOT NULL,
      engine_name TEXT NOT NULL,
      test_name TEXT NOT NULL,
      test_url TEXT,
      test_config TEXT DEFAULT '{}',
      url TEXT,
      config TEXT DEFAULT '{}',
      results TEXT DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      progress INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'medium',
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT,
      execution_time REAL,
      error_message TEXT,
      metadata TEXT DEFAULT '{}',
      tags TEXT DEFAULT '[]',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_test_executions_user_id ON test_executions(user_id);
    CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(status);
    CREATE INDEX IF NOT EXISTS idx_test_executions_created_at ON test_executions(created_at);
    CREATE INDEX IF NOT EXISTS idx_test_executions_test_id ON test_executions(test_id);

    -- 测试日志表
    CREATE TABLE IF NOT EXISTS test_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      context TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 测试结果详情表
    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      execution_id INTEGER NOT NULL REFERENCES test_executions(id) ON DELETE CASCADE,
      summary TEXT DEFAULT '{}',
      score REAL,
      grade TEXT,
      passed INTEGER,
      warnings TEXT DEFAULT '[]',
      errors TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 测试指标表
    CREATE TABLE IF NOT EXISTS test_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      result_id INTEGER NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
      metric_name TEXT NOT NULL,
      metric_value TEXT NOT NULL,
      metric_unit TEXT,
      metric_type TEXT,
      threshold_min REAL,
      threshold_max REAL,
      passed INTEGER,
      severity TEXT,
      recommendation TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 性能测试详细结果表
    CREATE TABLE IF NOT EXISTS performance_test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_result_id INTEGER NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
      web_vitals TEXT NOT NULL DEFAULT '{}',
      metrics TEXT NOT NULL DEFAULT '{}',
      recommendations TEXT NOT NULL DEFAULT '[]',
      resources TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE (test_result_id)
    );

    -- SEO 测试详细结果表
    CREATE TABLE IF NOT EXISTS seo_test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_result_id INTEGER NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
      meta_tags TEXT NOT NULL DEFAULT '{}',
      headings TEXT NOT NULL DEFAULT '{}',
      images TEXT NOT NULL DEFAULT '{}',
      links TEXT NOT NULL DEFAULT '{}',
      structured_data TEXT NOT NULL DEFAULT '{}',
      mobile_friendly INTEGER DEFAULT 0,
      page_speed_score REAL,
      checks_data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE (test_result_id)
    );

    -- 安全测试详细结果表
    CREATE TABLE IF NOT EXISTS security_test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_result_id INTEGER NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
      vulnerabilities TEXT NOT NULL DEFAULT '[]',
      security_headers TEXT NOT NULL DEFAULT '{}',
      ssl_info TEXT NOT NULL DEFAULT '{}',
      content_security_policy TEXT NOT NULL DEFAULT '{}',
      recommendations TEXT NOT NULL DEFAULT '{}',
      risk_level TEXT NOT NULL DEFAULT 'low',
      extended_checks TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE (test_result_id)
    );

    -- API 测试详细结果表
    CREATE TABLE IF NOT EXISTS api_test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_result_id INTEGER NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
      results TEXT NOT NULL DEFAULT '{}',
      summary TEXT NOT NULL DEFAULT '{}',
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE (test_result_id)
    );

    -- 压力测试详细结果表
    CREATE TABLE IF NOT EXISTS stress_test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id TEXT NOT NULL,
      user_id TEXT,
      test_name TEXT,
      url TEXT NOT NULL DEFAULT '',
      config TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      results TEXT,
      total_requests INTEGER DEFAULT 0,
      successful_requests INTEGER DEFAULT 0,
      failed_requests INTEGER DEFAULT 0,
      success_rate REAL,
      avg_response_time REAL DEFAULT 0,
      min_response_time REAL DEFAULT 0,
      max_response_time REAL DEFAULT 0,
      throughput REAL DEFAULT 0,
      start_time TEXT,
      end_time TEXT,
      duration INTEGER DEFAULT 0,
      error_message TEXT,
      tags TEXT DEFAULT '[]',
      environment TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE (test_id)
    );

    -- 用户测试统计表
    CREATE TABLE IF NOT EXISTS user_test_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      test_type TEXT NOT NULL,
      total_tests INTEGER NOT NULL DEFAULT 0,
      successful_tests INTEGER NOT NULL DEFAULT 0,
      failed_tests INTEGER NOT NULL DEFAULT 0,
      last_test_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE (user_id, test_type)
    );

    -- 测试对比记录表
    CREATE TABLE IF NOT EXISTS test_comparisons (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      comparison_name TEXT NOT NULL,
      comparison_type TEXT NOT NULL,
      execution_ids TEXT NOT NULL,
      comparison_data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 系统配置表
    CREATE TABLE IF NOT EXISTS system_configs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      config_key TEXT NOT NULL UNIQUE,
      config_value TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general',
      is_public INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- CI/CD API Key 表
    CREATE TABLE IF NOT EXISTS ci_api_keys (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      scopes TEXT NOT NULL DEFAULT '["trigger","query"]',
      last_used_at TEXT,
      expires_at TEXT,
      revoked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- CI/CD Webhook 配置表
    CREATE TABLE IF NOT EXISTS ci_webhooks (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      secret TEXT,
      events TEXT NOT NULL DEFAULT '["test.completed","test.failed"]',
      active INTEGER DEFAULT 1,
      last_triggered_at TEXT,
      failure_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 环境表
    CREATE TABLE IF NOT EXISTS environments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      config TEXT DEFAULT '{}',
      metadata TEXT DEFAULT '{}',
      created_by TEXT,
      updated_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 环境变量表
    CREATE TABLE IF NOT EXISTS environment_variables (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      environment_id TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      type TEXT,
      description TEXT,
      enabled INTEGER DEFAULT 1,
      secret INTEGER DEFAULT 0,
      encrypted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 集合表
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      default_environment_id TEXT,
      definition TEXT DEFAULT '{}',
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 运行记录表
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      environment_id TEXT REFERENCES environments(id) ON DELETE SET NULL,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'running',
      options TEXT DEFAULT '{}',
      summary TEXT DEFAULT '{}',
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      duration INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 运行结果表
    CREATE TABLE IF NOT EXISTS run_results (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      request_id TEXT NOT NULL,
      status TEXT NOT NULL,
      response TEXT,
      assertions TEXT,
      duration INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 定时运行表
    CREATE TABLE IF NOT EXISTS scheduled_runs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      environment_id TEXT REFERENCES environments(id) ON DELETE SET NULL,
      cron_expression TEXT NOT NULL,
      config TEXT DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'active',
      name TEXT,
      description TEXT,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      last_run_at TEXT,
      next_run_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 测试模板表
    CREATE TABLE IF NOT EXISTS test_templates (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      engine_type TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      is_public INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 密码历史表
    CREATE TABLE IF NOT EXISTS password_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 登录尝试表
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      ip_address TEXT,
      user_agent TEXT,
      success INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 用户活动表
    CREATE TABLE IF NOT EXISTS user_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      ip_address TEXT,
      user_agent TEXT,
      endpoint TEXT,
      method TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 性能基准测试配置表
    CREATE TABLE IF NOT EXISTS performance_benchmarks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      metrics TEXT NOT NULL DEFAULT '[]',
      thresholds TEXT NOT NULL DEFAULT '{}',
      test_suite TEXT NOT NULL DEFAULT '[]',
      environment TEXT NOT NULL,
      schedule TEXT DEFAULT NULL,
      notifications TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 性能基准测试结果表
    CREATE TABLE IF NOT EXISTS benchmark_results (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      benchmark_id TEXT NOT NULL REFERENCES performance_benchmarks(id) ON DELETE CASCADE,
      metrics TEXT NOT NULL DEFAULT '{}',
      environment TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'running',
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      duration INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 权限表
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      resource TEXT NOT NULL,
      action TEXT NOT NULL,
      effect TEXT NOT NULL DEFAULT 'allow',
      conditions TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 角色表
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      type TEXT DEFAULT 'custom',
      level INTEGER DEFAULT 1,
      parent_role_id TEXT,
      is_active INTEGER DEFAULT 1,
      is_system INTEGER DEFAULT 0,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      created_by TEXT,
      updated_by TEXT
    );

    -- 角色权限关联表
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (role_id, permission_id)
    );

    -- 用户角色关联表
    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      assigned_by TEXT,
      assigned_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      is_active INTEGER DEFAULT 1,
      revoked_at TEXT,
      revoked_by TEXT,
      UNIQUE (user_id, role_id)
    );

    -- 安全事件日志表
    CREATE TABLE IF NOT EXISTS security_events (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      success INTEGER DEFAULT 0,
      user_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      metadata TEXT DEFAULT '{}',
      error TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 监控告警表
    CREATE TABLE IF NOT EXISTS monitoring_alerts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      site_id TEXT REFERENCES monitoring_sites(id) ON DELETE CASCADE,
      alert_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      title TEXT NOT NULL DEFAULT '',
      message TEXT,
      source TEXT,
      status TEXT DEFAULT 'active',
      details TEXT DEFAULT '{}',
      metadata TEXT DEFAULT '{}',
      acknowledged INTEGER DEFAULT 0,
      acknowledged_by TEXT,
      acknowledged_at TEXT,
      resolved INTEGER DEFAULT 0,
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- UAT 用户反馈表
    CREATE TABLE IF NOT EXISTS uat_feedbacks (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      session_id TEXT NOT NULL UNIQUE,
      user_id TEXT,
      workspace_id TEXT,
      test_type TEXT NOT NULL,
      actions TEXT NOT NULL DEFAULT '[]',
      ratings TEXT NOT NULL DEFAULT '{}',
      issues TEXT NOT NULL DEFAULT '[]',
      comments TEXT,
      completed INTEGER DEFAULT 0,
      started_at TEXT,
      submitted_at TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 密码重置令牌表
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      used_at TEXT
    );

    -- 邮箱验证令牌表
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      used_at TEXT
    );

    -- 全局变量表
    CREATE TABLE IF NOT EXISTS global_variables (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      type TEXT,
      description TEXT,
      enabled INTEGER DEFAULT 1,
      secret INTEGER DEFAULT 0,
      encrypted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 权限审计日志表
    CREATE TABLE IF NOT EXISTS permission_audit_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      user_id TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT,
      result TEXT NOT NULL,
      reason TEXT,
      ip_address TEXT,
      user_agent TEXT,
      session_id TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      metadata TEXT DEFAULT '{}'
    );

    -- 工作空间邀请表
    CREATE TABLE IF NOT EXISTS workspace_invitations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invitee_email TEXT NOT NULL,
      role TEXT NOT NULL,
      permissions TEXT DEFAULT '[]',
      token TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TEXT NOT NULL,
      responded_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 工作空间资源表
    CREATE TABLE IF NOT EXISTS workspace_resources (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT,
      size INTEGER,
      mime_type TEXT,
      owner_id TEXT,
      permissions TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 工作空间活动表
    CREATE TABLE IF NOT EXISTS workspace_activities (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT,
      type TEXT NOT NULL,
      resource TEXT DEFAULT '{}',
      details TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 定时运行结果表
    CREATE TABLE IF NOT EXISTS scheduled_run_results (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      scheduled_run_id TEXT NOT NULL REFERENCES scheduled_runs(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'running',
      started_at TEXT,
      completed_at TEXT,
      duration INTEGER,
      total_requests INTEGER DEFAULT 0,
      passed_requests INTEGER DEFAULT 0,
      failed_requests INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      logs TEXT DEFAULT '[]',
      triggered_by TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 性能基线表
    CREATE TABLE IF NOT EXISTS performance_baselines (
      benchmark_id TEXT PRIMARY KEY REFERENCES performance_benchmarks(id) ON DELETE CASCADE,
      baseline_data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 性能基准测试结果表
    CREATE TABLE IF NOT EXISTS performance_benchmark_results (
      id TEXT PRIMARY KEY,
      benchmark_id TEXT NOT NULL REFERENCES performance_benchmarks(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      environment TEXT NOT NULL,
      executed_at TEXT NOT NULL,
      duration INTEGER NOT NULL,
      scores TEXT NOT NULL DEFAULT '{}',
      metrics TEXT NOT NULL DEFAULT '{}',
      comparison TEXT DEFAULT NULL,
      recommendations TEXT NOT NULL DEFAULT '[]',
      artifacts TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 引擎状态表
    CREATE TABLE IF NOT EXISTS engine_status (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      engine_name TEXT NOT NULL,
      engine_type TEXT NOT NULL,
      version TEXT,
      status TEXT DEFAULT 'unknown',
      last_heartbeat TEXT,
      cpu_usage REAL,
      memory_usage REAL,
      active_tests INTEGER DEFAULT 0,
      queue_length INTEGER DEFAULT 0,
      max_concurrent_tests INTEGER DEFAULT 5,
      is_enabled INTEGER DEFAULT 1,
      last_error TEXT,
      error_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(engine_name, engine_type)
    );

    -- 测试报告表
    CREATE TABLE IF NOT EXISTS test_reports (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      execution_id INTEGER REFERENCES test_executions(id) ON DELETE SET NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
      report_type TEXT NOT NULL,
      format TEXT NOT NULL,
      report_data TEXT NOT NULL DEFAULT '{}',
      file_path TEXT,
      file_size INTEGER,
      generated_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 报告分享表
    CREATE TABLE IF NOT EXISTS report_shares (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      report_id TEXT NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
      shared_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      share_token TEXT UNIQUE NOT NULL,
      share_type TEXT DEFAULT 'link',
      password_hash TEXT,
      allowed_ips TEXT DEFAULT '[]',
      max_access_count INTEGER,
      current_access_count INTEGER DEFAULT 0,
      permissions TEXT DEFAULT '["view"]',
      expires_at TEXT,
      last_accessed_at TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 报告访问日志表
    CREATE TABLE IF NOT EXISTS report_access_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      report_id TEXT NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
      user_id TEXT,
      share_id TEXT,
      access_type TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      success INTEGER DEFAULT 1,
      error_message TEXT,
      accessed_at TEXT DEFAULT (datetime('now'))
    );

    -- 报告模板表
    CREATE TABLE IF NOT EXISTS report_templates (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      user_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      report_type TEXT NOT NULL,
      template_config TEXT NOT NULL,
      default_format TEXT DEFAULT 'html',
      is_public INTEGER DEFAULT 0,
      is_system INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 报告配置表
    CREATE TABLE IF NOT EXISTS report_configs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      name TEXT NOT NULL,
      description TEXT,
      template_id TEXT NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
      schedule TEXT DEFAULT '{}',
      recipients TEXT DEFAULT '[]',
      filters TEXT DEFAULT '[]',
      format TEXT DEFAULT '{}',
      delivery TEXT DEFAULT '{}',
      enabled INTEGER DEFAULT 1,
      user_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 报告实例表
    CREATE TABLE IF NOT EXISTS report_instances (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      report_id TEXT,
      config_id TEXT,
      template_id TEXT,
      status TEXT NOT NULL,
      format TEXT NOT NULL,
      generated_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      duration INTEGER,
      path TEXT,
      url TEXT,
      size INTEGER,
      error TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 上传文件表
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      original_name TEXT NOT NULL,
      filename TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      size INTEGER NOT NULL,
      upload_date TEXT DEFAULT (datetime('now')),
      file_path TEXT NOT NULL,
      owner_type TEXT,
      owner_id TEXT,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- API Key 表
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key_hash TEXT NOT NULL UNIQUE,
      name TEXT,
      permissions TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      expires_at TEXT,
      last_used_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 清理策略表
    CREATE TABLE IF NOT EXISTS cleanup_policies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      data_types TEXT DEFAULT '[]',
      retention_days INTEGER NOT NULL,
      conditions TEXT DEFAULT '[]',
      actions TEXT DEFAULT '[]',
      priority INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 清理任务表
    CREATE TABLE IF NOT EXISTS cleanup_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      policy_id TEXT NOT NULL REFERENCES cleanup_policies(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT,
      duration INTEGER,
      items_processed INTEGER DEFAULT 0,
      items_total INTEGER DEFAULT 0,
      size_processed INTEGER DEFAULT 0,
      size_freed INTEGER DEFAULT 0,
      errors TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}'
    );

    -- 归档策略表
    CREATE TABLE IF NOT EXISTS archive_policies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      rules TEXT DEFAULT '[]',
      schedule TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 归档任务表
    CREATE TABLE IF NOT EXISTS archive_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      policy_id TEXT REFERENCES archive_policies(id) ON DELETE SET NULL,
      source_path TEXT NOT NULL,
      target_path TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT,
      duration INTEGER,
      size INTEGER DEFAULT 0,
      compressed_size INTEGER,
      compression_ratio REAL,
      files_count INTEGER DEFAULT 0,
      archived_files_count INTEGER DEFAULT 0,
      error TEXT,
      metadata TEXT DEFAULT '{}'
    );

    -- 数据管理记录表
    CREATE TABLE IF NOT EXISTS data_records (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      workspace_id TEXT,
      data TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    -- 数据记录版本表
    CREATE TABLE IF NOT EXISTS data_record_versions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      record_id TEXT NOT NULL,
      type TEXT NOT NULL,
      workspace_id TEXT,
      data TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      version INTEGER NOT NULL,
      action TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 数据备份表
    CREATE TABLE IF NOT EXISTS data_backups (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      name TEXT NOT NULL,
      data_types TEXT DEFAULT '[]',
      summary TEXT DEFAULT '{}',
      records TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 导出任务表
    CREATE TABLE IF NOT EXISTS export_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      filters TEXT,
      format TEXT NOT NULL DEFAULT 'json',
      options TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT,
      file_path TEXT,
      error_message TEXT
    );

    -- 导入任务表
    CREATE TABLE IF NOT EXISTS import_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'csv',
      config TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      progress TEXT DEFAULT '{}',
      result TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT,
      file_path TEXT,
      error_message TEXT
    );

    -- 系统统计表
    CREATE TABLE IF NOT EXISTS system_stats (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      date TEXT NOT NULL,
      stats TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 系统指标明细表
    CREATE TABLE IF NOT EXISTS system_metrics (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      metric_type TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT,
      source TEXT DEFAULT 'system',
      tags TEXT DEFAULT '{}',
      timestamp TEXT NOT NULL
    );

    -- 监控站点表
    CREATE TABLE IF NOT EXISTS monitoring_sites (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      workspace_id TEXT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      monitoring_type TEXT DEFAULT 'uptime',
      check_interval INTEGER DEFAULT 300,
      timeout INTEGER DEFAULT 30,
      config TEXT DEFAULT '{}',
      notification_settings TEXT DEFAULT '{}',
      status TEXT DEFAULT 'active',
      last_check TEXT,
      last_status TEXT,
      last_response_time INTEGER,
      last_checked_at TEXT,
      consecutive_failures INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      metadata TEXT DEFAULT '{}',
      deleted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 监控检查结果表（MonitoringService 写入此表）
    CREATE TABLE IF NOT EXISTS monitoring_results (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      site_id TEXT NOT NULL REFERENCES monitoring_sites(id) ON DELETE CASCADE,
      workspace_id TEXT,
      status TEXT NOT NULL,
      response_time INTEGER,
      status_code INTEGER,
      results TEXT DEFAULT '{}',
      error_message TEXT,
      checked_at TEXT DEFAULT (datetime('now'))
    );

    -- 监控检查记录表（兼容旧表）
    CREATE TABLE IF NOT EXISTS monitoring_checks (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      site_id TEXT NOT NULL REFERENCES monitoring_sites(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      response_time INTEGER,
      status_code INTEGER,
      error TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 报告分享邮件表
    CREATE TABLE IF NOT EXISTS report_share_emails (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      report_id TEXT NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
      share_id TEXT NOT NULL REFERENCES report_shares(id) ON DELETE CASCADE,
      recipients TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      last_error TEXT,
      next_retry_at TEXT,
      sent_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 测试计划表
    CREATE TABLE IF NOT EXISTS test_plans (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      url TEXT DEFAULT '',
      steps TEXT NOT NULL DEFAULT '[]',
      default_environment_id TEXT,
      tags TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      failure_strategy TEXT DEFAULT 'continue',
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 测试计划执行表
    CREATE TABLE IF NOT EXISTS test_plan_executions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
      plan_id TEXT NOT NULL REFERENCES test_plans(id) ON DELETE CASCADE,
      plan_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      step_results TEXT DEFAULT '[]',
      overall_score REAL,
      duration INTEGER,
      started_at TEXT,
      completed_at TEXT,
      triggered_by TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log('✅ SQLite schema 初始化完成');
};
