const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'testweb_dev',
  user: 'postgres',
  password: 'postgres'
});

async function addFinalField() {
  try {
    console.log('🔧 添加最后的deleted_at字段...');
    await pool.query('ALTER TABLE monitoring_sites ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE');
    console.log('✅ deleted_at字段添加成功');
    
    // 验证
    const fields = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', ['monitoring_sites']);
    console.log('📊 monitoring_sites表现在有', fields.rows.length, '个字段');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 添加字段失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addFinalField();
