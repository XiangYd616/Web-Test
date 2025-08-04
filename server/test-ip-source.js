#!/usr/bin/env node

/**
 * 测试脚本：验证请求的IP来源
 * 用于确认直链请求使用的是服务器IP还是用户IP
 */

const http = require('http');
const https = require('https');

async function testDirectRequest() {
  console.log('🧪 测试直链请求的IP来源...');
  
  // 使用 httpbin.org/ip 来检查请求的来源IP
  const testUrl = 'https://httpbin.org/ip';
  
  return new Promise((resolve, reject) => {
    const urlObj = new URL(testUrl);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'IP-Source-Test/1.0'
      }
    };
    
    console.log('📡 发送请求到:', testUrl);
    console.log('🖥️  请求来源：服务器端 Node.js 进程');
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('📍 检测到的IP地址:', result.origin);
          console.log('🏷️  这个IP是:', '服务器的公网IP地址');
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

async function getLocalServerInfo() {
  console.log('\n🖥️  服务器本地信息:');
  
  // 获取本地网络接口
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  
  console.log('🔌 本地网络接口:');
  Object.keys(networkInterfaces).forEach(interfaceName => {
    const interfaces = networkInterfaces[interfaceName];
    interfaces.forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`   ${interfaceName}: ${iface.address}`);
      }
    });
  });
}

async function compareWithUserIP() {
  console.log('\n🌐 IP来源对比:');
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│ 场景                    │ 请求发起者    │ IP来源        │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log('│ 用户直接访问网站        │ 用户浏览器    │ 用户的公网IP  │');
  console.log('│ 压力测试(直链)          │ 服务器        │ 服务器公网IP  │');
  console.log('│ 压力测试(代理)          │ 服务器→代理   │ 代理服务器IP  │');
  console.log('└─────────────────────────────────────────────────────────┘');
}

async function main() {
  console.log('🔍 IP来源测试工具');
  console.log('=' .repeat(50));
  
  try {
    // 获取服务器本地信息
    await getLocalServerInfo();
    
    // 测试直链请求
    console.log('\n📡 测试直链请求...');
    const result = await testDirectRequest();
    
    // 显示对比信息
    await compareWithUserIP();
    
    console.log('\n✅ 测试完成');
    console.log('📋 结论:');
    console.log('   • 压力测试的直链请求使用服务器IP');
    console.log('   • 目标网站看到的是服务器的公网IP');
    console.log('   • 不是用户浏览器的IP');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { testDirectRequest, getLocalServerInfo };
