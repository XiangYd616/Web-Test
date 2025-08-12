#!/usr/bin/env node

/**
 * 完备的数据库初始化脚本
 * 功能: 创建完整的企业级数据库架构、初始数据、用户、配置
 * 版本: 3.0 - 企业级完整版
 * 支持: 37个业务表 + 135个索引 + 触发器 + 视图 + 函数
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

class CompleteDatabaseInitializer {
  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'testweb_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.args = process.argv.slice(2);
    this.options = this.parseArgs();
    this.pool = null;
  }

  parseArgs() {
    const options = {
      force: false,
      verbose: false,
      noData: false,
      skipBackup: false,
      testData: false,
      reset: false
    };

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];

      switch (arg) {
        case '--force':
          options.force = true;
          break;
        case '--verbose':
          options.verbose = true;
          break;
        case '--no-data':
          options.noData = true;
          break;
        case '--skip-backup':
          options.skipBackup = true;
          break;
        case '--test-data':
          options.testData = true;
          break;
        case '--reset':
          options.reset = true;
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
        default:
          if (arg.startsWith('--')) {
            console.error(`❌ 未知选项: ${arg}`);
            this.showHelp();
            process.exit(1);
          }
      }
    }

    return options;
  }

  showHelp() {
    console.log(`
🚀 完备的数据库初始化工具 v3.0

使用方法:
  node init-database.js [选项]

选项:
  --force           强制执行，跳过所有确认提示
  --verbose         显示详细的执行过程
  --no-data         只创建表结构，不插入初始数据
  --skip-backup     跳过自动备份（如果数据库已存在）
  --test-data       插入测试数据（用于开发环境）
  --reset           完全重置数据库（危险操作）
  --help, -h        显示此帮助信息

功能特性:
  ✅ 37个业务表的完整架构
  ✅ 135个优化索引
  ✅ 触发器和存储函数
  ✅ 数据完整性约束
  ✅ 视图和统计表
  ✅ 初始配置和管理员用户
  ✅ 测试引擎状态初始化
  ✅ 系统健康监控设置

示例:
  node init-database.js                    # 标准初始化
  node init-database.js --force            # 强制初始化
  node init-database.js --reset --force    # 完全重置
  node init-database.js --test-data        # 包含测试数据
  node init-database.js --no-data          # 仅创建结构
    `);
  }

  async connect() {
    if (!this.pool) {
      this.pool = new Pool(this.config);
    }
    return this.pool;
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * 完整的数据库初始化流程
   */
  async initialize() {
    console.log('🚀 完备数据库初始化开始...');
    console.log('=====================================');
    console.log(`📋 目标数据库: ${this.config.database}`);
    console.log(`🏠 主机: ${this.config.host}:${this.config.port}`);
    console.log('');

    try {
      // 1. 连接检查
      console.log('🔌 检查数据库连接...');
      const pool = await this.connect();
      await pool.query('SELECT 1');
      console.log('✅ 数据库连接成功');

      // 2. 检查现有数据
      if (!this.options.reset && !this.options.force) {
        const existingTables = await this.checkExistingTables(pool);
        if (existingTables.length > 0) {
          console.log(`⚠️ 发现 ${existingTables.length} 个现有表`);
          console.log('💡 使用 --force 覆盖现有数据，或 --reset 完全重置');
          return;
        }
      }

      // 3. 备份现有数据（如果需要）
      if (!this.options.skipBackup && !this.options.reset) {
        await this.createBackup(pool);
      }

      // 4. 重置数据库（如果需要）
      if (this.options.reset) {
        await this.resetDatabase(pool);
      }

      // 5. 执行完整架构
      await this.executeSchema(pool);

      // 6. 插入初始数据
      if (!this.options.noData) {
        await this.insertInitialData(pool);
      }

      // 7. 插入测试数据
      if (this.options.testData) {
        await this.insertTestData(pool);
      }

      // 8. 验证初始化结果
      await this.validateInitialization(pool);

      console.log('');
      console.log('🎉 完备数据库初始化完成！');
      console.log('');
      console.log('📊 数据库统计:');
      const stats = await this.getDatabaseStats(pool);
      console.log(`   📋 表数量: ${stats.tables}`);
      console.log(`   📈 索引数量: ${stats.indexes}`);
      console.log(`   👥 用户数量: ${stats.users}`);
      console.log(`   ⚙️ 配置项数量: ${stats.configs}`);
      console.log('');
      console.log('📝 下一步:');
      console.log('   1. 启动后端服务: npm run server');
      console.log('   2. 启动前端服务: npm run dev');
      console.log('   3. 访问应用: http://localhost:5174');
      console.log('');
      console.log('👤 默认管理员账户:');
      console.log('   邮箱: admin@testweb.com');
      console.log('   密码: admin123456');
      console.log('   ⚠️ 请在生产环境中修改默认密码！');

    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async checkExistingTables(pool) {
    const result = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    return result.rows;
  }

  async createBackup(pool) {
    console.log('💾 创建数据备份...');

    const existingTables = await this.checkExistingTables(pool);
    if (existingTables.length === 0) {
      console.log('📊 无现有数据，跳过备份');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup-before-init-${timestamp}.sql`;
    const backupPath = path.resolve(backupFile);

    try {
      let backupSQL = `-- 初始化前自动备份\n-- 时间: ${new Date().toISOString()}\n\n`;

      for (const table of existingTables) {
        const tableName = table.tablename;
        const dataResult = await pool.query(`SELECT * FROM ${tableName}`);

        if (dataResult.rows.length > 0) {
          backupSQL += `-- 表: ${tableName}\n`;

          dataResult.rows.forEach(row => {
            const columns = Object.keys(row);
            const values = columns.map(col => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
              if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
              return value;
            }).join(', ');

            backupSQL += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});\n`;
          });

          backupSQL += '\n';
        }
      }

      await fs.writeFile(backupPath, backupSQL, 'utf8');
      console.log(`✅ 备份已创建: ${backupPath}`);

    } catch (error) {
      console.warn('⚠️ 备份创建失败:', error.message);
    }
  }

  async resetDatabase(pool) {
    console.log('🗑️ 重置数据库...');

    if (!this.options.force) {
      console.log('⚠️ 重置数据库是危险操作，请使用 --force 确认');
      return;
    }

    // 删除所有表
    const tablesResult = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
    `);

    for (const table of tablesResult.rows) {
      await pool.query(`DROP TABLE IF EXISTS ${table.tablename} CASCADE`);
      if (this.options.verbose) {
        console.log(`🗑️ 删除表: ${table.tablename}`);
      }
    }

    // 删除所有函数
    const functionsResult = await pool.query(`
      SELECT proname FROM pg_proc
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `);

    for (const func of functionsResult.rows) {
      try {
        await pool.query(`DROP FUNCTION IF EXISTS ${func.proname} CASCADE`);
        if (this.options.verbose) {
          console.log(`🗑️ 删除函数: ${func.proname}`);
        }
      } catch (error) {
        // 忽略删除函数的错误
      }
    }

    console.log('✅ 数据库重置完成');
  }

  async executeSchema(pool) {
    console.log('🏗️ 执行完整数据库架构...');

    const schemaPath = path.join(__dirname, 'complete-database-schema.sql');

    try {
      const schemaSQL = await fs.readFile(schemaPath, 'utf8');
      console.log('📖 读取架构文件成功');

      // 分割并执行SQL语句
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      console.log(`📊 准备执行 ${statements.length} 条SQL语句...`);

      let successCount = 0;
      let warningCount = 0;

      for (let i = 0; i < statements.length; i++) {
        try {
          await pool.query(statements[i]);
          successCount++;

          if (this.options.verbose) {
            console.log(`✅ 执行语句 ${i + 1}/${statements.length}`);
          } else if ((i + 1) % 50 === 0) {
            console.log(`📊 进度: ${i + 1}/${statements.length} (${Math.round((i + 1) / statements.length * 100)}%)`);
          }
        } catch (error) {
          warningCount++;
          if (this.options.verbose) {
            console.warn(`⚠️ 语句执行警告 ${i + 1}:`, error.message);
          }
        }
      }

      console.log(`✅ 架构执行完成 (成功: ${successCount}, 警告: ${warningCount})`);

    } catch (error) {
      console.error('❌ 架构文件读取失败:', error);
      throw error;
    }
  }

  async insertInitialData(pool) {
    console.log('📝 插入初始数据...');

    try {
      // 1. 创建管理员用户
      console.log('👤 创建管理员用户...');
      const adminPassword = await bcrypt.hash('admin123456', 12);

      await pool.query(`
        INSERT INTO users (username, email, password_hash, role, status, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = NOW()
      `, ['admin', 'admin@testweb.com', adminPassword, 'admin', 'active', true]);

      console.log('✅ 管理员用户已创建');

      // 2. 创建演示用户
      console.log('👥 创建演示用户...');
      const demoPassword = await bcrypt.hash('demo123456', 12);

      await pool.query(`
        INSERT INTO users (username, email, password_hash, role, status, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW()
      `, ['demo', 'demo@testweb.com', demoPassword, 'user', 'active', true]);

      console.log('✅ 演示用户已创建');

      // 3. 插入默认用户偏好
      console.log('⚙️ 设置用户偏好...');
      const users = await pool.query('SELECT id FROM users');

      for (const user of users.rows) {
        await pool.query(`
          INSERT INTO user_preferences (user_id, theme, language, timezone, notifications)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id) DO NOTHING
        `, [user.id, 'light', 'zh-CN', 'Asia/Shanghai', '{"email": true, "browser": true, "sms": false}']);
      }

      console.log('✅ 用户偏好设置完成');

      // 4. 插入测试模板
      console.log('📋 创建测试模板...');
      const adminUser = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
      const adminId = adminUser.rows[0].id;

      const templates = [
        {
          name: '基础SEO检查',
          description: '检查网站的基本SEO要素',
          test_type: 'seo',
          config: {
            checks: ['meta_tags', 'headings', 'images', 'links'],
            depth: 'basic'
          },
          category: 'seo',
          tags: ['基础', 'SEO', '快速']
        },
        {
          name: '完整性能测试',
          description: '全面的网站性能分析',
          test_type: 'performance',
          config: {
            metrics: ['lcp', 'fid', 'cls', 'fcp', 'tti'],
            device: 'desktop',
            throttling: 'none'
          },
          category: 'performance',
          tags: ['性能', '完整', 'Core Web Vitals']
        },
        {
          name: '安全扫描',
          description: '检查网站安全配置',
          test_type: 'security',
          config: {
            checks: ['ssl', 'headers', 'cookies', 'vulnerabilities'],
            depth: 'standard'
          },
          category: 'security',
          tags: ['安全', 'SSL', '标准']
        },
        {
          name: 'API接口测试',
          description: 'REST API接口功能测试',
          test_type: 'api',
          config: {
            endpoints: [],
            methods: ['GET', 'POST'],
            timeout: 30
          },
          category: 'api',
          tags: ['API', '接口', '功能']
        },
        {
          name: '浏览器兼容性',
          description: '多浏览器兼容性测试',
          test_type: 'compatibility',
          config: {
            browsers: ['chrome', 'firefox', 'safari', 'edge'],
            devices: ['desktop', 'mobile']
          },
          category: 'compatibility',
          tags: ['兼容性', '浏览器', '跨平台']
        }
      ];

      for (const template of templates) {
        await pool.query(`
          INSERT INTO test_templates (user_id, name, description, test_type, config, category, tags, is_public)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT DO NOTHING
        `, [adminId, template.name, template.description, template.test_type,
          JSON.stringify(template.config), template.category, JSON.stringify(template.tags), true]);
      }

      console.log('✅ 测试模板创建完成');

      console.log('🎉 初始数据插入完成！');

    } catch (error) {
      console.error('❌ 初始数据插入失败:', error);
      throw error;
    }
  }

  async insertTestData(pool) {
    console.log('🧪 插入测试数据...');

    try {
      // 创建测试用户
      const testUsers = [
        { username: 'test1', email: 'test1@example.com', role: 'user' },
        { username: 'test2', email: 'test2@example.com', role: 'user' },
        { username: 'moderator', email: 'mod@example.com', role: 'moderator' }
      ];

      for (const user of testUsers) {
        const password = await bcrypt.hash('test123456', 12);
        await pool.query(`
          INSERT INTO users (username, email, password_hash, role, status, email_verified)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (email) DO NOTHING
        `, [user.username, user.email, password, user.role, 'active', true]);
      }

      console.log('✅ 测试用户创建完成');

      // 创建测试结果
      const testUrls = [
        'https://www.google.com',
        'https://www.github.com',
        'https://www.stackoverflow.com'
      ];

      const users = await pool.query('SELECT id FROM users WHERE role != $1', ['admin']);

      for (const user of users.rows) {
        for (const url of testUrls) {
          await pool.query(`
            INSERT INTO test_results (user_id, test_type, target_url, status, overall_score, grade, results)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [user.id, 'seo', url, 'completed', 85.5, 'B+', '{"meta_title": "good", "meta_description": "excellent"}']);
        }
      }

      console.log('✅ 测试数据插入完成');

    } catch (error) {
      console.error('❌ 测试数据插入失败:', error);
      throw error;
    }
  }

  async validateInitialization(pool) {
    console.log('🔍 验证初始化结果...');

    try {
      // 检查表数量
      const tablesResult = await pool.query(`
        SELECT COUNT(*) as count FROM information_schema.tables
        WHERE table_schema = 'public'
      `);
      const tableCount = parseInt(tablesResult.rows[0].count);

      // 检查索引数量
      const indexesResult = await pool.query(`
        SELECT COUNT(*) as count FROM pg_indexes
        WHERE schemaname = 'public'
      `);
      const indexCount = parseInt(indexesResult.rows[0].count);

      // 检查用户数量
      const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
      const userCount = parseInt(usersResult.rows[0].count);

      // 检查配置数量
      const configsResult = await pool.query('SELECT COUNT(*) as count FROM system_config');
      const configCount = parseInt(configsResult.rows[0].count);

      console.log('📊 验证结果:');
      console.log(`   📋 表: ${tableCount} (预期: 37+)`);
      console.log(`   📈 索引: ${indexCount} (预期: 135+)`);
      console.log(`   👥 用户: ${userCount} (预期: 2+)`);
      console.log(`   ⚙️ 配置: ${configCount} (预期: 15+)`);

      if (tableCount >= 37 && indexCount >= 135 && userCount >= 2 && configCount >= 15) {
        console.log('✅ 初始化验证通过');
      } else {
        console.log('⚠️ 初始化验证警告：某些组件可能未完全创建');
      }

    } catch (error) {
      console.warn('⚠️ 验证过程出现警告:', error.message);
    }
  }

  async getDatabaseStats(pool) {
    const tablesResult = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    const indexesResult = await pool.query(`
      SELECT COUNT(*) as count FROM pg_indexes
      WHERE schemaname = 'public'
    `);

    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const configsResult = await pool.query('SELECT COUNT(*) as count FROM system_config');

    return {
      tables: parseInt(tablesResult.rows[0].count),
      indexes: parseInt(indexesResult.rows[0].count),
      users: parseInt(usersResult.rows[0].count),
      configs: parseInt(configsResult.rows[0].count)
    };
  }

  async run() {
    try {
      await this.initialize();
      process.exit(0);
    } catch (error) {
      console.error('❌ 初始化失败:', error);
      process.exit(1);
    }
  }
}

// 运行初始化
if (require.main === module) {
  const initializer = new CompleteDatabaseInitializer();
  initializer.run();
}

module.exports = CompleteDatabaseInitializer;
