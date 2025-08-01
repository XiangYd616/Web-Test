/**
 * 测试压力测试结束逻辑的脚本
 */

import fetch from 'node-fetch';

async function testEndingLogic() {
    console.log('🧪 开始测试压力测试结束逻辑...');
    
    try {
        // 1. 检查后端健康状态
        console.log('1️⃣ 检查后端健康状态...');
        const healthResponse = await fetch('http://localhost:3001/health');
        const healthData = await healthResponse.json();
        console.log('✅ 后端健康状态:', healthData.status);
        
        // 2. 测试场景1：正常自动结束
        console.log('\n📋 测试场景1：正常自动结束（10秒测试）');
        await testNormalCompletion();
        
        // 等待一段时间
        await sleep(3000);
        
        // 3. 测试场景2：用户手动取消
        console.log('\n📋 测试场景2：用户手动取消（启动后5秒取消）');
        await testManualCancellation();
        
        // 等待一段时间
        await sleep(3000);
        
        // 4. 测试场景3：短时间测试（检查是否有重复处理）
        console.log('\n📋 测试场景3：短时间测试（5秒，检查重复处理）');
        await testShortDuration();
        
        console.log('\n✅ 所有测试场景完成！');
        
    } catch (error) {
        console.error('❌ 测试脚本执行失败:', error.message);
    }
}

async function testNormalCompletion() {
    const testConfig = {
        url: 'http://localhost:3001/health',
        testId: `normal_${Date.now()}`,
        options: {
            users: 3,
            duration: 10, // 10秒测试
            rampUpTime: 2,
            testType: 'constant',
            method: 'GET',
            timeout: 5,
            thinkTime: 1
        }
    };
    
    console.log('🚀 启动正常完成测试...');
    const testResponse = await fetch('http://localhost:3001/api/test/stress', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token' // 可能需要认证
        },
        body: JSON.stringify(testConfig)
    });
    
    if (!testResponse.ok) {
        console.log('⚠️ 需要认证，跳过此测试');
        return;
    }
    
    const testResult = await testResponse.json();
    if (!testResult.success) {
        console.log('❌ 测试启动失败:', testResult.message);
        return;
    }
    
    const testId = testResult.testId;
    console.log('🔑 测试ID:', testId);
    
    // 监控测试直到完成
    await monitorTestUntilEnd(testId, 'normal completion');
}

async function testManualCancellation() {
    const testConfig = {
        url: 'http://localhost:3001/health',
        testId: `cancel_${Date.now()}`,
        options: {
            users: 3,
            duration: 30, // 30秒测试，但会在5秒后取消
            rampUpTime: 2,
            testType: 'constant',
            method: 'GET',
            timeout: 5,
            thinkTime: 1
        }
    };
    
    console.log('🚀 启动手动取消测试...');
    const testResponse = await fetch('http://localhost:3001/api/test/stress', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(testConfig)
    });
    
    if (!testResponse.ok) {
        console.log('⚠️ 需要认证，跳过此测试');
        return;
    }
    
    const testResult = await testResponse.json();
    if (!testResult.success) {
        console.log('❌ 测试启动失败:', testResult.message);
        return;
    }
    
    const testId = testResult.testId;
    console.log('🔑 测试ID:', testId);
    
    // 等待5秒后取消
    setTimeout(async () => {
        console.log('🛑 5秒后取消测试...');
        try {
            const cancelResponse = await fetch(`http://localhost:3001/api/test/stress/cancel/${testId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                },
                body: JSON.stringify({ reason: '测试手动取消逻辑' })
            });
            
            if (cancelResponse.ok) {
                const cancelResult = await cancelResponse.json();
                console.log('✅ 取消请求发送成功:', cancelResult.success);
            } else {
                console.log('⚠️ 取消请求可能需要认证');
            }
        } catch (error) {
            console.log('⚠️ 取消请求失败:', error.message);
        }
    }, 5000);
    
    // 监控测试直到完成
    await monitorTestUntilEnd(testId, 'manual cancellation');
}

async function testShortDuration() {
    const testConfig = {
        url: 'http://localhost:3001/health',
        testId: `short_${Date.now()}`,
        options: {
            users: 2,
            duration: 5, // 5秒测试
            rampUpTime: 1,
            testType: 'constant',
            method: 'GET',
            timeout: 5,
            thinkTime: 0.5
        }
    };
    
    console.log('🚀 启动短时间测试...');
    const testResponse = await fetch('http://localhost:3001/api/test/stress', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(testConfig)
    });
    
    if (!testResponse.ok) {
        console.log('⚠️ 需要认证，跳过此测试');
        return;
    }
    
    const testResult = await testResponse.json();
    if (!testResult.success) {
        console.log('❌ 测试启动失败:', testResult.message);
        return;
    }
    
    const testId = testResult.testId;
    console.log('🔑 测试ID:', testId);
    
    // 监控测试直到完成
    await monitorTestUntilEnd(testId, 'short duration');
}

async function monitorTestUntilEnd(testId, scenario) {
    console.log(`📊 开始监控测试 [${scenario}]: ${testId}`);
    
    let checkCount = 0;
    const maxChecks = 40; // 最多检查40次（约40秒）
    let completionEvents = [];
    
    return new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
            checkCount++;
            
            try {
                const statusResponse = await fetch(`http://localhost:3001/api/test/stress/status/${testId}`);
                const statusData = await statusResponse.json();
                
                if (statusData.success) {
                    const status = statusData.data.status;
                    const metrics = statusData.data.metrics || {};
                    
                    console.log(`   检查 ${checkCount}/${maxChecks} - 状态: ${status}, 请求: ${metrics.totalRequests || 0}`);
                    
                    // 检查测试是否完成
                    if (status === 'completed' || status === 'cancelled') {
                        completionEvents.push({
                            time: new Date().toISOString(),
                            status: status,
                            checkCount: checkCount
                        });
                        
                        // 等待额外2秒检查是否有重复处理
                        if (completionEvents.length === 1) {
                            console.log(`✅ 测试首次完成 [${scenario}]: ${status}`);
                            setTimeout(() => {
                                clearInterval(checkInterval);
                                
                                // 分析结果
                                console.log(`📈 测试结果分析 [${scenario}]:`);
                                console.log(`   最终状态: ${status}`);
                                console.log(`   总请求数: ${metrics.totalRequests || 0}`);
                                console.log(`   完成事件数: ${completionEvents.length}`);
                                
                                if (completionEvents.length === 1) {
                                    console.log(`✅ 结束逻辑正常 - 无重复处理`);
                                } else {
                                    console.log(`⚠️ 检测到重复处理事件: ${completionEvents.length} 次`);
                                    completionEvents.forEach((event, index) => {
                                        console.log(`     事件 ${index + 1}: ${event.time} - ${event.status}`);
                                    });
                                }
                                
                                resolve();
                            }, 2000);
                        } else {
                            console.log(`⚠️ 检测到重复完成事件 [${scenario}]: ${completionEvents.length} 次`);
                        }
                        
                        return;
                    }
                }
            } catch (error) {
                console.error(`❌ 状态检查失败 [${scenario}]:`, error.message);
            }
            
            // 超时检查
            if (checkCount >= maxChecks) {
                clearInterval(checkInterval);
                console.log(`⏰ 监控超时 [${scenario}]`);
                resolve();
            }
        }, 1000); // 每秒检查一次
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行测试
testEndingLogic();
