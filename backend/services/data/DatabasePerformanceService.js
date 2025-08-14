/**
 * 数据库性能优化服务
 * 提供查询优化、索引管理、慢查询检测等功能
 */

const winston = require('winston');
const { getConnectionManager } = require('../config/database');

class DatabasePerformanceOptimizer {
    constructor() {
        this.connectionManager = null;
        this.isInitialized = false;

        // 性能监控配置
        this.config = {
            slowQueryThreshold: 1000, // 慢查询阈值（毫秒）
            indexAnalysisInterval: 60 * 60 * 1000, // 索引分析间隔（1小时）
            statisticsUpdateInterval: 30 * 60 * 1000, // 统计信息更新间隔（30分钟）
            connectionPoolMonitorInterval: 5 * 60 * 1000, // 连接池监控间隔（5分钟）
            maxSlowQueryHistory: 1000, // 最大慢查询历史记录数
            enableQueryPlan: process.env.NODE_ENV === 'development' // 是否启用查询计划分析
        };

        // 性能统计
        this.stats = {
            totalQueries: 0,
            slowQueries: 0,
            averageQueryTime: 0,
            connectionPoolStats: {},
            indexUsageStats: {},
            tableStats: {},
            lastOptimization: null
        };

        // 慢查询历史
        this.slowQueryHistory = [];

        // 索引建议
        this.indexSuggestions = [];

        // 配置日志
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/db-performance.log' }),
                new winston.transports.Console({ level: 'warn' })
            ]
        });
    }

    /**
     * 初始化性能优化器
     */
    async initialize() {
        try {
            this.logger.info('初始化数据库性能优化器...');

            this.connectionManager = await getConnectionManager();

            // 启动性能监控
            this.startPerformanceMonitoring();

            // 执行初始优化
            await this.performInitialOptimization();

            this.isInitialized = true;
            this.logger.info('数据库性能优化器初始化完成');

            return true;
        } catch (error) {
            this.logger.error('数据库性能优化器初始化失败:', error);
            return false;
        }
    }

    /**
     * 启动性能监控
     */
    startPerformanceMonitoring() {
        // 索引分析定时器
        setInterval(() => {
            this.analyzeIndexUsage().catch(error => {
                this.logger.error('索引分析失败:', error);
            });
        }, this.config.indexAnalysisInterval);

        // 统计信息更新定时器
        setInterval(() => {
            this.updateTableStatistics().catch(error => {
                this.logger.error('统计信息更新失败:', error);
            });
        }, this.config.statisticsUpdateInterval);

        // 连接池监控定时器
        setInterval(() => {
            this.monitorConnectionPool().catch(error => {
                this.logger.error('连接池监控失败:', error);
            });
        }, this.config.connectionPoolMonitorInterval);

        this.logger.info('数据库性能监控已启动');
    }

    /**
     * 执行初始优化
     */
    async performInitialOptimization() {
        try {
            this.logger.info('执行数据库初始优化...');

            // 创建必要的索引
            await this.createOptimalIndexes();

            // 更新表统计信息
            await this.updateTableStatistics();

            // 优化数据库配置
            await this.optimizeDatabaseSettings();

            this.stats.lastOptimization = new Date().toISOString();
            this.logger.info('数据库初始优化完成');
        } catch (error) {
            this.logger.error('数据库初始优化失败:', error);
        }
    }

    /**
     * 创建最优索引
     */
    async createOptimalIndexes() {
        const indexes = [
            // 用户表索引
            {
                name: 'idx_users_email',
                table: 'users',
                columns: ['email'],
                unique: true,
                condition: null
            },
            {
                name: 'idx_users_active',
                table: 'users',
                columns: ['is_active'],
                unique: false,
                condition: null
            },
            {
                name: 'idx_users_created_at',
                table: 'users',
                columns: ['created_at'],
                unique: false,
                condition: null
            },

            // 测试结果表索引
            {
                name: 'idx_test_results_user_id',
                table: 'test_results',
                columns: ['user_id'],
                unique: false,
                condition: null
            },
            {
                name: 'idx_test_results_test_type',
                table: 'test_results',
                columns: ['test_type'],
                unique: false,
                condition: null
            },
            {
                name: 'idx_test_results_status',
                table: 'test_results',
                columns: ['status'],
                unique: false,
                condition: null
            },
            {
                name: 'idx_test_results_created_at',
                table: 'test_results',
                columns: ['created_at'],
                unique: false,
                condition: null
            },
            {
                name: 'idx_test_results_url',
                table: 'test_results',
                columns: ['target_url'],
                unique: false,
                condition: null
            },
            {
                name: 'idx_test_results_composite',
                table: 'test_results',
                columns: ['user_id', 'test_type', 'created_at'],
                unique: false,
                condition: null
            },

            // 监控相关索引
            {
                name: 'idx_monitoring_targets_user_id',
                table: 'monitoring_targets',
                columns: ['user_id'],
                unique: false,
                condition: 'WHERE is_active = true'
            },
            {
                name: 'idx_monitoring_logs_target_time',
                table: 'monitoring_logs',
                columns: ['target_id', 'checked_at'],
                unique: false,
                condition: null
            },

            // 系统配置索引
            {
                name: 'idx_system_config_key',
                table: 'system_config',
                columns: ['config_key'],
                unique: true,
                condition: null
            }
        ];

        for (const index of indexes) {
            try {
                await this.createIndexIfNotExists(index);
            } catch (error) {
                this.logger.warn(`创建索引失败: ${index.name}`, error.message);
            }
        }
    }

    /**
     * 创建索引（如果不存在）
     */
    async createIndexIfNotExists(indexConfig) {
        const { name, table, columns, unique, condition } = indexConfig;

        // 检查索引是否已存在
        const existsQuery = `
            SELECT 1 FROM pg_indexes 
            WHERE indexname = $1 AND tablename = $2
        `;

        const existsResult = await this.connectionManager.query(existsQuery, [name, table]);

        if (existsResult.rows.length > 0) {
            this.logger.debug(`索引已存在: ${name}`);
            return;
        }

        // 创建索引
        const uniqueKeyword = unique ? 'UNIQUE' : '';
        const conditionClause = condition ? condition : '';
        const createIndexQuery = `
            CREATE ${uniqueKeyword} INDEX CONCURRENTLY IF NOT EXISTS ${name}
            ON ${table} (${columns.join(', ')})
            ${conditionClause}
        `;

        await this.connectionManager.query(createIndexQuery);
        this.logger.info(`创建索引: ${name} on ${table}(${columns.join(', ')})`);
    }

    /**
     * 分析索引使用情况
     */
    async analyzeIndexUsage() {
        try {
            const query = `
                SELECT
                    schemaname,
                    tablename,
                    indexname,
                    idx_tup_read,
                    idx_tup_fetch,
                    idx_scan,
                    CASE 
                        WHEN idx_scan = 0 THEN 'UNUSED'
                        WHEN idx_scan < 10 THEN 'LOW_USAGE'
                        WHEN idx_scan < 100 THEN 'MEDIUM_USAGE'
                        ELSE 'HIGH_USAGE'
                    END as usage_level
                FROM pg_stat_user_indexes
                WHERE schemaname = 'public'
                ORDER BY idx_scan DESC
            `;

            const result = await this.connectionManager.query(query);
            this.stats.indexUsageStats = result.rows;

            // 识别未使用的索引
            const unusedIndexes = result.rows.filter(row => row.usage_level === 'UNUSED');
            if (unusedIndexes.length > 0) {
                this.logger.warn(`发现 ${unusedIndexes.length} 个未使用的索引`);
                unusedIndexes.forEach(index => {
                    this.logger.warn(`未使用索引: ${index.indexname} on ${index.tablename}`);
                });
            }

            // 生成索引优化建议
            await this.generateIndexSuggestions();

        } catch (error) {
            this.logger.error('索引使用分析失败:', error);
        }
    }

    /**
     * 生成索引建议
     */
    async generateIndexSuggestions() {
        try {
            // 分析缺失索引的查询
            const missingIndexQuery = `
                SELECT
                    query,
                    calls,
                    total_time,
                    mean_time,
                    rows
                FROM pg_stat_statements
                WHERE query LIKE '%WHERE%'
                AND calls > 10
                AND mean_time > 100
                ORDER BY mean_time DESC
                LIMIT 20
            `;

            try {
                const result = await this.connectionManager.query(missingIndexQuery);

                // 分析查询模式，生成索引建议
                const suggestions = this.analyzeQueryPatterns(result.rows);
                this.indexSuggestions = suggestions;

                if (suggestions.length > 0) {
                    this.logger.info(`生成了 ${suggestions.length} 个索引建议`);
                }
            } catch (error) {
                // pg_stat_statements 可能未启用
                this.logger.debug('pg_stat_statements 未启用，跳过查询分析');
            }

        } catch (error) {
            this.logger.error('生成索引建议失败:', error);
        }
    }

    /**
     * 分析查询模式
     */
    analyzeQueryPatterns(queries) {
        const suggestions = [];

        queries.forEach(queryData => {
            const { query, calls, mean_time } = queryData;

            // 简单的模式匹配来识别可能需要索引的查询
            const whereMatches = query.match(/WHERE\s+(\w+)\s*=/gi);
            const orderByMatches = query.match(/ORDER\s+BY\s+(\w+)/gi);

            if (whereMatches) {
                whereMatches.forEach(match => {
                    const column = match.replace(/WHERE\s+/i, '').replace(/\s*=.*/, '');
                    suggestions.push({
                        type: 'WHERE_CLAUSE',
                        table: this.extractTableFromQuery(query),
                        column: column.trim(),
                        reason: `频繁的WHERE条件查询 (${calls}次调用, 平均${mean_time.toFixed(2)}ms)`,
                        priority: mean_time > 500 ? 'HIGH' : 'MEDIUM'
                    });
                });
            }

            if (orderByMatches) {
                orderByMatches.forEach(match => {
                    const column = match.replace(/ORDER\s+BY\s+/i, '');
                    suggestions.push({
                        type: 'ORDER_BY',
                        table: this.extractTableFromQuery(query),
                        column: column.trim(),
                        reason: `频繁的排序查询 (${calls}次调用, 平均${mean_time.toFixed(2)}ms)`,
                        priority: mean_time > 1000 ? 'HIGH' : 'MEDIUM'
                    });
                });
            }
        });

        // 去重并按优先级排序
        const uniqueSuggestions = suggestions.filter((suggestion, index, self) =>
            index === self.findIndex(s =>
                s.table === suggestion.table && s.column === suggestion.column
            )
        );

        return uniqueSuggestions.sort((a, b) => {
            const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    /**
     * 从查询中提取表名
     */
    extractTableFromQuery(query) {
        const fromMatch = query.match(/FROM\s+(\w+)/i);
        return fromMatch ? fromMatch[1] : 'unknown';
    }

    /**
     * 更新表统计信息
     */
    async updateTableStatistics() {
        try {
            // 获取表统计信息
            const statsQuery = `
                SELECT
                    schemaname,
                    tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes,
                    n_tup_hot_upd as hot_updates,
                    n_live_tup as live_tuples,
                    n_dead_tup as dead_tuples,
                    last_vacuum,
                    last_autovacuum,
                    last_analyze,
                    last_autoanalyze
                FROM pg_stat_user_tables
                WHERE schemaname = 'public'
                ORDER BY n_live_tup DESC
            `;

            const result = await this.connectionManager.query(statsQuery);
            this.stats.tableStats = result.rows;

            // 检查需要VACUUM的表
            const needsVacuum = result.rows.filter(table => {
                const deadTuples = parseInt(table.dead_tuples) || 0;
                const liveTuples = parseInt(table.live_tuples) || 0;
                const deadRatio = liveTuples > 0 ? deadTuples / liveTuples : 0;

                return deadRatio > 0.2; // 死元组超过20%
            });

            if (needsVacuum.length > 0) {
                this.logger.warn(`${needsVacuum.length} 个表需要VACUUM操作`);

                // 在低峰期自动执行VACUUM
                if (this.isLowTrafficPeriod()) {
                    for (const table of needsVacuum) {
                        await this.vacuumTable(table.tablename);
                    }
                }
            }

            // 更新表统计信息
            await this.connectionManager.query('ANALYZE');
            this.logger.info('表统计信息更新完成');

        } catch (error) {
            this.logger.error('更新表统计信息失败:', error);
        }
    }

    /**
     * 检查是否为低流量时段
     */
    isLowTrafficPeriod() {
        const hour = new Date().getHours();
        // 假设凌晨2-6点为低流量时段
        return hour >= 2 && hour <= 6;
    }

    /**
     * 对表执行VACUUM操作
     */
    async vacuumTable(tableName) {
        try {
            await this.connectionManager.query(`VACUUM ANALYZE ${tableName}`);
            this.logger.info(`VACUUM操作完成: ${tableName}`);
        } catch (error) {
            this.logger.error(`VACUUM操作失败: ${tableName}`, error);
        }
    }

    /**
     * 监控连接池
     */
    async monitorConnectionPool() {
        try {
            const status = this.connectionManager.getStatus();
            this.stats.connectionPoolStats = status.pool || {};

            // 检查连接池健康状况
            const poolStats = this.stats.connectionPoolStats;
            const totalConnections = poolStats.totalCount || 0;
            const idleConnections = poolStats.idleCount || 0;
            const waitingCount = poolStats.waitingCount || 0;

            // 连接池告警
            if (waitingCount > 5) {
                this.logger.warn(`连接池等待队列过长: ${waitingCount}`);
            }

            if (totalConnections > 0 && idleConnections / totalConnections < 0.2) {
                this.logger.warn(`连接池空闲连接不足: ${idleConnections}/${totalConnections}`);
            }

        } catch (error) {
            this.logger.error('连接池监控失败:', error);
        }
    }

    /**
     * 优化数据库设置
     */
    async optimizeDatabaseSettings() {
        try {
            const optimizations = [
                // 设置工作内存
                "SET work_mem = '16MB'",

                // 设置维护工作内存
                "SET maintenance_work_mem = '256MB'",

                // 启用并行查询
                "SET max_parallel_workers_per_gather = 2",

                // 优化随机页面成本
                "SET random_page_cost = 1.1",

                // 设置有效缓存大小
                "SET effective_cache_size = '1GB'"
            ];

            for (const setting of optimizations) {
                try {
                    await this.connectionManager.query(setting);
                } catch (error) {
                    this.logger.debug(`设置优化参数失败: ${setting}`, error.message);
                }
            }

            this.logger.info('数据库设置优化完成');
        } catch (error) {
            this.logger.error('数据库设置优化失败:', error);
        }
    }

    /**
     * 记录慢查询
     */
    recordSlowQuery(query, duration, params = []) {
        if (duration >= this.config.slowQueryThreshold) {
            const slowQuery = {
                query,
                duration,
                params,
                timestamp: new Date().toISOString(),
                stackTrace: new Error().stack
            };

            this.slowQueryHistory.unshift(slowQuery);

            // 限制历史记录数量
            if (this.slowQueryHistory.length > this.config.maxSlowQueryHistory) {
                this.slowQueryHistory = this.slowQueryHistory.slice(0, this.config.maxSlowQueryHistory);
            }

            this.stats.slowQueries++;
            this.logger.warn(`慢查询检测: ${duration}ms`, { query, params });
        }
    }

    /**
     * 分析查询计划
     */
    async analyzeQueryPlan(query, params = []) {
        if (!this.config.enableQueryPlan) {
            return null;
        }

        try {
            const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
            const result = await this.connectionManager.query(explainQuery, params);

            const plan = result.rows[0]['QUERY PLAN'][0];

            // 分析查询计划，识别性能问题
            const analysis = this.analyzeExecutionPlan(plan);

            return {
                plan,
                analysis,
                suggestions: this.generateQueryOptimizationSuggestions(analysis)
            };
        } catch (error) {
            this.logger.error('查询计划分析失败:', error);
            return null;
        }
    }

    /**
     * 分析执行计划
     */
    analyzeExecutionPlan(plan) {
        const analysis = {
            totalCost: plan['Total Cost'],
            actualTime: plan['Actual Total Time'],
            planRows: plan['Plan Rows'],
            actualRows: plan['Actual Rows'],
            issues: []
        };

        // 检查常见性能问题
        if (plan['Node Type'] === 'Seq Scan') {
            analysis.issues.push({
                type: 'SEQUENTIAL_SCAN',
                severity: 'HIGH',
                message: '使用了全表扫描，考虑添加索引'
            });
        }

        if (analysis.actualRows > analysis.planRows * 10) {
            analysis.issues.push({
                type: 'ROW_ESTIMATION_ERROR',
                severity: 'MEDIUM',
                message: '行数估计严重偏差，考虑更新统计信息'
            });
        }

        if (analysis.actualTime > 1000) {
            analysis.issues.push({
                type: 'SLOW_EXECUTION',
                severity: 'HIGH',
                message: '查询执行时间过长，需要优化'
            });
        }

        return analysis;
    }

    /**
     * 生成查询优化建议
     */
    generateQueryOptimizationSuggestions(analysis) {
        const suggestions = [];

        analysis.issues.forEach(issue => {
            switch (issue.type) {
                case 'SEQUENTIAL_SCAN':
                    suggestions.push('考虑在WHERE条件的列上添加索引');
                    suggestions.push('检查查询条件是否可以更加具体');
                    break;
                case 'ROW_ESTIMATION_ERROR':
                    suggestions.push('运行ANALYZE更新表统计信息');
                    suggestions.push('考虑增加统计信息的采样率');
                    break;
                case 'SLOW_EXECUTION':
                    suggestions.push('考虑重写查询逻辑');
                    suggestions.push('检查是否可以使用分页或限制结果集');
                    break;
            }
        });

        return suggestions;
    }

    /**
     * 获取性能报告
     */
    getPerformanceReport() {
        return {
            stats: this.stats,
            slowQueries: this.slowQueryHistory.slice(0, 10), // 最近10个慢查询
            indexSuggestions: this.indexSuggestions,
            connectionPoolHealth: this.assessConnectionPoolHealth(),
            recommendations: this.generatePerformanceRecommendations(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 评估连接池健康状况
     */
    assessConnectionPoolHealth() {
        const poolStats = this.stats.connectionPoolStats;
        const totalConnections = poolStats.totalCount || 0;
        const idleConnections = poolStats.idleCount || 0;
        const waitingCount = poolStats.waitingCount || 0;

        let health = 'HEALTHY';
        const issues = [];

        if (waitingCount > 5) {
            health = 'WARNING';
            issues.push('连接池等待队列过长');
        }

        if (totalConnections > 0 && idleConnections / totalConnections < 0.2) {
            health = 'WARNING';
            issues.push('空闲连接不足');
        }

        if (totalConnections === 0) {
            health = 'CRITICAL';
            issues.push('无可用连接');
        }

        return { health, issues, stats: poolStats };
    }

    /**
     * 生成性能建议
     */
    generatePerformanceRecommendations() {
        const recommendations = [];

        // 基于慢查询的建议
        if (this.stats.slowQueries > this.stats.totalQueries * 0.1) {
            recommendations.push({
                type: 'SLOW_QUERIES',
                priority: 'HIGH',
                message: '慢查询比例过高，建议优化查询或添加索引'
            });
        }

        // 基于索引使用的建议
        if (this.indexSuggestions.length > 0) {
            recommendations.push({
                type: 'MISSING_INDEXES',
                priority: 'MEDIUM',
                message: `发现 ${this.indexSuggestions.length} 个索引优化机会`
            });
        }

        // 基于表统计的建议
        const tablesNeedingVacuum = this.stats.tableStats.filter(table => {
            const deadTuples = parseInt(table.dead_tuples) || 0;
            const liveTuples = parseInt(table.live_tuples) || 0;
            return liveTuples > 0 && deadTuples / liveTuples > 0.2;
        });

        if (tablesNeedingVacuum.length > 0) {
            recommendations.push({
                type: 'VACUUM_NEEDED',
                priority: 'MEDIUM',
                message: `${tablesNeedingVacuum.length} 个表需要VACUUM操作`
            });
        }

        return recommendations;
    }

    /**
     * 执行性能优化
     */
    async performOptimization() {
        try {
            this.logger.info('开始执行数据库性能优化...');

            // 更新统计信息
            await this.updateTableStatistics();

            // 分析索引使用情况
            await this.analyzeIndexUsage();

            // 在低流量时段执行维护操作
            if (this.isLowTrafficPeriod()) {
                await this.performMaintenanceTasks();
            }

            this.stats.lastOptimization = new Date().toISOString();
            this.logger.info('数据库性能优化完成');

            return this.getPerformanceReport();
        } catch (error) {
            this.logger.error('数据库性能优化失败:', error);
            throw error;
        }
    }

    /**
     * 执行维护任务
     */
    async performMaintenanceTasks() {
        try {
            // 清理死元组
            await this.connectionManager.query('VACUUM');

            // 重建索引统计
            await this.connectionManager.query('REINDEX DATABASE CONCURRENTLY');

            this.logger.info('数据库维护任务完成');
        } catch (error) {
            this.logger.error('数据库维护任务失败:', error);
        }
    }

    /**
     * 健康检查
     */
    async healthCheck() {
        try {
            const status = this.connectionManager.getStatus();
            const performanceReport = this.getPerformanceReport();

            return {
                status: status.isConnected ? 'healthy' : 'unhealthy',
                initialized: this.isInitialized,
                performance: performanceReport,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = DatabasePerformanceOptimizer;