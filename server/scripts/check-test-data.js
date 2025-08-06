/**
 * 检查测试数据状态脚本
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'testweb_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

async function checkTestData() {
  console.log('🔍 检查测试数据状态...');
  console.log('=====================================');

  let pool;

  try {
    pool = new Pool(dbConfig);

    // 检查主表数据
    console.log('1️⃣ 检查主表数据...');
    const sessionResult = await pool.query('SELECT COUNT(*) as count FROM test_sessions');
    console.log(`   📊 test_sessions: ${sessionResult.rows[0].count} 条记录`);

    if (sessionResult.rows[0].count > 0) {
      // 检查测试类型分布
      const typeResult = await pool.query(`
        SELECT test_type, COUNT(*) as count 
        FROM test_sessions 
        GROUP BY test_type 
        ORDER BY count DESC
      `);
      console.log('   📋 测试类型分布:');
      typeResult.rows.forEach(row => {
        console.log(`      - ${row.test_type}: ${row.count} 条`);
      });

      // 检查最近的记录
      const recentResult = await pool.query(`
        SELECT id, test_name, test_type, status, created_at 
        FROM test_sessions 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      console.log('   📝 最近的测试记录:');
      recentResult.rows.forEach(record => {
        console.log(`      - ${record.test_name} (${record.test_type}) - ${record.status} - ${record.created_at.toISOString().split('T')[0]}`);
      });
    }

    // 检查详情表数据
    console.log('\n2️⃣ 检查详情表数据...');
    const detailTables = [
      'stress_test_details',
      'security_test_details', 
      'api_test_details',
      'seo_test_details',
      'accessibility_test_details',
      'compatibility_test_details',
      'performance_test_details'
    ];

    for (const table of detailTables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   📊 ${table}: ${result.rows[0].count} 条记录`);
      } catch (error) {
        console.log(`   ❌ ${table}: 查询失败 - ${error.message}`);
      }
    }

    // 检查文件资源表
    console.log('\n3️⃣ 检查文件资源表...');
    const artifactResult = await pool.query('SELECT COUNT(*) as count FROM test_artifacts');
    console.log(`   📊 test_artifacts: ${artifactResult.rows[0].count} 条记录`);

    // 检查视图
    console.log('\n4️⃣ 检查视图...');
    const viewResult = await pool.query(`
      SELECT viewname 
      FROM pg_views 
      WHERE schemaname = 'public' 
      AND viewname LIKE '%test%'
      ORDER BY viewname
    `);
    console.log(`   📋 测试相关视图: ${viewResult.rows.length} 个`);
    viewResult.rows.forEach(row => {
      console.log(`      - ${row.viewname}`);
    });

    console.log('\n🎉 测试数据检查完成！');

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

checkTestData();
