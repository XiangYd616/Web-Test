#!/usr/bin/env node

/**
 * 完备的数据库管理系统
 * 功能: 初始化、迁移、备份、恢复、监控、性能分析、数据管理、架构管理
 * 版本: 2.0 - 企业级完整版
 * 作者: Test Web App Team
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

class CompleteDatabaseManager {
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

    this.pool = null;
    this.args = process.argv.slice(2);
    this.command = this.args[0];
    this.options = this.parseArgs();
  }

  parseArgs() {
    const options = {
      force: false,
      verbose: false,
      json: false,
      backup: false,
      restore: false,
      file: null,
      table: null,
      query: null,
      limit: 100
    };

    for (let i = 1; i < this.args.length; i++) {
      const arg = this.args[i];

      switch (arg) {
        case '--force':
          options.force = true;
          break;
        case '--verbose':
          options.verbose = true;
          break;
        case '--json':
          options.json = true;
          break;
        case '--backup':
          options.backup = true;
          break;
        case '--restore':
          options.restore = true;
          break;
        case '--file':
          options.file = this.args[++i];
          break;
        case '--table':
          options.table = this.args[++i];
          break;
        case '--query':
          options.query = this.args[++i];
          break;
        case '--limit':
          options.limit = parseInt(this.args[++i]);
          break;
      }
    }

    return options;
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
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
🗄️ 完备的数据库管理系统 v2.0

使用方法:
  node complete-database-manager.js <command> [options]

核心命令:
  init                    完整初始化数据库
  reset                   重置数据库（危险操作）
  migrate                 执行数据库迁移
  rollback               回滚迁移
  backup                  备份数据库
  restore                 恢复数据库
  health                  健康检查
  
表管理命令:
  tables                  列出所有表
  describe <table>        显示表结构
  count <table>           统计表记录数
  truncate <table>        清空表数据
  drop <table>            删除表
  
数据管理命令:
  query <sql>             执行SQL查询
  select <table>          查询表数据
  insert <table>          插入数据
  update <table>          更新数据
  delete <table>          删除数据
  
索引管理命令:
  indexes                 列出所有索引
  create-index            创建索引
  drop-index              删除索引
  reindex                 重建索引
  
性能分析命令:
  analyze                 分析数据库性能
  vacuum                  清理数据库
  stats                   显示统计信息
  slow-queries            显示慢查询
  
监控命令:
  monitor                 实时监控
  connections             显示连接信息
  locks                   显示锁信息
  activity                显示活动信息
  
架构管理命令:
  schema                  显示架构信息
  constraints             显示约束信息
  triggers                显示触发器信息
  functions               显示函数信息
  
用户管理命令:
  users                   列出数据库用户
  create-user             创建用户
  drop-user               删除用户
  permissions             显示权限信息

选项:
  --force                 强制执行（跳过确认）
  --verbose               详细输出
  --json                  JSON格式输出
  --backup                同时创建备份
  --restore               从备份恢复
  --file <path>           指定文件路径
  --table <name>          指定表名
  --query <sql>           指定SQL查询
  --limit <number>        限制结果数量

示例:
  node complete-database-manager.js init --force
  node complete-database-manager.js tables --json
  node complete-database-manager.js backup --file ./backup.sql
  node complete-database-manager.js query "SELECT * FROM users" --limit 10
  node complete-database-manager.js health --verbose
    `);
  }

  /**
   * 完整的数据库初始化
   */
  async initializeDatabase() {
    console.log('🚀 完备数据库初始化开始...');
    console.log('=====================================');

    try {
      const pool = await this.connect();

      // 1. 检查数据库连接
      console.log('🔌 检查数据库连接...');
      await pool.query('SELECT 1');
      console.log('✅ 数据库连接成功');

      // 2. 创建扩展
      console.log('🔧 创建数据库扩展...');
      const extensions = [
        'uuid-ossp',
        'pg_trgm',
        'btree_gin',
        'pg_stat_statements'
      ];

      for (const ext of extensions) {
        try {
          await pool.query(`CREATE EXTENSION IF NOT EXISTS "${ext}"`);
          console.log(`✅ 扩展已创建: ${ext}`);
        } catch (error) {
          console.warn(`⚠️ 扩展创建失败 ${ext}:`, error.message);
        }
      }

      // 3. 执行完整架构文件
      console.log('🏗️ 创建数据库架构...');
      const schemaPath = path.join(__dirname, 'unified-optimized-database-schema.sql');
      const schemaSQL = await fs.readFile(schemaPath, 'utf8');

      // 分割SQL语句并执行
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      let successCount = 0;
      let warningCount = 0;

      for (let i = 0; i < statements.length; i++) {
        try {
          await pool.query(statements[i]);
          successCount++;
          if (this.options.verbose) {
            console.log(`✅ 执行语句 ${i + 1}/${statements.length}`);
          }
        } catch (error) {
          warningCount++;
          if (this.options.verbose) {
            console.warn(`⚠️ 语句执行警告 ${i + 1}:`, error.message);
          }
        }
      }

      console.log(`✅ 架构创建完成 (成功: ${successCount}, 警告: ${warningCount})`);

      // 4. 创建管理员用户
      console.log('👤 创建管理员用户...');
      const adminPassword = await bcrypt.hash('admin123456', 12);

      try {
        await pool.query(`
          INSERT INTO users (username, email, password_hash, role, status, email_verified)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          updated_at = NOW()
        `, ['admin', 'admin@testweb.com', adminPassword, 'admin', 'active', true]);
        console.log('✅ 管理员用户已创建');
      } catch (error) {
        console.warn('⚠️ 管理员用户创建警告:', error.message);
      }

      // 5. 插入系统配置
      console.log('⚙️ 插入系统配置...');
      const configs = [
        ['system', 'app_name', 'Test Web App', 'string', '应用程序名称'],
        ['system', 'app_version', '2.0.0', 'string', '应用程序版本'],
        ['system', 'maintenance_mode', 'false', 'boolean', '维护模式'],
        ['testing', 'max_concurrent_tests', '10', 'number', '最大并发测试数'],
        ['testing', 'default_timeout', '60', 'number', '默认超时时间'],
        ['monitoring', 'check_interval', '300', 'number', '监控检查间隔'],
        ['security', 'session_timeout', '7200', 'number', '会话超时时间'],
        ['performance', 'cache_ttl', '3600', 'number', '缓存生存时间']
      ];

      for (const [category, key, value, dataType, description] of configs) {
        try {
          await pool.query(`
            INSERT INTO system_config (category, key, value, data_type, description)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (category, key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW()
          `, [category, key, value, dataType, description]);
        } catch (error) {
          console.warn(`⚠️ 配置插入警告 ${category}.${key}:`, error.message);
        }
      }
      console.log('✅ 系统配置插入完成');

      // 6. 插入测试引擎状态
      console.log('🔧 插入测试引擎状态...');
      const engines = [
        ['lighthouse', '10.4.0', 'healthy', '{"cpu_usage": 15, "memory_usage": 256}'],
        ['puppeteer', '21.5.2', 'healthy', '{"cpu_usage": 12, "memory_usage": 128}'],
        ['playwright', '1.40.0', 'healthy', '{"cpu_usage": 18, "memory_usage": 192}'],
        ['selenium', '4.15.2', 'healthy', '{"cpu_usage": 20, "memory_usage": 320}']
      ];

      for (const [type, version, status, metadata] of engines) {
        try {
          await pool.query(`
            INSERT INTO engine_status (engine_type, engine_version, status, metadata)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (engine_type) DO UPDATE SET
            engine_version = EXCLUDED.engine_version,
            status = EXCLUDED.status,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          `, [type, version, status, metadata]);
        } catch (error) {
          console.warn(`⚠️ 引擎状态插入警告 ${type}:`, error.message);
        }
      }
      console.log('✅ 测试引擎状态插入完成');

      // 7. 创建初始化标记
      await pool.query(`
        INSERT INTO database_migrations (name, executed_at, checksum)
        VALUES ('initial_setup', NOW(), 'complete')
        ON CONFLICT (name) DO UPDATE SET
        executed_at = NOW()
      `);
      console.log('✅ 初始化标记完成');

      console.log('');
      console.log('🎉 完备数据库初始化完成！');
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
    }
  }

  /**
   * 完整的表管理功能
   */
  async manageTables(action, tableName = null) {
    const pool = await this.connect();

    try {
      switch (action) {
        case 'list':
          return await this.listTables(pool);
        case 'describe':
          if (!tableName) throw new Error('表名是必需的');
          return await this.describeTable(pool, tableName);
        case 'count':
          if (!tableName) throw new Error('表名是必需的');
          return await this.countTableRows(pool, tableName);
        case 'truncate':
          if (!tableName) throw new Error('表名是必需的');
          return await this.truncateTable(pool, tableName);
        case 'drop':
          if (!tableName) throw new Error('表名是必需的');
          return await this.dropTable(pool, tableName);
        default:
          throw new Error(`未知的表操作: ${action}`);
      }
    } catch (error) {
      console.error(`❌ 表管理操作失败:`, error.message);
      throw error;
    }
  }

  async listTables(pool) {
    console.log('📋 数据库表');
    console.log('============');
    console.log('🔌 连接到数据库...');
    console.log('✅ 数据库连接成功');

    const result = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);

    result.rows.forEach(row => {
      console.log(`  ${row.tablename.padEnd(30)} ${row.size}`);
    });

    return result.rows;
  }

  async describeTable(pool, tableName) {
    console.log(`📊 表结构: ${tableName}`);
    console.log('========================');

    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);

    if (result.rows.length === 0) {
      console.log(`❌ 表 '${tableName}' 不存在`);
      return [];
    }

    console.log('字段名'.padEnd(25) + '类型'.padEnd(20) + '可空'.padEnd(8) + '默认值');
    console.log('-'.repeat(70));

    result.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? 'YES' : 'NO';
      const defaultVal = row.column_default || '';
      console.log(
        row.column_name.padEnd(25) +
        row.data_type.padEnd(20) +
        nullable.padEnd(8) +
        defaultVal
      );
    });

    return result.rows;
  }

  async countTableRows(pool, tableName) {
    console.log(`📊 统计表记录: ${tableName}`);

    const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    const count = parseInt(result.rows[0].count);

    console.log(`📈 ${tableName}: ${count} 条记录`);
    return count;
  }

  /**
   * 完整的性能分析功能
   */
  async performanceAnalysis() {
    console.log('📊 数据库性能分析');
    console.log('==================');

    const pool = await this.connect();

    try {
      // 1. 数据库大小分析
      console.log('💾 数据库大小分析:');
      const sizeResult = await pool.query(`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as total_size,
          pg_database_size(current_database()) as size_bytes
      `);
      console.log(`   总大小: ${sizeResult.rows[0].total_size}`);

      // 2. 表大小排行
      console.log('\n📊 表大小排行 (前10):');
      const tableSizeResult = await pool.query(`
        SELECT 
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `);

      tableSizeResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.tablename}: ${row.size}`);
      });

      // 3. 索引使用情况
      console.log('\n📈 索引使用情况:');
      try {
        const indexResult = await pool.query(`
          SELECT
            schemaname,
            tablename,
            indexname,
            COALESCE(idx_scan, 0) as idx_scan,
            COALESCE(idx_tup_read, 0) as idx_tup_read,
            COALESCE(idx_tup_fetch, 0) as idx_tup_fetch
          FROM pg_stat_user_indexes
          WHERE schemaname = 'public'
          ORDER BY idx_scan DESC
          LIMIT 10
        `);

        if (indexResult.rows.length > 0) {
          console.log('   索引名'.padEnd(30) + '扫描次数'.padEnd(12) + '读取行数');
          console.log('   ' + '-'.repeat(50));
          indexResult.rows.forEach(row => {
            console.log(`   ${row.indexname.padEnd(30)}${row.idx_scan.toString().padEnd(12)}${row.idx_tup_read}`);
          });
        } else {
          console.log('   📊 暂无索引使用统计数据');
        }
      } catch (error) {
        console.log('   📊 索引使用统计不可用，显示索引列表:');

        const basicIndexResult = await pool.query(`
          SELECT
            schemaname,
            tablename,
            indexname,
            pg_size_pretty(pg_relation_size(indexname::regclass)) as size
          FROM pg_indexes
          WHERE schemaname = 'public'
          ORDER BY pg_relation_size(indexname::regclass) DESC
          LIMIT 10
        `);

        console.log('   索引名'.padEnd(30) + '表名'.padEnd(20) + '大小');
        console.log('   ' + '-'.repeat(60));
        basicIndexResult.rows.forEach(row => {
          console.log(`   ${row.indexname.padEnd(30)}${row.tablename.padEnd(20)}${row.size}`);
        });
      }

      // 4. 连接信息
      console.log('\n🔗 连接信息:');
      const connectionResult = await pool.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      const conn = connectionResult.rows[0];
      console.log(`   总连接数: ${conn.total_connections}`);
      console.log(`   活跃连接: ${conn.active_connections}`);
      console.log(`   空闲连接: ${conn.idle_connections}`);

      // 5. 查询性能测试
      console.log('\n⚡ 查询性能测试:');
      const queries = [
        { name: '简单查询', sql: 'SELECT 1' },
        { name: '用户表查询', sql: 'SELECT COUNT(*) FROM users' },
        { name: '测试结果查询', sql: 'SELECT COUNT(*) FROM test_results' },
        { name: '复杂连接查询', sql: 'SELECT COUNT(*) FROM users u LEFT JOIN test_results tr ON u.id = tr.user_id' }
      ];

      for (const query of queries) {
        const startTime = Date.now();
        await pool.query(query.sql);
        const duration = Date.now() - startTime;

        const performance = duration < 10 ? '🟢 优秀' :
          duration < 50 ? '🟡 良好' :
            duration < 200 ? '🟠 一般' : '🔴 慢';

        console.log(`   ${query.name}: ${duration}ms ${performance}`);
      }

      console.log('\n🎉 性能分析完成！');

    } catch (error) {
      console.error('❌ 性能分析失败:', error);
      throw error;
    }
  }

  /**
   * 完整的备份功能
   */
  async backupDatabase() {
    console.log('💾 数据库备份开始...');
    console.log('====================');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = this.options.file || `backup-${timestamp}.sql`;
    const backupPath = path.resolve(backupFile);

    try {
      const pool = await this.connect();

      console.log(`📁 备份文件: ${backupPath}`);
      console.log('🔄 开始备份...');

      // 获取所有表
      const tablesResult = await pool.query(`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

      let backupSQL = '';

      // 添加备份头信息
      backupSQL += `-- 数据库备份文件\n`;
      backupSQL += `-- 创建时间: ${new Date().toISOString()}\n`;
      backupSQL += `-- 数据库: ${this.config.database}\n`;
      backupSQL += `-- 表数量: ${tablesResult.rows.length}\n\n`;

      // 备份每个表的数据
      for (const table of tablesResult.rows) {
        const tableName = table.tablename;
        console.log(`📊 备份表: ${tableName}`);

        // 获取表结构
        const structureResult = await pool.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [tableName]);

        // 获取表数据
        const dataResult = await pool.query(`SELECT * FROM ${tableName}`);

        if (dataResult.rows.length > 0) {
          backupSQL += `-- 表: ${tableName} (${dataResult.rows.length} 条记录)\n`;

          // 生成INSERT语句
          const columns = structureResult.rows.map(col => col.column_name);
          const columnsList = columns.join(', ');

          dataResult.rows.forEach(row => {
            const values = columns.map(col => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
              if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
              return value;
            }).join(', ');

            backupSQL += `INSERT INTO ${tableName} (${columnsList}) VALUES (${values});\n`;
          });

          backupSQL += '\n';
        }
      }

      // 写入备份文件
      await fs.writeFile(backupPath, backupSQL, 'utf8');

      console.log('✅ 备份完成');
      console.log(`📁 备份文件: ${backupPath}`);
      console.log(`📊 备份了 ${tablesResult.rows.length} 个表`);

      return backupPath;

    } catch (error) {
      console.error('❌ 数据库备份失败:', error);
      throw error;
    }
  }

  /**
   * 完整的恢复功能
   */
  async restoreDatabase() {
    if (!this.options.file) {
      throw new Error('请指定备份文件: --file <path>');
    }

    console.log('🔄 数据库恢复开始...');
    console.log('====================');

    const restorePath = path.resolve(this.options.file);

    try {
      // 检查备份文件是否存在
      await fs.access(restorePath);
      console.log(`📁 恢复文件: ${restorePath}`);

      const pool = await this.connect();

      // 读取备份文件
      const backupSQL = await fs.readFile(restorePath, 'utf8');
      console.log('📖 读取备份文件成功');

      // 如果需要，先清空数据库
      if (this.options.force) {
        console.log('🗑️ 清空现有数据...');
        const tablesResult = await pool.query(`
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename
        `);

        for (const table of tablesResult.rows) {
          await pool.query(`TRUNCATE TABLE ${table.tablename} CASCADE`);
        }
        console.log('✅ 现有数据已清空');
      }

      // 执行恢复
      console.log('🔄 执行数据恢复...');
      const statements = backupSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      let successCount = 0;
      let errorCount = 0;

      for (const statement of statements) {
        try {
          await pool.query(statement);
          successCount++;
        } catch (error) {
          errorCount++;
          if (this.options.verbose) {
            console.warn(`⚠️ 语句执行警告:`, error.message);
          }
        }
      }

      console.log('✅ 数据恢复完成');
      console.log(`📊 成功执行: ${successCount} 条语句`);
      if (errorCount > 0) {
        console.log(`⚠️ 警告: ${errorCount} 条语句执行失败`);
      }

      return { successCount, errorCount };

    } catch (error) {
      console.error('❌ 数据库恢复失败:', error);
      throw error;
    }
  }

  /**
   * 完整的监控功能
   */
  async monitorDatabase() {
    console.log('📊 数据库实时监控');
    console.log('==================');

    const pool = await this.connect();

    try {
      // 清屏并开始监控
      console.clear();

      const monitorInterval = setInterval(async () => {
        try {
          console.clear();
          console.log('📊 数据库实时监控 - ' + new Date().toLocaleString());
          console.log('='.repeat(60));

          // 连接信息
          const connectionResult = await pool.query(`
            SELECT
              count(*) as total,
              count(*) FILTER (WHERE state = 'active') as active,
              count(*) FILTER (WHERE state = 'idle') as idle,
              count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
            FROM pg_stat_activity
            WHERE datname = current_database()
          `);

          const conn = connectionResult.rows[0];
          console.log('🔗 连接状态:');
          console.log(`   总连接: ${conn.total} | 活跃: ${conn.active} | 空闲: ${conn.idle} | 事务中: ${conn.idle_in_transaction}`);

          // 查询活动
          const activityResult = await pool.query(`
            SELECT
              pid,
              usename,
              application_name,
              state,
              query_start,
              LEFT(query, 50) as query_preview
            FROM pg_stat_activity
            WHERE datname = current_database() AND state = 'active' AND pid != pg_backend_pid()
            ORDER BY query_start DESC
            LIMIT 5
          `);

          console.log('\n⚡ 活跃查询:');
          if (activityResult.rows.length > 0) {
            activityResult.rows.forEach(row => {
              const duration = new Date() - new Date(row.query_start);
              console.log(`   PID ${row.pid}: ${row.query_preview}... (${Math.round(duration / 1000)}s)`);
            });
          } else {
            console.log('   📊 当前无活跃查询');
          }

          // 锁信息
          const locksResult = await pool.query(`
            SELECT
              mode,
              count(*) as count
            FROM pg_locks
            WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
            GROUP BY mode
            ORDER BY count DESC
          `);

          console.log('\n🔒 锁状态:');
          if (locksResult.rows.length > 0) {
            locksResult.rows.forEach(row => {
              console.log(`   ${row.mode}: ${row.count}`);
            });
          } else {
            console.log('   📊 当前无锁');
          }

          console.log('\n按 Ctrl+C 退出监控...');

        } catch (error) {
          console.error('❌ 监控数据获取失败:', error.message);
        }
      }, 2000);

      // 处理退出信号
      process.on('SIGINT', () => {
        clearInterval(monitorInterval);
        console.log('\n👋 监控已停止');
        process.exit(0);
      });

    } catch (error) {
      console.error('❌ 监控启动失败:', error);
      throw error;
    }
  }

  /**
   * 完整的数据查询功能
   */
  async queryData(sql, params = []) {
    console.log('🔍 执行数据查询');
    console.log('================');

    const pool = await this.connect();

    try {
      console.log(`📝 SQL: ${sql}`);
      if (params.length > 0) {
        console.log(`📋 参数: ${JSON.stringify(params)}`);
      }

      const startTime = Date.now();
      const result = await pool.query(sql, params);
      const duration = Date.now() - startTime;

      console.log(`⚡ 执行时间: ${duration}ms`);
      console.log(`📊 返回记录: ${result.rows.length} 条`);

      if (this.options.json) {
        console.log('\n📋 查询结果:');
        console.log(JSON.stringify(result.rows, null, 2));
      } else if (result.rows.length > 0) {
        console.log('\n📋 查询结果:');

        // 显示表头
        const columns = Object.keys(result.rows[0]);
        const header = columns.map(col => col.padEnd(20)).join(' | ');
        console.log(header);
        console.log('-'.repeat(header.length));

        // 显示数据（限制显示数量）
        const displayRows = result.rows.slice(0, this.options.limit);
        displayRows.forEach(row => {
          const rowData = columns.map(col => {
            let value = row[col];
            if (value === null) value = 'NULL';
            if (typeof value === 'object') value = JSON.stringify(value);
            return String(value).substring(0, 18).padEnd(20);
          }).join(' | ');
          console.log(rowData);
        });

        if (result.rows.length > this.options.limit) {
          console.log(`\n... 还有 ${result.rows.length - this.options.limit} 条记录 (使用 --limit 调整显示数量)`);
        }
      }

      return result.rows;

    } catch (error) {
      console.error('❌ 查询执行失败:', error.message);
      throw error;
    }
  }

  /**
   * 完整的索引管理功能
   */
  async manageIndexes(action, indexName = null, tableName = null, columns = []) {
    console.log('📈 索引管理');
    console.log('============');

    const pool = await this.connect();

    try {
      switch (action) {
        case 'list':
          return await this.listIndexes(pool);
        case 'create':
          if (!indexName || !tableName || columns.length === 0) {
            throw new Error('创建索引需要: 索引名、表名、字段列表');
          }
          return await this.createIndex(pool, indexName, tableName, columns);
        case 'drop':
          if (!indexName) throw new Error('删除索引需要索引名');
          return await this.dropIndex(pool, indexName);
        case 'reindex':
          return await this.reindexDatabase(pool);
        case 'analyze':
          return await this.analyzeIndexUsage(pool);
        default:
          throw new Error(`未知的索引操作: ${action}`);
      }
    } catch (error) {
      console.error('❌ 索引管理失败:', error.message);
      throw error;
    }
  }

  async listIndexes(pool) {
    const result = await pool.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as size
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY pg_relation_size(indexname::regclass) DESC
    `);

    console.log('索引名'.padEnd(35) + '表名'.padEnd(25) + '大小');
    console.log('-'.repeat(70));

    result.rows.forEach(row => {
      console.log(row.indexname.padEnd(35) + row.tablename.padEnd(25) + row.size);
    });

    console.log(`\n📊 总计: ${result.rows.length} 个索引`);
    return result.rows;
  }

  async createIndex(pool, indexName, tableName, columns) {
    const columnsList = columns.join(', ');
    const sql = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columnsList})`;

    console.log(`🔧 创建索引: ${indexName}`);
    console.log(`📊 表: ${tableName}`);
    console.log(`📋 字段: ${columnsList}`);

    await pool.query(sql);
    console.log('✅ 索引创建成功');

    return { indexName, tableName, columns };
  }

  async dropIndex(pool, indexName) {
    console.log(`🗑️ 删除索引: ${indexName}`);

    if (!this.options.force) {
      console.log('⚠️ 这是危险操作，请使用 --force 确认');
      return;
    }

    await pool.query(`DROP INDEX IF EXISTS ${indexName}`);
    console.log('✅ 索引删除成功');

    return { indexName };
  }

  async reindexDatabase(pool) {
    console.log('🔄 重建所有索引...');

    const result = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
    `);

    for (const row of result.rows) {
      try {
        await pool.query(`REINDEX INDEX ${row.indexname}`);
        console.log(`✅ 重建索引: ${row.indexname}`);
      } catch (error) {
        console.warn(`⚠️ 重建失败 ${row.indexname}:`, error.message);
      }
    }

    console.log('🎉 索引重建完成');
    return result.rows.length;
  }

  async analyzeIndexUsage(pool) {
    console.log('📊 索引使用分析');
    console.log('================');

    const result = await pool.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as size
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
    `);

    console.log('索引名'.padEnd(30) + '扫描次数'.padEnd(12) + '读取行数'.padEnd(12) + '大小');
    console.log('-'.repeat(70));

    result.rows.forEach(row => {
      const usage = row.idx_scan === 0 ? '🔴 未使用' :
        row.idx_scan < 10 ? '🟡 少用' : '🟢 常用';

      console.log(
        row.indexname.padEnd(30) +
        row.idx_scan.toString().padEnd(12) +
        row.idx_tup_read.toString().padEnd(12) +
        row.size + ' ' + usage
      );
    });

    // 找出未使用的索引
    const unusedIndexes = result.rows.filter(row => row.idx_scan === 0);
    if (unusedIndexes.length > 0) {
      console.log(`\n🔴 发现 ${unusedIndexes.length} 个未使用的索引:`);
      unusedIndexes.forEach(row => {
        console.log(`   ${row.indexname} (${row.size})`);
      });
      console.log('💡 建议: 考虑删除未使用的索引以节省空间');
    }

    return result.rows;
  }

  /**
   * 完整的用户管理功能
   */
  async manageUsers(action, username = null, options = {}) {
    console.log('👥 用户管理');
    console.log('============');

    const pool = await this.connect();

    try {
      switch (action) {
        case 'list':
          return await this.listUsers(pool);
        case 'create':
          if (!username) throw new Error('用户名是必需的');
          return await this.createUser(pool, username, options);
        case 'delete':
          if (!username) throw new Error('用户名是必需的');
          return await this.deleteUser(pool, username);
        case 'reset-password':
          if (!username) throw new Error('用户名是必需的');
          return await this.resetUserPassword(pool, username, options.password);
        default:
          throw new Error(`未知的用户操作: ${action}`);
      }
    } catch (error) {
      console.error('❌ 用户管理失败:', error.message);
      throw error;
    }
  }

  async listUsers(pool) {
    const result = await pool.query(`
      SELECT
        id,
        username,
        email,
        role,
        is_active,
        created_at,
        last_login,
        login_count
      FROM users
      ORDER BY created_at DESC
    `);

    console.log('用户名'.padEnd(20) + '邮箱'.padEnd(30) + '角色'.padEnd(12) + '状态'.padEnd(12) + '登录次数');
    console.log('-'.repeat(80));

    result.rows.forEach(row => {
      const status = row.is_active ? '活跃' : '非活跃';
      console.log(
        row.username.padEnd(20) +
        row.email.padEnd(30) +
        row.role.padEnd(12) +
        status.padEnd(12) +
        (row.login_count || 0).toString()
      );
    });

    console.log(`\n📊 总计: ${result.rows.length} 个用户`);
    return result.rows;
  }

  /**
   * 完整的数据库维护功能
   */
  async maintenanceOperations(operation) {
    console.log('🔧 数据库维护');
    console.log('==============');

    const pool = await this.connect();

    try {
      switch (operation) {
        case 'vacuum':
          return await this.vacuumDatabase(pool);
        case 'analyze':
          return await this.analyzeDatabase(pool);
        case 'cleanup':
          return await this.cleanupDatabase(pool);
        case 'optimize':
          return await this.optimizeDatabase(pool);
        default:
          throw new Error(`未知的维护操作: ${operation}`);
      }
    } catch (error) {
      console.error('❌ 维护操作失败:', error.message);
      throw error;
    }
  }

  async vacuumDatabase(pool) {
    console.log('🧹 执行数据库清理...');

    const tablesResult = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
    `);

    for (const table of tablesResult.rows) {
      try {
        await pool.query(`VACUUM ANALYZE ${table.tablename}`);
        console.log(`✅ 清理表: ${table.tablename}`);
      } catch (error) {
        console.warn(`⚠️ 清理失败 ${table.tablename}:`, error.message);
      }
    }

    console.log('🎉 数据库清理完成');
    return tablesResult.rows.length;
  }

  async analyzeDatabase(pool) {
    console.log('📊 执行数据库分析...');

    const tablesResult = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
    `);

    for (const table of tablesResult.rows) {
      try {
        await pool.query(`ANALYZE ${table.tablename}`);
        console.log(`✅ 分析表: ${table.tablename}`);
      } catch (error) {
        console.warn(`⚠️ 分析失败 ${table.tablename}:`, error.message);
      }
    }

    console.log('🎉 数据库分析完成');
    return tablesResult.rows.length;
  }

  /**
   * 主要的运行逻辑
   */
  async run() {
    try {
      if (!this.command || this.command === 'help') {
        this.showHelp();
        return;
      }

      console.log('🗄️ 完备数据库管理系统 v2.0');
      console.log('============================');
      console.log(`📋 执行命令: ${this.command}`);
      console.log('');

      switch (this.command) {
        // 核心命令
        case 'init':
          await this.initializeDatabase();
          break;
        case 'health':
          const healthChecker = require('./health-check');
          const checker = new healthChecker();
          await checker.performHealthCheck();
          break;
        case 'backup':
          await this.backupDatabase();
          break;
        case 'restore':
          await this.restoreDatabase();
          break;
        case 'monitor':
          await this.monitorDatabase();
          break;

        // 表管理
        case 'tables':
          await this.manageTables('list');
          break;
        case 'describe':
          await this.manageTables('describe', this.args[1]);
          break;
        case 'count':
          await this.manageTables('count', this.args[1]);
          break;

        // 数据查询
        case 'query':
          if (!this.options.query) {
            throw new Error('请指定SQL查询: --query "SELECT ..."');
          }
          await this.queryData(this.options.query);
          break;
        case 'select':
          if (!this.args[1]) {
            throw new Error('请指定表名');
          }
          await this.queryData(`SELECT * FROM ${this.args[1]} LIMIT ${this.options.limit}`);
          break;

        // 索引管理
        case 'indexes':
          await this.manageIndexes('list');
          break;
        case 'reindex':
          await this.manageIndexes('reindex');
          break;
        case 'analyze-indexes':
          await this.manageIndexes('analyze');
          break;

        // 性能分析
        case 'analyze':
          await this.performanceAnalysis();
          break;
        case 'vacuum':
          await this.maintenanceOperations('vacuum');
          break;

        // 用户管理
        case 'users':
          await this.manageUsers('list');
          break;

        default:
          console.error(`❌ 未知命令: ${this.command}`);
          console.log('💡 使用 "help" 查看所有可用命令');
          process.exit(1);
      }

    } catch (error) {
      console.error('❌ 命令执行失败:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// 运行数据库管理器
if (require.main === module) {
  const manager = new CompleteDatabaseManager();
  manager.run();
}

module.exports = CompleteDatabaseManager;
