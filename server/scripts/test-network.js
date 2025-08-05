#!/usr/bin/env node

/**
 * 网络连接测试工具
 * 用于诊断 MaxMind 下载问题
 */

const https = require('https');
const http = require('http');
const dns = require('dns');
const { promisify } = require('util');

const dnsLookup = promisify(dns.lookup);

class NetworkTester {
  constructor() {
    this.testUrls = [
      'https://download.maxmind.com',
      'https://www.maxmind.com',
      'https://httpbin.org/ip',
      'https://www.google.com'
    ];
  }

  /**
   * 测试 DNS 解析
   */
  async testDNS(hostname) {
    try {
      console.log(`🔍 测试 DNS 解析: ${hostname}`);
      const result = await dnsLookup(hostname);
      console.log(`✅ DNS 解析成功: ${hostname} -> ${result.address}`);
      return true;
    } catch (error) {
      console.log(`❌ DNS 解析失败: ${hostname} - ${error.message}`);
      return false;
    }
  }

  /**
   * 测试 HTTP 连接
   */
  async testHTTP(url) {
    return new Promise((resolve) => {
      console.log(`🌐 测试 HTTP 连接: ${url}`);
      
      const startTime = Date.now();
      const client = url.startsWith('https:') ? https : http;
      
      const request = client.get(url, (response) => {
        const responseTime = Date.now() - startTime;
        console.log(`✅ HTTP 连接成功: ${url} (${response.statusCode}) - ${responseTime}ms`);
        resolve(true);
      });
      
      request.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        console.log(`❌ HTTP 连接失败: ${url} - ${error.message} (${responseTime}ms)`);
        resolve(false);
      });
      
      request.setTimeout(10000, () => {
        request.destroy();
        console.log(`⏰ HTTP 连接超时: ${url} (10秒)`);
        resolve(false);
      });
    });
  }

  /**
   * 测试 MaxMind 下载链接
   */
  async testMaxMindDownload() {
    const licenseKey = process.env.MAXMIND_LICENSE_KEY;
    
    if (!licenseKey) {
      console.log('⚠️  未设置 MAXMIND_LICENSE_KEY，跳过下载测试');
      return false;
    }

    const testUrl = `https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-Country&license_key=${licenseKey}&suffix=tar.gz`;
    
    return new Promise((resolve) => {
      console.log('🧪 测试 MaxMind 下载链接...');
      
      const startTime = Date.now();
      const request = https.get(testUrl, (response) => {
        const responseTime = Date.now() - startTime;
        
        if (response.statusCode === 200) {
          console.log(`✅ MaxMind 下载链接可用 (${responseTime}ms)`);
          console.log(`📊 Content-Length: ${response.headers['content-length']} bytes`);
          resolve(true);
        } else {
          console.log(`❌ MaxMind 下载失败: HTTP ${response.statusCode} (${responseTime}ms)`);
          resolve(false);
        }
        
        // 不下载完整文件，只测试连接
        request.destroy();
      });
      
      request.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        console.log(`❌ MaxMind 下载连接失败: ${error.message} (${responseTime}ms)`);
        resolve(false);
      });
      
      request.setTimeout(15000, () => {
        request.destroy();
        console.log(`⏰ MaxMind 下载连接超时 (15秒)`);
        resolve(false);
      });
    });
  }

  /**
   * 检查代理设置
   */
  checkProxySettings() {
    console.log('🔧 检查代理设置:');
    
    const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'];
    let hasProxy = false;
    
    proxyVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        console.log(`   ${varName}: ${value}`);
        hasProxy = true;
      }
    });
    
    if (!hasProxy) {
      console.log('   无代理设置');
    }
    
    return hasProxy;
  }

  /**
   * 运行完整的网络诊断
   */
  async runDiagnostics() {
    console.log('🔍 MaxMind 网络连接诊断');
    console.log('=' .repeat(50));
    
    // 检查代理设置
    this.checkProxySettings();
    console.log('');
    
    // 测试 DNS 解析
    console.log('📡 DNS 解析测试:');
    const dnsResults = [];
    for (const url of this.testUrls) {
      const hostname = new URL(url).hostname;
      const result = await this.testDNS(hostname);
      dnsResults.push(result);
    }
    console.log('');
    
    // 测试 HTTP 连接
    console.log('🌐 HTTP 连接测试:');
    const httpResults = [];
    for (const url of this.testUrls) {
      const result = await this.testHTTP(url);
      httpResults.push(result);
    }
    console.log('');
    
    // 测试 MaxMind 下载
    console.log('📥 MaxMind 下载测试:');
    const downloadResult = await this.testMaxMindDownload();
    console.log('');
    
    // 生成诊断报告
    this.generateReport(dnsResults, httpResults, downloadResult);
  }

  /**
   * 生成诊断报告
   */
  generateReport(dnsResults, httpResults, downloadResult) {
    console.log('📋 诊断报告:');
    console.log('=' .repeat(50));
    
    const dnsSuccess = dnsResults.filter(r => r).length;
    const httpSuccess = httpResults.filter(r => r).length;
    
    console.log(`DNS 解析: ${dnsSuccess}/${dnsResults.length} 成功`);
    console.log(`HTTP 连接: ${httpSuccess}/${httpResults.length} 成功`);
    console.log(`MaxMind 下载: ${downloadResult ? '成功' : '失败'}`);
    
    console.log('\n💡 建议:');
    
    if (dnsSuccess === 0) {
      console.log('❌ DNS 解析完全失败，请检查网络连接和 DNS 设置');
    } else if (dnsSuccess < dnsResults.length) {
      console.log('⚠️  部分 DNS 解析失败，可能是网络不稳定');
    }
    
    if (httpSuccess === 0) {
      console.log('❌ HTTP 连接完全失败，请检查防火墙和代理设置');
    } else if (httpSuccess < httpResults.length) {
      console.log('⚠️  部分 HTTP 连接失败，可能是网络限制');
    }
    
    if (!downloadResult) {
      console.log('❌ MaxMind 下载失败，可能的原因:');
      console.log('   • 许可证密钥无效');
      console.log('   • 网络连接问题');
      console.log('   • 防火墙阻止下载');
      console.log('   • MaxMind 服务器问题');
    }
    
    if (dnsSuccess > 0 && httpSuccess > 0 && !downloadResult) {
      console.log('\n🔧 建议的解决方案:');
      console.log('1. 检查 MaxMind 许可证密钥是否正确');
      console.log('2. 尝试使用 VPN 或代理');
      console.log('3. 联系网络管理员检查防火墙设置');
      console.log('4. 稍后重试（MaxMind 服务器可能临时不可用）');
    }
  }
}

// 命令行使用
if (require.main === module) {
  // 加载环境变量
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
  
  const tester = new NetworkTester();
  tester.runDiagnostics().then(() => {
    console.log('\n🏁 诊断完成');
  }).catch(error => {
    console.error('❌ 诊断失败:', error);
  });
}

module.exports = NetworkTester;
