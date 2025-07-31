const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
const AUTH_TOKEN = 'test-token'; // 使用测试token

class CancelTestVerifier {
  constructor() {
    this.testId = null;
  }

  async startStressTest() {
    try {
      console.log('🚀 启动压力测试...');
      
      const response = await axios.post(`${API_BASE}/test/stress/start`, {
        url: 'http://httpbin.org/delay/1',
        users: 5,
        duration: 30, // 30秒测试
        rampUpTime: 5,
        testType: 'load',
        method: 'GET',
        timeout: 5000,
        thinkTime: 1000
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        timeout: 10000
      });

      if (response.data.success) {
        this.testId = response.data.data.testId;
        console.log('✅ 压力测试启动成功，testId:', this.testId);
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

  async waitAndCancel(waitSeconds = 10) {
    if (!this.testId) {
      console.error('❌ 没有测试ID，无法取消');
      return false;
    }

    console.log(`⏰ 等待 ${waitSeconds} 秒后取消测试...`);
    await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));

    try {
      console.log('🛑 取消压力测试...');
      
      const response = await axios.post(`${API_BASE}/test/stress/cancel/${this.testId}`, {
        reason: '测试取消功能修复验证'
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

  async checkTestStatus() {
    if (!this.testId) {
      console.error('❌ 没有测试ID，无法检查状态');
      return null;
    }

    try {
      const response = await axios.get(`${API_BASE}/test/stress/status/${this.testId}`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      });

      if (response.data.success) {
        console.log('📊 测试状态:', response.data.data);
        return response.data.data;
      } else {
        console.error('❌ 获取测试状态失败:', response.data.message);
        return null;
      }
    } catch (error) {
      console.error('❌ 检查测试状态异常:', error.message);
      return null;
    }
  }

  async runTest() {
    console.log('🧪 开始验证取消功能修复...\n');

    // 1. 启动测试
    const started = await this.startStressTest();
    if (!started) {
      console.log('❌ 测试启动失败，退出');
      return;
    }

    // 2. 等待一段时间后取消
    const cancelled = await this.waitAndCancel(8);
    if (!cancelled) {
      console.log('❌ 测试取消失败');
      return;
    }

    // 3. 等待一段时间检查状态
    console.log('⏰ 等待3秒后检查最终状态...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const finalStatus = await this.checkTestStatus();
    if (finalStatus && finalStatus.status === 'cancelled') {
      console.log('✅ 取消功能验证成功！测试已正确取消');
    } else {
      console.log('❌ 取消功能验证失败！测试状态:', finalStatus?.status);
    }
  }
}

// 运行测试
const verifier = new CancelTestVerifier();
verifier.runTest().catch(console.error);
