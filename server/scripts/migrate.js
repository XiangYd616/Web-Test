#!/usr/bin/env node

/**
 * 数据库迁移命令行工具
 * 使用方法:
 * node migrate.js [command] [options]
 */

const MigrationManager = require('./migration-manager');
const path = require('path');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

class MigrationCLI {
  constructor() {
    this.args = process.argv.slice(2);
    this.command = this.args[0] || 'help';
    this.options = this.parseOptions();
  }

  parseOptions() {
    const options = {};
    
    for (let i = 1; i < this.args.length; i++) {
      const arg = this.args[i];
      
      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const value = this.args[i + 1];
        
        if (value && !value.startsWith('--')) {
          options[key] = value;
          i++; // 跳过值
        } else {
          options[key] = true;
        }
      }
    }
    
    return options;
  }

  showHelp() {
    console.log(`
📚 数据库迁移工具

使用方法:
  node migrate.js <command> [options]

命令:
  help                    显示帮助信息
  status                  显示迁移状态
  migrate                 执行所有待执行的迁移
  rollback <name>         回滚指定的迁移
  create <name> [type]    创建新的迁移文件
  
选项:
  --host <host>           数据库主机
  --port <port>           数据库端口
  --database <db>         数据库名称
  --user <username>       数据库用户
  --password <password>   数据库密码

示例:
  # 查看迁移状态
  node migrate.js status
  
  # 执行所有待执行的迁移
  node migrate.js migrate
  
  # 创建新的SQL迁移
  node migrate.js create add_user_preferences
  
  # 创建新的JavaScript迁移
  node migrate.js create add_indexes js
  
  # 回滚指定迁移
  node migrate.js rollback 20231201120000_add_user_preferences
`);
  }

  async run() {
    try {
      const manager = new MigrationManager(this.getDbConfig());

      switch (this.command) {
        case 'help':
          this.showHelp();
          break;
          
        case 'status':
          await this.showStatus(manager);
          break;
          
        case 'migrate':
          await this.runMigrations(manager);
          break;
          
        case 'rollback':
          await this.rollbackMigration(manager);
          break;
          
        case 'create':
          await this.createMigration(manager);
          break;
          
        default:
          console.error(`❌ 未知命令: ${this.command}`);
          this.showHelp();
          process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ 执行失败:', error.message);
      
      if (process.env.NODE_ENV === 'development') {
        console.error(error);
      }
      
      process.exit(1);
    }
  }

  getDbConfig() {
    return {
      host: this.options.host || process.env.DB_HOST,
      port: this.options.port || process.env.DB_PORT,
      database: this.options.database || process.env.DB_NAME,
      user: this.options.user || process.env.DB_USER,
      password: this.options.password || process.env.DB_PASSWORD
    };
  }

  async showStatus(manager) {
    console.log('📊 数据库迁移状态');
    console.log('==================');

    const status = await manager.getStatus();
    
    console.log(`总迁移数: ${status.total}`);
    console.log(`已执行: ${status.executed}`);
    console.log(`待执行: ${status.pending}`);
    console.log(`失败: ${status.failed}`);
    console.log('');

    if (status.migrations.executed.length > 0) {
      console.log('✅ 已执行的迁移:');
      status.migrations.executed.forEach(migration => {
        const statusIcon = migration.status === 'completed' ? '✅' : 
                          migration.status === 'failed' ? '❌' : '🔄';
        console.log(`   ${statusIcon} ${migration.migration_name} (${migration.executed_at || 'N/A'})`);
      });
      console.log('');
    }

    if (status.migrations.pending.length > 0) {
      console.log('⏳ 待执行的迁移:');
      status.migrations.pending.forEach(migration => {
        console.log(`   📄 ${migration.name} (${migration.type})`);
      });
      console.log('');
    }

    await manager.disconnect();
  }

  async runMigrations(manager) {
    console.log('🚀 执行数据库迁移');
    console.log('==================');

    const result = await manager.migrate();
    
    if (result.success) {
      if (result.executed > 0) {
        console.log(`✅ 成功执行 ${result.executed} 个迁移`);
      } else {
        console.log('✅ 没有待执行的迁移');
      }
    }

    await manager.disconnect();
  }

  async rollbackMigration(manager) {
    const migrationName = this.args[1];
    
    if (!migrationName) {
      console.error('❌ 请指定要回滚的迁移名称');
      console.log('使用方法: node migrate.js rollback <migration_name>');
      return;
    }

    console.log(`🔄 回滚迁移: ${migrationName}`);
    console.log('==================');

    await manager.rollback(migrationName);
    console.log('✅ 迁移回滚完成');

    await manager.disconnect();
  }

  async createMigration(manager) {
    const migrationName = this.args[1];
    const migrationType = this.args[2] || 'sql';
    
    if (!migrationName) {
      console.error('❌ 请指定迁移名称');
      console.log('使用方法: node migrate.js create <name> [type]');
      return;
    }

    if (!['sql', 'js'].includes(migrationType)) {
      console.error('❌ 迁移类型必须是 sql 或 js');
      return;
    }

    console.log(`📝 创建迁移: ${migrationName} (${migrationType})`);
    console.log('==================');

    const result = await manager.createMigration(migrationName, migrationType);
    
    console.log(`✅ 迁移文件已创建: ${result.filename}`);
    console.log(`📁 文件路径: ${result.filepath}`);
    console.log('');
    console.log('💡 下一步:');
    console.log('   1. 编辑迁移文件添加你的更改');
    console.log('   2. 运行 node migrate.js migrate 执行迁移');

    await manager.disconnect();
  }
}

// 运行CLI
if (require.main === module) {
  const cli = new MigrationCLI();
  cli.run().catch(error => {
    console.error('❌ 未处理的错误:', error);
    process.exit(1);
  });
}

module.exports = MigrationCLI;
