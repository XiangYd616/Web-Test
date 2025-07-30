#!/usr/bin/env node

/**
 * 检查实际的数据库表结构
 */

const { Pool } = require('pg');

const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'testweb_dev',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
};

async function checkTableStructure() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔍 检查test_history表的实际结构...');
    
    // 检查表结构
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'test_history' 
      ORDER BY ordinal_position
    `);

    if (result.rows.length === 0) {
      console.log('❌ test_history表不存在');
      return;
    }

    console.log('✅ test_history表字段:');
    result.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // 检查是否有duration字段
    const hasDuration = result.rows.some(row => row.column_name === 'duration');
    console.log(`\n🔍 duration字段存在: ${hasDuration ? '✅ 是' : '❌ 否'}`);

    // 如果没有duration字段，尝试添加
    if (!hasDuration) {
      console.log('\n⚡ 尝试添加duration字段...');
      await pool.query('ALTER TABLE test_history ADD COLUMN duration INTEGER');
      console.log('✅ duration字段添加成功');
    }

    // 检查现有记录
    const recordCount = await pool.query('SELECT COUNT(*) as count FROM test_history');
    console.log(`\n📊 当前记录数量: ${recordCount.rows[0].count}`);

    // 显示最近的记录
    const recentRecords = await pool.query(`
      SELECT id, test_name, test_type, status, created_at 
      FROM test_history 
      ORDER BY created_at DESC 
      LIMIT 3
    `);

    if (recentRecords.rows.length > 0) {
      console.log('\n📝 最近的测试记录:');
      recentRecords.rows.forEach(record => {
        console.log(`  - ${record.test_name} (${record.test_type}) - ${record.status}`);
      });
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  checkTableStructure().catch(console.error);
}

module.exports = { checkTableStructure };
