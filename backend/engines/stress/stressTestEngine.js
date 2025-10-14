/**
 * 压力测试引擎
 * 基于StressAnalyzer提供标准化的压力测试接口
 */

const StressAnalyzer = require('./StressAnalyzer.js');

class StressTestEngine {
  constructor(options = {}) {
    this.name = 'stress';
    this.version = '2.0.0';
    this.description = '压力测试引擎';
    this.options = options;
    this.analyzer = new StressAnalyzer(options);
  }

  /**
   * 检查引擎可用性
   */
  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: [
        'stress-testing',
        'load-generation',
        'performance-analysis',
        'concurrency-testing'
      ]
    };
  }

  /**
   * 执行压力测试
   */
  async executeTest(config) {
    try {
      const { url = 'http://example.com' } = config;
      
      // 提供默认的压力测试配置
      const testConfig = {
        duration: 30, // 30秒测试
        concurrency: 5, // 5个并发用户
        ...config
      };
      
      const results = await this.analyzer.analyze(url, testConfig);
      
      return {
        engine: this.name,
        version: this.version,
        success: true,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        engine: this.name,
        version: this.version,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取引擎信息
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      available: this.checkAvailability()
    };
  }

  /**
   * 清理资源
   */
  async cleanup() {
    if (this.analyzer && typeof this.analyzer.cleanup === 'function') {
      await this.analyzer.cleanup();
    }
    console.log('✅ 压力测试引擎清理完成');
  }

  /**
   * 清理所有测试房间
   */
  async cleanupAllTestRooms() {
    try {
      // 如果analyzer有清理房间的方法，调用它
      if (this.analyzer && typeof this.analyzer.cleanupAllTestRooms === 'function') {
        await this.analyzer.cleanupAllTestRooms();
      }
      
      // 如果有WebSocket实例，清理所有房间
      if (this.io) {
        const rooms = Array.from(this.io.sockets.adapter.rooms.keys());
        for (const room of rooms) {
          if (room.startsWith('stress-test-')) {
            this.io.socketsLeave(room);
          }
        }
      }
      
      console.log('✅ 所有测试房间已清理');
      return { success: true, message: '所有测试房间已清理' };
    } catch (error) {
      console.warn('⚠️ 清理测试房间时出现警告:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = StressTestEngine;
