/**
 * 数据库状态检查脚本
 * 检查数据库连接、表结构、数据完整性等
 */

// 加载后端环境变量配置
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'testweb_prod',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

async function checkDatabase() {
  console.log('🔍 数据库状态检查开始...');
  console.log('=====================================');

  let pool;

  try {
    pool = new Pool(dbConfig);

    // 1. 连接测试
    console.log('1️⃣ 测试数据库连接...');
    const client = await pool.connect();
    const versionResult = await client.query('SELECT version(), current_database(), current_user');
    const version = versionResult.rows[0];

    console.log(`✅ 连接成功`);
    console.log(`   数据库: ${version.current_database}`);
    console.log(`   用户: ${version.current_user}`);
    console.log(`   版本: ${version.version.split(' ')[1]}`);
    client.release();

    // 2. 表结构检查
    console.log('\n2️⃣ 检查表结构...');
    await checkTables(pool);

    // 3. 索引检查
    console.log('\n3️⃣ 检查索引...');
    await checkIndexes(pool);

    // 4. 数据统计
    console.log('\n4️⃣ 数据统计...');
    await checkDataStats(pool);

    // 5. 性能检查
    console.log('\n5️⃣ 性能检查...');
    await checkPerformance(pool);

    // 6. 安全检查
    console.log('\n6️⃣ 安全检查...');
    await checkSecurity(pool);

    console.log('\n🎉 数据库状态检查完成！');

  } catch (error) {
    console.error('❌ 数据库检查失败:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

async function checkTables(pool) {
  const expectedTables = [
    'users', 'user_preferences', 'test_sessions', 'activity_logs',
    'monitoring_sites', 'monitoring_results', 'data_tasks',
    'test_templates', 'system_settings', 'notifications'
  ];

  const result = await pool.query(`
    SELECT table_name, 
           (SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = t.table_name AND table_schema = 'public') as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const actualTables = result.rows.map(row => row.table_name);
  const missingTables = expectedTables.filter(table => !actualTables.includes(table));

  console.log(`   📊 总表数: ${actualTables.length}`);

  if (missingTables.length === 0) {
    console.log('   ✅ 所有必需表都存在');
  } else {
    console.log(`   ❌ 缺失表: ${missingTables.join(', ')}`);
  }

  // 显示表详情
  for (const row of result.rows) {
    const status = expectedTables.includes(row.table_name) ? '✅' : 'ℹ️';
    console.log(`   ${status} ${row.table_name} (${row.column_count} 列)`);
  }
}

async function checkIndexes(pool) {
  const result = await pool.query(`
    SELECT schemaname, tablename, indexname, indexdef
    FROM pg_indexes 
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `);

  console.log(`   📇 索引总数: ${result.rows.length}`);

  // 按表分组统计
  const indexesByTable = {};
  result.rows.forEach(row => {
    if (!indexesByTable[row.tablename]) {
      indexesByTable[row.tablename] = 0;
    }
    indexesByTable[row.tablename]++;
  });

  Object.entries(indexesByTable).forEach(([table, count]) => {
    console.log(`   📋 ${table}: ${count} 个索引`);
  });
}

async function checkDataStats(pool) {
  const tables = ['users', 'test_sessions', 'monitoring_sites', 'activity_logs', 'data_tasks'];

  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = parseInt(result.rows[0].count);
      console.log(`   📊 ${table}: ${count.toLocaleString()} 条记录`);
    } catch (error) {
      console.log(`   ❌ ${table}: 表不存在或查询失败`);
    }
  }

  // 检查管理员用户
  try {
    const adminResult = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'admin'
    `);
    const adminCount = parseInt(adminResult.rows[0].count);
    if (adminCount > 0) {
      console.log(`   👑 管理员用户: ${adminCount} 个`);
    } else {
      console.log('   ⚠️ 未找到管理员用户');
    }
  } catch (error) {
    console.log('   ❌ 无法检查管理员用户');
  }
}

async function checkPerformance(pool) {
  try {
    // 数据库大小
    const sizeResult = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);
    console.log(`   💾 数据库大小: ${sizeResult.rows[0].size}`);

    // 连接数
    const connResult = await pool.query(`
      SELECT count(*) as active_connections,
             max_conn.setting as max_connections
      FROM pg_stat_activity, 
           (SELECT setting FROM pg_settings WHERE name = 'max_connections') max_conn
      WHERE datname = current_database()
      GROUP BY max_conn.setting
    `);

    if (connResult.rows.length > 0) {
      const conn = connResult.rows[0];
      console.log(`   🔗 连接数: ${conn.active_connections}/${conn.max_connections}`);
    }

    // 缓存命中率
    const cacheResult = await pool.query(`
      SELECT 
        round(blks_hit::numeric/(blks_hit + blks_read) * 100, 2) as cache_hit_ratio
      FROM pg_stat_database 
      WHERE datname = current_database()
    `);

    if (cacheResult.rows.length > 0 && cacheResult.rows[0].cache_hit_ratio) {
      console.log(`   📈 缓存命中率: ${cacheResult.rows[0].cache_hit_ratio}%`);
    }

  } catch (error) {
    console.log('   ⚠️ 性能指标获取失败');
  }
}

async function checkSecurity(pool) {
  try {
    // 检查SSL状态
    const sslResult = await pool.query(`SHOW ssl`);
    const sslEnabled = sslResult.rows[0].ssl === 'on';
    console.log(`   🔒 SSL连接: ${sslEnabled ? '启用' : '禁用'}`);

    // 检查用户权限
    const userResult = await pool.query(`
      SELECT usename, usesuper, usecreatedb, usecanlogin 
      FROM pg_user 
      WHERE usename = current_user
    `);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`   👤 当前用户权限:`);
      console.log(`      超级用户: ${user.usesuper ? '是' : '否'}`);
      console.log(`      创建数据库: ${user.usecreatedb ? '是' : '否'}`);
      console.log(`      可登录: ${user.usecanlogin ? '是' : '否'}`);
    }

    // 检查密码策略
    const passwordResult = await pool.query(`
      SELECT COUNT(*) as weak_passwords
      FROM users 
      WHERE password = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm'
    `);

    const weakPasswords = parseInt(passwordResult.rows[0].weak_passwords);
    if (weakPasswords > 0) {
      console.log(`   ⚠️ 发现 ${weakPasswords} 个默认密码用户`);
    } else {
      console.log('   ✅ 未发现默认密码用户');
    }

  } catch (error) {
    console.log('   ⚠️ 安全检查失败');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkDatabase();
}

module.exports = { checkDatabase };
