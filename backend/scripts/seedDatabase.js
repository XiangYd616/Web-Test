/**
 * 数据库种子数据脚本
 * 用于开发和测试环境的示例数据生成
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// 导入数据库配置
const dbConfigModule = require('../config/database');

// 获取当前环境配置
const environment = process.env.NODE_ENV || 'development';

// 从配置模块获取数据库配置
const config = dbConfigModule.getDatabaseConfig ? dbConfigModule.getDatabaseConfig() : {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'testweb_dev',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

console.log('📊 环境:', environment);

/**
 * 生成安全的随机密码
 */
function generateSecurePassword() {
  return crypto.randomBytes(12).toString('base64').slice(0, 16);
}

/**
 * 获取种子密码（从环境变量或生成随机密码）
 */
function getSeedPassword(username) {
  // 首先尝试从环境变量获取
  const envKey = `SEED_PASSWORD_${username.toUpperCase()}`;
  if (process.env[envKey]) {
    return process.env[envKey];
  }
  
  // 生成随机密码并显示给用户
  const password = generateSecurePassword();
  console.log(`⚠️  生成的密码 for ${username}: ${password}`);
  
  return password;
}

// 创建连接池
const pool = new Pool({
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user || config.username,
  password: config.password
});

/**
 * 种子数据定义
 */
const seedData = {
  // 示例用户
  users: [
    {
      id: uuidv4(),
      username: 'admin',
      email: 'admin@testweb.com',
      password: getSeedPassword('admin'), // 从环境变量或生成随机密码
      role: 'admin',
      profile: {
        firstName: '管理员',
        lastName: '用户',
        avatar: '/avatars/admin.png'
      },
      preferences: {
        theme: 'light',
        language: 'zh-CN',
        notifications: true
      },
      is_active: true
    },
    {
      id: uuidv4(),
      username: 'testuser',
      email: 'test@testweb.com',
      password: getSeedPassword('testuser'), // 从环境变量或生成随机密码
      role: 'user',
      profile: {
        firstName: '测试',
        lastName: '用户',
        avatar: '/avatars/user.png'
      },
      preferences: {
        theme: 'dark',
        language: 'zh-CN',
        notifications: false
      },
      is_active: true
    },
    {
      id: uuidv4(),
      username: 'developer',
      email: 'dev@testweb.com',
      password: getSeedPassword('developer'), // 从环境变量或生成随机密码
      role: 'developer',
      profile: {
        firstName: '开发者',
        lastName: '用户',
        avatar: '/avatars/dev.png'
      },
      preferences: {
        theme: 'auto',
        language: 'zh-CN',
        notifications: true
      },
      is_active: true
    }
  ],

  // 示例网站
  websites: [
    {
      id: uuidv4(),
      url: 'https://www.example.com',
      name: '示例网站',
      description: '用于演示的示例网站',
      category: 'demo',
      metadata: {
        tags: ['demo', 'example'],
        industry: 'technology'
      },
      test_count: 15,
      average_score: 85.5
    },
    {
      id: uuidv4(),
      url: 'https://www.google.com',
      name: 'Google',
      description: '全球最大的搜索引擎',
      category: 'search',
      metadata: {
        tags: ['search', 'google'],
        industry: 'technology'
      },
      test_count: 25,
      average_score: 95.2
    },
    {
      id: uuidv4(),
      url: 'https://github.com',
      name: 'GitHub',
      description: '代码托管和协作平台',
      category: 'development',
      metadata: {
        tags: ['git', 'development', 'collaboration'],
        industry: 'technology'
      },
      test_count: 8,
      average_score: 88.7
    }
  ],

  // 示例测试记录
  tests: [
    {
      id: uuidv4(),
      type: 'performance',
      url: 'https://www.example.com',
      config: {
        device: 'desktop',
        throttling: 'none',
        categories: ['performance', 'accessibility']
      },
      results: {
        performance: 85,
        accessibility: 92,
        loadTime: 1250,
        firstContentfulPaint: 800
      },
      status: 'completed',
      started_at: new Date(Date.now() - 3600000), // 1小时前
      completed_at: new Date(Date.now() - 3540000) // 59分钟前
    },
    {
      id: uuidv4(),
      type: 'seo',
      url: 'https://www.google.com',
      config: {
        checks: ['meta', 'headings', 'images', 'links'],
        depth: 'basic'
      },
      results: {
        seo: 95,
        metaTags: 'excellent',
        headingStructure: 'good',
        imageOptimization: 'excellent'
      },
      status: 'completed',
      started_at: new Date(Date.now() - 7200000), // 2小时前
      completed_at: new Date(Date.now() - 7080000) // 1小时58分钟前
    },
    {
      id: uuidv4(),
      type: 'security',
      url: 'https://github.com',
      config: {
        checks: ['ssl', 'headers', 'vulnerabilities'],
        depth: 'comprehensive'
      },
      results: {
        security: 88,
        ssl: 'A+',
        securityHeaders: 'good',
        vulnerabilities: 'none'
      },
      status: 'completed',
      started_at: new Date(Date.now() - 1800000), // 30分钟前
      completed_at: new Date(Date.now() - 1680000) // 28分钟前
    }
  ]
};

/**
 * 插入种子数据
 */
async function seedDatabase() {
  const client = await pool.connect();

  try {

    await client.query('BEGIN');

    // 1. 插入用户数据
    for (const user of seedData.users) {
      // 加密密码
      const hashedPassword = await bcrypt.hash(user.password, 10);

      const sql = `
        INSERT INTO users (id, username, email, password_hash, role, profile, preferences, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (username) DO NOTHING
      `;

      await client.query(sql, [
        user.id,
        user.username,
        user.email,
        hashedPassword,
        user.role,
        JSON.stringify(user.profile),
        JSON.stringify(user.preferences),
        user.is_active,
        new Date()
      ]);

      console.log(`✅ 用户 ${user.username} 创建成功`);
    }

    // 2. 插入网站数据
    const adminUser = seedData.users[0]; // 使用admin用户

    for (const website of seedData.websites) {
      const sql = `
        INSERT INTO websites (id, user_id, url, name, description, category, metadata, test_count, average_score, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
      `;

      await client.query(sql, [
        website.id,
        adminUser.id,
        website.url,
        website.name,
        website.description,
        website.category,
        JSON.stringify(website.metadata),
        website.test_count,
        website.average_score,
        new Date()
      ]);

      console.log(`✅ 网站 ${website.name} 创建成功`);
    }

    // 3. 插入测试记录
    for (const test of seedData.tests) {
      const sql = `
        INSERT INTO tests (id, type, url, config, results, status, user_id, started_at, completed_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
      `;

      await client.query(sql, [
        test.id,
        test.type,
        test.url,
        JSON.stringify(test.config),
        JSON.stringify(test.results),
        test.status,
        adminUser.id,
        test.started_at,
        test.completed_at,
        new Date()
      ]);

      console.log(`✅ 测试记录 ${test.type} 创建成功`);
    }

    // 4. 插入测试历史记录
    for (const test of seedData.tests) {
      const historyRecords = [
        {
          test_id: test.id,
          user_id: adminUser.id,
          action: 'test_started',
          details: { message: '测试开始执行' },
          timestamp: test.started_at
        },
        {
          test_id: test.id,
          user_id: adminUser.id,
          action: 'test_completed',
          details: {
            message: '测试执行完成',
            duration: test.completed_at - test.started_at,
            status: test.status
          },
          timestamp: test.completed_at
        }
      ];

      for (const record of historyRecords) {
        const sql = `
          INSERT INTO test_history (id, test_id, user_id, action, details, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;

        await client.query(sql, [
          uuidv4(),
          record.test_id,
          record.user_id,
          record.action,
          JSON.stringify(record.details),
          record.timestamp
        ]);
      }
    }

    await client.query('COMMIT');


    // 显示统计信息
    await showSeedStats(client);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 种子数据插入失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 显示种子数据统计
 */
async function showSeedStats(client) {
  try {
    console.log('📊 种子数据统计:');

    const tables = ['users', 'websites', 'tests', 'test_history'];

    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
    }

  } catch (error) {
    console.error('❌ 获取种子数据统计失败:', error.message);
  }
}

/**
 * 清理种子数据
 */
async function cleanSeedData() {
  const client = await pool.connect();

  try {

    await client.query('BEGIN');

    // 按依赖关系逆序删除
    const tables = ['test_history', 'tests', 'websites', 'users'];

    for (const table of tables) {
      await client.query(`DELETE FROM ${table} WHERE created_at IS NOT NULL`);
    }

    await client.query('COMMIT');
    console.log('✅ 种子数据清理完成');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 种子数据清理失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  (async () => {
    try {

      const args = process.argv.slice(2);
      const command = args[0] || 'seed';

      switch (command) {
        case 'seed':
          await seedDatabase();
          break;

        case 'clean':
          await cleanSeedData();
          break;

        default:
          console.log('❌ 未知命令:', command);
          process.exit(1);
      }

      console.log('✅ 种子数据脚本执行完成');

    } catch (error) {
      console.error('❌ 种子数据脚本执行失败:', error);
      process.exit(1);
    } finally {
      await pool.end();
      process.exit(0);
    }
  })();
}

module.exports = {
  seedDatabase,
  cleanSeedData,
  showSeedStats
};
