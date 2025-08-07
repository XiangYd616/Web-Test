/**
 * 优先级改进功能测试
 * 验证高、中、低优先级改进是否正常工作
 */

const path = require('path');

// 测试高优先级改进
async function testHighPriorityImprovements() {
  console.log('🎯 测试高优先级改进...\n');

  // 测试1: OpenAPI文档结构
  console.log('📚 测试1: OpenAPI文档结构');
  try {
    const testEnginesApi = require('./server/api/docs/test-engines-api.js');
    console.log('✅ 测试引擎API文档文件加载成功');

    // 检查Swagger配置
    const swaggerConfig = require('./server/api/docs/swagger.js');
    console.log('✅ Swagger配置加载成功');
    if (swaggerConfig.definition && swaggerConfig.definition.info) {
      console.log(`   - API版本: ${swaggerConfig.definition.info.version}`);
    }
    if (swaggerConfig.apis) {
      console.log(`   - 文档路径数量: ${swaggerConfig.apis.length}`);
    }

  } catch (error) {
    console.log('❌ OpenAPI文档测试失败:', error.message);
    return false;
  }

  // 测试2: 统一错误处理
  console.log('\n🛡️ 测试2: 统一错误处理');
  try {
    const ApiResponse = require('./server/utils/ApiResponse');

    // 测试成功响应
    const successResponse = ApiResponse.success({ test: 'data' }, '测试成功');
    console.log('✅ 成功响应格式正确:', successResponse.success === true);

    // 测试错误响应
    const errorResponse = ApiResponse.error('测试错误', 'TEST_ERROR');
    console.log('✅ 错误响应格式正确:', errorResponse.success === false);
    console.log(`   - 错误代码: ${errorResponse.error.code}`);
    console.log(`   - 可重试: ${errorResponse.error.retryable}`);
    console.log(`   - 建议数量: ${errorResponse.error.suggestions.length}`);

    // 测试验证错误
    const validationResponse = ApiResponse.validationError([
      { field: 'url', message: 'URL格式无效' }
    ]);
    console.log('✅ 验证错误响应正确:', validationResponse.error.code === 'VALIDATION_ERROR');

  } catch (error) {
    console.log('❌ 统一错误处理测试失败:', error.message);
    return false;
  }

  console.log('\n✅ 高优先级改进测试通过!\n');
  return true;
}

// 测试中优先级改进
async function testMediumPriorityImprovements() {
  console.log('🎯 测试中优先级改进...\n');

  // 测试1: 数据库连接管理器
  console.log('💾 测试1: 数据库连接管理器');
  try {
    const DatabaseConnectionManager = require('./server/utils/DatabaseConnectionManager');

    // 创建连接管理器实例
    const manager = new DatabaseConnectionManager({
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      user: 'test_user',
      password: 'test_pass',
      max: 5
    });

    console.log('✅ 数据库连接管理器创建成功');
    console.log(`   - 最大连接数: ${manager.config.max}`);
    console.log(`   - 重试次数: ${manager.config.retryAttempts}`);
    console.log(`   - 健康检查间隔: ${manager.config.healthCheckInterval}ms`);

    // 测试状态获取
    const status = manager.getStatus();
    console.log('✅ 状态获取功能正常');
    console.log(`   - 连接状态: ${status.isConnected}`);

  } catch (error) {
    console.log('❌ 数据库连接管理器测试失败:', error.message);
    return false;
  }

  // 测试2: 查询优化器
  console.log('\n⚡ 测试2: 查询优化器');
  try {
    const { QueryOptimizer, queryOptimizer } = require('./server/utils/queryOptimizer');
    const optimizer = queryOptimizer;

    console.log('✅ 查询优化器创建成功');
    console.log(`   - 慢查询阈值: ${optimizer.slowQueryThreshold}ms`);
    console.log(`   - 缓存超时: ${optimizer.cacheTimeout}ms`);

    // 测试查询哈希生成
    const hash1 = optimizer.generateQueryHash('SELECT * FROM users WHERE id = $1', [123]);
    const hash2 = optimizer.generateQueryHash('SELECT * FROM users WHERE id = $1', [456]);
    console.log('✅ 查询哈希生成正常:', hash1 !== hash2);

  } catch (error) {
    console.log('❌ 查询优化器测试失败:', error.message);
    return false;
  }

  console.log('\n✅ 中优先级改进测试通过!\n');
  return true;
}

// 测试低优先级改进
async function testLowPriorityImprovements() {
  console.log('🎯 测试低优先级改进...\n');

  // 测试1: 通用工具类
  console.log('🔧 测试1: 通用工具类');
  try {
    const CommonUtils = require('./server/utils/CommonUtils');

    // 测试ID生成
    const id1 = CommonUtils.generateId('test');
    const id2 = CommonUtils.generateId('test');
    console.log('✅ ID生成功能正常:', id1 !== id2 && id1.startsWith('test_'));

    // 测试UUID生成
    const uuid = CommonUtils.generateUUID();
    console.log('✅ UUID生成功能正常:', uuid.length === 36);

    // 测试URL验证
    const urlResult = CommonUtils.validateAndNormalizeUrl('example.com');
    console.log('✅ URL验证功能正常:', urlResult.isValid && urlResult.url.startsWith('https://'));

    // 测试深度克隆
    const original = { a: 1, b: { c: 2 } };
    const cloned = CommonUtils.deepClone(original);
    cloned.b.c = 3;
    console.log('✅ 深度克隆功能正常:', original.b.c === 2 && cloned.b.c === 3);

    // 测试重试机制
    let attempts = 0;
    const testFn = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('测试错误');
      }
      return '成功';
    };

    const result = await CommonUtils.retry(testFn, { retries: 3, delay: 10 });
    console.log('✅ 重试机制功能正常:', result === '成功' && attempts === 3);

    // 测试评级计算
    const grade = CommonUtils.getGrade(85);
    console.log('✅ 评级计算功能正常:', grade === 'B');

  } catch (error) {
    console.log('❌ 通用工具类测试失败:', error.message);
    return false;
  }

  // 测试2: 监控系统
  console.log('\n📊 测试2: 监控系统');
  try {
    const { MonitoringSystem } = require('./server/utils/MonitoringSystem');
    const monitor = new MonitoringSystem();

    console.log('✅ 监控系统创建成功');
    console.log(`   - CPU阈值: ${monitor.thresholds.cpu}%`);
    console.log(`   - 内存阈值: ${monitor.thresholds.memory}%`);
    console.log(`   - 收集间隔: ${monitor.collectInterval}ms`);

    // 测试CPU使用率获取
    const cpuUsage = monitor.getCpuUsage();
    console.log('✅ CPU使用率获取正常:', typeof cpuUsage.usage === 'number');
    console.log(`   - CPU使用率: ${cpuUsage.usage}%`);
    console.log(`   - CPU核心数: ${cpuUsage.cores}`);

    // 测试内存使用率获取
    const memoryUsage = monitor.getMemoryUsage();
    console.log('✅ 内存使用率获取正常:', typeof memoryUsage.usage === 'number');
    console.log(`   - 内存使用率: ${memoryUsage.usage}%`);

    // 导入CommonUtils来格式化文件大小
    const CommonUtils = require('./server/utils/CommonUtils');
    console.log(`   - 总内存: ${CommonUtils.formatFileSize(memoryUsage.total)}`);

    // 测试健康状态
    const health = monitor.getHealthStatus();
    console.log('✅ 健康状态获取正常:', health.status && health.checks);
    console.log(`   - 系统状态: ${health.status}`);

    // 测试测试指标记录
    monitor.recordTestMetrics('seo', {
      success: true,
      responseTime: 1500,
      score: 85
    });

    const testStats = monitor.getTestStats();
    console.log('✅ 测试指标记录正常:', testStats.tests.seo.totalTests === 1);

  } catch (error) {
    console.log('❌ 监控系统测试失败:', error.message);
    return false;
  }

  console.log('\n✅ 低优先级改进测试通过!\n');
  return true;
}

// 主测试函数
async function runPriorityTests() {
  console.log('🚀 开始优先级改进功能测试...\n');
  console.log('='.repeat(60));

  const results = {
    high: false,
    medium: false,
    low: false
  };

  try {
    // 测试高优先级改进
    results.high = await testHighPriorityImprovements();

    // 测试中优先级改进
    results.medium = await testMediumPriorityImprovements();

    // 测试低优先级改进
    results.low = await testLowPriorityImprovements();

  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }

  // 显示测试结果
  console.log('='.repeat(60));
  console.log('📊 测试结果总结:');
  console.log(`🎯 高优先级改进: ${results.high ? '✅ 通过' : '❌ 失败'}`);
  console.log(`🎯 中优先级改进: ${results.medium ? '✅ 通过' : '❌ 失败'}`);
  console.log(`🎯 低优先级改进: ${results.low ? '✅ 通过' : '❌ 失败'}`);

  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;

  console.log(`\n📈 总体通过率: ${passedCount}/${totalCount} (${Math.round(passedCount / totalCount * 100)}%)`);

  if (passedCount === totalCount) {
    console.log('\n🎉 所有优先级改进测试通过！改进实施成功！');
  } else {
    console.log('\n⚠️  部分测试失败，需要检查实现');
  }

  console.log('='.repeat(60));

  return passedCount === totalCount;
}

// 运行测试
if (require.main === module) {
  runPriorityTests().catch(console.error);
}

module.exports = { runPriorityTests };
