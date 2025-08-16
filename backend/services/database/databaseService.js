/**
 * 数据库操作服务
 * 提供完整的数据库CRUD操作
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseService {
  constructor() {
    this.dbPath = path.join(__dirname, '../../data/testresults.db');
    this.db = null;
    this.init();
  }

  /**
   * 初始化数据库
   */
  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('数据库连接失败:', err);
          reject(err);
        } else {
          console.log('数据库连接成功');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  /**
   * 创建数据表
   */
  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        status TEXT NOT NULL,
        score INTEGER,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS test_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES test_results (test_id)
      )`,
      `CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        preferences TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }
  }

  /**
   * 保存测试结果
   */
  async saveTestResult(testResult) {
    const sql = `INSERT OR REPLACE INTO test_results
                (test_id, type, url, status, score, data, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
    
    const params = [
      testResult.testId,
      testResult.type,
      testResult.url,
      testResult.status,
      testResult.score,
      JSON.stringify(testResult)
    ];

    return this.run(sql, params);
  }

  /**
   * 获取测试结果
   */
  async getTestResult(testId) {
    const sql = 'SELECT * FROM test_results WHERE test_id = ?';
    const row = await this.get(sql, [testId]);
    
    if (row && row.data) {
      row.data = JSON.parse(row.data);
    }
    
    return row;
  }

  /**
   * 获取测试历史
   */
  async getTestHistory(limit = 50, offset = 0) {
    const sql = `SELECT * FROM test_results
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?`;
    
    const rows = await this.all(sql, [limit, offset]);
    
    return rows.map(row => {
      if (row.data) {
        row.data = JSON.parse(row.data);
      }
      return row;
    });
  }

  /**
   * 删除测试结果
   */
  async deleteTestResult(testId) {
    const sql = 'DELETE FROM test_results WHERE test_id = ?';
    return this.run(sql, [testId]);
  }

  /**
   * 记录测试历史
   */
  async recordTestHistory(testId, action, details = null) {
    const sql = `INSERT INTO test_history (test_id, action, details)
                VALUES (?, ?, ?)`;
    
    return this.run(sql, [testId, action, JSON.stringify(details)]);
  }

  /**
   * 数据库操作封装
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * 关闭数据库连接
   */
  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('关闭数据库连接失败:', err);
        } else {
          console.log('数据库连接已关闭');
        }
        resolve();
      });
    });
  }
}

module.exports = DatabaseService;