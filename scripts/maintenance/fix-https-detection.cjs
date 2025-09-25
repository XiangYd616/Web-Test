#!/usr/bin/env node

/**
 * 修复HTTPS检测逻辑问题
 * 确保所有安全检查API返回一致的HTTPS标识
 */

const fs = require('fs');
const path = require('path');

class HTTPSDetectionFixer {
  constructor() {
    this.stats = {
      filesScanned: 0,
      filesFixed: 0,
      issuesFound: 0,
      issuesFixed: 0
    };
    this.projectRoot = path.resolve(__dirname, '../../');
  }

  /**
   * 修复安全路由中的HTTPS检测逻辑
   */
  fixSecurityRoutes() {
    const securitySimpleFile = path.join(this.projectRoot, 'backend/routes/security-simple.js');
    
    try {
      let content = fs.readFileSync(securitySimpleFile, 'utf8');
      let modified = false;

      // 确保HTTPS检测逻辑一致
      const fixes = [
        {
          search: /const httpsEnabled = url\.startsWith\('https:\/\/'\);/g,
          replace: `const httpsEnabled = url.toLowerCase().startsWith('https://');`,
          description: '标准化HTTPS检测逻辑（不区分大小写）'
        },
        {
          search: /httpsEnabled \? 'HTTPS已启用' : '建议启用HTTPS'/g,
          replace: `httpsEnabled ? 'HTTPS已启用，连接安全' : '建议启用HTTPS加密连接'`,
          description: '改进HTTPS状态提示信息'
        },
        {
          search: /enabled: httpsEnabled,/g,
          replace: `enabled: httpsEnabled,\n            protocol: httpsEnabled ? 'HTTPS' : 'HTTP',\n            secure: httpsEnabled,`,
          description: '添加更详细的SSL状态信息'
        }
      ];

      fixes.forEach(fix => {
        if (fix.search.test(content)) {
          content = content.replace(fix.search, fix.replace);
          modified = true;
          this.stats.issuesFound++;
          this.stats.issuesFixed++;
          console.log(`🔧 ${fix.description}`);
        }
      });

      if (modified) {
        fs.writeFileSync(securitySimpleFile, content, 'utf8');
        this.stats.filesFixed++;
        console.log(`✅ 修复了 ${path.relative(this.projectRoot, securitySimpleFile)}`);
      }

      this.stats.filesScanned++;

    } catch (error) {
      console.error(`❌ 修复文件失败 ${securitySimpleFile}:`, error.message);
    }
  }

  /**
   * 修复SSL分析器中的HTTPS检测
   */
  fixSSLAnalyzer() {
    const sslAnalyzerFile = path.join(this.projectRoot, 'backend/engines/security/analyzers/sslAnalyzer.js');
    
    try {
      let content = fs.readFileSync(sslAnalyzerFile, 'utf8');
      let modified = false;

      // 确保协议检测一致性
      const fixes = [
        {
          search: /if \(urlObj\.protocol !== 'https:'\) \{/g,
          replace: `if (urlObj.protocol.toLowerCase() !== 'https:') {`,
          description: '标准化协议检测（不区分大小写）'
        },
        {
          search: /httpsEnabled: false,\s*score: 0,/g,
          replace: `httpsEnabled: false,\n          protocol: 'HTTP',\n          secure: false,\n          score: 0,`,
          description: '添加更详细的HTTP状态信息'
        }
      ];

      fixes.forEach(fix => {
        if (fix.search.test(content)) {
          content = content.replace(fix.search, fix.replace);
          modified = true;
          this.stats.issuesFound++;
          this.stats.issuesFixed++;
          console.log(`🔧 ${fix.description}`);
        }
      });

      if (modified) {
        fs.writeFileSync(sslAnalyzerFile, content, 'utf8');
        this.stats.filesFixed++;
        console.log(`✅ 修复了 ${path.relative(this.projectRoot, sslAnalyzerFile)}`);
      }

      this.stats.filesScanned++;

    } catch (error) {
      console.error(`❌ 修复文件失败 ${sslAnalyzerFile}:`, error.message);
    }
  }

  /**
   * 创建HTTPS检测测试脚本
   */
  createHTTPSTest() {
    const testFile = path.join(this.projectRoot, 'scripts/test-https-detection.cjs');
    
    const testContent = `#!/usr/bin/env node

/**
 * 测试HTTPS检测逻辑的一致性
 */

const http = require('http');
const axios = require('axios').default;

async function testHTTPSDetection() {
  const baseURL = 'http://localhost:3001';
  
  const testCases = [
    { url: 'https://www.google.com', expectedHttps: true },
    { url: 'http://www.example.com', expectedHttps: false },
    { url: 'HTTPS://WWW.GITHUB.COM', expectedHttps: true }, // 大写测试
    { url: 'HTTP://WWW.STACKOVERFLOW.COM', expectedHttps: false } // 大写测试
  ];

  console.log('🧪 开始测试HTTPS检测逻辑..\\n');
  
  for (const testCase of testCases) {
    try {
      const response = await axios.post(\`\${baseURL}/api/security/quick-check\`, {
        url: testCase.url
      });
      
      const result = response.data;
      if (result.success && result.data) {
        const httpsDetected = result.data.httpsEnabled;
        const status = httpsDetected === testCase.expectedHttps ? '✅ 通过' : '❌ 失败';
        
        console.log(\`\${status} URL: \${testCase.url}\`);
        console.log(\`     期望HTTPS: \${testCase.expectedHttps}, 实际检测: \${httpsDetected}\`);
        
        if (httpsDetected !== testCase.expectedHttps) {
          console.log(\`     ⚠️ HTTPS检测结果不匹配!\`);
          return false;
        }
      } else {
        console.log(\`❌ API调用失败: \${testCase.url}\`);
        return false;
      }
    } catch (error) {
      console.log(\`❌ 测试失败 \${testCase.url}:\`, error.message);
      return false;
    }
    
    console.log('');
  }
  
  console.log('🎉 所有HTTPS检测测试通过!');
  return true;
}

if (require.main === module) {
  testHTTPSDetection().catch(console.error);
}

module.exports = testHTTPSDetection;`;

    try {
      fs.writeFileSync(testFile, testContent, 'utf8');
      console.log(`📝 创建了HTTPS检测测试脚本: ${path.relative(this.projectRoot, testFile)}`);
    } catch (error) {
      console.error(`❌ 创建测试脚本失败:`, error.message);
    }
  }

  /**
   * 运行修复
   */
  async run() {
    console.log('🚀 开始修复HTTPS检测逻辑...\n');
    
    const startTime = Date.now();
    
    // 修复各个组件
    this.fixSecurityRoutes();
    this.fixSSLAnalyzer();
    this.createHTTPSTest();
    
    const duration = Date.now() - startTime;
    
    // 输出修复报告
    this.printReport(duration);
  }

  /**
   * 打印修复报告
   */
  printReport(duration) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 HTTPS检测逻辑修复报告');
    console.log('='.repeat(60));
    console.log(\`📁 扫描文件数量: \${this.stats.filesScanned}\`);
    console.log(\`📝 修复文件数量: \${this.stats.filesFixed}\`);
    console.log(\`🔍 发现问题数量: \${this.stats.issuesFound}\`);
    console.log(\`🔧 修复问题数量: \${this.stats.issuesFixed}\`);
    console.log(\`⏱️  修复用时: \${(duration/1000).toFixed(2)}秒\`);
    
    if (this.stats.issuesFixed > 0) {
      console.log('\\n✅ HTTPS检测逻辑修复完成！');
      console.log('📝 建议运行以下命令测试修复效果:');
      console.log('   node scripts/test-https-detection.cjs');
    } else {
      console.log('\\n🎉 未发现需要修复的HTTPS检测问题！');
    }
    
    console.log('='.repeat(60));
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new HTTPSDetectionFixer();
  fixer.run().catch(console.error);
}

module.exports = HTTPSDetectionFixer;
