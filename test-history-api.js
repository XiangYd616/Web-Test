/**
 * 测试新的历史记录API功能
 */

const BASE_URL = 'http://localhost:3001';

async function testHistoryAPI() {
    console.log('🧪 开始测试历史记录API...');
    
    try {
        // 1. 创建测试记录
        console.log('\n1️⃣ 创建测试记录...');
        const createResponse = await fetch(`${BASE_URL}/api/test/history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                testName: '测试历史记录API - 示例测试',
                testType: 'stress',
                url: 'https://httpbin.org/delay/1',
                status: 'pending',
                config: {
                    users: 10,
                    duration: 30,
                    method: 'GET'
                },
                tags: ['api-test', 'demo'],
                environment: 'development'
            })
        });
        
        const createData = await createResponse.json();
        console.log('✅ 创建结果:', createData);
        
        if (!createData.success) {
            throw new Error('创建测试记录失败');
        }
        
        const testId = createData.data.id;
        console.log(`📝 测试记录ID: ${testId}`);
        
        // 2. 开始测试
        console.log('\n2️⃣ 开始测试...');
        const startResponse = await fetch(`${BASE_URL}/api/test/history/${testId}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const startData = await startResponse.json();
        console.log('✅ 开始测试结果:', startData);
        
        // 3. 更新进度
        console.log('\n3️⃣ 更新测试进度...');
        for (let i = 1; i <= 3; i++) {
            const progressResponse = await fetch(`${BASE_URL}/api/test/history/${testId}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    progress: i * 25,
                    phase: i === 1 ? 'initialization' : i === 2 ? 'ramp_up' : 'steady_state',
                    step: `测试阶段 ${i}`,
                    currentUsers: i * 3,
                    currentTps: i * 10,
                    currentResponseTime: 100 + i * 50,
                    currentErrorRate: i * 0.5,
                    metrics: {
                        timestamp: new Date().toISOString(),
                        phase: `phase_${i}`
                    }
                })
            });
            
            const progressData = await progressResponse.json();
            console.log(`✅ 进度更新 ${i}:`, progressData);
            
            // 等待1秒
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // 4. 完成测试
        console.log('\n4️⃣ 完成测试...');
        const completeResponse = await fetch(`${BASE_URL}/api/test/history/${testId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                results: {
                    summary: '测试完成',
                    metrics: {
                        totalRequests: 300,
                        successfulRequests: 285,
                        failedRequests: 15,
                        averageResponseTime: 250,
                        throughput: 10
                    }
                },
                overallScore: 85.5,
                performanceGrade: 'B+',
                totalRequests: 300,
                successfulRequests: 285,
                failedRequests: 15,
                averageResponseTime: 250,
                peakTps: 12,
                errorRate: 5.0,
                realTimeData: [
                    { timestamp: new Date().toISOString(), tps: 8, responseTime: 200, errorRate: 2 },
                    { timestamp: new Date().toISOString(), tps: 10, responseTime: 250, errorRate: 5 },
                    { timestamp: new Date().toISOString(), tps: 12, responseTime: 300, errorRate: 8 }
                ]
            })
        });
        
        const completeData = await completeResponse.json();
        console.log('✅ 完成测试结果:', completeData);
        
        // 5. 获取测试进度历史
        console.log('\n5️⃣ 获取测试进度历史...');
        const progressHistoryResponse = await fetch(`${BASE_URL}/api/test/history/${testId}/progress`);
        const progressHistoryData = await progressHistoryResponse.json();
        console.log('✅ 进度历史:', progressHistoryData);
        
        // 6. 获取所有测试历史
        console.log('\n6️⃣ 获取所有测试历史...');
        const historyResponse = await fetch(`${BASE_URL}/api/test/history`);
        const historyData = await historyResponse.json();
        console.log('✅ 测试历史列表:', historyData);
        
        console.log('\n🎉 所有API测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

// 运行测试
testHistoryAPI();
