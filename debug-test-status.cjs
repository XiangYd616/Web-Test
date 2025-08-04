// 调试工具：检查测试状态
const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'test_web_app',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function checkTestStatus() {
  try {
    const client = await pool.connect();
    
    console.log('🔍 检查最近的测试记录状态...\n');
    
    // 查询最近的10条记录
    const result = await client.query(`
      SELECT 
        id,
        test_name,
        status,
        error_message,
        created_at,
        updated_at,
        end_time
      FROM test_history 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('最近10条测试记录:');
    console.log('=====================================');
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   名称: ${row.test_name}`);
      console.log(`   状态: ${row.status}`);
      console.log(`   错误信息: ${row.error_message || '无'}`);
      console.log(`   创建时间: ${row.created_at}`);
      console.log(`   更新时间: ${row.updated_at}`);
      console.log(`   结束时间: ${row.end_time || '未结束'}`);
      console.log('-------------------------------------');
    });
    
    // 统计各状态的数量
    const statusResult = await client.query(`
      SELECT status, COUNT(*) as count
      FROM test_history 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY status
      ORDER BY count DESC
    `);
    
    console.log('\n过去24小时状态统计:');
    console.log('=====================================');
    statusResult.rows.forEach(row => {
      console.log(`${row.status}: ${row.count} 条记录`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await pool.end();
  }
}

checkTestStatus();
