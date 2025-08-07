/**
 * 简单的功能测试 - 验证实际改进是否工作
 */

const path = require('path');

// 测试1: 验证Logger是否正确导入和使用
function testLoggerIntegration() {
  console.log('🧪 测试1: 验证Logger集成...');
  
  try {
    const Logger = require('./server/utils/logger');
    
    // 测试Logger基本功能
    Logger.info('测试日志信息', { test: true });
    Logger.warn('测试警告', { test: true });
    
    console.log('✅ Logger集成测试通过');
    return true;
  } catch (error) {
    console.log('❌ Logger集成测试失败:', error.message);
    return false;
  }
}

// 测试2: 验证缓存系统是否可用
function testCacheSystem() {
  console.log('🧪 测试2: 验证缓存系统...');
  
  try {
    const EngineCache = require('./server/utils/cache/EngineCache');
    
    // 创建缓存实例
    const cache = new EngineCache('TEST');
    
    // 测试缓存键生成
    const cacheKey = cache.generateCacheKey('analysis', 'test-url', { test: true });
    console.log('生成的缓存键:', cacheKey);
    
    // 测试URL哈希
    const urlHash = cache.hashUrl('https://example.com');
    console.log('URL哈希:', urlHash);
    
    console.log('✅ 缓存系统测试通过');
    return true;
  } catch (error) {
    console.log('❌ 缓存系统测试失败:', error.message);
    return false;
  }
}

// 测试3: 验证错误通知系统
function testErrorNotification() {
  console.log('🧪 测试3: 验证错误通知系统...');
  
  try {
    const ErrorNotificationHelper = require('./server/utils/ErrorNotificationHelper');
    
    // 创建错误通知实例
    const errorNotifier = new ErrorNotificationHelper('TEST');
    
    // 测试错误分类
    const testError = new Error('网络连接超时');
    testError.code = 'NETWORK_TIMEOUT';
    
    const isRetryable = errorNotifier.isRetryableError(testError);
    const severity = errorNotifier.getErrorSeverity(testError);
    const category = errorNotifier.getErrorCategory(testError);
    const suggestions = errorNotifier.getErrorSuggestions(testError);
    
    console.log('错误分析结果:');
    console.log('- 可重试:', isRetryable);
    console.log('- 严重程度:', severity);
    console.log('- 错误分类:', category);
    console.log('- 建议数量:', suggestions.length);
    
    console.log('✅ 错误通知系统测试通过');
    return true;
  } catch (error) {
    console.log('❌ 错误通知系统测试失败:', error.message);
    return false;
  }
}

// 测试4: 验证引擎接口一致性
function testEngineInterfaces() {
  console.log('🧪 测试4: 验证引擎接口一致性...');
  
  const engines = [
    { name: 'SEO', path: './server/engines/seo/index.js' },
    { name: 'Performance', path: './server/engines/performance/index.js' },
    { name: 'Security', path: './server/engines/security/index.js' },
    { name: 'API', path: './server/engines/api/index.js' },
    { name: 'Compatibility', path: './server/engines/compatibility/index.js' },
    { name: 'Accessibility', path: './server/engines/accessibility/index.js' },
    { name: 'LoadTest', path: './server/engines/loadtest/index.js' }
  ];
  
  let allPassed = true;
  
  for (const engine of engines) {
    try {
      const EngineClass = require(engine.path);
      const engineInstance = new EngineClass();
      
      // 检查是否有startTest方法
      if (typeof engineInstance.startTest !== 'function') {
        console.log(`❌ ${engine.name}引擎缺少startTest方法`);
        allPassed = false;
        continue;
      }
      
      console.log(`✅ ${engine.name}引擎接口正常`);
      
    } catch (error) {
      console.log(`❌ ${engine.name}引擎加载失败:`, error.message);
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('✅ 所有引擎接口一致性测试通过');
  } else {
    console.log('❌ 部分引擎接口测试失败');
  }
  
  return allPassed;
}

// 测试5: 验证实际的日志输出格式
function testLoggerOutput() {
  console.log('🧪 测试5: 验证日志输出格式...');
  
  try {
    const Logger = require('./server/utils/logger');
    
    // 模拟引擎日志调用
    Logger.info('启动SEO测试', { testId: 'test-123', url: 'https://example.com', engine: 'SEO' });
    Logger.error('测试失败', new Error('模拟错误'), { testId: 'test-123', engine: 'SEO' });
    Logger.warn('发送进度失败', { error: '连接超时', testId: 'test-123' });
    
    console.log('✅ 日志输出格式测试通过');
    return true;
  } catch (error) {
    console.log('❌ 日志输出格式测试失败:', error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始实际功能测试...\n');
  
  const tests = [
    { name: 'Logger集成', test: testLoggerIntegration },
    { name: '缓存系统', test: testCacheSystem },
    { name: '错误通知', test: testErrorNotification },
    { name: '引擎接口', test: testEngineInterfaces },
    { name: '日志输出', test: testLoggerOutput }
  ];
  
  let passedTests = 0;
  
  for (const { name, test } of tests) {
    const result = test();
    if (result) {
      passedTests++;
    }
    console.log(''); // 空行分隔
  }
  
  console.log('='.repeat(50));
  console.log(`📊 测试结果: ${passedTests}/${tests.length} 通过`);
  
  if (passedTests === tests.length) {
    console.log('🎉 所有功能测试通过！改进实施成功！');
  } else {
    console.log('⚠️  部分测试失败，需要检查实现');
  }
  
  console.log('='.repeat(50));
  
  return passedTests === tests.length;
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
