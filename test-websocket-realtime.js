/**
 * 测试WebSocket实时数据接收
 */

import { io } from 'socket.io-client';

// 连接到WebSocket服务器
const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],
  timeout: 20000,
});

let dataPointCount = 0;
let metricsCount = 0;

socket.on('connect', () => {
  console.log('🔌 WebSocket连接成功');

  // 启动一个压力测试
  startStressTest();
});

socket.on('disconnect', () => {
  console.log('🔌 WebSocket连接断开');
});

socket.on('stress-test-data', (data) => {
  dataPointCount++;
  if (data.metrics) metricsCount++;

  console.log(`📊 收到实时数据 #${dataPointCount}:`, {
    testId: data.testId,
    hasDataPoint: !!data.dataPoint,
    hasMetrics: !!data.metrics,
    timestamp: new Date(data.timestamp).toLocaleTimeString(),
    rawDataStructure: Object.keys(data)
  });

  if (data.dataPoint) {
    console.log(`  📈 数据点详情:`, {
      responseTime: data.dataPoint.responseTime,
      activeUsers: data.dataPoint.activeUsers,
      throughput: data.dataPoint.throughput,
      errorRate: data.dataPoint.errorRate,
      timestamp: data.dataPoint.timestamp,
      success: data.dataPoint.success,
      phase: data.dataPoint.phase,
      allFields: Object.keys(data.dataPoint)
    });
  }

  if (data.metrics) {
    console.log(`  📊 指标详情:`, {
      totalRequests: data.metrics.totalRequests,
      currentTPS: data.metrics.currentTPS,
      errorRate: data.metrics.errorRate,
      allFields: Object.keys(data.metrics)
    });
  }
});

socket.on('stress-test-status', (data) => {
  console.log(`📈 状态更新: progress=${data.progress}%`);
});

socket.on('stress-test-complete', (data) => {
  console.log(`🏁 测试完成! 总共收到 ${dataPointCount} 个数据点, ${metricsCount} 个指标更新`);
  process.exit(0);
});

async function startStressTest() {
  try {
    console.log('🚀 启动压力测试...');

    const response = await fetch('http://localhost:3001/api/test/stress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://httpbin.org/delay/1',
        options: {
          users: 2,
          duration: 15,
          rampUpTime: 2,
          testType: 'gradual',
          method: 'GET',
          timeout: 10,
          thinkTime: 1
        }
      })
    });

    const data = await response.json();

    if (data.success && data.data.testId) {
      console.log(`✅ 测试启动成功, ID: ${data.data.testId}`);

      // 加入WebSocket房间
      socket.emit('join-stress-test', data.data.testId);
      console.log(`🏠 已加入房间: stress-test-${data.data.testId}`);
    } else {
      console.error('❌ 测试启动失败:', data.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 启动测试时出错:', error.message);
    process.exit(1);
  }
}

// 30秒后强制退出
setTimeout(() => {
  console.log(`⏰ 测试超时，总共收到 ${dataPointCount} 个数据点, ${metricsCount} 个指标更新`);
  process.exit(0);
}, 30000);
