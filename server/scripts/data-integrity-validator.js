#!/usr/bin/env node

/**
 * 数据完整性验证脚本
 * 用于验证数据库架构和数据的完整性
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

// 根据环境自动选择数据库
const getDefaultDatabase = () => {
    const env = process.env.NODE_ENV || 'development';
    switch (env) {
        case 'production':
            return 'testweb_prod';
        case 'test':
            return 'testweb_test';
        default:
            return 'testweb_dev';
    }
};

// 数据库连接配置
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || getDefaultDatabase(),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

const pool = new Pool(dbConfig);

/**
 * 数据完整性验证器
 */
class DataIntegrityValidator {
    constructor() {
        this.validationResults = {
            tables: {},
            indexes: {},
            constraints: {},
            data: {},
            performance: {},
            overall: { passed: 0, failed: 0, warnings: 0 }
        };
    }

    /**
     * 运行完整验证
     */
    async runFullValidation() {
        try {
            log('🔍 开始数据完整性验证...', 'bright');
            log('='.repeat(60), 'blue');

            await this.validateTables();
            await this.validateIndexes();
            await this.validateConstraints();
            await this.validateData();
            await this.validatePerformance();

            this.generateReport();

            return this.validationResults.overall.failed === 0;

        } catch (error) {
            log(`❌ 验证过程中发生错误: ${error.message}`, 'red');
            return false;
        }
    }

    /**
     * 验证表结构
     */
    async validateTables() {
        log('\n📋 验证表结构...', 'blue');

        const client = await pool.connect();

        try {
            // 预期的核心表
            const expectedTables = [
                'users', 'test_results', 'seo_test_details', 'performance_test_details',
                'security_test_details', 'api_test_details', 'compatibility_test_details',
                'accessibility_test_details', 'stress_test_details', 'monitoring_sites',
                'monitoring_results', 'test_artifacts', 'system_config', 'engine_status',
                'system_logs'
            ];

            // 获取实际存在的表
            const tablesResult = await client.query(`
        SELECT 
          tablename as table_name,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

            const actualTables = tablesResult.rows.map(row => row.table_name);

            // 检查缺失的表
            const missingTables = expectedTables.filter(table => !actualTables.includes(table));
            const extraTables = actualTables.filter(table => !expectedTables.includes(table));

            this.validationResults.tables = {
                expected: expectedTables.length,
                actual: actualTables.length,
                missing: missingTables,
                extra: extraTables,
                details: tablesResult.rows
            };

            if (missingTables.length === 0) {
                log('✅ 所有核心表都存在', 'green');
                this.validationResults.overall.passed++;
            } else {
                log(`❌ 缺失表: ${missingTables.join(', ')}`, 'red');
                this.validationResults.overall.failed++;
            }

            if (extraTables.length > 0) {
                log(`⚠️ 额外表: ${extraTables.join(', ')}`, 'yellow');
                this.validationResults.overall.warnings++;
            }

            // 验证每个表的列结构
            for (const table of expectedTables) {
                if (actualTables.includes(table)) {
                    await this.validateTableColumns(client, table);
                }
            }

        } finally {
            client.release();
        }
    }

    /**
     * 验证表的列结构
     */
    async validateTableColumns(client, tableName) {
        try {
            const columnsResult = await client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

            const expectedColumns = this.getExpectedColumns(tableName);
            const actualColumns = columnsResult.rows.map(row => row.column_name);

            const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));

            if (missingColumns.length === 0) {
                log(`  ✅ ${tableName}: 列结构正确`, 'green');
            } else {
                log(`  ❌ ${tableName}: 缺失列 ${missingColumns.join(', ')}`, 'red');
                this.validationResults.overall.failed++;
            }

        } catch (error) {
            log(`  ❌ ${tableName}: 列验证失败 - ${error.message}`, 'red');
            this.validationResults.overall.failed++;
        }
    }

    /**
     * 获取预期的列名
     */
    getExpectedColumns(tableName) {
        const columnMappings = {
            'users': ['id', 'username', 'email', 'password_hash', 'role', 'status', 'created_at', 'updated_at'],
            'test_results': ['id', 'user_id', 'test_type', 'test_name', 'url', 'status', 'overall_score', 'created_at'],
            'system_config': ['id', 'category', 'key', 'value', 'data_type', 'created_at', 'updated_at'],
            'engine_status': ['id', 'engine_type', 'status', 'last_check', 'created_at', 'updated_at']
        };

        return columnMappings[tableName] || [];
    }

    /**
     * 验证索引
     */
    async validateIndexes() {
        log('\n📈 验证索引...', 'blue');

        const client = await pool.connect();

        try {
            const indexesResult = await client.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);

            this.validationResults.indexes = {
                total: indexesResult.rows.length,
                details: indexesResult.rows
            };

            // 检查关键索引是否存在
            const criticalIndexes = [
                'idx_users_email_hash',
                'idx_users_username_hash',
                'idx_test_results_user_type',
                'idx_test_results_created_at'
            ];

            const existingIndexes = indexesResult.rows.map(row => row.indexname);
            const missingCriticalIndexes = criticalIndexes.filter(idx => !existingIndexes.includes(idx));

            if (missingCriticalIndexes.length === 0) {
                log('✅ 所有关键索引都存在', 'green');
                this.validationResults.overall.passed++;
            } else {
                log(`❌ 缺失关键索引: ${missingCriticalIndexes.join(', ')}`, 'red');
                this.validationResults.overall.failed++;
            }

            log(`📊 总索引数量: ${indexesResult.rows.length}`, 'cyan');

        } finally {
            client.release();
        }
    }

    /**
     * 验证约束
     */
    async validateConstraints() {
        log('\n🔗 验证约束...', 'blue');

        const client = await pool.connect();

        try {
            // 检查外键约束
            const foreignKeysResult = await client.query(`
        SELECT 
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
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
        ORDER BY tc.table_name, tc.constraint_name
      `);

            // 检查主键约束
            const primaryKeysResult = await client.query(`
        SELECT 
          tc.table_name,
          tc.constraint_name,
          kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name
      `);

            // 检查唯一约束
            const uniqueConstraintsResult = await client.query(`
        SELECT 
          tc.table_name,
          tc.constraint_name,
          kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `);

            this.validationResults.constraints = {
                foreignKeys: foreignKeysResult.rows.length,
                primaryKeys: primaryKeysResult.rows.length,
                uniqueConstraints: uniqueConstraintsResult.rows.length,
                details: {
                    foreignKeys: foreignKeysResult.rows,
                    primaryKeys: primaryKeysResult.rows,
                    uniqueConstraints: uniqueConstraintsResult.rows
                }
            };

            log(`🔗 外键约束: ${foreignKeysResult.rows.length}`, 'cyan');
            log(`🔑 主键约束: ${primaryKeysResult.rows.length}`, 'cyan');
            log(`🔒 唯一约束: ${uniqueConstraintsResult.rows.length}`, 'cyan');

            // 验证关键约束是否存在
            const expectedForeignKeys = [
                'test_results.user_id -> users.id',
                'seo_test_details.test_id -> test_results.id',
                'performance_test_details.test_id -> test_results.id'
            ];

            let constraintsPassed = true;
            for (const expectedFK of expectedForeignKeys) {
                const found = foreignKeysResult.rows.some(fk =>
                    expectedFK.includes(`${fk.table_name}.${fk.column_name}`) &&
                    expectedFK.includes(`${fk.foreign_table_name}.${fk.foreign_column_name}`)
                );

                if (!found) {
                    log(`❌ 缺失外键约束: ${expectedFK}`, 'red');
                    constraintsPassed = false;
                }
            }

            if (constraintsPassed) {
                log('✅ 关键约束验证通过', 'green');
                this.validationResults.overall.passed++;
            } else {
                this.validationResults.overall.failed++;
            }

        } finally {
            client.release();
        }
    }

    /**
     * 验证数据
     */
    async validateData() {
        log('\n📊 验证数据...', 'blue');

        const client = await pool.connect();

        try {
            // 检查各表的数据量
            const tables = ['users', 'test_results', 'system_config', 'engine_status'];
            const dataStats = {};

            for (const table of tables) {
                try {
                    const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
                    const count = parseInt(countResult.rows[0].count);
                    dataStats[table] = count;

                    log(`📋 ${table}: ${count} 条记录`, 'cyan');
                } catch (error) {
                    log(`❌ ${table}: 数据查询失败 - ${error.message}`, 'red');
                    dataStats[table] = -1;
                    this.validationResults.overall.failed++;
                }
            }

            // 验证系统配置数据
            const configResult = await client.query(`
        SELECT category, COUNT(*) as count 
        FROM system_config 
        GROUP BY category 
        ORDER BY category
      `);

            log('🔧 系统配置分类:', 'cyan');
            configResult.rows.forEach(row => {
                log(`   ${row.category}: ${row.count} 项`, 'yellow');
            });

            // 验证引擎状态数据
            const engineResult = await client.query(`
        SELECT engine_type, status 
        FROM engine_status 
        ORDER BY engine_type
      `);

            log('🚀 引擎状态:', 'cyan');
            engineResult.rows.forEach(row => {
                const statusColor = row.status === 'healthy' ? 'green' : 'yellow';
                log(`   ${row.engine_type}: ${row.status}`, statusColor);
            });

            // 验证数据关联性
            await this.validateDataRelationships(client);

            this.validationResults.data = {
                tableStats: dataStats,
                systemConfig: configResult.rows,
                engineStatus: engineResult.rows
            };

            this.validationResults.overall.passed++;

        } finally {
            client.release();
        }
    }

    /**
     * 验证数据关联性
     */
    async validateDataRelationships(client) {
        try {
            // 检查孤立的测试结果（没有对应用户的测试结果）
            const orphanTestsResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM test_results tr 
        LEFT JOIN users u ON tr.user_id = u.id 
        WHERE u.id IS NULL
      `);

            const orphanTests = parseInt(orphanTestsResult.rows[0].count);
            if (orphanTests > 0) {
                log(`⚠️ 发现 ${orphanTests} 条孤立的测试结果`, 'yellow');
                this.validationResults.overall.warnings++;
            } else {
                log('✅ 数据关联性检查通过', 'green');
            }

            // 检查测试详细结果的完整性
            const detailTables = [
                'seo_test_details', 'performance_test_details', 'security_test_details',
                'api_test_details', 'compatibility_test_details', 'accessibility_test_details',
                'stress_test_details'
            ];

            for (const detailTable of detailTables) {
                try {
                    const orphanDetailsResult = await client.query(`
            SELECT COUNT(*) as count 
            FROM ${detailTable} dt 
            LEFT JOIN test_results tr ON dt.test_id = tr.id 
            WHERE tr.id IS NULL
          `);

                    const orphanDetails = parseInt(orphanDetailsResult.rows[0].count);
                    if (orphanDetails > 0) {
                        log(`⚠️ ${detailTable}: 发现 ${orphanDetails} 条孤立记录`, 'yellow');
                        this.validationResults.overall.warnings++;
                    }
                } catch (error) {
                    // 表可能不存在，这是正常的
                    log(`ℹ️ ${detailTable}: 表不存在或无法访问`, 'cyan');
                }
            }

        } catch (error) {
            log(`❌ 数据关联性验证失败: ${error.message}`, 'red');
            this.validationResults.overall.failed++;
        }
    }

    /**
     * 验证性能
     */
    async validatePerformance() {
        log('\n⚡ 验证性能...', 'blue');

        const client = await pool.connect();

        try {
            // 检查数据库大小
            const sizeResult = await client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size,
               pg_database_size(current_database()) as size_bytes
      `);

            // 检查表大小
            const tableSizesResult = await client.query(`
        SELECT 
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `);

            // 检查索引使用情况（简化版）
            let indexUsageResult = { rows: [] };
            try {
                indexUsageResult = await client.query(`
                    SELECT 
                      schemaname,
                      tablename,
                      indexname,
                      idx_scan,
                      idx_tup_read,
                      idx_tup_fetch
                    FROM pg_stat_user_indexes 
                    WHERE schemaname = 'public'
                    ORDER BY idx_scan DESC
                    LIMIT 10
                `);
            } catch (error) {
                log(`⚠️ 无法获取索引使用情况: ${error.message}`, 'yellow');
            }

            // 检查缓存命中率（简化版）
            let cacheHitResult = { rows: [{ cache_hit_ratio: null }] };
            try {
                cacheHitResult = await client.query(`
                    SELECT 
                      sum(heap_blks_read) as heap_read,
                      sum(heap_blks_hit) as heap_hit,
                      CASE 
                        WHEN sum(heap_blks_hit) + sum(heap_blks_read) = 0 THEN 0
                        ELSE sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 
                      END as cache_hit_ratio
                    FROM pg_statio_user_tables
                `);
            } catch (error) {
                log(`⚠️ 无法获取缓存命中率: ${error.message}`, 'yellow');
            }

            this.validationResults.performance = {
                databaseSize: sizeResult.rows[0],
                tableSizes: tableSizesResult.rows,
                indexUsage: indexUsageResult.rows,
                cacheHitRatio: cacheHitResult.rows[0]?.cache_hit_ratio || 0
            };

            log(`💾 数据库大小: ${sizeResult.rows[0].size}`, 'cyan');

            if (cacheHitResult.rows[0]?.cache_hit_ratio) {
                const hitRatio = parseFloat(cacheHitResult.rows[0].cache_hit_ratio);
                log(`📈 缓存命中率: ${hitRatio.toFixed(2)}%`, 'cyan');

                if (hitRatio < 90) {
                    log(`⚠️ 缓存命中率较低，建议优化`, 'yellow');
                    this.validationResults.overall.warnings++;
                }
            }

            log('📊 最大的5个表:', 'cyan');
            tableSizesResult.rows.slice(0, 5).forEach(row => {
                log(`   ${row.tablename}: ${row.size}`, 'yellow');
            });

            this.validationResults.overall.passed++;

        } finally {
            client.release();
        }
    }

    /**
     * 生成验证报告
     */
    generateReport() {
        log('\n📋 生成验证报告...', 'blue');

        const report = {
            timestamp: new Date().toISOString(),
            database: dbConfig.database,
            environment: process.env.NODE_ENV || 'development',
            summary: this.validationResults.overall,
            details: this.validationResults
        };

        // 保存报告到文件
        const reportDir = path.join(__dirname, '../reports');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        const reportPath = path.join(reportDir, `data-integrity-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // 显示摘要
        log('\n' + '='.repeat(60), 'blue');
        log('📊 验证结果摘要', 'bright');
        log('='.repeat(60), 'blue');

        const { passed, failed, warnings } = this.validationResults.overall;
        log(`✅ 通过: ${passed}`, 'green');
        log(`❌ 失败: ${failed}`, failed > 0 ? 'red' : 'green');
        log(`⚠️ 警告: ${warnings}`, warnings > 0 ? 'yellow' : 'green');

        const totalChecks = passed + failed + warnings;
        const successRate = totalChecks > 0 ? ((passed / totalChecks) * 100).toFixed(2) : 0;
        log(`📈 成功率: ${successRate}%`, successRate >= 90 ? 'green' : 'yellow');

        log(`📄 详细报告: ${reportPath}`, 'cyan');

        if (failed === 0) {
            log('\n🎉 数据完整性验证通过!', 'green');
        } else {
            log('\n⚠️ 数据完整性验证发现问题，请检查详细报告', 'yellow');
        }
    }
}

/**
 * 主验证函数
 */
async function runValidation() {
    const validator = new DataIntegrityValidator();

    try {
        const success = await validator.runFullValidation();
        process.exit(success ? 0 : 1);
    } catch (error) {
        log(`❌ 验证过程失败: ${error.message}`, 'red');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// 命令行参数处理
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    log('数据完整性验证脚本', 'bright');
    log('\n用法:', 'cyan');
    log('  node data-integrity-validator.js [选项]', 'white');
    log('\n选项:', 'cyan');
    log('  --help, -h     显示帮助信息', 'white');
    log('\n环境变量:', 'cyan');
    log('  DB_HOST        数据库主机 (默认: localhost)', 'white');
    log('  DB_PORT        数据库端口 (默认: 5432)', 'white');
    log('  DB_NAME        数据库名称 (默认: testweb_dev)', 'white');
    log('  DB_USER        数据库用户 (默认: postgres)', 'white');
    log('  DB_PASSWORD    数据库密码 (默认: postgres)', 'white');
    process.exit(0);
}

// 执行验证
if (require.main === module) {
    runValidation();
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

module.exports = { DataIntegrityValidator, runValidation };