/**
 * CoreTestEngine
 * 合并后的核心测试引擎
 */

const Joi = require('joi');

class CoreTestEngine {
  constructor() {
    this.name = 'core';
    this.version = '2.0.0';
    this.activeTests = new Map();
    this.engines = new Map();
  }

healthCheck() {
    return {
      status: 'healthy',
      version: this.version,
      activeTests: this.activeTests.size,
      supportedTypes: this.testTypes.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }

async executeTest(testType, config, options = {}) {
    const testId = options.testId || uuidv4();

    try {
      // 验证测试类型
      if (!this.testTypes.has(testType)) {
        throw new Error(`未知的测试类型: ${testType}

async stopTest(testId) {
    try {
      if (typeof this.originalEngine.stopTest === 'function') {

        return await this.originalEngine.stopTest(testId);
      }

getStatus() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      status: this.status,
      isAvailable: this.isAvailable,
      lastHealthCheck: this.lastHealthCheck,
      metrics: { ...this.metrics }

getCapabilities() {
    if (typeof this.originalEngine.getCapabilities === 'function') {

      return this.originalEngine.getCapabilities();
    }

updateMetrics(testResult) {
    this.metrics.totalTests++;
    if (testResult.success) {
      this.metrics.successfulTests++;
    }

if (global.unifiedEngineWSHandler) {
      global.unifiedEngineWSHandler.broadcastTestFailed(testId, error);
    }

async initialize() {
    if (this.isInitialized) return;

    const initPromises = Array.from(this.enginePools.entries()).map(async ([type, pool]) => {
      const factory = this.engineFactories.get(type);
      if (factory) {
        await pool.initialize(factory);
      }

catch (error) {
      this.handleTestError(testId, error);
      throw error;
    }

async addEngine(engine) {
    try {
      // 执行健康检查
      const healthResult = await engine.healthCheck();
      if (healthResult.status === 'healthy') {
        engine.isAvailable = true;
        engine.lastHealthCheck = new Date();
        this.engines.set(engine.id, engine);
        this.activeEngines.add(engine.id);

        console.log(`✅ Engine ${engine.name}

async removeEngine(engineId) {
    const engine = this.engines.get(engineId);
    if (!engine) return false;

    try {
      // 如果引擎正在运行测试，等待完成或强制停止
      if (engine.status === 'running') {
        engine.status = 'maintenance';
        // 给引擎一些时间完成当前测试
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

getAvailableEngine() {
    const availableEngines = Array.from(this.activeEngines)
      .map(id => this.engines.get(id))
      .filter(engine => engine && engine.isAvailable && engine.status === 'idle');

    if (availableEngines.length === 0) {

      return null;
    }

switch (typeConfig.core) {
      case 'performance':
        return await this.executePerformanceTest(testId, config, options);

      case 'security':
        return await this.executeSecurityTest(testId, config, options);

      case 'http':
        return await this.executeHTTPTest(testId, config, options);

      case 'analysis':
        return await this.executeAnalysisTest(testId, config, options);

      default:
        throw new Error(`未实现的核心服务: ${typeConfig.core}

startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

async performHealthCheck() {
    const promises = Array.from(this.engines.values()).map(async (engine) => {
      try {
        const healthResult = await Promise.race([
          engine.healthCheck(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), 10000)
          )
        ]);

        if (healthResult.status === 'healthy') {
          engine.isAvailable = true;
          engine.lastHealthCheck = new Date();
          this.activeEngines.add(engine.id);
        }

getPoolStatus() {
    const engines = Array.from(this.engines.values()).map(engine => engine.getStatus());

    return {
      engineType: this.engineType,
      totalEngines: this.engines.size,
      activeEngines: this.activeEngines.size,
      availableEngines: engines.filter(e => e.isAvailable && e.status === 'idle').length,
      busyEngines: engines.filter(e => e.status === 'running' || e.status === 'busy').length,
      errorEngines: engines.filter(e => e.status === 'error').length,
      engines,
      options: this.options
    }

async shutdown() {
    console.log('🔌 Shutting down Enhanced Test Engine Manager...');

    // 停止所有运行中的测试
    const stopPromises = Array.from(this.runningTests.keys()).map(testId =>
      this.stopTest(testId).catch(err => console.error(`Error stopping test ${testId}

registerEngineType(type, engineFactory, poolOptions = {}) {
    this.engineFactories.set(type, engineFactory);

    const pool = new EnginePool(type, poolOptions);
    this.enginePools.set(type, pool);

    // 监听池事件
    pool.on('needMoreEngines', async (data) => {
      if (this.options.enableAutoScaling) {
        await this.scaleEnginePool(type, data.required - data.current);
      }

async findAlternativeEngine(primaryType, config) {
    // 这里可以实现更复杂的故障转移逻辑
    // 例如：性能测试可以降级到基础HTTP测试
    const fallbackMap = {
      'performance': ['lighthouse', 'basic-http'],
      'security': ['basic-security', 'http'],
      'seo': ['lighthouse', 'basic-http'],
      'accessibility': ['lighthouse', 'basic-http']
    }

for (const [type, pool] of this.enginePools) {
      const poolStatus = pool.getPoolStatus();
      healthStatus[type] = {
        healthy: poolStatus.availableEngines > 0,
        poolSize: poolStatus.totalEngines,
        busyInstances: poolStatus.busyEngines,
        availableInstances: poolStatus.availableEngines,
        lastCheck: new Date().toISOString()
      }

async scaleEnginePool(type, count) {
    const pool = this.enginePools.get(type);
    const factory = this.engineFactories.get(type);

    if (!pool || !factory) return false;

    try {
      for (let i = 0; i < count; i++) {
        const engine = await factory();
        await pool.addEngine(engine);
      }

getAllEngineStatus() {
    const status = {
      initialized: this.isInitialized,
      totalPools: this.enginePools.size,
      runningTests: this.runningTests.size,
      pools: {}

getHealthStatus() {
    const healthStatus = {}

createPerformanceEngine() {
    try {
      const PerformanceEngine = require('../performance/PerformanceTestEngine');
      const engine = new PerformanceEngine();
      return new EngineAdapter(engine, 'performance');
    }

createSecurityEngine() {
    try {
      const SecurityEngine = require('../security/securityTestEngine');
      const engine = new SecurityEngine();
      return new EngineAdapter(engine, 'security');
    }

createCompatibilityEngine() {
    try {
      const CompatibilityEngine = require('../compatibility/compatibilityTestEngine');
      const engine = new CompatibilityEngine();
      return new EngineAdapter(engine, 'compatibility');
    }

createUXEngine() {
    try {
      const UXEngine = require('../api/uxTestEngine');
      const engine = new UXEngine();
      return new EngineAdapter(engine, 'ux');
    }

createNetworkEngine() {
    try {
      const NetworkEngine = require('../api/networkTestEngine');
      const engine = new NetworkEngine();
      return new EngineAdapter(engine, 'network');
    }

createSEOEngine() {
    try {
      const SEOEngine = require('../seo/SEOTestEngine');
      const engine = new SEOEngine();
      return new EngineAdapter(engine, 'seo');
    }

registerDefaultTestTypes() {
    // 性能测试类型
    this.registerTestType('performance', {
      name: '性能测试',
      core: 'performance',
      methods: ['coreWebVitals', 'pageSpeed', 'resourceAnalysis', 'caching'],
      dependencies: ['lighthouse', 'puppeteer']
    }

registerTestType(id, config) {
    this.testTypes.set(id, {
      id,
      ...config,
      registeredAt: new Date().toISOString()
    }

initializeTestSession(testId, testType, config, options) {
    const session = {
      testId,
      testType,
      config,
      options,
      startTime: Date.now(),
      status: 'running',
      progress: 0,
      currentStep: '初始化测试...'
    }

async runTestByType(testId, typeConfig, config, options) {
    const coreService = this[typeConfig.core];
    if (!coreService) {
      throw new Error(`核心服务未找到: ${typeConfig.core}

async executePerformanceTest(testId, config, options) {
    this.updateTestProgress(testId, 20, '开始性能分析...');

    const results = {}

async executeSecurityTest(testId, config, options) {
    this.updateTestProgress(testId, 20, '开始安全扫描...');

    const results = {}

async executeHTTPTest(testId, config, options) {
    this.updateTestProgress(testId, 20, '开始HTTP测试...');

    const results = {}

async executeAnalysisTest(testId, config, options) {
    this.updateTestProgress(testId, 20, '开始分析测试...');

    const results = {}

async postProcessResult(testId, result, typeConfig) {
    this.updateTestProgress(testId, 98, '后处理测试结果...');

    // 添加测试元数据
    result.testId = testId;
    result.testType = typeConfig.id;
    result.testName = typeConfig.name;
    result.duration = Date.now() - this.activeTests.get(testId).startTime;
    result.version = this.version;

    // 生成建议
    result.recommendations = await this.analysis.generateRecommendations(result);

    // 计算综合评分
    result.overallScore = this.analysis.calculateOverallScore(result);

    this.updateTestProgress(testId, 100, '测试完成');

    return result;
  }

updateTestProgress(testId, progress, step) {
    const session = this.activeTests.get(testId);
    if (session) {
      session.progress = progress;
      session.currentStep = step;
      session.lastUpdate = Date.now();

      this.emit('testProgress', testId, { progress, step }

handleTestError(testId, error) {
    const session = this.activeTests.get(testId);
    if (session) {
      session.status = 'failed';
      session.error = error.message;
      session.endTime = Date.now();
    }

getTestStatus(testId) {
    return this.activeTests.get(testId);
  }

getTestResult(testId) {
    return this.testResults.get(testId);
  }

cancelTest(testId) {
    const session = this.activeTests.get(testId);
    if (session) {
      session.status = 'cancelled';
      session.endTime = Date.now();
      this.emit('testCancelled', testId);
      console.log(`🛑 测试已取消: ${testId}

getSupportedTestTypes() {
    return Array.from(this.testTypes.values());
  }
}

module.exports = CoreTestEngine;
