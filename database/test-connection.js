#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

// ES模块中获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量 - 优先使用 server/.env
const envPaths = [
  path.join(__dirname, '..', 'server', '.env'),  // server/.env (主配置)
  path.join(__dirname, '.env'),                   // database/.env (备用)
  path.join(__dirname, '..', '.env')              // 根目录 .env (最后备用)
];

// 按优先级加载环境变量
envPaths.forEach(envPath => {
  dotenv.config({ path: envPath, override: false });
});

console.log('🔍 数据库连接测试\n');

// 显示配置信息（隐藏密码）
console.log('📋 连接配置:');
console.log(`   主机: ${process.env.DB_HOST || 'localhost'}`);
console.log(`   端口: ${process.env.DB_PORT || 5432}`);
console.log(`   数据库: ${process.env.DB_NAME || 'test_platform'}`);
console.log(`   用户: ${process.env.DB_USER || 'postgres'}`);
console.log(`   密码: ${process.env.DB_PASSWORD ? '***已设置***' : '未设置'}`);
console.log(`   SSL: ${process.env.DB_SSL || 'false'}\n`);

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'test_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 1, // 只需要一个连接用于测试
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

const pool = new Pool(dbConfig);

async function testConnection() {
  try {
    console.log('🔌 正在连接数据库...');
    const client = await pool.connect();

    console.log('✅ 数据库连接成功！');

    // 测试查询
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log(`⏰ 当前时间: ${result.rows[0].current_time}`);
    console.log(`🗄️  数据库版本: ${result.rows[0].db_version.split(' ')[0]} ${result.rows[0].db_version.split(' ')[1]}`);

    // 检查数据库是否存在表
    const tablesResult = await client.query(`
      SELECT count(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`📋 现有表数量: ${tablesResult.rows[0].table_count}`);

    client.release();

    console.log('\n🎉 数据库连接测试成功！');
    return true;

  } catch (err) {
    console.error('❌ 数据库连接失败:');
    console.error(`   错误类型: ${err.code || 'UNKNOWN'}`);
    console.error(`   错误信息: ${err.message}`);

    if (err.code === 'ECONNREFUSED') {
      console.log('\n💡 解决建议:');
      console.log('   1. 确保PostgreSQL服务正在运行');
      console.log('   2. 检查主机和端口配置');
      console.log('   3. 检查防火墙设置');
    } else if (err.code === '28P01') {
      console.log('\n💡 解决建议:');
      console.log('   1. 检查用户名和密码是否正确');
      console.log('   2. 确保用户有访问数据库的权限');
      console.log('   3. 检查pg_hba.conf配置');
    } else if (err.code === '3D000') {
      console.log('\n💡 解决建议:');
      console.log('   1. 数据库不存在，需要先创建数据库');
      console.log('   2. 运行: createdb test_platform');
    }

    return false;
  } finally {
    await pool.end();
  }
}

// 运行测试
testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
