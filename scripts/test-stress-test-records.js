#!/usr/bin/env node

/**
 * 压力测试记录功能验证脚本
 * 验证测试记录的完整生命周期管理
 */

const axios = require('axios');
const { io } = require('socket.io-client');

const API_BASE = 'http://localhost:3001/api';
const WS_URL = 'http://localhost:3001';

class StressTestRecordValidator {
  constructor() {
    this.socket = null;
    this.testRecords = [];
    this.receivedUpdates = [];
  }

  async initialize() {
    console.log('🚀 初始化压力测试记录验证器...');
    
    // 建立WebSocket连接
    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });

    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        console.log('✅ WebSocket连接成功');
        
        // 加入测试历史更新房间
        this.socket.emit('join-room', { room: 'test-history-updates' });
        
        // 监听测试记录更新
        this.socket.on('test-record-update', (data) => {
          console.log('📊 收到测试记录更新:', data);
          this.receivedUpdates.push(data);
        });

        this.socket.on('room-joined', (data) => {
          if (data.room === 'test-history-updates') {
            console.log('✅ 成功加入测试历史更新房间');
            resolve();
          }
        });
      });

      this.socket.on('error', (error) => {
        console.error('❌ WebSocket连接错误:', error);
        reject(error);
      });

      setTimeout(() => {
        reject(new Error('WebSocket连接超时'));
      }, 10000);
    });
  }

  async testStressTestLifecycle() {
    console.log('\n🧪 开始测试压力测试记录生命周期...');

    try {
      // 1. 获取初始测试历史
      console.log('📋 1. 获取初始测试历史...');
      const initialHistory = await this.getTestHistory();
      console.log(`✅ 当前测试记录数量: ${initialHistory.length}`);

      // 2. 启动压力测试
      console.log('🚀 2. 启动压力测试...');
      const testConfig = {
        url: 'https://httpbin.org/delay/1',
        options: {
          users: 5,
          duration: 10,
          rampUpTime: 2,
          testType: 'gradual'
        }
      };

      const testResponse = await this.startStressTest(testConfig);
      console.log('✅ 压力测试已启动');

      // 3. 等待一段时间，检查实时更新
      console.log('⏳ 3. 等待实时更新...');
      await this.waitForUpdates(15000); // 等待15秒

      // 4. 检查最终测试历史
      console.log('📋 4. 检查最终测试历史...');
      const finalHistory = await this.getTestHistory();
      console.log(`✅ 最终测试记录数量: ${finalHistory.length}`);

      // 5. 验证结果
      this.validateResults(initialHistory, finalHistory);

    } catch (error) {
      console.error('❌ 测试失败:', error);
      throw error;
    }
  }

  async getTestHistory() {
    try {
      const response = await axios.get(`${API_BASE}/test/history?type=stress&limit=50`);
      return response.data.data?.tests || [];
    } catch (error) {
      console.error('获取测试历史失败:', error);
      return [];
    }
  }

  async startStressTest(config) {
    try {
      const response = await axios.post(`${API_BASE}/test/stress`, config, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('启动压力测试失败:', error);
      throw error;
    }
  }

  async waitForUpdates(duration) {
    return new Promise((resolve) => {
      console.log(`⏳ 等待 ${duration/1000} 秒，监听实时更新...`);
      
      let updateCount = 0;
      const startTime = Date.now();
      
      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newUpdates = this.receivedUpdates.length - updateCount;
        
        if (newUpdates > 0) {
          console.log(`📊 收到 ${newUpdates} 个新更新 (总计: ${this.receivedUpdates.length})`);
          updateCount = this.receivedUpdates.length;
        }
        
        if (elapsed >= duration) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });
  }

  validateResults(initialHistory, finalHistory) {
    console.log('\n🔍 验证测试结果...');

    // 检查是否有新的测试记录
    const newRecords = finalHistory.length - initialHistory.length;
    console.log(`📊 新增测试记录数量: ${newRecords}`);

    // 检查WebSocket更新
    console.log(`📡 收到的WebSocket更新数量: ${this.receivedUpdates.length}`);

    // 查找最新的测试记录
    const latestRecord = finalHistory[0];
    if (latestRecord) {
      console.log('📋 最新测试记录:');
      console.log(`  - ID: ${latestRecord.id}`);
      console.log(`  - 状态: ${latestRecord.status}`);
      console.log(`  - 进度: ${latestRecord.progress || 0}%`);
      console.log(`  - 开始时间: ${latestRecord.startTime}`);
      console.log(`  - 结束时间: ${latestRecord.endTime || '未完成'}`);
    }

    // 验证期望结果
    const expectations = [
      { condition: newRecords >= 1, message: '应该有至少1个新的测试记录' },
      { condition: this.receivedUpdates.length >= 1, message: '应该收到至少1个WebSocket更新' },
      { condition: latestRecord?.status !== 'pending', message: '最新记录状态不应该是pending' }
    ];

    let passedTests = 0;
    expectations.forEach((expectation, index) => {
      const status = expectation.condition ? '✅' : '❌';
      console.log(`${status} ${index + 1}. ${expectation.message}`);
      if (expectation.condition) passedTests++;
    });

    console.log(`\n📊 验证结果: ${passedTests}/${expectations.length} 项测试通过`);

    if (passedTests === expectations.length) {
      console.log('🎉 所有测试通过！压力测试记录功能正常工作。');
    } else {
      console.log('⚠️ 部分测试失败，需要检查实现。');
    }
  }

  async cleanup() {
    if (this.socket) {
      this.socket.disconnect();
      console.log('🔌 WebSocket连接已关闭');
    }
  }
}

// 主函数
async function main() {
  const validator = new StressTestRecordValidator();
  
  try {
    await validator.initialize();
    await validator.testStressTestLifecycle();
  } catch (error) {
    console.error('❌ 验证过程失败:', error);
    process.exit(1);
  } finally {
    await validator.cleanup();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = StressTestRecordValidator;
