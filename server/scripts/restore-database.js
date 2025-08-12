#!/usr/bin/env node

/**
 * 数据库恢复工具
 * 使用方法: node restore-database.js <backup-file> [options]
 */

const DatabaseInitializer = require('./database-initializer');
const path = require('path');
const fs = require('fs').promises;

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

class DatabaseRestoreCLI {
  constructor() {
    this.args = process.argv.slice(2);
    this.backupFile = this.args[0];
    this.options = this.parseArgs();
  }

  parseArgs() {
    const options = {
      force: false,
      clean: false,
      help: false,
      config: {}
    };

    for (let i = 1; i < this.args.length; i++) {
      const arg = this.args[i];
      
      switch (arg) {
        case '--help':
        case '-h':
          options.help = true;
          break;
          
        case '--force':
        case '-f':
          options.force = true;
          break;
          
        case '--clean':
        case '-c':
          options.clean = true;
          break;
          
        case '--host':
          options.config.host = this.args[++i];
          break;
          
        case '--port':
          options.config.port = parseInt(this.args[++i]);
          break;
          
        case '--database':
        case '--db':
          options.config.database = this.args[++i];
          break;
          
        case '--username':
        case '--user':
          options.config.username = this.args[++i];
          break;
          
        case '--password':
          options.config.password = this.args[++i];
          break;
          
        default:
          if (arg.startsWith('--')) {
            console.warn(`⚠️ 未知选项: ${arg}`);
          }
          break;
      }
    }

    return options;
  }

  showHelp() {
    console.log(`
📚 数据库恢复工具

使用方法:
  node restore-database.js <backup-file> [options]

参数:
  backup-file             备份文件路径

选项:
  -h, --help              显示帮助信息
  -f, --force             强制恢复（不询问确认）
  -c, --clean             恢复前清理现有数据

数据库连接选项:
  --host <host>           数据库主机
  --port <port>           数据库端口
  --db <database>         数据库名称
  --user <username>       用户名
  --password <password>   密码

示例:
  # 恢复备份
  node restore-database.js backup.sql
  
  # 强制恢复（不询问确认）
  node restore-database.js backup.sql --force
  
  # 清理后恢复
  node restore-database.js backup.sql --clean
`);
  }

  async run() {
    if (this.options.help || !this.backupFile) {
      this.showHelp();
      if (!this.backupFile) {
        console.error('\n❌ 错误: 请指定备份文件路径');
        process.exit(1);
      }
      return;
    }

    console.log('📥 Test Web App - 数据库恢复工具');
    console.log('==================================');

    try {
      // 检查备份文件是否存在
      await this.validateBackupFile();
      
      const initializer = new DatabaseInitializer(this.options.config);
      
      console.log('📋 恢复配置:');
      console.log(`   数据库主机: ${initializer.config.host}`);
      console.log(`   数据库端口: ${initializer.config.port}`);
      console.log(`   数据库名称: ${initializer.config.database}`);
      console.log(`   备份文件: ${this.backupFile}`);
      console.log(`   强制恢复: ${this.options.force ? '是' : '否'}`);
      console.log(`   清理现有数据: ${this.options.clean ? '是' : '否'}`);
      console.log('');

      // 显示备份文件信息
      await this.showBackupInfo();

      // 确认恢复操作
      if (!this.options.force) {
        await this.confirmRestore();
      }

      // 执行恢复
      const result = await this.performRestore(initializer);
      
      if (result.success) {
        console.log('');
        console.log('✅ 数据库恢复成功！');
        console.log('');
        console.log('💡 下一步:');
        console.log('   1. 重启应用服务');
        console.log('   2. 验证数据完整性');
        console.log('   3. 检查应用功能');
      } else {
        console.error('❌ 数据库恢复失败');
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ 恢复过程中发生错误:', error.message);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('详细错误信息:');
        console.error(error);
      }
      
      process.exit(1);
    }
  }

  async validateBackupFile() {
    try {
      const stats = await fs.stat(this.backupFile);
      if (!stats.isFile()) {
        throw new Error('指定的路径不是文件');
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`备份文件不存在: ${this.backupFile}`);
      }
      throw new Error(`无法访问备份文件: ${error.message}`);
    }
  }

  async showBackupInfo() {
    try {
      const stats = await fs.stat(this.backupFile);
      console.log('📊 备份文件信息:');
      console.log(`   文件大小: ${this.formatFileSize(stats.size)}`);
      console.log(`   创建时间: ${stats.birthtime.toLocaleString()}`);
      console.log(`   修改时间: ${stats.mtime.toLocaleString()}`);
      console.log('');
    } catch (error) {
      console.warn('⚠️ 无法获取备份文件信息:', error.message);
    }
  }

  async confirmRestore() {
    console.log('⚠️ 警告: 恢复操作将覆盖现有数据库内容！');
    
    if (this.options.clean) {
      console.log('⚠️ 警告: 将清理所有现有数据！');
    }
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('确认继续恢复？输入 "yes" 确认: ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ 操作已取消');
      process.exit(0);
    }
  }

  async performRestore(initializer) {
    const { spawn } = require('child_process');
    
    return new Promise(async (resolve, reject) => {
      try {
        // 如果需要清理，先重置数据库
        if (this.options.clean) {
          console.log('🧹 清理现有数据...');
          await initializer.reset();
        }

        const args = [
          '-h', initializer.config.host,
          '-p', initializer.config.port,
          '-U', initializer.config.username,
          '-d', initializer.config.database,
          '-f', this.backupFile,
          '--verbose'
        ];

        console.log('🔄 开始恢复...');
        
        const psql = spawn('psql', args, {
          env: { ...process.env, PGPASSWORD: initializer.config.password }
        });

        let output = '';
        let errorOutput = '';

        psql.stdout.on('data', (data) => {
          output += data.toString();
        });

        psql.stderr.on('data', (data) => {
          errorOutput += data.toString();
          // 显示进度
          if (data.toString().includes('COPY') || data.toString().includes('CREATE')) {
            process.stdout.write('.');
          }
        });

        psql.on('close', (code) => {
          console.log(''); // 换行
          
          if (code === 0) {
            resolve({ success: true });
          } else {
            reject(new Error(`恢复失败，退出码: ${code}\n${errorOutput}`));
          }
        });

        psql.on('error', (error) => {
          reject(new Error(`恢复失败: ${error.message}`));
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 运行CLI
if (require.main === module) {
  const cli = new DatabaseRestoreCLI();
  cli.run().catch(error => {
    console.error('❌ 未处理的错误:', error);
    process.exit(1);
  });
}

module.exports = DatabaseRestoreCLI;
