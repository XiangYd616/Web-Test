/**
 * 代理验证服务
 * 检测代理是否可从服务器访问，并提供智能建议
 */

const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const AbortController = require('abort-controller');

class ProxyValidator {
  constructor() {
    this.testUrl = 'https://httpbin.org/ip';
    this.timeout = 3000; // 3秒超时，提高响应速度
    this.fastTestUrl = 'http://httpbin.org/ip'; // HTTP版本，更快
  }

  /**
   * 验证代理配置
   */
  async validateProxy(proxyConfig) {
    const result = {
      accessible: false,
      error: null,
      suggestion: null,
      proxyType: 'unknown',
      responseTime: 0
    };

    try {
      // 检测代理类型
      result.proxyType = this.detectProxyType(proxyConfig);

      // 尝试连接代理
      const startTime = Date.now();
      const success = await this.testProxyConnection(proxyConfig);
      result.responseTime = Date.now() - startTime;

      if (success) {
        result.accessible = true;
        result.suggestion = '代理可从服务器访问，可以使用服务器端压力测试';
      } else {
        result.accessible = false;
        result.error = '服务器无法访问此代理';
        result.suggestion = this.generateSuggestion(proxyConfig);
      }

    } catch (error) {
      result.accessible = false;
      result.error = error.message;
      result.suggestion = this.generateSuggestion(proxyConfig, error);
    }

    return result;
  }

  /**
   * 检测代理类型
   */
  detectProxyType(proxyConfig) {
    const { host, port } = proxyConfig;

    // 检测是否为本地代理
    if (host === '127.0.0.1' || host === 'localhost' || host.startsWith('192.168.') || host.startsWith('10.')) {
      return 'local';
    }

    // 检测常见VPN代理端口
    const vpnPorts = [1080, 7890, 7891, 8080, 8118, 9050];
    if (vpnPorts.includes(port)) {
      return 'vpn';
    }

    return 'remote';
  }

  /**
   * 快速测试代理连接（优先使用HTTP）
   */
  async testProxyConnection(proxyConfig, useFastTest = true) {
    try {
      const proxyType = proxyConfig.type || 'http';
      const proxyPort = proxyConfig.port || 8080;
      let proxyUrl;

      if (proxyConfig.username && proxyConfig.password) {
        proxyUrl = `${proxyType}://${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.host}:${proxyPort}`;
      } else {
        proxyUrl = `${proxyType}://${proxyConfig.host}:${proxyPort}`;
      }

      // 优先使用HTTP进行快速测试
      const testUrl = useFastTest ? this.fastTestUrl : this.testUrl;

      // 选择合适的代理agent
      let agent;
      const isHttpsTarget = testUrl.startsWith('https://');

      if (isHttpsTarget) {
        agent = new HttpsProxyAgent(proxyUrl);
      } else {
        agent = new HttpProxyAgent(proxyUrl);
      }

      // 设置超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.timeout);

      const response = await fetch(testUrl, {
        agent,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Proxy-Validator/1.0'
        }
      });

      clearTimeout(timeoutId);
      return response.ok;

    } catch (error) {
      // 如果快速测试失败且使用的是HTTP，尝试HTTPS
      if (useFastTest && error.code !== 'ABORT_ERR') {
        
        return await this.testProxyConnection(proxyConfig, false);
      }
      return false;
    }
  }

  /**
   * 生成建议
   */
  generateSuggestion(proxyConfig, error = null) {
    const { host, port } = proxyConfig;
    const proxyType = this.detectProxyType(proxyConfig);

    const suggestions = [];

    if (proxyType === 'local') {
      suggestions.push('🔍 检测到本地代理配置');
      suggestions.push('💡 建议使用客户端压力测试模式');
      suggestions.push('📱 客户端测试将自动使用您的VPN/代理设置');
      suggestions.push('⚡ 这样可以避免不必要的网络中转');

      if (error && error.message.includes('ECONNREFUSED')) {
        suggestions.push('⚠️  服务器无法连接到您的本地代理');
        suggestions.push('🔒 这是正常的，因为本地代理通常不允许外部连接');
      }
    } else if (proxyType === 'vpn') {
      suggestions.push('🔍 检测到可能的VPN代理配置');
      suggestions.push('💡 如果这是您本地的VPN代理，建议使用客户端测试');
      suggestions.push('🌐 如果这是远程代理服务器，请检查网络连接');
    } else {
      suggestions.push('🔍 检测到远程代理配置');
      suggestions.push('🌐 请确保代理服务器允许来自我们服务器的连接');
      suggestions.push('🔑 检查是否需要IP白名单或认证配置');
    }

    // 根据错误类型添加具体建议
    if (error) {
      if (error.message.includes('ECONNREFUSED')) {
        suggestions.push('❌ 连接被拒绝：代理服务器可能未运行或不允许连接');
      } else if (error.message.includes('ETIMEDOUT')) {
        suggestions.push('⏰ 连接超时：代理服务器可能不可达或响应缓慢');
      } else if (error.message.includes('ENOTFOUND')) {
        suggestions.push('🔍 域名解析失败：请检查代理服务器地址是否正确');
      }
    }

    return suggestions;
  }

  /**
   * 获取推荐的测试模式
   */
  getRecommendedTestMode(proxyConfig) {
    const proxyType = this.detectProxyType(proxyConfig);

    if (proxyType === 'local' || proxyType === 'vpn') {
      
        return {
        mode: 'client',
        reason: '本地/VPN代理建议使用客户端测试模式',
        benefits: [
          '直接使用您的代理设置',
          '避免网络中转延时',
          '更真实的用户体验模拟',
          '无需服务器访问本地代理'
        ]
      };
    } else {
      return {
        mode: 'server',
        reason: '远程代理可以使用服务器端测试模式',
        benefits: [
          '更高的并发能力',
          '更稳定的网络环境',
          '不受客户端性能限制',
          '可以进行大规模测试'
        ]
      };
    }
  }

  /**
   * 完整的代理分析
   */
  async analyzeProxy(proxyConfig) {
    console.log('🔍 开始代理分析...');

    const validation = await this.validateProxy(proxyConfig);
    const recommendation = this.getRecommendedTestMode(proxyConfig);

    const analysis = {
      validation,
      recommendation,
      summary: {
        canUseServerMode: validation.accessible,
        shouldUseClientMode: validation.proxyType === 'local' || validation.proxyType === 'vpn',
        optimalMode: validation.accessible ? 'both' : 'client'
      }
    };

    console.log('📊 代理分析完成:', analysis.summary);
    return analysis;
  }
}

module.exports = ProxyValidator;
