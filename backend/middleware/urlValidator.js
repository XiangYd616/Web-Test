/**
 * 统一的后端URL验证中间件
 * 提供一致的URL验证逻辑给所有API路由使用
 */

const dns = require('dns').promises;
const { URL } = require('url');

/**
 * URL验证选项
 */
const DEFAULT_OPTIONS = {
  allowedProtocols: ['http:', 'https:'],
  requireHTTPS: false,
  allowLocalhost: true,
  allowPrivateIPs: true,
  checkDNS: false,
  timeout: 5000
};

/**
 * 检查是否为私有IP地址
 */
function isPrivateIP(hostname) {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/
  ];
  
  return privateRanges.some(range => range.test(hostname));
}

/**
 * 检查域名格式
 */
function isValidDomain(hostname) {
  // 基本域名格式检查
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!domainRegex.test(hostname)) {
    return false;
  }
  
  // 检查是否有有效的顶级域名
  const parts = hostname.split('.');
  if (parts.length < 2) {
    return false;
  }
  
  const tld = parts[parts.length - 1];
  return tld.length >= 2 && /^[a-zA-Z]+$/.test(tld);
}

/**
 * 检查DNS解析
 */
async function checkDNSResolution(hostname, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // 尝试解析A记录
    const addresses = await dns.resolve4(hostname);
    clearTimeout(timeoutId);
    
    return {
      resolvable: true,
      addresses: addresses
    };
  } catch (error) {
    try {
      // 如果A记录失败，尝试AAAA记录
      const addresses = await dns.resolve6(hostname);
      return {
        resolvable: true,
        addresses: addresses
      };
    } catch (error2) {
      return {
        resolvable: false,
        error: error.message
      };
    }
  }
}

/**
 * 主要的URL验证函数
 */
async function validateURL(urlString, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result = {
    isValid: false,
    url: null,
    errors: [],
    warnings: [],
    suggestions: []
  };
  
  // 基本格式检查
  if (!urlString || typeof urlString !== 'string') {
    result.errors.push('请输入有效的URL');
    return result;
  }
  
  const trimmedUrl = urlString.trim();
  if (!trimmedUrl) {
    result.errors.push('URL不能为空');
    return result;
  }
  
  // 自动添加协议
  let processedUrl = trimmedUrl;
  if (!/^https?:\/\//i.test(processedUrl)) {
    processedUrl = `https://${processedUrl}`;
    result.suggestions.push('已自动添加HTTPS协议');
  }
  
  // URL对象验证
  let urlObj;
  try {
    urlObj = new URL(processedUrl);
    result.url = urlObj;
  } catch (error) {
    result.errors.push('URL格式无效');
    return result;
  }
  
  // 协议检查
  if (!opts.allowedProtocols.includes(urlObj.protocol)) {
    result.errors.push(`不支持的协议: ${urlObj.protocol}`);
    return result;
  }
  
  // HTTPS要求检查
  if (opts.requireHTTPS && urlObj.protocol !== 'https:') {
    result.errors.push('必须使用HTTPS协议');
    return result;
  }
  
  // 主机名检查
  if (!urlObj.hostname) {
    result.errors.push('缺少有效的主机名');
    return result;
  }
  
  // localhost检查
  if (!opts.allowLocalhost && (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')) {
    result.errors.push('不允许使用localhost');
    return result;
  }
  
  // 私有IP检查
  if (!opts.allowPrivateIPs && isPrivateIP(urlObj.hostname)) {
    result.warnings.push('检测到私有IP地址');
  }
  
  // 域名格式检查（仅对非IP地址）
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname) && !isValidDomain(urlObj.hostname)) {
    result.errors.push('域名格式无效');
    return result;
  }
  
  // 端口检查
  if (urlObj.port) {
    const port = parseInt(urlObj.port);
    if (port < 1 || port > 65535) {
      result.errors.push('端口号无效');
      return result;
    }
  }
  
  // 如果到这里没有错误，基本验证通过
  if (result.errors.length === 0) {
    result.isValid = true;
  }
  
  // DNS解析检查
  if (opts.checkDNS && result.isValid) {
    try {
      const dnsResult = await checkDNSResolution(urlObj.hostname, opts.timeout);
      if (!dnsResult.resolvable) {
        result.warnings.push(`域名无法解析: ${dnsResult.error || '未知原因'}`);
      }
    } catch (error) {
      result.warnings.push('无法检查域名解析');
    }
  }
  
  // 安全建议
  if (urlObj.protocol === 'http:') {
    result.suggestions.push('建议使用HTTPS以提高安全性');
  }
  
  return result;
}

/**
 * Express中间件：验证请求体中的URL字段
 */
function validateURLMiddleware(options = {}) {
  return async (req, res, next) => {
    const { url, baseUrl } = req.body;
    const targetUrl = url || baseUrl;

    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        message: 'URL或baseUrl是必填的',
        error: 'MISSING_URL'
      });
    }

    try {
      const validationResult = await validateURL(targetUrl, options);

      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: '无效的URL格式',
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          suggestions: validationResult.suggestions,
          error: 'INVALID_URL'
        });
      }

      // 将验证结果添加到请求对象中
      req.validatedURL = validationResult;

      // 如果有警告或建议，记录日志
      if (validationResult.warnings.length > 0) {
        console.log('🔶 URL验证警告:', validationResult.warnings);
      }

      if (validationResult.suggestions.length > 0) {
        console.log('💡 URL验证建议:', validationResult.suggestions);
      }

      next();
    } catch (error) {
      console.error('URL验证中间件错误:', error);
      return res.status(500).json({
        success: false,
        message: 'URL验证过程中发生错误',
        error: 'VALIDATION_ERROR'
      });
    }
  };
}

/**
 * API测试专用的URL验证中间件
 * 支持复杂的API测试配置格式
 */
function validateAPIURLMiddleware(options = {}) {
  return async (req, res, next) => {
    console.log('🔌 API测试请求体:', JSON.stringify(req.body, null, 2));

    const { url, baseUrl, endpoints, config = {}, authentication, globalHeaders } = req.body;

    let testUrl = url || baseUrl;
    let testOptions = {};

    // 如果是复杂格式，构建测试选项
    if (baseUrl && endpoints) {
      testUrl = baseUrl;
      testOptions = {
        ...config,
        endpoints: endpoints,
        authentication: authentication,
        globalHeaders: globalHeaders
      };
    }

    console.log('🔍 解析结果:', { testUrl, hasEndpoints: !!endpoints, configKeys: Object.keys(config) });

    if (!testUrl) {
      console.log('❌ 缺少URL参数');
      return res.status(400).json({
        success: false,
        message: 'URL或baseUrl是必填的',
        error: 'MISSING_URL'
      });
    }

    try {
      const validationResult = await validateURL(testUrl, options);

      if (!validationResult.isValid) {
        console.log('❌ URL格式无效:', testUrl, validationResult.errors);
        return res.status(400).json({
          success: false,
          message: '无效的URL格式',
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          suggestions: validationResult.suggestions,
          error: 'INVALID_URL'
        });
      }

      console.log('✅ URL格式验证通过:', testUrl);

      // 将验证结果和处理后的选项添加到请求对象中
      req.validatedURL = validationResult;
      req.processedTestOptions = testOptions;

      // 如果有警告或建议，记录日志
      if (validationResult.warnings.length > 0) {
        console.log('🔶 URL验证警告:', validationResult.warnings);
      }

      if (validationResult.suggestions.length > 0) {
        console.log('💡 URL验证建议:', validationResult.suggestions);
      }

      next();
    } catch (error) {
      console.error('API URL验证中间件错误:', error);
      return res.status(500).json({
        success: false,
        message: 'URL验证过程中发生错误',
        error: 'VALIDATION_ERROR'
      });
    }
  };
}

/**
 * 快速URL验证函数（同步）
 */
function validateURLSync(urlString, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (!urlString || typeof urlString !== 'string') {
    return { isValid: false, error: '请输入有效的URL' };
  }
  
  const trimmedUrl = urlString.trim();
  if (!trimmedUrl) {
    return { isValid: false, error: 'URL不能为空' };
  }
  
  // 自动添加协议
  let processedUrl = trimmedUrl;
  if (!/^https?:\/\//i.test(processedUrl)) {
    processedUrl = `https://${processedUrl}`;
  }
  
  try {
    const urlObj = new URL(processedUrl);
    
    // 基本检查
    if (!opts.allowedProtocols.includes(urlObj.protocol)) {
      return { isValid: false, error: `不支持的协议: ${urlObj.protocol}` };
    }
    
    if (opts.requireHTTPS && urlObj.protocol !== 'https:') {
      return { isValid: false, error: '必须使用HTTPS协议' };
    }
    
    if (!urlObj.hostname) {
      return { isValid: false, error: '缺少有效的主机名' };
    }
    
    if (!opts.allowLocalhost && (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')) {
      return { isValid: false, error: '不允许使用localhost' };
    }
    
    return { isValid: true, url: urlObj };
  } catch (error) {
    return { isValid: false, error: 'URL格式无效' };
  }
}

module.exports = {
  validateURL,
  validateURLSync,
  validateURLMiddleware,
  validateAPIURLMiddleware,
  isPrivateIP,
  isValidDomain,
  checkDNSResolution
};
