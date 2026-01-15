/**
 * API Analyzer
 * Alias for ApiTestEngine to maintain backward compatibility
 */

const ApiTestEngine = require('./apiTestEngine');

class ApiAnalyzer extends ApiTestEngine {
  constructor(options = {}) {
    super(options);
    this.name = 'api-analyzer';
    this.description = 'API分析引擎';
  }
}

module.exports = ApiAnalyzer;
