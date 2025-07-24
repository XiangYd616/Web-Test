/**
 * WebSocket数据流调试脚本
 * 用于验证压力测试的实时数据传输
 */

const { io } = require('socket.io-client');

// 连接到WebSocket服务器
const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],
  timeout: 20000,
});

let dataPointCount = 0;
let metricsCount = 0;
let testId = null;

console.log('🔍 WebSocket数据流调试工具启动...');

socket.on('connect', () => {
  console.log('✅ WebSocket连接成功');
  console.log('🔌 Socket ID:', socket.id);
  
  // 启动压力测试
  startStressTest();
});

socket.on('disconnect', () => {
  console.log('❌ WebSocket连接断开');
});

// 监听房间加入确认
socket.on('room-joined', (data) => {
  console.log('🏠 房间加入确认:', data);
});

// 监听实时数据
socket.on('stress-test-data', (data) => {
  dataPointCount++;
  if (data.metrics) metricsCount++;

  console.log(`\n📊 收到实时数据 #${dataPointCount}:`);
  console.log('  测试ID:', data.testId);
  console.log('  时间戳:', new Date(data.timestamp).toLocaleTimeString());
  console.log('  包含数据点:', !!data.dataPoint);
  console.log('  包含指标:', !!data.metrics);

  if (data.dataPoint) {
    console.log('  📈 数据点详情:');
    console.log('    响应时间:', data.dataPoint.responseTime, 'ms');
    console.log('    活跃用户:', data.dataPoint.activeUsers);
    console.log('    吞吐量:', data.dataPoint.throughput);
    console.log('    错误率:', data.dataPoint.errorRate, '%');
    console.log('    成功状态:', data.dataPoint.success);
    console.log('    测试阶段:', data.dataPoint.phase);
  }

  if (data.metrics) {
    console.log('  📊 指标详情:');
    console.log('    总请求数:', data.metrics.totalRequests);
    console.log('    成功请求:', data.metrics.successfulRequests);
    console.log('    失败请求:', data.metrics.failedRequests);
    console.log('    平均响应时间:', data.metrics.averageResponseTime, 'ms');
    console.log('    当前TPS:', data.metrics.currentTPS);
    console.log('    峰值TPS:', data.metrics.peakTPS);
    console.log('    错误率:', data.metrics.errorRate, '%');
  }
});

// 监听状态更新
socket.on('stress-test-status', (data) => {
  console.log(`\n📈 状态更新:`);
  console.log('  测试ID:', data.testId);
  console.log('  状态:', data.status);
  console.log('  进度:', data.progress, '%');
  console.log('  消息:', data.message);
});

// 监听测试完成
socket.on('stress-test-complete', (data) => {
  console.log(`\n🏁 测试完成!`);
  console.log('  测试ID:', data.testId);
  console.log('  总数据点:', dataPointCount);
  console.log('  总指标更新:', metricsCount);
  
  if (data.results) {
    console.log('  最终结果:');
    console.log('    总请求数:', data.results.totalRequests);
    console.log('    成功率:', data.results.successRate, '%');
    console.log('    平均响应时间:', data.results.averageResponseTime, 'ms');
  }
  
  // 等待2秒后退出
  setTimeout(() => {
    console.log('\n✅ 调试完成，退出程序');
    process.exit(0);
  }, 2000);
});

async function startStressTest() {
  try {
    console.log('\n🚀 启动压力测试...');

    const response = await fetch('http://localhost:3001/api/test/stress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://httpbin.org/delay/1',
        options: {
          users: 3,
          duration: 20,
          rampUpTime: 3,
          testType: 'gradual',
          method: 'GET',
          timeout: 10,
          thinkTime: 1
        }
      })
    });

    const data = await response.json();

    if (data.success && data.data.testId) {
      testId = data.data.testId;
      console.log('✅ 测试启动成功');
      console.log('  测试ID:', testId);

      // 加入WebSocket房间
      socket.emit('join-stress-test', testId);
      console.log('🏠 已发送加入房间请求:', `stress-test-${testId}`);
      
      // 设置超时检查
      setTimeout(() => {
        if (dataPointCount === 0) {
          console.log('\n⚠️  警告：30秒内没有收到任何数据点');
          console.log('可能的问题：');
          console.log('1. WebSocket房间加入失败');
          console.log('2. 后端没有广播数据');
          console.log('3. 测试引擎没有生成数据');
          
          // 尝试API查询
          checkTestStatusViaAPI();
        }
      }, 30000);
      
    } else {
      console.error('❌ 测试启动失败:', data.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 启动测试时出错:', error.message);
    process.exit(1);
  }
}

async function checkTestStatusViaAPI() {
  if (!testId) return;
  
  try {
    console.log('\n🔍 通过API检查测试状态...');
    const response = await fetch(`http://localhost:3001/api/test/stress/status/${testId}`);
    const data = await response.json();
    
    console.log('API响应:', {
      success: data.success,
      hasData: !!data.data,
      hasRealTimeData: !!(data.data && data.data.realTimeData),
      realTimeDataLength: data.data?.realTimeData?.length || 0,
      hasMetrics: !!(data.data && data.data.metrics),
      status: data.data?.status
    });
    
    if (data.success && data.data) {
      if (data.data.realTimeData && data.data.realTimeData.length > 0) {
        console.log('✅ API中有实时数据，但WebSocket没有收到');
        console.log('  实时数据点数量:', data.data.realTimeData.length);
        console.log('  最新数据点:', data.data.realTimeData[data.data.realTimeData.length - 1]);
      } else {
        console.log('❌ API中也没有实时数据');
      }
    }
  } catch (error) {
    console.error('❌ API查询失败:', error.message);
  }
}

// 60秒后强制退出
setTimeout(() => {
  console.log(`\n⏰ 调试超时，总共收到 ${dataPointCount} 个数据点, ${metricsCount} 个指标更新`);
  process.exit(0);
}, 60000);

// 处理程序退出
process.on('SIGINT', () => {
  console.log(`\n\n📊 调试统计:`);
  console.log(`  数据点总数: ${dataPointCount}`);
  console.log(`  指标更新总数: ${metricsCount}`);
  console.log(`  测试ID: ${testId || '未设置'}`);
  process.exit(0);
});
