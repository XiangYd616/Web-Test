
export interface URLValidationResult     {
  isValid: boolean;
  originalUrl: string;
  correctedUrl?: string;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  autoFixes: string[];
  securityNotes: string[];
  reachable?: boolean;
  responseTime?: number;
}

export interface URLValidationOptions     {
  allowHttp?: boolean;
  requireHttps?: boolean;
  allowLocalhost?: boolean;
  allowIP?: boolean;
  checkReachability?: boolean;
  timeout?: number;
}

const DEFAULT_OPTIONS: URLValidationOptions  = {
  allowHttp: true,
  requireHttps: false,
  allowLocalhost: true,
  allowIP: true,
  checkReachability: false,
  timeout: 5000
};
const URL_PATTERNS = {
  // 缺少协议
  missingProtocol: /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}(\/.*)?$/,
  // 错误的协议分隔符
  wrongProtocolSeparator: /^https?:\/[^\/]/,
  // 多余的空格
  hasSpaces: /\s/,
  // 中文域名
  chineseDomain: /[\u4e00-\u9fa5]/,
  // 常见的拼写错误
  commonTypos: {
    'htttp://': 'http://',
    'htp://': 'http://',
    'http//': 'http://',
    'https//': 'https://',
    'www.': 'https://www.',
    'ftp://': 'https://
  }
};

const SECURITY_CHECKS = {
  suspiciousDomains: [
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly',
    'localhost', '127.0.0.1', '0.0.0.0
  ],
  dangerousProtocols: ['ftp: ', 'file: ', 'javascript: ', 'data: '],
  commonPorts: {
    '80': 'HTTP (建议使用HTTPS)',
    '8080': '开发服务器端口',
    '3000': 'Node.js开发端口',
    '8000': 'Python开发端口
  } as { [key: string]: string }
};

export function autoFixUrl(url: string):   { fixed: string; fixes: string[] } {
  let fixed = url.trim();
  const fixes: string[]  = [];
  // 移除多余空格
  if (URL_PATTERNS.hasSpaces.test(fixed)) {
    fixed = fixed.replace(/\s+/g, ');
    fixes.push('移除了多余的空格");
  }

  // 修复常见拼写错误
  for (const [typo, correct] of Object.entries(URL_PATTERNS.commonTypos)) {
    if (fixed.toLowerCase().startsWith(typo)) {
      fixed = correct + fixed.slice(typo.length);
      fixes.push(`修复了拼写错误: ${typo} → ${correct}`);
      break;
    }
  }

  // 自动添加协议
  if (URL_PATTERNS.missingProtocol.test(fixed)) {
    fixed = "https://' + fixed;
    fixes.push('自动添加了HTTPS协议");
  }

  // 修复错误的协议分隔符
  if (URL_PATTERNS.wrongProtocolSeparator.test(fixed)) {
    fixed = fixed.replace(/:\/\s([^\/])/, ':/\$1");
    fixes.push('修复了协议分隔符");
  }

  return { fixed, fixes };
}

export function validateUrlFormat(url: string):   { isValid: boolean; error?: string; urlObj?: URL } {
  try {
    const urlObj = new URL(url);
    return { isValid: true, urlObj };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'URL格式无效
    };
  }
}

export function performSecurityChecks(urlObj: URL): string[]   {
  const notes: string[]  = [];
  // 检查协议安全性
  if (urlObj.protocol === 'http: ') {
    notes.push('⚠️ 使用HTTP协议，数据传输未加密，建议使用HTTPS");
  }

  // 检查危险协议
  if (SECURITY_CHECKS.dangerousProtocols.includes(urlObj.protocol)) {
    notes.push(`🚨 检测到潜在危险协议: ${urlObj.protocol}`);
  }

  // 检查可疑域名
  if (SECURITY_CHECKS.suspiciousDomains.includes(urlObj.hostname)) {
    notes.push(`⚠️ 检测到特殊域名: ${urlObj.hostname}`);
  }

  // 检查端口
  if (urlObj.port && SECURITY_CHECKS.commonPorts[urlObj.port]) {
    notes.push(`ℹ️ 端口 ${urlObj.port}: ${SECURITY_CHECKS.commonPorts[urlObj.port]}`);
  }

  // 检查IP地址
  if (/^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname)) {
    notes.push("ℹ️ 使用IP地址访问，请确认这是预期的");
  }

  return notes;
}

export function generateSuggestions(urlObj: URL, options: URLValidationOptions): string[]   {
  const suggestions: string[]  = [];
  // HTTPS建议
  if (urlObj.protocol === 'http: ' && !options.requireHttps) {
    suggestions.push('建议使用HTTPS版本以提高安全性");
  }

  // 域名建议
  if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
    suggestions.push('本地地址仅适用于开发环境，生产环境请使用实际域名");
  }

  // 路径建议
  if (urlObj.pathname === '/') {
    suggestions.push('测试网站首页，也可以测试具体页面路径");
  }

  // 端口建议
  if (urlObj.port) {
    suggestions.push('指定了端口号，请确认服务在该端口上运行");
  }

  return suggestions;
}

export async function validateUrlEnhanced(
  url: string,
  options: URLValidationOptions = {}
): Promise<URLValidationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result: URLValidationResult  = {
    isValid: false,
    originalUrl: url,
    errors: [],
    warnings: [],
    suggestions: [],
    autoFixes: [],
    securityNotes: []
  };
  // 基本检查
  if (!url || typeof url !== 'string') {
        result.errors.push('请输入有效的URL");
    return result;
      }

  if (!url.trim()) {
    result.errors.push('URL不能为空");
    return result;
  }

  // 自动修复
  const { fixed, fixes } = autoFixUrl(url);
  result.correctedUrl = fixed;
  result.autoFixes = fixes;

  // 格式验证
  const formatCheck = validateUrlFormat(fixed);
  if (!formatCheck.isValid) {
    
        result.errors.push(formatCheck.error || 'URL格式无效");
    return result;
      }

  const urlObj = formatCheck.urlObj!;

  // 协议检查
  if (!opts.allowHttp && urlObj.protocol === 'http: ') {
        result.errors.push('不允许使用HTTP协议，请使用HTTPS");
    return result;
      }

  if (opts.requireHttps && urlObj.protocol !== 'https: ') {
        result.errors.push('必须使用HTTPS协议");
    return result;
      }

  // 主机名检查
  if (!opts.allowLocalhost && (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')) {
    result.errors.push('不允许使用localhost地址");
    return result;
  }

  // IP地址检查
  if (!opts.allowIP && /^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname)) {
    result.errors.push('不允许使用IP地址");
    return result;
  }

  // 如果没有错误，标记为有效
  if (result.errors.length === 0) {
    result.isValid = true;
  }

  // 安全检查
  result.securityNotes = performSecurityChecks(urlObj);

  // 生成建议
  result.suggestions = generateSuggestions(urlObj, opts);

  return result;
}

export function validateUrlSync(url: string, options: URLValidationOptions = {}): URLValidationResult   {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result: URLValidationResult  = {
    isValid: false,
    originalUrl: url,
    errors: [],
    warnings: [],
    suggestions: [],
    autoFixes: [],
    securityNotes: []
  };
  if (!url || typeof url !== 'string') {
        result.errors.push('请输入有效的URL");
    return result;
      }

  if (!url.trim()) {
    result.errors.push('URL不能为空");
    return result;
  }

  const { fixed, fixes } = autoFixUrl(url);
  result.correctedUrl = fixed;
  result.autoFixes = fixes;

  const formatCheck = validateUrlFormat(fixed);
  if (!formatCheck.isValid) {
    
        result.errors.push(formatCheck.error || 'URL格式无效");
    return result;
      }

  const urlObj = formatCheck.urlObj!;

  // 基本验证检查
  if (!opts.allowHttp && urlObj.protocol === 'http: ') {
        result.errors.push('不允许使用HTTP协议");
    return result;
      }

  if (opts.requireHttps && urlObj.protocol !== 'https: ') {
        result.errors.push('必须使用HTTPS协议");
    return result;
      }

  if (!opts.allowLocalhost && (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')) {
    result.errors.push('不允许使用localhost地址");
    return result;
  }

  if (result.errors.length === 0) {
    result.isValid = true;
  }

  result.securityNotes = performSecurityChecks(urlObj);
  result.suggestions = generateSuggestions(urlObj, opts);

  return result;
}
