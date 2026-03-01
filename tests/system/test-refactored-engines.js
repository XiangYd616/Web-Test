/**
 * 测试重构后的共享服务和性能引擎
 * 验证功能完整性和API兼容性
 */

import PerformanceTestEngine from '../backend/modules/engines/performance/PerformanceTestEngine.ts';
import HTMLParsingService from '../backend/modules/engines/shared/services/HTMLParsingService.ts';
import PerformanceMetricsService from '../backend/modules/engines/shared/services/PerformanceMetricsService.ts';

async function testPerformanceMetricsService() {
  
  try {
    const service = new PerformanceMetricsService();
    await service.initialize();
    
    console.log('✅ 服务初始化成功');
    
    // 测试可用性检查
    const availability = service.checkAvailability();
    console.log('📊 服务可用性:', availability);
    
    // 测试指标收集
    const testUrl = 'https://httpbin.org/html';
    
    const metricsResult = await service.collectMetrics(testUrl, {
      iterations: 2,
      userAgent: 'Test-Agent/1.0',
      timeout: 10000
    });
    
    if (metricsResult.success) {
      console.log('✅ 性能指标收集成功');
      
      return true;
    } else {
      console.error('❌ 性能指标收集失败:', metricsResult.error);
      return false;
    }
  } catch (error) {
    console.error('❌ PerformanceMetricsService 测试失败:', error.message);
    return false;
  }
}

async function testHTMLParsingService() {
  
  try {
    const service = new HTMLParsingService();
    await service.initialize();
    
    console.log('✅ 服务初始化成功');
    
    // 测试HTML解析
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="Test description">
          <meta name="keywords" content="test, html, parsing">
        </head>
        <body>
          <h1>Main Title</h1>
          <h2>Subtitle</h2>
          <p>This is a test paragraph.</p>
          <img src="test.jpg" alt="Test image">
          <a href="/internal">Internal Link</a>
          <a href="https://external.com">External Link</a>
        </body>
      </html>
    `;
    
    const parseResult = service.parseHTML(testHtml);
    if (parseResult.success) {
      console.log('✅ HTML解析成功');
      
      // 测试meta标签提取
      const _metaResult = service.extractMetaTags(parseResult.$);
      
      // 测试标题结构
      const headingResult = service.extractHeadingStructure(parseResult.$);
      console.log('✅ H1存在:', headingResult.hasH1);
      
      // 测试图片分析
      const _imageResult = service.extractImages(parseResult.$);
      
      // 测试链接分析
      const _linkResult = service.extractLinks(parseResult.$);
      
      return true;
    } else {
      console.error('❌ HTML解析失败:', parseResult.error);
      return false;
    }
  } catch (error) {
    console.error('❌ HTMLParsingService 测试失败:', error.message);
    return false;
  }
}

async function testPerformanceTestEngine() {
  
  try {
    const engine = new PerformanceTestEngine();
    
    // 测试可用性
    const availability = await engine.checkAvailability();
    console.log('📊 引擎可用性:', availability.available);
    console.log('🔧 版本:', availability.version);
    
    if (!availability.available) {
      console.error('❌ 引擎不可用');
      return false;
    }
    
    // 执行性能测试
    const testConfig = {
      url: 'https://httpbin.org/html',
      iterations: 2,
      includeResources: false,  // 简化测试
      fetchHtml: false,
      verbose: true
    };
    
    
    const result = await engine.executeTest(testConfig);
    
    if (result.success) {
      console.log('✅ 性能测试执行成功');
      console.log('🚀 TTFB评级:', result.results.metrics.ttfb.rating);
      
      if (result.results.recommendations && result.results.recommendations.length > 0) {
        console.log('🔧 首个建议:', result.results.recommendations[0].title);
      }
      
      return true;
    } else {
      console.error('❌ 性能测试失败:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ PerformanceTestEngine 测试失败:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 开始测试重构后的引擎和服务\n');
  
  const results = {
    performanceMetrics: false,
    htmlParsing: false,
    performanceEngine: false
  };
  
  // 运行所有测试
  results.performanceMetrics = await testPerformanceMetricsService();
  results.htmlParsing = await testHTMLParsingService();
  results.performanceEngine = await testPerformanceTestEngine();
  
  // 汇总结果
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  
  if (passedTests === totalTests) {
    return true;
  } else {
    console.log('⚠️  部分测试失败，需要进一步检查。');
    return false;
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 测试执行错误:', error);
    process.exit(1);
  });
}

export {
  runAllTests, testHTMLParsingService, testPerformanceMetricsService, testPerformanceTestEngine
};

