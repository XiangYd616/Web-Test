/**
 * 测试引擎状态检查脚本
 * 验证API路径修复是否有效
 */

async function testEngineStatus() {
  console.log('🔍 测试引擎状态检查...');
  
  const engines = ['k6', 'lighthouse', 'playwright'];
  const results = {};
  
  for (const engine of engines) {
    try {
      console.log(`\n📊 检查 ${engine} 引擎状态...`);
      
      const response = await fetch(`http://localhost:3001/api/test/${engine}/status`);
      
      console.log(`  状态码: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ 响应成功:`, {
          success: data.success,
          available: data.data?.available,
          status: data.data?.status,
          version: data.data?.version,
          error: data.data?.error
        });
        results[engine] = {
          status: 'ok',
          available: data.data?.available || false,
          version: data.data?.version || 'unknown'
        };
      } else {
        console.log(`  ❌ 响应失败: ${response.status} ${response.statusText}`);
        results[engine] = {
          status: 'error',
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      console.log(`  ❌ 请求失败: ${error.message}`);
      results[engine] = {
        status: 'error',
        error: error.message
      };
    }
  }
  
  console.log('\n📋 总结:');
  console.log('='.repeat(50));
  
  for (const [engine, result] of Object.entries(results)) {
    if (result.status === 'ok') {
      console.log(`✅ ${engine}: ${result.available ? '可用' : '不可用'} (${result.version})`);
    } else {
      console.log(`❌ ${engine}: 错误 - ${result.error}`);
    }
  }
  
  // 检查所有引擎状态
  console.log('\n🔍 检查所有引擎状态API...');
  try {
    const response = await fetch('http://localhost:3001/api/test/status');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 所有引擎状态API正常:', data.success);
      if (data.data) {
        Object.entries(data.data).forEach(([engine, status]) => {
          console.log(`  ${engine}: ${status.available ? '✅' : '❌'} ${status.status}`);
        });
      }
    } else {
      console.log(`❌ 所有引擎状态API失败: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ 所有引擎状态API请求失败: ${error.message}`);
  }
}

// 运行测试
testEngineStatus().catch(console.error);
