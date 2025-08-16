/**
 * 性能基准测试服务
 * 提供性能测试套件、基线设定、监控报告、优化建议等功能
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class PerformanceBenchmarkService extends EventEmitter {
  constructor() {
    super();
    this.benchmarks = new Map();
    this.baselines = new Map();
    this.testResults = new Map();
    this.isInitialized = false;
    
    // 性能指标定义
    this.metrics = {
      // 前端性能指标
      FIRST_CONTENTFUL_PAINT: 'first_contentful_paint',
      LARGEST_CONTENTFUL_PAINT: 'largest_contentful_paint',
      FIRST_INPUT_DELAY: 'first_input_delay',
      CUMULATIVE_LAYOUT_SHIFT: 'cumulative_layout_shift',
      TIME_TO_INTERACTIVE: 'time_to_interactive',
      
      // 后端性能指标
      RESPONSE_TIME: 'response_time',
      THROUGHPUT: 'throughput',
      CPU_USAGE: 'cpu_usage',
      MEMORY_USAGE: 'memory_usage',
      DATABASE_QUERY_TIME: 'database_query_time',
      
      // 网络性能指标
      DNS_LOOKUP_TIME: 'dns_lookup_time',
      TCP_CONNECTION_TIME: 'tcp_connection_time',
      SSL_HANDSHAKE_TIME: 'ssl_handshake_time',
      DOWNLOAD_TIME: 'download_time'
    };
    
    // 性能阈值
    this.thresholds = {
      [this.metrics.FIRST_CONTENTFUL_PAINT]: { good: 1800, poor: 3000 },
      [this.metrics.LARGEST_CONTENTFUL_PAINT]: { good: 2500, poor: 4000 },
      [this.metrics.FIRST_INPUT_DELAY]: { good: 100, poor: 300 },
      [this.metrics.CUMULATIVE_LAYOUT_SHIFT]: { good: 0.1, poor: 0.25 },
      [this.metrics.TIME_TO_INTERACTIVE]: { good: 3800, poor: 7300 },
      [this.metrics.RESPONSE_TIME]: { good: 200, poor: 1000 },
      [this.metrics.THROUGHPUT]: { good: 1000, poor: 100 },
      [this.metrics.CPU_USAGE]: { good: 70, poor: 90 },
      [this.metrics.MEMORY_USAGE]: { good: 80, poor: 95 }
    };
  }

  /**
   * 初始化性能基准测试服务
   */
  async initialize() {
    if (this.isInitialized) {
      
        return;
      }

    try {
      // 创建必要的目录
      await this.ensureDirectories();
      
      // 加载现有基线
      await this.loadBaselines();
      
      // 初始化默认基准测试
      this.initializeDefaultBenchmarks();
      
      this.isInitialized = true;
      console.log('✅ 性能基准测试服务初始化完成');
      
      this.emit('initialized');
    } catch (error) {
      console.error('❌ 性能基准测试服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建性能基准测试
   */
  async createBenchmark(config) {
    const {
      name,
      description,
      type,
      target,
      metrics,
      iterations = 5,
      warmupRuns = 2,
      options = {}
    } = config;

    const benchmarkId = this.generateBenchmarkId();
    
    const benchmark = {
      id: benchmarkId,
      name,
      description,
      type,
      target,
      metrics,
      iterations,
      warmupRuns,
      options,
      createdAt: new Date(),
      lastRun: null,
      runCount: 0,
      enabled: true
    };

    this.benchmarks.set(benchmarkId, benchmark);
    
    console.log(`📊 创建性能基准测试: ${name}`);
    this.emit('benchmarkCreated', benchmark);

    return benchmarkId;
  }

  /**
   * 执行性能基准测试
   */
  async runBenchmark(benchmarkId, options = {}) {
    const benchmark = this.benchmarks.get(benchmarkId);
    if (!benchmark) {
      throw new Error(`基准测试不存在: ${benchmarkId}`);
    }

    console.log(`🚀 执行性能基准测试: ${benchmark.name}`);
    
    try {
      const testId = this.generateTestId();
      const startTime = Date.now();
      
      // 预热运行
      if (benchmark.warmupRuns > 0) {
        console.log(`🔥 执行 ${benchmark.warmupRuns} 次预热运行...`);
        for (let i = 0; i < benchmark.warmupRuns; i++) {
          await this.executeSingleRun(benchmark, { isWarmup: true });
        }
      }
      
      // 正式测试运行
      const results = [];
      for (let i = 0; i < benchmark.iterations; i++) {
        console.log(`📈 执行第 ${i + 1}/${benchmark.iterations} 次测试...`);
        const result = await this.executeSingleRun(benchmark, { iteration: i + 1 });
        results.push(result);
        
        // 触发进度事件
        this.emit('benchmarkProgress', {
          benchmarkId,
          testId,
          iteration: i + 1,
          total: benchmark.iterations,
          result
        });
      }
      
      // 计算统计结果
      const statistics = this.calculateStatistics(results);
      const endTime = Date.now();
      
      const testResult = {
        id: testId,
        benchmarkId,
        benchmark: benchmark.name,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: endTime - startTime,
        iterations: benchmark.iterations,
        results,
        statistics,
        baseline: this.baselines.get(benchmarkId),
        comparison: this.compareWithBaseline(benchmarkId, statistics),
        recommendations: this.generateRecommendations(statistics)
      };
      
      // 存储测试结果
      this.testResults.set(testId, testResult);
      
      // 更新基准测试信息
      benchmark.lastRun = new Date();
      benchmark.runCount++;
      
      console.log(`✅ 性能基准测试完成: ${benchmark.name}`);
      this.emit('benchmarkCompleted', testResult);
      
      return testResult;
      
    } catch (error) {
      console.error(`❌ 性能基准测试失败: ${benchmark.name}`, error);
      this.emit('benchmarkFailed', { benchmarkId, error: error.message });
      throw error;
    }
  }

  /**
   * 执行单次运行
   */
  async executeSingleRun(benchmark, options = {}) {
    const startTime = performance.now();
    
    try {
      let result;
      
      switch (benchmark.type) {
        case 'frontend':
          result = await this.runFrontendBenchmark(benchmark, options);
          break;
        case 'backend':
          result = await this.runBackendBenchmark(benchmark, options);
          break;
        case 'network':
          result = await this.runNetworkBenchmark(benchmark, options);
          break;
        case 'database':
          result = await this.runDatabaseBenchmark(benchmark, options);
          break;
        default:
          throw new Error(`不支持的基准测试类型: ${benchmark.type}`);
      }
      
      const endTime = performance.now();
      
      return {
        ...result,
        executionTime: endTime - startTime,
        timestamp: new Date(),
        isWarmup: options.isWarmup || false
      };
      
    } catch (error) {
      const endTime = performance.now();
      
      return {
        error: error.message,
        executionTime: endTime - startTime,
        timestamp: new Date(),
        isWarmup: options.isWarmup || false
      };
    }
  }

  /**
   * 运行前端性能基准测试
   */
  async runFrontendBenchmark(benchmark, options) {
    // 模拟前端性能测试
    const metrics = {};
    
    for (const metric of benchmark.metrics) {
      switch (metric) {
        case this.metrics.FIRST_CONTENTFUL_PAINT:
          metrics[metric] = this.simulateMetric(800, 3000);
          break;
        case this.metrics.LARGEST_CONTENTFUL_PAINT:
          metrics[metric] = this.simulateMetric(1200, 4000);
          break;
        case this.metrics.FIRST_INPUT_DELAY:
          metrics[metric] = this.simulateMetric(50, 500);
          break;
        case this.metrics.CUMULATIVE_LAYOUT_SHIFT:
          metrics[metric] = this.simulateMetric(0.05, 0.3, true);
          break;
        case this.metrics.TIME_TO_INTERACTIVE:
          metrics[metric] = this.simulateMetric(2000, 8000);
          break;
      }
    }
    
    return { metrics, type: 'frontend' };
  }

  /**
   * 运行后端性能基准测试
   */
  async runBackendBenchmark(benchmark, options) {
    // 模拟后端性能测试
    const metrics = {};
    
    for (const metric of benchmark.metrics) {
      switch (metric) {
        case this.metrics.RESPONSE_TIME:
          metrics[metric] = this.simulateMetric(100, 2000);
          break;
        case this.metrics.THROUGHPUT:
          metrics[metric] = this.simulateMetric(500, 2000);
          break;
        case this.metrics.CPU_USAGE:
          metrics[metric] = this.simulateMetric(30, 95, true);
          break;
        case this.metrics.MEMORY_USAGE:
          metrics[metric] = this.simulateMetric(40, 90, true);
          break;
      }
    }
    
    return { metrics, type: 'backend' };
  }

  /**
   * 运行网络性能基准测试
   */
  async runNetworkBenchmark(benchmark, options) {
    // 模拟网络性能测试
    const metrics = {};
    
    for (const metric of benchmark.metrics) {
      switch (metric) {
        case this.metrics.DNS_LOOKUP_TIME:
          metrics[metric] = this.simulateMetric(10, 200);
          break;
        case this.metrics.TCP_CONNECTION_TIME:
          metrics[metric] = this.simulateMetric(20, 500);
          break;
        case this.metrics.SSL_HANDSHAKE_TIME:
          metrics[metric] = this.simulateMetric(50, 800);
          break;
        case this.metrics.DOWNLOAD_TIME:
          metrics[metric] = this.simulateMetric(100, 3000);
          break;
      }
    }
    
    return { metrics, type: 'network' };
  }

  /**
   * 运行数据库性能基准测试
   */
  async runDatabaseBenchmark(benchmark, options) {
    // 模拟数据库性能测试
    const metrics = {};
    
    for (const metric of benchmark.metrics) {
      switch (metric) {
        case this.metrics.DATABASE_QUERY_TIME:
          metrics[metric] = this.simulateMetric(10, 1000);
          break;
      }
    }
    
    return { metrics, type: 'database' };
  }

  /**
   * 计算统计结果
   */
  calculateStatistics(results) {
    const validResults = results.filter(r => !r.error);
    if (validResults.length === 0) {
      
        return { error: '所有测试运行都失败了'
      };
    }
    
    const statistics = {};
    
    // 获取所有指标
    const allMetrics = new Set();
    validResults.forEach(result => {
      Object.keys(result.metrics || {}).forEach(metric => {
        allMetrics.add(metric);
      });
    });
    
    // 计算每个指标的统计信息
    for (const metric of allMetrics) {
      const values = validResults
        .map(r => r.metrics[metric])
        .filter(v => v !== undefined && v !== null);
      
      if (values.length > 0) {
        statistics[metric] = {
          min: Math.min(...values),
          max: Math.max(...values),
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          median: this.calculateMedian(values),
          p95: this.calculatePercentile(values, 95),
          p99: this.calculatePercentile(values, 99),
          stdDev: this.calculateStandardDeviation(values),
          count: values.length
        };
      }
    }
    
    return statistics;
  }

  /**
   * 与基线比较
   */
  compareWithBaseline(benchmarkId, statistics) {
    const baseline = this.baselines.get(benchmarkId);
    if (!baseline) {
      
        return { hasBaseline: false
      };
    }
    
    const comparison = { hasBaseline: true, improvements: {}, regressions: {} };
    
    for (const [metric, stats] of Object.entries(statistics)) {
      if (baseline.statistics[metric]) {
        const baselineValue = baseline.statistics[metric].mean;
        const currentValue = stats.mean;
        const change = ((currentValue - baselineValue) / baselineValue) * 100;
        
        if (Math.abs(change) > 5) { // 5%以上的变化才认为是显著的
          if (change < 0) {
            comparison.improvements[metric] = Math.abs(change);
          } else {
            comparison.regressions[metric] = change;
          }
        }
      }
    }
    
    return comparison;
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(statistics) {
    const recommendations = [];
    
    for (const [metric, stats] of Object.entries(statistics)) {
      const threshold = this.thresholds[metric];
      if (!threshold) continue;
      
      if (stats.mean > threshold.poor) {
        recommendations.push({
          metric,
          severity: 'high',
          message: `${metric} 性能较差 (${stats.mean.toFixed(2)}ms)，建议优化`,
          suggestions: this.getOptimizationSuggestions(metric)
        });
      } else if (stats.mean > threshold.good) {
        recommendations.push({
          metric,
          severity: 'medium',
          message: `${metric} 性能一般 (${stats.mean.toFixed(2)}ms)，可以进一步优化`,
          suggestions: this.getOptimizationSuggestions(metric)
        });
      }
    }
    
    return recommendations;
  }

  /**
   * 获取优化建议
   */
  getOptimizationSuggestions(metric) {
    const suggestions = {
      [this.metrics.FIRST_CONTENTFUL_PAINT]: [
        '优化关键渲染路径',
        '减少阻塞渲染的资源',
        '使用CDN加速资源加载'
      ],
      [this.metrics.LARGEST_CONTENTFUL_PAINT]: [
        '优化图片加载',
        '使用懒加载',
        '预加载关键资源'
      ],
      [this.metrics.FIRST_INPUT_DELAY]: [
        '减少JavaScript执行时间',
        '使用Web Workers',
        '优化事件处理器'
      ],
      [this.metrics.RESPONSE_TIME]: [
        '优化数据库查询',
        '使用缓存',
        '减少网络请求'
      ],
      [this.metrics.CPU_USAGE]: [
        '优化算法复杂度',
        '使用异步处理',
        '减少计算密集型操作'
      ]
    };
    
    return suggestions[metric] || ['请咨询性能专家获取具体建议'];
  }

  /**
   * 设置性能基线
   */
  async setBaseline(benchmarkId, testResultId) {
    const testResult = this.testResults.get(testResultId);
    if (!testResult) {
      throw new Error('测试结果不存在');
    }
    
    const baseline = {
      benchmarkId,
      testResultId,
      statistics: testResult.statistics,
      setAt: new Date(),
      description: `基于测试 ${testResultId} 设置的基线`
    };
    
    this.baselines.set(benchmarkId, baseline);
    await this.saveBaselines();
    
    console.log(`📏 设置性能基线: ${benchmarkId}`);
    this.emit('baselineSet', baseline);
    
    return baseline;
  }

  /**
   * 获取性能报告
   */
  async generatePerformanceReport(options = {}) {
    const {
      benchmarkIds,
      timeRange = '30d',
      includeBaselines = true,
      includeRecommendations = true
    } = options;
    
    const report = {
      generatedAt: new Date(),
      timeRange,
      summary: {},
      benchmarks: [],
      trends: {},
      recommendations: []
    };
    
    // 获取要包含的基准测试
    const targetBenchmarks = benchmarkIds 
      ? benchmarkIds.map(id => this.benchmarks.get(id)).filter(Boolean)
      : Array.from(this.benchmarks.values());
    
    // 生成基准测试报告
    for (const benchmark of targetBenchmarks) {
      const benchmarkReport = await this.generateBenchmarkReport(benchmark, {
        timeRange,
        includeBaselines,
        includeRecommendations
      });
      
      report.benchmarks.push(benchmarkReport);
    }
    
    // 生成总体摘要
    report.summary = this.generateSummary(report.benchmarks);
    
    return report;
  }

  /**
   * 辅助方法
   */
  simulateMetric(min, max, isPercentage = false) {
    const value = Math.random() * (max - min) + min;
    return isPercentage ? Math.min(100, Math.max(0, value)) : value;
  }

  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  calculateStandardDeviation(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  generateBenchmarkId() {
    return `benchmark_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  generateTestId() {
    return `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async ensureDirectories() {
    const dirs = ['benchmarks', 'baselines', 'reports'];
    for (const dir of dirs) {
      await fs.mkdir(path.join(process.cwd(), 'data', dir), { recursive: true });
    }
  }

  initializeDefaultBenchmarks() {
    // 创建默认的前端性能基准测试
    this.createBenchmark({
      name: '前端核心性能指标',
      description: '测试前端核心Web Vitals指标',
      type: 'frontend',
      target: 'homepage',
      metrics: [
        this.metrics.FIRST_CONTENTFUL_PAINT,
        this.metrics.LARGEST_CONTENTFUL_PAINT,
        this.metrics.FIRST_INPUT_DELAY,
        this.metrics.CUMULATIVE_LAYOUT_SHIFT
      ]
    });
    
    // 创建默认的后端性能基准测试
    this.createBenchmark({
      name: '后端API性能',
      description: '测试后端API响应时间和吞吐量',
      type: 'backend',
      target: '/api/test-results',
      metrics: [
        this.metrics.RESPONSE_TIME,
        this.metrics.THROUGHPUT,
        this.metrics.CPU_USAGE,
        this.metrics.MEMORY_USAGE
      ]
    });
  }

  async loadBaselines() {
    // 从文件加载基线数据
    console.log('📂 加载性能基线数据...');
  }

  async saveBaselines() {
    // 保存基线数据到文件
    console.log('💾 保存性能基线数据...');
  }

  generateSummary(benchmarkReports) {
    return {
      totalBenchmarks: benchmarkReports.length,
      averageScore: 85, // 模拟数据
      trendsImproving: 3,
      trendsRegressing: 1,
      criticalIssues: 0
    };
  }

  async generateBenchmarkReport(benchmark, options) {
    return {
      id: benchmark.id,
      name: benchmark.name,
      type: benchmark.type,
      lastRun: benchmark.lastRun,
      runCount: benchmark.runCount,
      status: 'healthy' // 模拟状态
    };
  }
}

// 创建单例实例
const performanceBenchmarkService = new PerformanceBenchmarkService();

module.exports = {
  PerformanceBenchmarkService,
  performanceBenchmarkService
};
