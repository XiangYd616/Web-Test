#!/usr/bin/env node

/**
 * 代理功能测试脚本
 * 用于验证代理连接逻辑是否正确
 */

const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const AbortController = require('abort-controller');

async function testProxy(proxyConfig) {
  console.log('🧪 开始测试代理配置...');
  console.log('代理配置:', proxyConfig);
  
  const startTime = Date.now();
  const testUrl = 'https://httpbin.org/ip';
  
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

    console.log('代理URL:', proxyUrl.replace(/\/\/.*:.*@/, '//***:***@')); // 隐藏密码

    // 根据目标URL协议选择合适的代理agent
    let agent;
    const isHttpsTarget = testUrl.startsWith('https://');
    
    if (isHttpsTarget) {
      agent = new HttpsProxyAgent(proxyUrl);
      console.log('使用 HttpsProxyAgent');
    } else {
      agent = new HttpProxyAgent(proxyUrl);
      console.log('使用 HttpProxyAgent');
    }

    // 设置超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ 请求超时，中止连接...');
      controller.abort();
    }, 10000);

    console.log('🌐 发送测试请求到:', testUrl);

    // 发送测试请求
    const response = await fetch(testUrl, {
      method: 'GET',
      agent: agent,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Test-Web-Proxy-Test/1.0',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    console.log('📊 响应状态:', response.status, response.statusText);
    console.log('⏱️  响应时间:', responseTime + 'ms');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log('📍 响应数据:', responseData);

    // 提取代理IP
    let proxyIp = '未知';
    if (responseData && responseData.origin) {
      proxyIp = responseData.origin;
    }

    console.log('✅ 代理测试成功!');
    console.log('🌍 出口IP:', proxyIp);
    console.log('⏱️  总耗时:', responseTime + 'ms');

    return {
      success: true,
      proxyIp: proxyIp,
      responseTime: responseTime,
      response: responseData
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('❌ 代理测试失败:', error.message);
    console.log('⏱️  失败耗时:', responseTime + 'ms');
    
    // 错误分析
    if (error.name === 'AbortError') {
      console.log('💡 错误分析: 连接超时');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 错误分析: 代理服务器拒绝连接');
    } else if (error.code === 'ENOTFOUND') {
      console.log('💡 错误分析: 无法解析代理服务器地址');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('💡 错误分析: 连接超时');
    }

    return {
      success: false,
      error: error.message,
      errorCode: error.code || error.name,
      responseTime: responseTime
    };
  }
}

// 测试不同的代理配置
async function runTests() {
  console.log('🚀 代理功能测试开始\n');

  // 测试配置示例
  const testConfigs = [
    {
      name: '本地HTTP代理',
      config: {
        type: 'http',
        host: '127.0.0.1',
        port: 7890
      }
    },
    {
      name: '本地SOCKS代理',
      config: {
        type: 'socks5',
        host: '127.0.0.1', 
        port: 7891
      }
    },
    {
      name: '带认证的代理',
      config: {
        type: 'http',
        host: 'proxy.example.com',
        port: 8080,
        username: 'user',
        password: 'pass'
      }
    }
  ];

  for (const testConfig of testConfigs) {
    console.log(`\n📋 测试: ${testConfig.name}`);
    console.log('=' .repeat(50));
    
    const result = await testProxy(testConfig.config);
    
    if (result.success) {
      console.log('🎉 测试通过');
    } else {
      console.log('💥 测试失败');
    }
    
    console.log('');
  }

  console.log('🏁 所有测试完成');
}

// 如果直接运行此脚本
if (require.main === module) {
  // 检查命令行参数
  const args = process.argv.slice(2);
  
  if (args.length >= 2) {
    // 使用命令行参数
    const host = args[0];
    const port = parseInt(args[1]) || 8080;
    const type = args[2] || 'http';
    const username = args[3];
    const password = args[4];
    
    console.log('使用命令行参数进行测试:');
    testProxy({
      host,
      port,
      type,
      username,
      password
    }).then(result => {
      process.exit(result.success ? 0 : 1);
    });
  } else {
    console.log('用法:');
    console.log('  node test-proxy.js <host> <port> [type] [username] [password]');
    console.log('');
    console.log('示例:');
    console.log('  node test-proxy.js 127.0.0.1 7890');
    console.log('  node test-proxy.js 127.0.0.1 7890 http');
    console.log('  node test-proxy.js proxy.example.com 8080 http user pass');
    console.log('');
    console.log('运行预设测试:');
    runTests();
  }
}

module.exports = { testProxy };
