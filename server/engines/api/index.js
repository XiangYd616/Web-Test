/**
 * API测试引擎入口文件
 * 提供统一的API测试接口
 */

const APIAnalyzer = require('./APIAnalyzer');
const { getPool } = require('../../config/database');

class APIEngine {
  constructor() {
    this.analyzer = null;
    this.isRunning = false;
  }

  /**
   * 启动API测试
   */
  async startTest(testId, url, config = {}) {
    try {
      console.log(`🔗 启动API测试: ${testId} - ${url}`);
      
      // 更新测试状态为运行中
      await this.updateTestStatus(testId, 'running', { started_at: new Date() });
      
      // 发送初始进度
      await this.sendProgress(testId, {
        percentage: 0,
        stage: 'initializing',
        message: '初始化API测试引擎...'
      });
      
      // 创建分析器实例
      this.analyzer = new APIAnalyzer(config);
      this.isRunning = true;
      
      // 准备API规范
      const apiSpec = await this.prepareAPISpec(url, config);
      
      // 执行分析（带进度回调）
      const analysisResults = await this.analyzer.analyze(apiSpec, {
        ...config,
        onProgress: (progress) => this.sendProgress(testId, progress)
      });
      
      // 发送分析完成进度
      await this.sendProgress(testId, {
        percentage: 95,
        stage: 'saving',
        message: '保存分析结果...'
      });
      
      // 保存分析结果
      await this.saveResults(testId, analysisResults);
      
      // 更新测试状态为完成
      await this.updateTestStatus(testId, 'completed', {
        completed_at: new Date(),
        duration_ms: analysisResults.analysisTime,
        overall_score: analysisResults.scores.overall,
        grade: analysisResults.scores.grade,
        total_checks: this.calculateTotalChecks(analysisResults),
        passed_checks: this.calculatePassedChecks(analysisResults),
        failed_checks: this.calculateFailedChecks(analysisResults),
        warnings: this.calculateWarnings(analysisResults)
      });
      
      // 发送完成进度
      await this.sendProgress(testId, {
        percentage: 100,
        stage: 'completed',
        message: 'API测试完成'
      });
      
      const summary = this.createSummary(analysisResults);
      
      // 发送测试完成通知
      await this.sendTestComplete(testId, summary);
      
      console.log(`✅ API测试完成: ${testId} - 评分: ${analysisResults.scores.overall}`);
      
      return {
        success: true,
        testId,
        results: summary
      };
      
    } catch (error) {
      console.error(`❌ API测试失败: ${testId}`, error);
      
      // 更新测试状态为失败
      await this.updateTestStatus(testId, 'failed', {
        completed_at: new Date(),
        error_message: error.message
      });
      
      // 发送测试失败通知
      await this.sendTestFailed(testId, error);
      
      throw error;
    } finally {
      this.isRunning = false;
      if (this.analyzer) {
        await this.analyzer.cleanup();
        this.analyzer = null;
      }
    }
  }

  /**
   * 准备API规范
   */
  async prepareAPISpec(url, config) {
    try {
      // 如果提供了OpenAPI规范URL
      if (config.openApiUrl) {
        const response = await fetch(config.openApiUrl);
        return await response.json();
      }
      
      // 如果提供了内联规范
      if (config.apiSpec) {
        return config.apiSpec;
      }
      
      // 如果提供了端点列表
      if (config.endpoints) {
        return {
          endpoints: config.endpoints.map(endpoint => ({
            ...endpoint,
            path: this.resolveUrl(url, endpoint.path)
          }))
        };
      }
      
      // 默认：单个端点测试
      return {
        endpoints: [{
          path: url,
          method: 'GET',
          name: 'Single Endpoint Test',
          description: '单个端点测试'
        }]
      };
      
    } catch (error) {
      console.warn('准备API规范失败，使用默认配置:', error.message);
      return {
        endpoints: [{
          path: url,
          method: 'GET',
          name: 'Single Endpoint Test',
          description: '单个端点测试'
        }]
      };
    }
  }

  /**
   * 解析URL
   */
  resolveUrl(baseUrl, path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const relativePath = path.startsWith('/') ? path : '/' + path;
    
    return base + relativePath;
  }

  /**
   * 取消API测试
   */
  async cancelTest(testId) {
    try {
      console.log(`🛑 取消API测试: ${testId}`);
      
      if (this.analyzer) {
        await this.analyzer.cleanup();
        this.analyzer = null;
      }
      
      this.isRunning = false;
      
      // 更新测试状态为取消
      await this.updateTestStatus(testId, 'cancelled', {
        completed_at: new Date()
      });
      
      return { success: true, testId };
    } catch (error) {
      console.error(`❌ 取消API测试失败: ${testId}`, error);
      throw error;
    }
  }

  /**
   * 获取测试状态
   */
  async getTestStatus(testId) {
    try {
      const pool = getPool();
      const result = await pool.query(
        'SELECT status, started_at, completed_at, overall_score, grade FROM test_results WHERE id = $1',
        [testId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('测试不存在');
      }
      
      const test = result.rows[0];
      
      return {
        testId,
        status: test.status,
        startedAt: test.started_at,
        completedAt: test.completed_at,
        overallScore: test.overall_score,
        grade: test.grade,
        isRunning: this.isRunning && test.status === 'running'
      };
    } catch (error) {
      console.error(`❌ 获取测试状态失败: ${testId}`, error);
      throw error;
    }
  }

  /**
   * 更新测试状态
   */
  async updateTestStatus(testId, status, additionalData = {}) {
    try {
      const pool = getPool();
      
      const updateFields = ['status = $2', 'updated_at = NOW()'];
      const values = [testId, status];
      let paramIndex = 3;
      
      // 动态添加更新字段
      Object.entries(additionalData).forEach(([key, value]) => {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      });
      
      const query = `UPDATE test_results SET ${updateFields.join(', ')} WHERE id = $1`;
      await pool.query(query, values);
      
    } catch (error) {
      console.error(`❌ 更新测试状态失败: ${testId}`, error);
      throw error;
    }
  }

  /**
   * 保存分析结果
   */
  async saveResults(testId, analysisResults) {
    try {
      const pool = getPool();
      
      // 保存到api_test_details表
      await pool.query(
        `INSERT INTO api_test_details (
          test_id, endpoint_results, performance_analysis, reliability_analysis,
          security_analysis, compliance_analysis, score_breakdown,
          recommendations, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          testId,
          JSON.stringify(analysisResults.endpoints),
          JSON.stringify(analysisResults.performance),
          JSON.stringify(analysisResults.reliability),
          JSON.stringify(analysisResults.security),
          JSON.stringify(analysisResults.compliance),
          JSON.stringify(analysisResults.scores),
          JSON.stringify(analysisResults.recommendations)
        ]
      );
      
      console.log(`💾 API分析结果已保存: ${testId}`);
    } catch (error) {
      console.error(`❌ 保存分析结果失败: ${testId}`, error);
      throw error;
    }
  }

  /**
   * 获取详细结果
   */
  async getDetailedResults(testId) {
    try {
      const pool = getPool();
      
      // 获取基本测试信息
      const testResult = await pool.query(
        `SELECT * FROM test_results WHERE id = $1`,
        [testId]
      );
      
      if (testResult.rows.length === 0) {
        throw new Error('测试不存在');
      }
      
      // 获取详细API分析结果
      const detailsResult = await pool.query(
        `SELECT * FROM api_test_details WHERE test_id = $1`,
        [testId]
      );
      
      const test = testResult.rows[0];
      const details = detailsResult.rows[0];
      
      return {
        test: {
          id: test.id,
          url: test.url,
          testName: test.test_name,
          status: test.status,
          overallScore: test.overall_score,
          grade: test.grade,
          startedAt: test.started_at,
          completedAt: test.completed_at,
          durationMs: test.duration_ms,
          totalChecks: test.total_checks,
          passedChecks: test.passed_checks,
          failedChecks: test.failed_checks,
          warnings: test.warnings
        },
        analysis: details ? {
          endpoints: details.endpoint_results,
          performance: details.performance_analysis,
          reliability: details.reliability_analysis,
          security: details.security_analysis,
          compliance: details.compliance_analysis,
          scores: details.score_breakdown,
          recommendations: details.recommendations
        } : null
      };
    } catch (error) {
      console.error(`❌ 获取详细结果失败: ${testId}`, error);
      throw error;
    }
  }

  /**
   * 发送测试进度
   */
  async sendProgress(testId, progress) {
    try {
      if (global.realtimeService) {
        await global.realtimeService.updateTestProgress(testId, progress);
      }
    } catch (error) {
      console.warn('发送测试进度失败:', error);
    }
  }

  /**
   * 发送测试完成通知
   */
  async sendTestComplete(testId, result) {
    try {
      if (global.realtimeService) {
        await global.realtimeService.notifyTestComplete(testId, result);
      }
    } catch (error) {
      console.warn('发送测试完成通知失败:', error);
    }
  }

  /**
   * 发送测试失败通知
   */
  async sendTestFailed(testId, error) {
    try {
      if (global.realtimeService) {
        await global.realtimeService.notifyTestFailed(testId, error);
      }
    } catch (error) {
      console.warn('发送测试失败通知失败:', error);
    }
  }

  /**
   * 创建结果摘要
   */
  createSummary(analysisResults) {
    return {
      url: analysisResults.apiSpec.endpoints?.[0]?.path || 'Multiple Endpoints',
      timestamp: analysisResults.timestamp,
      analysisTime: analysisResults.analysisTime,
      overallScore: analysisResults.scores.overall,
      grade: analysisResults.scores.grade,
      scores: {
        performance: analysisResults.scores.performance,
        reliability: analysisResults.scores.reliability,
        security: analysisResults.scores.security,
        compliance: analysisResults.scores.compliance
      },
      endpoints: {
        total: analysisResults.endpoints.length,
        successful: analysisResults.endpoints.filter(e => e.success).length,
        failed: analysisResults.endpoints.filter(e => !e.success).length
      },
      performance: {
        averageResponseTime: analysisResults.performance.averageResponseTime,
        maxResponseTime: analysisResults.performance.maxResponseTime,
        throughput: analysisResults.performance.throughput
      },
      topRecommendations: analysisResults.recommendations.slice(0, 5)
    };
  }

  // 辅助计算方法
  calculateTotalChecks(analysisResults) {
    return analysisResults.endpoints.length * 5; // 每个端点5个检查项
  }

  calculatePassedChecks(analysisResults) {
    return analysisResults.endpoints.filter(e => e.success).length * 5;
  }

  calculateFailedChecks(analysisResults) {
    return analysisResults.endpoints.filter(e => !e.success).length * 5;
  }

  calculateWarnings(analysisResults) {
    return analysisResults.recommendations.filter(r => 
      r.priority === 'medium' || r.priority === 'low'
    ).length;
  }

  /**
   * 检查引擎健康状态
   */
  async healthCheck() {
    try {
      // 简单的健康检查
      const testAnalyzer = new APIAnalyzer({ timeout: 5000 });
      await testAnalyzer.cleanup();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        capabilities: [
          'openapi-spec-testing',
          'endpoint-testing',
          'performance-analysis',
          'reliability-analysis',
          'security-analysis',
          'compliance-analysis'
        ],
        realtime: !!global.realtimeService
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// 创建单例实例
const apiEngine = new APIEngine();

module.exports = apiEngine;
