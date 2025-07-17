/**
 * 性能测试API端点验证脚本
 * 验证所有新增的性能测试API是否正常工作
 */

import axios from 'axios';

// 配置
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_URL = 'https://www.example.com';

// 测试结果收集
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * 执行API测试
 */
async function testAPI(endpoint, method = 'POST', data = {}) {
  try {
    console.log(`🧪 Testing ${method} ${endpoint}...`);

    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await axios(config);

    if (response.status === 200 && response.data.success !== false) {
      console.log(`✅ ${endpoint} - PASSED`);
      testResults.passed++;
      return { success: true, data: response.data };
    } else {
      console.log(`❌ ${endpoint} - FAILED: ${response.data.message || 'Unknown error'}`);
      testResults.failed++;
      testResults.errors.push(`${endpoint}: ${response.data.message || 'Unknown error'}`);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    console.log(`❌ ${endpoint} - ERROR: ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`${endpoint}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 测试性能测试主接口
 */
async function testPerformanceMain() {
  return await testAPI('/api/test/performance', 'POST', {
    url: TEST_URL,
    config: {
      level: 'standard',
      device: 'desktop',
      pageSpeed: true,
      coreWebVitals: true,
      resourceOptimization: true
    }
  });
}

/**
 * 测试页面速度检测
 */
async function testPageSpeed() {
  return await testAPI('/api/test/performance/page-speed', 'POST', {
    url: TEST_URL,
    device: 'desktop',
    timeout: 30000
  });
}

/**
 * 测试Core Web Vitals检测
 */
async function testCoreWebVitals() {
  return await testAPI('/api/test/performance/core-web-vitals', 'POST', {
    url: TEST_URL,
    device: 'desktop'
  });
}

/**
 * 测试资源分析
 */
async function testResourceAnalysis() {
  return await testAPI('/api/test/performance/resources', 'POST', {
    url: TEST_URL,
    includeImages: true
  });
}

/**
 * 测试保存性能测试结果
 */
async function testSaveResults() {
  const mockResult = {
    testId: `test_${Date.now()}`,
    url: TEST_URL,
    timestamp: Date.now(),
    overallScore: 85,
    grade: 'B',
    config: { level: 'standard' },
    pageSpeed: { loadTime: 2000 },
    coreWebVitals: { lcp: 2500, fid: 100, cls: 0.1 },
    duration: 30000
  };

  return await testAPI('/api/test/performance/save', 'POST', {
    result: mockResult,
    userId: 'test-user'
  });
}

/**
 * 测试SEO统一路由
 */
async function testSEOUnified() {
  return await testAPI('/api/test/seo', 'POST', {
    url: TEST_URL,
    options: {
      checkTechnicalSEO: true,
      checkContentQuality: true
    }
  });
}

/**
 * 测试API文档端点
 */
async function testAPIDocumentation() {
  return await testAPI('/api', 'GET');
}

/**
 * 测试健康检查端点
 */
async function testHealthCheck() {
  return await testAPI('/health', 'GET');
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('🚀 开始性能测试API端点验证...\n');

  const tests = [
    { name: '健康检查', fn: testHealthCheck },
    { name: 'API文档', fn: testAPIDocumentation },
    { name: '性能测试主接口', fn: testPerformanceMain },
    { name: '页面速度检测', fn: testPageSpeed },
    { name: 'Core Web Vitals检测', fn: testCoreWebVitals },
    { name: '资源分析', fn: testResourceAnalysis },
    { name: '保存测试结果', fn: testSaveResults },
    { name: 'SEO统一路由', fn: testSEOUnified }
  ];

  console.log(`📋 计划执行 ${tests.length} 个测试...\n`);

  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    await test.fn();

    // 添加延迟避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 输出测试结果摘要
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果摘要');
  console.log('='.repeat(50));
  console.log(`✅ 通过: ${testResults.passed}`);
  console.log(`❌ 失败: ${testResults.failed}`);
  console.log(`📈 成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  if (testResults.errors.length > 0) {
    console.log('\n❌ 错误详情:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  console.log('\n' + '='.repeat(50));

  // 返回测试是否全部通过
  return testResults.failed === 0;
}

/**
 * 验证路由命名规范
 */
function validateRouteNaming() {
  console.log('\n🔍 验证路由命名规范...');

  const routes = [
    '/api/test/performance',
    '/api/test/performance/page-speed',
    '/api/test/performance/core-web-vitals',
    '/api/test/performance/resources',
    '/api/test/performance/save',
    '/api/test/seo'
  ];

  const namingIssues = [];

  routes.forEach(route => {
    // 检查是否使用kebab-case
    const segments = route.split('/').filter(s => s);
    segments.forEach(segment => {
      if (segment.includes('_') || /[A-Z]/.test(segment)) {
        namingIssues.push(`${route}: 段 "${segment}" 不符合kebab-case规范`);
      }
    });

    // 检查是否有多余的斜杠
    if (route.includes('//')) {
      namingIssues.push(`${route}: 包含多余的斜杠`);
    }
  });

  if (namingIssues.length === 0) {
    console.log('✅ 所有路由命名符合规范');
  } else {
    console.log('❌ 发现命名规范问题:');
    namingIssues.forEach(issue => console.log(`  - ${issue}`));
  }

  return namingIssues.length === 0;
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🔧 性能测试API端点验证工具');
    console.log(`🌐 目标服务器: ${BASE_URL}`);
    console.log(`🎯 测试URL: ${TEST_URL}\n`);

    // 验证路由命名规范
    const namingValid = validateRouteNaming();

    // 运行API测试
    const testsPass = await runAllTests();

    // 最终结果
    if (namingValid && testsPass) {
      console.log('\n🎉 所有验证通过！性能测试API已准备就绪。');
      process.exit(0);
    } else {
      console.log('\n⚠️  发现问题，请检查上述错误并修复。');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 验证过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  runAllTests, testResults, validateRouteNaming
};

