/**
 * 直接测试SEO引擎
 */

const { RealSEOTestEngine } = require('./server/services/realSEOTestEngine');

async function testSEOEngine() {
  console.log('🧪 开始测试SEO引擎...');
  
  try {
    const seoEngine = new RealSEOTestEngine();
    console.log('✅ SEO引擎实例化成功');
    
    // 测试简单的URL
    const testUrl = 'https://www.example.com';
    console.log('📤 开始分析:', testUrl);
    
    const result = await seoEngine.runSEOTest(testUrl, {
      checkTechnicalSEO: true,
      checkContentQuality: true,
      keywords: 'example, test'
    });
    
    console.log('✅ SEO分析完成！');
    console.log('📊 结果:');
    console.log('  - 测试ID:', result.testId);
    console.log('  - URL:', result.url);
    console.log('  - 状态:', result.status);
    console.log('  - 总体分数:', result.overallScore);
    
    if (result.scores) {
      console.log('📋 各项分数:');
      Object.entries(result.scores).forEach(([category, score]) => {
        console.log(`  - ${category}: ${score}/100`);
      });
    }
    
    console.log('🎉 测试成功！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

testSEOEngine();
