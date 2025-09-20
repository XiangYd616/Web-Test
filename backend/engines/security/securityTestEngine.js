/**
 * 安全测试引擎
 * 基于SecurityAnalyzer提供标准化的安全测试接口
 */

const SecurityAnalyzer = require('./SecurityAnalyzer.js');

class SecurityTestEngine {
  constructor(options = {}) {
    this.name = 'security';
    this.version = '2.0.0';
    this.description = '安全测试引擎';
    this.options = options;
    this.analyzer = new SecurityAnalyzer(options);
  }

  /**
   * 检查引擎可用性
   */
  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: [
        'security-testing',
        'vulnerability-scanning',
        'ssl-analysis',
        'security-headers'
      ]
    };
  }

  /**
   * 执行安全测试
   */
  async executeTest(config) {
    try {
      const { url = 'https://example.com' } = config;
      
      const results = await this.analyzer.executeTest({ url, ...config });
      
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
    console.log('✅ 安全测试引擎清理完成');
  }
}

module.exports = SecurityTestEngine;
