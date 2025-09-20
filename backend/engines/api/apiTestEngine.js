/**
 * API测试引擎
 * 基于APIAnalyzer提供标准化的API测试接口
 */

const APIAnalyzer = require('./APIAnalyzer.js');

class ApiTestEngine {
  constructor(options = {}) {
    this.name = 'api';
    this.version = '2.0.0';
    this.description = 'API端点测试引擎';
    this.options = options;
    this.analyzer = new APIAnalyzer(options);
  }

  /**
   * 检查引擎可用性
   */
  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: [
        'api-testing',
        'endpoint-analysis',
        'performance-testing'
      ]
    };
  }

  /**
   * 执行API测试
   */
  async executeTest(config) {
    try {
      const { apiSpec, url } = config;
      
      // 如果只提供URL，构造简单的API规范
      const testSpec = apiSpec || url || 'http://example.com/api';
      
      const results = await this.analyzer.analyze(testSpec, config);
      
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
    // API测试引擎不需要特殊清理
    console.log('✅ API测试引擎清理完成');
  }
}

module.exports = ApiTestEngine;
