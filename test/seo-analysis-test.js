/**
 * SEO分析功能测试脚本
 * 用于验证SEO分析引擎的功能和准确性
 */

import axios from 'axios';

// 测试配置
const TEST_CONFIG = {
  baseURL: 'http://localhost:3001',
  timeout: 30000,
  testUrls: [
    'https://www.baidu.com',
    'https://github.com',
    'https://stackoverflow.com',
    'https://developer.mozilla.org'
  ]
};

/**
 * 测试基础SEO分析
 */
async function testBasicSEOAnalysis() {
  console.log('\n🔍 测试基础SEO分析...');

  for (const url of TEST_CONFIG.testUrls) {
    try {
      console.log(`\n📄 分析URL: ${url}`);

      const response = await axios.post(`${TEST_CONFIG.baseURL}/api/test/seo`, {
        url: url,
        config: {
          keywords: 'test,website,seo',
          checkTechnicalSEO: true,
          checkContentQuality: true,
          checkPerformance: true
        }
      }, {
        timeout: TEST_CONFIG.timeout
      });

      if (response.data.success) {
        const result = response.data.data;
        console.log(`✅ 分析成功`);
        console.log(`📊 总体评分: ${result.overallScore}/100`);
        console.log(`⏱️ 分析时间: ${result.duration}ms`);
        console.log(`📄 页面大小: ${(result.metadata.pageSize / 1024).toFixed(1)}KB`);

        // 检查各项评分
        if (result.scores) {
          console.log('📈 各项评分:');
          Object.entries(result.scores).forEach(([category, score]) => {
            const status = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
            console.log(`  ${status} ${category}: ${score}/100`);
          });
        }

        // 检查问题数量
        if (result.issues) {
          const criticalCount = result.issues.critical?.length || 0;
          const warningCount = result.issues.warning?.length || 0;
          console.log(`🔍 问题统计: ${criticalCount}个严重问题, ${warningCount}个警告`);
        }

      } else {
        console.log(`❌ 分析失败: ${response.data.message}`);
      }

    } catch (error) {
      console.log(`❌ 请求失败: ${error.message}`);
    }
  }
}

/**
 * 测试增强SEO分析
 */
async function testEnhancedSEOAnalysis() {
  console.log('\n🚀 测试增强SEO分析...');

  const testUrl = 'https://github.com';

  try {
    console.log(`\n📄 增强分析URL: ${testUrl}`);

    const response = await axios.post(`${TEST_CONFIG.baseURL}/api/test/seo/enhanced`, {
      url: testUrl,
      options: {
        keywords: 'github,git,code,repository,open source',
        checkTechnicalSEO: true,
        checkContentQuality: true,
        checkAccessibility: true,
        checkPerformance: true,
        checkMobileFriendly: true,
        checkSocialMedia: true,
        checkStructuredData: true,
        checkSecurity: true,
        includeImages: true,
        includeLinks: true,
        deepCrawl: false,
        competitorAnalysis: false
      }
    }, {
      timeout: TEST_CONFIG.timeout
    });

    if (response.data.success) {
      const result = response.data.data;
      console.log(`✅ 增强分析成功`);
      console.log(`📊 总体评分: ${result.overallScore}/100 (${result.scoreGrade})`);
      console.log(`⏱️ 分析时间: ${result.duration}ms`);

      // 详细评分
      if (result.scores) {
        console.log('\n📈 详细评分:');
        Object.entries(result.scores).forEach(([category, score]) => {
          const status = score >= 90 ? '🟢' : score >= 70 ? '🟡' : '🔴';
          console.log(`  ${status} ${category}: ${score}/100`);
        });
      }

      // 关键词分析
      if (result.keywords && result.keywords.density) {
        console.log('\n🔑 关键词分析:');
        Object.entries(result.keywords.density).forEach(([keyword, data]) => {
          console.log(`  - ${keyword}: ${data.density}% (${data.status})`);
        });
      }

      // 问题和建议
      if (result.issues) {
        console.log('\n🔍 问题统计:');
        console.log(`  🔴 严重: ${result.issues.critical?.length || 0}个`);
        console.log(`  ⚠️ 警告: ${result.issues.warning?.length || 0}个`);
        console.log(`  💡 信息: ${result.issues.info?.length || 0}个`);
      }

      if (result.recommendations) {
        console.log('\n💡 建议统计:');
        console.log(`  🔥 高优先级: ${result.recommendations.high?.length || 0}个`);
        console.log(`  📋 中优先级: ${result.recommendations.medium?.length || 0}个`);
        console.log(`  📝 低优先级: ${result.recommendations.low?.length || 0}个`);
      }

    } else {
      console.log(`❌ 增强分析失败: ${response.data.message}`);
    }

  } catch (error) {
    console.log(`❌ 请求失败: ${error.message}`);
  }
}

/**
 * 测试性能基准
 */
async function testPerformanceBenchmark() {
  console.log('\n⚡ 测试性能基准...');

  const testUrl = 'https://www.baidu.com';
  const testCount = 3;
  const times = [];

  for (let i = 0; i < testCount; i++) {
    try {
      console.log(`\n🔄 第${i + 1}次测试...`);

      const startTime = Date.now();
      const response = await axios.post(`${TEST_CONFIG.baseURL}/api/test/seo`, {
        url: testUrl,
        config: {
          keywords: 'test',
          checkTechnicalSEO: true,
          checkContentQuality: true
        }
      }, {
        timeout: TEST_CONFIG.timeout
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      times.push(totalTime);

      if (response.data.success) {
        const result = response.data.data;
        console.log(`✅ 测试完成: ${totalTime}ms (引擎: ${result.duration}ms)`);
      } else {
        console.log(`❌ 测试失败: ${response.data.message}`);
      }

    } catch (error) {
      console.log(`❌ 测试错误: ${error.message}`);
    }
  }

  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log('\n📊 性能统计:');
    console.log(`  平均时间: ${avgTime.toFixed(0)}ms`);
    console.log(`  最快时间: ${minTime}ms`);
    console.log(`  最慢时间: ${maxTime}ms`);

    // 性能评估
    if (avgTime < 5000) {
      console.log('  🟢 性能优秀');
    } else if (avgTime < 10000) {
      console.log('  🟡 性能良好');
    } else {
      console.log('  🔴 性能需要优化');
    }
  }
}

/**
 * 测试错误处理
 */
async function testErrorHandling() {
  console.log('\n🛡️ 测试错误处理...');

  const errorTests = [
    {
      name: '无效URL',
      url: 'invalid-url',
      expectedError: true
    },
    {
      name: '不存在的域名',
      url: 'https://this-domain-does-not-exist-12345.com',
      expectedError: true
    },
    {
      name: '404页面',
      url: 'https://httpbin.org/status/404',
      expectedError: false // 应该能分析，但状态码不是200
    }
  ];

  for (const test of errorTests) {
    try {
      console.log(`\n🧪 测试: ${test.name}`);

      const response = await axios.post(`${TEST_CONFIG.baseURL}/api/test/seo`, {
        url: test.url,
        config: {
          keywords: 'test'
        }
      }, {
        timeout: 10000
      });

      if (response.data.success) {
        if (test.expectedError) {
          console.log(`⚠️ 预期失败但成功了`);
        } else {
          console.log(`✅ 正确处理: 状态码 ${response.data.data.pageInfo.statusCode}`);
        }
      } else {
        if (test.expectedError) {
          console.log(`✅ 正确捕获错误: ${response.data.message}`);
        } else {
          console.log(`❌ 意外失败: ${response.data.message}`);
        }
      }

    } catch (error) {
      if (test.expectedError) {
        console.log(`✅ 正确捕获异常: ${error.message}`);
      } else {
        console.log(`❌ 意外异常: ${error.message}`);
      }
    }
  }
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log('🚀 开始SEO分析功能测试');
  console.log(`📡 服务器地址: ${TEST_CONFIG.baseURL}`);
  console.log(`⏱️ 超时时间: ${TEST_CONFIG.timeout}ms`);

  try {
    // 检查服务器状态
    console.log('\n🏥 检查服务器状态...');
    const healthResponse = await axios.get(`${TEST_CONFIG.baseURL}/health`, {
      timeout: 5000
    });

    if (healthResponse.data.status === 'healthy') {
      console.log('✅ 服务器运行正常');

      // 运行所有测试
      await testBasicSEOAnalysis();
      await testEnhancedSEOAnalysis();
      await testPerformanceBenchmark();
      await testErrorHandling();

      console.log('\n🎉 所有测试完成！');

    } else {
      console.log('❌ 服务器状态异常');
    }

  } catch (error) {
    console.log(`❌ 无法连接到服务器: ${error.message}`);
    console.log('请确保服务器正在运行在端口3001');
  }
}

// 运行测试
runAllTests().catch(console.error);

export {
  runAllTests, testBasicSEOAnalysis,
  testEnhancedSEOAnalysis, testErrorHandling, testPerformanceBenchmark
};

