/**
 * 测试压力测试修复效果的脚本
 */

import fetch from 'node-fetch';

async function testStressFix() {
    console.log('🧪 开始测试压力测试修复效果...');

    try {
        // 1. 检查后端健康状态
        console.log('1️⃣ 检查后端健康状态...');
        const healthResponse = await fetch('http://localhost:3001/health');
        const healthData = await healthResponse.json();
        console.log('✅ 后端健康状态:', healthData.status);

        // 2. 检查当前运行中的测试
        console.log('2️⃣ 检查当前运行中的测试...');
        const runningResponse = await fetch('http://localhost:3001/api/test/stress/running');
        const runningData = await runningResponse.json();
        console.log('📊 当前运行中的测试数量:', runningData.data.count);

        if (runningData.data.count > 0) {
            console.log('⚠️ 发现运行中的测试，先清理...');
            // 这里可以添加清理逻辑
        }

        // 3. 启动一个简单的压力测试
        console.log('3️⃣ 启动简单的压力测试...');
        const testConfig = {
            url: 'http://localhost:3001/health',
            testId: `test_fix_${Date.now()}`,
            options: {
                users: 5,
                duration: 10, // 10秒测试
                rampUpTime: 2,
                testType: 'constant',
                method: 'GET',
                timeout: 5,
                thinkTime: 1
            }
        };

        const testResponse = await fetch('http://localhost:3001/api/test/stress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testConfig)
        });

        const testResult = await testResponse.json();
        console.log('🚀 测试启动结果:', testResult.success ? '成功' : '失败');

        if (testResult.success && testResult.testId) {
            const testId = testResult.testId;
            console.log('🔑 测试ID:', testId);

            // 4. 监控测试状态
            console.log('4️⃣ 监控测试状态...');
            let checkCount = 0;
            const maxChecks = 20; // 最多检查20次（约20秒）

            const checkInterval = setInterval(async () => {
                checkCount++;

                try {
                    const statusResponse = await fetch(`http://localhost:3001/api/test/stress/status/${testId}`);
                    const statusData = await statusResponse.json();

                    if (statusData.success) {
                        const status = statusData.data.status;
                        const metrics = statusData.data.metrics || {};

                        console.log(`📊 检查 ${checkCount}/${maxChecks} - 状态: ${status}`);
                        console.log(`   总请求: ${metrics.totalRequests || 0}`);
                        console.log(`   成功率: ${metrics.successRate || 0}%`);
                        console.log(`   吞吐量: ${metrics.throughput || 0} req/s`);
                        console.log(`   平均响应时间: ${metrics.averageResponseTime || 0}ms`);

                        // 检查测试是否完成
                        if (status === 'completed' || status === 'cancelled') {
                            clearInterval(checkInterval);
                            console.log('✅ 测试已完成!');

                            // 显示最终结果
                            console.log('📈 最终结果:');
                            console.log(`   状态: ${status}`);
                            console.log(`   总请求数: ${metrics.totalRequests || 0}`);
                            console.log(`   成功请求: ${metrics.successfulRequests || 0}`);
                            console.log(`   失败请求: ${metrics.failedRequests || 0}`);
                            console.log(`   成功率: ${((metrics.successfulRequests || 0) / (metrics.totalRequests || 1) * 100).toFixed(2)}%`);
                            console.log(`   平均响应时间: ${metrics.averageResponseTime || 0}ms`);
                            console.log(`   吞吐量: ${metrics.throughput || 0} req/s`);
                            console.log(`   峰值TPS: ${metrics.peakTPS || 0}`);

                            // 验证修复效果
                            console.log('\n🔍 修复效果验证:');

                            if ((metrics.totalRequests || 0) > 0) {
                                console.log('✅ 总请求数正常 (> 0)');
                            } else {
                                console.log('❌ 总请求数异常 (= 0)');
                            }

                            if ((metrics.throughput || 0) > 0 && isFinite(metrics.throughput)) {
                                console.log('✅ 吞吐量计算正常');
                            } else {
                                console.log('❌ 吞吐量计算异常');
                            }

                            if (status === 'completed') {
                                console.log('✅ 测试自动结束正常');
                            } else {
                                console.log('⚠️ 测试未正常完成');
                            }

                            return;
                        }
                    }
                } catch (error) {
                    console.error('❌ 状态检查失败:', error.message);
                }

                // 超时检查
                if (checkCount >= maxChecks) {
                    clearInterval(checkInterval);
                    console.log('⏰ 监控超时，测试可能卡住了');

                    // 尝试取消测试
                    try {
                        const cancelResponse = await fetch(`http://localhost:3001/api/test/stress/cancel/${testId}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ reason: '测试脚本超时取消' })
                        });

                        const cancelResult = await cancelResponse.json();
                        console.log('🛑 取消测试结果:', cancelResult.success ? '成功' : '失败');
                    } catch (cancelError) {
                        console.error('❌ 取消测试失败:', cancelError.message);
                    }
                }
            }, 1000); // 每秒检查一次

        } else {
            console.error('❌ 测试启动失败:', testResult.message);
        }

    } catch (error) {
        console.error('❌ 测试脚本执行失败:', error.message);
    }
}

// 运行测试
testStressFix();
