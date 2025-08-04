// 修复脚本：检查和修复被错误标记为已完成的取消测试
const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'testweb_dev',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function fixCancelledStatus() {
  try {
    const client = await pool.connect();
    
    console.log('🔍 检查可能被错误标记的取消测试...\n');
    
    // 查找可能被错误标记为已完成的取消测试
    // 特征：error_message包含"取消"相关关键词但状态为completed
    const suspiciousResult = await client.query(`
      SELECT 
        id,
        test_name,
        status,
        error_message,
        created_at,
        updated_at
      FROM test_history 
      WHERE status = 'completed' 
        AND (
          error_message ILIKE '%取消%' 
          OR error_message ILIKE '%cancel%'
          OR error_message ILIKE '%用户%'
        )
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    
    console.log(`发现 ${suspiciousResult.rows.length} 条可疑记录:`);
    console.log('=====================================');
    
    if (suspiciousResult.rows.length === 0) {
      console.log('✅ 没有发现被错误标记的记录');
      client.release();
      return;
    }
    
    suspiciousResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   名称: ${row.test_name}`);
      console.log(`   当前状态: ${row.status}`);
      console.log(`   错误信息: ${row.error_message}`);
      console.log(`   创建时间: ${row.created_at}`);
      console.log('-------------------------------------');
    });
    
    // 询问是否要修复
    console.log('\n🔧 是否要修复这些记录？(y/n)');
    
    // 在实际环境中，这里应该有用户输入确认
    // 为了演示，我们直接修复
    const shouldFix = true; // 在生产环境中应该改为用户输入
    
    if (shouldFix) {
      console.log('\n🔧 开始修复...');
      
      let fixedCount = 0;
      for (const row of suspiciousResult.rows) {
        try {
          await client.query(`
            UPDATE test_history 
            SET status = 'cancelled',
                updated_at = NOW()
            WHERE id = $1
          `, [row.id]);
          
          console.log(`✅ 修复记录 ${row.id}: ${row.test_name}`);
          fixedCount++;
        } catch (error) {
          console.error(`❌ 修复记录 ${row.id} 失败:`, error.message);
        }
      }
      
      console.log(`\n🎉 修复完成！共修复了 ${fixedCount} 条记录`);
    } else {
      console.log('❌ 用户取消修复操作');
    }
    
    client.release();
    
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await pool.end();
  }
}

fixCancelledStatus();
