#!/usr/bin/env node

/**
 * 前端开发服务器状态检查脚本
 */

import http from 'http';

async function checkFrontendStatus() {
  console.log('🔍 检查前端开发服务器状态...');
  
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5174,
      path: '/',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      console.log(`✅ 前端服务器响应状态: ${res.statusCode}`);
      console.log(`📋 响应头:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('🎉 前端服务器运行正常！');
          console.log(`📄 页面标题包含: ${data.includes('<title>') ? '✅ title标签' : '❌ 无title标签'}`);
          console.log(`⚛️  React根元素: ${data.includes('id="root"') ? '✅ 找到根元素' : '❌ 未找到根元素'}`);
          resolve(true);
        } else {
          console.log(`❌ 服务器返回状态码: ${res.statusCode}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ 无法连接到前端服务器:', err.message);
      console.log('💡 请确保运行了 yarn dev 命令');
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('⏰ 连接超时');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// 运行检查
checkFrontendStatus().then((success) => {
  process.exit(success ? 0 : 1);
});
