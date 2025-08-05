#!/usr/bin/env node

/**
 * 测试不同目标服务器的代理延迟
 * 找出最快的测试目标
 */

const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');

// 不同地区的测试服务器
const TEST_SERVERS = [
  {
    name: 'httpbin.org (美国)',
    url: 'http://httpbin.org/ip',
    region: '美国'
  },
  {
    name: 'httpbin.org HTTPS (美国)',
    url: 'https://httpbin.org/ip',
    region: '美国'
  },
  {
    name: 'ipinfo.io (美国)',
    url: 'http://ipinfo.io/json',
    region: '美国'
  },
  {
    name: 'ip-api.com (美国)',
    url: 'http://ip-api.com/json',
    region: '美国'
  },
  {
    name: 'ifconfig.me (美国)',
    url: 'http://ifconfig.me/ip',
    region: '美国'
  },
  {
    name: 'icanhazip.com (美国)',
    url: 'http://icanhazip.com',
    region: '美国'
  },
  {
    name: 'myip.com (美国)',
    url: 'http://api.myip.com',
    region: '美国'
  },
  {
    name: 'ipecho.net (美国)',
    url: 'http://ipecho.net/plain',
    region: '美国'
  }
];

class ProxyTargetTester {
  constructor() {
    this.proxyConfig = {
      host: '127.0.0.1',
      port: 7890,
      type: 'http'
    };
  }

  /**
   * 测试单个目标服务器
   */
  async testTarget(server, useProxy = true) {
    const startTime = Date.now();
    
    try {
      let agent = null;
      
      if (useProxy) {
        const proxyUrl = `${this.proxyConfig.type}://${this.proxyConfig.host}:${this.proxyConfig.port}`;
        
        if (server.url.startsWith('https://')) {
          agent = new HttpsProxyAgent(proxyUrl);
        } else {
          agent = new HttpProxyAgent(proxyUrl);
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(server.url, {
        agent: agent,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Proxy-Target-Tester/1.0'
        }
      });

      clearTimeout(timeoutId);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.text();
      
      return {
        success: true,
        responseTime,
        status: response.status,
        dataLength: data.length,
        data: data.substring(0, 100) // 只显示前100个字符
      };

    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        responseTime: endTime - startTime,
        error: error.message
      };
    }
  }

  /**
   * 测试所有目标服务器
   */
  async testAllTargets() {
    console.log('🌐 代理目标服务器延迟测试');
    console.log('=' .repeat(80));
    console.log(`📡 代理: ${this.proxyConfig.host}:${this.proxyConfig.port}`);
    console.log('');

    const results = [];

    // 先测试直连延迟（基准）
    console.log('📊 基准测试（直连）:');
    for (const server of TEST_SERVERS.slice(0, 3)) { // 只测试前3个
      console.log(`   测试 ${server.name}...`);
      const result = await this.testTarget(server, false);
      
      if (result.success) {
        console.log(`   ✅ ${result.responseTime}ms`);
      } else {
        console.log(`   ❌ 失败: ${result.error}`);
      }
    }

    console.log('');
    console.log('📊 代理测试:');

    // 测试通过代理的延迟
    for (const server of TEST_SERVERS) {
      console.log(`   测试 ${server.name}...`);
      const result = await this.testTarget(server, true);
      
      results.push({
        server,
        result
      });

      if (result.success) {
        console.log(`   ✅ ${result.responseTime}ms`);
      } else {
        console.log(`   ❌ 失败: ${result.error}`);
      }

      // 避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 分析结果
    this.analyzeResults(results);
    return results;
  }

  /**
   * 分析测试结果
   */
  analyzeResults(results) {
    console.log('');
    console.log('📋 测试结果分析');
    console.log('=' .repeat(80));

    const successfulResults = results.filter(r => r.result.success);
    
    if (successfulResults.length === 0) {
      console.log('❌ 所有测试都失败了，请检查代理配置');
      return;
    }

    // 按响应时间排序
    successfulResults.sort((a, b) => a.result.responseTime - b.result.responseTime);

    console.log('🏆 最快的服务器:');
    successfulResults.slice(0, 5).forEach((item, index) => {
      const { server, result } = item;
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
      console.log(`   ${medal} ${server.name}: ${result.responseTime}ms`);
    });

    console.log('');
    console.log('💡 建议:');
    
    const fastest = successfulResults[0];
    console.log(`   使用最快的服务器: ${fastest.server.url}`);
    console.log(`   预期延迟: ${fastest.result.responseTime}ms`);
    
    if (fastest.result.responseTime > 1000) {
      console.log('   ⚠️  延迟仍然较高，可能的原因:');
      console.log('      - 代理服务器本身较慢');
      console.log('      - 网络连接问题');
      console.log('      - 代理服务器地理位置较远');
    }

    console.log('');
    console.log('🔧 优化建议:');
    console.log('   1. 使用最快的测试URL更新代码');
    console.log('   2. 考虑使用地理位置更近的代理服务器');
    console.log('   3. 检查代理服务器的网络质量');
  }

  /**
   * 更新代理配置
   */
  updateProxyConfig(config) {
    this.proxyConfig = { ...this.proxyConfig, ...config };
  }
}

// 运行测试
async function runTest() {
  const tester = new ProxyTargetTester();
  
  // 可以在这里修改代理配置
  // tester.updateProxyConfig({
  //   host: 'your-proxy-host',
  //   port: 7890,
  //   type: 'http'
  // });

  console.log('请确保代理服务器正在运行...');
  console.log('');

  await tester.testAllTargets();
}

if (require.main === module) {
  runTest().catch(console.error);
}

module.exports = ProxyTargetTester;
