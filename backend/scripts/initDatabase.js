/**
 * 数据库初始化脚本
 * 创建所有必要的表和初始数据
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库文件路径
const dbPath = path.join(__dirname, '../data/test-web.db');
const dataDir = path.dirname(dbPath);

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建数据库连接
const db = new sqlite3.Database(dbPath);

/**
 * 创建表的SQL语句
 */
const createTables = {
  // 用户表
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active BOOLEAN DEFAULT 1
    )
  `,

  // 测试记录表
  test_records: `
    CREATE TABLE IF NOT EXISTS test_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id VARCHAR(36) UNIQUE NOT NULL,
      user_id INTEGER,
      test_type VARCHAR(50) NOT NULL,
      url TEXT NOT NULL,
      status VARCHAR(20) NOT NULL,
      config TEXT,
      result TEXT,
      error_message TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      duration INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `,

  // 测试结果详情表
  test_results: `
    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_record_id INTEGER NOT NULL,
      metric_name VARCHAR(100) NOT NULL,
      metric_value TEXT,
      metric_type VARCHAR(50),
      score REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_record_id) REFERENCES test_records(id)
    )
  `,

  // 网站信息表
  websites: `
    CREATE TABLE IF NOT EXISTS websites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      url TEXT NOT NULL,
      name VARCHAR(200),
      description TEXT,
      category VARCHAR(50),
      last_tested DATETIME,
      test_count INTEGER DEFAULT 0,
      average_score REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `,

  // 测试模板表
  test_templates: `
    CREATE TABLE IF NOT EXISTS test_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      test_type VARCHAR(50) NOT NULL,
      config TEXT NOT NULL,
      is_public BOOLEAN DEFAULT 0,
      user_id INTEGER,
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `,

  // 系统配置表
  system_config: `
    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key VARCHAR(100) UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      category VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // 测试队列表
  test_queue: `
    CREATE TABLE IF NOT EXISTS test_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id VARCHAR(36) UNIQUE NOT NULL,
      test_type VARCHAR(50) NOT NULL,
      url TEXT NOT NULL,
      config TEXT,
      priority INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      scheduled_at DATETIME,
      started_at DATETIME,
      completed_at DATETIME,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // 性能指标历史表
  performance_history: `
    CREATE TABLE IF NOT EXISTS performance_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      test_date DATE NOT NULL,
      performance_score REAL,
      load_time INTEGER,
      first_contentful_paint INTEGER,
      largest_contentful_paint INTEGER,
      cumulative_layout_shift REAL,
      total_blocking_time INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
};

/**
 * 创建索引
 */
const createIndexes = [
  'CREATE INDEX IF NOT EXISTS idx_test_records_user_id ON test_records(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_test_records_test_type ON test_records(test_type)',
  'CREATE INDEX IF NOT EXISTS idx_test_records_status ON test_records(status)',
  'CREATE INDEX IF NOT EXISTS idx_test_records_start_time ON test_records(start_time)',
  'CREATE INDEX IF NOT EXISTS idx_test_results_test_record_id ON test_results(test_record_id)',
  'CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_websites_url ON websites(url)',
  'CREATE INDEX IF NOT EXISTS idx_test_queue_status ON test_queue(status)',
  'CREATE INDEX IF NOT EXISTS idx_performance_history_url ON performance_history(url)',
  'CREATE INDEX IF NOT EXISTS idx_performance_history_date ON performance_history(test_date)'
];

/**
 * 初始数据
 */
const initialData = {
  system_config: [
    {
      key: 'app_version',
      value: '1.0.0',
      description: '应用版本号',
      category: 'system'
    },
    {
      key: 'max_concurrent_tests',
      value: '5',
      description: '最大并发测试数',
      category: 'performance'
    },
    {
      key: 'default_test_timeout',
      value: '60000',
      description: '默认测试超时时间(毫秒)',
      category: 'performance'
    },
    {
      key: 'enable_test_queue',
      value: 'true',
      description: '启用测试队列',
      category: 'features'
    }
  ],

  test_templates: [
    {
      name: '基础性能测试',
      description: '标准的网站性能测试模板',
      test_type: 'performance',
      config: JSON.stringify({
        device: 'desktop',
        throttling: 'none',
        categories: ['performance']
      }),
      is_public: 1
    },
    {
      name: '移动端性能测试',
      description: '针对移动设备的性能测试',
      test_type: 'performance',
      config: JSON.stringify({
        device: 'mobile',
        throttling: '3g',
        categories: ['performance']
      }),
      is_public: 1
    },
    {
      name: '完整SEO检查',
      description: '全面的SEO优化检查',
      test_type: 'seo',
      config: JSON.stringify({
        checks: ['meta', 'headings', 'images', 'links', 'structured-data', 'robots', 'sitemap']
      }),
      is_public: 1
    }
  ]
};

/**
 * 初始化数据库
 */
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('开始初始化数据库...');

      // 创建表
      Object.entries(createTables).forEach(([tableName, sql]) => {
        db.run(sql, (err) => {
          if (err) {
            console.error(`创建表 ${tableName} 失败:`, err);
          } else {
            console.log(`✓ 表 ${tableName} 创建成功`);
          }
        });
      });

      // 创建索引
      createIndexes.forEach((sql, index) => {
        db.run(sql, (err) => {
          if (err) {
            console.error(`创建索引 ${index + 1} 失败:`, err);
          } else {
            console.log(`✓ 索引 ${index + 1} 创建成功`);
          }
        });
      });

      // 插入初始数据
      Object.entries(initialData).forEach(([tableName, records]) => {
        records.forEach((record) => {
          const columns = Object.keys(record).join(', ');
          const placeholders = Object.keys(record).map(() => '?').join(', ');
          const values = Object.values(record);

          const sql = `INSERT OR IGNORE INTO ${tableName} (${columns}) VALUES (${placeholders})`;
          
          db.run(sql, values, (err) => {
            if (err) {
              console.error(`插入 ${tableName} 数据失败:`, err);
            } else {
              console.log(`✓ ${tableName} 初始数据插入成功`);
            }
          });
        });
      });

      console.log('数据库初始化完成!');
      resolve();
    });
  });
}

/**
 * 检查数据库状态
 */
function checkDatabaseStatus() {
  return new Promise((resolve, reject) => {
    db.get("SELECT name FROM sqlite_master WHERE type='table'", (err, row) => {
      if (err) {
        reject(err);
      } else {
        console.log('数据库连接正常');
        resolve(row);
      }
    });
  });
}

// 如果直接运行此脚本
if (require.main === module) {
  (async () => {
    try {
      await checkDatabaseStatus();
      await initializeDatabase();
      console.log('数据库初始化脚本执行完成');
      process.exit(0);
    } catch (error) {
      console.error('数据库初始化失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  initializeDatabase,
  checkDatabaseStatus,
  db
};
