const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
const AUTH_TOKEN = 'test-token-123';

async function testCancel() {
  console.log('🧪 开始简单取消测试...\n');

  try {
    // 1. 启动一个长时间的压力测试
    console.log('1️⃣ 启动压力测试...');
    const startResponse = await axios.post(`${API_BASE}/test/stress/start`, {
      url: 'https://httpbin.org/delay/2', // 每个请求延迟2秒
      method: 'GET',
      users: 20,
      duration: 120, // 2分钟测试
      pattern: 'constant',
      timeout: 10000,
      thinkTime: 1000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      timeout: 10000
    });

    if (!startResponse.data.success) {
      throw new Error(`测试启动失败: ${startResponse.data.message}`);
    }

    const testId = startResponse.data.data.testId;
    console.log(`✅ 测试启动成功: ${testId}`);

    // 2. 等待5秒让测试开始运行
    console.log('\n2️⃣ 等待5秒让测试开始运行...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. 检查测试状态
    console.log('\n3️⃣ 检查测试状态...');
    const statusResponse = await axios.get(`${API_BASE}/test/stress/status/${testId}`, {
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    });

    console.log('📊 测试状态:', {
      status: statusResponse.data.data.status,
      progress: statusResponse.data.data.progress,
      activeUsers: statusResponse.data.data.metrics?.activeUsers,
      totalRequests: statusResponse.data.data.metrics?.totalRequests
    });

    // 4. 发送取消请求
    console.log('\n4️⃣ 发送取消请求...');
    const cancelResponse = await axios.post(`${API_BASE}/test/stress/cancel/${testId}`, {
      reason: '简单测试取消功能'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      timeout: 10000
    });

    console.log('📊 取消响应:', {
      success: cancelResponse.data.success,
      message: cancelResponse.data.message,
      status: cancelResponse.data.data?.status,
      cancelled: cancelResponse.data.data?.cancelled
    });

    if (cancelResponse.data.success) {
      console.log('✅ 取消请求成功发送');
    } else {
      console.log('❌ 取消请求失败:', cancelResponse.data.message);
    }

    // 5. 等待3秒后再次检查状态
    console.log('\n5️⃣ 等待3秒后检查最终状态...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const finalStatusResponse = await axios.get(`${API_BASE}/test/stress/status/${testId}`, {
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
      });

      console.log('📊 最终状态:', {
        status: finalStatusResponse.data.data.status,
        cancelled: finalStatusResponse.data.data.cancelled,
        endTime: finalStatusResponse.data.data.endTime,
        activeUsers: finalStatusResponse.data.data.metrics?.activeUsers
      });
    } catch (error) {
      console.log('⚠️ 获取最终状态失败，可能测试已被清理');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testCancel().then(() => {
  console.log('\n🏁 测试完成');
  process.exit(0);
}).catch((error) => {
  console.error('❌ 测试异常:', error);
  process.exit(1);
});
