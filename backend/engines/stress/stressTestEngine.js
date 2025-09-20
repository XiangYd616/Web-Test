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
}

module.exports = StressTestEngine;
