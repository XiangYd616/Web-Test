/**
 * 简单的数据库测试脚本
 */

const { Pool } = require('pg');

// 数据库配置
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'testweb_dev',
  user: 'postgres',
  password: 'postgres'
};

async function testDatabase() {
  console.log('🔍 测试数据库连接...');
  
  const pool = new Pool(dbConfig);
  
  try {
    // 测试连接
    const client = await pool.connect();
    console.log('✅ 数据库连接成功');
    
    // 检查表是否存在
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'test_history'
      );
    `);
    
    console.log('📋 test_history 表存在:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // 检查数据
      const dataCheck = await client.query('SELECT COUNT(*) as total FROM test_history');
      console.log('📊 总记录数:', dataCheck.rows[0].total);
      
      // 检查压力测试记录
      const stressCheck = await client.query(`
        SELECT COUNT(*) as count FROM test_history WHERE test_type = 'stress'
      `);
      console.log('🏋️ 压力测试记录数:', stressCheck.rows[0].count);
      
      // 查看最近的记录
      const recentRecords = await client.query(`
        SELECT id, test_name, test_type, status, created_at, start_time
        FROM test_history 
        ORDER BY created_at DESC 
        LIMIT 3
      `);
      
      console.log('📝 最近的记录:');
      recentRecords.rows.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.test_name} (${record.status})`);
        console.log(`     ID: ${record.id}`);
        console.log(`     类型: ${record.test_type}`);
        console.log(`     创建时间: ${record.created_at}`);
        console.log(`     开始时间: ${record.start_time}`);
        console.log('');
      });
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ 数据库测试失败:', error.message);
  } finally {
    await pool.end();
  }
}

// 插入测试数据
async function insertSimpleTestData() {
  console.log('📝 插入简单测试数据...');
  
  const pool = new Pool(dbConfig);
  
  try {
    const client = await pool.connect();
    
    // 检查是否有用户
    const userCheck = await client.query('SELECT id FROM users LIMIT 1');
    let userId;
    
    if (userCheck.rows.length === 0) {
      console.log('创建测试用户...');
      const newUser = await client.query(`
        INSERT INTO users (username, email, password_hash, role, status)
        VALUES ('testuser', 'test@example.com', 'dummy_hash', 'user', 'active')
        RETURNING id
      `);
      userId = newUser.rows[0].id;
    } else {
      userId = userCheck.rows[0].id;
    }
    
    console.log('使用用户 ID:', userId);
    
    // 插入一条测试记录
    const now = new Date();
    const startTime = new Date(now.getTime() - 60 * 60 * 1000); // 1小时前
    const endTime = new Date(now.getTime() - 30 * 60 * 1000); // 30分钟前
    
    const result = await client.query(`
      INSERT INTO test_history 
      (test_name, test_type, url, status, user_id, config, results, 
       duration, start_time, end_time, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      '简单测试记录',
      'stress',
      'https://example.com',
      'completed',
      userId,
      JSON.stringify({ users: 10, duration: 60 }),
      JSON.stringify({ metrics: { totalRequests: 100, successfulRequests: 95 } }),
      1800000, // 30分钟
      startTime.toISOString(),
      endTime.toISOString(),
      now.toISOString(),
      now.toISOString()
    ]);
    
    console.log('✅ 插入测试记录成功:', result.rows[0].id);
    console.log('📅 时间字段:');
    console.log('  - created_at:', result.rows[0].created_at);
    console.log('  - start_time:', result.rows[0].start_time);
    console.log('  - end_time:', result.rows[0].end_time);
    
    client.release();
    
  } catch (error) {
    console.error('❌ 插入数据失败:', error.message);
  } finally {
    await pool.end();
  }
}

// 根据参数决定执行什么操作
const action = process.argv[2];

if (action === 'insert') {
  insertSimpleTestData();
} else {
  testDatabase();
}
