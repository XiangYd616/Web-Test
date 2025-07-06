/**
 * 测试API健康状态
 */

const http = require('http');

function testHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3001/health', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('✅ 健康检查响应:', res.statusCode);
        console.log('📄 响应内容:', data);
        resolve({ status: res.statusCode, data: data });
      });
    });

    req.on('error', (error) => {
      console.error('❌ 健康检查失败:', error.message);
      reject(error);
    });

    req.setTimeout(5000, () => {
      console.error('⏰ 健康检查超时');
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function testAPI() {
  console.log('🏥 测试API健康状态...');
  
  try {
    await testHealth();
    console.log('🎉 API服务器正常运行！');
  } catch (error) {
    console.error('❌ API服务器无法访问:', error.message);
  }
}

testAPI();
