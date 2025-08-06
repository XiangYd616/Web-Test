const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');
const { app } = require('electron');

class LocalDatabase {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.isInitialized = false;
  }

  async init() {
    try {
      // 获取用户数据目录
      const userDataPath = app.getPath('userData');
      const dbDir = path.join(userDataPath, 'database');

      // 确保数据库目录存在
      await fs.ensureDir(dbDir);

      this.dbPath = path.join(dbDir, 'testweb.db');

      // 创建数据库连接
      this.db = new Database(this.dbPath);

      // 设置数据库选项
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 1000000');
      this.db.pragma('temp_store = memory');

      // 创建表结构
      await this.createTables();

      this.isInitialized = true;
      console.log('本地数据库初始化成功:', this.dbPath);

      return { success: true, path: this.dbPath };
    } catch (error) {
      console.error('数据库初始化失败:', error);
      throw error;
    }
  }

  async createTables() {
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

      // 测试会话主表
      `CREATE TABLE IF NOT EXISTS test_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        test_name TEXT NOT NULL,
        test_type TEXT NOT NULL,
        url TEXT,
        status TEXT DEFAULT 'pending',
        start_time DATETIME,
        end_time DATETIME,
        duration INTEGER, -- 秒
        overall_score REAL,
        grade TEXT,
        total_issues INTEGER DEFAULT 0,
        critical_issues INTEGER DEFAULT 0,
        major_issues INTEGER DEFAULT 0,
        minor_issues INTEGER DEFAULT 0,
        warnings INTEGER DEFAULT 0,
        config TEXT DEFAULT '{}',
        environment TEXT DEFAULT 'production',
        tags TEXT DEFAULT '[]',
        description TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // 安全测试详情表
      `CREATE TABLE IF NOT EXISTS security_test_details (
        session_id TEXT PRIMARY KEY,
        security_score REAL,
        ssl_score REAL,
        header_security_score REAL,
        authentication_score REAL,
        vulnerabilities_total INTEGER DEFAULT 0,
        vulnerabilities_critical INTEGER DEFAULT 0,
        vulnerabilities_high INTEGER DEFAULT 0,
        vulnerabilities_medium INTEGER DEFAULT 0,
        vulnerabilities_low INTEGER DEFAULT 0,
        sql_injection_found INTEGER DEFAULT 0,
        xss_vulnerabilities INTEGER DEFAULT 0,
        csrf_vulnerabilities INTEGER DEFAULT 0,
        https_enforced BOOLEAN DEFAULT 0,
        hsts_enabled BOOLEAN DEFAULT 0,
        csrf_protection BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES test_sessions (id) ON DELETE CASCADE
      )`,

      // 测试模板表
      `CREATE TABLE IF NOT EXISTS test_templates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        test_type TEXT NOT NULL,
        config TEXT NOT NULL,
        is_public BOOLEAN DEFAULT FALSE,
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
      `CREATE TABLE IF NOT EXISTS system_config (
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
      )`
    ];

    const transaction = this.db.transaction(() => {
      for (const sql of tables) {
        this.db.exec(sql);
      }
    });

    transaction();

    // 创建索引
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_results_type ON test_results(test_type)',
      'CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status)',
      'CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)',
      'CREATE INDEX IF NOT EXISTS idx_test_templates_user_id ON test_templates(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_templates_type ON test_templates(test_type)'
    ];

    for (const sql of indexes) {
      this.db.exec(sql);
    }
  }

  async query(sql, params = []) {
    if (!this.isInitialized) {
      throw new Error('数据库未初始化');
    }

    try {
      if (sql.trim().toLowerCase().startsWith('select')) {
        const stmt = this.db.prepare(sql);
        return stmt.all(params);
      } else {
        const stmt = this.db.prepare(sql);
        return stmt.run(params);
      }
    } catch (error) {
      console.error('数据库查询错误:', error);
      throw error;
    }
  }

  async backup(backupPath) {
    if (!this.isInitialized) {
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

  async restore(backupPath) {
    if (!fs.existsSync(backupPath)) {
      throw new Error('备份文件不存在');
    }

    try {
      // 关闭当前连接
      if (this.db) {
        this.db.close();
      }

      // 恢复备份
      await fs.copy(backupPath, this.dbPath);

      // 重新初始化
      await this.init();

      return { success: true };
    } catch (error) {
      console.error('数据库恢复失败:', error);
      throw error;
    }
  }

  async export(format, exportPath) {
    if (!this.isInitialized) {
      throw new Error('数据库未初始化');
    }

    try {
      const tables = ['users', 'test_results', 'test_templates', 'activity_logs', 'reports'];
      const data = {};

      for (const table of tables) {
        data[table] = this.query(`SELECT * FROM ${table}`);
      }

      if (format === 'json') {
        await fs.writeJson(exportPath, data, { spaces: 2 });
      } else if (format === 'sql') {
        let sqlContent = '';
        for (const [table, rows] of Object.entries(data)) {
          if (rows.length > 0) {
            const columns = Object.keys(rows[0]);
            for (const row of rows) {
              const values = columns.map(col => {
                const val = row[col];
                return val === null ? 'NULL' : `'${val.toString().replace(/'/g, "''")}'`;
              }).join(', ');
              sqlContent += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values});\n`;
            }
          }
        }
        await fs.writeFile(exportPath, sqlContent);
      }

      return { success: true, path: exportPath, recordCount: Object.values(data).reduce((sum, rows) => sum + rows.length, 0) };
    } catch (error) {
      console.error('数据库导出失败:', error);
      throw error;
    }
  }

  async getStats() {
    if (!this.isInitialized) {
      throw new Error('数据库未初始化');
    }

    try {
      const stats = {
        users: this.query('SELECT COUNT(*) as count FROM users')[0].count,
        testResults: this.query('SELECT COUNT(*) as count FROM test_results')[0].count,
        templates: this.query('SELECT COUNT(*) as count FROM test_templates')[0].count,
        reports: this.query('SELECT COUNT(*) as count FROM reports')[0].count,
        dbSize: fs.statSync(this.dbPath).size,
        dbPath: this.dbPath
      };

      return stats;
    } catch (error) {
      console.error('获取数据库统计失败:', error);
      throw error;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

module.exports = LocalDatabase;
