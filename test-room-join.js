/**
 * 测试WebSocket房间加入问题
 * 专门验证客户端是否能正确加入房间
 */

const { io } = require('socket.io-client');

console.log('🔍 开始测试WebSocket房间加入...');

// 连接到WebSocket服务器
const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],
  timeout: 20000,
});

let testId = null;
let roomJoined = false;

socket.on('connect', () => {
  console.log('✅ WebSocket连接成功');
  console.log('🔌 Socket ID:', socket.id);
  
  // 立即测试房间加入
  testRoomJoin();
});

socket.on('disconnect', () => {
  console.log('❌ WebSocket连接断开');
});

// 监听房间加入确认
socket.on('room-joined', (data) => {
  roomJoined = true;
  console.log('🏠 房间加入确认收到:', {
    testId: data.testId,
    roomName: data.roomName,
    clientId: data.clientId,
    timestamp: new Date(data.timestamp).toLocaleTimeString()
  });
  
  // 验证房间加入成功后，启动压力测试
  if (data.testId === testId) {
    console.log('✅ 房间加入成功，testId匹配');
    startStressTestAfterRoomJoin();
  } else {
    console.warn('⚠️ 房间加入确认的testId不匹配:', {
      expected: testId,
      received: data.testId
    });
  }
});

// 监听测试ping响应
socket.on('test-pong', (data) => {
  console.log('🏓 收到测试pong响应:', data);
});

// 监听实时数据
socket.on('stress-test-data', (data) => {
  console.log('📊 收到实时数据:', {
    testId: data.testId,
    hasDataPoint: !!data.dataPoint,
    hasMetrics: !!data.metrics,
    timestamp: new Date(data.timestamp).toLocaleTimeString()
  });
});

async function testRoomJoin() {
  try {
    // 生成一个测试ID
    testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🎯 生成测试ID:', testId);
    
    // 尝试加入房间
    console.log('🏠 尝试加入房间...');
    socket.emit('join-stress-test', testId);
    console.log('📤 已发送join-stress-test事件:', testId);
    
    // 等待房间加入确认
    setTimeout(() => {
      if (!roomJoined) {
        console.error('❌ 5秒内没有收到房间加入确认');
        console.log('可能的问题：');
        console.log('1. 后端没有正确处理join-stress-test事件');
        console.log('2. room-joined事件没有正确发送');
        console.log('3. 网络连接问题');
        
        // 尝试发送测试ping
        console.log('🔍 尝试发送测试ping...');
        socket.emit('test-ping', {
          testId: testId,
          message: 'Testing connection without room join',
          timestamp: Date.now()
        });
      } else {
        console.log('✅ 房间加入确认已收到');
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ 测试房间加入失败:', error);
  }
}

async function startStressTestAfterRoomJoin() {
  try {
    console.log('\n🚀 房间加入成功，现在启动压力测试...');
    
    const response = await fetch('http://localhost:3001/api/test/stress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://httpbin.org/delay/0.5',
        options: {
          users: 2,
          duration: 10,
          rampUpTime: 2,
          testType: 'gradual',
          method: 'GET',
          timeout: 10,
          thinkTime: 0.5
        }
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.data.testId) {
      const realTestId = data.data.testId;
      console.log('✅ 压力测试启动成功');
      console.log('  真实测试ID:', realTestId);
      console.log('  预设测试ID:', testId);
      
      // 如果测试ID不同，需要重新加入房间
      if (realTestId !== testId) {
        console.log('🔄 测试ID不同，重新加入房间...');
        testId = realTestId;
        roomJoined = false;
        
        socket.emit('join-stress-test', realTestId);
        console.log('📤 已发送新的join-stress-test事件:', realTestId);
        
        // 等待新的房间加入确认
        setTimeout(() => {
          if (!roomJoined) {
            console.error('❌ 重新加入房间失败');
          } else {
            console.log('✅ 重新加入房间成功');
          }
        }, 3000);
      }
      
      // 设置数据接收检查
      setTimeout(() => {
        console.log('\n📊 检查是否收到实时数据...');
        // 这里应该会有实时数据，如果没有说明房间加入有问题
      }, 8000);
      
    } else {
      console.error('❌ 压力测试启动失败:', data.message);
    }
  } catch (error) {
    console.error('❌ 启动压力测试时出错:', error.message);
  }
}

// 15秒后退出
setTimeout(() => {
  console.log('\n📋 测试总结:');
  console.log('  房间加入状态:', roomJoined ? '✅ 成功' : '❌ 失败');
  console.log('  测试ID:', testId || '未设置');
  
  if (roomJoined) {
    console.log('✅ WebSocket房间加入功能正常');
  } else {
    console.log('❌ WebSocket房间加入功能存在问题');
    console.log('\n🔧 建议检查:');
    console.log('1. 后端WebSocket事件处理器是否正确注册');
    console.log('2. join-stress-test事件处理逻辑');
    console.log('3. room-joined事件发送逻辑');
  }
  
  process.exit(0);
}, 15000);

// 处理程序退出
process.on('SIGINT', () => {
  console.log('\n\n📊 测试中断');
  console.log('  房间加入状态:', roomJoined ? '✅ 成功' : '❌ 失败');
  console.log('  测试ID:', testId || '未设置');
  process.exit(0);
});
