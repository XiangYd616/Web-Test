#!/usr/bin/env node

/**
 * 数据库备份工具
 * 使用方法: node backup-database.js [options]
 */

const DatabaseInitializer = require('./database-initializer');
const path = require('path');
const fs = require('fs').promises;

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

class DatabaseBackupCLI {
  constructor() {
    this.args = process.argv.slice(2);
    this.options = this.parseArgs();
  }

  parseArgs() {
    const options = {
      output: null,
      compress: false,
      includeData: true,
      includeSchema: true,
      help: false,
      config: {}
    };

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];
      
      switch (arg) {
        case '--help':
        case '-h':
          options.help = true;
          break;
          
        case '--output':
        case '-o':
          options.output = this.args[++i];
          break;
          
        case '--compress':
        case '-c':
          options.compress = true;
          break;
          
        case '--schema-only':
          options.includeData = false;
          break;
          
        case '--data-only':
          options.includeSchema = false;
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
📚 数据库备份工具

使用方法:
  node backup-database.js [options]

选项:
  -h, --help              显示帮助信息
  -o, --output <file>     指定输出文件路径
  -c, --compress          压缩备份文件
  --schema-only           仅备份表结构
  --data-only             仅备份数据

数据库连接选项:
  --host <host>           数据库主机
  --port <port>           数据库端口
  --db <database>         数据库名称
  --user <username>       用户名
  --password <password>   密码

示例:
  # 完整备份
  node backup-database.js
  
  # 备份到指定文件
  node backup-database.js -o backup.sql
  
  # 仅备份表结构
  node backup-database.js --schema-only
  
  # 压缩备份
  node backup-database.js --compress
`);
  }

  async run() {
    if (this.options.help) {
      this.showHelp();
      return;
    }

    console.log('💾 Test Web App - 数据库备份工具');
    console.log('==================================');

    try {
      const initializer = new DatabaseInitializer(this.options.config);
      
      // 生成备份文件名
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
      const defaultOutput = `backup_${timestamp}.sql`;
      const outputFile = this.options.output || defaultOutput;
      
      console.log('📋 备份配置:');
      console.log(`   数据库主机: ${initializer.config.host}`);
      console.log(`   数据库端口: ${initializer.config.port}`);
      console.log(`   数据库名称: ${initializer.config.database}`);
      console.log(`   输出文件: ${outputFile}`);
      console.log(`   包含表结构: ${this.options.includeSchema ? '是' : '否'}`);
      console.log(`   包含数据: ${this.options.includeData ? '是' : '否'}`);
      console.log(`   压缩: ${this.options.compress ? '是' : '否'}`);
      console.log('');

      // 执行备份
      const result = await this.performBackup(initializer, outputFile);
      
      if (result.success) {
        console.log('');
        console.log('✅ 数据库备份成功！');
        console.log(`📁 备份文件: ${result.file}`);
        
        // 显示文件信息
        try {
          const stats = await fs.stat(result.file);
          console.log(`📊 文件大小: ${this.formatFileSize(stats.size)}`);
          console.log(`📅 创建时间: ${stats.birthtime.toLocaleString()}`);
        } catch (error) {
          console.warn('⚠️ 无法获取文件信息:', error.message);
        }
        
        console.log('');
        console.log('💡 恢复备份:');
        console.log(`   node server/scripts/restore-database.js ${result.file}`);
      } else {
        console.error('❌ 数据库备份失败');
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ 备份过程中发生错误:', error.message);
      
      if (process.env.NODE_ENV === 'development') {
        console.error('详细错误信息:');
        console.error(error);
      }
      
      process.exit(1);
    }
  }

  async performBackup(initializer, outputFile) {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const args = [
        '-h', initializer.config.host,
        '-p', initializer.config.port,
        '-U', initializer.config.username,
        '-d', initializer.config.database,
        '-f', outputFile,
        '--verbose'
      ];

      // 添加选项
      if (!this.options.includeData) {
        args.push('--schema-only');
      }
      
      if (!this.options.includeSchema) {
        args.push('--data-only');
      }
      
      if (this.options.compress) {
        args.push('--compress');
      }

      console.log('🔄 开始备份...');
      
      const pgDump = spawn('pg_dump', args, {
        env: { ...process.env, PGPASSWORD: initializer.config.password }
      });

      let output = '';
      let errorOutput = '';

      pgDump.stdout.on('data', (data) => {
        output += data.toString();
      });

      pgDump.stderr.on('data', (data) => {
        errorOutput += data.toString();
        // pg_dump 的进度信息通常输出到 stderr
        if (data.toString().includes('dumping')) {
          process.stdout.write('.');
        }
      });

      pgDump.on('close', (code) => {
        console.log(''); // 换行
        
        if (code === 0) {
          resolve({ success: true, file: outputFile });
        } else {
          reject(new Error(`备份失败，退出码: ${code}\n${errorOutput}`));
        }
      });

      pgDump.on('error', (error) => {
        reject(new Error(`备份失败: ${error.message}`));
      });
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
  const cli = new DatabaseBackupCLI();
  cli.run().catch(error => {
    console.error('❌ 未处理的错误:', error);
    process.exit(1);
  });
}

module.exports = DatabaseBackupCLI;
