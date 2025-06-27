/**
 * SEO分析引擎测试脚本
 * 用于验证SEO分析功能的正确性
 */

const { RealSEOTestEngine } = require('./services/realSEOTestEngine');

async function testSEOEngine() {
  console.log('🚀 开始测试SEO分析引擎...\n');

  const seoEngine = new RealSEOTestEngine();
  
  // 测试URL
  const testUrl = 'https://example.com';
  
  // 测试配置
  const options = {
    keywords: 'example, test, website',
    checkTechnicalSEO: true,
    checkContentQuality: true,
    checkKeywords: true,
    checkStructuredData: true,
    checkPageSpeed: true,
    checkMobileFriendly: true,
    checkSocialMedia: true,
    checkLocalSEO: false,
    depth: 'standard'
  };

  try {
    console.log(`📄 开始分析网站: ${testUrl}`);
    console.log(`⚙️ 配置选项:`, options);
    console.log('');

    // 运行SEO分析
    const results = await seoEngine.runSEOTest(testUrl, options);

    console.log('✅ SEO分析完成!\n');

    // 显示结果摘要
    console.log('📊 分析结果摘要:');
    console.log(`总体评分: ${results.overallScore}/100 (${results.scoreGrade || 'N/A'})`);
    console.log(`分析时长: ${Math.round(results.duration / 1000)}秒`);
    console.log('');

    // 显示各项评分
    console.log('📈 分项评分:');
    Object.entries(results.scores || {}).forEach(([category, score]) => {
      const categoryNames = {
        technical: '技术SEO',
        content: '内容质量',
        onPage: '页面SEO',
        performance: '性能优化',
        mobile: '移动友好',
        social: '社交媒体',
        coreWebVitals: 'Core Web Vitals',
        pageExperience: '页面体验'
      };
      const name = categoryNames[category] || category;
      const status = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
      console.log(`  ${status} ${name}: ${score}/100`);
    });
    console.log('');

    // 显示发现的问题
    if (results.issues && results.issues.length > 0) {
      console.log('🔍 发现的问题:');
      results.issues.slice(0, 5).forEach((issue, index) => {
        const severity = issue.severity === 'high' ? '🔴' : 
                        issue.severity === 'medium' ? '🟡' : '🟢';
        console.log(`  ${index + 1}. ${severity} ${issue.message}`);
      });
      console.log('');
    }

    // 显示优化建议
    if (results.recommendations && results.recommendations.length > 0) {
      console.log('💡 优化建议:');
      results.recommendations.slice(0, 5).forEach((rec, index) => {
        const priority = rec.priority === 'high' ? '🔴' : 
                        rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`  ${index + 1}. ${priority} ${rec.title}`);
        console.log(`     ${rec.description}`);
      });
      console.log('');
    }

    // 显示关键词分析
    if (results.keywords && Object.keys(results.keywords.density || {}).length > 0) {
      console.log('🔑 关键词分析:');
      Object.entries(results.keywords.density).forEach(([keyword, data]) => {
        const status = data.status === 'optimal' ? '✅' : 
                      data.status === 'high' ? '⚠️' : 
                      data.status === 'low' ? '📉' : '❌';
        console.log(`  ${status} "${keyword}": ${data.density.toFixed(1)}% (${data.count}次)`);
      });
      console.log('');
    }

    // 测试报告生成
    console.log('📄 测试报告生成功能...');
    
    try {
      // 生成PDF报告
      const pdfReport = await seoEngine.exportReport(results, 'pdf');
      console.log(`✅ PDF报告生成成功: ${pdfReport.filename}`);
      
      // 生成HTML报告
      const htmlReport = await seoEngine.exportReport(results, 'html');
      console.log(`✅ HTML报告生成成功: ${htmlReport.filename}`);
      
      // 生成JSON报告
      const jsonReport = await seoEngine.exportReport(results, 'json');
      console.log(`✅ JSON报告生成成功: ${jsonReport.filename}`);
      
    } catch (reportError) {
      console.log(`⚠️ 报告生成测试失败: ${reportError.message}`);
    }

    console.log('');

    // 生成SEO摘要
    const summary = seoEngine.generateSEOSummary(results);
    console.log('📋 SEO摘要:');
    console.log(`  平均分数: ${summary.averageScore}/100`);
    console.log(`  总问题数: ${summary.totalIssues}`);
    console.log(`  高优先级建议: ${summary.highPriorityRecommendations}`);
    console.log(`  关键词总数: ${summary.keywordStats.total}`);
    console.log('');

    console.log('🎉 SEO分析引擎测试完成!');
    
    return results;

  } catch (error) {
    console.error('❌ SEO分析测试失败:', error.message);
    console.error('错误详情:', error);
    throw error;
  }
}

// 运行测试
if (require.main === module) {
  testSEOEngine()
    .then(() => {
      console.log('\n✅ 所有测试通过!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 测试失败:', error.message);
      process.exit(1);
    });
}

module.exports = { testSEOEngine };
