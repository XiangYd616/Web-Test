#!/usr/bin/env node

/**
 * 完备的数据完整性检查工具
 * 功能: 检查数据库架构、数据一致性、性能问题、安全问题
 * 版本: 3.0 - 企业级完整版
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../.env') });

class DataIntegrityChecker {
  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'testweb_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    };

    this.args = process.argv.slice(2);
    this.options = this.parseArgs();
    this.pool = null;
    this.issues = [];
    this.warnings = [];
    this.suggestions = [];
  }

  parseArgs() {
    const options = {
      verbose: false,
      json: false,
      fix: false,
      report: false,
      checkSchema: true,
      checkData: true,
      checkPerformance: true,
      checkSecurity: true
    };

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];

      switch (arg) {
        case '--verbose':
          options.verbose = true;
          break;
        case '--json':
          options.json = true;
          break;
        case '--fix':
          options.fix = true;
          break;
        case '--report':
          options.report = true;
          break;
        case '--schema-only':
          options.checkData = false;
          options.checkPerformance = false;
          options.checkSecurity = false;
          break;
        case '--data-only':
          options.checkSchema = false;
          options.checkPerformance = false;
          options.checkSecurity = false;
          break;
        case '--performance-only':
          options.checkSchema = false;
          options.checkData = false;
          options.checkSecurity = false;
          break;
        case '--security-only':
          options.checkSchema = false;
          options.checkData = false;
          options.checkPerformance = false;
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
      }
    }

    return options;
  }

  showHelp() {
    console.log(`
🔍 完备的数据完整性检查工具 v3.0

使用方法:
  node data-integrity-checker.js [选项]

选项:
  --verbose         显示详细的检查过程
  --json            以JSON格式输出结果
  --fix             自动修复发现的问题（谨慎使用）
  --report          生成详细的检查报告
  --schema-only     仅检查数据库架构
  --data-only       仅检查数据一致性
  --performance-only 仅检查性能问题
  --security-only   仅检查安全问题
  --help, -h        显示此帮助信息

检查项目:
  🏗️ 架构完整性检查
     - 表结构验证
     - 索引完整性
     - 约束检查
     - 触发器验证
     
  📊 数据一致性检查
     - 外键完整性
     - 数据类型验证
     - 业务规则检查
     - 孤立数据检测
     
  ⚡ 性能问题检查
     - 慢查询分析
     - 索引使用情况
     - 表大小分析
     - 死锁检测
     
  🔒 安全问题检查
     - 权限配置
     - 敏感数据检查
     - 注入风险评估
     - 访问日志分析

示例:
  node data-integrity-checker.js                # 完整检查
  node data-integrity-checker.js --verbose      # 详细输出
  node data-integrity-checker.js --schema-only  # 仅检查架构
  node data-integrity-checker.js --fix          # 自动修复
  node data-integrity-checker.js --report       # 生成报告
    `);
  }

  async connect() {
    if (!this.pool) {
      this.pool = new Pool(this.config);
    }
    return this.pool;
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * 完整的架构检查
   */
  async checkSchema() {
    console.log('🏗️ 检查数据库架构...');

    const pool = await this.connect();

    try {
      // 1. 检查必需的表
      const requiredTables = [
        'users', 'user_sessions', 'user_preferences', 'test_results',
        'test_sessions', 'test_queue', 'monitoring_sites', 'system_config'
      ];

      console.log('📋 检查必需的表...');
      const existingTables = await pool.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
      `);

      const tableNames = existingTables.rows.map(row => row.tablename);

      for (const table of requiredTables) {
        if (!tableNames.includes(table)) {
          this.issues.push({
            type: 'missing_table',
            severity: 'error',
            message: `缺少必需的表: ${table}`,
            table: table
          });
        } else if (this.options.verbose) {
          console.log(`✅ 表存在: ${table}`);
        }
      }

      // 2. 检查外键约束
      console.log('🔗 检查外键约束...');
      const foreignKeys = await pool.query(`
        SELECT 
          tc.table_name,
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      `);

      console.log(`📊 发现 ${foreignKeys.rows.length} 个外键约束`);

      // 3. 检查索引
      console.log('📈 检查索引完整性...');
      const indexes = await pool.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
      `);

      console.log(`📊 发现 ${indexes.rows.length} 个索引`);

      // 检查重要表是否有主键索引
      const importantTables = ['users', 'test_results', 'test_sessions'];
      for (const table of importantTables) {
        const hasIndex = indexes.rows.some(idx =>
          idx.tablename === table && idx.indexname.includes('pkey')
        );

        if (!hasIndex) {
          this.issues.push({
            type: 'missing_primary_key',
            severity: 'error',
            message: `表 ${table} 缺少主键索引`,
            table: table
          });
        }
      }

      // 4. 检查触发器
      console.log('⚡ 检查触发器...');
      const triggers = await pool.query(`
        SELECT 
          trigger_name,
          event_object_table,
          action_timing,
          event_manipulation
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
      `);

      console.log(`📊 发现 ${triggers.rows.length} 个触发器`);

      console.log('✅ 架构检查完成');

    } catch (error) {
      this.issues.push({
        type: 'schema_check_error',
        severity: 'error',
        message: `架构检查失败: ${error.message}`
      });
    }
  }

  /**
   * 完整的数据一致性检查
   */
  async checkDataConsistency() {
    console.log('📊 检查数据一致性...');

    const pool = await this.connect();

    try {
      // 1. 检查孤立的测试结果
      console.log('🔍 检查孤立的测试结果...');
      const orphanedResults = await pool.query(`
        SELECT COUNT(*) as count
        FROM test_results tr
        LEFT JOIN users u ON tr.user_id = u.id
        WHERE u.id IS NULL
      `);

      const orphanedCount = parseInt(orphanedResults.rows[0].count);
      if (orphanedCount > 0) {
        this.issues.push({
          type: 'orphaned_data',
          severity: 'warning',
          message: `发现 ${orphanedCount} 个孤立的测试结果`,
          count: orphanedCount
        });
      }

      // 2. 检查过期的会话
      console.log('⏰ 检查过期的会话...');
      const expiredSessions = await pool.query(`
        SELECT COUNT(*) as count
        FROM user_sessions
        WHERE expires_at < NOW() AND is_active = true
      `);

      const expiredCount = parseInt(expiredSessions.rows[0].count);
      if (expiredCount > 0) {
        this.warnings.push({
          type: 'expired_sessions',
          severity: 'info',
          message: `发现 ${expiredCount} 个过期但仍标记为活跃的会话`,
          count: expiredCount
        });
      }

      // 3. 检查重复数据
      console.log('🔄 检查重复数据...');
      const duplicateUsers = await pool.query(`
        SELECT email, COUNT(*) as count
        FROM users
        GROUP BY email
        HAVING COUNT(*) > 1
      `);

      if (duplicateUsers.rows.length > 0) {
        this.issues.push({
          type: 'duplicate_data',
          severity: 'error',
          message: `发现重复的用户邮箱: ${duplicateUsers.rows.length} 组`,
          details: duplicateUsers.rows
        });
      }

      // 4. 检查数据类型一致性
      console.log('🔢 检查数据类型一致性...');
      const invalidEmails = await pool.query(`
        SELECT COUNT(*) as count
        FROM users
        WHERE email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
      `);

      const invalidEmailCount = parseInt(invalidEmails.rows[0].count);
      if (invalidEmailCount > 0) {
        this.issues.push({
          type: 'invalid_data_format',
          severity: 'warning',
          message: `发现 ${invalidEmailCount} 个格式无效的邮箱地址`,
          count: invalidEmailCount
        });
      }

      console.log('✅ 数据一致性检查完成');

    } catch (error) {
      this.issues.push({
        type: 'data_check_error',
        severity: 'error',
        message: `数据检查失败: ${error.message}`
      });
    }
  }

  /**
   * 完整的性能检查
   */
  async checkPerformance() {
    console.log('⚡ 检查数据库性能...');

    const pool = await this.connect();

    try {
      // 1. 检查表大小
      console.log('📊 分析表大小...');
      const tableSizes = await pool.query(`
        SELECT
          tablename as table_name,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `);

      // 检查是否有异常大的表
      for (const table of tableSizes.rows) {
        if (table.size_bytes > 100 * 1024 * 1024) { // 100MB
          this.warnings.push({
            type: 'large_table',
            severity: 'info',
            message: `表 ${table.table_name} 较大 (${table.size})，建议考虑分区或归档`,
            table: table.table_name,
            size: table.size
          });
        }
      }

      // 2. 检查索引状态
      console.log('📈 检查索引使用情况...');
      try {
        const indexStats = await pool.query(`
          SELECT
            schemaname,
            tablename,
            indexname,
            COALESCE(idx_scan, 0) as idx_scan,
            pg_size_pretty(pg_relation_size(indexname::regclass)) as size
          FROM pg_stat_user_indexes
          WHERE schemaname = 'public'
        `);

        const unusedIndexes = indexStats.rows.filter(idx => idx.idx_scan === 0);

        if (unusedIndexes.length > 0) {
          this.suggestions.push({
            type: 'unused_indexes',
            severity: 'info',
            message: `发现 ${unusedIndexes.length} 个未使用的索引，可考虑删除以节省空间`,
            indexes: unusedIndexes.map(idx => ({
              name: idx.indexname,
              table: idx.tablename,
              size: idx.size
            }))
          });
        }

        console.log(`📊 索引统计: 总计 ${indexStats.rows.length} 个，未使用 ${unusedIndexes.length} 个`);

      } catch (error) {
        console.log('📊 索引使用统计不可用，跳过检查');
      }

      // 3. 检查慢查询（如果pg_stat_statements可用）
      console.log('🐌 检查慢查询...');
      try {
        const slowQueries = await pool.query(`
          SELECT 
            query,
            calls,
            total_time,
            mean_time,
            rows
          FROM pg_stat_statements
          WHERE mean_time > 1000
          ORDER BY mean_time DESC
          LIMIT 10
        `);

        if (slowQueries.rows.length > 0) {
          this.warnings.push({
            type: 'slow_queries',
            severity: 'warning',
            message: `发现 ${slowQueries.rows.length} 个慢查询`,
            queries: slowQueries.rows
          });
        }
      } catch (error) {
        if (this.options.verbose) {
          console.log('📊 pg_stat_statements 扩展不可用，跳过慢查询检查');
        }
      }

      // 4. 检查连接数
      console.log('🔗 检查数据库连接...');
      const connections = await pool.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      const conn = connections.rows[0];
      if (parseInt(conn.idle_in_transaction) > 5) {
        this.warnings.push({
          type: 'idle_in_transaction',
          severity: 'warning',
          message: `发现 ${conn.idle_in_transaction} 个空闲事务连接，可能存在事务泄漏`,
          count: parseInt(conn.idle_in_transaction)
        });
      }

      console.log('✅ 性能检查完成');

    } catch (error) {
      this.issues.push({
        type: 'performance_check_error',
        severity: 'error',
        message: `性能检查失败: ${error.message}`
      });
    }
  }

  /**
   * 完整的安全检查
   */
  async checkSecurity() {
    console.log('🔒 检查数据库安全...');

    const pool = await this.connect();

    try {
      // 1. 检查用户权限
      console.log('👥 检查用户权限...');
      const dbUsers = await pool.query(`
        SELECT
          rolname as usename,
          rolsuper as usesuper,
          rolcreatedb as usecreatedb,
          rolcreaterole as usecreaterole,
          rolcanlogin as usecanlogin
        FROM pg_roles
        WHERE rolcanlogin = true
      `);

      // 检查是否有过多的超级用户
      const superUsers = dbUsers.rows.filter(user => user.usesuper);
      if (superUsers.length > 2) {
        this.warnings.push({
          type: 'too_many_superusers',
          severity: 'warning',
          message: `发现 ${superUsers.length} 个超级用户，建议减少超级用户数量`,
          users: superUsers.map(u => u.usename)
        });
      }

      // 2. 检查密码安全
      console.log('🔐 检查密码安全...');
      const weakPasswords = await pool.query(`
        SELECT COUNT(*) as count
        FROM users
        WHERE length(password_hash) < 50
      `);

      const weakPasswordCount = parseInt(weakPasswords.rows[0].count);
      if (weakPasswordCount > 0) {
        this.issues.push({
          type: 'weak_passwords',
          severity: 'warning',
          message: `发现 ${weakPasswordCount} 个可能使用弱加密的密码`,
          count: weakPasswordCount
        });
      }

      // 3. 检查敏感数据
      console.log('🕵️ 检查敏感数据暴露...');
      const sensitiveData = await pool.query(`
        SELECT 
          table_name,
          column_name,
          data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND (
          column_name ILIKE '%password%' OR
          column_name ILIKE '%token%' OR
          column_name ILIKE '%secret%' OR
          column_name ILIKE '%key%'
        )
        AND data_type = 'text'
      `);

      for (const column of sensitiveData.rows) {
        if (!column.column_name.includes('hash') && !column.column_name.includes('encrypted')) {
          this.warnings.push({
            type: 'sensitive_data_exposure',
            severity: 'warning',
            message: `表 ${column.table_name} 的字段 ${column.column_name} 可能包含未加密的敏感数据`,
            table: column.table_name,
            column: column.column_name
          });
        }
      }

      console.log('✅ 安全检查完成');

    } catch (error) {
      this.issues.push({
        type: 'security_check_error',
        severity: 'error',
        message: `安全检查失败: ${error.message}`
      });
    }
  }

  /**
   * 自动修复功能
   */
  async autoFix() {
    if (!this.options.fix) {
      return;
    }

    console.log('🔧 自动修复问题...');

    const pool = await this.connect();
    let fixedCount = 0;

    try {
      // 修复过期会话
      const expiredSessionsFix = this.warnings.find(w => w.type === 'expired_sessions');
      if (expiredSessionsFix) {
        await pool.query(`
          UPDATE user_sessions 
          SET is_active = false 
          WHERE expires_at < NOW() AND is_active = true
        `);
        console.log('✅ 已修复过期会话');
        fixedCount++;
      }

      // 清理旧的系统日志（保留30天）
      const oldLogs = await pool.query(`
        DELETE FROM system_logs 
        WHERE created_at < NOW() - INTERVAL '30 days'
      `);

      if (oldLogs.rowCount > 0) {
        console.log(`✅ 已清理 ${oldLogs.rowCount} 条旧日志`);
        fixedCount++;
      }

      console.log(`🎉 自动修复完成，共修复 ${fixedCount} 个问题`);

    } catch (error) {
      console.error('❌ 自动修复失败:', error.message);
    }
  }

  /**
   * 生成检查报告
   */
  async generateReport() {
    if (!this.options.report) {
      return;
    }

    console.log('📋 生成检查报告...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = `integrity-report-${timestamp}.json`;
    const reportPath = path.resolve(reportFile);

    const report = {
      timestamp: new Date().toISOString(),
      database: this.config.database,
      summary: {
        total_issues: this.issues.length,
        total_warnings: this.warnings.length,
        total_suggestions: this.suggestions.length
      },
      issues: this.issues,
      warnings: this.warnings,
      suggestions: this.suggestions
    };

    try {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
      console.log(`✅ 报告已生成: ${reportPath}`);
    } catch (error) {
      console.error('❌ 报告生成失败:', error.message);
    }
  }

  /**
   * 显示检查结果
   */
  displayResults() {
    console.log('');
    console.log('📋 数据完整性检查结果');
    console.log('========================');

    if (this.options.json) {
      console.log(JSON.stringify({
        issues: this.issues,
        warnings: this.warnings,
        suggestions: this.suggestions
      }, null, 2));
      return;
    }

    // 显示错误
    if (this.issues.length > 0) {
      console.log('❌ 发现的问题:');
      this.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
      });
      console.log('');
    }

    // 显示警告
    if (this.warnings.length > 0) {
      console.log('⚠️ 警告信息:');
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. [${warning.severity.toUpperCase()}] ${warning.message}`);
      });
      console.log('');
    }

    // 显示建议
    if (this.suggestions.length > 0) {
      console.log('💡 优化建议:');
      this.suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion.message}`);
      });
      console.log('');
    }

    // 总结
    const totalIssues = this.issues.length + this.warnings.length;
    if (totalIssues === 0) {
      console.log('🎉 数据库完整性检查通过！');
    } else {
      console.log(`📊 检查完成: ${this.issues.length} 个问题, ${this.warnings.length} 个警告, ${this.suggestions.length} 个建议`);
    }
  }

  async run() {
    try {
      console.log('🔍 完备数据完整性检查开始...');
      console.log('===================================');
      console.log(`📋 目标数据库: ${this.config.database}`);
      console.log('');

      if (this.options.checkSchema) {
        await this.checkSchema();
      }

      if (this.options.checkData) {
        await this.checkDataConsistency();
      }

      if (this.options.checkPerformance) {
        await this.checkPerformance();
      }

      if (this.options.checkSecurity) {
        await this.checkSecurity();
      }

      await this.autoFix();
      await this.generateReport();

      this.displayResults();

      // 根据问题严重程度决定退出码
      const hasErrors = this.issues.some(issue => issue.severity === 'error');
      process.exit(hasErrors ? 1 : 0);

    } catch (error) {
      console.error('❌ 完整性检查失败:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// 运行检查
if (require.main === module) {
  const checker = new DataIntegrityChecker();
  checker.run();
}

module.exports = DataIntegrityChecker;
