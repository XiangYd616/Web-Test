#!/usr/bin/env node

/**
 * 代理测试架构分析工具
 * 检测可能导致延迟的架构问题
 */

const fetch = require('node-fetch');
const { performance } = require('perf_hooks');

class ProxyArchitectureAnalyzer {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
    this.testUrl = 'http://httpbin.org/ip';
  }

  /**
   * 分析完整的请求流程
   */
  async analyzeRequestFlow(proxyConfig) {
    console.log('🔍 代理测试架构分析');
    console.log('=' .repeat(60));
    console.log(`📡 代理: ${proxyConfig.host}:${proxyConfig.port}`);
    console.log('');

    const analysis = {
      steps: [],
      totalTime: 0,
      bottlenecks: [],
      recommendations: []
    };

    // 步骤1：测试直连延迟（基准）
    console.log('📊 步骤1：测试直连延迟（基准）');
    const directLatency = await this.testDirectConnection();
    analysis.steps.push({
      name: '直连测试',
      time: directLatency,
      description: '不通过代理的直接连接延迟'
    });
    console.log(`   直连延迟: ${directLatency}ms\n`);

    // 步骤2：测试前端到后端的延迟
    console.log('📊 步骤2：测试前端到后端API延迟');
    const apiLatency = await this.testApiLatency();
    analysis.steps.push({
      name: 'API响应',
      time: apiLatency,
      description: '前端到后端API的基础延迟'
    });
    console.log(`   API延迟: ${apiLatency}ms\n`);

    // 步骤3：测试代理连接（完整流程）
    console.log('📊 步骤3：测试代理连接（完整流程）');
    const proxyResult = await this.testProxyConnection(proxyConfig);
    analysis.steps.push({
      name: '代理测试',
      time: proxyResult.responseTime,
      description: '完整的代理测试流程'
    });
    console.log(`   代理测试延迟: ${proxyResult.responseTime}ms\n`);

    // 步骤4：分析各组件延迟
    console.log('📊 步骤4：分析组件延迟');
    const componentAnalysis = await this.analyzeComponents(proxyConfig);
    analysis.components = componentAnalysis;

    // 计算总延迟和分析瓶颈
    analysis.totalTime = proxyResult.responseTime;
    this.identifyBottlenecks(analysis);
    this.generateRecommendations(analysis);

    // 输出分析结果
    this.printAnalysis(analysis);

    return analysis;
  }

  /**
   * 测试直连延迟
   */
  async testDirectConnection() {
    const startTime = performance.now();
    
    try {
      const response = await fetch(this.testUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Architecture-Analyzer/1.0'
        }
      });
      
      const endTime = performance.now();
      return Math.round(endTime - startTime);
    } catch (error) {
      console.warn('   直连测试失败:', error.message);
      return -1;
    }
  }

  /**
   * 测试API延迟
   */
  async testApiLatency() {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/test/geo-status`, {
        timeout: 5000
      });
      
      const endTime = performance.now();
      return Math.round(endTime - startTime);
    } catch (error) {
      console.warn('   API测试失败:', error.message);
      return -1;
    }
  }

  /**
   * 测试代理连接
   */
  async testProxyConnection(proxyConfig) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/test/proxy-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proxy: proxyConfig,
          testUrl: this.testUrl,
          fastTest: true
        }),
        timeout: 10000
      });
      
      const endTime = performance.now();
      const result = await response.json();
      
      return {
        responseTime: Math.round(endTime - startTime),
        serverReportedTime: result.responseTime || 0,
        success: result.success
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        responseTime: Math.round(endTime - startTime),
        serverReportedTime: 0,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 分析各组件延迟
   */
  async analyzeComponents(proxyConfig) {
    const components = {};

    // 测试地理位置服务延迟
    console.log('   🌍 测试地理位置服务...');
    const geoStartTime = performance.now();
    try {
      await fetch(`${this.baseUrl}/api/test/geo-status`);
      components.geoService = Math.round(performance.now() - geoStartTime);
      console.log(`      地理位置服务: ${components.geoService}ms`);
    } catch (error) {
      components.geoService = -1;
      console.log(`      地理位置服务: 失败`);
    }

    // 测试代理验证器延迟
    console.log('   🔍 测试代理验证器...');
    const validatorStartTime = performance.now();
    try {
      await fetch(`${this.baseUrl}/api/test/proxy-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxy: proxyConfig })
      });
      components.proxyValidator = Math.round(performance.now() - validatorStartTime);
      console.log(`      代理验证器: ${components.proxyValidator}ms`);
    } catch (error) {
      components.proxyValidator = -1;
      console.log(`      代理验证器: 失败`);
    }

    return components;
  }

  /**
   * 识别性能瓶颈
   */
  identifyBottlenecks(analysis) {
    const { steps, components } = analysis;
    
    // 检查API基础延迟
    const apiStep = steps.find(s => s.name === 'API响应');
    if (apiStep && apiStep.time > 100) {
      analysis.bottlenecks.push({
        component: 'API基础延迟',
        time: apiStep.time,
        severity: apiStep.time > 500 ? 'high' : 'medium',
        description: 'API响应延迟较高，可能是服务器性能问题'
      });
    }

    // 检查地理位置服务延迟
    if (components.geoService > 200) {
      analysis.bottlenecks.push({
        component: '地理位置服务',
        time: components.geoService,
        severity: components.geoService > 1000 ? 'high' : 'medium',
        description: '地理位置查询延迟较高，建议异步处理'
      });
    }

    // 检查代理验证器延迟
    if (components.proxyValidator > 500) {
      analysis.bottlenecks.push({
        component: '代理验证器',
        time: components.proxyValidator,
        severity: components.proxyValidator > 2000 ? 'high' : 'medium',
        description: '代理验证延迟较高，建议优化验证逻辑'
      });
    }

    // 检查总延迟
    const proxyStep = steps.find(s => s.name === '代理测试');
    if (proxyStep && proxyStep.time > 2000) {
      analysis.bottlenecks.push({
        component: '总体延迟',
        time: proxyStep.time,
        severity: 'high',
        description: '总体延迟过高，需要全面优化'
      });
    }
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(analysis) {
    const { bottlenecks, steps } = analysis;
    
    if (bottlenecks.length === 0) {
      analysis.recommendations.push('✅ 架构性能良好，无需优化');
      return;
    }

    // 基于瓶颈生成建议
    bottlenecks.forEach(bottleneck => {
      switch (bottleneck.component) {
        case '地理位置服务':
          analysis.recommendations.push('🌍 将地理位置查询改为异步非阻塞处理');
          analysis.recommendations.push('💾 启用地理位置查询缓存');
          break;
        case '代理验证器':
          analysis.recommendations.push('🔍 优化代理验证逻辑，减少不必要的检查');
          analysis.recommendations.push('⚡ 使用更快的测试URL');
          break;
        case 'API基础延迟':
          analysis.recommendations.push('🚀 优化服务器性能');
          analysis.recommendations.push('📦 检查中间件和路由处理');
          break;
        case '总体延迟':
          analysis.recommendations.push('🔧 全面架构优化');
          analysis.recommendations.push('📊 实施性能监控');
          break;
      }
    });

    // 通用建议
    analysis.recommendations.push('⏱️ 减少超时时间到3-5秒');
    analysis.recommendations.push('🔄 实施请求重试机制');
    analysis.recommendations.push('📈 添加性能监控和告警');
  }

  /**
   * 打印分析结果
   */
  printAnalysis(analysis) {
    console.log('📋 架构分析结果');
    console.log('=' .repeat(60));

    // 步骤延迟
    console.log('⏱️  各步骤延迟:');
    analysis.steps.forEach(step => {
      const status = step.time > 1000 ? '❌' : step.time > 500 ? '⚠️' : '✅';
      console.log(`   ${status} ${step.name}: ${step.time}ms`);
    });

    // 组件延迟
    if (analysis.components) {
      console.log('\n🔧 组件延迟:');
      Object.entries(analysis.components).forEach(([name, time]) => {
        const status = time > 500 ? '❌' : time > 200 ? '⚠️' : '✅';
        console.log(`   ${status} ${name}: ${time}ms`);
      });
    }

    // 瓶颈分析
    if (analysis.bottlenecks.length > 0) {
      console.log('\n🚨 发现的瓶颈:');
      analysis.bottlenecks.forEach(bottleneck => {
        const icon = bottleneck.severity === 'high' ? '🔴' : '🟡';
        console.log(`   ${icon} ${bottleneck.component}: ${bottleneck.time}ms`);
        console.log(`      ${bottleneck.description}`);
      });
    }

    // 优化建议
    console.log('\n💡 优化建议:');
    analysis.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });

    console.log('');
  }
}

// 运行分析
async function runAnalysis() {
  const analyzer = new ProxyArchitectureAnalyzer();
  
  // 示例代理配置
  const proxyConfig = {
    enabled: true,
    host: '127.0.0.1',
    port: 7890,
    type: 'http'
  };

  console.log('请修改 proxyConfig 为您的实际代理配置');
  console.log('当前配置:', proxyConfig);
  console.log('');

  await analyzer.analyzeRequestFlow(proxyConfig);
}

if (require.main === module) {
  runAnalysis().catch(console.error);
}

module.exports = ProxyArchitectureAnalyzer;
