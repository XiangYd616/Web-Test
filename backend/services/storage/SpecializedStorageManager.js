/**
 * 专门存储管理器
 * 为不同测试引擎提供优化的存储策略
 */

const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class SpecializedStorageManager {
  constructor(config = {}) {
    this.config = {
      baseStoragePath: config.baseStoragePath || './storage',
      compressionLevel: config.compressionLevel || 6,
      encryptionKey: config.encryptionKey || process.env.STORAGE_ENCRYPTION_KEY,
      maxFileSize: config.maxFileSize || 50 * 1024 * 1024, // 50MB
      ...config
    };

    this.storageStrategies = new Map();
    this.initializeStrategies();
  }

  /**
   * 初始化各引擎的存储策略
   */
  initializeStrategies() {
    // 性能测试引擎 - 大数据量，需要压缩和分片存储
    this.storageStrategies.set('performance', {
      compress: true,
      encrypt: false,
      shard: true,
      indexFields: ['url', 'device', 'timestamp'],
      retentionDays: 90,
      archiveAfterDays: 30,
      specialHandling: this.handlePerformanceData.bind(this)
    });

    // 压力测试引擎 - 时间序列数据，需要高效存储
    this.storageStrategies.set('stress', {
      compress: true,
      encrypt: false,
      shard: true,
      indexFields: ['url', 'concurrency', 'timestamp'],
      retentionDays: 60,
      archiveAfterDays: 15,
      specialHandling: this.handleStressData.bind(this)
    });

    // 兼容性测试引擎 - 大量截图，需要文件存储优化
    this.storageStrategies.set('compatibility', {
      compress: false, // 图片已压缩
      encrypt: false,
      shard: true,
      indexFields: ['url', 'browser', 'timestamp'],
      retentionDays: 120,
      archiveAfterDays: 45,
      specialHandling: this.handleCompatibilityData.bind(this)
    });

    // 安全测试引擎 - 敏感数据，需要加密存储
    this.storageStrategies.set('security', {
      compress: true,
      encrypt: true,
      shard: false,
      indexFields: ['url', 'severity', 'timestamp'],
      retentionDays: 365,
      archiveAfterDays: 90,
      specialHandling: this.handleSecurityData.bind(this)
    });

    // UX测试引擎 - 交互录制，大文件处理
    this.storageStrategies.set('ux', {
      compress: true,
      encrypt: false,
      shard: true,
      indexFields: ['url', 'device', 'timestamp'],
      retentionDays: 90,
      archiveAfterDays: 30,
      specialHandling: this.handleUXData.bind(this)
    });

    // 网站综合测试 - 多页面关联数据
    this.storageStrategies.set('website', {
      compress: true,
      encrypt: false,
      shard: false,
      indexFields: ['url', 'pages_count', 'timestamp'],
      retentionDays: 120,
      archiveAfterDays: 45,
      specialHandling: this.handleWebsiteData.bind(this)
    });

    // API测试引擎 - 简单数据，标准存储
    this.storageStrategies.set('api', {
      compress: true,
      encrypt: false,
      shard: false,
      indexFields: ['url', 'method', 'timestamp'],
      retentionDays: 90,
      archiveAfterDays: 30,
      specialHandling: this.handleAPIData.bind(this)
    });

    // SEO测试引擎 - 结构化数据，关系型存储
    this.storageStrategies.set('seo', {
      compress: true,
      encrypt: false,
      shard: false,
      indexFields: ['url', 'score', 'timestamp'],
      retentionDays: 180,
      archiveAfterDays: 60,
      specialHandling: this.handleSEOData.bind(this)
    });

    // 基础设施测试 - 网络数据，时间序列
    this.storageStrategies.set('infrastructure', {
      compress: true,
      encrypt: false,
      shard: true,
      indexFields: ['url', 'check_type', 'timestamp'],
      retentionDays: 90,
      archiveAfterDays: 30,
      specialHandling: this.handleInfrastructureData.bind(this)
    });
  }

  /**
   * 存储测试结果
   */
  async storeTestResult(engineType, testId, data) {
    const strategy = this.storageStrategies.get(engineType);
    if (!strategy) {
      throw new Error(`未找到引擎类型 ${engineType} 的存储策略`);
    }

    try {
      // 应用专门处理
      const processedData = await strategy.specialHandling(data);

      // 创建存储路径
      const storagePath = await this.createStoragePath(engineType, testId);

      // 处理数据存储
      const result = await this.processDataStorage(processedData, strategy, storagePath);

      // 创建索引
      await this.createIndex(engineType, testId, processedData, strategy.indexFields);

      return {
        success: true,
        testId,
        storagePath: result.storagePath,
        compressed: result.compressed,
        encrypted: result.encrypted,
        size: result.size,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`存储 ${engineType} 测试结果失败:`, error);
      throw error;
    }
  }

  /**
   * 读取测试结果
   */
  async retrieveTestResult(engineType, testId) {
    const strategy = this.storageStrategies.get(engineType);
    if (!strategy) {
      throw new Error(`未找到引擎类型 ${engineType} 的存储策略`);
    }

    try {
      const storagePath = await this.getStoragePath(engineType, testId);
      const data = await this.loadDataFromStorage(storagePath, strategy);
      
      return {
        success: true,
        testId,
        data,
        retrievedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`读取 ${engineType} 测试结果失败:`, error);
      throw error;
    }
  }

  /**
   * 处理性能测试数据
   */
  async handlePerformanceData(data) {
    // 分离大文件（如截图）和结构化数据
    const { screenshots, traces, ...structuredData } = data;
    
    const processed = {
      metadata: {
        url: data.url,
        device: data.device || 'desktop',
        timestamp: data.timestamp,
        lighthouse_version: data.lighthouse_version
      },
      metrics: {
        performance_score: data.performance_score,
        fcp: data.first_contentful_paint,
        lcp: data.largest_contentful_paint,
        cls: data.cumulative_layout_shift,
        fid: data.first_input_delay,
        ttfb: data.time_to_first_byte
      },
      audits: data.audits || {},
      opportunities: data.opportunities || [],
      diagnostics: data.diagnostics || [],
      assets: {
        screenshots: screenshots ? await this.processLargeFiles(screenshots) : null,
        traces: traces ? await this.processLargeFiles(traces) : null
      }
    };

    return processed;
  }

  /**
   * 处理压力测试数据
   */
  async handleStressData(data) {
    // 优化时间序列数据存储
    const processed = {
      metadata: {
        url: data.url,
        concurrency: data.concurrency,
        duration: data.duration,
        timestamp: data.timestamp
      },
      summary: {
        total_requests: data.total_requests,
        successful_requests: data.successful_requests,
        failed_requests: data.failed_requests,
        avg_response_time: data.avg_response_time,
        max_response_time: data.max_response_time,
        requests_per_second: data.requests_per_second
      },
      timeseries: this.compressTimeSeries(data.timeseries || []),
      errors: data.errors || []
    };

    return processed;
  }

  /**
   * 处理兼容性测试数据
   */
  async handleCompatibilityData(data) {
    // 优化截图和渲染结果存储
    const processed = {
      metadata: {
        url: data.url,
        browsers: data.browsers || [],
        timestamp: data.timestamp
      },
      compatibility_matrix: data.compatibility_matrix || {},
      issues: data.issues || [],
      screenshots: await this.processScreenshots(data.screenshots || {}),
      rendering_diffs: await this.processRenderingDiffs(data.rendering_diffs || {})
    };

    return processed;
  }

  /**
   * 处理安全测试数据
   */
  async handleSecurityData(data) {
    // 敏感数据处理和分类
    const processed = {
      metadata: {
        url: data.url,
        scan_type: data.scan_type,
        timestamp: data.timestamp
      },
      summary: {
        total_issues: data.total_issues,
        critical_issues: data.critical_issues,
        high_issues: data.high_issues,
        medium_issues: data.medium_issues,
        low_issues: data.low_issues,
        overall_score: data.overall_score
      },
      vulnerabilities: this.sanitizeSecurityData(data.vulnerabilities || []),
      ssl_info: data.ssl_info || {},
      headers: data.headers || {},
      recommendations: data.recommendations || []
    };

    return processed;
  }

  /**
   * 处理UX测试数据
   */
  async handleUXData(data) {
    // 处理交互录制和大文件
    const processed = {
      metadata: {
        url: data.url,
        device: data.device,
        timestamp: data.timestamp
      },
      accessibility: data.accessibility || {},
      usability: data.usability || {},
      interactions: await this.processInteractionData(data.interactions || []),
      recordings: await this.processRecordings(data.recordings || {}),
      screenshots: await this.processScreenshots(data.screenshots || {})
    };

    return processed;
  }

  /**
   * 处理网站综合测试数据
   */
  async handleWebsiteData(data) {
    // 多页面关联数据处理
    const processed = {
      metadata: {
        url: data.url,
        pages_tested: data.pages_tested || 0,
        timestamp: data.timestamp
      },
      site_overview: data.site_overview || {},
      page_results: data.page_results || {},
      cross_page_issues: data.cross_page_issues || [],
      site_map: data.site_map || {},
      recommendations: data.recommendations || []
    };

    return processed;
  }

  /**
   * 处理API测试数据
   */
  async handleAPIData(data) {
    // 标准API测试数据处理
    return {
      metadata: {
        url: data.url,
        method: data.method,
        timestamp: data.timestamp
      },
      request: data.request || {},
      response: data.response || {},
      assertions: data.assertions || [],
      performance: data.performance || {},
      errors: data.errors || []
    };
  }

  /**
   * 处理SEO测试数据
   */
  async handleSEOData(data) {
    // 结构化SEO数据处理
    return {
      metadata: {
        url: data.url,
        score: data.score,
        timestamp: data.timestamp
      },
      meta_tags: data.meta_tags || {},
      headings: data.headings || {},
      images: data.images || [],
      links: data.links || [],
      structured_data: data.structured_data || {},
      recommendations: data.recommendations || []
    };
  }

  /**
   * 处理基础设施测试数据
   */
  async handleInfrastructureData(data) {
    // 网络和基础设施数据处理
    return {
      metadata: {
        url: data.url,
        check_type: data.check_type,
        timestamp: data.timestamp
      },
      dns: data.dns || {},
      connectivity: data.connectivity || {},
      ssl: data.ssl || {},
      performance: data.performance || {},
      availability: data.availability || {}
    };
  }

  /**
   * 处理数据存储
   */
  async processDataStorage(data, strategy, storagePath) {
    let processedData = JSON.stringify(data);
    let compressed = false;
    let encrypted = false;
    
    // 压缩处理
    if (strategy.compress) {
      processedData = await gzip(processedData, { level: this.config.compressionLevel });
      compressed = true;
    }

    // 加密处理
    if (strategy.encrypt && this.config.encryptionKey) {
      processedData = this.encryptData(processedData);
      encrypted = true;
    }

    // 写入文件
    await fs.writeFile(storagePath, processedData);

    return {
      storagePath,
      compressed,
      encrypted,
      size: processedData.length
    };
  }

  /**
   * 从存储加载数据
   */
  async loadDataFromStorage(storagePath, strategy) {
    let data = await fs.readFile(storagePath);

    // 解密处理
    if (strategy.encrypt && this.config.encryptionKey) {
      data = this.decryptData(data);
    }

    // 解压处理
    if (strategy.compress) {
      data = await gunzip(data);
    }

    return JSON.parse(data.toString());
  }

  /**
   * 创建存储路径
   */
  async createStoragePath(engineType, testId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const dirPath = path.join(
      this.config.baseStoragePath,
      engineType,
      year.toString(),
      month,
      day
    );

    await fs.mkdir(dirPath, { recursive: true });
    
    return path.join(dirPath, `${testId}.json`);
  }

  /**
   * 获取存储路径
   */
  async getStoragePath(engineType, testId) {
    // 这里需要实现路径查找逻辑，可能需要查询索引
    // 简化实现，实际应该查询索引数据库
    const pattern = path.join(this.config.baseStoragePath, engineType, '**', `${testId}.json`);
    // 实际实现需要使用glob或数据库查询
    return pattern;
  }

  /**
   * 创建索引
   */
  async createIndex(engineType, testId, data, indexFields) {
    const indexData = {
      testId,
      engineType,
      timestamp: new Date().toISOString()
    };

    // 提取索引字段
    indexFields.forEach(field => {
      if (data.metadata && data.metadata[field] !== undefined) {
        indexData[field] = data.metadata[field];
      }
    });

    // 这里应该写入索引数据库
    // 简化实现，实际应该使用数据库
    console.log('创建索引:', indexData);
  }

  /**
   * 辅助方法
   */
  compressTimeSeries(timeseries) {
    // 时间序列数据压缩算法
    return timeseries; // 简化实现
  }

  async processLargeFiles(files) {
    // 大文件处理逻辑
    return files; // 简化实现
  }

  async processScreenshots(screenshots) {
    // 截图处理逻辑
    return screenshots; // 简化实现
  }

  async processRenderingDiffs(diffs) {
    // 渲染差异处理逻辑
    return diffs; // 简化实现
  }

  sanitizeSecurityData(vulnerabilities) {
    // 安全数据清理
    return vulnerabilities; // 简化实现
  }

  async processInteractionData(interactions) {
    // 交互数据处理
    return interactions; // 简化实现
  }

  async processRecordings(recordings) {
    // 录制数据处理
    return recordings; // 简化实现
  }

  encryptData(data) {
    const cipher = crypto.createCipher('aes-256-cbc', this.config.encryptionKey);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptData(encryptedData) {
    const decipher = crypto.createDecipher('aes-256-cbc', this.config.encryptionKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

module.exports = { SpecializedStorageManager };
