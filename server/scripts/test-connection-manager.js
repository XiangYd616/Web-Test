#!/usr/bin/env node

/**
 * 测试数据库连接管理器功能
 */

const { getConnectionManager, healthCheck, getStats } = require('../config/database');

async function testConnectionManager() {
    try {
        console.log('🧪 测试数据库连接管理器...\n');

        // 1. 测试连接管理器初始化
        console.log('1️⃣ 初始化连接管理器...');
        const manager = await getConnectionManager();
        console.log('✅ 连接管理器初始化成功\n');

        // 2. 测试连接状态
        console.log('2️⃣ 检查连接状态...');
        const status = manager.getStatus();
        console.log('📊 连接状态:', JSON.stringify(status, null, 2));
        console.log('');

        // 3. 测试性能指标
        console.log('3️⃣ 获取性能指标...');
        const metrics = manager.getPerformanceMetrics();
        console.log('📈 性能指标:', JSON.stringify(metrics, null, 2));
        console.log('');

        // 4. 测试查询功能
        console.log('4️⃣ 测试查询功能...');
        const queryResult = await manager.query('SELECT COUNT(*) as count FROM users');
        console.log('✅ 查询成功:', queryResult.rows[0]);
        console.log('');

        // 5. 测试事务功能
        console.log('5️⃣ 测试事务功能...');
        const transactionResult = await manager.transaction(async (client) => {
            const result = await client.query('SELECT COUNT(*) as count FROM test_results');
            return result.rows[0];
        });
        console.log('✅ 事务成功:', transactionResult);
        console.log('');

        // 6. 测试健康检查
        console.log('6️⃣ 测试健康检查...');
        const healthResult = await healthCheck();
        console.log('🏥 健康检查结果:', JSON.stringify(healthResult, null, 2));
        console.log('');

        // 7. 测试数据库统计
        console.log('7️⃣ 测试数据库统计...');
        const statsResult = await getStats();
        console.log('📊 数据库统计:', JSON.stringify(statsResult, null, 2));
        console.log('');

        // 8. 最终状态检查
        console.log('8️⃣ 最终状态检查...');
        const finalStatus = manager.getStatus();
        console.log('📋 最终状态摘要:');
        console.log(`   连接状态: ${finalStatus.isConnected ? '✅ 已连接' : '❌ 未连接'}`);
        console.log(`   环境: ${finalStatus.environment}`);
        console.log(`   总查询数: ${finalStatus.stats.totalQueries}`);
        console.log(`   成功查询数: ${finalStatus.stats.successfulQueries}`);
        console.log(`   失败查询数: ${finalStatus.stats.failedQueries}`);
        console.log(`   平均查询时间: ${finalStatus.stats.averageQueryTime.toFixed(2)}ms`);
        console.log(`   成功率: ${finalStatus.stats.successRate}`);
        console.log('');

        console.log('🎉 所有测试通过！数据库连接管理器工作正常。');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('堆栈跟踪:', error.stack);
        process.exit(1);
    }
}

// 运行测试
if (require.main === module) {
    testConnectionManager();
}

module.exports = { testConnectionManager };