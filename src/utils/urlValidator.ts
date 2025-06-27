/**
 * 统一的URL验证工具
 * 提供前端和后端通用的URL验证逻辑
 */

export interface URLValidationOptions {
  checkReachability?: boolean;
  timeout?: number;
  allowedProtocols?: string[];
  requireHTTPS?: boolean;
  allowLocalhost?: boolean;
  allowPrivateIPs?: boolean;
}

export interface URLValidationResult {
  isValid: boolean;
  url?: URL;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  reachable?: boolean;
  responseTime?: number;
  statusCode?: number;
}

const DEFAULT_OPTIONS: URLValidationOptions = {
  checkReachability: false,
  timeout: 5000,
  allowedProtocols: ['http:', 'https:'],
  requireHTTPS: false,
  allowLocalhost: true,
  allowPrivateIPs: true
};

/**
 * 检查是否为私有IP地址
 */
function isPrivateIP(hostname: string): boolean {
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
function isValidDomain(hostname: string): boolean {
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
 * 检查URL可达性
 */
async function checkReachability(url: string, timeout: number): Promise<{
  reachable: boolean;
  responseTime?: number;
  statusCode?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors' // 避免CORS问题
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    return {
      reachable: true,
      responseTime,
      statusCode: response.status
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          reachable: false,
          responseTime,
          error: '请求超时'
        };
      }
      
      // 对于no-cors模式，网络错误可能表示网站存在但有CORS限制
      if (error.message.includes('Failed to fetch')) {
        return {
          reachable: true, // 假设可达，因为可能是CORS问题
          responseTime,
          error: 'CORS限制，但网站可能可达'
        };
      }
    }
    
    return {
      reachable: false,
      responseTime,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 主要的URL验证函数
 */
export async function validateURL(
  urlString: string,
  options: URLValidationOptions = {}
): Promise<URLValidationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result: URLValidationResult = {
    isValid: false,
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
  let urlObj: URL;
  try {
    urlObj = new URL(processedUrl);
    result.url = urlObj;
  } catch (error) {
    result.errors.push('URL格式无效');
    return result;
  }
  
  // 协议检查
  if (!opts.allowedProtocols?.includes(urlObj.protocol)) {
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
  
  // 可达性检查
  if (opts.checkReachability && result.isValid) {
    try {
      const reachabilityResult = await checkReachability(processedUrl, opts.timeout || 5000);
      result.reachable = reachabilityResult.reachable;
      result.responseTime = reachabilityResult.responseTime;
      result.statusCode = reachabilityResult.statusCode;
      
      if (!reachabilityResult.reachable) {
        result.warnings.push(`网站可能无法访问: ${reachabilityResult.error || '未知原因'}`);
      }
    } catch (error) {
      result.warnings.push('无法检查网站可达性');
    }
  }
  
  // 安全建议
  if (urlObj.protocol === 'http:') {
    result.suggestions.push('建议使用HTTPS以提高安全性');
  }
  
  return result;
}

/**
 * 简化的同步URL验证（仅基本格式检查）
 */
export function validateURLSync(urlString: string, options: URLValidationOptions = {}): {
  isValid: boolean;
  error?: string;
  url?: URL;
} {
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
    if (!opts.allowedProtocols?.includes(urlObj.protocol)) {
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

/**
 * 获取URL的显示名称
 */
export function getURLDisplayName(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
  } catch {
    return url;
  }
}

/**
 * 标准化URL（移除尾部斜杠、查询参数等）
 */
export function normalizeURL(url: string, options: {
  removeTrailingSlash?: boolean;
  removeQuery?: boolean;
  removeFragment?: boolean;
} = {}): string {
  try {
    const urlObj = new URL(url);
    
    if (options.removeQuery) {
      urlObj.search = '';
    }
    
    if (options.removeFragment) {
      urlObj.hash = '';
    }
    
    let result = urlObj.toString();
    
    if (options.removeTrailingSlash && result.endsWith('/') && urlObj.pathname !== '/') {
      result = result.slice(0, -1);
    }
    
    return result;
  } catch {
    return url;
  }
}
