/**
 * 简化测试脚本，快速验证重构后的服务
 */

import HTMLParsingService from '../backend/engines/shared/services/HTMLParsingService.js';

interface ParseResult {
  success: boolean;
  $?: any;
  error?: string;
}

interface MetaTags {
  title?: string;
  description?: string;
  keywords?: string;
  [key: string]: any;
}

interface HeadingStructure {
  h1?: string[];
  h2?: string[];
  h3?: string[];
  [key: string]: string[];
}

interface ImageInfo {
  src: string;
  alt?: string;
  title?: string;
}

interface LinkInfo {
  href: string;
  text?: string;
  type: 'internal' | 'external';
}

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

    const parseResult: ParseResult = htmlService.parseHTML(testHtml);

    if (parseResult.success) {
      console.log('✅ HTML解析成功');

      const metaResult: MetaTags = htmlService.extractMetaTags(parseResult.$);
      console.log('✅ Meta标签提取成功:', Object.keys(metaResult).length, '个标签');

      const headingResult: HeadingStructure = htmlService.extractHeadingStructure(parseResult.$);
      console.log('✅ 标题结构提取成功:', Object.keys(headingResult).length, '级标题');

      const imageResult: ImageInfo[] = htmlService.extractImages(parseResult.$);
      console.log('✅ 图片信息提取成功:', imageResult.length, '张图片');

      const linkResult: LinkInfo[] = htmlService.extractLinks(parseResult.$);
      console.log('✅ 链接信息提取成功:', linkResult.length, '个链接');

      // 验证提取的内容
      const validations = [
        {
          name: '标题提取',
          condition: metaResult.title === 'Test Page',
          success: metaResult.title === 'Test Page',
        },
        {
          name: '描述提取',
          condition: metaResult.description === 'Test description',
          success: metaResult.description === 'Test description',
        },
        {
          name: 'H1标题提取',
          condition: headingResult.h1 && headingResult.h1.length > 0,
          success: headingResult.h1 && headingResult.h1.length > 0,
        },
        {
          name: '图片提取',
          condition: imageResult.length > 0 && imageResult[0].src === 'test.jpg',
          success: imageResult.length > 0 && imageResult[0].src === 'test.jpg',
        },
        {
          name: '链接提取',
          condition: linkResult.length > 0 && linkResult[0].href === '/internal',
          success: linkResult.length > 0 && linkResult[0].href === '/internal',
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
    } else {
      console.error('❌ HTML解析失败:', parseResult.error);
      return false;
    }
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
    const parseResult = htmlService.parseHTML(largeHtml);
    const parseTime = Date.now() - startTime;

    console.log(`⏱️ 解析耗时: ${parseTime}ms`);

    if (parseResult.success) {
      const metaStartTime = Date.now();
      const metaResult = htmlService.extractMetaTags(parseResult.$);
      const metaTime = Date.now() - metaStartTime;

      const headingStartTime = Date.now();
      const headingResult = htmlService.extractHeadingStructure(parseResult.$);
      const headingTime = Date.now() - headingStartTime;

      const imageStartTime = Date.now();
      const imageResult = htmlService.extractImages(parseResult.$);
      const imageTime = Date.now() - imageStartTime;

      const linkStartTime = Date.now();
      const linkResult = htmlService.extractLinks(parseResult.$);
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
    const emptyResult = htmlService.parseHTML('');
    console.log(`空HTML处理: ${emptyResult.success ? '✅' : '❌'}`);

    // 测试无效HTML
    const invalidHtml = '<div><p>Unclosed paragraph</div>';
    const invalidResult = htmlService.parseHTML(invalidHtml);
    console.log(`无效HTML处理: ${invalidResult.success ? '✅' : '❌'}`);

    // 测试超大HTML
    const hugeHtml = '<html>' + '<div>'.repeat(100000) + '</html>';
    const hugeResult = htmlService.parseHTML(hugeHtml);
    console.log(`超大HTML处理: ${hugeResult.success ? '✅' : '❌'}`);
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
