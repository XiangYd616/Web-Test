/**
 * WebSocket服务测试脚本
 */

const http = require('http');


try {
  // 创建简单的HTTP服务器
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket Test Server');
  });

  // 尝试加载WebSocket服务
  const webSocketService = require('../backend/services/websocketService');
  console.log('✅ WebSocket服务加载成功');

  // 启动服务器
  server.listen(3002, () => {
    console.log('✅ 测试服务器运行在端口 3002');

    // 初始化WebSocket服务
    try {
      webSocketService.initialize(server);
      console.log('✅ WebSocket服务初始化成功');

      // 启动心跳检测
      webSocketService.startHeartbeat();
      console.log('✅ 心跳检测已启动');

      // 获取统计信息
      const stats = webSocketService.getStats();
      console.log('📊 WebSocket统计:', stats);

      
      // 5秒后关闭
      setTimeout(() => {
        webSocketService.close();
        server.close();
        process.exit(0);
      }, 5000);

    } catch (initError) {
      console.error('❌ WebSocket服务初始化失败:', initError.message);
      server.close();
      process.exit(1);
    }
  });

  server.on('error', (error) => {
    console.error('❌ 服务器错误:', error.message);
    process.exit(1);
  });

} catch (error) {
  console.error('❌ WebSocket服务测试失败:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
