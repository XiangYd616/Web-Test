#!/usr/bin/env node

/**
 * 代理延时测试工具
 * 对比直链和代理请求的延时差异
 */

const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const AbortController = require('abort-controller');

class LatencyTester {
  constructor() {
    this.testUrl = 'https://httpbin.org/ip';
    this.testCount = 5; // 每种方式测试5次
  }

  /**
   * 直链请求测试
   */
  async testDirectRequest() {
    const results = [];
    
    console.log('🔗 测试直链请求延时...');
    
    for (let i = 0; i < this.testCount; i++) {
      const startTime = Date.now();
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(this.testUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Latency-Test-Direct/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        if (response.ok) {
          results.push(latency);
          console.log(`  测试 ${i + 1}: ${latency}ms`);
        } else {
          console.log(`  测试 ${i + 1}: 失败 (${response.status})`);
        }
        
      } catch (error) {
        console.log(`  测试 ${i + 1}: 错误 (${error.message})`);
      }
      
      // 间隔1秒
      await this.sleep(1000);
    }
    
    return results;
  }

  /**
   * 代理请求测试
   */
  async testProxyRequest(proxyConfig) {
    const results = [];
    
    console.log(`🔀 测试代理请求延时 (${proxyConfig.host}:${proxyConfig.port})...`);
    
    try {
      // 构建代理URL
      const proxyType = proxyConfig.type || 'http';
      const proxyPort = proxyConfig.port || 8080;
      let proxyUrl;

      if (proxyConfig.username && proxyConfig.password) {
        proxyUrl = `${proxyType}://${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.host}:${proxyPort}`;
      } else {
        proxyUrl = `${proxyType}://${proxyConfig.host}:${proxyPort}`;
      }

      // 选择代理agent
      const isHttpsTarget = this.testUrl.startsWith('https://');
      let agent;
      
      if (isHttpsTarget) {
        agent = new HttpsProxyAgent(proxyUrl);
      } else {
        agent = new HttpProxyAgent(proxyUrl);
      }

      for (let i = 0; i < this.testCount; i++) {
        const startTime = Date.now();
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 代理请求给更长超时
          
          const response = await fetch(this.testUrl, {
            agent: agent,
            signal: controller.signal,
            headers: {
              'User-Agent': 'Latency-Test-Proxy/1.0'
            }
          });
          
          clearTimeout(timeoutId);
          const endTime = Date.now();
          const latency = endTime - startTime;
          
          if (response.ok) {
            results.push(latency);
            console.log(`  测试 ${i + 1}: ${latency}ms`);
          } else {
            console.log(`  测试 ${i + 1}: 失败 (${response.status})`);
          }
          
        } catch (error) {
          console.log(`  测试 ${i + 1}: 错误 (${error.message})`);
        }
        
        // 间隔1秒
        await this.sleep(1000);
      }
      
    } catch (error) {
      console.error('代理配置错误:', error.message);
    }
    
    return results;
  }

  /**
   * 计算统计信息
   */
  calculateStats(results) {
    if (results.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }
    
    const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
    const min = Math.min(...results);
    const max = Math.max(...results);
    
    return { avg, min, max, count: results.length };
  }

  /**
   * 延时分析
   */
  analyzeLatency(directStats, proxyStats) {
    console.log('\n📊 延时分析报告:');
    console.log('=' .repeat(60));
    
    console.log('🔗 直链请求:');
    console.log(`   平均延时: ${directStats.avg}ms`);
    console.log(`   最小延时: ${directStats.min}ms`);
    console.log(`   最大延时: ${directStats.max}ms`);
    console.log(`   成功次数: ${directStats.count}/${this.testCount}`);
    
    console.log('\n🔀 代理请求:');
    console.log(`   平均延时: ${proxyStats.avg}ms`);
    console.log(`   最小延时: ${proxyStats.min}ms`);
    console.log(`   最大延时: ${proxyStats.max}ms`);
    console.log(`   成功次数: ${proxyStats.count}/${this.testCount}`);
    
    if (directStats.avg > 0 && proxyStats.avg > 0) {
      const overhead = proxyStats.avg - directStats.avg;
      const overheadPercent = Math.round((overhead / directStats.avg) * 100);
      
      console.log('\n📈 延时对比:');
      console.log(`   代理额外延时: ${overhead}ms`);
      console.log(`   延时增加比例: ${overheadPercent}%`);
      
      // 延时评估
      console.log('\n💡 延时评估:');
      if (overhead < 50) {
        console.log('   ✅ 延时增加较小，可接受');
      } else if (overhead < 200) {
        console.log('   ⚠️  延时增加中等，需要权衡');
      } else {
        console.log('   ❌ 延时增加较大，建议优化');
      }
      
      // 建议
      console.log('\n🎯 优化建议:');
      if (overhead > 100) {
        console.log('   • 选择地理位置更近的代理服务器');
        console.log('   • 使用高性能的代理服务器');
        console.log('   • 考虑使用专用代理线路');
      }
      if (overheadPercent > 50) {
        console.log('   • 评估是否真的需要使用代理');
        console.log('   • 考虑在目标网站附近部署测试节点');
      }
    }
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 运行完整测试
   */
  async runFullTest(proxyConfig) {
    console.log('🧪 代理延时对比测试');
    console.log('=' .repeat(60));
    console.log(`📡 测试目标: ${this.testUrl}`);
    console.log(`🔢 测试次数: ${this.testCount} 次/方式`);
    console.log('');
    
    // 测试直链
    const directResults = await this.testDirectRequest();
    const directStats = this.calculateStats(directResults);
    
    console.log('');
    
    // 测试代理
    const proxyResults = await this.testProxyRequest(proxyConfig);
    const proxyStats = this.calculateStats(proxyResults);
    
    // 分析结果
    this.analyzeLatency(directStats, proxyStats);
    
    return {
      direct: directStats,
      proxy: proxyStats,
      overhead: proxyStats.avg - directStats.avg
    };
  }
}

// 命令行使用
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length >= 2) {
    const proxyConfig = {
      host: args[0],
      port: parseInt(args[1]) || 8080,
      type: args[2] || 'http',
      username: args[3],
      password: args[4]
    };
    
    const tester = new LatencyTester();
    tester.runFullTest(proxyConfig).then(results => {
      console.log('\n🏁 测试完成');
      process.exit(0);
    }).catch(error => {
      console.error('❌ 测试失败:', error);
      process.exit(1);
    });
    
  } else {
    console.log('代理延时测试工具');
    console.log('');
    console.log('用法:');
    console.log('  node test-proxy-latency.js <host> <port> [type] [username] [password]');
    console.log('');
    console.log('示例:');
    console.log('  node test-proxy-latency.js 127.0.0.1 7890');
    console.log('  node test-proxy-latency.js proxy.example.com 8080 http user pass');
  }
}

module.exports = LatencyTester;
