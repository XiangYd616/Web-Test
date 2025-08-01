/**
 * 测试状态迁移脚本
 * 
 * 将复杂的状态简化为5个核心状态：
 * - waiting → pending
 * - timeout → failed (并在错误信息中标明超时)
 */

const { Pool } = require('pg');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'testweb_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

async function migrateTestStatus() {
  const pool = new Pool(dbConfig);

  try {
    console.log('🚀 开始测试状态迁移...\n');

    // 1. 显示迁移前的状态统计
    console.log('📊 迁移前的状态统计：');
    const beforeQuery = `
      SELECT status, COUNT(*) as count 
      FROM test_history 
      GROUP BY status 
      ORDER BY count DESC
    `;
    
    const beforeResult = await pool.query(beforeQuery);
    beforeResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} 条记录`);
    });

    // 2. 迁移 waiting → pending
    console.log('\n🔄 迁移 waiting → pending...');
    const waitingQuery = `
      UPDATE test_history 
      SET status = 'pending',
          error_message = CASE 
            WHEN error_message IS NULL THEN '状态已从等待中更新为准备中'
            ELSE error_message || ' (原状态: waiting)'
          END,
          updated_at = NOW()
      WHERE status = 'waiting'
      RETURNING id, test_name
    `;
    
    const waitingResult = await pool.query(waitingQuery);
    console.log(`✅ 迁移了 ${waitingResult.rowCount} 条 waiting 记录到 pending`);

    // 3. 迁移 timeout → failed
    console.log('\n🔄 迁移 timeout → failed...');
    const timeoutQuery = `
      UPDATE test_history 
      SET status = 'failed',
          error_message = CASE 
            WHEN error_message IS NULL THEN '测试超时失败'
            WHEN error_message LIKE '%超时%' THEN error_message
            ELSE '测试超时失败: ' || error_message
          END,
          updated_at = NOW()
      WHERE status = 'timeout'
      RETURNING id, test_name
    `;
    
    const timeoutResult = await pool.query(timeoutQuery);
    console.log(`✅ 迁移了 ${timeoutResult.rowCount} 条 timeout 记录到 failed`);

    // 4. 显示迁移后的状态统计
    console.log('\n📊 迁移后的状态统计：');
    const afterResult = await pool.query(beforeQuery);
    afterResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} 条记录`);
    });

    // 5. 更新数据库约束
    console.log('\n🔧 更新数据库状态约束...');
    const constraintQuery = `
      ALTER TABLE test_history 
      DROP CONSTRAINT IF EXISTS test_history_status_check;
      
      ALTER TABLE test_history 
      ADD CONSTRAINT test_history_status_check 
      CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));
    `;
    
    await pool.query(constraintQuery);
    console.log('✅ 数据库约束已更新');

    // 6. 总结
    const totalMigrated = waitingResult.rowCount + timeoutResult.rowCount;
    console.log(`\n✅ 状态迁移完成！`);
    console.log(`总共迁移了 ${totalMigrated} 条记录`);
    console.log(`  - waiting → pending: ${waitingResult.rowCount} 条`);
    console.log(`  - timeout → failed: ${timeoutResult.rowCount} 条`);
    console.log('\n🎯 现在系统只使用5个核心状态：');
    console.log('  - pending (准备中)');
    console.log('  - running (运行中)');
    console.log('  - completed (已完成)');
    console.log('  - failed (已失败，包含超时)');
    console.log('  - cancelled (已取消)');

  } catch (error) {
    console.error('❌ 状态迁移失败:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// 运行迁移
if (require.main === module) {
  migrateTestStatus().catch(console.error);
}

module.exports = migrateTestStatus;
