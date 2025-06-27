/**
 * 数据库重置脚本
 * 警告：此脚本会删除所有数据！
 */

require('dotenv').config();
const { Pool } = require('pg');
const readline = require('readline');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'testweb_prod',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function resetDatabase() {
  console.log('⚠️  数据库重置工具');
  console.log('=====================================');
  console.log(`数据库: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log('⚠️  警告：此操作将删除所有数据！');
  console.log('=====================================');
  
  // 确认操作
  const confirm1 = await askQuestion('确定要重置数据库吗？(输入 "yes" 确认): ');
  if (confirm1.toLowerCase() !== 'yes') {
    console.log('❌ 操作已取消');
    rl.close();
    return;
  }
  
  const confirm2 = await askQuestion('再次确认：这将删除所有数据！(输入 "DELETE ALL DATA" 确认): ');
  if (confirm2 !== 'DELETE ALL DATA') {
    console.log('❌ 操作已取消');
    rl.close();
    return;
  }
  
  rl.close();
  
  let pool;
  
  try {
    pool = new Pool(dbConfig);
    
    console.log('🔌 连接到数据库...');
    const client = await pool.connect();
    client.release();
    
    console.log('🗑️  开始删除所有表...');
    
    // 获取所有表
    const tablesResult = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    const tables = tablesResult.rows.map(row => row.tablename);
    console.log(`发现 ${tables.length} 个表: ${tables.join(', ')}`);
    
    // 删除所有表
    if (tables.length > 0) {
      const dropTablesSQL = `DROP TABLE IF EXISTS ${tables.join(', ')} CASCADE`;
      await pool.query(dropTablesSQL);
      console.log('✅ 所有表已删除');
    }
    
    // 删除所有序列
    const sequencesResult = await pool.query(`
      SELECT sequencename 
      FROM pg_sequences 
      WHERE schemaname = 'public'
    `);
    
    const sequences = sequencesResult.rows.map(row => row.sequencename);
    if (sequences.length > 0) {
      for (const seq of sequences) {
        await pool.query(`DROP SEQUENCE IF EXISTS ${seq} CASCADE`);
      }
      console.log(`✅ 删除了 ${sequences.length} 个序列`);
    }
    
    // 删除所有函数
    const functionsResult = await pool.query(`
      SELECT proname, oidvectortypes(proargtypes) as args
      FROM pg_proc 
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND prokind = 'f'
    `);
    
    for (const func of functionsResult.rows) {
      try {
        await pool.query(`DROP FUNCTION IF EXISTS ${func.proname}(${func.args}) CASCADE`);
      } catch (error) {
        // 忽略删除函数的错误
      }
    }
    
    if (functionsResult.rows.length > 0) {
      console.log(`✅ 删除了 ${functionsResult.rows.length} 个函数`);
    }
    
    console.log('🎉 数据库重置完成！');
    console.log('💡 提示：运行 npm run init-db 重新初始化数据库');
    
  } catch (error) {
    console.error('❌ 数据库重置失败:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  resetDatabase();
}

module.exports = { resetDatabase };
