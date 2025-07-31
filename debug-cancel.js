const axios = require('axios');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:3001/api';
const WS_URL = 'http://localhost:3001';
const AUTH_TOKEN = 'test-token';

async function testCancelFlow() {
  console.log('🧪 开始测试取消功能流程...\n');

  let testId = null;
  let socket = null;
  let wsDataReceived = false;
  let wsDataAfterCancel = false;

  try {
    // 1. 建立WebSocket连接
    console.log('1️⃣ 建立WebSocket连接...');
    socket = io(WS_URL, {
      transports: ['websocket'],
      timeout: 5000
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket连接成功');
    });

    socket.on('stressTestUpdate', (data) => {
      console.log('📡 收到WebSocket数据:', {
        testId: data.testId,
        status: data.status,
        progress: data.progress,
        totalRequests: data.realTimeMetrics?.totalRequests
      });

      if (!wsDataReceived) {
        wsDataReceived = true;
      }

      // 如果在取消后还收到数据，标记为问题
      if (testId && data.testId === testId && data.status !== 'cancelled') {
        wsDataAfterCancel = true;
      }
    });

    // 等待连接建立
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. 启动测试
    console.log('\n2️⃣ 启动压力测试...');
    const startResponse = await axios.post(`${API_BASE}/test/stress/start`, {
      url: 'http://httpbin.org/delay/1',
      users: 5,
      duration: 60, // 60秒测试
      rampUpTime: 5,
      testType: 'load',
      method: 'GET',
      timeout: 5000,
      thinkTime: 1000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });

    if (!startResponse.data.success) {
      console.error('❌ 测试启动失败:', startResponse.data.message);
      return;
    }

    testId = startResponse.data.data.testId;
    console.log('✅ 测试启动成功，testId:', testId);

    // 3. 等待8秒让测试开始运行并收集数据
    console.log('\n3️⃣ 等待8秒让测试开始运行...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // 4. 检查测试状态
    console.log('\n4️⃣ 检查测试状态...');
    const statusResponse = await axios.get(`${API_BASE}/test/stress/status/${testId}`, {
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    });

    if (statusResponse.data.success) {
      console.log('📊 取消前状态:', {
        status: statusResponse.data.data.status,
        progress: statusResponse.data.data.progress,
        totalRequests: statusResponse.data.data.realTimeMetrics?.totalRequests,
        activeUsers: statusResponse.data.data.realTimeMetrics?.activeUsers
      });
    }

    // 5. 取消测试
    console.log('\n5️⃣ 取消测试...');
    const cancelTime = Date.now();
    const cancelResponse = await axios.post(`${API_BASE}/test/stress/cancel/${testId}`, {
      reason: '调试测试取消功能'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });

    if (cancelResponse.data.success) {
      console.log('✅ 取消请求成功');
      console.log('📊 取消响应:', {
        status: cancelResponse.data.data.status,
        cancelled: cancelResponse.data.data.cancelled,
        endTime: cancelResponse.data.data.endTime
      });
    } else {
      console.error('❌ 取消请求失败:', cancelResponse.data.message);
    }

    // 6. 等待5秒后再次检查状态
    console.log('\n6️⃣ 等待5秒后检查最终状态...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const finalStatusResponse = await axios.get(`${API_BASE}/test/stress/status/${testId}`, {
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    });

    if (finalStatusResponse.data.success) {
      console.log('📊 最终状态:', {
        status: finalStatusResponse.data.data.status,
        cancelled: finalStatusResponse.data.data.cancelled,
        progress: finalStatusResponse.data.data.progress,
        totalRequests: finalStatusResponse.data.data.realTimeMetrics?.totalRequests,
        activeUsers: finalStatusResponse.data.data.realTimeMetrics?.activeUsers
      });

      // 7. 分析结果
      console.log('\n7️⃣ 分析结果:');
      if (finalStatusResponse.data.data.status === 'cancelled') {
        console.log('✅ 后端状态正确：测试已标记为cancelled');
      } else {
        console.log('❌ 后端状态错误：状态不是cancelled，而是', finalStatusResponse.data.data.status);
      }

      if (wsDataReceived) {
        console.log('✅ WebSocket数据接收正常');
      } else {
        console.log('❌ WebSocket数据接收异常');
      }

      if (wsDataAfterCancel) {
        console.log('❌ 问题发现：取消后仍在接收WebSocket数据');
      } else {
        console.log('✅ WebSocket数据在取消后正确停止');
      }
    }

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  } finally {
    if (socket) {
      socket.disconnect();
      console.log('🔌 WebSocket连接已断开');
    }
  }
}

// 运行测试
testCancelFlow().catch(console.error);
