/**
 * 权威数据库初始化脚本
 * 使用单一架构文件重置并初始化数据库
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'testweb_dev',
  user: 'postgres',
  password: 'postgres'
});

async function initializeDatabase() {
  try {
    console.log('🚀 开始数据库初始化...\n');
    
    // 1. 测试连接
    console.log('🔌 测试数据库连接...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log(`✅ 数据库连接成功`);
    console.log(`⏰ 服务器时间: ${result.rows[0].current_time}`);
    client.release();
    
    // 2. 重置数据库架构
    console.log('\n🗑️ 重置数据库架构...');
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await pool.query('GRANT ALL ON SCHEMA public TO postgres');
    await pool.query('GRANT ALL ON SCHEMA public TO public');
    console.log('✅ 数据库架构已重置');
    
    // 3. 执行权威架构脚本
    console.log('\n📄 读取权威数据库架构...');
    const schemaPath = path.join(__dirname, 'database-schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`架构文件不存在: ${schemaPath}`);
    }
    
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log(`📄 架构文件大小: ${(schemaSql.length / 1024).toFixed(2)} KB`);
    
    console.log('🔧 执行数据库架构创建...');
    await pool.query(schemaSql);
    console.log('✅ 数据库架构创建完成');
    
    // 4. 创建测试用户
    console.log('\n👤 创建测试用户...');
    const hashedPassword = await bcrypt.hash('123456', 12);
    
    await pool.query(`
      INSERT INTO users (username, email, password_hash, role, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['testuser', 'test@example.com', hashedPassword, 'user', true, true]);
    
    console.log('✅ 测试用户创建完成');
    
    // 5. 验证表结构
    console.log('\n📋 验证表结构...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('创建的表:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // 6. 验证users表字段
    console.log('\n👤 users表字段验证:');
    const usersColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    const criticalFields = ['password_hash', 'failed_login_attempts', 'reset_token'];
    criticalFields.forEach(field => {
      const found = usersColumns.rows.find(row => row.column_name === field);
      if (found) {
        console.log(`  ✓ ${field}: ${found.data_type}`);
      } else {
        console.log(`  ❌ 缺少字段: ${field}`);
      }
    });
    
    console.log('\n🎉 数据库初始化完成！');
    console.log('\n📝 测试账户信息:');
    console.log('  邮箱: test@example.com');
    console.log('  密码: 123456');
    console.log('\n🔗 现在可以启动服务器并测试登录功能');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    if (error.detail) {
      console.error('详细错误:', error.detail);
    }
    process.exit(1);
  } finally {
    pool.end();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
