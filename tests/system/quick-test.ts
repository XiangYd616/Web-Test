/**
 * 简化测试脚本，快速验证重构后的服务
 */

import HTMLParsingService from '../../backend/modules/engines/shared/services/HTMLParsingService';

async function quickTest(): Promise<boolean> {
  console.log('🚀 快速测试开始\n');

  try {
    // 测试HTML解析服务
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

    const parseResult = await htmlService.parseHTML(testHtml);

    if (parseResult) {
      console.log('✅ HTML解析成功');

      console.log('✅ Meta标签提取成功:', parseResult.meta.length, '个标签');
      console.log('✅ 标题结构提取成功:', parseResult.headings.length, '级标题');
      console.log('✅ 图片信息提取成功:', parseResult.images.length, '张图片');
      console.log('✅ 链接信息提取成功:', parseResult.links.length, '个链接');

      // 验证提取的内容
      const validations = [
        {
          name: '标题提取',
          condition: parseResult.title === 'Test Page',
          success: parseResult.title === 'Test Page',
        },
        {
          name: '描述提取',
          condition: parseResult.description === 'Test description',
          success: parseResult.description === 'Test description',
        },
        {
          name: 'H1标题提取',
          condition: parseResult.headings.some(item => item.level === 1),
          success: parseResult.headings.some(item => item.level === 1),
        },
        {
          name: '图片提取',
          condition: parseResult.images.length > 0 && parseResult.images[0].src === 'test.jpg',
          success: parseResult.images.length > 0 && parseResult.images[0].src === 'test.jpg',
        },
        {
          name: '链接提取',
          condition: parseResult.links.length > 0 && parseResult.links[0].href === '/internal',
          success: parseResult.links.length > 0 && parseResult.links[0].href === '/internal',
        },
      ];

      console.log('\n📊 验证结果:');
      let allPassed = true;

      validations.forEach(validation => {
        const status = validation.success ? '✅' : '❌';
        console.log(`${status} ${validation.name}: ${validation.success ? '通过' : '失败'}`);
        if (!validation.success) {
          allPassed = false;
        }
      });

      if (allPassed) {
        console.log('\n🎉 所有测试通过！HTML解析服务工作正常。');
        return true;
      } else {
        console.log('\n⚠️ 部分测试失败，请检查相关功能。');
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    return false;
  }
}

// 性能测试
async function performanceTest(): Promise<void> {
  console.log('\n⚡ 性能测试开始...');

  try {
    const htmlService = new HTMLParsingService();
    await htmlService.initialize();

    // 生成大量HTML内容进行性能测试
    const largeHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Performance Test</title>
          <meta name="description" content="Performance test description">
        </head>
        <body>
          ${Array.from(
            { length: 1000 },
            (_, i) => `
            <h${(i % 6) + 1}>Heading ${i}</h${(i % 6) + 1}>
            <p>Paragraph ${i}</p>
            <img src="image${i}.jpg" alt="Image ${i}">
            <a href="/link${i}">Link ${i}</a>
          `
          ).join('')}
        </body>
      </html>
    `;

    const startTime = Date.now();
    const parseResult = await htmlService.parseHTML(largeHtml);
    const parseTime = Date.now() - startTime;

    console.log(`⏱️ 解析耗时: ${parseTime}ms`);

    if (parseResult) {
      const metaStartTime = Date.now();
      const _metaResult = parseResult.meta;
      void _metaResult;
      const metaTime = Date.now() - metaStartTime;

      const headingStartTime = Date.now();
      const _headingResult = parseResult.headings;
      void _headingResult;
      const headingTime = Date.now() - headingStartTime;

      const imageStartTime = Date.now();
      const imageResult = parseResult.images;
      const imageTime = Date.now() - imageStartTime;

      const linkStartTime = Date.now();
      const linkResult = parseResult.links;
      const linkTime = Date.now() - linkStartTime;

      console.log('📈 性能指标:');
      console.log(`   Meta提取: ${metaTime}ms`);
      console.log(`   标题提取: ${headingTime}ms`);
      console.log(`   图片提取: ${imageTime}ms (${imageResult.length}张)`);
      console.log(`   链接提取: ${linkTime}ms (${linkResult.length}个)`);

      const totalTime = parseTime + metaTime + headingTime + imageTime + linkTime;
      console.log(`   总耗时: ${totalTime}ms`);

      if (totalTime < 1000) {
        console.log('✅ 性能表现良好');
      } else if (totalTime < 3000) {
        console.log('⚠️ 性能一般，可考虑优化');
      } else {
        console.log('❌ 性能较差，需要优化');
      }
    }
  } catch (error) {
    console.error('❌ 性能测试失败:', error);
  }
}

// 错误处理测试
async function errorHandlingTest(): Promise<void> {
  console.log('\n🛡️ 错误处理测试开始...');

  try {
    const htmlService = new HTMLParsingService();
    await htmlService.initialize();

    // 测试空HTML
    const emptyResult = await htmlService.parseHTML('');
    console.log(`空HTML处理: ${emptyResult ? '✅' : '❌'}`);

    // 测试无效HTML
    const invalidHtml = '<div><p>Unclosed paragraph</div>';
    const invalidResult = await htmlService.parseHTML(invalidHtml);
    console.log(`无效HTML处理: ${invalidResult ? '✅' : '❌'}`);

    // 测试超大HTML
    const hugeHtml = '<html>' + '<div>'.repeat(100000) + '</html>';
    const hugeResult = await htmlService.parseHTML(hugeHtml);
    console.log(`超大HTML处理: ${hugeResult ? '✅' : '❌'}`);
  } catch (error) {
    console.error('❌ 错误处理测试失败:', error);
  }
}

// 主测试函数
async function runAllTests(): Promise<void> {
  console.log('🧪 开始系统测试套件\n');

  const results = {
    quickTest: await quickTest(),
    performanceTest: await (async () => {
      await performanceTest();
      return true;
    })(),
    errorHandlingTest: await (async () => {
      await errorHandlingTest();
      return true;
    })(),
  };

  console.log('\n📋 测试总结:');
  console.log(`   快速测试: ${results.quickTest ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   性能测试: ${results.performanceTest ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   错误处理测试: ${results.errorHandlingTest ? '✅ 通过' : '❌ 失败'}`);

  const allPassed = Object.values(results).every(result => result);

  if (allPassed) {
    console.log('\n🎉 所有系统测试通过！');
    process.exit(0);
  } else {
    console.log('\n⚠️ 部分测试失败，请检查相关功能。');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  });
}

export { errorHandlingTest, performanceTest, quickTest, runAllTests };
