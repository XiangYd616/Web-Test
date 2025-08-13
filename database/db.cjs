#!/usr/bin/env node

/**
 * 统一测试平台数据库管理工具
 * 版本: 2.0 - 完整统一版
 * 支持: 初始化、状态检查、重置、迁移
 * 测试类型: api, compatibility, infrastructure, security, seo, stress, ux, website
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'testweb_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    };
    this.client = null;
  }

  async connect() {
    try {
      this.client = new Client(this.config);
      await this.client.connect();
      console.log('✅ PostgreSQL连接成功');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      console.log('✅ 数据库连接已关闭');
    }
  }

  async executeFile(filePath, description) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    console.log(`📋 ${description}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    await this.client.query(sql);
    console.log(`✅ ${description}完成`);
  }

  async init() {
    try {
      console.log('🚀 开始初始化数据库...');
      await this.connect();
      
      // 应用schema
      await this.executeFile(
        path.join(__dirname, 'schema.sql'),
        '应用数据库架构'
      );
      
      // 插入初始数据
      await this.executeFile(
        path.join(__dirname, 'initial-data.sql'),
        '插入初始数据'
      );
      
      console.log('🎉 数据库初始化成功！');
      
    } catch (error) {
      console.error('❌ 初始化失败:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async status() {
    try {
      console.log('📊 检查数据库状态...');
      await this.connect();
      
      // 检查表数量
      const tablesResult = await this.client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      console.log(`📋 数据库包含 ${tablesResult.rows.length} 个表:`);
      
      // 检查每个表的记录数
      for (const table of tablesResult.rows) {
        try {
          const countResult = await this.client.query(`SELECT COUNT(*) FROM ${table.table_name}`);
          console.log(`   ${table.table_name}: ${countResult.rows[0].count} 行`);
        } catch (error) {
          console.log(`   ${table.table_name}: 查询失败`);
        }
      }
      
      // 检查关键表
      console.log('\n🔍 检查关键表:');
      const keyTables = ['users', 'test_sessions', 'test_results', 'user_test_stats'];
      for (const tableName of keyTables) {
        try {
          const result = await this.client.query(`SELECT COUNT(*) FROM ${tableName}`);
          console.log(`   ✅ ${tableName}: ${result.rows[0].count} 行`);
        } catch (error) {
          console.log(`   ❌ ${tableName}: 不存在或查询失败`);
        }
      }
      
      // 检查测试类型支持
      console.log('\n🔍 检查测试类型支持:');
      try {
        const testTypesResult = await this.client.query(`
          SELECT DISTINCT test_type, COUNT(*) as count 
          FROM user_test_stats 
          GROUP BY test_type 
          ORDER BY test_type
        `);
        
        if (testTypesResult.rows.length > 0) {
          testTypesResult.rows.forEach(row => {
            console.log(`   ✅ ${row.test_type}: ${row.count} 个用户`);
          });
        } else {
          console.log('   暂无测试统计记录');
        }
      } catch (error) {
        console.log('   ❌ 无法查询测试类型统计');
      }
      
    } catch (error) {
      console.error('❌ 状态检查失败:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async reset() {
    try {
      console.log('⚠️ 开始重置数据库...');
      console.log('⚠️ 这将删除所有数据！');
      
      await this.connect();
      
      // 删除所有表
      const result = await this.client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
      `);

      for (const table of result.rows) {
        console.log(`🗑️ 删除表: ${table.table_name}`);
        await this.client.query(`DROP TABLE IF EXISTS ${table.table_name} CASCADE`);
      }

      console.log('🗑️ 所有表已删除');
      await this.disconnect();
      
      // 重新初始化
      await this.init();
      
      console.log('🎉 数据库重置完成！');
      
    } catch (error) {
      console.error('❌ 重置失败:', error.message);
      throw error;
    }
  }
}

// 命令行接口
async function main() {
  const command = process.argv[2];
  const manager = new DatabaseManager();
  
  try {
    switch (command) {
      case 'init':
        await manager.init();
        break;
      case 'status':
        await manager.status();
        break;
      case 'reset':
        await manager.reset();
        break;
      default:
        console.log('使用方法:');
        console.log('  node db.cjs init   - 初始化数据库');
        console.log('  node db.cjs status - 检查数据库状态');
        console.log('  node db.cjs reset  - 重置数据库（危险操作）');
        process.exit(1);
    }
    
    console.log('✅ 操作完成');
    process.exit(0);
    
  } catch (error) {
    console.error('执行失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseManager;
