const axios = require('axios');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:3001/api';
const WS_URL = 'http://localhost:3001';
const AUTH_TOKEN = 'test-token-123';

class CancelDebugger {
  constructor() {
    this.testId = null;
    this.socket = null;
    this.wsDataReceived = false;
    this.cancelRequestSent = false;
    this.testStoppedAfterCancel = false;
  }

  async debug() {
    console.log('🔍 开始调试取消功能...\n');

    try {
      // 1. 建立WebSocket连接
      console.log('1️⃣ 建立WebSocket连接...');
      this.socket = io(WS_URL, {
        transports: ['websocket'],
        timeout: 5000
      });

      await new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          console.log('✅ WebSocket连接成功');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ WebSocket连接失败:', error.message);
          reject(error);
        });

        setTimeout(() => reject(new Error('WebSocket连接超时')), 5000);
      });

      // 监听WebSocket数据
      this.socket.on('stressTestUpdate', (data) => {
        console.log(`📡 收到WebSocket数据: testId=${data.testId}, status=${data.status}, progress=${data.progress}%`);
        
        if (data.testId === this.testId) {
          this.wsDataReceived = true;
          
          // 如果在取消请求发送后还收到非取消状态的数据，说明有问题
          if (this.cancelRequestSent && data.status !== 'cancelled') {
            console.log(`⚠️ 取消请求发送后仍收到非取消状态数据: ${data.status}`);
          } else if (data.status === 'cancelled') {
            console.log('✅ 收到取消状态确认');
            this.testStoppedAfterCancel = true;
          }
        }
      });

      // 2. 启动压力测试
      console.log('\n2️⃣ 启动压力测试...');
      const startResponse = await axios.post(`${API_BASE}/test/stress/start`, {
        url: 'https://httpbin.org/delay/1',
        method: 'GET',
        users: 50,
        duration: 60, // 60秒测试
        pattern: 'constant',
        timeout: 5000,
        thinkTime: 1000
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        timeout: 10000
      });

      if (startResponse.data.success) {
        this.testId = startResponse.data.data.testId;
        console.log(`✅ 测试启动成功: ${this.testId}`);
      } else {
        throw new Error(`测试启动失败: ${startResponse.data.message}`);
      }

      // 3. 等待测试开始运行
      console.log('\n3️⃣ 等待测试开始运行...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 4. 检查测试状态
      console.log('\n4️⃣ 检查测试状态...');
      const statusResponse = await axios.get(`${API_BASE}/test/stress/status/${this.testId}`, {
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
      });

      console.log('📊 测试状态:', {
        status: statusResponse.data.data.status,
        progress: statusResponse.data.data.progress,
        activeUsers: statusResponse.data.data.metrics?.activeUsers,
        totalRequests: statusResponse.data.data.metrics?.totalRequests
      });

      // 5. 发送取消请求
      console.log('\n5️⃣ 发送取消请求...');
      this.cancelRequestSent = true;
      const cancelTime = Date.now();
      
      const cancelResponse = await axios.post(`${API_BASE}/test/stress/cancel/${this.testId}`, {
        reason: '调试取消功能'
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

      // 6. 等待并检查取消是否生效
      console.log('\n6️⃣ 等待并检查取消是否生效...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 7. 再次检查测试状态
      console.log('\n7️⃣ 检查取消后的测试状态...');
      try {
        const finalStatusResponse = await axios.get(`${API_BASE}/test/stress/status/${this.testId}`, {
          headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });

        console.log('📊 最终测试状态:', {
          status: finalStatusResponse.data.data.status,
          cancelled: finalStatusResponse.data.data.cancelled,
          endTime: finalStatusResponse.data.data.endTime,
          activeUsers: finalStatusResponse.data.data.metrics?.activeUsers
        });

        if (finalStatusResponse.data.data.status === 'cancelled') {
          console.log('✅ 测试状态已正确更新为已取消');
        } else {
          console.log('❌ 测试状态未更新为已取消，可能存在问题');
        }
      } catch (error) {
        console.log('⚠️ 获取最终状态失败，可能测试已被清理:', error.message);
      }

      // 8. 总结调试结果
      console.log('\n8️⃣ 调试结果总结:');
      console.log(`WebSocket数据接收: ${this.wsDataReceived ? '✅' : '❌'}`);
      console.log(`取消请求发送: ${this.cancelRequestSent ? '✅' : '❌'}`);
      console.log(`取消后测试停止: ${this.testStoppedAfterCancel ? '✅' : '❌'}`);

      if (this.wsDataReceived && this.cancelRequestSent && this.testStoppedAfterCancel) {
        console.log('\n🎉 取消功能工作正常！');
      } else {
        console.log('\n⚠️ 取消功能可能存在问题，需要进一步调试');
      }

    } catch (error) {
      console.error('❌ 调试过程中发生错误:', error.message);
    } finally {
      if (this.socket) {
        this.socket.disconnect();
        console.log('🔌 WebSocket连接已断开');
      }
    }
  }
}

// 运行调试
const debugger = new CancelDebugger();
debugger.debug().then(() => {
  console.log('\n🏁 调试完成');
  process.exit(0);
}).catch((error) => {
  console.error('❌ 调试失败:', error);
  process.exit(1);
});
