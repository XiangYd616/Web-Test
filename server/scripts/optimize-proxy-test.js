#!/usr/bin/env node

/**
 * 代理测试性能优化工具
 * 分析和优化代理连接测试的性能
 */

const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const AbortController = require('abort-controller');

class ProxyTestOptimizer {
  constructor() {
    this.testUrls = [
      'http://httpbin.org/ip',      // HTTP - 最快
      'https://httpbin.org/ip',     // HTTPS - 较慢
      'http://ip-api.com/json',     // 备选HTTP
      'https://api.ipify.org?format=json' // 备选HTTPS
    ];
    this.timeouts = [1000, 2000, 3000, 5000]; // 不同超时时间
  }

  /**
   * 测试不同配置的性能
   */
  async optimizeProxyTest(proxyConfig) {
    console.log('🚀 代理测试性能优化');
    console.log('=' .repeat(50));
    console.log(`📡 代理: ${proxyConfig.host}:${proxyConfig.port}`);
    console.log('');

    const results = [];

    // 测试不同URL和超时组合
    for (const testUrl of this.testUrls) {
      for (const timeout of this.timeouts) {
        console.log(`🧪 测试: ${testUrl} (${timeout}ms 超时)`);
        
        const result = await this.testConfiguration(proxyConfig, testUrl, timeout);
        results.push({
          url: testUrl,
          timeout,
          ...result
        });

        console.log(`   结果: ${result.success ? '✅' : '❌'} ${result.responseTime}ms`);
      }
      console.log('');
    }

    // 分析结果
    this.analyzeResults(results);
    return results;
  }

  /**
   * 测试单个配置
   */
  async testConfiguration(proxyConfig, testUrl, timeout) {
    const startTime = Date.now();
    
    try {
      const proxyType = proxyConfig.type || 'http';
      const proxyPort = proxyConfig.port || 8080;
      let proxyUrl;

      if (proxyConfig.username && proxyConfig.password) {
        proxyUrl = `${proxyType}://${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.host}:${proxyPort}`;
      } else {
        proxyUrl = `${proxyType}://${proxyConfig.host}:${proxyPort}`;
      }

      // 选择代理agent
      let agent;
      const isHttpsTarget = testUrl.startsWith('https://');
      
      if (isHttpsTarget) {
        agent = new HttpsProxyAgent(proxyUrl);
      } else {
        agent = new HttpProxyAgent(proxyUrl);
      }

      // 设置超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);

      const response = await fetch(testUrl, {
        agent: agent,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Proxy-Optimizer/1.0'
        }
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      return {
        success: response.ok,
        responseTime,
        status: response.status,
        error: null
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        responseTime,
        status: null,
        error: error.message
      };
    }
  }

  /**
   * 分析测试结果
   */
  analyzeResults(results) {
    console.log('📊 性能分析结果');
    console.log('=' .repeat(50));

    // 成功的测试
    const successfulTests = results.filter(r => r.success);
    
    if (successfulTests.length === 0) {
      console.log('❌ 所有测试都失败了');
      this.suggestTroubleshooting(results);
      return;
    }

    // 找出最快的配置
    const fastest = successfulTests.reduce((prev, current) => 
      prev.responseTime < current.responseTime ? prev : current
    );

    console.log('🏆 最佳配置:');
    console.log(`   URL: ${fastest.url}`);
    console.log(`   超时: ${fastest.timeout}ms`);
    console.log(`   响应时间: ${fastest.responseTime}ms`);
    console.log('');

    // 按URL分组分析
    const urlGroups = this.groupByUrl(successfulTests);
    console.log('📈 各URL性能对比:');
    
    Object.entries(urlGroups).forEach(([url, tests]) => {
      const avgTime = Math.round(tests.reduce((sum, t) => sum + t.responseTime, 0) / tests.length);
      const minTime = Math.min(...tests.map(t => t.responseTime));
      const maxTime = Math.max(...tests.map(t => t.responseTime));
      
      console.log(`   ${url}:`);
      console.log(`     平均: ${avgTime}ms, 最快: ${minTime}ms, 最慢: ${maxTime}ms`);
    });

    console.log('');

    // 生成建议
    this.generateRecommendations(fastest, successfulTests);
  }

  /**
   * 按URL分组
   */
  groupByUrl(results) {
    return results.reduce((groups, result) => {
      const url = result.url;
      if (!groups[url]) {
        groups[url] = [];
      }
      groups[url].push(result);
      return groups;
    }, {});
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(fastest, allSuccessful) {
    console.log('💡 优化建议:');

    // URL建议
    if (fastest.url.startsWith('http://')) {
      console.log('   ✅ 使用HTTP URL可以获得更好的性能');
    } else {
      console.log('   ⚠️  HTTPS URL较慢，考虑使用HTTP进行快速测试');
    }

    // 超时建议
    const fastTimeouts = allSuccessful.filter(t => t.responseTime < 1000);
    if (fastTimeouts.length > 0) {
      const recommendedTimeout = Math.max(2000, fastest.responseTime * 2);
      console.log(`   ⏱️  建议超时时间: ${recommendedTimeout}ms`);
    } else {
      console.log('   ⏱️  建议超时时间: 5000ms（网络较慢）');
    }

    // 性能等级
    if (fastest.responseTime < 500) {
      console.log('   🚀 代理性能: 优秀');
    } else if (fastest.responseTime < 1000) {
      console.log('   ✅ 代理性能: 良好');
    } else if (fastest.responseTime < 2000) {
      console.log('   ⚠️  代理性能: 一般');
    } else {
      console.log('   ❌ 代理性能: 较差，建议更换代理');
    }

    console.log('');
    console.log('🔧 应用建议:');
    console.log(`   1. 默认使用: ${fastest.url}`);
    console.log(`   2. 超时设置: ${Math.max(3000, fastest.responseTime * 2)}ms`);
    console.log('   3. 失败时降级到HTTPS测试');
  }

  /**
   * 故障排除建议
   */
  suggestTroubleshooting(results) {
    console.log('🔧 故障排除建议:');
    
    const errors = results.map(r => r.error).filter(Boolean);
    const uniqueErrors = [...new Set(errors)];
    
    uniqueErrors.forEach(error => {
      if (error.includes('ECONNREFUSED')) {
        console.log('   ❌ 连接被拒绝: 检查代理服务器是否运行');
      } else if (error.includes('ETIMEDOUT')) {
        console.log('   ⏰ 连接超时: 检查网络连接和代理配置');
      } else if (error.includes('ENOTFOUND')) {
        console.log('   🔍 域名解析失败: 检查代理地址是否正确');
      } else if (error.includes('AbortError')) {
        console.log('   ⏱️  请求超时: 尝试增加超时时间');
      }
    });
  }
}

// 运行优化测试
async function runOptimization() {
  const optimizer = new ProxyTestOptimizer();
  
  // 示例代理配置
  const proxyConfig = {
    host: '127.0.0.1',
    port: 7890,
    type: 'http'
  };

  console.log('请修改 proxyConfig 为您的实际代理配置');
  console.log('当前配置:', proxyConfig);
  console.log('');

  await optimizer.optimizeProxyTest(proxyConfig);
}

if (require.main === module) {
  runOptimization().catch(console.error);
}

module.exports = ProxyTestOptimizer;
