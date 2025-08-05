#!/usr/bin/env node

/**
 * 测试到代理服务器的直接延迟
 * 分析代理连接的各个环节
 */

const net = require('net');
const { performance } = require('perf_hooks');

class ProxyLatencyTester {
  constructor(proxyHost, proxyPort) {
    this.proxyHost = proxyHost;
    this.proxyPort = proxyPort;
  }

  /**
   * 测试TCP连接延迟
   */
  async testTcpConnection() {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const socket = new net.Socket();
      
      socket.setTimeout(5000);
      
      socket.on('connect', () => {
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);
        socket.destroy();
        resolve({ success: true, latency, type: 'TCP连接' });
      });
      
      socket.on('error', (error) => {
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);
        resolve({ success: false, latency, error: error.message, type: 'TCP连接' });
      });
      
      socket.on('timeout', () => {
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);
        socket.destroy();
        resolve({ success: false, latency, error: '连接超时', type: 'TCP连接' });
      });
      
      socket.connect(this.proxyPort, this.proxyHost);
    });
  }

  /**
   * 测试HTTP代理握手延迟
   */
  async testHttpProxyHandshake() {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const socket = new net.Socket();
      
      socket.setTimeout(5000);
      
      socket.on('connect', () => {
        // 发送HTTP CONNECT请求
        const connectRequest = `CONNECT httpbin.org:80 HTTP/1.1\r\nHost: httpbin.org:80\r\n\r\n`;
        socket.write(connectRequest);
      });
      
      socket.on('data', (data) => {
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);
        const response = data.toString();
        
        socket.destroy();
        
        if (response.includes('200')) {
          resolve({ success: true, latency, type: 'HTTP代理握手', response: response.split('\r\n')[0] });
        } else {
          resolve({ success: false, latency, type: 'HTTP代理握手', error: response.split('\r\n')[0] });
        }
      });
      
      socket.on('error', (error) => {
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);
        resolve({ success: false, latency, error: error.message, type: 'HTTP代理握手' });
      });
      
      socket.on('timeout', () => {
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);
        socket.destroy();
        resolve({ success: false, latency, error: '握手超时', type: 'HTTP代理握手' });
      });
      
      socket.connect(this.proxyPort, this.proxyHost);
    });
  }

  /**
   * 多次测试取平均值
   */
  async testMultiple(testFunction, count = 5) {
    console.log(`   进行 ${count} 次测试...`);
    const results = [];
    
    for (let i = 0; i < count; i++) {
      const result = await testFunction.call(this);
      results.push(result);
      
      if (result.success) {
        console.log(`   测试 ${i + 1}: ${result.latency}ms ✅`);
      } else {
        console.log(`   测试 ${i + 1}: ${result.latency}ms ❌ (${result.error})`);
      }
      
      // 间隔500ms
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return {
        success: false,
        error: '所有测试都失败了',
        results
      };
    }
    
    const latencies = successfulResults.map(r => r.latency);
    const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);
    
    return {
      success: true,
      avgLatency,
      minLatency,
      maxLatency,
      successRate: (successfulResults.length / results.length * 100).toFixed(1),
      results
    };
  }

  /**
   * 运行完整测试
   */
  async runFullTest() {
    console.log('🔍 代理服务器延迟分析');
    console.log('=' .repeat(60));
    console.log(`📡 代理服务器: ${this.proxyHost}:${this.proxyPort}`);
    console.log('');

    // 测试1: TCP连接延迟
    console.log('📊 测试1: TCP连接延迟');
    const tcpResult = await this.testMultiple(this.testTcpConnection);
    
    if (tcpResult.success) {
      console.log(`   ✅ 平均延迟: ${tcpResult.avgLatency}ms`);
      console.log(`   📈 范围: ${tcpResult.minLatency}ms - ${tcpResult.maxLatency}ms`);
      console.log(`   📊 成功率: ${tcpResult.successRate}%`);
    } else {
      console.log(`   ❌ TCP连接失败: ${tcpResult.error}`);
      return;
    }

    console.log('');

    // 测试2: HTTP代理握手延迟
    console.log('📊 测试2: HTTP代理握手延迟');
    const handshakeResult = await this.testMultiple(this.testHttpProxyHandshake);
    
    if (handshakeResult.success) {
      console.log(`   ✅ 平均延迟: ${handshakeResult.avgLatency}ms`);
      console.log(`   📈 范围: ${handshakeResult.minLatency}ms - ${handshakeResult.maxLatency}ms`);
      console.log(`   📊 成功率: ${handshakeResult.successRate}%`);
    } else {
      console.log(`   ❌ 代理握手失败: ${handshakeResult.error}`);
    }

    console.log('');

    // 分析结果
    this.analyzeResults(tcpResult, handshakeResult);
  }

  /**
   * 分析测试结果
   */
  analyzeResults(tcpResult, handshakeResult) {
    console.log('📋 延迟分析结果');
    console.log('=' .repeat(60));

    if (!tcpResult.success) {
      console.log('❌ 无法连接到代理服务器');
      console.log('💡 可能的原因:');
      console.log('   - 代理服务器地址或端口错误');
      console.log('   - 代理服务器未运行');
      console.log('   - 网络连接问题');
      console.log('   - 防火墙阻止连接');
      return;
    }

    const tcpLatency = tcpResult.avgLatency;
    
    console.log(`🔗 TCP连接延迟: ${tcpLatency}ms`);
    
    if (handshakeResult.success) {
      const handshakeLatency = handshakeResult.avgLatency;
      console.log(`🤝 代理握手延迟: ${handshakeLatency}ms`);
      console.log(`⚡ 握手额外开销: ${handshakeLatency - tcpLatency}ms`);
    }

    console.log('');
    console.log('💡 延迟评估:');
    
    if (tcpLatency < 100) {
      console.log('   ✅ 延迟很低，网络连接良好');
    } else if (tcpLatency < 300) {
      console.log('   🟡 延迟中等，可以接受');
    } else if (tcpLatency < 500) {
      console.log('   🟠 延迟较高，可能影响体验');
    } else {
      console.log('   🔴 延迟很高，建议优化');
    }

    console.log('');
    console.log('🔧 优化建议:');
    
    if (tcpLatency > 300) {
      console.log('   - 尝试使用地理位置更近的代理服务器');
      console.log('   - 检查本地网络连接质量');
      console.log('   - 考虑更换网络运营商');
    }
    
    if (handshakeResult.success && handshakeResult.avgLatency - tcpLatency > 200) {
      console.log('   - 代理服务器响应较慢，考虑更换代理');
    }
    
    if (tcpResult.successRate < 100) {
      console.log('   - 网络连接不稳定，检查网络质量');
    }
  }
}

// 运行测试
async function runTest() {
  // 默认使用您的代理配置
  const proxyHost = '154.193.0.187'; // 您的韩国代理IP
  const proxyPort = 17890; // 您的代理端口
  
  console.log('请确保代理服务器正在运行...');
  console.log('');

  const tester = new ProxyLatencyTester(proxyHost, proxyPort);
  await tester.runFullTest();
}

if (require.main === module) {
  runTest().catch(console.error);
}

module.exports = ProxyLatencyTester;
