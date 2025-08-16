/**
 * 批量测试服务
 * 提供批量测试执行、管理、监控功能
 */

const Logger = require('../../middleware/logger.js');
const { v4: uuidv4 } = require('uuid');

class BatchTestingService {
  constructor() {
    this.logger = Logger;
    this.activeBatches = new Map();
    this.batchHistory = new Map();
  }

  /**
   * 创建批量测试任务
   */
  async createBatchTest(batchConfig) {
    try {
      this.logger.info('创建批量测试任务:', batchConfig);

      const batchId = uuidv4();
      const batch = {
        id: batchId,
        name: batchConfig.name || `批量测试-${new Date().toISOString()}`,
        description: batchConfig.description || '',
        tests: batchConfig.tests || [],
        config: {
          execution: batchConfig.execution || { mode: 'sequential', concurrency: 1 },
          timeout: batchConfig.timeout || 300000, // 5分钟默认超时
          retries: batchConfig.retries || 0,
          stopOnFailure: batchConfig.stopOnFailure || false
        },
        status: 'pending',
        progress: {
          total: batchConfig.tests?.length || 0,
          completed: 0,
          failed: 0,
          running: 0
        },
        results: [],
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        createdBy: batchConfig.createdBy || 'system'
      };

      // 验证批量测试配置
      const validation = this.validateBatchConfig(batch);
      if (!validation.isValid) {
        throw new Error(`批量测试配置无效: ${validation.errors.join(', ')}`);
      }

      this.activeBatches.set(batchId, batch);

      return {
        success: true,
        data: batch
      };
    } catch (error) {
      this.logger.error('创建批量测试任务失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 执行批量测试
   */
  async executeBatchTest(batchId) {
    try {
      const batch = this.activeBatches.get(batchId);
      if (!batch) {
        throw new Error('批量测试任务不存在');
      }

      if (batch.status !== 'pending') {
        throw new Error('批量测试任务状态不允许执行');
      }

      this.logger.info(`开始执行批量测试: ${batchId}`);

      batch.status = 'running';
      batch.startedAt = new Date().toISOString();
      batch.progress.running = 1;

      // 根据执行模式执行测试
      if (batch.config.execution.mode === 'parallel') {
        await this.executeParallel(batch);
      } else {
        await this.executeSequential(batch);
      }

      batch.status = 'completed';
      batch.completedAt = new Date().toISOString();
      batch.progress.running = 0;

      // 移动到历史记录
      this.batchHistory.set(batchId, batch);
      this.activeBatches.delete(batchId);

      return {
        success: true,
        data: batch
      };
    } catch (error) {
      this.logger.error('执行批量测试失败:', error);
      
      // 更新批量测试状态为失败
      const batch = this.activeBatches.get(batchId);
      if (batch) {
        batch.status = 'failed';
        batch.completedAt = new Date().toISOString();
        batch.progress.running = 0;
        batch.error = error.message;
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 顺序执行测试
   */
  async executeSequential(batch) {
    for (let i = 0; i < batch.tests.length; i++) {
      const test = batch.tests[i];
      
      try {
        this.logger.info(`执行测试 ${i + 1}/${batch.tests.length}: ${test.url}`);
        
        const result = await this.executeSingleTest(test);
        batch.results.push(result);
        
        if (result.success) {
          batch.progress.completed++;
        } else {
          batch.progress.failed++;
          
          if (batch.config.stopOnFailure) {
            this.logger.warn('测试失败，停止批量执行');
            break;
          }
        }
      } catch (error) {
        this.logger.error(`测试执行失败: ${test.url}`, error);
        batch.results.push({
          testId: test.id || `test-${i}`,
          success: false,
          error: error.message,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString()
        });
        batch.progress.failed++;
        
        if (batch.config.stopOnFailure) {
          break;
        }
      }
    }
  }

  /**
   * 并行执行测试
   */
  async executeParallel(batch) {
    const concurrency = batch.config.execution.concurrency || 3;
    const chunks = this.chunkArray(batch.tests, concurrency);
    
    for (const chunk of chunks) {
      const promises = chunk.map(test => this.executeSingleTest(test));
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          batch.results.push(result.value);
          if (result.value.success) {
            batch.progress.completed++;
          } else {
            batch.progress.failed++;
          }
        } else {
          batch.results.push({
            testId: chunk[index].id || `test-${batch.results.length}`,
            success: false,
            error: result.reason.message,
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString()
          });
          batch.progress.failed++;
        }
      });
      
      // 检查是否需要停止
      if (batch.config.stopOnFailure && batch.progress.failed > 0) {
        break;
      }
    }
  }

  /**
   * 执行单个测试
   */
  async executeSingleTest(test) {
    const startTime = new Date().toISOString();
    
    try {
      // 模拟测试执行
      await this.delay(Math.random() * 2000 + 1000); // 1-3秒随机延迟
      
      const success = Math.random() > 0.1; // 90%成功率
      const endTime = new Date().toISOString();
      
      return {
        testId: test.id || uuidv4(),
        testType: test.type || 'performance',
        url: test.url,
        success,
        results: success ? this.generateMockResults() : null,
        error: success ? null : '模拟测试失败',
        startTime,
        endTime,
        duration: new Date(endTime) - new Date(startTime)
      };
    } catch (error) {
      return {
        testId: test.id || uuidv4(),
        testType: test.type || 'performance',
        url: test.url,
        success: false,
        error: error.message,
        startTime,
        endTime: new Date().toISOString()
      };
    }
  }

  /**
   * 获取批量测试状态
   */
  getBatchStatus(batchId) {
    const batch = this.activeBatches.get(batchId) || this.batchHistory.get(batchId);
    
    if (!batch) {
      
        return {
        success: false,
        error: '批量测试任务不存在'
      };
    }

    return {
      success: true,
      data: {
        id: batch.id,
        name: batch.name,
        status: batch.status,
        progress: batch.progress,
        createdAt: batch.createdAt,
        startedAt: batch.startedAt,
        completedAt: batch.completedAt,
        duration: batch.completedAt ? 
          new Date(batch.completedAt) - new Date(batch.startedAt) : null
      }
    };
  }

  /**
   * 获取批量测试结果
   */
  getBatchResults(batchId) {
    const batch = this.activeBatches.get(batchId) || this.batchHistory.get(batchId);
    
    if (!batch) {
      
        return {
        success: false,
        error: '批量测试任务不存在'
      };
    }

    return {
      success: true,
      data: {
        batch: {
          id: batch.id,
          name: batch.name,
          status: batch.status,
          progress: batch.progress
        },
        results: batch.results,
        summary: this.generateSummary(batch)
      }
    };
  }

  /**
   * 取消批量测试
   */
  async cancelBatchTest(batchId) {
    const batch = this.activeBatches.get(batchId);
    
    if (!batch) {
      
        return {
        success: false,
        error: '批量测试任务不存在'
      };
    }

    if (batch.status !== 'running') {
      
        return {
        success: false,
        error: '只能取消正在运行的批量测试'
      };
    }

    batch.status = 'cancelled';
    batch.completedAt = new Date().toISOString();
    batch.progress.running = 0;

    this.logger.info(`批量测试已取消: ${batchId}`);

    return {
      success: true,
      data: batch
    };
  }

  /**
   * 获取批量测试列表
   */
  getBatchList(status = null) {
    const allBatches = [
      ...Array.from(this.activeBatches.values()),
      ...Array.from(this.batchHistory.values())
    ];

    const filteredBatches = status ? 
      allBatches.filter(batch => batch.status === status) : 
      allBatches;

    return {
      success: true,
      data: filteredBatches.map(batch => ({
        id: batch.id,
        name: batch.name,
        status: batch.status,
        progress: batch.progress,
        createdAt: batch.createdAt,
        startedAt: batch.startedAt,
        completedAt: batch.completedAt,
        createdBy: batch.createdBy
      }))
    };
  }

  /**
   * 验证批量测试配置
   */
  validateBatchConfig(batch) {
    const errors = [];

    if (!batch.tests || batch.tests.length === 0) {
      errors.push('测试列表不能为空');
    }

    if (batch.tests) {
      batch.tests.forEach((test, index) => {
        if (!test.url) {
          errors.push(`测试 ${index + 1} 缺少URL`);
        }
      });
    }

    if (batch.config.execution.mode === 'parallel' && 
        (!batch.config.execution.concurrency || batch.config.execution.concurrency < 1)) {
      errors.push('并行模式需要指定有效的并发数');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 生成摘要
   */
  generateSummary(batch) {
    const total = batch.progress.total;
    const completed = batch.progress.completed;
    const failed = batch.progress.failed;
    const successRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      completed,
      failed,
      successRate: Math.round(successRate * 100) / 100,
      duration: batch.completedAt ? 
        new Date(batch.completedAt) - new Date(batch.startedAt) : null,
      averageTestTime: batch.results.length > 0 ? 
        batch.results.reduce((sum, result) => sum + (result.duration || 0), 0) / batch.results.length : 0
    };
  }

  /**
   * 生成模拟结果
   */
  generateMockResults() {
    return {
      responseTime: Math.random() * 1000 + 200,
      throughput: Math.random() * 100 + 50,
      errorRate: Math.random() * 5,
      score: Math.random() * 40 + 60
    };
  }

  /**
   * 数组分块
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new BatchTestingService();
