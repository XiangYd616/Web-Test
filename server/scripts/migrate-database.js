#!/usr/bin/env node

/**
 * 数据库迁移脚本
 * 用于执行数据库架构优化和迁移
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// 数据库连接配置
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'testweb_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 执行SQL文件
async function executeSqlFile(filePath, description) {
  try {
    log(`\n📄 执行 ${description}...`, 'blue');
    
    const sql = fs.readFileSync(filePath, 'utf8');
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      
      log(`✅ ${description} 执行成功`, 'green');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    log(`❌ ${description} 执行失败: ${error.message}`, 'red');
    throw error;
  }
}

// 检查数据库连接
async function checkConnection() {
  try {
    log('🔗 检查数据库连接...', 'blue');
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    client.release();
    
    log(`✅ 数据库连接成功`, 'green');
    log(`📊 PostgreSQL版本: ${result.rows[0].version}`, 'cyan');
    return true;
  } catch (error) {
    log(`❌ 数据库连接失败: ${error.message}`, 'red');
    return false;
  }
}

// 备份现有数据
async function backupExistingData() {
  try {
    log('\n💾 备份现有数据...', 'blue');
    
    const client = await pool.connect();
    
    // 检查是否存在现有表
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'test_results', 'stress_test_results')
    `);
    
    if (tableCheck.rows.length > 0) {
      log(`📋 发现 ${tableCheck.rows.length} 个现有表`, 'yellow');
      
      // 创建备份表
      for (const row of tableCheck.rows) {
        const tableName = row.table_name;
        const backupTableName = `${tableName}_backup_${Date.now()}`;
        
        await client.query(`CREATE TABLE ${backupTableName} AS SELECT * FROM ${tableName}`);
        log(`📦 已备份 ${tableName} -> ${backupTableName}`, 'cyan');
      }
    } else {
      log('📋 未发现现有表，跳过备份', 'yellow');
    }
    
    client.release();
    log('✅ 数据备份完成', 'green');
  } catch (error) {
    log(`❌ 数据备份失败: ${error.message}`, 'red');
    throw error;
  }
}

// 验证迁移结果
async function validateMigration() {
  try {
    log('\n🔍 验证迁移结果...', 'blue');
    
    const client = await pool.connect();
    
    // 检查核心表是否存在
    const coreTablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'users', 'test_results', 'seo_test_details', 'performance_test_details',
        'security_test_details', 'api_test_details', 'compatibility_test_details',
        'accessibility_test_details', 'stress_test_details', 'test_artifacts',
        'system_config', 'engine_status'
      )
      ORDER BY table_name
    `);
    
    log(`📊 核心表数量: ${coreTablesCheck.rows.length}/12`, 'cyan');
    
    // 检查索引
    const indexCheck = await client.query(`
      SELECT COUNT(*) as index_count
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `);
    
    log(`📈 索引数量: ${indexCheck.rows[0].index_count}`, 'cyan');
    
    // 检查视图
    const viewCheck = await client.query(`
      SELECT COUNT(*) as view_count
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `);
    
    log(`👁️ 视图数量: ${viewCheck.rows[0].view_count}`, 'cyan');
    
    // 检查函数
    const functionCheck = await client.query(`
      SELECT COUNT(*) as function_count
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
    `);
    
    log(`⚙️ 函数数量: ${functionCheck.rows[0].function_count}`, 'cyan');
    
    // 检查系统配置
    const configCheck = await client.query(`
      SELECT COUNT(*) as config_count
      FROM system_config
    `);
    
    log(`🔧 系统配置数量: ${configCheck.rows[0].config_count}`, 'cyan');
    
    // 检查引擎状态
    const engineCheck = await client.query(`
      SELECT engine_type, status
      FROM engine_status
      ORDER BY engine_type
    `);
    
    log(`🚀 测试引擎状态:`, 'cyan');
    engineCheck.rows.forEach(row => {
      const statusColor = row.status === 'healthy' ? 'green' : 'yellow';
      log(`   ${row.engine_type}: ${row.status}`, statusColor);
    });
    
    client.release();
    log('✅ 迁移验证完成', 'green');
    
    return true;
  } catch (error) {
    log(`❌ 迁移验证失败: ${error.message}`, 'red');
    return false;
  }
}

// 显示性能建议
async function showPerformanceRecommendations() {
  try {
    log('\n💡 性能优化建议:', 'magenta');
    
    const client = await pool.connect();
    const recommendations = await client.query('SELECT * FROM get_performance_recommendations()');
    
    recommendations.rows.forEach(rec => {
      log(`\n📋 ${rec.category}: ${rec.recommendation}`, 'cyan');
      log(`   当前值: ${rec.current_value}`, 'yellow');
      log(`   建议值: ${rec.suggested_value}`, 'green');
    });
    
    client.release();
  } catch (error) {
    log(`⚠️ 无法获取性能建议: ${error.message}`, 'yellow');
  }
}

// 主迁移函数
async function runMigration() {
  const startTime = Date.now();
  
  try {
    log('🚀 开始数据库迁移...', 'bright');
    log('=' .repeat(50), 'blue');
    
    // 1. 检查数据库连接
    const connected = await checkConnection();
    if (!connected) {
      process.exit(1);
    }
    
    // 2. 备份现有数据
    await backupExistingData();
    
    // 3. 执行主要架构迁移
    await executeSqlFile(
      path.join(__dirname, 'optimized-database-schema.sql'),
      '优化数据库架构'
    );
    
    // 4. 执行性能优化
    await executeSqlFile(
      path.join(__dirname, 'database-performance-optimization.sql'),
      '数据库性能优化'
    );
    
    // 5. 验证迁移结果
    const validated = await validateMigration();
    if (!validated) {
      throw new Error('迁移验证失败');
    }
    
    // 6. 显示性能建议
    await showPerformanceRecommendations();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log('\n' + '=' .repeat(50), 'green');
    log(`🎉 数据库迁移成功完成! 耗时: ${duration}秒`, 'bright');
    log('=' .repeat(50), 'green');
    
    log('\n📋 下一步操作:', 'magenta');
    log('1. 重启应用服务器', 'cyan');
    log('2. 运行应用测试', 'cyan');
    log('3. 监控数据库性能', 'cyan');
    log('4. 定期执行维护: SELECT perform_maintenance();', 'cyan');
    
  } catch (error) {
    log('\n❌ 迁移失败!', 'red');
    log(`错误信息: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 命令行参数处理
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('数据库迁移脚本', 'bright');
  log('\n用法:', 'cyan');
  log('  node migrate-database.js [选项]', 'white');
  log('\n选项:', 'cyan');
  log('  --help, -h     显示帮助信息', 'white');
  log('  --dry-run      仅检查连接，不执行迁移', 'white');
  log('  --backup-only  仅备份数据', 'white');
  log('  --validate     仅验证现有架构', 'white');
  process.exit(0);
}

if (args.includes('--dry-run')) {
  log('🔍 执行连接检查...', 'blue');
  checkConnection().then(() => {
    log('✅ 连接检查完成', 'green');
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
} else if (args.includes('--backup-only')) {
  log('💾 执行数据备份...', 'blue');
  checkConnection().then(async () => {
    await backupExistingData();
    await pool.end();
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
} else if (args.includes('--validate')) {
  log('🔍 执行架构验证...', 'blue');
  checkConnection().then(async () => {
    await validateMigration();
    await pool.end();
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
} else {
  // 执行完整迁移
  runMigration();
}

// 优雅退出处理
process.on('SIGINT', async () => {
  log('\n⚠️ 收到中断信号，正在安全退出...', 'yellow');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('\n⚠️ 收到终止信号，正在安全退出...', 'yellow');
  await pool.end();
  process.exit(0);
});
