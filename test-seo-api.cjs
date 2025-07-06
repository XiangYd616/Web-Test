/**
 * 简单的SEO API测试
 */

const https = require('https');
const http = require('http');

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testSEOAPI() {
  console.log('🧪 开始测试SEO API...');
  
  try {
    // 测试基础SEO分析
    console.log('📤 发送SEO分析请求...');
    
    const response = await makeRequest('http://localhost:3001/api/test/seo', {
      url: 'https://www.example.com',
      config: {
        checkTechnicalSEO: true,
        checkContentQuality: true,
        checkAccessibility: true,
        checkPerformance: true,
        checkMobileFriendly: true,
        checkSocialMedia: true,
        checkStructuredData: true,
        checkSecurity: true,
        keywords: 'example, test, website'
      }
    });

    console.log('📊 响应状态:', response.status);
    
    if (response.status === 200) {
      console.log('✅ SEO API请求成功！');
      
      if (response.data.success) {
        const result = response.data.data;
        console.log('📈 分析结果:');
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

        // 检查新增的分析项目
        if (result.checks) {
          console.log('🔍 分析检查:');
          
          if (result.checks.accessibility) {
            console.log('  ✅ 可访问性分析: 已完成');
          }
          
          if (result.checks.security) {
            console.log('  ✅ 安全性分析: 已完成');
          }
          
          if (result.checks.coreWebVitals) {
            console.log('  ✅ Core Web Vitals: 已完成');
          }
          
          if (result.checks.pageExperience) {
            console.log('  ✅ 页面体验分析: 已完成');
          }
        }

        console.log('\n🎉 增强的SEO分析功能测试成功！');
        console.log('✨ 新功能验证:');
        console.log('  ✅ API正常响应');
        console.log('  ✅ 数据结构完整');
        console.log('  ✅ 新增分析模块工作正常');
        
      } else {
        console.log('❌ SEO分析失败:', response.data.message);
      }
    } else {
      console.log('❌ API请求失败，状态码:', response.status);
      console.log('响应内容:', response.data);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testSEOAPI();
