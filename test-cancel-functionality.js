/**
 * 测试压力测试取消功能的完整性
 * 这个脚本会启动一个压力测试，然后立即取消它，验证整个流程
 */

const axios = require('axios');
const { io } = require('socket.io-client');

const API_BASE = 'http://localhost:3001/api';
const WS_URL = 'http://localhost:3001';

// 模拟用户认证token（在实际环境中需要真实的token）
const AUTH_TOKEN = 'test-token';

class CancelFunctionalityTester {
  constructor() {
    this.socket = null;
    this.testId = null;
    this.receivedEvents = [];
  }

  async setupWebSocket() {
    return new Promise((resolve, reject) => {
      this.socket = io(WS_URL, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        console.log('✅ WebSocket连接成功');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket连接失败:', error);
        reject(error);
      });

      // 监听所有压力测试相关事件
      this.socket.on('stress-test-data', (data) => {
        console.log('📊 收到实时数据:', data.testId);
        this.receivedEvents.push({ type: 'data', data });
      });

      this.socket.on('stress-test-status', (data) => {
        console.log('📈 收到状态更新:', data.status, data.message);
        this.receivedEvents.push({ type: 'status', data });
      });

      this.socket.on('stress-test-complete', (data) => {
        console.log('🏁 收到完成事件:', data.results?.status);
        this.receivedEvents.push({ type: 'complete', data });
      });

      this.socket.on('room-joined', (data) => {
        console.log('🏠 房间加入确认:', data.testId);
      });
    });
  }

  async startStressTest() {
    try {
      console.log('🚀 启动压力测试...');
      
      const testConfig = {
        url: 'https://httpbin.org/delay/1',
        options: {
          users: 5,
          duration: 30,
          rampUpTime: 3,
          testType: 'gradual',
          method: 'GET',
          timeout: 10,
          thinkTime: 0.5
        }
      };

      const response = await axios.post(`${API_BASE}/test/stress`, testConfig, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        timeout: 10000
      });

      if (response.data.success) {
        this.testId = response.data.data.testId;
        console.log('✅ 压力测试启动成功, ID:', this.testId);
        
        // 加入WebSocket房间
        this.socket.emit('join-stress-test', this.testId);
        console.log('🏠 已发送加入房间请求');
        
        return true;
      } else {
        console.error('❌ 压力测试启动失败:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('❌ 启动压力测试异常:', error.message);
      return false;
    }
  }

  async cancelStressTest() {
    if (!this.testId) {
      console.error('❌ 没有测试ID，无法取消');
      return false;
    }

    try {
      console.log('🛑 取消压力测试...');
      
      const response = await axios.post(`${API_BASE}/test/stress/cancel/${this.testId}`, {
        reason: '自动化测试取消'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        timeout: 10000
      });

      if (response.data.success) {
        console.log('✅ 压力测试取消成功');
        console.log('📊 取消结果:', response.data.data);
        return true;
      } else {
        console.error('❌ 压力测试取消失败:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('❌ 取消压力测试异常:', error.message);
      return false;
    }
  }

  async waitForEvents(timeout = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkEvents = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeout) {
          resolve();
          return;
        }

        // 检查是否收到取消相关事件
        const cancelEvents = this.receivedEvents.filter(event => 
          (event.type === 'status' && event.data.status === 'cancelled') ||
          (event.type === 'complete' && event.data.results?.status === 'cancelled')
        );

        if (cancelEvents.length > 0) {
          console.log('✅ 收到取消事件');
          resolve();
          return;
        }

        setTimeout(checkEvents, 500);
      };
      
      checkEvents();
    });
  }

  analyzeResults() {
    console.log('\n📊 事件分析结果:');
    console.log(`总共收到 ${this.receivedEvents.length} 个事件`);
    
    const eventTypes = {};
    this.receivedEvents.forEach(event => {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
    });
    
    Object.entries(eventTypes).forEach(([type, count]) => {
      console.log(`- ${type}: ${count} 个`);
    });

    // 检查取消相关事件
    const cancelStatusEvents = this.receivedEvents.filter(event => 
      event.type === 'status' && event.data.status === 'cancelled'
    );
    
    const cancelCompleteEvents = this.receivedEvents.filter(event => 
      event.type === 'complete' && event.data.results?.status === 'cancelled'
    );

    console.log('\n🔍 取消功能验证:');
    console.log(`✅ 取消状态事件: ${cancelStatusEvents.length > 0 ? '收到' : '未收到'}`);
    console.log(`✅ 取消完成事件: ${cancelCompleteEvents.length > 0 ? '收到' : '未收到'}`);
    
    return {
      totalEvents: this.receivedEvents.length,
      hasCancelStatus: cancelStatusEvents.length > 0,
      hasCancelComplete: cancelCompleteEvents.length > 0,
      success: cancelStatusEvents.length > 0 || cancelCompleteEvents.length > 0
    };
  }

  cleanup() {
    if (this.socket) {
      this.socket.disconnect();
      console.log('🔌 WebSocket连接已断开');
    }
  }

  async runTest() {
    try {
      console.log('🧪 开始压力测试取消功能测试\n');
      
      // 1. 建立WebSocket连接
      await this.setupWebSocket();
      
      // 2. 启动压力测试
      const startSuccess = await this.startStressTest();
      if (!startSuccess) {
        throw new Error('启动压力测试失败');
      }
      
      // 3. 等待一段时间让测试开始运行
      console.log('⏳ 等待测试开始运行...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 4. 取消压力测试
      const cancelSuccess = await this.cancelStressTest();
      if (!cancelSuccess) {
        throw new Error('取消压力测试失败');
      }
      
      // 5. 等待WebSocket事件
      console.log('⏳ 等待WebSocket事件...');
      await this.waitForEvents(10000);
      
      // 6. 分析结果
      const results = this.analyzeResults();
      
      console.log('\n🎯 测试结果总结:');
      if (results.success) {
        console.log('✅ 取消功能测试通过');
        console.log('✅ WebSocket事件正确接收');
        console.log('✅ 取消状态正确传播');
      } else {
        console.log('❌ 取消功能测试失败');
        console.log('❌ 未收到预期的取消事件');
      }
      
      return results.success;
      
    } catch (error) {
      console.error('❌ 测试执行失败:', error.message);
      return false;
    } finally {
      this.cleanup();
    }
  }
}

// 运行测试
async function main() {
  const tester = new CancelFunctionalityTester();
  const success = await tester.runTest();
  process.exit(success ? 0 : 1);
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 测试运行异常:', error);
    process.exit(1);
  });
}

module.exports = CancelFunctionalityTester;
