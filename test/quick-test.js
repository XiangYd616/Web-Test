/**
 * 简化测试脚本，快速验证重构后的服务
 */

import HTMLParsingService from '../backend/engines/shared/services/HTMLParsingService.js';

async function quickTest() {
  console.log('🚀 快速测试开始\n');
  
  try {
    // 测试HTML解析服务
    console.log('🧪 测试 HTMLParsingService');
    const htmlService = new HTMLParsingService();
    await htmlService.initialize();
    
    console.log('✅ HTML服务初始化成功');
    
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="Test description">
        </head>
        <body>
          <h1>Main Title</h1>
          <p>Test paragraph</p>
          <img src="test.jpg" alt="Test image">
          <a href="/internal">Internal Link</a>
        </body>
      </html>
    `;
    
    const parseResult = htmlService.parseHTML(testHtml);
    
    if (parseResult.success) {
      console.log('✅ HTML解析成功');
      
      const metaResult = htmlService.extractMetaTags(parseResult.$);
      console.log('📋 标题:', metaResult.metaData.title);
      console.log('📝 描述:', metaResult.metaData.description);
      
      const headingResult = htmlService.extractHeadingStructure(parseResult.$);
      console.log('🏷️  标题数量:', headingResult.totalCount);
      
      const imageResult = htmlService.extractImages(parseResult.$);
      console.log('🖼️  图片数量:', imageResult.totalCount);
      
      const linkResult = htmlService.extractLinks(parseResult.$);
      console.log('🔗 链接总数:', linkResult.totalCount);
      
      console.log('\n🎉 HTML解析服务测试通过！');
    } else {
      console.error('❌ HTML解析失败:', parseResult.error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return false;
  }
}

quickTest().then(success => {
  if (success) {
    console.log('\n✅ 快速测试成功！重构的共享服务工作正常。');
    process.exit(0);
  } else {
    console.log('\n❌ 快速测试失败。');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n💥 测试执行错误:', error);
  process.exit(1);
});
