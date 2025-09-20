/**
 * 测试性能测试引擎
 */

const PerformanceTestEngine = require('./backend/engines/performance/PerformanceTestEngine.js');

async function testPerformanceEngine() {
  console.log('⚡ 测试性能测试引擎\n');
  
  const performanceEngine = new PerformanceTestEngine();
  
  try {
    const result = await performanceEngine.executeTest({
      url: 'https://www.google.com',
      iterations: 2
    });
    
    if (result.success) {
      console.log('\n✅ 性能测试成功');
      console.log('  评分:', result.results.summary.score + '/100');
      console.log('  等级:', result.results.summary.grade);
      console.log('  平均加载时间:', result.results.summary.averageLoadTime);
      
      console.log('\n📊 Core Web Vitals:');
      console.log('  - LCP:', `${result.results.webVitals.lcp.value}ms (${result.results.webVitals.lcp.rating})`);
      console.log('  - FID:', `${result.results.webVitals.fid.value}ms (${result.results.webVitals.fid.rating})`);
      console.log('  - CLS:', `${result.results.webVitals.cls.value} (${result.results.webVitals.cls.rating})`);
      console.log('  - FCP:', `${result.results.webVitals.fcp.value}ms (${result.results.webVitals.fcp.rating})`);
      console.log('  - TTFB:', `${result.results.webVitals.ttfb.value}ms (${result.results.webVitals.ttfb.rating})`);
      
      console.log('\n💡 建议:');
      result.results.recommendations.forEach(rec => {
        console.log('  -', rec);
      });
    }
  } catch (error) {
    console.error('❌ 性能测试失败:', error.message);
  }
  
  await performanceEngine.cleanup();
  console.log('\n🎉 性能引擎测试完成！');
}

if (require.main === module) {
  testPerformanceEngine().catch(console.error);
}

module.exports = testPerformanceEngine;
