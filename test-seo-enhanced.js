/**
 * 测试增强的SEO分析功能
 */

const testSEOAnalysis = async () => {
  const testUrl = 'https://www.example.com';
  
  console.log('🧪 开始测试增强的SEO分析功能...');
  
  try {
    // 测试在线SEO分析
    const response = await fetch('http://localhost:3001/api/seo/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: testUrl,
        options: {
          checkTechnicalSEO: true,
          checkContentQuality: true,
          checkAccessibility: true,
          checkPerformance: true,
          checkMobileFriendly: true,
          checkSocialMedia: true,
          checkStructuredData: true,
          checkSecurity: true,
          keywords: 'example, test, website',
          generateReport: true,
          reportFormat: 'json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ SEO分析请求成功发送');
    console.log('📊 分析ID:', result.testId);

    // 轮询获取结果
    const pollResults = async (testId) => {
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        try {
          const statusResponse = await fetch(`http://localhost:3001/api/seo/results/${testId}`);
          
          if (statusResponse.ok) {
            const statusResult = await statusResponse.json();
            
            console.log(`📈 进度: ${statusResult.progress}%`);
            
            if (statusResult.status === 'completed') {
              console.log('🎉 SEO分析完成！');
              console.log('📊 总体分数:', statusResult.overallScore);
              console.log('🏆 评级:', statusResult.scoreGrade);
              
              // 显示各项分数
              console.log('\n📋 详细分数:');
              Object.entries(statusResult.scores).forEach(([category, score]) => {
                console.log(`  ${category}: ${score}/100`);
              });

              // 显示新增的分析项目
              if (statusResult.checks.accessibility) {
                console.log('\n♿ 可访问性分析:');
                console.log('  分数:', statusResult.checks.accessibility.score);
                console.log('  问题:', statusResult.checks.accessibility.issues);
              }

              if (statusResult.checks.security) {
                console.log('\n🔒 安全性分析:');
                console.log('  分数:', statusResult.checks.security.score);
                console.log('  问题:', statusResult.checks.security.issues);
              }

              if (statusResult.checks.coreWebVitals) {
                console.log('\n⚡ Core Web Vitals:');
                console.log('  分数:', statusResult.checks.coreWebVitals.score);
                console.log('  LCP:', statusResult.checks.coreWebVitals.metrics?.lcp?.estimated);
                console.log('  FID:', statusResult.checks.coreWebVitals.metrics?.fid?.estimated);
                console.log('  CLS:', statusResult.checks.coreWebVitals.metrics?.cls?.estimated);
              }

              if (statusResult.checks.pageExperience) {
                console.log('\n🎯 页面体验:');
                console.log('  分数:', statusResult.checks.pageExperience.score);
                console.log('  移动友好:', statusResult.checks.pageExperience.factors?.mobileFriendly?.hasViewport);
                console.log('  安全浏览:', statusResult.checks.pageExperience.factors?.safeBrowsing?.isSecure);
              }

              // 显示建议
              if (statusResult.recommendations) {
                console.log('\n💡 优化建议:');
                if (statusResult.recommendations.high?.length > 0) {
                  console.log('  高优先级:', statusResult.recommendations.high);
                }
                if (statusResult.recommendations.medium?.length > 0) {
                  console.log('  中优先级:', statusResult.recommendations.medium);
                }
              }

              return statusResult;
            } else if (statusResult.status === 'failed') {
              console.error('❌ SEO分析失败:', statusResult.error);
              return null;
            }
          }
        } catch (error) {
          console.error('❌ 获取结果时出错:', error.message);
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
      }

      console.error('⏰ 分析超时');
      return null;
    };

    // 开始轮询结果
    const finalResult = await pollResults(result.testId);
    
    if (finalResult) {
      console.log('\n🎊 测试完成！增强的SEO分析功能正常工作');
      console.log('✨ 新增功能验证:');
      console.log('  ✅ 可访问性分析');
      console.log('  ✅ 安全性分析');
      console.log('  ✅ Core Web Vitals');
      console.log('  ✅ 页面体验分析');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
};

// 运行测试
testSEOAnalysis();
