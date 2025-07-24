/**
 * 真实压力测试验证脚本
 * 测试完整的压力测试流程和实时数据传输
 */

const { io } = require('socket.io-client');

let testId = null;
let dataPointCount = 0;
let metricsCount = 0;
let statusUpdateCount = 0;

console.log('🚀 启动真实压力测试验证...');

// 连接到WebSocket服务器
const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],
  timeout: 20000,
});

socket.on('connect', () => {
  console.log('✅ WebSocket连接成功, Socket ID:', socket.id);
  startStressTest();
});

socket.on('disconnect', () => {
  console.log('❌ WebSocket连接断开');
});

// 监听房间加入确认
socket.on('room-joined', (data) => {
  console.log('🏠 房间加入确认:', {
    testId: data.testId,
    roomName: data.roomName,
    clientId: data.clientId,
    timestamp: new Date(data.timestamp).toLocaleTimeString()
  });
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
    console.log('    状态码:', data.dataPoint.status);
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
    console.log('    活跃用户:', data.metrics.activeUsers);
  }

  console.log('  进度:', data.progress, '%');
  console.log('  阶段:', data.phase);
});

// 监听状态更新
socket.on('stress-test-status', (data) => {
  statusUpdateCount++;
  console.log(`\n📈 状态更新 #${statusUpdateCount}:`);
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
  console.log('  总状态更新:', statusUpdateCount);
  
  if (data.results) {
    console.log('  最终结果:');
    console.log('    总请求数:', data.results.metrics?.totalRequests);
    console.log('    成功率:', ((data.results.metrics?.successfulRequests / data.results.metrics?.totalRequests) * 100).toFixed(2), '%');
    console.log('    平均响应时间:', data.results.metrics?.averageResponseTime, 'ms');
    console.log('    实时数据点数量:', data.results.realTimeData?.length);
  }
  
  // 等待2秒后退出
  setTimeout(() => {
    console.log('\n✅ 验证完成，退出程序');
    process.exit(0);
  }, 2000);
});

async function startStressTest() {
  try {
    console.log('\n🚀 启动真实压力测试...');

    const testConfig = {
      url: 'https://httpbin.org/delay/0.5', // 使用较短延迟的测试URL
      options: {
        users: 3,           // 较少用户数便于观察
        duration: 15,       // 15秒测试
        rampUpTime: 3,      // 3秒启动时间
        testType: 'gradual',
        method: 'GET',
        timeout: 10,
        thinkTime: 0.5      // 较短思考时间，增加请求频率
      }
    };

    console.log('📋 测试配置:', testConfig);

    const response = await fetch('http://localhost:3001/api/test/stress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testConfig)
    });

    const data = await response.json();

    if (data.success && data.data.testId) {
      testId = data.data.testId;
      console.log('✅ 测试启动成功');
      console.log('  测试ID:', testId);
      console.log('  预期持续时间:', testConfig.options.duration, '秒');

      // 加入WebSocket房间
      socket.emit('join-stress-test', testId);
      console.log('🏠 已发送加入房间请求:', `stress-test-${testId}`);
      
      // 设置数据接收检查
      setTimeout(() => {
        if (dataPointCount === 0) {
          console.log('\n⚠️  警告：10秒内没有收到任何数据点');
          console.log('可能的问题：');
          console.log('1. WebSocket房间加入失败');
          console.log('2. 后端没有广播数据');
          console.log('3. 测试引擎没有生成数据');
          
          // 尝试API查询
          checkTestStatusViaAPI();
        } else {
          console.log(`✅ 已收到 ${dataPointCount} 个数据点，实时监控正常工作`);
        }
      }, 10000);
      
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
      status: data.data?.status,
      progress: data.data?.progress
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

// 30秒后强制退出
setTimeout(() => {
  console.log(`\n⏰ 验证超时，总共收到 ${dataPointCount} 个数据点, ${metricsCount} 个指标更新`);
  
  if (dataPointCount > 0) {
    console.log('✅ 实时监控功能正常工作');
  } else {
    console.log('❌ 实时监控功能存在问题');
  }
  
  process.exit(0);
}, 30000);

// 处理程序退出
process.on('SIGINT', () => {
  console.log(`\n\n📊 验证统计:`);
  console.log(`  数据点总数: ${dataPointCount}`);
  console.log(`  指标更新总数: ${metricsCount}`);
  console.log(`  状态更新总数: ${statusUpdateCount}`);
  console.log(`  测试ID: ${testId || '未设置'}`);
  
  if (dataPointCount > 0) {
    console.log('✅ 实时监控功能验证成功');
  } else {
    console.log('❌ 实时监控功能验证失败');
  }
  
  process.exit(0);
});
