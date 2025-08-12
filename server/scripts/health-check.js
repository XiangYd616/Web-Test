#!/usr/bin/env node

/**
 * 完备的数据库健康检查工具
 * 功能: 连接检查、表结构验证、性能测试、数据完整性检查
 * 版本: 3.0 - 企业级完整版
 */

const { Pool } = require('pg');
const path = require('path');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function performHealthCheck() {
  console.log('🏥 Test Web App - 数据库健康检查');
  console.log('==================================');
  
  // 数据库配置
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'testweb_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  };

  console.log('📋 检查配置:');
  console.log(`   数据库主机: ${config.host}`);
  console.log(`   数据库端口: ${config.port}`);
  console.log(`   数据库名称: ${config.database}`);
  console.log('');

  const pool = new Pool(config);
  
  try {
    console.log('🏥 数据库健康检查...');
    console.log('🔌 连接到数据库...');
    
    const client = await pool.connect();
    console.log('✅ 数据库连接成功');

    // 1. 基本查询测试
    const startTime = Date.now();
    await client.query('SELECT 1');
    const responseTime = Date.now() - startTime;

    // 2. 表结构检查
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tableCount = parseInt(tablesResult.rows[0].count);

    // 3. 索引检查
    const indexesResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `);
    const indexCount = parseInt(indexesResult.rows[0].count);

    // 4. 用户数据检查
    let userCount = 0;
    try {
      const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
      userCount = parseInt(usersResult.rows[0].count);
    } catch (error) {
      console.warn('⚠️ 用户表检查失败:', error.message);
    }

    // 5. 系统配置检查
    let configCount = 0;
    try {
      const configResult = await client.query('SELECT COUNT(*) as count FROM system_config');
      configCount = parseInt(configResult.rows[0].count);
    } catch (error) {
      console.warn('⚠️ 系统配置表检查失败:', error.message);
    }

    // 6. 性能测试
    const perfStartTime = Date.now();
    try {
      await client.query(`
        SELECT u.username, COUNT(tr.id) as test_count
        FROM users u
        LEFT JOIN test_results tr ON u.id = tr.user_id
        GROUP BY u.id, u.username
        LIMIT 5
      `);
    } catch (error) {
      // 如果表不存在，忽略错误
    }
    const complexQueryTime = Date.now() - perfStartTime;

    client.release();

    // 显示结果
    console.log('✅ 数据库连接正常');
    console.log(`📊 发现 ${tableCount} 个表 (预期: 37+)`);
    console.log(`📈 发现 ${indexCount} 个索引 (预期: 135+)`);
    console.log(`👥 发现 ${userCount} 个用户`);
    console.log(`⚙️ 发现 ${configCount} 个配置项`);
    console.log(`⚡ 基本查询响应时间: ${responseTime}ms`);
    console.log(`🔍 复杂查询响应时间: ${complexQueryTime}ms`);
    console.log('');
    console.log('📋 健康检查结果:');
    console.log('==================');
    console.log('🔌 连接状态: ✅ 正常');
    
    const tableStatus = tableCount >= 37 ? '✅ 正常' : tableCount > 0 ? '⚠️ 部分' : '❌ 缺失';
    console.log(`🏗️ 表结构: ${tableStatus}`);
    
    const indexStatus = indexCount >= 135 ? '✅ 正常' : indexCount > 0 ? '⚠️ 部分' : '❌ 缺失';
    console.log(`📈 索引: ${indexStatus}`);
    
    console.log(`📝 数据: ${userCount > 0 ? '✅ 正常' : '⚠️ 空'}`);
    
    const perfStatus = responseTime < 50 ? '✅ 优秀' : responseTime < 200 ? '✅ 良好' : '⚠️ 慢';
    console.log(`⚡ 性能: ${perfStatus} (${responseTime}ms)`);
    
    // 总体状态
    const hasErrors = tableCount === 0 || indexCount === 0;
    const hasWarnings = tableCount < 37 || indexCount < 135 || responseTime > 200;
    
    let overallStatus;
    if (hasErrors) {
      overallStatus = '❌ 不健康';
    } else if (hasWarnings) {
      overallStatus = '⚠️ 警告';
    } else {
      overallStatus = '✅ 健康';
    }
    
    console.log(`🎯 整体状态: ${overallStatus}`);

    // 建议
    if (tableCount < 37) {
      console.log('');
      console.log('💡 建议:');
      console.log('   - 运行数据库初始化: npm run db:init');
    }

    return {
      status: hasErrors ? 'unhealthy' : hasWarnings ? 'warning' : 'healthy',
      connection: true,
      tables: tableCount,
      indexes: indexCount,
      users: userCount,
      configs: configCount,
      responseTime: responseTime,
      complexQueryTime: complexQueryTime,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ 数据库健康检查失败:', error.message);
    return {
      status: 'unhealthy',
      connection: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  } finally {
    await pool.end();
  }
}

// 运行健康检查
if (require.main === module) {
  performHealthCheck()
    .then(result => {
      const exitCode = result.status === 'healthy' ? 0 : 
                      result.status === 'warning' ? 1 : 2;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ 健康检查执行失败:', error);
      process.exit(2);
    });
}

module.exports = { performHealthCheck };
