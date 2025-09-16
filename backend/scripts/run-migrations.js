#!/usr/bin/env node
/**
 * 数据库迁移管理脚本
 * 用于运行、回滚和管理数据库迁移
 */

const path = require('path');
const fs = require('fs');
const { sequelize } = require('../database/sequelize');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * 迁移状态表，用于跟踪已执行的迁移
 */
const createMigrationsTable = async () => {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time INTEGER
      );
    `);
    console.log('✅ 迁移状态表已准备');
  } catch (error) {
    console.error('❌ 创建迁移状态表失败:', error);
    throw error;
  }
};

/**
 * 获取已执行的迁移列表
 */
const getExecutedMigrations = async () => {
  try {
    const [results] = await sequelize.query(
      'SELECT version FROM migrations ORDER BY executed_at ASC'
    );
    return results.map(row => row.version);
  } catch (error) {
    console.error('❌ 获取迁移记录失败:', error);
    return [];
  }
};

/**
 * 记录迁移执行
 */
const recordMigration = async (version, description, executionTime) => {
  try {
    await sequelize.query(`
      INSERT INTO migrations (version, description, execution_time)
      VALUES (:version, :description, :executionTime)
    `, {
      replacements: { version, description, executionTime }
    });
    console.log(`✅ 记录迁移: ${version}`);
  } catch (error) {
    console.error(`❌ 记录迁移失败 ${version}:`, error);
  }
};

/**
 * 移除迁移记录
 */
const removeMigrationRecord = async (version) => {
  try {
    await sequelize.query(
      'DELETE FROM migrations WHERE version = :version',
      { replacements: { version } }
    );
    console.log(`✅ 移除迁移记录: ${version}`);
  } catch (error) {
    console.error(`❌ 移除迁移记录失败 ${version}:`, error);
  }
};

/**
 * 加载迁移文件
 */
const loadMigrations = () => {
  const migrationsDir = path.join(__dirname, '../migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('📁 创建迁移目录...');
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }
  
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.js'))
    .sort();
  
  const migrations = [];
  
  for (const file of files) {
    try {
      const filePath = path.join(migrationsDir, file);
      const migration = require(filePath);
      
      if (!migration.version || !migration.up || !migration.down) {
        console.warn(`⚠️ 跳过无效迁移文件: ${file}`);
        continue;
      }
      
      migrations.push({
        file,
        ...migration
      });
    } catch (error) {
      console.error(`❌ 加载迁移文件失败 ${file}:`, error);
    }
  }
  
  return migrations.sort((a, b) => a.version.localeCompare(b.version));
};

/**
 * 执行迁移
 */
const runMigrations = async (targetVersion = null) => {
  try {
    console.log('🚀 开始数据库迁移...');
    
    // 创建迁移状态表
    await createMigrationsTable();
    
    // 加载迁移文件
    const migrations = loadMigrations();
    
    if (migrations.length === 0) {
      console.log('📝 没有找到迁移文件');
      return;
    }
    
    console.log(`📋 找到 ${migrations.length} 个迁移文件`);
    
    // 获取已执行的迁移
    const executedMigrations = await getExecutedMigrations();
    console.log(`📊 已执行 ${executedMigrations.length} 个迁移`);
    
    // 确定要执行的迁移
    let migrationsToRun = migrations.filter(
      migration => !executedMigrations.includes(migration.version)
    );
    
    if (targetVersion) {
      migrationsToRun = migrationsToRun.filter(
        migration => migration.version <= targetVersion
      );
    }
    
    if (migrationsToRun.length === 0) {
      console.log('✨ 数据库已是最新状态');
      return;
    }
    
    console.log(`🔄 将执行 ${migrationsToRun.length} 个迁移:`);
    migrationsToRun.forEach(m => console.log(`  - ${m.version}: ${m.description || 'No description'}`));
    
    // 执行迁移
    for (const migration of migrationsToRun) {
      console.log(`\n🔨 执行迁移: ${migration.version} - ${migration.description || 'No description'}`);
      
      const startTime = Date.now();
      
      try {
        await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
        
        const executionTime = Date.now() - startTime;
        await recordMigration(migration.version, migration.description, executionTime);
        
        console.log(`✅ 迁移完成: ${migration.version} (${executionTime}ms)`);
        
        // 验证迁移结果（如果有验证函数）
        if (migration.validate) {
          await migration.validate(sequelize.getQueryInterface());
        }
        
      } catch (error) {
        console.error(`❌ 迁移失败: ${migration.version}`);
        console.error(error);
        
        // 尝试回滚
        console.log(`🔄 尝试回滚迁移: ${migration.version}`);
        try {
          await migration.down(sequelize.getQueryInterface(), sequelize.Sequelize);
          console.log(`✅ 回滚成功: ${migration.version}`);
        } catch (rollbackError) {
          console.error(`❌ 回滚失败: ${migration.version}`);
          console.error(rollbackError);
        }
        
        throw error;
      }
    }
    
    console.log(`\n🎉 所有迁移执行完成！`);
    
  } catch (error) {
    console.error('❌ 迁移过程失败:', error);
    throw error;
  }
};

/**
 * 回滚迁移
 */
const rollbackMigration = async (version = null) => {
  try {
    console.log('🔄 开始迁移回滚...');
    
    // 创建迁移状态表
    await createMigrationsTable();
    
    // 加载迁移文件
    const migrations = loadMigrations();
    const executedMigrations = await getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      console.log('📝 没有可回滚的迁移');
      return;
    }
    
    let migrationToRollback;
    
    if (version) {
      // 回滚指定版本
      migrationToRollback = migrations.find(m => m.version === version);
      if (!migrationToRollback) {
        throw new Error(`找不到迁移版本: ${version}`);
      }
      if (!executedMigrations.includes(version)) {
        throw new Error(`迁移未执行: ${version}`);
      }
    } else {
      // 回滚最新的迁移
      const latestVersion = executedMigrations[executedMigrations.length - 1];
      migrationToRollback = migrations.find(m => m.version === latestVersion);
    }
    
    if (!migrationToRollback) {
      throw new Error('找不到要回滚的迁移');
    }
    
    console.log(`🔨 回滚迁移: ${migrationToRollback.version} - ${migrationToRollback.description || 'No description'}`);
    
    const startTime = Date.now();
    
    try {
      await migrationToRollback.down(sequelize.getQueryInterface(), sequelize.Sequelize);
      await removeMigrationRecord(migrationToRollback.version);
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ 回滚完成: ${migrationToRollback.version} (${executionTime}ms)`);
      
    } catch (error) {
      console.error(`❌ 回滚失败: ${migrationToRollback.version}`);
      console.error(error);
      throw error;
    }
    
  } catch (error) {
    console.error('❌ 回滚过程失败:', error);
    throw error;
  }
};

/**
 * 显示迁移状态
 */
const showStatus = async () => {
  try {
    console.log('📊 迁移状态:');
    
    await createMigrationsTable();
    
    const migrations = loadMigrations();
    const executedMigrations = await getExecutedMigrations();
    
    if (migrations.length === 0) {
      console.log('📝 没有找到迁移文件');
      return;
    }
    
    console.log('\n迁移文件状态:');
    console.log('─'.repeat(80));
    console.log('版本\t\t状态\t\t描述');
    console.log('─'.repeat(80));
    
    migrations.forEach(migration => {
      const status = executedMigrations.includes(migration.version) ? '✅ 已执行' : '⏳ 待执行';
      const description = migration.description || 'No description';
      console.log(`${migration.version}\t${status}\t${description}`);
    });
    
    console.log('─'.repeat(80));
    console.log(`总计: ${migrations.length} 个迁移，${executedMigrations.length} 个已执行\n`);
    
    // 显示执行历史
    if (executedMigrations.length > 0) {
      console.log('执行历史:');
      const [results] = await sequelize.query(`
        SELECT version, description, executed_at, execution_time 
        FROM migrations 
        ORDER BY executed_at DESC
      `);
      
      results.forEach(record => {
        const date = new Date(record.executed_at).toLocaleString();
        const time = record.execution_time ? `(${record.execution_time}ms)` : '';
        console.log(`  ${record.version}: ${date} ${time}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 获取迁移状态失败:', error);
  }
};

/**
 * 主函数
 */
const main = async () => {
  const command = process.argv[2];
  const argument = process.argv[3];
  
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    switch (command) {
      case 'up':
      case 'migrate':
        await runMigrations(argument);
        break;
        
      case 'down':
      case 'rollback':
        await rollbackMigration(argument);
        break;
        
      case 'status':
        await showStatus();
        break;
        
      case 'create':
        console.log('📝 创建迁移功能待实现');
        console.log('💡 请手动在 migrations/ 目录下创建迁移文件');
        break;
        
      default:
        console.log('数据库迁移管理工具\n');
        console.log('使用方法:');
        console.log('  node scripts/run-migrations.js <command> [argument]\n');
        console.log('命令:');
        console.log('  migrate|up [version]    执行迁移（可选：到指定版本）');
        console.log('  rollback|down [version] 回滚迁移（可选：指定版本）');
        console.log('  status                  显示迁移状态');
        console.log('  create <name>           创建新迁移（待实现）\n');
        console.log('示例:');
        console.log('  node scripts/run-migrations.js migrate     # 执行所有待执行的迁移');
        console.log('  node scripts/run-migrations.js rollback    # 回滚最新的迁移');
        console.log('  node scripts/run-migrations.js status      # 显示状态');
        break;
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
  }
};

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  runMigrations,
  rollbackMigration,
  showStatus,
  createMigrationsTable
};
