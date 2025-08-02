const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/test_web_app'
});

async function checkTestHistory() {
  try {
    // 检查表结构
    console.log('=== 检查test_history表结构 ===');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'test_history' 
      ORDER BY ordinal_position
    `);
    
    console.log('表字段:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // 检查最近的测试记录
    console.log('\n=== 检查最近的测试记录 ===');
    const recentTests = await pool.query(`
      SELECT id, test_name, test_type, url, status, duration, overall_score, 
             error_rate, total_requests, successful_requests, failed_requests,
             created_at, start_time, end_time
      FROM test_history 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    console.log('最近的测试记录:');
    recentTests.rows.forEach((row, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log(`  ID: ${row.id}`);
      console.log(`  测试名称: ${row.test_name}`);
      console.log(`  URL: ${row.url}`);
      console.log(`  状态: ${row.status}`);
      console.log(`  持续时间: ${row.duration}`);
      console.log(`  性能评分: ${row.overall_score}`);
      console.log(`  错误率: ${row.error_rate}`);
      console.log(`  总请求数: ${row.total_requests}`);
      console.log(`  成功请求数: ${row.successful_requests}`);
      console.log(`  失败请求数: ${row.failed_requests}`);
      console.log(`  创建时间: ${row.created_at}`);
      console.log(`  开始时间: ${row.start_time}`);
      console.log(`  结束时间: ${row.end_time}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

checkTestHistory();
