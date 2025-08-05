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

/**
 * 通过代理获取出口IP并测试延迟
 */
async function quickLatencyTest(proxyConfig, testUrl = 'http://httpbin.org/ip') {
  const proxyHost = proxyConfig.host;
  const proxyPort = proxyConfig.port || 8080;
  const proxyType = proxyConfig.type || 'http';

  console.log(`🌐 通过代理获取出口IP: ${proxyHost}:${proxyPort}`);

  try {
    // 构建代理URL
    let proxyUrl;
    if (proxyConfig.username && proxyConfig.password) {
      proxyUrl = `${proxyType}://${proxyConfig.username}:${proxyConfig.password}@${proxyHost}:${proxyPort}`;
    } else {
      proxyUrl = `${proxyType}://${proxyHost}:${proxyPort}`;
    }

    // 通过代理访问测试网站获取出口IP
    const fetch = require('node-fetch');
    const { HttpsProxyAgent } = require('https-proxy-agent');
    const { HttpProxyAgent } = require('http-proxy-agent');
    const AbortController = require('abort-controller');

    let agent;
    const isHttpsTarget = testUrl.startsWith('https://');

    if (isHttpsTarget) {
      agent = new HttpsProxyAgent(proxyUrl);
    } else {
      agent = new HttpProxyAgent(proxyUrl);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const startTime = Date.now();
    const response = await fetch(testUrl, {
      method: 'GET',
      agent: agent,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Test-Web-Proxy-Latency-Test/1.0',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    clearTimeout(timeoutId);
    const proxyResponseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();

    // 从响应中提取出口IP
    let exitIp = '未知';
    if (responseData && responseData.origin) {
      exitIp = responseData.origin;
    }

    console.log(`✅ 通过代理获取到出口IP: ${exitIp}`);

    // 测试到出口IP的延迟
    let networkLatency = null;
    if (exitIp && exitIp !== '未知') {
      try {
        console.log(`🔍 测试到出口IP ${exitIp} 的网络延迟...`);
        const ping = require('ping');
        const pingResult = await ping.promise.probe(exitIp, {
          timeout: 5,
          extra: process.platform === 'win32' ? ['-n', '4'] : ['-c', '4']
        });

        if (pingResult.alive) {
          // 处理不同平台的ping结果
          const avgTime = pingResult.avg || pingResult.time || pingResult.min;
          networkLatency = Math.round(parseFloat(avgTime) || 0);
          console.log(`📊 到出口IP的网络延迟: ${networkLatency}ms`);
        } else {
          console.log(`⚠️ 无法ping通出口IP ${exitIp}`);
        }
      } catch (pingError) {
        console.warn('ping测试失败:', pingError.message);
      }
    }

    return {
      success: true,
      proxyHost: proxyHost,
      proxyPort: proxyPort,
      exitIp: exitIp,
      proxyResponseTime: proxyResponseTime,
      networkLatency: networkLatency,
      latency: networkLatency || proxyResponseTime
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      proxyHost: proxyHost,
      proxyPort: proxyPort
    };
  }
}

/**
 * 带超时的代理测试
 */
async function testProxyWithTimeout(proxyConfig, testUrl, timeout) {
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

    let agent;
    const isHttpsTarget = testUrl.startsWith('https://');

    if (isHttpsTarget) {
      agent = new HttpsProxyAgent(proxyUrl);
    } else {
      agent = new HttpProxyAgent(proxyUrl);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();

    return {
      success: true,
      proxyIp: responseData.origin || '未知',
      responseTime: responseTime,
      timeout: timeout
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime,
      timeout: timeout
    };
  }
}

/**
 * 从环境变量获取代理配置
 */
function getProxyConfigsFromEnv() {
  const configs = [];

  // 从环境变量读取代理配置
  if (process.env.PROXY_HOST) {
    configs.push({
      name: '环境变量代理',
      config: {
        type: process.env.PROXY_TYPE || 'http',
        host: process.env.PROXY_HOST,
        port: parseInt(process.env.PROXY_PORT) || 8080,
        username: process.env.PROXY_USERNAME,
        password: process.env.PROXY_PASSWORD
      }
    });
  }

  return configs;
}

/**
 * 获取常见代理端口的测试配置
 */
function getCommonProxyConfigs() {
  const commonPorts = [8080, 3128, 1080, 7890, 8118];
  const configs = [];

  console.log('💡 提示: 这些是常见的代理端口配置示例');
  console.log('   请根据您的实际代理配置修改参数\n');

  for (const port of commonPorts) {
    configs.push({
      name: `常见端口 ${port}`,
      config: {
        type: 'http',
        host: 'localhost',
        port: port
      }
    });
  }

  return configs;
}

// 测试代理配置
async function runTests() {
  console.log('🚀 代理功能测试开始\n');

  // 优先使用环境变量配置
  let testConfigs = getProxyConfigsFromEnv();

  // 如果没有环境变量配置，使用常见端口示例
  if (testConfigs.length === 0) {
    console.log('⚠️  未找到环境变量代理配置');
    console.log('   设置环境变量: PROXY_HOST, PROXY_PORT, PROXY_TYPE');
    console.log('   或使用命令行参数: node test-proxy.js <host> <port> [type]\n');

    testConfigs = getCommonProxyConfigs();
  }

  for (const testConfig of testConfigs) {
    console.log(`\n📋 测试: ${testConfig.name}`);
    console.log('='.repeat(50));

    // 使用延迟测试
    const result = await quickLatencyTest(testConfig.config);

    if (result.success) {
      console.log('🎉 延迟测试通过');
      console.log(`🌐 代理服务器: ${result.proxyHost}:${result.proxyPort}`);
      console.log(`🌍 出口IP: ${result.exitIp}`);
      console.log(`⏱️  总延迟: ${result.latency}ms`);
      if (result.networkLatency) {
        console.log(`📊 到出口IP的PING延迟: ${result.networkLatency}ms`);
      }
      if (result.proxyResponseTime) {
        console.log(`🔗 代理响应时间: ${result.proxyResponseTime}ms`);
      }
    } else {
      console.log('💥 延迟测试失败');
      console.log(`❌ 错误: ${result.error}`);
      console.log(`🌐 目标: ${result.proxyHost}:${result.proxyPort}`);
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

    console.log('使用命令行参数进行延迟测试:');
    quickLatencyTest({
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
    console.log('  node test-proxy.js your-proxy-host.com 8080');
    console.log('  node test-proxy.js your-proxy-host.com 8080 http');
    console.log('  node test-proxy.js proxy.example.com 8080 http user pass');
    console.log('');
    console.log('环境变量配置:');
    console.log('  PROXY_HOST=your-proxy-host.com');
    console.log('  PROXY_PORT=8080');
    console.log('  PROXY_TYPE=http');
    console.log('  PROXY_USERNAME=user (可选)');
    console.log('  PROXY_PASSWORD=pass (可选)');
    console.log('');
    console.log('运行测试:');
    runTests();
  }
}

module.exports = {
  testProxy,
  quickLatencyTest,
  testProxyWithTimeout
};
